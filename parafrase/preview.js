/* Pratinjau berwarna dengan penyamaran DI SERVER.
   Aturan: teks asli kalimat terkunci TIDAK PERNAH dikirim. Yang terkunci diganti karakter acak (deterministik) dengan
   panjang total sama tetapi batas kata diacak. Alasan spesifik tiap catatan juga tidak dikirim saat terkunci,
   karena alasan memuat potongan teks asli. Yang terlihat saat terkunci: posisi, kode, warna, dan aksi umum.
   Kalimat terbuka (default 1 kalimat pertama dokumen) ditampilkan penuh sebagai contoh. */
"use strict";
const crypto = require("crypto");
const { splitSentences, countWords } = require("./docx");
const { CODES, PRIORITY, helperFor } = require("./rules");
const { computeAspects } = require("./aspek");

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
  const open = unlocked ? Infinity : Math.max(0, opts.openSentences ?? 1);
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
  const nOf = new Map([...openKeys].filter(k => byKey.has(k)).sort(order).map((k, i) => [k, i + 1]));
  const examples = [];
  const outParas = [];
  visible.forEach((p, vi) => {
    const sents = splitSentences(p.text);
    const inPage = vi >= (page - 1) * pageSize && vi < page * pageSize;
    const segs = sents.map((s, si) => {
      const isOpen = unlocked || openKeys.has(p.idx + ":" + si);
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
    if (inPage) outParas.push({ idx: p.idx, kind: p.inTable ? "tabel" : /heading|title|judul/i.test(p.style) ? "judul" : "isi", segments: segs.filter(Boolean) });
  });

  if (!unlocked) {
    for (const p of visible) splitSentences(p.text).forEach((sent, si) => {
      const k = p.idx + ":" + si, n = nOf.get(k); if (!n) return;
      const fs = byKey.get(k).slice().sort((x, y) => PRIORITY.indexOf(x.code) - PRIORITY.indexOf(y.code)), c = fs[0].code;
      examples.push({ n, code: c, color: CODES[c].color, action: CODES[c].action, target: CODES[c].target, text: sent,
        reasons: fs.map(f => ({ code: f.code, reason: f.reason, helper: helperFor(f.code, sent, f.reason) })) });
    });
    examples.sort((a, b) => a.n - b.n);
  }
  const bibAt = a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex;
  const overview = computeAspects(a.paragraphs, bibAt, findings);
  const counts = Object.fromEntries(Object.keys(CODES).map(k => [k, 0]));
  for (const f of findings) counts[f.code]++;
  return {
    locked: !unlocked,
    page, pages, pageSize,
    totalParagraphs: visible.length,
    notes: { total: findings.length, byCode: counts },
    legend: Object.fromEntries(Object.entries(CODES).map(([k, v]) => [k, { color: v.color, action: v.action, target: v.target }])),
    paragraphs: outParas,
    examples,
    overview,
  };
}

module.exports = { buildPreview, maskText };
