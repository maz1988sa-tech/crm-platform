/* =====================================================================
   REPORTS — تجميعات التقارير (كلها قواعد حسابية معلنة)
   ---------------------------------------------------------------------
   range = { from, to } بتنسيق YYYY-MM-DD (فارغ = بلا حدود)
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, STAGES = root.STAGES, MODEL = root.MODEL, ENGINE = root.ENGINE, L = root.LOOKUPS;

  function live(arr) { return (arr || []).filter(function (r) { return !r.archived_at; }); }
  function inR(d, range) { if (!range || (!range.from && !range.to)) return true; return U.inRange(d, range.from, range.to); }
  function closedAt(o) { return o.closed_at || o.stage_entered_at || o.updated_at; }

  var R = {};

  R.activeOpps = function (db) { return live(db.opportunities).filter(function (o) { return STAGES.isActive(o.stage); }); };

  R.pipelineByStage = function (db) {
    var rows = [];
    STAGES.boardColumns().forEach(function (s) {
      var items = R.activeOpps(db).filter(function (o) { return o.stage === s.key; });
      rows.push({ key: s.key, label_ar: s.ar, label_en: s.en, count: items.length, value: U.sum(items, function (o) { return U.num(o.estimated_value) || 0; }), weighted: U.sum(items, function (o) { return MODEL.weightedValue(o) || 0; }), items: items });
    });
    return rows;
  };

  /* field: customer_id | sector | owner_id | region | project_type | source */
  R.pipelineBy = function (db, field, labelFn) {
    var g = U.groupBy(R.activeOpps(db), function (o) { return o[field] || '_none'; });
    var rows = Object.keys(g).map(function (k) {
      var items = g[k];
      return { key: k, label: labelFn ? labelFn(k) : k, count: items.length, value: U.sum(items, function (o) { return U.num(o.estimated_value) || 0; }), weighted: U.sum(items, function (o) { return MODEL.weightedValue(o) || 0; }), items: items };
    });
    return U.sortBy(rows, 'value', 'desc');
  };

  R.expectedAwards = function (db, months) {
    months = months || 6;
    var start = U.startOfMonth(U.now());
    var rows = [];
    for (var i = 0; i < months; i++) {
      var m = U.addMonths(start, i), key = U.monthKey(m);
      var items = R.activeOpps(db).filter(function (o) { return U.monthKey(o.expected_award_date) === key; });
      rows.push({ month: key, count: items.length, value: U.sum(items, function (o) { return U.num(o.estimated_value) || 0; }), weighted: U.sum(items, function (o) { return MODEL.weightedValue(o) || 0; }), items: items });
    }
    return rows;
  };

  /* متوسط الأيام في كل مرحلة وفق سجل المراحل */
  R.stageDurations = function (db) {
    var acc = {};
    var hist = U.sortBy(db.stage_history || [], 'changed_at');
    var byOpp = U.groupBy(hist, 'opportunity_id');
    Object.keys(byOpp).forEach(function (oid) {
      var h = byOpp[oid];
      for (var i = 0; i < h.length; i++) {
        var from = h[i].from_stage, leftAt = h[i].changed_at;
        var enteredAt = i === 0 ? null : h[i - 1].changed_at;
        if (!from) continue;
        if (!enteredAt) { var o = U.by(db.opportunities, 'id')[oid]; enteredAt = o ? o.created_at : null; }
        if (!enteredAt) continue;
        var d = U.diffDays(enteredAt, leftAt);
        if (d === null || d < 0) continue;
        (acc[from] = acc[from] || []).push(d);
      }
    });
    return STAGES.list.map(function (s) { var arr = acc[s.key] || []; return { key: s.key, label_ar: s.ar, label_en: s.en, samples: arr.length, avg: arr.length ? U.round(U.avg(arr), 1) : null, threshold: s.max_days }; });
  };

  R.proposalTurnaround = function (db, range) {
    var items = live(db.proposals).filter(function (p) { return p.submitted_at && inR(p.submitted_at, range); });
    var days = items.map(function (p) { return U.diffDays(p.created_at, p.submitted_at); }).filter(function (d) { return d !== null && d >= 0; });
    var onTime = items.filter(function (p) { return p.submission_deadline && U.isoDate(p.submitted_at) <= p.submission_deadline; }).length;
    return { count: items.length, avg: days.length ? U.round(U.avg(days), 1) : null, max: days.length ? Math.max.apply(null, days) : null, on_time: onTime, on_time_rate: items.length ? U.round(onTime / items.length * 100, 1) : null, items: items };
  };

  R.winLoss = function (db, range) {
    var opps = live(db.opportunities);
    var won = opps.filter(function (o) { return STAGES.isWon(o.stage) && inR(closedAt(o), range); });
    var lost = opps.filter(function (o) { return o.stage === 'lost' && inR(closedAt(o), range); });
    var cancelled = opps.filter(function (o) { return o.stage === 'cancelled' && inR(closedAt(o), range); });
    var total = won.length + lost.length;
    return { won: won.length, lost: lost.length, cancelled: cancelled.length, won_value: U.sum(won, function (o) { return U.num(o.estimated_value) || 0; }), lost_value: U.sum(lost, function (o) { return U.num(o.estimated_value) || 0; }), rate: total ? U.round(won.length / total * 100, 1) : null, won_items: won, lost_items: lost };
  };

  R.lossReasons = function (db, range) {
    var lost = live(db.opportunities).filter(function (o) { return o.stage === 'lost' && inR(closedAt(o), range); });
    var g = U.groupBy(lost, function (o) { return o.loss_reason || 'other'; });
    return U.sortBy(Object.keys(g).map(function (k) { return { key: k, count: g[k].length, value: U.sum(g[k], function (o) { return U.num(o.estimated_value) || 0; }), items: g[k] }; }), 'count', 'desc');
  };

  R.sourcesWon = function (db, range) {
    var opps = live(db.opportunities).filter(function (o) { return inR(o.created_at, range) || STAGES.isWon(o.stage); });
    var g = U.groupBy(opps, function (o) { return o.source || 'other'; });
    return U.sortBy(Object.keys(g).map(function (k) { var items = g[k], won = items.filter(function (o) { return STAGES.isWon(o.stage); }); var closed = items.filter(function (o) { return STAGES.isWon(o.stage) || o.stage === 'lost'; }); return { key: k, total: items.length, won: won.length, won_value: U.sum(won, function (o) { return U.num(o.estimated_value) || 0; }), rate: closed.length ? U.round(won.length / closed.length * 100, 1) : null }; }), 'won', 'desc');
  };

  /* عدد الأنشطة المتأخرة في نهاية كل أسبوع من الأسابيع الماضية */
  R.overdueTrend = function (db, weeks) {
    weeks = weeks || 8;
    var rows = [];
    var acts = live(db.activities);
    for (var w = weeks - 1; w >= 0; w--) {
      var end = U.isoDate(U.addDays(U.now(), -7 * w));
      var n = acts.filter(function (a) {
        var due = a.due_date || U.isoDate(a.at);
        if (!due || due >= end) return false;
        if (a.status === 'cancelled') return false;
        if (a.status === 'done') { var c = U.isoDate(a.completed_at || a.updated_at); return c > end; }
        return true;
      }).length;
      rows.push({ week_end: end, count: n });
    }
    return rows;
  };

  R.inactiveCustomers = function (db, days) {
    days = days || 60;
    return live(db.customers).filter(function (c) { return c.status !== 'archived'; }).map(function (c) {
      var last = ENGINE.customerLastInteraction(c, db);
      var since = last ? U.daysSince(last) : U.daysSince(c.created_at);
      return { customer: c, last: last, days: since };
    }).filter(function (x) { return x.days !== null && x.days > days; }).sort(function (a, b) { return b.days - a.days; });
  };

  R.repeatCustomerRate = function (db) {
    var signed = live(db.contracts).filter(function (c) { return ['signed', 'active', 'completed'].indexOf(c.status) >= 0; });
    var g = U.groupBy(signed, 'customer_id');
    var ids = Object.keys(g), repeat = ids.filter(function (k) { return g[k].length > 1; });
    return { customers_with_contract: ids.length, repeat_customers: repeat.length, rate: ids.length ? U.round(repeat.length / ids.length * 100, 1) : null };
  };

  R.conversionProspectToOpp = function (db) {
    var prospects = live(db.customers).filter(function (c) { return c.status === 'prospect' || c.status === 'active'; });
    var withOpp = prospects.filter(function (c) { return live(db.opportunities).some(function (o) { return o.customer_id === c.id; }); });
    var pureProspects = live(db.customers).filter(function (c) { return c.status === 'prospect'; });
    var pureWith = pureProspects.filter(function (c) { return live(db.opportunities).some(function (o) { return o.customer_id === c.id; }); });
    return { prospects: pureProspects.length, with_opportunity: pureWith.length, rate: pureProspects.length ? U.round(pureWith.length / pureProspects.length * 100, 1) : null, all_customers: prospects.length, all_with_opp: withOpp.length };
  };

  R.conversionProposalToAward = function (db, range) {
    var submittedOppIds = {};
    live(db.proposals).forEach(function (p) { if (p.submitted_at) submittedOppIds[p.opportunity_id] = true; });
    var closed = live(db.opportunities).filter(function (o) { return submittedOppIds[o.id] && (STAGES.isWon(o.stage) || o.stage === 'lost') && inR(closedAt(o), range); });
    var won = closed.filter(function (o) { return STAGES.isWon(o.stage); });
    return { closed: closed.length, won: won.length, rate: closed.length ? U.round(won.length / closed.length * 100, 1) : null };
  };

  R.opportunitiesByRegion = function (db) { return R.pipelineBy(db, 'region', function (k) { return L.label('regions', k, root.I18N ? root.I18N.lang : 'ar'); }); };

  /* مؤشرات النظرة التنفيذية */
  R.overviewKpis = function (db, range) {
    var customers = live(db.customers);
    var opps = live(db.opportunities), props = live(db.proposals), contracts = live(db.contracts), acts = live(db.activities);
    var activeOpps = R.activeOpps(db);
    var wl = R.winLoss(db, range);
    var signed = contracts.filter(function (c) { return ['signed', 'active', 'completed'].indexOf(c.status) >= 0 && inR(c.signed_at, range); });
    var overdueActs = acts.filter(function (a) { return ENGINE.activityDue(a).key === 'overdue'; });
    var stuck = activeOpps.filter(function (o) { return ENGINE.opportunityFlags(o, db).some(function (f) { return f.key === 'stuck'; }); });
    var noNext = activeOpps.filter(function (o) { return !o.next_action || !o.next_action_due; });
    return {
      total_customers: customers.filter(function (c) { return c.status !== 'archived'; }).length,
      prospects: customers.filter(function (c) { return c.status === 'prospect'; }).length,
      existing: customers.filter(function (c) { return c.status === 'active'; }).length,
      active_opps: activeOpps.length,
      pipeline_value: U.sum(activeOpps, function (o) { return U.num(o.estimated_value) || 0; }),
      weighted_value: U.sum(activeOpps, function (o) { return MODEL.weightedValue(o) || 0; }),
      prop_awaiting_prep: opps.filter(function (o) { return o.stage === 'awaiting_proposal_prep'; }).length + props.filter(function (p) { return p.status === 'not_started' || p.status === 'awaiting_info'; }).length,
      prop_awaiting_approval: props.filter(function (p) { return p.status === 'awaiting_approval'; }).length,
      prop_submitted: props.filter(function (p) { return p.status === 'submitted' && inR(p.submitted_at, range); }).length,
      awaiting_decision: opps.filter(function (o) { return ['awaiting_award', 'preferred_bidder', 'proposal_submitted'].indexOf(o.stage) >= 0; }).length,
      signed_contracts: signed.length,
      awarded_value: U.sum(signed, function (c) { return U.num(c.contract_value) || 0; }),
      win_rate: wl.rate, won: wl.won, lost: wl.lost,
      overdue_followups: overdueActs.length,
      no_next_action: noNext.length,
      stuck: stuck.length,
      lists: { activeOpps: activeOpps, overdueActs: overdueActs, stuck: stuck, noNext: noNext, signed: signed, won: wl.won_items, lost: wl.lost_items }
    };
  };

  root.REPORTS = R;
})(typeof window !== 'undefined' ? window : globalThis);
