/* =====================================================================
   RULES ENGINE — مؤشرات شفافة بقواعد معلنة (لا تقييم آلي ولا ذكاء اصطناعي)
   ---------------------------------------------------------------------
   كل دالة تأخذ السجلات (وسياق db خفيف) وتعيد أعلامًا/قوائم قابلة للعرض.
   db = { customers, contacts, opportunities, proposals, contracts, activities, users, stage_history }
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, RULES = root.RULES, STAGES = root.STAGES, MODEL = root.MODEL, SEARCH = root.SEARCH, L = root.LOOKUPS;

  function active(arr) { return (arr || []).filter(function (r) { return !r.archived_at; }); }

  var E = {};

  /* ---------- الأنشطة: حالة الاستحقاق ---------- */
  E.activityDue = function (a) {
    if (!a || a.status !== 'planned') return { key: 'none' };
    var d = a.due_date || U.isoDate(a.at);
    var n = U.daysUntil(d);
    if (n === null) return { key: 'none' };
    if (n < 0) return { key: 'overdue', days: -n };
    if (n === 0) return { key: 'today', days: 0 };
    if (n <= RULES.reminders.due_soon_days) return { key: 'soon', days: n };
    return { key: 'upcoming', days: n };
  };
  E.isEscalated = function (a) {
    var d = E.activityDue(a);
    if (d.key !== 'overdue') return false;
    var pr = a.priority || 'medium';
    return RULES.reminders.escalate_overdue_priority.indexOf(pr) >= 0 && d.days > RULES.reminders.escalate_after_days;
  };

  /* ---------- الفرص: أعلام صحة المسار ---------- */
  E.opportunityFlags = function (opp, db) {
    var flags = [];
    if (!opp || opp.archived_at) return flags;
    var st = STAGES.get(opp.stage);
    if (!st) return flags;
    var isActive = STAGES.isActive(opp.stage);
    if (!isActive) return flags;
    var dis = MODEL.daysInStage(opp);
    if (st.max_days && dis !== null && dis > st.max_days * RULES.hygiene.stuck_factor) flags.push({ key: 'stuck', days: dis, limit: st.max_days });
    var lastAct = E.lastActivityDate(opp, db);
    var sinceAct = lastAct ? U.daysSince(lastAct) : U.daysSince(opp.created_at);
    if (sinceAct !== null && sinceAct > RULES.hygiene.no_activity_days) flags.push({ key: 'no_activity', days: sinceAct });
    if (!opp.next_action || !opp.next_action_due) flags.push({ key: 'no_next_action' });
    else if (U.daysUntil(opp.next_action_due) < 0) flags.push({ key: 'next_action_overdue', days: -U.daysUntil(opp.next_action_due) });
    if (opp.expected_award_date && U.daysUntil(opp.expected_award_date) < -RULES.hygiene.expected_award_passed_grace_days) flags.push({ key: 'award_passed', days: -U.daysUntil(opp.expected_award_date) });
    if (!opp.owner_id) flags.push({ key: 'no_owner' });
    var val = U.num(opp.estimated_value);
    if (val !== null && val >= RULES.hygiene.high_value_threshold && (!opp.next_action || !opp.next_action_due)) flags.push({ key: 'high_value_no_action' });
    if (val === null && st.order >= 4) flags.push({ key: 'missing_value' });
    if (st.order >= 8 && !opp.expected_award_date) flags.push({ key: 'missing_award_date' });
    /* عرض منتهي الصلاحية */
    var props = (db && db.proposals ? active(db.proposals) : []).filter(function (p) { return p.opportunity_id === opp.id; });
    var latest = U.sortBy(props, 'version_no', 'desc')[0];
    if (latest && latest.status === 'submitted') { var vu = MODEL.proposalValidUntil(latest); if (vu && U.daysUntil(vu) < -RULES.hygiene.proposal_expiry_grace_days) flags.push({ key: 'proposal_expired', days: -U.daysUntil(vu) }); }
    if (opp.submission_deadline && st.order < 11 && U.daysUntil(opp.submission_deadline) < 0) flags.push({ key: 'deadline_passed', days: -U.daysUntil(opp.submission_deadline) });
    return flags;
  };
  E.flagLabel = function (key, lang) {
    var m = {
      stuck: ['متوقفة في مرحلتها', 'Stuck in stage'], no_activity: ['بلا نشاط حديث', 'No recent activity'], no_next_action: ['بلا إجراء تالٍ', 'No next action'],
      next_action_overdue: ['الإجراء التالي متأخر', 'Next action overdue'], award_passed: ['تجاوز تاريخ الترسية المتوقع', 'Expected award passed'],
      no_owner: ['بلا مسؤول', 'No owner'], high_value_no_action: ['عالية القيمة وبلا إجراء', 'High value, no action'], missing_value: ['بلا قيمة تقديرية', 'Missing value'],
      missing_award_date: ['بلا تاريخ ترسية متوقع', 'Missing award date'], proposal_expired: ['عرض منتهي الصلاحية', 'Proposal expired'], deadline_passed: ['تجاوزت موعد التقديم', 'Deadline passed']
    };
    var e = m[key]; return e ? (lang === 'en' ? e[1] : e[0]) : key;
  };
  E.lastActivityDate = function (opp, db) {
    if (!db || !db.activities) return opp.last_activity_at || null;
    var best = null;
    db.activities.forEach(function (a) {
      if (a.archived_at || a.opportunity_id !== opp.id) return;
      if (a.status === 'cancelled') return;
      var d = a.status === 'done' ? (a.completed_at || a.at) : a.at;
      if (U.daysUntil(d) > 0) return;            // مجدول مستقبلًا لا يُعد نشاطًا حدث
      if (!best || d > best) best = d;
    });
    return best;
  };
  E.customerLastInteraction = function (cust, db) {
    var best = null;
    (db.activities || []).forEach(function (a) {
      if (a.archived_at || a.customer_id !== cust.id || a.status === 'cancelled') return;
      var d = a.status === 'done' ? (a.completed_at || a.at) : a.at;
      if (U.daysUntil(d) > 0) return;
      if (!best || d > best) best = d;
    });
    return best;
  };
  E.customerNextAction = function (cust, db) {
    var best = null;
    (db.activities || []).forEach(function (a) {
      if (a.archived_at || a.customer_id !== cust.id || a.status !== 'planned') return;
      var d = a.due_date || U.isoDate(a.at);
      if (!best || d < best.date) best = { date: d, activity: a };
    });
    (db.opportunities || []).forEach(function (o) {
      if (o.archived_at || o.customer_id !== cust.id || !o.next_action_due || !STAGES.isActive(o.stage)) return;
      if (!best || o.next_action_due < best.date) best = { date: o.next_action_due, opportunity: o };
    });
    return best;
  };
  /* الطرف المنتظَر منه الإجراء: من حقل waiting_on أو استنتاج من المرحلة */
  E.waitingSide = function (opp) {
    if (opp.waiting_on && opp.waiting_on !== 'auto') return opp.waiting_on;
    var st = STAGES.get(opp.stage);
    if (!st) return 'none';
    if (['proposal_submitted', 'awaiting_award', 'preferred_bidder', 'prequalification'].indexOf(opp.stage) >= 0) return 'customer';
    if (st.terminal || st.won) return 'none';
    return 'us';
  };

  /* ---------- العملاء ---------- */
  E.customerFlags = function (cust, db) {
    var flags = [];
    if (!cust || cust.archived_at) return flags;
    var contacts = (db.contacts || []).filter(function (c) { return c.customer_id === cust.id && !c.archived_at; });
    if (!cust.phone && !cust.email && !contacts.some(function (c) { return c.phone || c.email; })) flags.push({ key: 'missing_contact_details' });
    if (!cust.owner_id) flags.push({ key: 'no_owner' });
    if (!contacts.length) flags.push({ key: 'no_contacts' });
    var last = E.customerLastInteraction(cust, db);
    var since = last ? U.daysSince(last) : U.daysSince(cust.created_at);
    if (cust.status !== 'archived' && since !== null && since > RULES.hygiene.customer_no_interaction_days) flags.push({ key: 'needs_follow_up', days: since });
    var next = E.customerNextAction(cust, db);
    if (next && U.daysUntil(next.date) < 0) flags.push({ key: 'overdue_follow_up', days: -U.daysUntil(next.date) });
    return flags;
  };
  E.customerFlagLabel = function (key, lang) {
    var m = { missing_contact_details: ['بيانات تواصل ناقصة', 'Missing contact details'], no_owner: ['بلا مسؤول علاقة', 'No relationship owner'], no_contacts: ['بلا جهات اتصال', 'No contacts'], needs_follow_up: ['بلا تفاعل حديث', 'No recent interaction'], overdue_follow_up: ['متابعة متأخرة', 'Overdue follow-up'] };
    var e = m[key]; return e ? (lang === 'en' ? e[1] : e[0]) : key;
  };

  /* ---------- العروض ---------- */
  E.proposalDeadline = function (p) {
    if (!p || !p.submission_deadline) return { key: 'none' };
    var closed = ['submitted', 'accepted', 'rejected', 'expired', 'withdrawn', 'revised'].indexOf(p.status) >= 0;
    if (closed && p.submitted_at) return { key: 'done' };
    var n = U.daysUntil(p.submission_deadline);
    if (n < 0) return { key: 'overdue', days: -n };
    if (n <= 1) return { key: 'critical', days: n };
    if (n <= 3) return { key: 'soon', days: n };
    if (n <= 7) return { key: 'week', days: n };
    return { key: 'ok', days: n };
  };
  E.proposalNeedsAction = function (p) { var d = E.proposalDeadline(p); return d.key === 'overdue' || d.key === 'critical' || p.status === 'revision_requested' || p.status === 'awaiting_approval'; };

  /* ---------- جودة البيانات: ملخص المنصة ---------- */
  E.dataQuality = function (db) {
    var out = [];
    var cfg = RULES.data_quality;
    var customers = active(db.customers), contacts = active(db.contacts), opps = active(db.opportunities), props = active(db.proposals), contracts = active(db.contracts);
    function push(key, entity, recs) { if (cfg[key] !== false) out.push({ key: key, entity: entity, count: recs.length, records: recs }); }
    push('customer_missing_contact_details', 'customer', customers.filter(function (c) { return E.customerFlags(c, db).some(function (f) { return f.key === 'missing_contact_details'; }); }));
    push('customer_no_owner', 'customer', customers.filter(function (c) { return !c.owner_id; }));
    push('customer_no_contacts', 'customer', customers.filter(function (c) { return !contacts.some(function (k) { return k.customer_id === c.id; }); }));
    push('customer_overdue_follow_up', 'customer', customers.filter(function (c) { return E.customerFlags(c, db).some(function (f) { return f.key === 'overdue_follow_up'; }); }));
    var activeOpps = opps.filter(function (o) { return STAGES.isActive(o.stage); });
    push('opportunity_no_next_action', 'opportunity', activeOpps.filter(function (o) { return !o.next_action || !o.next_action_due; }));
    push('opportunity_missing_value', 'opportunity', activeOpps.filter(function (o) { return U.num(o.estimated_value) === null; }));
    push('opportunity_missing_award_date', 'opportunity', activeOpps.filter(function (o) { var s = STAGES.get(o.stage); return s && s.order >= 8 && !o.expected_award_date; }));
    push('opportunity_no_owner', 'opportunity', activeOpps.filter(function (o) { return !o.owner_id; }));
    push('proposal_missing_deadline', 'proposal', props.filter(function (p) { return !p.submission_deadline && ['not_started', 'awaiting_info', 'in_preparation', 'technical_review', 'commercial_review', 'awaiting_approval', 'ready'].indexOf(p.status) >= 0; }));
    push('contract_handover_incomplete', 'contract', contracts.filter(function (c) { return (c.status === 'signed' || c.status === 'active') && c.handover_status !== 'accepted'; }));
    push('contact_missing_details', 'contact', contacts.filter(function (k) { return !k.phone && !k.email; }));
    return out;
  };
  E.dataQualityLabel = function (key, lang) {
    var m = {
      customer_missing_contact_details: ['عملاء بلا بيانات تواصل', 'Customers without contact details'],
      customer_no_owner: ['عملاء بلا مسؤول علاقة', 'Customers without owner'],
      customer_no_contacts: ['عملاء بلا جهات اتصال', 'Customers without contacts'],
      customer_overdue_follow_up: ['عملاء بمتابعة متأخرة', 'Customers with overdue follow-up'],
      opportunity_no_next_action: ['فرص نشطة بلا إجراء تالٍ', 'Active opportunities without next action'],
      opportunity_missing_value: ['فرص بلا قيمة تقديرية', 'Opportunities without value'],
      opportunity_missing_award_date: ['فرص بلا تاريخ ترسية متوقع', 'Opportunities without expected award date'],
      opportunity_no_owner: ['فرص بلا مسؤول', 'Opportunities without owner'],
      proposal_missing_deadline: ['عروض بلا موعد تقديم محدّد', 'Proposals without deadline'],
      contract_handover_incomplete: ['عقود موقَّعة بلا حزمة تسليم مكتملة', 'Signed contracts with incomplete handover'],
      contact_missing_details: ['جهات اتصال بلا هاتف أو بريد إلكتروني', 'Contacts without phone or email']
    };
    var e = m[key]; return e ? (lang === 'en' ? e[1] : e[0]) : key;
  };

  /* ---------- كشف التكرار ---------- */
  E.findDuplicateCustomers = function (db, candidate) {
    var list = active(db.customers);
    var pairs = [];
    function keyEq(a, b, k) { var x = U.latinDigits(U.trim(a[k])), y = U.latinDigits(U.trim(b[k])); return x && y && x === y; }
    function compare(a, b) {
      var reasons = [];
      if (keyEq(a, b, 'cr_number')) reasons.push('cr');
      if (keyEq(a, b, 'unified_number')) reasons.push('unified');
      if (keyEq(a, b, 'vat_number')) reasons.push('vat');
      var nA = a.name_ar && b.name_ar ? SEARCH.similarity(a.name_ar, b.name_ar) : 0;
      var nE = a.name_en && b.name_en ? SEARCH.similarity(a.name_en, b.name_en) : 0;
      if (Math.max(nA, nE) >= RULES.duplicates.name_similarity) reasons.push('name');
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) reasons.push('email');
      if (a.phone && b.phone && U.normPhone(a.phone) === U.normPhone(b.phone)) reasons.push('phone');
      return reasons;
    }
    if (candidate) {
      list.forEach(function (b) { if (b.id === candidate.id) return; var r = compare(candidate, b); if (r.length) pairs.push({ a: candidate, b: b, reasons: r, strong: r.some(function (x) { return ['cr', 'unified', 'vat'].indexOf(x) >= 0; }) }); });
      return pairs;
    }
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) { var r = compare(list[i], list[j]); if (r.length) pairs.push({ a: list[i], b: list[j], reasons: r, strong: r.some(function (x) { return ['cr', 'unified', 'vat'].indexOf(x) >= 0; }) }); }
    return pairs;
  };
  E.findDuplicateContacts = function (db, candidate) {
    var list = active(db.contacts), pairs = [];
    function compare(a, b) {
      var reasons = [];
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) reasons.push('email');
      if (a.phone && b.phone && U.normPhone(a.phone) === U.normPhone(b.phone)) reasons.push('phone');
      if (a.full_name && b.full_name && a.customer_id === b.customer_id && SEARCH.similarity(a.full_name, b.full_name) >= RULES.duplicates.name_similarity) reasons.push('name');
      return reasons;
    }
    if (candidate) { list.forEach(function (b) { if (b.id === candidate.id) return; var r = compare(candidate, b); if (r.length) pairs.push({ a: candidate, b: b, reasons: r }); }); return pairs; }
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) { var r = compare(list[i], list[j]); if (r.length) pairs.push({ a: list[i], b: list[j], reasons: r }); }
    return pairs;
  };

  /* ---------- التنبيهات المجمّعة لمستخدم (تُحسب عند العرض) ---------- */
  E.alertsFor = function (user, db, perms) {
    var out = [];
    var mine = function (r) { return !user || !r || r.owner_id === user.id || (Array.isArray(r.team_ids) && r.team_ids.indexOf(user.id) >= 0); };
    active(db.activities).forEach(function (a) {
      if (a.status !== 'planned') return;
      var d = E.activityDue(a);
      if ((d.key === 'overdue' || d.key === 'today') && (mine(a) || (perms && perms.all))) out.push({ kind: d.key === 'overdue' ? 'activity_overdue' : 'activity_today', entity: 'activity', id: a.id, record: a, days: d.days, escalated: E.isEscalated(a) });
    });
    active(db.proposals).forEach(function (p) {
      var d = E.proposalDeadline(p);
      if ((d.key === 'overdue' || d.key === 'critical' || d.key === 'soon') && (mine(p) || (perms && perms.all))) out.push({ kind: 'proposal_deadline', entity: 'proposal', id: p.id, record: p, days: d.days, level: d.key });
    });
    active(db.opportunities).forEach(function (o) {
      if (!STAGES.isActive(o.stage) || !(mine(o) || (perms && perms.all))) return;
      var f = E.opportunityFlags(o, db);
      if (f.some(function (x) { return x.key === 'next_action_overdue'; })) out.push({ kind: 'opp_next_overdue', entity: 'opportunity', id: o.id, record: o });
      if (f.some(function (x) { return x.key === 'no_next_action'; })) out.push({ kind: 'opp_no_next', entity: 'opportunity', id: o.id, record: o });
    });
    return out;
  };

  /* ---------- المناسبات القادمة ---------- */
  E.upcomingOccasions = function (occasions, year, hijri) {
    var out = [];
    var H = hijri || root.HIJRI;
    (occasions || []).forEach(function (o) {
      if (!o.enabled || !o.date || o.date.type === 'event') return;
      var dates = [];
      if (o.date.type === 'gregorian') { dates.push(new Date(year, o.date.month - 1, o.date.day)); dates.push(new Date(year + 1, o.date.month - 1, o.date.day)); }
      else if (o.date.type === 'hijri' && H) { dates = H.gregorianDatesFor(o.date.month, o.date.day, year).concat(H.gregorianDatesFor(o.date.month, o.date.day, year + 1)); }
      dates.forEach(function (d) { out.push({ occasion: o, date: U.isoDate(d), days: U.daysUntil(d), prep_start: U.isoDate(U.addDays(d, -(o.prep_days || 7))) }); });
    });
    return U.sortBy(out, 'date');
  };

  root.ENGINE = E;
})(typeof window !== 'undefined' ? window : globalThis);
