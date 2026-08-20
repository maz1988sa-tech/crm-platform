/* =====================================================================
   RULES — قواعد العمل القابلة للتهيئة (عتبات، تذكيرات، اعتمادات، جودة البيانات)
   ---------------------------------------------------------------------
   لا توجد أي "خوارزمية تقييم" أو ذكاء اصطناعي: كل المؤشرات تُحسب بقواعد شفافة
   مُعلنة هنا، ويمكن لمسؤول النظام تعديلها دون المساس بكود الواجهة.
   ===================================================================== */
(function (root) {
  'use strict';

  root.RULES = {
    /* تقادم الفرص وصحة المسار */
    hygiene: {
      no_activity_days: 14,            // فرصة بلا أي نشاط مسجَّل خلال هذه المدة → "بلا نشاط حديث"
      stuck_factor: 1.0,               // الفرصة عالقة إذا تجاوزت max_days للمرحلة × هذا المعامل
      high_value_threshold: 5000000,   // فرصة "عالية القيمة" (ر.س) — تتطلب إجراءً تاليًا موثّقًا
      expected_award_passed_grace_days: 0,
      proposal_expiry_grace_days: 0,
      customer_no_interaction_days: 60 // عميل بلا تفاعل خلال هذه المدة → يحتاج متابعة
    },

    /* التذكيرات والتصعيد (تُحسب عند عرض الشاشة — لا إرسال خارجي) */
    reminders: {
      deadline_warning_days: [7, 3, 1], // تنبيهات قبل موعد إغلاق التقديم
      due_soon_days: 3,                 // إجراء "قريب" إذا كان استحقاقه خلال هذه الأيام
      escalate_overdue_priority: ['high', 'critical'],  // أولويات تُصعَّد عند التأخر
      escalate_after_days: 2,           // التصعيد إلى مدير تطوير الأعمال بعد هذا العدد من أيام التأخر
      escalate_to_role: 'bd_manager'
    },

    /* عتبات الاعتماد — أي إجراء هنا يُنشئ طلب اعتماد قبل تنفيذه */
    approvals: {
      proposal_high_value:    { enabled: true, threshold: 5000000, approver_roles: ['bd_manager', 'system_admin'] },
      discount:               { enabled: true, threshold_pct: 5,     approver_roles: ['commercial_reviewer', 'bd_manager', 'system_admin'] },
      proposal_submission:    { enabled: true,                        approver_roles: ['proposal_manager', 'bd_manager', 'system_admin'] },
      contract_confirm:       { enabled: true,                        approver_roles: ['contract_reviewer', 'bd_manager', 'system_admin'] },
      customer_communication: { enabled: true,                        approver_roles: ['bd_manager', 'system_admin'] },
      bulk_greeting:          { enabled: true, min_recipients: 1,     approver_roles: ['bd_manager', 'system_admin'] },
      data_export:            { enabled: true,                        approver_roles: ['bd_manager', 'system_admin'], exempt_roles: ['bd_manager', 'system_admin'] }
    },

    /* الحقول الإلزامية عند الإنشاء (جودة البيانات الأساسية) */
    required_fields: {
      customer:    ['name_ar', 'customer_type', 'region', 'status', 'owner_id'],
      contact:     ['customer_id', 'full_name'],
      opportunity: ['customer_id', 'name', 'stage', 'owner_id'],
      proposal:    ['opportunity_id', 'owner_id'],
      contract:    ['opportunity_id', 'customer_id'],
      activity:    ['customer_id', 'type', 'at', 'owner_id']
    },

    /* فحوصات جودة البيانات (المفتاح = اسم الفحص المعروض في شاشة الجودة) */
    data_quality: {
      customer_missing_contact_details: true,   // لا هاتف ولا بريد للعميل
      customer_no_owner: true,
      customer_no_contacts: true,
      customer_overdue_follow_up: true,
      opportunity_no_next_action: true,
      opportunity_missing_value: true,
      opportunity_missing_award_date: true,     // للمراحل من "بانتظار إعداد العرض" فصاعدًا
      opportunity_no_owner: true,
      proposal_missing_deadline: true,
      contract_handover_incomplete: true,
      contact_missing_details: true             // جهة اتصال بلا هاتف ولا بريد
    },

    /* المدد الافتراضية */
    defaults: {
      proposal_validity_days: 90,
      warranty_months: 12,
      retention_pct: 10,
      bid_bond_pct: 1,
      performance_bond_pct: 5,
      advance_payment_pct: 10
    },

    /* الاستيراد */
    import: {
      max_rows: 5000,
      max_file_mb: 10,
      allowed_extensions: ['xlsx', 'xls', 'csv'],
      reject_formulas: true    // أي خلية تبدأ بـ = + - @ تُرفض (حقن صيغ)
    },

    /* كشف التكرار */
    duplicates: {
      name_similarity: 0.88,   // نسبة تشابه الاسم (بعد التطبيع) لاعتبار اشتباه تكرار
      strong_keys: ['cr_number', 'unified_number', 'vat_number'],   // تطابق أي منها = تكرار مؤكد
      contact_keys: ['email', 'phone']
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
