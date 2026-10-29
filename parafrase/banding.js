/* Pembanding: kalimat yang ditandai UT di dokumen asli vs hasil parafrase.
   Murni fungsi (tanpa I/O) supaya mudah dites. Penilaian memakai pedoman yang sama dengan Bedah (utdiag.js).
   Ini bukan skor Drillbit dan bukan jaminan lolos; penilaian akhir tetap dari laporan UT yang baru. */
"use strict";
const utdiag = require("./utdiag");

const tok = s => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const grams = t => { const m = new Map(); for (let i = 0; i + 1 < t.length; i++) { const k = t[i] + " " + t[i + 1]; m.set(k, (m.get(k) || 0) + 1); } return m; };

/* Kemiripan kata (jaccard) dan urutan kata (dice atas pasangan kata berurutan). */
function similarity(a, b) {
  const ta = tok(a), tb = tok(b), A = new Set(ta), B = new Set(tb);
  if (!A.size || !B.size) return { j: 0, d: 0, score: 0 };
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  const j = inter / (A.size + B.size - inter);
  const ga = grams(ta), gb = grams(tb); let gi = 0, na = 0, nb = 0;
  for (const [k, v] of ga) { na += v; if (gb.has(k)) gi += Math.min(v, gb.get(k)); }
  for (const v of gb.values()) nb += v;
  const d = na + nb ? (2 * gi) / (na + nb) : 0;
  return { j, d, score: 0.5 * j + 0.5 * d };
}

/* Detail baru = angka atau nama (kata berhuruf besar di tengah kalimat) yang tidak ada di kalimat asal. */
function newDetail(orig, cand) {
  const o = new Set(tok(orig));
  const nums = (String(cand).match(/\d[\d.,]*/g) || []).filter(x => !o.has(x.toLowerCase()));
  const names = (String(cand).match(/(?<=\s)[A-Z][a-z]{2,}/g) || []).filter(x => !o.has(x.toLowerCase()));
  return nums.length + names.length;
}

const polaIds = tags => tags.filter(t => t.id !== "blok").map(t => t.id);
const tagView = t => ({ id: t.id, label: t.label, fix: t.fix, jangan: t.jangan, bukti: t.bukti });

const STOP = new Set("yang dengan dalam untuk adalah merupakan pada dari bagi serta dapat sebagai karena sehingga oleh atau juga akan telah dalam suatu sebuah tersebut ini itu para antara terhadap".split(" "));
const content = s => new Set(tok(s).filter(w => w.length > 3 && !STOP.has(w)));

/* Padanan cadangan untuk kalimat yang ditulis sangat berbeda: kalimat di posisi dokumen yang berdekatan dengan kata isi yang sama. */
function nearby(orig, pool, pos) {
  if (pos == null) return null;
  const O = content(orig); let best = null;
  for (const c of pool) {
    if (c.pos == null || Math.abs(c.pos - pos) > 0.08) continue;
    const C = content(c.text); let k = 0; for (const w of O) if (C.has(w)) k++;
    if (k >= 2 && (!best || k > best.k)) best = { c, k };
  }
  return best && best.c;
}

/* Nilai satu kalimat asal terhadap kandidat terbaik di dokumen baru. */
function judge(orig, pool, pos) {
  let best = null;
  for (const c of pool) { const s = similarity(orig, c.text); if (!best || s.score > best.s.score) best = { c, s }; }
  const origTags = polaIds(utdiag.diagnose(orig));
  let approx = false;
  if (!best || best.s.score < 0.2) {
    const nb = nearby(orig, pool, pos);
    if (!nb) return { status: "tidak_ditemukan", cand: null,
      reasons: ["Tidak ditemukan kalimat yang cocok di dokumen baru. Biasanya karena kalimat ini ditulis sangat berbeda, digabung, atau dihapus. Periksa sendiri bagian itu."], tags: [] };
    best = { c: nb, s: similarity(orig, nb.text) }; approx = true;
  }
  const cand = best.c.text, candTags = utdiag.diagnose(cand), candPola = polaIds(candTags);
  const add = newDetail(orig, cand), same = origTags.filter(x => candPola.includes(x));
  const base = { cand, where: best.c.where, score: Math.round(best.s.score * 100) / 100, approx };
  const pre = approx ? "Padanan diperkirakan dari posisi dan kata kunci yang sama (kalimat ditulis sangat berbeda), periksa sendiri. " : "";
  if (best.s.d >= 0.8) return { ...base, status: "belum", reasons: [pre + "Kalimat masih sama atau hampir sama dengan yang ditandai UT."], tags: candTags.map(tagView) };
  if (best.s.j >= 0.45 && add === 0 && same.length) return { ...base, status: "belum",
    reasons: [pre + "Hanya tukar kata atau susunan; tidak ada detail baru (angka, nama, kejadian) dan pola yang sama masih ada: " + same.map(id => (candTags.find(t => t.id === id) || {}).label).join(", ") + "."], tags: candTags.map(tagView) };
  if (candPola.length) return { ...base, status: "sebagian",
    reasons: [pre + "Sudah berubah, tetapi masih berpola: " + candTags.filter(t => t.id !== "blok").map(t => t.label).join(", ") + "."], tags: candTags.filter(t => t.id !== "blok").map(tagView) };
  return { ...base, status: "sudah", reasons: [pre + (add ? "Memuat detail baru dan tidak lagi mengena pola pedoman. Pastikan detailnya memang datamu." : "Tidak lagi mengena pola pedoman. Pastikan isinya tetap sesuai datamu.")], tags: [] };
}

const RANK = { belum: 3, sebagian: 2, tidak_ditemukan: 1, sudah: 0 };

/* items: kalimat asal yang ditandai UT ({n, block, where, text, pos}); pool: kalimat dokumen baru ({text, where, pos}); pos = posisi relatif 0..1 di dokumen. */
function compare(items, pool) {
  const byBlock = new Map(), count = { sudah: 0, sebagian: 0, belum: 0, tidak_ditemukan: 0 };
  for (const it of items) {
    const j = judge(it.text, pool, it.pos); count[j.status]++;
    const row = { n: it.n, block: it.block, where: it.where, orig: it.text, ...j };
    if (!byBlock.has(it.block)) byBlock.set(it.block, []);
    byBlock.get(it.block).push(row);
  }
  const blocks = [...byBlock.entries()].sort((a, b) => a[0] - b[0]).map(([block, rows]) => ({ block, status: rows.reduce((w, r) => (RANK[r.status] > RANK[w] ? r.status : w), "sudah"), items: rows }));
  const bc = { sudah: 0, sebagian: 0, belum: 0, tidak_ditemukan: 0 }; for (const b of blocks) bc[b.status]++;
  return { blocks, summary: { sentences: count, blocks: bc, total: items.length } };
}

module.exports = { compare, judge, similarity, newDetail };
