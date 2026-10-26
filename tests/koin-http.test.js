"use strict";
/* Koin sudah dihapus: semua pesanan lewat QRIS + bukti bayar, tanpa login dan tanpa potongan saldo. */
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
  pf = require("../parafrase")({ app, express, requireAdmin, sameOrigin, ROOT: root, db, userFrom: blog.userFrom, users: { byId: blog.userById, byEmail: blog.userByEmail } });
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


test("tanpa koin: pesanan Cek & Parafrase dan Audit dibuat tanpa login, bayar QRIS (menunggu_bayar), /koin dialihkan", async () => {
  const { docx } = require("./pf-helper");
  const { srv, call, pf } = await setup();
  try {
    pf.settings.set({ free_words: 0, bayar_koin_saja: true }); // pengaturan lama "koin saja" harus diabaikan
    const up = async path => { const fd = new FormData(); fd.append("file", new Blob([await docx("Isi uji untuk pesanan rupiah.")]), "t.docx"); const r = await call(path, { method: "POST", form: fd }); return r.body.uploadId; };
    const dok = { wa: "081234567890", agree: true, deadline: Date.now() + 3 * 864e5 };
    const o = await call("/ms/parafrase/order", { method: "POST", json: { ...dok, uploadId: await up("/ms/parafrase/upload") } });
    assert.strictEqual(o.status, 200, JSON.stringify(o.body)); assert.ok(!o.body.paid && !o.body.coins, "tidak ada pembayaran koin");
    const row = pf.db.prepare("SELECT * FROM orders WHERE id=?").get(o.body.orderId);
    assert.strictEqual(row.status, "menunggu_bayar"); assert.ok(row.unique_code > 0, "kode unik QRIS dipakai"); assert.strictEqual(row.total, row.base_total + row.unique_code);
    const a = await call("/ms/audit/order", { method: "POST", json: { uploadId: await up("/ms/audit/upload"), wa: "081234567890", agree: true } });
    if (a.status === 200) { assert.ok(!a.body.paid && !a.body.coins); const ar = pf.db.prepare("SELECT * FROM orders WHERE id=?").get(a.body.orderId); assert.strictEqual(ar.status, "menunggu_bayar"); }
    else assert.ok(a.status !== 401 && a.status !== 402, "audit tidak minta login atau saldo: " + a.status + JSON.stringify(a.body));
    const fd = new FormData(); fd.append("file", new Blob([await docx("Penting untuk diingat bahwa hal ini menunjukkan bahwa kinerja naik.")]), "t.docx");
    const au = await call("/ms/audit/upload", { method: "POST", form: fd });
    assert.ok(au.body.findings.filter(f => f.open).length <= 5, "gratis: paling banyak 5 temuan terbuka");
    assert.ok(au.body.findings.filter(f => !f.open).every(f => !f.detail && !f.quote), "temuan terkunci tidak membocorkan isi");
    const k = await call("/koin"); assert.strictEqual(k.status, 302);
  } finally { srv.close(); }
});
