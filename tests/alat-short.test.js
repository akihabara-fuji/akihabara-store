"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");

test("domain akademik: alat gratis punya alamat pendek, jalur lama dialihkan 301, tautan dan canonical ikut pendek", async () => {
  const keep = { A: process.env.ACAD_URL, S: process.env.SITE_URL };
  process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
  try {
    const app = express(); require("../parafrase/pages")({ app, express });
    const srv = app.listen(0), b = "http://127.0.0.1:" + srv.address().port;
    try {
      for (const slug of ["kalkulator-nilai-ut", "sampul-tugas"]) {
        const old = await fetch(`${b}/ruangakademikut/${slug}`, { redirect: "manual" });
        assert.strictEqual(old.status, 301); assert.strictEqual(old.headers.get("location"), "/" + slug);
        const r = await fetch(`${b}/${slug}`), html = await r.text();
        assert.strictEqual(r.status, 200);
        assert.ok(html.includes(`<link rel="canonical" href="https://akademik.example/${slug}">`), "canonical pendek");
        assert.ok(!html.includes("/ruangakademikut/" + slug), "tidak ada tautan ke jalur lama");
      }
    } finally { srv.close(); }
  } finally { for (const [k, v] of [["ACAD_URL", keep.A], ["SITE_URL", keep.S]]) v === undefined ? delete process.env[k] : (process.env[k] = v); }
});
