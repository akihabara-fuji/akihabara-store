/* Pratinjau berwarna dengan penyamaran DI SERVER.
   Aturan: teks asli kalimat terkunci TIDAK PERNAH dikirim. Yang terkunci diganti karakter acak (deterministik) dengan
   panjang total sama tetapi batas kata diacak. Alasan spesifik tiap catatan juga tidak dikirim saat terkunci,
   karena alasan memuat potongan teks asli. Yang terlihat saat terkunci: posisi, kode, warna, dan aksi umum.
   Kalimat terbuka (default 1 kalimat pertama dokumen) ditampilkan penuh sebagai contoh. */
"use strict";
const crypto = require("crypto");
const { splitSentences, countWords } = require("./docx");
const { CODES, PRIORITY } = require("./rules");

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

  // Kalimat terbuka: N kalimat BERCATATAN pertama di dokumen (contoh yang berguna). Bila tidak ada catatan, N kalimat pertama.
  // Dihitung dari seluruh dokumen, bukan per halaman, supaya paginasi tidak membuka kalimat tambahan.
  const openKeys = new Set();
  if (open > 0 && open !== Infinity) {
    const flagged = [...new Set(findings.map(f => f.para_idx + ":" + f.sent_idx))];
    const order = (a, b) => { const [pa, sa] = a.split(":").map(Number), [pb, sb] = b.split(":").map(Number); return pa - pb || sa - sb; };
    flagged.sort(order).slice(0, open).forEach(k => openKeys.add(k));
    if (!openKeys.size) for (const p of visible) { for (let i = 0; i < splitSentences(p.text).length && openKeys.size < open; i++) openKeys.add(p.idx + ":" + i); if (openKeys.size >= open) break; }
  }
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
      if (isOpen && fs.length) seg.reasons = fs.map(f => ({ code: f.code, reason: f.reason }));
      return seg;
    });
    if (inPage) outParas.push({ idx: p.idx, kind: p.inTable ? "tabel" : /heading|title|judul/i.test(p.style) ? "judul" : "isi", segments: segs.filter(Boolean) });
  });

  const counts = Object.fromEntries(Object.keys(CODES).map(k => [k, 0]));
  for (const f of findings) counts[f.code]++;
  return {
    locked: !unlocked,
    page, pages, pageSize,
    totalParagraphs: visible.length,
    notes: { total: findings.length, byCode: counts },
    legend: Object.fromEntries(Object.entries(CODES).map(([k, v]) => [k, { color: v.color, action: v.action, target: v.target }])),
    paragraphs: outParas,
  };
}

module.exports = { buildPreview, maskText };
