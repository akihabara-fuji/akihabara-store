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
