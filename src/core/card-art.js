/* =====================================================================
   CARD_ART — مولّد بطاقات المناسبات (SVG خالص)
   ---------------------------------------------------------------------
   مصدر واحد يستخدمه الطرفان:
     - المنصة (المتصفح): يبني SVG ثم يحوّله إلى صورة عبر canvas.
     - مولّد سطر الأوامر (cards/build.js): يبني نفس الـ SVG ويصدّره صورة.

   لماذا SVG خالص وليس HTML/CSS؟ لأن تحويل HTML إلى صورة داخل المتصفح
   غير موثوق، بينما SVG المضمَّن فيه الخط يُرسم على canvas بلا تلويث
   (tainting) وبتشكيل عربي صحيح.

   النصوص كلّها موضوعة يدويًا (لا يوجد تخطيط تلقائي في SVG)، ولذلك
   المحتوى في src/config/card-designs.js مقسوم إلى أسطر جاهزة.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CARD_ART = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 1080, H = 1350;
  var PAD = 80;
  var BAND_H = 470;

  /* ---------- أدوات ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function n1(v) { return Number(v).toFixed(1); }
  function pts(a) { return a.map(function (p) { return n1(p[0]) + ',' + n1(p[1]); }).join(' '); }

  function star8(cx, cy, r, inner) {
    var p = [], i, a, rr;
    for (i = 0; i < 16; i++) {
      a = (Math.PI / 8) * i - Math.PI / 8;
      rr = (i % 2 === 0) ? r : r * (inner || 0.45);
      p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    return '<polygon points="' + pts(p) + '"/>';
  }
  function octagon(cx, cy, r) {
    var p = [], i, a;
    for (i = 0; i < 8; i++) { a = (Math.PI / 4) * i + Math.PI / 8; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return '<polygon points="' + pts(p) + '"/>';
  }
  function archPath(x, y, w, drop) {
    var apex = y - w * Math.sqrt(3) / 2;
    return 'M' + n1(x) + ' ' + n1(y + (drop || 0)) + ' L' + n1(x) + ' ' + n1(y)
      + ' A' + n1(w) + ' ' + n1(w) + ' 0 0 1 ' + n1(x + w / 2) + ' ' + n1(apex)
      + ' A' + n1(w) + ' ' + n1(w) + ' 0 0 1 ' + n1(x + w) + ' ' + n1(y)
      + ' L' + n1(x + w) + ' ' + n1(y + (drop || 0));
  }
  function archApexY(y, w) { return y - w * Math.sqrt(3) / 2; }
  function archBeads(x, y, w, count, inset) {
    var out = [], i, t, ang, r = w - (inset || 0);
    for (i = 0; i <= count; i++) {
      t = i / count;
      if (t <= 0.5) { ang = Math.PI + (t * 2) * (Math.PI / 3); out.push([x + w + r * Math.cos(ang), y + r * Math.sin(ang)]); }
      else { ang = (5 * Math.PI / 3) + ((t - 0.5) * 2) * (Math.PI / 3); out.push([x + r * Math.cos(ang), y + r * Math.sin(ang)]); }
    }
    return out;
  }
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.5;
    var v = parseInt(m[1], 16);
    return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255;
  }
  function accOn(p) {
    if (p.motifAcc) return p.motifAcc;
    if (!p.band) return p.accent;
    return Math.abs(lum(p.accent) - lum(p.band)) < 0.20 ? (p.bandInk || '#fff') : p.accent;
  }
  function shade(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var v = parseInt(m[1], 16);
    var r = Math.max(0, ((v >> 16) & 255) - 26), g = Math.max(0, ((v >> 8) & 255) - 26), b = Math.max(0, (v & 255) - 26);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function rgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var v = parseInt(m[1], 16);
    return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
  }

  /* ---------- الزخارف ---------- */
  var MOTIF = {};

  MOTIF.palm = function (p, w, h) {
    var c = p.motif, a = p.accent, s = '', i;
    var cx = w / 2, crown = h * 0.245, ground = h * 0.440;
    for (i = 0; i < 6; i++) {
      s += '<circle cx="' + n1(cx) + '" cy="' + n1(crown + 30) + '" r="' + (155 + i * 84) + '" fill="none" stroke="' + c + '" stroke-width="2.5"/>';
    }
    var tT = 14, tB = 27, midY = crown + (ground - crown) * 0.55;
    s += '<path d="M' + n1(cx - tT) + ' ' + n1(crown)
      + ' C' + n1(cx - tT - 7) + ' ' + n1(midY) + ' ' + n1(cx - tB + 5) + ' ' + n1(ground - 60) + ' ' + n1(cx - tB) + ' ' + n1(ground)
      + ' L' + n1(cx + tB) + ' ' + n1(ground)
      + ' C' + n1(cx + tB - 5) + ' ' + n1(ground - 60) + ' ' + n1(cx + tT + 7) + ' ' + n1(midY) + ' ' + n1(cx + tT) + ' ' + n1(crown)
      + ' Z" fill="' + c + '"/>';
    s += '<g stroke="' + a + '" stroke-width="2" opacity=".22" fill="none">';
    for (i = 1; i < 9; i++) {
      var ty = crown + (ground - crown) * (i / 9), tw = tT + (tB - tT) * (i / 9);
      s += '<path d="M' + n1(cx - tw) + ' ' + n1(ty) + ' L' + n1(cx) + ' ' + n1(ty + 9) + ' L' + n1(cx + tw) + ' ' + n1(ty) + '"/>';
    }
    s += '</g>';
    function frond(t, scale, fill, op) {
      var ang = (198 + t * 144) * Math.PI / 180, edge = Math.abs(t - 0.5) * 2;
      var L = (215 + edge * 135) * scale, droop = (26 + edge * 96) * scale;
      var tipx = cx + L * Math.cos(ang), tipy = crown + L * Math.sin(ang) + droop;
      var c1x = cx + L * 0.55 * Math.cos(ang), c1y = crown + L * 0.55 * Math.sin(ang) - 38 * scale;
      var dx = tipx - cx, dy = tipy - crown, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len, wd = (46 - edge * 10) * scale;
      return '<path d="M' + n1(cx) + ' ' + n1(crown) + ' Q' + n1(c1x) + ' ' + n1(c1y) + ' ' + n1(tipx) + ' ' + n1(tipy)
        + ' Q' + n1(c1x + nx * wd) + ' ' + n1(c1y + ny * wd) + ' ' + n1(cx) + ' ' + n1(crown) + ' Z" fill="' + fill + '" opacity="' + op + '"/>'
        + '<path d="M' + n1(cx) + ' ' + n1(crown) + ' Q' + n1(c1x + nx * wd * 0.5) + ' ' + n1(c1y + ny * wd * 0.5) + ' ' + n1(tipx) + ' ' + n1(tipy)
        + '" fill="none" stroke="' + a + '" stroke-width="1.6" opacity=".28"/>';
    }
    for (i = 0; i < 9; i++) s += frond(i / 8, 1.16, c, '.55');
    for (i = 0; i < 13; i++) s += frond(i / 12, 1.0, c, '1');
    s += '<g fill="' + a + '" opacity=".9">';
    [[-46, 40], [-26, 56], [-8, 68], [8, 68], [26, 56], [46, 40], [-34, 74], [34, 74], [0, 86]].forEach(function (d) {
      s += '<circle cx="' + n1(cx + d[0]) + '" cy="' + n1(crown + d[1]) + '" r="8"/>';
    });
    s += '</g>';
    s += '<ellipse cx="' + n1(cx) + '" cy="' + n1(ground + 6) + '" rx="86" ry="10" fill="' + c + '"/>';
    s += '<g fill="' + a + '">' + star8(cx, h * 0.108, 28, .42) + '</g>';
    return s;
  };

  MOTIF.sadu = function (p, w, h) {
    var ink = p.bandInk || '#fff', acc = accOn(p), s = '', i, x;
    var m = 64, iw = w - m * 2;
    var rows = [
      { k: 'solid', hh: 10 }, { k: 'gap', hh: 16 }, { k: 'tri', hh: 52 }, { k: 'gap', hh: 14 },
      { k: 'diamond', hh: 60 }, { k: 'gap', hh: 14 }, { k: 'triDown', hh: 52 }, { k: 'gap', hh: 16 },
      { k: 'zigzag', hh: 38 }, { k: 'gap', hh: 16 }, { k: 'solid', hh: 10 }
    ];
    var total = rows.reduce(function (t, r) { return t + r.hh; }, 0);
    var y = (h - total) / 2, step = 60, n = Math.floor(iw / step), x0 = m + (iw - n * step) / 2;
    rows.forEach(function (r) {
      if (r.k === 'gap') { y += r.hh; return; }
      if (r.k === 'solid') { s += '<rect x="' + n1(m) + '" y="' + n1(y) + '" width="' + n1(iw) + '" height="' + r.hh + '" fill="' + ink + '" opacity=".6"/>'; y += r.hh; return; }
      if (r.k === 'zigzag') {
        var d = 'M' + n1(x0) + ' ' + n1(y + r.hh);
        for (i = 0; i < n; i++) d += ' L' + n1(x0 + i * step + step / 2) + ' ' + n1(y) + ' L' + n1(x0 + (i + 1) * step) + ' ' + n1(y + r.hh);
        s += '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-width="5" opacity=".7"/>'; y += r.hh; return;
      }
      for (i = 0; i < n; i++) {
        x = x0 + i * step;
        var op = (i % 2 === 0) ? '.9' : '.42';
        if (r.k === 'tri') s += '<polygon points="' + pts([[x + 3, y + r.hh], [x + step / 2, y], [x + step - 3, y + r.hh]]) + '" fill="' + ink + '" opacity="' + op + '"/>';
        else if (r.k === 'triDown') s += '<polygon points="' + pts([[x + 3, y], [x + step / 2, y + r.hh], [x + step - 3, y]]) + '" fill="' + ink + '" opacity="' + op + '"/>';
        else {
          var cy = y + r.hh / 2;
          s += '<polygon points="' + pts([[x + step / 2, y], [x + step - 4, cy], [x + step / 2, y + r.hh], [x + 4, cy]]) + '" fill="none" stroke="' + ink + '" stroke-width="4" opacity=".85"/>';
          s += '<circle cx="' + n1(x + step / 2) + '" cy="' + n1(cy) + '" r="6" fill="' + acc + '"/>';
        }
      }
      y += r.hh;
    });
    return s;
  };

  MOTIF.najdi = function (p, w, h, uid) {
    var c = p.motif, a = p.accent, s = '', i;
    var cx = w / 2, ground = h * 0.452;
    s += '<defs><linearGradient id="wg' + uid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + c + '" stop-opacity="1"/><stop offset="1" stop-color="' + c + '" stop-opacity=".42"/></linearGradient>'
      + '<linearGradient id="wh' + uid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + c + '" stop-opacity=".9"/><stop offset="1" stop-color="' + c + '" stop-opacity=".55"/></linearGradient></defs>';
    function crenels(x1, x2, y, size) {
      var out = '', span = x2 - x1, n = Math.max(3, Math.round(span / (size * 1.32))), st = span / n;
      for (var k = 0; k < n; k++) {
        var x = x1 + k * st;
        out += '<polygon points="' + pts([[x + 3, y], [x + st / 2, y - size], [x + st - 3, y]]) + '" fill="' + c + '"/>';
        out += '<polygon points="' + pts([[x + 3, y], [x + st / 2, y - size], [x + st - 3, y]]) + '" fill="none" stroke="' + a + '" stroke-width="2" opacity=".5"/>';
      }
      return out;
    }
    function wall(xb, xt, yTop, yBot, grad) {
      return '<path d="M' + n1(xb) + ' ' + n1(yBot) + ' L' + n1(xt) + ' ' + n1(yTop)
        + ' L' + n1(w - xt) + ' ' + n1(yTop) + ' L' + n1(w - xb) + ' ' + n1(yBot) + ' Z" fill="url(#' + grad + ')"/>';
    }
    var loBot = ground, loTop = h * 0.252, loXb = w * 0.135, loXt = w * 0.158;
    var upBot = loTop, upTop = h * 0.152, upXb = w * 0.352, upXt = w * 0.368;
    s += wall(loXb, loXt, loTop, loBot, 'wg' + uid);
    s += '<rect x="' + n1(loXt) + '" y="' + n1(loTop) + '" width="' + n1(w - 2 * loXt) + '" height="4" fill="' + a + '" opacity=".5"/>';
    s += crenels(loXt, w - loXt, loTop, 58);
    s += wall(upXb, upXt, upTop, upBot, 'wh' + uid);
    s += '<rect x="' + n1(upXt) + '" y="' + n1(upTop) + '" width="' + n1(w - 2 * upXt) + '" height="4" fill="' + a + '" opacity=".6"/>';
    s += crenels(upXt, w - upXt, upTop, 46);
    s += '<g fill="' + a + '" opacity=".24">';
    for (i = 1; i < 7; i++) {
      var ty = loTop + ((loBot - loTop) / 7) * i, k2 = (ty - loTop) / (loBot - loTop);
      var x1 = loXt + (loXb - loXt) * k2;
      s += '<rect x="' + n1(x1) + '" y="' + n1(ty) + '" width="' + n1(w - 2 * x1) + '" height="2"/>';
    }
    s += '</g>';
    s += '<g fill="none" stroke="' + a + '" stroke-width="4.5" opacity=".85">';
    [[-3, 0], [-2, 0], [2, 0], [3, 0], [-3, 1], [-2, 1], [2, 1], [3, 1]].forEach(function (d) {
      var px = cx + d[0] * 116, py = loTop + 108 + d[1] * 112;
      s += '<polygon points="' + pts([[px - 31, py + 36], [px, py - 38], [px + 31, py + 36]]) + '"/>';
    });
    [[-1, 0], [0, 0], [1, 0]].forEach(function (d) {
      var px = cx + d[0] * 104, py = upTop + 62;
      s += '<polygon points="' + pts([[px - 26, py + 30], [px, py - 32], [px + 26, py + 30]]) + '"/>';
    });
    s += '</g>';
    var dw = 96, dh = 138;
    var door = 'M' + n1(cx - dw / 2) + ' ' + n1(loBot) + ' V' + n1(loBot - dh + 40)
      + ' L' + n1(cx) + ' ' + n1(loBot - dh) + ' L' + n1(cx + dw / 2) + ' ' + n1(loBot - dh + 40) + ' V' + n1(loBot);
    s += '<path d="' + door + ' Z" fill="' + a + '" opacity=".30"/>';
    s += '<path d="' + door + '" fill="none" stroke="' + a + '" stroke-width="5"/>';
    s += '<rect x="' + n1(w * 0.09) + '" y="' + n1(loBot) + '" width="' + n1(w * 0.82) + '" height="8" fill="' + a + '" opacity=".85"/>';
    s += '<rect x="' + n1(w * 0.15) + '" y="' + n1(loBot + 26) + '" width="' + n1(w * 0.70) + '" height="4" fill="' + a + '" opacity=".4"/>';
    return s;
  };

  MOTIF.najdiWindow = function (p, w, h) {
    var ink = p.bandInk || '#fff', acc = accOn(p), s = '', r, q;
    var stepX = 104, stepY = 100, rows = Math.max(2, Math.round((h - 80) / stepY));
    var cols = Math.ceil(w / stepX) + 2, y0 = (h - rows * stepY) / 2 + stepY / 2;
    for (r = 0; r < rows; r++) {
      for (q = -1; q <= cols; q++) {
        var cx = q * stepX + stepX / 2 - ((cols * stepX - w) / 2), cy = y0 + r * stepY;
        var up = (r + q) % 2 === 0;
        var t = up ? [[cx - 42, cy + 38], [cx, cy - 42], [cx + 42, cy + 38]]
                   : [[cx - 42, cy - 42], [cx, cy + 38], [cx + 42, cy - 42]];
        s += '<polygon points="' + pts(t) + '" fill="' + ink + '" opacity="' + (up ? '.26' : '.12') + '"/>';
        s += '<polygon points="' + pts(t) + '" fill="none" stroke="' + ink + '" stroke-width="3" opacity=".75"/>';
        if (up) s += '<circle cx="' + n1(cx) + '" cy="' + n1(cy + 12) + '" r="7" fill="' + acc + '" opacity=".95"/>';
      }
    }
    return s;
  };

  MOTIF.crescent = function (p, w, h, uid) {
    var a = p.accent, c = p.motif, s = '', i;
    var cx = w * 0.50, cy = h * 0.262, R = 190;
    s += '<defs><mask id="cm' + uid + '"><rect width="' + w + '" height="' + h + '" fill="#000"/>'
      + '<circle cx="' + n1(cx) + '" cy="' + n1(cy) + '" r="' + R + '" fill="#fff"/>'
      + '<circle cx="' + n1(cx + 86) + '" cy="' + n1(cy - 54) + '" r="' + (R - 24) + '" fill="#000"/></mask></defs>';
    s += '<rect width="' + w + '" height="' + h + '" fill="' + a + '" mask="url(#cm' + uid + ')"/>';
    var stars = [[218, 226, 19], [842, 268, 15], [162, 470, 12], [906, 508, 17], [318, 148, 10],
      [706, 152, 11], [946, 380, 10], [136, 330, 9], [400, 560, 9], [676, 592, 11]];
    s += '<g fill="' + a + '" opacity=".9">';
    stars.forEach(function (t) { s += star8(t[0], t[1] * (h / 1350), t[2], .40); });
    s += '</g>';
    var n = 7, base = h * 0.487, aw = (w - 110) / n;
    s += '<g fill="none" stroke="' + c + '" stroke-width="4.5">';
    for (i = 0; i < n; i++) s += '<path d="' + archPath(55 + i * aw, base, aw, 62) + '"/>';
    s += '</g>';
    s += '<rect x="' + n1(w * 0.035) + '" y="' + n1(base + 62) + '" width="' + n1(w * 0.93) + '" height="5" fill="' + c + '"/>';
    return s;
  };

  function girihGrid(p, w, h, o) {
    o = o || {};
    var ink = o.ink || p.bandInk || '#fff', acc = o.acc || accOn(p);
    var step = o.step || 150, s = '', r, q;
    var rows = Math.max(2, Math.round(h / step)), cols = Math.ceil(w / step) + 2;
    var y0 = (h - (rows - 1) * step) / 2;
    for (r = 0; r < rows; r++) {
      for (q = -1; q <= cols; q++) {
        var cx = q * step + step / 2 - ((cols * step - w) / 2) + (r % 2 ? step / 2 : 0), cy = y0 + r * step;
        s += '<g fill="none" stroke="' + ink + '" stroke-width="3" opacity="' + (o.op || '.55') + '">';
        s += star8(cx, cy, step * 0.44, .44) + octagon(cx, cy, step * 0.19);
        s += '</g><circle cx="' + n1(cx) + '" cy="' + n1(cy) + '" r="6" fill="' + acc + '" opacity=".85"/>';
      }
    }
    return s;
  }

  MOTIF.girih = function (p, w, h) {
    var s = girihGrid(p, w, h, { step: 152, op: '.42' });
    var ink = p.bandInk || '#fff', a = accOn(p);
    [[236, 1.0], [844, 0.86]].forEach(function (t) {
      var x = t[0], k = t[1], y = h * 0.50, bw = 84 * k, bh = 104 * k;
      s += '<g stroke="' + a + '" fill="none" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">';
      s += '<path d="M' + n1(x) + ' 0 V' + n1(y - bh / 2 - 74 * k) + '"/>';
      s += '<circle cx="' + n1(x) + '" cy="' + n1(y - bh / 2 - 66 * k) + '" r="' + n1(9 * k) + '" fill="' + a + '"/>';
      s += '<path d="M' + n1(x - 30 * k) + ' ' + n1(y - bh / 2 - 40 * k) + ' H' + n1(x + 30 * k) + '"/>';
      s += '<path d="M' + n1(x - 30 * k) + ' ' + n1(y - bh / 2 - 40 * k) + ' L' + n1(x - bw / 2) + ' ' + n1(y - bh / 2)
        + ' H' + n1(x + bw / 2) + ' L' + n1(x + 30 * k) + ' ' + n1(y - bh / 2 - 40 * k) + '"/>';
      s += '<rect x="' + n1(x - bw / 2) + '" y="' + n1(y - bh / 2) + '" width="' + n1(bw) + '" height="' + n1(bh) + '" rx="' + n1(10 * k) + '" fill="' + ink + '" opacity=".18"/>';
      s += '<rect x="' + n1(x - bw / 2) + '" y="' + n1(y - bh / 2) + '" width="' + n1(bw) + '" height="' + n1(bh) + '" rx="' + n1(10 * k) + '"/>';
      s += '<path d="M' + n1(x - bw / 2 + 12 * k) + ' ' + n1(y - bh / 2) + ' V' + n1(y + bh / 2) + '" opacity=".55"/>';
      s += '<path d="M' + n1(x + bw / 2 - 12 * k) + ' ' + n1(y - bh / 2) + ' V' + n1(y + bh / 2) + '" opacity=".55"/>';
      s += '<path d="M' + n1(x - bw / 2) + ' ' + n1(y + bh / 2) + ' L' + n1(x - 26 * k) + ' ' + n1(y + bh / 2 + 30 * k)
        + ' H' + n1(x + 26 * k) + ' L' + n1(x + bw / 2) + ' ' + n1(y + bh / 2) + '"/>';
      s += '<path d="M' + n1(x) + ' ' + n1(y + bh / 2 + 30 * k) + ' v' + n1(20 * k) + '"/>';
      s += '<circle cx="' + n1(x) + '" cy="' + n1(y + bh / 2 + 60 * k) + '" r="' + n1(9 * k) + '" fill="' + a + '"/>';
      s += '</g>';
    });
    return s;
  };
  MOTIF.girihSand = function (p, w, h) { return girihGrid(p, w, h, { step: 168, op: '.5' }); };

  MOTIF.arch = function (p, w, h) {
    var a = p.accent, c = p.motif, s = '';
    var aw = 440, ax = (w - aw) / 2, ay = h * 0.430, apex = archApexY(ay, aw);
    s += '<path d="' + archPath(ax, ay, aw, 0) + '" fill="' + c + '" opacity=".55"/>';
    s += '<path d="' + archPath(ax, ay, aw, 0) + '" fill="none" stroke="' + a + '" stroke-width="6"/>';
    s += '<path d="' + archPath(ax + 40, ay, aw - 80, 0) + '" fill="none" stroke="' + a + '" stroke-width="3" opacity=".55"/>';
    s += '<g fill="' + a + '" opacity=".8">';
    archBeads(ax, ay, aw, 22, -26).forEach(function (b, i) { if (i % 2 === 0) s += '<circle cx="' + n1(b[0]) + '" cy="' + n1(b[1]) + '" r="5.5"/>'; });
    s += '</g>';
    s += '<g fill="' + a + '">' + star8(w / 2, apex - 66, 32, .42) + '</g>';
    [ax - 44, ax + aw + 22].forEach(function (x) {
      s += '<rect x="' + n1(x) + '" y="' + n1(ay - 26) + '" width="22" height="' + n1(h * 0.112) + '" rx="4" fill="' + a + '" opacity=".5"/>';
      s += '<rect x="' + n1(x - 9) + '" y="' + n1(ay - 44) + '" width="40" height="16" rx="5" fill="' + a + '" opacity=".62"/>';
    });
    s += '<rect x="' + n1(w * 0.14) + '" y="' + n1(ay + h * 0.092) + '" width="' + n1(w * 0.72) + '" height="5" fill="' + a + '" opacity=".55"/>';
    return s;
  };

  MOTIF.mashrabiya = function (p, w, h) {
    var ink = p.motif, acc = accOn(p), s = '', r, q;
    var step = 122, rows = Math.max(2, Math.round(h / step)), cols = Math.ceil(w / step) + 2;
    var y0 = (h - (rows - 1) * step) / 2;
    for (r = 0; r < rows; r++) {
      for (q = -1; q <= cols; q++) {
        var cx = q * step + step / 2 - ((cols * step - w) / 2), cy = y0 + r * step;
        s += '<g fill="none" stroke="' + ink + '" stroke-width="4">' + octagon(cx, cy, step * 0.47) + '</g>';
        s += '<g fill="' + acc + '" opacity=".38">' + star8(cx, cy, step * 0.19, .45) + '</g>';
        s += '<g fill="none" stroke="' + acc + '" stroke-width="2.5" opacity=".85">' + star8(cx, cy, step * 0.19, .45) + '</g>';
      }
    }
    return s;
  };

  MOTIF.arches = function (p, w, h) {
    var a = p.accent, c = p.motif, s = '';
    var base = h * 0.436, cx = w / 2, cw = 286, sw = 196, gap = 26;
    var arcs = [{ x: cx - cw / 2, w: cw, main: true }, { x: cx - cw / 2 - gap - sw, w: sw }, { x: cx + cw / 2 + gap, w: sw }];
    s += '<path d="' + archPath(arcs[0].x, base, arcs[0].w, 0) + '" fill="' + c + '" opacity=".55"/>';
    arcs.forEach(function (r) {
      s += '<path d="' + archPath(r.x, base, r.w, 0) + '" fill="none" stroke="' + a + '" stroke-width="' + (r.main ? 6 : 4.5) + '" opacity="' + (r.main ? '1' : '.85') + '"/>';
      s += '<path d="' + archPath(r.x + 24, base, r.w - 48, 0) + '" fill="none" stroke="' + a + '" stroke-width="2.5" opacity=".45"/>';
    });
    s += '<g fill="' + a + '" opacity=".8">';
    archBeads(arcs[0].x, base, arcs[0].w, 18, -22).forEach(function (b, i) { if (i % 2 === 0) s += '<circle cx="' + n1(b[0]) + '" cy="' + n1(b[1]) + '" r="5"/>'; });
    s += '</g>';
    var apex = archApexY(base, cw);
    s += '<path d="M' + n1(cx - 52) + ' ' + n1(apex - 26) + ' A52 46 0 0 1 ' + n1(cx + 52) + ' ' + n1(apex - 26) + ' Z" fill="none" stroke="' + a + '" stroke-width="5"/>';
    s += '<path d="M' + n1(cx) + ' ' + n1(apex - 72) + ' v-34" stroke="' + a + '" stroke-width="5" fill="none"/>';
    s += '<g fill="' + a + '">' + star8(cx, apex - 126, 22, .42) + '</g>';
    [cx - cw / 2 - gap / 2, cx + cw / 2 + gap / 2].forEach(function (x) {
      s += '<rect x="' + n1(x - 6) + '" y="' + n1(base - 8) + '" width="12" height="' + n1(h * 0.05) + '" fill="' + a + '" opacity=".55"/>';
    });
    s += '<rect x="' + n1(cx - (cw / 2 + gap + sw) - 30) + '" y="' + n1(base) + '" width="' + n1(cw + 2 * gap + 2 * sw + 60) + '" height="7" fill="' + a + '" opacity=".9"/>';
    s += '<rect x="' + n1(cx - (cw / 2 + gap + sw) - 8) + '" y="' + n1(base + 24) + '" width="' + n1(cw + 2 * gap + 2 * sw + 16) + '" height="4" fill="' + a + '" opacity=".45"/>';
    s += '<g fill="' + a + '" opacity=".8">';
    [[132, .175, 16], [948, .175, 16], [100, .30, 11], [980, .30, 11], [212, .085, 10], [868, .085, 10]]
      .forEach(function (t) { s += star8(t[0], h * t[1], t[2], .42); });
    s += '</g>';
    return s;
  };

  /* ---------- الشعار ---------- */
  var DEFAULT_MARK = {
    viewBox: '0 0 12 12', transform: 'translate(-0.65 0.34)', stroke_width: 2,
    paths: [{ d: 'M11 0.9 6.8 5.1', stroke: 'ACCENT' }, { d: 'M5.74 6.16 2.6 9.3H9.9l1.1 1.1', stroke: 'INK' }]
  };
  function markGroup(brand, ink, accent, x, y, size) {
    var m = (brand && brand.mark) || DEFAULT_MARK;
    var k = size / 12;
    var paths = m.paths.map(function (pp) {
      var col = pp.stroke === 'ACCENT' ? accent : (pp.stroke === 'INK' ? ink : pp.stroke);
      return '<path d="' + pp.d + '" stroke="' + col + '"/>';
    }).join('');
    return '<g transform="translate(' + n1(x) + ' ' + n1(y) + ') scale(' + n1(k) + ')">'
      + '<g fill="none" stroke-width="' + m.stroke_width + '" stroke-linecap="butt" stroke-linejoin="round"'
      + (m.transform ? ' transform="' + m.transform + '"' : '') + '>' + paths + '</g></g>';
  }

  /* ---------- بناء البطاقة ---------- */
  /* تقدير عرض النص عند غياب أداة قياس حقيقية (المتصفح يقيس بدقة) */
  function estimateWidth(text, size) { return String(text).length * size * 0.50; }

  /**
   * build(design, opts)
   *   design : عنصر من CARD_DESIGNS
   *   opts   : { lang, to, brand, measure, uid }
   *     to      : اسم الجهة المستقبِلة (اختياري) — يظهر كسطر «إلى السادة …»
   *     measure : function(text, cssFont) -> px  (يوفّرها المتصفح لضبط المقاسات)
   */
  function build(design, opts) {
    opts = opts || {};
    var lang = opts.lang === 'en' ? 'en' : 'ar';
    var rtl = lang === 'ar';
    var brand = opts.brand || {};
    var uid = opts.uid || 'a';
    var p = design.pal, accent = p.accent, ink = p.ink;
    var C = design[lang] || design.ar;

    var dir = rtl ? 'rtl' : 'ltr';
    var ax = rtl ? W - PAD : PAD;                 /* نقطة ارتساء بداية السطر */
    var farX = rtl ? PAD : W - PAD;               /* الطرف المقابل */
    var anchor = 'start';
    var headFam = { kufi: 'CardKufi', ruqaa: 'CardRuqaa', naskh: 'CardNaskh' }[design.headFont] || 'CardKufi';
    if (lang === 'en') headFam = 'CardSansL';

    var headSize = lang === 'en' ? 74 : ({ kufi: 94, ruqaa: 118, naskh: 104 }[design.headFont] || 94);
    var headLh = lang === 'en' ? 1.22 : ({ kufi: 1.36, ruqaa: 1.58, naskh: 1.44 }[design.headFont] || 1.4);

    var measure = opts.measure || function (t, size) { return estimateWidth(t, size); };

    /* ---- التخطيط من الأسفل إلى الأعلى ---- */
    var y = H - 72;
    var brandTop = y - 80;
    var sepY = brandTop - 30;

    var wishLines = (C.wish || '').split('\n').filter(Boolean);
    var wishLh = 60;
    var wishTop = sepY - 54 - wishLines.length * wishLh;
    var ruleY = wishTop - 36;
    var subLines = C.sub ? [C.sub] : [];
    var subLh = 62;
    var subTop = ruleY - 36 - subLines.length * subLh;
    var headLines = (C.head || '').split('\n').filter(Boolean);
    var headTop = subTop - (subLines.length ? 6 : 0) - headLines.length * headSize * headLh;
    var toY = headTop - 46;
    var textTop = opts.to ? toY - 52 : headTop - 30;   /* أعلى كتلة النص */

    var band = design.template === 'band';
    var motifH = band ? BAND_H : H;
    var motifFn = MOTIF[design.motif] || function () { return ''; };

    var out = '';
    out += '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    out += '<defs>';
    out += '<linearGradient id="bg' + uid + '" x1="0.5" y1="0" x2="0.5" y2="1">'
      + '<stop offset="0" stop-color="' + p.bg + '"/><stop offset="1" stop-color="' + p.deep + '"/></linearGradient>';
    if (!band) {
      out += '<linearGradient id="fd' + uid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0.42" stop-color="#fff"/><stop offset="0.50" stop-color="#808080"/><stop offset="0.57" stop-color="#000"/></linearGradient>'
        + '<mask id="fm' + uid + '"><rect width="' + W + '" height="' + H + '" fill="url(#fd' + uid + ')"/></mask>'
        + '<linearGradient id="sc' + uid + '" x1="0" y1="0" x2="0" y2="1">'
        + '<stop offset="0" stop-color="' + p.deep + '" stop-opacity="0"/>'
        + '<stop offset="0.34" stop-color="' + p.deep + '" stop-opacity="0.58"/>'
        + '<stop offset="1" stop-color="' + p.deep + '" stop-opacity="0.80"/></linearGradient>';
    } else {
      out += '<linearGradient id="bd' + uid + '" x1="0" y1="0" x2="1" y2="1">'
        + '<stop offset="0" stop-color="' + p.band + '"/><stop offset="1" stop-color="' + shade(p.band) + '"/></linearGradient>';
    }
    out += '</defs>';

    /* الخلفية والزخرفة */
    if (band) {
      out += '<rect width="' + W + '" height="' + H + '" fill="' + p.bg + '"/>';
      out += '<rect width="' + W + '" height="' + BAND_H + '" fill="url(#bd' + uid + ')"/>';
      out += '<svg x="0" y="0" width="' + W + '" height="' + BAND_H + '" viewBox="0 0 ' + W + ' ' + BAND_H + '">'
        + motifFn(p, W, BAND_H, uid) + '</svg>';
      out += '<rect y="' + BAND_H + '" width="' + W + '" height="9" fill="' + accent + '"/>';
    } else {
      out += '<rect width="' + W + '" height="' + H + '" fill="url(#bg' + uid + ')"/>';
      out += '<g mask="url(#fm' + uid + ')">' + motifFn(p, W, H, uid) + '</g>';
      out += '<rect y="' + n1(Math.max(0, textTop - 150)) + '" width="' + W + '" height="' + n1(H - Math.max(0, textTop - 150)) + '" fill="url(#sc' + uid + ')"/>';
      /* أركان زخرفية */
      out += '<path d="M' + (W - 36) + ' 132 V54 a18 18 0 0 0 -18 -18 H' + (W - 132) + '" fill="none" stroke="' + accent + '" stroke-width="3" opacity=".45"/>';
      out += '<path d="M36 ' + (H - 132) + ' V' + (H - 54) + ' a18 18 0 0 0 18 18 H132" fill="none" stroke="' + accent + '" stroke-width="3" opacity=".45"/>';
    }

    /* السطر العلوي: اسم المناسبة والتاريخ */
    var eyebrow = (C.label !== C.head && C.label !== C.sub) ? C.label : (C.date || null);
    var topY = band ? BAND_H + 118 : PAD + 42;
    if (eyebrow) {
      out += txt(eyebrow, ax, topY, 30, 'CardSans', 700, accent, dir, anchor, '.09em');
    }
    if (!band && C.date && eyebrow !== C.date) {
      out += txt(C.date, farX, topY, 28, 'CardSans', 700, accent, dir, rtl ? 'end' : 'end', '.12em');
    }

    /* سطر الجهة المستقبِلة */
    if (opts.to) {
      var toText = (lang === 'en' ? 'To ' : 'إلى السادة/ ') + opts.to + (lang === 'en' ? '' : ' المحترمين');
      var toSize = 34;
      var avail = W - PAD * 2;
      var mw = measure(toText, toSize);
      while (mw > avail && toSize > 22) { toSize -= 2; mw = measure(toText, toSize); }
      out += txt(toText, ax, toY, toSize, 'CardSans', 500, accent, dir, anchor, 0);
    }

    /* العنوان */
    headLines.forEach(function (line, i) {
      out += txt(line, ax, headTop + (i + 1) * headSize * headLh - headSize * 0.28, headSize, headFam, 700, ink, dir, anchor, 0);
    });
    /* السطر التالي */
    subLines.forEach(function (line, i) {
      out += txt(line, ax, subTop + (i + 1) * subLh - 14, 39, 'CardSans', 500, ink, dir, anchor, 0, '.94');
    });
    /* الفاصل */
    out += '<rect x="' + n1(rtl ? W - PAD - 180 : PAD) + '" y="' + n1(ruleY) + '" width="180" height="4" rx="2" fill="' + accent + '"/>';
    /* نص التهنئة */
    wishLines.forEach(function (line, i) {
      out += txt(line, ax, wishTop + (i + 1) * wishLh - 16, 31, 'CardSans', 400, ink, dir, anchor, 0, '.88');
    });

    /* خط فاصل وكتلة الهوية */
    out += '<rect x="' + PAD + '" y="' + n1(sepY) + '" width="' + (W - PAD * 2) + '" height="2" fill="' + ink + '" opacity=".16"/>';
    var tileS = 80, markS = 44;
    var tileX = rtl ? W - PAD - tileS : PAD;
    out += '<rect x="' + n1(tileX) + '" y="' + n1(brandTop) + '" width="' + tileS + '" height="' + tileS + '" rx="22" fill="' + rgba(accent, .08) + '" stroke="' + rgba(accent, .30) + '" stroke-width="2"/>';
    out += markGroup(brand, ink, accent, tileX + (tileS - markS) / 2, brandTop + (tileS - markS) / 2, markS);
    var txtX = rtl ? tileX - 20 : tileX + tileS + 20;
    var bname = (lang === 'en' && brand.name_en) ? brand.name_en : (brand.name_ar || 'إحراز');
    var btag = (lang === 'en' && brand.tagline_en) ? brand.tagline_en : (brand.tagline_ar || '');
    out += txt(bname, txtX, brandTop + 36, 40, 'CardSans', 800, ink, dir, anchor, 0);
    if (btag && brand.show_tagline !== false) {
      out += txt(btag, txtX, brandTop + 70, 26, 'CardSans', 400, ink, dir, anchor, 0, '.74');
    }

    out += '</svg>';
    return out;
  }

  function txt(s, x, y, size, fam, weight, fill, dir, anchor, ls, op) {
    return '<text x="' + n1(x) + '" y="' + n1(y) + '"'
      + ' font-family="' + fam + ',CardSans,CardSansL,sans-serif" font-size="' + size + '" font-weight="' + weight + '"'
      + ' fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '')
      + ' direction="' + dir + '" text-anchor="' + anchor + '"'
      + (ls ? ' letter-spacing="' + ls + '"' : '')
      + ' xml:space="preserve">' + esc(s) + '</text>';
  }

  /* كتلة @font-face تُحقن داخل الـ SVG قبل التحويل إلى صورة */
  function fontCss(b64) {
    function face(name, data, weight) {
      return data ? '@font-face{font-family:' + name + ';src:url(data:font/woff2;base64,' + data + ') format("woff2");font-weight:' + weight + ';font-style:normal}' : '';
    }
    return face('CardKufi', b64.kufi, 700) + face('CardKufi', b64.kufi, 400)
      + face('CardRuqaa', b64.ruqaa, 700) + face('CardRuqaa', b64.ruqaa, 400)
      + face('CardNaskh', b64.naskh, 400) + face('CardNaskh', b64.naskh, 700)
      + face('CardSans', b64.sans400, 400) + face('CardSans', b64.sans500, 500)
      + face('CardSans', b64.sans700, 700) + face('CardSans', b64.sans800, 800)
      + face('CardSansL', b64.sansLatin500, 400) + face('CardSansL', b64.sansLatin500, 500)
      + face('CardSansL', b64.sansLatin700, 700) + face('CardSansL', b64.sansLatin700, 800);
  }
  function withFonts(svg, b64) {
    return svg.replace('<defs>', '<defs><style type="text/css">' + fontCss(b64) + '</style>');
  }

  return {
    W: W, H: H, BAND_H: BAND_H, PAD: PAD,
    MOTIF: MOTIF, build: build, withFonts: withFonts, fontCss: fontCss, esc: esc
  };
}));
