/* =====================================================================
   LOOKUPS — القوائم المرجعية (المصدر الوحيد للقيم الثابتة في المنصة)
   ---------------------------------------------------------------------
   - كل قائمة: مصفوفة عناصر { key, ar, en, ...خصائص اختيارية }.
   - الواجهة لا تُخزّن نصوصًا، بل المفاتيح (key) فقط؛ النص يُشتق من هنا حسب اللغة.
   - تعديل القيم هنا (أو من شاشة الإدارة في الوضع المحلي) ينعكس في كل الشاشات.
   - في وضع Supabase تُزامَن هذه القوائم مع جدول config_items (انظر supabase/migrations).
   ===================================================================== */
(function (root) {
  'use strict';

  var L = {};

  L.customer_types = [
    { key: 'government',      ar: 'جهة حكومية',        en: 'Government' },
    { key: 'semi_government', ar: 'شبه حكومية',        en: 'Semi-government' },
    { key: 'private',         ar: 'قطاع خاص',          en: 'Private sector' },
    { key: 'developer',       ar: 'مطوّر عقاري',       en: 'Developer' },
    { key: 'consultant',      ar: 'استشاري',           en: 'Consultant' },
    { key: 'other',           ar: 'أخرى',              en: 'Other' }
  ];

  L.customer_classes = [
    { key: 'A', ar: 'أ — استراتيجي', en: 'A — Strategic', color: 'ink' },
    { key: 'B', ar: 'ب — رئيسي',     en: 'B — Key',       color: 'accent' },
    { key: 'C', ar: 'ج — عادي',      en: 'C — Standard',  color: 'slate' }
  ];

  L.customer_statuses = [
    { key: 'prospect', ar: 'عميل محتمل', en: 'Prospect', color: 'info' },
    { key: 'active',   ar: 'عميل قائم',  en: 'Active customer', color: 'ok' },
    { key: 'dormant',  ar: 'خامل',       en: 'Dormant', color: 'warn' },
    { key: 'archived', ar: 'مؤرشف',      en: 'Archived', color: 'slate' }
  ];

  L.customer_sources = [
    { key: 'tender_portal',         ar: 'منصة منافسات (اعتماد وغيرها)', en: 'Tender portal (Etimad etc.)' },
    { key: 'referral',              ar: 'ترشيح/توصية',                  en: 'Referral' },
    { key: 'existing_relationship', ar: 'علاقة قائمة',                  en: 'Existing relationship' },
    { key: 'exhibition',            ar: 'معرض/فعالية',                  en: 'Exhibition / event' },
    { key: 'direct_approach',       ar: 'تواصل مباشر',                  en: 'Direct approach' },
    { key: 'consultant',            ar: 'عبر استشاري',                  en: 'Via consultant' },
    { key: 'website',               ar: 'الموقع الإلكتروني',            en: 'Website' },
    { key: 'other',                 ar: 'أخرى',                          en: 'Other' }
  ];

  L.opportunity_sources = [
    { key: 'etimad',          ar: 'منصة اعتماد',       en: 'Etimad portal' },
    { key: 'invitation',      ar: 'دعوة مباشرة',       en: 'Direct invitation' },
    { key: 'existing_customer', ar: 'عميل حالي',       en: 'Existing customer' },
    { key: 'referral',        ar: 'ترشيح',             en: 'Referral' },
    { key: 'market_intel',    ar: 'رصد السوق',         en: 'Market intelligence' },
    { key: 'consultant',      ar: 'استشاري المشروع',   en: 'Project consultant' },
    { key: 'framework',       ar: 'اتفاقية إطارية',    en: 'Framework agreement' },
    { key: 'other',           ar: 'أخرى',              en: 'Other' }
  ];

  L.sectors = [
    { key: 'government_buildings', ar: 'مبانٍ حكومية',        en: 'Government buildings' },
    { key: 'infrastructure',       ar: 'بنية تحتية',          en: 'Infrastructure' },
    { key: 'housing',              ar: 'إسكان',               en: 'Housing' },
    { key: 'commercial',           ar: 'تجاري ومكاتب',        en: 'Commercial & offices' },
    { key: 'healthcare',           ar: 'صحي',                 en: 'Healthcare' },
    { key: 'education',            ar: 'تعليمي',              en: 'Education' },
    { key: 'industrial',           ar: 'صناعي ومستودعات',     en: 'Industrial & logistics' },
    { key: 'hospitality',          ar: 'سياحي وترفيهي',       en: 'Hospitality & entertainment' },
    { key: 'energy_utilities',     ar: 'طاقة ومرافق',         en: 'Energy & utilities' },
    { key: 'transport',            ar: 'نقل وطرق',            en: 'Transport & roads' },
    { key: 'religious',            ar: 'مساجد ومرافق دينية',  en: 'Religious facilities' },
    { key: 'banking',              ar: 'مصرفي ومالي',         en: 'Banking & finance' },
    { key: 'real_estate',          ar: 'تطوير عقاري',         en: 'Real-estate development' },
    { key: 'other',                ar: 'أخرى',                en: 'Other' }
  ];

  L.project_types = [
    { key: 'buildings',      ar: 'إنشاء مبانٍ',            en: 'Building construction' },
    { key: 'infrastructure', ar: 'أعمال بنية تحتية',       en: 'Infrastructure works' },
    { key: 'roads',          ar: 'طرق وجسور',              en: 'Roads & bridges' },
    { key: 'utilities',      ar: 'شبكات ومرافق',           en: 'Utilities & networks' },
    { key: 'fitout',         ar: 'تشطيبات وتجهيز داخلي',   en: 'Fit-out & finishing' },
    { key: 'renovation',     ar: 'ترميم وتجديد',           en: 'Renovation' },
    { key: 'mep',            ar: 'أعمال كهروميكانيكية',    en: 'MEP works' },
    { key: 'industrial',     ar: 'منشآت صناعية',           en: 'Industrial facilities' },
    { key: 'landscaping',    ar: 'تنسيق مواقع',            en: 'Landscaping' },
    { key: 'maintenance',    ar: 'تشغيل وصيانة',           en: 'Operation & maintenance' },
    { key: 'design_build',   ar: 'تصميم وتنفيذ',           en: 'Design & build' },
    { key: 'other',          ar: 'أخرى',                   en: 'Other' }
  ];

  /* المناطق الإدارية الثلاث عشرة ومدنها الرئيسية */
  L.regions = [
    { key: 'riyadh',   ar: 'الرياض',          en: 'Riyadh',          cities: [
      { key: 'riyadh', ar: 'الرياض', en: 'Riyadh' }, { key: 'kharj', ar: 'الخرج', en: 'Al Kharj' },
      { key: 'diriyah', ar: 'الدرعية', en: 'Diriyah' }, { key: 'majmaah', ar: 'المجمعة', en: 'Al Majmaah' },
      { key: 'dawadmi', ar: 'الدوادمي', en: 'Ad Dawadmi' }, { key: 'wadi_dawasir', ar: 'وادي الدواسر', en: 'Wadi ad-Dawasir' } ] },
    { key: 'makkah',   ar: 'مكة المكرمة',     en: 'Makkah',          cities: [
      { key: 'makkah', ar: 'مكة المكرمة', en: 'Makkah' }, { key: 'jeddah', ar: 'جدة', en: 'Jeddah' },
      { key: 'taif', ar: 'الطائف', en: 'Taif' }, { key: 'rabigh', ar: 'رابغ', en: 'Rabigh' }, { key: 'qunfudhah', ar: 'القنفذة', en: 'Al Qunfudhah' } ] },
    { key: 'madinah',  ar: 'المدينة المنورة', en: 'Madinah',         cities: [
      { key: 'madinah', ar: 'المدينة المنورة', en: 'Madinah' }, { key: 'yanbu', ar: 'ينبع', en: 'Yanbu' }, { key: 'alula', ar: 'العلا', en: 'AlUla' } ] },
    { key: 'qassim',   ar: 'القصيم',          en: 'Qassim',          cities: [
      { key: 'buraidah', ar: 'بريدة', en: 'Buraidah' }, { key: 'unaizah', ar: 'عنيزة', en: 'Unaizah' }, { key: 'rass', ar: 'الرس', en: 'Ar Rass' } ] },
    { key: 'eastern',  ar: 'المنطقة الشرقية', en: 'Eastern Province', cities: [
      { key: 'dammam', ar: 'الدمام', en: 'Dammam' }, { key: 'khobar', ar: 'الخبر', en: 'Al Khobar' }, { key: 'dhahran', ar: 'الظهران', en: 'Dhahran' },
      { key: 'jubail', ar: 'الجبيل', en: 'Jubail' }, { key: 'ahsa', ar: 'الأحساء', en: 'Al Ahsa' }, { key: 'qatif', ar: 'القطيف', en: 'Qatif' }, { key: 'hafr', ar: 'حفر الباطن', en: 'Hafar Al Batin' } ] },
    { key: 'asir',     ar: 'عسير',            en: 'Asir',            cities: [
      { key: 'abha', ar: 'أبها', en: 'Abha' }, { key: 'khamis', ar: 'خميس مشيط', en: 'Khamis Mushait' }, { key: 'bisha', ar: 'بيشة', en: 'Bisha' } ] },
    { key: 'tabuk',    ar: 'تبوك',            en: 'Tabuk',           cities: [
      { key: 'tabuk', ar: 'تبوك', en: 'Tabuk' }, { key: 'neom', ar: 'نيوم', en: 'NEOM' }, { key: 'duba', ar: 'ضباء', en: 'Duba' } ] },
    { key: 'hail',     ar: 'حائل',            en: 'Hail',            cities: [ { key: 'hail', ar: 'حائل', en: 'Hail' } ] },
    { key: 'northern', ar: 'الحدود الشمالية', en: 'Northern Borders', cities: [ { key: 'arar', ar: 'عرعر', en: 'Arar' }, { key: 'rafha', ar: 'رفحاء', en: 'Rafha' } ] },
    { key: 'jazan',    ar: 'جازان',           en: 'Jazan',           cities: [ { key: 'jazan', ar: 'جازان', en: 'Jazan' }, { key: 'sabya', ar: 'صبيا', en: 'Sabya' } ] },
    { key: 'najran',   ar: 'نجران',           en: 'Najran',          cities: [ { key: 'najran', ar: 'نجران', en: 'Najran' }, { key: 'sharurah', ar: 'شرورة', en: 'Sharurah' } ] },
    { key: 'bahah',    ar: 'الباحة',          en: 'Al Bahah',        cities: [ { key: 'bahah', ar: 'الباحة', en: 'Al Bahah' }, { key: 'baljurashi', ar: 'بلجرشي', en: 'Baljurashi' } ] },
    { key: 'jawf',     ar: 'الجوف',           en: 'Al Jawf',         cities: [ { key: 'sakaka', ar: 'سكاكا', en: 'Sakaka' }, { key: 'qurayyat', ar: 'القريات', en: 'Al Qurayyat' } ] }
  ];

  L.languages = [
    { key: 'ar', ar: 'العربية', en: 'Arabic' },
    { key: 'en', ar: 'الإنجليزية', en: 'English' }
  ];

  L.contact_channels = [
    { key: 'phone',   ar: 'اتصال هاتفي',    en: 'Phone call' },
    { key: 'email',   ar: 'بريد إلكتروني',  en: 'Email' },
    { key: 'meeting', ar: 'اجتماع حضوري',   en: 'In-person meeting' },
    { key: 'letter',  ar: 'خطاب رسمي',      en: 'Official letter' },
    { key: 'portal',  ar: 'عبر المنصة/البوابة', en: 'Via portal' }
  ];

  L.contact_roles = [
    { key: 'decision_maker', ar: 'صاحب قرار',      en: 'Decision-maker' },
    { key: 'influencer',     ar: 'مؤثّر',          en: 'Influencer' },
    { key: 'technical',      ar: 'جهة فنية',       en: 'Technical contact' },
    { key: 'procurement',    ar: 'مشتريات/تعاقدات', en: 'Procurement contact' },
    { key: 'finance',        ar: 'مالية',          en: 'Finance contact' },
    { key: 'site',           ar: 'جهة ميدانية/موقع', en: 'Site contact' }
  ];

  L.seniority = [
    { key: 'executive', ar: 'قيادة عليا',   en: 'Executive' },
    { key: 'senior',    ar: 'إدارة عليا',   en: 'Senior management' },
    { key: 'middle',    ar: 'إدارة وسطى',   en: 'Middle management' },
    { key: 'staff',     ar: 'موظف',         en: 'Staff' }
  ];

  L.relationship_strength = [
    { key: 'weak',   ar: 'ضعيفة', en: 'Weak',   color: 'danger' },
    { key: 'medium', ar: 'متوسطة', en: 'Medium', color: 'warn' },
    { key: 'strong', ar: 'قوية',  en: 'Strong', color: 'ok' }
  ];

  L.importance = [
    { key: 'low',    ar: 'منخفضة', en: 'Low' },
    { key: 'medium', ar: 'متوسطة', en: 'Medium' },
    { key: 'high',   ar: 'عالية',  en: 'High' }
  ];

  L.priorities = [
    { key: 'low',      ar: 'منخفضة', en: 'Low',      color: 'slate', rank: 1 },
    { key: 'medium',   ar: 'متوسطة', en: 'Medium',   color: 'info',  rank: 2 },
    { key: 'high',     ar: 'عالية',  en: 'High',     color: 'warn',  rank: 3 },
    { key: 'critical', ar: 'حرجة',   en: 'Critical', color: 'danger', rank: 4 }
  ];

  L.risk_levels = [
    { key: 'low',    ar: 'منخفض', en: 'Low',    color: 'ok' },
    { key: 'medium', ar: 'متوسط', en: 'Medium', color: 'warn' },
    { key: 'high',   ar: 'مرتفع', en: 'High',   color: 'danger' }
  ];

  L.confidentiality = [
    { key: 'internal',     ar: 'داخلي',        en: 'Internal' },
    { key: 'restricted',   ar: 'مقيّد',        en: 'Restricted' },
    { key: 'confidential', ar: 'سرّي',         en: 'Confidential' }
  ];

  L.vendor_registration = [
    { key: 'not_required',   ar: 'غير مطلوب',     en: 'Not required' },
    { key: 'not_registered', ar: 'غير مسجّل',     en: 'Not registered', color: 'danger' },
    { key: 'in_progress',    ar: 'قيد التسجيل',   en: 'In progress', color: 'warn' },
    { key: 'registered',     ar: 'مسجّل',         en: 'Registered', color: 'ok' },
    { key: 'expired',        ar: 'منتهي',         en: 'Expired', color: 'danger' }
  ];

  L.prequalification = [
    { key: 'not_required', ar: 'غير مطلوب',     en: 'Not required' },
    { key: 'pending',      ar: 'لم يُقدَّم',     en: 'Not submitted', color: 'slate' },
    { key: 'in_progress',  ar: 'قيد الدراسة',   en: 'Under review', color: 'warn' },
    { key: 'qualified',    ar: 'مؤهَّل',        en: 'Qualified', color: 'ok' },
    { key: 'rejected',     ar: 'غير مؤهَّل',    en: 'Not qualified', color: 'danger' }
  ];

  L.vat_treatments = [
    { key: 'standard',    ar: 'خاضع للضريبة (15٪)', en: 'Standard rated (15%)', rate: 0.15 },
    { key: 'zero',        ar: 'صفري',               en: 'Zero rated', rate: 0 },
    { key: 'exempt',      ar: 'معفى',               en: 'Exempt', rate: 0 }
  ];

  L.payment_terms = [
    { key: 'monthly_ipc',   ar: 'مستخلصات شهرية',          en: 'Monthly IPCs' },
    { key: 'milestones',    ar: 'دفعات حسب مراحل الإنجاز', en: 'Milestone payments' },
    { key: 'advance_ipc',   ar: 'دفعة مقدمة + مستخلصات',   en: 'Advance + IPCs' },
    { key: 'on_completion', ar: 'عند الإنجاز',              en: 'On completion' },
    { key: 'custom',        ar: 'شروط خاصة',                en: 'Custom' }
  ];

  L.submission_methods = [
    { key: 'portal',        ar: 'عبر المنصة الإلكترونية', en: 'Electronic portal' },
    { key: 'email',         ar: 'بريد إلكتروني',          en: 'Email' },
    { key: 'hand_delivery', ar: 'تسليم باليد',            en: 'Hand delivery' },
    { key: 'courier',       ar: 'بريد/شحن',               en: 'Courier' }
  ];

  L.activity_types = [
    { key: 'call',                ar: 'اتصال هاتفي',        en: 'Call',               icon: 'phone' },
    { key: 'email',               ar: 'بريد إلكتروني',      en: 'Email',              icon: 'mail' },
    { key: 'meeting',             ar: 'اجتماع',             en: 'Meeting',            icon: 'users' },
    { key: 'visit',               ar: 'زيارة عميل',         en: 'Customer visit',     icon: 'building' },
    { key: 'site_visit',          ar: 'زيارة موقع',         en: 'Site visit',         icon: 'pin' },
    { key: 'presentation',        ar: 'عرض تقديمي',         en: 'Presentation',       icon: 'present' },
    { key: 'proposal_submission', ar: 'تقديم عرض',          en: 'Proposal submission', icon: 'send' },
    { key: 'clarification',       ar: 'استيضاح',            en: 'Clarification',      icon: 'help' },
    { key: 'negotiation',         ar: 'تفاوض',              en: 'Negotiation',        icon: 'handshake' },
    { key: 'document_request',    ar: 'طلب مستندات',        en: 'Document request',   icon: 'doc' },
    { key: 'reminder',            ar: 'تذكير',              en: 'Reminder',           icon: 'bell' },
    { key: 'greeting',            ar: 'تهنئة/مناسبة',       en: 'Greeting',           icon: 'gift' },
    { key: 'internal',            ar: 'تنسيق داخلي',        en: 'Internal coordination', icon: 'internal' },
    { key: 'other',               ar: 'نشاط آخر',           en: 'Other',              icon: 'dot' }
  ];

  L.activity_statuses = [
    { key: 'planned',   ar: 'مجدول',  en: 'Planned',   color: 'info' },
    { key: 'done',      ar: 'منجز',   en: 'Done',      color: 'ok' },
    { key: 'cancelled', ar: 'ملغى',   en: 'Cancelled', color: 'slate' }
  ];

  L.loss_reasons = [
    { key: 'price',                   ar: 'السعر',                         en: 'Price' },
    { key: 'technical',               ar: 'التقييم الفني',                 en: 'Technical evaluation' },
    { key: 'prequalification',        ar: 'عدم اجتياز التأهيل',            en: 'Failed prequalification' },
    { key: 'late_submission',         ar: 'تأخر التقديم',                  en: 'Late submission' },
    { key: 'competitor_relationship', ar: 'علاقة المنافس بالعميل',         en: 'Competitor relationship' },
    { key: 'scope_change',            ar: 'تغيّر النطاق/المتطلبات',        en: 'Scope change' },
    { key: 'budget_cancelled',        ar: 'إلغاء/تجميد الميزانية',         en: 'Budget cancelled' },
    { key: 'customer_postponed',      ar: 'تأجيل من العميل',               en: 'Postponed by customer' },
    { key: 'no_response',             ar: 'لا استجابة من العميل',          en: 'No customer response' },
    { key: 'capacity',                ar: 'قرار داخلي بعدم المشاركة',      en: 'Internal no-bid decision' },
    { key: 'other',                   ar: 'أخرى',                          en: 'Other' }
  ];

  L.proposal_statuses = [
    { key: 'not_started',        ar: 'لم يبدأ',                   en: 'Not started',            color: 'slate',  group: 'prep' },
    { key: 'awaiting_info',      ar: 'بانتظار معلومات',           en: 'Awaiting information',   color: 'warn',   group: 'prep' },
    { key: 'in_preparation',     ar: 'قيد الإعداد',               en: 'Under preparation',      color: 'info',   group: 'prep' },
    { key: 'technical_review',   ar: 'قيد المراجعة الفنية',       en: 'Under technical review', color: 'info',   group: 'review' },
    { key: 'commercial_review',  ar: 'قيد المراجعة التجارية',     en: 'Under commercial review', color: 'info',  group: 'review' },
    { key: 'awaiting_approval',  ar: 'بانتظار الاعتماد الداخلي',  en: 'Awaiting internal approval', color: 'warn', group: 'review' },
    { key: 'ready',              ar: 'جاهز للتقديم',              en: 'Ready for submission',   color: 'accent', group: 'review' },
    { key: 'submitted',          ar: 'مُقدَّم',                   en: 'Submitted',              color: 'ok',     group: 'submitted' },
    { key: 'revision_requested', ar: 'مطلوب تعديل',               en: 'Revision requested',     color: 'warn',   group: 'submitted' },
    { key: 'revised',            ar: 'مُعدَّل',                   en: 'Revised',                color: 'info',   group: 'submitted' },
    { key: 'accepted',           ar: 'مقبول',                     en: 'Accepted',               color: 'ok',     group: 'closed' },
    { key: 'rejected',           ar: 'مرفوض',                     en: 'Rejected',               color: 'danger', group: 'closed' },
    { key: 'expired',            ar: 'منتهي الصلاحية',            en: 'Expired',                color: 'danger', group: 'closed' },
    { key: 'withdrawn',          ar: 'مسحوب',                     en: 'Withdrawn',              color: 'slate',  group: 'closed' }
  ];

  L.doc_statuses = [ /* حالة العرض الفني/التجاري داخل نسخة العرض */
    { key: 'not_started', ar: 'لم يبدأ',     en: 'Not started', color: 'slate' },
    { key: 'in_progress', ar: 'قيد الإعداد', en: 'In progress', color: 'info' },
    { key: 'in_review',   ar: 'قيد المراجعة', en: 'In review',  color: 'warn' },
    { key: 'approved',    ar: 'معتمد',       en: 'Approved',    color: 'ok' }
  ];

  L.contract_statuses = [
    { key: 'under_review',  ar: 'قيد المراجعة',        en: 'Under review',         color: 'info' },
    { key: 'negotiation',   ar: 'قيد التفاوض',         en: 'Under negotiation',    color: 'warn' },
    { key: 'approved',      ar: 'معتمد داخليًا',       en: 'Approved internally',  color: 'accent' },
    { key: 'signed',        ar: 'موقَّع',              en: 'Signed',               color: 'ok' },
    { key: 'active',        ar: 'ساري',                en: 'Active',               color: 'ok' },
    { key: 'completed',     ar: 'منتهي',               en: 'Completed',            color: 'slate' },
    { key: 'terminated',    ar: 'مفسوخ',               en: 'Terminated',           color: 'danger' }
  ];

  L.handover_statuses = [
    { key: 'not_started',    ar: 'لم يبدأ',       en: 'Not started',    color: 'slate' },
    { key: 'in_preparation', ar: 'قيد الإعداد',   en: 'In preparation', color: 'info' },
    { key: 'prepared',       ar: 'جاهز للتسليم',  en: 'Prepared',       color: 'warn' },
    { key: 'accepted',       ar: 'مُستلَم من فريق التنفيذ', en: 'Accepted by delivery', color: 'ok' }
  ];

  L.project_statuses = [
    { key: 'handed_over', ar: 'مُسلَّم للتنفيذ', en: 'Handed over', color: 'info' },
    { key: 'in_progress', ar: 'قيد التنفيذ',     en: 'In progress', color: 'accent' },
    { key: 'completed',   ar: 'مكتمل',           en: 'Completed',   color: 'ok' },
    { key: 'suspended',   ar: 'متوقف',           en: 'Suspended',   color: 'danger' }
  ];

  L.approval_types = [
    { key: 'proposal_high_value',     ar: 'عرض عالي القيمة',            en: 'High-value proposal' },
    { key: 'discount',                ar: 'خصم على العرض',              en: 'Discounted quotation' },
    { key: 'proposal_submission',     ar: 'تقديم عرض',                  en: 'Proposal submission' },
    { key: 'contract_confirm',        ar: 'تأكيد مرحلة التعاقد',        en: 'Contract-stage confirmation' },
    { key: 'customer_communication',  ar: 'مخاطبة عميل',                en: 'Customer communication' },
    { key: 'bulk_greeting',           ar: 'قائمة تهاني جماعية',         en: 'Bulk greeting list' },
    { key: 'data_export',             ar: 'تصدير بيانات',               en: 'Data export' }
  ];

  L.approval_statuses = [
    { key: 'pending',  ar: 'بانتظار القرار', en: 'Pending',  color: 'warn' },
    { key: 'approved', ar: 'معتمد',          en: 'Approved', color: 'ok' },
    { key: 'rejected', ar: 'مرفوض',          en: 'Rejected', color: 'danger' },
    { key: 'cancelled', ar: 'ملغى',          en: 'Cancelled', color: 'slate' }
  ];

  L.outcomes = [
    { key: 'open',      ar: 'مفتوحة',  en: 'Open',      color: 'info' },
    { key: 'won',       ar: 'مُرساة',  en: 'Won',       color: 'ok' },
    { key: 'lost',      ar: 'خاسرة',   en: 'Lost',      color: 'danger' },
    { key: 'on_hold',   ar: 'معلّقة',  en: 'On hold',   color: 'warn' },
    { key: 'cancelled', ar: 'ملغاة',   en: 'Cancelled', color: 'slate' }
  ];

  L.record_origins = [
    { key: 'platform',   ar: 'مُدخل في المنصة',      en: 'Entered in platform' },
    { key: 'datacentre', ar: 'من مركز البيانات',     en: 'From data centre' },
    { key: 'import',     ar: 'مستورد من ملف',        en: 'Imported from file' },
    { key: 'demo',       ar: 'بيانات أولية',          en: 'Seed data' }
  ];

  L.required_documents = [
    { key: 'cr',           ar: 'السجل التجاري',            en: 'Commercial registration' },
    { key: 'vat_cert',     ar: 'شهادة الضريبة',            en: 'VAT certificate' },
    { key: 'zakat_cert',   ar: 'شهادة الزكاة',             en: 'Zakat certificate' },
    { key: 'gosi',         ar: 'شهادة التأمينات',          en: 'GOSI certificate' },
    { key: 'saudization',  ar: 'شهادة السعودة',            en: 'Saudization certificate' },
    { key: 'classification', ar: 'شهادة تصنيف المقاولين', en: 'Contractor classification' },
    { key: 'bid_bond',     ar: 'الضمان الابتدائي',         en: 'Bid bond' },
    { key: 'technical',    ar: 'العرض الفني',              en: 'Technical proposal' },
    { key: 'commercial',   ar: 'العرض المالي',             en: 'Commercial proposal' },
    { key: 'boq',          ar: 'جدول الكميات المسعّر',     en: 'Priced BOQ' },
    { key: 'program',      ar: 'البرنامج الزمني',          en: 'Programme' },
    { key: 'hse',          ar: 'خطة السلامة',              en: 'HSE plan' },
    { key: 'past_projects', ar: 'سابقة الأعمال',           en: 'Past projects' }
  ];

  /* ---------- Helpers ---------- */
  L.find = function (list, key) {
    var arr = L[list] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].key === key) return arr[i];
    return null;
  };
  L.label = function (list, key, lang) {
    var it = L.find(list, key);
    if (!it) return key || '';
    return lang === 'en' ? (it.en || it.ar) : (it.ar || it.en);
  };
  L.cityLabel = function (regionKey, cityKey, lang) {
    var r = L.find('regions', regionKey);
    if (!r) return cityKey || '';
    for (var i = 0; i < r.cities.length; i++) if (r.cities[i].key === cityKey) return lang === 'en' ? r.cities[i].en : r.cities[i].ar;
    return cityKey || '';
  };
  L.allCities = function () {
    var out = [];
    L.regions.forEach(function (r) { r.cities.forEach(function (c) { out.push({ key: c.key, ar: c.ar, en: c.en, region: r.key }); }); });
    return out;
  };

  root.LOOKUPS = L;
})(typeof window !== 'undefined' ? window : globalThis);
