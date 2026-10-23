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
