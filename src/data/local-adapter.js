/* =====================================================================
   LOCAL ADAPTER — محوّل محلي يحاكي الخادم (بيانات تجريبية + فرض الصلاحيات)
   ---------------------------------------------------------------------
   - يفرض الصلاحيات على كل عملية كما يفعل الخادم الحقيقي (نفس مصفوفة PERMS).
   - يتحقق من الإصدار (optimistic concurrency) ويرفض الكتابة القديمة بخطأ 'stale'
     — نفس نمط workspace_guard في منصة التوظيف.
   - يكتب سجل تدقيق غير قابل للتعديل لكل إجراء مهم.
   - يحجب الحقول التجارية الحسّاسة عمّن لا يملك commercial.view.
   - يحفظ نسخة العمل في localStorage (اختياري، للتجربة فقط) — لا شيء يُرسل خارج المتصفح.
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, MODEL = root.MODEL, PERMS = root.PERMS, STAGES = root.STAGES, RULES = root.RULES, ENGINE = root.ENGINE, IMPORTER = root.IMPORTER, L = root.LOOKUPS;
  var AErr = root.ADAPTER.Error;

  var TABLE = { customer: 'customers', contact: 'contacts', opportunity: 'opportunities', proposal: 'proposals', contract: 'contracts', project: 'projects', activity: 'activities', campaign: 'campaigns', user: 'users' };
  var VIEW_PERM = { customer: 'customers.view', contact: 'customers.view', opportunity: 'opportunities.view', proposal: 'proposals.view', contract: 'contracts.view', project: 'contracts.view', activity: 'activities.view', campaign: 'occasions.manage', user: 'admin.users' };
  var CREATE_PERM = { customer: 'customers.create', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage', project: 'contracts.manage', activity: 'activities.manage', campaign: 'occasions.manage', user: 'admin.users' };
  var EDIT_PERM = { customer: 'customers.edit', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage', project: 'contracts.manage', activity: 'activities.manage', campaign: 'occasions.manage', user: 'admin.users' };
  var ARCHIVE_PERM = { customer: 'customers.archive', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage', project: 'contracts.manage', activity: 'activities.manage', campaign: 'occasions.manage', user: 'admin.users' };

  function LocalAdapter(config) {
    this.cfg = config || root.APP_CONFIG;
    this.mode = 'local';
    this.db = null;
    this.user = null;
    this._listeners = [];
    this._storageKey = (this.cfg.data && this.cfg.data.demo && this.cfg.data.demo.storageKey) || 'crm-local-db';
  }

  var P = LocalAdapter.prototype;

  /* ---------- دورة الحياة ---------- */
  P.init = function () {
    var self = this;
    return new Promise(function (resolve) {
      var loaded = self._load();
      if (!loaded) {
        var demo = self.cfg.data && self.cfg.data.demo && self.cfg.data.demo.enabled;
        self.db = demo ? root.DEMO.build(self.cfg.data.demo.seed) : self._emptyDb();
        self.db.meta = { created_at: U.isoDateTime(U.now()), demo: !!demo, schema: 1 };
        self._persist();
      }
      self._applyConfigOverrides();
      var u = self.db.meta && self.db.meta.session_user ? self._findUser(self.db.meta.session_user) : null;
      self.user = u && u.active !== false ? u : null;
      resolve({ ok: true, mode: 'local', user: self.user ? self._publicUser(self.user) : null, demo: !!(self.db.meta && self.db.meta.demo) });
    });
  };
  P._emptyDb = function () { return { users: [], customers: [], contacts: [], opportunities: [], stage_history: [], proposals: [], contracts: [], projects: [], activities: [], campaigns: [], approvals: [], audit_log: [], saved_views: [], documents: [], import_jobs: [], duplicates: [], seq: {}, config_overrides: {}, meta: {} }; };
  P._load = function () {
    try {
      if (!(this.cfg.data && this.cfg.data.demo && this.cfg.data.demo.persistLocally)) return false;
      if (typeof localStorage === 'undefined') return false;
      var raw = localStorage.getItem(this._storageKey);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.customers) return false;
      this.db = parsed;
      return true;
    } catch (e) { return false; }
  };
  P._persist = function () {
    try {
      if (!(this.cfg.data && this.cfg.data.demo && this.cfg.data.demo.persistLocally)) return;
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this._storageKey, JSON.stringify(this.db));
    } catch (e) { /* تجاهل: الحجم أو الوضع الخاص */ }
    this._emit('change');
  };
  P.onChange = function (fn) { this._listeners.push(fn); };
  P._emit = function (ev) { this._listeners.forEach(function (f) { try { f(ev); } catch (e) { } }); };
  P.resetDemo = function () {
    this._requireUser(); if (!PERMS.can(this.user, 'admin.config')) throw AErr('forbidden');
    var sess = this.user.id;
    this.db = root.DEMO.build(this.cfg.data.demo.seed);
    this.db.meta = { created_at: U.isoDateTime(U.now()), demo: true, schema: 1, session_user: sess };
    this.user = this._findUser(sess);
    this._persist();
    return Promise.resolve({ ok: true });
  };
  P.purgeDemo = function () {
    this._requireUser(); if (!PERMS.can(this.user, 'admin.config')) throw AErr('forbidden');
    var before = root.DEMO.count(this.db);
    root.DEMO.purge(this.db);
    this.db.meta.demo = false;
    this._audit('purge_demo', 'system', 'demo', { count: before }, { count: 0 }, 'system');
    this._persist();
    return Promise.resolve({ ok: true, removed: before });
  };
  P.health = function () { return Promise.resolve({ ok: true, mode: 'local', message: 'local demo store', demo: !!(this.db && this.db.meta && this.db.meta.demo), records: this.db ? Object.keys(this.db).reduce(function (n, k) { return n + (Array.isArray(this.db[k]) ? this.db[k].length : 0); }.bind(this), 0) : 0 }); };

  /* ---------- المصادقة (تجريبية) ---------- */
  P._findUser = function (id) { return (this.db.users || []).find(function (u) { return u.id === id; }) || null; };
  P._publicUser = function (u) { return u ? { id: u.id, email: u.email, name_ar: u.name_ar, name_en: u.name_en, role: u.role, active: u.active !== false } : null; };
  P.auth = {};
  P.signInAs = function (userId) {
    var u = this._findUser(userId);
    if (!u) return Promise.reject(AErr('not_found', 'user'));
    if (u.active === false) return Promise.reject(AErr('forbidden', 'inactive'));
    this.user = u; this.db.meta.session_user = u.id;
    this._audit('login', 'user', u.id, null, { role: u.role }, 'ui');
    this._persist();
    return Promise.resolve(this._publicUser(u));
  };
  P.signIn = function (email) {   // الوضع المحلي: البريد يكفي (بيانات تجريبية)
    var u = (this.db.users || []).find(function (x) { return x.email && x.email.toLowerCase() === String(email || '').toLowerCase(); });
    if (!u) return Promise.reject(AErr('forbidden', 'login_failed'));
    return this.signInAs(u.id);
  };
  P.signOut = function () { this.user = null; if (this.db && this.db.meta) delete this.db.meta.session_user; this._persist(); return Promise.resolve(true); };
  P.currentUser = function () { return this._publicUser(this.user); };
  P._requireUser = function () { if (!this.user) throw AErr('forbidden', 'not_signed_in'); return this.user; };
  P.users = function () { return Promise.resolve((this.db.users || []).map(this._publicUser)); };

  /* ---------- أدوات داخلية ---------- */
  P._table = function (entity) { var t = TABLE[entity]; if (!t) throw AErr('not_found', 'entity ' + entity); return this.db[t]; };
  P._find = function (entity, id) { return this._table(entity).find(function (r) { return r.id === id; }) || null; };
  P._parents = function (entity, rec) {
    if (!rec) return [];
    var out = [];
    if (rec.customer_id) { var c = this._find('customer', rec.customer_id); if (c) out.push(c); }
    if (rec.opportunity_id) { var o = this._find('opportunity', rec.opportunity_id); if (o) { out.push(o); if (o.customer_id && !rec.customer_id) { var c2 = this._find('customer', o.customer_id); if (c2) out.push(c2); } } }
    if (rec.contract_id) { var k = this._find('contract', rec.contract_id); if (k) out.push(k); }
    return out;
  };
  P._nextId = function (prefix) {
    var y = U.now().getFullYear();
    this.db.seq = this.db.seq || {};
    var key = prefix + ':' + y;
    var n = (this.db.seq[key] || this.db.seq[prefix] || 0) + 1;
    // تفادي التصادم مع بيانات تجريبية استخدمت نفس البادئة
    var tbl = Object.keys(TABLE).filter(function (e) { return MODEL.PREFIX[e] === prefix; }).map(function (e) { return TABLE[e]; })[0];
    var exists = function (id) { return tbl ? this.db[tbl].some(function (r) { return r.id === id; }) : false; }.bind(this);
    var id = U.refNo(prefix, y, n);
    while (exists(id)) { n++; id = U.refNo(prefix, y, n); }
    this.db.seq[key] = n; this.db.seq[prefix] = n;
    return id;
  };
  P._audit = function (action, entityType, entityId, before, after, source, extra) {
    var entry = { id: U.uid('aud'), at: U.isoDateTime(U.now()), actor_id: this.user ? this.user.id : null, action: action, entity_type: entityType, entity_id: entityId, before: before === undefined ? null : U.clone(before), after: after === undefined ? null : U.clone(after), source: source || 'ui' };
    if (extra) entry.extra = U.clone(extra);
    this.db.audit_log.push(Object.freeze(entry));
    return entry;
  };
  P._mask = function (entity, rec) {
    if (!rec || !MODEL.SENSITIVE[entity]) return rec;
    return PERMS.canSeeCommercial(this.user, rec, this._parents(entity, rec)) ? rec : MODEL.mask(entity, rec);
  };
  P._canView = function (entity, rec) {
    var perm = VIEW_PERM[entity];
    if (!PERMS.can(this.user, perm)) return false;
    /* السرّية: السجلات "سرّية" لا يراها إلا المالكون أو من له نطاق all على commercial.view */
    if (rec && rec.confidentiality === 'confidential' && !PERMS.owns(this.user, rec) && PERMS.scope(this.user, 'commercial.view') !== 'all' && !PERMS.can(this.user, 'admin.users')) return false;
    return true;
  };
  P._touch = function (rec) { rec.updated_at = U.isoDateTime(U.now()); rec.updated_by = this.user ? this.user.id : null; rec.version = (rec.version || 1) + 1; return rec; };
  P._ensureVersion = function (rec, version) {
    if (version === undefined || version === null) return;
    if (Number(version) !== Number(rec.version)) throw AErr('stale', 'stale write: incoming version ' + version + ' is not current (' + rec.version + ')', { current: rec.version });
  };
  P._clone = function (x) { return U.clone(x); };

  /* ---------- القراءة ---------- */
  P.snapshot = function () {
    this._requireUser();
    var self = this, out = {};
    Object.keys(TABLE).forEach(function (entity) {
      var t = TABLE[entity];
      if (entity === 'user') { out.users = self.db.users.map(self._publicUser); return; }
      if (!PERMS.can(self.user, VIEW_PERM[entity]) && !(entity === 'campaign' && PERMS.can(self.user, 'occasions.approve'))) { out[t] = []; return; }
      out[t] = self.db[t].filter(function (r) { return self._canView(entity, r); }).map(function (r) { return self._mask(entity, U.clone(r)); });
    });
    out.stage_history = U.clone(self.db.stage_history);
    out.approvals = U.clone(self.db.approvals);
    out.documents = U.clone(self.db.documents);
    out.duplicates = U.clone(self.db.duplicates || []);
    out.saved_views = U.clone(self.db.saved_views.filter(function (v) { return v.user_id === self.user.id || v.shared; }));
    out.meta = U.clone(self.db.meta || {});
    return Promise.resolve(out);
  };
  P.get = function (entity, id) {
    this._requireUser();
    var rec = this._find(entity, id);
    if (!rec) return Promise.reject(AErr('not_found'));
    if (!this._canView(entity, rec)) return Promise.reject(AErr('forbidden'));
    return Promise.resolve(this._mask(entity, U.clone(rec)));
  };
  P.audit = function (q) {
    this._requireUser();
    q = q || {};
    if (!PERMS.can(this.user, 'audit.view')) {
      /* غير المخوّلين يرون سجل سجلاتهم فقط */
      if (!q.entity_id) return Promise.reject(AErr('forbidden'));
    }
    var rows = this.db.audit_log.filter(function (a) { return (!q.entity_type || a.entity_type === q.entity_type) && (!q.entity_id || a.entity_id === q.entity_id) && (!q.actor_id || a.actor_id === q.actor_id) && (!q.action || a.action === q.action); });
    rows = rows.slice().reverse();
    if (q.limit) rows = rows.slice(0, q.limit);
    return Promise.resolve(U.clone(rows));
  };

  /* ---------- الإنشاء والتعديل ---------- */
  P.create = function (entity, data) {
    var self = this; this._requireUser();
    var perm = CREATE_PERM[entity]; if (!perm) return Promise.reject(AErr('not_found'));
    var parents = this._parents(entity, data);
    if (!PERMS.canRecord(this.user, perm, null, parents)) return Promise.reject(AErr('forbidden'));
    if (PERMS.scope(this.user, perm) === 'own' && parents.length && !parents.some(function (p) { return PERMS.owns(self.user, p); }) && entity !== 'customer') {
      /* موظف بنطاق own يضيف سجلًا تابعًا لعميل/فرصة لا يملكها */
      if (entity !== 'activity') return Promise.reject(AErr('forbidden', 'not_owner'));
    }
    var rec = Object.assign(MODEL.defaults(entity, this.user.id), MODEL.normalize(entity, data || {}));
    if (entity === 'user') return this._createUser(rec);
    var v = MODEL.validate(entity, rec);
    if (!v.ok) return Promise.reject(AErr('validation', 'validation', v.errors));
    rec.id = rec.id && !this._find(entity, rec.id) ? rec.id : this._nextId(MODEL.PREFIX[entity]);
    rec.created_at = U.isoDateTime(U.now()); rec.created_by = this.user.id; rec.updated_at = rec.created_at; rec.updated_by = this.user.id; rec.version = 1; rec.archived_at = null;
    if (!rec.origin || rec.origin === 'demo') rec.origin = 'platform';
    delete rec.demo;
    if (entity === 'opportunity') {
      rec.stage_entered_at = U.today();
      if (rec.probability === null || rec.probability === undefined) rec.probability = STAGES.get(rec.stage).probability;
      rec.closed_at = (STAGES.isTerminal(rec.stage) || STAGES.isWon(rec.stage)) ? U.today() : null;
    }
    if (entity === 'proposal') {
      if (!rec.version_no) rec.version_no = 1;
      var opp = this._find('opportunity', rec.opportunity_id); if (!opp) return Promise.reject(AErr('validation', 'opportunity', { opportunity_id: 'app.field_required' }));
      if (!rec.submission_deadline && opp.submission_deadline) rec.submission_deadline = opp.submission_deadline;
    }
    if (entity === 'contact' && rec.is_primary) this._table('contact').forEach(function (c) { if (c.customer_id === rec.customer_id) c.is_primary = false; });
    this._table(entity).push(rec);
    if (entity === 'opportunity') this.db.stage_history.push({ id: U.uid('sh'), opportunity_id: rec.id, from_stage: null, to_stage: rec.stage, changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: 'إنشاء الفرصة', note: null });
    this._audit('create', entity, rec.id, null, rec, 'ui');
    this._persist();
    return Promise.resolve(this._mask(entity, U.clone(rec)));
  };

  P.update = function (entity, id, patch, version) {
    this._requireUser();
    var rec = this._find(entity, id); if (!rec) return Promise.reject(AErr('not_found'));
    if (entity === 'user') return this._updateUser(rec, patch, version);
    var perm = EDIT_PERM[entity];
    if (!PERMS.canRecord(this.user, perm, rec, this._parents(entity, rec))) return Promise.reject(AErr('forbidden'));
    if (rec.archived_at) return Promise.reject(AErr('invalid_transition', 'archived'));
    try { this._ensureVersion(rec, version); } catch (e) { return Promise.reject(e); }
    patch = MODEL.normalize(entity, patch || {});
    /* حقول محمية لا تُعدَّل عبر update العام */
    ['id', 'created_at', 'created_by', 'version', 'archived_at', 'origin', 'source_system', 'source_id'].forEach(function (k) { delete patch[k]; });
    if (entity === 'opportunity' && patch.stage !== undefined && patch.stage !== rec.stage) return Promise.reject(AErr('invalid_transition', 'use changeStage'));
    delete patch.stage;
    /* الحقول الحسّاسة: لا يعدّلها من لا يراها */
    var sens = MODEL.SENSITIVE[entity] || [];
    if (!PERMS.canSeeCommercial(this.user, rec, this._parents(entity, rec))) sens.forEach(function (k) { delete patch[k]; });
    var before = U.clone(rec);
    var next = Object.assign({}, rec, patch);
    var v = MODEL.validate(entity, next);
    if (!v.ok) return Promise.reject(AErr('validation', 'validation', v.errors));
    Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
    if (entity === 'contact' && rec.is_primary) this._table('contact').forEach(function (c) { if (c.customer_id === rec.customer_id && c.id !== rec.id) c.is_primary = false; });
    if (entity === 'contract') { rec.end_date = MODEL.contractEndDate(rec) || rec.end_date; }
    this._touch(rec);
    var d = U.diff(before, rec);
    var action = 'update';
    if (d.owner_id || d.secondary_owner_id) action = 'owner_change';
    if (entity === 'opportunity' && (d.estimated_value || d.probability || d.expected_margin_pct)) action = 'value_change';
    this._audit(action, entity, rec.id, U.pick(before, Object.keys(d)), U.pick(rec, Object.keys(d)), 'ui');
    this._persist();
    return Promise.resolve(this._mask(entity, U.clone(rec)));
  };

  P.archive = function (entity, id, reason) {
    this._requireUser();
    var rec = this._find(entity, id); if (!rec) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, ARCHIVE_PERM[entity], rec, this._parents(entity, rec))) return Promise.reject(AErr('forbidden'));
    if (rec.archived_at) return Promise.resolve(U.clone(rec));
    rec.archived_at = U.isoDateTime(U.now()); rec.archive_reason = reason || null;
    if (entity === 'customer') rec.status = 'archived';
    this._touch(rec);
    this._audit('archive', entity, rec.id, { archived_at: null }, { archived_at: rec.archived_at, reason: reason || null }, 'ui');
    this._persist();
    return Promise.resolve(U.clone(rec));
  };
  P.restore = function (entity, id) {
    this._requireUser();
    var rec = this._find(entity, id); if (!rec) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, ARCHIVE_PERM[entity], rec, this._parents(entity, rec))) return Promise.reject(AErr('forbidden'));
    var was = rec.archived_at; rec.archived_at = null; delete rec.archive_reason;
    if (entity === 'customer' && rec.status === 'archived') rec.status = 'dormant';
    this._touch(rec);
    this._audit('restore', entity, rec.id, { archived_at: was }, { archived_at: null }, 'ui');
    this._persist();
    return Promise.resolve(U.clone(rec));
  };

  /* ---------- المستخدمون (محلي) ---------- */
  P._createUser = function (rec) {
    if (!PERMS.can(this.user, 'admin.users')) return Promise.reject(AErr('forbidden'));
    if (!rec.email || !U.isEmail(rec.email)) return Promise.reject(AErr('validation', 'validation', { email: 'app.invalid_email' }));
    if (!root.PERMISSIONS_CONFIG.matrix[rec.role]) return Promise.reject(AErr('validation', 'validation', { role: 'app.field_required' }));
    if (this.db.users.some(function (u) { return u.email.toLowerCase() === rec.email.toLowerCase(); })) return Promise.reject(AErr('validation', 'validation', { email: 'app.invalid_email' }));
    var u = { id: U.uid('u'), email: rec.email.toLowerCase(), name_ar: rec.name_ar || rec.email, name_en: rec.name_en || rec.name_ar || rec.email, role: rec.role, active: rec.active !== false, created_at: U.isoDateTime(U.now()), version: 1 };
    this.db.users.push(u);
    this._audit('create', 'user', u.id, null, this._publicUser(u), 'ui');
    this._persist();
    return Promise.resolve(this._publicUser(u));
  };
  P._updateUser = function (u, patch, version) {
    if (!PERMS.can(this.user, 'admin.users')) return Promise.reject(AErr('forbidden'));
    try { this._ensureVersion(u, version); } catch (e) { return Promise.reject(e); }
    var before = this._publicUser(u);
    if (patch.role !== undefined) { if (!root.PERMISSIONS_CONFIG.matrix[patch.role]) return Promise.reject(AErr('validation', 'role')); u.role = patch.role; }
    if (patch.name_ar !== undefined) u.name_ar = patch.name_ar;
    if (patch.name_en !== undefined) u.name_en = patch.name_en;
    if (patch.active !== undefined) { if (u.id === this.user.id && patch.active === false) return Promise.reject(AErr('invalid_transition', 'self')); u.active = !!patch.active; }
    u.version = (u.version || 1) + 1; u.updated_at = U.isoDateTime(U.now());
    this._audit('update', 'user', u.id, before, this._publicUser(u), 'ui');
    this._persist();
    return Promise.resolve(this._publicUser(u));
  };

  /* ---------- المراحل ---------- */
  P.changeStage = function (oppId, to, opts) {
    this._requireUser(); opts = opts || {};
    var opp = this._find('opportunity', oppId); if (!opp) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'opportunities.stage', opp, this._parents('opportunity', opp))) return Promise.reject(AErr('forbidden'));
    try { this._ensureVersion(opp, opts.version); } catch (e) { return Promise.reject(e); }
    var tr = STAGES.transition(opp.stage, to);
    if (!tr.allowed) {
      if (tr.reopen && opts.reopen) { /* إعادة فتح فرصة مغلقة */ if (!opts.reason) return Promise.reject(AErr('validation', 'reason', { reason: 'app.reason_required' })); }
      else return Promise.reject(AErr('invalid_transition', tr.reason));
    }
    if (tr.requiresReason && !opts.reason) return Promise.reject(AErr('validation', 'reason', { reason: 'app.reason_required' }));
    if (opts.loss_reason) opts.fields = Object.assign({}, opts.fields || {}, { loss_reason: opts.loss_reason });
    var missing = (tr.requiredFields || []).filter(function (f) { var v = (opts.fields && opts.fields[f] !== undefined) ? opts.fields[f] : opp[f]; return v === null || v === undefined || v === ''; });
    if (missing.length) return Promise.reject(AErr('validation', 'required_fields', { fields: missing }));
    var before = U.clone(opp);
    if (opts.fields) { var p = MODEL.normalize('opportunity', opts.fields); Object.keys(p).forEach(function (k) { if (k !== 'stage') opp[k] = p[k]; }); }
    var from = opp.stage;
    opp.stage = to;
    opp.stage_entered_at = U.today();
    var st = STAGES.get(to);
    if (opts.keepProbability !== true) opp.probability = st.probability;
    opp.closed_at = (st.terminal || st.won) ? U.today() : null;
    if (to === 'lost' && opts.loss_reason) opp.loss_reason = opts.loss_reason;
    if (to === 'lost' && !opp.loss_reason) { opp.stage = from; return Promise.reject(AErr('validation', 'loss_reason', { loss_reason: 'app.field_required' })); }
    if (['proposal_submitted', 'awaiting_award', 'preferred_bidder'].indexOf(to) >= 0) opp.waiting_on = 'customer'; else if (!st.terminal) opp.waiting_on = 'us';
    if (st.terminal || st.won) { opp.next_action = opp.next_action; }
    this._touch(opp);
    var h = { id: U.uid('sh'), opportunity_id: opp.id, from_stage: from, to_stage: to, changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: opts.reason || null, note: opts.note || null };
    this.db.stage_history.push(h);
    this._audit(opts.reopen ? 'reopen' : 'stage_change', 'opportunity', opp.id, { stage: from, probability: before.probability }, { stage: to, probability: opp.probability, reason: opts.reason || null }, 'ui');
    /* تهنئة الترسية: فرصة علاقات (لا تُرسل تلقائيًا) — تُسجَّل كتذكير نشاط */
    if (to === 'awarded') {
      var act = Object.assign(MODEL.defaults('activity', this.user.id), { id: this._nextId('ACT'), customer_id: opp.customer_id, opportunity_id: opp.id, contact_id: opp.main_contact_id || null, type: 'greeting', at: U.isoDateTime(U.now()), owner_id: opp.owner_id || this.user.id, purpose: 'إعداد رسالة تهنئة بمناسبة الترسية (تتطلب اعتمادًا قبل الإرسال)', status: 'planned', priority: 'medium', due_date: U.isoDate(U.addDays(U.now(), 3)), created_by: this.user.id, origin: 'platform' });
      this.db.activities.push(act);
    }
    this._persist();
    return Promise.resolve({ opportunity: this._mask('opportunity', U.clone(opp)), history: U.clone(h) });
  };
  P.stageHistory = function (oppId) { this._requireUser(); return Promise.resolve(U.clone(this.db.stage_history.filter(function (h) { return h.opportunity_id === oppId; }))); };

  /* ---------- العروض ---------- */
  P.newProposalVersion = function (proposalId) {
    this._requireUser();
    var p = this._find('proposal', proposalId); if (!p) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'proposals.manage', p, this._parents('proposal', p))) return Promise.reject(AErr('forbidden'));
    var siblings = this.db.proposals.filter(function (x) { return x.id === p.id; });
    var maxV = Math.max.apply(null, siblings.map(function (x) { return x.version_no || 1; }));
    var latest = siblings.find(function (x) { return x.version_no === maxV; });
    if (latest.status !== 'revised' && ['submitted', 'revision_requested', 'rejected', 'expired'].indexOf(latest.status) >= 0) { latest.status = latest.status === 'submitted' || latest.status === 'revision_requested' ? 'revised' : latest.status; this._touch(latest); }
    var nv = Object.assign(U.clone(latest), { version_no: maxV + 1, status: 'in_preparation', technical_status: 'in_progress', commercial_status: 'in_progress', approval_status: 'not_required', submitted_at: null, submission_method: null, result: 'pending', attachments: [], created_at: U.isoDateTime(U.now()), created_by: this.user.id, updated_at: U.isoDateTime(U.now()), updated_by: this.user.id, version: 1, archived_at: null, origin: 'platform' });
    delete nv.demo; delete nv._masked;
    this.db.proposals.push(nv);
    this._audit('create', 'proposal', nv.id + '/v' + nv.version_no, null, { version_no: nv.version_no, from_version: maxV }, 'ui');
    this._persist();
    return Promise.resolve(this._mask('proposal', U.clone(nv)));
  };
  P._proposalByIdVersion = function (id, versionNo) {
    var list = this.db.proposals.filter(function (x) { return x.id === id; });
    if (versionNo) return list.find(function (x) { return x.version_no === versionNo; }) || null;
    return U.sortBy(list, 'version_no', 'desc')[0] || null;
  };
  /* طلب الاعتمادات اللازمة للعرض (قيمة عالية / خصم / تقديم) */
  P.requestProposalApproval = function (proposalId, versionNo) {
    var self = this; this._requireUser();
    var p = this._proposalByIdVersion(proposalId, versionNo); if (!p) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'proposals.manage', p, this._parents('proposal', p))) return Promise.reject(AErr('forbidden'));
    var types = [];
    if (PERMS.needsApproval(this.user, 'proposal_high_value', { value: U.num(p.proposed_value) || 0 })) types.push('proposal_high_value');
    if (PERMS.needsApproval(this.user, 'discount', { discount_pct: U.num(p.discount_pct) || 0 })) types.push('discount');
    if (PERMS.needsApproval(this.user, 'proposal_submission', {})) types.push('proposal_submission');
    var created = [];
    types.forEach(function (t) {
      var exists = self.db.approvals.find(function (a) { return a.entity_type === 'proposal' && a.entity_id === p.id && a.type === t && a.status === 'pending' && (a.payload || {}).version_no === p.version_no; });
      if (exists) { created.push(exists); return; }
      var ap = { id: self._nextId('APR'), type: t, entity_type: 'proposal', entity_id: p.id, requested_by: self.user.id, requested_at: U.isoDateTime(U.now()), status: 'pending', decided_by: null, decided_at: null, reason: null, payload: { version_no: p.version_no, value: p.proposed_value, discount_pct: p.discount_pct, action: 'approve_proposal' } };
      self.db.approvals.push(ap); created.push(ap);
      self._audit('approval_request', 'proposal', p.id, null, { type: t, approval_id: ap.id }, 'ui');
    });
    p.approval_status = types.length ? 'pending' : 'approved';
    p.status = types.length ? 'awaiting_approval' : 'ready';
    this._touch(p);
    this._persist();
    return Promise.resolve({ proposal: this._mask('proposal', U.clone(p)), approvals: U.clone(created) });
  };
  P.submitProposal = function (proposalId, opts) {
    this._requireUser(); opts = opts || {};
    var p = this._proposalByIdVersion(proposalId, opts.version_no); if (!p) return Promise.reject(AErr('not_found'));
    var parents = this._parents('proposal', p);
    if (!PERMS.canRecord(this.user, 'proposals.submit', p, parents) && !PERMS.canRecord(this.user, 'proposals.manage', p, parents)) return Promise.reject(AErr('forbidden'));
    try { this._ensureVersion(p, opts.version); } catch (e) { return Promise.reject(e); }
    if (['submitted', 'accepted', 'rejected', 'withdrawn', 'revised'].indexOf(p.status) >= 0) return Promise.reject(AErr('invalid_transition', 'already_submitted'));
    /* الاعتماد الداخلي شرط للتقديم إن كانت القاعدة مفعّلة */
    var needs = PERMS.needsApproval(this.user, 'proposal_submission', {}) || PERMS.needsApproval(this.user, 'proposal_high_value', { value: U.num(p.proposed_value) || 0 }) || PERMS.needsApproval(this.user, 'discount', { discount_pct: U.num(p.discount_pct) || 0 });
    if (needs && p.approval_status !== 'approved') {
      return this.requestProposalApproval(p.id, p.version_no).then(function (r) { return { approval_required: true, proposal: r.proposal, approvals: r.approvals }; });
    }
    if (!PERMS.canRecord(this.user, 'proposals.submit', p, parents)) return Promise.reject(AErr('forbidden'));
    var before = U.clone(p);
    p.status = 'submitted'; p.submitted_at = U.isoDate(opts.submitted_at || U.today()); p.submission_method = opts.method || p.submission_method || 'portal';
    p.technical_status = 'approved'; p.commercial_status = 'approved';
    this._touch(p);
    this._audit('submit', 'proposal', p.id, { status: before.status }, { status: 'submitted', submitted_at: p.submitted_at, method: p.submission_method, version_no: p.version_no }, 'ui');
    /* نقل الفرصة إلى "تم تقديم العرض" إن كانت في مرحلة سابقة */
    var opp = this._find('opportunity', p.opportunity_id);
    if (opp && STAGES.get(opp.stage).order < STAGES.get('proposal_submitted').order) {
      var from = opp.stage; opp.stage = 'proposal_submitted'; opp.stage_entered_at = U.today(); opp.probability = STAGES.get('proposal_submitted').probability; opp.waiting_on = 'customer'; this._touch(opp);
      this.db.stage_history.push({ id: U.uid('sh'), opportunity_id: opp.id, from_stage: from, to_stage: 'proposal_submitted', changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: 'تقديم العرض ' + p.id + '/v' + p.version_no, note: null });
      this._audit('stage_change', 'opportunity', opp.id, { stage: from }, { stage: 'proposal_submitted', reason: 'proposal_submitted' }, 'system');
    }
    /* نشاط تقديم العرض */
    var act = Object.assign(MODEL.defaults('activity', this.user.id), { id: this._nextId('ACT'), customer_id: opp ? opp.customer_id : null, opportunity_id: p.opportunity_id, contact_id: opp ? opp.main_contact_id : null, type: 'proposal_submission', at: U.isoDateTime(U.now()), owner_id: this.user.id, purpose: 'تقديم العرض ' + p.id + ' (نسخة ' + p.version_no + ')', outcome: 'تم التقديم عبر ' + L.label('submission_methods', p.submission_method, 'ar'), status: 'done', priority: 'medium', completed_at: U.isoDateTime(U.now()), created_by: this.user.id, origin: 'platform' });
    this.db.activities.push(act);
    this._persist();
    return Promise.resolve({ proposal: this._mask('proposal', U.clone(p)) });
  };

  /* ---------- الاعتمادات ---------- */
  P.requestApproval = function (type, entityType, entityId, payload) {
    this._requireUser();
    if (!RULES.approvals[type]) return Promise.reject(AErr('validation', 'type'));
    var ap = { id: this._nextId('APR'), type: type, entity_type: entityType, entity_id: entityId, requested_by: this.user.id, requested_at: U.isoDateTime(U.now()), status: 'pending', decided_by: null, decided_at: null, reason: null, payload: U.clone(payload || {}) };
    this.db.approvals.push(ap);
    this._audit('approval_request', entityType, entityId, null, { type: type, approval_id: ap.id }, 'ui');
    this._persist();
    return Promise.resolve(U.clone(ap));
  };
  P.decideApproval = function (id, decision, reason) {
    var self = this; this._requireUser();
    var ap = this.db.approvals.find(function (a) { return a.id === id; }); if (!ap) return Promise.reject(AErr('not_found'));
    if (ap.status !== 'pending') return Promise.reject(AErr('invalid_transition', 'decided'));
    if (!PERMS.canDecide(this.user, ap.type)) return Promise.reject(AErr('forbidden'));
    if (ap.requested_by === this.user.id && this.user.role !== 'system_admin') return Promise.reject(AErr('forbidden', 'self_approval'));
    if (decision !== 'approved' && decision !== 'rejected') return Promise.reject(AErr('validation', 'decision'));
    if (decision === 'rejected' && !reason) return Promise.reject(AErr('validation', 'reason', { reason: 'app.reason_required' }));
    ap.status = decision; ap.decided_by = this.user.id; ap.decided_at = U.isoDateTime(U.now()); ap.reason = reason || null;
    this._audit(decision === 'approved' ? 'approve' : 'reject', ap.entity_type, ap.entity_id, { approval: ap.id, status: 'pending' }, { approval: ap.id, status: decision, reason: reason || null, type: ap.type }, 'ui');
    /* تنفيذ الإجراء المعلّق */
    var action = ap.payload && ap.payload.action;
    if (action === 'approve_proposal') {
      var p = this._proposalByIdVersion(ap.entity_id, ap.payload.version_no);
      if (p) {
        var pending = this.db.approvals.filter(function (a) { return a.entity_type === 'proposal' && a.entity_id === p.id && a.status === 'pending' && (a.payload || {}).version_no === p.version_no; });
        if (decision === 'rejected') { p.approval_status = 'rejected'; p.status = 'in_preparation'; p.comments = (p.comments || []).concat([{ at: U.isoDateTime(U.now()), by: this.user.id, text: 'رُفض الاعتماد: ' + (reason || '') }]); pending.forEach(function (a) { if (a.id !== ap.id) { a.status = 'cancelled'; a.reason = 'superseded'; } }); }
        else if (!pending.length) { p.approval_status = 'approved'; p.status = 'ready'; }
        this._touch(p);
      }
    } else if (action === 'confirm_contract') {
      var c = this._find('contract', ap.entity_id);
      if (c && decision === 'approved') { c.status = 'approved'; this._touch(c); this._audit('update', 'contract', c.id, { status: 'under_review' }, { status: 'approved' }, 'system'); }
    } else if (action === 'campaign') {
      var cm = this._find('campaign', ap.entity_id);
      if (cm) { if (decision === 'approved') { cm.status = 'approved'; cm.approved_by = this.user.id; cm.approved_at = U.isoDateTime(U.now()); } else { cm.status = 'draft'; cm.rejection_reason = reason; } this._touch(cm); }
    }
    this._persist();
    return Promise.resolve(U.clone(ap));
  };
  P.approvals = function (q) {
    var self = this; this._requireUser(); q = q || {};
    var rows = this.db.approvals.filter(function (a) {
      if (q.status && a.status !== q.status) return false;
      if (q.mine) return a.requested_by === self.user.id;
      if (q.for_me) return PERMS.canDecide(self.user, a.type) && a.requested_by !== self.user.id;
      return PERMS.can(self.user, 'approvals.decide') || a.requested_by === self.user.id || PERMS.can(self.user, 'audit.view');
    });
    return Promise.resolve(U.clone(rows.slice().reverse()));
  };

  /* ---------- العقود والتسليم ---------- */
  P.convertToContract = function (oppId, data) {
    this._requireUser(); data = data || {};
    var opp = this._find('opportunity', oppId); if (!opp) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'contracts.manage', null, [opp]) && !PERMS.can(this.user, 'contracts.manage')) return Promise.reject(AErr('forbidden'));
    if (!STAGES.isWon(opp.stage)) return Promise.reject(AErr('invalid_transition', 'not_awarded'));
    var existing = this.db.contracts.find(function (c) { return c.opportunity_id === opp.id && !c.archived_at; });
    if (existing) return Promise.reject(AErr('invalid_transition', 'contract_exists', { contract_id: existing.id }));
    var latestProp = U.sortBy(this.db.proposals.filter(function (p) { return p.opportunity_id === opp.id && !p.archived_at; }), 'version_no', 'desc')[0];
    var rec = Object.assign(MODEL.defaults('contract', this.user.id), {
      opportunity_id: opp.id, customer_id: opp.customer_id, proposal_id: latestProp ? latestProp.id : null,
      contract_value: latestProp && latestProp.proposed_value !== null && latestProp.proposed_value !== undefined ? latestProp.proposed_value : opp.estimated_value,
      vat_treatment: opp.vat_treatment || 'standard', start_date: opp.expected_start_date || null, duration_months: opp.expected_duration_months || null,
      payment_terms: opp.payment_terms || 'monthly_ipc', retention_pct: opp.retention_pct !== null && opp.retention_pct !== undefined ? opp.retention_pct : RULES.defaults.retention_pct,
      warranty_months: opp.warranty_months || RULES.defaults.warranty_months, reviewer_id: this.user.role === 'contract_reviewer' ? this.user.id : null
    }, MODEL.normalize('contract', data));
    rec.id = this._nextId('CTR'); rec.end_date = MODEL.contractEndDate(rec);
    rec.created_at = U.isoDateTime(U.now()); rec.created_by = this.user.id; rec.updated_at = rec.created_at; rec.updated_by = this.user.id; rec.version = 1; rec.origin = 'platform';
    this.db.contracts.push(rec);
    this._audit('convert', 'opportunity', opp.id, { stage: opp.stage }, { contract_id: rec.id }, 'ui');
    this._audit('create', 'contract', rec.id, null, rec, 'system');
    if (opp.stage === 'awarded') {
      var from = opp.stage; opp.stage = 'contract_review'; opp.stage_entered_at = U.today(); opp.probability = STAGES.get('contract_review').probability; this._touch(opp);
      this.db.stage_history.push({ id: U.uid('sh'), opportunity_id: opp.id, from_stage: from, to_stage: 'contract_review', changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: 'إنشاء سجل العقد ' + rec.id, note: null });
    }
    if (latestProp && latestProp.result === 'pending') { latestProp.result = 'accepted'; latestProp.status = 'accepted'; this._touch(latestProp); }
    this._persist();
    return Promise.resolve(this._mask('contract', U.clone(rec)));
  };
  P.markSigned = function (contractId, data) {
    this._requireUser(); data = data || {};
    var c = this._find('contract', contractId); if (!c) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'contracts.manage', c, this._parents('contract', c))) return Promise.reject(AErr('forbidden'));
    try { this._ensureVersion(c, data.version); } catch (e) { return Promise.reject(e); }
    /* تأكيد مرحلة التعاقد يتطلب اعتمادًا (contract_confirm) إن كان مفعّلًا والعقد لم يُعتمد بعد */
    if (PERMS.needsApproval(this.user, 'contract_confirm', {}) && c.status !== 'approved' && c.status !== 'signed' && c.status !== 'active') {
      if (!PERMS.canDecide(this.user, 'contract_confirm')) {
        var ex = this.db.approvals.find(function (a) { return a.entity_type === 'contract' && a.entity_id === c.id && a.status === 'pending'; });
        if (ex) return Promise.resolve({ approval_required: true, approval: U.clone(ex) });
        return this.requestApproval('contract_confirm', 'contract', c.id, { action: 'confirm_contract', value: c.contract_value }).then(function (ap) { return { approval_required: true, approval: ap }; });
      }
    }
    var before = U.clone(c);
    c.status = 'signed'; c.signed_at = U.isoDate(data.signed_at || U.today());
    if (data.contract_value !== undefined) c.contract_value = U.num(data.contract_value);
    if (data.contract_ref) c.contract_ref = data.contract_ref;
    if (data.start_date) c.start_date = U.isoDate(data.start_date);
    c.end_date = MODEL.contractEndDate(c);
    this._touch(c);
    this._audit('update', 'contract', c.id, { status: before.status, signed_at: before.signed_at }, { status: 'signed', signed_at: c.signed_at }, 'ui');
    var opp = this._find('opportunity', c.opportunity_id);
    if (opp && opp.stage !== 'contract_signed' && opp.stage !== 'handover') {
      var from = opp.stage; opp.stage = 'contract_signed'; opp.stage_entered_at = U.today(); opp.probability = 100; opp.closed_at = opp.closed_at || U.today(); this._touch(opp);
      this.db.stage_history.push({ id: U.uid('sh'), opportunity_id: opp.id, from_stage: from, to_stage: 'contract_signed', changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: 'توقيع العقد ' + c.id, note: null });
    }
    var cust = this._find('customer', c.customer_id); if (cust && cust.status === 'prospect') { cust.status = 'active'; this._touch(cust); this._audit('update', 'customer', cust.id, { status: 'prospect' }, { status: 'active' }, 'system'); }
    this._persist();
    return Promise.resolve({ contract: this._mask('contract', U.clone(c)) });
  };
  P.prepareHandover = function (contractId, pkg) {
    this._requireUser(); pkg = pkg || {};
    var c = this._find('contract', contractId); if (!c) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'handover.manage', c, this._parents('contract', c))) return Promise.reject(AErr('forbidden'));
    if (['signed', 'active'].indexOf(c.status) < 0) return Promise.reject(AErr('invalid_transition', 'not_signed'));
    if (c.handover_status === 'accepted') return Promise.reject(AErr('invalid_transition', 'accepted'));
    var before = { handover_status: c.handover_status };
    c.handover = Object.assign({}, c.handover || {}, { summary: pkg.summary || '', final_scope: pkg.final_scope || '', key_contacts: pkg.key_contacts || [], commitments: pkg.commitments || c.key_commitments, exclusions: pkg.exclusions || c.exclusions, payment_terms: c.payment_terms, guarantees: pkg.guarantees || '', start_date: c.start_date, key_risks: pkg.key_risks || c.key_risks, outstanding_actions: pkg.outstanding_actions || [], lessons: pkg.lessons || '', prepared_by: this.user.id, prepared_at: U.isoDateTime(U.now()), accepted_by: null, accepted_at: null });
    c.handover_status = 'prepared';
    this._touch(c);
    this._audit('handover', 'contract', c.id, before, { handover_status: 'prepared', prepared_by: this.user.id }, 'ui');
    this._persist();
    return Promise.resolve(this._mask('contract', U.clone(c)));
  };
  P.acceptHandover = function (contractId, data) {
    this._requireUser(); data = data || {};
    var c = this._find('contract', contractId); if (!c) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'handover.manage', c, this._parents('contract', c))) return Promise.reject(AErr('forbidden'));
    if (c.handover_status !== 'prepared') return Promise.reject(AErr('invalid_transition', 'not_prepared'));
    c.handover.accepted_by = this.user.id; c.handover.accepted_at = U.isoDateTime(U.now()); c.handover.acceptance_note = data.note || null;
    c.handover_status = 'accepted'; c.status = c.status === 'signed' ? 'active' : c.status; if (data.delivery_ref) c.delivery_ref = data.delivery_ref;
    this._touch(c);
    var opp = this._find('opportunity', c.opportunity_id);
    var prj = Object.assign(MODEL.defaults('project', this.user.id), { id: this._nextId('PRJ'), contract_id: c.id, customer_id: c.customer_id, name: opp ? (opp.project_name || opp.name) : c.id, status: 'handed_over', region: opp ? opp.region : null, city: opp ? opp.city : null, start_date: c.start_date, expected_end_date: c.end_date, value: c.contract_value, delivery_ref: c.delivery_ref || null, created_by: this.user.id, origin: 'platform' });
    this.db.projects.push(prj);
    if (opp && opp.stage !== 'handover') { var from = opp.stage; opp.stage = 'handover'; opp.stage_entered_at = U.today(); this._touch(opp); this.db.stage_history.push({ id: U.uid('sh'), opportunity_id: opp.id, from_stage: from, to_stage: 'handover', changed_by: this.user.id, changed_at: U.isoDateTime(U.now()), reason: 'استلام حزمة التسليم ' + c.id, note: null }); }
    this._audit('handover', 'contract', c.id, { handover_status: 'prepared' }, { handover_status: 'accepted', accepted_by: this.user.id, project_id: prj.id }, 'ui');
    this._persist();
    return Promise.resolve({ contract: this._mask('contract', U.clone(c)), project: U.clone(prj) });
  };

  /* ---------- الأنشطة ---------- */
  P.completeActivity = function (id, data) {
    this._requireUser(); data = data || {};
    var a = this._find('activity', id); if (!a) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'activities.manage', a, this._parents('activity', a))) return Promise.reject(AErr('forbidden'));
    if (a.status === 'done') return Promise.resolve(U.clone(a));
    var before = { status: a.status };
    a.status = 'done'; a.completed_at = U.isoDateTime(U.now()); if (data.outcome) a.outcome = data.outcome; if (data.next_action) a.next_action = data.next_action;
    this._touch(a);
    this._audit('complete', 'activity', a.id, before, { status: 'done', outcome: a.outcome }, 'ui');
    /* تحديث آخر تواصل لجهة الاتصال */
    if (a.contact_id) { var ct = this._find('contact', a.contact_id); if (ct) { ct.last_contact_at = U.today(); } }
    /* إنشاء متابعة تالية اختيارية */
    var follow = null;
    if (data.follow_up_date) {
      follow = Object.assign(MODEL.defaults('activity', this.user.id), { id: this._nextId('ACT'), customer_id: a.customer_id, contact_id: a.contact_id, opportunity_id: a.opportunity_id, type: data.follow_up_type || 'reminder', at: U.isoDateTime(U.parseDate(data.follow_up_date)), owner_id: a.owner_id, purpose: data.next_action || a.next_action || a.purpose, status: 'planned', priority: a.priority, due_date: U.isoDate(data.follow_up_date), created_by: this.user.id, origin: 'platform' });
      this.db.activities.push(follow);
      this._audit('create', 'activity', follow.id, null, follow, 'ui');
    }
    this._persist();
    return Promise.resolve({ activity: U.clone(a), follow_up: follow ? U.clone(follow) : null });
  };
  P.rescheduleActivity = function (id, newDate, reason) {
    this._requireUser();
    var a = this._find('activity', id); if (!a) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'activities.manage', a, this._parents('activity', a))) return Promise.reject(AErr('forbidden'));
    var d = U.parseDate(newDate); if (!d) return Promise.reject(AErr('validation', 'date', { due_date: 'app.invalid_date' }));
    var before = { at: a.at, due_date: a.due_date };
    var t = U.parseDate(a.at); if (t && !/T/.test(String(newDate))) { d.setHours(t.getHours(), t.getMinutes()); }
    a.at = U.isoDateTime(d); a.due_date = U.isoDate(d); a.status = 'planned'; a.reschedule_count = (a.reschedule_count || 0) + 1; a.reschedule_reason = reason || null;
    this._touch(a);
    this._audit('reschedule', 'activity', a.id, before, { at: a.at, due_date: a.due_date, reason: reason || null }, 'ui');
    this._persist();
    return Promise.resolve(U.clone(a));
  };

  /* ---------- حملات التهاني ---------- */
  P.buildRecipients = function (criteria, campaignId) {
    var self = this; this._requireUser(); criteria = criteria || {};
    if (!PERMS.can(this.user, 'occasions.manage') && !PERMS.can(this.user, 'occasions.approve')) return Promise.reject(AErr('forbidden'));
    var camp = campaignId ? this._find('campaign', campaignId) : null;
    var occKey = camp ? camp.occasion_key : criteria.occasion_key, year = camp ? camp.year : criteria.year;
    var sentBefore = {};
    this.db.campaigns.forEach(function (c) { if (c.occasion_key === occKey && c.year === year && (!camp || c.id !== camp.id)) (c.sent_log || []).forEach(function (s) { sentBefore[s.contact_id] = c.id; }); });
    var seen = {}, recipients = [];
    var custById = U.by(this.db.customers, 'id');
    this.db.contacts.forEach(function (k) {
      if (k.archived_at) return;
      var c = custById[k.customer_id]; if (!c) return;
      if (criteria.customer_ids && criteria.customer_ids.length && criteria.customer_ids.indexOf(c.id) < 0) return;
      if (criteria.statuses && criteria.statuses.length && criteria.statuses.indexOf(c.status) < 0) return;
      if (criteria.classes && criteria.classes.length && criteria.classes.indexOf(c.classification) < 0) return;
      if (criteria.types && criteria.types.length && criteria.types.indexOf(c.customer_type) < 0) return;
      if (criteria.regions && criteria.regions.length && criteria.regions.indexOf(c.region) < 0) return;
      if (criteria.roles && criteria.roles.length && !(k.roles || []).some(function (r) { return criteria.roles.indexOf(r) >= 0; })) return;
      if (criteria.languages && criteria.languages.length && criteria.languages.indexOf(k.preferred_language) < 0) return;
      var r = { contact_id: k.id, customer_id: c.id, contact_name: k.full_name, customer_name: c.name_ar, customer_name_en: c.name_en, email: k.email, phone: k.phone, language: k.preferred_language || c.preferred_language || 'ar', status: 'included', exclusion: null };
      if (c.archived_at || c.status === 'archived') { r.status = 'excluded'; r.exclusion = 'archived'; }
      else if (k.greeting_opt_out) { r.status = 'excluded'; r.exclusion = 'optout'; }
      else if (k.active === false) { r.status = 'excluded'; r.exclusion = 'inactive'; }
      else if (!k.email && !k.phone) { r.status = 'excluded'; r.exclusion = 'no_channel'; }
      else if (sentBefore[k.id]) { r.status = 'excluded'; r.exclusion = 'sent'; }
      else if (seen[(k.email || '').toLowerCase() || ('p:' + U.normPhone(k.phone || ''))]) { r.status = 'excluded'; r.exclusion = 'duplicate'; }
      if (r.status === 'included') seen[(k.email || '').toLowerCase() || ('p:' + U.normPhone(k.phone || ''))] = true;
      recipients.push(r);
    });
    var included = recipients.filter(function (r) { return r.status === 'included'; }).length;
    if (camp) {
      if (!PERMS.canRecord(this.user, 'occasions.manage', camp)) return Promise.reject(AErr('forbidden'));
      if (['approved', 'exported', 'closed'].indexOf(camp.status) >= 0) return Promise.reject(AErr('invalid_transition', 'locked'));
      camp.recipients = recipients; camp.criteria = U.clone(criteria); camp.status = 'draft'; this._touch(camp);
      this._audit('campaign_prepare', 'campaign', camp.id, null, { included: included, excluded: recipients.length - included }, 'ui');
      this._persist();
    }
    return Promise.resolve({ recipients: recipients, included: included, excluded: recipients.length - included });
  };
  P.campaignSubmit = function (id) {
    this._requireUser();
    var cm = this._find('campaign', id); if (!cm) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'occasions.manage', cm)) return Promise.reject(AErr('forbidden'));
    var included = (cm.recipients || []).filter(function (r) { return r.status === 'included'; }).length;
    if (!included) return Promise.reject(AErr('validation', 'no_recipients'));
    if (!cm.template_ar && !cm.template_en) return Promise.reject(AErr('validation', 'template', { template_ar: 'app.field_required' }));
    var occ = root.OCCASIONS_CONFIG.get(cm.occasion_key);
    if (occ && occ.enabled === false) return Promise.reject(AErr('invalid_transition', 'policy_gated'));
    cm.status = 'pending_approval'; this._touch(cm);
    var self = this;
    return this.requestApproval('bulk_greeting', 'campaign', cm.id, { action: 'campaign', recipients: included, occasion: cm.occasion_key, year: cm.year }).then(function (ap) { self._persist(); return { campaign: U.clone(cm), approval: ap }; });
  };
  P.campaignExport = function (id) {
    this._requireUser();
    var cm = this._find('campaign', id); if (!cm) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'occasions.manage', cm) && !PERMS.can(this.user, 'occasions.approve')) return Promise.reject(AErr('forbidden'));
    if (['approved', 'exported', 'closed'].indexOf(cm.status) < 0) return Promise.reject(AErr('invalid_transition', 'not_approved'));
    var rows = (cm.recipients || []).filter(function (r) { return r.status === 'included'; });
    var company = (root.APP_CONFIG.platform.company_ar || '');
    var out = rows.map(function (r) {
      var tpl = r.language === 'en' ? (cm.template_en || cm.template_ar) : (cm.template_ar || cm.template_en);
      var msg = (tpl || '').replace(/\{customer\}/g, r.language === 'en' ? (r.customer_name_en || r.customer_name) : r.customer_name).replace(/\{contact\}/g, r.contact_name).replace(/\{company\}/g, r.language === 'en' ? (root.APP_CONFIG.platform.company_en || company) : company);
      return { contact_id: r.contact_id, contact_name: r.contact_name, customer: r.customer_name, email: r.email, phone: r.phone, language: r.language, message: msg, design_ref: cm.design_ref };
    });
    if (cm.status === 'approved') cm.status = 'exported';
    cm.exported_at = U.isoDateTime(U.now()); cm.exported_by = this.user.id; this._touch(cm);
    this._audit('export', 'campaign', cm.id, null, { rows: out.length }, 'ui');
    this._persist();
    return Promise.resolve({ rows: out, campaign: U.clone(cm) });
  };
  P.campaignRecordSent = function (id, entries, channel) {
    this._requireUser();
    var cm = this._find('campaign', id); if (!cm) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'occasions.manage', cm)) return Promise.reject(AErr('forbidden'));
    if (['approved', 'exported', 'closed'].indexOf(cm.status) < 0) return Promise.reject(AErr('invalid_transition', 'not_approved'));
    var already = {}; (cm.sent_log || []).forEach(function (s) { already[s.contact_id] = true; });
    var added = 0, self = this;
    (entries || []).forEach(function (cid) { if (already[cid]) return; if (!(cm.recipients || []).some(function (r) { return r.contact_id === cid && r.status === 'included'; })) return; cm.sent_log.push({ contact_id: cid, sent_by: self.user.id, sent_at: U.isoDateTime(U.now()), channel: channel || 'approved_channel' }); already[cid] = true; added++; });
    this._touch(cm);
    this._audit('campaign_sent', 'campaign', cm.id, null, { added: added, channel: channel || null }, 'ui');
    this._persist();
    return Promise.resolve({ campaign: U.clone(cm), added: added });
  };
  P.campaignClose = function (id) {
    this._requireUser();
    var cm = this._find('campaign', id); if (!cm) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, 'occasions.manage', cm)) return Promise.reject(AErr('forbidden'));
    cm.status = 'closed'; this._touch(cm); this._audit('update', 'campaign', cm.id, null, { status: 'closed' }, 'ui'); this._persist();
    return Promise.resolve(U.clone(cm));
  };

  /* ---------- الدمج ---------- */
  P.mergeCustomers = function (keepId, mergeId) {
    this._requireUser();
    if (!PERMS.can(this.user, 'duplicates.review')) return Promise.reject(AErr('forbidden'));
    var keep = this._find('customer', keepId), merge = this._find('customer', mergeId);
    if (!keep || !merge || keepId === mergeId) return Promise.reject(AErr('not_found'));
    var moved = { contacts: 0, opportunities: 0, activities: 0, contracts: 0, projects: 0 };
    var self = this;
    ['contacts', 'opportunities', 'activities', 'contracts', 'projects'].forEach(function (t) { self.db[t].forEach(function (r) { if (r.customer_id === mergeId) { r.customer_id = keepId; moved[t]++; } }); });
    /* استكمال حقول فارغة في السجل المحتفظ به */
    ['name_en', 'cr_number', 'unified_number', 'vat_number', 'website', 'phone', 'email', 'address', 'city'].forEach(function (k) { if (!keep[k] && merge[k]) keep[k] = merge[k]; });
    keep.tags = U.uniq((keep.tags || []).concat(merge.tags || []));
    merge.archived_at = U.isoDateTime(U.now()); merge.status = 'archived'; merge.merged_into = keepId;
    this._touch(keep); this._touch(merge);
    this.db.duplicates.push({ id: U.uid('dup'), kind: 'customer', a: keepId, b: mergeId, status: 'merged', reviewed_by: this.user.id, reviewed_at: U.isoDateTime(U.now()) });
    this._audit('merge', 'customer', keepId, { merged: mergeId }, { moved: moved }, 'ui');
    this._persist();
    return Promise.resolve({ keep: U.clone(keep), merged: U.clone(merge), moved: moved });
  };
  P.dismissDuplicate = function (kind, aId, bId) {
    this._requireUser();
    if (!PERMS.can(this.user, 'duplicates.review')) return Promise.reject(AErr('forbidden'));
    this.db.duplicates.push({ id: U.uid('dup'), kind: kind, a: aId, b: bId, status: 'dismissed', reviewed_by: this.user.id, reviewed_at: U.isoDateTime(U.now()) });
    this._audit('update', 'duplicate', aId + '|' + bId, null, { status: 'dismissed', kind: kind }, 'ui');
    this._persist();
    return Promise.resolve(true);
  };

  /* ---------- الاستيراد والتصدير ---------- */
  P.importRows = function (module, rows, fileName) {
    var self = this; this._requireUser();
    if (!PERMS.can(this.user, 'import.data')) return Promise.reject(AErr('forbidden'));
    var res = IMPORTER.validate(module, rows, this.db, this.db.users);
    var entity = IMPORTER.templates[module] ? IMPORTER.templates[module].entity : null;
    var inserted = [], skipped = 0;
    if (entity && res.rows.length) {
      res.rows.forEach(function (r) {
        if (!r.ok) { skipped++; return; }
        var rec = Object.assign(MODEL.defaults(entity, self.user.id), MODEL.normalize(entity, r.data));
        var v = MODEL.validate(entity, rec);
        if (!v.ok) { skipped++; r.errors.push({ field: Object.keys(v.errors)[0], key: 'required' }); r.ok = false; return; }
        rec.id = self._nextId(MODEL.PREFIX[entity]); rec.origin = 'import'; rec.import_file = fileName || null;
        rec.created_at = U.isoDateTime(U.now()); rec.created_by = self.user.id; rec.updated_at = rec.created_at; rec.updated_by = self.user.id; rec.version = 1; rec.archived_at = null;
        if (entity === 'opportunity') { rec.stage_entered_at = U.today(); if (rec.probability === null || rec.probability === undefined) rec.probability = STAGES.get(rec.stage).probability; rec.closed_at = (STAGES.isTerminal(rec.stage) || STAGES.isWon(rec.stage)) ? U.today() : null; self.db.stage_history.push({ id: U.uid('sh'), opportunity_id: rec.id, from_stage: null, to_stage: rec.stage, changed_by: self.user.id, changed_at: U.isoDateTime(U.now()), reason: 'استيراد', note: fileName || null }); }
        self._table(entity).push(rec); inserted.push(rec.id);
      });
    }
    var job = { id: U.uid('imp'), module: module, file: fileName || null, at: U.isoDateTime(U.now()), by: this.user.id, rows: rows ? rows.length : 0, inserted: inserted.length, skipped: skipped, structure_errors: res.structure_errors };
    this.db.import_jobs.push(job);
    this._audit('import', entity || module, job.id, null, { file: fileName || null, rows: job.rows, inserted: job.inserted, skipped: job.skipped }, 'import');
    this._persist();
    res.inserted = inserted.length; res.skipped = skipped; res.job = job;
    return Promise.resolve(res);
  };
  P.logExport = function (module, count, filters) {
    this._requireUser();
    if (!PERMS.can(this.user, 'export.data')) return Promise.reject(AErr('forbidden'));
    if (PERMS.needsApproval(this.user, 'data_export', {})) {
      var self = this;
      var ex = this.db.approvals.find(function (a) { return a.type === 'data_export' && a.requested_by === self.user.id && a.status === 'approved' && a.payload && a.payload.module === module && !a.payload.used; });
      if (ex) { ex.payload.used = true; ex.payload.used_at = U.isoDateTime(U.now()); this._audit('export', module, 'list', null, { count: count, filters: filters || null, approval: ex.id }, 'ui'); this._persist(); return Promise.resolve({ allowed: true, approval: U.clone(ex) }); }
      return this.requestApproval('data_export', module, 'list', { action: 'export', module: module, count: count, filters: filters || null }).then(function (ap) { return { allowed: false, approval: ap }; });
    }
    this._audit('export', module, 'list', null, { count: count, filters: filters || null }, 'ui');
    this._persist();
    return Promise.resolve({ allowed: true });
  };

  /* ---------- العروض المحفوظة ---------- */
  P.savedViews = function (module) { var self = this; this._requireUser(); return Promise.resolve(U.clone(this.db.saved_views.filter(function (v) { return v.user_id === self.user.id && (!module || v.module === module); }))); };
  P.saveView = function (view) {
    this._requireUser();
    var v = { id: U.uid('sv'), user_id: this.user.id, module: view.module, name: U.trim(view.name) || 'عرض', filters: U.clone(view.filters || {}), sort: view.sort || null, columns: view.columns || null, created_at: U.isoDateTime(U.now()) };
    if (!v.name) return Promise.reject(AErr('validation', 'name'));
    this.db.saved_views.push(v); this._persist();
    return Promise.resolve(U.clone(v));
  };
  P.deleteView = function (id) { var self = this; this._requireUser(); this.db.saved_views = this.db.saved_views.filter(function (v) { return !(v.id === id && v.user_id === self.user.id); }); this._persist(); return Promise.resolve(true); };

  /* ---------- المستندات (بيانات وصفية) ---------- */
  P.addDocument = function (doc) {
    this._requireUser();
    var parentEntity = doc.entity_type, parent = this._find(parentEntity, doc.entity_id);
    if (!parent) return Promise.reject(AErr('not_found'));
    if (!PERMS.canRecord(this.user, EDIT_PERM[parentEntity], parent, this._parents(parentEntity, parent))) return Promise.reject(AErr('forbidden'));
    var d = { id: U.uid('doc'), entity_type: parentEntity, entity_id: doc.entity_id, name: U.trim(doc.name), doc_type: doc.doc_type || 'other', storage_ref: U.trim(doc.storage_ref || ''), classification: doc.classification || 'internal', uploaded_by: this.user.id, uploaded_at: U.isoDateTime(U.now()), origin: 'platform' };
    if (!d.name) return Promise.reject(AErr('validation', 'name', { name: 'app.field_required' }));
    this.db.documents.push(d);
    this._audit('create', 'document', d.id, null, d, 'ui');
    this._persist();
    return Promise.resolve(U.clone(d));
  };

  /* ---------- الإعدادات (محلي) ---------- */
  P._applyConfigOverrides = function () {
    var ov = this.db.config_overrides || {};
    Object.keys(ov).forEach(function (k) {
      if (k.indexOf('lookups.') === 0) { var list = k.slice(8); if (L[list]) L[list] = ov[k]; }
      else if (k.indexOf('rules.') === 0) { var path = k.slice(6).split('.'); var o = RULES; for (var i = 0; i < path.length - 1; i++) { o = o[path[i]]; if (!o) return; } o[path[path.length - 1]] = ov[k]; }
      else if (k.indexOf('stages.') === 0) { var sk = k.slice(7); var st = STAGES.get(sk); if (st) Object.assign(st, ov[k]); }
      else if (k === 'occasions') { ov[k].forEach(function (o) { var cur = root.OCCASIONS_CONFIG.get(o.key); if (cur) Object.assign(cur, o); }); }
      else if (k === 'templates') { Object.keys(ov[k]).forEach(function (t) { root.OCCASIONS_CONFIG.templates[t] = ov[k][t]; }); }
    });
  };
  P.getConfig = function () { this._requireUser(); return Promise.resolve({ lookups: U.clone(L), rules: U.clone(RULES), stages: U.clone(STAGES.list), occasions: U.clone(root.OCCASIONS_CONFIG.list), templates: U.clone(root.OCCASIONS_CONFIG.templates), overrides: U.clone(this.db.config_overrides || {}) }); };
  P.setConfig = function (key, value) {
    this._requireUser();
    if (!PERMS.can(this.user, 'admin.config')) return Promise.reject(AErr('forbidden'));
    this.db.config_overrides = this.db.config_overrides || {};
    var before = this.db.config_overrides[key];
    this.db.config_overrides[key] = U.clone(value);
    this._applyConfigOverrides();
    this._audit('config_change', 'config', key, before === undefined ? null : before, value, 'ui');
    this._persist();
    return Promise.resolve(true);
  };

  root.LocalAdapter = LocalAdapter;
})(typeof window !== 'undefined' ? window : globalThis);
