/* =====================================================================
   PERMS — محرك الصلاحيات (يُستخدم في الواجهة وفي طبقة البيانات كخادم)
   ---------------------------------------------------------------------
   - can(user, perm)                → هل الدور يملك الصلاحية (بأي نطاق)
   - scope(user, perm)              → 'all' | 'own' | null
   - canRecord(user, perm, record)  → مع مراعاة الملكية إن كان النطاق 'own'
   - owns(user, record)             → owner_id / secondary_owner_id / team_ids / created_by
   - approverRoles(type)            → أدوار الاعتماد لنوع معين من RULES.approvals
   - canDecide(user, type)          → هل يحق له البت في هذا النوع
   - needsApproval(user, type, ctx) → هل يلزم اعتماد (حسب العتبة والدور)
   ===================================================================== */
(function (root) {
  'use strict';
  var PC = root.PERMISSIONS_CONFIG, RULES = root.RULES;

  function matrix(role) { return (PC.matrix[role]) || {}; }

  var P = {
    roles: PC.roles,
    can: function (user, perm) { if (!user || !user.role || user.active === false) return false; return !!matrix(user.role)[perm]; },
    scope: function (user, perm) { if (!user || !user.role) return null; return matrix(user.role)[perm] || null; },
    owns: function (user, rec) {
      if (!user || !rec) return false;
      if (rec.owner_id === user.id || rec.secondary_owner_id === user.id || rec.created_by === user.id || rec.reviewer_id === user.id) return true;
      if (Array.isArray(rec.team_ids) && rec.team_ids.indexOf(user.id) >= 0) return true;
      if (Array.isArray(rec.reviewer_ids) && rec.reviewer_ids.indexOf(user.id) >= 0) return true;
      return false;
    },
    /* parents: سجلات أب (مثل العميل لفرصة) لتقييم الملكية عبر الكيان الأب */
    canRecord: function (user, perm, rec, parents) {
      var s = P.scope(user, perm);
      if (!s) return false;
      if (s === 'all') return true;
      if (!rec) return true;                     // إنشاء سجل جديد بنطاق own مسموح (سيُملك)
      if (P.owns(user, rec)) return true;
      if (parents && parents.length) for (var i = 0; i < parents.length; i++) if (P.owns(user, parents[i])) return true;
      return false;
    },
    approverRoles: function (type) { var a = RULES.approvals[type]; return a ? (a.approver_roles || []) : []; },
    canDecide: function (user, type) {
      if (!user) return false;
      if (!P.can(user, 'approvals.decide')) return false;
      return P.approverRoles(type).indexOf(user.role) >= 0;
    },
    /* ctx: { value, discount_pct, recipients } */
    needsApproval: function (user, type, ctx) {
      var a = RULES.approvals[type];
      if (!a || a.enabled === false) return false;
      ctx = ctx || {};
      if (a.exempt_roles && user && a.exempt_roles.indexOf(user.role) >= 0) return false;
      switch (type) {
        case 'proposal_high_value': return (ctx.value || 0) >= a.threshold;
        case 'discount': return (ctx.discount_pct || 0) > a.threshold_pct;
        case 'bulk_greeting': return (ctx.recipients || 0) >= (a.min_recipients || 1);
        default: return true;
      }
    },
    roleLabel: function (role, lang) { return PC.roleLabel(role, lang); },
    /* هل يرى القيم التجارية لهذا السجل */
    canSeeCommercial: function (user, rec, parents) { return P.canRecord(user, 'commercial.view', rec, parents); },
    /* الصفحات/الوحدات المسموح عرضها */
    canViewModule: function (user, mod) {
      var map = {
        overview: ['reports.view'], mywork: ['activities.view'], customers: ['customers.view'], opportunities: ['opportunities.view'],
        proposals: ['proposals.view'], contracts: ['contracts.view'], activities: ['activities.view'], occasions: ['occasions.manage', 'occasions.approve'],
        reports: ['reports.view'], admin: ['admin.users', 'admin.config', 'audit.view', 'import.data', 'duplicates.review', 'approvals.decide', 'export.data']
      };
      var need = map[mod] || [];
      for (var i = 0; i < need.length; i++) if (P.can(user, need[i])) return true;
      return false;
    }
  };

  root.PERMS = P;
})(typeof window !== 'undefined' ? window : globalThis);
