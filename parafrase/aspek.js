/* Aspek isi KESELURUHAN dokumen dalam persen, untuk Audit Dokumen.
   Memakai temuan yang sama dengan Cek & Parafrase (rules.js), jadi angka audit dan warna parafrase selalu saling cocok.
   "Indikasi gaya tulisan seragam atau otomatis" adalah heuristik pola tulisan (frasa klise, keseragaman panjang kalimat,
   transisi dan awalan berulang). Ini BUKAN detektor AI, BUKAN skor Drillbit, dan BUKAN skor Turnitin. Tanpa AI, tanpa layanan luar. */
"use strict";
const { splitSentences, countWords } = require("./docx");
const rules = require("./rules");
const { kindOf } = require("./hint");

const MIN_SENTENCES = 12;
const norm1 = s => String(s || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const r1 = n => Math.round(n * 10) / 10;
const pctOf = (a, b) => (b > 0 ? r1((a * 100) / b) : null);

/* cfg.urgensi_ai_sedang / urgensi_ai_tinggi: batas tingkat indikasi gaya seragam (diatur admin; bawaan 30 dan 60). */
function computeAspects(paras, bibAt, findings, cfg = {}) {
  const lvSedang = Number(cfg.urgensi_ai_sedang) || 30, lvTinggi = Math.max(Number(cfg.urgensi_ai_tinggi) || 60, lvSedang + 1);
  const body = paras.filter(p => rules.isBody(p, bibAt));
  const sents = [];
  for (const p of body) splitSentences(p.text).forEach((s, si) => sents.push({ p: p.idx, si, s, w: countWords(s) }));
  const n = sents.length, enough = n >= MIN_SENTENCES, nPar = body.length;

  const keysBy = pred => new Set(findings.filter(pred).map(f => f.para_idx + ":" + f.sent_idx));
  const sentPct = pred => (enough ? pctOf(keysBy(pred).size, n) : null);
  const parPct = code => (nPar >= 3 ? pctOf(new Set(findings.filter(f => f.code === code).map(f => f.para_idx)).size, nPar) : null);

  const aspects = [
    { key: "kalimat_berulang", codes: ["M"], group: "orisinalitas", label: "Kalimat yang sama muncul lebih dari sekali", value: sentPct(f => f.code === "M"), good: "rendah" },
    { key: "kutipan_bermasalah", codes: ["B", "O"], group: "sitasi", label: "Kalimat dengan sitasi atau kutipan bermasalah", value: sentPct(f => f.code === "B" || f.code === "O"), good: "rendah" },
    { key: "klaim_tanpa_sumber", codes: ["K"], group: "sitasi", label: "Kalimat klaim atau angka tanpa sumber", value: sentPct(f => f.code === "K"), good: "rendah" },
    { key: "kalimat_panjang", codes: ["U"], group: "keterbacaan", label: "Kalimat terlalu panjang", value: sentPct(f => f.code === "U"), good: "rendah" },
    { key: "paragraf_pendek", codes: ["H"], group: "keterbacaan", label: "Paragraf pendek dan kurang berkembang", value: parPct("H"), good: "rendah" },
    { key: "paragraf_generik", codes: ["P"], group: "analisis", label: "Paragraf umum tanpa analisis spesifik", value: parPct("P"), good: "rendah" },
  ];

  /* indikator gaya seragam atau otomatis */
  const flagged = keysBy(f => kindOf(f) === "ai"); // kindOf membaca teks alasan bila kolom kind hilang (temuan dari database)
  const cliche = enough ? sents.filter(x => rules.GENERIC.some(g => norm1(x.s).includes(g))).length : 0;
  const transStart = enough ? sents.filter(x => rules.TRANS.some(t => norm1(x.s).startsWith(t + " "))).length : 0;
  let sameStart = 0;
  if (enough) for (let i = 1; i < sents.length; i++) {
    const a = norm1(sents[i].s).split(" ").slice(0, 2).join(" "), b = norm1(sents[i - 1].s).split(" ").slice(0, 2).join(" ");
    if (a && a === b && sents[i].p === sents[i - 1].p) sameStart++;
  }
  let uniform = null;
  if (enough) {
    const ws = sents.map(x => x.w), mean = ws.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(ws.reduce((a, b) => a + (b - mean) ** 2, 0) / n), cv = mean ? sd / mean : 0;
    uniform = Math.round(100 * (1 - Math.min(cv / 0.6, 1))); // cv rendah = panjang kalimat seragam
  }
  const parts = [
    { key: "frasa_otomatis", label: "Frasa yang sering muncul pada tulisan seragam", value: enough ? pctOf(flagged.size, n) : null, scale: 4 },
    { key: "frasa_klise", label: "Frasa klise atau terlalu umum", value: enough ? pctOf(cliche, n) : null, scale: 5 },
    { key: "panjang_seragam", label: "Keseragaman panjang kalimat", value: uniform, scale: 1 },
    { key: "transisi", label: "Kalimat berawalan penghubung baku", value: enough ? pctOf(transStart, n) : null, scale: 4 },
    { key: "awalan_sama", label: "Awalan kalimat sama berturut-turut", value: enough ? pctOf(sameStart, n) : null, scale: 6 },
  ];
  const W = { frasa_otomatis: 0.25, frasa_klise: 0.2, panjang_seragam: 0.25, transisi: 0.15, awalan_sama: 0.15 };
  let ai;
  if (!enough) {
    ai = { value: null, level: "belum", label: "Teks terlalu pendek untuk dinilai", parts, sentences: n };
  } else {
    const value = Math.round(parts.reduce((t, x) => t + W[x.key] * Math.min(100, x.value * x.scale), 0));
    const level = value >= lvTinggi ? "tinggi" : value >= lvSedang ? "sedang" : "rendah";
    ai = { value, level, label: { tinggi: "Indikasi tinggi", sedang: "Indikasi sedang", rendah: "Indikasi rendah" }[level], parts, sentences: n };
  }
  ai.codes = ["A"];
  ai.note = "Estimasi heuristik dari pola tulisan, bukan detektor AI dan bukan skor Drillbit atau Turnitin. Tulisan manusia bisa terbaca tinggi dan sebaliknya. Angka resmi hanya dari Drillbit milik UT.";
  return { aspects, ai };
}

module.exports = { computeAspects, MIN_SENTENCES };
