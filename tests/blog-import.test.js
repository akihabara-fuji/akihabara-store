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
