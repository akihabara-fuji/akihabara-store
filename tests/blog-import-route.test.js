"use strict";
/* Tes rute HTTP impor .md (POST /ms/admin/posts/import). Logika parsing sudah dites di blog-import.test.js;
   di sini yang diuji: gerbang admin, hasil di daftar admin, draf tidak tampil di publik, impor ulang, batas 30 file, tersimpan ke disk, host akademik. */
const test = require("node:test"), assert = require("node:assert");
const express = require("express"), path = require("path"), fs = require("fs"), os = require("os"), http = require("http");

const BODY = "## Bagian satu\n\n" + "Ini kalimat contoh yang cukup panjang untuk isi artikel. ".repeat(12) + "\n\n## Bagian dua\n\nLihat [layanan](https://catatanakademik.com/layanan) dan [UT](https://ut.ac.id).\n\nKami tidak menjamin nilai atau kelulusan. Semangat!\n";
const md = (title, extra = "") => `---\ntitle: ${title}\nslug: ${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}\ntags: [uas ut, tuton]\ntopic: study\n${extra}---\n\n${BODY}`;

async function boot({ acad = false } = {}) {
  const saved = { a: process.env.ACAD_URL, s: process.env.SITE_URL };
  if (acad) { process.env.ACAD_URL = "https://akademik.example.test"; process.env.SITE_URL = "https://utama.example.test"; } else { delete process.env.ACAD_URL; }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bir-")); fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts: [] }));
  const app = express();
  // gerbang admin tiruan: hanya permintaan dengan header x-admin yang lolos
  const requireAdmin = (req, res, next) => (req.headers["x-admin"] === "1" ? ((req.admin = { name: "uji" }), next()) : res.status(401).json({ error: "Perlu login admin." }));
  require("../blog-akun.js")({ app, express, requireAdmin, sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://example.test", getSettings: () => ({}) });
  const srv = app.listen(0), port = srv.address().port;
  Object.assign(process.env, {}); if (saved.a === undefined) delete process.env.ACAD_URL; else process.env.ACAD_URL = saved.a; if (saved.s === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = saved.s;
  const call = (method, p, body, headers = {}) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request({ host: "127.0.0.1", port, method, path: p, headers: { ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}), ...headers } }, res => {
      let t = ""; res.on("data", c => (t += c)); res.on("end", () => { let j = null; try { j = JSON.parse(t); } catch {} resolve({ status: res.statusCode, j, t }); });
    });
    r.on("error", reject); if (data) r.write(data); r.end();
  });
  const imp = (files, headers = { "x-admin": "1" }) => call("POST", "/ms/admin/posts/import", { files }, headers);
  const list = (headers = { "x-admin": "1" }) => call("GET", "/ms/admin/posts", undefined, headers);
  return { root, imp, list, call, close: () => srv.close() };
}

test("impor: tanpa login admin ditolak dan tidak membuat draf", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.imp([{ name: "a.md", text: md("Artikel satu") }], {})).status, 401);
    assert.strictEqual((await t.list()).j.posts.length, 0);
  } finally { t.close(); }
});

test("impor: tanpa file ditolak 400", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.imp([])).status, 400);
    assert.strictEqual((await t.call("POST", "/ms/admin/posts/import", {}, { "x-admin": "1" })).status, 400);
  } finally { t.close(); }
});

test("impor: semua jadi DRAF, tidak tampil di publik, tersimpan ke disk, penulis tercatat", async () => {
  const t = await boot();
  try {
    const r = await t.imp([{ name: "satu.md", text: md("Artikel satu") }, { name: "dua.md", text: md("Artikel dua") }]);
    assert.strictEqual(r.status, 200); assert.strictEqual(r.j.created, 2);
    const posts = (await t.list()).j.posts;
    assert.strictEqual(posts.length, 2);
    for (const p of posts) { assert.strictEqual(p.status, "draft"); assert.ok(/impor \.md/.test(p.updatedBy)); assert.ok(!p.publishedAt, "draf tidak boleh punya tanggal terbit"); }
    // draf tidak boleh bisa dibuka publik
    for (const p of posts) assert.notStrictEqual((await t.call("GET", "/blog/" + p.slug)).status, 200, "draf bocor ke publik: " + p.slug);
    const onDisk = JSON.parse(fs.readFileSync(path.join(t.root, "data", "blog.json"), "utf8"));
    assert.strictEqual(onDisk.posts.length, 2); assert.ok(onDisk.posts.every(p => p.status === "draft"));
  } finally { t.close(); }
});

