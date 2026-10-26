/* Tingkat bermasalah dokumen (persen). SATU rumus untuk Audit Dokumen dan Cek & Parafrase, jadi angkanya selalu sama.
   Arah: makin banyak larangan modul yang ketemu, makin TINGGI persennya. Di atas batas (bawaan 25%, penyangga di bawah batas resmi UT 30%) = belum aman.

   persen = unit bermasalah / semua unit x 100, dengan unit =
     - kalimat isi (bermasalah bila kena minimal satu aturan; temuan ber-scope "para" menandai semua kalimat di paragrafnya),
     - entri daftar pustaka (bermasalah bila tidak dikutip di isi atau tanpa tahun),
     - bila daftar pustaka tidak ada, satu unit "daftar pustaka" yang bermasalah.
   Satu unit dihitung sekali walau kena banyak aturan, jadi persen tidak pernah melebihi 100.
   Bukan skor Drillbit dan bukan nilai UT: ini hitungan Catatan Akademik dari aturan modul dan standar penulisan. */
"use strict";
const { splitSentences } = require("./docx");
const rules = require("./rules");

const WHOLE_PARA = new Set(["H", "P"]);
function wholeParagraph(f) { return f.scope ? f.scope === "para" : (WHOLE_PARA.has(f.code) || f.kind === "uniform"); }

function computeProblem(paras, bibAt, findings, cfg = {}) {
  const limit = Math.min(100, Math.max(1, Number(cfg.masalah_batas_persen) || 25));
  const body = paras.filter(p => rules.isBody(p, bibAt));
  const sentCount = new Map(); let nSent = 0;
  for (const p of body) { const n = splitSentences(p.text).length; sentCount.set(p.idx, n); nSent += n; }
  const flagged = new Set();
  for (const f of findings || []) {
    if (!sentCount.has(f.para_idx)) continue; // paragraf daftar pustaka dihitung di unit pustaka
    if (wholeParagraph(f)) for (let i = 0; i < sentCount.get(f.para_idx); i++) flagged.add(f.para_idx + ":" + i);
    else flagged.add(f.para_idx + ":" + f.sent_idx);
  }
  const bib = rules.parseBibliography(paras, bibAt).entries;
  let pDen = bib.length, pNum = 0, noBib = false;
  if (bibAt == null || !bib.length) { noBib = true; pDen = 1; pNum = 1; }
  else {
    const bad = new Set();
    for (const f of findings || []) if (f.code === "B" && !sentCount.has(f.para_idx) && bib.some(e => e.idx === f.para_idx)) bad.add(f.para_idx);
    for (const e of bib) if (!e.year) bad.add(e.idx);
    pNum = bad.size;
  }
  const num = flagged.size + pNum, den = nSent + pDen;
  const pct = den ? Math.round((num * 1000) / den) / 10 : 0;
  const status = !nSent ? "belum" : pct > limit ? "belum_aman" : "aman";
  // jumlah unit yang masih harus dibereskan supaya turun ke batas (pembulatan ke atas)
  const need = pct > limit ? Math.max(1, num - Math.floor((limit * den) / 100)) : 0;
  return { pct, num, den, limit, status, need, kalimat: { num: flagged.size, den: nSent }, pustaka: { num: pNum, den: pDen, tanpaDaftar: noBib },
    note: "Hitungan Catatan Akademik dari larangan modul dan standar penulisan. Bukan skor Drillbit dan bukan nilai UT. Setelah di bawah batas, tetap cek di Drillbit e-learning." };
}

module.exports = { computeProblem };
