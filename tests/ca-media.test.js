"use strict";
/* Hapus gambar di menu Media: memakai setup() dari ca-admin.test.js lewat salinan ringkas */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), os = require("os"), path = require("path");
const express = require("express");

const OWNER_PW = "sandi-pemilik-uji-123";
async function setup() {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ca-media-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.mkdirSync(path.join(root, "public", "uploads"), { recursive: true });
  const db = require("../parafrase/db").open(":memory:");
  const app = express(); app.set("trust proxy", 1);
  const getCookie = (req, name) => { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : ""; };
  const sameOrigin = req => !!req.headers.origin;
  const auth = require("../admin-ca/auth")({ db, getCookie, sameOrigin, SECURE_COOKIE: false, ownerPassword: OWNER_PW, sharedWithNextaja: false, secret: "s".repeat(40) });
  auth.mount(app, express);
  const requireAdmin = (req, res, next) => auth.isCaPath(req.path) ? auth.guard(req, res, next) : res.status(401).json({ error: "nextaja" });
  const blog = require("../blog-akun")({ app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test", getSettings: () => ({}) });
  const pf = require("../parafrase")({ app, express, requireAdmin, sameOrigin, ROOT: root, db });
  require("../admin-ca")({ app, express, db, auth, requireAdmin, blog, settings: pf.settings, orders: pf.orders, ROOT: root, UPLOADS: path.join(root, "public", "uploads"), sharp: null, ACAD: "https://contoh.test" });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const call = async (p, { cookie = "", method = "GET", json } = {}) => {
    const r = await fetch(base + p, { method, headers: { origin: base, cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json() : await r.text() };
  };
  const login = async () => { const r = await fetch(base + "/ms/admin/ca/login", { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ username: "pemilik", password: OWNER_PW }) }); return (r.headers.get("set-cookie") || "").split(";")[0]; };
  return { srv, call, login, root };
}

test("media: gambar yang tidak dipakai bisa dihapus, yang dipakai artikel ditolak, nama berbahaya ditolak", async () => {
  const { srv, call, login, root } = await setup();
  try {
    const own = await login(), up = path.join(root, "public", "uploads");
    fs.writeFileSync(path.join(up, "bebas.webp"), "x"); fs.writeFileSync(path.join(up, "dipakai.webp"), "x");
    const w = await call("/ms/admin/posts", { cookie: own, method: "POST", json: { title: "Pakai gambar", body: "Isi ![a](/uploads/dipakai.webp)", status: "draft", topic: "study" } });
    assert.strictEqual(w.status, 200, JSON.stringify(w.body));
    assert.strictEqual((await call("/ms/admin/ca/media/dipakai.webp", { cookie: own, method: "DELETE" })).status, 409);
    assert.ok(fs.existsSync(path.join(up, "dipakai.webp")));
    assert.strictEqual((await call("/ms/admin/ca/media/..%2Fserver.js", { cookie: own, method: "DELETE" })).status, 400);
    assert.strictEqual((await call("/ms/admin/ca/media/bebas.webp", { cookie: own, method: "DELETE" })).status, 200);
    assert.ok(!fs.existsSync(path.join(up, "bebas.webp")));
    assert.strictEqual((await call("/ms/admin/ca/media/bebas.webp", { cookie: own, method: "DELETE" })).status, 404);
    assert.strictEqual((await call("/ms/admin/ca/media/bebas.webp", { method: "DELETE" })).status, 401);
  } finally { srv.close(); }
});
