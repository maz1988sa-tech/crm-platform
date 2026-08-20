/* =====================================================================
   SEARCH — بحث عربي/إنجليزي سريع + تشابه النصوص لكشف التكرار
   ---------------------------------------------------------------------
   - normalize: إزالة التشكيل والتطويل، توحيد الألف/الياء/التاء المربوطة/الهمزات،
     الأرقام العربية → لاتينية، حروف صغيرة، إزالة "ال" التعريف اختياريًا للمطابقة.
   - score: تطابق كل كلمات الاستعلام في أي من الحقول (بادئة الكلمة أو احتواء).
   - similarity: معامل Dice على ثنائيات الحروف بعد التطبيع (0..1).
   ===================================================================== */
(function (root) {
  'use strict';
  var U = root.U;

  var TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
  function normalize(s, strong) {
    if (s === null || s === undefined) return '';
    s = String(s);
    s = U.latinDigits(s);
    s = s.replace(TASHKEEL, '');
    s = s.replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '');
    s = s.replace(/[​-‏﻿]/g, '');
    s = s.toLowerCase();
    s = s.replace(/[^\p{L}\p{N}\s@.+\-]/gu, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    if (strong) {
      // إزالة "ال" التعريف ومقدمات الشركات الشائعة لأغراض التكرار
      s = s.replace(/(^|\s)(ال)/g, '$1').replace(/\b(شركه|مؤسسه|مجموعه|company|co|ltd|llc|est|group|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return s;
  }
  function tokens(s) { return normalize(s).split(' ').filter(Boolean); }

  function matchScore(queryTokens, haystackNorm) {
    if (!queryTokens.length) return 1;
    var hs = haystackNorm.split(' ');
    var score = 0;
    for (var i = 0; i < queryTokens.length; i++) {
      var q = queryTokens[i], best = 0;
      if (haystackNorm.indexOf(q) < 0) return 0;
      for (var j = 0; j < hs.length; j++) {
        if (hs[j] === q) { best = 3; break; }
        if (hs[j].indexOf(q) === 0) best = Math.max(best, 2);
        else if (hs[j].indexOf(q) >= 0) best = Math.max(best, 1);
      }
      score += best;
    }
    return score;
  }

  function bigrams(s) { var out = {}; s = s.replace(/\s+/g, ''); for (var i = 0; i < s.length - 1; i++) { var b = s.substr(i, 2); out[b] = (out[b] || 0) + 1; } return out; }
  function similarity(a, b) {
    var na = normalize(a, true), nb = normalize(b, true);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    var ba = bigrams(na), bb = bigrams(nb), inter = 0, ca = 0, cb = 0, k;
    for (k in ba) { ca += ba[k]; if (bb[k]) inter += Math.min(ba[k], bb[k]); }
    for (k in bb) cb += bb[k];
    if (!ca || !cb) return 0;
    return (2 * inter) / (ca + cb);
  }

  var S = {
    normalize: normalize,
    tokens: tokens,
    similarity: similarity,
    /* يبحث في مصفوفة سجلات: fields = أسماء حقول أو دوال؛ يعيد السجلات مرتبة بالدرجة */
    filter: function (records, query, fields, limit) {
      var qt = tokens(query);
      if (!qt.length) return records.slice(0, limit || records.length);
      var out = [];
      for (var i = 0; i < records.length; i++) {
        var r = records[i], hay = [];
        for (var f = 0; f < fields.length; f++) {
          var v = typeof fields[f] === 'function' ? fields[f](r) : r[fields[f]];
          if (v !== null && v !== undefined && v !== '') hay.push(Array.isArray(v) ? v.join(' ') : String(v));
        }
        var sc = matchScore(qt, normalize(hay.join(' | ')));
        if (sc > 0) out.push({ r: r, s: sc });
      }
      out.sort(function (a, b) { return b.s - a.s; });
      var res = out.map(function (x) { return x.r; });
      return limit ? res.slice(0, limit) : res;
    },
    highlightable: function (query) { return tokens(query); }
  };

  root.SEARCH = S;
})(typeof window !== 'undefined' ? window : globalThis);
