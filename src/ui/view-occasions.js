/* =====================================================================
   VIEW: العلاقات والمناسبات — تقويم المناسبات + حملات التهاني (إعداد/اعتماد/تصدير/تسجيل)
   لا إرسال خارجي إطلاقًا؛ التصدير بعد اعتماد بشري فقط.
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, L = root.LOOKUPS, ENGINE = root.ENGINE, MODEL = root.MODEL, OCC = root.OCCASIONS_CONFIG, PERMS = root.PERMS, RULES = root.RULES;
  root.VIEWS = root.VIEWS || {};

  function statusChip(cm) { var map = { draft: ['slate', t('oc.status_draft')], pending_approval: ['warn', t('oc.status_pending')], approved: ['ok', t('oc.status_approved')], exported: ['accent', t('oc.status_exported')], closed: ['slate', t('oc.status_closed')] }; var m = map[cm.status] || ['slate', cm.status]; return UI.chip(m[0], m[1]); }
  function exclusionLabel(k) { return t('oc.exclusion_' + ({ optout: 'optout', inactive: 'inactive', no_channel: 'no_channel', duplicate: 'duplicate', sent: 'sent', archived: 'archived' }[k] || k)); }

  function renderList(main) {
    main.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, t('oc.title')), h('p', { class: 'sub' }, t('oc.sub'))), h('div', { class: 'actions' }, S.can('occasions.manage') ? h('button', { class: 'btn primary', type: 'button', on: { click: function () { newCampaign(); } } }, UI.icon('plus'), t('oc.new_campaign')) : null)));
    main.appendChild(UI.infoBox(t('oc.not_sales') + ' ' + t('oc.export_hint')));
    /* التقويم السنوي */
    var year = U.now().getFullYear();
    var up = ENGINE.upcomingOccasions(OCC.list, year).filter(function (x) { return x.days >= -30; }).slice(0, 8);
    var campaigns = S.live('campaigns');
    var calCard = UI.card({ title: t('oc.calendar'), sub: year + ' – ' + (year + 1), tight: true, body: UI.table({ columns: [
      { key: 'occ', label: t('oc.occasion'), width: 2, get: function (x) { return h('span', null, h('span', { class: 'bold' }, OCC.label(x.occasion.key, S.lang)), h('span', { class: 'sub' }, x.occasion.type === 'religious' ? (S.lang === 'en' ? 'Religious (Umm al-Qura)' : 'دينية (أم القرى)') : (x.occasion.type === 'national' ? (S.lang === 'en' ? 'National' : 'وطنية') : ''))); } },
      { key: 'date', label: t('oc.date'), width: 1.6, get: function (x) { return UI.dateCell(x.date, true); } },
      { key: 'in', label: t('app.upcoming'), width: 1.1, get: function (x) { return x.days < 0 ? h('span', { class: 'muted' }, S.rel(x.days)) : UI.chip(x.days <= (x.occasion.prep_days || 7) ? 'warn' : 'slate', t('oc.in_days', { n: x.days }), 'sm'); } },
      { key: 'prep', label: t('oc.prep_needed'), width: 1.3, get: function (x) { var has = campaigns.some(function (c) { return c.occasion_key === x.occasion.key && c.year === U.parseDate(x.date).getFullYear(); }); if (x.occasion.enabled === false) return UI.chip('slate', t('oc.policy_gated'), 'sm'); if (has) return UI.chip('ok', t('oc.campaigns') + ' ✓', 'sm'); return x.days >= 0 && x.days <= (x.occasion.prep_days || 7) + 14 ? UI.chip('warn', t('oc.prep_needed'), 'sm') : h('span', { class: 'muted' }, '—'); } },
      { key: 'act', label: '', width: 1.2, get: function (x) { if (!S.can('occasions.manage') || x.occasion.enabled === false || x.days < -7) return null; return h('button', { class: 'btn xs', type: 'button', on: { click: function () { newCampaign(x.occasion.key, U.parseDate(x.date).getFullYear()); } } }, t('oc.new_campaign')); } }
    ], rows: up }) });
    var g = h('div', { class: 'two' });
    g.appendChild(calCard);
    /* العملاء الذين يحتاجون تحضيرًا: عملاء استراتيجيون بلا جهة اتصال تقبل التهاني */
    var prepCust = S.live('customers').filter(function (c) { return c.status !== 'archived' && (c.classification === 'A' || c.strategic_importance === 'high'); }).map(function (c) { var ks = S.contactsOf(c.id); var ok = ks.filter(function (k) { return k.active !== false && !k.greeting_opt_out && (k.email || k.phone); }); return { c: c, ok: ok.length, total: ks.length }; }).filter(function (x) { return x.ok === 0; });
    g.appendChild(UI.card({ title: t('oc.customers_prep'), sub: S.lang === 'en' ? 'Strategic customers without a reachable greeting contact' : 'عملاء استراتيجيون بلا جهة اتصال صالحة للتهاني', tight: true, body: UI.list(prepCust, function (x) { return h('div', null, h('span', { class: 'avatar warn' }, '!'), h('div', { class: 'main' }, h('div', { class: 't' }, MODEL.displayName('customer', x.c, S.lang)), h('div', { class: 's' }, x.total + ' ' + t('cu.tab_contacts') + ' · 0 ' + t('oc.included')))); }, function (x) { location.hash = '#/customers/' + x.c.id + '?tab=contacts'; }) }));
    main.appendChild(g);
    main.appendChild(UI.secHead('', t('oc.campaigns'), campaigns.length + ' ' + (S.lang === 'en' ? 'campaigns' : 'حملة')));
    main.appendChild(UI.card({ tight: true, body: UI.table({ columns: [
      { key: 'title', label: t('oc.campaign_title'), width: 2.4, get: function (c) { return h('span', null, h('span', { class: 'lnk' }, c.title), h('span', { class: 'sub' }, c.id + ' · ' + OCC.label(c.occasion_key, S.lang) + ' ' + c.year)); } },
      { key: 'status', label: t('app.status'), width: 1.2, get: statusChip },
      { key: 'inc', label: t('oc.recipients'), width: 1.4, get: function (c) { var inc = (c.recipients || []).filter(function (r) { return r.status === 'included'; }).length; return t('oc.count_included', { n: inc }) + ' · ' + t('oc.count_excluded', { n: (c.recipients || []).length - inc }); } },
      { key: 'sent', label: t('oc.sent_log'), width: 1, num: true, get: function (c) { return String((c.sent_log || []).length); } },
      { key: 'by', label: t('app.created'), width: 1.4, get: function (c) { return S.userName(c.created_by) + ' · ' + S.date(c.created_at); } },
      { key: 'appr', label: t('pr.approval'), width: 1.3, get: function (c) { return c.approved_by ? S.userName(c.approved_by) + ' · ' + S.date(c.approved_at) : null; } }
    ], rows: U.sortBy(campaigns, 'created_at', 'desc'), onRow: function (c) { location.hash = '#/occasions/' + c.id; } }) }));
    /* القوالب */
    main.appendChild(UI.secHead('', t('oc.templates'), ''));
    var tg = h('div', { class: 'grid c2' });
    OCC.list.forEach(function (o) { var tpl = OCC.templates[o.key] || {}; if (!tpl.ar && !tpl.en) return; tg.appendChild(UI.card({ title: OCC.label(o.key, S.lang), sub: o.enabled === false ? t('oc.policy_gated') : '', body: h('div', null, h('p', { dir: 'rtl' }, tpl.ar), h('p', { class: 'muted small ltr', style: { marginTop: '8px' } }, tpl.en)) })); });
    main.appendChild(tg);
  }

  function newCampaign(occasionKey, year) {
    var m = UI.formModal({ title: t('oc.new_campaign'), size: 'lg', fields: [
      { key: 'occasion_key', label: t('oc.occasion'), type: 'select', options: OCC.list.map(function (o) { return { value: o.key, label: OCC.label(o.key, S.lang) + (o.enabled === false ? ' — ' + t('oc.policy_gated') : ''), disabled: o.enabled === false }; }), required: true },
      { key: 'year', label: t('oc.year'), type: 'int', required: true },
      { key: 'title', label: t('oc.campaign_title'), type: 'text', required: true, span2: true },
      { key: 'template_ar', label: t('oc.template_ar'), type: 'textarea', span2: true, required: true },
      { key: 'template_en', label: t('oc.template_en'), type: 'textarea', span2: true, dir: 'ltr' },
      { key: 'design_ref', label: t('oc.design'), type: 'text', span2: true, dir: 'ltr' }
    ], values: { occasion_key: occasionKey || 'national_day', year: year || U.now().getFullYear(), title: (occasionKey ? OCC.label(occasionKey, 'ar') : OCC.label('national_day', 'ar')) + ' ' + (year || U.now().getFullYear()), template_ar: (OCC.templates[occasionKey || 'national_day'] || {}).ar || '', template_en: (OCC.templates[occasionKey || 'national_day'] || {}).en || '' },
      onSubmit: function (v) { return S.adapter.create('campaign', v).then(function (c) { return root.APP.refresh().then(function () { location.hash = '#/occasions/' + c.id; }); }); } });
    /* تحديث القالب والعنوان عند تغيير المناسبة */
    m.form.fields.occasion_key.ctl.addEventListener('change', function () { var k = m.form.get('occasion_key'); var tpl = OCC.templates[k] || {}; m.form.set('template_ar', tpl.ar || ''); m.form.set('template_en', tpl.en || ''); m.form.set('title', OCC.label(k, 'ar') + ' ' + (m.form.get('year') || U.now().getFullYear())); });
  }

  function renderDetail(main, id) {
    var cm = S.get('campaign', id);
    if (!cm) { main.appendChild(UI.empty(t('app.no_results'), id)); return; }
    var canM = S.canRec('occasions.manage', cm), canA = PERMS.canDecide(S.user, 'bulk_greeting');
    var included = (cm.recipients || []).filter(function (r) { return r.status === 'included'; }), excluded = (cm.recipients || []).filter(function (r) { return r.status !== 'included'; });
    var pending = S.pendingApprovalsFor('campaign', cm.id);
    main.appendChild(h('div', { class: 'crumbs' }, UI.link('#/occasions', t('nav.occasions')), h('span', { class: 'sep' }, '/'), h('span', null, cm.id)));
    var head = h('div', { class: 'page-head' }, h('div', null, h('h1', null, cm.title, ' ', statusChip(cm), ' ', UI.originChip(cm)), h('p', { class: 'sub' }, OCC.label(cm.occasion_key, S.lang) + ' ' + cm.year + ' · ' + t('app.created') + ' ' + S.userName(cm.created_by) + ' · ' + S.date(cm.created_at))));
    var acts = h('div', { class: 'actions' });
    var locked = ['approved', 'exported', 'closed'].indexOf(cm.status) >= 0;
    if (canM && !locked) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { editCampaign(cm); } } }, UI.icon('edit'), t('app.edit')));
    if (canM && !locked) acts.appendChild(h('button', { class: 'btn accent', type: 'button', on: { click: function () { buildRecipients(cm); } } }, t('oc.build_recipients')));
    if (canM && cm.status === 'draft' && included.length) acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { S.adapter.campaignSubmit(cm.id).then(function () { return root.APP.rerender().then(function () { UI.toast(t('app.approval_sent'), 'ok'); }); }).catch(UI.errorToast); } } }, t('oc.request_approval')));
    if (canA && cm.status === 'pending_approval' && pending.length && pending[0].requested_by !== S.user.id) { acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { S.adapter.decideApproval(pending[0].id, 'approved', '').then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('oc.approve'))); acts.appendChild(h('button', { class: 'btn danger', type: 'button', on: { click: function () { UI.formModal({ title: t('oc.reject'), size: 'sm', cols: 1, fields: [{ key: 'reason', label: t('ad.approval_reason'), type: 'textarea', required: true }], values: {}, onSubmit: function (v) { return S.adapter.decideApproval(pending[0].id, 'rejected', v.reason).then(function () { return root.APP.rerender(); }); } }); } } }, t('oc.reject'))); }
    if ((canM || canA) && ['approved', 'exported', 'closed'].indexOf(cm.status) >= 0) acts.appendChild(h('button', { class: 'btn primary', type: 'button', on: { click: function () { exportPackage(cm); } } }, UI.icon('download'), t('oc.export_package')));
    if (canM && ['approved', 'exported'].indexOf(cm.status) >= 0) acts.appendChild(h('button', { class: 'btn', type: 'button', on: { click: function () { recordSent(cm); } } }, t('oc.record_sent')));
    if (canM && cm.status === 'exported') acts.appendChild(h('button', { class: 'btn ghost', type: 'button', on: { click: function () { S.adapter.campaignClose(cm.id).then(function () { return root.APP.rerender(); }).catch(UI.errorToast); } } }, t('oc.status_closed')));
    head.appendChild(acts); main.appendChild(head);
    if (cm.status === 'pending_approval') main.appendChild(UI.warnBox(t('app.needs_approval_by', { roles: PERMS.approverRoles('bulk_greeting').map(S.roleLabel).join('/') })));
    if (cm.rejection_reason && cm.status === 'draft') main.appendChild(UI.errorBox(t('oc.reject') + ': ' + cm.rejection_reason));
    var kp = h('div', { class: 'kpis c4', style: { marginBottom: '14px' } });
    kp.appendChild(UI.kpi({ label: t('oc.included'), value: String(included.length), tone: 'ok' }));
    kp.appendChild(UI.kpi({ label: t('oc.excluded'), value: String(excluded.length) }));
    kp.appendChild(UI.kpi({ label: t('oc.sent_log'), value: String((cm.sent_log || []).length), sub: cm.exported_at ? t('oc.status_exported') + ' ' + S.dateTime(cm.exported_at) : '' }));
    kp.appendChild(UI.kpi({ label: t('pr.approval'), value: cm.approved_by ? S.userName(cm.approved_by) : (cm.status === 'pending_approval' ? t('app.in_review') : '—'), sub: cm.approved_at ? S.dateTime(cm.approved_at) : '' }));
    main.appendChild(kp);
    var g = h('div', { class: 'grid c2' });
    g.appendChild(UI.card({ title: t('oc.preview'), body: h('div', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, t('oc.template_ar')), h('p', { style: { background: 'var(--paper)', padding: '10px 12px', borderRadius: '10px' } }, cm.template_ar || '—'), h('div', { class: 'small muted', style: { margin: '10px 0 6px' } }, t('oc.template_en')), h('p', { class: 'ltr', style: { background: 'var(--paper)', padding: '10px 12px', borderRadius: '10px' } }, cm.template_en || '—'), h('div', { class: 'small muted', style: { marginTop: '10px' } }, t('oc.design') + ': ' + (cm.design_ref || '—'))) }));
    var crit = cm.criteria || {};
    g.appendChild(UI.card({ title: t('oc.recipient_filters'), body: UI.kv([[t('oc.filter_customers'), (crit.statuses || []).map(function (s) { return S.label('customer_statuses', s); }).join('، ') || t('app.all')], [t('oc.filter_class'), (crit.classes || []).join('، ') || t('app.all')], [t('oc.filter_type'), (crit.types || []).map(function (s) { return S.label('customer_types', s); }).join('، ') || t('app.all')], [t('oc.filter_region'), (crit.regions || []).map(S.regionLabel).join('، ') || t('app.all')], [t('oc.filter_roles'), (crit.roles || []).map(function (s) { return S.label('contact_roles', s); }).join('، ') || t('app.all')], [t('oc.filter_lang'), (crit.languages || []).map(function (s) { return S.label('languages', s); }).join('، ') || t('app.all')]]) }));
    main.appendChild(g);
    var sentIdx = {}; (cm.sent_log || []).forEach(function (s) { sentIdx[s.contact_id] = s; });
    main.appendChild(UI.secHead('', t('oc.recipients'), t('oc.count_included', { n: included.length }) + ' · ' + t('oc.count_excluded', { n: excluded.length })));
    main.appendChild(UI.card({ tight: true, body: UI.table({ columns: [
      { key: 'contact_name', label: t('app.contact'), width: 1.8, get: function (r) { return h('span', null, h('span', { class: 'bold' }, r.contact_name), h('span', { class: 'sub' }, (S.get('contact', r.contact_id) || {}).position || '')); } },
      { key: 'customer_name', label: t('app.customer'), width: 2, get: function (r) { return UI.recordLink('customer', r.customer_id, S.customerName(r.customer_id)); } },
      { key: 'email', label: t('ct.email'), width: 1.6, get: function (r) { return r.email ? h('span', { class: 'ltr' }, r.email) : null; } },
      { key: 'phone', label: t('ct.phone'), width: 1.1, get: function (r) { return r.phone ? h('span', { class: 'num' }, r.phone) : null; } },
      { key: 'language', label: t('oc.filter_lang'), width: .8, get: function (r) { return S.label('languages', r.language); } },
      { key: 'status', label: t('app.status'), width: 1.6, get: function (r) { return r.status === 'included' ? UI.chip('ok', t('oc.included'), 'sm') : UI.chip('warn', t('oc.excluded') + ' — ' + exclusionLabel(r.exclusion), 'sm'); } },
      { key: 'sent', label: t('oc.sent_log'), width: 1.5, get: function (r) { var s = sentIdx[r.contact_id]; return s ? h('span', null, UI.chip('ok', S.dateTime(s.sent_at), 'sm'), h('span', { class: 'sub' }, S.userName(s.sent_by) + ' · ' + (s.channel || ''))) : null; } }
    ], rows: U.sortBy(cm.recipients || [], function (r) { return r.status === 'included' ? 0 : 1; }) }) }));

    function editCampaign(cm) {
      UI.formModal({ title: t('app.edit'), sub: cm.id, size: 'lg', fields: [{ key: 'title', label: t('oc.campaign_title'), type: 'text', required: true, span2: true }, { key: 'template_ar', label: t('oc.template_ar'), type: 'textarea', span2: true, required: true }, { key: 'template_en', label: t('oc.template_en'), type: 'textarea', span2: true, dir: 'ltr' }, { key: 'design_ref', label: t('oc.design'), type: 'text', span2: true, dir: 'ltr' }], values: cm, onSubmit: function (v) { return S.adapter.update('campaign', cm.id, U.pick(v, ['title', 'template_ar', 'template_en', 'design_ref']), cm.version).then(function () { return root.APP.rerender(); }); } });
    }
    function buildRecipients(cm) {
      var crit = cm.criteria || {};
      UI.formModal({ title: t('oc.build_recipients'), sub: cm.title, size: 'lg', fields: [
        { key: 'statuses', label: t('oc.filter_customers'), type: 'multiselect', options: L.customer_statuses.filter(function (s) { return s.key !== 'archived'; }).map(function (s) { return { value: s.key, label: S.lang === 'en' ? s.en : s.ar }; }), span2: true },
        { key: 'classes', label: t('oc.filter_class'), type: 'multiselect', lookup: 'customer_classes' },
        { key: 'types', label: t('oc.filter_type'), type: 'multiselect', lookup: 'customer_types' },
        { key: 'regions', label: t('oc.filter_region'), type: 'multiselect', lookup: 'regions', span2: true },
        { key: 'roles', label: t('oc.filter_roles'), type: 'multiselect', lookup: 'contact_roles', span2: true },
        { key: 'languages', label: t('oc.filter_lang'), type: 'multiselect', lookup: 'languages' },
        { type: 'note', label: S.lang === 'en' ? 'Exclusions applied automatically: opted-out or inactive contacts, missing channel, archived customers, duplicates, and contacts already sent this occasion/year.' : 'تُطبَّق الاستثناءات تلقائيًا: من اختار عدم الاستلام، غير النشطين، بلا وسيلة تواصل، العملاء المؤرشفون، المكررون، ومن أُرسل لهم سابقًا لنفس المناسبة والسنة.' }
      ], values: { statuses: crit.statuses || ['active', 'prospect'], classes: crit.classes || [], types: crit.types || [], regions: crit.regions || [], roles: crit.roles || [], languages: crit.languages || [] }, saveLabel: t('oc.build_recipients'),
        onSubmit: function (v) { return S.adapter.buildRecipients(v, cm.id).then(function (r) { return root.APP.rerender().then(function () { UI.toast(t('oc.count_included', { n: r.included }) + ' · ' + t('oc.count_excluded', { n: r.excluded }), 'ok'); }); }); } });
    }
    function exportPackage(cm) {
      S.adapter.campaignExport(cm.id).then(function (r) {
        var cols = [{ key: 'contact_name', label: t('app.contact') }, { key: 'customer', label: t('app.customer') }, { key: 'email', label: t('ct.email') }, { key: 'phone', label: t('ct.phone') }, { key: 'language', label: t('oc.filter_lang') }, { key: 'message', label: t('oc.preview') }, { key: 'design_ref', label: t('oc.design') }, { key: 'contact_id', label: t('app.id') }];
        root.EXPORTER.downloadXlsx('greeting_' + cm.id + '_' + U.today() + '.xlsx', [{ name: 'Recipients', columns: cols, rows: r.rows }, { name: 'Message', columns: [{ key: 'k', label: 'Field' }, { key: 'v', label: 'Value' }], rows: [{ k: 'Campaign', v: cm.title }, { k: 'Occasion', v: OCC.label(cm.occasion_key, 'en') }, { k: 'Year', v: cm.year }, { k: 'Approved by', v: S.userName(cm.approved_by) }, { k: 'Template AR', v: cm.template_ar }, { k: 'Template EN', v: cm.template_en }, { k: 'Design', v: cm.design_ref }] }]);
        return root.APP.rerender();
      }).catch(UI.errorToast);
    }
    function recordSent(cm) {
      var inc = (cm.recipients || []).filter(function (r) { return r.status === 'included' && !sentIdx[r.contact_id]; });
      UI.formModal({ title: t('oc.record_sent'), sub: cm.title, size: 'md', cols: 1, fields: [{ key: 'channel', label: t('oc.sent_channel'), type: 'text', required: true, hint: S.lang === 'en' ? 'e.g. official company email / courier / official WhatsApp account (if approved)' : 'مثال: البريد الرسمي للشركة / مندوب / حساب واتساب الرسمي (إن كان معتمدًا)' }, { key: 'contacts', label: t('oc.recipients'), type: 'multiselect', options: inc.map(function (r) { return { value: r.contact_id, label: r.contact_name + ' — ' + r.customer_name }; }), required: true }], values: { channel: '', contacts: inc.map(function (r) { return r.contact_id; }) }, saveLabel: t('oc.record_sent'),
        onSubmit: function (v) { return S.adapter.campaignRecordSent(cm.id, v.contacts, v.channel).then(function () { return root.APP.rerender(); }); } });
    }
  }

  root.VIEWS.occasions = { render: function (main, r) { if (r.id) renderDetail(main, r.id); else renderList(main); } };
})(typeof window !== 'undefined' ? window : globalThis);
