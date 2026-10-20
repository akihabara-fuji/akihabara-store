"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

test("halaman: hub, unggah, pesanan, aset; alamat lama dialihkan; berkas html tidak bocor lewat /assets", async () => {
  process.env.PARAFRASE_DB = ":memory:";
  const app = express();
  require("../parafrase")({ app, express, requireAdmin: (q, r, n) => n(), ROOT: fs.mkdtempSync(path.join(os.tmpdir(), "pf-pg-")) });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  try {
    for (const [u, needle] of [["/ruangakademikut", "Ruang Akademik UT"], ["/ruangakademikut/", "Cek dan Parafrase Mandiri"], ["/ruangakademikut/cek-parafrase-mandiri", "Tarik dan lepas"], ["/ruangakademikut/pesanan", "Cek Pesanan"]]) {
      const r = await fetch(base + u); assert.strictEqual(r.status, 200, u);
      const t = await r.text(); assert.ok(t.includes(needle), u); assert.ok(!t.includes("{{SITE}}"), u);
    }
    for (const f of ["site.css", "hub.css", "common.js", "cek.js"]) assert.strictEqual((await fetch(base + "/ruangakademikut/assets/" + f)).status, 200, f);
    for (const f of ["hub.html", "cek.html", "../uploads.js", "..%2Fuploads.js", "nope.js"]) assert.strictEqual((await fetch(base + "/ruangakademikut/assets/" + f)).status, 404, f);
    const r = await fetch(base + "/akademik", { redirect: "manual" });
    assert.strictEqual(r.status, 301); assert.strictEqual(r.headers.get("location"), "/ruangakademikut");
  } finally { srv.close(); }
});
