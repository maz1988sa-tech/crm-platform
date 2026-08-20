/* =====================================================================
   ENV — إعدادات البيئة (يُحمَّل قبل app.config.js)
   ---------------------------------------------------------------------
   - adapter: 'local'    → بيانات محلية في المتصفح (بلا خادم).
   - adapter: 'supabase' → الخلفية الحقيقية (مشروع Supabase مستقل عن منصة التوظيف).
   - المفتاح أدناه هو المفتاح "القابل للنشر" (publishable) وهو مصمَّم ليكون عامًا؛
     الحماية الفعلية في سياسات RLS ودوال RPC على الخادم. لا تضع مفتاح service_role هنا أبدًا.
   ===================================================================== */
(function (root) {
  'use strict';
  root.APP_ENV = {
    adapter: 'supabase',
    demo_enabled: false,
    company_ar: 'شركة المقاولات',
    company_en: 'Contracting Co.',
    supabase_url: 'https://puspnaiwrewiuezfvyls.supabase.co',
    supabase_anon_key: 'sb_publishable_XcZF3TmIo5nGqlHJ81oDsQ_X6B7HUTP'
  };
})(typeof window !== 'undefined' ? window : globalThis);
