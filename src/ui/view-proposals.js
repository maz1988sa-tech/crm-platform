/* =====================================================================
   VIEW: العروض — مساحة عمل تركّز على المواعيد + صفحة العرض ونسخه
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, MODEL = root.MODEL, F = root.FORMS, SEARCH = root.SEARCH, PERMS = root.PERMS, RULES = root.RULES;
  root.VIEWS = root.VIEWS || {};
  var state = { filters: {}, sort: { key: 'deadline', dir: 'asc' }, shown: 50 };

  function latestOnly(list) { var m = {}; list.forEach(function (p) { if (!m[p.id] || m[p.id].version_no < p.version_no) m[p.id] = p; }); return Object.keys(m).map(function (k) { return m[k]; }); }
  function filtered(f) {
    var out = latestOnly(S.live('proposals')).filter(function (p) {
      if (f.status && p.status !== f.status) return false;
      if (f.group && (L.find('proposal_statuses', p.status) || {}).group !== f.group) return false;
      if (f.owner_id && p.owner_id !== f.owner_id && (p.reviewer_ids || []).indexOf(f.owner_id) < 0) return false;
      if (f.deadline) { var d = ENGINE.proposalDeadline(p); if (f.deadline === 'overdue' && d.key !== 'overdue') return false; if (f.deadline === 'week' && ['critical', 'soon', 'week'].indexOf(d.key) < 0) return false; if (f.deadline === 'action' && !ENGINE.proposalNeedsAction(p)) return false; }
      return true;
    });
    if (f.q) out = SEARCH.filter(out, f.q, ['id', function (p) { return S.oppName(p.opportunity_id); }, function (p) { var o = S.get('opportunity', p.opportunity_id); return o ? S.customerName(o.customer_id) + ' ' + (o.tender_ref || '') : ''; }]);
    return out;
  }
  function deadlineCell(p) { var d = ENGINE.proposalDeadline(p); if (!p.submission_deadline) return h('span', { class: 'chip warn sm' }, t('pr.deadline') + ' —'); var tone = { overdue: 'danger', critical: 'danger', soon: 'warn', week: 'warn', ok: 'slate', done: 'ok' }[d.key] || 'slate'; var txt = d.key === 'done' ? (S.lang === 'en' ? 'Submitted' : 'تم التقديم') : (d.key === 'overdue' ? t('pr.overdue') + ' ' + d.days + ' ' + t('app.day_short') : t('pr.due_in', { n: d.days })); return h('span', null, S.date(p.submission_deadline), h('span', { class: 'sub' }, UI.chip(tone, txt, 'sm'))); }
  function columns() {
    return [
      { key: 'id', label: t('pr.number'), width: 1.7, sortable: true, get: function (p) { return h('span', null, h('span', { class: 'lnk' }, MODEL.proposalNumber(p)), h('span', { class: 'sub' }, p.version_no > 1 ? (S.lang === 'en' ? 'v' + p.version_no : 'نسخة ' + p.version_no) : '')); }, exportGet: function (p) { return MODEL.proposalNumber(p); } },
      { key: 'opp', label: t('app.opportunity'), width: 2.6, get: function (p) { var o = S.get('opportunity', p.opportunity_id); return h('span', null, S.oppName(p.opportunity_id), h('span', { class: 'sub' }, o ? S.customerName(o.customer_id) + (o.tender_ref ? ' · ' + o.tender_ref : '') : '')); }, exportGet: function (p) { return S.oppName(p.opportunity_id); } },
      { key: 'status', label: t('pr.status'), width: 1.5, sortable: true, get: function (p) { return UI.lookupChip('proposal_statuses', p.status, 'sm'); }, exportGet: function (p) { return S.label('proposal_statuses', p.status); } },
      { key: 'tech', label: t('pr.tech_status'), width: 1.1, get: function (p) { return UI.lookupChip('doc_statuses', p.technical_status, 'sm'); }, exportGet: function (p) { return S.label('doc_statuses', p.technical_status); } },
      { key: 'comm', label: t('pr.comm_status'), width: 1.1, get: function (p) { return UI.lookupChip('doc_statuses', p.commercial_status, 'sm'); }, exportGet: function (p) { return S.label('doc_statuses', p.commercial_status); } },
      { key: 'approval', label: t('pr.approval'), width: 1.1, get: function (p) { var m = { not_required: ['slate', S.lang === 'en' ? 'Not required' : 'غير مطلوب'], pending: ['warn', t('app.in_review')], approved: ['ok', S.lang === 'en' ? 'Approved' : 'معتمد'], rejected: ['danger', S.lang === 'en' ? 'Rejected' : 'مرفوض'] }[p.approval_status] || ['slate', p.approval_status]; return UI.chip(m[0], m[1], 'sm'); }, exportGet: function (p) { return p.approval_status; } },
      { key: 'deadline', label: t('pr.deadline'), width: 1.4, sortable: true, get: deadlineCell, exportGet: function (p) { return p.submission_deadline; } },
      { key: 'owner', label: t('pr.owner'), width: 1.3, get: function (p) { return UI.userCell(p.owner_id); }, exportGet: function (p) { return S.userName(p.owner_id); } },
      { key: 'value', label: t('pr.value'), width: 1.2, num: true, sortable: true, get: function (p) { return p._masked ? UI.lockNote() : UI.money(p.proposed_value, true); }, exportGet: function (p) { return p.proposed_value; } }
    ];
  }

  function renderList(main, query) {
    var f = state.filters; if (query) Object.keys(query).forEach(function (k) { f[k] = query[k]; });
    main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('pr.title')), h('p', { class: 'sub' }, t('pr.sub'))), h('div', { class: 'actions' }, UI.savedViews('proposals', function () { return state.filters; }, function (flt) { state.filters = Object.assign({}, flt); root.APP.route(); }), S.can('proposals.manage') ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.proposal(null, null).then(function (r) { if (r) location.hash = '#/proposals/' + r.id; }); } } }, UI.icon('plus'), t('pr.new')) : null)));
    var all = latestOnly(S.live('proposals'));
    var overdue = all.filter(function (p) { return ENGINE.proposalDeadline(p).key === 'overdue'; }), week = all.filter(function (p) { return ['critical', 'soon', 'week'].indexOf(ENGINE.proposalDeadline(p).key) >= 0; }), prep = all.filter(function (p) { return ['in_preparation', 'technical_review', 'commercial_review', 'awaiting_info', 'not_started'].indexOf(p.status) >= 0; }), appr = all.filter(function (p) { return p.status === 'awaiting_approval'; }), sub = all.filter(function (p) { return p.status === 'submitted'; });
    var ta = root.REPORTS.proposalTurnaround(S.db, U.periodRange('this_year'));
    var kp = h('div', { class: 'kpis' });
    kp.appendChild(UI.kpi({ label: t('pr.kpi_overdue'), value: String(overdue.length), tone: overdue.length ? 'danger' : '', onClick: function () { state.filters = { deadline: 'overdue' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('pr.kpi_due_week'), value: String(week.length), tone: week.length ? 'warn' : '', onClick: function () { state.filters = { deadline: 'week' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('pr.kpi_in_prep'), value: String(prep.length), onClick: function () { state.filters = { group: 'prep' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('pr.kpi_awaiting_approval'), value: String(appr.length), tone: appr.length ? 'warn' : '', onClick: function () { state.filters = { status: 'awaiting_approval' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('pr.kpi_submitted'), value: String(sub.length), tone: 'ok', onClick: function () { state.filters = { status: 'submitted' }; root.APP.route(); } }));
    kp.appendChild(UI.kpi({ label: t('pr.kpi_turnaround'), value: ta.avg === null ? '—' : String(ta.avg), sub: ta.count + ' ' + (S.lang === 'en' ? 'submitted this year' : 'مُقدَّم هذه السنة') + (ta.on_time_rate !== null ? ' · ' + (S.lang === 'en' ? 'on time ' : 'في الموعد ') + U.pct(ta.on_time_rate) : ''), info: t('rp.def.turnaround') }));
    main.appendChild(kp);
    var users = S.live('users').filter(function (u) { return ['proposal_manager', 'bd_employee', 'bd_manager', 'commercial_reviewer', 'system_admin'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: S.userName(u.id) }; });
    var bar = UI.filters({ values: f, items: [
      { key: 'q', type: 'search', placeholder: t('app.search') + ' — ' + t('pr.number') + ' / ' + t('app.opportunity') + ' / ' + t('app.customer') },
      { key: 'status', type: 'select', label: t('pr.filter_status'), lookup: 'proposal_statuses' },
      { key: 'owner_id', type: 'select', label: t('pr.filter_owner'), options: users },
      { key: 'deadline', type: 'select', label: t('pr.filter_deadline'), options: [{ value: 'overdue', label: t('pr.overdue') }, { value: 'week', label: t('pr.kpi_due_week') }, { value: 'action', label: t('pr.needs_action') }] }
    ], onChange: function (v) { state.filters = v; renderBody(); } });
    main.appendChild(h('div', { style: { height: '12px' } })); main.appendChild(bar);
    var body = h('div'); main.appendChild(body);
    function renderBody() {
      D.clear(body);
      var rows = filtered(state.filters);
      var sortFn = { deadline: function (p) { return p.submission_deadline || '9999'; }, id: 'id', status: function (p) { return L.proposal_statuses.map(function (x) { return x.key; }).indexOf(p.status); }, value: 'proposed_value' }[state.sort.key] || state.sort.key;
      rows = U.sortBy(rows, sortFn, state.sort.dir);
      var page = rows.slice(0, state.shown);
      var head = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' } }, h('span', { class: 'count-note' }, t('app.showing', { shown: page.length, total: rows.length })), h('span', { style: { flex: 1 } }), UI.exportButton({ module: 'proposals', rows: function () { return rows; }, columns: function () { return columns().map(function (c) { return { key: c.key, label: c.label, get: c.exportGet || (c.get ? function (r) { var v = c.get(r); return v && v.textContent !== undefined ? v.textContent : v; } : null) }; }); } }));
      body.appendChild(head);
      var card = UI.card({ tight: true, body: UI.table({ columns: columns(), rows: page, sort: state.sort, onSort: function (k, d) { state.sort = { key: k, dir: d }; renderBody(); }, onRow: function (p) { location.hash = '#/proposals/' + p.id; } }) });
      card.appendChild(UI.pager(rows.length, page.length, function () { state.shown += 50; renderBody(); }));
      body.appendChild(card);
    }
    renderBody();
  }

  /* ---------- صفحة العرض ---------- */
  function renderDetail(main, id, query) {
    var versions = U.sortBy(S.list('proposals').filter(function (p) { return p.id === id && !p.archived_at; }), 'version_no', 'desc');
    if (!versions.length) { main.appendChild(UI.empty(t('app.no_results'), id)); return; }
    var vno = query && query.v ? Number(query.v) : versions[0].version_no;
    var p = versions.find(function (x) { return x.version_no === vno; }) || versions[0];
    var isLatest = p.version_no === versions[0].version_no;
    var opp = S.get('opportunity', p.opportunity_id), cust = opp ? S.get('customer', opp.customer_id) : null;
    var canManage = S.canRec('proposals.manage', p, S.parentsOf(p)), canSubmit = S.canRec('proposals.submit', p, S.parentsOf(p)) || canManage, canCom = !p._masked;
    var dl = ENGINE.proposalDeadline(p), pendingApprovals = S.pendingApprovalsFor('proposal', p.id).filter(function (a) { return (a.payload || {}).version_no === p.version_no; });
    main.appendChild(h('div', { class: 'crumbs' }, UI.link('#/proposals', t('nav.proposals')), h('span', { class: 'sep' }, '/'), opp ? UI.link('#/opportunities/' + opp.id, S.oppName(opp.id)) : null, h('span', { class: 'sep' }, '/'), h('span', null, MODEL.proposalNumber(p))));
    var head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('app.proposal') + ' ' + MODEL.proposalNumber(p), ' ', UI.lookupChip('proposal_statuses', p.status), ' ', UI.originChip(p)), h('p', { class: 'sub' }, (opp ? S.oppName(opp.id) + ' · ' + S.customerName(opp.customer_id) : '') + ' · ' + t('pr.owner') + ': ' + S.userName(p.owner_id))));
    var acts = h('div', { class: 'actions' });
    var editableStatuses = ['not_started', 'awaiting_info', 'in_preparation', 'technical_review', 'commercial_review', 'ready', 'revision_requested'];
    if (canManage && isLatest && editableStatuses.indexOf(p.status) >= 0) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.proposal(p).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('edit'), t('app.edit')));
    if (canManage && isLatest && ['submitted', 'revision_requested', 'rejected', 'expired', 'revised'].indexOf(p.status) >= 0 && opp && !root.STAGES.isTerminal(opp.stage)) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { S.adapter.newProposalVersion(p.id).then(function (nv) { return root.APP.refresh().then(function () { location.hash = '#/proposals/' + nv.id + '?v=' + nv.version_no; root.APP.route(); }); }).catch(UI.errorToast); } } }, UI.icon('plus'), t('pr.new_version')));
    if (canManage && isLatest && ['in_preparation', 'technical_review', 'commercial_review', 'ready', 'revision_requested', 'not_started', 'awaiting_info'].indexOf(p.status) >= 0 && p.approval_status !== 'approved') acts.appendChild(h('button', { class: 'btn accent', type: 'button', on: { click: function () { S.adapter.requestProposalApproval(p.id, p.version_no).then(function (r) { return root.APP.rerender().then(function () { UI.toast(r.approvals.length ? t('app.approval_sent') : t('app.saved'), 'ok'); }); }).catch(UI.errorToast); } } }, t('pr.request_approval')));
    if (canSubmit && isLatest && ['ready', 'revision_requested', 'in_preparation', 'technical_review', 'commercial_review', 'awaiting_approval'].indexOf(p.status) >= 0) acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { submitFlow(p); } } }, t('pr.submit')));
    head.appendChild(acts); main.appendChild(head);
    if (!isLatest) main.appendChild(UI.infoBox((S.lang === 'en' ? 'You are viewing an older version. Latest: ' : 'تعرض نسخة قديمة. الأحدث: ') + 'v' + versions[0].version_no));
    if (pendingApprovals.length) main.appendChild(UI.warnBox(t('app.needs_approval_by', { roles: U.uniq(pendingApprovals.map(function (a) { return PERMS.approverRoles(a.type).map(S.roleLabel).join('/') + ' (' + S.label('approval_types', a.type) + ')'; })).join('، ') })));
    var hv = RULES.approvals.proposal_high_value.enabled && canCom && (U.num(p.proposed_value) || 0) >= RULES.approvals.proposal_high_value.threshold;
    var disc = RULES.approvals.discount.enabled && canCom && (U.num(p.discount_pct) || 0) > RULES.approvals.discount.threshold_pct;
    if (hv || disc) main.appendChild(h('div', { class: 'chips', style: { marginBottom: '10px' } }, hv ? UI.chip('warn', t('pr.high_value_note'), 'sm') : null, disc ? UI.chip('warn', t('pr.discount_note'), 'sm') : null));

    var kp = h('div', { class: 'kpis', style: { marginBottom: '14px' } });
    kp.appendChild(UI.kpi({ label: t('pr.deadline'), value: p.submission_deadline ? S.date(p.submission_deadline) : '—', sub: p.submission_deadline ? (dl.key === 'overdue' ? t('pr.overdue') + ' ' + dl.days + ' ' + t('app.day_short') : (dl.key === 'done' ? (S.lang === 'en' ? 'Submitted' : 'تم التقديم') : t('pr.due_in', { n: dl.days }))) + (S.hijri(p.submission_deadline) ? ' · ' + S.hijri(p.submission_deadline) : '') : t('pr.deadline') + ' —', tone: dl.key === 'overdue' || dl.key === 'critical' ? 'danger' : (dl.key === 'soon' || dl.key === 'week' ? 'warn' : '') }));
    kp.appendChild(UI.kpi({ label: t('pr.submitted_at'), value: p.submitted_at ? S.date(p.submitted_at) : '—', sub: p.submission_method ? S.label('submission_methods', p.submission_method) : '' }));
    kp.appendChild(UI.kpi({ label: t('pr.value'), value: canCom ? S.moneyShort(p.proposed_value) : '—', sub: canCom && p.proposed_value !== null ? t('pr.vat') + ' ' + S.moneyShort(MODEL.vatOf(p.proposed_value, p.vat_treatment)) + ' · ' + t('pr.total') + ' ' + S.moneyShort((U.num(p.proposed_value) || 0) + (MODEL.vatOf(p.proposed_value, p.vat_treatment) || 0)) : '' }));
    kp.appendChild(UI.kpi({ label: t('pr.validity'), value: p.validity_days ? String(p.validity_days) : '—', sub: MODEL.proposalValidUntil(p) ? t('pr.valid_until') + ' ' + S.date(MODEL.proposalValidUntil(p)) : '' }));
    kp.appendChild(UI.kpi({ label: t('pr.approval'), value: { not_required: S.lang === 'en' ? 'Not required' : 'غير مطلوب', pending: t('app.in_review'), approved: S.lang === 'en' ? 'Approved' : 'معتمد', rejected: S.lang === 'en' ? 'Rejected' : 'مرفوض' }[p.approval_status] || p.approval_status, tone: p.approval_status === 'pending' ? 'warn' : (p.approval_status === 'approved' ? 'ok' : '') }));
    kp.appendChild(UI.kpi({ label: t('pr.result'), value: { pending: S.lang === 'en' ? 'Pending' : 'معلّقة', accepted: S.lang === 'en' ? 'Accepted' : 'مقبول', rejected: S.lang === 'en' ? 'Rejected' : 'مرفوض', expired: S.lang === 'en' ? 'Expired' : 'منتهي', withdrawn: S.lang === 'en' ? 'Withdrawn' : 'مسحوب' }[p.result] || p.result }));
    main.appendChild(kp);

    var g = h('div', { class: 'grid c2' });
    g.appendChild(UI.card({ title: t('app.details'), body: UI.kv([[t('pr.opportunity'), opp ? UI.recordLink('opportunity', opp.id, S.oppName(opp.id)) : null], [t('app.customer'), opp ? UI.recordLink('customer', opp.customer_id, S.customerName(opp.customer_id)) : null], [t('pr.version'), String(p.version_no)], [t('pr.tech_status'), UI.lookupChip('doc_statuses', p.technical_status, 'sm')], [t('pr.comm_status'), UI.lookupChip('doc_statuses', p.commercial_status, 'sm')], [t('pr.owner'), UI.userCell(p.owner_id)], [t('pr.reviewers'), (p.reviewer_ids || []).map(S.userName).join('، ') || null], [t('pr.method'), S.label('submission_methods', p.submission_method)], [t('pr.discount'), canCom ? U.pct(p.discount_pct || 0) : UI.lockNote()], [t('op.vat'), S.label('vat_treatments', p.vat_treatment)], [t('app.notes'), p.notes], [t('app.created'), S.dateTime(p.created_at) + ' · ' + S.userName(p.created_by)], [t('app.updated'), S.dateTime(p.updated_at) + ' · ' + S.userName(p.updated_by)]]) }));
    /* النسخ */
    g.appendChild(UI.card({ title: t('pr.revisions'), tight: true, body: UI.table({ columns: [{ key: 'v', label: t('pr.version'), width: .8, get: function (x) { return h('span', { class: x.version_no === p.version_no ? 'bold' : '' }, 'v' + x.version_no); } }, { key: 'status', label: t('app.status'), width: 1.4, get: function (x) { return UI.lookupChip('proposal_statuses', x.status, 'sm'); } }, { key: 'value', label: t('pr.value'), width: 1.2, num: true, get: function (x) { return x._masked ? UI.lockNote() : UI.money(x.proposed_value, true); } }, { key: 'submitted', label: t('pr.submitted_at'), width: 1.2, get: function (x) { return x.submitted_at ? S.date(x.submitted_at) : null; } }, { key: 'created', label: t('app.created'), width: 1.2, get: function (x) { return S.date(x.created_at); } }], rows: versions, onRow: function (x) { location.hash = '#/proposals/' + x.id + '?v=' + x.version_no; } }) }));
    /* الاستيضاحات */
    var clarCard = UI.card({ title: t('pr.clarifications'), tight: true, actions: canManage ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { UI.formModal({ title: t('pr.add_clarification'), size: 'sm', cols: 1, fields: [{ key: 'question', label: t('pr.clar_question'), type: 'textarea', required: true }, { key: 'answer', label: t('pr.clar_answer'), type: 'textarea' }, { key: 'at', label: t('app.date'), type: 'date', required: true }], values: { at: U.today() }, onSubmit: function (v) { var list = (p.clarifications || []).concat([{ at: v.at, from: 'العميل', question: v.question, answer: v.answer || '', status: v.answer ? 'answered' : 'open' }]); return S.adapter.update('proposal', p.id, { clarifications: list }, p.version).then(function () { return root.APP.rerender(); }); } }); } } }, UI.icon('plus'), t('pr.add_clarification')) : null,
      body: UI.table({ columns: [{ key: 'at', label: t('app.date'), width: 1, get: function (c) { return S.date(c.at); } }, { key: 'question', label: t('pr.clar_question'), width: 2.5, wrap: true }, { key: 'answer', label: t('pr.clar_answer'), width: 2.5, wrap: true, get: function (c) { return c.answer || h('span', { class: 'muted' }, '—'); } }, { key: 'status', label: t('pr.clar_status'), width: .9, get: function (c) { return UI.chip(c.status === 'answered' ? 'ok' : 'warn', c.status === 'answered' ? t('pr.clar_answered') : t('pr.clar_open'), 'sm'); } }, { key: 'act', label: '', width: .8, get: function (c, i) { if (!canManage || c.status === 'answered') return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { UI.formModal({ title: t('pr.clar_answer'), size: 'sm', cols: 1, fields: [{ key: 'answer', label: t('pr.clar_answer'), type: 'textarea', required: true }], values: {}, onSubmit: function (v) { var list = U.clone(p.clarifications); list[i].answer = v.answer; list[i].status = 'answered'; return S.adapter.update('proposal', p.id, { clarifications: list }, p.version).then(function () { return root.APP.rerender(); }); } }); } } }, t('pr.clar_answer')); } }], rows: p.clarifications || [] }) });
    g.appendChild(clarCard);
    /* التعليقات الداخلية + المرفقات */
    var comments = U.sortBy(p.comments || [], 'at', 'desc');
    g.appendChild(UI.card({ title: t('pr.comments'), tight: true, actions: canManage || S.can('proposals.approve') ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { UI.formModal({ title: t('pr.add_comment'), size: 'sm', cols: 1, fields: [{ key: 'text', label: t('pr.comments'), type: 'textarea', required: true }], values: {}, onSubmit: function (v) { var list = (p.comments || []).concat([{ at: U.isoDateTime(U.now()), by: S.user.id, text: v.text }]); return S.adapter.update('proposal', p.id, { comments: list }, p.version).then(function () { return root.APP.rerender(); }); } }); } } }, UI.icon('plus'), t('pr.add_comment')) : null,
      body: UI.list(comments, function (c) { return h('div', null, UI.avatar(c.by), h('div', { class: 'main' }, h('div', { class: 't', style: { whiteSpace: 'normal' } }, c.text), h('div', { class: 's' }, S.userName(c.by) + ' · ' + S.dateTime(c.at)))); }) }));
    g.appendChild(UI.card({ title: t('pr.attachments'), sub: t('app.documents_hint'), tight: true, actions: canManage ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { UI.formModal({ title: t('pr.attachments'), size: 'sm', cols: 1, fields: [{ key: 'name', label: t('app.name'), type: 'text', required: true }, { key: 'ref', label: 'DMS', type: 'text', required: true, dir: 'ltr' }], values: {}, onSubmit: function (v) { return S.adapter.update('proposal', p.id, { attachments: (p.attachments || []).concat([{ name: v.name, ref: v.ref, at: U.isoDateTime(U.now()), by: S.user.id }]) }, p.version).then(function () { return root.APP.rerender(); }); } }); } } }, UI.icon('plus'), t('app.add')) : null,
      body: UI.table({ columns: [{ key: 'name', label: t('app.name'), width: 2 }, { key: 'ref', label: 'DMS', width: 1.2, get: function (a) { return h('span', { class: 'ltr' }, a.ref); } }, { key: 'at', label: t('app.date'), width: 1.2, get: function (a) { return a.at ? S.dateTime(a.at) : null; } }], rows: p.attachments || [] }) }));
    /* الاعتمادات */
    var apps = S.list('approvals').filter(function (a) { return a.entity_type === 'proposal' && a.entity_id === p.id; });
    g.appendChild(UI.card({ title: t('ad.tab_approvals'), tight: true, body: UI.table({ columns: [{ key: 'type', label: t('ad.approval_type'), width: 1.5, get: function (a) { return S.label('approval_types', a.type) + (a.payload && a.payload.version_no ? ' · v' + a.payload.version_no : ''); } }, { key: 'status', label: t('app.status'), width: 1, get: function (a) { return UI.lookupChip('approval_statuses', a.status, 'sm'); } }, { key: 'by', label: t('ad.approval_requested_by'), width: 1.2, get: function (a) { return S.userName(a.requested_by) + ' · ' + S.date(a.requested_at); } }, { key: 'dec', label: t('ad.approval_decide'), width: 1.5, get: function (a) { if (a.status !== 'pending') return a.decided_by ? S.userName(a.decided_by) + ' · ' + S.date(a.decided_at) + (a.reason ? ' · ' + a.reason : '') : null; if (!PERMS.canDecide(S.user, a.type) || a.requested_by === S.user.id) return h('span', { class: 'muted small' }, t('app.needs_approval_by', { roles: PERMS.approverRoles(a.type).map(S.roleLabel).join('/') })); return h('span', { class: 'row-actions' }, h('button', { class: 'btn xs primary', type: 'button', on: { click: function () { decide(a, 'approved'); } } }, t('ad.approval_approve')), h('button', { class: 'btn xs danger', type: 'button', on: { click: function () { decide(a, 'rejected'); } } }, t('ad.approval_reject'))); } }], rows: U.sortBy(apps, 'requested_at', 'desc') }) }));
    main.appendChild(g);

    function decide(a, decision) {
      UI.formModal({ title: decision === 'approved' ? t('ad.approval_approve') : t('ad.approval_reject'), size: 'sm', cols: 1, fields: [{ key: 'reason', label: t('ad.approval_reason'), type: 'textarea', required: decision === 'rejected' }], values: {}, saveLabel: decision === 'approved' ? t('ad.approval_approve') : t('ad.approval_reject'), onSubmit: function (v) { return S.adapter.decideApproval(a.id, decision, v.reason).then(function () { return root.APP.rerender(); }); } });
    }
    function submitFlow(p) {
      UI.formModal({ title: t('pr.submit'), sub: MODEL.proposalNumber(p), size: 'sm', cols: 1, intro: UI.infoBox(t('pr.submit_confirm')), fields: [{ key: 'submitted_at', label: t('pr.submitted_at'), type: 'date', required: true }, { key: 'method', label: t('pr.method'), type: 'select', lookup: 'submission_methods', required: true }], values: { submitted_at: U.today(), method: p.submission_method || 'portal' }, saveLabel: t('pr.submit'),
        onSubmit: function (v) { return S.adapter.submitProposal(p.id, { submitted_at: v.submitted_at, method: v.method, version: p.version, version_no: p.version_no }).then(function (r) { return root.APP.rerender().then(function () { if (r.approval_required) UI.toast(t('app.approval_required') + ' ' + t('app.approval_sent'), 'warn', 7000); }); }); } });
    }
  }

  root.VIEWS.proposals = { render: function (main, r) { if (r.id) renderDetail(main, r.id, r.query); else renderList(main, r.query); } };
})(typeof window !== 'undefined' ? window : globalThis);
