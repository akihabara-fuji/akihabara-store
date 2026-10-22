"use strict";
const test = require("node:test"), assert = require("node:assert");
const { runAudit } = require("../parafrase/auditrules");

const para = (idx, text) => ({ idx, text });
const KALIMAT = "Robbins (2016) menyatakan bahwa motivasi kerja sangat penting bagi organisasi modern saat ini.";

test("skor kesiapan: ada skor 0-100, 4 metrik, dan catatan bukan DrillBit", async () => {
  const r = await runAudit({ paragraphs: [para(0, KALIMAT), para(1, "Daftar Pustaka"), para(2, "Robbins, S. P. (2016). Perilaku organisasi. Jakarta: Salemba Empat.")], bibliographyParagraphIndex: 1 });
  assert.ok(r.score.value >= 0 && r.score.value <= 100);
  assert.deepStrictEqual(r.score.metrics.map(m => m.key), ["sitasi", "pustaka", "doi", "berulang"]);
  assert.match(r.score.note, /Bukan skor DrillBit/);
  assert.strictEqual(r.score.metrics[0].value, 100); // sitasi cocok pustaka
  assert.strictEqual(r.score.metrics[2].value, null); // tanpa DOI: n/a, tidak dikarang
});

test("skor kesiapan: kalimat berulang dan sitasi tanpa pustaka menurunkan skor, kritis tidak bisa berlabel siap", async () => {
  const bersih = await runAudit({ paragraphs: [para(0, KALIMAT), para(1, "Daftar Pustaka"), para(2, "Robbins, S. P. (2016). Perilaku organisasi. Jakarta: Salemba Empat.")], bibliographyParagraphIndex: 1 });
  const buruk = await runAudit({ paragraphs: [para(0, KALIMAT), para(1, KALIMAT), para(2, "Smith (2020) juga menjelaskan hal serupa dalam penelitiannya di sini."), para(3, "Daftar Pustaka"), para(4, "Robbins, S. P. (2016). Perilaku organisasi. Jakarta: Salemba Empat.")], bibliographyParagraphIndex: 3 });
  assert.ok(buruk.score.value < bersih.score.value);
  assert.ok(buruk.score.metrics[3].value > 0, "kalimat berulang terdeteksi");
  assert.ok(buruk.counts.kritis > 0 && buruk.score.value <= 84 && buruk.score.level !== "siap");
});

test("pengaturan batas Drillbit: ada di config publik dengan acuan bawaan", () => {
  const { DEFS } = require("../parafrase/settings");
  assert.strictEqual(DEFS.drillbit_sim_max.def, 25); assert.strictEqual(DEFS.drillbit_ai_max.def, 20);
  assert.ok(DEFS.drillbit_sim_max.pub && DEFS.drillbit_ai_max.pub);
});
