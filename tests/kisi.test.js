"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { open } = require("../parafrase/db");
const kisiSeed = require("../parafrase/kisi-seed");
const { slugOf, cleanSoal } = require("../parafrase/kisi");

test("migrasi mengisi seluruh MK (1.470): 16 awal bersoal, sisanya tanpa soal, slug unik", () => {
  const db = open(":memory:");
  const rows = db.prepare("SELECT kode, slug, soal, jenis, periode FROM kisi_mk").all();
  assert.equal(rows.length, 1470);
  assert.equal(new Set(rows.map(r => r.slug)).size, 1470);
  assert.equal(new Set(rows.map(r => r.kode)).size, 1470);
  const bersoal = rows.filter(r => JSON.parse(r.soal).length);
  assert.equal(bersoal.length, 16);
  for (const r of bersoal) { const s = JSON.parse(r.soal); assert.equal(s.length, 5, r.kode); assert.doesNotThrow(() => cleanSoal(s), r.kode); }
  assert.ok(rows.find(r => r.slug === "spin4401-filologi"));
  assert.ok(rows.every(r => ["Objektif", "Uraian", ""].includes(r.jenis)));
  assert.equal(rows.filter(r => r.jenis === "").length, 340);
  assert.equal(rows.filter(r => r.periode === "20261").length, 7);
  assert.equal(db.prepare("SELECT kode FROM kisi_mk ORDER BY id LIMIT 1").get().kode, "SPIN4401");
});

test("halaman MK tanpa soal tidak menampilkan form soal, dan katalog hanya merender 8 kartu", () => {
  const db = open(":memory:");
  const slugs = {}; const row = k => db.prepare("SELECT * FROM kisi_mk WHERE kode=?").get(k);
  const kisi = { list: () => db.prepare("SELECT id,kode,nama,jenis,periode,slug,harga,tampil,file_path,json_array_length(soal) AS jml FROM kisi_mk WHERE tampil=1 ORDER BY id").all().map(r => ({ ...r, jml_soal: r.jml })), bySlug: s => db.prepare("SELECT * FROM kisi_mk WHERE slug=?").get(s), soalOf: r => JSON.parse(r.soal || "[]") };
  const KS = require("../parafrase/kisi-pages")(kisi);
  const kat = KS.katalog();
  assert.equal((kat.body.match(/class="ks-card"/g) || []).length, 8);
  assert.match(kat.body, /Lihat semua 1\.470 mata kuliah/);
  const tanpa = KS.mk(row("ADBI4130").slug);
  assert.ok(tanpa && !/id="ksform"|id="kscek"|5 soalnya/.test(tanpa.body));
  assert.match(tanpa.body, /id="kspay"/);
  assert.doesNotMatch(tanpa.body, /<span>Objektif<\/span>|<span><\/span>/);
  const dengan = KS.mk("spin4401-filologi");
  assert.match(dengan.body, /id="ksform"/);
  assert.match(dengan.body, /Tes 5 soalnya dulu/);
});

test("slug dari kode dan nama", () => {
  assert.equal(slugOf("SPIN4401", "Filologi"), "spin4401-filologi");
  assert.equal(slugOf("SPGK4401", "Pengembangan Konsep dan Pembelajaran PKn di SD"), "spgk4401-pengembangan-konsep-dan-pembelajaran-pkn-di-sd");
});

test("cleanSoal menolak soal tak lengkap", () => {
  assert.throws(() => cleanSoal([{ q: "x", o: ["a", "b", "c"], k: 0 }]));
  assert.throws(() => cleanSoal([{ q: "x", o: ["a", "b", "c", "d"], k: 4 }]));
});

test("tiap soal seed punya kunci yang ada di pilihan", () => {
  for (const [, , , soal] of kisiSeed.MK) for (const s of soal) assert.ok(s.k >= 0 && s.k <= 3 && s.o[s.k]);
});

test("satu klaim aktif per nomor dan MK (indeks unik)", () => {
  const db = open(":memory:");
  const ins = () => db.prepare("INSERT INTO kisi_klaim(mk_id,wa,status,created_at) VALUES(1,'6281',?,1)");
  ins().run("baru");
  assert.throws(() => ins().run("valid"));
  db.prepare("UPDATE kisi_klaim SET status='ditolak'").run();
  assert.doesNotThrow(() => ins().run("baru"));
});
