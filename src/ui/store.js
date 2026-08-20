/* =====================================================================
   STORE — الحالة المشتركة للواجهة (المستخدم، البيانات، اللغة) + حلّالو الأسماء
   ---------------------------------------------------------------------
   - البيانات تُقرأ من المحوّل كلقطة (snapshot) وتُحدَّث بعد كل تعديل.
   - الواجهة لا تعدّل اللقطة مباشرة؛ كل التعديلات عبر المحوّل ثم refresh().
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U, L = root.LOOKUPS, STAGES = root.STAGES, I18N = root.I18N, MODEL = root.MODEL, PERMS = root.PERMS;

  var S = {
    adapter: null, user: null, db: null, lang: 'ar', dark: false, mode: 'local', demo: false,
    _subs: [], _idx: {},
    init: function (adapter) { S.adapter = adapter; S.mode = adapter.mode; },
    subscribe: function (fn) { S._subs.push(fn); return function () { S._subs = S._subs.filter(function (f) { return f !== fn; }); }; },
    emit: function (ev, data) { S._subs.forEach(function (f) { try { f(ev, data); } catch (e) { console.error(e); } }); },
    refresh: function () {
      if (!S.user) { S.db = null; return Promise.resolve(null); }
      return S.adapter.snapshot().then(function (db) { S.db = db; S._index(); S.emit('data'); return db; });
    },
    _index: function () {
      var db = S.db; S._idx = {};
      ['customers', 'contacts', 'opportunities', 'proposals', 'contracts', 'projects', 'activities', 'campaigns', 'users'].forEach(function (t) { S._idx[t] = U.by(db[t] || [], 'id'); });
      /* العروض: عدة نسخ بنفس id → نُفهرس الأحدث */
      var pm = {}; (db.proposals || []).forEach(function (p) { if (!pm[p.id] || pm[p.id].version_no < p.version_no) pm[p.id] = p; }); S._idx.proposals = pm;
    },
    get: function (entity, id) { var t = { customer: 'customers', contact: 'contacts', opportunity: 'opportunities', proposal: 'proposals', contract: 'contracts', project: 'projects', activity: 'activities', campaign: 'campaigns', user: 'users' }[entity] || entity; return (S._idx[t] || {})[id] || null; },
    list: function (table) { return (S.db && S.db[table]) || []; },
    live: function (table) { return S.list(table).filter(function (r) { return !r.archived_at; }); },
    /* ---------- الأسماء ---------- */
    userName: function (id) { var u = S.get('user', id); if (!u) return id ? '—' : '—'; return S.lang === 'en' ? (u.name_en || u.name_ar) : (u.name_ar || u.name_en); },
    userInitials: function (id) { var u = S.get('user', id); return u ? U.initials(S.lang === 'en' ? (u.name_en || u.name_ar) : (u.name_ar || u.name_en)) : '?'; },
    customerName: function (id) { var c = S.get('customer', id); return c ? MODEL.displayName('customer', c, S.lang) : (id || '—'); },
    contactName: function (id) { var c = S.get('contact', id); return c ? c.full_name : '—'; },
    oppName: function (id) { var o = S.get('opportunity', id); return o ? MODEL.displayName('opportunity', o, S.lang) : (id || '—'); },
    label: function (list, key) { return L.label(list, key, S.lang); },
    stageLabel: function (key) { return STAGES.label(key, S.lang); },
    regionLabel: function (key) { return L.label('regions', key, S.lang); },
    cityLabel: function (region, city) { return L.cityLabel(region, city, S.lang) || city || '—'; },
    roleLabel: function (role) { return PERMS.roleLabel(role, S.lang); },
    /* ---------- المال والتاريخ حسب اللغة ---------- */
    money: function (n) { return U.fmtMoney(n, S.lang); },
    moneyShort: function (n) { return U.fmtMoneyShort(n, S.lang); },
    date: function (d) { return U.fmtDate(d, S.lang); },
    dateTime: function (d) { return U.fmtDateTime(d, S.lang); },
    hijri: function (d) { return root.APP_CONFIG.locale.show_hijri && d ? root.HIJRI.fmt(d, S.lang) : ''; },
    rel: function (n) { return U.relDays(n, S.lang); },
    /* ---------- الصلاحيات ---------- */
    can: function (perm) { return PERMS.can(S.user, perm); },
    canRec: function (perm, rec, parents) { return PERMS.canRecord(S.user, perm, rec, parents); },
    parentsOf: function (rec) { var out = []; if (!rec) return out; if (rec.customer_id) { var c = S.get('customer', rec.customer_id); if (c) out.push(c); } if (rec.opportunity_id) { var o = S.get('opportunity', rec.opportunity_id); if (o) { out.push(o); var c2 = S.get('customer', o.customer_id); if (c2) out.push(c2); } } if (rec.contract_id) { var k = S.get('contract', rec.contract_id); if (k) out.push(k); } return out; },
    seesCommercial: function (rec) { return PERMS.canSeeCommercial(S.user, rec, S.parentsOf(rec)); },
    /* ---------- مساعدات علاقات ---------- */
    contactsOf: function (customerId) { return S.live('contacts').filter(function (c) { return c.customer_id === customerId; }); },
    oppsOf: function (customerId) { return S.live('opportunities').filter(function (o) { return o.customer_id === customerId; }); },
    proposalsOf: function (oppId) { return U.sortBy(S.live('proposals').filter(function (p) { return p.opportunity_id === oppId; }), 'version_no', 'desc'); },
    latestProposal: function (oppId) { return S.proposalsOf(oppId)[0] || null; },
    contractOf: function (oppId) { return S.live('contracts').find(function (c) { return c.opportunity_id === oppId; }) || null; },
    activitiesOf: function (q) { return S.live('activities').filter(function (a) { return (!q.customer_id || a.customer_id === q.customer_id) && (!q.opportunity_id || a.opportunity_id === q.opportunity_id) && (!q.contact_id || a.contact_id === q.contact_id); }); },
    historyOf: function (oppId) { return U.sortBy(S.list('stage_history').filter(function (h) { return h.opportunity_id === oppId; }), 'changed_at'); },
    pendingApprovalsFor: function (entityType, entityId) { return S.list('approvals').filter(function (a) { return a.entity_type === entityType && a.entity_id === entityId && a.status === 'pending'; }); },
    setLang: function (lang) {
      S.lang = lang === 'en' ? 'en' : 'ar'; I18N.set(S.lang);
      document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'en' ? 'ltr' : 'rtl'; document.body.setAttribute('dir', S.lang === 'en' ? 'ltr' : 'rtl');
      try { localStorage.setItem('crm-lang', S.lang); } catch (e) { }
      S.emit('lang');
    },
    setDark: function (on) { S.dark = !!on; document.body.classList.toggle('dark', S.dark); try { localStorage.setItem('crm-dark', S.dark ? '1' : '0'); } catch (e) { } S.emit('theme'); }
  };
  root.STORE = S;
})(typeof window !== 'undefined' ? window : globalThis);
