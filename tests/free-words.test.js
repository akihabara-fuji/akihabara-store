"use strict";
/* Uji kata gratis (Audit dan Cek & Parafrase) dan pembacaan PDF. Tanpa Express/SQLite supaya jalan di mana saja. */
const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("child_process");
/* jszip hanya dipakai untuk membaca .docx; uji ini tidak membukanya, jadi boleh diganti kosong bila modulnya tidak ada. */
{ const Module = require("module"), load = Module._load; Module._load = function (r, ...a) { if (r === "jszip" || r === "@xmldom/xmldom") { try { return load.call(this, r, ...a); } catch { return {}; } } return load.call(this, r, ...a); }; }
const { quote } = require("../parafrase/pricing");
const { analyze, pdfParagraphs, isPdf } = require("../parafrase/docx");
const { analyzeFindings } = require("../parafrase/rules");
const { buildPreview } = require("../parafrase/preview");

const cfg = { price_per_word: 17, min_order_price: 30000, fast_lane_price: 30000 };

test("harga: kata gratis dikurangkan dari tagihan, minimum tetap berlaku, dokumen pendek gratis penuh", () => {
  assert.strictEqual(quote(3102, false, cfg).total, 52734);                       // tanpa kata gratis: perilaku lama
  const q = quote(3102, false, { ...cfg, free_words: 700 });
  assert.strictEqual(q.charged_words, 2402); assert.strictEqual(q.free_words, 700); assert.strictEqual(q.total, 2402 * 17);
  assert.strictEqual(quote(1000, false, { ...cfg, free_words: 700 }).total, 30000); // 300 kata x 17 < minimum
  const f = quote(650, true, { ...cfg, free_words: 700 });
  assert.strictEqual(f.all_free, true); assert.strictEqual(f.total, 0);            // jalur cepat pun tidak ditagih bila semuanya gratis
});

const para = (i, n) => ({ idx: i, text: Array.from({ length: n }, (_, k) => "kata" + k).join(" ") + ".", style: "", inTable: false });
test("pratinjau: kalimat dari awal terbuka sampai batas kata, sisanya tersamar tanpa kebocoran", () => {
  const paras = [para(0, 300), para(1, 300), para(2, 300), para(3, 300)];
  const a = { paragraphs: paras, bibliographyParagraphIndex: null };
  const pv = buildPreview(a, [], "s".repeat(64), "id1", { unlocked: false, openWords: 700, cfg: {} });
  const open = pv.paragraphs.map(p => p.segments.every(s => !s.locked));
  assert.deepStrictEqual(open, [true, true, false, false]);                       // 300 + 300 = 600 <= 700; paragraf ke-3 melewati batas
  assert.strictEqual(pv.openedWords, 600); assert.strictEqual(pv.freeWords, 700);
  assert.ok(!JSON.stringify(pv.paragraphs[2]).includes("kata10"));                // teks terkunci tidak dikirim
  const all = buildPreview(a, [], "s".repeat(64), "id1", { unlocked: true, cfg: {} });
  assert.strictEqual(all.paragraphs.every(p => p.segments.every(s => !s.locked)), true);
});

const b64 = require("fs").readFileSync(require("path").join(__dirname, "fixtures", "contoh.pdf.b64"), "utf8");
let hasPdftotext = true; try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); } catch (e) { hasPdftotext = e.code !== "ENOENT"; }
test("PDF: deteksi, paragraf dari blok, nomor halaman dibuang", { skip: !hasPdftotext && "pdftotext tidak terpasang" }, async () => {
  const buf = Buffer.from(b64, "base64"); assert.ok(isPdf(buf));
  const a = await analyze(buf);
  assert.deepStrictEqual(a.paragraphs.map(p => p.idx), [0, 1, 2]);
  assert.match(a.paragraphs[0].text, /^Pengaruh Komunikasi Lintas Fungsi/);
  assert.match(a.paragraphs[1].text, /strategi perusahaan secara keseluruhan/);    // baris sambung digabung
  assert.ok(a.wordsAll > 30 && a.title.startsWith("Pengaruh Komunikasi"));
  assert.ok(analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, { long_sentence_words: 35 }) instanceof Array);
});
test("pdfParagraphs: blok bernomor halaman saja dibuang, tanda hubung akhir baris disatukan", () => {
  const xml = `<block><line><word>stra-</word><word>tegi</word><word>besar</word></line></block><block><word>12</word></block><block><word>A &amp; B</word></block>`;
  assert.deepStrictEqual(pdfParagraphs(xml).map(p => p.text), ["strategi besar", "A & B"]);
});

test("audit struktur: judul dan bagian pembuka sampai penutup", () => {
  const { checkStruktur } = require("../parafrase/auditrules");
  const mk = (heads, title = "Pengaruh Komunikasi terhadap Kinerja Organisasi") => ({ title, docType: "umum", wordsAll: 2000, paragraphs: [title, ...heads.flatMap(h => [h, "isi " + h])].map((text, idx) => ({ idx, text, style: "", inTable: false })) });
  assert.deepStrictEqual(checkStruktur(mk(["Pendahuluan", "Pembahasan", "Kesimpulan"])), []);
  const cats = checkStruktur(mk(["Pembahasan"])).map(f => f.cat);
  assert.ok(cats.includes("Bagian pembuka tidak ditemukan") && cats.includes("Bagian penutup tidak ditemukan"));
  assert.strictEqual(checkStruktur(mk(["Pendahuluan", "Pembahasan", "Penutup"], ""))[0].cat, "Judul tidak terbaca");
  assert.strictEqual(checkStruktur({ ...mk([]), wordsAll: 200 }).length, 0);       // dokumen pendek tidak dituntut punya bagian lengkap
});
