/* Pustaka kecil bersama untuk alat dokumen (sampul, surat lamaran): satu model halaman -> pratinjau HTML, cetak PDF, dan berkas Word (.docx).
   Tanpa pustaka luar dan tanpa server: zip "store" ditulis sendiri. Dipakai di browser saja. */
(function (root) {
  "use strict";
  var LOGO_URL = "/ruangakademikut/assets/logo-ut.png";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- zip "store" ---------- */
  var CT = null;
  function crc(b) {
    if (!CT) { CT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; } }
    var x = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) x = CT[(x ^ b[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nb = enc.encode(f.n), c = crc(f.d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, c, true); h.setUint32(18, f.d.length, true); h.setUint32(22, f.d.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, f.d);
      var e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(14, 0x21, true);
      e.setUint32(16, c, true); e.setUint32(20, f.d.length, true); e.setUint32(24, f.d.length, true); e.setUint16(28, nb.length, true); e.setUint32(42, off, true);
      cd.push(new Uint8Array(e.buffer), nb); off += 30 + nb.length + f.d.length;
    });
    var size = 0; cd.forEach(function (x) { size += x.length; });
    var end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- model ----------
     halaman = [blok]; blok:
       {k:"p", t, b, i, u, sz(pt), al:"l|c|r|j", bf, af (pt), color, ind (cm), hang (cm)}
       {k:"br", n}                      baris kosong
       {k:"logo", w (cm)}               logo UT di tengah
       {k:"tbl", rows:[[kiri,kanan]], style:"lines|grid", w:[cm,cm]} */

  var ALIGN = { l: "left", c: "center", r: "right", j: "both" };

  /* ---------- HTML ---------- */
  function lines(t) { return esc(t).replace(/\n/g, "<br>"); }
  function blockHtml(b) {
    if (b.k === "br") { var h = ""; for (var i = 0; i < (b.n || 1); i++) h += '<p class="w-br">&nbsp;</p>'; return h; }
    if (b.k === "logo") return '<p class="w-logo"><img src="' + LOGO_URL + '" alt="Logo Universitas Terbuka" style="width:' + (b.w || 4.5) + 'cm"></p>';
    if (b.k === "tbl") {
      var w = b.w || [6, 9], r = (b.rows || []).map(function (x) { return "<tr><td style=\"width:" + w[0] + "cm\">" + lines(x[0]) + "</td><td>" + lines(x[1]) + "</td></tr>"; }).join("");
      return '<table class="w-tbl ' + (b.style === "grid" ? "grid" : "lines") + '"><tbody>' + r + "</tbody></table>";
    }
    var st = "text-align:" + (ALIGN[b.al || "l"] === "both" ? "justify" : ALIGN[b.al || "l"]) + ";font-size:" + (b.sz || 12) + "pt;margin:" + (b.bf || 0) + "pt 0 " + (b.af == null ? 6 : b.af) + "pt " + (b.ind || 0) + "cm;" +
      (b.b ? "font-weight:700;" : "") + (b.i ? "font-style:italic;" : "") + (b.u ? "text-decoration:underline;" : "") + (b.color ? "color:#" + b.color + ";" : "") + (b.hang ? "text-indent:-" + b.hang + "cm;padding-left:" + b.hang + "cm;" : "");
    return '<p class="w-p" style="' + st + '">' + lines(b.t) + "</p>";
  }
  function html(pages) { return pages.map(function (p) { return '<section class="w-pg">' + p.map(blockHtml).join("") + "</section>"; }).join(""); }

  /* ---------- Word ---------- */
  function xe(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function runs(t, rp) {
    return String(t).split("\n").map(function (ln, i) { return (i ? "<w:r><w:br/></w:r>" : "") + '<w:r><w:rPr>' + rp + '</w:rPr><w:t xml:space="preserve">' + xe(ln) + "</w:t></w:r>"; }).join("");
  }
  function rpr(b) {
    return '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>' + (b.b ? "<w:b/>" : "") + (b.i ? "<w:i/>" : "") + (b.u ? '<w:u w:val="single"/>' : "") + (b.color ? '<w:color w:val="' + b.color + '"/>' : "") + '<w:sz w:val="' + Math.round((b.sz || 12) * 2) + '"/><w:szCs w:val="' + Math.round((b.sz || 12) * 2) + '"/>';
  }
  function tw(cm) { return Math.round(cm * 567); }
  function pXml(b, brk) {
    var pr = (brk ? "<w:pageBreakBefore/>" : "") + '<w:spacing w:before="' + Math.round((b.bf || 0) * 20) + '" w:after="' + Math.round((b.af == null ? 6 : b.af) * 20) + '" w:line="276" w:lineRule="auto"/>' +
      (b.ind || b.hang ? '<w:ind w:left="' + tw((b.ind || 0) + (b.hang || 0)) + '"' + (b.hang ? ' w:hanging="' + tw(b.hang) + '"' : "") + "/>" : "") + '<w:jc w:val="' + ALIGN[b.al || "l"] + '"/>';
    return "<w:p><w:pPr>" + pr + "</w:pPr>" + runs(b.t, rpr(b)) + "</w:p>";
  }
  function logoXml(wCm, brk) {
    var cx = Math.round(wCm * 360000), cy = Math.round(cx * 239 / 318);
    return "<w:p><w:pPr>" + (brk ? "<w:pageBreakBefore/>" : "") + '<w:spacing w:before="0" w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Logo UT"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo-ut.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }
  function tblXml(b) {
    var w = b.w || [6, 9], grid = b.style === "grid", bd = grid
      ? '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="999999"/><w:left w:val="single" w:sz="4" w:color="999999"/><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:right w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/><w:insideV w:val="single" w:sz="4" w:color="999999"/></w:tblBorders>'
      : '<w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="999999"/><w:insideH w:val="single" w:sz="4" w:color="999999"/></w:tblBorders>';
    function cell(t, cm, bold, shade) {
      return '<w:tc><w:tcPr><w:tcW w:w="' + tw(cm) + '" w:type="dxa"/>' + (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : "") + '</w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>' + runs(t, rpr({ sz: 11, b: bold })) + "</w:p></w:tc>";
    }
    return '<w:tbl><w:tblPr><w:tblW w:w="' + tw(w[0] + w[1]) + '" w:type="dxa"/><w:jc w:val="center"/>' + bd + '<w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="' + tw(w[0]) + '"/><w:gridCol w:w="' + tw(w[1]) + '"/></w:tblGrid>' +
      (b.rows || []).map(function (r) { return "<w:tr>" + cell(r[0], w[0], grid, grid) + cell(r[1], w[1], false, false) + "</w:tr>"; }).join("") + "</w:tbl><w:p><w:pPr><w:spacing w:before=\"0\" w:after=\"0\"/></w:pPr></w:p>";
  }
  function hasLogo(pages) { return pages.some(function (p) { return p.some(function (b) { return b.k === "logo"; }); }); }

  function docxBlob(pages, logoBytes, opts) {
    opts = opts || {};
    var body = [];
    pages.forEach(function (pg, pi) {
      var first = true;
      pg.forEach(function (b) {
        var brk = pi > 0 && first; first = false;
        if (b.k === "br") { for (var i = 0; i < (b.n || 1); i++) { body.push('<w:p><w:pPr>' + (brk && i === 0 ? "<w:pageBreakBefore/>" : "") + '<w:spacing w:before="0" w:after="0"/></w:pPr></w:p>'); } return; }
        if (b.k === "logo") return body.push(logoBytes ? logoXml(b.w || 4.5, brk) : pXml({ t: "[TEMPEL LOGO UNIVERSITAS TERBUKA DI SINI]", al: "c", i: true, sz: 11 }, brk));
        if (b.k === "tbl") return body.push(tblXml(b));
        body.push(pXml(b, brk));
      });
    });
    var enc = new TextEncoder(), withLogo = hasLogo(pages) && logoBytes;
    var m = opts.margin || [2.54, 2.54, 2.54, 2.54]; // atas, kanan, bawah, kiri (cm)
    var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>' + body.join("") +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="' + tw(m[0]) + '" w:right="' + tw(m[1]) + '" w:bottom="' + tw(m[2]) + '" w:left="' + tw(m[3]) + '" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var files = [
      { n: "[Content_Types].xml", d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="png" ContentType="image/png"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
      { n: "_rels/.rels", d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
      { n: "word/document.xml", d: enc.encode(doc) }
    ];
    if (withLogo) files.push({ n: "word/_rels/document.xml.rels", d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo-ut.png"/></Relationships>') }, { n: "word/media/logo-ut.png", d: logoBytes });
    return zip(files);
  }

  /* Ambil logo (PNG) dari server sendiri; gagal -> null (dokumen tetap jadi, logo diganti penanda tempel). */
  function loadLogo() {
    return fetch(LOGO_URL).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }).catch(function () { return null; });
  }
  function save(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fileSafe(s, d) { var r = String(s || "").trim().replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, ""); return r || d; }

  /* Gaya pratinjau halaman A4 (satu sumber untuk semua alat dokumen). */
  var CSS = ".w-pgs{display:grid;gap:18px;justify-items:center}" +
    ".w-pg{box-sizing:border-box;width:794px;min-height:1123px;background:#fff;color:#000;padding:96px;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.15;box-shadow:0 2px 14px rgba(0,0,0,.25);border-radius:4px;overflow:hidden}" +
    ".w-p{white-space:normal;word-wrap:break-word}.w-br{margin:0;font-size:12pt;line-height:1.15}.w-logo{text-align:center;margin:4px 0 6px}.w-logo img{height:auto;display:inline-block}" +
    ".w-tbl{border-collapse:collapse;margin:6px auto;font-size:11pt;width:100%}.w-tbl td{padding:3px 6px;vertical-align:top;border-bottom:1px solid #999}.w-tbl.grid td{border:1px solid #999}.w-tbl.grid td:first-child{background:#f2f2f2;font-weight:700}" +
    "@media print{html,html:root,html[data-theme],html:root body,html[data-theme] body{background:#fff!important;color:#000!important}html{color-scheme:light!important}body>*:not(main){display:none!important}.tool>*:not(.w-keep){display:none!important}.tool{padding:0!important;max-width:none!important}.w-keep,.w-keep>*{display:block!important;padding:0!important;margin:0!important}.w-keep .w-noprint{display:none!important}.w-pgs{display:block}.w-pg{width:auto;min-height:0;padding:0;box-shadow:none;border-radius:0;page-break-after:always;zoom:1!important}.w-pg:last-child{page-break-after:auto}@page{size:A4;margin:25.4mm}}";

  /* Skala pratinjau supaya halaman 794px muat di kolom. */
  function fit(box) {
    var pgs = box.querySelectorAll(".w-pg"), w = box.clientWidth || 794, z = Math.min(1, (w - 2) / 794);
    for (var i = 0; i < pgs.length; i++) pgs[i].style.zoom = z < 1 ? String(z) : "";
  }

  root.CAW = { esc: esc, html: html, docx: docxBlob, loadLogo: loadLogo, save: save, fileSafe: fileSafe, css: CSS, fit: fit, LOGO_URL: LOGO_URL };
})(window);
