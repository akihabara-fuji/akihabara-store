"use strict";
/* Isi artikel blog: foto di dalam isi (![alt](/uploads/...)) harus tampil sebagai gambar, bukan "!" + tautan. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

async function setup(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-body-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts: [
    { id: "p1", slug: "foto-isi", title: "Foto di isi", topic: "study", excerpt: "Ringkasan.", body, status: "published", createdAt: now, updatedAt: now, publishedAt: now },
  ] }));
  const app = express();
  require("../blog-akun")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test", getSettings: () => ({}) });
  const srv = app.listen(0);
  const base = "http://127.0.0.1:" + srv.address().port;
  const prose = async () => {
    const html = await (await fetch(base + "/blog/foto-isi")).text();
    const s = html.indexOf('<div class="prose">'), e = html.indexOf('<p class="ax-note">', s);
    return html.slice(s, e > s ? e : html.indexOf("</div>", s));
  };
  return { srv, base, prose };
}

test("foto di baris sendiri tampil sebagai <figure><img> dengan alt, bukan tanda seru + tautan", async () => {
  const { srv, prose } = await setup("Paragraf pembuka.\n\n![Mahasiswa mengerjakan tugas di laptop](/uploads/mvgjm4fh-d6e3997d.webp)\n\nParagraf penutup.");
  try {
    const h = await prose();
    assert.match(h, /<figure><img src="\/uploads\/mvgjm4fh-d6e3997d\.webp" alt="Mahasiswa mengerjakan tugas di laptop" loading="lazy" decoding="async"><\/figure>/);
    assert.ok(!h.includes("!<a"), "masih tampil sebagai tanda seru + tautan: " + h);
    assert.ok(!/<p>\s*<figure>/.test(h), "figure tidak boleh di dalam <p>");
    assert.match(h, /<p>Paragraf pembuka\.<\/p>/);
    assert.match(h, /<p>Paragraf penutup\.<\/p>/);
  } finally { srv.close(); }
});

test("foto di tengah kalimat tampil sebagai <img> di dalam paragraf", async () => {
  const { srv, prose } = await setup("Lihat contoh ![tangkapan layar](/uploads/a1.png) di sini.");
  try {
    const h = await prose();
    assert.match(h, /<p>Lihat contoh <img src="\/uploads\/a1\.png" alt="tangkapan layar" loading="lazy" decoding="async"> di sini\.<\/p>/);
  } finally { srv.close(); }
});

test("gambar dari luar /uploads, javascript:, path traversal, atau alt berbahaya tidak menjadi <img> yang bisa disalahgunakan", async () => {
  const body = [
    "![luar](https://evil.example/x.png)",
    "![js](javascript:alert(1))",
    "![naik](/uploads/../data/users.json)",
    "![tanpa ekstensi](/uploads/abc)",
    '![a" onerror="alert(1)](/uploads/ok.webp)',
  ].join("\n\n");
  const { srv, prose } = await setup(body);
  try {
    const h = await prose();
    const srcs = [...h.matchAll(/<img src="([^"]*)"/g)].map(m => m[1]);
    assert.deepStrictEqual(srcs, ["/uploads/ok.webp"], "hanya /uploads/<nama aman>.<ekstensi gambar> yang boleh: " + h);
    assert.ok(!/onerror="/i.test(h), "alt tidak di-escape: " + h);
    assert.ok(!/(href|src)="javascript/i.test(h), "javascript: tidak boleh jadi tautan/gambar: " + h);
    assert.ok(!h.includes("users.json\""), "path traversal tidak boleh jadi src: " + h);
  } finally { srv.close(); }
});

test("tabel, H4, dan id judul untuk daftar isi; isi tabel tetap di-escape", async () => {
  const { srv, prose } = await setup("## Jadwal Ujian\n\n| Kegiatan | Tanggal |\n|---|---|\n| UAS <b>1</b> | 1 Des |\n\n#### Catatan kecil\n\n## Jadwal Ujian");
  try {
    const h = await prose();
    assert.match(h, /<h2 id="jadwal-ujian">Jadwal Ujian<\/h2>/);
    assert.match(h, /<h2 id="jadwal-ujian-2">/, "id judul ganda dibuat unik");
    assert.match(h, /<thead><tr><th scope="col">Kegiatan<\/th><th scope="col">Tanggal<\/th><\/tr><\/thead><tbody><tr><td>UAS &lt;b&gt;1&lt;\/b&gt;<\/td><td>1 Des<\/td><\/tr><\/tbody>/);
    assert.match(h, /<h4 id="catatan-kecil">Catatan kecil<\/h4>/);
  } finally { srv.close(); }
});

test("foto tidak ikut dihitung sebagai kata (wordCount JSON-LD dan deskripsi otomatis)", async () => {
  const root = await setup("![Foto](/uploads/foto-1.webp)\n\nIsi tulisan yang sebenarnya.");
  try {
    const html = await (await fetch(root.base + "/blog/foto-isi")).text();
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.strictEqual(ld[0].wordCount, 4, "foto tidak dihitung sebagai kata");
  } finally { root.srv.close(); }
});
