/* Mesin analisis lokal NextAja untuk 8 kategori catatan. Tanpa layanan luar, tanpa AI, tanpa skor kemiripan.
   Semua ambang berasal dari pengaturan admin. Ini aturan internal NextAja, bukan aturan resmi UT dan bukan DrillBit.

   M  Merah       kalimat berulang di dalam dokumen (kemiripan dengan sumber luar TIDAK dinilai di v1; lihat catatan di bawah)
   O  Oranye      kutipan langsung tanpa sitasi
   K  Kuning      klaim angka/umum tanpa sumber
   B  Biru        sitasi tidak jelas: tanpa tahun, tanpa halaman pada kutipan langsung, tidak ada di daftar pustaka
   U  Ungu        kalimat terlalu panjang
   H  Hijau       paragraf pendek, kurang berkembang
   P  Merah muda  paragraf generik tanpa analisis spesifik
   A  Abu-abu     transisi atau awalan kalimat berulang

   Catatan M: tanpa korpus sumber, v1 hanya menandai kalimat yang sama/mirip muncul dua kali di dokumen yang sama.
   Kemiripan dengan sumber luar datang dari laporan DrillBit milik murid (v2) atau tanda manual admin. Jangan menyebut
   "dibandingkan dengan database jurnal dan internet". */
"use strict";
const { splitSentences, countWords } = require("./docx");

const CODES = {
  M: { color: "merah", action: "Tulis ulang" },
  O: { color: "oranye", action: "Beri tanda kutip dan sitasi" },
  K: { color: "kuning", action: "Tambah sumber" },
  B: { color: "biru", action: "Lengkapi sitasi" },
  U: { color: "ungu", action: "Singkat" },
  H: { color: "hijau", action: "Tambah kalimat" },
  P: { color: "merah muda", action: "Tambah analisis" },
  A: { color: "abu-abu", action: "Variasikan" },
};
const PRIORITY = ["M", "O", "K", "B", "U", "H", "P", "A"];

/* ---------- sitasi ---------- */
const YEAR = "(?:19|20)\\d{2}[a-z]?";
const NAME = "\\p{Lu}[\\p{L}'’.-]+";
const AUTH = `${NAME}(?:(?:\\s+(?:dkk\\.?|et\\s+al\\.?))|(?:\\s*(?:,|dan|&|and)\\s*${NAME})*)`;
const NARR = new RegExp(`(${AUTH})\\s*\\(\\s*(${YEAR})([^)]*)\\)`, "gu");           // Robbins (2016, hlm. 5)
const PAREN = new RegExp(`\\(([^()]*?)\\)`, "gu");
const PAGE = /(?:hlm\.?|halaman|h\.|p\.|pp\.|page)\s*\d+/i;
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

function findCitations(text) {
  const out = [];
  for (const m of text.matchAll(NARR)) out.push({ surname: norm(m[1].split(/[\s,&]/)[0]), year: m[2].slice(0, 4), page: PAGE.test(m[3] || ""), idx: m.index, raw: m[0] });
  for (const m of text.matchAll(PAREN)) {
    const inner = m[1];
    if (!/\d/.test(inner) && !/\b(dkk|et al)\b/i.test(inner)) continue;
    for (const part of inner.split(";")) {
      const y = part.match(new RegExp(YEAR));
      const a = part.match(new RegExp(`^\\s*(${NAME})`, "u"));
      if (y && a) out.push({ surname: norm(a[1]), year: y[0].slice(0, 4), page: PAGE.test(part), idx: m.index, raw: `(${part.trim()})` });
      else if (a && /\b(dkk|et al)\b|,|&/.test(part) && !y) out.push({ surname: norm(a[1]), year: "", page: false, idx: m.index, raw: `(${part.trim()})`, noYear: true });
    }
  }
  return out;
}
const hasCitation = t => findCitations(t).some(c => !c.noYear);

/* ---------- daftar pustaka ---------- */
function parseBibliography(paras, bibAt) {
  const keys = new Set(), entries = [];
  if (bibAt == null) return { keys, entries };
  for (let i = bibAt + 1; i < paras.length; i++) {
    const t = paras[i].text.trim(); if (!t) continue;
    const y = t.match(new RegExp(`\\((${YEAR})\\)|\\b(${YEAR})\\b`));
    const s = t.match(new RegExp(`^(${NAME})`, "u"));
    if (!y || !s) { entries.push({ idx: i, surname: "", year: "" }); continue; }
    const e = { idx: i, surname: norm(s[1]), year: (y[1] || y[2]).slice(0, 4) };
    entries.push(e); keys.add(e.surname + e.year);
  }
  return { keys, entries };
}

