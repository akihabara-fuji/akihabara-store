"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const rd = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("Studio: halaman, rute admin, dan tautan antrean ada", () => {
  assert.match(rd("parafrase/pages/studio.html"), /id="mA"/); assert.match(rd("parafrase/pages/studio.html"), /id="mB"/);
  assert.match(rd("parafrase/pages.js"), /\/admin\/parafrase\/studio/);
  assert.match(rd("parafrase/pages/admin.js"), /Buka Studio/);
  const b = rd("parafrase/bedah.js");
  for (const r of ['"/ms/admin/studio/:id"', '"/ms/admin/studio/:id/draft"', '"/ms/admin/studio/:id/word"', '"/ms/admin/studio/:id/import"', '"/ms/admin/studio/:id/finish"']) assert.ok(b.includes(r), r);
  assert.match(rd("server.js"), /app\.post\("\/ms\/cek\/upload", needLoginUse\)/);
});

test("Cek: bayar seluruh kata dan tanpa jatah gratis untuk unggahan laporan UT", () => {
  const o = rd("parafrase/orders.js");
  assert.match(o, /det\.kind === "cek"/);
  assert.match(o, /free_words: 0/);
});

test("Cek: mahasiswa tidak menerima teks rekomendasi", () => {
  const b = rd("parafrase/bedah.js"), i = b.indexOf('if (mode === "cek") {   // mahasiswa'), j = b.indexOf("res.json({ uploadId: id", i + 10);
  const blok = b.slice(i, j);
  assert.ok(i > 0 && j > i);
  assert.doesNotMatch(blok, /tags|fix:|jangan|bukti/);
});

let studio = null, docx = null;
try { studio = require("../parafrase/studio"); docx = require("../parafrase/docx"); } catch { /* modul Word belum terpasang di lingkungan ini */ }
const need = studio ? test : test.skip;

need("ciri kalimat: panjang, koma, penyambung berulang, paragraf dempet", () => {
  const s = ["Selain itu, " + "kata ".repeat(40).trim() + ".", "Selain itu, a b c d e f.", "Selain itu, x y z w."];
  const c = studio.ciri(s[0], s);
  assert.ok(c.find(x => x.key === "panjang" && x.level === "merah"));
  assert.ok(c.find(x => x.key === "penyambung" && x.level === "merah"));
  const d = studio.ciri("Pembelajaran daring memiliki banyak manfaat.", ["Pembelajaran daring memiliki banyak manfaat.", "Kedua."]);
  assert.ok(d.find(x => x.key === "dempet" && x.level === "merah"));
  assert.ok(d.find(x => x.key === "panjang" && x.level === "hijau"));
});

need("stats: hanya hitungan, tanpa teks rekomendasi", () => {
  const r = studio.stats([{ para_idx: 0, text: "Motivasi belajar adalah dorongan.", tags: [{ id: "definisi", fix: "RAHASIA" }] }], () => ["Motivasi belajar adalah dorongan."]);
  assert.strictEqual(r.total, 1); assert.strictEqual(r.pola.definisi, 1);
  assert.doesNotMatch(JSON.stringify(r), /RAHASIA/);
});

need("editsFromItems: kalimat lanjutan dikosongkan, hasil kosong dilewati", () => {
  const items = [{ n: 1, para_idx: 3, sent_idx: 2, parts: [[3, 2], [3, 3]], text: "a" }, { n: 2, para_idx: 4, sent_idx: 0, parts: [[4, 0]], text: "b" }];
  const e = studio.editsFromItems(items, { 1: "Baru.", 2: "   " });
  assert.deepStrictEqual(e, [{ para_idx: 3, sent_idx: 2, text: "Baru." }, { para_idx: 3, sent_idx: 3, text: "" }]);
});

need("applyEdits: hanya kalimat biru berganti, format dan kalimat lain tetap", async () => {
  const JSZip = require("jszip"), W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>` +
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Kalimat satu tetap. Kalimat dua diganti </w:t></w:r><w:r><w:t>dengan baik. Kalimat tiga tetap.</w:t></w:r></w:p></w:body></w:document>`;
  const z = new JSZip();
  z.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>');
  z.file("word/document.xml", xml);
  const buf = await z.generateAsync({ type: "nodebuffer" });
  const r = await studio.applyEdits(buf, [{ para_idx: 0, sent_idx: 1, text: "Kalimat baru dari admin." }]);
  assert.strictEqual(r.applied, 1); assert.strictEqual(r.skipped.length, 0);
  const out = await (await JSZip.loadAsync(r.buf)).file("word/document.xml").async("string");
  assert.match(out, /Kalimat satu tetap\. Kalimat baru dari admin\./); assert.match(out, / Kalimat tiga tetap\./); assert.match(out, /<w:b\/>/);
  assert.doesNotMatch(out, /Kalimat dua/);
});

need("PDF asli: teks paragraf diganti per kalimat, kalimat lain tetap, kosong = dihapus", () => {
  const paras = [{ idx: 0, text: "Satu tetap. Dua diganti. Tiga tetap." }, { idx: 1, text: "Paragraf lain utuh." }];
  const r = studio.rewriteParagraphs(paras, [{ para_idx: 0, sent_idx: 1, text: "Dua baru." }]);
  assert.strictEqual(r.applied, 1); assert.deepStrictEqual(r.texts, ["Satu tetap. Dua baru. Tiga tetap.", "Paragraf lain utuh."]);
  const k = studio.rewriteParagraphs(paras, [{ para_idx: 0, sent_idx: 2, text: "" }]);
  assert.strictEqual(k.texts[0], "Satu tetap. Dua diganti.");
});

test("PDF asli: Studio dan unggahan Cek menerima PDF, Word dibuat dari teks", () => {
  const b = require("fs").readFileSync(require("path").join(__dirname, "..", "parafrase", "bedah.js"), "utf8");
  assert.doesNotMatch(b, /tidak bisa dikerjakan di Studio/);
  assert.match(b, /plainDocx/);
  const js = require("fs").readFileSync(require("path").join(__dirname, "..", "parafrase", "pages", "cek.js"), "utf8");
  assert.match(js, /\(docx\|pdf\)/);
});
