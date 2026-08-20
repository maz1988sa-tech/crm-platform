/* =====================================================================
   DATA ADAPTER — حدود طبقة البيانات (الواجهة مستقلة عن الخلفية)
   ---------------------------------------------------------------------
   كل محوّل يوفّر نفس الواجهة (كل الدوال تعيد Promise):

   init()                                  → { ok, mode, user }
   auth.signIn(email, password) | auth.signInAs(userId) [محلي] | auth.signOut() | auth.user()
   users()                                 → [{id,email,name_ar,name_en,role,active}]
   snapshot()                              → نسخة للقراءة من كل الكيانات (مع حجب الحقول الحسّاسة حسب الدور)
   get(entity, id)                         → سجل (محجوب حسب الدور)
   create(entity, data)                    → سجل
   update(entity, id, patch, version)      → سجل   (خطأ 'stale' عند تعارض الإصدار)
   archive(entity, id, reason) / restore(entity, id)
   changeStage(oppId, to, {reason, note, version})
   newProposalVersion(proposalId)
   submitProposal(proposalId, {submitted_at, method, version}) → {proposal | approval}
   requestApproval(type, entityType, entityId, payload) → approval
   decideApproval(id, decision, reason)    → approval (وتنفيذ الإجراء المعلّق عند الموافقة)
   convertToContract(oppId, data)          → contract
   prepareHandover(contractId, pkg) / acceptHandover(contractId)
   completeActivity(id, outcome) / rescheduleActivity(id, newDate, reason)
   buildRecipients(criteria, campaignId)   → {recipients, included, excluded}
   campaignSubmit(id) / campaignApprove(id, decision, reason) / campaignExport(id) / campaignRecordSent(id, entries)
   mergeCustomers(keepId, mergeId)
   audit({entity_type, entity_id, limit})
   savedViews.list(module) / save(view) / remove(id)
   importRows(module, rows)                → {inserted, skipped}
   logExport(module, count, filters)       → {allowed, approval?}
   config.get() / config.set(list, items)  [محلي]
   health()                                → {ok, mode, message}

   الأخطاء: كائن Error مع .code ∈ {'forbidden','validation','stale','not_found','invalid_transition','approval_required','network'}
   ===================================================================== */
(function (root) {
  'use strict';

  function AdapterError(code, message, details) {
    var e = new Error(message || code);
    e.code = code; e.details = details || null;
    return e;
  }

  root.ADAPTER = {
    Error: AdapterError,
    create: function (config) {
      var mode = (config && config.data && config.data.adapter) || 'local';
      if (mode === 'supabase' && root.SupabaseAdapter) return new root.SupabaseAdapter(config);
      if (mode === 'supabase' && !root.SupabaseAdapter) throw AdapterError('config', 'SupabaseAdapter not loaded');
      return new root.LocalAdapter(config);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
