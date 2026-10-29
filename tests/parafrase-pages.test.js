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
    for (const [u, needle] of [["/ruangakademikut", "Catatan Akademik"], ["/beranda", "lebih siap dikumpulkan"], ["/ruangakademikut/", "Cek dan Parafrase Mandiri"], ["/ruangakademikut/cek-parafrase-mandiri", "Tarik dan lepas"], ["/ruangakademikut/pesanan", "Cek Pesanan"], ["/ruangakademikut/pesanan/" + "a".repeat(48), "Memuat pesanan"]]) {
      const r = await fetch(base + u); assert.strictEqual(r.status, 200, u);
      const t = await r.text(); assert.ok(t.includes(needle), u); assert.ok(!t.includes("{{SITE}}"), u);
    }
    for (const f of ["site.css", "hub.css", "common.js", "cek.js", "pesanan.js"]) assert.strictEqual((await fetch(base + "/ruangakademikut/assets/" + f)).status, 200, f);
    for (const f of ["hub.html", "cek.html", "../uploads.js", "..%2Fuploads.js", "nope.js"]) assert.strictEqual((await fetch(base + "/ruangakademikut/assets/" + f)).status, 404, f);
    const pr = await fetch(base + "/admin/parafrase"); assert.strictEqual(pr.status, 200);
    assert.ok((await pr.text()).includes("noindex")); assert.ok(pr.headers.get("x-robots-tag"));
    const hr = await fetch(base + "/ruangakademikut/pesanan/" + "a".repeat(48));
    assert.strictEqual(hr.headers.get("referrer-policy"), "no-referrer"); assert.strictEqual(hr.headers.get("x-frame-options"), "DENY");
    const r = await fetch(base + "/akademik", { redirect: "manual" });
    assert.strictEqual(r.status, 301); assert.strictEqual(r.headers.get("location"), "/ruangakademikut");
  } finally { srv.close(); }
});

test("bedah: ada panduan memperbaiki tanpa menjanjikan angka", () => {
  const h = require("fs").readFileSync(require("path").join(__dirname, "..", "parafrase", "pages", "bedah.html"), "utf8");
  assert.match(h, /Cara memperbaiki bagian yang ditandai Drillbit/);
  assert.match(h, /tidak bisa menjanjikan angka/);
});

test("legenda warna dipakai di Bedah, Audit, dan Cek & Parafrase", () => {
  const fs = require("fs"), path = require("path"), d = p => fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", p), "utf8");
  assert.match(d("common.js"), /window\.PF_legend = function/);
  for (const f of ["bedah.js", "audit.js", "cek.js"]) assert.match(d(f), /PF_legend\(\$\("pfLegend"\)\)/);
  for (const f of ["bedah.html", "audit.html", "cek.html"]) assert.match(d(f), /id="pfLegend"/);
});
