"use strict";
/* Peta warna dokumen (Cek & Parafrase): teks harus ikut tema. Dulu .seg memakai warna gelap tetap sehingga hilang di mode gelap. */
const test = require("node:test"), assert = require("node:assert");
const fs = require("fs"), path = require("path");
const css = fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", "site.css"), "utf8");

test("teks .seg mengikuti tema (bukan warna gelap tetap)", () => {
  assert.ok(/\.seg\{color:var\(--text\)\}/.test(css), ".seg harus memakai var(--text)");
  assert.ok(!/\.seg\{color:#12202F\}/i.test(css), "warna gelap tetap pada .seg membuat teks hilang di mode gelap");
});

test("mode gelap punya warna sorotan dan label untuk semua kode (M O K B U H P A)", () => {
  for (const k of "MOKBUHPA") {
    assert.ok(new RegExp(`html:not\\(\\[data-theme=light\\]\\) \\.s-${k}\\{`).test(css), "sorotan gelap .s-" + k);
    assert.ok(new RegExp(`sup\\.t\\.c-${k}\\{color:`).test(css), "label gelap sup.t.c-" + k);
  }
});

test("garis bawah sorotan membungkus rapi antar baris", () => {
  assert.ok(/\.seg\{[^}]*box-decoration-break:clone/.test(css));
});
