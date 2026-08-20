/* =====================================================================
   VIEW: النظرة التنفيذية
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, R = root.REPORTS, STAGES = root.STAGES, MODEL = root.MODEL, ENGINE = root.ENGINE;
  root.VIEWS = root.VIEWS || {};

  var periodKey = 'this_year';
  var stageCollapse = {};                       /* حالة طي مجموعات المسار — تبقى بين عمليات إعادة الرسم */
  var GROUP_TONE = { prospecting: 'var(--pipe-1)', qualification: 'var(--pipe-2)', proposal: 'var(--pipe-3)', negotiation: 'var(--pipe-4)' };

  function oppColumns() {
    return [
      { key: 'name', label: t('app.opportunity'), width: 3, get: function (o) { return h('span', null, UI.recordLink('opportunity', o.id, MODEL.displayName('opportunity', o, S.lang)), h('span', { class: 'sub' }, o.id + ' · ' + S.customerName(o.customer_id))); } },
      { key: 'stage', label: t('app.stage'), width: 2, get: function (o) { return UI.stageChip(o.stage, 'sm'); } },
      { key: 'estimated_value', label: t('app.value'), width: 1.4, num: true, get: function (o) { return o._masked ? UI.lockNote() : UI.money(o.estimated_value, true); }, exportGet: function (o) { return o.estimated_value; } },
      { key: 'owner_id', label: t('app.owner'), width: 1.5, get: function (o) { return S.userName(o.owner_id); } },
      { key: 'next_action_due', label: t('app.next_action_due'), width: 1.3, get: function (o) { return o.next_action_due ? UI.dateCell(o.next_action_due) : h('span', { class: 'chip warn sm' }, t('app.no_next_action')); }, exportGet: function (o) { return o.next_action_due; } },
      { key: 'days', label: t('op.days_in_stage'), width: 1, num: true, get: function (o) { return String(MODEL.daysInStage(o)); } }
    ];
  }

  root.VIEWS.overview = {
    render: function (main) {
      var db = S.db;
      var range = U.periodRange(periodKey);
      var k = R.overviewKpis(db, range);
      var head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('ov.title')), h('p', { class: 'sub' }, t('ov.sub'))));
      var per = h('select', { class: 'sel', 'aria-label': t('app.period'), on: { change: function () { periodKey = per.value; root.APP.route(); } } });
      [['this_month', t('app.this_month')], ['this_quarter', t('app.this_quarter')], ['this_year', t('app.this_year')], ['last_90', t('app.last_90')], ['', t('app.all')]].forEach(function (p) { per.appendChild(h('option', { value: p[0], selected: p[0] === periodKey }, p[1])); });
      head.appendChild(h('div', { class: 'actions' }, h('span', { class: 'small muted' }, t('app.period')), per));
      main.appendChild(head);

      var canCom = S.can('commercial.view');
      function drillOpps(title, rows) { UI.drill(title, oppColumns(), rows, { exportModule: 'opportunities', onRow: function (o) { location.hash = '#/opportunities/' + o.id; } }); }
      var kp = h('div', { class: 'kpis' });
      kp.appendChild(UI.kpi({ label: t('ov.total_customers'), value: U.fmtNum(k.total_customers), sub: t('ov.prospects') + ' ' + k.prospects + ' · ' + t('ov.existing') + ' ' + k.existing, onClick: function () { location.hash = '#/customers'; } }));
      kp.appendChild(UI.kpi({ label: t('ov.active_opps'), value: U.fmtNum(k.active_opps), onClick: function () { drillOpps(t('ov.active_opps'), k.lists.activeOpps); } }));
      kp.appendChild(UI.kpi({ label: t('ov.pipeline_value'), value: canCom ? S.moneyShort(k.pipeline_value) : '—', info: t('ov.def.pipeline'), tone: 'accent', onClick: canCom ? function () { drillOpps(t('ov.pipeline_value'), U.sortBy(k.lists.activeOpps, 'estimated_value', 'desc')); } : null }));
      kp.appendChild(UI.kpi({ label: t('ov.weighted_value'), value: canCom ? S.moneyShort(k.weighted_value) : '—', info: t('ov.def.weighted'), onClick: canCom ? function () { drillOpps(t('ov.weighted_value'), U.sortBy(k.lists.activeOpps, function (o) { return MODEL.weightedValue(o) || 0; }, 'desc')); } : null }));
      kp.appendChild(UI.kpi({ label: t('ov.awaiting_decision'), value: U.fmtNum(k.awaiting_decision), onClick: function () { drillOpps(t('ov.awaiting_decision'), S.live('opportunities').filter(function (o) { return ['awaiting_award', 'preferred_bidder', 'proposal_submitted'].indexOf(o.stage) >= 0; })); } }));
      kp.appendChild(UI.kpi({ label: t('ov.win_rate'), value: k.win_rate === null ? '—' : U.pct(k.win_rate), sub: t('rp.won') + ' ' + k.won + ' · ' + t('rp.lost') + ' ' + k.lost, info: t('ov.def.win_rate'), tone: 'ok', onClick: function () { drillOpps(t('ov.win_rate'), k.lists.won.concat(k.lists.lost)); } }));
      main.appendChild(kp);
      var kp2 = h('div', { class: 'kpis', style: { marginTop: '12px' } });
      kp2.appendChild(UI.kpi({ label: t('ov.prop_awaiting_prep'), value: U.fmtNum(k.prop_awaiting_prep), onClick: function () { location.hash = '#/proposals?status=not_started'; } }));
      kp2.appendChild(UI.kpi({ label: t('ov.prop_awaiting_approval'), value: U.fmtNum(k.prop_awaiting_approval), tone: k.prop_awaiting_approval ? 'warn' : '', onClick: function () { location.hash = '#/proposals?status=awaiting_approval'; } }));
      kp2.appendChild(UI.kpi({ label: t('ov.prop_submitted'), value: U.fmtNum(k.prop_submitted), sub: t('app.period') + ': ' + per.options[per.selectedIndex].text, onClick: function () { location.hash = '#/proposals?status=submitted'; } }));
      kp2.appendChild(UI.kpi({ label: t('ov.signed_contracts'), value: U.fmtNum(k.signed_contracts), sub: canCom ? t('ov.awarded_value') + ': ' + S.moneyShort(k.awarded_value) : '', info: t('ov.def.awarded_value'), tone: 'ok', onClick: function () { location.hash = '#/contracts'; } }));
      kp2.appendChild(UI.kpi({ label: t('ov.overdue_followups'), value: U.fmtNum(k.overdue_followups), tone: k.overdue_followups ? 'danger' : '', info: t('ov.def.overdue'), onClick: function () { location.hash = '#/activities?range=overdue'; } }));
      kp2.appendChild(UI.kpi({ label: t('ov.stuck'), value: U.fmtNum(k.stuck), sub: t('ov.no_next_action') + ': ' + k.no_next_action, tone: k.stuck ? 'warn' : '', info: t('ov.def.stuck'), onClick: function () { drillOpps(t('ov.stuck'), k.lists.stuck); } }));
      main.appendChild(kp2);

      /* الرسوم */
      var two = h('div', { class: 'two', style: { marginTop: '16px' } });
      var stages = R.pipelineByStage(db).filter(function (x) { return STAGES.isActive(x.key); });
      var stGroups = [];
      STAGES.groups.forEach(function (gr) {
        var rows = stages.filter(function (x) { var st = STAGES.get(x.key); return st && st.group === gr.key; });
        if (!rows.length) return;
        stGroups.push({
          key: gr.key,
          label: STAGES.groupLabel(gr.key, S.lang),
          color: GROUP_TONE[gr.key] || 'var(--ink)',
          count: U.sum(rows, 'count'),
          value: U.sum(rows, 'value'),
          items: rows.reduce(function (a, r) { return a.concat(r.items); }, []),
          stages: rows.map(function (x) { return { key: x.key, label: S.lang === 'en' ? x.label_en : x.label_ar, count: x.count, value: x.value, items: x.items }; })
        });
      });
      var stTable = UI.stageTable({
        groups: stGroups, canCom: canCom, state: stageCollapse,
        onToggle: function (st) { stageCollapse = st; },
        onStage: function (x) { drillOpps(x.label, x.items); },
        onGroup: function (g) { drillOpps(g.label, g.items); }
      });
      var barCard = UI.card({
        title: t('ov.pipeline_by_stage'),
        sub: canCom ? t('ov.def.pipeline') : (S.lang === 'en' ? 'Counts only (values restricted)' : 'الأعداد فقط — القيم غير متاحة لدورك'),
        actions: stTable.allBtn,
        tight: true,
        body: stTable,
        footer: h('span', { class: 'small muted' }, canCom
          ? (S.lang === 'en' ? 'Values in SAR · click a group name for its opportunities, a stage row for that stage.' : 'القيم بالريال السعودي · اضغط اسم المجموعة لعرض فرصها، أو صف المرحلة لعرض فرص المرحلة.')
          : (S.lang === 'en' ? 'Click a group name for its opportunities, a stage row for that stage.' : 'اضغط اسم المجموعة لعرض فرصها، أو صف المرحلة لعرض فرص المرحلة.'))
      });
      two.appendChild(barCard);
      var awards = R.expectedAwards(db, 6);
      var awCard = UI.card({ title: t('ov.awards_by_month'), sub: S.lang === 'en' ? 'By expected award date · next 6 months' : 'حسب تاريخ الترسية المتوقع · الأشهر الستة القادمة', body: UI.hbars({ rows: awards.map(function (a) { return { label: U.fmtMonth(a.month, S.lang), value: canCom ? a.weighted : a.count, color: 'accent', onClick: function () { drillOpps(U.fmtMonth(a.month, S.lang), a.items); } }; }), format: function (v, r) { var a = awards.find(function (x) { return U.fmtMonth(x.month, S.lang) === r.label; }); return canCom ? (S.moneyShort(v) + ' · ' + a.count) : String(v); } }), footer: h('span', { class: 'small muted' }, canCom ? t('ov.def.weighted') : '') });
      two.appendChild(awCard);
      main.appendChild(two);

      /* يحتاج انتباهك اليوم */
      var alerts = ENGINE.alertsFor(S.user, db, { all: S.can('audit.view') || S.user.role === 'bd_manager' || S.user.role === 'executive_viewer' });
      var rows = alerts.slice(0, 12).map(function (a) {
        if (a.entity === 'activity') return { tone: a.kind === 'activity_overdue' ? 'danger' : 'warn', t: a.record.purpose || S.label('activity_types', a.record.type), s: S.customerName(a.record.customer_id) + ' · ' + S.userName(a.record.owner_id) + ' · ' + (a.kind === 'activity_overdue' ? t('app.overdue') + ' ' + a.days + ' ' + t('app.days') : t('app.today')), href: '#/activities?focus=' + a.id };
        if (a.entity === 'proposal') return { tone: a.level === 'overdue' ? 'danger' : 'warn', t: t('app.proposal') + ' ' + a.id + ' — ' + S.oppName(a.record.opportunity_id), s: a.level === 'overdue' ? t('pr.overdue') : t('pr.due_in', { n: a.days }), href: '#/proposals/' + a.id };
        return { tone: 'warn', t: S.oppName(a.id), s: a.kind === 'opp_no_next' ? t('app.no_next_action') : t('op.next_action') + ' — ' + t('app.overdue'), href: '#/opportunities/' + a.id };
      });
      main.appendChild(UI.secHead('', t('ov.attention_today'), alerts.length + ' ' + (S.lang === 'en' ? 'items' : 'عنصر')));
      main.appendChild(UI.card({ tight: true, body: UI.list(rows, function (r) { return h('div', null, h('span', { class: 'avatar ' + r.tone }, '!'), h('div', { class: 'main' }, h('div', { class: 't' }, r.t), h('div', { class: 's' }, r.s)), h('span', { class: 'end' }, UI.icon('chev'))); }, function (r) { location.hash = r.href; }) }));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
