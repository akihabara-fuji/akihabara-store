/* Standar Telaah Pustaka (Bab 4) dan Kerangka/Model (Bab 5), materi Metodologi Penelitian Manajemen dan Bisnis (BA2588).
   SATU sumber aturan, dipakai bersama oleh Cek Parafrase (rules.js, kode warna) dan Audit Dokumen (auditrules.js, tingkat temuan),
   supaya arahan keduanya selalu sama dan saling mengacu. Deterministik, tanpa AI. */
"use strict";

/* Pemetaan ke 8 kode warna Cek Parafrase. */
const STANDAR_CODE = {
  per_penulis: "P", tanpa_sintesis: "P", tanpa_gap: "P", hipotesis_tanpa_dasar: "K", hubungan_tanpa_mekanisme: "P",
  h0_diterima: "K", kausal_survei: "K", hipotesis_nonrelasional: "P", pendekatan_tak_selaras: "P", generalisasi_nonprobability: "K",
  informan_rumus: "K", populasi_sampel_kosong: "P", tanpa_keterbatasan: "P", definisi_berderet: "P", narasi_kronologis: "P",
  teori_hiasan: "P", variabel_tanpa_definisi: "P", kutipan_berlebihan: "O", model_terlalu_rumit: "P",
};

/* Cakupan tiap aturan untuk persen bermasalah: "sent" = hanya kalimat yang ditandai, "para" = seluruh paragraf yang ditandai. */
const STANDAR_SCOPE = {
  per_penulis: "para", tanpa_sintesis: "para", tanpa_gap: "para", hipotesis_tanpa_dasar: "sent", hubungan_tanpa_mekanisme: "sent",
  h0_diterima: "sent", kausal_survei: "sent", hipotesis_nonrelasional: "sent", pendekatan_tak_selaras: "sent", generalisasi_nonprobability: "sent",
  informan_rumus: "sent", populasi_sampel_kosong: "para", tanpa_keterbatasan: "para", definisi_berderet: "para", narasi_kronologis: "para",
  teori_hiasan: "para", variabel_tanpa_definisi: "sent", kutipan_berlebihan: "para", model_terlalu_rumit: "para",
};

/* Pemetaan ke temuan Audit Dokumen: tingkat dan kategori. */
const STANDAR_AUDIT = {
  per_penulis: { sev: "peringatan", cat: "Telaah pustaka per penulis, bukan tematik (Bab 4)" },
  tanpa_sintesis: { sev: "peringatan", cat: "Sitasi berderet tanpa sintesis (Bab 4)" },
  tanpa_gap: { sev: "peringatan", cat: "Telaah pustaka belum mengarah ke research gap (Bab 4)" },
  hipotesis_tanpa_dasar: { sev: "kritis", cat: "Hipotesis tanpa dasar teori dan empiris (Bab 5)" },
  hubungan_tanpa_mekanisme: { sev: "info", cat: "Hubungan variabel tanpa mekanisme (Bab 5)" },
  h0_diterima: { sev: "peringatan", cat: "H0 \"diterima\" atau hipotesis \"terbukti\" (Bab 6)" },
  kausal_survei: { sev: "peringatan", cat: "Klaim sebab-akibat dengan desain survei (Bab 6 dan 7)" },
  hipotesis_nonrelasional: { sev: "peringatan", cat: "Hipotesis tidak menyatakan hubungan antarvariabel (Bab 6)" },
  pendekatan_tak_selaras: { sev: "peringatan", cat: "Pendekatan dan alat analisis tidak selaras (Bab 7)" },
  generalisasi_nonprobability: { sev: "peringatan", cat: "Klaim generalisasi dengan sampel non-probabilitas (Bab 7)" },
  informan_rumus: { sev: "peringatan", cat: "Jumlah informan ditentukan rumus statistik (Bab 7)" },
  populasi_sampel_kosong: { sev: "peringatan", cat: "Populasi atau sampel belum dijelaskan (Bab 7)" },
  tanpa_keterbatasan: { sev: "info", cat: "Keterbatasan penelitian belum dinyatakan (Bab 7)" },
  definisi_berderet: { sev: "info", cat: "Definisi berderet tanpa dikaitkan ke penelitian (Bab 4)" },
  narasi_kronologis: { sev: "info", cat: "Telaah pustaka kronologis, bukan tematik (Bab 4)" },
  teori_hiasan: { sev: "info", cat: "Teori belum dikaitkan ke variabel atau hipotesis (Bab 4)" },
  variabel_tanpa_definisi: { sev: "info", cat: "Variabel belum didefinisikan (Bab 5)" },
  kutipan_berlebihan: { sev: "peringatan", cat: "Kutipan langsung terlalu banyak (Bab 4)" },
  model_terlalu_rumit: { sev: "peringatan", cat: "Model dan hipotesis terlalu banyak (Bab 5)" },
};