/* ---------- pola ---------- */
const GENERIC = ["sangat penting", "memegang peranan penting", "memegang peran penting", "era globalisasi", "di era digital", "tidak dapat dipungkiri", "tidak dapat dipungkiri lagi",
  "seiring perkembangan zaman", "seiring dengan perkembangan", "dalam kehidupan sehari-hari", "berbagai aspek", "berbagai bidang", "semakin berkembang pesat", "merupakan hal yang penting",
  "pada zaman sekarang", "di zaman modern", "tak bisa dipisahkan", "memiliki peran yang sangat", "dalam era modern", "sudah menjadi rahasia umum"];
const CLAIM = /\b(\d+(?:[.,]\d+)?\s*(?:%|persen|juta|miliar|triliun|ribu)|sebesar\s+\d|meningkat\s+\d|menurun\s+\d|terbukti|para ahli|banyak penelitian|studi menunjukkan|penelitian menunjukkan|data menunjukkan|hasil penelitian|menurut penelitian|semua orang|selalu|tidak pernah|satu-satunya|pasti)\b/i;
const TRANS = ["selain itu", "oleh karena itu", "selanjutnya", "di samping itu", "dengan demikian", "namun demikian", "lebih lanjut", "sehingga", "kemudian", "pertama", "kedua", "ketiga"];
const norm1 = s => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const firstWords = (s, n) => norm1(s).split(" ").slice(0, n).join(" ");

function isBody(p, bibAt) {
  if (p.inTable) return false;
  if (bibAt != null && p.idx >= bibAt) return false;
  if (/heading|title|judul|caption|toc|header|footer|list/i.test(p.style)) return false;
  const t = p.text.trim();
  if (countWords(t) < 8) return false;
  if (/^(tabel|gambar|grafik|bagan|sumber)\s*\d*[.:]?/i.test(t) && countWords(t) < 20) return false;
  return true;
}

