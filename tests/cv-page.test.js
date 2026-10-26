"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");

test("Buat CV ATS: alamat pendek, jalur lama 301, skrip termuat, tanpa string terlarang", async () => {
  const keep = { A: process.env.ACAD_URL, S: process.env.SITE_URL };
  process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
  try {
    const app = express(); require("../parafrase/pages")({ app, express });
    const srv = app.listen(0), b = "http://127.0.0.1:" + srv.address().port;
    try {
      const old = await fetch(`${b}/ruangakademikut/buat-cv-ats`, { redirect: "manual" });
      assert.strictEqual(old.status, 301); assert.strictEqual(old.headers.get("location"), "/buat-cv-ats");
      const r = await fetch(`${b}/buat-cv-ats`), html = await r.text();
      assert.strictEqual(r.status, 200);
      assert.ok(html.includes('<link rel="canonical" href="https://akademik.example/buat-cv-ats">'));
      assert.ok(!html.includes("ruangakademikut"), "tidak boleh ada string ruangakademikut di halaman akademik");
      const js = await fetch(`${b}/assets/ut/cv.js?v=1`);
      assert.strictEqual(js.status, 200);
      const src = await js.text();
      assert.ok(!src.includes("ruangakademikut") && src.includes("ca-cv-v1"));
    } finally { srv.close(); }
  } finally { for (const [k, v] of [["ACAD_URL", keep.A], ["SITE_URL", keep.S]]) v === undefined ? delete process.env[k] : (process.env[k] = v); }
});

test("CV ATS mudah ditemukan: ada di menu Alat Gratis (bukan Layanan) dan kartu di halaman Layanan", () => {
  const fs = require("fs"), path = require("path"), dir = path.join(__dirname, "..", "parafrase", "pages");
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".html"))) {
    const h = fs.readFileSync(path.join(dir, f), "utf8");
    if (!h.includes(">Alat Gratis</summary>")) continue;
    assert.ok(h.includes('<a href="/ruangakademikut/buat-cv-ats">Buat CV ATS</a>'), f + " belum punya link CV di menu Alat Gratis");
    assert.ok(!/<a [^>]*>[^<]*\(gratis\)<\/a><\/div><\/details><a href="\/ruangakademikut\/cek-parafrase/.test(h), f + ": item gratis nyasar di menu Layanan");
  }
  const hub = fs.readFileSync(path.join(dir, "hub.html"), "utf8");
  assert.ok(hub.includes('data-slug="cv"') && hub.includes("Buat CV sekarang"));
});
