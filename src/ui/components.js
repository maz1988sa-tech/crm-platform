/* =====================================================================
   UI — المكوّنات المشتركة (المعايير المعتمدة: بطاقات، نوافذ، جداول، نماذج، شارات…)
   ---------------------------------------------------------------------
   قاعدة: أي نافذة جديدة تُبنى بـ UI.modal، أي جدول بـ UI.table، أي نموذج بـ UI.form.
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.DOM, h = D.h, U = root.U, L = root.LOOKUPS, STAGES = root.STAGES, S = root.STORE, t = root.t, MODEL = root.MODEL, ENGINE = root.ENGINE;

  var UI = {};

  /* ---------- أيقونات SVG بسيطة ---------- */
  var ICONS = {
    /* أيقونات الممكّنات — بلغة شعار «إحراز» نفسها: شبكة ١٢×١٢، سماكة ٢،
       طرف مستقيم ووصل مستدير، مسار رئيسي بلون النصّ ومسار أزرق منفصل
       (الفجوة بينهما هي «القفزة» في الشعار). */
    cap_opps: '<svg viewBox="0 0 12 12" width="24" height="24" fill="none" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="round"><path d="M1.1 9.3 5 5.4H8.7" stroke="currentColor"/><path d="M10 4.1 11.4 2.7" stroke="#4C86F2"/></svg>',
    cap_customers: '<svg viewBox="0 0 12 12" width="24" height="24" fill="none" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="round"><path d="M1.2 4H6.2V10.3" stroke="currentColor"/><path d="M10.8 8H5.8V1.7" stroke="#4C86F2"/></svg>',
    cap_talent: '<svg viewBox="0 0 12 12" width="24" height="24" fill="none" stroke-width="1.6" stroke-linecap="butt" stroke-linejoin="round"><path d="M1.6 5.1V10.5H10.4V5.1" stroke="currentColor"/><path d="M6 1.1V4.7" stroke="#4C86F2"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    full: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    caret: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    info: 'i',
    lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    print: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 1.5 21h21L12 3z"/><path d="M12 10v5M12 18.5v.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    logout: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5M15 12H3M21 3v18"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>'
  };
  /* ---------- علامة المنصة (إحراز) ----------
     شبكة 12×12 · سماكة الشريط 2 · فجوة داخلية 1.5 · نصف قطر خارجي 1
     الشريط الأزرق = الفرصة (المُدخل)، والجزء الداكن = المسار والمخرج (يرث لون النص). */
  var BRAND_MARK = '<svg viewBox="0 0 12 12" width="SZ" height="SZ" fill="none" focusable="false" aria-hidden="true">'
    + '<g stroke-width="2" stroke-linecap="butt" stroke-linejoin="round" transform="translate(-0.65 0.34)">'
    + '<path d="M11 0.9 6.8 5.1" stroke="#2563EB"/>'
    + '<path d="M5.74 6.16 2.6 9.3H9.9l1.1 1.1" stroke="currentColor"/>'
    + '</g></svg>';
  UI.brandMark = function (size, cls) {
    var el = h('span', { class: 'mark' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' });
    el.innerHTML = BRAND_MARK.replace(/SZ/g, String(size || 22));
    return el;
  };

  UI.icon = function (name) { var s = h('span', { class: 'ic', 'aria-hidden': 'true' }); s.innerHTML = ICONS[name] || ''; return s; };
  UI.ICONS = ICONS;

  /* ---------- شارات ---------- */
  UI.chip = function (tone, text, extra) { return h('span', { class: 'chip ' + (tone || 'slate') + (extra ? ' ' + extra : '') }, text); };
  UI.lookupChip = function (list, key, extra) { var it = L.find(list, key); if (!it) return h('span', { class: 'muted' }, key || '—'); return UI.chip(it.color || 'slate', S.lang === 'en' ? it.en : it.ar, extra); };
  UI.stageChip = function (key, extra) { var s = STAGES.get(key); if (!s) return h('span', { class: 'muted' }, key || '—'); return UI.chip(s.color || 'slate', STAGES.label(key, S.lang), extra); };
  UI.outcomeChip = function (opp) { return UI.lookupChip('outcomes', MODEL.outcome(opp), 'sm'); };
  UI.dueChip = function (due) {  // due = ENGINE.activityDue()
    if (!due || due.key === 'none') return null;
    var map = { overdue: ['danger', S.lang === 'en' ? 'Overdue ' + due.days + 'd' : 'متأخر ' + due.days + ' ي'], today: ['warn', t('app.today')], soon: ['info', S.lang === 'en' ? 'in ' + due.days + 'd' : 'بعد ' + due.days + ' ي'], upcoming: ['slate', S.lang === 'en' ? 'in ' + due.days + 'd' : 'بعد ' + due.days + ' ي'], done: ['ok', S.lang === 'en' ? 'Done' : 'منجز'] };
    var m = map[due.key]; return m ? UI.chip(m[0], m[1], 'sm') : null;
  };
  UI.flagChips = function (flags, labeler, max) {
    var wrap = h('span', { class: 'chips' });
    (flags || []).slice(0, max || 3).forEach(function (f) { var tone = ['stuck', 'next_action_overdue', 'proposal_expired', 'deadline_passed', 'overdue_follow_up', 'no_owner'].indexOf(f.key) >= 0 ? 'danger' : 'warn'; wrap.appendChild(UI.chip(tone, (labeler || ENGINE.flagLabel)(f.key, S.lang) + (f.days ? ' · ' + f.days + (S.lang === 'en' ? 'd' : ' ي') : ''), 'sm')); });
    if (flags && flags.length > (max || 3)) wrap.appendChild(h('span', { class: 'tag' }, '+' + (flags.length - (max || 3))));
    return wrap;
  };
  UI.originChip = function (rec) { if (!rec) return null; var o = rec.origin || 'platform'; if (o === 'platform') return null; return UI.chip(o === 'demo' ? 'warn' : 'info', S.label('record_origins', o), 'sm nodot'); };
  UI.avatar = function (userId, cls) { var u = S.get('user', userId); var a = h('span', { class: 'avatar ' + (cls || ''), title: S.userName(userId) }, u ? S.userInitials(userId) : '?'); return a; };
  UI.miniAvatar = function (userId) { return h('span', { class: 'mini-av', title: S.userName(userId) }, S.get('user', userId) ? S.userInitials(userId) : '?'); };
  UI.userCell = function (userId) { if (!userId) return h('span', { class: 'muted' }, '—'); return h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, UI.miniAvatar(userId), S.userName(userId)); };
  UI.money = function (n, short) { if (n === null || n === undefined || n === '') return h('span', { class: 'muted' }, '—'); return h('span', { class: 'money' }, short ? S.moneyShort(n) : S.money(n)); };
  UI.dateCell = function (d, withHijri) { if (!d) return h('span', { class: 'muted' }, '—'); var el = h('span', { class: 'nowrap' }, S.date(d)); if (withHijri && root.APP_CONFIG.locale.show_hijri) el.appendChild(h('span', { class: 'sub' }, S.hijri(d))); return el; };
  UI.lockNote = function () { return h('span', { class: 'sensitive-lock', title: S.lang === 'en' ? 'Commercial values hidden for your role' : 'القيم التجارية غير متاحة لدورك' }, UI.icon('lock'), S.lang === 'en' ? 'Restricted' : 'محجوب'); };

  /* ---------- بطاقة مؤشر ---------- */
  UI.kpi = function (o) {
    var el = h(o.onClick ? 'button' : 'div', { class: 'kpi ' + (o.tone || '') + (o.onClick ? '' : ' static'), type: o.onClick ? 'button' : null, on: o.onClick ? { click: o.onClick } : null, 'aria-label': o.label + ' ' + o.value });
    var lbl = h('div', { class: 'l' }, o.label);
    if (o.info) { var ic = h('span', { class: 'info-ic', title: o.info, 'aria-label': t('app.calc_note') + ': ' + o.info, tabindex: '0' }, 'i'); lbl.appendChild(ic); }
    el.appendChild(lbl);
    var vstr = o.value === null || o.value === undefined ? '—' : String(o.value);
    el.appendChild(h('div', { class: 'v money' + (vstr.length > 11 ? ' long' : '') }, vstr));
    if (o.sub) el.appendChild(h('div', { class: 's' }, o.sub));
    return el;
  };
  UI.card = function (o) {
    var c = h('div', { class: 'card ' + (o.cls || '') });
    if (o.title || o.actions) {
      var hd = h('div', { class: 'card-h' }, h('h3', null, o.title || '', o.sub ? h('span', { class: 'sub' }, o.sub) : null));
      if (o.actions) hd.appendChild(h('div', { class: 'act' }, o.actions));
      c.appendChild(hd);
    }
    var b = h('div', { class: 'card-b' + (o.tight ? ' tight' : '') }, o.body);
    c.appendChild(b);
    if (o.footer) c.appendChild(h('div', { class: 'card-f' }, o.footer));
    c.body = b;
    return c;
  };
  UI.secHead = function (kicker, title, note) { return h('div', { class: 'sec-head' }, kicker ? h('span', { class: 'k' }, kicker) : null, h('h2', null, title), note ? h('span', { class: 'note' }, note) : null); };

  /* ---------- الحالات ---------- */
  UI.empty = function (title, hint, action) { return h('div', { class: 'empty' }, h('div', { class: 'ico' }, '◌'), h('h4', null, title || t('app.empty')), h('p', null, hint || t('app.empty_hint')), action ? h('div', { style: { marginTop: '12px' } }, action) : null); };
  UI.loading = function (msg) { return h('div', { class: 'loading', role: 'status' }, h('span', { class: 'spin' }), msg || t('app.loading')); };
  UI.errorBox = function (msg, retry) { return h('div', { class: 'errbox', role: 'alert' }, UI.icon('warn'), h('span', { style: { flex: 1 } }, msg || t('app.error_detail')), retry ? h('button', { class: 'btn sm', on: { click: retry } }, t('app.retry')) : null); };
  UI.denied = function () { return h('div', { class: 'denied' }, h('div', { class: 'lock' }, '🔒'), h('h3', null, t('app.permission_denied_view'))); };
  UI.warnBox = function (msg) { return h('div', { class: 'warnbox' }, UI.icon('warn'), h('span', null, msg)); };
  UI.infoBox = function (msg) { return h('div', { class: 'infobox' }, h('span', null, msg)); };

  /* ---------- Toast ---------- */
  UI.toast = function (msg, type, ms) {
    var host = D.qs('#toasts'); if (!host) { host = h('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(host); }
    var el = h('div', { class: 'toast ' + (type || '') }, h('span', { style: { flex: 1 } }, msg), h('button', { 'aria-label': t('app.close'), on: { click: function () { el.remove(); } } }, '×'));
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || (type === 'err' ? 7000 : 3800));
    return el;
  };
  UI.errorToast = function (e) {
    var msg = t('app.error_detail');
    if (e && e.code === 'forbidden') msg = t('app.permission_denied');
    else if (e && e.code === 'stale') msg = t('app.stale_write');
    /* أسماء الحقول لا مفاتيحها الخام — الرسالة تُقرأ من الموظف لا من المبرمج */
    else if (e && e.code === 'validation') msg = t('app.validation_failed') + (e.details && e.details.fields ? ': ' + e.details.fields.map(function (k) { return root.tf(k); }).join('، ') : '');
    else if (e && e.code === 'invalid_transition') msg = (S.lang === 'en' ? 'Action not allowed in the current state: ' : 'الإجراء غير متاح في الحالة الحالية: ') + (e.message || '');
    else if (e && e.code === 'network') msg = t('app.offline_source');
    else if (e && e.message && e.code) msg = msg + ' (' + e.code + ')';
    console.warn(e);
    return UI.toast(msg, 'err');
  };

  /* ---------- النافذة الموحدة ---------- */
  var modalStack = [];
  UI.modal = function (o) {
    o = o || {};
    var bg = h('div', { class: 'modal-bg', role: 'presentation' });
    var box = h('div', { class: 'modal ' + (o.size || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' });
    var head = h('div', { class: 'modal-head' }, h('div', { class: 'ttl' }, h('h2', null, o.title || ''), o.sub ? h('div', { class: 'sub' }, o.sub) : null));
    var body = h('div', { class: 'modal-body' });
    var foot = h('div', { class: 'modal-foot' });
    var api = { el: bg, box: box, body: body, foot: foot, closed: false };
    var dirty = false;
    api.setDirty = function (v) { dirty = !!v; };
    api.close = function (force) {
      if (api.closed) return true;
      if (!force && dirty && !window.confirm(t('app.unsaved'))) return false;
      api.closed = true;
      bg.remove(); modalStack = modalStack.filter(function (m) { return m !== api; });
      if (!modalStack.length) document.body.classList.remove('modal-open');
      if (untrap) untrap();
      if (o.onClose) o.onClose();
      if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { }
      return true;
    };
    var fsBtn = h('button', { class: 'iconbtn', type: 'button', title: t('app.fullscreen'), 'aria-label': t('app.fullscreen'), on: { click: function () { box.classList.toggle('full'); } } });
    fsBtn.appendChild(UI.icon('full'));
    var closeBtn = h('button', { class: 'iconbtn', type: 'button', title: t('app.close'), 'aria-label': t('app.close'), on: { click: function () { api.close(); } } });
    closeBtn.appendChild(UI.icon('close'));
    head.appendChild(h('div', { class: 'hb' }, fsBtn, closeBtn));
    box.appendChild(head); box.appendChild(body);
    if (o.footer !== false) box.appendChild(foot);
    bg.appendChild(box);
    /* محتوى */
    var content = typeof o.body === 'function' ? o.body(api) : o.body;
    if (content) D.append(body, content);
    (o.buttons || []).forEach(function (b) { foot.appendChild(b); });
    if (o.hint) foot.appendChild(h('span', { class: 'hint' }, o.hint));
    /* تفاعلات */
    bg.addEventListener('mousedown', function (e) { if (e.target === bg && o.closeOnBg !== false) { api.close(); } });
    head.addEventListener('dblclick', function (e) { if (e.target.closest('button')) return; box.classList.toggle('full'); });
    /* سحب بالعنوان */
    var drag = null;
    head.addEventListener('mousedown', function (e) { if (e.target.closest('button') || box.classList.contains('full')) return; var r = box.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, l: r.left, t: r.top }; box.style.position = 'fixed'; box.style.margin = '0'; box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; e.preventDefault(); });
    document.addEventListener('mousemove', function (e) { if (!drag) return; box.style.left = (drag.l + e.clientX - drag.x) + 'px'; box.style.top = (drag.t + e.clientY - drag.y) + 'px'; });
    document.addEventListener('mouseup', function () { drag = null; });
    function onKey(e) { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === api) { e.stopPropagation(); api.close(); } }
    bg.addEventListener('keydown', onKey);
    var prevFocus = document.activeElement;
    document.body.appendChild(bg);
    document.body.classList.add('modal-open');
    modalStack.push(api);
    var untrap = D.trapFocus(box);
    setTimeout(function () { var f = box.querySelector('input:not([type=hidden]),select,textarea,button.primary,button'); if (f) f.focus(); }, 30);
    return api;
  };
  UI.closeAllModals = function () { modalStack.slice().forEach(function (m) { m.close(true); }); };
  UI.confirm = function (o) {
    return new Promise(function (resolve) {
      var m = UI.modal({ title: o.title || t('app.confirm'), size: 'sm', body: h('p', null, o.message || ''), closeOnBg: false, onClose: function () { resolve(false); },
        buttons: [h('button', { class: 'btn ' + (o.danger ? 'danger' : 'primary'), on: { click: function () { resolve(true); m.close(true); } } }, o.ok || t('app.confirm')), h('button', { class: 'btn', on: { click: function () { resolve(false); m.close(true); } } }, t('app.cancel'))] });
    });
  };
  /* نافذة نموذج عامة: fields حسب UI.form؛ onSubmit(values, api) يعيد Promise؛ أخطاء التحقق تُعرض تحت الحقول */
  UI.formModal = function (o) {
    var form = UI.form({ fields: o.fields, values: o.values, cols: o.cols, autoExpandFilled: o.autoExpandFilled, onChange: o.onChange });
    var saveBtn = h('button', { class: 'btn primary', type: 'button' }, o.saveLabel || t('app.save'));
    var cancelBtn = h('button', { class: 'btn', type: 'button' }, t('app.cancel'));
    var m = UI.modal({ title: o.title, sub: o.sub, size: o.size || '', body: [o.intro || null, form.el, o.outro || null], buttons: [saveBtn, cancelBtn], hint: o.hint || t('app.keyboard_hint'), closeOnBg: false });
    form.el.addEventListener('input', function () { m.setDirty(true); });
    form.el.addEventListener('change', function () { m.setDirty(true); });
    cancelBtn.addEventListener('click', function () { m.close(); });
    form.el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); saveBtn.click(); } });
    saveBtn.addEventListener('click', function () {
      var errs = form.validate(); if (Object.keys(errs).length) { form.setErrors(errs); UI.toast(t('app.validation_failed'), 'warn'); return; }
      saveBtn.disabled = true;
      Promise.resolve(o.onSubmit(form.values(), m, form)).then(function (r) {
        if (r === false) { saveBtn.disabled = false; return; }
        m.setDirty(false); m.close(true); if (o.successMsg !== false) UI.toast(o.successMsg || t('app.saved'), 'ok');
      }).catch(function (e) {
        saveBtn.disabled = false;
        if (e && e.code === 'validation' && e.details && !e.details.fields) { var errs2 = {}; Object.keys(e.details).forEach(function (k) { errs2[k] = t(e.details[k]); }); form.setErrors(errs2); UI.toast(t('app.validation_failed'), 'warn'); return; }
        UI.errorToast(e);
      });
    });
    m.form = form;
    return m;
  };

  /* ---------- الجدول ---------- */
  UI.table = function (o) {
    var cols = o.columns.filter(function (c) { return !c.hidden; });
    var wrap = h('div', { class: 'tbl-wrap' + (o.responsive === false ? '' : ' responsive') });
    var table = h('table', { class: 'tbl' });
    var cg = h('colgroup');
    var totalW = U.sum(cols, function (c) { return c.width || 1; });
    cols.forEach(function (c) { cg.appendChild(h('col', { style: { width: ((c.width || 1) / totalW * 100).toFixed(2) + '%' } })); });
    table.appendChild(cg);
    var thead = h('thead'), tr = h('tr');
    cols.forEach(function (c) {
      var th = h('th', { class: (c.num ? 'num ' : '') + (c.center ? 'c ' : '') + (c.wrap ? 'wrap ' : '') + (c.align ? c.align + ' ' : '') + (c.sortable ? 'sortable' : ''), scope: 'col' }, c.label);
      if (c.sortable) {
        var dir = o.sort && o.sort.key === c.key ? o.sort.dir : null;
        if (dir) th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
        th.appendChild(h('span', { class: 'si' }, dir === 'asc' ? '▲' : (dir === 'desc' ? '▼' : '↕')));
        th.addEventListener('click', function () { if (o.onSort) o.onSort(c.key, dir === 'asc' ? 'desc' : 'asc'); });
      }
      tr.appendChild(th);
    });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = h('tbody');
    if (!o.rows || !o.rows.length) {
      tbody.appendChild(h('tr', null, h('td', { colspan: cols.length, class: 'tbl-empty wrap' }, o.empty || t('app.no_results'))));
    } else {
      o.rows.forEach(function (r, i) {
        var row = h('tr', { class: o.onRow ? 'click' : '', tabindex: o.onRow ? '0' : null, 'data-id': o.rowKey ? r[o.rowKey] : null });
        cols.forEach(function (c) {
          var v = c.get ? c.get(r, i) : r[c.key];
          var td = h('td', { class: (c.num ? 'num ' : '') + (c.center ? 'c ' : '') + (c.wrap ? 'wrap ' : '') + (c.align ? c.align + ' ' : '') + (c.hideSm ? 'hide-sm' : ''), 'data-label': c.label, title: (typeof v === 'string' && v.length > 18) ? v : null });
          D.append(td, v === null || v === undefined ? h('span', { class: 'muted' }, '—') : v);
          row.appendChild(td);
        });
        if (o.onRow) { row.addEventListener('click', function (e) { if (e.target.closest('button,a,input,select')) return; o.onRow(r, e); }); row.addEventListener('keydown', function (e) { if (e.key === 'Enter') o.onRow(r, e); }); }
        tbody.appendChild(row);
      });
    }
    table.appendChild(tbody);
    if (o.footer) { var tf = h('tfoot'), ftr = h('tr'); cols.forEach(function (c) { var v = o.footer[c.key]; ftr.appendChild(h('td', { class: (c.num ? 'num ' : '') + (c.center ? 'c ' : '') + (c.wrap ? 'wrap ' : '') + (c.align || ''), 'data-label': c.label }, v === undefined ? '' : v)); }); tf.appendChild(ftr); table.appendChild(tf); }
    wrap.appendChild(table);
    return wrap;
  };
  /* تصفح "عرض المزيد" */
  UI.pager = function (total, shown, onMore) { if (total <= shown) return h('div', { class: 'count-note', style: { padding: '8px 12px' } }, t('app.showing', { shown: total, total: total })); return h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px' } }, h('span', { class: 'count-note' }, t('app.showing', { shown: shown, total: total })), h('button', { class: 'btn sm', on: { click: onMore } }, t('app.load_more'))); };

  /* ---------- النموذج ---------- */
  function optionsFor(f) {
    var opts = [];
    if (f.options) opts = f.options.map(function (x) { return typeof x === 'string' ? { value: x, label: x } : x; });
    else if (f.lookup === 'stages') opts = STAGES.list.map(function (s) { return { value: s.key, label: (S.lang === 'en' ? s.en : s.ar) }; });
    else if (f.lookup === 'regions') opts = L.regions.map(function (r) { return { value: r.key, label: S.lang === 'en' ? r.en : r.ar }; });
    else if (f.lookup === 'cities') opts = L.allCities().filter(function (c) { return !f.region || c.region === f.region; }).map(function (c) { return { value: c.key, label: S.lang === 'en' ? c.en : c.ar }; });
    else if (f.lookup) opts = (L[f.lookup] || []).map(function (x) { return { value: x.key, label: S.lang === 'en' ? x.en : x.ar, disabled: x.enabled === false }; });
    else if (f.type === 'user') opts = S.live('users').filter(function (u) { return u.active !== false && (!f.roles || f.roles.indexOf(u.role) >= 0); }).map(function (u) { return { value: u.id, label: S.userName(u.id) + ' — ' + S.roleLabel(u.role) }; });
    else if (f.type === 'customer') opts = S.live('customers').filter(function (c) { return c.status !== 'archived'; }).map(function (c) { return { value: c.id, label: MODEL.displayName('customer', c, S.lang) + ' (' + c.id + ')' }; });
    else if (f.type === 'contact') opts = S.live('contacts').filter(function (c) { return !f.customer_id || c.customer_id === f.customer_id; }).map(function (c) { return { value: c.id, label: c.full_name + (c.position ? ' — ' + c.position : '') }; });
    else if (f.type === 'opportunity') opts = S.live('opportunities').filter(function (o) { return !f.customer_id || o.customer_id === f.customer_id; }).map(function (o) { return { value: o.id, label: MODEL.displayName('opportunity', o, S.lang) + ' (' + o.id + ')' }; });
    return opts;
  }
  UI.form = function (o) {
    var values = U.clone(o.values || {});
    var fieldsByKey = {};
    var el = h('div', { class: 'form ' + (o.cols === 1 ? 'c1' : (o.cols === 3 ? 'c3' : '')) });
    var api = { el: el, fields: fieldsByKey };
    /* مجموعات قابلة للطي: الحقول التالية للمجموعة تنتمي إليها حتى المجموعة/القسم التالي */
    var groups = {}, groupOrder = [], curGroup = null;
    function isFilled(v) {
      return !(v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length));
    }
    function refreshGroupCounts() {
      groupOrder.forEach(function (id) {
        var g = groups[id], n = 0;
        g.keys.forEach(function (k) { if (isFilled(values[k])) n++; });
        g.count.textContent = n ? String(n) : '';
        g.count.classList.toggle('on', n > 0);
      });
    }
    function setGroupOpen(id, open) {
      var g = groups[id]; if (!g) return;
      g.open = !!open;
      g.btn.classList.toggle('open', g.open);
      g.btn.setAttribute('aria-expanded', g.open ? 'true' : 'false');
      g.keys.forEach(function (k) { var f = fieldsByKey[k]; if (f) f.el.classList.toggle('gh', !g.open); });
    }
    function groupOfField(key) {
      for (var i = 0; i < groupOrder.length; i++) if (groups[groupOrder[i]].keys.indexOf(key) >= 0) return groupOrder[i];
      return null;
    }
    function setVal(k, v) { values[k] = v; refreshGroupCounts(); if (o.onChange) o.onChange(k, v, api); }
    function buildField(f) {
      if (f.type === 'section') { curGroup = null; return h('div', { class: 'form-sec' }, f.label); }
      if (f.type === 'group') {
        var gid = f.key || ('g' + groupOrder.length);
        var chev = h('span', { class: 'gchev', 'aria-hidden': 'true' });
        chev.innerHTML = ICONS.chev;
        var count = h('span', { class: 'gcount', 'aria-hidden': 'true' }, '');
        var btn = h('button', { type: 'button', class: 'form-group', 'data-group': gid, 'aria-expanded': 'false' },
          chev, h('span', { class: 'gl' }, f.label),
          f.hint ? h('span', { class: 'gh-hint' }, f.hint) : null, count);
        groups[gid] = { def: f, btn: btn, count: count, keys: [], open: false };
        groupOrder.push(gid);
        btn.addEventListener('click', function () { setGroupOpen(gid, !groups[gid].open); });
        curGroup = gid;
        return btn;
      }
      if (f.type === 'note') return h('div', { class: 'form-note' }, f.label);
      /* حقل «custom»: عقدة جاهزة (لا تسمية ولا قيمة) تُعرض داخل تسلسل الحقول،
         وتُظهر/تُخفى عبر api.showField — تُستعمل لمربّع لصق صفحة اعتماد. */
      if (f.type === 'custom') {
        var cw = h('div', { class: 'field custom span2' + (f.hidden ? ' fhide' : ''), 'data-key': f.key });
        if (f.node) cw.appendChild(f.node);
        fieldsByKey[f.key] = { def: f, el: cw, ctl: null };
        if (curGroup) { groups[curGroup].keys.push(f.key); cw.setAttribute('data-group', curGroup); cw.classList.add('gh'); }
        return cw;
      }
      var wrap = h('div', { class: 'field' + (f.span2 ? ' span2' : '') + (f.hidden ? ' hidden' : ''), 'data-key': f.key });
      var id = 'f_' + f.key + '_' + Math.random().toString(36).slice(2, 6);
      var lab = h('label', { for: id }, f.label, f.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null);
      if (f.sensitive && f.locked) lab.appendChild(UI.lockNote());
      wrap.appendChild(lab);
      var ctl, v = values[f.key];
      var common = { id: id, class: 'ctl', disabled: !!f.disabled || (f.sensitive && f.locked), 'aria-required': f.required ? 'true' : null, placeholder: f.placeholder || null, dir: f.dir || null };
      switch (f.type) {
        case 'textarea': ctl = h('textarea', Object.assign(common, { rows: f.rows || 3 }), v || ''); ctl.addEventListener('input', function () { setVal(f.key, ctl.value); }); break;
        case 'select': case 'user': case 'customer': case 'contact': case 'opportunity': case 'lookup': {
          ctl = h('select', common);
          if (!f.required || f.allowEmpty !== false) ctl.appendChild(h('option', { value: '' }, f.emptyLabel || t('app.select')));
          optionsFor(f).forEach(function (op) { ctl.appendChild(h('option', { value: op.value, disabled: !!op.disabled, selected: String(op.value) === String(v === null || v === undefined ? '' : v) }, op.label)); });
          if (v !== undefined && v !== null) ctl.value = String(v);
          ctl.addEventListener('change', function () { setVal(f.key, ctl.value === '' ? null : ctl.value); });
          break;
        }
        case 'multiselect': {
          var cur = Array.isArray(v) ? v.slice() : [];
          ctl = h('div', { class: 'multisel', role: 'group', 'aria-labelledby': id });
          optionsFor(f).forEach(function (op) {
            var on = cur.indexOf(op.value) >= 0;
            var cb = h('input', { type: 'checkbox', checked: on, value: op.value });
            var lb = h('label', { class: on ? 'on' : '' }, cb, op.label);
            cb.addEventListener('change', function () { if (cb.checked) { if (cur.indexOf(op.value) < 0) cur.push(op.value); } else cur = cur.filter(function (x) { return x !== op.value; }); lb.classList.toggle('on', cb.checked); setVal(f.key, cur.slice()); });
            ctl.appendChild(lb);
          });
          break;
        }
        case 'checkbox': { ctl = h('label', { class: 'check' }, h('input', { id: id, type: 'checkbox', checked: !!v, disabled: !!f.disabled, on: { change: function (e) { setVal(f.key, e.target.checked); } } }), f.checkLabel || ''); wrap.removeChild(lab); wrap.appendChild(h('label', null, f.label)); break; }
        case 'date': case 'datetime': {
          var dinp = h('input', Object.assign(common, { type: f.type === 'date' ? 'date' : 'datetime-local', value: v ? (f.type === 'date' ? U.isoDate(v) : U.isoDateTime(v)) : '', min: f.min || null, max: f.max || null }));
          var hj = h('div', { class: 'hijri' }, v ? S.hijri(v) : '');
          dinp.addEventListener('input', function () { setVal(f.key, dinp.value || null); hj.textContent = dinp.value ? S.hijri(dinp.value) : ''; });
          dinp.addEventListener('change', function () { setVal(f.key, dinp.value || null); hj.textContent = dinp.value ? S.hijri(dinp.value) : ''; });
          wrap.appendChild(dinp); if (root.APP_CONFIG.locale.show_hijri && f.type === 'date') wrap.appendChild(hj); ctl = null; break;
        }
        case 'number': case 'money': case 'pct': case 'int': {
          var ninp = h('input', Object.assign(common, { type: 'number', inputmode: 'decimal', value: v === null || v === undefined ? '' : v, min: f.min !== undefined ? f.min : (f.type === 'pct' ? 0 : null), max: f.type === 'pct' ? 100 : (f.max || null), step: f.type === 'int' ? 1 : (f.step || 'any'), dir: 'ltr' }));
          ninp.addEventListener('input', function () { setVal(f.key, ninp.value === '' ? null : Number(ninp.value)); });
          wrap.appendChild(ninp);
          if (f.type === 'money') { var mh = h('div', { class: 'hint money' }); var upd = function () { mh.textContent = ninp.value ? S.money(Number(ninp.value)) : ''; }; ninp.addEventListener('input', upd); upd(); wrap.appendChild(mh); }
          ctl = null; break;
        }
        case 'tags': ctl = h('input', Object.assign(common, { type: 'text', value: Array.isArray(v) ? v.join('، ') : (v || '') })); ctl.addEventListener('input', function () { setVal(f.key, U.splitTags(ctl.value)); }); if (!f.hint) f.hint = t('app.tags_hint'); break;
        case 'readonly': ctl = h('div', { class: 'ctl', style: { display: 'flex', alignItems: 'center', background: 'var(--paper)' } }, f.render ? f.render(v) : (v === null || v === undefined || v === '' ? '—' : v)); break;
        default: ctl = h('input', Object.assign(common, { type: f.type === 'email' ? 'email' : (f.type === 'tel' ? 'tel' : 'text'), value: v === null || v === undefined ? '' : v, maxlength: f.max || null, dir: (f.type === 'email' || f.type === 'tel' || f.type === 'digits') ? 'ltr' : null })); ctl.addEventListener('input', function () { setVal(f.key, ctl.value); });
      }
      if (ctl) wrap.appendChild(ctl);
      if (f.hint) wrap.appendChild(h('div', { class: 'hint' }, f.hint));
      wrap.appendChild(h('div', { class: 'msg', role: 'alert' }));
      fieldsByKey[f.key] = { def: f, el: wrap, ctl: ctl || wrap.querySelector('.ctl') };
      if (curGroup) {
        groups[curGroup].keys.push(f.key);
        wrap.setAttribute('data-group', curGroup);
        wrap.classList.add('gh');
      }
      return wrap;
    }
    (o.fields || []).forEach(function (f) { el.appendChild(buildField(f)); });
    /* تُفتح المجموعة تلقائيًا إذا كانت تحوي قيمًا مسجّلة (شاشة التعديل) */
    groupOrder.forEach(function (id) {
      var g = groups[id];
      if (g.def.open === true) { setGroupOpen(id, true); return; }
      if (o.autoExpandFilled && g.keys.some(function (k) { return isFilled(values[k]); })) setGroupOpen(id, true);
    });
    refreshGroupCounts();
    api.values = function () { return U.clone(values); };
    api.get = function (k) { return values[k]; };
    api.set = function (k, v) { values[k] = v; var f = fieldsByKey[k]; if (f && f.ctl && 'value' in f.ctl) f.ctl.value = v === null || v === undefined ? '' : v; refreshGroupCounts(); };
    api.setErrors = function (errs) {
      Object.keys(fieldsByKey).forEach(function (k) { var f = fieldsByKey[k]; f.el.classList.remove('err'); f.el.querySelector('.msg').textContent = ''; });
      var first = null;
      Object.keys(errs || {}).forEach(function (k) {
        var f = fieldsByKey[k]; if (!f) return;
        f.el.classList.add('err'); f.el.querySelector('.msg').textContent = errs[k];
        var gid = groupOfField(k);            /* لا يُخفى حقل عليه خطأ */
        if (gid) setGroupOpen(gid, true);
        if (!first) first = f;
      });
      if (first && first.ctl && first.ctl.focus) first.ctl.focus();
      if (first && first.el.scrollIntoView) first.el.scrollIntoView({ block: 'center' });
    };
    api.groups = function () { return groupOrder.slice(); };
    api.openGroup = function (id, open) { setGroupOpen(id, open !== false); };
    api.groupOpen = function (id) { return !!(groups[id] && groups[id].open); };
    api.openGroupOf = function (key) { var g = groupOfField(key); if (g) setGroupOpen(g, true); return g; };
    api.showField = function (key, on) { var f = fieldsByKey[key]; if (f) f.el.classList.toggle('fhide', !on); };
    api.validate = function () {
      var errs = {};
      (o.fields || []).forEach(function (f) {
        if (!f.key || f.type === 'section' || f.type === 'note' || f.type === 'group' || f.type === 'custom' || f.hidden) return;
        var v = values[f.key];
        var empty = v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
        if (f.required && empty) { errs[f.key] = t('app.field_required'); return; }
        if (empty) return;
        if (f.type === 'email' && !U.isEmail(v)) errs[f.key] = t('app.invalid_email');
        if (f.type === 'tel' && !U.isPhone(v)) errs[f.key] = t('app.invalid_phone');
        if (f.type === 'digits' && f.len && !U.isDigits(v, f.len)) errs[f.key] = f.len === 15 ? t('app.invalid_vat') : t('app.invalid_cr');
        if (f.type === 'unified' && !(U.isDigits(v, 10) && U.latinDigits(v).charAt(0) === '7')) errs[f.key] = t('app.invalid_unified');
        if ((f.type === 'money' || f.type === 'number' || f.type === 'pct' || f.type === 'int') && isNaN(Number(v))) errs[f.key] = t('app.invalid_number');
        if (f.validate) { var m = f.validate(v, values); if (m) errs[f.key] = m; }
      });
      return errs;
    };
    api.rebuildOptions = function (k, extra) { var f = fieldsByKey[k]; if (!f || !f.ctl || f.ctl.tagName !== 'SELECT') return; Object.assign(f.def, extra || {}); var cur = values[k]; D.clear(f.ctl); f.ctl.appendChild(h('option', { value: '' }, t('app.select'))); optionsFor(f.def).forEach(function (op) { f.ctl.appendChild(h('option', { value: op.value, selected: String(op.value) === String(cur || '') }, op.label)); }); if (cur && !optionsFor(f.def).some(function (x) { return String(x.value) === String(cur); })) values[k] = null; };
    return api;
  };

  /* ---------- التصفية ---------- */
  /* items: [{key,label,type:'select'|'search'|'date'|'number', options|lookup, placeholder}] values:{} onChange(values) */
  UI.filters = function (o) {
    var values = Object.assign({}, o.values || {});
    var bar = h('div', { class: 'filters', role: 'search' });
    function fire() { if (o.onChange) o.onChange(Object.assign({}, values)); }
    var deb = U.debounce(fire, 250);
    (o.items || []).forEach(function (it) {
      if (it.type === 'search') {
        var inp = h('input', { type: 'search', placeholder: it.placeholder || t('app.search'), value: values[it.key] || '', 'aria-label': it.label || t('app.search') });
        inp.addEventListener('input', function () { values[it.key] = inp.value; deb(); });
        bar.appendChild(h('div', { class: 'search' }, inp));
      } else if (it.type === 'select') {
        var sel = h('select', { 'aria-label': it.label, title: it.label });
        sel.appendChild(h('option', { value: '' }, it.label + ' — ' + t('app.all')));
        var opts = it.options ? it.options : optionsFor(it);
        opts.forEach(function (op) { sel.appendChild(h('option', { value: op.value, selected: String(values[it.key] || '') === String(op.value) }, op.label)); });
        sel.addEventListener('change', function () { values[it.key] = sel.value || undefined; fire(); });
        bar.appendChild(sel);
      } else if (it.type === 'date') {
        var di = h('input', { type: 'date', value: values[it.key] || '', 'aria-label': it.label, title: it.label });
        di.addEventListener('change', function () { values[it.key] = di.value || undefined; fire(); });
        bar.appendChild(di);
      } else if (it.type === 'number') {
        var ni = h('input', { type: 'number', placeholder: it.label, value: values[it.key] || '', 'aria-label': it.label, style: { width: '130px' }, dir: 'ltr' });
        ni.addEventListener('input', function () { values[it.key] = ni.value || undefined; deb(); });
        bar.appendChild(ni);
      } else if (it.type === 'custom') bar.appendChild(it.el);
    });
    bar.appendChild(h('span', { class: 'spacer' }));
    var clr = h('button', { class: 'btn sm ghost', type: 'button', on: { click: function () { Object.keys(values).forEach(function (k) { delete values[k]; }); D.qsa('select,input', bar).forEach(function (x) { x.value = ''; }); fire(); } } }, t('app.clear_filters'));
    bar.appendChild(clr);
    if (o.extra) o.extra.forEach(function (x) { bar.appendChild(x); });
    bar.values = function () { return Object.assign({}, values); };
    bar.set = function (k, v) { values[k] = v; var ctl = D.qsa('select,input', bar).find(function (x) { return x.getAttribute('aria-label') === (o.items.find(function (i) { return i.key === k; }) || {}).label; }); if (ctl) ctl.value = v || ''; };
    return bar;
  };
  UI.activeFilters = function (values, labelFn, onRemove) {
    var keys = Object.keys(values).filter(function (k) { return values[k] !== undefined && values[k] !== '' && values[k] !== null; });
    if (!keys.length) return null;
    var wrap = h('div', { class: 'active-filters' });
    keys.forEach(function (k) { var lbl = labelFn(k, values[k]); if (!lbl) return; wrap.appendChild(h('span', { class: 'af' }, lbl, h('button', { type: 'button', 'aria-label': t('app.close'), on: { click: function () { onRemove(k); } } }, '×'))); });
    return wrap;
  };
  /* العروض المحفوظة لكل وحدة */
  UI.savedViews = function (module, getFilters, applyFilters) {
    var wrap = h('span', { class: 'saved-views', style: { display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', maxWidth: '100%' } });
    function render() {
      D.clear(wrap);
      S.adapter.savedViews(module).then(function (views) {
        var sel = h('select', { class: 'sel', 'aria-label': t('app.saved_views'), title: t('app.saved_views'), style: { maxWidth: '180px' } });
        sel.appendChild(h('option', { value: '' }, t('app.saved_views')));
        views.forEach(function (v) { sel.appendChild(h('option', { value: v.id }, v.name)); });
        sel.addEventListener('change', function () { var v = views.find(function (x) { return x.id === sel.value; }); if (v) applyFilters(v.filters, v); });
        var save = h('button', { class: 'btn sm', type: 'button', title: t('app.save_view'), on: { click: function () {
          UI.formModal({ title: t('app.save_view'), size: 'sm', cols: 1, fields: [{ key: 'name', label: t('app.view_name'), type: 'text', required: true }], values: {}, onSubmit: function (v) { return S.adapter.saveView({ module: module, name: v.name, filters: getFilters() }).then(render); } });
        } } }, t('app.save_view'));
        var del = h('button', { class: 'btn sm ghost', type: 'button', on: { click: function () { if (!sel.value) return; UI.confirm({ title: t('app.delete_view'), message: sel.options[sel.selectedIndex].text, danger: true }).then(function (ok) { if (ok) S.adapter.deleteView(sel.value).then(render); }); } } }, t('app.delete_view'));
        wrap.appendChild(sel); wrap.appendChild(save); wrap.appendChild(del);
      });
    }
    render();
    return wrap;
  };

  /* ---------- زر التصدير (مع الاعتماد والتدقيق) ---------- */
  UI.exportButton = function (o) {
    var btn = h('button', { class: 'btn sm', type: 'button', title: t('app.export') }, UI.icon('download'), o.label || t('app.export'));
    if (!S.can('export.data')) { btn.disabled = true; btn.title = t('app.permission_denied'); return btn; }
    btn.addEventListener('click', function () {
      var rows = o.rows(), cols = o.columns();
      S.adapter.logExport(o.module, rows.length, o.filters ? o.filters() : null).then(function (r) {
        if (!r.allowed) { UI.toast(t('app.approval_sent') + ' — ' + t('app.needs_approval_by', { roles: root.PERMS.approverRoles('data_export').map(S.roleLabel).join('، ') }), 'warn', 7000); return; }
        var name = (o.filename || o.module) + '_' + U.today() + (o.xlsx === false ? '.csv' : '.xlsx');
        if (o.xlsx === false) root.EXPORTER.downloadCsv(name, cols, rows); else root.EXPORTER.downloadXlsx(name, [{ name: o.sheet || o.module, columns: cols, rows: rows }]);
        UI.toast(t('app.export') + ' ✓', 'ok');
      }).catch(UI.errorToast);
    });
    return btn;
  };

  /* ---------- تبويبات ---------- */
  UI.tabs = function (o) {
    var bar = h('div', { class: 'tabs', role: 'tablist' });
    o.tabs.forEach(function (tb) {
      if (tb.hidden) return;
      var b = h('button', { type: 'button', role: 'tab', 'aria-selected': tb.key === o.active ? 'true' : 'false', on: { click: function () { D.qsa('button', bar).forEach(function (x) { x.setAttribute('aria-selected', 'false'); }); b.setAttribute('aria-selected', 'true'); o.onChange(tb.key); } } }, tb.label, tb.count !== undefined ? h('span', { class: 'cnt' }, String(tb.count)) : null);
      bar.appendChild(b);
    });
    return bar;
  };

  /* ---------- قائمة سجلات بسيطة ---------- */
  UI.list = function (rows, renderRow, onClick) {
    var el = h('div', { class: 'list' });
    if (!rows.length) { el.appendChild(UI.empty(t('mw.nothing'), ' ')); return el; }
    rows.forEach(function (r) { var row = renderRow(r); row.classList.add('row'); if (onClick) { row.classList.add('click'); row.tabIndex = 0; row.addEventListener('click', function (e) { if (e.target.closest('button,a')) return; onClick(r); }); row.addEventListener('keydown', function (e) { if (e.key === 'Enter') onClick(r); }); } el.appendChild(row); });
    return el;
  };
  UI.kv = function (pairs, cols) {
    var dl = h('dl', { class: 'kv' + (cols === 2 ? ' c2' : '') });
    pairs.forEach(function (p) { if (!p) return; dl.appendChild(h('dt', null, p[0])); var dd = h('dd'); D.append(dd, p[1] === null || p[1] === undefined || p[1] === '' ? h('span', { class: 'muted' }, '—') : p[1]); dl.appendChild(dd); });
    return dl;
  };
  UI.timeline = function (events) {
    var el = h('div', { class: 'timeline' });
    if (!events.length) return UI.empty(t('app.empty'), ' ');
    events.forEach(function (ev) { el.appendChild(h('div', { class: 'ev ' + (ev.kind || '') + (ev.future ? ' future' : '') }, h('div', { class: 'd' }, ev.date), h('div', { class: 't' }, ev.title), ev.sub ? h('div', { class: 's' }, ev.sub) : null, ev.extra || null)); });
    return el;
  };
  /* ---------- مسار المراحل القابل للطي ----------
     مطويًّا: الشريط الرفيع كما كان. ممدَّدًا: كل المراحل بأسمائها موزّعة على
     مجموعات المسار، والمنجَز والحالي بلون واضح والمستقبلي رصاصي فاتح.
     الضغط على أي مرحلة يفتح نافذة تشرح المطلوب فيها.
     حالة الطي تُحفظ في المتصفح لكل مستخدم (crm-stagepath). */
  var PATH_KEY = 'crm-stagepath';
  function pathOpen() { try { return localStorage.getItem(PATH_KEY) === '1'; } catch (e) { return false; } }
  function pathSet(v) { try { localStorage.setItem(PATH_KEY, v ? '1' : '0'); } catch (e) { } }

  /* أبعد مرحلة بلغتها الفرصة — تُقرأ من سجل المراحل حتى يبقى المسار مفهومًا
     للفرص المغلقة أو المعلّقة التي لا ترتيب لمرحلتها الحالية داخل المسار. */
  function reachedOrder(opp) {
    var cur = STAGES.get(opp.stage), max = 0;
    if (cur && !cur.terminal && !cur.parked) return cur.order;
    (S.historyOf ? S.historyOf(opp.id) : []).forEach(function (x) {
      var st = STAGES.get(x.to_stage);
      if (st && !st.terminal && !st.parked && st.order > max) max = st.order;
    });
    return max;
  }

  UI.stagePath = function (opp) {
    var cols = STAGES.boardColumns();
    var cur = STAGES.get(opp.stage);
    var live = !!(cur && !cur.terminal && !cur.parked);
    var reached = reachedOrder(opp);
    var canStage = S.canRec('opportunities.stage', opp, S.parentsOf(opp));

    function stateOf(st) {
      if (live && st.order === cur.order) return 'cur';
      if (st.order < reached) return 'done';
      if (live && st.order === cur.order + 1) return 'next';
      return '';
    }

    var rail = h('div', { class: 'stage-track' });
    cols.forEach(function (st) { var c = stateOf(st); rail.appendChild(h('i', { class: c === 'cur' ? 'cur' : (c === 'done' ? 'done' : '') })); });

    var grid = h('div', { class: 'spath-grid' });
    var seen = {};
    cols.forEach(function (st) { if (!seen[st.group]) { seen[st.group] = []; } seen[st.group].push(st); });
    Object.keys(seen).forEach(function (g) {
      var items = seen[g], done = items.filter(function (x) { return stateOf(x) === 'done'; }).length;
      var col = h('div', { class: 'spath-col' },
        h('div', { class: 'spath-ch' }, h('b', null, STAGES.groupLabel(g, S.lang)), h('s', null, done + '/' + items.length)));
      items.forEach(function (st) {
        var c = stateOf(st);
        var btn = h('button', {
          type: 'button', class: 'spath-st ' + c, 'data-stage': st.key,
          'aria-label': STAGES.label(st.key, S.lang) + ' — ' + t('op.path_position', { n: st.order, m: cols.length })
        },
          h('u', null, c === 'done' ? '✓' : String(st.order)),
          h('span', null, STAGES.label(st.key, S.lang)),
          c === 'next' ? h('em', { class: 'spath-nb' }, t('op.path_next')) : null);
        btn.addEventListener('click', function (e) { e.stopPropagation(); openStagePop(btn, st, opp, canStage, live, cur, cols.length); });
        col.appendChild(btn);
      });
      grid.appendChild(col);
    });

    var legend = h('div', { class: 'spath-lg' },
      h('i', null, h('span', { class: 'sw d' }), t('op.path_st_done')),
      h('i', null, h('span', { class: 'sw c' }), t('op.path_st_current')),
      h('i', null, h('span', { class: 'sw n' }), t('op.path_st_next')),
      h('i', null, h('span', { class: 'sw' }), t('op.path_st_future')),
      !live ? h('i', { class: 'warn-txt' }, cur && cur.parked ? t('op.path_parked') : t('op.path_closed')) : null);

    var body = h('div', { class: 'spath-body' }, grid, legend);
    var tog = h('button', { class: 'btn xs ghost spath-tog', type: 'button', 'aria-expanded': 'false' });
    var wrap = h('div', { class: 'spath' }, h('div', { class: 'spath-head' }, rail, tog), body);

    function apply(open) {
      body.hidden = !open;
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
      D.clear(tog); tog.appendChild(D.text(open ? t('op.path_collapse') : t('op.path_expand')));
      tog.classList.toggle('on', open);
      if (!open) closeStagePop();
    }
    tog.addEventListener('click', function () { var v = tog.getAttribute('aria-expanded') !== 'true'; pathSet(v); apply(v); });
    apply(pathOpen());
    return wrap;
  };

  /* نافذة شرح المرحلة — مثبّتة قرب المرحلة المضغوطة */
  var curPop = null;
  function closeStagePop() {
    if (!curPop) return;
    if (curPop.anchor) curPop.anchor.classList.remove('open');
    if (curPop.el.parentNode) curPop.el.parentNode.removeChild(curPop.el);
    document.removeEventListener('mousedown', curPop.onDoc, true);
    document.removeEventListener('keydown', curPop.onKey, true);
    window.removeEventListener('resize', curPop.onMove);
    window.removeEventListener('scroll', curPop.onMove, true);
    curPop = null;
  }
  UI.closeStagePop = closeStagePop;

  function openStagePop(anchor, st, opp, canStage, live, cur, total) {
    var wasOpen = curPop && curPop.anchor === anchor;
    closeStagePop();
    if (wasOpen) return;

    var isCur = live && st.order === cur.order;
    var back = live && st.order < cur.order;
    var sub;
    if (isCur) sub = t('op.path_st_current');
    else if (back) sub = t('op.path_behind');
    else if (live) {
      var d = st.order - cur.order;
      /* العربية تميّز المفرد والمثنّى والجمع، وتعود للمفرد بعد العشرة */
      sub = d === 1 ? t('op.path_st_next') : t('op.path_ahead', { c: root.tp('op.n_stages', d) });
    } else sub = t('op.path_st_future');

    var guide = STAGES.guide(st.key, S.lang);
    /* قفز للأمام: المراحل التي بينهما تُعدّ منجزة — يُصرَّح بها قبل النقل لا بعده */
    var skipped = live ? STAGES.between(opp.stage, st.key) : [];
    var reqs = st.required_fields || [];
    var pop = h('div', { class: 'spop', role: 'dialog', 'aria-label': STAGES.label(st.key, S.lang) },
      h('div', { class: 'spop-arw', 'aria-hidden': 'true' }),
      h('h4', null, h('u', null, String(st.order)), STAGES.label(st.key, S.lang)),
      h('div', { class: 'spop-sub' }, sub + ' · ' + STAGES.groupLabel(st.group, S.lang) + ' · ' + t('op.path_position', { n: st.order, m: total })),
      guide.length ? h('h5', null, t('op.path_guide')) : null,
      guide.length ? h('ul', null, guide.map(function (g) { return h('li', null, g); })) : null,
      h('h5', null, t('op.path_req_fields')),
      reqs.length
        ? h('div', { class: 'spop-req' }, reqs.map(function (k) { return h('i', null, root.tf(k)); }))
        : h('div', { class: 'spop-none' }, t('op.path_no_req')),
      skipped.length ? h('div', { class: 'spop-skip' },
        t('op.stage_skips', { c: root.tp('op.n_stages', skipped.length), list: skipped.map(function (x) { return x.order; }).join('، ') })) : null,
      h('div', { class: 'spop-kv' },
        st.max_days ? h('span', null, t('op.path_ref_days') + ': ', h('b', null, t('op.path_days', { n: st.max_days }))) : null,
        h('span', null, t('op.path_prob') + ': ', h('b', null, st.probability + '%')),
        h('span', { class: (st.requires_reason || back) ? 'warn-txt' : '' }, (st.requires_reason || back) ? t('op.path_needs_reason') : t('op.path_no_reason'))));

    var acts = h('div', { class: 'spop-act' });
    if (!isCur) {
      /* الزر يبقى ظاهرًا معطّلًا مع بيان السبب — إخفاؤه بلا تفسير يُربك الموظف */
      var blocked = !live ? t('op.path_closed_move') : (!canStage ? t('op.path_no_perm') : null);
      var mv = h('button', { class: 'btn sm primary', type: 'button', disabled: !!blocked, title: blocked || '' }, t('op.path_move_here'));
      if (!blocked) mv.addEventListener('click', function () { closeStagePop(); FORMS.stageChange(opp, st.key).then(function (r) { if (r) root.APP.route(); }); });
      acts.appendChild(mv);
      if (blocked) pop.appendChild(h('div', { class: 'spop-blocked' }, blocked));
    }
    acts.appendChild(h('button', { class: 'btn sm', type: 'button', on: { click: closeStagePop } }, t('app.close')));
    pop.appendChild(acts);

    document.body.appendChild(pop);
    anchor.classList.add('open');

    function place() {
      var r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      var vw = window.innerWidth, vh = window.innerHeight, m = 8;
      var top = r.bottom + 10, above = false;
      if (top + ph > vh - m) { if (r.top - ph - 10 >= m) { top = r.top - ph - 10; above = true; } else { top = Math.max(m, vh - ph - m); } }
      var left = S.lang === 'en' ? r.left : r.right - pw;      /* المحاذاة مع حافة المرحلة حسب الاتجاه */
      left = Math.min(Math.max(m, left), vw - pw - m);
      pop.style.top = top + 'px'; pop.style.left = left + 'px';
      pop.classList.toggle('above', above);
      var ax = Math.min(Math.max(14, r.left + r.width / 2 - left - 6), pw - 26);
      pop.querySelector('.spop-arw').style.left = ax + 'px';
    }
    place();

    var api = { el: pop, anchor: anchor, onMove: place };
    api.onDoc = function (e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) closeStagePop(); };
    api.onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeStagePop(); anchor.focus(); } };
    curPop = api;
    document.addEventListener('mousedown', api.onDoc, true);
    document.addEventListener('keydown', api.onKey, true);
    window.addEventListener('resize', api.onMove);
    window.addEventListener('scroll', api.onMove, true);
  }

  UI.link = function (href, text, cls) { return h('a', { href: href, class: cls || 'lnk' }, text); };
  UI.recordLink = function (entity, id, text) { var route = { customer: 'customers', opportunity: 'opportunities', proposal: 'proposals', contract: 'contracts', contact: 'customers', activity: 'activities', campaign: 'occasions', project: 'contracts' }[entity]; if (entity === 'contact') { var c = S.get('contact', id); return UI.link('#/customers/' + (c ? c.customer_id : '') + '?tab=contacts', text || (c ? c.full_name : id)); } if (entity === 'project') { var p = S.get('project', id); return UI.link('#/contracts/' + (p ? p.contract_id : ''), text || (p ? p.name : id)); } return UI.link('#/' + route + '/' + id, text || id); };

  /* ---------- الرسوم البيانية (SVG خفيفة) ---------- */
  UI.barChart = function (o) {
    var data = o.data || [], W = o.width || 640, H = o.height || 220, padL = 44, padB = 46, padT = 12, padR = 8;
    var max = Math.max.apply(null, [1].concat(data.map(function (d) { return d.value || 0; }))) * 1.1;
    var svg = D.svg('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': o.label || '' , style: 'height:' + H + 'px' });
    var g = D.svg('g', { class: 'grid' });
    for (var i = 0; i <= 4; i++) { var y = padT + (H - padT - padB) * (1 - i / 4); g.appendChild(D.svg('line', { x1: padL, x2: W - padR, y1: y, y2: y })); svg.appendChild(D.svg('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', text: o.format ? o.format(max * i / 4, true) : U.fmtNum(max * i / 4) })); }
    svg.appendChild(g);
    var n = data.length || 1, bw = (W - padL - padR) / n, gap = Math.min(12, bw * .25);
    data.forEach(function (d, i) {
      var bh = (H - padT - padB) * ((d.value || 0) / max), x = padL + i * bw + gap / 2, y = H - padB - bh;
      var r = D.svg('rect', { class: 'bar ' + (d.color || ''), x: x, y: y, width: Math.max(2, bw - gap), height: Math.max(0, bh), rx: 4 });
      var tt = D.svg('title', { text: (d.title || d.label) + ': ' + (o.format ? o.format(d.value) : U.fmtNum(d.value)) + (d.sub ? ' · ' + d.sub : '') }); r.appendChild(tt);
      if (d.onClick) r.addEventListener('click', d.onClick);
      svg.appendChild(r);
      if (bh > 0 && o.showValues !== false && (bw - gap) >= 22) svg.appendChild(D.svg('text', { class: 'lbl', x: x + (bw - gap) / 2, y: y - 4, 'text-anchor': 'middle', style: 'font-size:10px', text: o.format ? o.format(d.value, true) : U.fmtNum(d.value) }));
      var lbl = d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label;
      svg.appendChild(D.svg('text', { x: x + (bw - gap) / 2, y: H - padB + 16, 'text-anchor': 'middle', text: lbl }));
      if (d.sub) svg.appendChild(D.svg('text', { x: x + (bw - gap) / 2, y: H - padB + 30, 'text-anchor': 'middle', text: d.sub, style: 'font-size:10px' }));
    });
    return svg;
  };
  UI.hbars = function (o) {
    var rows = o.rows || [], max = Math.max.apply(null, [1].concat(rows.map(function (r) { return r.value || 0; })));
    var el = h('div', { class: 'hbars' });
    rows.forEach(function (r) {
      var row = h('div', { class: 'hbar' + (r.onClick ? ' click' : ''), on: r.onClick ? { click: r.onClick } : null, tabindex: r.onClick ? '0' : null }, h('span', { class: 'n', title: r.label }, r.label), h('span', { class: 'b' }, h('i', { class: r.color || '', style: { width: (100 * (r.value || 0) / max).toFixed(1) + '%' } })), h('span', { class: 'v num' }, o.format ? o.format(r.value, r) : U.fmtNum(r.value)));
      el.appendChild(row);
    });
    if (!rows.length) el.appendChild(h('div', { class: 'muted small' }, t('rp.no_data')));
    return el;
  };
  UI.lineChart = function (o) {
    var pts = o.points || [], W = o.width || 640, H = o.height || 200, padL = 40, padB = 30, padT = 12, padR = 10;
    var max = Math.max.apply(null, [1].concat(pts.map(function (p) { return p.value || 0; }))) * 1.15;
    var svg = D.svg('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': o.label || '', style: 'height:' + H + 'px' });
    for (var i = 0; i <= 3; i++) { var y = padT + (H - padT - padB) * (1 - i / 3); svg.appendChild(D.svg('line', { class: 'grid', x1: padL, x2: W - padR, y1: y, y2: y, stroke: 'var(--line)' })); svg.appendChild(D.svg('text', { x: padL - 6, y: y + 4, 'text-anchor': 'end', text: U.fmtNum(Math.round(max * i / 3)) })); }
    var n = Math.max(1, pts.length - 1), xs = function (i) { return padL + (W - padL - padR) * (i / n); }, ys = function (v) { return H - padB - (H - padT - padB) * (v / max); };
    var dAttr = pts.map(function (p, i) { return (i ? 'L' : 'M') + xs(i) + ',' + ys(p.value || 0); }).join(' ');
    if (pts.length > 1) { svg.appendChild(D.svg('path', { class: 'area', d: dAttr + ' L' + xs(pts.length - 1) + ',' + (H - padB) + ' L' + xs(0) + ',' + (H - padB) + ' Z' })); svg.appendChild(D.svg('path', { class: 'line', d: dAttr })); }
    pts.forEach(function (p, i) { var c = D.svg('circle', { class: 'pt', cx: xs(i), cy: ys(p.value || 0), r: 4 }); c.appendChild(D.svg('title', { text: p.label + ': ' + U.fmtNum(p.value) })); svg.appendChild(c); svg.appendChild(D.svg('text', { x: xs(i), y: H - padB + 16, 'text-anchor': 'middle', text: p.label })); svg.appendChild(D.svg('text', { class: 'lbl', x: xs(i), y: ys(p.value || 0) - 8, 'text-anchor': 'middle', text: U.fmtNum(p.value) })); });
    return svg;
  };
  UI.donut = function (o) {
    var slices = (o.slices || []).slice(0, 4), total = U.sum(slices, 'value') || 1, r = 60, cx = 70, cy = 70, ring = 24;
    var svg = D.svg('svg', { class: 'donut chart', viewBox: '0 0 140 140', role: 'img', 'aria-label': o.label || '' });
    var acc = 0, colors = ['var(--ink)', 'var(--accent)', 'var(--warn)', 'var(--slate)'];
    slices.forEach(function (s, i) {
      var a0 = acc / total * 2 * Math.PI, a1 = (acc + s.value) / total * 2 * Math.PI; acc += s.value;
      var x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0), x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1), large = (a1 - a0) > Math.PI ? 1 : 0;
      var p = D.svg('path', { d: 'M' + x0 + ',' + y0 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x1 + ',' + y1, fill: 'none', stroke: s.color || colors[i % 4], 'stroke-width': ring });
      p.appendChild(D.svg('title', { text: s.label + ': ' + U.fmtNum(s.value) + ' (' + U.pct(s.value / total * 100) + ')' }));
      svg.appendChild(p);
    });
    svg.appendChild(D.svg('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'lbl', style: 'font-size:16px', text: o.center || U.fmtNum(total) }));
    var legend = h('div', { class: 'legend', style: { flexDirection: 'column', gap: '6px' } });
    slices.forEach(function (s, i) { legend.appendChild(h('span', null, h('i', { style: { background: s.color || colors[i % 4] } }), s.label + ' — ' + U.fmtNum(s.value) + ' (' + U.pct(s.value / total * 100) + ')')); });
    return h('div', { class: 'donut-wrap' }, svg, legend);
  };

  /* ---------- جدول المسار حسب المرحلة (مجموعات قابلة للطي) ---------- */
  UI.stageTable = function (o) {
    var groups = o.groups || [], canCom = o.canCom !== false;
    var state = o.state || {};                       /* { groupKey: true } = مطوية */
    var metric = function (x) { return canCom ? (x.value || 0) : (x.count || 0); };
    var total = groups.reduce(function (a, g) { return a + metric(g); }, 0);
    var max = 1;
    groups.forEach(function (g) { (g.stages || []).forEach(function (st) { max = Math.max(max, metric(st)); }); });
    function amount(x) { return canCom ? U.fmtMoneyShort(metric(x), S.lang).replace(/ ?(SAR|ر\.س) ?/, '') : U.fmtNum(metric(x)); }
    function share(x, digits) { if (!total) return '—'; var p = metric(x) / total * 100; return U.pct(p, digits === undefined ? (p > 0 && p < 10 ? 1 : 0) : digits); }
    function bar(x, color) {
      var w = Math.max(metric(x) > 0 ? 0.8 : 0, metric(x) / max * 100);
      return h('span', { class: 'tr-bar' }, h('i', { style: { width: w.toFixed(1) + '%', background: color } }));
    }

    var wrap = h('div', { class: 'stbl' });
    var tbl = h('table');
    var head = h('tr', null, h('th', { class: 'l' }, t('app.stage')), h('th', { class: 'r' }, t('nav.opportunities')));
    if (canCom) head.appendChild(h('th', { class: 'r' }, t('app.value')));
    head.appendChild(h('th', { class: 'b' }, t('ov.share_of_pipeline')));
    head.appendChild(h('th', { class: 'r' }, '%'));
    tbl.appendChild(h('thead', null, head));
    var tbody = h('tbody');
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);

    var allBtn = h('button', { class: 'btn sm ghost', type: 'button', on: { click: function () { var closeAll = !allClosed(); groups.forEach(function (g) { state[g.key] = closeAll; }); render(); } } });
    wrap.allBtn = allBtn;
    function allClosed() { return groups.length > 0 && groups.every(function (g) { return !!state[g.key]; }); }
    function syncAllBtn() {
      var open = !allClosed();
      D.clear(allBtn);
      allBtn.appendChild(UI.icon('caret'));
      allBtn.appendChild(D.text(open ? t('app.collapse_all') : t('app.expand_all')));
      allBtn.classList.toggle('is-closed', !open);
      allBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function toggle(key) { state[key] = !state[key]; render(); if (o.onToggle) o.onToggle(state); }

    function groupRow(g) {
      var closed = !!state[g.key];
      var tr = h('tr', { class: 'grp' + (closed ? ' closed' : ''), on: { click: function (e) { if (e.target.closest('.g-name')) return; toggle(g.key); } } });
      var td = h('td', { class: 'l' });
      var tg = h('button', { class: 'g-tog', type: 'button', tabindex: '-1', 'aria-hidden': 'true' }, UI.icon('caret'));
      var nm = h('button', {
        class: 'g-name', type: 'button', title: t('app.details'),
        on: { click: function (e) { e.stopPropagation(); if (o.onGroup) o.onGroup(g); } }
      }, h('i', { class: 'dot', style: { background: g.color } }), D.text(g.label));
      td.appendChild(tg); td.appendChild(nm);
      tr.appendChild(td);
      tr.appendChild(h('td', { class: 'r num' }, U.fmtNum(g.count)));
      if (canCom) tr.appendChild(h('td', { class: 'r num' }, amount(g)));
      tr.appendChild(h('td', { class: 'b' }, h('span', { class: 'g-note' }, closed ? (g.stages || []).length + ' ' + (S.lang === 'en' ? 'stages' : 'مرحلة') : '')));
      tr.appendChild(h('td', { class: 'r num' }, share(g, 0)));
      tr.setAttribute('aria-expanded', closed ? 'false' : 'true');
      tr.setAttribute('title', t('app.toggle_group'));
      return tr;
    }
    function stageRow(g, st) {
      var empty = !st.count;
      var tr = h('tr', { class: 'stg' + (empty ? ' empty' : ''), on: { click: function () { if (!empty && o.onStage) o.onStage(st, g); } } });
      tr.appendChild(h('td', { class: 'l nm' }, st.label));
      tr.appendChild(h('td', { class: 'r num' }, U.fmtNum(st.count)));
      if (canCom) tr.appendChild(h('td', { class: 'r num v' }, empty ? '—' : amount(st)));
      tr.appendChild(h('td', { class: 'b' }, empty ? null : bar(st, g.color)));
      tr.appendChild(h('td', { class: 'r num pct' }, empty ? '—' : share(st, 1)));
      return tr;
    }
    function render() {
      D.clear(tbody);
      groups.forEach(function (g) {
        tbody.appendChild(groupRow(g));
        if (!state[g.key]) (g.stages || []).forEach(function (st) { tbody.appendChild(stageRow(g, st)); });
      });
      syncAllBtn();
    }
    render();
    return wrap;
  };

  /* ---------- نافذة تفصيل قائمة (عند النقر على مؤشر) ---------- */
  UI.drill = function (title, columns, rows, opts) {
    opts = opts || {};
    var m = UI.modal({ title: title, sub: opts.sub || (rows.length + ' ' + (S.lang === 'en' ? 'records' : 'سجل')), size: 'lg', body: UI.table({ columns: columns, rows: rows, onRow: opts.onRow, responsive: true }), buttons: opts.exportModule && S.can('export.data') ? [UI.exportButton({ module: opts.exportModule, rows: function () { return rows; }, columns: function () { return columns.map(function (c) { return { key: c.key, label: c.label, get: c.exportGet || (c.get ? function (r) { var v = c.get(r); return v && v.textContent !== undefined ? v.textContent : v; } : null) }; }); }, filename: opts.exportModule })] : [] });
    return m;
  };

  root.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
