/* Pratinjau berwarna dengan penyamaran DI SERVER.
   Aturan: teks asli kalimat terkunci TIDAK PERNAH dikirim. Yang terkunci diganti karakter acak (deterministik) dengan
   panjang total sama tetapi batas kata diacak. Alasan spesifik tiap catatan juga tidak dikirim saat terkunci,
   karena alasan memuat potongan teks asli. Yang terlihat saat terkunci: posisi, kode, warna, dan aksi umum.
   Kalimat terbuka (default 1 kalimat pertama dokumen) ditampilkan penuh sebagai contoh. */
"use strict";
const crypto = require("crypto");
const { splitSentences, countWords } = require("./docx");
const { CODES, PRIORITY, helperFor, rewriteFor } = require("./rules");
const { computeAspects } = require("./aspek");
const { buildTriageBase, withDrillbit } = require("./triage");

function prng(bytes) {
  let s = (bytes.readUInt32LE(0) || 0x9e3779b9) >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const ALPHA = "abcdefghijklmnoprstuwy";
function maskText(len, seedBytes) {
  const r = prng(seedBytes);
  let out = "";
  while (out.length < len) {
    const w = 2 + Math.floor(r() * 8);
    let word = ""; for (let i = 0; i < w; i++) word += ALPHA[Math.floor(r() * ALPHA.length)];
    out += (out ? " " : "") + word;
  }
  out = out.slice(0, len).trimEnd();
  while (out.length < len) out += "x";
  if (len < 2) return "x";
  let body = (out.charAt(0).toUpperCase() + out.slice(1, len - 1)).replace(/ $/, "x");
  return body + ".";
}

/* a: hasil analyze() (paragraphs), findings: hasil analyzeFindings(), secret: rahasia server (string), id: pengenal unggahan/pesanan.
   opts: { unlocked, openSentences, page, pageSize } */
function buildPreview(a, findings, secret, id, opts = {}) {
  const unlocked = !!opts.unlocked;
  const wordMode = !unlocked && Number.isInteger(opts.openWords) && opts.openWords > 0;
  const paraMode = !unlocked && !wordMode && Number.isInteger(opts.openParagraphs);
  const open = unlocked ? Infinity : (paraMode || wordMode) ? 0 : Math.max(0, opts.openSentences ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize || 30));
  const byKey = new Map();
  for (const f of findings) { const k = f.para_idx + ":" + f.sent_idx; (byKey.get(k) || byKey.set(k, []).get(k)).push(f); }

  const visible = a.paragraphs.filter(p => p.text.trim());
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(pages, Math.max(1, opts.page | 0 || 1));

  // Kalimat contoh: N kalimat bercatatan yang BERAGAM jenisnya. Yang pertama adalah catatan paling awal di dokumen,
  // berikutnya bergantian antar kode warna (belum terpakai dulu), lalu hasilnya diurutkan sesuai posisi di dokumen.
  // Dihitung dari seluruh dokumen, bukan per halaman, supaya paginasi tidak membuka kalimat tambahan.
  const openKeys = new Set(), order = (a, b) => { const [pa, sa] = a.split(":").map(Number), [pb, sb] = b.split(":").map(Number); return pa - pb || sa - sb; };
  if (open > 0 && open !== Infinity) {
    const primaryOf = k => byKey.get(k).slice().sort((x, y) => PRIORITY.indexOf(x.code) - PRIORITY.indexOf(y.code))[0].code;
    const flagged = [...byKey.keys()].sort(order), pick = [];
    if (flagged.length) pick.push(flagged[0]);
    const used = new Set(pick.map(primaryOf));
    while (pick.length < open && pick.length < flagged.length) {
      const rest = flagged.filter(k => !pick.includes(k));
      const fresh = rest.find(k => !used.has(primaryOf(k)));
      const next = fresh || rest[0]; pick.push(next); used.add(primaryOf(next));
    }
    pick.sort(order).forEach(k => openKeys.add(k));
    if (!openKeys.size) for (const p of visible) { for (let i = 0; i < splitSentences(p.text).length && openKeys.size < open; i++) openKeys.add(p.idx + ":" + i); if (openKeys.size >= open) break; }
  }
  /* Mode paragraf: buka SEMUA kalimat pada N paragraf contoh. Dipilih paragraf yang catatannya paling serius
     (urutan PRIORITY: M, O, K, B, U, H, P, A), seri diambil yang paling awal. Paragraf berkalimat 1 kurang bagus sebagai contoh,
     jadi bila ada pilihan lain dengan kode yang sama, yang berkalimat lebih banyak didahulukan. */
  /* Mode kata: buka kalimat dari awal dokumen sampai batas kata gratis (kalimat utuh, tidak melewati batas). */
  const wordOpen = new Set(); let openedWords = 0;
  if (wordMode) {
    scan: for (const p of visible) {
      const ss = splitSentences(p.text);
      for (let i = 0; i < ss.length; i++) {
        const n = countWords(ss[i]);
        if (openedWords + n > opts.openWords) break scan;
        openedWords += n; wordOpen.add(p.idx + ":" + i);
      }
    }
  }
  const exParas = new Set();
  if (paraMode && opts.openParagraphs > 0) {
    const cand = new Map();
    for (const f of findings) { const c = cand.get(f.para_idx) || { idx: f.para_idx, best: 99, n: 0 }; c.best = Math.min(c.best, PRIORITY.indexOf(f.code)); c.n++; cand.set(f.para_idx, c); }
    const nSent = new Map(visible.map(p => [p.idx, splitSentences(p.text).length]));
    [...cand.values()].sort((x, y) => x.best - y.best || ((nSent.get(y.idx) > 1) - (nSent.get(x.idx) > 1)) || x.idx - y.idx)
      .slice(0, opts.openParagraphs).forEach(c => exParas.add(c.idx));
  }
  const nOf = new Map([...(wordMode ? wordOpen : openKeys)].filter(k => byKey.has(k)).sort(order).map((k, i) => [k, i + 1]));
  const outParas = [];
  visible.forEach((p, vi) => {
    const sents = splitSentences(p.text);
    const inPage = vi >= (page - 1) * pageSize && vi < page * pageSize;
    const segs = sents.map((s, si) => {
      const isOpen = unlocked || openKeys.has(p.idx + ":" + si) || exParas.has(p.idx) || wordOpen.has(p.idx + ":" + si);
      if (!inPage) return null;
      const fs = (byKey.get(p.idx + ":" + si) || []).slice().sort((x, y) => PRIORITY.indexOf(x.code) - PRIORITY.indexOf(y.code));
      const primary = fs.length ? fs[0].code : null;
      const seg = {
        i: si,
        text: isOpen ? s : maskText(s.length, crypto.createHmac("sha256", secret).update(`${id}:${p.idx}:${si}`).digest()),
        locked: !isOpen,
        codes: fs.map(f => f.code),
        primary,
        color: primary ? CODES[primary].color : null,
        action: primary ? CODES[primary].action : null,
      };
      if (isOpen && fs.length) {
        seg.reasons = fs.map(f => ({ code: f.code, reason: f.reason, target: CODES[f.code].target, helper: helperFor(f.code, s, f.reason) }));
        if (!unlocked) seg.n = nOf.get(p.idx + ":" + si);
      }
      return seg;
    });
    if (inPage) outParas.push({ idx: p.idx, no: vi + 1, kind: p.inTable ? "tabel" : /heading|title|judul/i.test(p.style) ? "judul" : "isi", segments: segs.filter(Boolean) });
  });

  /* Satu paragraf contoh: rekomendasi (kode paling serius di paragraf), kalimat salah ditandai, dan contoh penulisan ulang bila bisa dibuat dari aturan. */
  let example = null;
  if (paraMode && exParas.size) {
    const p = visible.find(v => exParas.has(v.idx)), sents = splitSentences(p.text);
    const all = findings.filter(f => f.para_idx === p.idx).slice().sort((x, y) => PRIORITY.indexOf(x.code) - PRIORITY.indexOf(y.code));
    const top = all[0], topSent = sents[top.sent_idx] || "";
    const forTop = all.filter(f => f.sent_idx === top.sent_idx);
    example = {
      paraIdx: p.idx, code: top.code, color: CODES[top.code].color, action: CODES[top.code].action, target: CODES[top.code].target,
      reason: top.reason, helper: helperFor(top.code, topSent, top.reason), rewrite: rewriteFor(top.code, topSent),
      sentences: sents.map((s, si) => { const fs = all.filter(f => f.sent_idx === si); return { text: s, code: fs.length ? fs[0].code : null, flagged: fs.length > 0, rewrite: fs.length ? rewriteFor(fs[0].code, s) : null }; }),
      also: forTop.slice(1).map(f => ({ code: f.code, reason: f.reason, helper: helperFor(f.code, topSent, f.reason) })),
      remaining: Math.max(0, findings.length - all.length),
    };
  }
  const bibAt = a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex;
  const cfg = opts.cfg || {};
  const overview = computeAspects(a.paragraphs, bibAt, findings, cfg);
  // Urgensi + urutan paragraf + resep: mesin yang sama dengan Audit Dokumen. Hanya hitungan dan label umum (tanpa teks dokumen) selama terkunci.
  const triage = withDrillbit(buildTriageBase({ paras: a.paragraphs, bibAt, findings, cfg, withText: unlocked, aspects: overview }), null);
  const counts = Object.fromEntries(Object.keys(CODES).map(k => [k, 0]));
  for (const f of findings) counts[f.code]++;
  return {
    locked: !unlocked,
    freeWords: wordMode ? opts.openWords : 0, openedWords,
    page, pages, pageSize,
    totalParagraphs: visible.length,
    notes: { total: findings.length, byCode: counts },
    legend: Object.fromEntries(Object.entries(CODES).map(([k, v]) => [k, { color: v.color, action: v.action, target: v.target }])),
    paragraphs: outParas,
    example,
    overview,
    triage,
  };
}

module.exports = { buildPreview, maskText };
