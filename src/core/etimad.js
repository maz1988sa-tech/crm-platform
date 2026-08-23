/* =====================================================================
   ETIMAD — قراءة صفحة «تفاصيل المنافسة» من منصة اعتماد
   ---------------------------------------------------------------------
   لماذا لصق النص وليس سحب الرابط؟
     - المنصة تعمل في المتصفح، ونداء tenders.etimad.sa من المتصفح يمنعه CORS.
     - السحب من الخادم يصطدم بصفحة تحقّق (CAPTCHA) على اعتماد، وتجاوزها غير مقبول.
     - لذلك يُلصق نص الصفحة التي فتحها الموظف أصلًا: بلا شبكة ولا اعتماديات.
   عند إتاحة واجهة اعتماد البرمجية الرسمية (Tenders Inquiry Service) يُضاف
   مصدر ثانٍ يستدعيها ويغذّي نفس الدالة map() دون تغيير الواجهة.

   الصفحة جدول ثابت: تسمية في عمود وقيمة في الآخر. التسميات في اعتماد فيها
   اختلافات إملائية (إسم/اسم، اخر/آخر، لإستلام/لاستلام)، فالمطابقة تتم بعد
   تطبيع الحروف لا بالمطابقة الحرفية.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ETIMAD = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- تطبيع عربي ---------- */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[ـ]/g, '')                        /* تطويل */
      .replace(/[ً-ْٰ]/g, '')           /* تشكيل */
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '')
      .replace(/ة/g, 'ه')
      .replace(/[‏‎؜]/g, '')            /* علامات الاتجاه */
      .replace(/\s+/g, ' ')
      .trim();
  }
  /* أرقام عربية-هندية → لاتينية */
  function digits(s) {
    return String(s == null ? '' : s).replace(/[٠-٩۰-۹]/g, function (d) {
      var c = d.charCodeAt(0);
      return String(c >= 0x06F0 ? c - 0x06F0 : c - 0x0660);
    });
  }

  /* ---------- التسميات المعروفة في الصفحة ---------- */
  var LABELS = [
    { key: 'agency', ar: 'الجهة الحكومية' },
    { key: 'basic', ar: 'المعلومات الاساسيه' },
    { key: 'doc_fee', ar: 'قيمه المنافسه' },
    { key: 'purpose', ar: 'الغايه من المنافسه' },
    { key: 'q_deadline', ar: 'اخر موعد لاستلام استفسارات الموردين' },
    { key: 'submission_deadline', ar: 'اخر موعد لاستلام العروض' },
    { key: 'opening', ar: 'تاريخ و وقت فتح العروض' },
    { key: 'standstill', ar: 'فتره التوقف' },
    { key: 'award_date', ar: 'التاريخ المتوقع للترسيه' },
    { key: 'start_date', ar: 'تاريخ بدء الاعمال' },
    { key: 'submit_place', ar: 'مكان تقديم العروض' },
    { key: 'open_place', ar: 'مكان فتح العروض' },
    { key: 'exec_place', ar: 'مكان التنفيذ' },
    { key: 'classification', ar: 'مجال التصنيف' },
    /* حقول تظهر في بعض الصفحات */
    { key: 'tender_type', ar: 'نوع المنافسه' },
    { key: 'activity', ar: 'نشاط المنافسه' },
    { key: 'ref_no', ar: 'الرقم المرجعي' }
  ];
  LABELS.forEach(function (l) { l.n = norm(l.ar); });

  function labelAt(line) {
    var n = norm(line);
    if (!n) return null;
    for (var i = 0; i < LABELS.length; i++) {
      if (n === LABELS[i].n || n.indexOf(LABELS[i].n) === 0) return LABELS[i];
    }
    return null;
  }

  /* ---------- استخراج أزواج تسمية/قيمة ---------- */
  /**
   * parseRaw(text) -> { agency: '...', basic: '...', ... }
   * يقبل النص الملصوق من الصفحة (Cmd+A ثم Cmd+C) بأي تنسيق أسطر.
   */
  function parseRaw(text) {
    var out = {};
    if (!text) return out;
    var lines = String(text).replace(/\r/g, '').split('\n');
    var cur = null, buf = [];
    function flush() {
      if (cur) {
        var v = buf.join('\n').trim();
        if (v && out[cur.key] === undefined) out[cur.key] = v;
      }
      buf = [];
    }
    lines.forEach(function (raw) {
      var line = raw.replace(/\t/g, ' ').trim();
      var lab = labelAt(line);
      if (lab) {
        flush();
        cur = lab;
        /* قد تأتي القيمة على نفس السطر بعد التسمية */
        var rest = line.slice(lab.ar.length).replace(/^[\s:：\-–—]+/, '');
        if (!rest) {
          var n = norm(line), i = n.indexOf(lab.n);
          if (i === 0) rest = line.slice(indexAfter(line, lab)).replace(/^[\s:：\-–—]+/, '');
        }
        if (rest) buf.push(rest);
        return;
      }
      if (cur) buf.push(line);
    });
    flush();
    return out;
  }
  /* موضع نهاية التسمية داخل السطر الأصلي (التطبيع قد يغيّر الأطوال) */
  function indexAfter(line, lab) {
    for (var i = Math.min(line.length, lab.ar.length + 12); i >= 0; i--) {
      if (norm(line.slice(0, i)) === lab.n) return i;
    }
    return lab.ar.length;
  }

  /* ---------- محلّلات القيم ---------- */
  /* «الموافق: 20/09/2026» → 2026-09-20 (نأخذ الميلادي لا الهجري) */
  function gregorian(v) {
    if (!v) return null;
    var s = digits(String(v));
    var m = /الموافق\s*[:：]?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/.exec(s);
    if (!m) {
      /* لا سطر «الموافق» — نأخذ أول تاريخ سنته ميلادية معقولة */
      var all = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/g) || [];
      for (var i = 0; i < all.length; i++) {
        var p = all[i].split('/').map(function (x) { return parseInt(x, 10); });
        if (p[2] >= 1900 && p[2] <= 2200) { m = [null, p[0], p[1], p[2]]; break; }
      }
    }
    if (!m) return null;
    var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
    if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900 && y <= 2200)) return null;
    return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
  }
  function money(v) {
    if (!v) return null;
    var s = digits(String(v)).replace(/[^\d.]/g, '');
    if (!s) return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function intOf(v) {
    if (!v) return null;
    var s = digits(String(v)).replace(/[^\d]/g, '');
    return s ? parseInt(s, 10) : null;
  }
  /* «إسم المنافسة: … / رقم المنافسة: …» داخل خانة المعلومات الأساسية */
  function basicParts(v) {
    var out = { name: null, ref: null };
    if (!v) return out;
    var lines = String(v).split('\n');
    lines.forEach(function (line) {
      var n = norm(line);
      if (n.indexOf('اسم المنافسه') === 0) out.name = line.replace(/^[^:：]*[:：]\s*/, '').trim();
      else if (n.indexOf('رقم المنافسه') === 0) out.ref = line.replace(/^[^:：]*[:：]\s*/, '').trim();
    });
    if (!out.name && lines.length) {
      var f = lines[0].trim();
      if (f && norm(f).indexOf('رقم المنافسه') !== 0) out.name = f.replace(/^[^:：]*[:：]\s*/, '').trim();
    }
    return out;
  }

  /* ---------- التحويل إلى حقول الفرصة ---------- */
  /**
   * map(text) -> {
   *   ok, fields, agency, docFee, extra, warnings, found
   * }
   *   fields  : حقول جاهزة للنموذج (لا تُملأ إلا ما وُجد)
   *   agency  : اسم الجهة الحكومية كما ورد (لمطابقته بعميل مسجّل)
   *   docFee  : قيمة وثائق المنافسة — **ليست** القيمة التقديرية للمشروع
   *   warnings: ملاحظات تُعرض للموظف
   */
  function map(text) {
    var raw = parseRaw(text);
    var found = Object.keys(raw).length;
    var warnings = [], fields = {};

    var b = basicParts(raw.basic);
    if (b.name) { fields.name = b.name; fields.project_name = b.name; }
    if (b.ref) fields.tender_ref = b.ref;
    if (raw.purpose) fields.description = raw.purpose;

    var sd = gregorian(raw.submission_deadline);
    if (sd) fields.submission_deadline = sd;
    var ad = gregorian(raw.award_date);
    if (ad) fields.expected_award_date = ad;
    var st = gregorian(raw.start_date);
    if (st) fields.expected_start_date = st;

    /* مصدر الفرصة: مفتاح من قائمة opportunity_sources — «منصة اعتماد».
       تنبيه: قائمة مصادر العملاء تستعمل مفتاحًا آخر (tender_portal)،
       فلا تُبدَّل المفاتيح بين القائمتين وإلا بقي الحقل فارغًا بصمت. */
    fields.source = 'etimad';

    var docFee = money(raw.doc_fee);
    var extra = {
      doc_fee: docFee,
      standstill_days: intOf(raw.standstill),
      questions_deadline: gregorian(raw.q_deadline),
      opening_date: gregorian(raw.opening),
      exec_place: raw.exec_place || null,
      open_place: raw.open_place || null,
      classification: raw.classification || null
    };

    /* ملاحظة جوهرية: «قيمة المنافسة» في اعتماد هي ثمن شراء كراسة الشروط،
       وليست القيمة التقديرية للمشروع — لا تُسند إلى estimated_value إطلاقًا. */
    if (docFee !== null) {
      warnings.push({ code: 'doc_fee', value: docFee });
    }
    if (!fields.name) warnings.push({ code: 'no_name' });
    if (!fields.submission_deadline) warnings.push({ code: 'no_deadline' });
    if (!found) warnings.push({ code: 'not_recognized' });

    /* سطر ملاحظات يجمع ما لا يوجد له حقل مخصّص */
    var notes = [];
    if (docFee !== null) notes.push('قيمة وثائق المنافسة: ' + docFee + ' ر.س');
    if (extra.standstill_days !== null) notes.push('فترة التوقف: ' + extra.standstill_days + ' يوم');
    if (extra.questions_deadline) notes.push('آخر موعد للاستفسارات: ' + extra.questions_deadline);
    if (extra.opening_date) notes.push('فتح العروض: ' + extra.opening_date);
    if (extra.exec_place) notes.push('مكان التنفيذ: ' + extra.exec_place);
    if (extra.classification) notes.push('مجال التصنيف: ' + extra.classification);
    if (notes.length) fields.notes = notes.join('\n');

    return {
      ok: found >= 3 && !!fields.name,
      found: found,
      fields: fields,
      agency: raw.agency || null,
      docFee: docFee,
      extra: extra,
      warnings: warnings,
      raw: raw
    };
  }

  /* هل النص المُلصق يشبه صفحة اعتماد أصلًا؟ */
  function looksLikeTender(text) {
    var n = norm(text || '');
    return n.indexOf('تفاصيل المنافسه') >= 0 || n.indexOf('الجهه الحكوميه') >= 0 || n.indexOf('اخر موعد لاستلام العروض') >= 0;
  }
  /* هل ما لُصق رابط منافسة بدل نص الصفحة؟ */
  function isTenderUrl(text) {
    return /tenders\.etimad\.sa\/.*tenderIdString=/i.test(String(text || '').trim());
  }

  return {
    map: map, parseRaw: parseRaw, norm: norm, digits: digits,
    gregorian: gregorian, money: money, basicParts: basicParts,
    looksLikeTender: looksLikeTender, isTenderUrl: isTenderUrl, LABELS: LABELS
  };
}));
