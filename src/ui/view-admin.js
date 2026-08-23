/* =====================================================================
   VIEW: الإدارة — الاعتمادات، المستخدمون، الإعدادات، التدقيق، جودة البيانات، التكرارات، الاستيراد/التصدير، التكامل
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, STAGES = root.STAGES, MODEL = root.MODEL, PERMS = root.PERMS, PC = root.PERMISSIONS_CONFIG, RULES = root.RULES, IMPORTER = root.IMPORTER, F = root.FORMS, OCC = root.OCCASIONS_CONFIG;
  root.VIEWS = root.VIEWS || {};

  root.VIEWS.admin = {
    render: function (main, r) {
      main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('ad.title')), h('p', { class: 'sub' }, t('ad.sub')))));
      var pendingForMe = S.list('approvals').filter(function (a) { return a.status === 'pending' && PERMS.canDecide(S.user, a.type) && a.requested_by !== S.user.id; }).length;
      var tabs = [
        { key: 'approvals', label: t('ad.tab_approvals'), count: pendingForMe, hidden: !(S.can('approvals.decide') || S.can('audit.view') || true) },
        { key: 'quality', label: t('ad.tab_quality'), hidden: !S.can('customers.view') },
        { key: 'duplicates', label: t('ad.tab_duplicates'), hidden: !S.can('duplicates.review') },
        { key: 'import', label: t('ad.tab_import'), hidden: !(S.can('import.data') || S.can('export.data')) },
        { key: 'audit', label: t('ad.tab_audit'), hidden: !S.can('audit.view') },
        { key: 'users', label: t('ad.tab_users'), hidden: !S.can('admin.users') },
        { key: 'config', label: t('ad.tab_config'), hidden: !S.can('admin.config') },
        { key: 'integration', label: t('ad.tab_integration'), hidden: !S.can('admin.config') }
      ];
      var visible = tabs.filter(function (x) { return !x.hidden; });
      var active = r.id && visible.some(function (x) { return x.key === r.id; }) ? r.id : (visible[0] ? visible[0].key : 'approvals');
      var pane = h('div');
      main.appendChild(UI.tabs({ tabs: tabs, active: active, onChange: function (k) { location.hash = '#/admin/' + k; } }));
      main.appendChild(pane);
      (TABS[active] || TABS.approvals)(pane);
    }
  };

  var TABS = {};

  /* ---------- الاعتمادات ---------- */
  TABS.approvals = function (pane) {
    var all = S.list('approvals');
    var mineToDecide = all.filter(function (a) { return a.status === 'pending' && PERMS.canDecide(S.user, a.type) && a.requested_by !== S.user.id; });
    var myRequests = all.filter(function (a) { return a.requested_by === S.user.id; });
    var others = all.filter(function (a) { return mineToDecide.indexOf(a) < 0 && myRequests.indexOf(a) < 0; });
    function entityLink(a) { var e = a.entity_type; if (e === 'proposal') return UI.recordLink('proposal', a.entity_id, a.entity_id + (a.payload && a.payload.version_no ? '/v' + a.payload.version_no : '')); if (e === 'contract') return UI.recordLink('contract', a.entity_id); if (e === 'campaign') return UI.recordLink('campaign', a.entity_id); if (e === 'customer') return UI.recordLink('customer', a.entity_id); return h('span', null, e + ' · ' + a.entity_id); }
    function cols(decidable) {
      return [
        { key: 'type', label: t('ad.approval_type'), width: 1.6, get: function (a) { return h('span', null, h('span', { class: 'bold' }, S.label('approval_types', a.type)), h('span', { class: 'sub' }, a.id)); } },
        { key: 'entity', label: t('ad.approval_entity'), width: 1.6, get: entityLink },
        { key: 'payload', label: t('app.details'), width: 2, wrap: true, get: function (a) { var p = a.payload || {}; var parts = []; if (p.value !== undefined && p.value !== null && S.can('commercial.view')) parts.push(t('app.value') + ': ' + S.money(p.value)); if (p.discount_pct) parts.push(t('pr.discount') + ': ' + p.discount_pct + '%'); if (p.recipients) parts.push(t('oc.recipients') + ': ' + p.recipients); if (p.module) parts.push(p.module + (p.count ? ' · ' + p.count : '')); return parts.join(' · ') || '—'; } },
        { key: 'by', label: t('ad.approval_requested_by'), width: 1.4, get: function (a) { return h('span', null, S.userName(a.requested_by), h('span', { class: 'sub' }, S.dateTime(a.requested_at))); } },
        { key: 'status', label: t('app.status'), width: 1, get: function (a) { return UI.lookupChip('approval_statuses', a.status, 'sm'); } },
        { key: 'dec', label: t('ad.approval_decide'), width: 1.8, get: function (a) {
          if (a.status !== 'pending') {
            return h('span', { class: 'row-actions' },
              h('button', { class: 'btn xs', type: 'button', on: { click: function () { review(a); } } }, t('ad.approval_open')),
              a.decided_by ? h('span', { class: 'sub' }, S.userName(a.decided_by) + ' · ' + S.dateTime(a.decided_at)) : null);
          }
          /* القرار لا يُتخذ من الجدول: يمرّ عبر نافذة المراجعة */
          return h('span', { class: 'row-actions' },
            h('button', { class: 'btn xs ' + (decidable ? 'primary' : ''), type: 'button', on: { click: function () { review(a); } } }, t('ad.approval_open')),
            decidable ? null : h('span', { class: 'muted small' }, t('ad.approval_waiting_roles', { roles: PERMS.approverRoles(a.type).map(S.roleLabel).join('/') })));
        } }
      ];
    }
    /* ---------- نافذة مراجعة الطلب ---------- */
    function moduleLabel(m) { return root.I18N.has('nav.' + m) ? t('nav.' + m) : (root.I18N.has('ad.imp_' + m) ? t('ad.imp_' + m) : m); }
    function filtersText(f) {
      if (!f || typeof f !== 'object') return t('ad.approval_no_filters');
      var parts = [];
      Object.keys(f).forEach(function (k) {
        var v = f[k];
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return;
        parts.push((root.I18N.has('app.' + k) ? t('app.' + k) : k) + ': ' + (Array.isArray(v) ? v.join('، ') : String(v)));
      });
      return parts.length ? parts.join(' · ') : t('ad.approval_no_filters');
    }
    /* يحوّل حمولة الطلب إلى أسطر مقروءة حسب نوعه */
    function payloadRows(a) {
      var p = a.payload || {}, rows = [], shown = { action: 1 };
      function put(k, label, val) { shown[k] = 1; if (val !== null && val !== undefined && val !== '') rows.push([label, val]); }
      if (a.type === 'data_export') {
        put('module', t('ad.approval_module'), moduleLabel(p.module || a.entity_type));
        put('count', t('ad.approval_rows'), p.count === undefined ? null : String(p.count));
        put('filters', t('ad.approval_filters'), filtersText(p.filters));
      } else if (a.type === 'bulk_greeting') {
        put('occasion', t('ad.approval_occasion'), p.occasion && OCC ? OCC.label(p.occasion, S.lang) : p.occasion);
        put('recipients', t('ad.approval_recipients'), p.recipients === undefined ? null : String(p.recipients));
        put('year', t('oc.year'), p.year === undefined ? null : String(p.year));
      }
      if (p.value !== undefined && p.value !== null) {
        shown.value = 1;
        rows.push([t('app.value'), S.can('commercial.view') ? S.money(p.value) : UI.lockNote()]);
      }
      if (p.discount_pct !== undefined && p.discount_pct !== null) { shown.discount_pct = 1; rows.push([t('pr.discount'), p.discount_pct + '%']); }
      if (p.version_no) { shown.version_no = 1; rows.push([t('app.version'), 'v' + p.version_no]); }
      /* أي مفاتيح أخرى تُعرض كما هي حتى لا تختفي معلومة عن المراجِع */
      Object.keys(p).forEach(function (k) {
        if (shown[k]) return;
        var v = p[k];
        if (v === null || v === undefined || v === '' || typeof v === 'object') return;
        rows.push([root.I18N.has('app.' + k) ? t('app.' + k) : k, String(v)]);
      });
      return rows;
    }
    function recordSummary(a) {
      var e = a.entity_type, id = a.entity_id, line = null;
      if (e === 'proposal') {
        var pr = S.get('proposal', id);
        if (pr) {
          var op = pr.opportunity_id ? S.get('opportunity', pr.opportunity_id) : null;
          line = [op ? S.customerName(op.customer_id) : null, op ? op.name : pr.opportunity_id].filter(Boolean).join(' · ');
        }
      }
      else if (e === 'contract') { var ct = S.get('contract', id); if (ct) line = S.customerName(ct.customer_id); }
      else if (e === 'campaign') { var cm = S.get('campaign', id); if (cm) line = cm.title; }
      else if (e === 'customer') { line = S.customerName(id); }
      return line;
    }
    function review(a) {
      var decidable = a.status === 'pending' && PERMS.canDecide(S.user, a.type);
      var isMine = a.requested_by === S.user.id;
      var canAct = decidable && (!isMine || S.user.role === 'system_admin');

      var m = null;
      var body = h('div', { class: 'apr' });
      body.appendChild(UI.secHead('', t('ad.approval_summary'), ''));
      body.appendChild(UI.kv([
        [t('ad.approval_type'), S.label('approval_types', a.type)],
        [t('app.status'), UI.lookupChip('approval_statuses', a.status, 'sm')],
        [t('ad.approval_requested_by'), S.userName(a.requested_by) + ' · ' + S.dateTime(a.requested_at)]
      ]));

      var known = ['proposal', 'contract', 'campaign', 'customer', 'opportunity'].indexOf(a.entity_type) >= 0 && a.entity_id !== 'list';
      if (known) {
        var recLine = recordSummary(a);
        var link = UI.recordLink(a.entity_type, a.entity_id);
        /* فتح السجل يغلق النافذة حتى لا تبقى فوق الصفحة الجديدة */
        link.addEventListener('click', function () { if (m) m.close(true); });
        body.appendChild(UI.secHead('', t('ad.approval_record'), ''));
        body.appendChild(UI.kv([[t('ad.approval_entity'),
          h('span', null, link, recLine ? h('span', { class: 'sub' }, recLine) : null)]]));
      }

      var pr = payloadRows(a);
      if (pr.length) { body.appendChild(UI.secHead('', t('ad.approval_payload'), '')); body.appendChild(UI.kv(pr)); }

      if (a.status !== 'pending') {
        body.appendChild(UI.secHead('', t('ad.approval_decision'), ''));
        body.appendChild(UI.kv([
          [t('app.status'), UI.lookupChip('approval_statuses', a.status, 'sm')],
          [t('ad.approval_decided_by'), a.decided_by ? S.userName(a.decided_by) + ' · ' + S.dateTime(a.decided_at) : '—'],
          [t('ad.approval_note'), a.reason || '—']
        ]));
      }

      var note = null, buttons = [];
      if (a.status === 'pending') {
        if (canAct) {
          body.appendChild(UI.secHead('', t('ad.approval_note'), ''));
          note = h('textarea', { class: 'ctl', rows: 3 });
          body.appendChild(h('div', { class: 'field' }, note, h('div', { class: 'hint' }, t('ad.approval_note_hint'))));
        } else {
          body.appendChild(UI.warnBox(isMine ? t('ad.approval_self')
            : t('ad.approval_waiting_roles', { roles: PERMS.approverRoles(a.type).map(S.roleLabel).join('/') })));
        }
      }

      function submit(decision) {
        var reason = note ? note.value.trim() : '';
        if (decision === 'rejected' && !reason) { UI.toast(t('app.reason_required'), 'warn'); note.focus(); return; }
        buttons.forEach(function (b) { b.disabled = true; });
        S.adapter.decideApproval(a.id, decision, reason)
          .then(function () { m.close(true); return root.APP.rerender(); })
          .then(function () { UI.toast(decision === 'approved' ? t('ad.approval_approve') + ' ✓' : t('ad.approval_reject') + ' ✓', decision === 'approved' ? 'ok' : 'warn'); })
          .catch(function (e) { buttons.forEach(function (b) { b.disabled = false; }); UI.errorToast(e); });
      }
      if (canAct) {
        buttons.push(h('button', { class: 'btn primary', type: 'button', on: { click: function () { submit('approved'); } } }, t('ad.approval_approve')));
        buttons.push(h('button', { class: 'btn danger', type: 'button', on: { click: function () { submit('rejected'); } } }, t('ad.approval_reject')));
      }
      buttons.push(h('button', { class: 'btn', type: 'button', on: { click: function () { m.close(true); } } }, t('app.close')));
      m = UI.modal({ title: t('ad.approval_review') + ' — ' + S.label('approval_types', a.type), sub: a.id, size: 'md', body: [body], buttons: buttons });
      return m;
    }
    pane.appendChild(UI.card({ title: t('mw.approvals_inbox'), sub: mineToDecide.length + ' ' + t('app.in_review'), tight: true, body: UI.table({ columns: cols(true), rows: U.sortBy(mineToDecide, 'requested_at', 'desc'), empty: t('ad.approval_none'), onRow: review }) }));
    pane.appendChild(h('div', { style: { height: '12px' } }));
    pane.appendChild(UI.card({ title: S.lang === 'en' ? 'My requests' : 'طلباتي', tight: true, body: UI.table({ columns: cols(false), rows: U.sortBy(myRequests, 'requested_at', 'desc'), empty: t('ad.approval_none'), onRow: review }) }));
    if (S.can('audit.view')) { pane.appendChild(h('div', { style: { height: '12px' } })); pane.appendChild(UI.card({ title: S.lang === 'en' ? 'All other requests' : 'بقية الطلبات', tight: true, body: UI.table({ columns: cols(false), rows: U.sortBy(others, 'requested_at', 'desc').slice(0, 100), empty: t('ad.approval_none'), onRow: review }) })); }
  };

  /* ---------- المستخدمون ---------- */
  TABS.users = function (pane) {
    var users = S.list('users');
    function userForm(u) {
      UI.formModal({ title: u ? t('ad.edit_user') : t('ad.new_user'), size: 'sm', cols: 1, fields: [{ key: 'email', label: t('ad.user_email'), type: 'email', required: true, disabled: !!u, dir: 'ltr' }, { key: 'name_ar', label: t('ad.user_name') + ' (ع)', type: 'text', required: true }, { key: 'name_en', label: t('ad.user_name') + ' (EN)', type: 'text', dir: 'ltr' }, { key: 'role', label: t('ad.user_role'), type: 'select', options: PC.roles.map(function (r) { return { value: r.key, label: S.lang === 'en' ? r.en : r.ar }; }), required: true }, { key: 'active', label: t('ad.user_active'), type: 'checkbox', checkLabel: t('ad.user_active') }], values: u ? U.clone(u) : { active: true, role: 'bd_employee' },
        onSubmit: function (v) { var p = u ? S.adapter.update('user', u.id, v, u.version) : S.adapter.create('user', v); return p.then(function () { return root.APP.rerender(); }); } });
    }
    pane.appendChild(UI.card({ title: t('ad.tab_users'), sub: S.mode === 'supabase' ? (S.lang === 'en' ? 'Accounts are created in Supabase Auth; roles are assigned here (profiles).' : 'تُنشأ الحسابات في نظام الدخول (Supabase Auth)، وتُسند الأدوار من هذه الشاشة.') : (S.lang === 'en' ? 'Local mode users' : 'مستخدمو الوضع المحلي'), tight: true, actions: S.mode === 'supabase' ? null : h('button', { class: 'btn sm primary', type: 'button', on: { click: function () { userForm(null); } } }, UI.icon('plus'), t('ad.new_user')),
      body: UI.table({ columns: [{ key: 'name', label: t('ad.user_name'), width: 2, get: function (u) { return h('span', null, UI.avatar(u.id), ' ', S.userName(u.id)); } }, { key: 'email', label: t('ad.user_email'), width: 2, get: function (u) { return h('span', { class: 'ltr' }, u.email); } }, { key: 'role', label: t('ad.user_role'), width: 1.6, get: function (u) { return S.roleLabel(u.role); } }, { key: 'active', label: t('ad.user_active'), width: .8, get: function (u) { return u.active === false ? UI.chip('slate', t('ct.inactive'), 'sm') : UI.chip('ok', t('ct.active'), 'sm'); } }, { key: 'act', label: '', width: .8, get: function (u) { return h('button', { class: 'btn xs', type: 'button', on: { click: function () { userForm(u); } } }, t('app.edit')); } }], rows: users }) }));
    /* مصفوفة الصلاحيات */
    pane.appendChild(h('div', { style: { height: '14px' } }));
    var mcols = [{ key: 'perm', label: t('ad.permissions_matrix'), width: 3, get: function (p) { return h('span', null, h('span', { class: 'bold' }, p.ar), h('span', { class: 'sub ltr' }, p.key)); } }].concat(PC.roles.map(function (r) { return { key: r.key, label: S.lang === 'en' ? r.en : r.ar, width: 1, center: true, get: function (p) { var sc = (PC.matrix[r.key] || {})[p.key]; return sc ? UI.chip(sc === 'all' ? 'ok' : 'info', sc === 'all' ? t('ad.scope_all') : t('ad.scope_own'), 'sm nodot') : h('span', { class: 'faint' }, '—'); } }; }));
    pane.appendChild(UI.card({ title: t('ad.permissions_matrix'), sub: S.lang === 'en' ? 'Source: src/config/permissions.js — enforced by the backend (RLS/RPC) and the local adapter' : 'تُفرض الصلاحيات على الخادم عبر سياسات الوصول ودوال قاعدة البيانات، لا في الواجهة', tight: true, body: UI.table({ columns: mcols, rows: PC.permissions, responsive: false }) }));
  };

  /* ---------- الإعدادات ---------- */
  TABS.config = function (pane) {
    pane.appendChild(UI.infoBox(t('ad.config_hint')));
    var lists = ['customer_types', 'customer_classes', 'customer_statuses', 'customer_sources', 'opportunity_sources', 'sectors', 'project_types', 'contact_roles', 'activity_types', 'priorities', 'risk_levels', 'loss_reasons', 'proposal_statuses', 'contract_statuses', 'payment_terms', 'submission_methods', 'required_documents', 'vendor_registration', 'prequalification'];
    var sel = h('select', { class: 'sel' }); lists.forEach(function (k) { sel.appendChild(h('option', { value: k }, L.listLabel(k, S.lang))); });
    var listBox = h('div');
    function renderList() {
      D.clear(listBox);
      var key = sel.value, items = U.clone(L[key] || []);
      var canEdit = S.can('admin.config') && (S.mode === 'supabase' || root.APP_CONFIG.features.localConfigEditing);
      listBox.appendChild(UI.card({ title: L.listLabel(key, S.lang), sub: items.length + ' ' + (S.lang === 'en' ? 'items' : 'عنصر'), tight: true, actions: canEdit ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { itemForm(null); } } }, UI.icon('plus'), t('ad.config_add')) : null,
        body: UI.table({ columns: [{ key: 'key', label: t('ad.config_key'), width: 1.4, get: function (x) { return h('span', { class: 'ltr' }, x.key); } }, { key: 'ar', label: t('ad.config_ar'), width: 2 }, { key: 'en', label: t('ad.config_en'), width: 2, get: function (x) { return h('span', { class: 'ltr' }, x.en || ''); } }, { key: 'color', label: S.lang === 'en' ? 'Colour' : 'اللون', width: .8, get: function (x) { return x.color ? UI.chip(x.color, x.color, 'sm') : null; } }, { key: 'act', label: '', width: .8, get: function (x) { return canEdit ? h('button', { class: 'btn xs', type: 'button', on: { click: function () { itemForm(x); } } }, t('app.edit')) : null; } }], rows: items }) }));
      function itemForm(it) {
        UI.formModal({ title: it ? t('app.edit') : t('ad.config_add'), sub: L.listLabel(key, S.lang), size: 'sm', cols: 1, fields: [{ key: 'key', label: t('ad.config_key'), type: 'text', required: true, disabled: !!it, dir: 'ltr' }, { key: 'ar', label: t('ad.config_ar'), type: 'text', required: true }, { key: 'en', label: t('ad.config_en'), type: 'text', dir: 'ltr' }, { key: 'color', label: S.lang === 'en' ? 'Colour' : 'اللون', type: 'select', options: ['slate', 'ok', 'warn', 'danger', 'info', 'accent', 'ink'].map(function (c) { return { value: c, label: c }; }) }], values: it ? U.clone(it) : {},
          onSubmit: function (v) { var next = items.slice(); if (it) { next = next.map(function (x) { return x.key === it.key ? Object.assign({}, x, v) : x; }); } else { if (next.some(function (x) { return x.key === v.key; })) return Promise.reject(root.ADAPTER.Error('validation', 'dup', { key: 'app.invalid_number' })); next.push(v); } return S.adapter.setConfig('lookups.' + key, next).then(function () { renderList(); }); } });
      }
    }
    sel.addEventListener('change', renderList);
    pane.appendChild(h('div', { class: 'filters' }, h('span', { class: 'small muted' }, t('ad.config_list')), sel));
    pane.appendChild(listBox); renderList();
    /* العتبات */
    var thr = [
      ['rules.hygiene.no_activity_days', RULES.hygiene.no_activity_days, S.lang === 'en' ? 'Days without activity before flagging' : 'عدد الأيام بلا نشاط قبل تعليم الفرصة'],
      ['rules.hygiene.high_value_threshold', RULES.hygiene.high_value_threshold, S.lang === 'en' ? 'High-value opportunity threshold (SAR)' : 'عتبة الفرصة عالية القيمة (ر.س)'],
      ['rules.hygiene.customer_no_interaction_days', RULES.hygiene.customer_no_interaction_days, S.lang === 'en' ? 'Customer no-interaction days' : 'عدد الأيام بلا تفاعل مع العميل'],
      ['rules.reminders.escalate_after_days', RULES.reminders.escalate_after_days, S.lang === 'en' ? 'Escalate overdue high-priority after (days)' : 'تصعيد الإجراء المتأخر عالي الأولوية بعد (يوم)'],
      ['rules.approvals.proposal_high_value.threshold', RULES.approvals.proposal_high_value.threshold, S.lang === 'en' ? 'High-value proposal approval threshold (SAR)' : 'عتبة اعتماد العرض عالي القيمة (ر.س)'],
      ['rules.approvals.discount.threshold_pct', RULES.approvals.discount.threshold_pct, S.lang === 'en' ? 'Discount approval threshold (%)' : 'عتبة اعتماد الخصم (%)'],
      ['rules.defaults.proposal_validity_days', RULES.defaults.proposal_validity_days, S.lang === 'en' ? 'Default proposal validity (days)' : 'صلاحية العرض الافتراضية (يوم)']
    ];
    pane.appendChild(h('div', { style: { height: '14px' } }));
    pane.appendChild(UI.card({ title: t('ad.thresholds'), tight: true, body: UI.table({ columns: [{ key: 'l', label: t('ad.thresholds'), width: 3, get: function (r) { return h('span', null, r[2], h('span', { class: 'sub ltr' }, r[0])); } }, { key: 'v', label: t('app.value'), width: 1, num: true, get: function (r) { return U.fmtNum(r[1]); } }, { key: 'a', label: '', width: .8, get: function (r) { if (!(S.can('admin.config') && (S.mode === 'supabase' || root.APP_CONFIG.features.localConfigEditing))) return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { UI.formModal({ title: r[2], size: 'sm', cols: 1, fields: [{ key: 'v', label: t('app.value'), type: 'number', required: true }], values: { v: r[1] }, onSubmit: function (v) { return S.adapter.setConfig(r[0], Number(v.v)).then(function () { root.APP.route(); }); } }); } } }, t('app.edit')); } }], rows: thr }) }));
    /* المراحل */
    pane.appendChild(h('div', { style: { height: '14px' } }));
    pane.appendChild(UI.card({ title: t('ad.stages'), sub: STAGES.list.length + ' ' + (S.lang === 'en' ? 'stages' : 'مرحلة'), tight: true, body: UI.table({ columns: [{ key: 'order', label: '#', width: .5, num: true }, { key: 'ar', label: t('ad.config_ar'), width: 2.2, get: function (s) { return UI.stageChip(s.key); } }, { key: 'en', label: t('ad.config_en'), width: 2, get: function (s) { return h('span', { class: 'ltr' }, s.en); } }, { key: 'group', label: t('op.filter_group'), width: 1.2, get: function (s) { return STAGES.groupLabel(s.group, S.lang); } }, { key: 'probability', label: t('op.probability'), width: .9, num: true, get: function (s) { return s.probability + '%'; } }, { key: 'max_days', label: t('op.aging'), width: .9, num: true, get: function (s) { return s.max_days ? String(s.max_days) : '—'; } }, { key: 'flags', label: '', width: 1.4, get: function (s) { return h('span', { class: 'chips' }, s.terminal ? UI.chip('slate', STAGES.groupLabel('closed', S.lang), 'sm') : null, s.won ? UI.chip('ok', S.label('outcomes', 'won'), 'sm') : null, s.requires_reason ? UI.chip('warn', t('app.reason'), 'sm') : null, (s.required_fields || []).length ? UI.chip('info', (s.required_fields || []).join(', '), 'sm nodot') : null); } }, { key: 'a', label: '', width: .7, get: function (s) { if (!(S.can('admin.config') && (S.mode === 'supabase' || root.APP_CONFIG.features.localConfigEditing))) return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { UI.formModal({ title: STAGES.label(s.key, S.lang), size: 'sm', cols: 1, fields: [{ key: 'ar', label: t('ad.config_ar'), type: 'text', required: true }, { key: 'en', label: t('ad.config_en'), type: 'text', dir: 'ltr' }, { key: 'probability', label: t('op.probability'), type: 'pct', required: true }, { key: 'max_days', label: t('op.aging'), type: 'int' }], values: U.pick(s, ['ar', 'en', 'probability', 'max_days']), onSubmit: function (v) { return S.adapter.setConfig('stages.' + s.key, v).then(function () { root.APP.route(); }); } }); } } }, t('app.edit')); } }], rows: STAGES.list }) }));
  };

  /* ---------- سجل التدقيق ---------- */
  TABS.audit = function (pane) {
    var state = { entity_type: '', action: '', actor_id: '', q: '' };
    var box = h('div');
    var bar = UI.filters({ values: state, items: [
      { key: 'q', type: 'search', placeholder: t('app.id') },
      { key: 'entity_type', type: 'select', label: t('ad.audit_entity'), options: ['customer', 'contact', 'opportunity', 'proposal', 'contract', 'activity', 'campaign', 'user', 'config', 'document'].map(function (e) { return { value: e, label: e }; }) },
      { key: 'action', type: 'select', label: t('ad.audit_action'), options: ['create', 'update', 'archive', 'restore', 'stage_change', 'value_change', 'owner_change', 'submit', 'approve', 'reject', 'approval_request', 'export', 'import', 'merge', 'login', 'handover', 'convert', 'complete', 'reschedule', 'campaign_prepare', 'campaign_sent', 'config_change', 'reopen'].map(function (a) { return { value: a, label: root.I18N.has('ad.action.' + a) ? t('ad.action.' + a) : a }; }) },
      { key: 'actor_id', type: 'select', label: t('ad.audit_actor'), options: S.list('users').map(function (u) { return { value: u.id, label: S.userName(u.id) }; }) }
    ], onChange: function (v) { Object.assign(state, v); load(); } });
    pane.appendChild(bar); pane.appendChild(box);
    function load() {
      D.clear(box); box.appendChild(UI.loading());
      S.adapter.audit({ entity_type: state.entity_type || undefined, action: state.action || undefined, actor_id: state.actor_id || undefined, entity_id: state.q || undefined, limit: 300 }).then(function (rows) {
        D.clear(box);
        box.appendChild(UI.card({ title: t('ad.tab_audit'), sub: rows.length + ' ' + (S.lang === 'en' ? 'entries (latest 300)' : 'قيد (أحدث 300)'), tight: true, actions: S.can('export.data') ? UI.exportButton({ module: 'audit', rows: function () { return rows; }, columns: function () { return [{ key: 'at', label: t('ad.audit_at') }, { key: 'actor_id', label: t('ad.audit_actor'), get: function (a) { return S.userName(a.actor_id); } }, { key: 'action', label: t('ad.audit_action') }, { key: 'entity_type', label: t('ad.audit_entity') }, { key: 'entity_id', label: t('app.id') }, { key: 'before', label: t('ad.audit_before'), get: function (a) { return JSON.stringify(a.before); } }, { key: 'after', label: t('ad.audit_after'), get: function (a) { return JSON.stringify(a.after); } }, { key: 'source', label: t('ad.audit_source') }]; } }) : null,
          body: UI.table({ columns: [
            { key: 'at', label: t('ad.audit_at'), width: 1.5, get: function (a) { return S.dateTime(a.at); } },
            { key: 'actor', label: t('ad.audit_actor'), width: 1.3, get: function (a) { return S.userName(a.actor_id); } },
            { key: 'action', label: t('ad.audit_action'), width: 1.1, get: function (a) { return UI.chip(['archive', 'reject', 'merge'].indexOf(a.action) >= 0 ? 'danger' : (['approve', 'create', 'submit', 'handover'].indexOf(a.action) >= 0 ? 'ok' : 'slate'), root.I18N.has('ad.action.' + a.action) ? t('ad.action.' + a.action) : a.action, 'sm nodot'); } },
            { key: 'entity', label: t('ad.audit_entity'), width: 1.6, get: function (a) { var ent = a.entity_type; var linkable = ['customer', 'opportunity', 'proposal', 'contract', 'campaign'].indexOf(ent) >= 0; return h('span', null, ent + ' · ', linkable ? UI.recordLink(ent, String(a.entity_id).split('/')[0], String(a.entity_id)) : h('span', { class: 'ltr' }, String(a.entity_id))); } },
            { key: 'changes', label: t('ad.audit_changes'), width: 3.5, wrap: true, get: function (a) { return diffView(a); } },
            { key: 'source', label: t('ad.audit_source'), width: .7, get: function (a) { return a.source; } }
          ], rows: rows }) }));
      }).catch(function (e) { D.clear(box); box.appendChild(UI.errorBox(e.code === 'forbidden' ? t('app.permission_denied') : t('app.error_detail'))); });
    }
    function diffView(a) {
      var b = a.before || {}, af = a.after || {};
      if (typeof b !== 'object' || typeof af !== 'object') return String(af);
      var keys = U.uniq(Object.keys(b).concat(Object.keys(af))).filter(function (k) { return JSON.stringify(b[k]) !== JSON.stringify(af[k]); }).slice(0, 8);
      if (!keys.length) return h('span', { class: 'muted' }, '—');
      var g = h('div', { class: 'audit-diff' });
      keys.forEach(function (k) { var bv = b[k], av = af[k]; var fmt = function (v) { if (v === null || v === undefined) return '—'; if (typeof v === 'object') return U.truncate(JSON.stringify(v), 60); return U.truncate(String(v), 60); }; g.appendChild(h('span', { class: 'k' }, k)); g.appendChild(h('span', { class: 'b' }, fmt(bv))); g.appendChild(h('span', { class: 'a' }, fmt(av))); });
      return g;
    }
    load();
  };

  /* ---------- جودة البيانات ---------- */
  TABS.quality = function (pane) {
    var dq = ENGINE.dataQuality(S.db);
    var total = U.sum(dq, 'count');
    pane.appendChild(h('div', { class: 'kpis c4', style: { marginBottom: '14px' } }, UI.kpi({ label: t('ad.tab_quality'), value: String(total), sub: S.lang === 'en' ? 'records with issues (rules in src/config/rules.js)' : 'سجل عليه ملاحظات جودة' }), UI.kpi({ label: t('nav.customers'), value: String(U.sum(dq.filter(function (x) { return x.entity === 'customer'; }), 'count')) }), UI.kpi({ label: t('nav.opportunities'), value: String(U.sum(dq.filter(function (x) { return x.entity === 'opportunity'; }), 'count')) }), UI.kpi({ label: t('nav.proposals') + ' / ' + t('nav.contracts'), value: String(U.sum(dq.filter(function (x) { return x.entity === 'proposal' || x.entity === 'contract'; }), 'count')) })));
    pane.appendChild(UI.card({ title: t('ad.tab_quality'), tight: true, body: UI.table({ columns: [
      { key: 'rule', label: t('ad.quality_rule'), width: 3, get: function (x) { return h('span', null, ENGINE.dataQualityLabel(x.key, S.lang), h('span', { class: 'sub ltr' }, x.key)); } },
      { key: 'entity', label: t('ad.audit_entity'), width: 1, get: function (x) { return x.entity; } },
      { key: 'count', label: t('ad.quality_count'), width: .8, num: true, get: function (x) { return h('b', { class: x.count ? 'danger-ink' : '' }, String(x.count)); } },
      { key: 'bar', label: '', width: 2, get: function (x) { var max = Math.max(1, Math.max.apply(null, dq.map(function (d) { return d.count; }))); return h('div', { class: 'progress ' + (x.count ? 'warn' : 'ok') }, h('i', { style: { width: (x.count / max * 100).toFixed(0) + '%' } })); } },
      { key: 'act', label: t('ad.quality_fix'), width: 1, get: function (x) { if (!x.count) return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { showRecords(x); } } }, t('app.details')); } }
    ], rows: dq }) }));
    function showRecords(x) {
      var ent = x.entity;
      var cols = [{ key: 'name', label: t('app.name'), width: 3, get: function (r) { var nm = MODEL.displayName(ent, r, S.lang); return ent === 'contact' ? h('span', null, nm, h('span', { class: 'sub' }, S.customerName(r.customer_id))) : UI.recordLink(ent, r.id, nm); } }, { key: 'id', label: t('app.id'), width: 1.3 }, { key: 'owner', label: t('app.owner'), width: 1.3, get: function (r) { return S.userName(r.owner_id); } }, { key: 'fix', label: t('ad.quality_fix'), width: 1, get: function (r) { var perm = { customer: 'customers.edit', contact: 'contacts.manage', opportunity: 'opportunities.manage', proposal: 'proposals.manage', contract: 'contracts.manage' }[ent]; if (!S.canRec(perm, r, S.parentsOf(r))) return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { var fn = { customer: function () { return F.customer(r); }, contact: function () { return F.contact(r); }, opportunity: function () { return F.opportunity(r); }, proposal: function () { return F.proposal(r); }, contract: function () { return F.contract(r); } }[ent]; fn().then(function (res) { if (res) { m.close(true); root.APP.route(); } }); } } }, t('app.edit')); } }];
      var m = UI.drill(ENGINE.dataQualityLabel(x.key, S.lang), cols, x.records, { exportModule: ent + 's' });
    }
  };

  /* ---------- التكرارات ---------- */
  TABS.duplicates = function (pane) {
    var reviewed = S.list('duplicates');
    function isReviewed(a, b) { return reviewed.some(function (d) { return d.status !== 'open' && ((d.a === a && d.b === b) || (d.a === b && d.b === a)); }); }
    var cd = ENGINE.findDuplicateCustomers(S.db).filter(function (p) { return !isReviewed(p.a.id, p.b.id); });
    var kd = ENGINE.findDuplicateContacts(S.db).filter(function (p) { return !isReviewed(p.a.id, p.b.id); });
    pane.appendChild(UI.infoBox(S.lang === 'en' ? 'Detection uses CR / unified / VAT numbers, normalised name similarity, email and phone. Nothing is merged automatically; every merge or dismissal is audited.' : 'يعتمد الكشف على رقم السجل التجاري والرقم الموحد والرقم الضريبي، وتشابه الاسم بعد التطبيع، والبريد الإلكتروني والهاتف. ولا يتم أي دمج تلقائي؛ فكل دمج أو استبعاد يُسجَّل في التدقيق.'));
    function custRow(p) {
      return h('div', null, h('span', { class: 'avatar ' + (p.strong ? 'danger' : 'warn') }, p.strong ? '!' : '?'), h('div', { class: 'main' }, h('div', { class: 't', style: { whiteSpace: 'normal' } }, UI.recordLink('customer', p.a.id, MODEL.displayName('customer', p.a, S.lang)), ' ⟷ ', UI.recordLink('customer', p.b.id, MODEL.displayName('customer', p.b, S.lang))), h('div', { class: 's' }, p.a.id + ' · ' + p.b.id + ' — ' + p.reasons.map(function (r) { return t('ad.dup_reason_' + r); }).join('، '))),
        h('div', { class: 'end' }, h('button', { class: 'btn xs primary', type: 'button', on: { click: function () { mergeFlow(p); } } }, t('ad.dup_merge')), h('button', { class: 'btn xs ghost', type: 'button', on: { click: function () { S.adapter.dismissDuplicate('customer', p.a.id, p.b.id).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('ad.dup_dismiss'))));
    }
    function mergeFlow(p) {
      UI.formModal({ title: t('ad.dup_merge'), size: 'sm', cols: 1, intro: UI.warnBox(t('ad.dup_merge_confirm')), fields: [{ key: 'keep', label: t('ad.dup_keep'), type: 'select', options: [{ value: p.a.id, label: MODEL.displayName('customer', p.a, S.lang) + ' (' + p.a.id + ')' }, { value: p.b.id, label: MODEL.displayName('customer', p.b, S.lang) + ' (' + p.b.id + ')' }], required: true, allowEmpty: false }], values: { keep: p.a.id }, saveLabel: t('ad.dup_merge'),
        onSubmit: function (v) { var keep = v.keep, merge = keep === p.a.id ? p.b.id : p.a.id; return S.adapter.mergeCustomers(keep, merge).then(function () { return root.APP.rerender(); }); } });
    }
    pane.appendChild(UI.card({ title: t('nav.customers'), sub: cd.length + ' ' + (S.lang === 'en' ? 'suspected pairs' : 'زوج مشتبه بتكراره'), tight: true, body: cd.length ? UI.list(cd, custRow) : UI.empty(t('ad.dup_none'), ' ') }));
    pane.appendChild(h('div', { style: { height: '12px' } }));
    pane.appendChild(UI.card({ title: t('cu.tab_contacts'), sub: kd.length + ' ' + (S.lang === 'en' ? 'suspected pairs' : 'زوج مشتبه بتكراره'), tight: true, body: kd.length ? UI.list(kd, function (p) { return h('div', null, h('span', { class: 'avatar warn' }, '?'), h('div', { class: 'main' }, h('div', { class: 't' }, p.a.full_name + ' ⟷ ' + p.b.full_name), h('div', { class: 's' }, S.customerName(p.a.customer_id) + ' / ' + S.customerName(p.b.customer_id) + ' — ' + p.reasons.map(function (r) { return t('ad.dup_reason_' + r); }).join('، '))), h('div', { class: 'end' }, h('button', { class: 'btn xs ghost', type: 'button', on: { click: function () { S.adapter.dismissDuplicate('contact', p.a.id, p.b.id).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('ad.dup_dismiss')))); }) : UI.empty(t('ad.dup_none'), ' ') }));
    var hist = reviewed.slice().reverse().slice(0, 20);
    if (hist.length) { pane.appendChild(h('div', { style: { height: '12px' } })); pane.appendChild(UI.card({ title: t('ad.tab_audit'), tight: true, body: UI.table({ columns: [{ key: 'kind', label: t('ad.dup_kind'), width: 1 }, { key: 'a', label: t('ad.dup_records'), width: 2.5, get: function (d) { return d.a + ' ⟷ ' + d.b; } }, { key: 'status', label: t('app.status'), width: 1, get: function (d) { return UI.chip(d.status === 'merged' ? 'ok' : 'slate', d.status === 'merged' ? t('ad.action.merge') : t('ad.dup_dismiss'), 'sm'); } }, { key: 'by', label: t('app.by'), width: 1.5, get: function (d) { return S.userName(d.reviewed_by) + ' · ' + S.dateTime(d.reviewed_at); } }], rows: hist }) })); }
  };

  /* ---------- الاستيراد والتصدير ---------- */
  TABS.import = function (pane) {
    var canImport = S.can('import.data');
    var modSel = h('select', { class: 'sel' }); ['customers', 'contacts', 'opportunities', 'activities'].forEach(function (m) { modSel.appendChild(h('option', { value: m }, m === 'contacts' ? t('cu.tab_contacts') : t('nav.' + m))); });
    var fileInp = h('input', { type: 'file', accept: '.xlsx,.xls,.csv', class: 'inp', style: { padding: '6px' }, disabled: !canImport });
    var result = h('div');
    var validateBtn = h('button', { class: 'btn primary', type: 'button', disabled: !canImport }, t('ad.import_validate'));
    var tmplBtn = h('button', { class: 'btn', type: 'button', on: { click: function () { var hdrs = IMPORTER.templateHeaders(modSel.value, S.lang); root.EXPORTER.downloadTemplate('template_' + modSel.value + '.xlsx', hdrs); } } }, UI.icon('download'), t('ad.import_template'));
    pane.appendChild(UI.card({ title: t('ad.import_title'), sub: t('ad.import_hint'), body: h('div', null, h('div', { class: 'filters' }, h('span', { class: 'small muted' }, t('ad.import_module')), modSel, fileInp, validateBtn, tmplBtn), canImport ? null : UI.warnBox(t('app.permission_denied')), result) }));
    var parsedRows = null;
    validateBtn.addEventListener('click', function () {
      var f = fileInp.files[0]; if (!f) { UI.toast(t('ad.import_file'), 'warn'); return; }
      if (f.size > RULES.import.max_file_mb * 1024 * 1024) { UI.toast(IMPORTER.errorLabel({ key: 'too_many_rows', got: Math.round(f.size / 1024 / 1024) + 'MB', max: RULES.import.max_file_mb + 'MB' }, S.lang), 'err'); return; }
      var ext = (f.name.split('.').pop() || '').toLowerCase(); if (RULES.import.allowed_extensions.indexOf(ext) < 0) { UI.toast(t('app.invalid_number'), 'err'); return; }
      D.clear(result); result.appendChild(UI.loading());
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          /* المكتبة مضمّنة محليًا؛ إن غابت (نسخة مصغّرة) نُبلّغ بوضوح بدل رمي خطأ غامض */
          if (!root.XLSX) { D.clear(result); result.appendChild(UI.errorBox(t('ad.xlsx_missing'))); return; }
          var wb = root.XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellFormula: false, cellHTML: false, cellNF: false, bookVBA: false });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var rows = root.XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
          parsedRows = rows;
          var res = IMPORTER.validate(modSel.value, rows, S.db, S.list('users'));
          showResult(res, f.name);
        } catch (err) { D.clear(result); result.appendChild(UI.errorBox(t('app.error_detail') + ' — ' + err.message)); }
      };
      reader.readAsArrayBuffer(f);
    });
    function showResult(res, fileName) {
      D.clear(result);
      if (res.structure_errors.length) { res.structure_errors.forEach(function (e) { result.appendChild(UI.errorBox(IMPORTER.errorLabel(e, S.lang))); }); return; }
      result.appendChild(h('div', { class: 'kpis c4', style: { margin: '12px 0' } }, UI.kpi({ label: t('app.count'), value: String(res.rows.length) }), UI.kpi({ label: t('ad.import_valid'), value: String(res.valid), tone: 'ok' }), UI.kpi({ label: t('ad.import_invalid'), value: String(res.invalid), tone: res.invalid ? 'danger' : '' }), UI.kpi({ label: S.lang === 'en' ? 'Warnings' : 'تحذيرات', value: String(res.warnings), tone: res.warnings ? 'warn' : '' })));
      if (res.unknown_columns && res.unknown_columns.length) result.appendChild(UI.warnBox((S.lang === 'en' ? 'Ignored unknown columns: ' : 'أعمدة غير معروفة جرى تجاهلها: ') + res.unknown_columns.join('، ')));
      var applyBtn = h('button', { class: 'btn primary', type: 'button', disabled: !res.valid || !canImport, on: { click: function () { UI.confirm({ title: t('ad.import_apply'), message: res.valid + ' ' + t('ad.import_valid') + ' · ' + res.invalid + ' ' + t('ad.import_invalid'), ok: t('ad.import_apply') }).then(function (ok) { if (!ok) return; S.adapter.importRows(modSel.value, parsedRows, fileName).then(function (r2) { return root.APP.refresh().then(function () { UI.toast(t('ad.import_apply') + ': ' + r2.inserted, 'ok'); location.hash = '#/admin/import'; root.APP.route(); }); }).catch(UI.errorToast); }); } } }, t('ad.import_apply'));
      result.appendChild(h('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px' } }, applyBtn));
      result.appendChild(UI.table({ columns: [{ key: 'row', label: t('ad.import_row'), width: .6, num: true, get: function (r) { return String(r.row); } }, { key: 'ok', label: t('app.status'), width: .9, get: function (r) { return r.ok ? UI.chip('ok', t('ad.import_valid'), 'sm') : UI.chip('danger', t('ad.import_invalid'), 'sm'); } }, { key: 'data', label: t('app.details'), width: 3, wrap: true, get: function (r) { var d = r.data; return U.truncate(Object.keys(d).slice(0, 5).map(function (k) { return k + ': ' + (Array.isArray(d[k]) ? d[k].join('/') : d[k]); }).join(' · '), 140); } }, { key: 'errors', label: t('ad.import_errors'), width: 3, wrap: true, get: function (r) { return h('span', null, r.errors.map(function (e) { return h('div', { class: 'danger-ink small' }, '• ' + (e.field ? e.field + ': ' : '') + IMPORTER.errorLabel(e, S.lang)); }), r.warnings.map(function (e) { return h('div', { class: 'warn-ink small', style: { color: 'var(--warn-ink)' } }, '△ ' + (e.field ? e.field + ': ' : '') + IMPORTER.errorLabel(e, S.lang)); })); } }], rows: res.rows.slice(0, 200) }));
    }
    /* سجل الاستيراد + التصدير */
    var jobs = (S.db.import_jobs || []).slice().reverse();
    pane.appendChild(h('div', { style: { height: '12px' } }));
    pane.appendChild(UI.card({ title: t('ad.export_title'), sub: t('ad.export_hint'), body: h('div', { class: 'chips' }, ['customers', 'contacts', 'opportunities', 'proposals', 'contracts', 'activities'].map(function (m) { return UI.exportButton({ module: m, label: t('nav.' + (m === 'contacts' ? 'customers' : m)) + (m === 'contacts' ? ' — ' + t('cu.tab_contacts') : ''), rows: function () { return S.live(m); }, columns: function () { var sample = S.live(m)[0] || {}; return Object.keys(sample).filter(function (k) { return k.charAt(0) !== '_' && ['version', 'demo'].indexOf(k) < 0; }).map(function (k) { return { key: k, label: k, get: function (r) { var v = r[k]; return typeof v === 'object' && v !== null ? JSON.stringify(v) : v; } }; }); } }); })) }));
  };

  /* ---------- مركز البيانات والتكامل ---------- */
  TABS.integration = function (pane) {
    pane.appendChild(UI.infoBox(t('ad.integration_hint')));
    var health = h('div'); pane.appendChild(health);
    S.adapter.health().then(function (hh) {
      var originCounts = U.groupBy(S.live('customers'), function (c) { return c.origin || 'platform'; });
      health.appendChild(h('div', { class: 'grid c2' },
        UI.card({ title: t('ad.tab_integration'), body: UI.kv([[t('ad.integration_adapter'), hh.mode + (hh.mode === 'supabase' ? ' — ' + (root.APP_CONFIG.data.supabase.url || '') : ' — ' + (S.lang === 'en' ? 'this browser store' : 'مخزن هذا المتصفح'))], [t('ad.integration_status'), hh.ok ? UI.chip('ok', 'OK', 'sm') : UI.chip('danger', hh.message || 'error', 'sm')], [t('ad.integration_last_sync'), hh.lastSync ? S.dateTime(hh.lastSync) : (S.lang === 'en' ? 'No data-centre sync configured' : 'لا توجد مزامنة مهيّأة مع مركز البيانات')], [t('ad.integration_conflicts'), '0'], [S.lang === 'en' ? 'Seed data' : 'البيانات الأولية', S.demo ? UI.chip('info', S.lang === 'en' ? 'Loaded' : 'محمّلة', 'sm') : UI.chip('ok', S.lang === 'en' ? 'None' : 'لا توجد', 'sm')]]) }),
        UI.card({ title: t('app.origin'), sub: S.lang === 'en' ? 'Customers by record origin' : 'العملاء حسب مصدر السجل', body: UI.hbars({ rows: Object.keys(originCounts).map(function (k) { return { label: S.label('record_origins', k), value: originCounts[k].length }; }) }) }),
        UI.card({ title: S.lang === 'en' ? 'Integration boundary' : 'حدود التكامل', body: h('div', { class: 'small' }, h('p', null, S.lang === 'en' ? '• Master data from the data centre carries source_system / source_id / synced_at and origin=datacentre.' : '• تحمل البيانات الواردة من مركز البيانات معرّف النظام المصدر ومعرّف السجل وتاريخ المزامنة.'), h('p', null, S.lang === 'en' ? '• Platform-entered data: origin=platform; imported files: origin=import; seed: origin=demo.' : '• يُحفظ لكل سجل مصدره: مُدخل في المنصة، أو مستورد من ملف، أو وارد من مركز البيانات، أو بيانات أولية.'), h('p', null, S.lang === 'en' ? '• Derived values (weighted value, days in stage, flags) are never stored.' : '• القيم المشتقة (القيمة المرجحة، وأيام المرحلة، والمؤشرات) لا تُخزَّن أبدًا.'), h('p', null, S.lang === 'en' ? '• Sync conflicts: a data-centre record never overwrites a newer platform edit silently; conflicts are queued for review (see docs/DATA-MODEL.md).' : '• عند التعارض لا يستبدل سجل مركز البيانات تعديلًا أحدث أُجري في المنصة؛ بل يُعرض التعارض للمراجعة.')) }),
        S.can('admin.config') && S.adapter.purgeDemo ? UI.card({ title: t('app.demo_purge'), body: h('div', null,
          h('p', { class: 'small muted' }, S.mode === 'supabase'
            ? (S.lang === 'en' ? 'Removes every seed record (origin=demo) from the Supabase project, deactivates the preloaded profiles and deletes their Auth accounts when another active system administrator exists. Irreversible.' : 'يحذف جميع السجلات الأولية من مشروع Supabase، ويوقف حسابات المستخدمين المحمّلة مسبقًا ويحذفها من نظام الدخول عند وجود مسؤول نظام آخر نشط. لا يمكن التراجع عن هذا الإجراء.')
            : (S.lang === 'en' ? 'Removes every seed record from this browser store. Irreversible.' : 'يحذف جميع السجلات الأولية من مخزن هذا المتصفح. لا يمكن التراجع عن هذا الإجراء.')),
          hh.demoStatus ? h('p', { class: 'small' }, (S.lang === 'en' ? 'Seed records on the server: ' : 'السجلات الأولية على الخادم: ') + U.fmtNum(hh.demoStatus.total) + (S.lang === 'en' ? ' · preloaded users: ' : ' · حسابات محمّلة مسبقًا: ') + U.fmtNum(hh.demoStatus.users)) : null,
          S.adapter.resetDemo ? h('button', { class: 'btn', type: 'button', style: { marginTop: '8px', marginInlineEnd: '8px' }, on: { click: function () { UI.confirm({ title: t('app.demo_reset'), message: t('app.demo_reset') + '؟' }).then(function (ok) { if (ok) S.adapter.resetDemo().then(function () { S.user = S.adapter.currentUser() || S.user; if (S.adapter.demo !== undefined) S.demo = !!S.adapter.demo; return S.refresh(); }).then(function () { UI.toast(t('app.saved'), 'ok'); return root.APP.rerender(); }).catch(UI.errorToast); }); } } }, t('app.demo_reset')) : null,
          h('button', { class: 'btn danger', type: 'button', style: { marginTop: '8px' }, on: { click: function () { UI.confirm({ title: t('app.demo_purge'), message: t('app.demo_purge') + '؟', danger: true }).then(function (ok) { if (ok) S.adapter.purgeDemo().then(function (r2) { UI.toast(t('app.demo_purge') + ': ' + r2.removed, 'ok'); S.demo = false; if (r2.signed_out) { return S.adapter.signOut().then(function () { S.user = null; S.db = null; location.hash = ''; location.reload(); }); } return root.APP.rerender(); }).catch(UI.errorToast); }); } } }, t('app.demo_purge'))) }) : null));
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
