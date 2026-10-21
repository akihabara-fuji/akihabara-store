/* Aturan Audit Dokumen (Audit Ringkas). Semua temuan hanya dari isi dokumen dan pengecekan DOI nyata:
   tidak ada AI, tidak ada tebakan. Yang tidak bisa dicek ditandai tidak terverifikasi, tidak dikarang. */
"use strict";

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

async function runAudit(a, { fetchFn } = {}) {
  const paras = a.paragraphs || [];
  const bibIdx = a.bibliographyParagraphIndex;
  const body = paras.filter(p => bibIdx == null || bibIdx < 0 || p.idx < bibIdx);
  const bib = extractBibliography(paras, bibIdx);
  const cites = extractCitations(body);
  const F = [];
  const add = (sev, cat, where, detail) => F.push({ sev, cat, where, detail });

  if (!bib.length) {
    add("kritis", "Daftar pustaka tidak ditemukan", "Akhir dokumen", "Judul Daftar Pustaka atau Referensi tidak terbaca, atau isinya kosong.");
  } else {
    const bibKeys = new Set(bib.map(b => b.key).filter(Boolean));
    const bibByName = new Map();
    for (const b of bib) if (b.name) { const k = fold(b.name).replace(/[^a-z]/g, ""); (bibByName.get(k) || bibByName.set(k, []).get(k)).push(b); }
    const seen = new Set(), citedKeys = new Set(), citedNames = new Set();
    for (const c of cites) {
      citedNames.add(c.key.split("|")[0]);
      if (bibKeys.has(c.key)) { citedKeys.add(c.key); continue; }
      if (seen.has(c.key)) continue; seen.add(c.key);
      const same = bibByName.get(c.key.split("|")[0]);
      if (same) add("peringatan", "Tahun sitasi berbeda dengan daftar pustaka", "Paragraf " + (c.idx + 1), `Sitasi ${c.name} (${c.year}), di pustaka tertulis tahun ${same.map(s => s.year || "tanpa tahun").join(" / ")}.`);
      else add("kritis", "Sitasi tidak ada di daftar pustaka", "Paragraf " + (c.idx + 1), `Sitasi ${c.name} (${c.year}) tidak punya pasangan di daftar pustaka.`);
    }
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
    if (yrs.length >= 5 && old / yrs.length > 0.5) add("info", "Banyak pustaka berusia lebih dari 10 tahun", "Daftar pustaka", `${old} dari ${yrs.length} pustaka bertahun lebih dari 10 tahun lalu.`);

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
  const order = { kritis: 0, peringatan: 1, info: 2 };
  F.sort((x, y) => order[x.sev] - order[y.sev]);
  const count = s => F.filter(f => f.sev === s).length;
  return { findings: F, counts: { kritis: count("kritis"), peringatan: count("peringatan"), info: count("info") }, refs: refs || { total: 0, withDoi: 0, doiOk: 0, doiNotFound: 0, doiUnverified: 0 }, citations: cites.length };
}

module.exports = { runAudit, extractCitations, extractBibliography, checkDois };
