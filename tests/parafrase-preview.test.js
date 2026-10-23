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
  require("../parafrase")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: q => !!q.headers.origin, ROOT: root });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  try {
    const fd = new FormData(); fd.append("file", new Blob([await makeDocx(BODY)]), "t.docx");
    const up = await (await fetch(base + "/ms/parafrase/upload", { method: "POST", body: fd, headers: { origin: "http://x" } })).json();
    const r = await fetch(base + "/ms/parafrase/preview/" + up.uploadId);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("cache-control"), "no-store");
    const txt = await r.text();
    const pvj = JSON.parse(txt), terbuka = (pvj.example ? pvj.example.sentences.map(x => x.text).join(" ") : "").toLowerCase();
    assert.ok(pvj.example, "ada paragraf contoh terbuka");
    for (const w of ["digitalisasi", "implementasi", "pengendalian", "manufaktur", "efisiensi"]) if (!terbuka.includes(w)) assert.ok(!txt.toLowerCase().includes(w), "bocor: " + w);
    assert.strictEqual((await fetch(base + "/ms/parafrase/preview/" + "0".repeat(32))).status, 404);
    assert.strictEqual((await fetch(base + "/ms/parafrase/preview/../../etc")).status, 404);
  } finally { srv.close(); }
});

test("contoh 1 paragraf: rekomendasi, kalimat salah ditandai, paragraf lain tetap terkunci tanpa bocor", async () => {
  const { a, f } = await setup();
  const pv = buildPreview(a, f, SECRET, "id1", { unlocked: false, openParagraphs: 1 });
  const ex = pv.example;
  assert.ok(ex, "ada paragraf contoh");
  assert.ok(ex.reason && ex.helper.length > 20 && ex.target.startsWith("Harusnya") && ex.sentences.length >= 1);
  assert.ok(ex.sentences.some(x => x.flagged) && ex.sentences.every(x => x.text));
  const segs = pv.paragraphs.flatMap(p => p.segments), open = segs.filter(s => !s.locked);
  assert.strictEqual(open.length, ex.sentences.length, "yang terbuka hanya kalimat di paragraf contoh");
  assert.ok(segs.filter(s => s.locked).every(s => !("reasons" in s)), "yang terkunci tidak membocorkan alasan");
  const locked = segs.filter(s => s.locked).map(s => s.text).join(" ");
  for (const w of longWords(BODY.replace(/<[^>]+>/g, " "))) if (!ex.sentences.some(x => x.text.toLowerCase().includes(w))) assert.ok(!locked.includes(w), "bocor " + w);
});

test("contoh paragraf: kode paling serius didahulukan; kalimat panjang bersambung punya contoh penulisan ulang; 0 berarti tidak ada contoh", async () => {
  const long = "Perusahaan menetapkan target produksi yang tinggi pada setiap shift kerja harian, sehingga pegawai lapangan sering mengabaikan prosedur keselamatan yang sudah ditetapkan manajemen secara tertulis dan resmi.";
  const a = await analyze(await makeDocx([ "Organisasi pembelajar membutuhkan komunikasi horizontal yang konsisten antarunit kerja dan juga antarpegawai.", long + " Hal itu tampak pada catatan kecelakaan kerja bulan lalu di pabrik.", "Disiplin itu penting bagi perusahaan yang sedang berkembang pesat."].map(P).join("")));
  const f = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, { long_sentence_words: 25 });
  const pv = buildPreview(a, f, SECRET, "id2", { unlocked: false, openParagraphs: 1 });
  assert.strictEqual(pv.example.code, "U", "U lebih serius dari H pada contoh ini");
  assert.ok(pv.example.rewrite && /Akibatnya, /.test(pv.example.rewrite), String(pv.example.rewrite));
  assert.strictEqual(buildPreview(a, f, SECRET, "id2", { unlocked: false, openParagraphs: 0 }).example, null);
  assert.strictEqual(buildPreview(a, f, SECRET, "id2", { unlocked: true }).example, null, "setelah dibayar tidak perlu panel contoh");
});

test("ringkasan aspek ikut di pratinjau dengan kode warna, dan mode lama openSentences tetap berlaku", async () => {
  const { a, f } = await setup();
  const pv = buildPreview(a, f, SECRET, "id1", { unlocked: false, openSentences: 1 });
  assert.strictEqual(pv.example, null);
  assert.strictEqual(pv.paragraphs.flatMap(p => p.segments).filter(s => !s.locked).length, 1);
  assert.ok(pv.overview && pv.overview.aspects.length === 6 && pv.overview.ai && pv.overview.aspects.every(x => Array.isArray(x.codes) && x.codes.length));
  assert.deepStrictEqual(pv.overview.aspects.find(x => x.key === "kalimat_berulang").codes, ["M"]);
});
