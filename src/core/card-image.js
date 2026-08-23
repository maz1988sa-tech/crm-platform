/* =====================================================================
   CARD_IMG — تحويل بطاقة SVG إلى صورة داخل المتصفح
   ---------------------------------------------------------------------
   الخطوات: بناء SVG (CARD_ART) ← حقن الخطوط بصيغة base64 ← تحميلها كصورة
   ← الرسم على canvas ← إخراج Blob.

   الخطوط تُضمَّن داخل الـ SVG لأن الصورة المحمَّلة من data: URI لا تُحمِّل
   أي ملف خارجي. لا يقع «تلويث» canvas لأن المصدر data: من نفس الأصل.

   القياس: تُبنى نسخة مخفية داخل الصفحة أولًا لقياس عرض النص الحقيقي،
   فيُضبط حجم سطر اسم الجهة المستقبِلة بدل التقدير.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.CARD_IMG = factory(root);
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var FONT_FILES = {
    kufi: 'reem-kufi-700.woff2',
    ruqaa: 'aref-ruqaa-700.woff2',
    naskh: 'amiri-400.woff2',
    sans400: 'tajawal-400.woff2',
    sans500: 'tajawal-500.woff2',
    sans700: 'tajawal-700.woff2',
    sans800: 'tajawal-800.woff2',
    sansLatin500: 'tajawal-latin-500.woff2',
    sansLatin700: 'tajawal-latin-700.woff2'
  };
  var FONT_DIR = 'assets/fonts/';
  var cache = null;
  var loading = null;
  var measurer = null;

  function bytesToB64(buf) {
    var bytes = new Uint8Array(buf), bin = '', chunk = 0x8000, i;
    for (i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  /* تحميل الخطوط مرة واحدة لكل جلسة */
  function preload() {
    if (cache) return Promise.resolve(cache);
    if (loading) return loading;
    var keys = Object.keys(FONT_FILES);
    loading = Promise.all(keys.map(function (k) {
      return fetch(FONT_DIR + FONT_FILES[k])
        .then(function (r) { if (!r.ok) throw new Error('font ' + FONT_FILES[k] + ': ' + r.status); return r.arrayBuffer(); })
        .then(function (b) { return [k, bytesToB64(b)]; })
        .catch(function () { return [k, null]; });
    })).then(function (pairs) {
      var out = {};
      pairs.forEach(function (p) { if (p[1]) out[p[0]] = p[1]; });
      cache = out;
      loading = null;
      return out;
    });
    return loading;
  }

  /* أداة قياس عرض النص بالخط الحقيقي */
  function ensureMeasurer() {
    if (measurer && measurer.isConnected) return measurer;
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;white-space:pre';
    document.body.appendChild(d);
    measurer = d;
    return d;
  }
  function makeMeasure() {
    var d;
    try { d = ensureMeasurer(); } catch (e) { return null; }
    return function (text, size) {
      d.style.font = '500 ' + size + 'px Tajawal, sans-serif';
      d.textContent = text;
      return d.getBoundingClientRect().width || text.length * size * 0.5;
    };
  }

  /**
   * svg(design, opts) -> نص SVG جاهز (بخطوط مضمّنة)
   */
  function svg(design, opts, fonts) {
    var ART = root.CARD_ART;
    var o = opts || {};
    var built = ART.build(design, {
      lang: o.lang, to: o.to, brand: o.brand, uid: o.uid || 'c',
      measure: o.measure || makeMeasure() || undefined
    });
    return ART.withFonts(built, fonts || cache || {});
  }

  function svgToDataUrl(s) {
    var bytes = new TextEncoder().encode(s), bin = '', chunk = 0x8000, i;
    for (i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return 'data:image/svg+xml;base64,' + btoa(bin);
  }

  /**
   * render(design, opts) -> Promise<{blob, dataUrl, width, height, base64}>
   *   opts: { lang, to, brand, scale=1, mime='image/jpeg', quality=0.86 }
   */
  function render(design, opts) {
    var o = opts || {};
    var ART = root.CARD_ART;
    return preload().then(function (fonts) {
      var s = svg(design, o, fonts);
      var url = svgToDataUrl(s);
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('تعذّر تحويل البطاقة إلى صورة')); };
        img.src = url;
      });
    }).then(function (img) {
      var scale = o.scale || 1;
      var cv = document.createElement('canvas');
      cv.width = Math.round(ART.W * scale);
      cv.height = Math.round(ART.H * scale);
      var ctx = cv.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      var mime = o.mime || 'image/jpeg';
      var q = o.quality == null ? 0.86 : o.quality;
      var dataUrl = cv.toDataURL(mime, q);
      return new Promise(function (resolve) {
        if (cv.toBlob) {
          cv.toBlob(function (blob) {
            resolve({ blob: blob, dataUrl: dataUrl, base64: dataUrl.split(',')[1], width: cv.width, height: cv.height, mime: mime });
          }, mime, q);
        } else {
          resolve({ blob: null, dataUrl: dataUrl, base64: dataUrl.split(',')[1], width: cv.width, height: cv.height, mime: mime });
        }
      });
    });
  }

  /* عنصر SVG جاهز للعرض داخل الصفحة (للمعاينة والمعرض) — بلا تحويل لصورة */
  function inlineSvg(design, opts) {
    var ART = root.CARD_ART;
    var o = opts || {};
    return ART.build(design, {
      lang: o.lang, to: o.to, brand: o.brand, uid: o.uid || ('p' + Math.round(performance.now() * 1000) % 100000),
      measure: o.measure || makeMeasure() || undefined
    });
  }

  return {
    preload: preload, render: render, svg: svg, inlineSvg: inlineSvg,
    svgToDataUrl: svgToDataUrl, fontsReady: function () { return !!cache; }
  };
}));
