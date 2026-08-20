/* =====================================================================
   DOM — أدوات بناء الواجهة (بلا إطار عمل)
   h(tag, attrs, ...children) — attrs: class, id, style, dataset, on:{event:fn}, html (نص HTML موثوق من المكوّنات فقط), أي سمة أخرى
   ===================================================================== */
(function (root) {
  'use strict';

  function h(tag, attrs) {
    var el = document.createElement(tag);
    var children = Array.prototype.slice.call(arguments, 2);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class' || k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value' && 'value' in el) el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'required' || k === 'readOnly') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    append(el, children);
    return el;
  }
  function append(el, ch) {
    if (ch === null || ch === undefined || ch === false) return;
    if (Array.isArray(ch)) { ch.forEach(function (c) { append(el, c); }); return; }
    if (ch instanceof Node) { el.appendChild(ch); return; }
    el.appendChild(document.createTextNode(String(ch)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, sel, fn) {
    if (typeof sel === 'function') { el.addEventListener(ev, sel); return; }
    el.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t && el.contains(t)) fn.call(t, e, t); });
  }
  function frag() { var f = document.createDocumentFragment(); append(f, Array.prototype.slice.call(arguments)); return f; }
  function text(s) { return document.createTextNode(s === null || s === undefined ? '' : String(s)); }
  /* حلقة تركيز داخل عنصر (للنوافذ) */
  function trapFocus(container) {
    function focusables() { return qsa('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', container).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; }); }
    function handler(e) {
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', handler);
    return function () { container.removeEventListener('keydown', handler); };
  }
  function svg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    var children = Array.prototype.slice.call(arguments, 2);
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v === null || v === undefined || v === false) return; if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); else if (k === 'text') el.textContent = v; else el.setAttribute(k, v); });
    append(el, children);
    return el;
  }
  root.DOM = { h: h, svg: svg, append: append, clear: clear, qs: qs, qsa: qsa, on: on, frag: frag, text: text, trapFocus: trapFocus };
})(typeof window !== 'undefined' ? window : globalThis);
