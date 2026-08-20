/* =====================================================================
   VIEW: الفرص — لوحة المسار + الجدول + صفحة الفرصة
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, STAGES = root.STAGES, MODEL = root.MODEL, F = root.FORMS, SEARCH = root.SEARCH, RULES = root.RULES;
  root.VIEWS = root.VIEWS || {};

  var state = { filters: {}, sort: { key: 'updated_at', dir: 'desc' }, view: 'board', shown: 50, hideEmpty: false };

  function filtered(f) {
    var db = S.db;
    var out = S.list('opportunities').filter(function (o) {
      if (o.archived_at) return false;
      if (f.stage && o.stage !== f.stage) return false;
      if (f.group && STAGES.get(o.stage).group !== f.group) return false;
      if (f.owner_id && o.owner_id !== f.owner_id && (o.team_ids || []).indexOf(f.owner_id) < 0) return false;
      if (f.region && o.region !== f.region) return false;
      if (f.sector && o.sector !== f.sector) return false;
      if (f.project_type && o.project_type !== f.project_type) return false;
      if (f.priority && o.priority !== f.priority) return false;
      if (f.customer_id && o.customer_id !== f.customer_id) return false;
      if (f.outcome && MODEL.outcome(o) !== f.outcome) return false;
      if (f.value_min && (U.num(o.estimated_value) || 0) < U.num(f.value_min)) return false;
      if (f.value_max && (U.num(o.estimated_value) || 0) > U.num(f.value_max)) return false;
      if (f.flags) { var fl = ENGINE.opportunityFlags(o, db); if (f.flags === 'any' ? !fl.length : !fl.some(function (x) { return x.key === f.flags; })) return false; }
      return true;
    });
    if (f.q) out = SEARCH.filter(out, f.q, ['name', 'project_name', 'tender_ref', 'id', function (o) { return S.customerName(o.customer_id); }]);
    return out;
  }
  function columns() {
    return [
      { key: 'name', label: t('app.opportunity'), width: 3, sortable: true, get: function (o) { var fl = ENGINE.opportunityFlags(o, S.db); return h('span', null, h('span', { class: 'lnk' }, MODEL.displayName('opportunity', o, S.lang)), h('span', { class: 'sub' }, o.id + ' · ' + S.customerName(o.customer_id) + (fl.length ? ' · ⚑ ' + fl.length : ''))); }, exportGet: function (o) { return MODEL.displayName('opportunity', o, S.lang); } },
      { key: 'stage', label: t('app.stage'), width: 2, sortable: true, get: function (o) { return h('span', null, UI.stageChip(o.stage, 'sm'), h('span', { class: 'sub' }, t('op.days_in_stage') + ': ' + MODEL.daysInStage(o))); }, exportGet: function (o) { return S.stageLabel(o.stage); } },
      { key: 'estimated_value', label: t('app.value'), width: 1.3, num: true, sortable: true, get: function (o) { return o._masked ? UI.lockNote() : UI.money(o.estimated_value, true); }, exportGet: function (o) { return o.estimated_value; } },
      { key: 'probability', label: t('op.probability'), width: .9, num: true, sortable: true, get: function (o) { return o._masked ? '—' : U.pct(o.probability); }, exportGet: function (o) { return o.probability; } },
      { key: 'weighted', label: t('op.weighted'), width: 1.2, num: true, get: function (o) { return o._masked ? '—' : UI.money(MODEL.weightedValue(o), true); }, exportGet: function (o) { return MODEL.weightedValue(o); } },
      { key: 'owner_id', label: t('app.owner'), width: 1.4, sortable: true, get: function (o) { return UI.userCell(o.owner_id); }, exportGet: function (o) { return S.userName(o.owner_id); } },
      { key: 'next_action_due', label: t('app.next_action'), width: 1.8, sortable: true, get: function (o) { if (!o.next_action) return h('span', { class: 'chip warn sm' }, t('app.no_next_action')); var d = U.daysUntil(o.next_action_due); return h('span', null, o.next_action, h('span', { class: 'sub' }, o.next_action_due ? S.date(o.next_action_due) + (d < 0 ? ' · ' + t('app.overdue') : '') : '')); }, exportGet: function (o) { return o.next_action; } },
      { key: 'deadline', label: t('op.deadline'), width: 1.2, sortable: true, get: function (o) { return o.submission_deadline ? UI.dateCell(o.submission_deadline) : null; }, exportGet: function (o) { return o.submission_deadline; } },
      { key: 'priority', label: t('app.priority'), width: .9, sortable: true, get: function (o) { return UI.lookupChip('priorities', o.priority, 'sm'); }, exportGet: function (o) { return S.label('priorities', o.priority); } },
      { key: 'prop', label: t('op.proposal_status'), width: 1.3, get: function (o) { var p = S.latestProposal(o.id); return p ? UI.lookupChip('proposal_statuses', p.status, 'sm') : h('span', { class: 'muted small' }, t('op.no_proposal')); }, exportGet: function (o) { var p = S.latestProposal(o.id); return p ? S.label('proposal_statuses', p.status) : ''; } }
    ];
  }

  function renderList(main, query) {
    var f = state.filters;
    if (query && Object.keys(query).length) Object.keys(query).forEach(function (k) { if (k === 'view') state.view = query[k]; else f[k] = query[k]; });
    main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('op.title')), h('p', { class: 'sub' }, t('op.sub'))),
      h('div', { class: 'actions' },
        h('div', { class: 'btngroup', role: 'group' }, h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'board' ? 'true' : 'false', on: { click: function () { state.view = 'board'; root.APP.route(); } } }, t('app.view_board')), h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'table' ? 'true' : 'false', on: { click: function () { state.view = 'table'; root.APP.route(); } } }, t('app.view_table'))),
        UI.savedViews('opportunities', function () { return state.filters; }, function (flt) { state.filters = Object.assign({}, flt); root.APP.route(); }),
        S.can('opportunities.manage') ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.opportunity(null).then(function (r) { if (r) location.hash = '#/opportunities/' + r.id; }); } } }, UI.icon('plus'), t('op.new')) : null)));
    var users = S.live('users').filter(function (u) { return ['bd_employee', 'bd_manager', 'system_admin', 'proposal_manager'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: S.userName(u.id) }; });
    var flagOpts = [{ value: 'any', label: t('op.hygiene') }].concat(['stuck', 'no_activity', 'no_next_action', 'next_action_overdue', 'award_passed', 'proposal_expired', 'no_owner', 'high_value_no_action', 'deadline_passed'].map(function (k) { return { value: k, label: ENGINE.flagLabel(k, S.lang) }; }));
    var bar = UI.filters({ values: f, items: [
      { key: 'q', type: 'search', placeholder: t('app.search') + ' — ' + t('op.name') + ' / ' + t('op.tender_ref') + ' / ' + t('app.customer') },
      { key: 'stage', type: 'select', label: t('op.filter_stage'), lookup: 'stages' },
      { key: 'group', type: 'select', label: t('op.filter_group'), options: STAGES.groups.map(function (g) { return { value: g.key, label: S.lang === 'en' ? g.en : g.ar }; }) },
      { key: 'owner_id', type: 'select', label: t('op.filter_owner'), options: users },
      { key: 'region', type: 'select', label: t('op.filter_region'), lookup: 'regions' },
      { key: 'sector', type: 'select', label: t('op.filter_sector'), lookup: 'sectors' },
      { key: 'project_type', type: 'select', label: t('op.filter_type'), lookup: 'project_types' },
      { key: 'priority', type: 'select', label: t('op.filter_priority'), lookup: 'priorities' },
      { key: 'outcome', type: 'select', label: t('op.filter_outcome'), lookup: 'outcomes' },
      { key: 'flags', type: 'select', label: t('op.filter_flags'), options: flagOpts },
      { key: 'value_min', type: 'number', label: t('op.filter_value_min') },
      { key: 'value_max', type: 'number', label: t('op.filter_value_max') }
    ], onChange: function (v) { state.filters = v; state.shown = 50; renderBody(); } });
    main.appendChild(bar);
    var body = h('div'); main.appendChild(body);
    function renderBody() {
      D.clear(body);
      var rows = filtered(state.filters);
      var af = UI.activeFilters(state.filters, function (k, v) { var m = { q: t('app.search'), stage: t('op.filter_stage'), group: t('op.filter_group'), owner_id: t('op.filter_owner'), region: t('op.filter_region'), sector: t('op.filter_sector'), project_type: t('op.filter_type'), priority: t('op.filter_priority'), outcome: t('op.filter_outcome'), flags: t('op.filter_flags'), value_min: t('op.filter_value_min'), value_max: t('op.filter_value_max'), customer_id: t('app.customer') }; var val = v; if (k === 'stage') val = S.stageLabel(v); else if (k === 'owner_id') val = S.userName(v); else if (k === 'region') val = S.regionLabel(v); else if (k === 'sector') val = S.label('sectors', v); else if (k === 'project_type') val = S.label('project_types', v); else if (k === 'priority') val = S.label('priorities', v); else if (k === 'outcome') val = S.label('outcomes', v); else if (k === 'flags') val = v === 'any' ? t('op.hygiene') : ENGINE.flagLabel(v, S.lang); else if (k === 'customer_id') val = S.customerName(v); else if (k === 'group') val = STAGES.groupLabel(v, S.lang); return (m[k] || k) + ': ' + val; }, function (k) { delete state.filters[k]; bar.set(k, ''); renderBody(); });
      if (af) body.appendChild(af);
      var canCom = S.can('commercial.view');
      var activeRows = rows.filter(function (o) { return STAGES.isActive(o.stage); });
      var head = h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' } },
        h('span', { class: 'count-note' }, t('app.showing', { shown: rows.length, total: S.live('opportunities').length }) + (canCom ? ' · ' + t('ov.pipeline_value') + ': ' + S.moneyShort(U.sum(activeRows.filter(function (o) { return !o._masked; }), 'estimated_value')) + ' · ' + t('ov.weighted_value') + ': ' + S.moneyShort(U.sum(activeRows.filter(function (o) { return !o._masked; }), function (o) { return MODEL.weightedValue(o) || 0; })) : '')),
        h('span', { style: { flex: 1 } }),
        state.view === 'board' ? h('label', { class: 'check small', style: { height: 'auto' } }, h('input', { type: 'checkbox', checked: state.hideEmpty, on: { change: function (e) { state.hideEmpty = e.target.checked; renderBody(); } } }), t('op.board_collapse_empty')) : null,
        UI.exportButton({ module: 'opportunities', filters: function () { return state.filters; }, rows: function () { return rows; }, columns: function () { return columns().map(function (c) { return { key: c.key, label: c.label, get: c.exportGet || (c.get ? function (r) { var v = c.get(r); return v && v.textContent !== undefined ? v.textContent : v; } : null) }; }); } }));
      body.appendChild(head);
      if (state.view === 'board') body.appendChild(renderBoard(rows)); else {
        var sorted = U.sortBy(rows, state.sort.key === 'name' ? function (o) { return MODEL.displayName('opportunity', o, S.lang); } : (state.sort.key === 'stage' ? function (o) { return STAGES.get(o.stage).order; } : (state.sort.key === 'deadline' ? 'submission_deadline' : state.sort.key)), state.sort.dir);
        var page = sorted.slice(0, state.shown);
        var card = UI.card({ tight: true, body: UI.table({ columns: columns(), rows: page, rowKey: 'id', sort: state.sort, onSort: function (k, d) { state.sort = { key: k, dir: d }; renderBody(); }, onRow: function (o) { location.hash = '#/opportunities/' + o.id; } }) });
        card.appendChild(UI.pager(sorted.length, page.length, function () { state.shown += 50; renderBody(); }));
        body.appendChild(card);
      }
    }
    renderBody();
  }

  function renderBoard(rows) {
    var board = h('div', { class: 'board', role: 'list' });
    var cols = STAGES.list.filter(function (s) { return !s.terminal; });   // المعلّقة تظهر كعمود، المغلقة في عمود مجمّع
    var byStage = U.groupBy(rows, 'stage');
    var closed = rows.filter(function (o) { return STAGES.isTerminal(o.stage); });
    board.appendChild(h('div', { class: 'small muted', style: { flexBasis: '100%', marginBottom: '-6px' } }, t('op.board_drag_hint')));
    cols.forEach(function (s) {
      var items = U.sortBy(byStage[s.key] || [], 'updated_at', 'desc');
      if (state.hideEmpty && !items.length) return;
      var col = h('div', { class: 'bcol' + (items.length ? '' : ' empty-col'), 'data-stage': s.key, role: 'listitem' });
      var val = U.sum(items.filter(function (o) { return !o._masked; }), 'estimated_value');
      col.appendChild(h('div', { class: 'bcol-h' }, h('div', { class: 'n' }, h('span', { class: 'ord' }, String(s.order)), h('span', { class: 'ellip', title: STAGES.label(s.key, S.lang) }, STAGES.label(s.key, S.lang))), h('div', { class: 'm' }, h('span', null, items.length + ' ' + (S.lang === 'en' ? 'opp.' : 'فرصة')), S.can('commercial.view') && items.length ? h('span', { class: 'num' }, S.moneyShort(val)) : null, s.max_days ? h('span', { class: 'faint' }, '≤ ' + s.max_days + ' ' + t('app.day_short')) : null)));
      var b = h('div', { class: 'bcol-b' });
      items.forEach(function (o) { b.appendChild(boardCard(o)); });
      col.appendChild(b);
      /* إسقاط */
      col.addEventListener('dragover', function (e) { if (!dragId) return; e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', function () { col.classList.remove('over'); });
      col.addEventListener('drop', function (e) { e.preventDefault(); col.classList.remove('over'); var id = dragId || e.dataTransfer.getData('text/plain'); dragId = null; var o = S.get('opportunity', id); if (!o || o.stage === s.key) return; if (!S.canRec('opportunities.stage', o, S.parentsOf(o))) { UI.toast(t('app.permission_denied'), 'err'); return; } F.stageChange(o, s.key).then(function (r) { if (r) root.APP.route(); }); });
      board.appendChild(col);
    });
    if (closed.length && !(state.filters.stage)) {
      var ccol = h('div', { class: 'bcol', style: { background: 'var(--slate-bg)' } });
      ccol.appendChild(h('div', { class: 'bcol-h' }, h('div', { class: 'n' }, STAGES.groupLabel('closed', S.lang)), h('div', { class: 'm' }, h('span', null, closed.length + ' ' + (S.lang === 'en' ? 'opp.' : 'فرصة')))));
      var cb = h('div', { class: 'bcol-b' }); U.sortBy(closed, 'closed_at', 'desc').slice(0, 30).forEach(function (o) { cb.appendChild(boardCard(o)); }); ccol.appendChild(cb); board.appendChild(ccol);
    }
    return board;
  }
  var dragId = null;
  function boardCard(o) {
    var fl = ENGINE.opportunityFlags(o, S.db);
    var canMove = S.canRec('opportunities.stage', o, S.parentsOf(o)) && !STAGES.isTerminal(o.stage);
    var due = o.next_action_due ? U.daysUntil(o.next_action_due) : null;
    var card = h('div', { class: 'bcard', draggable: canMove ? 'true' : 'false', tabindex: '0', role: 'button', 'aria-label': MODEL.displayName('opportunity', o, S.lang), on: { click: function (e) { if (e.target.closest('button')) return; location.hash = '#/opportunities/' + o.id; }, keydown: function (e) { if (e.key === 'Enter') location.hash = '#/opportunities/' + o.id; }, dragstart: function (e) { dragId = o.id; e.dataTransfer.setData('text/plain', o.id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); }, dragend: function () { card.classList.remove('dragging'); dragId = null; } } },
      h('div', { class: 't' }, MODEL.displayName('opportunity', o, S.lang)),
      h('div', { class: 'c' }, S.customerName(o.customer_id)),
      o._masked ? h('div', { class: 'v' }, UI.lockNote()) : h('div', { class: 'v' }, S.moneyShort(o.estimated_value), h('span', { class: 'faint', style: { fontWeight: 400, fontSize: '11px' } }, o.probability !== null ? ' · ' + U.pct(o.probability) : '')),
      o.next_action ? h('div', { class: 'na' + (due !== null && due < 0 ? ' over' : ''), title: o.next_action }, '→ ' + o.next_action + (o.next_action_due ? ' · ' + S.rel(due) : '')) : h('div', { class: 'na over' }, t('app.no_next_action')),
      fl.length ? h('div', { class: 'flags' }, fl.slice(0, 3).map(function (f) { return h('i', { class: ['stuck', 'next_action_overdue', 'proposal_expired', 'deadline_passed'].indexOf(f.key) >= 0 ? 'd' : '' }, ENGINE.flagLabel(f.key, S.lang)); })) : null,
      h('div', { class: 'f' }, UI.miniAvatar(o.owner_id), UI.lookupChip('priorities', o.priority, 'sm'), h('span', { class: 'sp' }), h('span', { class: 'small faint num' }, MODEL.daysInStage(o) + ' ' + t('app.day_short')), canMove ? h('button', { class: 'btn xs ghost', type: 'button', title: t('op.change_stage'), 'aria-label': t('op.change_stage'), on: { click: function (e) { e.stopPropagation(); F.stageChange(o).then(function (r) { if (r) root.APP.route(); }); } } }, '⇄') : null));
    return card;
  }

  /* ---------- صفحة الفرصة ---------- */
  function renderDetail(main, id, query) {
    var o = S.get('opportunity', id);
    if (!o) { main.appendChild(UI.empty(t('app.no_results'), id)); return; }
    var db = S.db, cust = S.get('customer', o.customer_id), st = STAGES.get(o.stage), flags = ENGINE.opportunityFlags(o, db), props = S.proposalsOf(o.id), ctr = S.contractOf(o.id), hist = S.historyOf(o.id), acts = U.sortBy(S.activitiesOf({ opportunity_id: o.id }), 'at', 'desc');
    var canEdit = S.canRec('opportunities.manage', o, S.parentsOf(o)), canStage = S.canRec('opportunities.stage', o, S.parentsOf(o)), canCom = !o._masked;
    main.appendChild(h('div', { class: 'crumbs' }, UI.link('#/opportunities', t('nav.opportunities')), h('span', { class: 'sep' }, '/'), UI.link('#/customers/' + o.customer_id, S.customerName(o.customer_id)), h('span', { class: 'sep' }, '/'), h('span', null, o.id)));
    var head = h('div', { class: 'page-head' }, h('div', { style: { minWidth: 0 } }, h('h1', null, MODEL.displayName('opportunity', o, S.lang), ' ', UI.stageChip(o.stage), ' ', UI.outcomeChip(o), ' ', UI.originChip(o)), h('p', { class: 'sub' }, o.id + (o.tender_ref ? ' · ' + t('op.tender_ref') + ' ' + o.tender_ref : '') + ' · ' + S.label('project_types', o.project_type) + ' · ' + S.regionLabel(o.region) + (o.city ? ' / ' + S.cityLabel(o.region, o.city) : ''))));
    var acts2 = h('div', { class: 'actions' });
    if (S.canRec('activities.manage', null, S.parentsOf(o).concat([o]))) acts2.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.activity(null, { customer_id: o.customer_id, opportunity_id: o.id, contact_id: o.main_contact_id }).then(function (r) { if (r) root.APP.route(); }); } } }, t('cu.log_activity')));
    if (S.canRec('proposals.manage', null, [o, cust]) && !st.terminal) acts2.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { F.proposal(null, o.id).then(function (r) { if (r) location.hash = '#/proposals/' + r.id; }); } } }, t('pr.new')));
    if (canStage) acts2.appendChild(h('button', { class: 'btn accent', type: 'button', on: { click: function () { F.stageChange(o).then(function (r) { if (r) root.APP.route(); }); } } }, '⇄ ' + (st.terminal ? t('op.reopen') : t('op.change_stage'))));
    if (STAGES.isWon(o.stage) && !ctr && S.can('contracts.manage')) acts2.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { UI.confirm({ title: t('op.convert'), message: t('op.convert_hint'), ok: t('op.convert') }).then(function (ok) { if (!ok) return; S.adapter.convertToContract(o.id, {}).then(function (c) { return root.APP.refresh().then(function () { location.hash = '#/contracts/' + c.id; }); }).catch(UI.errorToast); }); } } }, t('op.convert')));
    if (canEdit) acts2.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.opportunity(o).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('edit'), t('app.edit')));
    head.appendChild(acts2); main.appendChild(head);
    /* مسار المراحل */
    main.appendChild(h('div', { class: 'card', style: { padding: '12px 18px', marginBottom: '12px' } }, UI.stageTrack(o.stage), h('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px', fontSize: '13px' } }, h('span', null, t('op.stage') + ': ', h('b', null, S.stageLabel(o.stage))), h('span', null, t('op.stage_entered') + ': ', h('b', null, S.date(o.stage_entered_at))), h('span', null, t('op.days_in_stage') + ': ', h('b', { class: st.max_days && MODEL.daysInStage(o) > st.max_days ? 'danger-ink' : '' }, String(MODEL.daysInStage(o))), st.max_days ? h('span', { class: 'faint' }, ' / ' + st.max_days) : null), h('span', null, t('op.waiting_side') + ': ', h('b', null, ENGINE.waitingSide(o) === 'customer' ? t('op.waiting_on_customer') : (ENGINE.waitingSide(o) === 'us' ? t('op.waiting_on_us') : t('op.side_none')))), flags.length ? UI.flagChips(flags, null, 6) : null)));
    /* مؤشرات */
    var kp = h('div', { class: 'kpis', style: { marginBottom: '14px' } });
    kp.appendChild(UI.kpi({ label: t('op.est_value'), value: canCom ? S.moneyShort(o.estimated_value) : '—', sub: canCom && o.expected_margin_pct ? t('op.margin') + ' ' + U.pct(o.expected_margin_pct) : '' }));
    kp.appendChild(UI.kpi({ label: t('op.probability'), value: canCom ? U.pct(o.probability) : '—', sub: canCom ? t('op.weighted') + ': ' + S.moneyShort(MODEL.weightedValue(o)) : '', info: t('op.probability_hint') }));
    kp.appendChild(UI.kpi({ label: t('op.deadline'), value: o.submission_deadline ? S.date(o.submission_deadline) : '—', sub: o.submission_deadline ? S.rel(U.daysUntil(o.submission_deadline)) + (S.hijri(o.submission_deadline) ? ' · ' + S.hijri(o.submission_deadline) : '') : '', tone: o.submission_deadline && U.daysUntil(o.submission_deadline) < 0 && st.order < 11 ? 'danger' : (o.submission_deadline && U.daysUntil(o.submission_deadline) <= 7 && st.order < 11 ? 'warn' : '') }));
    kp.appendChild(UI.kpi({ label: t('op.expected_award'), value: o.expected_award_date ? S.date(o.expected_award_date) : '—', sub: o.expected_award_date ? S.rel(U.daysUntil(o.expected_award_date)) : '', tone: o.expected_award_date && U.daysUntil(o.expected_award_date) < 0 && STAGES.isActive(o.stage) ? 'warn' : '' }));
    kp.appendChild(UI.kpi({ label: t('op.next_action'), value: o.next_action_due ? S.rel(U.daysUntil(o.next_action_due)) : '—', sub: o.next_action || t('app.no_next_action'), tone: !o.next_action ? 'warn' : (U.daysUntil(o.next_action_due) < 0 ? 'danger' : '') }));
    kp.appendChild(UI.kpi({ label: t('op.proposal_status'), value: props.length ? S.label('proposal_statuses', props[0].status) : t('op.no_proposal'), sub: props.length ? MODEL.proposalNumber(props[0]) + (props[0].submission_deadline ? ' · ' + S.date(props[0].submission_deadline) : '') : '', onClick: props.length ? function () { location.hash = '#/proposals/' + props[0].id; } : null }));
    main.appendChild(kp);

    var tabsDef = [{ key: 'overview', label: t('op.tab_overview') }, { key: 'proposals', label: t('op.tab_proposals'), count: props.length }, { key: 'activities', label: t('op.tab_activities'), count: acts.length }, { key: 'history', label: t('op.tab_history'), count: hist.length }, { key: 'contract', label: t('op.tab_contract'), count: ctr ? 1 : 0 }, { key: 'docs', label: t('app.documents') }];
    var active = (query && query.tab) || 'overview';
    var pane = h('div');
    var tabBar = UI.tabs({ tabs: tabsDef, active: active, onChange: function (k) { D.clear(pane); tabs[k](); } });
    main.appendChild(tabBar); main.appendChild(pane);
    var tabs = {
      overview: function () {
        var g = h('div', { class: 'grid c2' });
        g.appendChild(UI.card({ title: t('op.tab_overview'), body: UI.kv([[t('app.customer'), UI.recordLink('customer', o.customer_id, S.customerName(o.customer_id))], [t('op.main_contact'), o.main_contact_id ? h('span', null, S.contactName(o.main_contact_id), h('span', { class: 'sub' }, (S.get('contact', o.main_contact_id) || {}).position || '')) : null], [t('op.project_name'), o.project_name], [t('op.description'), o.description], [t('op.project_type'), S.label('project_types', o.project_type)], [t('op.sector'), S.label('sectors', o.sector)], [t('op.location'), S.regionLabel(o.region) + (o.city ? ' / ' + S.cityLabel(o.region, o.city) : '')], [t('op.source'), S.label('opportunity_sources', o.source)], [t('op.tender_ref'), o.tender_ref ? h('span', { class: 'ltr' }, o.tender_ref) : null], [t('op.owner'), UI.userCell(o.owner_id)], [t('op.team'), (o.team_ids || []).length ? (o.team_ids || []).map(S.userName).join('، ') : null], [t('app.priority'), UI.lookupChip('priorities', o.priority, 'sm')], [t('app.risk'), UI.lookupChip('risk_levels', o.risk_level, 'sm')], [t('cu.confidentiality'), S.label('confidentiality', o.confidentiality)], [t('app.notes'), o.notes]]) }));
        g.appendChild(UI.card({ title: t('op.commercial'), body: canCom ? UI.kv([[t('op.est_value'), S.money(o.estimated_value)], [t('op.margin'), o.expected_margin_pct !== null ? U.pct(o.expected_margin_pct) : null], [t('op.probability'), U.pct(o.probability)], [t('op.weighted'), S.money(MODEL.weightedValue(o))], [t('op.competitors'), o.competitors], [t('op.vat'), S.label('vat_treatments', o.vat_treatment)], [t('op.payment_terms'), S.label('payment_terms', o.payment_terms)], [t('op.retention'), o.retention_pct !== null && o.retention_pct !== undefined ? U.pct(o.retention_pct) : null], [t('op.warranty'), o.warranty_months ? o.warranty_months + ' ' + (S.lang === 'en' ? 'months' : 'شهر') : null], [t('op.bid_bond'), o.bid_bond_required ? t('app.yes') + (o.bid_bond_pct ? ' · ' + U.pct(o.bid_bond_pct) : '') : t('app.no')], [t('op.expected_start'), o.expected_start_date ? S.date(o.expected_start_date) : null], [t('op.duration'), o.expected_duration_months ? o.expected_duration_months + ' ' + (S.lang === 'en' ? 'months' : 'شهر') : null]]) : h('div', { class: 'muted' }, UI.lockNote()) }));
        var docs = (o.required_documents || []);
        g.appendChild(UI.card({ title: t('op.required_docs'), sub: docs.length ? docs.filter(function (d) { return d.received; }).length + ' / ' + docs.length : '', body: docs.length ? h('div', { class: 'chips' }, docs.map(function (d) { var key = typeof d === 'string' ? d : d.key; var rec = typeof d === 'object' && d.received; var ch = UI.chip(rec ? 'ok' : 'warn', S.label('required_documents', key), 'sm'); if (canEdit) { ch.style.cursor = 'pointer'; ch.title = rec ? '✓' : '…'; ch.addEventListener('click', function () { var nd = docs.map(function (x) { var k2 = typeof x === 'string' ? x : x.key; return { key: k2, received: k2 === key ? !rec : (typeof x === 'object' ? !!x.received : false) }; }); S.adapter.update('opportunity', o.id, { required_documents: nd }, o.version).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); }); } return ch; })) : h('p', { class: 'muted' }, '—') }));
        if (o.stage === 'lost' || o.lessons_learned) g.appendChild(UI.card({ title: t('op.outcome'), body: UI.kv([[t('op.outcome'), UI.outcomeChip(o)], [t('op.loss_reason'), o.loss_reason ? S.label('loss_reasons', o.loss_reason) : null], [t('op.lessons'), o.lessons_learned]]) }));
        pane.appendChild(g);
      },
      proposals: function () {
        var card = UI.card({ title: t('op.tab_proposals'), tight: true, actions: S.canRec('proposals.manage', null, [o, cust]) && !st.terminal ? h('button', { class: 'btn sm primary', type: 'button', on: { click: function () { F.proposal(null, o.id).then(function (r) { if (r) location.hash = '#/proposals/' + r.id; }); } } }, UI.icon('plus'), t('pr.new')) : null,
          body: UI.table({ columns: [
            { key: 'no', label: t('pr.number'), width: 1.4, get: function (p) { return UI.recordLink('proposal', p.id, MODEL.proposalNumber(p)); } },
            { key: 'status', label: t('pr.status'), width: 1.4, get: function (p) { return UI.lookupChip('proposal_statuses', p.status, 'sm'); } },
            { key: 'tech', label: t('pr.tech_status'), width: 1.1, get: function (p) { return UI.lookupChip('doc_statuses', p.technical_status, 'sm'); } },
            { key: 'comm', label: t('pr.comm_status'), width: 1.1, get: function (p) { return UI.lookupChip('doc_statuses', p.commercial_status, 'sm'); } },
            { key: 'value', label: t('pr.value'), width: 1.2, num: true, get: function (p) { return p._masked ? UI.lockNote() : UI.money(p.proposed_value, true); } },
            { key: 'deadline', label: t('pr.deadline'), width: 1.1, get: function (p) { return p.submission_deadline ? S.date(p.submission_deadline) : null; } },
            { key: 'submitted', label: t('pr.submitted_at'), width: 1.1, get: function (p) { return p.submitted_at ? S.date(p.submitted_at) : null; } },
            { key: 'owner', label: t('pr.owner'), width: 1.2, get: function (p) { return S.userName(p.owner_id); } }
          ], rows: props, onRow: function (p) { location.hash = '#/proposals/' + p.id + '?v=' + p.version_no; } }) });
        pane.appendChild(card);
      },
      activities: function () {
        pane.appendChild(UI.card({ title: t('op.tab_activities'), tight: true, body: UI.list(acts, function (a) { var due = ENGINE.activityDue(a); return h('div', null, h('span', { class: 'avatar ' + (a.status === 'done' ? 'ok' : (due.key === 'overdue' ? 'danger' : 'info')) }, S.label('activity_types', a.type).charAt(0)), h('div', { class: 'main' }, h('div', { class: 't' }, S.label('activity_types', a.type) + (a.purpose ? ' — ' + a.purpose : '')), h('div', { class: 's' }, S.dateTime(a.at) + ' · ' + S.userName(a.owner_id) + (a.contact_id ? ' · ' + S.contactName(a.contact_id) : '') + (a.outcome ? ' · ' + a.outcome : ''))), h('div', { class: 'end' }, UI.lookupChip('activity_statuses', a.status, 'sm'), UI.dueChip(due))); }, function (a) { location.hash = '#/activities?focus=' + a.id; }) }));
      },
      history: function () {
        pane.appendChild(UI.card({ title: t('op.stage_history'), tight: true, body: UI.table({ columns: [
          { key: 'at', label: t('app.date'), width: 1.5, get: function (x) { return UI.dateCell(x.changed_at, true); } },
          { key: 'from', label: S.lang === 'en' ? 'From' : 'من', width: 1.6, get: function (x) { return x.from_stage ? UI.stageChip(x.from_stage, 'sm') : h('span', { class: 'muted' }, '—'); } },
          { key: 'to', label: S.lang === 'en' ? 'To' : 'إلى', width: 1.6, get: function (x) { return UI.stageChip(x.to_stage, 'sm'); } },
          { key: 'by', label: t('app.by'), width: 1.2, get: function (x) { return S.userName(x.changed_by); } },
          { key: 'reason', label: t('app.reason'), width: 2, wrap: true, get: function (x) { return (x.reason || '') + (x.note ? ' — ' + x.note : ''); } },
          { key: 'days', label: t('op.days_in_stage'), width: .9, num: true, get: function (x, i) { var next = hist[i + 1]; var end = next ? next.changed_at : U.isoDateTime(U.now()); return String(Math.max(0, U.diffDays(x.changed_at, end))); } }
        ], rows: hist }) }));
      },
      contract: function () {
        if (!ctr) { pane.appendChild(UI.empty(t('op.no_proposal').replace(t('app.proposal'), t('app.contract')), STAGES.isWon(o.stage) ? t('op.convert_hint') : (S.lang === 'en' ? 'A contract is created after award.' : 'يُنشأ العقد بعد الترسية.'))); return; }
        pane.appendChild(UI.card({ title: t('app.contract') + ' ' + ctr.id, actions: UI.link('#/contracts/' + ctr.id, t('app.open')), body: UI.kv([[t('co.status'), UI.lookupChip('contract_statuses', ctr.status, 'sm')], [t('co.ref'), ctr.contract_ref], [t('co.value'), ctr._masked ? UI.lockNote() : S.money(ctr.contract_value)], [t('co.signed_at'), ctr.signed_at ? S.date(ctr.signed_at) : null], [t('co.handover_status'), UI.lookupChip('handover_statuses', ctr.handover_status, 'sm')]]) }));
      },
      docs: function () {
        var docs = S.list('documents').filter(function (d) { return d.entity_type === 'opportunity' && d.entity_id === o.id; });
        pane.appendChild(UI.card({ title: t('app.documents'), sub: t('app.documents_hint'), tight: true, actions: canEdit ? h('button', { class: 'btn sm', type: 'button', on: { click: function () { F.document('opportunity', o.id).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('plus'), t('app.add_document')) : null, body: UI.table({ columns: [{ key: 'name', label: t('app.name'), width: 3 }, { key: 'doc_type', label: t('app.type'), width: 1.2 }, { key: 'storage_ref', label: 'DMS', width: 1.5 }, { key: 'uploaded_at', label: t('app.date'), width: 1.5, get: function (d) { return S.dateTime(d.uploaded_at); } }], rows: docs }) }));
      }
    };
    tabs[active]();
  }

  root.VIEWS.opportunities = { render: function (main, r) { if (r.id) renderDetail(main, r.id, r.query); else renderList(main, r.query); } };
})(typeof window !== 'undefined' ? window : globalThis);
