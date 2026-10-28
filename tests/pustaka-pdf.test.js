"use strict";
const test = require("node:test");
const assert = require("node:assert");
const rules = require("../parafrase/rules");
const mk = a => a.map((t, i) => ({ idx: i, text: t, style: "", inTable: false }));

test("pustaka berhenti di judul Lampiran, isi lampiran tidak dihitung entri", () => {
  const p = mk(["DAFTAR PUSTAKA", "Robbins, S. P. (2016). Perilaku organisasi. Jakarta: Salemba.", "Judge, T. (2019). Organizational behavior. Boston: Pearson.",
    "LAMPIRAN 1", "Pertanyaan wawancara satu", "Pertanyaan wawancara dua", "Transkrip wawancara informan"]);
  const { entries, keys } = rules.parseBibliography(p, 0);
  assert.strictEqual(entries.length, 2);
  assert.ok(keys.has("robbins2016") && keys.has("judge2019"));
});

test("PDF yang memecah entri per baris digabung jadi satu entri", () => {
  const p = mk(["DAFTAR PUSTAKA", "Robbins, S. P. (2016). Perilaku", "organisasi. Jakarta:", "Salemba Empat.", "Judge, T. A. (2019).", "Organizational behavior.", "Boston: Pearson.",
    "Sugiyono. (2018). Metode", "penelitian kuantitatif.", "Bandung: Alfabeta."]);
  const { entries, keys } = rules.parseBibliography(p, 0);
  assert.strictEqual(entries.length, 3);
  assert.deepStrictEqual([...keys].sort(), ["judge2019", "robbins2016", "sugiyono2018"]);
});

test("docx dengan satu entri tanpa tahun tetap dihitung bermasalah, tidak digabung", () => {
  const p = mk(["DAFTAR PUSTAKA", "Robbins, S. P. (2016). Perilaku organisasi. Jakarta.", "Judge, T. (2019). Organizational behavior. Boston.",
    "Sugiyono, S. (2018). Metode penelitian. Bandung.", "Entri tanpa tahun sama sekali"]);
  const { entries } = rules.parseBibliography(p, 0);
  assert.strictEqual(entries.length, 4);
  assert.strictEqual(entries[3].year, "");
});
