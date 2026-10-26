/* Aturan Audit Dokumen (Audit Ringkas). Semua temuan hanya dari isi dokumen dan pengecekan DOI nyata:
   tidak ada AI, tidak ada tebakan. Yang tidak bisa dicek ditandai tidak terverifikasi, tidak dikarang. */
"use strict";
const { checkStandar, STANDAR_AUDIT } = require("./standar");
const rules = require("./rules");
const { computeAspects } = require("./aspek");

const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const WORD = "[A-ZÀ-ɏ][\\p{L}'’-]+";
const YEAR = "(?:19|20)\\d{2}[a-z]?";
const DOI_RE = /10\.\d{4,9}\/[^\s"<>]+/i;
const cleanDoi = d => d.replace(/[.,;)\]]+$/, "");

/* Kunci sitasi: nama belakang pertama + tahun. */
function citeKey(name, year) { return fold(name).replace(/[^a-z]/g, "") + "|" + String(year).toLowerCase(); }
function firstSurname(seg) {
  const m = seg.trim().match(new RegExp("^(?:\\(|lihat |see |cf\\. |misalnya )?(" + WORD + ")", "u"));
  return m ? m[1] : null;
}

/* Sitasi di isi: (Nama, 2020; Nama & Nama, 2019) dan Nama (2020). */
function extractCitations(paragraphs) {
  const out = [];
  const paren = new RegExp("\\(([^()]*?" + YEAR + "[^()]*)\\)", "g");
  const narr = new RegExp("(" + WORD + ")(?:\\s+(?:dan|&|and)\\s+" + WORD + "|\\s+et al\\.?)?\\s+\\((" + YEAR + ")\\)", "gu");
  for (const p of paragraphs) {
    const t = p.text || "";
    let m;
    paren.lastIndex = 0;
    while ((m = paren.exec(t))) {
      for (const seg of m[1].split(";")) {
        const y = seg.match(new RegExp("(" + YEAR + ")\\s*[,;]?\\s*(?:hlm|p|pp)?\\.?\\s*[\\d\\-]*\\s*$")) || seg.match(new RegExp("(" + YEAR + ")"));
        const n = firstSurname(seg);
        if (y && n) out.push({ key: citeKey(n, y[1]), name: n, year: y[1], idx: p.idx });
      }
    }
    narr.lastIndex = 0;
    while ((m = narr.exec(t))) out.push({ key: citeKey(m[1], m[2]), name: m[1], year: m[2], idx: p.idx });
  }
  return out;
}

