"use strict";
/* Penulis seragam "dk" dan penghitung pembaca artikel (unik per pengunjung per hari, bot tidak dihitung). */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-views-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts: [
    { id: "p1", slug: "satu", title: "Satu", topic: "study", excerpt: "R.", body: "Isi artikel satu yang cukup panjang untuk tes.", status: "published", author: "Dika Priyadi", createdAt: now, updatedAt: now, publishedAt: now },
    { id: "p2", slug: "dua", title: "Dua", topic: "study", excerpt: "R.", body: "Isi artikel dua yang cukup panjang untuk tes.", status: "published", author: "Dk", createdAt: now, updatedAt: now, publishedAt: now },
  ] }));
  const app = express();
  require("../blog-akun")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test" });
  const srv = app.listen(0);
  return { srv, base: "http://127.0.0.1:" + srv.address().port, root };
}
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120" };
const shown = html => (/([\d.]+) dilihat/.exec(html) || [])[1];

test("semua penulis jadi dk dan tampil di artikel", async () => {
  const { srv, base } = setup();
  try {
    const html = await (await fetch(base + "/blog/satu", { headers: UA })).text();
    assert.match(html, /Oleh <b>dk<\/b>/);
    const a = await (await fetch(base + "/ms/admin/posts")).json();
    assert.deepEqual(a.posts.map(p => p.author), ["dk", "dk"]);
  } finally { srv.close(); }
});

test("pembaca dihitung sekali per pengunjung, bot dan pratinjau tidak dihitung", async () => {
  const { srv, base } = setup();
  try {
    assert.equal(shown(await (await fetch(base + "/blog/satu", { headers: UA })).text()), "1");
    assert.equal(shown(await (await fetch(base + "/blog/satu", { headers: UA })).text()), "1"); // pengunjung sama
    assert.equal(shown(await (await fetch(base + "/blog/satu", { headers: { "user-agent": "Googlebot/2.1" } })).text()), "1"); // bot
    assert.equal(shown(await (await fetch(base + "/blog/satu", { headers: { "user-agent": "Mozilla/5.0 Firefox/120" } })).text()), "2"); // pengunjung lain
    assert.equal(shown(await (await fetch(base + "/blog/dua", { headers: UA })).text()), "1");
    const a = await (await fetch(base + "/ms/admin/posts")).json();
    const v = Object.fromEntries(a.posts.map(p => [p.slug, p.views]));
    assert.deepEqual(v.satu, { total: 2, week: 2 });
    assert.deepEqual(v.dua, { total: 1, week: 1 });
  } finally { srv.close(); }
});

test("aksi massal: pindah ke sampah, pulihkan, hapus permanen (sekali simpan)", async () => {
  const { srv, base } = setup();
  const post = (b) => fetch(base + "/ms/admin/posts/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  try {
    assert.equal((await post({ ids: [], action: "trash" })).status, 400);
    assert.equal((await post({ ids: ["p1"], action: "aneh" })).status, 400);
    assert.deepEqual(await (await post({ ids: ["p1", "p2", "nope"], action: "trash" })).json(), { ok: true, count: 2 });
    let a = await (await fetch(base + "/ms/admin/posts")).json();
    assert.equal(a.posts.length, 0); assert.equal(a.trash.length, 2);
    assert.equal((await fetch(base + "/blog/satu", { headers: UA })).status, 404);
    assert.equal((await (await post({ ids: ["p1"], action: "restore" })).json()).count, 1);
    assert.equal((await (await post({ ids: ["p1", "p2"], action: "delete" })).json()).count, 1); // hanya yang di sampah (p2)
    a = await (await fetch(base + "/ms/admin/posts")).json();
    assert.deepEqual([a.posts.length, a.trash.length], [1, 0]);
  } finally { srv.close(); }
});
