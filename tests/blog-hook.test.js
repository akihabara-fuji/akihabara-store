"use strict";
/* Hook layanan di artikel: otomatis dari isi, bisa diganti atau dimatikan per artikel; tanggal rekomendasi tersimpan. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

async function setup(posts) {
  process.env.ACAD_URL = "https://akademik.test"; process.env.SITE_URL = "https://nextaja.test";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-hook-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts }));
  const app = express(); app.use(express.json());
  const blog = require("../blog-akun")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://akademik.test", getSettings: () => ({}) });
  app.use((req, res) => blog.notFound(req, res));
  const srv = app.listen(0);
  return { srv, base: "http://127.0.0.1:" + srv.address().port };
}
const iso = new Date(Date.UTC(2026, 9, 20, 5)).toISOString();
const mk = (id, title, extra = {}) => ({ id, slug: "s-" + id, title, excerpt: "Ringkasan.", body: "## Isi\n\nParagraf.", topic: "study", status: "published", tags: [], createdAt: iso, updatedAt: iso, publishedAt: iso, ...extra });
const get = async (t, slug) => (await fetch(t.base + "/blog/" + slug)).text();

test("hook otomatis mengikuti isi artikel, ada di atas dan di samping", async () => {
  const t = await setup([mk("a", "Cara Menghindari Plagiarisme UT"), mk("b", "Panduan Metopen UT untuk Pemula")]);
  try {
    const a = await get(t, "s-a"), b = await get(t, "s-b");
    assert.ok(a.includes('class="ax-hook"') && a.includes('href="/audit"') && a.includes("ax-hook-side"));
    assert.ok(b.includes("metopen_paket"));
  } finally { t.srv.close(); }
});

test("hook bisa diganti layanan dan kalimatnya, atau dimatikan", async () => {
  const t = await setup([mk("c", "Cara Menghindari Plagiarisme UT", { hookService: "diskusi", hookText: "Diskusi belum kejawab?" }), mk("d", "Cara Menghindari Plagiarisme UT 2", { hookService: "off" })]);
  try {
    const c = await get(t, "s-c"), d = await get(t, "s-d");
    assert.ok(c.includes("Diskusi belum kejawab?") && c.includes("s=diskusi"));
    assert.ok(!d.includes("ax-hook"));
  } finally { t.srv.close(); }
});

test("simpan artikel: hook dan tanggal rekomendasi divalidasi", async () => {
  const t = await setup([]);
  try {
    const save = b => fetch(t.base + "/ms/admin/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Draf tes", status: "draft", body: "x", ...b }) }).then(r => r.json());
    const r = await save({ hookService: "tugas", recommendedAt: "2026-11-02", recommendedWhy: "sebelum tuton dibuka" });
    const list = await (await fetch(t.base + "/ms/admin/posts")).json();
    const p = (list.posts || list.items || []).find(x => x.title === "Draf tes");
    assert.ok(p, JSON.stringify(r).slice(0, 200));
    assert.strictEqual(p.hookService, "tugas"); assert.strictEqual(p.recommendedAt, "2026-11-02");
    await save({ id: p.id, hookService: "ngawur", recommendedAt: "besok" });
    const p2 = ((await (await fetch(t.base + "/ms/admin/posts")).json()).posts || []).find(x => x.id === p.id);
    assert.strictEqual(p2.hookService, ""); assert.strictEqual(p2.recommendedAt, "");
  } finally { t.srv.close(); }
});
