/* =====================================================================
   VIEW: الأنشطة والتقويم — قائمة + تقويم شهري (أنشطة + مناسبات + مواعيد تقديم)
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, MODEL = root.MODEL, F = root.FORMS, SEARCH = root.SEARCH, OCC = root.OCCASIONS_CONFIG;
  root.VIEWS = root.VIEWS || {};
  var state = { filters: {}, view: 'list', month: null, shown: 60, group: '' };

  function filtered(f) {
    var out = S.live('activities').filter(function (a) {
      if (f.type && a.type !== f.type) return false;
      if (f.owner_id && a.owner_id !== f.owner_id) return false;
      if (f.status && a.status !== f.status) return false;
      if (f.customer_id && a.customer_id !== f.customer_id) return false;
      if (f.opportunity_id && a.opportunity_id !== f.opportunity_id) return false;
      if (f.range) { var d = ENGINE.activityDue(a); if (f.range === 'overdue' && d.key !== 'overdue') return false; if (f.range === 'today' && d.key !== 'today') return false; if (f.range === 'week' && ['today', 'soon', 'upcoming'].indexOf(d.key) < 0 && !(a.status === 'planned' && U.daysUntil(a.at) >= 0 && U.daysUntil(a.at) <= 7)) return false; if (f.range === 'week' && U.daysUntil(a.due_date || a.at) > 7) return false; if (f.range === 'escalated' && !ENGINE.isEscalated(a)) return false; if (f.range === 'past' && !(a.status === 'done' || U.daysUntil(a.at) < 0)) return false; }
      if (f.from && U.isoDate(a.at) < f.from) return false;
      if (f.to && U.isoDate(a.at) > f.to) return false;
      return true;
    });
    if (f.q) out = SEARCH.filter(out, f.q, ['purpose', 'outcome', 'notes', 'next_action', 'participants', function (a) { return S.customerName(a.customer_id) + ' ' + (a.opportunity_id ? S.oppName(a.opportunity_id) : '') + ' ' + (a.contact_id ? S.contactName(a.contact_id) : ''); }]);
    return out;
  }
  function actRow(a, focus) {
    var due = ENGINE.activityDue(a), canM = S.canRec('activities.manage', a, S.parentsOf(a));
    var row = h('div', { id: 'act-' + a.id, style: focus ? { outline: '2px solid var(--accent)', outlineOffset: '-2px' } : null },
      h('span', { class: 'avatar ' + (a.status === 'done' ? 'ok' : (due.key === 'overdue' ? 'danger' : (due.key === 'today' ? 'warn' : 'info'))) }, S.label('activity_types', a.type).charAt(0)),
      h('div', { class: 'main' }, h('div', { class: 't' }, S.label('activity_types', a.type) + (a.purpose ? ' — ' + a.purpose : ''), ENGINE.isEscalated(a) ? UI.chip('danger', t('ac.escalated'), 'sm') : null, UI.lookupChip('priorities', a.priority, 'sm')), h('div', { class: 's' }, S.dateTime(a.at) + ' · ' + S.customerName(a.customer_id) + (a.opportunity_id ? ' · ' + S.oppName(a.opportunity_id) : '') + (a.contact_id ? ' · ' + S.contactName(a.contact_id) : '') + ' · ' + S.userName(a.owner_id) + (a.outcome ? ' · ' + a.outcome : '') + (a.next_action ? ' · → ' + a.next_action : ''))),
      h('div', { class: 'end' }, UI.lookupChip('activity_statuses', a.status, 'sm'), UI.dueChip(due),
        canM && a.status === 'planned' ? h('button', { class: 'btn xs', type: 'button', on: { click: function () { F.completeActivity(a).then(function (r) { if (r) root.APP.route(); }); } } }, t('ac.complete')) : null,
        canM && a.status === 'planned' ? h('button', { class: 'btn xs ghost', type: 'button', on: { click: function () { F.rescheduleActivity(a).then(function (r) { if (r) root.APP.route(); }); } } }, t('ac.reschedule')) : null,
        canM ? h('button', { class: 'btn xs ghost', type: 'button', 'aria-label': t('app.edit'), on: { click: function () { F.activity(a).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('edit')) : null));
    return row;
  }

  root.VIEWS.activities = {
    render: function (main, r) {
      var q = r.query || {}; var f = state.filters;
      if (q.range) f.range = q.range; if (q.view) state.view = q.view; if (q.customer_id) f.customer_id = q.customer_id; if (q.opportunity_id) f.opportunity_id = q.opportunity_id;
      var focus = q.focus || null;
      if (focus) { var fa = S.get('activity', focus); if (fa) { state.filters = {}; f = state.filters; state.view = 'list'; } }
      main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('ac.title')), h('p', { class: 'sub' }, t('ac.sub'))),
        h('div', { class: 'actions' }, h('div', { class: 'btngroup', role: 'group' }, h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'list' ? 'true' : 'false', on: { click: function () { state.view = 'list'; root.APP.route(); } } }, t('app.view_list')), h('button', { class: 'btn', type: 'button', 'aria-pressed': state.view === 'calendar' ? 'true' : 'false', on: { click: function () { state.view = 'calendar'; root.APP.route(); } } }, t('app.view_calendar'))), S.can('activities.manage') ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.activity(null, { customer_id: f.customer_id, opportunity_id: f.opportunity_id }).then(function (x) { if (x) root.APP.route(); }); } } }, UI.icon('plus'), t('ac.new')) : null)));
      var all = S.live('activities');
      var today = all.filter(function (a) { return ENGINE.activityDue(a).key === 'today'; }), overdue = all.filter(function (a) { return ENGINE.activityDue(a).key === 'overdue'; }), week = all.filter(function (a) { var d = ENGINE.activityDue(a); return ['today', 'soon', 'upcoming'].indexOf(d.key) >= 0 && d.days <= 7; }), esc = all.filter(function (a) { return ENGINE.isEscalated(a); });
      var kp = h('div', { class: 'kpis c4' });
      kp.appendChild(UI.kpi({ label: t('ac.kpi_today'), value: String(today.length), tone: today.length ? 'warn' : '', onClick: function () { state.filters = { range: 'today' }; state.view = 'list'; root.APP.route(); } }));
      kp.appendChild(UI.kpi({ label: t('ac.kpi_overdue'), value: String(overdue.length), tone: overdue.length ? 'danger' : '', onClick: function () { state.filters = { range: 'overdue' }; state.view = 'list'; root.APP.route(); } }));
      kp.appendChild(UI.kpi({ label: t('ac.kpi_upcoming'), value: String(week.length), onClick: function () { state.filters = { range: 'week' }; state.view = 'list'; root.APP.route(); } }));
      kp.appendChild(UI.kpi({ label: t('ac.kpi_escalated'), value: String(esc.length), tone: esc.length ? 'danger' : '', sub: t('ac.escalation_hint', { n: root.RULES.reminders.escalate_after_days }), onClick: function () { state.filters = { range: 'escalated' }; state.view = 'list'; root.APP.route(); } }));
      main.appendChild(kp);
      var users = S.live('users').map(function (u) { return { value: u.id, label: S.userName(u.id) }; });
      var bar = UI.filters({ values: f, items: [
        { key: 'q', type: 'search', placeholder: t('app.search') },
        { key: 'type', type: 'select', label: t('ac.filter_type'), lookup: 'activity_types' },
        { key: 'owner_id', type: 'select', label: t('ac.filter_owner'), options: users },
        { key: 'status', type: 'select', label: t('ac.filter_status'), lookup: 'activity_statuses' },
        { key: 'range', type: 'select', label: t('ac.filter_range'), options: [{ value: 'today', label: t('app.today') }, { value: 'overdue', label: t('app.overdue') }, { value: 'week', label: t('ac.kpi_upcoming') }, { value: 'escalated', label: t('ac.escalated') }, { value: 'past', label: S.lang === 'en' ? 'Past' : 'سابقة' }] },
        { key: 'from', type: 'date', label: t('app.from') }, { key: 'to', type: 'date', label: t('app.to') }
      ], onChange: function (v) { state.filters = v; renderBody(); } });
      main.appendChild(h('div', { style: { height: '12px' } })); main.appendChild(bar);
      var body = h('div'); main.appendChild(body);
      function renderBody() {
        D.clear(body);
        var rows = filtered(state.filters);
        var af = UI.activeFilters(state.filters, function (k, v) { var m = { customer_id: t('app.customer'), opportunity_id: t('app.opportunity'), range: t('ac.filter_range'), owner_id: t('ac.filter_owner'), type: t('ac.filter_type'), status: t('ac.filter_status'), q: t('app.search'), from: t('app.from'), to: t('app.to') }; var val = v; if (k === 'customer_id') val = S.customerName(v); else if (k === 'opportunity_id') val = S.oppName(v); else if (k === 'owner_id') val = S.userName(v); else if (k === 'type') val = S.label('activity_types', v); else if (k === 'status') val = S.label('activity_statuses', v); return (m[k] || k) + ': ' + val; }, function (k) { delete state.filters[k]; bar.set(k, ''); renderBody(); });
        if (af) body.appendChild(af);
        if (state.view === 'calendar') { body.appendChild(renderCalendar(rows)); return; }
        var grpSel = h('select', { class: 'sel', 'aria-label': t('app.sort'), on: { change: function () { state.group = grpSel.value; renderBody(); } } }, h('option', { value: '' }, t('app.sort') + ': ' + t('app.date')), h('option', { value: 'owner', selected: state.group === 'owner' }, t('ac.by_employee')), h('option', { value: 'customer', selected: state.group === 'customer' }, t('ac.by_customer')), h('option', { value: 'opportunity', selected: state.group === 'opportunity' }, t('ac.by_opportunity')));
        var head = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' } }, h('span', { class: 'count-note' }, t('app.showing', { shown: Math.min(rows.length, state.shown), total: rows.length })), h('span', { style: { flex: 1 } }), grpSel, UI.exportButton({ module: 'activities', rows: function () { return rows; }, columns: function () { return [{ key: 'id', label: t('app.id') }, { key: 'type', label: t('ac.type'), get: function (a) { return S.label('activity_types', a.type); } }, { key: 'at', label: t('ac.at') }, { key: 'customer', label: t('app.customer'), get: function (a) { return S.customerName(a.customer_id); } }, { key: 'opportunity', label: t('app.opportunity'), get: function (a) { return a.opportunity_id ? S.oppName(a.opportunity_id) : ''; } }, { key: 'owner', label: t('ac.owner'), get: function (a) { return S.userName(a.owner_id); } }, { key: 'purpose', label: t('ac.purpose') }, { key: 'outcome', label: t('ac.outcome') }, { key: 'status', label: t('ac.status'), get: function (a) { return S.label('activity_statuses', a.status); } }, { key: 'due_date', label: t('ac.due') }]; } }));
        body.appendChild(head);
        var sorted = U.sortBy(rows, function (a) { return a.status === 'planned' ? (a.due_date || U.isoDate(a.at)) : a.at; }, state.filters.range === 'past' || !state.filters.range ? 'desc' : 'asc');
        if (state.filters.range === 'overdue' || state.filters.range === 'today' || state.filters.range === 'week') sorted = U.sortBy(rows, function (a) { return a.due_date || a.at; });
        if (focus) { var fi = sorted.findIndex(function (a) { return a.id === focus; }); if (fi >= 0) { var fx = sorted.splice(fi, 1)[0]; sorted.unshift(fx); } }
        var page = sorted.slice(0, state.shown);
        if (state.group) {
          var gk = { owner: 'owner_id', customer: 'customer_id', opportunity: 'opportunity_id' }[state.group];
          var groups = U.groupBy(page, function (a) { return a[gk] || '_none'; });
          Object.keys(groups).forEach(function (k) { var title = k === '_none' ? '—' : (state.group === 'owner' ? S.userName(k) : (state.group === 'customer' ? S.customerName(k) : S.oppName(k))); body.appendChild(UI.card({ title: title, sub: groups[k].length + ' ' + (S.lang === 'en' ? 'activities' : 'نشاط'), tight: true, body: UI.list(groups[k], function (a) { return actRow(a, a.id === focus); }) })); body.appendChild(h('div', { style: { height: '10px' } })); });
        } else {
          var card = UI.card({ tight: true, body: UI.list(page, function (a) { return actRow(a, a.id === focus); }) });
          card.appendChild(UI.pager(sorted.length, page.length, function () { state.shown += 60; renderBody(); }));
          body.appendChild(card);
        }
        if (focus) setTimeout(function () { var el = D.qs('#act-' + CSS.escape(focus)); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50);
      }
      renderBody();
    }
  };

  function renderCalendar(rows) {
    var cur = state.month ? U.parseDate(state.month + '-01') : U.startOfMonth(U.now());
    var y = cur.getFullYear(), m = cur.getMonth();
    var wrap = h('div');
    var nav = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' } },
      h('button', { class: 'btn sm', type: 'button', 'aria-label': t('ac.prev_month'), on: { click: function () { state.month = U.monthKey(new Date(y, m - 1, 1)); root.APP.route(); } } }, S.lang === 'en' ? '‹' : '›'),
      h('h3', { style: { minWidth: '180px', textAlign: 'center' } }, U.monthName(m, S.lang) + ' ' + y, h('span', { class: 'sub small muted', style: { display: 'block', fontWeight: 400 } }, root.HIJRI.fmt(new Date(y, m, 1), S.lang).replace(/^\d+\s/, '') + ' — ' + root.HIJRI.fmt(new Date(y, m + 1, 0), S.lang).replace(/^\d+\s/, ''))),
      h('button', { class: 'btn sm', type: 'button', 'aria-label': t('ac.next_month'), on: { click: function () { state.month = U.monthKey(new Date(y, m + 1, 1)); root.APP.route(); } } }, S.lang === 'en' ? '›' : '‹'),
      h('button', { class: 'btn sm ghost', type: 'button', on: { click: function () { state.month = null; root.APP.route(); } } }, t('app.today')),
      h('span', { class: 'legend', style: { marginInlineStart: 'auto' } }, h('span', null, h('i', { style: { background: 'var(--info)' } }), t('app.activity')), h('span', null, h('i', { style: { background: 'var(--danger)' } }), t('app.overdue')), h('span', null, h('i', { style: { background: 'var(--accent)' } }), t('ac.occasion_day')), h('span', null, h('i', { style: { background: 'var(--warn)' } }), t('ac.deadline_day'))));
    wrap.appendChild(nav);
    var cal = h('div', { class: 'cal', role: 'grid' });
    for (var d = 0; d < 7; d++) cal.appendChild(h('div', { class: 'dh', role: 'columnheader' }, U.dayName(d, S.lang)));
    var first = new Date(y, m, 1), startDow = first.getDay();
    var start = new Date(y, m, 1 - startDow);
    var byDay = {};
    rows.forEach(function (a) { var k = a.status === 'planned' && a.due_date ? a.due_date : U.isoDate(a.at); (byDay[k] = byDay[k] || []).push({ kind: 'act', a: a }); });
    ENGINE.upcomingOccasions(OCC.list, y - 1).concat(ENGINE.upcomingOccasions(OCC.list, y)).forEach(function (o) { (byDay[o.date] = byDay[o.date] || []).push({ kind: 'occ', o: o }); });
    S.live('opportunities').forEach(function (o) { if (o.submission_deadline && root.STAGES.get(o.stage).order <= 11) (byDay[o.submission_deadline] = byDay[o.submission_deadline] || []).push({ kind: 'dl', o: o }); });
    var today = U.today();
    for (var i = 0; i < 42; i++) {
      var day = new Date(start.getTime()); day.setDate(start.getDate() + i);
      var key = U.isoDate(day), out = day.getMonth() !== m;
      var cell = h('div', { class: 'dc' + (out ? ' out' : '') + (key === today ? ' today' : ''), role: 'gridcell' });
      var hj = root.HIJRI.toHijri(day);
      cell.appendChild(h('div', { class: 'dn' }, h('span', null, String(day.getDate())), hj ? h('span', { class: 'hj' }, hj.day + (hj.day === 1 ? ' ' + root.HIJRI.monthName(hj.month, S.lang) : '')) : null));
      var items = byDay[key] || [];
      items.slice(0, 4).forEach(function (it) {
        if (it.kind === 'act') { var a = it.a, due = ENGINE.activityDue(a); cell.appendChild(h('div', { class: 'ev' + (a.status === 'done' ? ' done' : (due.key === 'overdue' ? ' over' : '')), title: (a.purpose || S.label('activity_types', a.type)) + ' — ' + S.customerName(a.customer_id), on: { click: function () { location.hash = '#/activities?focus=' + a.id; } } }, (a.purpose || S.label('activity_types', a.type)))); }
        else if (it.kind === 'occ') cell.appendChild(h('div', { class: 'ev occ', title: OCC.label(it.o.occasion.key, S.lang), on: { click: function () { location.hash = '#/occasions'; } } }, OCC.label(it.o.occasion.key, S.lang)));
        else cell.appendChild(h('div', { class: 'ev dl', title: t('op.deadline') + ': ' + MODEL.displayName('opportunity', it.o, S.lang), on: { click: function () { location.hash = '#/opportunities/' + it.o.id; } } }, '⏱ ' + MODEL.displayName('opportunity', it.o, S.lang)));
      });
      if (items.length > 4) cell.appendChild(h('div', { class: 'more', on: { click: function () { state.filters = { from: key, to: key }; state.view = 'list'; root.APP.route(); } } }, '+' + (items.length - 4) + ' ' + t('app.more')));
      cal.appendChild(cell);
    }
    wrap.appendChild(cal);
    return wrap;
  }
})(typeof window !== 'undefined' ? window : globalThis);
