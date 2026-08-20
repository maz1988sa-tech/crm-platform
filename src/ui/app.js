/* =====================================================================
   APP — الإقلاع، تسجيل الدخول، الهيكل، التنقل، البحث العام، التنبيهات
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, S = root.STORE, UI = root.UI, t = root.t, CFG = root.APP_CONFIG, PERMS = root.PERMS, ENGINE = root.ENGINE, SEARCH = root.SEARCH, MODEL = root.MODEL, STAGES = root.STAGES;

  var VIEWS = root.VIEWS = root.VIEWS || {};
  var NAV = [
    { key: 'overview', route: 'overview' }, { key: 'mywork', route: 'mywork' }, { key: 'customers', route: 'customers' }, { key: 'opportunities', route: 'opportunities' },
    { key: 'proposals', route: 'proposals' }, { key: 'contracts', route: 'contracts' }, { key: 'activities', route: 'activities' }, { key: 'occasions', route: 'occasions' },
    { key: 'reports', route: 'reports' }, { key: 'admin', route: 'admin' }
  ];

  var APP = { current: null, unsavedGuard: null };

  function applyTheme() {
    var th = CFG.theme || {}; var r = document.documentElement.style;
    if (th.primary) r.setProperty('--ink', th.primary); if (th.primary2) r.setProperty('--ink2', th.primary2);
    if (th.accent) r.setProperty('--accent', th.accent); if (th.accentSoft) r.setProperty('--accent-soft', th.accentSoft);
    document.title = S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar;
  }

  /* ---------- شاشة الدخول ---------- */
  function renderLogin(rootEl, err) {
    D.clear(rootEl);
    var demoMode = S.mode === 'local';
    var lmark = h('span', { class: 'mark', 'aria-hidden': 'true' }); lmark.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg>';
    var side = h('div', { class: 'side' }, h('div', { class: 'brand' }, lmark, h('div', { class: 'titles' }, h('span', { class: 'name', style: { color: '#fff' } }, S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar))),
      h('h1', null, S.lang === 'en' ? 'One reliable view of customers, opportunities and contracts.' : 'نظرة واحدة موثوقة على العملاء والفرص والعقود.'),
      h('p', null, S.lang === 'en' ? 'From first contact to award, loss or closure — with clear next actions, deadlines and a full audit trail.' : 'من أول تواصل حتى الترسية أو الخسارة أو الإقفال — بإجراءات تالية واضحة ومواعيد مضبوطة وسجل تدقيق كامل.'),
      h('ul', null, h('li', null, S.lang === 'en' ? 'Customers, contacts and relationship ownership' : 'العملاء وجهات الاتصال ومسؤولية العلاقة'), h('li', null, S.lang === 'en' ? 'Pipeline with configurable stages and history' : 'مسار فرص بمراحل قابلة للتهيئة وسجل كامل'), h('li', null, S.lang === 'en' ? 'Proposals, approvals, contracts and handover' : 'العروض والاعتمادات والعقود والتسليم'), h('li', null, S.lang === 'en' ? 'Role-based access enforced on the backend' : 'صلاحيات حسب الدور تُفرض على الخادم')),
      h('p', { class: 'small', style: { marginTop: 'auto', opacity: .7 } }, (S.lang === 'en' ? CFG.platform.classification_en : CFG.platform.classification_ar) + ' · v' + CFG.platform.version));
    var pane = h('div', { class: 'pane' });
    var top = h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('h2', { style: { flex: 1 } }, demoMode ? t('login.demo_title') : t('login.title')), h('button', { class: 'langbtn', type: 'button', on: { click: function () { S.setLang(S.lang === 'ar' ? 'en' : 'ar'); renderLogin(rootEl); } } }, t('app.lang_toggle')));
    pane.appendChild(top);
    if (err) pane.appendChild(UI.errorBox(err));
    if (demoMode) {
      pane.appendChild(h('p', { class: 'muted small' }, t('login.demo_hint')));
      var grid = h('div', { class: 'demo-users' });
      S.adapter.users().then(function (users) {
        users.filter(function (u) { return u.active !== false; }).forEach(function (u) {
          var b = h('button', { type: 'button', on: { click: function () { S.adapter.signInAs(u.id).then(function (usr) { APP.afterLogin(usr); }).catch(function (e) { renderLogin(rootEl, t('login.failed')); }); } } }, h('span', { class: 'avatar' }, U.initials(S.lang === 'en' ? (u.name_en || u.name_ar) : (u.name_ar || u.name_en))), h('span', null, h('div', { class: 'nm' }, S.lang === 'en' ? (u.name_en || u.name_ar) : (u.name_ar || u.name_en)), h('div', { class: 'rl' }, PERMS.roleLabel(u.role, S.lang))));
          grid.appendChild(b);
        });
      });
      pane.appendChild(grid);
    } else {
      var form = UI.form({ cols: 1, fields: [{ key: 'email', label: t('login.email'), type: 'email', required: true }, { key: 'password', label: t('login.password'), type: 'password', required: true }] });
      var pw = form.fields.password.ctl; pw.type = 'password';
      var btn = h('button', { class: 'btn primary block', type: 'button', on: { click: function () { var e = form.validate(); if (Object.keys(e).length) { form.setErrors(e); return; } btn.disabled = true; var v = form.values(); S.adapter.signIn(v.email, v.password).then(function (usr) { APP.afterLogin(usr); }).catch(function (er) { btn.disabled = false; renderLogin(rootEl, er && er.code === 'no_profile' ? t('login.no_profile') : (er && er.code === 'inactive' ? t('login.inactive') : t('login.failed'))); }); } } }, t('login.submit'));
      form.el.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
      pane.appendChild(form.el); pane.appendChild(btn);
    }
    rootEl.appendChild(h('div', { class: 'login-wrap' }, h('div', { class: 'login' }, side, pane)));
  }

  /* ---------- الهيكل ---------- */
  function buildShell(rootEl) {
    D.clear(rootEl);
    var app = h('div', { class: 'app' });
    app.appendChild(h('a', { class: 'skip-link', href: '#main' }, t('app.nav_skip')));
    /* الشريط العلوي */
    var mark = h('span', { class: 'mark', 'aria-hidden': 'true' }); mark.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/></svg>';
    var brand = h('a', { class: 'brand', href: '#/overview' }, mark, h('span', { class: 'titles' }, h('span', { class: 'name' }, S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar), h('span', { class: 'company' }, S.lang === 'en' ? CFG.platform.company_en : CFG.platform.company_ar)));
    var gs = buildGlobalSearch();
    var alertsBtn = h('button', { class: 'iconbtn', type: 'button', title: t('app.alerts'), 'aria-label': t('app.alerts'), on: { click: openAlerts } }, UI.icon('bell'));
    APP.alertsBtn = alertsBtn;
    var darkBtn = h('button', { class: 'iconbtn', type: 'button', title: S.dark ? t('app.light') : t('app.dark'), 'aria-label': S.dark ? t('app.light') : t('app.dark'), on: { click: function () { S.setDark(!S.dark); D.clear(darkBtn); darkBtn.appendChild(UI.icon(S.dark ? 'sun' : 'moon')); darkBtn.title = S.dark ? t('app.light') : t('app.dark'); darkBtn.setAttribute('aria-label', darkBtn.title); } } }, UI.icon(S.dark ? 'sun' : 'moon'));
    var langBtn = h('button', { class: 'langbtn', type: 'button', on: { click: function () { S.setLang(S.lang === 'ar' ? 'en' : 'ar'); buildShell(rootEl); route(); } } }, t('app.lang_toggle'));
    var um = h('button', { class: 'usermenu', type: 'button', title: t('app.signout'), on: { click: function () { UI.confirm({ title: t('app.signout'), message: S.userName(S.user.id) + ' — ' + S.roleLabel(S.user.role) , ok: t('app.signout') }).then(function (ok) { if (ok) S.adapter.signOut().then(function () { S.user = null; S.db = null; location.hash = ''; boot(); }); }); } } }, h('span', { class: 'av' }, S.userInitials(S.user.id)), h('span', { style: { minWidth: 0 } }, h('div', { class: 'nm' }, S.userName(S.user.id)), h('div', { class: 'rl' }, S.roleLabel(S.user.role))));
    app.appendChild(h('header', { class: 'topbar', role: 'banner' }, brand, gs, h('span', { class: 'spacer' }), h('div', { class: 'tools' }, alertsBtn, darkBtn, langBtn, um)));
    /* التنقل */
    var nav = h('nav', { class: 'mainnav', 'aria-label': t('app.menu') });
    var sc = h('div', { class: 'scroller' });
    NAV.forEach(function (n) { if (!PERMS.canViewModule(S.user, n.key)) return; sc.appendChild(h('a', { class: 'pill', href: '#/' + n.route, 'data-nav': n.key }, t('nav.' + n.key))); });
    nav.appendChild(sc); app.appendChild(nav); APP.nav = sc;
    app.appendChild(h('main', { id: 'main', class: 'content', tabindex: '-1' }));
    app.appendChild(h('div', { class: 'classif' }, (S.lang === 'en' ? CFG.platform.classification_en : CFG.platform.classification_ar) + ' · ' + (S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar) + ' · ' + U.fmtDate(U.now(), S.lang)));
    rootEl.appendChild(app);
    applyTheme();
    updateBadges();
  }

  function updateBadges() {
    if (!S.db || !APP.nav) return;
    var alerts = ENGINE.alertsFor(S.user, S.db, { all: false });
    var n = alerts.length;
    var b = APP.alertsBtn; if (b) { var old = b.querySelector('.badge'); if (old) old.remove(); if (n) b.appendChild(h('span', { class: 'badge' }, n > 99 ? '99+' : String(n))); }
    var mw = APP.nav.querySelector('[data-nav=mywork]'); if (mw) { var oc = mw.querySelector('.cnt'); if (oc) oc.remove(); if (n) mw.appendChild(h('span', { class: 'cnt' }, String(n))); }
    var pendingForMe = S.list('approvals').filter(function (a) { return a.status === 'pending' && PERMS.canDecide(S.user, a.type) && a.requested_by !== S.user.id; }).length;
    var ad = APP.nav.querySelector('[data-nav=admin]'); if (ad) { var oc2 = ad.querySelector('.cnt'); if (oc2) oc2.remove(); if (pendingForMe) ad.appendChild(h('span', { class: 'cnt' }, String(pendingForMe))); }
  }

  function openAlerts() {
    var alerts = ENGINE.alertsFor(S.user, S.db, { all: false });
    var rows = alerts.map(function (a) {
      var title, sub, href;
      if (a.entity === 'activity') { title = a.record.purpose || S.label('activity_types', a.record.type); sub = S.customerName(a.record.customer_id) + ' · ' + (a.kind === 'activity_overdue' ? t('app.overdue') + ' ' + a.days + ' ' + t('app.days') : t('app.today')); href = '#/activities?focus=' + a.id; }
      else if (a.entity === 'proposal') { title = t('app.proposal') + ' ' + a.id; sub = S.oppName(a.record.opportunity_id) + ' · ' + (a.level === 'overdue' ? t('pr.overdue') : t('pr.due_in', { n: a.days })); href = '#/proposals/' + a.id; }
      else { title = S.oppName(a.id); sub = a.kind === 'opp_no_next' ? t('app.no_next_action') : t('op.stage_history') + ' · ' + t('app.overdue'); href = '#/opportunities/' + a.id; }
      return { title: title, sub: sub, href: href, tone: a.kind.indexOf('overdue') >= 0 || a.level === 'overdue' || a.escalated ? 'danger' : 'warn', escalated: a.escalated };
    });
    var m = UI.modal({ title: t('app.alerts'), sub: rows.length + ' ' + (S.lang === 'en' ? 'items' : 'عنصر'), size: 'sm', footer: false, body: UI.list(rows, function (r) { return h('div', null, h('span', { class: 'avatar ' + r.tone }, '!'), h('div', { class: 'main' }, h('div', { class: 't' }, r.title, r.escalated ? UI.chip('danger', t('ac.escalated'), 'sm') : null), h('div', { class: 's' }, r.sub))); }, function (r) { m.close(true); location.hash = r.href; }) });
  }

  /* ---------- البحث العام ---------- */
  function buildGlobalSearch() {
    var wrap = h('div', { class: 'gsearch', role: 'search' });
    var inp = h('input', { type: 'search', placeholder: t('app.search_placeholder'), 'aria-label': t('app.search'), autocomplete: 'off' });
    var res = h('div', { class: 'results', hidden: true, role: 'listbox' });
    wrap.appendChild(UI.icon('search')); wrap.appendChild(inp); wrap.appendChild(res);
    var items = [], selIdx = -1;
    function run() {
      var q = inp.value.trim(); D.clear(res); items = []; selIdx = -1;
      if (q.length < 2 || !S.db) { res.hidden = true; return; }
      var groups = [];
      var cs = SEARCH.filter(S.live('customers'), q, ['name_ar', 'name_en', 'cr_number', 'unified_number', 'vat_number', 'id', 'email'], 6).map(function (c) { return { g: t('nav.customers'), t: MODEL.displayName('customer', c, S.lang), s: c.id + ' · ' + S.label('customer_types', c.customer_type) + (c.cr_number ? ' · ' + c.cr_number : ''), href: '#/customers/' + c.id }; });
      var ks = SEARCH.filter(S.live('contacts'), q, ['full_name', 'email', 'phone', 'position'], 5).map(function (k) { return { g: t('cu.tab_contacts'), t: k.full_name, s: S.customerName(k.customer_id) + (k.position ? ' · ' + k.position : ''), href: '#/customers/' + k.customer_id + '?tab=contacts' }; });
      var os = SEARCH.filter(S.live('opportunities'), q, ['name', 'project_name', 'tender_ref', 'id'], 6).map(function (o) { return { g: t('nav.opportunities'), t: MODEL.displayName('opportunity', o, S.lang), s: o.id + ' · ' + S.customerName(o.customer_id) + ' · ' + S.stageLabel(o.stage), href: '#/opportunities/' + o.id }; });
      var ps = SEARCH.filter(S.live('proposals'), q, ['id'], 4).map(function (p) { return { g: t('nav.proposals'), t: MODEL.proposalNumber(p), s: S.oppName(p.opportunity_id), href: '#/proposals/' + p.id }; });
      var cts = SEARCH.filter(S.live('contracts'), q, ['id', 'contract_ref'], 4).map(function (c) { return { g: t('nav.contracts'), t: c.id + (c.contract_ref ? ' · ' + c.contract_ref : ''), s: S.customerName(c.customer_id), href: '#/contracts/' + c.id }; });
      groups = cs.concat(ks, os, ps, cts);
      if (!groups.length) { res.appendChild(h('div', { class: 'grp' }, t('app.no_results'))); res.hidden = false; return; }
      var lastG = null;
      groups.forEach(function (it) {
        if (it.g !== lastG) { res.appendChild(h('div', { class: 'grp' }, it.g)); lastG = it.g; }
        var el = h('div', { class: 'it', role: 'option', on: { mousedown: function (e) { e.preventDefault(); go(it); } } }, h('div', { class: 't' }, h('div', null, it.t), h('div', { class: 's' }, it.s)), UI.icon('chev'));
        items.push({ it: it, el: el }); res.appendChild(el);
      });
      res.hidden = false;
    }
    function go(it) { res.hidden = true; inp.value = ''; location.hash = it.href; }
    inp.addEventListener('input', U.debounce(run, 160));
    inp.addEventListener('focus', function () { if (inp.value.trim().length >= 2) run(); });
    inp.addEventListener('blur', function () { setTimeout(function () { res.hidden = true; }, 150); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = Math.min(items.length - 1, selIdx + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = Math.max(0, selIdx - 1); } else if (e.key === 'Enter') { if (selIdx >= 0 && items[selIdx]) go(items[selIdx].it); return; } else if (e.key === 'Escape') { res.hidden = true; inp.blur(); return; } else return;
      items.forEach(function (x, i) { x.el.classList.toggle('sel', i === selIdx); if (i === selIdx) x.el.scrollIntoView({ block: 'nearest' }); });
    });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inp.focus(); } });
    return wrap;
  }

  /* ---------- التوجيه ---------- */
  function parseHash() {
    var hsh = location.hash.replace(/^#\/?/, '');
    var qIdx = hsh.indexOf('?'), query = {};
    if (qIdx >= 0) { hsh.slice(qIdx + 1).split('&').forEach(function (p) { var kv = p.split('='); query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); hsh = hsh.slice(0, qIdx); }
    var parts = hsh.split('/').filter(Boolean);
    return { view: parts[0] || 'overview', id: parts[1] ? decodeURIComponent(parts[1]) : null, sub: parts[2] || null, query: query };
  }
  function route() {
    if (!S.user) return;
    if (APP.unsavedGuard && !APP.unsavedGuard()) return;
    APP.unsavedGuard = null;
    UI.closeAllModals();
    var r = parseHash();
    var main = D.qs('#main'); if (!main) return;
    D.qsa('.pill', APP.nav).forEach(function (p) { if (p.dataset.nav === r.view) p.setAttribute('aria-current', 'page'); else p.removeAttribute('aria-current'); });
    D.clear(main);
    var v = VIEWS[r.view];
    if (!v) { main.appendChild(UI.empty(t('app.no_results'), '#/' + r.view)); return; }
    if (!PERMS.canViewModule(S.user, r.view)) { main.appendChild(UI.denied()); return; }
    try { v.render(main, r); } catch (e) { console.error(e); main.appendChild(UI.errorBox(t('app.error_detail') + ' — ' + (e.message || ''), route)); }
    window.scrollTo(0, 0);
    APP.current = r;
  }
  APP.route = route;
  APP.navigate = function (hash) { location.hash = hash; };
  APP.refresh = function () { return S.refresh().then(function () { updateBadges(); }); };
  APP.rerender = function () { return APP.refresh().then(route); };
  APP.parseHash = parseHash;

  APP.afterLogin = function (usr) {
    S.user = usr;
    if (S.adapter && S.adapter.demo !== undefined) S.demo = !!S.adapter.demo;
    return S.refresh().then(function () { buildShell(D.qs('#app')); if (!location.hash || location.hash === '#/' || location.hash === '#') location.hash = '#/overview'; route(); });
  };

  /* ---------- الإقلاع ---------- */
  function boot() {
    var rootEl = D.qs('#app');
    var lang = 'ar'; try { lang = localStorage.getItem('crm-lang') || CFG.locale.default_lang; } catch (e) { lang = CFG.locale.default_lang; }
    S.setLang(lang);
    try { S.setDark(localStorage.getItem('crm-dark') === '1'); } catch (e) { }
    applyTheme();
    if (!S.adapter) {
      var adapter;
      try { adapter = root.ADAPTER.create(CFG); } catch (e) { D.clear(rootEl); rootEl.appendChild(h('div', { style: { padding: '40px' } }, UI.errorBox('Adapter configuration error: ' + e.message))); return; }
      S.init(adapter);
      if (adapter.onChange) adapter.onChange(function () { /* تغيّر محلي */ });
    }
    D.clear(rootEl); rootEl.appendChild(UI.loading());
    S.adapter.init().then(function (r) {
      S.demo = !!r.demo; S.mode = S.adapter.mode;
      if (r.user) { return APP.afterLogin(r.user); }
      renderLogin(rootEl);
    }).catch(function (e) { D.clear(rootEl); rootEl.appendChild(h('div', { style: { padding: '40px', maxWidth: '600px', margin: '0 auto' } }, UI.errorBox(t('app.offline_source') + ' — ' + (e.message || e.code || ''), boot))); });
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function (e) { if (APP.unsavedGuard && !APP.unsavedGuardSilent) { /* المتصفح يطلب تأكيدًا */ } });
  document.addEventListener('DOMContentLoaded', boot);
  root.APP = APP;
})(typeof window !== 'undefined' ? window : globalThis);
