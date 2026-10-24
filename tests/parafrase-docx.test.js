"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const JSZip = require("jszip");
const express = require("express");
const { analyze, splitSentences, countWords, DocxError } = require("../parafrase/docx");
const { quote } = require("../parafrase/pricing");

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const P = (text, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
async function makeDocx(bodyXml, extra = {}) {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`);
  for (const [k, v] of Object.entries(extra)) z.file(k, v);
  return z.generateAsync({ type: "nodebuffer" });
}
const ID = "Komunikasi lintas fungsi sangat penting dalam organisasi yang sedang berkembang. Bagian penjualan harus berbicara dengan bagian produksi untuk menyelaraskan target. ";

test("ekstraksi: paragraf, tabel, hapusan pelacak perubahan diabaikan", async () => {
  const body = P("Judul Tugas Tutorial Manajemen", "Title") + P("Isi paragraf pertama dengan beberapa kata.") +
    `<w:tbl><w:tr><w:tc>${P("Sel tabel satu")}</w:tc></w:tr></w:tbl>` +
    `<w:p><w:r><w:t>Teks tetap </w:t></w:r><w:del><w:r><w:delText>teks dihapus</w:delText></w:r></w:del><w:ins><w:r><w:t>teks baru</w:t></w:r></w:ins></w:p>`;
  const a = await analyze(await makeDocx(body));
  assert.strictEqual(a.paragraphs.length, 4);
  assert.strictEqual(a.paragraphs[2].inTable, true);
  assert.ok(a.paragraphs[3].text.includes("teks baru") && !a.paragraphs[3].text.includes("dihapus"));
  assert.strictEqual(a.title, "Judul Tugas Tutorial Manajemen");
});

test("kalimat: singkatan, angka desimal, inisial tidak memecah", () => {
  const s = splitSentences("Menurut Prof. Budi dkk. hasilnya 3.5 persen. Namun A. Rahman tidak setuju! Apakah benar? Ya.");
  assert.deepStrictEqual(s, ["Menurut Prof. Budi dkk. hasilnya 3.5 persen.", "Namun A. Rahman tidak setuju!", "Apakah benar?", "Ya."]);
  assert.deepStrictEqual(splitSentences(""), []);
});

test("daftar pustaka dikecualikan dari hitungan kata", async () => {
  const body = P("Judul Penelitian Contoh Manajemen", "Title") + P(ID.repeat(6)) + P("Daftar Pustaka") + P("Robbins, S. (2016). Perilaku organisasi. Jakarta: Salemba.") + P("Kotler, P. (2012). Marketing management. Jakarta: Erlangga.");
  const a = await analyze(await makeDocx(body));
  assert.strictEqual(a.hasBibliography, true);
  assert.ok(a.wordsBody < a.wordsAll);
  assert.strictEqual(a.wordsBody, countWords("Judul Penelitian Contoh Manajemen") + countWords(ID.repeat(6)));
});

test("'Referensi' di awal dokumen (daftar isi) tidak dianggap daftar pustaka", async () => {
  const body = P("Referensi") + P(ID.repeat(10));
  const a = await analyze(await makeDocx(body));
  assert.strictEqual(a.hasBibliography, false);
});

test("deteksi bahasa dan jenis dokumen", async () => {
  const en = await analyze(await makeDocx(P("The effect of leadership on the performance of the employees in the company is the focus of this study and it is also important for the managers. ".repeat(4))));
  assert.strictEqual(en.language, "en");
  const id = await analyze(await makeDocx(P(ID.repeat(3))));
  assert.strictEqual(id.language, "id");
  const m = await analyze(await makeDocx(P("A. Latar Belakang") + P("B. Rumusan Masalah") + P("C. Tujuan Penelitian") + P("D. Metode Penelitian") + P(ID)));
  assert.strictEqual(m.docType, "metopen");
  assert.strictEqual(id.docType, "umum");
});

test("penolakan file: PDF, .doc lama/berpassword, bukan zip, tanpa document.xml, makro, tanpa teks", async () => {
  const code = async b => { try { await analyze(b); } catch (e) { assert.ok(e instanceof DocxError); return e.code; } return "lolos"; };
  assert.strictEqual(await code(Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(300)])), "pdf");
  assert.strictEqual(await code(Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0]), Buffer.alloc(300)])), "ole");
  assert.strictEqual(await code(Buffer.from("halo ini teks biasa ".repeat(20))), "bukan_docx");
  const z = new JSZip(); z.file("x.txt", "hai".repeat(50));
  assert.strictEqual(await code(await z.generateAsync({ type: "nodebuffer" })), "bukan_word");
  assert.strictEqual(await code(await makeDocx(P("a b c"), { "word/vbaProject.bin": "x" })), "makro");
  assert.strictEqual(await code(await makeDocx("<w:p/>")), "tanpa_teks");
  assert.strictEqual(await code(Buffer.alloc(10)), "kosong");
});

test("harga: 3.102 kata = Rp 52.734, minimum Rp 30.000, jalur cepat +Rp 30.000", () => {
  const cfg = { price_per_word: 17, min_order_price: 30000, fast_lane_price: 30000 };
  assert.strictEqual(quote(3102, false, cfg).total, 52734);
  assert.strictEqual(quote(3102, true, cfg).total, 82734);
  const small = quote(100, false, cfg);
  assert.strictEqual(small.total, 30000); assert.strictEqual(small.min_applied, true);
  assert.strictEqual(quote(1000000, false, cfg).total, 17000000); // tanpa batas kata
  assert.throws(() => quote(0, false, cfg));
  assert.throws(() => quote(1.5, false, cfg));
});

test("dokumen besar (100.000 kata) diproses wajar", async () => {
  const para = ID + ID + ID + ID; // ~90 kata
  const body = Array.from({ length: 1200 }, () => P(para)).join("");
  const buf = await makeDocx(body);
  const t0 = Date.now(), a = await analyze(buf), ms = Date.now() - t0;
  assert.ok(a.wordsAll > 90000, "kata " + a.wordsAll);
  assert.ok(ms < 15000, "terlalu lambat: " + ms + "ms");
});

/* ---------- HTTP ---------- */
async function server(extraSettings = {}) {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-"));
  const app = express();
  const m = require("../parafrase")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: q => !!q.headers.origin, ROOT: root });
  m.settings.set({ free_words: 0 });
  if (Object.keys(extraSettings).length) m.settings.set(extraSettings);
  const srv = app.listen(0);
  return { m, root, srv, base: "http://127.0.0.1:" + srv.address().port };
}
const send = (base, buf, name, headers = { origin: "http://x" }) => {
  const fd = new FormData(); fd.append("file", new Blob([buf]), name);
  return fetch(base + "/ms/parafrase/upload", { method: "POST", body: fd, headers });
};

test("HTTP upload: sukses, tersimpan privat, respons tanpa isi dokumen, harga dari server", async () => {
  const { m, root, srv, base } = await server();
  try {
    const buf = await makeDocx(P("Judul Contoh Tugas Manajemen Operasi", "Title") + P(ID.repeat(5)));
    const r = await send(base, buf, "tugas saya.docx");
    assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.ok(j.uploadId.length === 32);
    assert.strictEqual(j.detected.title, "Judul Contoh Tugas Manajemen Operasi");
    assert.strictEqual(j.quote.total, Math.max(j.detected.wordsWithoutBibliography * 17, 30000));
    assert.ok(!JSON.stringify(j).includes("Komunikasi lintas fungsi"), "isi dokumen bocor ke klien");
    const saved = path.join(root, "data", "private", "docs", j.uploadId + ".docx");
    assert.ok(fs.existsSync(saved));
    assert.ok(!fs.existsSync(path.join(root, "uploads")) && !saved.includes(path.sep + "public" + path.sep));
    // purge: lewat masa berlaku -> berkas dan baris hilang
    assert.strictEqual(await m.uploads.purgeExpired(Date.now() + 3 * 3600 * 1000), 1);
    assert.ok(!fs.existsSync(saved));
    assert.strictEqual(m.db.prepare("SELECT COUNT(*) n FROM uploads").get().n, 0);
  } finally { srv.close(); }
});

test("HTTP upload: PDF/ekstensi salah/tanpa origin/terlalu besar ditolak", async () => {
  const { srv, base } = await server({ file_max_mb: 1 });
  try {
    const good = await makeDocx(P(ID));
    let r = await send(base, Buffer.from("%PDF-1.4 " + "x".repeat(300)), "a.pdf"); assert.strictEqual(r.status, 415);
    assert.ok((await r.json()).error.includes(".docx"));
    r = await send(base, Buffer.from("%PDF-1.4 " + "x".repeat(300)), "a.docx"); assert.strictEqual(r.status, 422);
    r = await send(base, good, "a.docx", {}); assert.strictEqual(r.status, 403);
    r = await send(base, Buffer.alloc(2 * 1024 * 1024, 1), "besar.docx"); assert.strictEqual(r.status, 413);
    r = await fetch(base + "/ms/parafrase/upload", { method: "POST", headers: { origin: "http://x" } }); assert.strictEqual(r.status, 400);
  } finally { srv.close(); }
});

test("HTTP upload: pembatasan laju 10 per jam per IP", async () => {
  const { srv, base } = await server();
  try {
    const buf = await makeDocx(P(ID));
    for (let i = 0; i < 10; i++) assert.strictEqual((await send(base, buf, "a.docx")).status, 200);
    assert.strictEqual((await send(base, buf, "a.docx")).status, 429);
  } finally { srv.close(); }
});