/* ---------- analisis utama ---------- */
function analyzeFindings(paras, bibAt, cfg = {}) {
  const longMax = cfg.long_sentence_words || 35;
  const { keys: bibKeys } = parseBibliography(paras, bibAt);
  const hasBib = bibAt != null && bibKeys.size > 0;
  const out = [];
  const add = (code, p, si, text, reason) => out.push({ code, para_idx: p.idx, sent_idx: si, text, reason });
  const seen = new Map();            // kalimat ternormalisasi -> lokasi pertama (untuk M)
  const cited = new Set();           // kunci sitasi yang dipakai di teks

  for (const p of paras) {
    if (!isBody(p, bibAt)) continue;
    const sents = splitSentences(p.text);
    if (!sents.length) continue;
    const pCited = sents.some(hasCitation);
    const pWords = sents.reduce((n, s) => n + countWords(s), 0);

    sents.forEach((s, si) => {
      const w = countWords(s);
      const cits = findCitations(s);
      for (const c of cits) if (c.year) cited.add(c.surname + c.year);

      // U: kalimat terlalu panjang
      if (w > longMax) add("U", p, si, s, `Kalimat ${w} kata (batas ${longMax}). Pecah menjadi dua atau ringkas.`);

      // O / B: kutipan langsung
      const q = s.match(/[“"]([^”"]{20,}?)[”"]/);
      if (q && countWords(q[1]) >= 6) {
        const near = cits.length ? cits : (sents[si + 1] ? findCitations(sents[si + 1]).filter(c => c.idx < 3) : []);
        if (!near.length) add("O", p, si, s, "Kutipan langsung tanpa sitasi. Tambahkan penulis, tahun, dan halaman.");
        else if (!near.some(c => c.page)) add("B", p, si, s, "Kutipan langsung perlu nomor halaman (hlm.) pada sitasinya.");
      }
      // B: sitasi tidak jelas
      for (const c of cits) {
        if (c.noYear) add("B", p, si, s, `Sitasi "${c.raw}" tidak mencantumkan tahun.`);
        else if (hasBib && !bibKeys.has(c.surname + c.year)) add("B", p, si, s, `Sitasi "${c.raw}" tidak ditemukan di daftar pustaka. Periksa nama dan tahun.`);
      }
      if (/\b(menurut para ahli|menurut beberapa ahli|beberapa ahli mengatakan|para ahli berpendapat)\b/i.test(s) && !cits.length)
        add("B", p, si, s, "Atribusi tidak jelas ('para ahli'). Sebut nama dan tahunnya.");

      // K: klaim tanpa dukungan
      if (CLAIM.test(s) && !cits.length && !q)
        add("K", p, si, s, "Klaim atau angka tanpa sumber. Tambahkan sitasi yang mendukung.");

      // M: kalimat berulang dalam dokumen
      if (w >= 10) {
        const k = norm1(s);
        if (seen.has(k)) add("M", p, si, s, `Kalimat yang sama sudah muncul di paragraf ${seen.get(k) + 1}. Tulis ulang atau hapus.`);
        else seen.set(k, p.idx);
      }
    });

    // H: paragraf pendek kurang berkembang
    if (sents.length <= 2 && pWords < 35 && !/[:;]$/.test(p.text.trim()))
      add("H", p, sents.length - 1, sents[sents.length - 1], `Paragraf hanya ${sents.length} kalimat (${pWords} kata). Kembangkan dengan penjelasan, contoh, atau analisis.`);

    // P: paragraf generik
    if (sents.length >= 3) {
      const low = norm1(p.text);
      const hits = GENERIC.filter(g => low.includes(g));
      const noSpecific = !pCited && !/\d/.test(p.text);
      if (hits.length >= 2 || (hits.length >= 1 && noSpecific))
        add("P", p, 0, sents[0], `Paragraf terkesan umum ("${hits[0]}"${hits[1] ? `, "${hits[1]}"` : ""}). Tambahkan analisis spesifik: contoh, data, atau sumber.`);
    }

    // A: transisi / awalan berulang
    if (sents.length >= 4) {
      const cnt = new Map();
      sents.forEach((s, si) => {
        const low = norm1(s);
        for (const t of TRANS) if (low.startsWith(t + " ")) cnt.set(t, (cnt.get(t) || []).concat(si));
      });
      for (const [t, idxs] of cnt) if (idxs.length >= 3 && t !== "pertama" && t !== "kedua" && t !== "ketiga")
        add("A", p, idxs[2], sents[idxs[2]], `Transisi "${t}" dipakai ${idxs.length} kali di satu paragraf. Variasikan.`);
      let run = 1;
      for (let i = 1; i < sents.length; i++) {
        run = firstWords(sents[i], 2) && firstWords(sents[i], 2) === firstWords(sents[i - 1], 2) ? run + 1 : 1;
        if (run === 3) add("A", p, i, sents[i], `Tiga kalimat berturut-turut diawali "${firstWords(sents[i], 2)}". Variasikan awalan kalimat.`);
      }
    }
  }

  // B: pustaka yang tidak pernah disitasi di teks
  if (hasBib) {
    const { entries } = parseBibliography(paras, bibAt);
    for (const e of entries) if (e.surname && !cited.has(e.surname + e.year)) {
      const p = paras[e.idx];
      add("B", p, 0, p.text.trim(), "Pustaka ini tidak disitasi di isi dokumen. Sitasi atau hapus dari daftar.");
    }
  }

  // urutkan menurut posisi, beri nomor, tentukan kode utama per kalimat
  out.sort((a, b) => a.para_idx - b.para_idx || a.sent_idx - b.sent_idx || PRIORITY.indexOf(a.code) - PRIORITY.indexOf(b.code));
  out.forEach((f, i) => { f.seq = i + 1; });
  const primary = new Map();
  for (const f of out) { const k = f.para_idx + ":" + f.sent_idx; if (!primary.has(k)) primary.set(k, f.code); }
  out.forEach(f => { f.primary = primary.get(f.para_idx + ":" + f.sent_idx) === f.code; });
  return out;
}

function countByCode(findings) {
  const by = Object.fromEntries(Object.keys(CODES).map(k => [k, 0]));
  for (const f of findings) by[f.code]++;
  return { total: findings.length, byCode: by };
}

function saveFindings(db, orderId, findings, now = Date.now()) {
  const ins = db.prepare("INSERT INTO findings(order_id,seq,code,para_idx,sent_idx,text,reason,created_at) VALUES(?,?,?,?,?,?,?,?)");
  db.transaction(() => {
    db.prepare("DELETE FROM findings WHERE order_id=?").run(orderId);
    for (const f of findings) ins.run(orderId, f.seq, f.code, f.para_idx, f.sent_idx, f.text, f.reason, now);
  })();
}

module.exports = { analyzeFindings, countByCode, saveFindings, findCitations, CODES, PRIORITY };
