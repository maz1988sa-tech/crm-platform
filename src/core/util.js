/* =====================================================================
   UTIL — أدوات مشتركة (تواريخ، أرقام، نصوص، مصفوفات) — بلا اعتماديات
   ===================================================================== */
(function (root) {
  'use strict';

  var U = {};

  /* ---------- الوقت ---------- */
  U._now = null;                       // للاختبارات: تثبيت "الآن"
  U.now = function () { return U._now ? new Date(U._now.getTime()) : new Date(); };
  U.setNow = function (d) { U._now = d ? new Date(d) : null; };
  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  U.isoDate = function (d) {               // YYYY-MM-DD بالتوقيت المحلي
    if (!d) return '';
    if (typeof d === 'string') { if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10); d = U.parseDate(d); if (!d) return ''; }
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };
  U.isoDateTime = function (d) {
    if (!d) return '';
    if (typeof d === 'string') d = U.parseDate(d);
    if (!d) return '';
    return U.isoDate(d) + 'T' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };
  U.today = function () { return U.isoDate(U.now()); };
  U.parseDate = function (s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    if (typeof s === 'number') { var dn = new Date(s); return isNaN(dn.getTime()) ? null : dn; }
    s = String(s).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
    if (m) { var d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); return isNaN(d.getTime()) ? null : d; }
    var m2 = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(s);   // DD/MM/YYYY
    if (m2) { var d2 = new Date(+m2[3], +m2[2] - 1, +m2[1]); return isNaN(d2.getTime()) ? null : d2; }
    var d3 = new Date(s); return isNaN(d3.getTime()) ? null : d3;
  };
  U.addDays = function (d, n) { var x = U.parseDate(d) || U.now(); x = new Date(x.getTime()); x.setDate(x.getDate() + n); return x; };
  U.addMonths = function (d, n) { var x = U.parseDate(d) || U.now(); x = new Date(x.getTime()); x.setMonth(x.getMonth() + n); return x; };
  U.diffDays = function (a, b) {            // b - a بالأيام (أعداد صحيحة) ; a,b تواريخ أو نصوص
    var da = U.parseDate(a), db = U.parseDate(b);
    if (!da || !db) return null;
    var A = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
    var B = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
    return Math.round((B - A) / 86400000);
  };
  U.daysUntil = function (d) { return U.diffDays(U.now(), d); };       // موجب = في المستقبل
  U.daysSince = function (d) { return U.diffDays(d, U.now()); };       // موجب = في الماضي
  U.startOfMonth = function (d) { var x = U.parseDate(d) || U.now(); return new Date(x.getFullYear(), x.getMonth(), 1); };
  U.endOfMonth = function (d) { var x = U.parseDate(d) || U.now(); return new Date(x.getFullYear(), x.getMonth() + 1, 0); };
  U.monthKey = function (d) { var x = U.parseDate(d); return x ? x.getFullYear() + '-' + U.pad(x.getMonth() + 1) : ''; };
  U.quarterOf = function (d) { var x = U.parseDate(d) || U.now(); return Math.floor(x.getMonth() / 3) + 1; };
  U.inRange = function (d, from, to) {
    var x = U.isoDate(d); if (!x) return false;
    if (from && x < U.isoDate(from)) return false;
    if (to && x > U.isoDate(to)) return false;
    return true;
  };
  U.periodRange = function (key) {         // مفاتيح الفترة الشائعة → {from,to}
    var n = U.now(), y = n.getFullYear();
    switch (key) {
      case 'this_month': return { from: U.isoDate(U.startOfMonth(n)), to: U.isoDate(U.endOfMonth(n)) };
      case 'this_quarter': { var q = U.quarterOf(n); return { from: U.isoDate(new Date(y, (q - 1) * 3, 1)), to: U.isoDate(new Date(y, q * 3, 0)) }; }
      case 'this_year': return { from: y + '-01-01', to: y + '-12-31' };
      case 'last_30': return { from: U.isoDate(U.addDays(n, -30)), to: U.isoDate(n) };
      case 'last_90': return { from: U.isoDate(U.addDays(n, -90)), to: U.isoDate(n) };
      default: return { from: '', to: '' };
    }
  };

  var AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var EN_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  U.monthName = function (i, lang) { return lang === 'en' ? EN_MONTHS[i] : AR_MONTHS[i]; };
  U.dayName = function (i, lang) { return lang === 'en' ? EN_DAYS[i] : AR_DAYS[i]; };
  /* تنسيق تاريخ قصير: 19 أغسطس 2026 / 19 Aug 2026 — الأرقام لاتينية دائمًا */
  U.fmtDate = function (d, lang) {
    var x = U.parseDate(d); if (!x) return '—';
    return x.getDate() + ' ' + U.monthName(x.getMonth(), lang) + ' ' + x.getFullYear();
  };
  U.fmtDateTime = function (d, lang) {
    var x = U.parseDate(d); if (!x) return '—';
    var h = x.getHours(), m = U.pad(x.getMinutes()), ap = h >= 12 ? (lang === 'en' ? 'PM' : 'م') : (lang === 'en' ? 'AM' : 'ص');
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return U.fmtDate(x, lang) + ' ' + h12 + ':' + m + ' ' + ap;
  };
  U.fmtMonth = function (key, lang) {     // "2026-08" → "أغسطس 2026"
    if (!key) return '—';
    var p = key.split('-'); return U.monthName(+p[1] - 1, lang) + ' ' + p[0];
  };
  U.relDays = function (n, lang) {        // وصف نسبي مختصر
    if (n === null || n === undefined) return '—';
    if (n === 0) return lang === 'en' ? 'today' : 'اليوم';
    if (n === 1) return lang === 'en' ? 'tomorrow' : 'غدًا';
    if (n === -1) return lang === 'en' ? 'yesterday' : 'أمس';
    if (n > 0) return lang === 'en' ? ('in ' + n + ' days') : ('بعد ' + n + ' يوم');
    return lang === 'en' ? (Math.abs(n) + ' days ago') : ('منذ ' + Math.abs(n) + ' يوم');
  };

  /* ---------- الأرقام والعملة ---------- */
  U.num = function (v) { if (v === null || v === undefined || v === '') return null; var n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, '').replace(/[٠-٩]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 1584); })); return isNaN(n) ? null : n; };
  U.fmtNum = function (n, digits) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
    n = Number(n);
    var f = digits !== undefined ? digits : (Math.abs(n) % 1 === 0 ? 0 : 2);
    var s = n.toFixed(f);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };
  U.fmtMoney = function (n, lang, opts) {   // ر.س 1,250,000  أو SAR 1,250,000
    if (n === null || n === undefined || n === '' || isNaN(n)) return '—';
    var cur = lang === 'en' ? 'SAR' : 'ر.س';
    var s = U.fmtNum(n, (opts && opts.digits !== undefined) ? opts.digits : 0);
    return lang === 'en' ? (cur + ' ' + s) : (s + ' ' + cur);
  };
  U.fmtMoneyShort = function (n, lang) {    // 1.25 مليون / 1.25M — للبطاقات
    if (n === null || n === undefined || isNaN(n)) return '—';
    n = Number(n);
    var abs = Math.abs(n);
    var cur = lang === 'en' ? 'SAR' : 'ر.س';
    var v, unit;
    if (abs >= 1e9) { v = n / 1e9; unit = lang === 'en' ? 'B' : 'مليار'; }
    else if (abs >= 1e6) { v = n / 1e6; unit = lang === 'en' ? 'M' : 'مليون'; }
    else if (abs >= 1e3) { v = n / 1e3; unit = lang === 'en' ? 'K' : 'ألف'; }
    else { return U.fmtMoney(n, lang); }
    var s = U.fmtNum(v, v % 1 === 0 ? 0 : (abs >= 1e7 ? 1 : 2));
    return lang === 'en' ? (cur + ' ' + s + unit) : (s + ' ' + unit + ' ' + cur);
  };
  U.pct = function (n, digits) { if (n === null || n === undefined || isNaN(n)) return '—'; return U.fmtNum(n, digits || 0) + '%'; };
  U.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); };
  U.round = function (n, d) { var p = Math.pow(10, d || 0); return Math.round(n * p) / p; };

  /* ---------- النصوص ---------- */
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.attr = U.esc;
  U.trim = function (s) { return s === null || s === undefined ? '' : String(s).trim(); };
  U.isEmail = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(U.trim(s)); };
  U.normPhone = function (s) { s = U.trim(s).replace(/[٠-٩]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 1584); }); return s.replace(/[\s\-().]/g, ''); };
  U.isPhone = function (s) { var p = U.normPhone(s); return /^\+?\d{7,15}$/.test(p); };
  U.isDigits = function (s, n) { s = U.trim(s).replace(/[٠-٩]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 1584); }); return new RegExp('^\\d{' + n + '}$').test(s); };
  U.latinDigits = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[٠-٩]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 1584); }).replace(/[۰-۹]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 1728); }); };
  U.truncate = function (s, n) { s = U.trim(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  U.initials = function (name) { var p = U.trim(name).split(/\s+/).filter(function (x) { return x && !/^[\u0621-\u064Aa-zA-Z]{1,2}\.$/.test(x) && x !== '(تجريبي)' && x !== '(demo)'; }); if (!p.length) return '?'; return (p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : ''); };
  U.splitTags = function (s) { if (Array.isArray(s)) return s.map(U.trim).filter(Boolean); return U.trim(s).split(/[,،]/).map(U.trim).filter(Boolean); };

  /* ---------- المصفوفات والكائنات ---------- */
  U.clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  U.by = function (arr, key) { var m = {}; (arr || []).forEach(function (x) { m[x[key]] = x; }); return m; };
  U.groupBy = function (arr, fn) { var m = {}; (arr || []).forEach(function (x) { var k = typeof fn === 'function' ? fn(x) : x[fn]; (m[k] = m[k] || []).push(x); }); return m; };
  U.sum = function (arr, fn) { var s = 0; (arr || []).forEach(function (x) { var v = typeof fn === 'function' ? fn(x) : (fn ? x[fn] : x); v = Number(v); if (!isNaN(v)) s += v; }); return s; };
  U.avg = function (arr, fn) { if (!arr || !arr.length) return null; return U.sum(arr, fn) / arr.length; };
  U.uniq = function (arr) { var seen = {}, out = []; (arr || []).forEach(function (x) { var k = typeof x === 'object' ? JSON.stringify(x) : x; if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; };
  U.sortBy = function (arr, key, dir) {
    var d = dir === 'desc' ? -1 : 1;
    var fn = typeof key === 'function' ? key : function (x) { return x[key]; };
    return (arr || []).slice().sort(function (a, b) {
      var va = fn(a), vb = fn(b);
      if (va === vb) return 0;
      if (va === null || va === undefined || va === '') return 1;
      if (vb === null || vb === undefined || vb === '') return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * d;
      return String(va).localeCompare(String(vb), 'ar') * d;
    });
  };
  U.last = function (arr) { return arr && arr.length ? arr[arr.length - 1] : undefined; };
  U.range = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; };
  U.pick = function (o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
  U.omit = function (o, keys) { var r = {}; Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) r[k] = o[k]; }); return r; };
  U.eq = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  U.diff = function (before, after, ignore) {    // الحقول المتغيرة فقط {field:{before,after}}
    var ig = ignore || ['version', 'updated_at', 'updated_by'];
    var out = {}, keys = U.uniq(Object.keys(before || {}).concat(Object.keys(after || {})));
    keys.forEach(function (k) { if (ig.indexOf(k) >= 0) return; if (!U.eq(before ? before[k] : undefined, after ? after[k] : undefined)) out[k] = { before: before ? before[k] : undefined, after: after ? after[k] : undefined }; });
    return out;
  };

  /* ---------- معرّفات ---------- */
  U.uid = function (prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); };
  U.refNo = function (prefix, year, n) { return prefix + '-' + year + '-' + String(n).padStart(4, '0'); };
  U.debounce = function (fn, ms) { var tm; return function () { var a = arguments, ctx = this; clearTimeout(tm); tm = setTimeout(function () { fn.apply(ctx, a); }, ms); }; };
  U.hash = function (s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  /* مولّد عشوائي ببذرة (mulberry32) — للبيانات التجريبية القابلة لإعادة الإنتاج */
  U.rng = function (seed) {
    var a = seed >>> 0;
    var f = function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.int = function (min, max) { return min + Math.floor(f() * (max - min + 1)); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.chance = function (p) { return f() < p; };
    return f;
  };

  root.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
