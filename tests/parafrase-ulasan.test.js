"use strict";
const test = require("node:test"), assert = require("node:assert");
const express = require("express"), path = require("path"), fs = require("fs"), os = require("os"), sharp = require("sharp");

test("ulasan: tambah, tampil publik, sembunyikan, validasi, hapus", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ul-")), app = express();
  require("../parafrase/ulasan.js")({ app, root, requireAdmin: (q, r, n) => n() });
  const srv = app.listen(0), b = "http://127.0.0.1:" + srv.address().port;
  try {
    const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#4a4" } }).png().toBuffer();
    const fd = new FormData(); fd.append("nama", "Sari"); fd.append("ket", "UT"); fd.append("teks", "Mantap"); fd.append("izin", "1"); fd.append("img", new Blob([png], { type: "image/png" }), "a.png");
    let r = await fetch(b + "/ms/admin/ulasan", { method: "POST", body: fd }); const j = await r.json();
    assert.strictEqual(r.status, 200);
    let l = await (await fetch(b + "/ms/ulasan")).json();
    assert.strictEqual(l.items.length, 1); assert.ok(l.items[0].img.startsWith("/ms/ulasan/img/"));
    const im = await fetch(b + l.items[0].img.split("?")[0]); assert.strictEqual(im.status, 200); assert.strictEqual(im.headers.get("content-type"), "image/webp");
    await fetch(b + "/ms/admin/ulasan/" + j.id + "/toggle", { method: "POST" });
    l = await (await fetch(b + "/ms/ulasan")).json(); assert.strictEqual(l.items.length, 0);
    assert.strictEqual((await fetch(b + "/ms/ulasan/img/" + j.id + ".webp")).status, 404);
    const f2 = new FormData(); f2.append("nama", ""); assert.strictEqual((await fetch(b + "/ms/admin/ulasan", { method: "POST", body: f2 })).status, 400);
    assert.strictEqual((await fetch(b + "/ms/admin/ulasan/" + j.id, { method: "DELETE" })).status, 200);
  } finally { srv.close(); }
});

test("ulasan baru tanpa izin pelanggan ditolak", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ul2-")), app = express();
  require("../parafrase/ulasan.js")({ app, root, requireAdmin: (q, r, n) => n() });
  const srv = app.listen(0), b = "http://127.0.0.1:" + srv.address().port;
  try {
    const fd = new FormData(); fd.append("nama", "Sari"); fd.append("teks", "Mantap");
    const r = await fetch(b + "/ms/admin/ulasan", { method: "POST", body: fd });
    assert.strictEqual(r.status, 400); assert.match((await r.json()).error, /mengizinkan/);
  } finally { srv.close(); }
});
