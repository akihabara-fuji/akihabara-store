"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const JSZip = require("jszip");
const sharp = require("sharp");
const express = require("express");

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const P = t => `<w:p><w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
async function docx(extra = "") {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  const body = [
    "Komunikasi Lintas Fungsi dalam Penanganan Pesanan Perusahaan",
    "Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan. " + extra,
    "Sebanyak 45 persen perusahaan melaporkan peningkatan efisiensi operasional setelah digitalisasi proses bisnis dilakukan.",
  ].map(P).join("");
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return z.generateAsync({ type: "nodebuffer" });
}
const jpg = async seed => sharp({ create: { width: 64, height: 64, channels: 3, background: { r: seed, g: 10, b: 10 } } }).withMetadata({ exif: { IFD0: { Copyright: "RAHASIA-EXIF" } } }).jpeg().toBuffer();

async function boot(set = {}) {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pf-ord-"));
  const app = express(); let admin = false;
  const m = require("../parafrase")({ app, express, requireAdmin: (q, r, n) => admin ? n() : r.status(401).json({ error: "x" }), sameOrigin: q => !!q.headers.origin, ROOT: root });
  m.settings.set({ bayar_koin_saja: false, free_words: 0, ...set }); // tes lama: alur QRIS per pesanan dan tanpa kata gratis; alur koin dan kata gratis diuji di berkas tes masing-masing
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port, H = { origin: "http://x" };
  const J = { ...H, "content-type": "application/json" };
  const upload = async (extra) => { const fd = new FormData(); fd.append("file", new Blob([await docx(extra)]), "t.docx"); return (await (await fetch(base + "/ms/parafrase/upload", { method: "POST", body: fd, headers: H })).json()).uploadId; };
  let n = 0; // nomor WA berbeda tiap pesanan (kecuali ditentukan), agar pembatasan per nomor tidak mengganggu tes lain
  const order = async (uploadId, o = {}) => fetch(base + "/ms/parafrase/order", { method: "POST", headers: J, body: JSON.stringify({ uploadId, wa: "0812345678" + String(90 + n++), agree: true, deadline: Date.now() + 3 * 86400e3, ...o }) });
  const proof = async (token, buf) => { const fd = new FormData(); fd.append("proof", new Blob([buf]), "b.jpg"); return fetch(base + "/ms/parafrase/order/" + token + "/proof", { method: "POST", body: fd, headers: H }); };
  return { m, root, srv, base, H, J, upload, order, proof, setAdmin: v => { admin = v; } };
}

module.exports = { boot, docx, jpg };
