/* Triage urgensi perbaikan: SATU mesin yang dipakai Audit Dokumen (diagnosis) dan Cek & Parafrase (obat).
   Memakai temuan yang sama (rules.js) dan ambang yang sama (pengaturan admin), jadi kedua layanan selalu sepakat.

   Urutan keputusan tingkat dokumen:
   1. Bila murid menempel angka Drillbit resmi (tidak diverifikasi), angka itu menentukan: di atas batas acuan = Mendesak.
   2. Tanpa angka Drillbit, tingkat berasal dari ESTIMASI pola tulisan + jumlah paragraf mendesak. Ini heuristik, bukan skor Drillbit,
      Turnitin, atau detektor AI. Batas acuan diatur admin, bukan aturan resmi UT.

   Keluaran sengaja hanya berisi hitungan, nomor paragraf, dan label umum: tidak ada kutipan kalimat dokumen, supaya aman dipakai
   pada pratinjau yang masih terkunci. Potongan awal paragraf (excerpt) hanya ikut bila withText=true (hasil berbayar). */
"use strict";
const rules = require("./rules");
const { computeAspects } = require("./aspek");
const { kindOf, GUIDE, GUIDE_BY_CODE, GUIDE_TEKNIK, GUIDE_CEK_RESMI } = require("./hint");

/* bobot per jenis temuan; tiap jenis dihitung maksimal 3 kali per paragraf supaya satu jenis tidak mendominasi */
const W = { M: 5, O: 4, P: 3, A_ai: 3, A_uniform: 3, K: 2, B: 2, A_trans: 2, A_awalan: 2, U: 1, H: 1 };
const LABEL = { M: "kalimat berulang", O: "kutipan tanpa sitasi", P: "paragraf umum", A_ai: "frasa gaya seragam", A_uniform: "panjang kalimat seragam", K: "klaim tanpa sumber", B: "sitasi bermasalah", A_trans: "penghubung berulang", A_awalan: "awalan kalimat sama", U: "kalimat terlalu panjang", H: "paragraf pendek" };
const ACTION = { M: "Tulis ulang", O: "Beri tanda kutip dan sitasi", P: "Tambah analisis", A_ai: "Ganti dengan kata sendiri", A_uniform: "Variasikan panjang kalimat", K: "Tambah sumber", B: "Lengkapi sitasi", A_trans: "Variasikan penghubung", A_awalan: "Variasikan awalan", U: "Singkat", H: "Tambah kalimat" };
const LEVEL_LABEL = { mendesak: "Mendesak diperbaiki", perhatian: "Perlu perhatian", aman: "Relatif aman", belum: "Belum bisa dinilai" };
const keyOf = f => (f.code === "A" ? "A_" + (kindOf(f) || "trans") : f.code);
const r1 = n => Math.round(n * 10) / 10;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/* angka Drillbit dari pengguna: "18,5" / "18.5" / "18" (0 sampai 100), selain itu null */
function parseDrill(q = {}) {
  const one = v => { const s = String(v == null ? "" : v).trim().replace(",", ".").replace(/%$/, ""); if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null; const n = parseFloat(s); return n <= 100 ? n : null; };
  const sim = one(q.sim), ai = one(q.ai);
  return sim == null && ai == null ? null : { sim, ai };
}

