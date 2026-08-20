/* =====================================================================
   PERMISSIONS — الأدوار ومصفوفة الصلاحيات (المصدر الوحيد)
   ---------------------------------------------------------------------
   - هذه المصفوفة تُستخدم في الواجهة (إظهار/إخفاء) وفي طبقة البيانات
     (المحوّل المحلي يفرضها كما يفعل الخادم)، وتُولَّد منها بذرة جدول
     role_permissions في Supabase (سكربت supabase/gen-seed.js) حتى لا تتباعد.
   - مبدأ أقل الصلاحيات: ما لم يُمنح صراحة فهو ممنوع.
   - scope: 'all' كل السجلات | 'own' السجلات التي يملكها/يشارك فيها المستخدم فقط.
   ===================================================================== */
(function (root) {
  'use strict';

  var ROLES = [
    { key: 'system_admin',        ar: 'مسؤول النظام',            en: 'System Administrator' },
    { key: 'bd_manager',          ar: 'مدير تطوير الأعمال',      en: 'Business Development Manager' },
    { key: 'bd_employee',         ar: 'موظف تطوير أعمال',        en: 'Business Development Employee' },
    { key: 'proposal_manager',    ar: 'مدير العروض',             en: 'Proposal Manager' },
    { key: 'commercial_reviewer', ar: 'مراجع تجاري',             en: 'Commercial Reviewer' },
    { key: 'contract_reviewer',   ar: 'مراجع عقود',              en: 'Contract Reviewer' },
    { key: 'executive_viewer',    ar: 'مطّلع تنفيذي',            en: 'Executive Viewer' },
    { key: 'readonly_viewer',     ar: 'مطّلع للقراءة فقط',       en: 'Read-Only Viewer' }
  ];

  /* الصلاحيات المعرَّفة في المنصة */
  var PERMISSIONS = [
    { key: 'customers.view',        ar: 'عرض العملاء' },
    { key: 'customers.create',      ar: 'إنشاء عملاء' },
    { key: 'customers.edit',        ar: 'تعديل العملاء' },
    { key: 'customers.archive',     ar: 'أرشفة العملاء' },
    { key: 'contacts.manage',       ar: 'إدارة جهات الاتصال' },
    { key: 'opportunities.view',    ar: 'عرض الفرص' },
    { key: 'opportunities.manage',  ar: 'إنشاء/تعديل الفرص' },
    { key: 'opportunities.stage',   ar: 'تغيير مرحلة الفرصة' },
    { key: 'commercial.view',       ar: 'عرض القيم التجارية الحسّاسة (القيم، الهوامش، الاحتمالية)' },
    { key: 'proposals.view',        ar: 'عرض العروض' },
    { key: 'proposals.manage',      ar: 'إعداد/تعديل العروض' },
    { key: 'proposals.submit',      ar: 'تسجيل تقديم العروض' },
    { key: 'proposals.approve',     ar: 'اعتماد العروض' },
    { key: 'contracts.view',        ar: 'عرض العقود' },
    { key: 'contracts.manage',      ar: 'إدارة العقود' },
    { key: 'contracts.approve',     ar: 'تأكيد مرحلة التعاقد' },
    { key: 'handover.manage',       ar: 'إعداد/استلام حزمة التسليم' },
    { key: 'activities.view',       ar: 'عرض الأنشطة' },
    { key: 'activities.manage',     ar: 'إدارة الأنشطة' },
    { key: 'occasions.manage',      ar: 'إعداد حملات التهاني والمناسبات' },
    { key: 'occasions.approve',     ar: 'اعتماد قوائم التهاني' },
    { key: 'reports.view',          ar: 'عرض التقارير' },
    { key: 'export.data',           ar: 'تصدير البيانات' },
    { key: 'import.data',           ar: 'استيراد البيانات' },
    { key: 'approvals.decide',      ar: 'البت في طلبات الاعتماد (حسب النوع)' },
    { key: 'duplicates.review',     ar: 'مراجعة التكرارات' },
    { key: 'admin.users',           ar: 'إدارة المستخدمين والأدوار' },
    { key: 'admin.config',          ar: 'إدارة الإعدادات والقوائم' },
    { key: 'audit.view',            ar: 'الاطلاع على سجل التدقيق' }
  ];

  /* المصفوفة: role → { permission: scope } ; scope ∈ 'all' | 'own' */
  var ALL = {};
  PERMISSIONS.forEach(function (p) { ALL[p.key] = 'all'; });

  var MATRIX = {
    system_admin: ALL,

    bd_manager: {
      'customers.view': 'all', 'customers.create': 'all', 'customers.edit': 'all', 'customers.archive': 'all',
      'contacts.manage': 'all',
      'opportunities.view': 'all', 'opportunities.manage': 'all', 'opportunities.stage': 'all',
      'commercial.view': 'all',
      'proposals.view': 'all', 'proposals.manage': 'all', 'proposals.submit': 'all', 'proposals.approve': 'all',
      'contracts.view': 'all', 'contracts.manage': 'all', 'contracts.approve': 'all', 'handover.manage': 'all',
      'activities.view': 'all', 'activities.manage': 'all',
      'occasions.manage': 'all', 'occasions.approve': 'all',
      'reports.view': 'all', 'export.data': 'all', 'import.data': 'all',
      'approvals.decide': 'all', 'duplicates.review': 'all', 'audit.view': 'all'
    },

    bd_employee: {
      'customers.view': 'all', 'customers.create': 'all', 'customers.edit': 'own',
      'contacts.manage': 'own',
      'opportunities.view': 'all', 'opportunities.manage': 'own', 'opportunities.stage': 'own',
      'commercial.view': 'own',
      'proposals.view': 'all', 'proposals.manage': 'own',
      'contracts.view': 'own',
      'activities.view': 'all', 'activities.manage': 'own',
      'occasions.manage': 'all',
      'reports.view': 'own', 'export.data': 'own'
    },

    proposal_manager: {
      'customers.view': 'all', 'contacts.manage': 'all',
      'opportunities.view': 'all',
      'commercial.view': 'all',
      'proposals.view': 'all', 'proposals.manage': 'all', 'proposals.submit': 'all', 'proposals.approve': 'all',
      'contracts.view': 'all',
      'activities.view': 'all', 'activities.manage': 'own',
      'reports.view': 'all', 'approvals.decide': 'all'
    },

    commercial_reviewer: {
      'customers.view': 'all', 'opportunities.view': 'all', 'commercial.view': 'all',
      'proposals.view': 'all', 'proposals.approve': 'all',
      'contracts.view': 'all', 'activities.view': 'all', 'reports.view': 'all', 'approvals.decide': 'all'
    },

    contract_reviewer: {
      'customers.view': 'all', 'opportunities.view': 'all', 'commercial.view': 'all',
      'proposals.view': 'all',
      'contracts.view': 'all', 'contracts.manage': 'all', 'contracts.approve': 'all', 'handover.manage': 'all',
      'activities.view': 'all', 'activities.manage': 'own', 'reports.view': 'all', 'approvals.decide': 'all'
    },

    executive_viewer: {
      'customers.view': 'all', 'opportunities.view': 'all', 'commercial.view': 'all',
      'proposals.view': 'all', 'contracts.view': 'all', 'activities.view': 'all', 'reports.view': 'all'
    },

    readonly_viewer: {
      'customers.view': 'all', 'opportunities.view': 'all', 'proposals.view': 'all',
      'activities.view': 'all', 'reports.view': 'all'
    }
  };

  /* أنواع الاعتماد التي يحق لكل دور البت فيها تُقرأ من RULES.approvals[type].approver_roles */

  root.PERMISSIONS_CONFIG = {
    roles: ROLES,
    permissions: PERMISSIONS,
    matrix: MATRIX,
    roleLabel: function (key, lang) {
      for (var i = 0; i < ROLES.length; i++) if (ROLES[i].key === key) return lang === 'en' ? ROLES[i].en : ROLES[i].ar;
      return key || '';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
