/* Standar Telaah Pustaka (Bab 4) dan Kerangka/Model (Bab 5), materi Metodologi Penelitian Manajemen dan Bisnis (BA2588).
   SATU sumber aturan, dipakai bersama oleh Cek Parafrase (rules.js, kode warna) dan Audit Dokumen (auditrules.js, tingkat temuan),
   supaya arahan keduanya selalu sama dan saling mengacu. Deterministik, tanpa AI. */
"use strict";

/* Pemetaan ke 8 kode warna Cek Parafrase. */
const STANDAR_CODE = { per_penulis: "P", tanpa_sintesis: "P", tanpa_gap: "P", hipotesis_tanpa_dasar: "K", hubungan_tanpa_mekanisme: "P" };

/* Pemetaan ke temuan Audit Dokumen: tingkat dan kategori. */
const STANDAR_AUDIT = {
  per_penulis: { sev: "peringatan", cat: "Telaah pustaka per penulis, bukan tematik (Bab 4)" },
  tanpa_sintesis: { sev: "peringatan", cat: "Sitasi berderet tanpa sintesis (Bab 4)" },
  tanpa_gap: { sev: "peringatan", cat: "Telaah pustaka belum mengarah ke research gap (Bab 4)" },
  hipotesis_tanpa_dasar: { sev: "kritis", cat: "Hipotesis tanpa dasar teori dan empiris (Bab 5)" },
  hubungan_tanpa_mekanisme: { sev: "info", cat: "Hubungan variabel tanpa mekanisme (Bab 5)" },
};

const SYNTH = /\b(namun|tetapi|berbeda|perbedaan|sedangkan|sebaliknya|sejalan|selaras|bertentangan|kontras|serupa|dibandingkan|membandingkan|di sisi lain|oleh karena itu|dengan demikian|kesenjangan|celah|gap)\b/i;
const NARR_START = /^\s*(menurut\s+\p{Lu}[\p{L}'’.-]+|\p{Lu}[\p{L}'’.-]+(?:\s+(?:dan|&|dkk\.?|et\s+al\.?)\s*\p{Lu}?[\p{L}'’.-]*)?\s*\(\s*(?:19|20)\d{2}|penelitian\s+(?:yang\s+dilakukan\s+)?(?:oleh\s+)?\p{Lu}[\p{L}'’.-]+)/iu;
const REL = /\b(berpengaruh|memengaruhi|mempengaruhi|berhubungan|berkorelasi|berdampak)\b/i;
const HYP = /\b(H\s?\d|hipotesis)\b/i;
const MECH = /\b(karena|sebab|melalui|mekanisme|sehingga|akibatnya|artinya|dengan demikian|menjelaskan bahwa|alasan)\b/i;
const GAP = /(research\s+gap|celah\s+(penelitian|riset)|kesenjangan\s+(penelitian|riset|literatur)|gap\s+penelitian)/i;
const LIT_HEAD = /(tinjauan|telaah|kajian)\s+pustaka|landasan\s+teori|kerangka\s+(teori|konseptual|pemikiran)/i;

/* h = { splitSentences, countWords, findCitations, hasCitation, isBody }. Mengembalikan [{rule, para_idx, sent_idx, text, reason}] */
function checkStandar(paras, bibAt, h) {
  const out = [];
  const add = (rule, p, si, text, reason) => out.push({ rule, para_idx: p.idx, sent_idx: si, text, reason });
  const body = paras.filter(p => h.isBody(p, bibAt));

  // Bab 4: telaah pustaka tematik, bukan ringkasan satu per satu
  let run = 0;
  for (const p of body) {
    const first = h.splitSentences(p.text)[0] || "";
    if (NARR_START.test(first)) { run++; if (run === 3) add("per_penulis", p, 0, first, "Tiga paragraf berturut-turut berisi ringkasan per penulis. Standar Bab 4: susun tematik, bukan per penulis. Gabungkan sumber dalam satu tema, lalu bandingkan."); }
    else run = 0;
  }
  // Bab 4: sitasi berderet tanpa sintesis
  for (const p of body) {
    const sents = h.splitSentences(p.text);
    const n = new Set(h.findCitations(p.text).filter(c => c.year).map(c => c.surname + c.year)).size;
    if (n >= 3 && !SYNTH.test(p.text)) add("tanpa_sintesis", p, 0, sents[0], `Paragraf memuat ${n} sumber tanpa sintesis. Standar Bab 4: bandingkan temuan, jelaskan persamaan dan perbedaannya, lalu tarik kesimpulan.`);
  }
  // Bab 4: telaah pustaka harus mengarah ke research gap
  const hasLit = paras.some(p => /heading|judul|title/i.test(p.style || "") && LIT_HEAD.test(p.text));
  if (hasLit && body.length >= 8 && !GAP.test(body.map(p => p.text).join(" "))) {
    const p = body[body.length - 1], sents = h.splitSentences(p.text);
    add("tanpa_gap", p, sents.length - 1, sents[sents.length - 1], "Telaah pustaka belum mengarah ke research gap. Standar Bab 4: tutup dengan apa yang belum dijawab literatur dan posisikan kontribusi penelitianmu.");
  }
  // Bab 5: hipotesis butuh dasar teori dan empiris; panah butuh mekanisme
  for (const p of body) {
    const sents = h.splitSentences(p.text);
    sents.forEach((s, si) => {
      if (!REL.test(s)) return;
      const near = s + " " + (sents[si - 1] || "") + " " + (sents[si + 1] || "");
      if (HYP.test(s) && !h.hasCitation(near)) add("hipotesis_tanpa_dasar", p, si, s, "Hipotesis atau hubungan antarvariabel belum punya dasar teori dan bukti empiris. Standar Bab 5: tambahkan sitasi teori dan penelitian terdahulu yang mendukung.");
      else if (!HYP.test(s) && !MECH.test(near) && !h.hasCitation(near) && /terhadap|antara/i.test(s) && h.countWords(s) >= 8)
        add("hubungan_tanpa_mekanisme", p, si, s, "Hubungan antarvariabel disebut tanpa mekanisme. Standar Bab 5: jelaskan mengapa dan bagaimana X memengaruhi Y.");
    });
  }
  return out;
}

module.exports = { checkStandar, STANDAR_CODE, STANDAR_AUDIT };
