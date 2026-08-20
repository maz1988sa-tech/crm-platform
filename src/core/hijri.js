/* =====================================================================
   HIJRI — التاريخ الهجري (تقويم أم القرى) عبر Intl المدمج في المتصفح/Node
   ---------------------------------------------------------------------
   - لا مكتبات خارجية. إن لم يدعم المحرّك تقويم islamic-umalqura يعود إلى
     islamic-civil ثم إلى حساب تقريبي معلَن.
   - يُستخدم للعرض بجانب الميلادي ولحساب مواعيد المناسبات الدينية سنويًا.
   ===================================================================== */
(function (root) {
  'use strict';

  var CAL = null;       // التقويم المتاح
  var MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  var MONTHS_EN = ['Muharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];
  var fmtCache = null;

  function detect() {
    if (CAL !== null) return CAL;
    var cands = ['islamic-umalqura', 'islamic-civil', 'islamic'];
    for (var i = 0; i < cands.length; i++) {
      try {
        var f = new Intl.DateTimeFormat('en-u-ca-' + cands[i] + '-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
        var parts = f.formatToParts(new Date(2026, 0, 1));
        var ok = parts.some(function (p) { return p.type === 'year'; });
        if (ok) { CAL = cands[i]; fmtCache = f; return CAL; }
      } catch (e) { /* try next */ }
    }
    CAL = 'approx';
    return CAL;
  }

  /* تحويل تقريبي (خوارزمية Kuwaiti) — احتياط فقط */
  function approxToHijri(date) {
    var d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
    var jd;
    if (y > 1582 || (y === 1582 && m > 10) || (y === 1582 && m === 10 && d > 14)) {
      jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) + Math.floor((367 * (m - 2 - 12 * (Math.floor((m - 14) / 12)))) / 12) - Math.floor((3 * (Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100))) / 4) + d - 32075;
    } else {
      jd = 367 * y - Math.floor((7 * (y + 5001 + Math.floor((m - 9) / 7))) / 4) + Math.floor((275 * m) / 9) + d + 1729777;
    }
    var l = jd - 1948440 + 10632, n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354;
    var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    var hm = Math.floor((24 * l) / 709), hd = l - Math.floor((709 * hm) / 24), hy = 30 * n + j - 30;
    return { year: hy, month: hm, day: hd, approx: true };
  }

  var H = {
    calendar: function () { return detect(); },
    /* {year, month(1-12), day} */
    toHijri: function (date) {
      var d = root.U ? root.U.parseDate(date) : new Date(date);
      if (!d) return null;
      var cal = detect();
      if (cal === 'approx') return approxToHijri(d);
      try {
        var parts = fmtCache.formatToParts(d), o = {};
        parts.forEach(function (p) { if (p.type === 'year' || p.type === 'month' || p.type === 'day') o[p.type] = parseInt(p.value, 10); });
        if (!o.year || !o.month || !o.day) return approxToHijri(d);
        return { year: o.year, month: o.month, day: o.day, approx: false };
      } catch (e) { return approxToHijri(d); }
    },
    monthName: function (m, lang) { return lang === 'en' ? MONTHS_EN[m - 1] : MONTHS_AR[m - 1]; },
    /* "1 شوال 1448هـ" */
    fmt: function (date, lang) {
      var h = H.toHijri(date); if (!h) return '';
      var s = h.day + ' ' + H.monthName(h.month, lang) + ' ' + h.year + (lang === 'en' ? ' AH' : 'هـ');
      return h.approx ? s + (lang === 'en' ? ' (approx.)' : ' (تقريبي)') : s;
    },
    /* أول تاريخ ميلادي في السنة الميلادية gYear يوافق (شهر هجري, يوم) — قد يقع مرتين في السنة الميلادية نادرًا؛ نعيد كل الحالات */
    gregorianDatesFor: function (hMonth, hDay, gYear) {
      var out = [];
      var d = new Date(gYear, 0, 1);
      var end = new Date(gYear, 11, 31);
      // نقفز بالأيام مع تحقق مباشر — 365 تحويلًا سنويًا مقبول
      while (d <= end) {
        var h = H.toHijri(d);
        if (h && h.month === hMonth && h.day === hDay) { out.push(new Date(d.getTime())); d.setDate(d.getDate() + 300); continue; }
        // تسريع: إن كان الشهر الهجري بعيدًا نقفز
        var dist = ((hMonth - (h ? h.month : 1)) + 12) % 12;
        var step = dist > 1 ? Math.max(1, (dist - 1) * 29) : 1;
        d.setDate(d.getDate() + step);
      }
      return out;
    }
  };

  root.HIJRI = H;
})(typeof window !== 'undefined' ? window : globalThis);
