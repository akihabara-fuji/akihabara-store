"use strict";
/* Tag topik: saran dari kata kunci, Topik populer (tautan internal), halaman tag dengan judul/deskripsi sendiri. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

async function setup(posts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-tags-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts }));
  const app = express();
  const blog = require("../blog-akun")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test", getSettings: () => ({}) });
  app.use((req, res) => blog.notFound(req, res)); // seperti server.js: 404 bermerek paling akhir
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  return { blog, srv, base, root };
}
const iso = d => new Date(Date.UTC(2026, 9, d, 5)).toISOString();
const post = (id, title, body, tags, d) => ({ id, slug: "s-" + id, title, excerpt: "Ringkasan " + title, body, topic: "updateut", status: "published", tags, createdAt: iso(d), updatedAt: iso(d), publishedAt: iso(d) });

test("saran tag dari kata kunci judul/isi; tag yang sudah terpasang tidak disarankan lagi", async () => {
  const t = await setup([post("a1", "Jadwal UAS UT semester ganjil", "Cek jadwal ujian akhir semester dan registrasi mata kuliah.", [], 20)]);
  try {
    const s = t.blog.suggestTags(t.blog.posts()[0]);
    assert.ok(s.includes("uas") && s.includes("jadwal-ut"), JSON.stringify(s));
    const r = await (await fetch(t.base + "/ms/admin/tag-suggestions")).json();
    assert.ok(r.items[0].suggested.includes("uas"));
    assert.strictEqual(r.labels["take-home-exam"], "Take Home Exam (THE)");
  } finally { t.srv.close(); }
});

test("saran kategori: pengumuman/jadwal = Info UT, cara/tips = Tips Kuliah UT; pindah kategori tidak mengubah isi/slug/tanggal", async () => {
  const mk = (id, title, topic) => ({ ...post(id, title, "Isi.", [], 20), topic });
  const t = await setup([mk("k1", "Cara Membagi Waktu Kuliah UT Sambil Bekerja", "updateut"), mk("k2", "Update UT: Jadwal Penting Terverifikasi", "study"), mk("k3", "Tips Aktif di Tutorial", "study"), mk("k4", "Panduan Mahasiswa UT", "updateut")]);
  try {
    const s = await (await fetch(t.base + "/ms/admin/tag-suggestions")).json();
    const by = Object.fromEntries(s.items.map(x => [x.id, x.suggestedTopic]));
    assert.deepStrictEqual(by, { k1: "study", k2: "updateut", k3: null, k4: null });
    assert.strictEqual(s.topics.study, "Tips Kuliah UT");
    const before = JSON.stringify(t.blog.posts().find(p => p.id === "k1"));
    const r = await fetch(t.base + "/ms/admin/posts/k1/topic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "study" }) });
    assert.strictEqual(r.status, 200);
    const after = t.blog.posts().find(p => p.id === "k1");
    assert.deepStrictEqual({ ...after, topic: "updateut" }, JSON.parse(before), "hanya kategori yang berubah");
    assert.strictEqual((await fetch(t.base + "/ms/admin/posts/k1/topic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "ngawur" }) })).status, 400);
    assert.strictEqual((await fetch(t.base + "/ms/admin/posts/zzz/topic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic: "study" }) })).status, 404);
  } finally { t.srv.close(); }
});

test("SEO teknis: tepat satu H1 di setiap jenis halaman; kartu pakai H2/H3", async () => {
  const t = await setup([post("h1", "UAS online UT", "x", ["uas"], 21), post("h2", "Registrasi UT", "x", ["registrasi"], 22), post("h3", "Tips Tuton UT", "x", [], 23)]);
  try {
    for (const u of ["/blog", "/blog?tag=uas", "/blog?f=updateut", "/blog?q=uas", "/blog/s-h1", "/halaman-tidak-ada"]) {
      const h = await (await fetch(t.base + u)).text();
      assert.strictEqual((h.match(/<h1[\s>]/g) || []).length, 1, `${u} harus punya tepat satu H1`);
    }
    const home = await (await fetch(t.base + "/blog")).text();
    assert.ok(!/<article class="bx-(feat|card)">[\s\S]*?<h1/.test(home), "judul di kartu tidak boleh H1");
  } finally { t.srv.close(); }
});

test("LCP: gambar kartu pilihan dimuat segera (fetchpriority=high, bukan lazy); kartu lain lazy; ada teks 'Baca'", async () => {
  const mk = (id, d, cover) => ({ ...post(id, "Judul " + id, "x", [], d), cover, featured: id === "f1" });
  const t = await setup([mk("f1", 20, "/uploads/a.webp"), mk("f2", 21, "/uploads/b.webp"), mk("f3", 22, "/uploads/c.webp")]);
  try {
    const home = await (await fetch(t.base + "/blog")).text();
    const feat = home.match(/<article class="bx-feat">[\s\S]*?<\/article>/)[0];
    assert.match(feat, /<img src="\/uploads\/a\.webp"[^>]*fetchpriority="high"/);
    assert.ok(!/loading="lazy"/.test(feat), "gambar utama tidak boleh lazy");
    assert.match(feat, /Baca selengkapnya <i aria-hidden="true">→<\/i>/);
    const cards = [...home.matchAll(/<article class="bx-card">[\s\S]*?<\/article>/g)].map(m => m[0]);
    assert.ok(cards.length === 2 && cards.every(c => /loading="lazy"/.test(c) && !/fetchpriority/.test(c) && />Baca <i aria-hidden="true">→<\/i>/.test(c)));
    const art = await (await fetch(t.base + "/blog/s-f1")).text();
    assert.match(art, /<meta property="og:image:alt" content="Judul f1">/);
  } finally { t.srv.close(); }
});

test("halaman blog-ut: tidak ada sub-navbar layanan; menu utama menandai Blog aktif", async () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", "blog-ut.html"), "utf8");
  assert.ok(!html.includes('class="sub"'), "sub-navbar layanan harus tidak ada di halaman blog");
  assert.ok(!/Cek Pesanan|Revisi|Audit/.test(html.split("<main")[0].split("</header>")[1] || ""), "tidak ada menu transaksi di bawah header");
  assert.match(html, /<a class="on" href="\/blog" aria-current="page">Blog<\/a>/);
});

test("memasang tag tidak mengubah tanggal isi dan tidak membuat revisi", async () => {
  const t = await setup([post("b1", "Tips Metopen", "Isi metopen.", [], 20)]);
  try {
    const r = await fetch(t.base + "/ms/admin/posts/b1/tags", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tags: ["Metopen", "metopen", "Tips Lulus UT"] }) });
    assert.deepStrictEqual((await r.json()).tags, ["metopen", "tips-lulus-ut"]);
    const p = t.blog.posts()[0];
    assert.strictEqual(p.contentUpdatedAt, undefined);
    assert.ok(!fs.existsSync(path.join(t.root, "data", "blog-revisions", "b1.json")));
  } finally { t.srv.close(); }
});

test("Topik populer tampil dari tag nyata; halaman tag punya judul sendiri; tag kosong noindex", async () => {
  const t = await setup([post("c1", "UAS online", "x", ["uas", "jadwal-ut"], 21), post("c2", "Kisi UAS", "x", ["uas"], 22), post("c3", "Registrasi", "x", ["registrasi"], 23)]);
  try {
    const home = await (await fetch(t.base + "/blog")).text();
    assert.match(home, /<nav class="bx-pop" aria-label="Topik populer"><span>Topik populer:<\/span><a href="\/blog\?tag=uas">UAS<\/a>/, "tag terbanyak dulu, dengan nama tampil");
    const tag = await (await fetch(t.base + "/blog?tag=uas")).text();
    assert.match(tag, /<title>UAS: kumpulan artikel — Blog /);
    assert.match(tag, /<meta name="description" content="2 artikel Catatan Akademik tentang UAS/);
    assert.match(tag, /<meta name="robots" content="index,follow/);
    assert.match(tag, /<link rel="canonical" href="https:\/\/contoh\.test\/blog\?tag=uas">/);
    const empty = await (await fetch(t.base + "/blog?tag=tidak-ada")).text();
    assert.match(empty, /<meta name="robots" content="noindex,follow">/);
    const art = await (await fetch(t.base + "/blog/s-c1")).text();
    assert.match(art, /<a href="\/blog\?tag=uas" rel="tag">UAS<\/a>/);
    assert.match(art, /<time datetime="2026-10-21T05:00:00.000Z">/);
  } finally { t.srv.close(); }
});
