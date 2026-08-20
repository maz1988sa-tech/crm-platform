/* =====================================================================
   VIEW: أعمالي — مهام الموظف وعملاؤه وفرصه التي تحتاج إجراءً
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, ENGINE = root.ENGINE, STAGES = root.STAGES, MODEL = root.MODEL, PERMS = root.PERMS, F = root.FORMS;
  root.VIEWS = root.VIEWS || {};

  function mine(r) { return r.owner_id === S.user.id || r.secondary_owner_id === S.user.id || (Array.isArray(r.team_ids) && r.team_ids.indexOf(S.user.id) >= 0) || (Array.isArray(r.reviewer_ids) && r.reviewer_ids.indexOf(S.user.id) >= 0); }

  function actRow(a) {
    var due = ENGINE.activityDue(a);
    var row = h('div', null, h('span', { class: 'avatar ' + (due.key === 'overdue' ? 'danger' : (due.key === 'today' ? 'warn' : 'info')) }, S.label('activity_types', a.type).charAt(0)),
      h('div', { class: 'main' }, h('div', { class: 't' }, a.purpose || S.label('activity_types', a.type), ENGINE.isEscalated(a) ? UI.chip('danger', t('ac.escalated'), 'sm') : null), h('div', { class: 's' }, S.customerName(a.customer_id) + (a.opportunity_id ? ' · ' + S.oppName(a.opportunity_id) : '') + ' · ' + S.dateTime(a.at))),
      h('div', { class: 'end' }, UI.dueChip(due), S.canRec('activities.manage', a, S.parentsOf(a)) ? h('button', { class: 'btn xs', type: 'button', on: { click: function () { F.completeActivity(a).then(function (r) { if (r) root.APP.route(); }); } } }, t('mw.complete')) : null, S.canRec('activities.manage', a, S.parentsOf(a)) ? h('button', { class: 'btn xs ghost', type: 'button', on: { click: function () { F.rescheduleActivity(a).then(function (r) { if (r) root.APP.route(); }); } } }, t('mw.reschedule')) : null));
    return row;
  }

  root.VIEWS.mywork = {
    render: function (main) {
      var db = S.db, me = S.user.id;
      main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('mw.title')), h('p', { class: 'sub' }, t('mw.sub'))), h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', on: { click: function () { F.activity(null, {}).then(function (r) { if (r) root.APP.route(); }); } } }, UI.icon('plus'), t('ac.new')))));
      var acts = S.live('activities').filter(function (a) { return a.status === 'planned' && mine(a); });
      var today = acts.filter(function (a) { return ENGINE.activityDue(a).key === 'today'; });
      var overdue = U.sortBy(acts.filter(function (a) { return ENGINE.activityDue(a).key === 'overdue'; }), function (a) { return a.due_date || a.at; });
      var meetings = U.sortBy(S.live('activities').filter(function (a) { return a.status === 'planned' && ['meeting', 'visit', 'site_visit', 'presentation', 'negotiation'].indexOf(a.type) >= 0 && mine(a) && U.daysUntil(a.at) >= 0 && U.daysUntil(a.at) <= 14; }), 'at');
      var myCust = S.live('customers').filter(function (c) { return c.status !== 'archived' && mine(c); });
      var custFollow = myCust.map(function (c) { return { c: c, flags: ENGINE.customerFlags(c, db) }; }).filter(function (x) { return x.flags.some(function (f) { return f.key === 'needs_follow_up' || f.key === 'overdue_follow_up'; }); });
      var myProps = S.live('proposals').filter(function (p) { return mine(p) || mine(S.get('opportunity', p.opportunity_id) || {}); }).filter(function (p) { var d = ENGINE.proposalDeadline(p); return ['overdue', 'critical', 'soon', 'week'].indexOf(d.key) >= 0; });
      var myOpps = S.live('opportunities').filter(function (o) { return STAGES.isActive(o.stage) && mine(o); });
      var noAct = myOpps.filter(function (o) { return ENGINE.opportunityFlags(o, db).some(function (f) { return f.key === 'no_activity'; }); });
      var recentAssigned = U.sortBy(S.live('opportunities').filter(function (o) { return o.owner_id === me && U.daysSince(o.updated_at) <= 14; }), 'updated_at', 'desc').slice(0, 8);
      var recentUpdated = U.sortBy(S.live('customers').concat(S.live('opportunities'), S.live('proposals')).filter(function (r) { return r.updated_by === me; }), 'updated_at', 'desc').slice(0, 8);
      var approvals = S.list('approvals').filter(function (a) { return a.status === 'pending' && PERMS.canDecide(S.user, a.type) && a.requested_by !== me; });
      var escal = S.user.role === 'bd_manager' || S.user.role === 'system_admin' ? S.live('activities').filter(function (a) { return a.status === 'planned' && ENGINE.isEscalated(a); }) : [];

      var kp = h('div', { class: 'kpis' });
      kp.appendChild(UI.kpi({ label: t('mw.due_today'), value: String(today.length), tone: today.length ? 'warn' : '', onClick: function () { D.qs('#mw-today').scrollIntoView({ behavior: 'smooth' }); } }));
      kp.appendChild(UI.kpi({ label: t('mw.overdue'), value: String(overdue.length), tone: overdue.length ? 'danger' : '', onClick: function () { D.qs('#mw-overdue').scrollIntoView({ behavior: 'smooth' }); } }));
      kp.appendChild(UI.kpi({ label: t('mw.upcoming_meetings'), value: String(meetings.length), onClick: function () { D.qs('#mw-meet').scrollIntoView({ behavior: 'smooth' }); } }));
      kp.appendChild(UI.kpi({ label: t('mw.customers_followup'), value: String(custFollow.length), onClick: function () { D.qs('#mw-cust').scrollIntoView({ behavior: 'smooth' }); } }));
      kp.appendChild(UI.kpi({ label: t('mw.proposals_deadline'), value: String(myProps.length), tone: myProps.length ? 'warn' : '', onClick: function () { D.qs('#mw-props').scrollIntoView({ behavior: 'smooth' }); } }));
      kp.appendChild(UI.kpi({ label: t('mw.approvals_inbox'), value: String(approvals.length), tone: approvals.length ? 'accent' : '', onClick: function () { location.hash = '#/admin/approvals'; } }));
      main.appendChild(kp);

      var grid = h('div', { class: 'grid c2', style: { marginTop: '16px' } });
      function section(id, title, rows, renderRow, onClick, extraHead) {
        var card = UI.card({ title: title, sub: rows.length + ' ' + (S.lang === 'en' ? 'items' : 'عنصر'), tight: true, body: UI.list(rows, renderRow, onClick), actions: extraHead });
        card.id = id; return card;
      }
      grid.appendChild(section('mw-today', t('mw.due_today'), today, actRow, function (a) { location.hash = '#/activities?focus=' + a.id; }));
      grid.appendChild(section('mw-overdue', t('mw.overdue'), overdue, actRow, function (a) { location.hash = '#/activities?focus=' + a.id; }));
      grid.appendChild(section('mw-meet', t('mw.upcoming_meetings'), meetings, actRow, function (a) { location.hash = '#/activities?focus=' + a.id; }));
      grid.appendChild(section('mw-props', t('mw.proposals_deadline'), U.sortBy(myProps, 'submission_deadline'), function (p) { var d = ENGINE.proposalDeadline(p); return h('div', null, UI.avatar(p.owner_id), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.proposalNumber(p) + ' — ' + S.oppName(p.opportunity_id)), h('div', { class: 's' }, S.label('proposal_statuses', p.status) + ' · ' + t('pr.deadline') + ': ' + S.date(p.submission_deadline))), h('div', { class: 'end' }, UI.chip(d.key === 'overdue' || d.key === 'critical' ? 'danger' : 'warn', d.key === 'overdue' ? t('pr.overdue') : t('pr.due_in', { n: d.days }), 'sm'))); }, function (p) { location.hash = '#/proposals/' + p.id; }));
      grid.appendChild(section('mw-cust', t('mw.customers_followup'), custFollow, function (x) { return h('div', null, UI.avatar(x.c.owner_id), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.displayName('customer', x.c, S.lang)), h('div', { class: 's' }, S.label('customer_statuses', x.c.status) + ' · ' + S.label('customer_classes', x.c.classification))), h('div', { class: 'end' }, UI.flagChips(x.flags, ENGINE.customerFlagLabel, 2))); }, function (x) { location.hash = '#/customers/' + x.c.id; }));
      grid.appendChild(section('mw-noact', t('mw.opps_no_activity'), noAct, function (o) { var f = ENGINE.opportunityFlags(o, db); return h('div', null, h('span', { class: 'avatar warn' }, '!'), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.displayName('opportunity', o, S.lang)), h('div', { class: 's' }, S.customerName(o.customer_id) + ' · ' + S.stageLabel(o.stage))), h('div', { class: 'end' }, UI.flagChips(f, null, 2))); }, function (o) { location.hash = '#/opportunities/' + o.id; }));
      grid.appendChild(section('mw-assigned', t('mw.recently_assigned'), recentAssigned, function (o) { return h('div', null, UI.avatar(o.owner_id), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.displayName('opportunity', o, S.lang)), h('div', { class: 's' }, S.customerName(o.customer_id) + ' · ' + S.dateTime(o.updated_at))), h('div', { class: 'end' }, UI.stageChip(o.stage, 'sm'))); }, function (o) { location.hash = '#/opportunities/' + o.id; }));
      grid.appendChild(section('mw-updated', t('mw.recently_updated'), recentUpdated, function (r) { var ent = r.customer_type !== undefined ? 'customer' : (r.version_no !== undefined ? 'proposal' : 'opportunity'); return h('div', null, h('span', { class: 'avatar sq' }, ent === 'customer' ? 'ع' : (ent === 'proposal' ? 'ض' : 'ف')), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.displayName(ent, r, S.lang)), h('div', { class: 's' }, r.id + ' · ' + S.dateTime(r.updated_at))), h('div', { class: 'end' }, UI.icon('chev'))); }, function (r) { var ent = r.customer_type !== undefined ? 'customers' : (r.version_no !== undefined ? 'proposals' : 'opportunities'); location.hash = '#/' + ent + '/' + r.id; }));
      if (escal.length) grid.appendChild(section('mw-esc', t('mw.escalations'), escal, actRow, function (a) { location.hash = '#/activities?focus=' + a.id; }));
      main.appendChild(grid);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
