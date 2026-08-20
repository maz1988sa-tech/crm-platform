/* =====================================================================
   DEMO DATA — بيانات تجريبية مُصطنعة بالكامل (للتطوير والعرض فقط)
   ---------------------------------------------------------------------
   - كل الأسماء والأرقام والقيم خيالية ولا تمثّل عملاء أو موظفين أو مشاريع حقيقية.
   - كل سجل يحمل origin='demo' ووسم demo=true؛ يمكن حذفها دفعة واحدة (DEMO.purge).
   - مولّد ببذرة ثابتة → نفس البيانات في كل تشغيل (قابل لإعادة الإنتاج في الاختبارات).
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, STAGES = root.STAGES, MODEL = root.MODEL, L = root.LOOKUPS, RULES = root.RULES;

  var USERS = [
    { id: 'u_admin',   email: 'demo.admin@example.com',     name_ar: 'م. ماجد السويلم',           name_en: 'Eng. Majed Al-Suwailem',        role: 'system_admin' },
    { id: 'u_bdm',     email: 'demo.bdm@example.com',       name_ar: 'م. فهد العتيبي',            name_en: 'Eng. Fahad Al-Otaibi',       role: 'bd_manager' },
    { id: 'u_bd1',     email: 'demo.bd1@example.com',       name_ar: 'سلطان الحربي',              name_en: 'Sultan Al-Harbi',            role: 'bd_employee' },
    { id: 'u_bd2',     email: 'demo.bd2@example.com',       name_ar: 'نورة القحطاني',             name_en: 'Noura Al-Qahtani',           role: 'bd_employee' },
    { id: 'u_bd3',     email: 'demo.bd3@example.com',       name_ar: 'عبدالله الشهري',            name_en: 'Abdullah Al-Shehri',         role: 'bd_employee' },
    { id: 'u_pm',      email: 'demo.proposals@example.com', name_ar: 'م. ريم الدوسري',            name_en: 'Eng. Reem Al-Dosari',        role: 'proposal_manager' },
    { id: 'u_com',     email: 'demo.commercial@example.com', name_ar: 'خالد المطيري',             name_en: 'Khalid Al-Mutairi',          role: 'commercial_reviewer' },
    { id: 'u_ctr',     email: 'demo.contracts@example.com', name_ar: 'أ. هند الزهراني',           name_en: 'Hind Al-Zahrani',            role: 'contract_reviewer' },
    { id: 'u_exec',    email: 'demo.exec@example.com',      name_ar: 'د. وليد الراجحي',           name_en: 'Dr. Waleed Al-Rajhi',                 role: 'executive_viewer' },
    { id: 'u_ro',      email: 'demo.viewer@example.com',    name_ar: 'سامي العبدلي',              name_en: 'Sami Al-Abdali',    role: 'readonly_viewer' }
  ];
  var BD = ['u_bd1', 'u_bd2', 'u_bd3', 'u_bdm'];

  /* أسماء منشآت خيالية */
  var ORG_A = ['الأفق', 'الواحة', 'النخيل', 'الرمال الذهبية', 'المستقبل', 'الرواد', 'السواعد', 'البنيان', 'المدى', 'الصفوة', 'الإتقان', 'الريادة', 'الجزيرة الحديثة', 'الخليج الأخضر', 'الهدف', 'التقدم', 'السلام', 'الارتقاء', 'الحصن', 'الشروق',
               'الأصالة', 'المعمار', 'الديار', 'الرابية', 'النهضة', 'العمران', 'السنابل', 'الطموح', 'المنارة', 'الأمانة', 'الينابيع', 'الفجر', 'القمة', 'الوفاء', 'الأندلس', 'الميناء', 'الروابي', 'السهول', 'البحيرة', 'الكثبان'];
  var ORG_A_EN = ['Al Ufuq', 'Al Waha', 'Al Nakheel', 'Golden Sands', 'Al Mustaqbal', 'Al Ruwad', 'Al Sawaed', 'Al Bunyan', 'Al Mada', 'Al Safwa', 'Al Itqan', 'Al Riyada', 'Modern Peninsula', 'Green Gulf', 'Al Hadaf', 'Al Taqaddum', 'Al Salam', 'Al Irtiqa', 'Al Hisn', 'Al Shurooq',
                  'Al Asalah', 'Al Memar', 'Al Diyar', 'Al Rabiah', 'Al Nahda', 'Al Omran', 'Al Sanabel', 'Al Tumooh', 'Al Manara', 'Al Amanah', 'Al Yanabee', 'Al Fajr', 'Al Qimmah', 'Al Wafa', 'Al Andalus', 'Al Mina', 'Al Rawabi', 'Al Suhool', 'Al Buhayrah', 'Al Kuthban'];
  var ORG_TYPE = {
    government:      [['هيئة تطوير {x}', '{x} Development Authority'], ['الإدارة العامة لمشاريع {x}', 'General Directorate of {x} Projects'], ['بلدية {x}', '{x} Municipality']],
    semi_government: [['شركة {x} القابضة', '{x} Holding'], ['مؤسسة {x} للتنمية', '{x} Development Foundation']],
    private:         [['شركة {x} للاستثمار', '{x} Investment Co.'], ['مجموعة {x} التجارية', '{x} Trading Group'], ['شركة {x} للصناعات', '{x} Industries']],
    developer:       [['شركة {x} للتطوير العقاري', '{x} Real Estate Development'], ['{x} العقارية', '{x} Properties']],
    consultant:      [['مكتب {x} للاستشارات الهندسية', '{x} Engineering Consultants'], ['{x} للتصميم والإشراف', '{x} Design & Supervision']],
    other:           [['جمعية {x} التعاونية', '{x} Cooperative Society']]
  };
  var FIRST = ['محمد', 'أحمد', 'عبدالعزيز', 'سعد', 'خالد', 'فيصل', 'ناصر', 'تركي', 'بندر', 'ماجد', 'سارة', 'هيفاء', 'لمياء', 'منيرة', 'العنود', 'عبدالرحمن', 'يوسف', 'إبراهيم', 'عمر', 'مشعل'];
  var LAST = ['العنزي', 'الغامدي', 'البقمي', 'السبيعي', 'الرشيدي', 'القرني', 'المالكي', 'الجهني', 'الزهراني', 'العمري', 'الشمري', 'الحارثي', 'البلوي', 'الخالدي', 'السهلي'];
  var POSITIONS = [['مدير المشاريع', 'Projects Manager', 'technical'], ['مدير المشتريات', 'Procurement Manager', 'procurement'], ['المدير التنفيذي', 'Executive Director', 'decision_maker'], ['مدير العقود', 'Contracts Manager', 'procurement'], ['مهندس مشروع', 'Project Engineer', 'technical'], ['المدير المالي', 'Finance Manager', 'finance'], ['مدير الإدارة الهندسية', 'Engineering Director', 'decision_maker'], ['مهندس موقع', 'Site Engineer', 'site'], ['مستشار المالك', 'Owner’s Representative', 'influencer'], ['مدير التطوير', 'Development Manager', 'decision_maker']];
  var PROJ_WORDS = [['مبنى إداري', 'Office building'], ['مجمع سكني', 'Residential compound'], ['مستودعات لوجستية', 'Logistics warehouses'], ['مركز صحي', 'Health centre'], ['مدرسة نموذجية', 'Model school'], ['شبكة طرق داخلية', 'Internal roads network'], ['تأهيل مبنى', 'Building rehabilitation'], ['محطة معالجة', 'Treatment plant'], ['مركز تجاري', 'Commercial centre'], ['مقر رئيسي', 'Headquarters'], ['فندق ', 'Hotel'], ['جامع', 'Mosque'], ['تجهيز مكاتب', 'Office fit-out'], ['منطقة صناعية — مرحلة 1', 'Industrial zone — phase 1'], ['بنية تحتية لحي سكني', 'District infrastructure']];
  var NEXT_ACTIONS = ['الاتصال بالعميل لتأكيد موعد الاجتماع', 'إرسال خطاب الاهتمام الرسمي', 'متابعة استلام كراسة الشروط', 'تنسيق زيارة الموقع مع فريق التقدير', 'إرسال الاستيضاحات الفنية', 'متابعة قرار لجنة الترسية', 'تجهيز الضمان الابتدائي', 'مراجعة مسودة العقد مع المراجع القانوني', 'اجتماع تفاوض على البنود التجارية', 'إرسال العرض المحدّث بعد التعديلات'];
  var PURPOSES = ['تعريف بالشركة وسابقة الأعمال', 'مناقشة متطلبات المشروع', 'زيارة الموقع والوقوف على الحالة', 'استيضاح بنود كراسة الشروط', 'تفاوض على الشروط التجارية', 'متابعة حالة العرض', 'تسليم العرض الفني والمالي', 'تنسيق داخلي لتسعير العرض', 'مناقشة مسودة العقد', 'تهنئة بمناسبة رسمية'];
  var OUTCOMES = ['تم الاتفاق على الخطوة التالية', 'العميل طلب مزيدًا من التفاصيل', 'بانتظار رد العميل', 'تم تحديد موعد الاجتماع القادم', 'تم استلام المستندات المطلوبة', 'العميل أبدى اهتمامًا مبدئيًا'];

  function fill(tpl, x) { return tpl.replace('{x}', x); }

  function build(seed, now) {
    var rnd = U.rng(seed || 20260819);
    var TODAY = now ? U.parseDate(now) : U.now();
    function dayAgo(n) { return U.isoDate(U.addDays(TODAY, -n)); }
    function dayAhead(n) { return U.isoDate(U.addDays(TODAY, n)); }
    function dtAgo(n, h) { var d = U.addDays(TODAY, -n); d.setHours(h || rnd.int(8, 16), rnd.pick([0, 15, 30, 45]), 0, 0); return U.isoDateTime(d); }
    function dtAhead(n, h) { var d = U.addDays(TODAY, n); d.setHours(h || rnd.int(8, 16), rnd.pick([0, 30]), 0, 0); return U.isoDateTime(d); }
    var Y = TODAY.getFullYear();
    var seq = { CUS: 0, CON: 0, OPP: 0, PRP: 0, CTR: 0, PRJ: 0, ACT: 0, CMP: 0, APR: 0 };
    function nid(p) { seq[p]++; return U.refNo(p, Y, seq[p]); }
    var db = { users: U.clone(USERS), customers: [], contacts: [], opportunities: [], stage_history: [], proposals: [], contracts: [], projects: [], activities: [], campaigns: [], approvals: [], audit_log: [], saved_views: [], documents: [], import_jobs: [], duplicates: [], seq: seq };
    db.users.forEach(function (u) { u.active = true; u.demo = true; u.created_at = dtAgo(200); });

    function stamp(rec, uid, daysAgo) { var c = dtAgo(daysAgo !== undefined ? daysAgo : rnd.int(5, 180)); rec.created_at = c; rec.created_by = uid; rec.updated_at = c; rec.updated_by = uid; rec.origin = 'demo'; rec.demo = true; rec.version = 1; rec.archived_at = null; return rec; }

    /* ---- العملاء ---- */
    var types = ['government', 'government', 'semi_government', 'private', 'private', 'developer', 'developer', 'consultant', 'other'];
    var regions = L.regions;
    for (var i = 0; i < 40; i++) {
      var type = types[i % types.length];
      var tpl = rnd.pick(ORG_TYPE[type]);
      var wi = i % ORG_A.length;
      var nameAr = fill(tpl[0], ORG_A[wi]);
      var nameEn = fill(tpl[1], ORG_A_EN[wi]);
      var region = i < 14 ? regions[0] : rnd.pick(regions.slice(0, 6));
      var owner = BD[i % 3];
      var status = i < 8 ? 'prospect' : (i < 34 ? 'active' : (i < 38 ? 'dormant' : 'prospect'));
      var c = Object.assign(MODEL.defaults('customer', owner), {
        id: nid('CUS'), name_ar: nameAr, name_en: nameEn, customer_type: type,
        sector: rnd.pick(['government_buildings', 'infrastructure', 'housing', 'commercial', 'healthcare', 'education', 'industrial', 'hospitality', 'energy_utilities', 'transport']),
        classification: i % 7 === 0 ? 'A' : (i % 3 === 0 ? 'B' : 'C'),
        cr_number: type === 'government' ? null : String(1010000000 + rnd.int(100000, 899999)),
        unified_number: String(7000000000 + rnd.int(1000000, 8999999)),
        vat_number: type === 'government' ? null : ('3' + String(rnd.int(10000000, 99999999)) + String(rnd.int(100000, 999999))),
        website: type === 'government' ? null : ('www.' + ORG_A_EN[wi].toLowerCase().replace(/\s+/g, '') + '-demo.example'),
        phone: i % 9 === 4 ? null : ('011' + rnd.int(2000000, 4999999)),
        email: i % 9 === 4 ? null : ('info@' + ORG_A_EN[wi].toLowerCase().replace(/\s+/g, '') + '-demo.example'),
        address: 'طريق الملك فهد، حي ' + rnd.pick(['العليا', 'الملقا', 'الياسمين', 'السليمانية', 'النخيل', 'الروضة']),
        region: region.key, city: region.cities[0].key,
        status: status, source: rnd.pick(L.customer_sources).key,
        owner_id: i % 11 === 10 ? null : owner, secondary_owner_id: i % 4 === 0 ? 'u_bdm' : null,
        relationship_strength: rnd.pick(['weak', 'medium', 'medium', 'strong']), strategic_importance: i % 7 === 0 ? 'high' : rnd.pick(['low', 'medium', 'medium']),
        preferred_language: i % 8 === 0 ? 'en' : 'ar',
        procurement_portal: type === 'government' || type === 'semi_government' ? 'منصة اعتماد' : (rnd.chance(0.3) ? 'بوابة الموردين لدى العميل' : null),
        vendor_registration: type === 'government' || type === 'semi_government' ? rnd.pick(['registered', 'registered', 'in_progress', 'expired']) : 'not_required',
        prequalification: rnd.pick(['not_required', 'qualified', 'qualified', 'in_progress', 'pending']),
        confidentiality: i % 13 === 0 ? 'restricted' : 'internal',
        notes: i % 5 === 0 ? 'عميل ذو مشاريع متكررة؛ يفضّل التواصل عبر مدير المشاريع.' : '',
        tags: i % 4 === 0 ? ['مشاريع متكررة'] : (i % 4 === 1 ? ['رؤية 2030'] : []),
        potential_value: rnd.chance(0.5) ? rnd.int(5, 120) * 1000000 : null,
        known_projects: rnd.chance(0.4) ? 'مشروع توسعة المقر الرئيسي (منجز 2024)؛ برنامج صيانة سنوي' : ''
      });
      stamp(c, owner, rnd.int(30, 400));
      db.customers.push(c);
    }
    /* تكرار مقصود لاختبار كشف التكرار */
    var dupSrc = db.customers[5];
    var dup = Object.assign(MODEL.defaults('customer', 'u_bd2'), U.clone(dupSrc), { id: nid('CUS'), name_ar: dupSrc.name_ar.replace('شركة', 'شركه').replace('', ''), name_en: dupSrc.name_en + ' Ltd', status: 'prospect', owner_id: 'u_bd2', secondary_owner_id: null, email: null, phone: '0112223344' });
    stamp(dup, 'u_bd2', 12); db.customers.push(dup);

    /* ---- جهات الاتصال ---- */
    db.customers.forEach(function (c, ci) {
      var n = ci === 9 ? 0 : rnd.int(1, 4);
      for (var k = 0; k < n; k++) {
        var pos = rnd.pick(POSITIONS), fn = rnd.pick(FIRST), ln = rnd.pick(LAST);
        var ct = Object.assign(MODEL.defaults('contact', c.owner_id), {
          id: nid('CON'), customer_id: c.id, full_name: (pos[2] === 'technical' || pos[2] === 'site' ? 'م. ' : '') + fn + ' ' + ln, position: pos[0], department: rnd.pick(['الإدارة الهندسية', 'المشتريات والعقود', 'إدارة المشاريع', 'الإدارة العليا', 'الشؤون المالية']),
          seniority: pos[2] === 'decision_maker' ? 'executive' : rnd.pick(['senior', 'middle', 'staff']), roles: [pos[2]].concat(rnd.chance(0.3) ? ['influencer'] : []),
          phone: rnd.chance(0.85) ? '05' + rnd.int(10000000, 99999999) : null, email: rnd.chance(0.8) ? (fn.length + '.' + ln.length + k + '@' + (c.email ? c.email.split('@')[1] : 'contact-demo.example')).replace(/^/, 'c' + ci) : null,
          preferred_channel: rnd.pick(['phone', 'email', 'meeting']), preferred_language: c.preferred_language,
          last_contact_at: rnd.chance(0.7) ? dayAgo(rnd.int(1, 90)) : null, next_follow_up: rnd.chance(0.4) ? (rnd.chance(0.3) ? dayAgo(rnd.int(1, 10)) : dayAhead(rnd.int(1, 30))) : null,
          notes: rnd.chance(0.3) ? 'يفضّل الاجتماعات الصباحية.' : '', greeting_opt_out: rnd.chance(0.08), active: rnd.chance(0.92), is_primary: k === 0
        });
        stamp(ct, c.owner_id || 'u_bdm', rnd.int(10, 300));
        db.contacts.push(ct);
      }
    });

    /* ---- الفرص ---- */
    var stageKeys = STAGES.list.map(function (s) { return s.key; });
    var distribution = [
      'potential_identified', 'initial_contact', 'initial_contact', 'qualification', 'opportunity_identified', 'opportunity_identified', 'opportunity_identified', 'prequalification', 'requirements_received', 'requirements_received',
      'site_visit', 'awaiting_proposal_prep', 'awaiting_proposal_prep', 'proposal_in_preparation', 'proposal_in_preparation', 'proposal_in_preparation', 'internal_review', 'internal_review', 'proposal_submitted', 'proposal_submitted', 'proposal_submitted', 'proposal_submitted',
      'technical_clarification', 'commercial_clarification', 'negotiation', 'negotiation', 'preferred_bidder', 'awaiting_award', 'awaiting_award', 'awarded', 'awarded', 'contract_review', 'contract_signed', 'contract_signed', 'handover', 'handover',
      'on_hold', 'on_hold', 'lost', 'lost', 'lost', 'lost', 'lost', 'cancelled'
    ];
    var custs = db.customers.filter(function (c) { return c.status !== 'archived'; });
    for (var o = 0; o < 70; o++) {
      var stage = distribution[o % distribution.length];
      var st = STAGES.get(stage);
      var cust = custs[(o * 7) % custs.length];
      var cts = db.contacts.filter(function (k) { return k.customer_id === cust.id; });
      var pw = rnd.pick(PROJ_WORDS);
      var owner = cust.owner_id || BD[o % 3];
      var created = rnd.int(20, 300);
      var entered = st.terminal || st.won ? rnd.int(2, 60) : Math.min(created - 1, rnd.int(1, Math.round((st.max_days || 30) * 1.15)));
      if (o % 9 === 0 && !st.terminal) entered = Math.min(created - 1, (st.max_days || 30) + rnd.int(5, 40));   // عالقة
      var value = rnd.chance(0.9) ? rnd.int(1, 60) * (rnd.chance(0.7) ? 1000000 : 2500000) : null;
      if (o % 10 === 3) value = rnd.int(60, 180) * 1000000;   // عالية القيمة
      var noNext = o % 6 === 5 && !st.terminal;
      var opp = Object.assign(MODEL.defaults('opportunity', owner), {
        id: nid('OPP'), customer_id: cust.id, main_contact_id: cts.length ? cts[0].id : null,
        name: pw[0] + ' — ' + (cust.name_ar.length > 28 ? cust.name_ar.slice(0, 26) + '…' : cust.name_ar), project_name: pw[0] + ' ' + rnd.pick(['المرحلة الأولى', 'المرحلة الثانية', '', '', 'التوسعة']),
        description: 'أعمال إنشاء وتنفيذ ' + pw[0] + ' بمساحة تقديرية ' + rnd.int(2, 45) * 1000 + ' م²، شاملة الأعمال المدنية والكهروميكانيكية.',
        project_type: rnd.pick(['buildings', 'buildings', 'infrastructure', 'fitout', 'renovation', 'roads', 'mep', 'industrial', 'design_build']), sector: cust.sector,
        region: cust.region, city: cust.city, source: cust.customer_type === 'government' ? 'etimad' : rnd.pick(['invitation', 'existing_customer', 'referral', 'market_intel', 'consultant']),
        tender_ref: st.order >= 6 ? (cust.customer_type === 'government' ? 'T-' + Y + '-' + rnd.int(1000, 9999) : 'RFP-' + rnd.int(100, 999)) : null,
        estimated_value: value, expected_margin_pct: value ? rnd.int(6, 18) : null, probability: st.probability + (rnd.chance(0.3) ? rnd.int(-5, 10) : 0),
        stage: stage, stage_entered_at: dayAgo(entered), expected_award_date: st.order >= 6 && o % 8 !== 2 ? (o % 8 === 1 ? dayAgo(rnd.int(3, 40)) : dayAhead(rnd.int(10, 200))) : null,
        submission_deadline: st.order >= 6 && st.order <= 16 ? (st.order <= 10 ? dayAhead(rnd.int(-3, 30)) : dayAgo(rnd.int(5, 60))) : null,
        competitors: rnd.chance(0.4) ? 'مقاول محلي (أ)، مقاول محلي (ب)' : null, owner_id: o % 15 === 14 ? null : owner, team_ids: rnd.chance(0.5) ? ['u_pm'] : [],
        next_action: noNext ? null : rnd.pick(NEXT_ACTIONS), next_action_due: noNext ? null : (o % 5 === 0 ? dayAgo(rnd.int(1, 12)) : dayAhead(rnd.int(0, 20))),
        risk_level: rnd.pick(['low', 'medium', 'medium', 'high']), priority: value && value > 50000000 ? 'high' : rnd.pick(['low', 'medium', 'medium', 'high']),
        required_documents: st.order >= 6 ? [{ key: 'cr', received: true }, { key: 'classification', received: true }, { key: 'bid_bond', received: st.order >= 11 }, { key: 'technical', received: st.order >= 11 }, { key: 'commercial', received: st.order >= 11 }] : [],
        loss_reason: stage === 'lost' ? rnd.pick(['price', 'price', 'technical', 'competitor_relationship', 'budget_cancelled', 'late_submission']) : null,
        lessons_learned: stage === 'lost' ? 'فارق السعر مع الفائز بلغ نحو 7%؛ يلزم مراجعة افتراضات المواد والقوى العاملة.' : null,
        notes: rnd.chance(0.3) ? 'الفرصة مرتبطة ببرنامج توسعة متعدد المراحل.' : '',
        expected_start_date: st.order >= 8 ? dayAhead(rnd.int(30, 240)) : null, expected_duration_months: st.order >= 8 ? rnd.pick([6, 9, 12, 18, 24, 36]) : null,
        payment_terms: st.order >= 8 ? rnd.pick(['monthly_ipc', 'advance_ipc', 'milestones']) : null, retention_pct: st.order >= 8 ? 10 : null, warranty_months: st.order >= 8 ? 12 : null,
        bid_bond_required: cust.customer_type === 'government' && st.order >= 6, bid_bond_pct: cust.customer_type === 'government' && st.order >= 6 ? 1 : null,
        vat_treatment: 'standard', confidentiality: cust.confidentiality, waiting_on: ['proposal_submitted', 'awaiting_award', 'preferred_bidder'].indexOf(stage) >= 0 ? 'customer' : 'us',
        closed_at: (st.terminal || st.won) ? dayAgo(entered) : null
      });
      stamp(opp, owner, created);
      db.opportunities.push(opp);

      /* سجل المراحل: مسار متدرج حتى المرحلة الحالية */
      var path = [];
      var startIdx = rnd.int(0, 3);
      for (var s = startIdx; s < STAGES.list.length; s++) {
        var sk = STAGES.list[s];
        if (sk.parked || sk.terminal) continue;
        if (sk.order > st.order && !(st.terminal || st.parked)) break;
        if ((st.terminal || st.parked) && sk.order > Math.min(16, 5 + rnd.int(0, 10))) break;
        if (rnd.chance(0.35) && sk.order < st.order) continue;   // تخطّي مراحل
        path.push(sk.key);
      }
      if (!path.length || (path[path.length - 1] !== stage && !(st.terminal || st.parked))) path.push(stage);
      if (st.terminal || st.parked) path.push(stage);
      var t = created - 1;
      var prev = null;
      path.forEach(function (sk2, pi) {
        var stepDays = Math.max(1, Math.floor((created - entered) / Math.max(1, path.length - 1)));
        var when = pi === path.length - 1 ? entered : Math.max(entered + 1, t - stepDays * pi);
        db.stage_history.push({ id: U.uid('sh'), opportunity_id: opp.id, from_stage: prev, to_stage: sk2, changed_by: owner, changed_at: dtAgo(when), reason: sk2 === 'lost' ? (L.label('loss_reasons', opp.loss_reason, 'ar')) : (sk2 === 'on_hold' ? 'تأجيل من العميل لحين اعتماد الميزانية' : (pi === 0 ? 'إنشاء الفرصة' : null)), note: null });
        prev = sk2;
      });
    }

    /* ---- العروض ---- */
    db.opportunities.forEach(function (opp, oi) {
      var st = STAGES.get(opp.stage);
      if (st.order < 8 && !st.terminal && !st.parked) return;
      if ((st.terminal || st.parked) && rnd.chance(0.35)) return;
      var versions = (st.order >= 13 && st.order <= 16) || rnd.chance(0.25) ? 2 : 1;
      var status;
      if (opp.stage === 'awaiting_proposal_prep') status = rnd.pick(['not_started', 'awaiting_info']);
      else if (opp.stage === 'proposal_in_preparation') status = rnd.pick(['in_preparation', 'technical_review', 'commercial_review']);
      else if (opp.stage === 'internal_review') status = rnd.pick(['awaiting_approval', 'ready']);
      else if (opp.stage === 'proposal_submitted' || opp.stage === 'awaiting_award' || opp.stage === 'preferred_bidder') status = 'submitted';
      else if (opp.stage === 'technical_clarification' || opp.stage === 'commercial_clarification') status = rnd.pick(['submitted', 'revision_requested']);
      else if (opp.stage === 'negotiation') status = rnd.pick(['submitted', 'revised']);
      else if (st.won) status = 'accepted';
      else if (opp.stage === 'lost') status = rnd.pick(['rejected', 'rejected', 'expired']);
      else if (opp.stage === 'cancelled') status = 'withdrawn';
      else status = 'submitted';
      var submittedFlag = ['submitted', 'revision_requested', 'revised', 'accepted', 'rejected', 'expired', 'withdrawn'].indexOf(status) >= 0;
      var baseValue = opp.estimated_value ? Math.round(opp.estimated_value * (0.92 + rnd() * 0.12) / 1000) * 1000 : null;
      for (var v = 1; v <= versions; v++) {
        var isLast = v === versions;
        var pStatus = isLast ? status : 'revised';
        var pr = Object.assign(MODEL.defaults('proposal', 'u_pm'), {
          id: v === 1 ? nid('PRP') : null, opportunity_id: opp.id, version_no: v,
          technical_status: ['not_started', 'awaiting_info'].indexOf(pStatus) >= 0 ? 'not_started' : (pStatus === 'in_preparation' ? 'in_progress' : (pStatus === 'technical_review' ? 'in_review' : 'approved')),
          commercial_status: ['not_started', 'awaiting_info', 'in_preparation', 'technical_review'].indexOf(pStatus) >= 0 ? (pStatus === 'in_preparation' ? 'in_progress' : 'not_started') : (pStatus === 'commercial_review' ? 'in_review' : 'approved'),
          status: pStatus, owner_id: rnd.pick(['u_pm', 'u_pm', 'u_bd1', 'u_bd2']), reviewer_ids: ['u_com'].concat(rnd.chance(0.5) ? ['u_bdm'] : []),
          approval_status: pStatus === 'awaiting_approval' ? 'pending' : (['not_started', 'awaiting_info', 'in_preparation', 'technical_review', 'commercial_review'].indexOf(pStatus) >= 0 ? 'not_required' : 'approved'),
          submission_deadline: opp.submission_deadline || (submittedFlag ? dayAgo(rnd.int(10, 90)) : dayAhead(rnd.int(-2, 25))),
          submitted_at: submittedFlag ? dayAgo(rnd.int(5, 80) + (versions - v) * 10) : null, submission_method: submittedFlag ? (opp.source === 'etimad' ? 'portal' : rnd.pick(['email', 'hand_delivery', 'portal'])) : null,
          proposed_value: baseValue ? Math.round(baseValue * (v === 1 ? 1 : 0.97)) : null, vat_treatment: 'standard', validity_days: 90,
          discount_pct: v > 1 ? rnd.pick([2, 3, 5, 7]) : 0,
          attachments: submittedFlag ? [{ name: 'العرض الفني.pdf', ref: 'DMS-' + rnd.int(10000, 99999) }, { name: 'العرض المالي.pdf', ref: 'DMS-' + rnd.int(10000, 99999) }] : [],
          clarifications: pStatus === 'revision_requested' || opp.stage === 'technical_clarification' ? [{ at: dayAgo(rnd.int(1, 10)), from: 'العميل', question: 'توضيح منهجية تنفيذ الأعمال الكهروميكانيكية ومدة التوريد.', answer: rnd.chance(0.5) ? 'تم الرد بخطاب رسمي مرفق.' : '', status: rnd.chance(0.5) ? 'answered' : 'open' }] : [],
          comments: [{ at: dtAgo(rnd.int(1, 30)), by: 'u_com', text: 'يرجى التأكد من تضمين أسعار المواد المحدّثة.' }],
          result: pStatus === 'accepted' ? 'accepted' : (pStatus === 'rejected' ? 'rejected' : (pStatus === 'expired' ? 'expired' : (pStatus === 'withdrawn' ? 'withdrawn' : 'pending'))),
          notes: ''
        });
        if (v > 1) pr.id = db.proposals[db.proposals.length - 1].id;   // نفس الرقم، نسخة أعلى
        stamp(pr, 'u_pm', rnd.int(5, 100) + (versions - v) * 12);
        if (pr.submitted_at && pr.submitted_at < U.isoDate(pr.created_at)) pr.created_at = dtAgo(U.daysSince(pr.submitted_at) + rnd.int(7, 25));
        db.proposals.push(pr);
      }
    });

    /* ---- العقود والمشاريع ---- */
    db.opportunities.forEach(function (opp) {
      var st = STAGES.get(opp.stage);
      if (!st.won || opp.stage === 'awarded') return;
      var status = opp.stage === 'contract_review' ? rnd.pick(['under_review', 'negotiation']) : (opp.stage === 'contract_signed' ? 'signed' : 'active');
      var acceptedProp = db.proposals.filter(function (p) { return p.opportunity_id === opp.id; }).sort(function (a, b) { return b.version_no - a.version_no; })[0];
      var ctr = Object.assign(MODEL.defaults('contract', 'u_ctr'), {
        id: nid('CTR'), opportunity_id: opp.id, customer_id: opp.customer_id, proposal_id: acceptedProp ? acceptedProp.id : null,
        contract_ref: 'C/' + Y + '/' + rnd.int(100, 999), status: status,
        contract_value: acceptedProp && acceptedProp.proposed_value ? acceptedProp.proposed_value : opp.estimated_value, vat_treatment: 'standard',
        signed_at: status === 'signed' || status === 'active' ? dayAgo(rnd.int(3, 60)) : null, start_date: opp.expected_start_date || dayAhead(rnd.int(10, 60)), duration_months: opp.expected_duration_months || 12,
        payment_terms: opp.payment_terms || 'monthly_ipc', retention_pct: 10, warranty_months: 12, performance_bond_pct: 5, advance_payment_pct: 10,
        key_commitments: 'تسليم الموقع خلال 30 يومًا من التوقيع؛ تقديم ضمان حسن التنفيذ خلال 15 يومًا.', exclusions: 'أعمال الأثاث المتحرك والتشغيل.', key_risks: 'تأخر تسليم الموقع من العميل؛ تقلب أسعار الحديد.',
        review_notes: status === 'under_review' ? 'بانتظار رد العميل على ملاحظات بند التأخير.' : 'تمت المراجعة واعتماد الصيغة النهائية.', reviewer_id: 'u_ctr',
        handover_status: opp.stage === 'handover' ? (rnd.chance(0.6) ? 'accepted' : 'prepared') : (status === 'signed' ? rnd.pick(['not_started', 'in_preparation']) : 'not_started'),
        delivery_ref: opp.stage === 'handover' ? 'PMS-' + rnd.int(1000, 9999) : null
      });
      ctr.end_date = MODEL.contractEndDate(ctr);
      if (ctr.handover_status === 'prepared' || ctr.handover_status === 'accepted') {
        ctr.handover = { prepared_by: 'u_bdm', prepared_at: dtAgo(rnd.int(2, 20)), accepted_by: ctr.handover_status === 'accepted' ? 'u_ctr' : null, accepted_at: ctr.handover_status === 'accepted' ? dtAgo(rnd.int(1, 5)) : null, final_scope: 'تنفيذ كامل الأعمال وفق المخططات المعتمدة.', outstanding_actions: ['استلام الضمان البنكي', 'تعيين مدير المشروع'], lessons: 'التفاوض استغرق وقتًا أطول بسبب بند غرامات التأخير.', summary: opp.description };
      }
      stamp(ctr, 'u_ctr', rnd.int(2, 50));
      db.contracts.push(ctr);
      if (ctr.handover_status === 'accepted') {
        var prj = Object.assign(MODEL.defaults('project', 'u_ctr'), { id: nid('PRJ'), contract_id: ctr.id, customer_id: opp.customer_id, name: opp.project_name || opp.name, status: rnd.pick(['handed_over', 'in_progress']), region: opp.region, city: opp.city, start_date: ctr.start_date, expected_end_date: ctr.end_date, value: ctr.contract_value, delivery_ref: ctr.delivery_ref });
        stamp(prj, 'u_ctr', rnd.int(1, 20)); db.projects.push(prj);
      }
    });

    /* ---- الأنشطة ---- */
    var actTypes = ['call', 'call', 'email', 'meeting', 'visit', 'site_visit', 'presentation', 'clarification', 'negotiation', 'document_request', 'reminder', 'internal'];
    db.opportunities.forEach(function (opp, oi) {
      var n = rnd.int(1, 5);
      var cts = db.contacts.filter(function (k) { return k.customer_id === opp.customer_id; });
      for (var a = 0; a < n; a++) {
        var past = rnd.chance(0.7);
        var daysBack = past ? rnd.int(1, 90) : -rnd.int(0, 21);
        if (oi % 6 === 5 && a === 0) daysBack = 0;                    // مهمة اليوم
        var status = past ? (rnd.chance(0.88) ? 'done' : 'planned') : 'planned';  // planned في الماضي = متأخر
        var type = rnd.pick(actTypes);
        var act = Object.assign(MODEL.defaults('activity', opp.owner_id || 'u_bd1'), {
          id: nid('ACT'), customer_id: opp.customer_id, contact_id: cts.length ? rnd.pick(cts).id : null, opportunity_id: opp.id, type: type,
          at: past ? dtAgo(daysBack) : dtAhead(-daysBack), owner_id: opp.owner_id || BD[oi % 3], participants: rnd.chance(0.5) ? 'فريق تطوير الأعمال وممثل العميل' : '',
          purpose: rnd.pick(PURPOSES), outcome: status === 'done' ? rnd.pick(OUTCOMES) : '', notes: '', next_action: rnd.chance(0.6) ? rnd.pick(NEXT_ACTIONS) : '',
          due_date: status === 'planned' ? (past ? dayAgo(daysBack) : dayAhead(-daysBack)) : null, status: status, priority: rnd.pick(['low', 'medium', 'medium', 'high', 'critical']),
          completed_at: status === 'done' ? dtAgo(daysBack) : null
        });
        stamp(act, act.owner_id, daysBack > 0 ? daysBack + rnd.int(1, 5) : rnd.int(1, 10));
        db.activities.push(act);
      }
    });
    /* أنشطة على مستوى العميل بدون فرصة + تهاني */
    db.customers.slice(0, 20).forEach(function (c, ci) {
      var act = Object.assign(MODEL.defaults('activity', c.owner_id || 'u_bd1'), { id: nid('ACT'), customer_id: c.id, contact_id: null, opportunity_id: null, type: ci % 3 === 0 ? 'greeting' : 'visit', at: dtAgo(rnd.int(5, 120)), owner_id: c.owner_id || 'u_bd1', purpose: ci % 3 === 0 ? 'تهنئة بمناسبة اليوم الوطني' : 'زيارة دورية لتعزيز العلاقة', outcome: 'تمت', status: 'done', priority: 'low', completed_at: dtAgo(rnd.int(5, 120)) });
      stamp(act, act.owner_id, 10); db.activities.push(act);
    });
    /* متأخرات عالية الأولوية للتصعيد */
    for (var e = 0; e < 3; e++) {
      var oppE = db.opportunities[e * 11];
      var actE = Object.assign(MODEL.defaults('activity', oppE.owner_id || 'u_bd1'), { id: nid('ACT'), customer_id: oppE.customer_id, opportunity_id: oppE.id, type: 'call', at: dtAgo(5 + e), owner_id: oppE.owner_id || 'u_bd1', purpose: 'متابعة عاجلة لقرار العميل', status: 'planned', priority: 'critical', due_date: dayAgo(5 + e) });
      stamp(actE, actE.owner_id, 8 + e); db.activities.push(actE);
    }

    /* ---- حملات التهاني ---- */
    var occ = root.OCCASIONS_CONFIG;
    var cmp1 = Object.assign(MODEL.defaults('campaign', 'u_bd2'), { id: nid('CMP'), occasion_key: 'national_day', year: Y, title: 'تهنئة اليوم الوطني ' + Y, template_ar: occ.templates.national_day.ar, template_en: occ.templates.national_day.en, design_ref: 'DESIGN-ND-' + Y + ' (معتمد من الاتصال المؤسسي)', status: 'draft', criteria: { statuses: ['active', 'prospect'], classes: ['A', 'B'], roles: ['decision_maker', 'influencer'] }, recipients: [], sent_log: [] });
    stamp(cmp1, 'u_bd2', 3); db.campaigns.push(cmp1);
    var cmp2 = Object.assign(MODEL.defaults('campaign', 'u_bd1'), { id: nid('CMP'), occasion_key: 'eid_adha', year: Y, title: 'تهنئة عيد الأضحى ' + Y, template_ar: occ.templates.eid_adha.ar, template_en: occ.templates.eid_adha.en, design_ref: 'DESIGN-EA-' + Y, status: 'closed', criteria: { statuses: ['active'], classes: ['A'] }, recipients: [], sent_log: [], approved_by: 'u_bdm', approved_at: dtAgo(90) });
    stamp(cmp2, 'u_bd1', 95);
    db.contacts.filter(function (k) { var c = db.customers.find(function (x) { return x.id === k.customer_id; }); return c && c.status === 'active' && c.classification === 'A' && k.active && !k.greeting_opt_out; }).slice(0, 8).forEach(function (k) {
      cmp2.recipients.push({ contact_id: k.id, customer_id: k.customer_id, language: k.preferred_language, status: 'included' });
      cmp2.sent_log.push({ contact_id: k.id, sent_by: 'u_bd1', sent_at: dtAgo(88), channel: 'البريد الرسمي للشركة' });
    });
    db.campaigns.push(cmp2);

    /* ---- طلبات اعتماد ---- */
    var hv = db.proposals.find(function (p) { return p.status === 'awaiting_approval'; });
    if (hv) { var ap = { id: nid('APR'), type: 'proposal_high_value', entity_type: 'proposal', entity_id: hv.id, requested_by: hv.owner_id, requested_at: dtAgo(2), status: 'pending', decided_by: null, decided_at: null, reason: null, payload: { value: hv.proposed_value, action: 'approve_proposal' }, demo: true, origin: 'demo' }; db.approvals.push(ap); }
    var ap2 = { id: nid('APR'), type: 'data_export', entity_type: 'customers', entity_id: 'list', requested_by: 'u_bd1', requested_at: dtAgo(1), status: 'pending', decided_by: null, decided_at: null, reason: null, payload: { module: 'customers', count: 41, action: 'export' }, demo: true, origin: 'demo' }; db.approvals.push(ap2);
    var ap3 = { id: nid('APR'), type: 'discount', entity_type: 'proposal', entity_id: db.proposals[3] ? db.proposals[3].id : null, requested_by: 'u_pm', requested_at: dtAgo(6), status: 'approved', decided_by: 'u_com', decided_at: dtAgo(5), reason: 'خصم ضمن الهامش المسموح', payload: { discount_pct: 7, action: 'approve_proposal' }, demo: true, origin: 'demo' }; db.approvals.push(ap3);

    /* ---- مستندات (بيانات وصفية فقط) ---- */
    db.contracts.slice(0, 4).forEach(function (c, i) { db.documents.push({ id: U.uid('doc'), entity_type: 'contract', entity_id: c.id, name: 'نسخة العقد الموقَّعة.pdf', doc_type: 'contract', storage_ref: 'DMS-CTR-' + (1000 + i), classification: 'confidential', uploaded_by: 'u_ctr', uploaded_at: dtAgo(10 + i), demo: true, origin: 'demo' }); });
    db.customers.slice(0, 6).forEach(function (c, i) { db.documents.push({ id: U.uid('doc'), entity_type: 'customer', entity_id: c.id, name: 'ملف التعريف بالشركة (مرسَل).pdf', doc_type: 'profile', storage_ref: 'DMS-CUS-' + (2000 + i), classification: 'internal', uploaded_by: c.owner_id || 'u_bd1', uploaded_at: dtAgo(30 + i), demo: true, origin: 'demo' }); });

    /* ---- عروض محفوظة ---- */
    db.saved_views.push({ id: U.uid('sv'), user_id: 'u_bd1', module: 'opportunities', name: 'فرصي المتوقفة', filters: { owner_id: 'u_bd1', flags: 'stuck' }, demo: true });
    db.saved_views.push({ id: U.uid('sv'), user_id: 'u_bdm', module: 'customers', name: 'عملاء الرياض الاستراتيجيون', filters: { region: 'riyadh', classification: 'A' }, demo: true });

    return db;
  }

  root.DEMO = {
    users: USERS,
    build: build,
    /* يزيل كل السجلات التجريبية من قاعدة محلية */
    purge: function (db) {
      Object.keys(db).forEach(function (k) { if (Array.isArray(db[k])) db[k] = db[k].filter(function (r) { return !(r && (r.demo || r.origin === 'demo')); }); });
      return db;
    },
    count: function (db) { var n = 0; Object.keys(db).forEach(function (k) { if (Array.isArray(db[k])) db[k].forEach(function (r) { if (r && (r.demo || r.origin === 'demo')) n++; }); }); return n; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
