"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../parafrase/simulasi");

const TEXT = `Pembuka: perkenalan singkat dan alasan memilih judul.
Metode: kualitatif studi kasus.

=== TANYA JAWAB ===
P1. Mengapa memilih judul ini?
J1. Karena masalahnya terjadi di tempat kerja saya dan datanya bisa diakses langsung oleh saya sendiri.
P2. Mengapa memakai wawancara?
J2. RAHASIA-JAWABAN-DUA
P3. Apa keterbatasan penelitian ini?
J3. RAHASIA-JAWABAN-TIGA`;

test("terkunci: simulasi tampil penuh, tanya jawab hanya cuplikan, sisanya tidak bocor", () => {
  const v = S.visible(TEXT, false);
  assert.equal(v.locked, true); assert.equal(v.total, 3);
  assert.match(v.talk, /Pembuka/); assert.match(v.talk, /kualitatif/);
  assert.ok(v.qa.length <= S.PREVIEW_CHARS + 1);
  assert.match(v.qa, /^P1\./);
  const all = JSON.stringify(S.render(TEXT, false));
  assert.doesNotMatch(all, /RAHASIA-JAWABAN/);
});
test("terbuka: semua tampil", () => {
  const v = S.visible(TEXT, true);
  assert.equal(v.locked, false); assert.match(v.qa, /RAHASIA-JAWABAN-TIGA/); assert.equal(v.total, 3);
});
test("tanpa penanda: tidak ada yang terkunci", () => {
  const v = S.visible("Hanya simulasi tanpa tanya jawab", false);
  assert.equal(v.locked, false); assert.equal(v.qa, ""); assert.equal(v.talk, "Hanya simulasi tanpa tanya jawab");
});
test("penanda toleran huruf besar kecil dan spasi", () => {
  assert.ok(S.MARK.test("a\n  ===  tanya   jawab ===  \nb"));
  assert.equal(S.split("x\n=== TANYA JAWAB ===\ny").qa, "y");
});
test("cuplikan hanya pertanyaan pertama, dan satu blok pendek tidak tampil utuh", () => {
  assert.doesNotMatch(S.preview("P1. a?\nJ1. b.\nP2. c?\nJ2. d."), /P2/);
  const one = "P1. Mengapa memilih judul ini dan apa alasan utamanya bagi penelitian yang dilakukan sekarang?";
  const p = S.preview(one); assert.ok(p.length < one.length); assert.match(p, /…$/);
});

