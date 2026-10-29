const test = require("node:test"), assert = require("node:assert");
const { cekSet, batasAkurasi } = require("../parafrase/bedah");
const ok = { ai: { pct: 50, matchedWords: 100, totalWords: 200, blocks: [{ words: 60 }, { words: 40 }], blockTable: [{}, {}], mapped: 96 } };
test("cekSet: konsisten lulus, coverage dihitung", () => {
  const r = cekSet(ok); assert.strictEqual(r.cek, true); assert.strictEqual(r.coverage, 96);
});
test("cekSet: jumlah blok tidak cocok => gagal", () => {
  const b = JSON.parse(JSON.stringify(ok)); b.ai.blocks[0].words = 10;
  assert.strictEqual(cekSet(b).cek, false);
  assert.strictEqual(cekSet({}).cek, null);
});
test("batasAkurasi: aturan tiga", () => {
  assert.strictEqual(batasAkurasi(100, 0), 97);
  assert.strictEqual(batasAkurasi(150, 0), 98);
  assert.strictEqual(batasAkurasi(100, 1), null);
  assert.strictEqual(batasAkurasi(0, 0), null);
});
