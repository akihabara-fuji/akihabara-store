"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { open } = require("../parafrase/db");
const kisiSeed = require("../parafrase/kisi-seed");
const { slugOf, cleanSoal } = require("../parafrase/kisi");

test("migrasi mengisi 16 mata kuliah dengan 5 soal valid dan slug unik", () => {
  const db = open(":memory:");
  const rows = db.prepare("SELECT kode, slug, soal FROM kisi_mk").all();
  assert.equal(rows.length, 16);
  assert.equal(new Set(rows.map(r => r.slug)).size, 16);
  for (const r of rows) { const s = JSON.parse(r.soal); assert.equal(s.length, 5, r.kode); assert.doesNotThrow(() => cleanSoal(s), r.kode); }
  assert.ok(rows.find(r => r.slug === "spin4401-filologi"));
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