/* Entri daftar pustaka: nama belakang pertama + tahun pertama. */
function extractBibliography(paragraphs, bibIdx) {
  if (bibIdx == null || bibIdx < 0) return [];
  const rows = [];
  for (const p of paragraphs) {
    if (p.idx <= bibIdx) continue;
    const t = (p.text || "").trim();
    if (t.length < 25) continue;
    const name = (t.match(new RegExp("^(" + WORD + ")", "u")) || [])[1];
    const y = t.match(new RegExp("\\((" + YEAR + ")\\)")) || t.match(new RegExp("\\b(" + YEAR + ")\\b"));
    const doi = (t.match(DOI_RE) || [])[0];
    rows.push({ idx: p.idx, n: rows.length + 1, text: t, name: name || null, year: y ? y[1] : null, key: name && y ? citeKey(name, y[1]) : null, doi: doi ? cleanDoi(doi) : null, hasUrl: /https?:\/\//i.test(t), journalLike: /\b\d{1,3}\s*\(\d{1,3}\)\s*[,:]/.test(t) });
  }
  return rows;
}

/* Pengecek DOI nyata lewat Crossref. fetchFn dapat diganti saat tes. */
async function checkDois(dois, fetchFn, { max = 25, timeoutMs = 6000, concurrency = 5 } = {}) {
  const res = new Map();
  const list = [...new Set(dois)].slice(0, max);
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const d = list[i++];
      if (typeof fetchFn !== "function") { res.set(d, "unknown"); continue; }
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), timeoutMs);
      try {
        const r = await fetchFn("https://api.crossref.org/works/" + encodeURIComponent(d), { method: "GET", signal: ac.signal, headers: { "User-Agent": "nextaja-audit/1.0 (mailto:admin@nextaja.com)" } });
        res.set(d, r.status === 200 ? "ok" : r.status === 404 ? "notfound" : "unknown");
      } catch { res.set(d, "unknown"); } finally { clearTimeout(to); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  for (const d of dois) if (!res.has(d)) res.set(d, "unknown");
  return res;
}

/* Skor Kesiapan: murni hitungan dari temuan di atas, tanpa AI dan tanpa database luar.
   BUKAN skor DrillBit dan BUKAN skor UT: kemiripan dengan sumber luar hanya bisa dinilai DrillBit resmi. */
const pct = (a, b) => b > 0 ? Math.round(a * 100 / b) : null;
function buildScore(body, counts, refs, M) {
  const sents = [], seen = new Map();
  const { splitSentences } = require("./docx");
  for (const p of body) for (const t of splitSentences(p.text || "")) {
    const k = fold(t).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    if (k.split(" ").length >= 8) sents.push(k);
  }
  let dup = 0; for (const k of sents) { if (seen.has(k)) dup++; else seen.set(k, 1); }
  const checked = refs.doiOk + refs.doiNotFound;
  const metrics = [
    { key: "sitasi", label: "Sitasi punya pasangan di daftar pustaka", value: pct(M.citeMatched, M.citeTotal), good: "tinggi" },
    { key: "pustaka", label: "Pustaka yang dikutip di isi", value: pct(M.bibCited, M.bibWithKey), good: "tinggi" },
    { key: "doi", label: "DOI terdaftar di Crossref", value: pct(refs.doiOk, checked), good: "tinggi" },
    { key: "berulang", label: "Kalimat berulang di dalam dokumen", value: sents.length ? Math.round(dup * 1000 / sents.length) / 10 : null, good: "rendah" },
  ];
  const dupPct = metrics[3].value || 0;
  const penalty = Math.min(60, counts.kritis * 8) + Math.min(25, counts.peringatan * 3) + Math.min(10, counts.info) + Math.min(15, Math.round(dupPct / 2));
  let value = Math.max(0, 100 - penalty);
  if (counts.kritis > 0) value = Math.min(value, 84); // ada temuan kritis: tidak boleh berlabel "siap"
  const level = value >= 85 ? "siap" : value >= 70 ? "hampir" : value >= 50 ? "perlu" : "banyak";
  const label = { siap: "Siap dikumpulkan", hampir: "Hampir siap", perlu: "Perlu perbaikan", banyak: "Banyak yang harus dibenahi" }[level];
  return { value, level, label, metrics, note: "Skor internal Catatan Akademik dari temuan di dokumenmu. Bukan skor DrillBit atau UT: kemiripan dengan sumber luar hanya bisa dinilai DrillBit resmi." };
}

/* Struktur dari judul sampai penutup. Hanya yang pasti terbaca dari dokumen: judul, bagian pembuka, bagian isi, dan penutup.
   Mengembalikan [{sev, cat, where, detail}]. Bagian dicari dari baris pendek yang menyerupai judul bagian (Bab, angka, atau huruf kapital). */
const SEC = {
  pembuka: /^(?:bab\s+[ivx\d]+\s*[.:-]?\s*)?(?:[\dA-Z][.)]?\s*)?(pendahuluan|latar\s+belakang|introduction|abstrak|abstract)\b/i,
  metode: /^(?:bab\s+[ivx\d]+\s*[.:-]?\s*)?(?:[\dA-Z][.)]?\s*)?(metode|metodologi|metode\s+penelitian|method|methods)\b/i,
  isi: /^(?:bab\s+[ivx\d]+\s*[.:-]?\s*)?(?:[\dA-Z][.)]?\s*)?(pembahasan|hasil|hasil\s+dan\s+pembahasan|analisis|tinjauan\s+pustaka|telaah\s+pustaka|kajian\s+pustaka|landasan\s+teori|results?|discussion)\b/i,
  penutup: /^(?:bab\s+[ivx\d]+\s*[.:-]?\s*)?(?:[\dA-Z][.)]?\s*)?(kesimpulan|simpulan|penutup|saran|kesimpulan\s+dan\s+saran|conclusions?)\b/i,
};
function checkStruktur(a) {
  const out = [], paras = (a.paragraphs || []).filter(p => p.text.trim());
  const heads = paras.filter(p => p.text.trim().split(/\s+/).length <= 12 && p.text.length <= 100);
  const has = k => heads.some(p => SEC[k].test(p.text.trim()));
  const title = String(a.title || "").trim(), tw = title ? title.split(/\s+/).length : 0;
  const tp = title && paras.find(p => p.text.trim() === title);
  const tWhere = tp ? "Paragraf " + (tp.idx + 1) : "Awal dokumen";
  if (!title) out.push({ sev: "peringatan", cat: "Judul tidak terbaca", where: "Awal dokumen", detail: "Judul dokumen tidak terdeteksi. Tulis judul di baris paling atas, terpisah dari isi, atau beri gaya Judul (Title)." });
  else if (tw > 20) out.push({ sev: "info", cat: "Judul terlalu panjang", where: tWhere, detail: `Judul terbaca ${tw} kata. Judul yang baik ringkas (umumnya sampai 15 sampai 20 kata) dan memuat variabel atau topik utama.` });
  else if (tw < 4) out.push({ sev: "info", cat: "Judul terlalu pendek", where: tWhere, detail: `Judul terbaca ${tw} kata. Tambahkan topik, objek, atau konteks agar judul spesifik.` });
  const type = a.docType || "umum", long = (a.wordsAll || 0) >= 600;
  if (long && !has("pembuka")) out.push({ sev: "peringatan", cat: "Bagian pembuka tidak ditemukan", where: "Seluruh dokumen", detail: "Tidak ada bagian berjudul Pendahuluan atau Latar Belakang. Dokumen panjang sebaiknya dibuka dengan konteks dan tujuan." });
  if (long && (type === "metopen" || type === "artikel") && !has("metode")) out.push({ sev: "peringatan", cat: "Bagian metode tidak ditemukan", where: "Seluruh dokumen", detail: "Tidak ada bagian berjudul Metode atau Metode Penelitian." });
  if (long && !has("isi")) out.push({ sev: "info", cat: "Bagian isi utama tidak ditemukan", where: "Seluruh dokumen", detail: "Tidak ada bagian berjudul Pembahasan, Hasil, Tinjauan Pustaka, atau sejenisnya. Pastikan isi utama diberi judul bagian." });
  if (long && !has("penutup")) out.push({ sev: "peringatan", cat: "Bagian penutup tidak ditemukan", where: "Seluruh dokumen", detail: "Tidak ada bagian berjudul Kesimpulan, Simpulan, atau Penutup. Dokumen perlu ditutup dengan kesimpulan yang menjawab tujuan." });
  return out;
}