/* Bagian yang tidak bergantung pada angka Drillbit. Kecil dan aman disimpan di cache. */
function buildTriageBase({ paras, bibAt = null, findings, cfg = {}, withText = false, aspects: preAspects = null }) {
  const limits = { sim: num(cfg.drillbit_sim_max, 25), ai: num(cfg.drillbit_ai_max, 20) };
  const skorMendesak = Math.max(3, num(cfg.urgensi_paragraf_skor, 8)), skorPerhatian = Math.max(2, Math.ceil(skorMendesak / 2));
  const persenMendesak = Math.max(1, num(cfg.urgensi_paragraf_persen, 15));
  const lvSedang = num(cfg.urgensi_ai_sedang, 30), lvTinggi = Math.max(num(cfg.urgensi_ai_tinggi, 60), lvSedang + 1);

  const ord = new Map(); let k = 0; for (const p of paras) if (String(p.text || "").trim()) ord.set(p.idx, ++k);
  const body = paras.filter(p => rules.isBody(p, bibAt)), nBody = body.length;
  const aspects = preAspects || computeAspects(paras, bibAt, findings, cfg);

  const byPara = new Map();
  for (const f of findings) {
    const key = keyOf(f), e = byPara.get(f.para_idx) || { n: {}, score: 0 };
    e.n[key] = (e.n[key] || 0) + 1; byPara.set(f.para_idx, e);
  }
  const paragraphs = [];
  for (const [idx, e] of byPara) {
    let score = 0, top = null, topV = -1;
    for (const [key, n] of Object.entries(e.n)) { const v = (W[key] || 1) * Math.min(n, 3); score += v; if (v > topV) { topV = v; top = key; } }
    const level = score >= skorMendesak ? "mendesak" : score >= skorPerhatian ? "perhatian" : "ringan";
    const para = paras.find(p => p.idx === idx);
    const row = {
      no: ord.get(idx) || idx + 1, level, score,
      reasons: Object.entries(e.n).sort((a, b) => (W[b[0]] || 1) * Math.min(b[1], 3) - (W[a[0]] || 1) * Math.min(a[1], 3)).slice(0, 3).map(([key, n]) => `${LABEL[key] || key}${n > 1 ? " ×" + n : ""}`),
      fix: { key: top, action: ACTION[top] || "Perbaiki" },
    };
    if (withText && para) row.excerpt = String(para.text).trim().replace(/\s+/g, " ").slice(0, 70);
    paragraphs.push(row);
  }
  paragraphs.sort((a, b) => b.score - a.score || a.no - b.no);
  const counts = { mendesak: 0, perhatian: 0, ringan: 0 };
  for (const p of paragraphs) counts[p.level]++;
  const urgentPct = nBody ? r1(counts.mendesak * 100 / nBody) : 0;

  const ai = aspects.ai;
  let internal = "aman";
  if (nBody < 3 && !findings.length) internal = "belum";
  else if (ai.level === "tinggi" || urgentPct >= persenMendesak) internal = "mendesak";
  else if (ai.level === "sedang" || counts.mendesak > 0 || counts.perhatian >= 3) internal = "perhatian";

  const reasons = [];
  if (ai.value != null && (ai.level === "tinggi" || ai.level === "sedang")) reasons.push(`Indikasi pola tulisan seragam sekitar ${ai.value}% (${ai.level}; batas sedang ${lvSedang}%, tinggi ${lvTinggi}%).`);
  if (counts.mendesak) reasons.push(`${counts.mendesak} dari ${nBody} paragraf berstatus mendesak (${String(urgentPct).replace(".", ",")}%; dokumen dianggap mendesak bila mencapai ${persenMendesak}%).`);
  else if (counts.perhatian) reasons.push(`${counts.perhatian} paragraf perlu perhatian, belum ada yang mendesak.`);
  const sentDup = aspects.aspects.find(a => a.key === "kalimat_berulang");
  if (sentDup && sentDup.value) reasons.push(`Kalimat yang sama muncul lebih dari sekali: ${String(sentDup.value).replace(".", ",")}% dari kalimat.`);

  /* resep: hanya untuk jenis temuan yang benar-benar ada, diurutkan menurut bobot total */
  const weightBy = {};
  for (const f of findings) { const g = GUIDE_BY_CODE[f.code]; if (g) weightBy[g] = (weightBy[g] || 0) + (W[keyOf(f)] || 1); }
  const treatments = Object.keys(weightBy).sort((a, b) => weightBy[b] - weightBy[a]).map(key => ({ key, title: GUIDE[key].title, why: GUIDE[key].why, steps: GUIDE[key].steps }));

  return {
    internal: { level: internal, aiLevel: ai.level, aiValue: ai.value, urgentPct, nBody, counts },
    reasons, limits, paragraphs: paragraphs.filter(p => p.level !== "ringan").slice(0, 12),
    treatments, teknik: GUIDE_TEKNIK, cekResmi: GUIDE_CEK_RESMI,
    note: "Estimasi dari pola tulisan dan temuan di dokumenmu: bukan skor Drillbit, bukan skor Turnitin, dan bukan detektor AI. Tulisan manusia bisa terbaca tinggi dan sebaliknya. Batas acuan diatur admin, bukan aturan resmi UT; ikuti ketentuan prodi dan tutormu. Angka resmi hanya dari Drillbit milik UT.",
  };
}

