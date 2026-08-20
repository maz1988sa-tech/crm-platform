/* =====================================================================
   APP CONFIG — إعدادات المنصة العامة
   ---------------------------------------------------------------------
   - كل ما هو قابل للتغيير بين البيئات يعيش هنا (الاسم، الهوية، المحوّل).
   - لا أسرار هنا إطلاقًا. مفتاح Supabase القابل للنشر (publishable) ليس سرًّا
     والحماية الحقيقية في سياسات RLS على الخادم (انظر supabase/README.md).
   - القيم الحسّاسة للبيئة (رابط المشروع/المفتاح) تُقرأ من src/config/env.js
     إن وُجد، وإلا تعمل المنصة بالمحوّل المحلي التجريبي.
   ===================================================================== */
(function (root) {
  'use strict';

  var ENV = root.APP_ENV || {};

  root.APP_CONFIG = {
    /* اسم المنصة — يُغيَّر هنا فقط وينعكس في كل الشاشات والعناوين */
    platform: {
      name_ar: 'منصة إدارة العملاء والفرص',
      name_en: 'Customer & Opportunity Management Platform',
      short_ar: 'العملاء والفرص',
      short_en: 'CRM',
      company_ar: ENV.company_ar || 'شركة المقاولات',      // اسم الشركة (اختياري، يظهر بجانب الشعار)
      company_en: ENV.company_en || 'Contracting Co.',
      version: '1.0.0',
      build: '2026-08-19',
      classification_ar: 'سرّي — للاستخدام الداخلي',
      classification_en: 'Confidential — internal use'
    },

    /* إعدادات اللغة والتواريخ والعملة */
    locale: {
      default_lang: 'ar',          // ar | en
      currency: 'SAR',
      currency_label_ar: 'ر.س',
      currency_label_en: 'SAR',
      vat_rate: 0.15,              // ضريبة القيمة المضافة الافتراضية
      show_hijri: true,            // عرض التاريخ الهجري (أم القرى) بجانب الميلادي حيث يفيد
      timezone: 'Asia/Riyadh',
      week_start: 0,               // الأحد
      workdays: [0, 1, 2, 3, 4]    // الأحد–الخميس
    },

    /* طبقة البيانات — المحوّل الذي تتحدث معه الواجهة */
    data: {
      adapter: ENV.adapter || 'local',   // local | supabase
      supabase: {
        url: ENV.supabase_url || '',
        anonKey: ENV.supabase_anon_key || '',
        schema: 'public',
        sessionStorage: 'local'          // local | session  (أين تحفظ supabase-js جلسة الدخول)
      },
      request: {
        timeoutMs: 15000,
        retries: 2,
        retryDelayMs: 600,
        pageSize: 50,
        maxPageSize: 200
      },
      demo: {
        enabled: ENV.demo_enabled !== undefined ? !!ENV.demo_enabled : true,  // بيانات تجريبية مُعلَّمة بوضوح
        persistLocally: true,      // حفظ نسخة العمل التجريبية في هذا المتصفح فقط (localStorage) — للتجربة فقط
        storageKey: 'crm-demo-db-v1',
        seed: 20260819
      }
    },

    /* مفاتيح الميزات */
    features: {
      localConfigEditing: true,    // السماح بتعديل القوائم من شاشة الإدارة (في المحوّل المحلي)
      importExcel: true,
      exportViews: true,
      occasionExport: true,        // تصدير قوائم المستلمين (لا إرسال خارجي إطلاقًا)
      externalMessaging: false     // لا توجد أي تكاملات إرسال معتمدة (واتساب/بريد/رسائل) — ممنوع اختراعها
    },

    /* الهوية البصرية — تُطبَّق كمتغيرات CSS عند الإقلاع (assets/styles.css يحمل الافتراضي) */
    theme: {
      primary: '#12355B',   // كحلي عميق — اللون الأساسي
      primary2: '#1E4F82',
      accent: '#0F8B8D',    // أخضر مزرق للتأكيد
      accentSoft: '#DDF3F2',
      warn: '#C98A12',
      danger: '#C0392B',
      ok: '#1E8E5A',
      info: '#2B6FB8'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
