/* =====================================================================
   IMPORTER — التحقق من ملفات الاستيراد (قوالب Excel/CSV معتمدة)
   ---------------------------------------------------------------------
   - لا يُنفَّذ أي محتوى من الملف (لا صيغ ولا ماكرو): الخلايا التي تبدأ بـ = + - @ تُرفض.
   - يُفحص: هيكل الأعمدة، الأعمدة الإلزامية، الأنواع، التواريخ، التكرار داخل الملف
     ومع قاعدة البيانات، المعرّفات المفقودة، العلاقات بين السجلات (عميل موجود).
   - المدخل: مصفوفة صفوف (كل صف كائن عنوان→قيمة) كما تعيدها SheetJS (sheet_to_json) أو CSV parser.
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, L = root.LOOKUPS, MODEL = root.MODEL, RULES = root.RULES, SEARCH = root.SEARCH;

  /* تعريف القوالب: لكل عمود مفاتيح العناوين المقبولة (عربي/إنجليزي) */
  var TEMPLATES = {
    customers: {
      entity: 'customer',
      columns: [
        { field: 'name_ar', headers: ['الاسم العربي', 'اسم العميل', 'name_ar', 'arabic name'], required: true },
        { field: 'name_en', headers: ['الاسم الإنجليزي', 'name_en', 'english name'] },
        { field: 'customer_type', headers: ['نوع العميل', 'customer_type', 'type'], lookup: 'customer_types', required: true },
        { field: 'sector', headers: ['القطاع', 'sector'], lookup: 'sectors' },
        { field: 'classification', headers: ['التصنيف', 'classification', 'class'], lookup: 'customer_classes' },
        { field: 'cr_number', headers: ['السجل التجاري', 'cr_number', 'cr'] },
        { field: 'unified_number', headers: ['الرقم الموحد', 'unified_number'] },
        { field: 'vat_number', headers: ['الرقم الضريبي', 'vat_number', 'vat'] },
        { field: 'phone', headers: ['الهاتف', 'phone'] },
        { field: 'email', headers: ['البريد الإلكتروني', 'email'] },
        { field: 'website', headers: ['الموقع الإلكتروني', 'الموقع', 'website'] },
        { field: 'region', headers: ['المنطقة', 'region'], lookup: 'regions', required: true },
        { field: 'city', headers: ['المدينة', 'city'] },
        { field: 'address', headers: ['العنوان', 'address'] },
        { field: 'status', headers: ['الحالة', 'status'], lookup: 'customer_statuses', required: true },
        { field: 'source', headers: ['المصدر', 'source'], lookup: 'customer_sources' },
        { field: 'owner_email', headers: ['مسؤول العلاقة', 'owner', 'owner_email'], userRef: true, required: true },
        { field: 'relationship_strength', headers: ['قوة العلاقة', 'relationship_strength'], lookup: 'relationship_strength' },
        { field: 'strategic_importance', headers: ['الأهمية الاستراتيجية', 'strategic_importance'], lookup: 'importance' },
        { field: 'notes', headers: ['ملاحظات', 'notes'] },
        { field: 'tags', headers: ['الوسوم', 'tags'] },
        { field: 'source_id', headers: ['معرّف المصدر', 'source_id', 'external id'] }
      ]
    },
    contacts: {
      entity: 'contact',
      columns: [
        { field: 'customer_ref', headers: ['العميل', 'customer', 'customer_id', 'customer_ref'], required: true, customerRef: true },
        { field: 'full_name', headers: ['الاسم الكامل', 'الاسم', 'full_name', 'name'], required: true },
        { field: 'position', headers: ['المسمى الوظيفي', 'position'] },
        { field: 'department', headers: ['الإدارة أو القسم', 'الإدارة', 'department'] },
        { field: 'seniority', headers: ['المستوى الإداري', 'المستوى', 'seniority'], lookup: 'seniority' },
        { field: 'roles', headers: ['الدور في اتخاذ القرار', 'الدور', 'roles', 'role'], multi: 'contact_roles' },
        { field: 'phone', headers: ['الهاتف', 'phone'] },
        { field: 'email', headers: ['البريد الإلكتروني', 'email'] },
        { field: 'preferred_channel', headers: ['وسيلة التواصل المفضلة', 'وسيلة التواصل', 'preferred_channel'], lookup: 'contact_channels' },
        { field: 'preferred_language', headers: ['اللغة', 'preferred_language', 'language'], lookup: 'languages' },
        { field: 'notes', headers: ['ملاحظات', 'notes'] }
      ]
    },
    opportunities: {
      entity: 'opportunity',
      columns: [
        { field: 'customer_ref', headers: ['العميل', 'customer', 'customer_id'], required: true, customerRef: true },
        { field: 'name', headers: ['اسم الفرصة', 'name', 'opportunity'], required: true },
        { field: 'project_name', headers: ['اسم المشروع', 'project_name', 'project'] },
        { field: 'project_type', headers: ['نوع المشروع', 'project_type'], lookup: 'project_types' },
        { field: 'sector', headers: ['القطاع', 'sector'], lookup: 'sectors' },
        { field: 'region', headers: ['المنطقة', 'region'], lookup: 'regions' },
        { field: 'city', headers: ['المدينة', 'city'] },
        { field: 'source', headers: ['المصدر', 'source'], lookup: 'opportunity_sources' },
        { field: 'tender_ref', headers: ['رقم المنافسة', 'tender_ref', 'tender'] },
        { field: 'estimated_value', headers: ['القيمة التقديرية', 'estimated_value', 'value'], type: 'money' },
        { field: 'probability', headers: ['الاحتمالية', 'probability'], type: 'pct' },
        { field: 'stage', headers: ['المرحلة', 'stage'], stage: true, required: true },
        { field: 'expected_award_date', headers: ['تاريخ الترسية المتوقع', 'expected_award_date', 'award date'], type: 'date' },
        { field: 'submission_deadline', headers: ['موعد التقديم', 'submission_deadline', 'deadline'], type: 'date' },
        { field: 'owner_email', headers: ['المسؤول', 'owner', 'owner_email'], userRef: true, required: true },
        { field: 'priority', headers: ['الأولوية', 'priority'], lookup: 'priorities' },
        { field: 'next_action', headers: ['الإجراء التالي', 'next_action'] },
        { field: 'next_action_due', headers: ['موعد الإجراء التالي', 'next_action_due'], type: 'date' },
        { field: 'notes', headers: ['ملاحظات', 'notes'] }
      ]
    },
    activities: {
      entity: 'activity',
      columns: [
        { field: 'customer_ref', headers: ['العميل', 'customer', 'customer_id'], required: true, customerRef: true },
        { field: 'type', headers: ['نوع النشاط', 'type'], lookup: 'activity_types', required: true },
        { field: 'at', headers: ['التاريخ', 'التاريخ والوقت', 'date', 'at', 'datetime'], type: 'datetime', required: true },
        { field: 'owner_email', headers: ['المسؤول', 'owner', 'owner_email'], userRef: true, required: true },
        { field: 'purpose', headers: ['الغرض', 'purpose'] },
        { field: 'outcome', headers: ['النتيجة', 'outcome'] },
        { field: 'next_action', headers: ['الإجراء التالي', 'next_action'] },
        { field: 'due_date', headers: ['موعد الاستحقاق', 'due_date', 'due'], type: 'date' },
        { field: 'status', headers: ['الحالة', 'status'], lookup: 'activity_statuses' },
        { field: 'notes', headers: ['ملاحظات', 'notes'] }
      ]
    }
  };

  function normHeader(h) { return SEARCH.normalize(h).replace(/[_\s]+/g, ' ').trim(); }
  function isFormula(v) { if (typeof v !== 'string') return false; var s = v.replace(/^[\s'"]+/, ''); return /^[=+\-@\t\r]/.test(s) && !/^[+\-]?\d/.test(s) && !/^-\s*$/.test(s); }
  function lookupKey(list, v) {
    if (v === null || v === undefined || v === '') return null;
    var s = String(v).trim();
    var items = L[list] || [];
    for (var i = 0; i < items.length; i++) { var it = items[i]; if (it.key === s || SEARCH.normalize(it.ar) === SEARCH.normalize(s) || SEARCH.normalize(it.en) === SEARCH.normalize(s)) return it.key; }
    /* المناطق: مطابقة جزئية */
    if (list === 'regions') for (var j = 0; j < items.length; j++) if (SEARCH.normalize(items[j].ar).indexOf(SEARCH.normalize(s)) >= 0 || SEARCH.normalize(s).indexOf(SEARCH.normalize(items[j].ar)) >= 0) return items[j].key;
    return undefined;   // غير معروف
  }
  function stageKey(v) {
    if (!v) return null;
    var s = String(v).trim();
    var st = root.STAGES.list;
    for (var i = 0; i < st.length; i++) if (st[i].key === s || SEARCH.normalize(st[i].ar) === SEARCH.normalize(s) || SEARCH.normalize(st[i].en) === SEARCH.normalize(s) || String(st[i].order) === s) return st[i].key;
    return undefined;
  }
  function excelDate(v) {
    if (typeof v === 'number' && v > 20000 && v < 80000) { var d = new Date(Math.round((v - 25569) * 86400 * 1000)); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()); }
    return U.parseDate(v);
  }

  var IMP = {
    templates: TEMPLATES,
    templateHeaders: function (module, lang) { var t = TEMPLATES[module]; return t ? t.columns.map(function (c) { return lang === 'en' ? (c.headers.find(function (h) { return /^[a-z_ ]+$/i.test(h); }) || c.headers[0]) : c.headers[0]; }) : []; },

    /* يعيد خريطة العمود→العنوان الفعلي في الملف، أو أعمدة مفقودة */
    mapHeaders: function (module, headers) {
      var t = TEMPLATES[module]; if (!t) return { error: 'unknown_module' };
      var norm = headers.map(function (h) { return { raw: h, n: normHeader(h) }; });
      var map = {}, missing = [], unknown = [];
      t.columns.forEach(function (c) {
        var found = null;
        for (var i = 0; i < norm.length && !found; i++) for (var j = 0; j < c.headers.length; j++) if (norm[i].n === normHeader(c.headers[j])) { found = norm[i].raw; break; }
        if (found) map[c.field] = found; else if (c.required) missing.push(c);
      });
      var used = Object.keys(map).map(function (k) { return map[k]; });
      norm.forEach(function (h) { if (used.indexOf(h.raw) < 0 && h.n) unknown.push(h.raw); });
      return { map: map, missing: missing, unknown: unknown };
    },

    /* rows: [{header: value}] ; db: للتحقق من التكرار والعلاقات ; users: [{id,email,name}] */
    validate: function (module, rows, db, users) {
      var t = TEMPLATES[module];
      var res = { ok: false, module: module, structure_errors: [], rows: [], valid: 0, invalid: 0, warnings: 0 };
      if (!t) { res.structure_errors.push({ key: 'unknown_module' }); return res; }
      if (!rows || !rows.length) { res.structure_errors.push({ key: 'empty_file' }); return res; }
      if (rows.length > RULES.import.max_rows) { res.structure_errors.push({ key: 'too_many_rows', max: RULES.import.max_rows, got: rows.length }); return res; }
      var headers = Object.keys(rows[0]);
      var hm = IMP.mapHeaders(module, headers);
      if (hm.missing.length) { res.structure_errors.push({ key: 'missing_columns', columns: hm.missing.map(function (c) { return c.headers[0]; }) }); }
      if (res.structure_errors.length) return res;
      res.header_map = hm.map; res.unknown_columns = hm.unknown;

      var byCr = {}, byUni = {}, byVat = {}, byEmail = {}, byName = {};
      (db && db.customers || []).forEach(function (c) { if (c.archived_at) return; if (c.cr_number) byCr[U.latinDigits(c.cr_number)] = c; if (c.unified_number) byUni[U.latinDigits(c.unified_number)] = c; if (c.vat_number) byVat[U.latinDigits(c.vat_number)] = c; if (c.email) byEmail[c.email.toLowerCase()] = c; byName[SEARCH.normalize(c.name_ar, true)] = c; if (c.name_en) byName[SEARCH.normalize(c.name_en, true)] = c; });
      var contactEmails = {}; (db && db.contacts || []).forEach(function (k) { if (!k.archived_at && k.email) contactEmails[k.email.toLowerCase()] = k; });
      var usersByEmail = {}, usersByName = {}; (users || []).forEach(function (u) { if (u.email) usersByEmail[u.email.toLowerCase()] = u; usersByName[SEARCH.normalize(u.name_ar || u.name || '')] = u; if (u.name_en) usersByName[SEARCH.normalize(u.name_en)] = u; });
      var seen = { cr: {}, uni: {}, vat: {}, email: {}, name: {} };

      function findCustomer(ref) {
        if (!ref) return null;
        var s = String(ref).trim();
        var byId = (db && db.customers || []).find(function (c) { return c.id === s && !c.archived_at; });
        if (byId) return byId;
        return byName[SEARCH.normalize(s, true)] || null;
      }

      rows.forEach(function (raw, idx) {
        var rec = {}, errors = [], warnings = [];
        t.columns.forEach(function (c) {
          var h = hm.map[c.field]; if (!h) return;
          var v = raw[h];
          if (v === undefined || v === null || v === '') { if (c.required) errors.push({ field: c.field, key: 'required' }); return; }
          if (RULES.import.reject_formulas && isFormula(v)) { errors.push({ field: c.field, key: 'unsafe_formula' }); return; }
          if (c.lookup) { var k = lookupKey(c.lookup, v); if (k === undefined) errors.push({ field: c.field, key: 'invalid_value', value: v }); else rec[c.field] = k; return; }
          if (c.multi) { var parts = String(v).split(/[,،;\/]/).map(function (x) { return x.trim(); }).filter(Boolean); var keys = [], bad = false; parts.forEach(function (p) { var kk = lookupKey(c.multi, p); if (kk === undefined) bad = true; else keys.push(kk); }); if (bad) errors.push({ field: c.field, key: 'invalid_value', value: v }); else rec[c.field] = keys; return; }
          if (c.stage) { var sk = stageKey(v); if (sk === undefined) errors.push({ field: c.field, key: 'invalid_value', value: v }); else rec[c.field] = sk; return; }
          if (c.type === 'date' || c.type === 'datetime') { var d = excelDate(v); if (!d) errors.push({ field: c.field, key: 'invalid_date', value: v }); else rec[c.field] = c.type === 'date' ? U.isoDate(d) : U.isoDateTime(d); return; }
          if (c.type === 'money' || c.type === 'pct') { var n = U.num(v); if (n === null || n < 0 || (c.type === 'pct' && n > 100)) errors.push({ field: c.field, key: 'invalid_number', value: v }); else rec[c.field] = n; return; }
          if (c.userRef) { var s = String(v).trim().toLowerCase(); var u = usersByEmail[s] || usersByName[SEARCH.normalize(s)]; if (!u) errors.push({ field: c.field, key: 'unknown_user', value: v }); else rec.owner_id = u.id; return; }
          if (c.customerRef) { var cu = findCustomer(v); if (!cu) errors.push({ field: c.field, key: 'unknown_customer', value: v }); else rec.customer_id = cu.id; return; }
          rec[c.field] = typeof v === 'string' ? v.trim() : String(v);
        });

        /* تحقق الحقول حسب النموذج */
        if (t.entity === 'customer') {
          if (rec.cr_number && !U.isDigits(rec.cr_number, 10)) errors.push({ field: 'cr_number', key: 'invalid_cr' });
          if (rec.vat_number && !U.isDigits(rec.vat_number, 15)) errors.push({ field: 'vat_number', key: 'invalid_vat' });
          if (rec.unified_number && !(U.isDigits(rec.unified_number, 10) && U.latinDigits(rec.unified_number).charAt(0) === '7')) errors.push({ field: 'unified_number', key: 'invalid_unified' });
          if (rec.email && !U.isEmail(rec.email)) errors.push({ field: 'email', key: 'invalid_email' });
          if (rec.phone && !U.isPhone(rec.phone)) errors.push({ field: 'phone', key: 'invalid_phone' });
          /* التكرار */
          var cr = rec.cr_number ? U.latinDigits(rec.cr_number) : null, uni = rec.unified_number ? U.latinDigits(rec.unified_number) : null, vat = rec.vat_number ? U.latinDigits(rec.vat_number) : null;
          if (cr) { if (byCr[cr]) errors.push({ field: 'cr_number', key: 'duplicate_db', with: byCr[cr].id }); else if (seen.cr[cr]) errors.push({ field: 'cr_number', key: 'duplicate_file', with: seen.cr[cr] }); seen.cr[cr] = idx + 2; }
          if (uni) { if (byUni[uni]) errors.push({ field: 'unified_number', key: 'duplicate_db', with: byUni[uni].id }); else if (seen.uni[uni]) errors.push({ field: 'unified_number', key: 'duplicate_file', with: seen.uni[uni] }); seen.uni[uni] = idx + 2; }
          if (vat) { if (byVat[vat]) errors.push({ field: 'vat_number', key: 'duplicate_db', with: byVat[vat].id }); else if (seen.vat[vat]) errors.push({ field: 'vat_number', key: 'duplicate_file', with: seen.vat[vat] }); seen.vat[vat] = idx + 2; }
          var nk = SEARCH.normalize(rec.name_ar || rec.name_en || '', true);
          if (nk) { if (byName[nk]) warnings.push({ field: 'name_ar', key: 'possible_duplicate_db', with: byName[nk].id }); else if (seen.name[nk]) warnings.push({ field: 'name_ar', key: 'possible_duplicate_file', with: seen.name[nk] }); seen.name[nk] = idx + 2; }
          if (rec.tags) rec.tags = U.splitTags(rec.tags);
        }
        if (t.entity === 'contact') {
          if (rec.email && !U.isEmail(rec.email)) errors.push({ field: 'email', key: 'invalid_email' });
          if (rec.phone && !U.isPhone(rec.phone)) errors.push({ field: 'phone', key: 'invalid_phone' });
          if (rec.email) { var e = rec.email.toLowerCase(); if (contactEmails[e]) warnings.push({ field: 'email', key: 'possible_duplicate_db', with: contactEmails[e].id }); else if (seen.email[e]) warnings.push({ field: 'email', key: 'possible_duplicate_file', with: seen.email[e] }); seen.email[e] = idx + 2; }
        }
        if (t.entity === 'opportunity') {
          if (rec.stage === 'lost' && !rec.loss_reason) warnings.push({ field: 'stage', key: 'lost_without_reason' });
          if (rec.probability === undefined && rec.stage) { var st = root.STAGES.get(rec.stage); if (st) rec.probability = st.probability; }
        }
        if (t.entity === 'activity') {
          if (!rec.status) rec.status = U.daysUntil(rec.at) < 0 ? 'done' : 'planned';
        }
        delete rec.customer_ref; delete rec.owner_email;
        res.rows.push({ row: idx + 2, data: rec, errors: errors, warnings: warnings, ok: errors.length === 0 });
        if (errors.length) res.invalid++; else res.valid++;
        if (warnings.length) res.warnings++;
      });
      res.ok = res.invalid === 0 && res.structure_errors.length === 0;
      return res;
    },

    errorLabel: function (e, lang) {
      var m = {
        required: ['قيمة إلزامية مفقودة', 'Required value missing'], unsafe_formula: ['الخلية تبدأ بصيغة غير آمنة (= + - @) ورُفضت', 'Cell starts with an unsafe formula (= + - @) and was rejected'],
        invalid_value: ['قيمة غير موجودة في القائمة المعتمدة', 'Unknown list value'], invalid_date: ['تاريخ غير صالح', 'Invalid date'], invalid_number: ['رقم غير صالح', 'Invalid number'],
        unknown_user: ['مستخدم غير معروف (البريد أو الاسم)', 'Unknown user (email or name)'], unknown_customer: ['عميل غير موجود (المعرّف أو الاسم)', 'Customer not found (ID or name)'],
        invalid_cr: ['السجل التجاري يجب أن يكون 10 أرقام', 'CR must be 10 digits'], invalid_vat: ['الرقم الضريبي يجب أن يكون 15 رقمًا', 'VAT must be 15 digits'], invalid_unified: ['الرقم الموحد غير صالح', 'Invalid unified number'],
        invalid_email: ['بريد إلكتروني غير صالح', 'Invalid email'], invalid_phone: ['رقم هاتف غير صالح', 'Invalid phone'],
        duplicate_db: ['مكرر مع سجل قائم {with}', 'Duplicates existing record {with}'], duplicate_file: ['مكرر مع الصف {with} في الملف', 'Duplicates row {with} in the file'],
        possible_duplicate_db: ['اشتباه تكرار مع السجل {with}', 'Possible duplicate of {with}'], possible_duplicate_file: ['اشتباه تكرار مع الصف {with}', 'Possible duplicate of row {with}'],
        lost_without_reason: ['فرصة خاسرة بلا سبب خسارة', 'Lost opportunity without loss reason'],
        missing_columns: ['أعمدة إلزامية مفقودة: {columns}', 'Missing required columns: {columns}'], empty_file: ['الملف فارغ', 'File is empty'], too_many_rows: ['عدد الصفوف {got} يتجاوز الحد المسموح {max}', 'Row count {got} exceeds the limit {max}'], unknown_module: ['نوع بيانات غير معروف', 'Unknown data type']
      };
      var s = m[e.key] ? (lang === 'en' ? m[e.key][1] : m[e.key][0]) : e.key;
      return s.replace('{with}', e.with || '').replace('{columns}', (e.columns || []).join('، ')).replace('{got}', e.got || '').replace('{max}', e.max || '');
    }
  };

  root.IMPORTER = IMP;
})(typeof window !== 'undefined' ? window : globalThis);