test("impor ulang: judul sama dilewati (tidak menggandakan), file lain tetap masuk", async () => {
  const t = await boot();
  try {
    await t.imp([{ name: "satu.md", text: md("Artikel satu") }]);
    const r = await t.imp([{ name: "satu.md", text: md("Artikel satu") }, { name: "tiga.md", text: md("Artikel tiga") }]);
    assert.strictEqual(r.j.created, 1);
    assert.ok(r.j.results.find(x => x.name === "satu.md").skipped);
    assert.strictEqual((await t.list()).j.posts.length, 2);
  } finally { t.close(); }
});

test("impor: file gagal (bukan .md, isi terlalu pendek) tidak menghentikan file lain", async () => {
  const t = await boot();
  try {
    const r = await t.imp([{ name: "gambar.png", text: "x" }, { name: "pendek.md", text: "# Pendek\n\nhalo" }, { name: "ok.md", text: md("Artikel sehat") }]);
    assert.strictEqual(r.status, 200); assert.strictEqual(r.j.created, 1);
    assert.strictEqual(r.j.results.filter(x => !x.ok).length, 2);
    assert.strictEqual(r.j.results.find(x => x.name === "ok.md").ok, true);
  } finally { t.close(); }
});

test("impor: maksimal 30 file diproses; slug tetap unik untuk judul yang mirip", async () => {
  const t = await boot();
  try {
    const files = Array.from({ length: 35 }, (_, i) => ({ name: `f${i}.md`, text: md("Artikel nomor " + i) }));
    const r = await t.imp(files);
    assert.strictEqual(r.j.created, 30); assert.strictEqual(r.j.results.length, 30);
    const slugs = (await t.list()).j.posts.map(p => p.slug);
    assert.strictEqual(new Set(slugs).size, slugs.length, "slug harus unik");
    const k = await t.imp([{ name: "a.md", text: md("Judul Kembar!") }, { name: "b.md", text: `---\ntitle: Judul kembar?\nslug: judul-kembar\n---\n\n${BODY}` }]);
    assert.ok(k.j.created >= 1);
    const s2 = (await t.list()).j.posts.map(p => p.slug); assert.strictEqual(new Set(s2).size, s2.length);
  } finally { t.close(); }
});

test("impor: peringatan pemeriksaan muncul (klaim terlarang, H2 kosong, tanpa penafian)", async () => {
  const t = await boot();
  try {
    const bad = `---\ntitle: Artikel bermasalah\n---\n\n${"Kami beri garansi nilai aman dan pasti lolos Turnitin. ".repeat(50) /* >= 300 kata, batas peringatan H2 */}`;
    const r = await t.imp([{ name: "bad.md", text: bad }]);
    assert.strictEqual(r.j.created, 1);
    const w = r.j.results[0].warnings.join(" | ");
    assert.ok(/garansi|klaim|terlarang/i.test(w), "klaim terlarang harus ditandai: " + w);
    assert.ok(/H2|sub-judul/i.test(w), "ketiadaan H2 harus ditandai: " + w);
    assert.ok(/penafian|tidak menjamin/i.test(w), "penafian harus ditandai: " + w);
  } finally { t.close(); }
});

test("host akademik: topik dibatasi ke study/updateut; di host utama topik lain boleh", async () => {
  const t = await boot({ acad: true });
  try {
    const r = await t.call("POST", "/ms/admin/posts/import", { files: [{ name: "x.md", text: md("Topik sosial", "").replace("topic: study", "topic: social") }] }, { "x-admin": "1", host: "akademik.example.test" });
    assert.strictEqual(r.status, 200);
    const p = (await t.call("GET", "/ms/admin/posts", undefined, { "x-admin": "1", host: "akademik.example.test" })).j.posts[0];
    assert.ok(["study", "updateut"].includes(p.topic), "di host akademik topik harus akademik, dapat: " + p.topic);
  } finally { t.close(); }
});
