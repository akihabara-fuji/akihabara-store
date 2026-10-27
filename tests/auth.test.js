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
  return { root, base, call, post, jar, close: () => srv.close() };
}

test("daftar: validasi, sukses, cookie aman, email ganda ditolak", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.post("/ms/auth/register", { name: "", email: "a@b.id", password: "sandiuji123" })).r.status, 400);
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "bukan-email", password: "sandiuji123" })).r.status, 400);
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.test", password: "123" })).r.status, 400);
    const ok = await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.test", password: "sandiuji123" });
    assert.strictEqual(ok.r.status, 200);
    assert.ok(/HttpOnly/.test(ok.sc) && /SameSite=Lax/.test(ok.sc) && /Secure/.test(ok.sc), "atribut cookie: " + ok.sc.replace(/nx_user=[^;]+/, "nx_user=..."));
    assert.ok(!JSON.stringify(ok.j).includes("hash") && !JSON.stringify(ok.j).includes("salt"), "respons tidak boleh memuat hash atau salt");
    assert.strictEqual((await t.post("/ms/auth/register", { name: "Uji", email: "UJI@example.test", password: "sandiuji123" })).r.status, 409);
    const stored = JSON.parse(fs.readFileSync(path.join(t.root, "data", "users.json"), "utf8"));
    assert.ok(stored.users[0].hash && !JSON.stringify(stored).includes("sandiuji123"), "sandi tidak boleh tersimpan polos");
  } finally { t.close(); }
});

