"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { parseMd, parseFrontMatter, cleanMarkdown, checkDraft, topicKey } = require("../blog-import");

const ART = `---
title: "Strategi UAS UT: Pilih UTM, UO, atau THE"
slug: strategi-uas-ut
meta_title: Strategi UAS UT dan Solusi Nilai Tuton
meta_description: Bingung skema UAS UT? Bandingkan UTM, UO, dan THE lalu siapkan langkahnya.
tags: [uas ut, tuton, Nilai Akhir]
topic: Tips Kuliah UT
keyword: strategi uas ut
---

# Strategi UAS UT: Pilih UTM, UO, atau THE

Mahasiswa sedang dikejar deadline sesi terakhir tuton dan cemas menghadapi skema UAS. Berikut langkah yang bisa kamu ambil minggu ini.

## Perbandingan skema

| Skema | Cara |
|---|---|
| UTM | Tatap muka |
| UO | Online |

---

## Syarat nilai
Baca aturan di [situs resmi UT](https://www.ut.ac.id/) dan \`MyUT\`. Lihat juga [layanan Catatan Akademik](/layanan-ut "Layanan").

Kami tidak menjamin nilai atau kelulusan. Semangat!
`;

test("front matter: kunci, daftar, alias, tanda kutip", () => {
  const { fm, had } = parseFrontMatter(ART);
  assert.ok(had); assert.strictEqual(fm.title, "Strategi UAS UT: Pilih UTM, UO, atau THE");
  assert.deepStrictEqual(fm.tags, ["uas ut", "tuton", "Nilai Akhir"]);
  assert.strictEqual(fm.metaDesc.startsWith("Bingung skema"), true);
  assert.deepStrictEqual(parseFrontMatter("---\ntags:\n  - a\n  - b\n---\nx").fm.tags, ["a", "b"]);
});

