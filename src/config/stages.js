/* =====================================================================
   STAGES — مراحل مسار الفرص (قابلة للتهيئة)
   ---------------------------------------------------------------------
   - لا يلزم أن تمر كل فرصة بكل المراحل: التقدم مسموح إلى أي مرحلة لاحقة،
     والرجوع مسموح مع تسجيل السبب. المراحل الطرفية (مُرساة/خاسرة/ملغاة) تُغلق الفرصة.
   - probability: الاحتمالية الافتراضية عند دخول المرحلة (قابلة للتعديل يدويًا،
     وليست تنبؤًا علميًا — مجرد قيمة تخطيطية مُعلنة في الواجهة).
   - max_days: عتبة التقادم (بالأيام) التي بعدها تُعلَّم الفرصة "عالقة".
   - requires_reason: هل يلزم سبب عند الدخول إلى المرحلة.
   - required_fields: حقول يجب تعبئتها قبل الدخول إلى المرحلة (جودة بيانات).
   ===================================================================== */
(function (root) {
  'use strict';

  var STAGES = [
    { key: 'potential_identified',  order: 1,  ar: 'تحديد عميل محتمل',                 en: 'Potential customer identified',    group: 'prospecting',   probability: 5,  max_days: 30, color: 'slate' },
    { key: 'initial_contact',       order: 2,  ar: 'التواصل الأولي',                   en: 'Initial contact',                  group: 'prospecting',   probability: 10, max_days: 30, color: 'slate' },
    { key: 'qualification',         order: 3,  ar: 'تأهيل العميل والفرصة',              en: 'Qualification',                    group: 'prospecting',   probability: 10, max_days: 30, color: 'slate' },
    { key: 'opportunity_identified',order: 4,  ar: 'تحديد الفرصة',                     en: 'Opportunity identified',           group: 'qualification', probability: 15, max_days: 45, color: 'info', required_fields: ['estimated_value', 'project_type'] },
    { key: 'prequalification',      order: 5,  ar: 'التأهيل المسبق والتسجيل كمورّد',  en: 'Prequalification / vendor registration', group: 'qualification', probability: 15, max_days: 60, color: 'info' },
    { key: 'requirements_received', order: 6,  ar: 'استلام كراسة الشروط والمواصفات', en: 'Requirements received',            group: 'qualification', probability: 20, max_days: 21, color: 'info' },
    { key: 'site_visit',            order: 7,  ar: 'زيارة الموقع والتقييم الفني',     en: 'Site visit / technical assessment', group: 'qualification', probability: 25, max_days: 21, color: 'info' },
    { key: 'awaiting_proposal_prep',order: 8,  ar: 'بانتظار بدء إعداد العرض',          en: 'Awaiting proposal preparation',    group: 'proposal',      probability: 30, max_days: 10, color: 'accent', required_fields: ['submission_deadline', 'expected_award_date'] },
    { key: 'proposal_in_preparation', order: 9, ar: 'العرض قيد الإعداد',               en: 'Proposal under preparation',       group: 'proposal',      probability: 35, max_days: 21, color: 'accent' },
    { key: 'internal_review',       order: 10, ar: 'المراجعة والاعتماد الداخلي',       en: 'Internal review & approval',       group: 'proposal',      probability: 40, max_days: 7,  color: 'accent' },
    { key: 'proposal_submitted',    order: 11, ar: 'تم تقديم العرض',                   en: 'Proposal submitted',               group: 'proposal',      probability: 45, max_days: 45, color: 'accent' },
    { key: 'technical_clarification', order: 12, ar: 'استيضاحات فنية',                 en: 'Technical clarification',          group: 'negotiation',   probability: 50, max_days: 21, color: 'warn' },
    { key: 'commercial_clarification', order: 13, ar: 'استيضاحات تجارية',              en: 'Commercial clarification',         group: 'negotiation',   probability: 55, max_days: 21, color: 'warn' },
    { key: 'negotiation',           order: 14, ar: 'التفاوض',                          en: 'Negotiation',                      group: 'negotiation',   probability: 60, max_days: 30, color: 'warn' },
    { key: 'preferred_bidder',      order: 15, ar: 'إشارة مبدئية بالترسية',   en: 'Verbal indication / preferred bidder', group: 'negotiation', probability: 75, max_days: 30, color: 'warn' },
    { key: 'awaiting_award',        order: 16, ar: 'بانتظار قرار الترسية',             en: 'Awaiting award decision',          group: 'negotiation',   probability: 70, max_days: 45, color: 'warn' },
    /* من الترسية فصاعدًا تُعد الفرصة "مُرساة" (won) لأغراض نسبة الفوز، وتخرج من قيمة المسار المفتوح */
    { key: 'awarded',               order: 17, ar: 'تمت الترسية',                      en: 'Awarded',                          group: 'award',         probability: 90, max_days: 21, color: 'ok', won: true },
    { key: 'contract_review',       order: 18, ar: 'العقد قيد المراجعة',               en: 'Contract under review',            group: 'contract',      probability: 95, max_days: 30, color: 'ok', won: true },
    { key: 'contract_signed',       order: 19, ar: 'تم توقيع العقد',                   en: 'Contract signed',                  group: 'contract',      probability: 100, max_days: 14, color: 'ok', won: true },
    { key: 'handover',              order: 20, ar: 'التسليم لفريق التنفيذ',            en: 'Handover to project delivery',     group: 'contract',      probability: 100, max_days: 30, color: 'ok', won: true },
    { key: 'on_hold',               order: 21, ar: 'معلّقة',                           en: 'On hold',                          group: 'parked',        probability: 0,  max_days: 90, color: 'slate', parked: true, requires_reason: true },
    { key: 'lost',                  order: 22, ar: 'خاسرة',                            en: 'Lost',                             group: 'closed',        probability: 0,  max_days: 0,  color: 'danger', terminal: true, requires_reason: true, required_fields: ['loss_reason'] },
    { key: 'cancelled',             order: 23, ar: 'ملغاة',                            en: 'Cancelled',                        group: 'closed',        probability: 0,  max_days: 0,  color: 'slate', terminal: true, requires_reason: true }
  ];

  var GROUPS = [
    { key: 'prospecting',   ar: 'الاستكشاف',          en: 'Prospecting' },
    { key: 'qualification', ar: 'التأهيل والمتطلبات',   en: 'Qualification' },
    { key: 'proposal',      ar: 'إعداد العرض وتقديمه', en: 'Proposal' },
    { key: 'negotiation',   ar: 'الاستيضاح والتفاوض',   en: 'Clarification & negotiation' },
    { key: 'award',         ar: 'الترسية',          en: 'Award' },
    { key: 'contract',      ar: 'التعاقد والتسليم', en: 'Contract & handover' },
    { key: 'parked',        ar: 'معلّقة',           en: 'Parked' },
    { key: 'closed',        ar: 'مغلقة',            en: 'Closed' }
  ];

  var byKey = {};
  STAGES.forEach(function (s) { byKey[s.key] = s; });

  var API = {
    list: STAGES,
    groups: GROUPS,
    get: function (key) { return byKey[key] || null; },
    label: function (key, lang) { var s = byKey[key]; return s ? (lang === 'en' ? s.en : s.ar) : (key || ''); },
    groupLabel: function (key, lang) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].key === key) return lang === 'en' ? GROUPS[i].en : GROUPS[i].ar; return key; },
    isTerminal: function (key) { var s = byKey[key]; return !!(s && s.terminal); },
    isParked: function (key) { var s = byKey[key]; return !!(s && s.parked); },
    isWon: function (key) { var s = byKey[key]; return !!(s && s.won); },
    isOpen: function (key) { var s = byKey[key]; return !!s && !s.terminal && !s.won && !s.parked; },
    /* المراحل "النشطة" في المسار (تُعد ضمن خط الأنابيب) */
    isActive: function (key) { var s = byKey[key]; return !!s && !s.terminal && !s.parked && !s.won; },
    /* التحوّل المسموح: أي مرحلة غير المرحلة الحالية؛ الرجوع والمراحل الطرفية تتطلب سببًا */
    transition: function (from, to) {
      var a = byKey[from], b = byKey[to];
      if (!a || !b) return { allowed: false, reason: 'unknown_stage' };
      if (from === to) return { allowed: false, reason: 'same_stage' };
      if (a.terminal) return { allowed: to === 'on_hold' ? false : false, reason: 'closed_opportunity', reopen: true };
      var backward = b.order < a.order && !b.parked && !b.terminal;
      var needsReason = !!b.requires_reason || backward;
      return { allowed: true, backward: backward, requiresReason: needsReason, requiredFields: b.required_fields || [] };
    },
    /* الترتيب المعروض في لوحة المسار: المراحل النشطة ثم الفوز ثم المعلّقة/المغلقة */
    boardColumns: function () {
      return STAGES.filter(function (s) { return !s.terminal && !s.parked; });
    },
    outcomeOf: function (key) {
      var s = byKey[key];
      if (!s) return 'open';
      if (s.won) return 'won';
      if (key === 'lost') return 'lost';
      if (key === 'cancelled') return 'cancelled';
      if (s.parked) return 'on_hold';
      return 'open';
    }
  };

  root.STAGES = API;
})(typeof window !== 'undefined' ? window : globalThis);
