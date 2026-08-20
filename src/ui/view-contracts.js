/* =====================================================================
   VIEW: العقود والتسليم — القائمة + صفحة العقد + حزمة التسليم
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, STAGES = root.STAGES, MODEL = root.MODEL, F = root.FORMS, SEARCH = root.SEARCH, PERMS = root.PERMS;
  root.VIEWS = root.VIEWS || {};
  var state = { filters: {}, shown: 50 };

  function columns() {
    return [
      { key: 'id', label: t('co.number'), width: 1.5, get: function (c) { return h('span', null, h('span', { class: 'lnk' }, c.id), h('span', { class: 'sub' }, c.contract_ref || '')); }, exportGet: function (c) { return c.id; } },
      { key: 'cust', label: t('app.customer'), width: 2.2, get: function (c) { return h('span', null, S.customerName(c.customer_id), h('span', { class: 'sub' }, S.oppName(c.opportunity_id))); }, exportGet: function (c) { return S.customerName(c.customer_id); } },
      { key: 'status', label: t('co.status'), width: 1.3, get: function (c) { return UI.lookupChip('contract_statuses', c.status, 'sm'); }, exportGet: function (c) { return S.label('contract_statuses', c.status); } },
      { key: 'value', label: t('co.value'), width: 1.3, num: true, get: function (c) { return c._masked ? UI.lockNote() : UI.money(c.contract_value, true); }, exportGet: function (c) { return c.contract_value; } },
      { key: 'signed', label: t('co.signed_at'), width: 1.1, get: function (c) { return c.signed_at ? S.date(c.signed_at) : null; }, exportGet: function (c) { return c.signed_at; } },
      { key: 'start', label: t('co.start'), width: 1.1, get: function (c) { return c.start_date ? S.date(c.start_date) : null; }, exportGet: function (c) { return c.start_date; } },
      { key: 'ho', label: t('co.handover_status'), width: 1.3, get: function (c) { return UI.lookupChip('handover_statuses', c.handover_status, 'sm'); }, exportGet: function (c) { return S.label('handover_statuses', c.handover_status); } },
      { key: 'rev', label: t('co.reviewer'), width: 1.2, get: function (c) { return c.reviewer_id ? S.userName(c.reviewer_id) : null; }, exportGet: function (c) { return S.userName(c.reviewer_id); } }
    ];
  }

  function renderList(main, query) {
    var f = state.filters; if (query) Object.keys(query).forEach(function (k) { f[k] = query[k]; });
    main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('co.title')), h('p', { class: 'sub' }, t('co.sub')))));
    var contracts = S.live('contracts');
    var awardedNoCtr = S.live('opportunities').filter(function (o) { return STAGES.isWon(o.stage) && !S.contractOf(o.id); });
    var review = contracts.filter(function (c) { return ['under_review', 'negotiation', 'approved'].indexOf(c.status) >= 0; }), signed = contracts.filter(function (c) { return ['signed', 'active', 'completed'].indexOf(c.status) >= 0; }), pendingHo = contracts.filter(function (c) { return ['signed', 'active'].indexOf(c.status) >= 0 && c.handover_status !== 'accepted'; });
    var kp = h('div', { class: 'kpis c5' });
    kp.appendChild(UI.kpi({ label: t('co.kpi_awarded'), value: String(awardedNoCtr.length), tone: awardedNoCtr.length ? 'warn' : '', onClick: function () { UI.drill(t('co.kpi_awarded'), [{ key: 'name', label: t('app.opportunity'), width: 3, get: function (o) { return h('span', null, MODEL.displayName('opportunity', o, S.lang), h('span', { class: 'sub' }, S.customerName(o.customer_id))); } }, { key: 'stage', label: t('app.stage'), width: 1.5, get: function (o) { return UI.stageChip(o.stage, 'sm'); } }, { key: 'v', label: t('app.value'), width: 1.2, num: true, get: function (o) { return o._masked ? UI.lockNote() : UI.money(o.estimated_value, true); } }], awardedNoCtr, { onRow: function (o) { location.hash = '#/opportunities/' + o.id; } }); } }));
    kp.appendChild(UI.kpi({ label: t('co.kpi_review'), value: String(review.length), onClick: function () { state.filters = { status: 'under_review' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('co.kpi_signed'), value: String(signed.length), tone: 'ok', onClick: function () { state.filters = { status: 'signed' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('co.kpi_pending_handover'), value: String(pendingHo.length), tone: pendingHo.length ? 'warn' : '', onClick: function () { state.filters = { handover: 'pending' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('co.kpi_value'), value: S.can('commercial.view') ? S.moneyShort(U.sum(signed.filter(function (c) { return !c._masked; }), 'contract_value')) : '—', info: t('ov.def.awarded_value') }));
    main.appendChild(kp);
    var bar = UI.filters({ values: f, items: [
      { key: 'q', type: 'search', placeholder: t('app.search') + ' — ' + t('co.number') + ' · ' + t('co.ref') + ' · ' + t('app.customer') },
      { key: 'status', type: 'select', label: t('co.status'), lookup: 'contract_statuses' },
      { key: 'handover', type: 'select', label: t('co.handover_status'), options: [{ value: 'pending', label: t('co.kpi_pending_handover') }].concat(L.handover_statuses.map(function (x) { return { value: x.key, label: S.lang === 'en' ? x.en : x.ar }; })) },
      { key: 'reviewer_id', type: 'select', label: t('co.reviewer'), options: S.live('users').filter(function (u) { return ['contract_reviewer', 'bd_manager', 'system_admin'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: S.userName(u.id) }; }) }
    ], onChange: function (v) { state.filters = v; renderBody(); } });
    main.appendChild(h('div', { style: { height: '12px' } })); main.appendChild(bar);
    var body = h('div'); main.appendChild(body);
    function renderBody() {
      D.clear(body);
      var ff = state.filters;
      var rows = contracts.filter(function (c) { if (ff.status && c.status !== ff.status) return false; if (ff.handover) { if (ff.handover === 'pending') { if (!(['signed', 'active'].indexOf(c.status) >= 0 && c.handover_status !== 'accepted')) return false; } else if (c.handover_status !== ff.handover) return false; } if (ff.reviewer_id && c.reviewer_id !== ff.reviewer_id) return false; return true; });
      if (ff.q) rows = SEARCH.filter(rows, ff.q, ['id', 'contract_ref', function (c) { return S.customerName(c.customer_id) + ' ' + S.oppName(c.opportunity_id); }]);
      rows = U.sortBy(rows, 'updated_at', 'desc');
      var head = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' } }, h('span', { class: 'count-note' }, t('app.showing', { shown: Math.min(rows.length, state.shown), total: rows.length })), h('span', { style: { flex: 1 } }), UI.exportButton({ module: 'contracts', rows: function () { return rows; }, columns: function () { return columns().map(function (c) { return { key: c.key, label: c.label, get: c.exportGet }; }); } }));
      body.appendChild(head);
      body.appendChild(UI.card({ tight: true, body: UI.table({ columns: columns(), rows: rows.slice(0, state.shown), onRow: function (c) { location.hash = '#/contracts/' + c.id; } }) }));
    }
    renderBody();
  }

  /* ---------- صفحة العقد ---------- */
  function renderDetail(main, id, query) {
    var c = S.get('contract', id);
    if (!c) { main.appendChild(UI.empty(t('app.no_results'), id)); return; }
    var opp = S.get('opportunity', c.opportunity_id), cust = S.get('customer', c.customer_id), prop = c.proposal_id ? S.get('proposal', c.proposal_id) : null, project = S.live('projects').find(function (p) { return p.contract_id === c.id; });
    var canManage = S.canRec('contracts.manage', c, S.parentsOf(c)), canHo = S.canRec('handover.manage', c, S.parentsOf(c)), canCom = !c._masked;
    var pendingAp = S.pendingApprovalsFor('contract', c.id);
    main.appendChild(h('div', { class: 'crumbs' }, UI.link('#/contracts', t('nav.contracts')), h('span', { class: 'sep' }, '/'), cust ? UI.link('#/customers/' + cust.id, S.customerName(cust.id)) : null, h('span', { class: 'sep' }, '/'), h('span', null, c.id)));
    var head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('app.contract') + ' ' + c.id, ' ', UI.lookupChip('contract_statuses', c.status), ' ', UI.lookupChip('handover_statuses', c.handover_status, 'sm'), ' ', UI.originChip(c)), h('p', { class: 'sub' }, (c.contract_ref ? t('co.ref') + ' ' + c.contract_ref + ' · ' : '') + S.customerName(c.customer_id) + ' · ' + S.oppName(c.opportunity_id))));
    var acts = h('div', { class: 'actions' });
    if (canManage) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.contract(c).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('edit'), t('app.edit')));
    if (canManage && ['under_review', 'negotiation', 'approved'].indexOf(c.status) >= 0) acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { signFlow(c); } } }, t('co.mark_signed')));
    if (canHo && ['signed', 'active'].indexOf(c.status) >= 0 && c.handover_status !== 'accepted') acts.appendChild(h('button', { class: 'btn accent', type: 'button', on: { click: function () { handoverFlow(c); } } }, c.handover_status === 'prepared' ? t('co.handover_accept') : t('co.handover_prepare')));
    if (c.handover && c.handover_status !== 'not_started') acts.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: function () { window.print(); } } }, UI.icon('print'), t('co.handover_print')));
    head.appendChild(acts); main.appendChild(head);
    if (pendingAp.length) main.appendChild(UI.warnBox(t('app.needs_approval_by', { roles: PERMS.approverRoles('contract_confirm').map(S.roleLabel).join('/') }) + ' — ' + t('co.confirm_stage')));

    var kp = h('div', { class: 'kpis c5', style: { marginBottom: '14px' } });
    kp.appendChild(UI.kpi({ label: t('co.value'), value: canCom ? S.moneyShort(c.contract_value) : '—', sub: canCom && c.contract_value !== null ? t('pr.vat') + ' ' + S.moneyShort(MODEL.vatOf(c.contract_value, c.vat_treatment)) : '' }));
    kp.appendChild(UI.kpi({ label: t('co.signed_at'), value: c.signed_at ? S.date(c.signed_at) : '—', sub: c.signed_at ? S.hijri(c.signed_at) : t('co.is_signed') + ' ' + t('app.no') }));
    kp.appendChild(UI.kpi({ label: t('co.start'), value: c.start_date ? S.date(c.start_date) : '—', sub: c.duration_months ? c.duration_months + ' ' + (S.lang === 'en' ? 'months' : 'شهر') + (c.end_date ? ' → ' + S.date(c.end_date) : '') : '' }));
    kp.appendChild(UI.kpi({ label: t('co.handover_status'), value: S.label('handover_statuses', c.handover_status), tone: c.handover_status === 'accepted' ? 'ok' : (c.status === 'signed' || c.status === 'active' ? 'warn' : ''), onClick: function () { showTab('handover'); } }));
    kp.appendChild(UI.kpi({ label: t('co.project'), value: project ? project.name : '—', sub: project ? (project.delivery_ref || '') + ' · ' + S.label('project_statuses', project.status) : t('co.integration_hint') }));
    main.appendChild(kp);
    var tabsDef = [{ key: 'contract', label: t('co.tab_contract') }, { key: 'handover', label: t('co.tab_handover') }, { key: 'history', label: t('co.tab_history') }, { key: 'docs', label: t('app.documents') }];
    var activeTab = (query && query.tab) || 'contract';
    var pane = h('div');
    var tabBar = UI.tabs({ tabs: tabsDef, active: activeTab, onChange: showTab });
    main.appendChild(tabBar); main.appendChild(pane);
    function showTab(k) { D.qsa('button', tabBar).forEach(function (b, i) { b.setAttribute('aria-selected', tabsDef[i].key === k ? 'true' : 'false'); }); D.clear(pane); tabs[k](); }
    var tabs = {
      contract: function () {
        var g = h('div', { class: 'grid c2' });
        g.appendChild(UI.card({ title: t('co.tab_contract'), body: UI.kv([[t('co.number'), c.id], [t('co.ref'), c.contract_ref], [t('co.status'), UI.lookupChip('contract_statuses', c.status, 'sm')], [t('co.reviewer'), c.reviewer_id ? UI.userCell(c.reviewer_id) : null], [t('app.customer'), UI.recordLink('customer', c.customer_id, S.customerName(c.customer_id))], [t('app.opportunity'), UI.recordLink('opportunity', c.opportunity_id, S.oppName(c.opportunity_id))], [t('app.proposal'), prop ? UI.recordLink('proposal', prop.id, MODEL.proposalNumber(prop)) : null], [t('co.signed_at'), c.signed_at ? S.date(c.signed_at) : null], [t('co.start'), c.start_date ? S.date(c.start_date) : null], [t('co.duration'), c.duration_months], [t('co.end'), c.end_date ? S.date(c.end_date) : null], [t('co.delivery_ref'), c.delivery_ref], [t('co.review_notes'), c.review_notes]]) }));
        g.appendChild(UI.card({ title: t('op.commercial'), body: canCom ? UI.kv([[t('co.value'), S.money(c.contract_value)], [t('pr.vat'), S.money(MODEL.vatOf(c.contract_value, c.vat_treatment)) + ' (' + S.label('vat_treatments', c.vat_treatment) + ')'], [t('pr.total'), S.money((U.num(c.contract_value) || 0) + (MODEL.vatOf(c.contract_value, c.vat_treatment) || 0))], [t('co.payment_terms'), S.label('payment_terms', c.payment_terms)], [t('co.retention'), U.pct(c.retention_pct)], [t('co.warranty'), c.warranty_months], [t('co.perf_bond'), U.pct(c.performance_bond_pct)], [t('co.advance'), U.pct(c.advance_payment_pct)]]) : h('div', null, UI.lockNote()) }));
        g.appendChild(UI.card({ title: t('co.commitments') + ' · ' + t('co.exclusions') + ' · ' + t('co.risks'), body: UI.kv([[t('co.commitments'), c.key_commitments], [t('co.exclusions'), c.exclusions], [t('co.risks'), c.key_risks]]) }));
        var apps = S.list('approvals').filter(function (a) { return a.entity_type === 'contract' && a.entity_id === c.id; });
        g.appendChild(UI.card({ title: t('ad.tab_approvals'), tight: true, body: UI.table({ columns: [{ key: 'type', label: t('ad.approval_type'), width: 1.5, get: function (a) { return S.label('approval_types', a.type); } }, { key: 'status', label: t('app.status'), width: 1, get: function (a) { return UI.lookupChip('approval_statuses', a.status, 'sm'); } }, { key: 'by', label: t('ad.approval_requested_by'), width: 1.3, get: function (a) { return S.userName(a.requested_by) + ' · ' + S.date(a.requested_at); } }, { key: 'dec', label: t('ad.approval_decide'), width: 1.5, get: function (a) { if (a.status !== 'pending') return a.decided_by ? S.userName(a.decided_by) + (a.reason ? ' · ' + a.reason : '') : null; if (!PERMS.canDecide(S.user, a.type) || a.requested_by === S.user.id) return h('span', { class: 'muted small' }, t('app.in_review')); return h('span', { class: 'row-actions' }, h('button', { class: 'btn xs primary', type: 'button', on: { click: function () { S.adapter.decideApproval(a.id, 'approved', '').then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('ad.approval_approve')), h('button', { class: 'btn xs danger', type: 'button', on: { click: function () { UI.formModal({ title: t('ad.approval_reject'), size: 'sm', cols: 1, fields: [{ key: 'reason', label: t('ad.approval_reason'), type: 'textarea', required: true }], values: {}, onSubmit: function (v) { return S.adapter.decideApproval(a.id, 'rejected', v.reason).then(function () { return root.APP.rerender(); }); } }); } } }, t('ad.approval_reject'))); } }], rows: apps }) }));
        pane.appendChild(g);
      },
      handover: function () {
        var ho = c.handover;
        if (!ho) { pane.appendChild(UI.empty(t('co.handover'), ['signed', 'active'].indexOf(c.status) >= 0 ? (canHo ? t('co.handover_prepare') : '') : (S.lang === 'en' ? 'Available after the contract is signed.' : 'تتاح بعد توقيع العقد.'), canHo && ['signed', 'active'].indexOf(c.status) >= 0 ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { handoverFlow(c); } } }, t('co.handover_prepare')) : null)); return; }
        var contacts = S.contactsOf(c.customer_id);
        var pkg = h('div', { class: 'card', id: 'handover-pkg' },
          h('div', { class: 'card-h' }, h('h3', null, t('co.handover') + ' — ' + c.id, h('span', { class: 'sub' }, S.customerName(c.customer_id) + ' · ' + S.oppName(c.opportunity_id))), h('div', { class: 'act' }, UI.lookupChip('handover_statuses', c.handover_status))),
          h('div', { class: 'card-b' },
            h('div', { class: 'grid c2' },
              UI.card({ title: t('co.handover_summary'), body: UI.kv([[t('app.customer'), S.customerName(c.customer_id)], [t('app.project'), opp ? (opp.project_name || opp.name) : ''], [t('op.location'), opp ? S.regionLabel(opp.region) + (opp.city ? ' / ' + S.cityLabel(opp.region, opp.city) : '') : ''], [t('op.project_type'), opp ? S.label('project_types', opp.project_type) : ''], [t('co.handover_scope'), ho.final_scope || ho.summary || (opp ? opp.description : '')], [t('co.ref'), c.contract_ref], [t('app.proposal'), prop ? MODEL.proposalNumber(prop) : null]]) }),
              UI.card({ title: t('co.handover_contacts'), tight: true, body: UI.list((ho.key_contacts && ho.key_contacts.length ? contacts.filter(function (k) { return ho.key_contacts.indexOf(k.id) >= 0; }) : contacts.filter(function (k) { return k.is_primary || (k.roles || []).indexOf('decision_maker') >= 0 || (k.roles || []).indexOf('technical') >= 0; })).slice(0, 6), function (k) { return h('div', null, h('span', { class: 'avatar' }, U.initials(k.full_name)), h('div', { class: 'main' }, h('div', { class: 't' }, k.full_name), h('div', { class: 's' }, (k.position || '') + ' · ' + (k.phone || '') + ' · ' + (k.email || '')))); }) }),
              UI.card({ title: t('op.commercial'), body: canCom ? UI.kv([[t('co.value'), S.money(c.contract_value)], [t('co.payment_terms'), S.label('payment_terms', c.payment_terms)], [t('co.retention'), U.pct(c.retention_pct)], [t('co.advance'), U.pct(c.advance_payment_pct)], [t('co.perf_bond'), U.pct(c.performance_bond_pct)], [t('co.warranty'), c.warranty_months], [S.lang === 'en' ? 'Guarantees' : 'الضمانات المطلوبة', ho.guarantees], [t('co.start'), c.start_date ? S.date(c.start_date) : null], [t('co.end'), c.end_date ? S.date(c.end_date) : null]]) : h('div', null, UI.lockNote()) }),
              UI.card({ title: t('co.commitments'), body: UI.kv([[t('co.commitments'), ho.commitments || c.key_commitments], [t('co.exclusions'), ho.exclusions || c.exclusions], [t('co.risks'), ho.key_risks || c.key_risks], [t('co.handover_lessons'), ho.lessons]]) }),
              UI.card({ title: t('co.handover_outstanding'), body: (ho.outstanding_actions || []).length ? h('ul', { style: { margin: 0, paddingInlineStart: '18px' } }, (ho.outstanding_actions || []).map(function (a) { return h('li', null, a); })) : h('p', { class: 'muted' }, '—') }),
              UI.card({ title: t('app.status'), body: UI.kv([[t('co.handover_prepared_by'), ho.prepared_by ? S.userName(ho.prepared_by) + ' · ' + S.dateTime(ho.prepared_at) : null], [t('co.handover_accepted_by'), ho.accepted_by ? S.userName(ho.accepted_by) + ' · ' + S.dateTime(ho.accepted_at) : h('span', { class: 'muted' }, S.lang === 'en' ? 'Not yet accepted' : 'لم يُستلم بعد')], [t('co.delivery_ref'), c.delivery_ref], [t('app.notes'), ho.acceptance_note]]) }))));
        pane.appendChild(pkg);
      },
      history: function () {
        var tl = root.VIEWS.customers.buildTimeline(cust || { id: c.customer_id, created_at: c.created_at }).filter(function (e) { return true; });
        pane.appendChild(UI.card({ title: t('co.tab_history'), body: UI.timeline(tl) }));
      },
      docs: function () {
        var docs = S.list('documents').filter(function (d) { return d.entity_type === 'contract' && d.entity_id === c.id; });
        pane.appendChild(UI.card({ title: t('app.documents'), sub: t('app.documents_hint'), tight: true, actions: canManage ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { F.document('contract', c.id).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('plus'), t('app.add_document')) : null, body: UI.table({ columns: [{ key: 'name', label: t('app.name'), width: 3 }, { key: 'doc_type', label: t('app.type'), width: 1.2 }, { key: 'storage_ref', label: 'DMS', width: 1.5 }, { key: 'classification', label: t('cu.confidentiality'), width: 1.2, get: function (d) { return S.label('confidentiality', d.classification); } }, { key: 'uploaded_at', label: t('app.date'), width: 1.5, get: function (d) { return S.dateTime(d.uploaded_at); } }], rows: docs }) }));
      }
    };
    showTab(activeTab);

    function signFlow(c) {
      UI.formModal({ title: t('co.mark_signed'), sub: c.id, size: 'sm', cols: 1, intro: PERMS.needsApproval(S.user, 'contract_confirm', {}) && c.status !== 'approved' && !PERMS.canDecide(S.user, 'contract_confirm') ? UI.infoBox(t('app.approval_required')) : null, fields: [{ key: 'signed_at', label: t('co.signed_at'), type: 'date', required: true }, { key: 'contract_ref', label: t('co.ref'), type: 'text', dir: 'ltr' }, { key: 'contract_value', label: t('co.value'), type: 'money', sensitive: true, locked: !canCom }, { key: 'start_date', label: t('co.start'), type: 'date' }], values: { signed_at: U.today(), contract_ref: c.contract_ref, contract_value: c.contract_value, start_date: c.start_date }, saveLabel: t('co.mark_signed'),
        onSubmit: function (v) { v.version = c.version; return S.adapter.markSigned(c.id, v).then(function (r) { return root.APP.rerender().then(function () { if (r.approval_required) UI.toast(t('app.approval_sent'), 'warn', 6000); }); }); } });
    }
    function handoverFlow(c) {
      var contacts = S.contactsOf(c.customer_id);
      if (c.handover_status === 'prepared') {
        UI.formModal({ title: t('co.handover_accept'), sub: c.id, size: 'sm', cols: 1, intro: UI.infoBox(t('co.handover_accept_confirm')), fields: [{ key: 'delivery_ref', label: t('co.delivery_ref'), type: 'text', dir: 'ltr', hint: t('co.integration_hint') }, { key: 'note', label: t('app.notes'), type: 'textarea' }], values: { delivery_ref: c.delivery_ref || '' }, saveLabel: t('co.handover_accept'), onSubmit: function (v) { return S.adapter.acceptHandover(c.id, v).then(function () { return root.APP.rerender(); }); } });
        return;
      }
      var ho = c.handover || {};
      UI.formModal({ title: t('co.handover_prepare'), sub: c.id + ' · ' + S.customerName(c.customer_id), size: 'lg', fields: [
        { key: 'summary', label: t('co.handover_summary'), type: 'textarea', span2: true },
        { key: 'final_scope', label: t('co.handover_scope'), type: 'textarea', span2: true, required: true },
        { key: 'key_contacts', label: t('co.handover_contacts'), type: 'multiselect', options: contacts.map(function (k) { return { value: k.id, label: k.full_name + (k.position ? ' — ' + k.position : '') }; }), span2: true },
        { key: 'commitments', label: t('co.commitments'), type: 'textarea' },
        { key: 'exclusions', label: t('co.exclusions'), type: 'textarea' },
        { key: 'guarantees', label: S.lang === 'en' ? 'Required guarantees' : 'الضمانات المطلوبة', type: 'textarea' },
        { key: 'key_risks', label: t('co.risks'), type: 'textarea' },
        { key: 'outstanding', label: t('co.handover_outstanding'), type: 'textarea', hint: S.lang === 'en' ? 'One action per line' : 'أدرج إجراءً واحدًا في كل سطر', span2: true },
        { key: 'lessons', label: t('co.handover_lessons'), type: 'textarea', span2: true }
      ], values: { summary: ho.summary || (opp ? opp.description : ''), final_scope: ho.final_scope || '', key_contacts: ho.key_contacts || contacts.filter(function (k) { return k.is_primary; }).map(function (k) { return k.id; }), commitments: ho.commitments || c.key_commitments || '', exclusions: ho.exclusions || c.exclusions || '', guarantees: ho.guarantees || (S.lang === 'en' ? 'Performance bond ' + U.pct(c.performance_bond_pct) : 'ضمان حسن التنفيذ ' + U.pct(c.performance_bond_pct)), key_risks: ho.key_risks || c.key_risks || '', outstanding: (ho.outstanding_actions || []).join('\n'), lessons: ho.lessons || '' }, saveLabel: t('co.handover_prepare'),
        onSubmit: function (v) { v.outstanding_actions = String(v.outstanding || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); delete v.outstanding; return S.adapter.prepareHandover(c.id, v).then(function () { return root.APP.rerender(); }); } });
    }
  }

  root.VIEWS.contracts = { render: function (main, r) { if (r.id) renderDetail(main, r.id, r.query); else renderList(main, r.query); } };
})(typeof window !== 'undefined' ? window : globalThis);
