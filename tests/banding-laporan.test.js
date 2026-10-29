const test = require("node:test"), assert = require("node:assert");
const { compareReports } = require("../parafrase/banding");
test("banding laporan: hilang, masih, baru", () => {
  const a = [
    { block: 1, where: "p1", text: "Pendidikan adalah proses pembelajaran yang dilakukan secara sadar dan terencana oleh manusia." },
    { block: 2, where: "p2", text: "Motivasi belajar mahasiswa dipengaruhi oleh faktor internal dan faktor eksternal yang saling berkaitan." }];
  const b = [
    { block: 5, where: "Blok 5", text: "Motivasi belajar mahasiswa dipengaruhi oleh faktor internal dan faktor eksternal yang saling berkaitan." },
    { block: 6, where: "Blok 6", text: "Kebijakan kampus tentang ujian daring berubah setiap semester menurut pengumuman resmi." }];
  const r = compareReports(a, b);
  assert.deepStrictEqual([r.rows[0].status, r.rows[1].status], ["hilang", "masih"]);
  assert.strictEqual(r.rows[1].nowBlock, 5);
  assert.strictEqual(r.baru.length, 1);
  assert.deepStrictEqual(r.summary, { before: 2, after: 2, hilang: 1, masih: 1, baru: 1 });
  assert.deepStrictEqual(r.blocks.map(x => x.status), ["hilang", "masih"]);
});
