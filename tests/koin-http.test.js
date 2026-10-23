"use strict";
/* Alur uang end-to-end lewat HTTP: daftar akun -> tagihan isi koin -> bukti bayar -> konfirmasi admin -> bayar pesanan pakai koin -> batal -> koin kembali (sekali saja). */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");
const express = require("express");
const sharp = require("sharp");

const OWNER_PW = "sandi-pemilik-uji-123";
async function setup() {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "koin-http-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  const db = require("../parafrase/db").open(":memory:");
  const app = express(); app.set("trust proxy", 1);
  const getCookie = (req, name) => { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : ""; };
  const sameOrigin = req => !!req.headers.origin;
  const auth = require("../admin-ca/auth")({ db, getCookie, sameOrigin, SECURE_COOKIE: false, ownerPassword: OWNER_PW, sharedWithNextaja: false, secret: "s".repeat(40) });
  auth.mount(app, express);
  const requireAdmin = (req, res, next) => auth.isCaPath(req.path) ? auth.guard(req, res, next) : res.status(401).json({ error: "nextaja" });
  let pf = null;
  const blog = require("../blog-akun")({ app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test", getSettings: () => ({}), onRegister: u => (pf ? pf.koin.welcome(u.id) : 0), getBonus: () => (pf ? Number(pf.settings.get("koin_bonus_daftar")) || 0 : 0) });
  pf = require("../parafrase")({ app, express, requireAdmin, sameOrigin, ROOT: root, db, userFrom: blog.userFrom, users: blog });
  require("../admin-ca")({ app, express, db, auth, requireAdmin, blog, settings: pf.settings, orders: pf.orders, koin: pf.koin, traffic: pf.traffic, ROOT: root, UPLOADS: path.join(root, "public", "uploads"), sharp: null, ACAD: "https://contoh.test" });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const call = async (p, { cookie = "", method = "GET", json, form } = {}) => {
    const r = await fetch(base + p, { method, headers: { origin: base, cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : form, redirect: "manual" });
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json() : await r.text(), headers: r.headers };
  };
  const ck = r => (r.headers.get("set-cookie") || "").split(",").map(x => x.split(";")[0].trim()).filter(Boolean).join("; ");
  return { srv, call, ck, pf, base };
}

test("koin: isi koin, bayar layanan, batal, koin kembali sekali; tanpa login atau tanpa izin ditolak", async () => {
  const { srv, call, ck, pf } = await setup();
  try {
    // tanpa login
    assert.strictEqual((await call("/ms/koin/topup", { method: "POST", json: { rupiah: 50000 } })).status, 401);
    assert.strictEqual((await call("/ms/admin/koin/queue")).status, 401);

    // mahasiswa mendaftar
    const reg = await call("/ms/auth/register", { method: "POST", json: { name: "Uji Koin", email: "koin@example.test", password: "sandi-uji-12345" } });
    assert.strictEqual(reg.status, 200, JSON.stringify(reg.body));
    const mhs = ck(reg);
    // bonus daftar: 7 koin gratis, sekali per akun, tidak dihitung sebagai uang masuk atau kewajiban kas
    assert.strictEqual(reg.body.bonus, 7);
    assert.strictEqual((await call("/ms/koin/saldo", { cookie: mhs })).body.balance, 7);
    assert.strictEqual(pf.koin.welcome(reg.body.user.id), 0, "tidak bisa mengambil bonus dua kali");
    const s0 = pf.koin.summary(); assert.strictEqual(s0.promoCoins, 7); assert.strictEqual(s0.liabilityRp, 0); assert.strictEqual(s0.incomeRp, 0); assert.strictEqual(s0.shortfallRp, 0);
    assert.ok((await call("/ms/masuk")).body.includes("7 koin gratis"), "halaman daftar menyebut bonus");

    // tagihan: hanya kelipatan Rp1.000
    assert.strictEqual((await call("/ms/koin/topup", { method: "POST", cookie: mhs, json: { rupiah: 50500 } })).status, 400);
    const tp = await call("/ms/koin/topup", { method: "POST", cookie: mhs, json: { rupiah: 50000 } });
    assert.strictEqual(tp.status, 200, JSON.stringify(tp.body));
    const token = tp.body.topup.token; assert.strictEqual(tp.body.topup.coins, 50);

    // bukti bayar
    const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#4a4" } }).png().toBuffer();
    const fd = new FormData(); fd.append("proof", new Blob([png], { type: "image/png" }), "bukti.png");
    const pr = await call(`/ms/koin/topup/${token}/proof`, { method: "POST", cookie: mhs, form: fd });
    assert.strictEqual(pr.status, 200, JSON.stringify(pr.body));
    assert.strictEqual(pf.koin.balance(reg.body.user ? reg.body.user.id : (await call("/ms/auth/me", { cookie: mhs })).body.user.id), 7, "koin isi ulang belum masuk sebelum admin konfirmasi (hanya bonus 7)");

    // admin konfirmasi (pemilik); mahasiswa tidak boleh
    assert.strictEqual((await call(`/ms/admin/koin/topups/${token}/confirm`, { method: "POST", cookie: mhs })).status, 401);
    const lg = await fetch(`http://127.0.0.1:${srv.address().port}/ms/admin/ca/login`, { method: "POST", headers: { origin: `http://127.0.0.1:${srv.address().port}`, "content-type": "application/json" }, body: JSON.stringify({ username: "pemilik", password: OWNER_PW }) });
    const admin = ck(lg);
    const cf = await call(`/ms/admin/koin/topups/${token}/confirm`, { method: "POST", cookie: admin });
    assert.strictEqual(cf.status, 200, JSON.stringify(cf.body)); assert.strictEqual(cf.body.balance, 57, "50 koin isi ulang + 7 bonus daftar");
    assert.strictEqual((await call(`/ms/admin/koin/topups/${token}/confirm`, { method: "POST", cookie: admin })).status, 409, "konfirmasi dua kali ditolak");
    assert.strictEqual((await call("/ms/koin/saldo", { cookie: mhs })).body.balance, 57);

    // pesan layanan Tugas (Rp35.000 = 35 koin) pakai koin
    const mk = pay => { const f = new FormData(); f.append("service", "tugas"); f.append("wa", "081234567890"); f.append("agree", "true"); f.append("brief", "Tugas 1 Manajemen, tolong dibantu"); f.append("pay", pay); return f; };
    const od = await call("/ms/layanan/order", { method: "POST", cookie: mhs, form: mk("koin") });
    assert.strictEqual(od.status, 200, JSON.stringify(od.body)); assert.strictEqual(od.body.paid, "koin"); assert.strictEqual(od.body.coins, 35); assert.strictEqual(od.body.balance, 22);
    const od2 = await call("/ms/layanan/order", { method: "POST", cookie: mhs, form: mk("koin") });
    assert.strictEqual(od2.status, 402, "saldo 22 tidak cukup untuk 35 koin"); assert.strictEqual(pf.koin.balance((await call("/ms/auth/me", { cookie: mhs })).body.user.id), 22);
    assert.strictEqual((await call("/ms/layanan/order", { method: "POST", form: mk("koin") })).status, 401, "bayar koin wajib login");

    // batal -> koin kembali, hanya sekali
    const oid = od.body.orderId;
    const cn = await call(`/ms/admin/ca/orders/${oid}/cancel`, { method: "POST", cookie: admin, json: { reason: "uji pembatalan" } });
    assert.strictEqual(cn.status, 200, JSON.stringify(cn.body)); assert.strictEqual(cn.body.coinBack, 35);
    assert.strictEqual((await call("/ms/koin/saldo", { cookie: mhs })).body.balance, 57);
    assert.strictEqual((await call(`/ms/admin/ca/orders/${oid}/cancel`, { method: "POST", cookie: admin, json: { reason: "ulang" } })).status, 409);
    assert.strictEqual((await call("/ms/koin/saldo", { cookie: mhs })).body.balance, 57, "tidak ada pengembalian ganda");

    // dana: pengambilan tidak boleh melebihi kas
    const s = (await call("/ms/admin/koin", { cookie: admin })).body.summary;
    assert.strictEqual(s.topupRp, 50000);
    assert.strictEqual((await call("/ms/admin/koin/withdraw", { method: "POST", cookie: admin, json: { amount: 999999, category: "Domain" } })).status, 409);
    assert.strictEqual((await call("/ms/admin/koin/withdraw", { method: "POST", cookie: admin, json: { amount: 10000, category: "Domain" } })).status, 200);
  } finally { srv.close(); }
});
