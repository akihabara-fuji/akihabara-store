"use strict";
const test = require("node:test"), assert = require("node:assert");
const { computeProblem } = require("../parafrase/masalah");

const P = n => Array.from({ length: n }, (_, i) => ({ idx: i, text: "Penelitian ini membahas variabel kinerja pegawai dengan data survei pada tahun lalu. Kalimat kedua juga cukup panjang untuk dihitung sebagai isi." }));

test("tingkat bermasalah: makin banyak temuan makin tinggi persennya (arah tidak terbalik)", () => {
  const paras = P(4), cfg = { masalah_batas_persen: 30 };
  const one = computeProblem(paras, null, [{ code: "K", para_idx: 0, sent_idx: 0, text: "x" }], cfg);
  const many = computeProblem(paras, null, [0, 1, 2, 3].map(i => ({ code: "K", para_idx: i, sent_idx: 0, text: "x" })), cfg);
  const none = computeProblem(paras, null, [], cfg);
  assert.ok(none.pct <= one.pct && one.pct < many.pct, JSON.stringify([none.pct, one.pct, many.pct]));
  assert.ok(many.pct > 30 && many.status === "belum_aman");
  assert.ok(none.pct < 30 || none.status !== "belum_aman");
});

test("temuan tingkat paragraf menandai semua kalimat paragraf itu, dan satu kalimat dihitung sekali", () => {
  const paras = P(2), cfg = {};
  const a = computeProblem(paras, null, [{ code: "P", para_idx: 0, sent_idx: 0, text: "x" }], cfg);
  const b = computeProblem(paras, null, [{ code: "P", para_idx: 0, sent_idx: 0, text: "x" }, { code: "P", para_idx: 0, sent_idx: 1, text: "y" }, { code: "K", para_idx: 0, sent_idx: 1, text: "y" }], cfg);
  assert.strictEqual(a.pct, b.pct);
});

const { runAudit } = require("../parafrase/auditrules");
const mk = t => t.split("\n").map((x, i) => ({ idx: i, text: x, style: /^(BAB|Daftar Pustaka)/.test(x) ? "Heading1" : "" }));
const DOC = `BAB III Metode Penelitian
Penelitian ini memakai pendekatan kualitatif dengan wawancara mendalam. Jumlah informan ditentukan dengan rumus Slovin sebanyak 50 orang. Hasil analisis regresi menunjukkan hipotesis terbukti benar.
Data dikumpulkan lewat survei kuesioner. Kepuasan menyebabkan loyalitas pelanggan (Kotler, 2016). H1: Kepuasan pelanggan.
Sampel diambil dengan teknik purposive sampling sehingga hasil dapat digeneralisasikan ke seluruh populasi (Sugiyono, 2019).
Dengan demikian H0 diterima karena nilai p lebih besar dari 0,05 (Sugiyono, 2019).
Daftar Pustaka
Kotler, P. (2016). Marketing. Pearson.
Anonim. Tanpa tahun buku.`;

test("audit: semua larangan modul Bab 4-7 terdeteksi, lengkap dengan kutipan dan persen bermasalah", async () => {
  const paras = mk(DOC), bi = paras.findIndex(p => p.text === "Daftar Pustaka");
  const r = await runAudit({ paragraphs: paras, bibliographyParagraphIndex: bi }, { fetchFn: async () => { throw new Error("off"); }, cfg: {} });
  const rules = r.findings.map(f => f.cat + " " + f.detail).join("\n");
  for (const re of [/H0.*diterima|diterima/i, /generalisasi/i, /informan|Slovin/i, /sebab|kausal|menyebabkan/i]) assert.ok(re.test(rules), String(re));
  assert.ok(r.findings.every(f => f.where && f.detail), "setiap temuan punya lokasi dan cara memperbaiki");
  assert.ok(r.findings.some(f => f.quote), "ada kutipan kalimat");
  assert.ok(r.score.problem && r.score.problem.pct > 30 && r.score.problem.status === "belum_aman");
});
