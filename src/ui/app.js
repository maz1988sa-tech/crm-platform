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
    document.title = (S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar) + ' — ' + (S.lang === 'en' ? CFG.platform.tagline_en : CFG.platform.tagline_ar);
  }

  /* ---------- شاشة الدخول ----------
     صفحة هبوط بواجهة واحدة: العلامة يمينًا، واللغة وزر الدخول يسارًا،
     والرسالة والمعاينة في الوسط. نموذج الدخول يُفتح في نافذة عند الطلب
     فلا يشغل نصف الشاشة قبل أن يحتاجه أحد. */
  function loginModal(rootEl, initialErr, pick) {
    var demoMode = S.mode === 'local';
    /* في الوضع التجريبي تُعرض بطاقات المستخدمين بدل كلمة المرور. تُقصر
       على مستخدمي المنصة المختارة: من ضغط «استقطاب المواهب» لا يُعرض
       عليه موظفو إدارة العملاء. في الإنتاج لا قائمة أصلًا — بريد وكلمة مرور. */
    var wantApp = pick && pick.app ? pick.app : null;
    var m = UI.modal({ title: demoMode ? t('login.demo_title') : t('login.title'), size: 'sm' });
    var msg = h('div', { class: 'login-msg' });
    m.body.appendChild(msg);
    function fail(e) {
      D.clear(msg);
      msg.appendChild(UI.errorBox(e && e.code === 'no_profile' ? t('login.no_profile')
        : (e && e.code === 'inactive' ? t('login.inactive') : t('login.failed'))));
    }
    if (initialErr) msg.appendChild(UI.errorBox(initialErr));

    if (demoMode) {
      m.body.appendChild(h('p', { class: 'muted small' }, t('login.demo_hint')));
      var grid = h('div', { class: 'demo-users' });
      S.adapter.users().then(function (users) {
        users.filter(function (u) { return u.active !== false; })
          .filter(function (u) { return !wantApp || PERMS.appOf(u.role) === wantApp; })
          .forEach(function (u) {
          var nm = S.lang === 'en' ? (u.name_en || u.name_ar) : (u.name_ar || u.name_en);
          grid.appendChild(h('button', { type: 'button', on: { click: function () {
            S.adapter.signInAs(u.id).then(function (usr) { m.close(true); APP.afterLogin(usr); }).catch(fail);
          } } }, h('span', { class: 'avatar' }, U.initials(nm)),
            h('span', null, h('div', { class: 'nm' }, nm), h('div', { class: 'rl' }, PERMS.roleLabel(u.role, S.lang)))));
        });
      });
      m.body.appendChild(grid);
    } else {
      var form = UI.form({ cols: 1, fields: [
        { key: 'email', label: t('login.email'), type: 'email', required: true },
        { key: 'password', label: t('login.password'), type: 'password', required: true }] });
      form.fields.password.ctl.type = 'password';
      var btn = h('button', { class: 'btn primary block', type: 'button' }, t('login.submit'));
      btn.addEventListener('click', function () {
        var e = form.validate(); if (Object.keys(e).length) { form.setErrors(e); return; }
        btn.disabled = true; D.clear(msg);
        var v = form.values();
        S.adapter.signIn(v.email, v.password)
          .then(function (usr) { m.close(true); APP.afterLogin(usr); })
          .catch(function (er) { btn.disabled = false; fail(er); });
      });
      form.el.addEventListener('keydown', function (e) { if (e.key === 'Enter') btn.click(); });
      m.body.appendChild(form.el); m.body.appendChild(btn);
      setTimeout(function () { if (form.fields.email.ctl.focus) form.fields.email.ctl.focus(); }, 30);
    }
    return m;
  }

  /* ---------- اختيار المنصة ----------
     «إحراز» مظلّة على منصّتين: إدارة العملاء والفرص تعمل من داخل هذه المنصة
     ودخولها هنا، واستقطاب المواهب منصّة مستقلّة لها خادمها ودخولها الخاص —
     نربطها برابط واحد يعيش في الإعداد (products.talent_url) ولا نمسّ
     مشروعها. الرابط الفارغ يعطي تنبيهًا واضحًا لا رابطًا ميّتًا. */
  /* رابط منصة المواهب حسب الوجهة: 'manager' لواجهة اعتماد المرشّحين،
     وما عداها واجهة الموظفين. مصدر الرابطين الإعداد لا الكود. */
  function talentUrl(dest) {
    var pr = CFG.products || {};
    if (dest === 'manager') return pr.talent_manager_url || pr.talent_url || '';
    return pr.talent_url || '';
  }

  function pickTile(node, icon, name, note) {
    node.classList.add('lp-pick');
    node.appendChild(UI.icon(icon));
    node.appendChild(h('span', { class: 'nm' }, name));
    node.appendChild(h('span', { class: 'nt' }, note));
    return node;
  }

  /* المنصة التي اختارها الزائر قبل الدخول — تلميح فقط لا صلاحية.
     الدور في الحساب هو الحقيقة، وهو وحده من يقرّر إلى أين يذهب. */
  var pendingPick = null;

  /* نافذة الاختيار على خطوتين:
       ١) أي منصة — إدارة العملاء أم استقطاب المواهب.
       ٢) داخل المواهب: أي واجهة — المدير أم الموظفين.
     ثم تسجيل الدخول. الاختيار كلّه تلميح لا صلاحية: الدور في الحساب هو
     الحقيقة، فلا يصل أحد إلى واجهة لا تخصّه بضغط المربّع الخطأ. */
  function chooseModal(rootEl, onPick) {
    var m = UI.modal({ title: t('lp.choose_title'), size: 'sm', footer: false });

    function tile(icon, name, note, go) {
      var b = pickTile(h('button', { type: 'button' }), icon, name, note);
      b.addEventListener('click', go);
      return b;
    }
    function focusFirst() { var f = m.body.querySelector('.lp-pick'); setTimeout(function () { if (f && f.focus) f.focus(); }, 30); }

    function root() {
      D.clear(m.body);
      m.body.appendChild(h('p', { class: 'muted small' }, t('lp.choose_sub')));
      m.body.appendChild(h('div', { class: 'lp-picks' },
        tile('cap_customers', t('lp.prod_crm_name'), t('lp.choose_crm_note'),
          function () { m.close(true); onPick({ app: 'crm' }); }),
        tile('cap_talent', t('lp.prod_ta_name'), t('lp.choose_ta_note'), talent)));
      focusFirst();
    }

    function talent() {
      D.clear(m.body);
      m.body.appendChild(h('p', { class: 'muted small' }, t('lp.ta_pick_sub')));
      m.body.appendChild(h('div', { class: 'lp-picks' },
        tile('check', t('lp.ta_manager'), t('lp.ta_manager_note'),
          function () { m.close(true); onPick({ app: 'talent', dest: 'manager' }); }),
        tile('user', t('lp.ta_staff'), t('lp.ta_staff_note'),
          function () { m.close(true); onPick({ app: 'talent', dest: 'staff' }); })));
      m.body.appendChild(h('button', { class: 'pick-back', type: 'button', on: { click: root } }, t('lp.back')));
      focusFirst();
    }

    root();
    return m;
  }

  /* معاينة مصغّرة للمنصتين — عناصر الواجهة نفسها لا صورة خارجية */
  function heroPreview(kind) {
    function tile(label, val) { return h('div', { class: 'lp-tile' }, h('span', null, label), h('b', null, val)); }
    function row(w1, w2, on) { return h('div', { class: 'lp-row' + (on ? ' on' : '') }, h('i', { style: { width: w1 + '%' } }), h('i', { style: { width: w2 + '%' } })); }
    var rail = h('div', { class: 'lp-rail' });
    for (var i = 0; i < 12; i++) rail.appendChild(h('u', { class: i < 4 ? 'done' : (i === 4 ? 'cur' : '') }));
    var tiles = kind === 'ta'
      ? [tile(t('lp.tp_vacancies'), '١٢'), tile(t('lp.tp_candidates'), '٢٤٨'), tile(t('lp.tp_interviews'), '٩')]
      : [tile(t('ov.pipeline_value'), '٤١٢ م'), tile(t('ov.win_rate'), '٣٨٪'), tile(t('ov.active_opps'), '٧٠')];
    return h('div', { class: 'lp lp-' + (kind || 'crm'), 'aria-hidden': 'true' },
      h('div', { class: 'lp-bar' }, h('i'), h('i'), h('i')),
      h('div', { class: 'lp-body' },
        h('div', { class: 'lp-tiles' }, tiles),
        rail,
        h('div', { class: 'lp-list' }, row(52, 22, true), row(38, 30), row(64, 18), row(30, 26), row(46, 34))));
  }

  /* ---------- شاشة التحويل بعد الدخول ----------
     المستخدم بدور من أدوار منصة المواهب ليس له عمل داخل إدارة العملاء،
     فلا نبني له واجهتها. يرى بطاقة باسمه ودوره ووصلة إلى منصته.
     لا تحويل تلقائي: الموظف ينقر بنفسه — نقرة مباشرة لا يوقفها مانع
     النوافذ، وتُبقي له طريق العودة وتسجيل الخروج ظاهرًا. */
  function renderLaunch(rootEl, usr) {
    D.clear(rootEl);
    var dest = PERMS.destOf(usr.role);
    var url = talentUrl(dest);
    var nm = S.lang === 'en' ? (usr.name_en || usr.name_ar) : (usr.name_ar || usr.name_en);

    var action = url
      ? h('a', { class: 'btn primary lg', href: url, target: '_blank', rel: 'noopener noreferrer' }, t('launch.open'))
      : h('button', { class: 'btn lg', type: 'button', disabled: 'disabled' }, t('launch.no_url'));

    var card = h('div', { class: 'launch-card' },
      UI.icon('cap_talent'),
      h('h1', null, t('launch.title')),
      h('p', { class: 'who' }, nm, h('span', { class: 'role' }, PERMS.roleLabel(usr.role, S.lang))),
      h('p', { class: 'muted small' }, t(dest === 'manager' ? 'launch.as_manager' : 'launch.as_staff')),
      action,
      url ? h('p', { class: 'muted xs' }, t('launch.second_signin')) : h('p', { class: 'muted xs' }, t('launch.no_url_hint')),
      h('button', { class: 'linkbtn', type: 'button', on: { click: function () {
        S.adapter.signOut().then(function () { S.user = null; renderLogin(rootEl); });
      } } }, t('app.signout')));

    rootEl.appendChild(h('div', { class: 'lh launch' },
      h('div', { class: 'lh-top' },
        h('div', { class: 'lh-brand' },
          h('div', { class: 'lockup' }, UI.brandMark(46, 'on-dark'),
            h('span', { class: 'name' }, S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar)),
          h('span', { class: 'slogan' }, S.lang === 'en' ? CFG.platform.tagline_en : CFG.platform.tagline_ar))),
      h('div', { class: 'launch-main' }, card)));
  }

  function renderLogin(rootEl, err) {
    D.clear(rootEl);
    var demoMode = S.mode === 'local';
    var opened = null;
    function busy() { return opened && !opened.closed; }
    function openLogin(pick, e0) { if (busy()) return; pendingPick = pick || null; opened = loginModal(rootEl, e0, pick); }
    /* زر الدخول العام يسأل أولًا عن المنصة ثم يطلب الدخول؛ وبطاقة كل
       منتج تطلب الدخول مباشرة وقد عرفنا منصتها من البطاقة نفسها. */
    function openChoose() { if (busy()) return; opened = chooseModal(rootEl, function (pick) { openLogin(pick); }); }
    function jump(id) { return function (e) { e.preventDefault(); var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; }

    var top = h('div', { class: 'lh-top' },
      /* قفل العلامة: صفٌّ للشعار والاسم، والشعار النصّي تحتهما يشترك معهما
         في الحافة نفسها — فالكتلة كلها مربّع واحد لا يخرج عنه شيء. */
      h('div', { class: 'lh-brand' },
        h('div', { class: 'lockup' }, UI.brandMark(46, 'on-dark'),
          h('span', { class: 'name' }, S.lang === 'en' ? CFG.platform.name_en : CFG.platform.name_ar)),
        h('span', { class: 'slogan' }, S.lang === 'en' ? CFG.platform.tagline_en : CFG.platform.tagline_ar)),
      h('nav', { class: 'lh-nav', 'aria-label': t('lp.nav_products') },
        h('a', { href: '#lp-products', on: { click: jump('lp-products') } }, t('lp.nav_products')),
        h('a', { href: '#lp-contact', on: { click: jump('lp-contact') } }, t('lp.nav_contact'))),
      h('div', { class: 'lh-act' },
        h('button', { class: 'lh-lang', type: 'button', on: { click: function () { S.setLang(S.lang === 'ar' ? 'en' : 'ar'); renderLogin(rootEl); } } }, t('app.lang_toggle')),
        h('button', { class: 'lh-signin', type: 'button', on: { click: function () { openChoose(); } } }, t('login.title'))));

    var copy = h('div', { class: 'lh-copy' },
      h('h1', null, h('span', { class: 'l1' }, t('lp.h1_lead')), h('span', { class: 'l2' }, t('lp.h1_main'))),
      h('p', null, t('lp.lede')),
      h('ul', { class: 'lh-points' }, [['lp.cap1', 'cap_opps'], ['lp.cap2', 'cap_customers'], ['lp.cap3', 'cap_talent']]
        .map(function (x) { return h('li', null, UI.icon(x[1]), h('span', null, t(x[0]))); })));

    var hero = h('div', { class: 'lh login' }, top,
      h('div', { class: 'lh-main' }, copy,
        h('div', { class: 'lh-shot' },
          h('div', { class: 'lh-stack' },
            h('div', { class: 'lh-card back' }, heroPreview('ta')),
            h('div', { class: 'lh-card front' }, heroPreview('crm'))))));

    /* ---- المنتجات ---- */
    function prodCard(name, desc, feats, action) {
      return h('article', { class: 'lp-card' },
        h('h3', null, name), h('p', null, desc),
        h('ul', null, feats.map(function (f) { return h('li', null, t(f)); })),
        action);
    }
    var products = h('section', { class: 'lp-sec', id: 'lp-products' },
      h('div', { class: 'lp-head' }, h('h2', null, t('lp.products_title'))),
      h('div', { class: 'lp-cards' },
        prodCard(t('lp.prod_crm_name'), t('lp.prod_crm_desc'), ['lp.prod_crm_f1', 'lp.prod_crm_f2', 'lp.prod_crm_f3'],
          h('button', { class: 'lp-go', type: 'button', on: { click: function () { openLogin({ app: 'crm' }); } } }, t('lp.prod_enter'))),
        prodCard(t('lp.prod_ta_name'), t('lp.prod_ta_desc'), ['lp.prod_ta_f1', 'lp.prod_ta_f2', 'lp.prod_ta_f3'],
          h('button', { class: 'lp-go', type: 'button', on: { click: function () { openLogin({ app: 'talent' }); } } }, t('lp.prod_enter')))));

    /* ---- تواصل معنا ---- */
    function contactRow(label, val) {
      return h('div', { class: 'lp-crow' }, h('span', null, label),
        h('b', { class: val ? '' : 'pending' }, val || t('lp.contact_pending')));
    }
    var contact = h('section', { class: 'lp-sec alt', id: 'lp-contact' },
      h('div', { class: 'lp-head' }, h('h2', null, t('lp.contact_title')), h('p', null, t('lp.contact_sub'))),
      h('div', { class: 'lp-contact' },
        contactRow(t('lp.contact_email'), null),
        contactRow(t('lp.contact_phone'), null),
        contactRow(t('lp.contact_place'), null)));

    var foot = h('footer', { class: 'lp-foot' },
      h('span', null, (S.lang === 'en' ? CFG.platform.company_en : CFG.platform.company_ar)),
      h('span', null, 'v' + CFG.platform.version));

    rootEl.appendChild(h('div', { class: 'lpage' }, hero, products, contact, foot));

    /* العنوان سطران مستقلّان: يُصغَّر كلاهما معًا حتى يتّسع أعرضهما،
       فلا يفيض ولا ينكسر أيٌّ منهما إلى سطر ثالث. */
    var head = copy.querySelector('h1');
    function fitHead() {
      if (!head.isConnected) return;
      head.style.fontSize = '';
      var size = parseFloat(getComputedStyle(head).fontSize), guard = 0;
      /* أعرض السطرين هو ما يحكم المقاس */
      function widest() {
        var w = 0;
        [].forEach.call(head.children, function (el) {
          var r = document.createRange(); r.selectNodeContents(el);
          w = Math.max(w, r.getBoundingClientRect().width);
        });
        return w;
      }
      while (widest() > head.clientWidth && size > 18 && guard++ < 80) { size -= 1; head.style.fontSize = size + 'px'; }
    }
    fitHead();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHead);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitHead, 120); });

    if (err) openLogin(null, err);   /* خطأ سابق: نفتح الدخول بلا منصة مختارة */
  }

  /* ---------- الهيكل ---------- */
  function buildShell(rootEl) {
    D.clear(rootEl);
    var app = h('div', { class: 'app' });
    app.appendChild(h('a', { class: 'skip-link', href: '#main' }, t('app.nav_skip')));
    /* الشريط العلوي */
    var mark = UI.brandMark(24, 'on-dark');
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
  /* إعادة رسم صفحة الهبوط — يستعملها الخروج وتبديل اللغة والاختبارات */
  APP.renderLogin = function (el, err) { return renderLogin(el || D.qs('#app'), err); };

  APP.afterLogin = function (usr) {
    S.user = usr;
    if (S.adapter && S.adapter.demo !== undefined) S.demo = !!S.adapter.demo;
    /* أدوار منصة المواهب لا تملك صلاحية واحدة في إدارة العملاء، فبناء
       واجهتها لهم عبث وتسريب لهيكل لا يخصّهم — يُحوَّلون إلى منصتهم. */
    var picked = pendingPick; pendingPick = null;
    var mine = PERMS.appOf(usr.role);
    /* اختار منصة أو واجهة غير التي يخوّلها حسابه: نأخذه إلى ما يخصّه
       ونقول له لماذا، بدل أن نتركه يظن أن الدخول فشل أو الرابط خطأ. */
    if (picked && picked.app && picked.app !== mine) {
      UI.toast(t(mine === 'talent' ? 'login.sent_to_talent' : 'login.sent_to_crm'), '', 4500);
    } else if (picked && mine === 'talent' && picked.dest && picked.dest !== PERMS.destOf(usr.role)) {
      UI.toast(t(PERMS.destOf(usr.role) === 'manager' ? 'login.sent_to_manager' : 'login.sent_to_staff'), '', 4500);
    }
    if (mine === 'talent') { renderLaunch(D.qs('#app'), usr); return Promise.resolve(); }
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
