"use strict";
/* Uji inti buku koin. Memakai node:sqlite bila better-sqlite3 tidak ada; antarmuka yang dipakai sama. */
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

function openDb() {
  let Real = null; try { Real = require("better-sqlite3"); } catch {}
  if (Real) { const { open } = require("../parafrase/db"); return open(":memory:"); }
  const origLoad = Module._load;
  Module._load = function (req, ...a) { return req === "better-sqlite3" ? function () {} : origLoad.call(this, req, ...a); };
  const { MIGRATIONS } = require("../parafrase/db"); Module._load = origLoad;
  const { DatabaseSync } = require("node:sqlite");
  const raw = new DatabaseSync(":memory:"); let depth = 0;
  const db = {
    exec: s => raw.exec(s),
    prepare: s => { const st = raw.prepare(s); return { get: (...p) => st.get(...p), all: (...p) => st.all(...p), run: (...p) => st.run(...p) }; },
    transaction: fn => (...args) => {
      if (depth) return fn(...args);
      raw.exec("BEGIN IMMEDIATE"); depth++;
      try { const r = fn(...args); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } finally { depth--; }
    },
  };
  for (const m of MIGRATIONS) raw.exec(m);
  return db;
}
const mk = () => { const db = openDb(); const { createKoin } = require("../parafrase/koin"); return { db, k: createKoin(db) }; };

test("top-up: kelipatan Rp1.000, kode unik, konfirmasi sekali, saldo naik", () => {
  const { k } = mk();
  assert.throws(() => k.createTopup("u1", 10500), /kelipatan/);
  assert.throws(() => k.createTopup("u1", 0), /kelipatan/);
  const t = k.createTopup("u1", "10.000");
  assert.equal(t.coins, 10); assert.ok(t.unique_code >= 1 && t.total === 10000 + t.unique_code);
  assert.equal(k.balance("u1"), 0);
  const r = k.confirmTopup(t.token, "admin");
  assert.equal(r.balance, 10); assert.equal(k.balance("u1"), 10);
  assert.throws(() => k.confirmTopup(t.token, "admin"), /sudah dikonfirmasi/);
  assert.equal(k.balance("u1"), 10);
});

test("kode unik tidak bentrok antar tagihan terbuka", () => {
  const { k } = mk(); const seen = new Set();
  for (let i = 0; i < 40; i++) { const t = k.createTopup("u" + (i % 20), 5000 + 0); seen.add(t.total); }
  assert.equal(seen.size, 40);
});

test("pakai koin: saldo cukup dipotong, kurang ditolak dengan selisih", () => {
  const { k } = mk();
  k.confirmTopup(k.createTopup("u1", 50000).token);
  k.debitOrder("u1", 35, "NA-1001");
  assert.equal(k.balance("u1"), 15);
  try { k.debitOrder("u1", 20, "NA-1002"); assert.fail(); } catch (e) { assert.equal(e.status, 402); assert.equal(e.short, 5); }
  assert.equal(k.balance("u1"), 15);
  assert.equal(k.debitOrder("u1", 35, "NA-1001").duplicate, true); // pesanan sama tidak dipotong dua kali
  assert.equal(k.balance("u1"), 15);
});

test("batal: koin kembali sekali saja; pesanan tanpa koin tidak mengembalikan apa pun", () => {
  const { k } = mk();
  k.confirmTopup(k.createTopup("u1", 30000).token);
  k.debitOrder("u1", 20, "NA-1");
  assert.ok(k.refundOrder("NA-1"));
  assert.equal(k.balance("u1"), 30);
  assert.equal(k.refundOrder("NA-1"), null); assert.equal(k.balance("u1"), 30);
  assert.equal(k.refundOrder("NA-TIDAK-ADA"), null);
});

test("tolak bukti mengembalikan tagihan ke menunggu_bayar; kedaluwarsa tidak bisa unggah", () => {
  const { k } = mk(); const t = k.createTopup("u1", 10000, 1000);
  k.attachProof(t.token, "u1", "p/a.jpg", "h1", 2000);
  assert.throws(() => k.attachProof(t.token, "u2", "p/b.jpg", "h2", 3000), /tidak ditemukan/);
  const rj = k.rejectTopup(t.token, "nominal beda", 4000); assert.equal(rj.old, "p/a.jpg");
  const t2 = k.createTopup("u1", 10000, 1000); k.attachProof(t2.token, "u1", "p/c.jpg", "h3", 2000);
  assert.throws(() => k.attachProof(t.token, "u1", "p/d.jpg", "h3", 5000), /sudah dipakai/);
  const t3 = k.createTopup("u2", 10000, 1000);
  assert.throws(() => k.attachProof(t3.token, "u2", "p/e.jpg", "h9", 1000 + 61 * 60e3 + 1), e => e.code === "expired");
});

test("dana: semua uang bisa diambil, bagian saldo titipan dicatat dan kekurangan kas dihitung", () => {
  const { k } = mk();
  k.confirmTopup(k.createTopup("u1", 100000).token);   // masuk 100 koin
  k.confirmTopup(k.createTopup("u2", 50000).token);    // masuk 50 koin
  k.debitOrder("u1", 35, "NA-1"); k.debitOrder("u2", 20, "NA-2");
  let s = k.summary();
  assert.equal(s.topupRp, 150000); assert.equal(s.liabilityRp, 95000); assert.equal(s.incomeRp, 55000);
  assert.equal(s.withdrawableRp, 150000); assert.equal(s.shortfallRp, 0);
  assert.throws(() => k.withdraw(150001, "Domain", "x"), /melebihi/);
  assert.throws(() => k.withdraw(1000, "Rokok", "x"), /keperluan/);
  let r = k.withdraw("30.000", "Langganan Claude", "Okt");          // masih dari pendapatan
  assert.equal(r.fromHolding, 0); assert.equal(r.heldUsedRp, 0);
  r = k.withdraw(40000, "VPS dan server", "");                      // pendapatan tersisa 25.000, 15.000 dari saldo titipan
  assert.equal(r.fromHolding, 15000); assert.equal(r.heldUsedRp, 15000);
  s = k.summary(); assert.equal(s.cashOnHandRp, 80000); assert.equal(s.liabilityRp, 95000); assert.equal(s.shortfallRp, 15000);
  assert.equal(k.balance("u1"), 65); assert.equal(k.balance("u2"), 30);   // saldo mahasiswa tidak berubah
  r = k.withdraw(80000, "Lainnya", "ambil semua"); assert.equal(r.withdrawableRp, 0); assert.equal(r.shortfallRp, 95000);
});

test("penyesuaian manual wajib alasan dan tercatat", () => {
  const { k } = mk();
  assert.throws(() => k.adjust("u1", 10, "", "admin"), /Alasan/);
  k.adjust("u1", 10, "Salah pilih layanan", "dika");
  assert.equal(k.balance("u1"), 10);
  assert.match(k.history("u1")[0].note, /Salah pilih layanan.*dika/);
  assert.throws(() => k.adjust("u1", -11, "koreksi saldo", "dika"), e => e.status === 402);
});

test("coinsFor: hanya harga kelipatan Rp1.000", () => {
  const { coinsFor } = require("../parafrase/koin");
  assert.equal(coinsFor(35000), 35); assert.equal(coinsFor(919000), 919); assert.equal(coinsFor(35500), null); assert.equal(coinsFor(0), null);
});
