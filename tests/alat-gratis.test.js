"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const fs = require("fs"), path = require("path");

const SLUGS = ["sampul-tugas", "surat-lamaran", "tracker-kelulusan", "kalender-akademik", "panduan-maba"];
const JS = ["wordlib.js", "sampul.js", "surat.js", "tracker.js", "kalender.js", "maba.js", "nilai-ut.js"];

test("Alat Gratis: halaman baru tampil di host akademik tanpa string ruangakademikut, aset termuat", async () => {
  const keep = { A: process.env.ACAD_URL, S: process.env.SITE_URL };
  process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
  try {
    const app = express(); require("../parafrase/pages")({ app, express });
    const srv = app.listen(0), b = "http://127.0.0.1:" + srv.address().port;
    try {
      for (const s of SLUGS) {
        const old = await fetch(`${b}/ruangakademikut/${s}`, { redirect: "manual" });
        assert.strictEqual(old.status, 301, s); assert.strictEqual(old.headers.get("location"), "/" + s);
        const r = await fetch(`${b}/${s}`), html = await r.text();
        assert.strictEqual(r.status, 200, s);
        assert.ok(html.includes(`<link rel="canonical" href="https://akademik.example/${s}">`), s);
        assert.ok(!html.includes("ruangakademikut"), s + " masih memuat ruangakademikut");
        assert.ok(html.includes("Alat Gratis"), s + " tanpa menu Alat Gratis");
      }
      for (const j of JS) {
        const r = await fetch(`${b}/assets/ut/${j}?v=1`); assert.strictEqual(r.status, 200, j);
        assert.ok(!(await r.text()).includes("ruangakademikut") || j === "wordlib.js", j);
      }
      assert.strictEqual((await fetch(`${b}/assets/ut/logo-ut.png`)).status, 200);
    } finally { srv.close(); }
  } finally { for (const [k, v] of [["ACAD_URL", keep.A], ["SITE_URL", keep.S]]) v === undefined ? delete process.env[k] : (process.env[k] = v); }
});

test("Alat Gratis: menu ada di semua halaman yang punya menu Kalkulasi Nilai", () => {
  const dir = path.join(__dirname, "..", "parafrase", "pages");
  let n = 0;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".html"))) {
    const h = fs.readFileSync(path.join(dir, f), "utf8");
    if (!h.includes(">Kalkulasi Nilai</summary>")) continue; n++;
    for (const s of SLUGS) assert.ok(h.includes(`href="/ruangakademikut/${s}"`), f + " tanpa link " + s);
  }
  assert.ok(n >= 15);
});
