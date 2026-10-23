"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const JSZip = require("jszip");
const express = require("express");
const { analyze, splitSentences } = require("../parafrase/docx");
const { analyzeFindings } = require("../parafrase/rules");
const { buildPreview, maskText } = require("../parafrase/preview");

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const P = t => `<w:p><w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
async function makeDocx(body) {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return z.generateAsync({ type: "nodebuffer" });
}
const DUP = "Pengendalian persediaan memengaruhi kelancaran produksi perusahaan manufaktur.";
const BODY = [
  "Organisasi pembelajar membutuhkan komunikasi horizontal yang konsisten antarunit kerja.",
  DUP + " Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan secara keseluruhan.",
  DUP,
  "Sebanyak 45 persen perusahaan melaporkan peningkatan efisiensi operasional setelah digitalisasi proses bisnis dilakukan.",
].map(P).join("");
const cfg = { long_sentence_words: 35 };
const SECRET = "s".repeat(64);

async function setup() {
  const a = await analyze(await makeDocx(BODY));
  return { a, f: analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, cfg) };
}
const longWords = text => [...new Set((text.toLowerCase().match(/[a-z]{8,}/g) || []))];

test("masker: panjang sama, deterministik, beda seed beda hasil, bukan teks asli", () => {
  const s = "Kalimat asli yang cukup panjang untuk diuji.";
  const m1 = maskText(s.length, Buffer.from("aaaaaaaa")), m2 = maskText(s.length, Buffer.from("aaaaaaaa")), m3 = maskText(s.length, Buffer.from("bbbbbbbb"));
  assert.strictEqual(m1.length, s.length);
  assert.strictEqual(m1, m2);
  assert.notStrictEqual(m1, m3);
  assert.notStrictEqual(m1, s);
});

test("terkunci: hanya kalimat pertama dokumen terbuka, sisanya tidak mengandung kata asli", async () => {
  const { a, f } = await setup();
  const pv = buildPreview(a, f, SECRET, "id1", { unlocked: false, openSentences: 1 });
  assert.strictEqual(pv.locked, true);
  const segs = pv.paragraphs.flatMap(p => p.segments);
  assert.strictEqual(segs.filter(s => !s.locked).length, 1);
  const openSeg = segs.find(s => !s.locked);
  assert.ok(openSeg.primary, "contoh terbuka harus kalimat bercatatan");
  assert.ok(openSeg.reasons && openSeg.reasons.length);
  const json = JSON.stringify(pv);
  const open = new Set(longWords(openSeg.text));
  const secretWords = longWords(BODY.replace(/<[^>]+>/g, " ")).filter(w => !open.has(w));
  assert.ok(secretWords.length > 10);
  for (const w of secretWords) assert.ok(!json.includes(w), "bocor: " + w);
  // kalimat terkunci tidak membawa alasan
  assert.ok(segs.filter(s => s.locked).every(s => !("reasons" in s)));
  // warna & kode tetap terlihat walau terkunci
  assert.ok(segs.some(s => s.locked && s.primary && s.color));
  assert.ok(pv.notes.total > 0);
});

test("terbuka setelah bayar: teks asli ikut", async () => {
  const { a, f } = await setup();
  const pv = buildPreview(a, f, SECRET, "id1", { unlocked: true });
  assert.strictEqual(pv.locked, false);
  assert.ok(JSON.stringify(pv).includes("digitalisasi proses bisnis"));
});

test("paginasi tidak membuka kalimat tambahan", async () => {
  const { a, f } = await setup();
  const p2 = buildPreview(a, f, SECRET, "id1", { unlocked: false, openSentences: 1, page: 2, pageSize: 5 });
  assert.strictEqual(p2.page, 1); // hanya 4 paragraf = 1 halaman
  const tiny = buildPreview(a, f, SECRET, "id1", { unlocked: false, openSentences: 1, page: 2, pageSize: 5 });
  assert.ok(!JSON.stringify(tiny).includes("digitalisasi"));
  const none = buildPreview(a, f, SECRET, "id1", { unlocked: false, openSentences: 0 });
  assert.ok(none.paragraphs.flatMap(p => p.segments).every(s => s.locked));
});

test("HTTP: endpoint pratinjau terkunci, no-store, tidak membocorkan, ID salah 404", async () => {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pf-pv-"));
  const app = express();
  const pf = require("../parafrase")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: q => !!q.headers.origin, ROOT: root });
  pf.settings.set({ preview_open_sentences: 1 }); // hanya 1 kalimat contoh terbuka; sisanya wajib tersamar
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  try {
    const fd = new FormData(); fd.append("file", new Blob([await makeDocx(BODY)]), "t.docx");
    const up = await (await fetch(base + "/ms/parafrase/upload", { method: "POST", body: fd, headers: { origin: "http://x" } })).json();
    const r = await fetch(base + "/ms/parafrase/preview/" + up.uploadId);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("cache-control"), "no-store");
    const txt = await r.text();
        for (const w of ["digitalisasi", "implementasi", "pengendalian", "manufaktur", "efisiensi"]) assert.ok(!txt.toLowerCase().includes(w), "bocor: " + w);
    assert.strictEqual((await fetch(base + "/ms/parafrase/preview/" + "0".repeat(32))).status, 404);
    assert.strictEqual((await fetch(base + "/ms/parafrase/preview/../../etc")).status, 404);
  } finally { srv.close(); }
});