const SYNTH = /\b(namun|tetapi|berbeda|perbedaan|sedangkan|sebaliknya|sejalan|selaras|bertentangan|kontras|serupa|dibandingkan|membandingkan|di sisi lain|oleh karena itu|dengan demikian|kesenjangan|celah|gap)\b/i;
const NARR_START = /^\s*(menurut\s+\p{Lu}[\p{L}'’.-]+|\p{Lu}[\p{L}'’.-]+(?:\s+(?:dan|&|dkk\.?|et\s+al\.?)\s*\p{Lu}?[\p{L}'’.-]*)?\s*\(\s*(?:19|20)\d{2}|penelitian\s+(?:yang\s+dilakukan\s+)?(?:oleh\s+)?\p{Lu}[\p{L}'’.-]+)/iu;
const REL = /\b(berpengaruh|memengaruhi|mempengaruhi|berhubungan|berkorelasi|berdampak)\b/i;
const HYP = /\b(H\s?\d|hipotesis)\b/i;
const MECH = /\b(karena|sebab|melalui|mekanisme|sehingga|akibatnya|artinya|dengan demikian|menjelaskan bahwa|alasan)\b/i;
const GAP = /(research\s+gap|celah\s+(penelitian|riset)|kesenjangan\s+(penelitian|riset|literatur)|gap\s+penelitian)/i;
const LIT_HEAD = /(tinjauan|telaah|kajian)\s+pustaka|landasan\s+teori|kerangka\s+(teori|konseptual|pemikiran)/i;

/* Bab 6 dan 7 (BA2588). Sumber: slide Bab 4 sampai 7, nomor halaman buku ada di komentar tiap aturan. */
const H0_SALAH = /\b(?:H\s?[0₀]|hipotesis\s+nol)\s+(?:diterima|terbukti)|\bmenerima\s+(?:H\s?[0₀]|hipotesis\s+nol)|\bhipotesis\s+(?:alternatif\s+|penelitian\s+)?(?:telah\s+|sudah\s+)?(?:terbukti|dibuktikan)|\bmembuktikan\s+(?:bahwa\s+)?(?:hipotesis|H\s?\d)|\bterbukti\s+benar\b/i;
const KAUSAL = /\b(menyebabkan|mengakibatkan|berdampak\s+langsung|hubungan\s+sebab[- ]akibat|efek\s+kausal)\b/i;
const DESAIN_SURVEI = /\b(survei|survey|kuesioner|kuisioner|angket|cross[- ]?sectional)\b/i;
const DESAIN_KUAT = /\b(eksperimen|eksperimental|kuasi[- ]?eksperimen|longitudinal|randomized)\b/i;
const H_LABEL = /^\s*(?:H\s?[1-9][0-9]?[a-z]?|H[aA₁-₉])\s*[:.)]\s*(.+)$/;
const H_HUBUNGAN = /\b(hubungan|pengaruh|berpengaruh|memengaruhi|mempengaruhi|korelasi|berkorelasi|berhubungan|perbedaan|berbeda|memediasi|memoderasi|mediasi|moderasi|terhadap|antara|berdampak|meningkatkan|menurunkan)\b/i;
const KUAL = /\b(pendekatan|metode|penelitian|desain)\s+kualitatif\b/i;
const KUAN = /\b(pendekatan|metode|penelitian|desain)\s+kuantitatif\b/i;
const CAMPURAN = /\b(mixed\s+methods?|metode\s+campuran|penelitian\s+campuran|kombinasi\s+kuantitatif)\b/i;
const ALAT_KUAN = /\b(regresi|SEM|PLS|ANOVA|uji[- ]t|uji\s+hipotesis|skala\s+Likert|analisis\s+jalur)\b|\bhipotesis\s+(?:penelitian|nol|alternatif)\b|\bH[1-9]\s*[:.]/i;
const ALAT_KUAL = /\b(saturasi|purposive|fenomenologi|etnografi|grounded\s+theory|wawancara\s+mendalam|triangulasi\s+sumber|coding|pengkodean)\b/i;
const GENERALISASI = /\b(generalisasi|digeneralisasikan|digeneralisasi|mewakili\s+(?:seluruh\s+)?populasi|berlaku\s+untuk\s+seluruh\s+populasi)\b/i;
const NONPROB = /\b(purposive|convenience|aksidental|accidental|snowball|kuota|quota|non[- ]?probabilit\w*|sampling\s+jenuh|sampel\s+jenuh)\b/i;
const PROB = /\b(probability\s+sampling|probabilitas|random\s+sampling|simple\s+random|acak\s+sederhana|stratified|cluster\s+sampling|sampel\s+acak)\b/i;
const INFORMAN = /\b(informan|partisipan\s+kualitatif)\b/i;
const RUMUS = /\b(slovin|rumus\s+(?:slovin|lemeshow|cochran|isaac)|lemeshow|cochran|krejcie)\b/i;
const METODE_HEAD = /(metode|metodologi|desain)\s+penelitian|populasi\s+dan\s+sampel|bab\s+(iii|3)\b/i;
const POPULASI = /\bpopulasi\b/i;
const SAMPEL = /\b(sampel|informan|responden|partisipan|subjek\s+penelitian)\b/i;
const KETERBATASAN = /\b(keterbatasan|limitasi|batasan\s+penelitian)\b/i;
const DEFINISI = /\b(adalah|merupakan|didefinisikan\s+sebagai|diartikan\s+sebagai|dapat\s+diartikan)\b/i;
const KRONO = /^\s*(?:pada\s+)?(?:tahun\s+)?(19|20)\d{2}\b[,\s]/i;
const TEORI = /\b(teori|theory|grand\s+theory|resource[- ]based\s+view|technology\s+acceptance\s+model)\b/i;
const KAITAN_TEORI = /\b(variabel|hipotesis|model\s+penelitian|penelitian\s+ini|konstruk|kerangka\s+konseptual|menjelaskan\s+(?:bagaimana|mengapa)|mendasari|diturunkan|digunakan\s+untuk\s+menjelaskan)\b/i;
const DEF_OPERASIONAL = /\b(didefinisikan|definisi\s+(?:operasional|konseptual)|operasionalisasi|indikator\s+variabel)\b/i;
const QUOTE = /[“"][^”"]{20,}[”"]/;

/* h = { splitSentences, countWords, findCitations, hasCitation, isBody }. Mengembalikan [{rule, para_idx, sent_idx, text, reason}] */
function checkStandar(paras, bibAt, h, cfg = {}) {
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
  const bodyText = body.map(p => p.text).join(" ");
  const fullText = paras.map(p => p.text).join(" ");
  const headIdx = paras.findIndex(p => /heading|judul|title/i.test(p.style || "") && METODE_HEAD.test(p.text));
  const after = headIdx >= 0 ? body.filter(p => p.idx > headIdx) : [];

  // Bab 6 (hlm. 158-159, 163): H0 tidak "diterima", hipotesis tidak "dibuktikan"
  for (const p of body) h.splitSentences(p.text).forEach((s, si) => {
    if (H0_SALAH.test(s)) add("h0_diterima", p, si, s, "H0 tidak \"diterima\" dan hipotesis tidak \"terbukti\". Standar Bab 6: tulis \"H0 ditolak\" atau \"gagal ditolak\", dan \"hipotesis didukung data\".");
  });
  // Bab 6 (hlm. 157-158) dan Bab 7 (hlm. 172-175): klaim sebab-akibat butuh desain yang kuat
  if (DESAIN_SURVEI.test(fullText) && !DESAIN_KUAT.test(fullText))
    for (const p of body) h.splitSentences(p.text).forEach((s, si) => {
      if (KAUSAL.test(s)) add("kausal_survei", p, si, s, "Klaim sebab-akibat padahal desain penelitian survei. Standar Bab 6 dan 7: ganti ke \"berpengaruh\" atau \"berhubungan\", atau sebutkan keterbatasan desain.");
    });
  // Bab 6 (hlm. 155-156): hipotesis relasional
  for (const p of body) h.splitSentences(p.text).forEach((s, si) => {
    const m = s.match(H_LABEL);
    if (m && h.countWords(m[1]) >= 3 && !H_HUBUNGAN.test(m[1])) add("hipotesis_nonrelasional", p, si, s, "Hipotesis tidak menyatakan hubungan antarvariabel. Standar Bab 6: tulis hubungan X dan Y yang jelas, terukur, dan bisa diuji.");
  });
  // Bab 7 (hlm. 172-181): pendekatan harus selaras dengan alat analisis
  if (!CAMPURAN.test(fullText)) {
    const kual = KUAL.test(fullText), kuan = KUAN.test(fullText);
    if (kual !== kuan) {
      const bad = kual ? ALAT_KUAN : ALAT_KUAL, say = kual ? KUAL : KUAN;
      if (bad.test(bodyText)) {
        const p = body.find(q => say.test(q.text)) || body[0], sents = h.splitSentences(p.text), si = Math.max(0, sents.findIndex(s => say.test(s)));
        add("pendekatan_tak_selaras", p, si, sents[si] || p.text, kual
          ? "Pendekatan kualitatif tetapi dokumen memakai hipotesis atau uji statistik. Standar Bab 7: samakan pendekatan dengan alat analisisnya (kualitatif: tema dan saturasi)."
          : "Pendekatan kuantitatif tetapi dokumen memakai purposive, saturasi, atau analisis tema. Standar Bab 7: samakan pendekatan dengan alat analisisnya (kuantitatif: sampel, statistik).");
      }
    }
  }
  // Bab 7 (hlm. 184-186): generalisasi butuh probability sampling
  if (NONPROB.test(fullText) && !PROB.test(fullText))
    for (const p of body) h.splitSentences(p.text).forEach((s, si) => {
      if (GENERALISASI.test(s)) add("generalisasi_nonprobability", p, si, s, "Klaim generalisasi padahal sampel non-probabilitas. Standar Bab 7: hapus klaim generalisasi, atau gunakan probability sampling.");
    });
  // Bab 7 (hlm. 186-191): jumlah informan kualitatif ditentukan saturasi, bukan rumus
  for (const p of body) h.splitSentences(p.text).forEach((s, si) => {
    if (INFORMAN.test(s) && RUMUS.test(s)) add("informan_rumus", p, si, s, "Jumlah informan ditentukan dengan rumus statistik. Standar Bab 7: tentukan lewat saturasi data dan kecukupan informasi.");
  });
  // Bab 7 (hlm. 183-185, 189-192): populasi, sampel, dan keterbatasan harus ditulis
  if (headIdx >= 0 && after.length >= 3) {
    const t = after.map(p => p.text).join(" "), first = after[0], last = after[after.length - 1];
    if (!POPULASI.test(t) || !SAMPEL.test(t)) add("populasi_sampel_kosong", first, 0, h.splitSentences(first.text)[0] || first.text, `Bagian metode belum menjelaskan ${!POPULASI.test(t) && !SAMPEL.test(t) ? "populasi dan sampel" : !POPULASI.test(t) ? "populasi" : "sampel atau informan"}. Standar Bab 7: tulis populasi, unit analisis, kerangka sampel, dan sampel atau informan.`);
    if (after.length >= 8 && !KETERBATASAN.test(t)) add("tanpa_keterbatasan", last, Math.max(0, h.splitSentences(last.text).length - 1), h.splitSentences(last.text).pop() || last.text, "Keterbatasan penelitian belum dinyatakan. Standar Bab 7: akui keterbatasan desain secara jujur dan proporsional.");
  }
  // Bab 4 (hlm. 101): jangan menyalin definisi berderet
  for (const p of body) {
    const sents = h.splitSentences(p.text); let run = 0;
    sents.forEach((s, si) => {
      run = DEFINISI.test(s) && !h.hasCitation(s) ? run + 1 : 0;
      if (run === 3) add("definisi_berderet", p, si, s, "Tiga kalimat definisi berturut-turut. Standar Bab 4: gabungkan, parafrase dengan kalimat sendiri, lalu kaitkan ke variabel penelitianmu.");
    });
  }
  // Bab 4 (hlm. 117-118): narasi tematik, bukan kronologis
  { let run = 0; for (const p of body) { if (KRONO.test(p.text)) { run++; if (run === 3) add("narasi_kronologis", p, 0, h.splitSentences(p.text)[0] || p.text, "Tiga paragraf berturut-turut disusun menurut tahun. Standar Bab 4: kelompokkan menurut tema, lalu bandingkan temuan tiap tema."); } else run = 0; } }
  // Bab 4 (hlm. 113-114): teori harus punya fungsi, bukan hiasan
  for (const p of body) {
    const sents = h.splitSentences(p.text);
    if (sents.length >= 2 && sents.length <= 3 && TEORI.test(p.text) && !KAITAN_TEORI.test(p.text) && !h.hasCitation(p.text))
      add("teori_hiasan", p, 0, sents[0], "Teori disebut tanpa dikaitkan ke variabel atau hipotesis. Standar Bab 4: jelaskan fungsi teori (membingkai, menjelaskan mekanisme, atau menurunkan hipotesis).");
  }
  // Bab 5 (hlm. 144-146): variabel harus didefinisikan
  {
    let first = null;
    for (const p of body) { const sents = h.splitSentences(p.text); for (let si = 0; si < sents.length; si++) if (H_LABEL.test(sents[si])) { first = { p, si, s: sents[si] }; break; } if (first) break; }
    if (first && !DEF_OPERASIONAL.test(fullText)) add("variabel_tanpa_definisi", first.p, first.si, first.s, "Variabel pada hipotesis belum didefinisikan. Standar Bab 5: definisikan tiap konstruk dan jelaskan cara mengukurnya (definisi operasional).");
  }
  // Ambang berikut tidak ada angkanya di modul, jadi MATI sampai admin mengisi pengaturannya.
  const qMax = Number(cfg.standar_kutipan_max_persen) || 0;
  if (qMax > 0) {
    const all = body.flatMap(p => h.splitSentences(p.text).map((s, si) => ({ p, si, s }))), nq = all.filter(x => QUOTE.test(x.s)).length;
    if (all.length >= 12 && (nq * 100) / all.length > qMax) { const x = all.filter(y => QUOTE.test(y.s)).pop(); add("kutipan_berlebihan", x.p, x.si, x.s, `Kutipan langsung ${Math.round((nq * 1000) / all.length) / 10}% dari kalimat (batas ${qMax}%). Standar Bab 4: pakai kutipan langsung secara hemat, parafrase sisanya dengan sitasi.`); }
  }
  const hMax = Number(cfg.standar_hipotesis_max) || 0;
  if (hMax > 0) {
    const labels = new Set((bodyText.match(/\bH\s?[1-9][0-9]?\b/g) || []).map(x => x.replace(/\s/g, "")));
    if (labels.size > hMax) { const p = body[body.length - 1]; add("model_terlalu_rumit", p, 0, h.splitSentences(p.text)[0] || p.text, `Ada ${labels.size} hipotesis (batas ${hMax}). Standar Bab 5: model cukup kompleks untuk realistis, cukup sederhana untuk diuji. Setiap tambahan variabel butuh alasan teoretis dan empiris.`); }
  }
  return out;
}

module.exports = { checkStandar, STANDAR_CODE, STANDAR_AUDIT, STANDAR_SCOPE };
