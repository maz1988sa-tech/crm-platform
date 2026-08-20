/* =====================================================================
   FORMS — نماذج الكيانات الموحدة (تُستخدم من كل الشاشات لضمان التطابق)
   كل دالة تفتح نافذة نموذج وتعيد Promise<record|null>
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, STAGES = root.STAGES, MODEL = root.MODEL, RULES = root.RULES, PERMS = root.PERMS;

  var F = {};
  function after(p) { return p.then(function (r) { return root.APP.refresh().then(function () { return r; }); }); }
  function cityOptions(region) { var r = L.find('regions', region); return (r ? r.cities : L.allCities()).map(function (c) { return { value: c.key, label: S.lang === 'en' ? c.en : c.ar }; }); }

  /* ---------- العميل ---------- */
  F.customer = function (rec) {
    var isNew = !rec, v = rec ? U.clone(rec) : MODEL.defaults('customer', S.user.id);
    var locked = rec ? !S.seesCommercial(rec) : false;
    return new Promise(function (resolve) {
      var fields = [
        { type: 'section', label: t('cu.org_info') },
        { key: 'name_ar', label: t('cu.name_ar'), type: 'text', required: true, max: 200 },
        { key: 'name_en', label: t('cu.name_en'), type: 'text', dir: 'ltr', max: 200 },
        { key: 'customer_type', label: t('cu.type'), type: 'select', lookup: 'customer_types', required: true },
        { key: 'sector', label: t('cu.sector'), type: 'select', lookup: 'sectors' },
        { key: 'classification', label: t('cu.class'), type: 'select', lookup: 'customer_classes' },
        { key: 'status', label: t('cu.status'), type: 'select', lookup: 'customer_statuses', required: true, options: L.customer_statuses.filter(function (s) { return s.key !== 'archived'; }).map(function (s) { return { value: s.key, label: S.lang === 'en' ? s.en : s.ar }; }) },
        { key: 'source', label: t('cu.source'), type: 'select', lookup: 'customer_sources' },
        { key: 'confidentiality', label: t('cu.confidentiality'), type: 'select', lookup: 'confidentiality' },
        { type: 'section', label: t('cu.registration') },
        { key: 'cr_number', label: t('cu.cr'), type: 'digits', len: 10, dir: 'ltr', hint: '10 ' + (S.lang === 'en' ? 'digits' : 'أرقام') },
        { key: 'unified_number', label: t('cu.unified'), type: 'unified', dir: 'ltr', hint: '7xxxxxxxxx' },
        { key: 'vat_number', label: t('cu.vat'), type: 'digits', len: 15, dir: 'ltr', hint: '15 ' + (S.lang === 'en' ? 'digits' : 'رقمًا') },
        { key: 'website', label: t('cu.website'), type: 'text', dir: 'ltr' },
        { key: 'phone', label: t('cu.phone'), type: 'tel' },
        { key: 'email', label: t('cu.email'), type: 'email' },
        { key: 'region', label: t('cu.region'), type: 'select', lookup: 'regions', required: true },
        { key: 'city', label: t('cu.city'), type: 'select', options: cityOptions(v.region) },
        { key: 'address', label: t('cu.address'), type: 'text', span2: true },
        { key: 'procurement_portal', label: t('cu.portal'), type: 'text' },
        { key: 'vendor_registration', label: t('cu.vendor_reg'), type: 'select', lookup: 'vendor_registration' },
        { key: 'prequalification', label: t('cu.prequal'), type: 'select', lookup: 'prequalification' },
        { key: 'preferred_language', label: t('cu.pref_lang'), type: 'select', lookup: 'languages' },
        { type: 'section', label: t('cu.relationship') },
        { key: 'owner_id', label: t('cu.owner'), type: 'user', required: true, roles: ['bd_employee', 'bd_manager', 'system_admin', 'proposal_manager'] },
        { key: 'secondary_owner_id', label: t('cu.owner2'), type: 'user', roles: ['bd_employee', 'bd_manager', 'system_admin', 'proposal_manager'] },
        { key: 'relationship_strength', label: t('cu.strength'), type: 'select', lookup: 'relationship_strength' },
        { key: 'strategic_importance', label: t('cu.importance'), type: 'select', lookup: 'importance' },
        { key: 'potential_value', label: t('cu.potential_value'), type: 'money', sensitive: true, locked: locked },
        { key: 'known_projects', label: t('cu.known_projects'), type: 'textarea', span2: true },
        { key: 'tags', label: t('app.tags'), type: 'tags', span2: true },
        { key: 'notes', label: t('app.notes'), type: 'textarea', span2: true }
      ];
      var m = UI.formModal({ title: isNew ? t('cu.new') : t('cu.edit'), sub: rec ? rec.id : null, size: 'lg', fields: fields, values: v,
        onSubmit: function (vals) {
          var p = isNew ? S.adapter.create('customer', vals) : S.adapter.update('customer', rec.id, vals, rec.version);
          return after(p).then(function (r) { resolve(r); });
        } });
      /* المدن حسب المنطقة + تحذير التكرار الفوري */
      m.form.el.addEventListener('change', function (e) {
        if (e.target === m.form.fields.region.ctl) { m.form.rebuildOptions('city', { options: cityOptions(m.form.get('region')) }); }
      });
      var dupBox = h('div', { style: { gridColumn: '1 / -1' } });
      m.form.el.insertBefore(dupBox, m.form.el.firstChild);
      var checkDup = U.debounce(function () {
        var cand = Object.assign({ id: rec ? rec.id : '_new' }, m.form.values());
        var pairs = root.ENGINE.findDuplicateCustomers(S.db, cand).filter(function (p) { return !S.list('duplicates').some(function (d) { return d.status === 'dismissed' && ((d.a === p.a.id && d.b === p.b.id) || (d.a === p.b.id && d.b === p.a.id)); }); });
        D.clear(dupBox);
        if (pairs.length) { var box = UI.warnBox(''); D.clear(box); box.appendChild(UI.icon('warn')); var inner = h('div', null, h('b', null, t('cu.duplicate_warning'))); pairs.slice(0, 3).forEach(function (p) { inner.appendChild(h('div', null, t('cu.duplicate_of') + ': ', UI.recordLink('customer', p.b.id, MODEL.displayName('customer', p.b, S.lang) + ' (' + p.b.id + ')'), ' — ' + p.reasons.map(function (r) { return t('ad.dup_reason_' + r); }).join('، '))); }); box.appendChild(inner); dupBox.appendChild(box); }
      }, 400);
      m.form.el.addEventListener('input', checkDup);
      m.el.addEventListener('transitionend', function () { });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- جهة الاتصال ---------- */
  F.contact = function (rec, customerId) {
    var isNew = !rec, v = rec ? U.clone(rec) : Object.assign(MODEL.defaults('contact', S.user.id), { customer_id: customerId || null });
    return new Promise(function (resolve) {
      var fields = [
        { key: 'customer_id', label: t('app.customer'), type: 'customer', required: true, disabled: !!customerId || !isNew },
        { key: 'full_name', label: t('ct.full_name'), type: 'text', required: true },
        { key: 'position', label: t('ct.position'), type: 'text' },
        { key: 'department', label: t('ct.department'), type: 'text' },
        { key: 'seniority', label: t('ct.seniority'), type: 'select', lookup: 'seniority' },
        { key: 'roles', label: t('ct.roles'), type: 'multiselect', lookup: 'contact_roles', span2: true },
        { key: 'phone', label: t('ct.phone'), type: 'tel' },
        { key: 'email', label: t('ct.email'), type: 'email' },
        { key: 'preferred_channel', label: t('ct.channel'), type: 'select', lookup: 'contact_channels' },
        { key: 'preferred_language', label: t('ct.lang'), type: 'select', lookup: 'languages' },
        { key: 'last_contact_at', label: t('ct.last_contact'), type: 'date' },
        { key: 'next_follow_up', label: t('ct.next_followup'), type: 'date' },
        { key: 'is_primary', label: t('ct.primary'), type: 'checkbox', checkLabel: t('app.yes') },
        { key: 'active', label: t('app.status'), type: 'checkbox', checkLabel: t('ct.active') },
        { key: 'greeting_opt_out', label: t('ct.prefs'), type: 'checkbox', checkLabel: t('ct.greeting_optout') },
        { key: 'notes', label: t('ct.notes'), type: 'textarea', span2: true },
        { type: 'note', label: t('ct.no_sensitive') }
      ];
      var m = UI.formModal({ title: isNew ? t('ct.new') : t('ct.edit'), sub: rec ? rec.id : S.customerName(customerId), fields: fields, values: v,
        onSubmit: function (vals) { var p = isNew ? S.adapter.create('contact', vals) : S.adapter.update('contact', rec.id, vals, rec.version); return after(p).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- الفرصة ---------- */
  F.opportunity = function (rec, customerId) {
    var isNew = !rec, v = rec ? U.clone(rec) : Object.assign(MODEL.defaults('opportunity', S.user.id), { customer_id: customerId || null });
    var cust = S.get('customer', v.customer_id);
    if (isNew && cust) { v.sector = v.sector || cust.sector; v.region = v.region || cust.region; v.city = v.city || cust.city; v.confidentiality = cust.confidentiality; }
    var locked = rec ? !S.seesCommercial(rec) : false;
    return new Promise(function (resolve) {
      var fields = [
        { key: 'customer_id', label: t('app.customer'), type: 'customer', required: true, disabled: !!customerId || !isNew },
        { key: 'main_contact_id', label: t('op.main_contact'), type: 'contact', customer_id: v.customer_id },
        { key: 'name', label: t('op.name'), type: 'text', required: true },
        { key: 'project_name', label: t('op.project_name'), type: 'text' },
        { key: 'description', label: t('op.description'), type: 'textarea', span2: true },
        { key: 'project_type', label: t('op.project_type'), type: 'select', lookup: 'project_types' },
        { key: 'sector', label: t('op.sector'), type: 'select', lookup: 'sectors' },
        { key: 'region', label: t('cu.region'), type: 'select', lookup: 'regions' },
        { key: 'city', label: t('cu.city'), type: 'select', options: cityOptions(v.region) },
        { key: 'source', label: t('op.source'), type: 'select', lookup: 'opportunity_sources' },
        { key: 'tender_ref', label: t('op.tender_ref'), type: 'text', dir: 'ltr' },
        isNew ? { key: 'stage', label: t('app.stage'), type: 'select', lookup: 'stages', required: true, options: STAGES.list.filter(function (s) { return !s.terminal && !s.won; }).map(function (s) { return { value: s.key, label: s.order + '. ' + (S.lang === 'en' ? s.en : s.ar) }; }) } : { key: 'stage', label: t('app.stage'), type: 'readonly', render: function () { return S.stageLabel(v.stage) + ' — ' + t('op.change_stage') + ' ' + (S.lang === 'en' ? 'from the record page' : 'من صفحة الفرصة'); } },
        { key: 'owner_id', label: t('op.owner'), type: 'user', required: true, roles: ['bd_employee', 'bd_manager', 'system_admin', 'proposal_manager'] },
        { key: 'team_ids', label: t('op.team'), type: 'multiselect', options: S.live('users').filter(function (u) { return u.active !== false; }).map(function (u) { return { value: u.id, label: S.userName(u.id) }; }), span2: true },
        { key: 'priority', label: t('op.priority'), type: 'select', lookup: 'priorities' },
        { key: 'risk_level', label: t('op.risk'), type: 'select', lookup: 'risk_levels' },
        { key: 'confidentiality', label: t('cu.confidentiality'), type: 'select', lookup: 'confidentiality' },
        { key: 'waiting_on', label: t('op.waiting_side'), type: 'select', options: [{ value: 'us', label: t('op.side_us') }, { value: 'customer', label: t('op.side_customer') }, { value: 'none', label: t('op.side_none') }] },
        { type: 'section', label: t('op.commercial') },
        { key: 'estimated_value', label: t('op.est_value'), type: 'money', sensitive: true, locked: locked },
        { key: 'expected_margin_pct', label: t('op.margin'), type: 'pct', sensitive: true, locked: locked },
        { key: 'probability', label: t('op.probability'), type: 'pct', sensitive: true, locked: locked, hint: t('op.probability_hint') },
        { key: 'competitors', label: t('op.competitors'), type: 'text', sensitive: true, locked: locked },
        { key: 'expected_award_date', label: t('op.expected_award'), type: 'date' },
        { key: 'submission_deadline', label: t('op.deadline'), type: 'date' },
        { key: 'next_action', label: t('op.next_action'), type: 'text' },
        { key: 'next_action_due', label: t('op.next_action_due'), type: 'date' },
        { type: 'section', label: t('op.tender_terms') },
        { key: 'expected_start_date', label: t('op.expected_start'), type: 'date' },
        { key: 'expected_duration_months', label: t('op.duration'), type: 'int' },
        { key: 'payment_terms', label: t('op.payment_terms'), type: 'select', lookup: 'payment_terms' },
        { key: 'vat_treatment', label: t('op.vat'), type: 'select', lookup: 'vat_treatments' },
        { key: 'retention_pct', label: t('op.retention'), type: 'pct' },
        { key: 'warranty_months', label: t('op.warranty'), type: 'int' },
        { key: 'bid_bond_required', label: t('op.bid_bond'), type: 'checkbox', checkLabel: t('app.yes') },
        { key: 'bid_bond_pct', label: t('op.bid_bond_pct'), type: 'pct' },
        { key: 'required_documents', label: t('op.required_docs'), type: 'multiselect', options: L.required_documents.map(function (d) { return { value: d.key, label: S.lang === 'en' ? d.en : d.ar }; }), span2: true },
        { key: 'notes', label: t('app.notes'), type: 'textarea', span2: true }
      ];
      /* المستندات المطلوبة تُخزَّن كقائمة {key, received} */
      var docVals = (v.required_documents || []).map(function (d) { return typeof d === 'string' ? d : d.key; });
      var vals = Object.assign({}, v, { required_documents: docVals });
      var m = UI.formModal({ title: isNew ? t('op.new') : t('op.edit'), sub: rec ? rec.id : S.customerName(v.customer_id), size: 'lg', fields: fields, values: vals,
        onSubmit: function (out) {
          var prevDocs = U.by((v.required_documents || []).filter(function (d) { return typeof d === 'object'; }), 'key');
          out.required_documents = (out.required_documents || []).map(function (k) { return { key: k, received: prevDocs[k] ? !!prevDocs[k].received : false }; });
          if (!isNew) delete out.stage;
          var p = isNew ? S.adapter.create('opportunity', out) : S.adapter.update('opportunity', rec.id, out, rec.version);
          return after(p).then(resolve);
        } });
      m.form.el.addEventListener('change', function (e) {
        if (e.target === m.form.fields.customer_id.ctl) { m.form.rebuildOptions('main_contact_id', { customer_id: m.form.get('customer_id') }); }
        if (e.target === m.form.fields.region.ctl) { m.form.rebuildOptions('city', { options: cityOptions(m.form.get('region')) }); }
        if (isNew && e.target === m.form.fields.stage.ctl) { var st = STAGES.get(m.form.get('stage')); if (st && !locked) { m.form.set('probability', st.probability); UI.toast(t('op.prob_default_applied', { p: st.probability }), '', 2500); } }
      });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- تغيير المرحلة ---------- */
  F.stageChange = function (opp, presetTo) {
    return new Promise(function (resolve) {
      var cur = STAGES.get(opp.stage);
      var closed = cur && cur.terminal;
      var options = STAGES.list.filter(function (s) { return s.key !== opp.stage; }).map(function (s) { return { value: s.key, label: s.order + '. ' + (S.lang === 'en' ? s.en : s.ar) + (s.order < cur.order && !s.parked && !s.terminal ? (S.lang === 'en' ? ' (back)' : ' (رجوع)') : '') }; });
      var fields = [
        closed ? { type: 'note', label: t('op.closed_notice') } : null,
        { key: 'to', label: t('op.new_stage'), type: 'select', options: options, required: true },
        { key: 'reason', label: t('op.stage_reason'), type: 'text' },
        { key: 'loss_reason', label: t('op.loss_reason'), type: 'select', lookup: 'loss_reasons', hidden: presetTo !== 'lost' },
        { key: 'submission_deadline', label: t('op.deadline'), type: 'date', hidden: true },
        { key: 'expected_award_date', label: t('op.expected_award'), type: 'date', hidden: true },
        { key: 'estimated_value', label: t('op.est_value'), type: 'money', hidden: true },
        { key: 'project_type', label: t('op.project_type'), type: 'select', lookup: 'project_types', hidden: true },
        { key: 'next_action', label: t('op.next_action'), type: 'text' },
        { key: 'next_action_due', label: t('op.next_action_due'), type: 'date' },
        { key: 'note', label: t('op.stage_note'), type: 'textarea', span2: true }
      ].filter(Boolean);
      var dyn = h('div', { style: { gridColumn: '1 / -1' } });
      var m = UI.formModal({ title: t('op.change_stage'), sub: MODEL.displayName('opportunity', opp, S.lang) + ' — ' + S.stageLabel(opp.stage), fields: fields, values: { to: presetTo || '', next_action: opp.next_action || '', next_action_due: opp.next_action_due || '', submission_deadline: opp.submission_deadline, expected_award_date: opp.expected_award_date, estimated_value: opp.estimated_value, project_type: opp.project_type, loss_reason: opp.loss_reason },
        onSubmit: function (vals) {
          var to = vals.to; if (!to) return Promise.reject(root.ADAPTER.Error('validation', 'to', { to: 'app.field_required' }));
          var tr = STAGES.transition(opp.stage, to);
          if (tr.allowed && tr.requiresReason && !vals.reason) return Promise.reject(root.ADAPTER.Error('validation', 'reason', { reason: 'app.reason_required' }));
          if (to === 'lost' && !vals.loss_reason) return Promise.reject(root.ADAPTER.Error('validation', 'loss', { loss_reason: 'app.field_required' }));
          var fieldsPatch = {}; ['submission_deadline', 'expected_award_date', 'estimated_value', 'project_type', 'next_action', 'next_action_due'].forEach(function (k) { if (vals[k] !== undefined && vals[k] !== null && vals[k] !== '') fieldsPatch[k] = vals[k]; });
          if (vals.loss_reason) fieldsPatch.loss_reason = vals.loss_reason;
          return after(S.adapter.changeStage(opp.id, to, { reason: vals.reason, note: vals.note, version: opp.version, fields: fieldsPatch, loss_reason: vals.loss_reason, reopen: closed })).then(function (r) { resolve(r); });
        } });
      m.form.el.insertBefore(dyn, m.form.el.children[closed ? 2 : 1]);
      function onTo() {
        var to = m.form.get('to'); D.clear(dyn);
        ['loss_reason', 'submission_deadline', 'expected_award_date', 'estimated_value', 'project_type'].forEach(function (k) { m.form.fields[k].el.classList.add('hidden'); });
        if (!to) return;
        var tr = STAGES.transition(opp.stage, to);
        if (tr.backward) dyn.appendChild(UI.warnBox(t('op.stage_backward')));
        if (closed) dyn.appendChild(UI.warnBox(t('op.closed_notice')));
        if (to === 'lost') m.form.fields.loss_reason.el.classList.remove('hidden');
        var need = (tr.requiredFields || []).filter(function (f) { var cv = opp[f]; return cv === null || cv === undefined || cv === ''; });
        if (need.length) { dyn.appendChild(UI.infoBox(t('op.stage_required_fields', { fields: need.map(function (f) { return m.form.fields[f] ? m.form.fields[f].def.label : f; }).join('، ') }))); need.forEach(function (f) { if (m.form.fields[f]) m.form.fields[f].el.classList.remove('hidden'); }); }
        if (tr.requiresReason || tr.backward) m.form.fields.reason.el.querySelector('label').appendChild(h('span', { class: 'req' }, '*'));
        var st = STAGES.get(to); if (st) dyn.appendChild(h('div', { class: 'small muted' }, t('op.probability') + ': ' + st.probability + '% — ' + t('op.probability_hint')));
      }
      m.form.fields.to.ctl.addEventListener('change', onTo); onTo();
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- العرض ---------- */
  F.proposal = function (rec, oppId) {
    var isNew = !rec, opp = S.get('opportunity', rec ? rec.opportunity_id : oppId);
    var v = rec ? U.clone(rec) : Object.assign(MODEL.defaults('proposal', S.user.id), { opportunity_id: oppId || null, submission_deadline: opp ? opp.submission_deadline : null, proposed_value: null, vat_treatment: opp ? opp.vat_treatment : 'standard' });
    var locked = rec ? !S.seesCommercial(rec) : (opp ? !S.seesCommercial(opp) : false);
    var editable = isNew || ['not_started', 'awaiting_info', 'in_preparation', 'technical_review', 'commercial_review', 'ready', 'revision_requested'].indexOf(v.status) >= 0 || S.can('proposals.approve');
    return new Promise(function (resolve) {
      var fields = [
        { key: 'opportunity_id', label: t('pr.opportunity'), type: 'opportunity', required: true, disabled: !!oppId || !isNew },
        isNew ? null : { key: 'version_no', label: t('pr.version'), type: 'readonly' },
        { key: 'owner_id', label: t('pr.owner'), type: 'user', required: true, roles: ['proposal_manager', 'bd_employee', 'bd_manager', 'system_admin'] },
        { key: 'reviewer_ids', label: t('pr.reviewers'), type: 'multiselect', options: S.live('users').filter(function (u) { return ['commercial_reviewer', 'proposal_manager', 'bd_manager', 'contract_reviewer', 'system_admin'].indexOf(u.role) >= 0; }).map(function (u) { return { value: u.id, label: S.userName(u.id) + ' — ' + S.roleLabel(u.role) }; }), span2: true },
        { key: 'status', label: t('pr.status'), type: 'select', options: L.proposal_statuses.filter(function (s) { return ['submitted', 'accepted', 'rejected', 'expired', 'withdrawn', 'revised', 'awaiting_approval'].indexOf(s.key) < 0 || s.key === v.status; }).map(function (s) { return { value: s.key, label: S.lang === 'en' ? s.en : s.ar }; }), required: true, disabled: !editable },
        { key: 'technical_status', label: t('pr.tech_status'), type: 'select', lookup: 'doc_statuses' },
        { key: 'commercial_status', label: t('pr.comm_status'), type: 'select', lookup: 'doc_statuses' },
        { key: 'submission_deadline', label: t('pr.deadline'), type: 'date' },
        { key: 'submission_method', label: t('pr.method'), type: 'select', lookup: 'submission_methods' },
        { type: 'section', label: t('op.commercial') },
        { key: 'proposed_value', label: t('pr.value'), type: 'money', sensitive: true, locked: locked },
        { key: 'vat_treatment', label: t('op.vat'), type: 'select', lookup: 'vat_treatments' },
        { key: 'discount_pct', label: t('pr.discount'), type: 'pct', sensitive: true, locked: locked, hint: RULES.approvals.discount.enabled ? (S.lang === 'en' ? 'Above ' + RULES.approvals.discount.threshold_pct + '% requires commercial approval' : 'أكثر من ' + RULES.approvals.discount.threshold_pct + '٪ يتطلب اعتماد المراجع التجاري') : null },
        { key: 'validity_days', label: t('pr.validity'), type: 'int' },
        { key: 'notes', label: t('app.notes'), type: 'textarea', span2: true }
      ].filter(Boolean);
      var m = UI.formModal({ title: isNew ? t('pr.new') : t('pr.edit'), sub: rec ? MODEL.proposalNumber(rec) : S.oppName(oppId), size: 'lg', fields: fields, values: v,
        onSubmit: function (vals) { delete vals.version_no; var p = isNew ? S.adapter.create('proposal', vals) : S.adapter.update('proposal', rec.id, vals, rec.version); return after(p).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- العقد ---------- */
  F.contract = function (rec) {
    var v = U.clone(rec), locked = !S.seesCommercial(rec);
    return new Promise(function (resolve) {
      var fields = [
        { key: 'contract_ref', label: t('co.ref'), type: 'text', dir: 'ltr' },
        { key: 'status', label: t('co.status'), type: 'select', lookup: 'contract_statuses', required: true, options: L.contract_statuses.filter(function (s) { return ['signed', 'active'].indexOf(s.key) < 0 || s.key === v.status; }).map(function (s) { return { value: s.key, label: S.lang === 'en' ? s.en : s.ar }; }) },
        { key: 'reviewer_id', label: t('co.reviewer'), type: 'user', roles: ['contract_reviewer', 'bd_manager', 'system_admin'] },
        { key: 'contract_value', label: t('co.value'), type: 'money', sensitive: true, locked: locked },
        { key: 'vat_treatment', label: t('op.vat'), type: 'select', lookup: 'vat_treatments' },
        { key: 'start_date', label: t('co.start'), type: 'date' },
        { key: 'duration_months', label: t('co.duration'), type: 'int' },
        { key: 'payment_terms', label: t('co.payment_terms'), type: 'select', lookup: 'payment_terms' },
        { key: 'retention_pct', label: t('co.retention'), type: 'pct' },
        { key: 'warranty_months', label: t('co.warranty'), type: 'int' },
        { key: 'performance_bond_pct', label: t('co.perf_bond'), type: 'pct' },
        { key: 'advance_payment_pct', label: t('co.advance'), type: 'pct' },
        { key: 'key_commitments', label: t('co.commitments'), type: 'textarea', span2: true },
        { key: 'exclusions', label: t('co.exclusions'), type: 'textarea', span2: true },
        { key: 'key_risks', label: t('co.risks'), type: 'textarea', span2: true },
        { key: 'review_notes', label: t('co.review_notes'), type: 'textarea', span2: true },
        { key: 'delivery_ref', label: t('co.delivery_ref'), type: 'text', dir: 'ltr', hint: t('co.integration_hint') }
      ];
      var m = UI.formModal({ title: t('co.edit'), sub: rec.id, size: 'lg', fields: fields, values: v, onSubmit: function (vals) { return after(S.adapter.update('contract', rec.id, vals, rec.version)).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- النشاط ---------- */
  F.activity = function (rec, ctx) {
    ctx = ctx || {};
    var isNew = !rec, v = rec ? U.clone(rec) : Object.assign(MODEL.defaults('activity', S.user.id), { customer_id: ctx.customer_id || null, opportunity_id: ctx.opportunity_id || null, contact_id: ctx.contact_id || null, type: ctx.type || 'call', status: 'planned' });
    if (isNew && ctx.opportunity_id && !v.customer_id) { var o = S.get('opportunity', ctx.opportunity_id); if (o) v.customer_id = o.customer_id; }
    return new Promise(function (resolve) {
      var fields = [
        { key: 'type', label: t('ac.type'), type: 'select', lookup: 'activity_types', required: true },
        { key: 'at', label: t('ac.at'), type: 'datetime', required: true },
        { key: 'customer_id', label: t('app.customer'), type: 'customer', required: true, disabled: !!ctx.customer_id },
        { key: 'opportunity_id', label: t('app.opportunity'), type: 'opportunity', customer_id: v.customer_id, disabled: !!ctx.opportunity_id },
        { key: 'contact_id', label: t('app.contact'), type: 'contact', customer_id: v.customer_id },
        { key: 'owner_id', label: t('ac.owner'), type: 'user', required: true },
        { key: 'priority', label: t('app.priority'), type: 'select', lookup: 'priorities' },
        { key: 'status', label: t('ac.status'), type: 'select', lookup: 'activity_statuses' },
        { key: 'participants', label: t('ac.participants'), type: 'text', span2: true },
        { key: 'purpose', label: t('ac.purpose'), type: 'text', span2: true },
        { key: 'outcome', label: t('ac.outcome'), type: 'textarea', span2: true },
        { key: 'next_action', label: t('ac.next_action'), type: 'text' },
        { key: 'due_date', label: t('ac.due'), type: 'date' },
        { key: 'attachment_ref', label: t('ac.attachment'), type: 'text', dir: 'ltr' },
        { key: 'notes', label: t('app.notes'), type: 'textarea', span2: true }
      ];
      var m = UI.formModal({ title: isNew ? t('ac.new') : t('ac.edit'), sub: rec ? rec.id : (v.customer_id ? S.customerName(v.customer_id) : null), fields: fields, values: v,
        onSubmit: function (vals) { if (vals.status === 'done' && !vals.completed_at) vals.completed_at = U.isoDateTime(U.now()); var p = isNew ? S.adapter.create('activity', vals) : S.adapter.update('activity', rec.id, vals, rec.version); return after(p).then(resolve); } });
      m.form.el.addEventListener('change', function (e) { if (e.target === m.form.fields.customer_id.ctl) { var cid = m.form.get('customer_id'); m.form.rebuildOptions('opportunity_id', { customer_id: cid }); m.form.rebuildOptions('contact_id', { customer_id: cid }); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* إنجاز نشاط مع نتيجة ومتابعة اختيارية */
  F.completeActivity = function (act) {
    return new Promise(function (resolve) {
      var m = UI.formModal({ title: t('ac.complete'), sub: act.purpose || S.label('activity_types', act.type), size: 'sm', cols: 1, fields: [
        { key: 'outcome', label: t('ac.outcome'), type: 'textarea', required: true },
        { key: 'next_action', label: t('ac.next_action'), type: 'text' },
        { key: 'follow_up_date', label: t('ct.next_followup'), type: 'date', hint: S.lang === 'en' ? 'Creates a follow-up reminder' : 'يُنشئ تذكير متابعة تلقائيًا' },
        { key: 'follow_up_type', label: t('ac.type'), type: 'select', lookup: 'activity_types' }
      ], values: { outcome: act.outcome || '', next_action: act.next_action || '', follow_up_type: 'call' }, saveLabel: t('ac.complete'),
        onSubmit: function (vals) { return after(S.adapter.completeActivity(act.id, vals)).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };
  F.rescheduleActivity = function (act) {
    return new Promise(function (resolve) {
      var m = UI.formModal({ title: t('ac.reschedule'), sub: act.purpose || '', size: 'sm', cols: 1, fields: [{ key: 'date', label: t('ac.new_date'), type: 'date', required: true }, { key: 'reason', label: t('app.reason'), type: 'text' }], values: { date: U.isoDate(U.addDays(U.now(), 1)) }, saveLabel: t('ac.reschedule'),
        onSubmit: function (vals) { return after(S.adapter.rescheduleActivity(act.id, vals.date, vals.reason)).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  /* ---------- مستند (بيانات وصفية) ---------- */
  F.document = function (entityType, entityId) {
    return new Promise(function (resolve) {
      var m = UI.formModal({ title: t('app.add_document'), sub: entityId, size: 'sm', cols: 1, intro: UI.infoBox(t('app.documents_hint')), fields: [
        { key: 'name', label: t('app.name'), type: 'text', required: true },
        { key: 'doc_type', label: t('app.type'), type: 'select', options: [{ value: 'profile', label: S.lang === 'en' ? 'Company profile' : 'ملف تعريفي' }, { value: 'tender', label: S.lang === 'en' ? 'Tender documents' : 'كراسة الشروط' }, { value: 'proposal', label: S.lang === 'en' ? 'Proposal' : 'عرض' }, { value: 'contract', label: S.lang === 'en' ? 'Contract' : 'عقد' }, { value: 'letter', label: S.lang === 'en' ? 'Letter' : 'خطاب' }, { value: 'minutes', label: S.lang === 'en' ? 'Meeting minutes' : 'محضر اجتماع' }, { value: 'other', label: t('app.all') }] },
        { key: 'storage_ref', label: S.lang === 'en' ? 'Document-system reference' : 'مرجع نظام المستندات', type: 'text', dir: 'ltr', required: true },
        { key: 'classification', label: t('cu.confidentiality'), type: 'select', lookup: 'confidentiality' }
      ], values: { doc_type: 'other', classification: 'internal' }, onSubmit: function (vals) { return after(S.adapter.addDocument(Object.assign({ entity_type: entityType, entity_id: entityId }, vals))).then(resolve); } });
      var origClose = m.close; m.close = function (force) { var r = origClose(force); if (r) resolve(null); return r; };
    });
  };

  root.FORMS = F;
})(typeof window !== 'undefined' ? window : globalThis);
