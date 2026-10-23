"use strict";
/* Alur akun end-to-end pada server uji (data sementara, bukan produksi). */
const test = require("node:test"), assert = require("node:assert");
const express = require("express"), path = require("path"), fs = require("fs"), os = require("os");

function getCookie(req, name) { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : ""; }
function sameOrigin(req) { const o = req.headers.origin || req.headers.referer || ""; if (!o) return false; try { return new URL(o).host === req.headers.host; } catch { return false; } }
async function boot(secure = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "au-")); fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const app = express();
  require("../blog-akun.js")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin, getCookie, SECURE_COOKIE: secure, ROOT: root, SITE: "https://catatanakademik.com", getSettings: () => ({}) });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const jar = {};
  const call = async (p, o = {}) => {
    const h = { Origin: base, ...(o.headers || {}) };
    if (jar.c) h.Cookie = jar.c;
    const r = await fetch(base + p, { redirect: "manual", ...o, headers: { ...(o.body ? { "content-type": "application/json" } : {}), ...h } });
    const sc = r.headers.get("set-cookie"); if (sc) jar.c = sc.startsWith("nx_user=;") ? "" : sc.split(";")[0];
    return { r, sc, j: await r.clone().json().catch(() => null), t: await r.text() };
  };
  const post = (p, b, headers) => call(p, { method: "POST", body: JSON.stringify(b), headers });
  return { base, call, post, jar, close: () => srv.close() };
}

test("daftar: validasi, sukses, cookie aman, email ganda ditolak", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.post("/ms/auth/register", { name: "", email: "a@b.co", password: "12345678" })).r.status, 400);
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "bukan-email", password: "12345678" })).r.status, 400);
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.com", password: "pendek" })).r.status, 400);
    const ok = await t.post("/ms/auth/register", { name: "Uji", email: "Uji@Example.com", password: "sandi-uji-123" });
    assert.strictEqual(ok.r.status, 200); assert.strictEqual(ok.j.user.email, "uji@example.com");
    assert.match(ok.sc, /HttpOnly/); assert.match(ok.sc, /Secure/); assert.match(ok.sc, /SameSite=Lax/);
    assert.ok(!JSON.stringify(ok.j).includes("hash"), "hash tidak boleh bocor");
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.com", password: "sandi-uji-123" })).r.status, 409);
  } finally { t.close(); }
});

test("masuk, sesi, keluar: cookie dipakai, logout menghapus, sandi salah ditolak", async () => {
  const t = await boot();
  try {
    await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.com", password: "sandi-uji-123" });
    await t.post("/ms/auth/logout", {}); assert.strictEqual(t.jar.c, "");
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null);
    assert.strictEqual((await t.call("/ms/akun")).r.status, 302);
    assert.strictEqual((await t.call("/ms/auth/orders")).r.status, 401);
    assert.strictEqual((await t.post("/ms/auth/login", { email: "uji@example.com", password: "salah-salah" })).r.status, 401);
    assert.strictEqual((await t.post("/ms/auth/login", { email: "UJI@example.com", password: "sandi-uji-123" })).r.status, 200);
    assert.strictEqual((await t.call("/ms/auth/me")).j.user.email, "uji@example.com");
    assert.strictEqual((await t.call("/ms/akun")).r.status, 200);
    assert.strictEqual((await t.call("/ms/masuk")).r.status, 302, "sudah masuk: halaman masuk mengarahkan ke akun");
    await t.post("/ms/auth/logout", {});
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null);
  } finally { t.close(); }
});

test("keamanan: asal permintaan asing ditolak, cookie palsu ditolak, batas percobaan", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.post("/ms/auth/login", { email: "a@b.co", password: "x" }, { Origin: "https://jahat.example" })).r.status, 403);
    t.jar.c = "nx_user=eyJ1IjoiYWJjIiwiZSI6OTk5OTk5OTk5OTk5OX0.palsu";
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null);
    t.jar.c = "";
    let last; for (let i = 0; i < 8; i++) last = await t.post("/ms/auth/login", { email: "x@y.co", password: "salah-salah" });
    assert.strictEqual(last.r.status, 429);
  } finally { t.close(); }
});

test("ganti sandi: sandi lama wajib benar, sandi baru berlaku", async () => {
  const t = await boot();
  try {
    await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.com", password: "sandi-uji-123" });
    assert.strictEqual((await t.post("/ms/auth/password", { old: "salah", new: "sandi-baru-456" })).r.status, 401);
    assert.strictEqual((await t.post("/ms/auth/password", { old: "sandi-uji-123", new: "sandi-baru-456" })).r.status, 200);
    await t.post("/ms/auth/logout", {});
    assert.strictEqual((await t.post("/ms/auth/login", { email: "uji@example.com", password: "sandi-uji-123" })).r.status, 401);
    assert.strictEqual((await t.post("/ms/auth/login", { email: "uji@example.com", password: "sandi-baru-456" })).r.status, 200);
  } finally { t.close(); }
});

test("halaman masuk: script bisa di-parse dan ?next= dibatasi ke jalur sendiri", async () => {
  const t = await boot();
  try {
    const h = (await t.call("/ms/masuk?next=/audit")).t;
    const scripts = [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes("var NEXT="));
    assert.strictEqual(scripts.length, 1);
    const src = scripts[0].match(/var NEXT=\(function\(\)\{(.*?)\}\)\(\);var mode/s)[1];
    const NEXT = q => new Function("location", "URLSearchParams", src)({ search: q }, URLSearchParams);
    assert.strictEqual(NEXT("?next=/audit"), "/audit");
    assert.strictEqual(NEXT("?next=/ruangakademikut/pesanan?x=1"), "/ruangakademikut/pesanan?x=1");
    for (const bad of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/\\evil.com", ""]) assert.strictEqual(NEXT("?next=" + encodeURIComponent(bad)), "/ms/akun", bad);
  } finally { t.close(); }
});

test("ganti sandi membatalkan sesi di perangkat lain, perangkat ini tetap masuk", async () => {
  const t = await boot();
  try {
    await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.com", password: "sandi-uji-123" });
    const lama = t.jar.c;
    assert.strictEqual((await t.post("/ms/auth/password", { old: "sandi-uji-123", new: "sandi-baru-456" })).r.status, 200);
    assert.strictEqual((await t.call("/ms/auth/me")).j.user.email, "uji@example.com", "perangkat ini tetap masuk");
    t.jar.c = lama;
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null, "cookie lama tidak berlaku lagi");
  } finally { t.close(); }
});

test("daftar massal dari satu IP dibatasi", async () => {
  const t = await boot();
  try {
    let last; for (let i = 0; i < 12; i++) last = await t.post("/ms/auth/register", { name: "U" + i, email: `u${i}@example.com`, password: "sandi-uji-123" });
    assert.strictEqual(last.r.status, 429);
  } finally { t.close(); }
});
