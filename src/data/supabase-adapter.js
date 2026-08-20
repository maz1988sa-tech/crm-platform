/* =====================================================================
   SUPABASE ADAPTER — المحوّل الحقيقي لطبقة البيانات (Supabase: Auth + PostgREST + RPC)
   ---------------------------------------------------------------------
   - نفس واجهة LocalAdapter تمامًا (كل الدوال تعيد Promise بنفس الأشكال ورموز الأخطاء).
   - القراءة عبر العروض v_* (حجب الحقول الحسّاسة في الخادم) والجداول المسموح بها بسياسات RLS.
   - الكتابة البسيطة عبر PostgREST (insert/update) مع حارس الإصدار (version = current + 1)؛
     الإجراءات الحسّاسة (المرحلة، التقديم، الاعتمادات، العقود، التسليم، الحملات، الدمج، الاستيراد،
     التصدير، الإعدادات) عبر دوال RPC بصلاحيات مُفرَضة داخل قاعدة البيانات.
   - لا أسرار هنا: مفتاح publishable فقط؛ الحماية في RLS/RPC (انظر supabase/README.md).
   - الأخطاء تُترجم من رموز Postgres: 42501→forbidden · 22023→validation · 40001→stale ·
     P0002→not_found · 55000→invalid_transition · شبكة→network.
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, MODEL = root.MODEL, PERMS = root.PERMS, STAGES = root.STAGES, RULES = root.RULES, IMPORTER = root.IMPORTER, L = root.LOOKUPS;
  var AErr = root.ADAPTER.Error;

  var TABLE = { customer: 'customers', contact: 'contacts', opportunity: 'opportunities', proposal: 'proposals', contract: 'contracts', project: 'projects', activity: 'activities', campaign: 'campaigns', user: 'profiles' };
  /* مصدر القراءة: العروض المحجوبة للجداول ذات الحقول الحسّاسة */
  var READ = { customer: 'v_customers', opportunity: 'v_opportunities', proposal: 'v_proposals', contract: 'v_contracts', project: 'v_projects', contact: 'contacts', activity: 'activities', campaign: 'campaigns', user: 'profiles' };
  var VIEW_PERM = { customer: 'customers.view', contact: 'customers.view', opportunity: 'opportunities.view', proposal: 'proposals.view', contract: 'contracts.view', project: 'contracts.view', activity: 'activities.view', campaign: 'occasions.manage', user: 'admin.users' };
  var CREATE_PERM = { customer: 'customers.create', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage', project: 'contracts.manage', activity: 'activities.manage', campaign: 'occasions.manage', user: 'admin.users' };
  var EDIT_PERM = { customer: 'customers.edit', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage', project: 'contracts.manage', activity: 'activities.manage', campaign: 'occasions.manage', user: 'admin.users' };
  var PAGE = 1000;
  /* حقول لا تُرسل إلى الخادم أبدًا (يديرها الخادم أو خاصة بالواجهة) */
  var SERVER_MANAGED = ['created_at', 'created_by', 'updated_at', 'updated_by', 'archived_at', 'archive_reason', 'demo', '_masked', 'origin', 'source_system', 'source_id', 'synced_at', 'import_file', 'merged_into'];

  function SupabaseAdapter(config) {
    this.cfg = config || root.APP_CONFIG;
    this.mode = 'supabase';
    this.client = null;
    this.user = null;
    this.demo = false;
    this._listeners = [];
    this._overrides = {};
    this._last = null;        // آخر لقطة (للتحققات المحلية مثل الاستيراد)
    this._profiles = [];
  }
  var P = SupabaseAdapter.prototype;

  /* ---------- أدوات ---------- */
  function mapError(e) {
    if (!e) return AErr('network', 'unknown');
    if (e.code && ['forbidden', 'validation', 'stale', 'not_found', 'invalid_transition', 'network', 'config', 'approval_required'].indexOf(e.code) >= 0) return e;
    var code = String(e.code || ''), msg = e.message || String(e), details = null;
    if (e.details) { try { details = typeof e.details === 'string' ? JSON.parse(e.details) : e.details; } catch (x) { details = { detail: e.details }; } }
    if (code === '42501' || code === 'PGRST301' || code === '401' || code === '403') return AErr('forbidden', msg, details);
    if (code === '22023' || code === '23514' || code === '22P02' || code === '23502') return AErr('validation', msg, details || {});
    if (code === '40001') return AErr('stale', msg, details);
    if (code === 'P0002' || code === 'PGRST116') return AErr('not_found', msg, details);
    if (code === '55000' || code === '23505' || code === '23503') return AErr('invalid_transition', msg, details);
    if (/fetch|network|Failed to fetch|timeout|abort/i.test(msg)) return AErr('network', msg);
    var er = AErr(code || 'error', msg, details); return er;
  }
  P._rpc = function (fn, args) {
    var self = this;
    return this.client.rpc(fn, args || {}).then(function (r) { if (r.error) throw mapError(r.error); return r.data; }, function (e) { throw mapError(e); });
  };
  P._selectAll = function (table, build) {
    /* قراءة كل الصفوف بصفحات (حد PostgREST الافتراضي 1000) */
    var self = this, out = [];
    function page(from) {
      var q = self.client.from(table).select('*');
      q = build ? build(q) : q.order('id');
      return q.range(from, from + PAGE - 1).then(function (r) {
        if (r.error) throw mapError(r.error);
        out = out.concat(r.data || []);
        if ((r.data || []).length === PAGE) return page(from + PAGE);
        return out;
      });
    }
    return page(0);
  };
  P._one = function (entity, id, versionNo) {
    var q = this.client.from(READ[entity]).select('*').eq('id', id);
    if (entity === 'proposal') q = versionNo ? q.eq('version_no', versionNo) : q.order('version_no', { ascending: false });
    return q.limit(1).then(function (r) { if (r.error) throw mapError(r.error); return r.data && r.data[0] ? r.data[0] : null; });
  };
  P._need = function (entity, id, versionNo) { return this._one(entity, id, versionNo).then(function (rec) { if (!rec) throw AErr('not_found', entity); return rec; }); };
  P._requireUser = function () { if (!this.user) throw AErr('forbidden', 'not_signed_in'); return this.user; };
  P._publicUser = function (u) { return u ? { id: u.id, email: u.email, name_ar: u.name_ar, name_en: u.name_en, role: u.role, active: u.active !== false, is_demo: !!u.is_demo, version: u.version } : null; };
  P._emit = function (ev) { this._listeners.forEach(function (f) { try { f(ev); } catch (e) { } }); };
  P.onChange = function (fn) { this._listeners.push(fn); };
  function today() { return U.today(); }

  /* ---------- دورة الحياة ---------- */
  P.init = function () {
    var self = this;
    var sb = root.supabase;
    var sc = (this.cfg.data && this.cfg.data.supabase) || {};
    if (!sb || !sb.createClient) return Promise.reject(AErr('config', 'supabase-js not loaded'));
    if (!sc.url || !sc.anonKey) return Promise.reject(AErr('config', 'supabase url/key missing (src/config/env.js)'));
    if (!this.client) {
      this.client = sb.createClient(sc.url, sc.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: (sc.sessionStorage === 'session' && typeof sessionStorage !== 'undefined') ? sessionStorage : undefined }, db: { schema: sc.schema || 'public' } });
    }
    return this.client.auth.getSession().then(function (r) {
      var session = r && r.data ? r.data.session : null;
      if (!session) return { ok: true, mode: 'supabase', user: null, demo: false };
      return self._afterAuth(session.user).then(function (u) { return { ok: true, mode: 'supabase', user: u, demo: self.demo }; }).catch(function (e) {
        /* جلسة بلا ملف فعّال: نُنهيها بهدوء */
        return self.client.auth.signOut().then(function () { return { ok: true, mode: 'supabase', user: null, demo: false, error: e && e.message }; });
      });
    }, function (e) { throw mapError(e); });
  };
  P._afterAuth = function (authUser) {
    var self = this;
    return this.client.from('profiles').select('*').eq('id', authUser.id).maybeSingle().then(function (r) {
      if (r.error) throw mapError(r.error);
      if (!r.data) throw AErr('forbidden', 'no_profile');
      if (r.data.active === false) throw AErr('forbidden', 'inactive');
      self.user = self._publicUser(r.data);
      return Promise.all([self._loadConfig(), self._loadDemoFlag()]).then(function () { return self.user; });
    });
  };
  P._loadDemoFlag = function () {
    var self = this;
    return this._rpc('crm_demo_status').then(function (st) { self.demo = !!(st && Number(st.total) > 0); self.demoStatus = st; }, function () { self.demo = false; });
  };
  P.health = function () {
    var self = this, t0 = Date.now();
    return this.client.from('config_items').select('key', { count: 'exact', head: true }).then(function (r) {
      if (r.error) return { ok: false, mode: 'supabase', message: r.error.message, demo: self.demo };
      return { ok: true, mode: 'supabase', message: 'Supabase OK (' + (Date.now() - t0) + 'ms)', demo: self.demo, lastSync: null, demoStatus: self.demoStatus || null };
    }, function (e) { return { ok: false, mode: 'supabase', message: e.message || 'network', demo: self.demo }; });
  };

  /* ---------- المصادقة ---------- */
  P.signIn = function (email, password) {
    var self = this;
    return this.client.auth.signInWithPassword({ email: String(email || '').trim().toLowerCase(), password: password || '' }).then(function (r) {
      if (r.error) throw AErr('forbidden', 'login_failed');
      return self._afterAuth(r.data.user).then(function (u) {
        self._rpc('crm_log_login').catch(function () { });
        return u;
      }).catch(function (e) { return self.client.auth.signOut().then(function () { throw e; }); });
    }, function (e) { throw mapError(e); });
  };
  P.signInAs = function () { return Promise.reject(AErr('forbidden', 'not_supported')); };
  P.signOut = function () { var self = this; return this.client.auth.signOut().then(function () { self.user = null; self._last = null; return true; }, function () { self.user = null; return true; }); };
  P.currentUser = function () { return this.user; };
  P.users = function () {
    var self = this;
    return this._selectAll('profiles', function (q) { return q.order('name_ar'); }).then(function (rows) { self._profiles = rows.map(self._publicUser); return self._profiles; });
  };

  /* ---------- الإعدادات (config_items) ---------- */
  P._loadConfig = function () {
    var self = this;
    return this.client.from('config_items').select('key,value').then(function (r) {
      if (r.error) throw mapError(r.error);
      var items = {}; (r.data || []).forEach(function (x) { items[x.key] = x.value; });
      self._applyBaseConfig(items);
      self._overrides = {};
      Object.keys(items).forEach(function (k) { if (/^(lookups|rules|stages)\./.test(k)) { self._overrides[k] = items[k]; } });
      self._applyOverrides(self._overrides);
      return items;
    });
  };
  P._applyBaseConfig = function (items) {
    var self = this;
    if (Array.isArray(items.stages)) items.stages.forEach(function (s) { var cur = STAGES.get(s.key); if (cur) Object.assign(cur, s); });
    if (items.rules && typeof items.rules === 'object') Object.keys(items.rules).forEach(function (sec) { if (RULES[sec] && typeof RULES[sec] === 'object' && !Array.isArray(RULES[sec])) Object.assign(RULES[sec], items.rules[sec]); else RULES[sec] = items.rules[sec]; });
    if (items.lookups && typeof items.lookups === 'object') Object.keys(items.lookups).forEach(function (k) { if (Array.isArray(items.lookups[k]) && Array.isArray(L[k])) L[k] = items.lookups[k]; });
    if (Array.isArray(items.occasions)) items.occasions.forEach(function (o) { var cur = root.OCCASIONS_CONFIG.get(o.key); if (cur) Object.assign(cur, o); });
    if (items.templates && typeof items.templates === 'object') Object.keys(items.templates).forEach(function (k) { root.OCCASIONS_CONFIG.templates[k] = items.templates[k]; });
    if (items.platform && typeof items.platform === 'object') { var pl = root.APP_CONFIG.platform; if (items.platform.company_ar) pl.company_ar = items.platform.company_ar; if (items.platform.company_en) pl.company_en = items.platform.company_en; }
  };
  P._applyOverrides = function (ov) {
    Object.keys(ov || {}).forEach(function (k) {
      if (k.indexOf('lookups.') === 0) { var list = k.slice(8); if (L[list]) L[list] = ov[k]; }
      else if (k.indexOf('rules.') === 0) { var path = k.slice(6).split('.'); var o = RULES; for (var i = 0; i < path.length - 1; i++) { o = o[path[i]]; if (!o) return; } o[path[path.length - 1]] = ov[k]; }
      else if (k.indexOf('stages.') === 0) { var sk = k.slice(7); var st = STAGES.get(sk); if (st) Object.assign(st, ov[k]); }
      else if (k === 'occasions') { (ov[k] || []).forEach(function (o) { var cur = root.OCCASIONS_CONFIG.get(o.key); if (cur) Object.assign(cur, o); }); }
      else if (k === 'templates') { Object.keys(ov[k] || {}).forEach(function (t) { root.OCCASIONS_CONFIG.templates[t] = ov[k][t]; }); }
    });
  };
  P.getConfig = function () { this._requireUser(); return Promise.resolve({ lookups: U.clone(L), rules: U.clone(RULES), stages: U.clone(STAGES.list), occasions: U.clone(root.OCCASIONS_CONFIG.list), templates: U.clone(root.OCCASIONS_CONFIG.templates), overrides: U.clone(this._overrides || {}) }); };
  P.setConfig = function (key, value) {
    var self = this; this._requireUser();
    if (!PERMS.can(this.user, 'admin.config')) return Promise.reject(AErr('forbidden'));
    var ov = {}; ov[key] = U.clone(value); this._applyOverrides(ov); this._overrides[key] = U.clone(value);
    /* الخادم يقرأ المفاتيح الكاملة (stages/rules/occasions/templates/lookups) في دوال RPC، فنحدّثها أيضًا */
    var baseKey = key.indexOf('lookups.') === 0 ? 'lookups' : key.indexOf('rules.') === 0 ? 'rules' : key.indexOf('stages.') === 0 ? 'stages' : (key === 'occasions' || key === 'templates') ? key : null;
    var baseVal = baseKey === 'lookups' ? JSON.parse(JSON.stringify(L)) : baseKey === 'rules' ? U.clone(RULES) : baseKey === 'stages' ? U.clone(STAGES.list) : baseKey === 'occasions' ? U.clone(root.OCCASIONS_CONFIG.list) : baseKey === 'templates' ? U.clone(root.OCCASIONS_CONFIG.templates) : null;
    return this._rpc('crm_set_config', { p_key: key, p_value: value }).then(function () {
      if (baseKey && baseVal !== null) return self._rpc('crm_set_config', { p_key: baseKey, p_value: baseVal });
    }).then(function () { return true; });
  };

  /* ---------- القراءة ---------- */
  P.snapshot = function () {
    var self = this; this._requireUser();
    var wants = function (perm) { return PERMS.can(self.user, perm); };
    var jobs = {
      users: this._selectAll('profiles', function (q) { return q.order('name_ar'); }),
      customers: wants('customers.view') ? this._selectAll('v_customers') : Promise.resolve([]),
      contacts: wants('customers.view') ? this._selectAll('contacts') : Promise.resolve([]),
      opportunities: wants('opportunities.view') ? this._selectAll('v_opportunities') : Promise.resolve([]),
      stage_history: wants('opportunities.view') ? this._selectAll('stage_history', function (q) { return q.order('changed_at'); }) : Promise.resolve([]),
      proposals: wants('proposals.view') ? this._selectAll('v_proposals') : Promise.resolve([]),
      contracts: wants('contracts.view') ? this._selectAll('v_contracts') : Promise.resolve([]),
      projects: wants('contracts.view') ? this._selectAll('v_projects') : Promise.resolve([]),
      activities: wants('activities.view') ? this._selectAll('activities') : Promise.resolve([]),
      campaigns: (wants('occasions.manage') || wants('occasions.approve')) ? this._selectAll('campaigns') : Promise.resolve([]),
      approvals: this._selectAll('approvals', function (q) { return q.order('requested_at', { ascending: false }); }),
      documents: wants('customers.view') ? this._selectAll('documents') : Promise.resolve([]),
      duplicates: this._selectAll('duplicates_review'),
      saved_views: this._selectAll('saved_views'),
      import_jobs: (wants('import.data') || wants('audit.view')) ? this._selectAll('import_jobs', function (q) { return q.order('at', { ascending: false }); }) : Promise.resolve([])
    };
    var keys = Object.keys(jobs);
    return Promise.all(keys.map(function (k) { return jobs[k]; })).then(function (res) {
      var out = {}; keys.forEach(function (k, i) { out[k] = res[i]; });
      out.users = out.users.map(self._publicUser);
      self._profiles = out.users;
      out.import_jobs = out.import_jobs.map(function (j) { return { id: j.id, module: j.module, file: j.file, at: j.at, by: j.by_user, rows: j.rows, inserted: j.inserted, skipped: j.skipped, structure_errors: (j.report && j.report.structure_errors) || [] }; });
      out.meta = { demo: self.demo, mode: 'supabase', schema: 1 };
      self._last = out;
      return out;
    }).catch(function (e) { throw mapError(e); });
  };
  P.get = function (entity, id) {
    this._requireUser();
    if (entity === 'user') return this._need('user', id).then(this._publicUser);
    return this._need(entity, id);
  };
  P.audit = function (q) {
    this._requireUser(); q = q || {};
    var b = this.client.from('audit_log').select('*');
    if (q.entity_type) b = b.eq('entity_type', q.entity_type);
    if (q.entity_id) b = b.eq('entity_id', q.entity_id);
    if (q.actor_id) b = b.eq('actor_id', q.actor_id);
    if (q.action) b = b.eq('action', q.action);
    b = b.order('at', { ascending: false }).limit(q.limit || 300);
    return b.then(function (r) { if (r.error) throw mapError(r.error); return r.data || []; });
  };

  /* ---------- الإنشاء والتعديل ---------- */
  function stripClientFields(rec) { var out = U.clone(rec); SERVER_MANAGED.forEach(function (k) { delete out[k]; }); delete out.version; return out; }
  P._parents = function (rec) {
    /* الأبوان (العميل/الفرصة) من آخر لقطة أو بطلب مباشر */
    var self = this, out = [], db = this._last;
    if (!rec) return Promise.resolve(out);
    var tasks = [];
    if (rec.customer_id) { var c = db ? (db.customers || []).find(function (x) { return x.id === rec.customer_id; }) : null; if (c) out.push(c); else tasks.push(self._one('customer', rec.customer_id).then(function (x) { if (x) out.push(x); })); }
    if (rec.opportunity_id) { var o = db ? (db.opportunities || []).find(function (x) { return x.id === rec.opportunity_id; }) : null; if (o) { out.push(o); } else tasks.push(self._one('opportunity', rec.opportunity_id).then(function (x) { if (x) out.push(x); })); }
    return Promise.all(tasks).then(function () { return out; });
  };
  P.create = function (entity, data) {
    var self = this; this._requireUser();
    var perm = CREATE_PERM[entity]; if (!perm) return Promise.reject(AErr('not_found'));
    if (entity === 'user') return this._createUser(data);
    var rec = Object.assign(MODEL.defaults(entity, this.user.id), MODEL.normalize(entity, data || {}));
    var v = MODEL.validate(entity, rec);
    if (!v.ok) return Promise.reject(AErr('validation', 'validation', v.errors));
    return this._parents(rec).then(function (parents) {
      if (!PERMS.canRecord(self.user, perm, null, parents)) throw AErr('forbidden');
      var row = stripClientFields(rec);
      delete row.id;
      if (entity === 'opportunity') {
        row.stage_entered_at = today();
        if (row.probability === null || row.probability === undefined) row.probability = STAGES.get(row.stage).probability;
        row.closed_at = (STAGES.isTerminal(row.stage) || STAGES.isWon(row.stage)) ? today() : null;
      }
      if (entity === 'proposal') {
        if (!row.version_no) row.version_no = 1;
        var opp = parents.find(function (p) { return p.id === row.opportunity_id; });
        if (!opp) throw AErr('validation', 'opportunity', { opportunity_id: 'app.field_required' });
        if (!row.submission_deadline && opp.submission_deadline) row.submission_deadline = opp.submission_deadline;
      }
      if (entity === 'contract') { row.end_date = MODEL.contractEndDate(row) || row.end_date || null; }
      return self.client.from(TABLE[entity]).insert(row).select('id').single().then(function (r) {
        if (r.error) throw mapError(r.error);
        var id = r.data.id;
        /* سجل المرحلة الأولى للفرصة يكتبه مشغّل الخادم (opportunities_ai) */
        var after = (entity === 'contact' && row.is_primary) ? self._demoteOtherPrimaries(row.customer_id, id) : Promise.resolve();
        return after.then(function () { return self._need(entity, id); });
      });
    });
  };
  P._demoteOtherPrimaries = function (customerId, keepId) {
    var self = this;
    return this.client.from('contacts').select('id,version').eq('customer_id', customerId).eq('is_primary', true).neq('id', keepId).then(function (r) {
      if (r.error || !r.data) return;
      return Promise.all(r.data.map(function (c) { return self.client.from('contacts').update({ is_primary: false, version: c.version + 1 }).eq('id', c.id).eq('version', c.version).then(function () { }); }));
    });
  };
  P.update = function (entity, id, patch, version) {
    var self = this; this._requireUser();
    if (entity === 'user') return this._updateUser(id, patch, version);
    var perm = EDIT_PERM[entity]; if (!perm) return Promise.reject(AErr('not_found'));
    var versionNo = patch && patch.version_no;
    return this._need(entity, id, versionNo).then(function (rec) {
      return self._parents(rec).then(function (parents) {
        if (!PERMS.canRecord(self.user, perm, rec, parents)) throw AErr('forbidden');
        if (rec.archived_at) throw AErr('invalid_transition', 'archived');
        if (version !== undefined && version !== null && Number(version) !== Number(rec.version)) throw AErr('stale', 'stale write', { current: rec.version });
        var p = MODEL.normalize(entity, patch || {});
        ['id', 'created_at', 'created_by', 'version', 'archived_at', 'origin', 'source_system', 'source_id', 'version_no', 'demo', '_masked', 'updated_at', 'updated_by'].forEach(function (k) { delete p[k]; });
        if (entity === 'opportunity' && p.stage !== undefined && p.stage !== rec.stage) throw AErr('invalid_transition', 'use changeStage');
        delete p.stage;
        if (entity === 'opportunity') { delete p.stage_entered_at; delete p.closed_at; }
        if (entity === 'proposal') { delete p.approval_status; if (p.status === 'submitted' && rec.status !== 'submitted') throw AErr('invalid_transition', 'use submitProposal'); }
        if (entity === 'contract') { delete p.handover_status; delete p.handover; if ((p.status === 'signed' || p.status === 'active') && ['signed', 'active'].indexOf(rec.status) < 0) throw AErr('invalid_transition', 'use markSigned'); }
        if (entity === 'campaign') { delete p.status; delete p.sent_log; delete p.approved_by; delete p.approved_at; delete p.recipients; }
        var sens = MODEL.SENSITIVE[entity] || [];
        if (!PERMS.canSeeCommercial(self.user, rec, parents) || rec._masked) sens.forEach(function (k) { delete p[k]; });
        var next = Object.assign({}, rec, p);
        var v = MODEL.validate(entity, next);
        if (!v.ok) throw AErr('validation', 'validation', v.errors);
        if (entity === 'contract') p.end_date = MODEL.contractEndDate(next) || next.end_date || null;
        Object.keys(p).forEach(function (k) { if (k.charAt(0) === '_') delete p[k]; });
        if (!Object.keys(p).length) return rec;
        p.version = Number(rec.version) + 1;
        var q = self.client.from(TABLE[entity]).update(p).eq('id', id).eq('version', rec.version);
        if (entity === 'proposal') q = q.eq('version_no', rec.version_no);
        return q.select('id').then(function (r) {
          if (r.error) throw mapError(r.error);
          if (!r.data || !r.data.length) {
            /* لم يُحدَّث أي صف: إما إصدار قديم أو سياسة RLS منعت التعديل */
            return self._need(entity, id, rec.version_no).then(function (cur) { if (Number(cur.version) !== Number(rec.version)) throw AErr('stale', 'stale write', { current: cur.version }); throw AErr('forbidden'); });
          }
          var after = (entity === 'contact' && p.is_primary) ? self._demoteOtherPrimaries(rec.customer_id, id) : Promise.resolve();
          return after.then(function () { return self._need(entity, id, rec.version_no); });
        });
      });
    });
  };
  P.archive = function (entity, id, reason) { var self = this; this._requireUser(); return this._rpc('crm_archive', { p_entity: entity, p_id: id, p_reason: reason || null }).then(function () { return self._need(entity, id); }); };
  P.restore = function (entity, id) { var self = this; this._requireUser(); return this._rpc('crm_restore', { p_entity: entity, p_id: id }).then(function () { return self._need(entity, id); }); };

  /* ---------- المستخدمون (profiles) ---------- */
  P._createUser = function () {
    /* الحسابات تُنشأ عبر Supabase Auth (دعوة/تسجيل) ثم تُفعَّل هنا — لا يمكن إنشاء حساب بمفتاح publishable */
    return Promise.reject(AErr('invalid_transition', 'user_via_auth'));
  };
  P._updateUser = function (id, patch, version) {
    var self = this;
    if (!PERMS.can(this.user, 'admin.users')) return Promise.reject(AErr('forbidden'));
    var p = {};
    if (patch.role !== undefined) { if (!root.PERMISSIONS_CONFIG.matrix[patch.role]) return Promise.reject(AErr('validation', 'role', { role: 'app.field_required' })); p.role = patch.role; }
    if (patch.name_ar !== undefined) p.name_ar = patch.name_ar;
    if (patch.name_en !== undefined) p.name_en = patch.name_en;
    if (patch.active !== undefined) { if (id === this.user.id && patch.active === false) return Promise.reject(AErr('invalid_transition', 'self')); p.active = !!patch.active; }
    var q = this.client.from('profiles').update(p).eq('id', id);
    if (version !== undefined && version !== null) q = q.eq('version', version);
    return q.select('*').then(function (r) {
      if (r.error) throw mapError(r.error);
      if (!r.data || !r.data.length) throw AErr('stale', 'stale write');
      return self._publicUser(r.data[0]);
    });
  };

  /* ---------- المراحل ---------- */
  P.changeStage = function (oppId, to, opts) {
    var self = this; this._requireUser(); opts = opts || {};
    var fields = Object.assign({}, opts.fields || {}); if (opts.loss_reason) fields.loss_reason = opts.loss_reason;
    return this._rpc('crm_change_stage', { p_opp_id: oppId, p_to: to, p_reason: opts.reason || null, p_note: opts.note || null, p_version: (opts.version === undefined ? null : opts.version), p_fields: fields, p_reopen: !!opts.reopen })
      .then(function () { return Promise.all([self._need('opportunity', oppId), self.stageHistory(oppId)]); })
      .then(function (r) { return { opportunity: r[0], history: r[1][r[1].length - 1] || null }; });
  };
  P.stageHistory = function (oppId) { this._requireUser(); return this._selectAll('stage_history', function (q) { return q.eq('opportunity_id', oppId).order('changed_at'); }); };

  /* ---------- العروض ---------- */
  P.newProposalVersion = function (proposalId) { var self = this; this._requireUser(); return this._rpc('crm_new_proposal_version', { p_id: proposalId }).then(function (r) { return self._need('proposal', r.id, r.version_no); }); };
  P.requestProposalApproval = function (proposalId, versionNo) {
    var self = this; this._requireUser();
    return this._rpc('crm_request_proposal_approval', { p_id: proposalId, p_version_no: versionNo || null }).then(function (r) {
      return self._need('proposal', proposalId, versionNo || null).then(function (p) { return { proposal: p, approvals: (r && r.approvals) || [] }; });
    });
  };
  P.submitProposal = function (proposalId, opts) {
    var self = this; this._requireUser(); opts = opts || {};
    return this._rpc('crm_submit_proposal', { p_id: proposalId, p_version_no: opts.version_no || null, p_submitted_at: U.isoDate(opts.submitted_at || today()), p_method: opts.method || 'portal', p_version: (opts.version === undefined ? null : opts.version) }).then(function (r) {
      return self._need('proposal', proposalId, opts.version_no || null).then(function (p) {
        if (r && r.approval_required) return { approval_required: true, proposal: p, approvals: r.approvals || [] };
        return { proposal: p };
      });
    });
  };

  /* ---------- الاعتمادات ---------- */
  P.requestApproval = function (type, entityType, entityId, payload) { this._requireUser(); return this._rpc('crm_request_approval', { p_type: type, p_entity_type: entityType, p_entity_id: entityId, p_payload: payload || {} }); };
  P.decideApproval = function (id, decision, reason) { this._requireUser(); return this._rpc('crm_decide_approval', { p_id: id, p_decision: decision, p_reason: reason || null }); };
  P.approvals = function (q) {
    var self = this; this._requireUser(); q = q || {};
    return this._selectAll('approvals', function (b) { if (q.status) b = b.eq('status', q.status); if (q.mine) b = b.eq('requested_by', self.user.id); return b.order('requested_at', { ascending: false }); }).then(function (rows) {
      if (q.for_me) rows = rows.filter(function (a) { return PERMS.canDecide(self.user, a.type) && a.requested_by !== self.user.id; });
      return rows;
    });
  };

  /* ---------- العقود والتسليم ---------- */
  P.convertToContract = function (oppId, data) { var self = this; this._requireUser(); return this._rpc('crm_convert_to_contract', { p_opp_id: oppId, p_data: data || {} }).then(function (r) { return self._need('contract', r.id); }); };
  P.markSigned = function (contractId, data) {
    var self = this; this._requireUser(); data = data || {};
    return this._rpc('crm_mark_signed', { p_contract_id: contractId, p_data: data }).then(function (r) {
      if (r && r.approval_required) return { approval_required: true, approval: r.approval };
      return self._need('contract', contractId).then(function (c) { return { contract: c }; });
    });
  };
  P.prepareHandover = function (contractId, pkg) { var self = this; this._requireUser(); return this._rpc('crm_prepare_handover', { p_contract_id: contractId, p_pkg: pkg || {} }).then(function () { return self._need('contract', contractId); }); };
  P.acceptHandover = function (contractId, data) {
    var self = this; this._requireUser();
    return this._rpc('crm_accept_handover', { p_contract_id: contractId, p_data: data || {} }).then(function (r) {
      return Promise.all([self._need('contract', contractId), r && r.project_id ? self._one('project', r.project_id) : Promise.resolve(null)]).then(function (x) { return { contract: x[0], project: x[1] }; });
    });
  };

  /* ---------- الأنشطة ---------- */
  P.completeActivity = function (id, data) {
    var self = this; this._requireUser(); data = data || {};
    return this._rpc('crm_complete_activity', { p_id: id, p_data: { outcome: data.outcome || null, next_action: data.next_action || null, follow_up_date: data.follow_up_date ? U.isoDate(data.follow_up_date) : null, follow_up_type: data.follow_up_type || null } }).then(function (r) {
      return Promise.all([self._need('activity', id), r && r.follow_up ? self._one('activity', r.follow_up) : Promise.resolve(null)]).then(function (x) { return { activity: x[0], follow_up: x[1] }; });
    });
  };
  P.rescheduleActivity = function (id, newDate, reason) {
    var self = this; this._requireUser();
    var d = U.parseDate(newDate); if (!d) return Promise.reject(AErr('validation', 'date', { due_date: 'app.invalid_date' }));
    return this._rpc('crm_reschedule_activity', { p_id: id, p_date: U.isoDate(d), p_reason: reason || null }).then(function () { return self._need('activity', id); });
  };

  /* ---------- حملات التهاني ---------- */
  P.buildRecipients = function (criteria, campaignId) { this._requireUser(); return this._rpc('crm_build_recipients', { p_criteria: criteria || {}, p_campaign_id: campaignId || null }); };
  P.campaignSubmit = function (id) { var self = this; this._requireUser(); return this._rpc('crm_campaign_submit', { p_id: id }).then(function (r) { return self._need('campaign', id).then(function (c) { return { campaign: c, approval: r && r.approval }; }); }); };
  P.campaignExport = function (id) { var self = this; this._requireUser(); return this._rpc('crm_campaign_export', { p_id: id }).then(function (r) { return self._need('campaign', id).then(function (c) { return { rows: (r && r.rows) || [], campaign: c }; }); }); };
  P.campaignRecordSent = function (id, entries, channel) { var self = this; this._requireUser(); return this._rpc('crm_campaign_record_sent', { p_id: id, p_contacts: entries || [], p_channel: channel || null }).then(function (r) { return self._need('campaign', id).then(function (c) { return { campaign: c, added: (r && r.added) || 0 }; }); }); };
  P.campaignClose = function (id) { var self = this; this._requireUser(); return this._rpc('crm_campaign_close', { p_id: id }).then(function () { return self._need('campaign', id); }); };

  /* ---------- الدمج والتكرار ---------- */
  P.mergeCustomers = function (keepId, mergeId) {
    var self = this; this._requireUser();
    if (!keepId || !mergeId || keepId === mergeId) return Promise.reject(AErr('not_found'));
    return this._rpc('crm_merge_customers', { p_keep: keepId, p_merge: mergeId }).then(function (r) {
      return Promise.all([self._need('customer', keepId), self._one('customer', mergeId)]).then(function (x) { return { keep: x[0], merged: x[1], moved: (r && r.moved) || {} }; });
    });
  };
  P.dismissDuplicate = function (kind, aId, bId) { this._requireUser(); return this._rpc('crm_dismiss_duplicate', { p_kind: kind, p_a: aId, p_b: bId }).then(function () { return true; }); };

  /* ---------- الاستيراد والتصدير ---------- */
  P.importRows = function (module, rows, fileName) {
    var self = this; this._requireUser();
    if (!PERMS.can(this.user, 'import.data')) return Promise.reject(AErr('forbidden'));
    var db = this._last || { customers: [], contacts: [] };
    var res = IMPORTER.validate(module, rows, db, this._profiles || (db.users || []));
    var okRows = res.rows.filter(function (r) { return r.ok; }).map(function (r) { return r.data; });
    if (!okRows.length) { res.inserted = 0; res.skipped = res.rows.length; res.job = null; return Promise.resolve(res); }
    return this._rpc('crm_import_rows', { p_module: module, p_rows: okRows, p_file: fileName || null }).then(function (r) {
      res.inserted = (r && r.inserted) || 0; res.skipped = (res.rows.length - okRows.length) + ((r && r.skipped) || 0); res.job = { id: r && r.job, module: module, file: fileName || null, inserted: res.inserted, skipped: res.skipped };
      return res;
    });
  };
  P.logExport = function (module, count, filters) { this._requireUser(); return this._rpc('crm_log_export', { p_module: module, p_count: count || 0, p_filters: filters || null }); };

  /* ---------- العروض المحفوظة ---------- */
  P.savedViews = function (module) { var self = this; this._requireUser(); return this._selectAll('saved_views', function (q) { q = q.eq('user_id', self.user.id); if (module) q = q.eq('module', module); return q.order('created_at'); }); };
  P.saveView = function (view) {
    this._requireUser();
    var name = U.trim(view.name); if (!name) return Promise.reject(AErr('validation', 'name', { name: 'app.field_required' }));
    return this.client.from('saved_views').insert({ user_id: this.user.id, module: view.module, name: name, filters: view.filters || {}, sort: view.sort || null, columns: view.columns || null }).select('*').single().then(function (r) { if (r.error) throw mapError(r.error); return r.data; });
  };
  P.deleteView = function (id) { this._requireUser(); return this.client.from('saved_views').delete().eq('id', id).eq('user_id', this.user.id).then(function (r) { if (r.error) throw mapError(r.error); return true; }); };

  /* ---------- المستندات (بيانات وصفية) ---------- */
  P.addDocument = function (doc) {
    var self = this; this._requireUser();
    var name = U.trim(doc.name); if (!name) return Promise.reject(AErr('validation', 'name', { name: 'app.field_required' }));
    return this._rpc('crm_add_document', { p_entity_type: doc.entity_type, p_entity_id: doc.entity_id, p_name: name, p_doc_type: doc.doc_type || 'other', p_storage_ref: U.trim(doc.storage_ref || '') || null, p_classification: doc.classification || 'internal' }).then(function (r) {
      return self.client.from('documents').select('*').eq('id', r.id).single().then(function (x) { if (x.error) throw mapError(x.error); return x.data; });
    });
  };

  /* ---------- البيانات التجريبية (عبر دالة الحافة demo-seed بجلسة مسؤول النظام) ---------- */
  P._demoFn = function (mode, extra) {
    var self = this; this._requireUser();
    if (!PERMS.can(this.user, 'admin.config')) return Promise.reject(AErr('forbidden'));
    return this.client.functions.invoke('demo-seed', { body: Object.assign({ mode: mode }, extra || {}) }).then(function (r) {
      if (r.error) {
        var msg = r.error.message || 'demo-seed';
        var ctx = r.error.context; if (ctx && typeof ctx.json === 'function') return ctx.json().then(function (j) { throw AErr(j && j.error === 'forbidden' ? 'forbidden' : 'network', (j && j.error) || msg); }, function () { throw AErr('network', msg); });
        throw AErr('network', msg);
      }
      if (r.data && r.data.error) throw AErr(r.data.error === 'forbidden' ? 'forbidden' : 'invalid_transition', r.data.error);
      return r.data;
    }).then(function (d) { return self._loadDemoFlag().then(function () { return d; }); });
  };
  P.resetDemo = function () { return this._demoFn('seed').then(function (d) { return { ok: true, result: d }; }); };
  P.purgeDemo = function () {
    var self = this;
    var wasDemoUser = !!(this.user && this.user.is_demo);
    return this._demoFn('purge').then(function (d) { return { ok: true, removed: (d && d.result && d.result.removed) || 0, auth_users_deleted: (d && d.auth_users_deleted) || [], signed_out: wasDemoUser && !!(d && d.auth_users_deleted && d.auth_users_deleted.length) }; });
  };
  P.demoStatus = function () { return this._rpc('crm_demo_status'); };

  root.SupabaseAdapter = SupabaseAdapter;
})(typeof window !== 'undefined' ? window : globalThis);