test("parseMd: H1 yang sama dengan judul dibuang, garis pemisah dan kode dibersihkan, judul tautan dibuang", () => {
  const d = parseMd(ART, "x.md");
  assert.ok(d.ok); assert.strictEqual(d.slug, "strategi-uas-ut"); assert.strictEqual(d.topic, "Tips Kuliah UT");
  assert.ok(!/^# /m.test(d.body)); assert.ok(!/^---$/m.test(d.body)); assert.ok(!d.body.includes("`"));
  assert.ok(d.body.includes("[layanan Catatan Akademik](/layanan-ut)")); assert.ok(d.body.includes("| UTM | Tatap muka |"));
  assert.ok(d.excerpt.startsWith("Mahasiswa sedang dikejar"));
  assert.strictEqual(topicKey(d.topic), "study"); assert.strictEqual(topicKey("Info UT"), "updateut"); assert.strictEqual(topicKey("apa saja"), "");
});

test("parseMd tanpa front matter: judul dari H1 atau nama file; isi terlalu pendek ditolak", () => {
  const body = "# Cara Menghitung Nilai Akhir UT\n\n" + "Nilai akhir dihitung dari tugas, tuton, dan ujian akhir semester. ".repeat(3);
  assert.strictEqual(parseMd(body, "a.md").title, "Cara Menghitung Nilai Akhir UT");
  assert.strictEqual(parseMd("Isi tanpa judul " + "kata ".repeat(30), "panduan-mahasiswa-baru.md").title, "panduan mahasiswa baru");
  assert.strictEqual(parseMd("# Judul\n\npendek", "a.md").ok, false);
});

test("checkDraft: menandai kata klaim dilarang, penafian, tautan, dan batas meta", () => {
  const ok = parseMd(ART, "x.md"), w = checkDraft(ok).join(" | ");
  assert.ok(!/penafian/i.test(w) && !/Kata klaim/.test(w) && !/tautan internal/.test(w) && !/sumber resmi/.test(w));
  const bad = parseMd(`# Judul Uji Coba Artikel Panjang\n\n## Bagian\n${"Pasti lolos Turnitin dan nilai aman dengan garansi, slot tinggal 3. ".repeat(6)}`, "b.md");
  const wb = checkDraft(bad).join(" | ");
  assert.match(wb, /Kata klaim yang dilarang/); assert.match(wb, /kelangkaan palsu/); assert.match(wb, /Penafian/); assert.match(wb, /Meta title kosong/);
  assert.match(checkDraft({ ...ok, metaTitle: "x".repeat(70) }).join(" "), /Meta title 70 karakter/);
  assert.match(checkDraft({ ...ok, keyword: "kata lain sama sekali" }).join(" "), /Kata kunci utama/);
});

test("cleanMarkdown: kosong aman", () => { assert.strictEqual(cleanMarkdown(null), ""); });

test("buildDrafts: semua draf, judul kembar dilewati, slug unik antar file, topik dibatasi, kegagalan satu file tidak menghentikan lainnya", () => {
  const { buildDrafts } = require("../blog-import");
  const used = new Set(["lama"]);
  const ctx = {
    existing: [{ title: "Artikel Lama" }], str: (v, n) => String(v ?? "").trim().slice(0, n), slugify: t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    uniqueSlug: s => { let x = s, n = 2; while (used.has(x)) x = s + "-" + n++; return x; }, cleanTags: t => [].concat(t).map(x => String(x).toLowerCase().replace(/\s+/g, "-")),
    newId: (() => { let i = 0; return () => "id" + ++i; })(), topics: { study: {}, social: {}, updateut: {} }, allowedTopics: ["study", "updateut"], defaultTopic: "study", author: "Dika Priyadi", by: "admin", now: "2026-10-25T00:00:00Z",
  };
  const body = t => `# ${t}\n\n## Bagian\n${"Kalimat isi artikel yang cukup panjang untuk lolos batas minimum. ".repeat(4)}`;
  const files = [
    { name: "a.md", text: ART }, { name: "b.md", text: body("Artikel Lama") }, { name: "c.md", text: "# Judul\n\npendek" }, { name: "d.pdf", text: "x" },
    { name: "e.md", text: `---\ntitle: Artikel Sama Slug\nslug: strategi-uas-ut\ntopic: viral\n---\n` + body("Artikel Sama Slug").split("\n").slice(2).join("\n") },
  ];
  const { posts, results } = buildDrafts(files, ctx);
  assert.deepStrictEqual(results.map(r => r.ok), [true, false, false, false, true]);
  assert.strictEqual(results[1].skipped, true);
  assert.ok(posts.every(p => p.status === "draft" && p.updatedBy === "admin (impor .md)"));
  assert.strictEqual(posts[0].slug, "strategi-uas-ut"); assert.notStrictEqual(posts[1].slug, posts[0].slug); // slug sama dalam satu impor
  assert.strictEqual(posts[1].topic, "study");                                                                // topik tak diizinkan -> bawaan
  assert.strictEqual(posts[0].metaTitle, "Strategi UAS UT dan Solusi Nilai Tuton"); assert.deepStrictEqual(posts[0].tags, ["uas-ut", "tuton", "nilai-akhir"]);
});

test("blok label gaya Hermes (**Slug:** ...) dibaca sebagai metadata dan dibuang dari isi", () => {
  const isi = "Paragraf pembuka yang cukup panjang untuk lolos batas minimal isi artikel, berisi penjelasan singkat tentang topik yang dibahas di sini.";
  const teks = "# Judul Uji Label\n\n**Slug:** `judul-uji-label`\n\n**Meta title:** Meta judul uji\n\n**Meta description:** Deskripsi uji singkat.\n\n**Kata kunci utama:** kata uji\n\n**Kata kunci turunan:** satu, dua\n\n---\n\n" + isi + "\n\n**Catatan:** ini bagian isi dan tidak boleh dibuang.";
  const d = parseMd(teks, "x.md");
  assert.strictEqual(d.ok, true);
  assert.strictEqual(d.title, "Judul Uji Label"); assert.strictEqual(d.slug, "judul-uji-label");
  assert.strictEqual(d.metaTitle, "Meta judul uji"); assert.strictEqual(d.metaDesc, "Deskripsi uji singkat."); assert.strictEqual(d.keyword, "kata uji");
  assert.deepStrictEqual(d.tags, ["satu", "dua"]);
  assert.ok(!/Slug:|Meta title:|Kata kunci/.test(d.body), "baris label tidak boleh tersisa di isi: " + d.body.slice(0, 80));
  assert.ok(d.body.includes("**Catatan:** ini bagian isi"), "label tak dikenal tetap bagian isi");
  // label sebelum judul H1 juga dibaca
  const d2 = parseMd("**Slug:** slug-dulu\n\n# Judul Setelah Label\n\n" + isi, "y.md");
  assert.strictEqual(d2.title, "Judul Setelah Label"); assert.strictEqual(d2.slug, "slug-dulu"); assert.ok(!d2.body.includes("Slug:"));
  // front matter resmi menang atas blok label
  const d3 = parseMd("---\ntitle: Resmi\nslug: slug-resmi\n---\n**Slug:** slug-label\n\n" + isi, "z.md");
  assert.strictEqual(d3.slug, "slug-resmi");
});

test("draf Hermes berkerangka: penanda dibuang, metadata dibaca, bagian internal dan placeholder hilang, tautan dirapikan", () => {
  const raw = `# [H1 — JUDUL UTAMA]
Cara Cek Jadwal UAS UT di MyUT

---

## [METADATA SEO — BUKAN ISI ARTIKEL]
- **Slug:** \`cara-cek-jadwal-uas-ut\`
- **SEO title:** \`Cara Cek Jadwal UAS UT di MyUT\`
- **Meta description:** \`Cara cek jadwal UAS UT lewat MyUT dan kalender akademik.\`
- **Kata kunci utama:** cara cek jadwal UAS UT
- **Status:** DRAFT LOKAL — belum diterbitkan

---

## [PEMBUKA — JAWABAN LANGSUNG]
${"Jadwal UAS UT dicek lewat MyUT dan kalender akademik resmi. ".repeat(8)}

## [H2 — LANGKAH CEK JADWAL DI MYUT]
${"Masuk ke MyUT lalu buka menu jadwal ujian dan cocokkan dengan kalender akademik. ".repeat(6)}[2][4]

## [CTA — SEMUA LAYANAN CATATAN AKADEMIK]
Coba [Kalkulator](https://catatanakademik.com/ruangakademikut/kalkulator-nilai-ut), [layanan Metopen](https://catatanakademik.com/layanan-ut/metopen) dan [Audit](https://catatanakademik.com/audit).
- **Portal UT** → tautan resmi MyUT: <https://catatanakademik.com/portal-ut>

## [SUMBER RESMI]
- [Pedoman UT](https://www.ut.ac.id/pedoman)

## Gabung komunitas Catatan Akademik UT
- **Instagram:** **DATA BELUM TERSEDIA** - URL akun belum terbaca.
> Catatan Akademik bukan situs resmi UT. Kami tidak menjamin nilai atau kelulusan. Semangat!

## Audit Lessons (Dari Eksekusi Sebelumnya)
- catatan internal yang tidak boleh terbit
`;
  const d = parseMd(raw.replace("Jadwal UAS UT dicek", "\u00e2\u0080\u0094 rusak. Jadwal UAS UT dicek"), "x.md");
  assert.ok(d.ok);
  assert.strictEqual(d.title, "Cara Cek Jadwal UAS UT di MyUT");
  assert.strictEqual(d.slug, "cara-cek-jadwal-uas-ut"); assert.strictEqual(d.metaTitle, "Cara Cek Jadwal UAS UT di MyUT");
  assert.ok(d.metaDesc.startsWith("Cara cek jadwal")); assert.strictEqual(d.keyword, "cara cek jadwal UAS UT");
  const b = d.body;
  assert.ok(!/\[(H\d|CTA|PEMBUKA|SUMBER|METADATA)/.test(b), "penanda kerangka tersisa");
  assert.ok(/^## Langkah cek jadwal di MyUT$/m.test(b), "judul H2 huruf kapital semua dirapikan");
  assert.ok(/^## Langkah berikutnya$/m.test(b) && /^## Sumber$/m.test(b));
  assert.ok(!/Audit Lessons|catatan internal|DATA BELUM TERSEDIA|Gabung komunitas|Status:|METADATA/i.test(b), "bagian internal/placeholder tersisa");
  assert.ok(!/\[2\]\[4\]/.test(b), "penanda kutipan sisa");
  assert.ok(b.includes("https://catatanakademik.com/kalkulator-nilai-ut") && !b.includes("/ruangakademikut/"));
  assert.ok(b.includes("https://catatanakademik.com/layanan?s=metopen_paket") && !b.includes("/layanan-ut/metopen"));
  assert.ok(b.includes("[Portal UT](https://catatanakademik.com/portal-ut)") && !/<https?:/.test(b));
  assert.ok(!/\u00e2[\u0080-\u00bf]/.test(b) && b.includes("— rusak."), "karakter rusak diperbaiki");
  assert.ok(/tidak\s+menjamin\s+nilai\s+atau\s+kelulusan/i.test(b), "penafian dipertahankan");
  const w = checkDraft(d).join(" | ");
  assert.ok(!/penanda kerangka|DATA BELUM TERSEDIA|catatan internal|CTA/i.test(w), w);
});

test("label polos dan label bertanda panjang karakter dibaca; klaim yang dinegasikan tidak ditandai; tanpa CTA layanan ditandai", () => {
  const raw = `# Deadline Tuton UT Terlewat\n\nSlug: \`deadline-tuton-terlewat\`\n\nMeta title (40 karakter): Deadline Tuton UT Terlewat\n\nMeta description: Langkah etis setelah kelas Tuton ditutup.\n\nKata kunci utama: deadline Tuton UT terlewat\n\n## Langkah\n${"Catat bukti, cek status kelas, lalu hubungi tutor. Bukti submit bukan jaminan nilai atau kelulusan. ".repeat(5)}\n\nSumber: [UT](https://www.ut.ac.id/)\n\nKami tidak menjamin nilai atau kelulusan. Semangat!`;
  const d = parseMd(raw, "y.md");
  assert.strictEqual(d.slug, "deadline-tuton-terlewat"); assert.strictEqual(d.metaTitle, "Deadline Tuton UT Terlewat"); assert.ok(d.metaDesc.startsWith("Langkah etis"));
  assert.ok(!/^(Slug|Meta)/m.test(d.body), "label tidak boleh tampil di isi");
  const w = checkDraft(d).join(" | ");
  assert.ok(!/klaim yang dilarang/i.test(w), "'bukan jaminan' adalah negasi: " + w);
  assert.ok(/ajakan \(CTA\) ke layanan kita/.test(w), "tanpa tautan Layanan/Audit/Cek harus ditandai: " + w);
  const ok = parseMd(raw.replace("Sumber:", "Lihat [Audit](/audit). Sumber:"), "y.md");
  assert.ok(!/ajakan \(CTA\) ke layanan kita/.test(checkDraft(ok).join(" | ")));
});

test("scrubInternal: bagian dan baris internal tidak tampil, Sources ganda dibuang", () => {
  const { scrubInternal } = require("../blog-import");
  const out = scrubInternal("Isi awal.\n\n## Sumber\n- A\n\n## Audit Lessons\nrahasia\n\n## Blok komunitas Catatan Akademik UT\n- WhatsApp: x\n- Instagram: DATA BELUM TERSEDIA\n\nGambar: GAMBAR BELUM TERSEDIA\nAlt text sampul: foto\nCatatan pemilik sebelum terbit: cek\n\n## Sources\n- B\n\n## Bagian biasa\nTetap ada.");
  assert.ok(/Isi awal/.test(out) && /Bagian biasa/.test(out) && /## Sumber\n- A/.test(out));
  assert.ok(!/Audit Lessons|rahasia|komunitas|DATA BELUM|Alt text|Catatan pemilik|Sources|- B/.test(out), out);
  assert.ok(/## Sumber\n- B/.test(scrubInternal("## Sources\n- B")), "tanpa Sumber, Sources diganti nama");
});
