"use strict";
/* Sampul otomatis artikel (domain Catatan Akademik): dibuat dari judul, dipakai di kartu, halaman artikel, og:image; foto sendiri diutamakan. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

function setup() {
  process.env.ACAD_URL = "https://contoh.test";
  process.env.SITE_URL = "https://lain.test";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-cover-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const now = new Date().toISOString();
  const base = { topic: "study", excerpt: "R.", body: "Isi artikel yang cukup panjang untuk tes sampul.", status: "published", createdAt: now, updatedAt: now, publishedAt: now };
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts: [
    { ...base, id: "p1", slug: "tanpa-foto", title: "Cara Cek Nilai UT di MyUT" },
    { ...base, id: "p2", slug: "punya-foto", title: "Artikel dengan foto", cover: "/uploads/foto.webp" },
  ] }));
  const app = express();
  require("../blog-akun")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test" });
  const srv = app.listen(0);
  return { srv, base: "http://127.0.0.1:" + srv.address().port };
}
const UA = { "user-agent": "Mozilla/5.0 Chrome/120" };

test("artikel tanpa foto dapat sampul JPEG otomatis; yang punya foto tetap memakai fotonya", async () => {
  const { srv, base } = setup();
  try {
    const html = await (await fetch(base + "/blog/tanpa-foto", { headers: UA })).text();
    const m = /<figure class="ax-cover"><img src="(\/blog\/cover\/tanpa-foto\.jpg\?v=[a-f0-9]+)"/.exec(html);
    assert.ok(m, "sampul otomatis tidak dipasang di halaman artikel");
    assert.match(html, /property="og:image" content="https:\/\/contoh\.test\/blog\/cover\/tanpa-foto\.jpg\?v=/);
    const r = await fetch(base + m[1]);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type"), /image\/jpeg/);
    const buf = Buffer.from(await r.arrayBuffer());
    assert.ok(buf.length > 8000 && buf[0] === 0xff && buf[1] === 0xd8, "bukan JPEG yang wajar");
    const own = await (await fetch(base + "/blog/punya-foto", { headers: UA })).text();
    assert.ok(own.includes('src="/uploads/foto.webp"') && !own.includes("/blog/cover/punya-foto"));
    assert.equal((await fetch(base + "/blog/cover/tidak-ada.jpg")).status, 404);
    const list = await (await fetch(base + "/blog", { headers: UA })).text();
    assert.ok(list.includes("/blog/cover/tanpa-foto.jpg"), "kartu daftar belum memakai sampul otomatis");
  } finally { srv.close(); delete process.env.ACAD_URL; delete process.env.SITE_URL; }
});
