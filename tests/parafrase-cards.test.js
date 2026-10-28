"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const sharp = require("sharp");

test("gambar kartu: admin saja yang bisa unggah/hapus, nama dibatasi, hasil webp 4:3, publik hanya baca", async () => {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pf-card-"));
  const app = express(); let admin = false;
  require("../parafrase")({ app, express, requireAdmin: (q, r, n) => admin ? n() : r.status(401).json({ error: "x" }), ROOT: root });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const png = await sharp({ create: { width: 300, height: 100, channels: 3, background: { r: 200, g: 30, b: 30 } } }).png().toBuffer();
  const up = async (slug, buf) => { const fd = new FormData(); fd.append("img", new Blob([buf]), "a.png"); return fetch(base + "/ms/admin/parafrase/card-images/" + slug, { method: "POST", body: fd }); };
  try {
    assert.strictEqual((await up("tugas", png)).status, 401);
    assert.strictEqual((await fetch(base + "/ms/admin/parafrase/card-images")).status, 401);
    assert.strictEqual((await fetch(base + "/ms/admin/parafrase/card-images/tugas", { method: "DELETE" })).status, 401);
    assert.strictEqual((await fetch(base + "/ruangakademikut/img/tugas.webp")).status, 404);
    admin = true;
    assert.strictEqual((await up("tugas", png)).status, 200);
    assert.strictEqual((await up("../etc", png)).status, 404);
    assert.strictEqual((await up("rahasia", png)).status, 400);
    assert.strictEqual((await up("diskusi", Buffer.from("bukan gambar"))).status, 400);
    const r = await fetch(base + "/ruangakademikut/img/tugas.webp");
    assert.strictEqual(r.status, 200); assert.match(r.headers.get("content-type"), /webp/);
    const meta = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    assert.strictEqual(meta.format, "webp"); assert.strictEqual(meta.width / meta.height, 4 / 3);
    for (const bad of ["rahasia.webp", "..%2Fx.webp", "tugas.png", "tugas"]) assert.strictEqual((await fetch(base + "/ruangakademikut/img/" + bad)).status, 404, bad);
    const list = await (await fetch(base + "/ms/admin/parafrase/card-images")).json();
    assert.strictEqual(list.slugs.find(s => s.slug === "tugas").has, true);
    assert.strictEqual((await fetch(base + "/ms/admin/parafrase/card-images/tugas", { method: "DELETE" })).status, 200);
    assert.strictEqual((await fetch(base + "/ruangakademikut/img/tugas.webp")).status, 404);
  } finally { srv.close(); }
});

test("hub: tanpa kartu Tips, ada slogan DP di atas, semua layanan UT", async () => {
  process.env.PARAFRASE_DB = ":memory:";
  const app = express();
  require("../parafrase")({ app, express, requireAdmin: (q, r, n) => n(), ROOT: fs.mkdtempSync(path.join(os.tmpdir(), "pf-hub-")) });
  const srv = app.listen(0);
  try {
    const t = await (await fetch("http://127.0.0.1:" + srv.address().port + "/ruangakademikut")).text();
    assert.ok(!t.includes("Tips Jawaban")); assert.ok(!t.includes("Sahabat Nugas")); assert.ok(t.includes("price_semester_min")); assert.ok(!t.includes("Harga via chat admin")); assert.ok(t.includes("Info UT") && t.includes("/blog-ut"));
    assert.ok(t.indexOf("Bisa DP dulu") > 0);
    assert.ok(!t.includes("<h2>Audit Dokumen</h2>") && !t.includes("<h2>Cek dan Parafrase Mandiri</h2>"));
    for (const n of ["Paket Semester Lengkap", ">Metopen<", ">Tugas<", ">Diskusi<", "/audit-parafrase"]) assert.ok(t.includes(n), n);
  } finally { srv.close(); }
});
