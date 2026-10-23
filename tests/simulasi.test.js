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

/* buka tanya jawab: pertama gratis per akun, berikutnya koin, satu pesanan hanya sekali */
const Module = require("module");
function openDb() {
  const orig = Module._load; Module._load = function (r, ...a) { return r === "better-sqlite3" ? function () {} : orig.call(this, r, ...a); };
  const { MIGRATIONS } = require("../parafrase/db"); Module._load = orig;
  const { DatabaseSync } = require("node:sqlite"); const raw = new DatabaseSync(":memory:"); let d = 0;
  const db = { exec: s => raw.exec(s), prepare: s => { const st = raw.prepare(s); return { get: (...p) => st.get(...p), all: (...p) => st.all(...p), run: (...p) => st.run(...p) }; },
    transaction: fn => (...a) => { if (d) return fn(...a); raw.exec("BEGIN IMMEDIATE"); d++; try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } finally { d--; } } };
  for (const m of MIGRATIONS) raw.exec(m); return db;
}
test("unlockSim: pertama gratis, kedua 4 koin, ulang tidak memotong lagi, saldo kurang ditolak", () => {
  const db = openDb(), { createKoin } = require("../parafrase/koin"), k = createKoin(db);
  let r = k.unlockSim("u1", "NA-1", 4); assert.equal(r.free, true); assert.equal(k.balance("u1"), 0);
  assert.equal(k.unlockSim("u1", "NA-1", 4).already, true);
  assert.throws(() => k.unlockSim("u1", "NA-2", 4), e => e.status === 402 && e.short === 4);
  k.confirmTopup(k.createTopup("u1", 10000).token);
  r = k.unlockSim("u1", "NA-2", 4); assert.equal(r.free, false); assert.equal(k.balance("u1"), 6);
  assert.equal(k.unlockSim("u1", "NA-2", 4).already, true); assert.equal(k.balance("u1"), 6);
  assert.deepEqual(k.simState("u1", "NA-2"), { unlocked: true, firstFree: false });
  assert.equal(k.simState("u2", "NA-9").firstFree, true);   // akun lain tetap dapat gratis pertamanya
});
