/* =====================================================================
   ZIPW — كاتب ملفات ZIP داخل المتصفح، بلا مكتبات خارجية
   ---------------------------------------------------------------------
   يُستخدم لتجميع رسائل .eml وصور البطاقات وكشف المستلمين في حزمة واحدة.
   يضغط بـ deflate عبر CompressionStream عند توفّره، وإلا يخزّن بلا ضغط
   (كلا الوضعين متوافق مع فكّ الضغط في ويندوز وماك).

   لا دعم لـ ZIP64: الحزمة الواحدة أصغر بكثير من 4 غيغابايت.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZIPW = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- CRC32 ---- */
  var TABLE = (function () {
    var t = new Uint32Array(256), c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  }());
  function crc32(buf) {
    var c = 0xFFFFFFFF, i;
    for (i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function toBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (typeof data === 'string') {
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(data);
      return Uint8Array.from(Buffer.from(data, 'utf8'));
    }
    if (data && data.buffer) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    throw new Error('ZIPW: نوع بيانات غير مدعوم');
  }

  async function deflateRaw(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      var cs = new CompressionStream('deflate-raw');
      var stream = new Blob([bytes]).stream().pipeThrough(cs);
      var buf = await new Response(stream).arrayBuffer();
      var out = new Uint8Array(buf);
      return out.length < bytes.length ? out : null;   /* لا فائدة من ضغط أكبر */
    } catch (e) { return null; }
  }

  function dosTime(d) {
    if (!d) return { t: 0, d: 33 };                    /* 1980-01-01 */
    var y = d.getFullYear();
    if (y < 1980) return { t: 0, d: 33 };
    return {
      t: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      d: (((y - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
    };
  }

  function W(view, off, val, bytes) {
    for (var i = 0; i < bytes; i++) view[off + i] = (val >>> (i * 8)) & 0xFF;
    return off + bytes;
  }

  /**
   * create(files, opts) -> Promise<Blob>
   *   files: [{ name, data }]  — data نص أو Uint8Array
   *   opts:  { date, mime }
   */
  async function create(files, opts) {
    opts = opts || {};
    var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    var dt = dosTime(opts.date);
    var parts = [], central = [], offset = 0, i;

    for (i = 0; i < files.length; i++) {
      var f = files[i];
      var nameBytes = enc ? enc.encode(f.name) : Uint8Array.from(Buffer.from(f.name, 'utf8'));
      var raw = toBytes(f.data);
      var crc = crc32(raw);
      var comp = await deflateRaw(raw);
      var method = comp ? 8 : 0;
      var body = comp || raw;

      var lh = new Uint8Array(30 + nameBytes.length), o = 0;
      o = W(lh, o, 0x04034b50, 4);
      o = W(lh, o, 20, 2);                 /* version needed */
      o = W(lh, o, 0x0800, 2);             /* أسماء الملفات بترميز UTF-8 */
      o = W(lh, o, method, 2);
      o = W(lh, o, dt.t, 2);
      o = W(lh, o, dt.d, 2);
      o = W(lh, o, crc, 4);
      o = W(lh, o, body.length, 4);
      o = W(lh, o, raw.length, 4);
      o = W(lh, o, nameBytes.length, 2);
      o = W(lh, o, 0, 2);
      lh.set(nameBytes, o);
      parts.push(lh, body);

      var ch = new Uint8Array(46 + nameBytes.length), c = 0;
      c = W(ch, c, 0x02014b50, 4);
      c = W(ch, c, 20, 2);                 /* version made by */
      c = W(ch, c, 20, 2);
      c = W(ch, c, 0x0800, 2);
      c = W(ch, c, method, 2);
      c = W(ch, c, dt.t, 2);
      c = W(ch, c, dt.d, 2);
      c = W(ch, c, crc, 4);
      c = W(ch, c, body.length, 4);
      c = W(ch, c, raw.length, 4);
      c = W(ch, c, nameBytes.length, 2);
      c = W(ch, c, 0, 2);                  /* extra */
      c = W(ch, c, 0, 2);                  /* comment */
      c = W(ch, c, 0, 2);                  /* disk */
      c = W(ch, c, 0, 2);                  /* internal attrs */
      c = W(ch, c, 0, 4);                  /* external attrs */
      c = W(ch, c, offset, 4);
      ch.set(nameBytes, c);
      central.push(ch);

      offset += lh.length + body.length;
    }

    var cdSize = central.reduce(function (t, b) { return t + b.length; }, 0);
    var eocd = new Uint8Array(22), e = 0;
    e = W(eocd, e, 0x06054b50, 4);
    e = W(eocd, e, 0, 2);
    e = W(eocd, e, 0, 2);
    e = W(eocd, e, files.length, 2);
    e = W(eocd, e, files.length, 2);
    e = W(eocd, e, cdSize, 4);
    e = W(eocd, e, offset, 4);
    W(eocd, e, 0, 2);

    var all = parts.concat(central, [eocd]);
    if (typeof Blob !== 'undefined') return new Blob(all, { type: opts.mime || 'application/zip' });
    /* في Node: تُعاد Uint8Array واحدة (للاختبارات) */
    var total = all.reduce(function (t, b) { return t + b.length; }, 0);
    var merged = new Uint8Array(total), pos = 0;
    all.forEach(function (b) { merged.set(b, pos); pos += b.length; });
    return merged;
  }

  /* base64 → بايتات (لصور canvas) */
  function b64ToBytes(b64) {
    var bin = (typeof atob !== 'undefined') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    var out = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  return { create: create, crc32: crc32, toBytes: toBytes, b64ToBytes: b64ToBytes };
}));