/* cfg = pengaturan admin (settings.getAll()). Diteruskan ke analisis supaya ambang (kalimat panjang, tingkat indikasi) SAMA dengan Cek & Parafrase. */
async function runAudit(a, { fetchFn, cfg = {} } = {}) {
  const paras = a.paragraphs || [];
  const bibIdx = a.bibliographyParagraphIndex;
  const body = paras.filter(p => bibIdx == null || bibIdx < 0 || p.idx < bibIdx);
  const bib = extractBibliography(paras, bibIdx);
  const cites = extractCitations(body);
  const F = [];
  const add = (sev, cat, where, detail) => F.push({ sev, cat, where, detail });
  const M = { citeTotal: 0, citeMatched: 0, bibWithKey: 0, bibCited: 0 };

  if (!bib.length) {
    add("kritis", "Daftar pustaka tidak ditemukan", "Akhir dokumen", "Judul Daftar Pustaka atau Referensi tidak terbaca, atau isinya kosong.");
  } else {
    const bibKeys = new Set(bib.map(b => b.key).filter(Boolean));
    const bibByName = new Map();
    for (const b of bib) if (b.name) { const k = fold(b.name).replace(/[^a-z]/g, ""); (bibByName.get(k) || bibByName.set(k, []).get(k)).push(b); }
    const seen = new Set(), citedKeys = new Set(), citedNames = new Set();
    M.citeTotal = new Set(cites.map(c => c.key)).size; M.citeMatched = new Set(cites.filter(c => bibKeys.has(c.key)).map(c => c.key)).size;
    for (const c of cites) {
      citedNames.add(c.key.split("|")[0]);
      if (bibKeys.has(c.key)) { citedKeys.add(c.key); continue; }
      if (seen.has(c.key)) continue; seen.add(c.key);
      const same = bibByName.get(c.key.split("|")[0]);
      if (same) add("peringatan", "Tahun sitasi berbeda dengan daftar pustaka", "Paragraf " + (c.idx + 1), `Sitasi ${c.name} (${c.year}), di pustaka tertulis tahun ${same.map(s => s.year || "tanpa tahun").join(" / ")}.`);
      else add("kritis", "Sitasi tidak ada di daftar pustaka", "Paragraf " + (c.idx + 1), `Sitasi ${c.name} (${c.year}) tidak punya pasangan di daftar pustaka.`);
    }
    M.bibWithKey = bib.filter(b => b.key).length; M.bibCited = bib.filter(b => b.key && (citedKeys.has(b.key) || citedNames.has(b.key.split("|")[0]))).length;
    for (const b of bib) {
      if (b.key && !citedKeys.has(b.key) && !citedNames.has(b.key.split("|")[0])) add("peringatan", "Pustaka tidak dikutip di teks", "Pustaka no. " + b.n, `Entri "${b.text.slice(0, 80)}" tidak muncul sebagai sitasi di isi.`);
      if (!b.year) add("peringatan", "Pustaka tanpa tahun", "Pustaka no. " + b.n, `Entri "${b.text.slice(0, 80)}" tidak memuat tahun terbit.`);
    }
    const names = bib.map(b => fold(b.text).replace(/[^a-z]/g, "")).filter(Boolean);
    if (names.some((n, i) => i && names[i - 1] > n)) add("info", "Daftar pustaka belum urut abjad", "Daftar pustaka", "APA 7 mengurutkan entri berdasarkan abjad nama belakang.");
    const noDoi = bib.filter(b => b.journalLike && !b.doi && !b.hasUrl);
    if (noDoi.length) add("info", `${noDoi.length} pustaka jurnal tanpa DOI atau tautan`, "Pustaka no. " + noDoi.map(b => b.n).slice(0, 8).join(", "), "Tambahkan DOI agar mudah diverifikasi.");
    if (bib.length < 10) add("info", "Jumlah pustaka kurang dari 10", "Daftar pustaka", `Hanya ${bib.length} entri terbaca. Metopen UT umumnya minimal 10 referensi.`);
    const yrs = bib.map(b => parseInt(b.year, 10)).filter(Boolean), nowY = new Date().getFullYear();
    const old = yrs.filter(y => nowY - y > 10).length;
    if (yrs.length >= 5 && old / yrs.length > 0.5) add("info", "Banyak pustaka berusia lebih dari 10 tahun", "Daftar pustaka", `${old} dari ${yrs.length} pustaka bertahun lebih dari 10 tahun lalu. Standar Bab 4: utamakan artikel 5 sampai 7 tahun terakhir.`);

    const withDoi = bib.filter(b => b.doi);
    const doiRes = await checkDois(withDoi.map(b => b.doi), fetchFn);
    let ok = 0, nf = 0, un = 0;
    for (const b of withDoi) {
      const s = doiRes.get(b.doi);
      if (s === "ok") ok++; else if (s === "notfound") { nf++; add("kritis", "DOI tidak ditemukan", "Pustaka no. " + b.n, `DOI ${b.doi} tidak terdaftar di Crossref.`); } else un++;
    }
    if (un) add("info", `${un} DOI belum bisa diverifikasi`, "Daftar pustaka", "TIDAK TERVERIFIKASI: layanan pengecekan tidak menjawab, bukan berarti DOI salah.");
    var refs = { total: bib.length, withDoi: withDoi.length, doiOk: ok, doiNotFound: nf, doiUnverified: un };
  }
  for (const f of checkStruktur(a)) add(f.sev, f.cat, f.where, f.detail);
  // Standar Bab 4 dan 5: aturan yang SAMA dengan Cek Parafrase (standar.js)
  const hh = { splitSentences: require("./docx").splitSentences, countWords: require("./docx").countWords, findCitations: rules.findCitations, hasCitation: rules.hasCitation, isBody: rules.isBody };
  /* temuan standar per kalimat sekarang masuk lewat docFindings (daftar lengkap di bawah), supaya tidak ganda */
  // Aspek seluruh dokumen dalam persen: memakai temuan yang sama dengan Cek & Parafrase, plus indikasi gaya tulisan seragam.
  const bodyAt = bibIdx == null || bibIdx < 0 ? null : bibIdx;
  const docFindings = rules.analyzeFindings(paras, bodyAt, cfg);
  const asp = computeAspects(paras, bodyAt, docFindings, cfg);
  if (asp.ai.value != null && asp.ai.level === "tinggi") add("peringatan", "Indikasi gaya tulisan seragam atau otomatis tinggi", "Seluruh dokumen", `Tingkat ${asp.ai.level} dari pola tulisan (frasa klise, panjang kalimat seragam, penghubung dan awalan berulang). Ini heuristik, bukan skor Drillbit. Lihat kalimat bertanda abu-abu dan merah muda di Cek & Parafrase.`);
  else if (asp.ai.value != null && asp.ai.level === "sedang") add("info", "Indikasi gaya tulisan seragam atau otomatis sedang", "Seluruh dokumen", `Tingkat ${asp.ai.level} dari pola tulisan. Variasikan awalan dan penghubung kalimat, dan ganti frasa umum dengan analisis yang spesifik.`);
  /* Daftar LENGKAP: temuan tingkat dokumen/pustaka (F) + semua temuan per kalimat dan paragraf (sama dengan Cek & Parafrase). */
  const CODE_SEV = { O: "kritis", M: "peringatan", K: "peringatan", B: "peringatan", U: "info", H: "info", P: "peringatan", A: "info" };
  const CODE_CAT = { M: "Kalimat yang sama muncul lebih dari sekali", O: "Kutipan langsung tanpa sitasi", K: "Klaim atau angka tanpa sumber", B: "Sitasi bermasalah", U: "Kalimat terlalu panjang", H: "Paragraf pendek dan kurang berkembang", P: "Paragraf umum tanpa analisis spesifik", A: "Pola tulisan seragam" };
  const bodyIdx = new Set(body.map(p => p.idx));
  for (const f of docFindings) {
    if (!bodyIdx.has(f.para_idx)) continue; // temuan pustaka sudah ada di daftar tingkat dokumen
    const st = f.rule && STANDAR_AUDIT[f.rule];
    F.push({ sev: st ? st.sev : CODE_SEV[f.code], cat: st ? st.cat : CODE_CAT[f.code], where: `Paragraf ${f.para_idx + 1}, kalimat ${f.sent_idx + 1}`, detail: f.reason, quote: String(f.text || "").replace(/\s+/g, " ").trim().slice(0, 220), code: f.code, pos: f.para_idx * 1000 + f.sent_idx });
  }
  const order = { kritis: 0, peringatan: 1, info: 2 };
  F.sort((x, y) => order[x.sev] - order[y.sev] || (x.pos == null ? -1 : x.pos) - (y.pos == null ? -1 : y.pos));
  const count = s => F.filter(f => f.sev === s).length;
  const counts = { kritis: count("kritis"), peringatan: count("peringatan"), info: count("info") };
  const refsOut = refs || { total: 0, withDoi: 0, doiOk: 0, doiNotFound: 0, doiUnverified: 0 };
  // docFindings (temuan Cek & Parafrase) hanya untuk triage di server: jangan disertakan ke respons publik (berisi teks kalimat).
  return { findings: F, counts, refs: refsOut, citations: cites.length, score: { ...buildScore(body, counts, refsOut, M), aspects: asp.aspects, ai: asp.ai, problem: asp.problem }, docFindings, bodyAt };
}

module.exports = { checkStruktur, runAudit, extractCitations, extractBibliography, checkDois };