/* Gabungkan dengan angka Drillbit milik murid (bila ada). drill = hasil parseDrill atau null. */
function withDrillbit(base, drill) {
  const { limits } = base, out = { ...base, drillbit: null, gap: null };
  let level = base.internal.level, basis = "pola";
  const reasons = base.reasons.slice();
  if (drill) {
    const simOver = drill.sim != null && drill.sim > limits.sim, aiOver = drill.ai != null && drill.ai > limits.ai, over = simOver || aiOver;
    basis = "drillbit";
    level = over ? "mendesak" : (base.internal.level === "aman" || base.internal.level === "belum" ? "aman" : "perhatian");
    out.drillbit = { sim: drill.sim, ai: drill.ai, simOver, aiOver };
    out.gap = { sim: simOver ? r1(drill.sim - limits.sim) : 0, ai: aiOver ? r1(drill.ai - limits.ai) : 0 };
    const fmt = n => String(n).replace(".", ",");
    const dr = [];
    if (drill.sim != null) dr.push(`similarity ${fmt(drill.sim)}% (batas acuan ${limits.sim}%)${simOver ? ", perlu turun sekitar " + fmt(out.gap.sim) + " poin" : ""}`);
    if (drill.ai != null) dr.push(`tulisan AI ${fmt(drill.ai)}% (batas acuan ${limits.ai}%)${aiOver ? ", perlu turun sekitar " + fmt(out.gap.ai) + " poin" : ""}`);
    reasons.unshift(`Angka Drillbit yang kamu tempel: ${dr.join("; ")}.`);
    if (!over && base.internal.level !== "aman" && base.internal.level !== "belum") reasons.push("Angka Drillbit-mu di bawah batas, tetapi pola tulisan masih ditandai. Benahi bila sempat.");
  }
  out.level = level; out.label = LEVEL_LABEL[level]; out.basis = basis; out.reasons = reasons;
  out.headline = basis === "drillbit" ? "Berdasarkan angka Drillbit yang kamu tempel (tidak kami verifikasi) dan pola tulisan di dokumenmu." : "Estimasi dari pola tulisan di dokumenmu, belum memakai angka Drillbit.";
  const n = base.paragraphs.filter(p => p.level === "mendesak").map(p => p.no).slice(0, 6);
  out.next = level === "aman" ? "Tetap baca ulang sebelum dikumpulkan." : level === "belum" ? "Tambahkan isi dokumen agar bisa dinilai." : n.length ? `Rombak dulu paragraf ke-${n.join(", ")}, lalu periksa ulang.` : "Mulai dari paragraf berstatus perlu perhatian, lalu periksa ulang.";
  return out;
}

const buildTriage = (input, drill = null) => withDrillbit(buildTriageBase(input), drill);

/* Tanda tangan pengaturan yang memengaruhi temuan dan triage. Cache analisis memakainya supaya perubahan angka oleh admin
   langsung berlaku (bukan menunggu cache habis). */
const SIG_KEYS = ["long_sentence_words", "drillbit_sim_max", "drillbit_ai_max", "urgensi_ai_sedang", "urgensi_ai_tinggi", "masalah_batas_persen", "standar_kutipan_max_persen", "standar_hipotesis_max", "urgensi_paragraf_skor", "urgensi_paragraf_persen", "preview_open_paragraphs"];
const settingsSig = cfg => JSON.stringify(SIG_KEYS.map(k => (cfg || {})[k]));

module.exports = { buildTriage, buildTriageBase, withDrillbit, parseDrill, settingsSig, LEVEL_LABEL, W, LABEL };
