"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { open } = require("../parafrase/db");
const { create } = require("../parafrase/settings");
const { createKoin } = require("../parafrase/koin");

const mk = () => { const db = open(":memory:"), settings = create(db); return { db, settings, koin: createKoin(db, { settings }) }; };

test("bonus daftar: sekali per akun, bisa dimatikan, dan tidak dihitung sebagai uang masuk", () => {
  const { koin, settings } = mk();
  assert.strictEqual(koin.welcome("u1"), 7);
  assert.strictEqual(koin.welcome("u1"), 0, "tidak ganda");
  assert.strictEqual(koin.balance("u1"), 7);
  settings.set({ koin_bonus_daftar: 0 });
  assert.strictEqual(koin.welcome("u2"), 0, "bonus 0 = mati");
  assert.strictEqual(koin.balance("u2"), 0);
});

test("ringkasan dana: bonus terpakai tidak menjadi pendapatan, bonus tersisa tidak menjadi kewajiban kas", () => {
  const { koin } = mk();
  koin.welcome("a");                                   // 7 bonus
  koin.debitOrder("a", 4, "NA-1", "pakai bonus");      // bonus dipakai 4, sisa 3 bonus
  let s = koin.summary();
  assert.strictEqual(s.incomeRp, 0, "tidak ada uang masuk, jadi tidak ada pendapatan");
  assert.strictEqual(s.liabilityRp, 0, "sisa 3 koin bonus tidak perlu ditutup kas");
  assert.strictEqual(s.promoCoins, 3);
  assert.strictEqual(s.shortfallRp, 0);

  // pengguna lain: isi 50 koin (uang nyata), bonus 7, belanja 35 -> pendapatan nyata 28 koin
  koin.welcome("b");
  const t = koin.createTopup("b", 50000); koin.confirmTopup(t.token, "admin");
  koin.debitOrder("b", 35, "NA-2", "belanja");
  s = koin.summary();
  assert.strictEqual(s.topupRp, 50000);
  assert.strictEqual(s.liabilityCoins, 22, "saldo b 22 koin, semuanya dukungan uang");
  assert.strictEqual(s.incomeRp, 28000, "35 koin belanja dikurangi 7 koin bonus");
  assert.strictEqual(s.promoCoins, 3, "hanya sisa bonus a");
});
