"use strict";
/* Daftar temuan Audit tidak boleh memanjang: temuan sejenis digabung, hanya beberapa jenis tampil, sisanya terlipat. */
const test = require("node:test"), assert = require("node:assert");
const fs = require("fs"), path = require("path");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", f), "utf8");

test("common.js menyediakan renderFindings dengan pengelompokan, batas tampil, dan lipatan", () => {
  const c = rd("common.js");
  assert.ok(/window\.renderFindings\s*=\s*function/.test(c));
  assert.ok(/sev \+ "\|" \+ f\.cat/.test(c), "temuan dikelompokkan per tingkat dan jenis");
  assert.ok(/groups\.slice\(0, VISIBLE\)/.test(c) && /jenis temuan lain/.test(c), "hanya VISIBLE jenis tampil, sisanya terlipat");
  assert.ok(/<details|el\("details"/.test(c));
});

test("urutan perbaikan paragraf dibatasi 5 teratas, sisanya terlipat", () => {
  const c = rd("common.js");
  assert.ok(/var TOPN = 5;/.test(c) && /paragraf lainnya/.test(c));
});

test("kartu Drillbit tidak mengingat angka lama, dan panel admin memuat app.js baru", () => {
  const c = rd("common.js");
  assert.ok(!/localStorage\.setItem\(KEY/.test(c), "angka Drillbit tidak boleh disimpan");
  assert.ok(!/saved\.dbSim/.test(c), "angka lama tidak boleh dipulihkan otomatis");
  assert.ok(/app\.js\?v=(1[6-9]|[2-9]\d)/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "admin-ca", "public", "index.html"), "utf8")), "app.js admin harus naik versi agar tombol Impor .md termuat");
});

test("poin skor bisa ditekan (rincian muncul setelah ditekan) dan daftar temuan dilipat", () => {
  const c = rd("common.js");
  assert.ok(/window\.auditScoreCard = function \(sc, box, findings(, opts)?\)/.test(c), "kartu skor menerima daftar temuan");
  assert.ok(/createElement\("details"\)/.test(c) && /window\.foldList = /.test(c));
});

test("kartu skor hanya menampilkan poin yang salah (dengan persen), poin benar dipindah ke daftar bawah", () => {
  const c = rd("common.js");
  assert.ok(/bermasalah/.test(c) && /window\.pfWrongPct/.test(c), "persen bermasalah ditampilkan");
  assert.ok(/window\.auditOkList = /.test(c) && /Yang sudah benar/.test(c));
});
