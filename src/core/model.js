/* =====================================================================
   MODEL — تعريف الكيانات، القيم الافتراضية، التحقق، القيم المشتقة
   ---------------------------------------------------------------------
   تمييز واضح بين:
   - بيانات رئيسية من مركز البيانات (origin='datacentre', source_system/source_id)
   - بيانات مُدخلة في المنصة (origin='platform' | 'import' | 'demo')
   - قيم مشتقة تحسبها المنصة (لا تُخزَّن؛ تُحسب عند القراءة: weighted_value, days_in_stage …)
   - سجلات تدقيق تاريخية (audit_log, stage_history) — لا تُعدَّل أبدًا
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, L = root.LOOKUPS, STAGES = root.STAGES, RULES = root.RULES;

  /* بادئات المعرّفات المرجعية */
  var PREFIX = { customer: 'CUS', contact: 'CON', opportunity: 'OPP', proposal: 'PRP', contract: 'CTR', project: 'PRJ', activity: 'ACT', campaign: 'CMP', approval: 'APR' };

  /* الحقول الحسّاسة تجاريًا — تُحجب عمّن لا يملك commercial.view */
  var SENSITIVE = {
    opportunity: ['estimated_value', 'expected_margin_pct', 'probability', 'competitors'],
    proposal: ['proposed_value', 'vat_amount', 'discount_pct'],
    contract: ['contract_value', 'vat_amount'],
    project: ['value'],
    customer: ['potential_value']
  };

  /* تعريف الحقول (للتحقق والاستيراد والنماذج) */
  var FIELDS = {
    customer: {
      name_ar: { type: 'text', max: 200 }, name_en: { type: 'text', max: 200 },
      customer_type: { type: 'lookup', list: 'customer_types' }, sector: { type: 'lookup', list: 'sectors' },
      classification: { type: 'lookup', list: 'customer_classes' },
      cr_number: { type: 'digits', len: 10 }, unified_number: { type: 'unified' }, vat_number: { type: 'digits', len: 15 },
      website: { type: 'text', max: 200 }, phone: { type: 'phone' }, email: { type: 'email' }, address: { type: 'text', max: 400 },
      region: { type: 'lookup', list: 'regions' }, city: { type: 'text', max: 80 },
      status: { type: 'lookup', list: 'customer_statuses' }, source: { type: 'lookup', list: 'customer_sources' },
      owner_id: { type: 'user' }, secondary_owner_id: { type: 'user' },
      relationship_strength: { type: 'lookup', list: 'relationship_strength' }, strategic_importance: { type: 'lookup', list: 'importance' },
      preferred_language: { type: 'lookup', list: 'languages' }, procurement_portal: { type: 'text', max: 200 },
      vendor_registration: { type: 'lookup', list: 'vendor_registration' }, prequalification: { type: 'lookup', list: 'prequalification' },
      confidentiality: { type: 'lookup', list: 'confidentiality' }, notes: { type: 'text', max: 4000 }, tags: { type: 'tags' },
      potential_value: { type: 'money' }, known_projects: { type: 'text', max: 2000 }
    },
    contact: {
      customer_id: { type: 'ref', entity: 'customer' }, full_name: { type: 'text', max: 150 }, position: { type: 'text', max: 120 },
      department: { type: 'text', max: 120 }, seniority: { type: 'lookup', list: 'seniority' }, roles: { type: 'multi', list: 'contact_roles' },
      phone: { type: 'phone' }, email: { type: 'email' }, preferred_channel: { type: 'lookup', list: 'contact_channels' },
      preferred_language: { type: 'lookup', list: 'languages' }, last_contact_at: { type: 'date' }, next_follow_up: { type: 'date' },
      notes: { type: 'text', max: 2000 }, greeting_opt_out: { type: 'bool' }, active: { type: 'bool' }, is_primary: { type: 'bool' }
    },
    opportunity: {
      customer_id: { type: 'ref', entity: 'customer' }, main_contact_id: { type: 'ref', entity: 'contact' },
      name: { type: 'text', max: 200 }, project_name: { type: 'text', max: 200 }, description: { type: 'text', max: 4000 },
      project_type: { type: 'lookup', list: 'project_types' }, sector: { type: 'lookup', list: 'sectors' },
      region: { type: 'lookup', list: 'regions' }, city: { type: 'text', max: 80 }, source: { type: 'lookup', list: 'opportunity_sources' },
      tender_ref: { type: 'text', max: 80 }, estimated_value: { type: 'money' }, expected_margin_pct: { type: 'pct' }, probability: { type: 'pct' },
      stage: { type: 'stage' }, stage_entered_at: { type: 'date' }, expected_award_date: { type: 'date' }, submission_deadline: { type: 'date' },
      competitors: { type: 'text', max: 500 }, owner_id: { type: 'user' }, team_ids: { type: 'users' },
      next_action: { type: 'text', max: 300 }, next_action_due: { type: 'date' }, risk_level: { type: 'lookup', list: 'risk_levels' },
      priority: { type: 'lookup', list: 'priorities' }, required_documents: { type: 'docs' }, loss_reason: { type: 'lookup', list: 'loss_reasons' },
      lessons_learned: { type: 'text', max: 4000 }, notes: { type: 'text', max: 4000 },
      expected_start_date: { type: 'date' }, expected_duration_months: { type: 'int' }, payment_terms: { type: 'lookup', list: 'payment_terms' },
      retention_pct: { type: 'pct' }, warranty_months: { type: 'int' }, bid_bond_required: { type: 'bool' }, bid_bond_pct: { type: 'pct' },
      vat_treatment: { type: 'lookup', list: 'vat_treatments' }, confidentiality: { type: 'lookup', list: 'confidentiality' },
      waiting_on: { type: 'enum', values: ['us', 'customer', 'none'] }
    },
    proposal: {
      opportunity_id: { type: 'ref', entity: 'opportunity' }, version_no: { type: 'int' },
      technical_status: { type: 'lookup', list: 'doc_statuses' }, commercial_status: { type: 'lookup', list: 'doc_statuses' },
      status: { type: 'lookup', list: 'proposal_statuses' }, owner_id: { type: 'user' }, reviewer_ids: { type: 'users' },
      approval_status: { type: 'enum', values: ['not_required', 'pending', 'approved', 'rejected'] },
      submission_deadline: { type: 'date' }, submitted_at: { type: 'date' }, submission_method: { type: 'lookup', list: 'submission_methods' },
      proposed_value: { type: 'money' }, vat_treatment: { type: 'lookup', list: 'vat_treatments' }, validity_days: { type: 'int' },
      discount_pct: { type: 'pct' }, attachments: { type: 'list' }, clarifications: { type: 'list' }, comments: { type: 'list' },
      result: { type: 'enum', values: ['pending', 'accepted', 'rejected', 'expired', 'withdrawn'] }, notes: { type: 'text', max: 4000 }
    },
    contract: {
      opportunity_id: { type: 'ref', entity: 'opportunity' }, customer_id: { type: 'ref', entity: 'customer' }, proposal_id: { type: 'ref', entity: 'proposal' },
      contract_ref: { type: 'text', max: 100 }, status: { type: 'lookup', list: 'contract_statuses' }, contract_value: { type: 'money' },
      vat_treatment: { type: 'lookup', list: 'vat_treatments' }, signed_at: { type: 'date' }, start_date: { type: 'date' }, duration_months: { type: 'int' },
      end_date: { type: 'date' }, payment_terms: { type: 'lookup', list: 'payment_terms' }, retention_pct: { type: 'pct' }, warranty_months: { type: 'int' },
      performance_bond_pct: { type: 'pct' }, advance_payment_pct: { type: 'pct' }, key_commitments: { type: 'text', max: 4000 },
      exclusions: { type: 'text', max: 4000 }, key_risks: { type: 'text', max: 4000 }, review_notes: { type: 'text', max: 4000 }, reviewer_id: { type: 'user' },
      handover_status: { type: 'lookup', list: 'handover_statuses' }, handover: { type: 'object' }, delivery_ref: { type: 'text', max: 100 }
    },
    project: {
      contract_id: { type: 'ref', entity: 'contract' }, customer_id: { type: 'ref', entity: 'customer' }, name: { type: 'text', max: 200 },
      status: { type: 'lookup', list: 'project_statuses' }, region: { type: 'lookup', list: 'regions' }, city: { type: 'text', max: 80 },
      start_date: { type: 'date' }, expected_end_date: { type: 'date' }, value: { type: 'money' }, delivery_ref: { type: 'text', max: 100 }
    },
    activity: {
      customer_id: { type: 'ref', entity: 'customer' }, contact_id: { type: 'ref', entity: 'contact' }, opportunity_id: { type: 'ref', entity: 'opportunity' },
      type: { type: 'lookup', list: 'activity_types' }, at: { type: 'datetime' }, owner_id: { type: 'user' }, participants: { type: 'text', max: 400 },
      purpose: { type: 'text', max: 500 }, outcome: { type: 'text', max: 2000 }, notes: { type: 'text', max: 4000 }, next_action: { type: 'text', max: 300 },
      due_date: { type: 'date' }, status: { type: 'lookup', list: 'activity_statuses' }, priority: { type: 'lookup', list: 'priorities' },
      attachment_ref: { type: 'text', max: 300 }, completed_at: { type: 'datetime' }
    },
    campaign: {
      occasion_key: { type: 'text' }, year: { type: 'int' }, title: { type: 'text', max: 200 }, template_ar: { type: 'text', max: 2000 },
      template_en: { type: 'text', max: 2000 }, design_ref: { type: 'text', max: 300 }, status: { type: 'enum', values: ['draft', 'pending_approval', 'approved', 'exported', 'closed'] },
      recipients: { type: 'list' }, criteria: { type: 'object' }, sent_log: { type: 'list' }, approved_by: { type: 'user' }, approved_at: { type: 'datetime' }
    }
  };

  function baseDefaults(entity, userId) {
    var now = U.isoDateTime(U.now());
    return { id: null, created_at: now, created_by: userId || null, updated_at: now, updated_by: userId || null, version: 1, origin: 'platform', archived_at: null };
  }

  var DEFAULTS = {
    customer: function (uid) { return Object.assign(baseDefaults('customer', uid), { name_ar: '', name_en: '', customer_type: 'private', sector: '', classification: 'C', status: 'prospect', source: 'direct_approach', owner_id: uid || null, relationship_strength: 'medium', strategic_importance: 'medium', preferred_language: 'ar', vendor_registration: 'not_required', prequalification: 'not_required', confidentiality: 'internal', tags: [], region: '', city: '' }); },
    contact: function (uid) { return Object.assign(baseDefaults('contact', uid), { full_name: '', roles: [], preferred_channel: 'phone', preferred_language: 'ar', greeting_opt_out: false, active: true, is_primary: false }); },
    opportunity: function (uid) { return Object.assign(baseDefaults('opportunity', uid), { name: '', stage: 'opportunity_identified', stage_entered_at: U.today(), probability: STAGES.get('opportunity_identified').probability, priority: 'medium', risk_level: 'medium', owner_id: uid || null, team_ids: [], required_documents: [], vat_treatment: 'standard', bid_bond_required: false, confidentiality: 'internal', waiting_on: 'us', source: 'etimad' }); },
    proposal: function (uid) { return Object.assign(baseDefaults('proposal', uid), { version_no: 1, technical_status: 'not_started', commercial_status: 'not_started', status: 'not_started', owner_id: uid || null, reviewer_ids: [], approval_status: 'not_required', validity_days: RULES.defaults.proposal_validity_days, vat_treatment: 'standard', discount_pct: 0, attachments: [], clarifications: [], comments: [], result: 'pending' }); },
    contract: function (uid) { return Object.assign(baseDefaults('contract', uid), { status: 'under_review', vat_treatment: 'standard', retention_pct: RULES.defaults.retention_pct, warranty_months: RULES.defaults.warranty_months, performance_bond_pct: RULES.defaults.performance_bond_pct, advance_payment_pct: RULES.defaults.advance_payment_pct, payment_terms: 'monthly_ipc', handover_status: 'not_started', handover: null }); },
    project: function (uid) { return Object.assign(baseDefaults('project', uid), { status: 'handed_over' }); },
    activity: function (uid) { return Object.assign(baseDefaults('activity', uid), { type: 'call', at: U.isoDateTime(U.now()), owner_id: uid || null, status: 'planned', priority: 'medium' }); },
    campaign: function (uid) { return Object.assign(baseDefaults('campaign', uid), { status: 'draft', recipients: [], sent_log: [], criteria: {}, year: U.now().getFullYear() }); }
  };

  /* ---------- التحقق ---------- */
  function validateField(def, value, entity, key) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return null;
    switch (def.type) {
      case 'text': if (typeof value !== 'string') return 'app.invalid_number'; if (def.max && value.length > def.max) return 'app.invalid_number'; return null;
      case 'email': return U.isEmail(value) ? null : 'app.invalid_email';
      case 'phone': return U.isPhone(value) ? null : 'app.invalid_phone';
      case 'digits': return U.isDigits(value, def.len) ? null : (def.len === 15 ? 'app.invalid_vat' : 'app.invalid_cr');
      case 'unified': return (U.isDigits(value, 10) && U.latinDigits(value).charAt(0) === '7') ? null : 'app.invalid_unified';
      case 'money': { var n = U.num(value); return (n === null || n < 0) ? 'app.invalid_number' : null; }
      case 'pct': { var p = U.num(value); return (p === null || p < 0 || p > 100) ? 'app.invalid_number' : null; }
      case 'int': { var i = U.num(value); return (i === null || i < 0 || i % 1 !== 0) ? 'app.invalid_number' : null; }
      case 'date': return U.parseDate(value) ? null : 'app.invalid_date';
      case 'datetime': return U.parseDate(value) ? null : 'app.invalid_date';
      case 'lookup': return L.find(def.list, value) ? null : 'app.invalid_number';
      case 'multi': { for (var j = 0; j < value.length; j++) if (!L.find(def.list, value[j])) return 'app.invalid_number'; return null; }
      case 'stage': return STAGES.get(value) ? null : 'app.invalid_number';
      case 'enum': return def.values.indexOf(value) >= 0 ? null : 'app.invalid_number';
      default: return null;
    }
  }

  var M = {
    PREFIX: PREFIX, SENSITIVE: SENSITIVE, FIELDS: FIELDS,
    defaults: function (entity, uid) { return DEFAULTS[entity] ? DEFAULTS[entity](uid) : baseDefaults(entity, uid); },
    entities: Object.keys(FIELDS),

    /* يعيد {ok, errors:{field: msgKey}} */
    validate: function (entity, rec) {
      var errors = {};
      var req = (RULES.required_fields[entity] || []);
      req.forEach(function (f) {
        var v = rec[f];
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) errors[f] = 'app.field_required';
      });
      var defs = FIELDS[entity] || {};
      Object.keys(defs).forEach(function (k) {
        if (errors[k]) return;
        var e = validateField(defs[k], rec[k], entity, k);
        if (e) errors[k] = e;
      });
      /* قواعد خاصة */
      if (entity === 'opportunity') {
        if (rec.stage === 'lost' && !rec.loss_reason) errors.loss_reason = 'app.field_required';
      }
      if (entity === 'customer') {
        if (!rec.name_ar && !rec.name_en) errors.name_ar = 'app.field_required';
      }
      return { ok: Object.keys(errors).length === 0, errors: errors };
    },

    /* تطبيع القيم قبل الحفظ (أرقام لاتينية، قصّ، أنواع) */
    normalize: function (entity, rec) {
      var defs = FIELDS[entity] || {};
      var out = U.clone(rec);
      Object.keys(defs).forEach(function (k) {
        var d = defs[k], v = out[k];
        if (v === undefined) return;
        if (typeof v === 'string') v = v.trim();
        switch (d.type) {
          case 'digits': case 'unified': case 'phone': v = v ? U.latinDigits(v) : v; if (d.type === 'phone' && v) v = U.normPhone(v); break;
          case 'money': case 'pct': case 'int': v = v === '' || v === null ? null : U.num(v); break;
          case 'bool': v = v === true || v === 'true' || v === 1 || v === '1'; break;
          case 'tags': v = U.splitTags(v); break;
          case 'email': v = v ? String(v).toLowerCase() : v; break;
          case 'date': v = v ? U.isoDate(v) : null; break;
          case 'datetime': v = v ? U.isoDateTime(v) : null; break;
          default: break;
        }
        out[k] = v === '' ? null : v;
      });
      return out;
    },

    /* ---------- القيم المشتقة (لا تُخزَّن) ---------- */
    weightedValue: function (opp) {
      var v = U.num(opp.estimated_value), p = U.num(opp.probability);
      if (v === null || p === null) return null;
      return Math.round(v * p / 100);
    },
    daysInStage: function (opp) { var d = U.daysSince(opp.stage_entered_at || opp.created_at); return d === null ? null : Math.max(0, d); },
    outcome: function (opp) { return STAGES.outcomeOf(opp.stage); },
    vatOf: function (value, treatment) { var it = L.find('vat_treatments', treatment || 'standard'); var rate = it ? it.rate : 0.15; var v = U.num(value); return v === null ? null : Math.round(v * rate * 100) / 100; },
    proposalValidUntil: function (p) { if (!p.submitted_at || !p.validity_days) return null; return U.isoDate(U.addDays(p.submitted_at, +p.validity_days)); },
    proposalNumber: function (p) { return p.id + (p.version_no > 1 ? ('/v' + p.version_no) : ''); },
    displayName: function (entity, rec, lang) {
      if (!rec) return '';
      switch (entity) {
        case 'customer': return lang === 'en' ? (rec.name_en || rec.name_ar) : (rec.name_ar || rec.name_en);
        case 'contact': return rec.full_name;
        case 'opportunity': return rec.name || rec.project_name || rec.id;
        case 'proposal': return M.proposalNumber(rec);
        case 'contract': return rec.id + (rec.contract_ref ? ' · ' + rec.contract_ref : '');
        case 'project': return rec.name || rec.id;
        case 'activity': return rec.purpose || rec.type;
        case 'campaign': return rec.title || rec.id;
        default: return rec.name || rec.id;
      }
    },
    contractEndDate: function (c) { if (!c.start_date || !c.duration_months) return c.end_date || null; return U.isoDate(U.addMonths(c.start_date, +c.duration_months)); },

    /* حجب الحقول الحسّاسة لمن لا يملك الصلاحية — يُستخدم في طبقة البيانات (الخادم) والواجهة */
    mask: function (entity, rec) {
      var s = SENSITIVE[entity]; if (!s || !rec) return rec;
      var out = U.clone(rec);
      s.forEach(function (k) { if (k in out) out[k] = null; });
      out._masked = true;
      return out;
    }
  };

  root.MODEL = M;
})(typeof window !== 'undefined' ? window : globalThis);
