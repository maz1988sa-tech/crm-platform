/* =====================================================================
   EML — بناء ملف رسالة بريد (.eml) بصورة مضمّنة داخل نص الرسالة
   ---------------------------------------------------------------------
   المنصة لا ترسل بريدًا ولا تتصل بأي مزوّد. هذه الوحدة تُنتج **ملف مسودّة**
   يفتحه الموظف في برنامج البريد لديه ويرسله بنفسه، تمامًا كما يُصدَّر ملف
   Excel اليوم. لا يوجد أي اتصال شبكي هنا.

   البنية:
     multipart/related
       └ multipart/alternative
           ├ text/plain   (نسخة نصية للبرامج التي لا تعرض HTML)
           └ text/html    (النص + <img src="cid:...">)
       └ image/png        (الصورة، Content-ID، inline)

   ملاحظات توافق:
   - X-Unsent: 1 يجعل Outlook يفتح الملف كمسودّة قابلة للإرسال مباشرة.
   - Apple Mail يفتحه كرسالة؛ يُستخدم «تحرير كرسالة جديدة» للإرسال.
   - أسطر الترويسة تُرمَّز بـ RFC 2047 عند وجود حروف غير لاتينية.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EML = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CRLF = '\r\n';

  /* ---- ترميز base64 يعمل في المتصفح وفي Node ---- */
  function utf8ToB64(str) {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    var bytes = new TextEncoder().encode(str), bin = '', i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function wrap76(b64) {
    var out = [], i;
    for (i = 0; i < b64.length; i += 76) out.push(b64.slice(i, i + 76));
    return out.join(CRLF);
  }
  function isAscii(s) { return /^[\x20-\x7E]*$/.test(String(s || '')); }

  /* ترويسة غير لاتينية → =?UTF-8?B?…?= مقسّمة إلى مقاطع آمنة الطول */
  function encodeHeader(value) {
    var s = String(value == null ? '' : value);
    if (isAscii(s)) return s;
    var chunks = [], cur = '', i;
    for (i = 0; i < s.length; i++) {
      var next = cur + s[i];
      if (utf8ToB64(next).length > 60) { chunks.push(cur); cur = s[i]; }
      else cur = next;
    }
    if (cur) chunks.push(cur);
    return chunks.map(function (c) { return '=?UTF-8?B?' + utf8ToB64(c) + '?='; }).join(CRLF + ' ');
  }

  /* عنوان بريد مع اسم عرض */
  function address(email, name) {
    var e = String(email || '').trim();
    if (!name) return e;
    return encodeHeader(name) + ' <' + e + '>';
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* تاريخ بصيغة RFC 5322 — يُمرَّر التاريخ من الخارج */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function rfcDate(d) {
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var ao = Math.abs(off);
    return DAYS[d.getDay()] + ', ' + p2(d.getDate()) + ' ' + MONS[d.getMonth()] + ' ' + d.getFullYear()
      + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds())
      + ' ' + sign + p2(Math.floor(ao / 60)) + p2(ao % 60);
  }

  /**
   * نص HTML قياسي للرسالة: تحية + نص معتمد + الصورة + تذييل.
   * الصورة تُشار بـ cid فتظهر داخل جسم الرسالة لا كمرفق منفصل.
   */
  function defaultHtml(o) {
    var rtl = o.lang !== 'en';
    var dir = rtl ? 'rtl' : 'ltr';
    var align = rtl ? 'right' : 'left';
    var body = String(o.text || '').split('\n').filter(function (l) { return l.trim(); })
      .map(function (l) { return '<p style="margin:0 0 12px">' + escHtml(l) + '</p>'; }).join('');
    return '<!doctype html><html dir="' + dir + '" lang="' + (rtl ? 'ar' : 'en') + '"><head>'
      + '<meta charset="utf-8"><meta name="viewport" content="width=device-width">'
      + '</head><body style="margin:0;padding:0;background:#f4f5f7">'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7">'
      + '<tr><td align="center" style="padding:24px 12px">'
      + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"'
      + ' style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden">'
      + '<tr><td style="padding:28px 28px 8px;direction:' + dir + ';text-align:' + align + ';'
      + 'font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.9;color:#1f2937">'
      + (o.salutation ? '<p style="margin:0 0 12px">' + escHtml(o.salutation) + '</p>' : '')
      + body
      + '</td></tr>'
      + '<tr><td style="padding:12px 28px 8px" align="center">'
      + '<img src="cid:' + escHtml(o.cid) + '" width="544" alt="' + escHtml(o.imageAlt || '') + '"'
      + ' style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:10px"></td></tr>'
      + (o.signature
        ? '<tr><td style="padding:14px 28px 26px;direction:' + dir + ';text-align:' + align + ';'
          + 'font-family:Tahoma,Arial,sans-serif;font-size:13px;line-height:1.8;color:#6b7280;'
          + 'border-top:1px solid #e5e7eb">' + escHtml(o.signature).replace(/\n/g, '<br>') + '</td></tr>'
        : '')
      + '</table></td></tr></table></body></html>';
  }

  function toPlain(o) {
    return [o.salutation || '', String(o.text || ''), '', o.signature || '']
      .filter(function (x) { return x !== null && x !== undefined; }).join('\n').trim() + '\n';
  }

  /**
   * build(opts) -> نص ملف .eml
   * opts:
   *   to        بريد المستلم (مطلوب)
   *   toName    اسم المستلم للعرض
   *   from      بريد المرسِل (اختياري — يتركه فارغًا ليملأه برنامج البريد)
   *   fromName  اسم المرسِل
   *   subject   عنوان الرسالة
   *   text      نص الرسالة المعتمد (أسطر مفصولة بـ \n)
   *   salutation  سطر التحية
   *   signature   سطور التوقيع
   *   image     { base64, mime, name }  الصورة المضمّنة
   *   lang      'ar' | 'en'
   *   date      كائن Date
   *   boundarySeed  نص ثابت لتوليد الحدود (لتكرار النتيجة في الاختبارات)
   */
  function build(opts) {
    var o = opts || {};
    if (!o.to) throw new Error('EML.build: بريد المستلم مطلوب');
    var seed = String(o.boundarySeed || o.to).replace(/[^A-Za-z0-9]/g, '').slice(0, 16) || 'x';
    var bRel = '=_rel_' + seed;
    var bAlt = '=_alt_' + seed;
    var cid = o.cid || ('card.' + seed + '@ihraz.local');
    var img = o.image || null;

    var html = o.html || defaultHtml({
      lang: o.lang, text: o.text, salutation: o.salutation, signature: o.signature,
      cid: cid, imageAlt: o.imageAlt || o.subject
    });
    var plain = o.plain || toPlain(o);

    var L = [];
    L.push('MIME-Version: 1.0');
    if (o.date) L.push('Date: ' + rfcDate(o.date));
    if (o.from) L.push('From: ' + address(o.from, o.fromName));
    L.push('To: ' + address(o.to, o.toName));
    L.push('Subject: ' + encodeHeader(o.subject || ''));
    L.push('X-Unsent: 1');                       /* يفتحه Outlook كمسودّة */
    L.push('Content-Type: multipart/related; type="multipart/alternative"; boundary="' + bRel + '"');
    L.push('');
    L.push('This is a multi-part message in MIME format.');
    L.push('');

    L.push('--' + bRel);
    L.push('Content-Type: multipart/alternative; boundary="' + bAlt + '"');
    L.push('');

    L.push('--' + bAlt);
    L.push('Content-Type: text/plain; charset="UTF-8"');
    L.push('Content-Transfer-Encoding: base64');
    L.push('');
    L.push(wrap76(utf8ToB64(plain)));
    L.push('');

    L.push('--' + bAlt);
    L.push('Content-Type: text/html; charset="UTF-8"');
    L.push('Content-Transfer-Encoding: base64');
    L.push('');
    L.push(wrap76(utf8ToB64(html)));
    L.push('');
    L.push('--' + bAlt + '--');
    L.push('');

    if (img && img.base64) {
      L.push('--' + bRel);
      L.push('Content-Type: ' + (img.mime || 'image/png') + '; name="' + (img.name || 'card.png') + '"');
      L.push('Content-Transfer-Encoding: base64');
      L.push('Content-ID: <' + cid + '>');
      L.push('Content-Disposition: inline; filename="' + (img.name || 'card.png') + '"');
      L.push('');
      L.push(wrap76(img.base64));
      L.push('');
    }

    L.push('--' + bRel + '--');
    L.push('');
    return L.join(CRLF);
  }

  /* اسم ملف آمن على ويندوز وماك */
  function safeName(s, fallback) {
    var out = String(s == null ? '' : s).replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 80);
    return out || (fallback || 'file');
  }

  return {
    build: build, encodeHeader: encodeHeader, address: address,
    rfcDate: rfcDate, safeName: safeName, defaultHtml: defaultHtml, utf8ToB64: utf8ToB64
  };
}));