test("masuk: sandi salah ditolak, benar berhasil, sesi bertahan, keluar mengakhiri sesi", async () => {
  const t = await boot();
  try {
    await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.test", password: "sandiuji123" });
    assert.strictEqual((await fetch(t.base + "/ms/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 403, "keluar tanpa Origin ditolak");
    await t.post("/ms/auth/logout", {}); t.jar.c = "";
    const bad = await t.post("/ms/auth/login", { email: "uji@example.test", password: "salah-salah" });
    assert.strictEqual(bad.r.status, 401); assert.ok(!bad.sc);
    assert.strictEqual((await t.post("/ms/auth/login", { email: "tidakada@example.test", password: "sandiuji123" })).j.error, bad.j.error, "pesan sama untuk email tak dikenal");
    const ok = await t.post("/ms/auth/login", { email: "uji@example.test", password: "sandiuji123" });
    assert.strictEqual(ok.r.status, 200);
    assert.strictEqual((await t.call("/ms/auth/me")).j.user.email, "uji@example.test");
    assert.strictEqual((await t.call("/ms/auth/me")).j.user.email, "uji@example.test", "sesi bertahan setelah navigasi");
    assert.strictEqual((await t.call("/ms/akun")).r.status, 200);
    await t.post("/ms/auth/logout", {});
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null);
    const akun = await t.call("/ms/akun"); assert.strictEqual(akun.r.status, 302);
  } finally { t.close(); }
});

test("asal permintaan: tanpa Origin atau beda domain ditolak", async () => {
  const t = await boot();
  try {
    const body = JSON.stringify({ email: "x@example.test", password: "sandiuji123" });
    const h = { "content-type": "application/json" };
    assert.strictEqual((await fetch(t.base + "/ms/auth/login", { method: "POST", headers: h, body })).status, 403);
    assert.strictEqual((await fetch(t.base + "/ms/auth/login", { method: "POST", headers: { ...h, Origin: "https://evil.test" }, body })).status, 403);
  } finally { t.close(); }
});

test("ganti sandi membatalkan sesi lama dan menerbitkan sesi baru untuk perangkat ini", async () => {
  const t = await boot();
  try {
    await t.post("/ms/auth/register", { name: "Uji", email: "uji@example.test", password: "sandiuji123" });
    const lama = t.jar.c;
    const ch = await t.post("/ms/auth/password", { old: "sandiuji123", new: "sandibaru456" });
    assert.strictEqual(ch.r.status, 200);
    assert.ok(t.jar.c && t.jar.c !== lama, "perangkat ini mendapat sesi baru");
    assert.strictEqual((await t.call("/ms/auth/me")).j.user.email, "uji@example.test");
    const baru = t.jar.c; t.jar.c = lama;
    assert.strictEqual((await t.call("/ms/auth/me")).j.user, null, "sesi lama dibatalkan");
    t.jar.c = baru;
    assert.strictEqual((await t.post("/ms/auth/password", { old: "salah", new: "sandibaru789" })).r.status, 401);
  } finally { t.close(); }
});

test("pendaftaran massal dibatasi per IP", async () => {
  const t = await boot();
  try {
    let last = 0;
    for (let i = 0; i < 12; i++) { t.jar.c = ""; last = (await t.post("/ms/auth/register", { name: "U" + i, email: `u${i}@example.test`, password: "sandiuji123" })).r.status; }
    assert.strictEqual(last, 429);
  } finally { t.close(); }
});

test("halaman masuk: skrip bisa di-parse dan ?next= dibatasi ke jalur sendiri", async () => {
  const t = await boot();
  try {
    const h = await t.call("/ms/masuk");
    assert.strictEqual(h.r.status, 200);
    const scripts = [...h.t.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.includes("var NEXT="));
    assert.strictEqual(scripts.length, 1);
    assert.doesNotThrow(() => new Function(scripts[0]), "skrip halaman masuk harus valid sintaksnya");
    const m = scripts[0].match(/return (\/\^[^\n]*?\/)\.test\(n\)/); assert.ok(m, "pola next ditemukan");
    const re = eval(m[1]);
    const next = n => (re.test(n) && n.indexOf("//") !== 0 ? n : "/ms/akun");
    assert.strictEqual(next("/cek-parafrase-mandiri"), "/cek-parafrase-mandiri");
    assert.strictEqual(next("/ruangakademikut/layanan?s=tugas"), "/ruangakademikut/layanan?s=tugas");
    for (const jahat of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "evil.test"]) assert.strictEqual(next(jahat), "/ms/akun", jahat);
    assert.ok(/id="go"/.test(h.t) && /go\.disabled=true/.test(h.t), "tombol dikunci saat memproses");
  } finally { t.close(); }
});

test("persetujuan email info/promosi: wajib untuk Gmail, opsional untuk email lain, tersimpan dengan waktunya", async () => {
  const t = await boot();
  try {
    const no = await t.post("/ms/auth/register", { name: "Uji", email: "uji.gmail@gmail.com", password: "sandiuji123" });
    assert.strictEqual(no.r.status, 400); assert.strictEqual(no.j.needPromo, true);
    const no2 = await t.post("/ms/auth/register", { name: "Uji", email: "uji.gmail@gmail.com", password: "sandiuji123", promo: "true" });
    assert.strictEqual(no2.r.status, 400, "harus boolean true, bukan string");
    const ok = await t.post("/ms/auth/register", { name: "Uji", email: "uji.gmail@gmail.com", password: "sandiuji123", promo: true });
    assert.strictEqual(ok.r.status, 200);
    const other = await t.post("/ms/auth/register", { name: "Uji2", email: "uji2@example.test", password: "sandiuji123" });
    assert.strictEqual(other.r.status, 200, "email non-Gmail tidak wajib");
    const users = JSON.parse(fs.readFileSync(path.join(t.root, "data", "users.json"), "utf8")).users;
    const g = users.find(u => u.email === "uji.gmail@gmail.com"), o = users.find(u => u.email === "uji2@example.test");
    assert.ok(g.promo && g.promo.at && g.promo.via === "daftar"); assert.ok(!o.promo);
    const t2 = await boot(); const page = (await t2.call("/ms/masuk")).t; t2.close();
    assert.ok(page.includes('id="gPromo"') && page.includes('name="promo"'), "halaman masuk punya kotak centang");
  } finally { t.close(); }
});
