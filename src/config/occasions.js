/* =====================================================================
   OCCASIONS — تقويم المناسبات الرسمية وقوالب الرسائل المعتمدة
   ---------------------------------------------------------------------
   - القاعدة: لا إرسال تلقائي لأي رسالة. المنصة تُعد قائمة المستلمين والرسالة
     المعتمدة وتُصدّرها بعد اعتماد بشري، وتسجّل ما أُرسل ولمن وبواسطة من.
   - date: { type:'hijri', month, day } أو { type:'gregorian', month, day } أو { type:'event' }
   - policy_gated: مناسبة تتطلب موافقة سياسة الشركة قبل تفعيلها (معطّلة افتراضيًا).
   - التهاني لا تُعد نشاطًا بيعيًا ولا تؤثر على احتمالية الفرص.
   ===================================================================== */
(function (root) {
  'use strict';

  var OCCASIONS = [
    { key: 'ramadan',            ar: 'حلول شهر رمضان',     en: 'Ramadan',              type: 'religious', date: { type: 'hijri', month: 9,  day: 1 },  enabled: true,  prep_days: 7 },
    { key: 'eid_fitr',           ar: 'عيد الفطر',          en: 'Eid al-Fitr',          type: 'religious', date: { type: 'hijri', month: 10, day: 1 },  enabled: true,  prep_days: 7 },
    { key: 'eid_adha',           ar: 'عيد الأضحى',         en: 'Eid al-Adha',          type: 'religious', date: { type: 'hijri', month: 12, day: 10 }, enabled: true,  prep_days: 7 },
    { key: 'founding_day',       ar: 'يوم التأسيس',        en: 'Founding Day',         type: 'national',  date: { type: 'gregorian', month: 2, day: 22 }, enabled: true, prep_days: 7 },
    { key: 'national_day',       ar: 'اليوم الوطني',       en: 'Saudi National Day',   type: 'national',  date: { type: 'gregorian', month: 9, day: 23 }, enabled: true, prep_days: 7 },
    { key: 'new_year',           ar: 'رأس السنة الميلادية', en: 'New Year',            type: 'calendar',  date: { type: 'gregorian', month: 1, day: 1 },  enabled: false, policy_gated: true, prep_days: 5 },
    { key: 'contract_award',     ar: 'ترسية عقد',          en: 'Contract award',       type: 'event',     date: { type: 'event' }, enabled: true },
    { key: 'project_completion', ar: 'إنجاز مشروع',        en: 'Project completion',   type: 'event',     date: { type: 'event' }, enabled: true },
    { key: 'customer_milestone', ar: 'إنجاز/مناسبة للعميل', en: 'Customer milestone',  type: 'event',     date: { type: 'event' }, enabled: true },
    { key: 'other',              ar: 'مناسبة أخرى معتمدة',  en: 'Other approved occasion', type: 'event', date: { type: 'event' }, enabled: true }
  ];

  /* قوالب الرسائل المعتمدة — {customer} {contact} {company} تُستبدل عند الإعداد */
  var TEMPLATES = {
    ramadan: {
      ar: 'يسرّ {company} أن تهنئكم بحلول شهر رمضان المبارك، سائلين الله أن يعيده عليكم وعلى {customer} باليمن والبركات. تقبّل الله طاعتكم.',
      en: '{company} extends its warmest greetings to you and {customer} on the advent of the holy month of Ramadan. May it bring peace and blessings.'
    },
    eid_fitr: {
      ar: 'يتقدّم فريق {company} إليكم وإلى منسوبي {customer} بأصدق التهاني بمناسبة عيد الفطر المبارك، أعاده الله عليكم بالخير واليمن والبركات.',
      en: 'On behalf of {company}, we wish you and {customer} a blessed Eid al-Fitr. Eid Mubarak.'
    },
    eid_adha: {
      ar: 'بمناسبة عيد الأضحى المبارك، نتقدّم إليكم وإلى {customer} بأطيب التهاني والتبريكات، تقبّل الله من الجميع صالح الأعمال.',
      en: 'On the occasion of Eid al-Adha, {company} extends its sincere greetings to you and {customer}. Eid Mubarak.'
    },
    founding_day: {
      ar: 'بمناسبة يوم التأسيس، نشارككم الاعتزاز بتاريخ وطننا العريق، ونتطلع إلى مواصلة شراكتنا مع {customer} في مسيرة البناء والتنمية.',
      en: 'On Founding Day, {company} shares with you and {customer} the pride in our nation’s heritage and looks forward to continued partnership.'
    },
    national_day: {
      ar: 'بمناسبة اليوم الوطني للمملكة العربية السعودية، نهنئكم ونهنئ {customer}، ونجدد العهد بالإسهام في بناء الوطن وتحقيق رؤيته.',
      en: 'On Saudi National Day, {company} congratulates you and {customer}, renewing our commitment to contributing to the Kingdom’s growth.'
    },
    new_year: {
      ar: 'يتمنى لكم فريق {company} عامًا جديدًا حافلًا بالنجاح والتوفيق لكم ولـ{customer}.',
      en: '{company} wishes you and {customer} a successful new year.'
    },
    contract_award: {
      ar: 'نشكر {customer} على ثقتها الغالية بترسية المشروع على {company}، ونؤكد التزامنا بالتنفيذ وفق أعلى معايير الجودة.',
      en: 'We thank {customer} for entrusting {company} with the project award and reaffirm our commitment to the highest standards of delivery.'
    },
    project_completion: {
      ar: 'يسرّنا في {company} أن نهنئ {customer} بإنجاز المشروع، شاكرين تعاونكم طوال مراحل التنفيذ.',
      en: '{company} congratulates {customer} on the successful completion of the project and thanks you for your cooperation throughout.'
    },
    customer_milestone: {
      ar: 'نتقدّم إليكم في {customer} بخالص التهاني بهذه المناسبة، متمنين لكم دوام التوفيق والنجاح.',
      en: 'Our sincere congratulations to {customer} on this milestone, with best wishes for continued success.'
    },
    other: { ar: '', en: '' }
  };

  root.OCCASIONS_CONFIG = {
    list: OCCASIONS,
    templates: TEMPLATES,
    get: function (key) { for (var i = 0; i < OCCASIONS.length; i++) if (OCCASIONS[i].key === key) return OCCASIONS[i]; return null; },
    label: function (key, lang) { var o = this.get(key); return o ? (lang === 'en' ? o.en : o.ar) : (key || ''); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
