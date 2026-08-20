/* =====================================================================
   VIEW: العملاء — القائمة (جدول/بطاقات) + ملف العميل الشامل
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, STAGES = root.STAGES, MODEL = root.MODEL, F = root.FORMS, SEARCH = root.SEARCH, PERMS = root.PERMS;
  root.VIEWS = root.VIEWS || {};

  var state = { filters: {}, sort: { key: 'updated_at', dir: 'desc' }, view: 'table', shown: 50 };

  function applyFilters(list, f) {
    var db = S.db;
    var out = list.filter(function (c) {
      if (!f.archived && c.archived_at) return false;
      if (f.status && c.status !== f.status) return false;
      if (f.customer_type && c.customer_type !== f.customer_type) return false;
      if (f.region && c.region !== f.region) return false;
      if (f.owner_id && c.owner_id !== f.owner_id && c.secondary_owner_id !== f.owner_id) return false;
      if (f.classification && c.classification !== f.classification) return false;
      if (f.sector && c.sector !== f.sector) return false;
      if (f.quality) { var fl = ENGINE.customerFlags(c, db); if (f.quality === 'any' ? !fl.length : !fl.some(function (x) { return x.key === f.quality; })) return false; }
      if (f.tag && (c.tags || []).indexOf(f.tag) < 0) return false;
      return true;
    });
    if (f.q) out = SEARCH.filter(out, f.q, ['name_ar', 'name_en', 'cr_number', 'unified_number', 'vat_number', 'id', 'email', 'phone', 'city', function (c) { return (c.tags || []).join(' '); }]);
    return out;
  }
  function sortList(list, sort) {
    if (!sort || !sort.key) return list;
    var key = sort.key;
    var fn = { name: function (c) { return MODEL.displayName('customer', c, S.lang); }, last: function (c) { return ENGINE.customerLastInteraction(c, S.db) || ''; }, opps: function (c) { return S.oppsOf(c.id).filter(function (o) { return STAGES.isActive(o.stage); }).length; } }[key] || key;
    return U.sortBy(list, fn, sort.dir);
  }
  function columns() {
    return [
      { key: 'name', label: t('app.customer'), width: 3, sortable: true, get: function (c) { var fl = ENGINE.customerFlags(c, S.db); return h('span', null, h('span', { class: 'lnk' }, MODEL.displayName('customer', c, S.lang)), h('span', { class: 'sub' }, c.id + (c.cr_number ? ' · ' + t('cu.cr') + ' ' + c.cr_number : '') + (fl.length ? ' · ⚑ ' + fl.length : ''))); }, exportGet: function (c) { return MODEL.displayName('customer', c, S.lang); } },
      { key: 'customer_type', label: t('cu.type'), width: 1.4, sortable: true, get: function (c) { return S.label('customer_types', c.customer_type); } },
      { key: 'status', label: t('app.status'), width: 1.2, sortable: true, get: function (c) { return UI.lookupChip('customer_statuses', c.status, 'sm'); }, exportGet: function (c) { return S.label('customer_statuses', c.status); } },
      { key: 'classification', label: t('cu.class'), width: .9, sortable: true, center: true, get: function (c) { return UI.lookupChip('customer_classes', c.classification, 'sm nodot'); }, exportGet: function (c) { return c.classification; } },
      { key: 'region', label: t('cu.region'), width: 1.2, sortable: true, get: function (c) { return S.regionLabel(c.region) + (c.city ? ' · ' + S.cityLabel(c.region, c.city) : ''); } },
      { key: 'owner_id', label: t('cu.owner'), width: 1.5, sortable: true, get: function (c) { return UI.userCell(c.owner_id); }, exportGet: function (c) { return S.userName(c.owner_id); } },
      { key: 'opps', label: t('cu.stats_opps'), width: .8, num: true, sortable: true, get: function (c) { var o = S.oppsOf(c.id); return o.filter(function (x) { return STAGES.isActive(x.stage); }).length + ' / ' + o.length; } },
      { key: 'last', label: t('cu.last_interaction'), width: 1.3, sortable: true, get: function (c) { var d = ENGINE.customerLastInteraction(c, S.db); return d ? h('span', null, S.date(d), h('span', { class: 'sub' }, S.rel(-U.daysSince(d)))) : h('span', { class: 'muted' }, '—'); }, exportGet: function (c) { return ENGINE.customerLastInteraction(c, S.db); } },
      { key: 'next', label: t('cu.next_action'), width: 1.3, get: function (c) { var n = ENGINE.customerNextAction(c, S.db); if (!n) return h('span', { class: 'chip warn sm' }, t('app.no_next_action')); var d = U.daysUntil(n.date); return h('span', null, S.date(n.date), h('span', { class: 'sub ' + (d < 0 ? 'danger' : '') }, d < 0 ? t('app.overdue') : S.rel(d))); }, exportGet: function (c) { var n = ENGINE.customerNextAction(c, S.db); return n ? n.date : ''; } }
    ];
  }

  function renderList(main, query) {
    var f = state.filters;
    if (query && Object.keys(query).length) { Object.keys(query).forEach(function (k) { f[k] = query[k]; }); }
    main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('cu.title')), h('p', { class: 'sub' }, t('cu.sub'))),
      h('div', { class: 'actions' },
        h('div', { class: 'btngroup', role: 'group' }, h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'table' ? 'true' : 'false', on: { click: function () { state.view = 'table'; root.APP.route(); } } }, t('app.view_table')), h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'cards' ? 'true' : 'false', on: { click: function () { state.view = 'cards'; root.APP.route(); } } }, t('app.view_cards'))),
        UI.savedViews('customers', function () { return state.filters; }, function (flt) { state.filters = Object.assign({}, flt); root.APP.route(); }),
        S.can('customers.create') ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.customer(null).then(function (r) { if (r) location.hash = '#/customers/' + r.id; }); } } }, UI.icon('plus'), t('cu.new')) : null)));
    var users = S.live('users').filter(function (u) { return ['bd_employee', 'bd_manager', 'system_admin', 'proposal_manager'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: S.userName(u.id) }; });
    var qualityOpts = [{ value: 'any', label: t('cu.quality_issues') }].concat(['missing_contact_details', 'no_owner', 'no_contacts', 'needs_follow_up', 'overdue_follow_up'].map(function (k) { return { value: k, label: ENGINE.customerFlagLabel(k, S.lang) }; }));
    var bar = UI.filters({ values: f, items: [
      { key: 'q', type: 'search', placeholder: t('app.search') + ' — ' + t('cu.name_ar') + ' / ' + t('cu.cr') + ' / ' + t('cu.email') },
      { key: 'status', type: 'select', label: t('cu.filter_status'), lookup: 'customer_statuses' },
      { key: 'customer_type', type: 'select', label: t('cu.filter_type'), lookup: 'customer_types' },
      { key: 'region', type: 'select', label: t('cu.filter_region'), lookup: 'regions' },
      { key: 'classification', type: 'select', label: t('cu.filter_class'), lookup: 'customer_classes' },
      { key: 'sector', type: 'select', label: t('cu.filter_sector'), lookup: 'sectors' },
      { key: 'owner_id', type: 'select', label: t('cu.filter_owner'), options: users },
      { key: 'quality', type: 'select', label: t('cu.filter_quality'), options: qualityOpts }
    ], onChange: function (v) { state.filters = v; state.shown = 50; renderBody(); } });
    main.appendChild(bar);
    var body = h('div'); main.appendChild(body);
    function renderBody() {
      D.clear(body);
      var all = S.list('customers');
      var rows = sortList(applyFilters(all, state.filters), state.sort);
      var af = UI.activeFilters(state.filters, function (k, v) { var lbls = { q: t('app.search'), status: t('cu.filter_status'), customer_type: t('cu.filter_type'), region: t('cu.filter_region'), classification: t('cu.filter_class'), sector: t('cu.filter_sector'), owner_id: t('cu.filter_owner'), quality: t('cu.filter_quality'), tag: t('app.tags') }; var val = v; if (k === 'owner_id') val = S.userName(v); else if (k === 'status') val = S.label('customer_statuses', v); else if (k === 'customer_type') val = S.label('customer_types', v); else if (k === 'region') val = S.regionLabel(v); else if (k === 'sector') val = S.label('sectors', v); else if (k === 'classification') val = S.label('customer_classes', v); else if (k === 'quality') val = v === 'any' ? t('cu.quality_issues') : ENGINE.customerFlagLabel(v, S.lang); return (lbls[k] || k) + ': ' + val; }, function (k) { delete state.filters[k]; bar.set(k, ''); renderBody(); });
      if (af) body.appendChild(af);
      var head = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' } }, h('span', { class: 'count-note' }, t('app.showing', { shown: Math.min(state.shown, rows.length), total: rows.length })), h('span', { style: { flex: 1 } }), UI.exportButton({ module: 'customers', filters: function () { return state.filters; }, rows: function () { return rows; }, columns: function () { return columns().map(function (c) { return { key: c.key, label: c.label, get: c.exportGet || (c.get ? function (r) { var v = c.get(r); return v && v.textContent !== undefined ? v.textContent : v; } : null) }; }); } }));
      body.appendChild(head);
      var page = rows.slice(0, state.shown);
      if (state.view === 'table') {
        var card = UI.card({ tight: true, body: UI.table({ columns: columns(), rows: page, rowKey: 'id', sort: state.sort, onSort: function (k, d) { state.sort = { key: k, dir: d }; renderBody(); }, onRow: function (c) { location.hash = '#/customers/' + c.id; }, empty: t('app.no_results') }) });
        card.appendChild(UI.pager(rows.length, page.length, function () { state.shown += 50; renderBody(); }));
        body.appendChild(card);
      } else {
        var grid = h('div', { class: 'grid c3' });
        page.forEach(function (c) {
          var fl = ENGINE.customerFlags(c, S.db), opps = S.oppsOf(c.id), act = opps.filter(function (o) { return STAGES.isActive(o.stage); });
          var last = ENGINE.customerLastInteraction(c, S.db);
          var card = h('div', { class: 'card', style: { cursor: 'pointer' }, tabindex: '0', on: { click: function () { location.hash = '#/customers/' + c.id; }, keydown: function (e) { if (e.key === 'Enter') location.hash = '#/customers/' + c.id; } } },
            h('div', { class: 'card-b' }, h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } }, h('span', { class: 'avatar sq' }, U.initials(MODEL.displayName('customer', c, S.lang))), h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'bold ellip' }, MODEL.displayName('customer', c, S.lang)), h('div', { class: 'small muted' }, S.label('customer_types', c.customer_type) + ' · ' + S.regionLabel(c.region))), UI.lookupChip('customer_statuses', c.status, 'sm')),
              h('div', { class: 'stat-inline', style: { marginTop: '10px' } }, h('span', null, t('cu.stats_active') + ' ', h('b', null, String(act.length))), h('span', null, t('cu.stats_opps') + ' ', h('b', null, String(opps.length))), S.seesCommercial(c) ? h('span', null, t('cu.stats_value') + ' ', h('b', null, S.moneyShort(U.sum(act, 'estimated_value')))) : null),
              h('div', { class: 'small muted', style: { marginTop: '8px' } }, t('cu.last_interaction') + ': ' + (last ? S.date(last) : '—') + ' · ' + t('cu.owner') + ': ' + S.userName(c.owner_id)),
              fl.length ? h('div', { style: { marginTop: '8px' } }, UI.flagChips(fl, ENGINE.customerFlagLabel, 2)) : null));
          grid.appendChild(card);
        });
        body.appendChild(grid);
        body.appendChild(UI.pager(rows.length, page.length, function () { state.shown += 50; renderBody(); }));
      }
    }
    renderBody();
  }

  /* ---------- ملف العميل ---------- */
  function renderDetail(main, id, query) {
    var c = S.get('customer', id);
    if (!c) { main.appendChild(UI.empty(t('app.no_results'), id)); return; }
    var db = S.db, flags = ENGINE.customerFlags(c, db), contacts = S.contactsOf(c.id), opps = S.oppsOf(c.id), contracts = S.live('contracts').filter(function (k) { return k.customer_id === c.id; }), projects = S.live('projects').filter(function (p) { return p.customer_id === c.id; });
    var canEdit = S.canRec('customers.edit', c), canCom = S.seesCommercial(c);
    main.appendChild(h('div', { class: 'crumbs' }, UI.link('#/customers', t('nav.customers')), h('span', { class: 'sep' }, '/'), h('span', null, c.id)));
    var head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, MODEL.displayName('customer', c, S.lang), ' ', UI.lookupChip('customer_statuses', c.status), ' ', UI.originChip(c)), h('p', { class: 'sub' }, (S.lang === 'en' ? (c.name_ar || '') : (c.name_en || '')) + (c.cr_number ? ' · ' + t('cu.cr') + ' ' + c.cr_number : '') + ' · ' + S.label('customer_types', c.customer_type) + ' · ' + S.regionLabel(c.region))));
    var acts = h('div', { class: 'actions' });
    if (S.canRec('activities.manage', null, [c])) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.activity(null, { customer_id: c.id }).then(function (r) { if (r) root.APP.route(); }); } } }, t('cu.log_activity')));
    if (S.canRec('opportunities.manage', null, [c])) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.opportunity(null, c.id).then(function (r) { if (r) location.hash = '#/opportunities/' + r.id; }); } } }, t('cu.add_opportunity')));
    if (canEdit) acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.customer(c).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('edit'), t('app.edit')));
    if (S.canRec('customers.archive', c) && !c.archived_at) acts.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: function () { UI.confirm({ title: t('app.archive'), message: t('cu.archive_confirm'), danger: true, ok: t('app.archive') }).then(function (ok) { if (ok) S.adapter.archive('customer', c.id).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); }); } } }, t('app.archive')));
    if (c.archived_at && S.canRec('customers.archive', c)) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { S.adapter.restore('customer', c.id).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('app.restore')));
    head.appendChild(acts); main.appendChild(head);
    if (flags.length) main.appendChild(h('div', { style: { marginBottom: '12px' } }, UI.flagChips(flags, ENGINE.customerFlagLabel, 6)));
    var dups = ENGINE.findDuplicateCustomers(db, c).filter(function (p) { return !S.list('duplicates').some(function (d) { return d.status !== 'open' && ((d.a === p.a.id && d.b === p.b.id) || (d.a === p.b.id && d.b === p.a.id)); }); });
    if (dups.length) { var wb = UI.warnBox(''); D.clear(wb); wb.appendChild(UI.icon('warn')); var inner = h('div', null, h('b', null, t('cu.duplicate_warning') + ' — ')); dups.forEach(function (p, i) { inner.appendChild(UI.recordLink('customer', p.b.id, MODEL.displayName('customer', p.b, S.lang))); inner.appendChild(D.text(' (' + p.reasons.map(function (r) { return t('ad.dup_reason_' + r); }).join('، ') + ')' + (i < dups.length - 1 ? '، ' : ''))); }); if (S.can('duplicates.review')) inner.appendChild(h('span', null, ' — ', UI.link('#/admin/duplicates', t('ad.tab_duplicates')))); wb.appendChild(inner); main.appendChild(wb); }

    /* ملخص الأرقام */
    var active = opps.filter(function (o) { return STAGES.isActive(o.stage); }), won = opps.filter(function (o) { return STAGES.isWon(o.stage); }), lost = opps.filter(function (o) { return o.stage === 'lost'; });
    var last = ENGINE.customerLastInteraction(c, db), next = ENGINE.customerNextAction(c, db);
    var kp = h('div', { class: 'kpis', style: { marginBottom: '14px' } });
    kp.appendChild(UI.kpi({ label: t('cu.stats_active'), value: String(active.length), sub: canCom ? t('cu.stats_value') + ': ' + S.moneyShort(U.sum(active, 'estimated_value')) : '', onClick: function () { showTab('opps'); } }));
    kp.appendChild(UI.kpi({ label: t('cu.stats_won'), value: String(won.length), tone: 'ok', onClick: function () { showTab('opps'); } }));
    kp.appendChild(UI.kpi({ label: t('cu.stats_lost'), value: String(lost.length), onClick: function () { showTab('opps'); } }));
    kp.appendChild(UI.kpi({ label: t('cu.stats_contracts'), value: String(contracts.length), sub: canCom ? S.moneyShort(U.sum(contracts.filter(function (k) { return ['signed', 'active', 'completed'].indexOf(k.status) >= 0; }), 'contract_value')) : '', onClick: function () { showTab('projects'); } }));
    kp.appendChild(UI.kpi({ label: t('cu.last_interaction'), value: last ? S.rel(-U.daysSince(last)) : '—', sub: last ? S.date(last) : '', onClick: function () { showTab('timeline'); } }));
    kp.appendChild(UI.kpi({ label: t('cu.next_action'), value: next ? S.rel(U.daysUntil(next.date)) : '—', sub: next ? S.date(next.date) + (next.opportunity ? ' · ' + next.opportunity.next_action : (next.activity ? ' · ' + (next.activity.purpose || '') : '')) : t('app.no_next_action'), tone: next && U.daysUntil(next.date) < 0 ? 'danger' : '', onClick: function () { showTab('timeline'); } }));
    main.appendChild(kp);

    var tabsDef = [{ key: 'profile', label: t('cu.tab_profile') }, { key: 'contacts', label: t('cu.tab_contacts'), count: contacts.length }, { key: 'opps', label: t('cu.tab_opps'), count: opps.length }, { key: 'projects', label: t('cu.tab_projects'), count: contracts.length + projects.length }, { key: 'timeline', label: t('cu.tab_timeline') }, { key: 'docs', label: t('cu.tab_docs'), count: S.list('documents').filter(function (d) { return d.entity_type === 'customer' && d.entity_id === c.id; }).length }, { key: 'relationship', label: t('cu.tab_relationship') }];
    var active_tab = (query && query.tab) || 'profile';
    var tabBar = UI.tabs({ tabs: tabsDef, active: active_tab, onChange: function (k) { showTab(k); } });
    var pane = h('div');
    main.appendChild(tabBar); main.appendChild(pane);
    function showTab(k) { active_tab = k; D.qsa('button', tabBar).forEach(function (b, i) { b.setAttribute('aria-selected', tabsDef[i].key === k ? 'true' : 'false'); }); D.clear(pane); tabs[k](); }
    var tabs = {
      profile: function () {
        var g = h('div', { class: 'grid c2' });
        g.appendChild(UI.card({ title: t('cu.org_info'), body: UI.kv([[t('app.id'), c.id], [t('cu.name_ar'), c.name_ar], [t('cu.name_en'), h('span', { class: 'ltr' }, c.name_en)], [t('cu.type'), S.label('customer_types', c.customer_type)], [t('cu.sector'), S.label('sectors', c.sector)], [t('cu.class'), UI.lookupChip('customer_classes', c.classification, 'sm nodot')], [t('cu.status'), UI.lookupChip('customer_statuses', c.status, 'sm')], [t('cu.source'), S.label('customer_sources', c.source)], [t('cu.confidentiality'), S.label('confidentiality', c.confidentiality)], [t('app.tags'), c.tags && c.tags.length ? h('span', { class: 'chips' }, c.tags.map(function (x) { return h('span', { class: 'tag' }, x); })) : null], [t('app.origin'), S.label('record_origins', c.origin || 'platform') + (c.source_id ? ' · ' + c.source_id : '')], [t('cu.added'), S.date(c.created_at) + (S.hijri(c.created_at) ? ' — ' + S.hijri(c.created_at) : '')], [t('app.updated'), S.dateTime(c.updated_at) + ' · ' + S.userName(c.updated_by)]]) }));
        g.appendChild(UI.card({ title: t('cu.registration'), body: UI.kv([[t('cu.cr'), c.cr_number ? h('span', { class: 'num' }, c.cr_number) : null], [t('cu.unified'), c.unified_number ? h('span', { class: 'num' }, c.unified_number) : null], [t('cu.vat'), c.vat_number ? h('span', { class: 'num' }, c.vat_number) : null], [t('cu.website'), c.website ? h('span', { class: 'ltr' }, c.website) : null], [t('cu.phone'), c.phone ? h('span', { class: 'num' }, c.phone) : null], [t('cu.email'), c.email ? h('span', { class: 'ltr' }, c.email) : null], [t('cu.address'), c.address], [t('cu.region'), S.regionLabel(c.region)], [t('cu.city'), S.cityLabel(c.region, c.city)], [t('cu.portal'), c.procurement_portal], [t('cu.vendor_reg'), UI.lookupChip('vendor_registration', c.vendor_registration, 'sm')], [t('cu.prequal'), UI.lookupChip('prequalification', c.prequalification, 'sm')], [t('cu.pref_lang'), S.label('languages', c.preferred_language)]]) }));
        g.appendChild(UI.card({ title: t('cu.relationship'), body: UI.kv([[t('cu.owner'), UI.userCell(c.owner_id)], [t('cu.owner2'), c.secondary_owner_id ? UI.userCell(c.secondary_owner_id) : null], [t('cu.strength'), UI.lookupChip('relationship_strength', c.relationship_strength, 'sm')], [t('cu.importance'), S.label('importance', c.strategic_importance)], [t('cu.potential_value'), canCom ? (c.potential_value ? S.money(c.potential_value) : null) : UI.lockNote()], [t('cu.known_projects'), c.known_projects], [t('app.notes'), c.notes]]) }));
        g.appendChild(UI.card({ title: t('cu.summary'), body: UI.kv([[t('cu.stats_opps'), opps.length + ' (' + t('cu.stats_active') + ' ' + active.length + ')'], [t('cu.stats_won'), String(won.length)], [t('cu.stats_lost'), String(lost.length)], [t('cu.stats_contracts'), String(contracts.length)], [t('cu.tab_contacts'), String(contacts.length)], [t('cu.last_interaction'), last ? S.date(last) : null], [t('cu.next_action'), next ? S.date(next.date) : null]]) }));
        pane.appendChild(g);
      },
      contacts: function () {
        var card = UI.card({ title: t('cu.tab_contacts'), sub: contacts.length + ' ' + (S.lang === 'en' ? 'contacts' : 'جهة اتصال'), tight: true, actions: S.canRec('contacts.manage', null, [c]) ? h('button', { class: 'btn sm primary', type: 'button', on: { click: function () { F.contact(null, c.id).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('plus'), t('cu.add_contact')) : null,
          body: contacts.length ? UI.table({ columns: [
            { key: 'full_name', label: t('ct.full_name'), width: 2.2, get: function (k) { return h('span', null, h('span', { class: 'bold' }, k.full_name, k.is_primary ? ' ' : '', k.is_primary ? UI.chip('accent', t('ct.primary'), 'sm nodot') : null), h('span', { class: 'sub' }, (k.position || '') + (k.department ? ' · ' + k.department : ''))); } },
            { key: 'roles', label: t('ct.roles'), width: 1.8, get: function (k) { return h('span', { class: 'chips' }, (k.roles || []).map(function (r) { return UI.chip('slate', S.label('contact_roles', r), 'sm nodot'); })); } },
            { key: 'phone', label: t('ct.phone'), width: 1.2, get: function (k) { return k.phone ? h('span', { class: 'num' }, k.phone) : null; } },
            { key: 'email', label: t('ct.email'), width: 1.8, get: function (k) { return k.email ? h('span', { class: 'ltr' }, k.email) : null; } },
            { key: 'preferred_channel', label: t('ct.channel'), width: 1.1, get: function (k) { return S.label('contact_channels', k.preferred_channel) + ' · ' + S.label('languages', k.preferred_language); } },
            { key: 'last_contact_at', label: t('ct.last_contact'), width: 1.1, get: function (k) { return k.last_contact_at ? S.date(k.last_contact_at) : null; } },
            { key: 'next_follow_up', label: t('ct.next_followup'), width: 1.1, get: function (k) { if (!k.next_follow_up) return null; var d = U.daysUntil(k.next_follow_up); return h('span', { class: d < 0 ? 'danger-ink' : '' }, S.date(k.next_follow_up), d < 0 ? UI.chip('danger', t('app.overdue'), 'sm') : null); } },
            { key: 'status', label: t('app.status'), width: 1, get: function (k) { return h('span', { class: 'chips' }, k.active === false ? UI.chip('slate', t('ct.inactive'), 'sm') : UI.chip('ok', t('ct.active'), 'sm'), k.greeting_opt_out ? UI.chip('warn', t('cu.greeting_optout'), 'sm nodot') : null); } },
            { key: 'act', label: t('app.actions'), width: 1, get: function (k) { var w = h('span', { class: 'row-actions' }); if (S.canRec('contacts.manage', k, [c])) w.appendChild(h('button', { class: 'btn xs', type: 'button', on: { click: function () { F.contact(k).then(function (r) { if (r) root.APP.route(); }); } } }, t('app.edit'))); if (S.canRec('activities.manage', null, [c])) w.appendChild(h('button', { class: 'btn xs ghost', type: 'button', on: { click: function () { F.activity(null, { customer_id: c.id, contact_id: k.id }).then(function (r) { if (r) root.APP.route(); }); } } }, t('cu.log_activity'))); return w; } }
          ], rows: contacts }) : UI.empty(t('cu.no_contacts'), t('ct.no_sensitive')) });
        pane.appendChild(card);
      },
      opps: function () {
        var cols = [
          { key: 'name', label: t('app.opportunity'), width: 3, get: function (o) { return h('span', null, UI.recordLink('opportunity', o.id, MODEL.displayName('opportunity', o, S.lang)), h('span', { class: 'sub' }, o.id + (o.tender_ref ? ' · ' + o.tender_ref : '') + ' · ' + S.label('project_types', o.project_type))); } },
          { key: 'stage', label: t('app.stage'), width: 2, get: function (o) { return h('span', null, UI.stageChip(o.stage, 'sm'), h('span', { class: 'sub' }, MODEL.daysInStage(o) + ' ' + t('app.days'))); } },
          { key: 'value', label: t('app.value'), width: 1.3, num: true, get: function (o) { return o._masked ? UI.lockNote() : UI.money(o.estimated_value, true); } },
          { key: 'prob', label: t('op.probability'), width: .8, num: true, get: function (o) { return o._masked ? '—' : U.pct(o.probability); } },
          { key: 'owner', label: t('app.owner'), width: 1.3, get: function (o) { return S.userName(o.owner_id); } },
          { key: 'next', label: t('app.next_action'), width: 2, get: function (o) { return o.next_action ? h('span', null, o.next_action, h('span', { class: 'sub' }, o.next_action_due ? S.date(o.next_action_due) : '')) : h('span', { class: 'chip warn sm' }, t('app.no_next_action')); } },
          { key: 'prop', label: t('op.proposal_status'), width: 1.3, get: function (o) { var p = S.latestProposal(o.id); return p ? UI.lookupChip('proposal_statuses', p.status, 'sm') : h('span', { class: 'muted' }, t('op.no_proposal')); } }
        ];
        var groups = [[t('cu.stats_active'), active], [t('cu.stats_won'), won], [t('cu.stats_lost') + ' / ' + S.label('outcomes', 'on_hold') + ' / ' + S.label('outcomes', 'cancelled'), opps.filter(function (o) { return !STAGES.isActive(o.stage) && !STAGES.isWon(o.stage); })]];
        groups.forEach(function (g) { pane.appendChild(UI.card({ title: g[0], sub: g[1].length + ' ' + (S.lang === 'en' ? 'records' : 'سجل'), tight: true, body: UI.table({ columns: cols, rows: U.sortBy(g[1], 'updated_at', 'desc'), onRow: function (o) { location.hash = '#/opportunities/' + o.id; } }) })); pane.appendChild(h('div', { style: { height: '12px' } })); });
        if (c.known_projects || c.potential_value) pane.appendChild(UI.card({ title: t('cu.known_projects') + ' / ' + t('cu.potential'), body: UI.kv([[t('cu.known_projects'), c.known_projects], [t('cu.potential_value'), canCom ? (c.potential_value ? S.money(c.potential_value) : null) : UI.lockNote()]]) }));
      },
      projects: function () {
        pane.appendChild(UI.card({ title: t('cu.stats_contracts'), tight: true, body: UI.table({ columns: [
          { key: 'id', label: t('co.number'), width: 1.5, get: function (k) { return UI.recordLink('contract', k.id, k.id + (k.contract_ref ? ' · ' + k.contract_ref : '')); } },
          { key: 'opp', label: t('app.opportunity'), width: 2.5, get: function (k) { return S.oppName(k.opportunity_id); } },
          { key: 'status', label: t('app.status'), width: 1.2, get: function (k) { return UI.lookupChip('contract_statuses', k.status, 'sm'); } },
          { key: 'value', label: t('app.value'), width: 1.3, num: true, get: function (k) { return k._masked ? UI.lockNote() : UI.money(k.contract_value, true); } },
          { key: 'signed', label: t('co.signed_at'), width: 1.2, get: function (k) { return k.signed_at ? S.date(k.signed_at) : null; } },
          { key: 'ho', label: t('co.handover_status'), width: 1.3, get: function (k) { return UI.lookupChip('handover_statuses', k.handover_status, 'sm'); } }
        ], rows: contracts, onRow: function (k) { location.hash = '#/contracts/' + k.id; } }) }));
        pane.appendChild(h('div', { style: { height: '12px' } }));
        pane.appendChild(UI.card({ title: t('co.projects'), sub: t('co.integration_hint'), tight: true, body: UI.table({ columns: [
          { key: 'name', label: t('app.project'), width: 2.5, get: function (p) { return h('span', null, h('span', { class: 'bold' }, p.name), h('span', { class: 'sub' }, p.id + (p.delivery_ref ? ' · ' + p.delivery_ref : ''))); } },
          { key: 'status', label: t('app.status'), width: 1.2, get: function (p) { return UI.lookupChip('project_statuses', p.status, 'sm'); } },
          { key: 'start', label: t('co.start'), width: 1.2, get: function (p) { return p.start_date ? S.date(p.start_date) : null; } },
          { key: 'end', label: t('co.end'), width: 1.2, get: function (p) { return p.expected_end_date ? S.date(p.expected_end_date) : null; } },
          { key: 'value', label: t('app.value'), width: 1.2, num: true, get: function (p) { return p._masked ? UI.lockNote() : UI.money(p.value, true); } }
        ], rows: projects }) }));
      },
      timeline: function () { pane.appendChild(UI.card({ title: t('cu.tab_timeline'), body: UI.timeline(buildTimeline(c)) })); },
      docs: function () {
        var docs = S.list('documents').filter(function (d) { return d.entity_type === 'customer' && d.entity_id === c.id; });
        pane.appendChild(UI.card({ title: t('app.documents'), sub: t('app.documents_hint'), tight: true, actions: canEdit ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { F.document('customer', c.id).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('plus'), t('app.add_document')) : null,
          body: UI.table({ columns: [{ key: 'name', label: t('app.name'), width: 3 }, { key: 'doc_type', label: t('app.type'), width: 1.2 }, { key: 'storage_ref', label: 'DMS', width: 1.5, get: function (d) { return h('span', { class: 'ltr' }, d.storage_ref); } }, { key: 'classification', label: t('cu.confidentiality'), width: 1.2, get: function (d) { return S.label('confidentiality', d.classification); } }, { key: 'uploaded_at', label: t('app.date'), width: 1.5, get: function (d) { return S.dateTime(d.uploaded_at) + ' · ' + S.userName(d.uploaded_by); } }], rows: docs }) }));
      },
      relationship: function () {
        var greetings = S.activitiesOf({ customer_id: c.id }).filter(function (a) { return a.type === 'greeting' || a.type === 'visit'; });
        var camps = S.list('campaigns').filter(function (cm) { return (cm.recipients || []).some(function (r) { return r.customer_id === c.id && r.status === 'included'; }); });
        var g = h('div', { class: 'grid c2' });
        g.appendChild(UI.card({ title: t('cu.relationship'), body: UI.kv([[t('cu.owner'), UI.userCell(c.owner_id)], [t('cu.strength'), UI.lookupChip('relationship_strength', c.relationship_strength, 'sm')], [t('cu.importance'), S.label('importance', c.strategic_importance)], [t('cu.pref_lang'), S.label('languages', c.preferred_language)], [t('ct.greeting_optout'), contacts.filter(function (k) { return k.greeting_opt_out; }).length + ' / ' + contacts.length]]) }));
        g.appendChild(UI.card({ title: t('oc.campaigns'), tight: true, body: UI.list(camps, function (cm) { return h('div', null, h('span', { class: 'avatar accent' }, '✉'), h('div', { class: 'main' }, h('div', { class: 't' }, cm.title), h('div', { class: 's' }, root.OCCASIONS_CONFIG.label(cm.occasion_key, S.lang) + ' ' + cm.year + ' · ' + t('oc.status_' + (cm.status === 'pending_approval' ? 'pending' : cm.status)))), h('div', { class: 'end' }, (cm.sent_log || []).filter(function (s) { return (cm.recipients || []).some(function (r) { return r.contact_id === s.contact_id && r.customer_id === c.id; }); }).length ? UI.chip('ok', t('oc.sent_log'), 'sm') : null)); }, function (cm) { location.hash = '#/occasions/' + cm.id; }) }));
        g.appendChild(UI.card({ title: t('cu.tab_relationship'), sub: t('oc.not_sales'), tight: true, body: UI.list(U.sortBy(greetings, 'at', 'desc'), function (a) { return h('div', null, h('span', { class: 'avatar slate' }, S.label('activity_types', a.type).charAt(0)), h('div', { class: 'main' }, h('div', { class: 't' }, a.purpose || S.label('activity_types', a.type)), h('div', { class: 's' }, S.dateTime(a.at) + ' · ' + S.userName(a.owner_id)))); }) }));
        pane.appendChild(g);
      }
    };
    showTab(active_tab);
  }

  function buildTimeline(c) {
    var ev = [];
    S.oppsOf(c.id).forEach(function (o) {
      S.historyOf(o.id).forEach(function (hh) { ev.push({ date: hh.changed_at, kind: 'stage', title: MODEL.displayName('opportunity', o, S.lang) + ' → ' + S.stageLabel(hh.to_stage), sub: (hh.reason || '') + ' · ' + S.userName(hh.changed_by), href: '#/opportunities/' + o.id }); });
      S.proposalsOf(o.id).forEach(function (p) { if (p.submitted_at) ev.push({ date: p.submitted_at, kind: 'proposal', title: t('pr.submit') + ' ' + MODEL.proposalNumber(p), sub: S.label('submission_methods', p.submission_method) + ' · ' + S.oppName(o.id), href: '#/proposals/' + p.id }); else ev.push({ date: p.created_at, kind: 'proposal', title: t('app.proposal') + ' ' + MODEL.proposalNumber(p) + ' — ' + S.label('proposal_statuses', p.status), sub: S.oppName(o.id), href: '#/proposals/' + p.id }); });
    });
    S.live('contracts').filter(function (k) { return k.customer_id === c.id; }).forEach(function (k) { ev.push({ date: k.created_at, kind: 'contract', title: t('app.contract') + ' ' + k.id + ' — ' + S.label('contract_statuses', k.status), sub: k.signed_at ? t('co.signed_at') + ' ' + S.date(k.signed_at) : '', href: '#/contracts/' + k.id }); if (k.handover && k.handover.accepted_at) ev.push({ date: k.handover.accepted_at, kind: 'contract', title: t('co.handover') + ' — ' + t('co.handover_accept'), sub: S.userName(k.handover.accepted_by), href: '#/contracts/' + k.id }); });
    S.activitiesOf({ customer_id: c.id }).forEach(function (a) { var future = U.daysUntil(a.at) > 0; ev.push({ date: a.at, kind: a.type === 'greeting' ? 'greeting' : 'activity', future: future, title: S.label('activity_types', a.type) + (a.purpose ? ' — ' + a.purpose : ''), sub: (a.outcome || '') + (a.contact_id ? ' · ' + S.contactName(a.contact_id) : '') + ' · ' + S.userName(a.owner_id) + (a.status === 'planned' && ENGINE.activityDue(a).key === 'overdue' ? ' · ' + t('app.overdue') : ''), href: '#/activities?focus=' + a.id }); });
    ev.push({ date: c.created_at, kind: 'stage', title: t('cu.added'), sub: S.userName(c.created_by) + ' · ' + S.label('record_origins', c.origin || 'platform') });
    return U.sortBy(ev, 'date', 'desc').map(function (e) { e.date = S.dateTime(e.date) + (e.future ? ' · ' + t('app.upcoming') : ''); if (e.href) { var lnk = UI.link(e.href, e.title); e.title = lnk; } return e; });
  }

  root.VIEWS.customers = { render: function (main, r) { if (r.id) renderDetail(main, r.id, r.query); else renderList(main, r.query); }, buildTimeline: buildTimeline };
})(typeof window !== 'undefined' ? window : globalThis);
