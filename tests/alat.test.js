"use strict";
const test = require("node:test"), assert = require("node:assert");
const N = require("../parafrase/pages/nilai-ut.js");
test("konversi nilai UT sesuai tabel di batas", () => {
  const c = [[100, "A"], [80, "A"], [79.99, "A-"], [75, "A-"], [74.99, "B+"], [70, "B+"], [69.99, "B"], [65, "B"], [64.99, "B-"], [60, "B-"], [59.99, "C+"], [55, "C+"], [54.99, "C"], [40, "C"], [39.99, "D"], [25, "D"], [24.99, "E"], [0, "E"]];
  for (const [n, h] of c) assert.strictEqual(N.konversi(n).h, h, "nilai " + n);
});
test("nilai di antara dua batas tidak dibulatkan naik", () => { assert.strictEqual(N.konversi(79.999).h, "A-"); assert.strictEqual(N.konversi("72.5").h, "B+"); });
test("nilai tidak valid ditolak", () => { for (const v of [-1, 101, "abc", NaN, null, undefined, ""]) assert.strictEqual(N.konversi(v), v === null || v === "" ? N.konversi(0) : null, String(v)); });
test("status lulus: C ke atas lulus, D dan E tidak", () => { assert.ok(N.konversi(40).ok); assert.ok(!N.konversi(39.99).ok); assert.ok(!N.konversi(0).ok); });
test("IPK terbobot SKS", () => {
  assert.strictEqual(N.ipk([{ sks: 3, huruf: "A" }, { sks: 3, huruf: "B" }]).ipk, 3.5);
  assert.strictEqual(N.ipk([{ sks: 4, huruf: "A" }, { sks: 2, huruf: "C" }]).ipk, 3.33);
  assert.strictEqual(N.ipk([]).ipk, null);
  assert.strictEqual(N.ipk([{ sks: 0, huruf: "A" }, { sks: 3, huruf: "Z" }, { sks: 99, huruf: "A" }]).ipk, null);
});

test("nilai akhir: contoh Kasus A (Tuton 90, 25/50 benar) = 62 = B-", () => {
  const r = N.nilaiAkhir("tuton", 90, 50, 25);
  assert.strictEqual(r.akhir, 62); assert.strictEqual(r.huruf, "B-"); assert.ok(r.lolos30);
});
test("UAS di bawah 30% -> E tanpa hitungan, berapa pun nilai tuton", () => {
  const r = N.nilaiAkhir("tuton", 100, 50, 10);
  assert.strictEqual(r.huruf, "E"); assert.strictEqual(r.lolos30, false); assert.strictEqual(r.akhir, undefined);
  assert.strictEqual(N.nilaiAkhir("tuton", 100, 50, 14).huruf, "E"); // 14 < 15
  assert.ok(N.nilaiAkhir("tuton", 100, 50, 15).lolos30);
});
test("batas minimal 30%: 30->9, 45->14, 50->15", () => { assert.deepStrictEqual([30, 45, 50].map(N.minBenar30), [9, 14, 15]); });
test("bobot TMK 20/80 dan TTM 50/50", () => {
  assert.strictEqual(N.nilaiAkhir("tmk", 100, 40, 20).akhir, 60);  // 20 + 0.8*50
  assert.strictEqual(N.nilaiAkhir("ttm", 80, 40, 20).akhir, 65);   // 40 + 25
});
test("nilai akhir: input tidak valid ditolak", () => {
  for (const a of [["x", 90, 50, 25], ["tuton", 101, 50, 25], ["tuton", 90, 0, 0], ["tuton", 90, 50, 51], ["tuton", 90, 50.5, 2], ["tuton", "a", 50, 2]]) assert.strictEqual(N.nilaiAkhir(...a), null, JSON.stringify(a));
});
test("minimal benar per huruf konsisten dengan nilaiAkhir", () => {
  const m = N.minBenarPerHuruf("tuton", 80, 50);
  for (const x of m) if (x.benar !== null) { assert.strictEqual(N.nilaiAkhir("tuton", 80, 50, x.benar).huruf, x.huruf); if (x.benar > N.minBenar30(50)) assert.notStrictEqual(N.nilaiAkhir("tuton", 80, 50, x.benar - 1).huruf, x.huruf); }
  assert.ok(m.find(x => x.huruf === "A").benar !== null);
});
test("target IPK", () => {
  assert.deepStrictEqual(N.targetIps(3.2, 60, 20, 3.4), { perlu: 4, tercapai: true, sudahAman: false });
  assert.strictEqual(N.targetIps(3.2, 60, 20, 3.9).tercapai, false);
  assert.strictEqual(N.targetIps(3.8, 100, 20, 3.0).sudahAman, true);
  assert.strictEqual(N.targetIps(5, 60, 20, 3), null);
});
