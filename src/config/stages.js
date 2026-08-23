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
    { key: 'potential_identified',  order: 1,  ar: 'تحديد عميل محتمل',                 en: 'Potential customer identified',    group: 'prospecting',   probability: 5,  max_days: 30, color: 'slate', guide_ar: ["تحقّق من نشاط الجهة وقدرتها التعاقدية ومطابقتها لمجالات عملنا.", "سجّل الجهة كعميل محتمل مع مصدر المعلومة والقطاع والمنطقة.", "حدّد الموظف المسؤول عن متابعة العلاقة."], guide_en: ["Verify the entity's activity, contracting capacity and fit with our lines of work.", "Register it as a prospect with the information source, sector and region.", "Assign the employee who will own the relationship."] },
    { key: 'initial_contact',       order: 2,  ar: 'التواصل الأولي',                   en: 'Initial contact',                  group: 'prospecting',   probability: 10, max_days: 30, color: 'slate', guide_ar: ["افتح قناة تواصل رسمية مع جهة الاتصال، وسجّل المكالمة أو الاجتماع في الأنشطة.", "عرّف بالشركة وسجلّ أعمالها وتصنيفاتها.", "اتفق على الخطوة التالية وموعدها وسجّلها في «الإجراء التالي»."], guide_en: ["Open a formal channel with the contact and log the call or meeting under activities.", "Introduce the company, its track record and classifications.", "Agree the next step and its date, and record it under “next action”."] },
    { key: 'qualification',         order: 3,  ar: 'تأهيل العميل والفرصة',              en: 'Qualification',                    group: 'prospecting',   probability: 10, max_days: 30, color: 'slate', guide_ar: ["تأكّد من جدّية الجهة ووجود احتياج فعلي وميزانية معتمدة.", "حدّد آلية الشراء لديها: منافسة عامة، أمر مباشر، أو اتفاقية إطارية.", "قيّم ملاءمة الفرصة لقدراتنا قبل صرف جهد إضافي."], guide_en: ["Confirm the entity is serious, with a real need and an approved budget.", "Identify its procurement route: open tender, direct award, or framework agreement.", "Assess fit with our capabilities before investing further effort."] },
    { key: 'opportunity_identified',order: 4,  ar: 'تحديد الفرصة',                     en: 'Opportunity identified',           group: 'qualification', probability: 15, max_days: 45, color: 'info', required_fields: ['estimated_value', 'project_type'], guide_ar: ["تأكيد وجود مشروع فعلي بميزانية معتمدة وجهة قرار معروفة.", "تقدير القيمة المبدئية للمشروع وتحديد نوعه ونطاق الأعمال.", "تسجيل جهة الاتصال الرئيسية وموعد الطرح المتوقّع."], guide_en: ["Confirm a real project with an approved budget and a known decision maker.", "Estimate the initial value and define the project type and scope.", "Record the main contact and the expected tender release date."] },
    { key: 'prequalification',      order: 5,  ar: 'التأهيل المسبق والتسجيل كمورّد',  en: 'Prequalification / vendor registration', group: 'qualification', probability: 15, max_days: 60, color: 'info', guide_ar: ["سجّل الشركة في بوابة الجهة أو في منصة اعتماد إن لم تكن مسجّلة.", "جهّز مستندات التأهيل: السجل التجاري، الشهادات، شهادة التصنيف، الأعمال المماثلة.", "تابع صدور نتيجة التأهيل ووثّقها في الفرصة."], guide_en: ["Register the company on the entity's portal or on Etimad if not already registered.", "Prepare prequalification documents: CR, certificates, contractor classification, similar works.", "Follow up the prequalification result and record it on the opportunity."] },
    { key: 'requirements_received', order: 6,  ar: 'استلام كراسة الشروط والمواصفات', en: 'Requirements received',            group: 'qualification', probability: 20, max_days: 21, color: 'info', guide_ar: ["اشترِ كراسة الشروط أو حمّلها، ووثّق رقمها وتاريخ الاستلام.", "وزّع المتطلبات على الفرق المعنية: الفني، التجاري، العقود.", "سجّل المواعيد: آخر موعد للاستفسارات، وتقديم العروض، وفتح المظاريف."], guide_en: ["Purchase or download the tender documents and record their number and receipt date.", "Distribute requirements to the technical, commercial and contracts teams.", "Record the deadlines: queries, submission, and bid opening."] },
    { key: 'site_visit',            order: 7,  ar: 'زيارة الموقع والتقييم الفني',     en: 'Site visit / technical assessment', group: 'qualification', probability: 25, max_days: 21, color: 'info', guide_ar: ["نسّق موعد الزيارة مع جهة الاتصال ووثّقه في الأنشطة.", "عاين الموقع مع فريق التنفيذ، وارصد المخاطر وقيود التنفيذ.", "أرسل الاستفسارات الفنية قبل انتهاء موعد الاستفسارات."], guide_en: ["Coordinate the visit with the customer contact and log it under activities.", "Inspect the site with the delivery team and capture risks and execution constraints.", "Submit technical queries before the query deadline closes."] },
    { key: 'awaiting_proposal_prep',order: 8,  ar: 'بانتظار بدء إعداد العرض',          en: 'Awaiting proposal preparation',    group: 'proposal',      probability: 30, max_days: 10, color: 'accent', required_fields: ['submission_deadline', 'expected_award_date'], guide_ar: ["ثبّت آخر موعد لتقديم العروض والتاريخ المتوقّع للترسية في الفرصة.", "اتخذ قرار المشاركة من عدمها واحصل على اعتماده.", "كلّف فريق إعداد العرض وحدّد جدولًا زمنيًا داخليًا قبل الموعد."], guide_en: ["Fix the submission deadline and the expected award date on the opportunity.", "Take the bid / no-bid decision and get it approved.", "Assign the proposal team and set an internal schedule ahead of the deadline."] },
    { key: 'proposal_in_preparation', order: 9, ar: 'العرض قيد الإعداد',               en: 'Proposal under preparation',       group: 'proposal',      probability: 35, max_days: 21, color: 'accent', guide_ar: ["أنشئ العرض في المنصة واربطه بالفرصة.", "اجمع التسعير من التنفيذ والمشتريات، وحدّد هامش الربح المستهدف.", "جهّز المستندات المطلوبة والضمان الابتدائي إن لزم."], guide_en: ["Create the proposal in the platform and link it to the opportunity.", "Collect pricing from delivery and procurement and set the target margin.", "Prepare the required documents and the bid bond if needed."] },
    { key: 'internal_review',       order: 10, ar: 'المراجعة والاعتماد الداخلي',       en: 'Internal review & approval',       group: 'proposal',      probability: 40, max_days: 7,  color: 'accent', guide_ar: ["اعرض العرض على المراجعة الفنية والتجارية.", "ارفع طلب اعتماد الخصم أو القيمة إن تجاوز صلاحيتك.", "أغلق ملاحظات المراجعة قبل موعد التقديم بوقت كافٍ."], guide_en: ["Put the proposal through technical and commercial review.", "Raise a discount or value approval request if it exceeds your authority.", "Close review comments well before the submission deadline."] },
    { key: 'proposal_submitted',    order: 11, ar: 'تم تقديم العرض',                   en: 'Proposal submitted',               group: 'proposal',      probability: 45, max_days: 45, color: 'accent', guide_ar: ["قدّم العرض عبر القناة المعتمدة قبل الموعد، ووثّق إشعار الاستلام.", "سجّل رقم العرض وتاريخ التقديم في المنصة.", "حدّد موعد المتابعة التالي مع الجهة."], guide_en: ["Submit through the approved channel before the deadline and keep the receipt.", "Record the proposal number and submission date in the platform.", "Set the next follow-up date with the entity."] },
    { key: 'technical_clarification', order: 12, ar: 'استيضاحات فنية',                 en: 'Technical clarification',          group: 'negotiation',   probability: 50, max_days: 21, color: 'warn', guide_ar: ["استلم الاستيضاح ووزّعه على الفريق الفني بمهلة محدّدة.", "جهّز الرد موثّقًا وارفعه قبل الموعد المحدّد.", "سجّل أي تعديل على النطاق قد يؤثّر على السعر."], guide_en: ["Receive the clarification and pass it to the technical team with a set deadline.", "Prepare a documented response and submit it on time.", "Record any scope change that may affect the price."] },
    { key: 'commercial_clarification', order: 13, ar: 'استيضاحات تجارية',              en: 'Commercial clarification',         group: 'negotiation',   probability: 55, max_days: 21, color: 'warn', guide_ar: ["راجع أثر الاستيضاح على السعر وشروط الدفع والضمانات.", "احصل على اعتماد أي تعديل سعري قبل الرد.", "وثّق الرد ومرفقاته في الفرصة."], guide_en: ["Assess the impact on price, payment terms and guarantees.", "Get any price change approved before responding.", "Record the response and its attachments on the opportunity."] },
    { key: 'negotiation',           order: 14, ar: 'التفاوض',                          en: 'Negotiation',                      group: 'negotiation',   probability: 60, max_days: 30, color: 'warn', guide_ar: ["حدّد الحد الأدنى المقبول للسعر والشروط قبل الجلسة.", "وثّق كل جولة تفاوض ونتائجها في الأنشطة.", "لا تلتزم بأي تنازل يتجاوز صلاحيتك دون اعتماد."], guide_en: ["Set your walk-away price and terms before the session.", "Log every negotiation round and its outcome under activities.", "Do not commit to any concession beyond your authority without approval."] },
    { key: 'preferred_bidder',      order: 15, ar: 'إشارة مبدئية بالترسية',   en: 'Verbal indication / preferred bidder', group: 'negotiation', probability: 75, max_days: 30, color: 'warn', guide_ar: ["وثّق الإشارة ومصدرها؛ فهي غير ملزمة حتى صدور خطاب الترسية.", "ابدأ التجهيز المبكر: الضمان النهائي، الطاقم، الجدول الزمني.", "أبقِ العرض ساريًا وتابع موعد صدور القرار."], guide_en: ["Record the indication and its source; it is not binding until the award letter.", "Start early preparation: performance bond, team, schedule.", "Keep the bid valid and track the decision date."] },
    { key: 'awaiting_award',        order: 16, ar: 'بانتظار قرار الترسية',             en: 'Awaiting award decision',          group: 'negotiation',   probability: 70, max_days: 45, color: 'warn', guide_ar: ["تابع الجهة دوريًا وسجّل كل متابعة.", "راقب مدة سريان العرض واطلب تمديدها إن قرب انتهاؤها.", "جهّز متطلبات ما بعد الترسية مسبقًا."], guide_en: ["Follow up with the entity on a regular cadence and log each contact.", "Watch the bid validity period and request an extension before it lapses.", "Prepare post-award requirements in advance."] },
    /* من الترسية فصاعدًا تُعد الفرصة "مُرساة" (won) لأغراض نسبة الفوز، وتخرج من قيمة المسار المفتوح */
    { key: 'awarded',               order: 17, ar: 'تمت الترسية',                      en: 'Awarded',                          group: 'award',         probability: 90, max_days: 21, color: 'ok', won: true, guide_ar: ["استلم خطاب الترسية ووثّقه في الفرصة.", "جهّز الضمان النهائي والوثائق المطلوبة خلال المهلة النظامية.", "أبلغ فريق التنفيذ لبدء التجهيز."], guide_en: ["Obtain the award letter and record it on the opportunity.", "Prepare the performance bond and required documents within the statutory period.", "Notify the delivery team to begin mobilisation."] },
    { key: 'contract_review',       order: 18, ar: 'العقد قيد المراجعة',               en: 'Contract under review',            group: 'contract',      probability: 95, max_days: 30, color: 'ok', won: true, guide_ar: ["راجع بنود العقد مع الإدارة القانونية: الغرامات، الدفعات، مدد التسليم.", "وثّق أي تحفّظ وتفاوض عليه قبل التوقيع.", "تأكّد من مطابقة نطاق العقد للعرض المقدَّم."], guide_en: ["Review the contract with legal: penalties, payments, delivery periods.", "Record any reservation and negotiate it before signing.", "Confirm the contract scope matches the submitted proposal."] },
    { key: 'contract_signed',       order: 19, ar: 'تم توقيع العقد',                   en: 'Contract signed',                  group: 'contract',      probability: 100, max_days: 14, color: 'ok', won: true, guide_ar: ["سجّل العقد في المنصة بقيمته ومدته وتواريخه.", "أودع الضمان النهائي وسجّل تاريخ سريانه.", "حدّد موعد اجتماع البدء مع الجهة."], guide_en: ["Register the contract in the platform with its value, duration and dates.", "Lodge the performance bond and record its effective date.", "Set the kick-off meeting date with the entity."] },
    { key: 'handover',              order: 20, ar: 'التسليم لفريق التنفيذ',            en: 'Handover to project delivery',     group: 'contract',      probability: 100, max_days: 30, color: 'ok', won: true, guide_ar: ["سلّم ملف المشروع كاملًا: العقد، العرض، المراسلات، المخططات.", "اعقد اجتماع تسليم مع مدير المشروع ووثّق محضره.", "سجّل الدروس المستفادة من دورة الفرصة."], guide_en: ["Hand over the full project file: contract, proposal, correspondence, drawings.", "Hold a handover meeting with the project manager and minute it.", "Record the lessons learned from the opportunity cycle."] },
    { key: 'on_hold',               order: 21, ar: 'معلّقة',                           en: 'On hold',                          group: 'parked',        probability: 0,  max_days: 90, color: 'slate', parked: true, requires_reason: true, guide_ar: ["وثّق سبب التعليق والموعد المتوقّع لإعادة النظر.", "أبقِ العلاقة حيّة بمتابعة دورية خفيفة."], guide_en: ["Record why it is on hold and when it will be revisited.", "Keep the relationship warm with light periodic follow-up."] },
    { key: 'lost',                  order: 22, ar: 'خاسرة',                            en: 'Lost',                             group: 'closed',        probability: 0,  max_days: 0,  color: 'danger', terminal: true, requires_reason: true, required_fields: ['loss_reason'], guide_ar: ["سجّل سبب الخسارة والمنافس الفائز وقيمة عرضه إن عُرفت.", "دوّن الدروس المستفادة لتحسين العروض القادمة."], guide_en: ["Record the loss reason, the winning competitor and its price if known.", "Write down the lessons learned to improve future bids."] },
    { key: 'cancelled',             order: 23, ar: 'ملغاة',                            en: 'Cancelled',                        group: 'closed',        probability: 0,  max_days: 0,  color: 'slate', terminal: true, requires_reason: true, guide_ar: ["وثّق سبب الإلغاء ومصدره: الجهة أم نحن.", "أرشف المستندات واحتفظ بها للرجوع إليها."], guide_en: ["Record why it was cancelled and by whom: the entity or us.", "Archive the documents and keep them for reference."] }
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
    /* المراحل التي يتخطّاها قفزٌ للأمام من from إلى to (لا تشمل الطرفين).
       تُعد منجزة تلقائيًا لأن المسار تسلسلي: بلوغ مرحلة يعني تجاوز ما قبلها.
       المراحل الطرفية والمعلّقة خارج التسلسل فلا تدخل. */
    between: function (from, to) {
      var a = byKey[from], b = byKey[to];
      if (!a || !b || b.order <= a.order) return [];
      if (b.terminal || b.parked || a.terminal || a.parked) return [];
      return STAGES.filter(function (s) {
        return !s.terminal && !s.parked && s.order > a.order && s.order < b.order;
      });
    },

    /* إرشاد الموظف: ماذا يُطلب منه في هذه المرحلة (يُعرض في نافذة المرحلة) */
    guide: function (key, lang) { var s = byKey[key]; if (!s) return []; return (lang === 'en' ? s.guide_en : s.guide_ar) || []; },
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
