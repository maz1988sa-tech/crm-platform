/* =====================================================================
   EXPORTER — تصدير آمن (CSV / Excel عبر SheetJS المضمّنة محليًا)
   ---------------------------------------------------------------------
   - تحييد حقن الصيغ: أي قيمة تبدأ بـ = + - @ أو تبويب/سطر تُسبق بفاصلة عليا.
   - CSV بترميز UTF-8 مع BOM ليفتحه Excel بالعربية صحيحًا.
   - لا يُصدَّر إلا ما مرّرته الشاشة بعد فحص الصلاحية (export.data) وتسجيل التدقيق.
   ===================================================================== */
(function (root) {
  'use strict';

  function neutralize(v) {
    if (v === null || v === undefined) return '';
    var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^[+\-]?\d[\d.,\s]*%?$/.test(s)) s = "'" + s;
    return s;
  }
  function csvCell(v) {
    var s = neutralize(v);
    if (/[",\n\r;]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  var X = {
    neutralize: neutralize,
    /* columns: [{key,label}] rows: [{}] → نص CSV */
    toCsv: function (columns, rows) {
      var lines = [columns.map(function (c) { return csvCell(c.label); }).join(',')];
      rows.forEach(function (r) { lines.push(columns.map(function (c) { var v = typeof c.get === 'function' ? c.get(r) : r[c.key]; return csvCell(v); }).join(',')); });
      return '﻿' + lines.join('\r\n');
    },
    /* مصفوفة مصفوفات (للـ XLSX) مع التحييد */
    toAoa: function (columns, rows) {
      var aoa = [columns.map(function (c) { return c.label; })];
      rows.forEach(function (r) { aoa.push(columns.map(function (c) { var v = typeof c.get === 'function' ? c.get(r) : r[c.key]; if (typeof v === 'number') return v; return neutralize(v); })); });
      return aoa;
    },
    download: function (filename, content, mime) {
      if (typeof document === 'undefined') return false;
      var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return true;
    },
    downloadCsv: function (filename, columns, rows) { return X.download(filename, X.toCsv(columns, rows), 'text/csv;charset=utf-8'); },
    /* sheets: [{name, columns, rows}] — يتطلب XLSX (SheetJS) المضمّنة محليًا، وإلا يعود إلى CSV للورقة الأولى */
    downloadXlsx: function (filename, sheets) {
      var XLSX = root.XLSX;
      if (!XLSX) { var s0 = sheets[0]; return X.downloadCsv(filename.replace(/\.xlsx$/i, '.csv'), s0.columns, s0.rows); }
      var wb = XLSX.utils.book_new();
      sheets.forEach(function (s) {
        var ws = XLSX.utils.aoa_to_sheet(X.toAoa(s.columns, s.rows));
        ws['!cols'] = s.columns.map(function (c) { return { wch: Math.max(12, Math.min(48, String(c.label).length + 6)) }; });
        XLSX.utils.book_append_sheet(wb, ws, String(s.name || 'Sheet').slice(0, 31));
      });
      var out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return X.download(filename, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    },
    /* قالب استيراد فارغ بعناوين القالب */
    downloadTemplate: function (filename, headers, sampleRow) {
      var cols = headers.map(function (h) { return { key: h, label: h }; });
      return X.downloadXlsx(filename, [{ name: 'Data', columns: cols, rows: sampleRow ? [sampleRow] : [] }]);
    }
  };

  root.EXPORTER = X;
})(typeof window !== 'undefined' ? window : globalThis);
