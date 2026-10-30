/* Pembaca laporan Drillbit resmi dari UT (PDF yang diunggah mahasiswa). Tanpa AI dan tanpa tebakan.
   - Laporan AI: persen, jumlah kata, tabel blok, dan teks blok yang disorot biru (warna sorotan dibaca dari gambar halaman).
   - Laporan Similarity: persen, grade, sumber yang cocok, jenis sumber, isi laporan, dan pengecualian.
   Angka dari laporan hanya "dibaca dari file yang diunggah": tidak diverifikasi oleh UT dan bukan hitungan kita.
   Alamat email penulis (berisi NIM) di laporan TIDAK pernah dikembalikan oleh modul ini. */
"use strict";
const { execFile } = require("child_process");
const fs = require("fs");
const fsp = fs.promises;
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) =>
  execFile(cmd, args, { maxBuffer: 96 * 1024 * 1024, timeout: 45000, encoding: opts.binary ? "buffer" : "utf8" }, (e, out) => e ? reject(e) : resolve(out)));

const GAP = Number(process.env.DB_GAP) || 8; // jeda kata tak tersorot yang tidak memutus blok
const HL = [204, 245, 255]; // warna sorotan biru Drillbit (0.8, 0.96, 1.0)
const near = (r, g, b, c, t = 8) => Math.abs(r - c[0]) <= t && Math.abs(g - c[1]) <= t && Math.abs(b - c[2]) <= t;
const unXml = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&amp;/g, "&");
const squeeze = s => String(s || "").replace(/\s+/g, " ").trim();

async function withTmp(buf, fn) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ca-db-"));
  try { const f = path.join(dir, "in.pdf"); await fsp.writeFile(f, buf, { mode: 0o600 }); return await fn(f, dir); }
  finally { fsp.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

/* Jenis laporan dari teks halaman pertama. */
function kindOf(text) {
  if (/AI\s+Content\s+Detection\s+Report/i.test(text) || /AI\s+TEXT\s+DETECTED/i.test(text)) return "ai";
  if (/DrillBit\s+Similarity\s+Report/i.test(text) || /Similarity\s+\d{1,3}(?:\.\d+)?\s*%/i.test(text)) return "sim";
  return null;
}
async function detectKind(buf) {
  if (!Buffer.isBuffer(buf) || buf.slice(0, 4).toString() !== "%PDF") return null;
  return withTmp(buf, async f => kindOf(await run("pdftotext", ["-f", "1", "-l", "2", "-layout", f, "-"])));
}

/* ---------- Laporan AI ---------- */
function pageNo(words, w) { return words; }
function parseBbox(xml) {
  const pages = [];
  for (const pg of String(xml || "").split("<page").slice(1)) {
    const m = pg.match(/width="([\d.]+)"\s+height="([\d.]+)"/);
    const words = [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(x => ({ x0: +x[1], y0: +x[2], x1: +x[3], y1: +x[4], t: unXml(x[5]) }));
    pages.push({ w: m ? +m[1] : 595, h: m ? +m[2] : 842, words });
  }
  return pages;
}
function readPpm(b) {
  // P6 <w> <h> 255\n<data>
  let i = 0; const tok = [];
  while (tok.length < 4 && i < b.length) {
    while (b[i] === 0x20 || b[i] === 0x0a || b[i] === 0x0d || b[i] === 0x09) i++;
    if (b[i] === 0x23) { while (b[i] !== 0x0a) i++; continue; }
    let s = i; while (i < b.length && b[i] > 0x20) i++; tok.push(b.slice(s, i).toString());
  }
  i++; // satu spasi setelah maxval
  return { w: +tok[1], h: +tok[2], d: b.slice(i) };
}
function wordHighlighted(img, wd) {
  let hl = 0, wh = 0;
  const yc = Math.round((wd.y0 + wd.y1) / 2), dy = Math.max(1, Math.round((wd.y1 - wd.y0) * 0.38));
  for (const y of [yc - dy, yc + dy]) {
    if (y < 0 || y >= img.h) continue;
    for (let x = Math.floor(wd.x0); x <= Math.ceil(wd.x1); x += 2) {
      if (x < 0 || x >= img.w) continue;
      const o = (y * img.w + x) * 3, r = img.d[o], g = img.d[o + 1], b = img.d[o + 2];
      if (near(r, g, b, HL)) hl++; else if (r > 245 && g > 245 && b > 245) wh++;
    }
  }
  return hl > wh;
}

async function parseAi(buf) {
  return withTmp(buf, async (f, dir) => {
    const all = await run("pdftotext", ["-layout", f, "-"]);
    const pagesTxt = all.split("\f");
    const first = pagesTxt.slice(0, 4).join("\n");
    const pct = first.match(/AI\s+TEXT\s+DETECTED[\s\S]{0,400}?\n\s*(\d{1,3}\.\d{1,2})\s/i);
    if (!pct) return { ok: false, kind: "ai", error: "Angka persen AI tidak terbaca dari laporan ini." };
    const aiPct = parseFloat(pct[1]);
    const mw = first.match(/Matched\s+(\d+)\s+words/i);
    const dims = first.match(/Text\s*\[Pages,\s*Sentences,\s*Words\]\s*\[(\d+),\s*(\d+),\s*(\d+)\]/i);
    const human = first.match(/Human\s+Written[\s\S]{0,200}?(\d{1,3}\.\d{2})\s*%/i);
    const blockTable = [...first.matchAll(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d{1,3}\.\d{1,2})\s+(INCLUDED|EXCLUDED)/gim)]
      .map(m => ({ n: +m[1], sentences: +m[2], words: +m[3], pct: +m[4], included: m[5].toUpperCase() === "INCLUDED" }));
    // halaman isi dokumen = setelah halaman terakhir yang memuat "HOW TO USE THIS REPORT"
    let lastHelp = -1; pagesTxt.forEach((t, i) => { if (/HOW\s+TO\s+USE\s+THIS\s+REPORT/i.test(t)) lastHelp = i; });
    const docFrom = lastHelp + 2, nPages = pagesTxt.filter(t => t.trim()).length;
    const out = { ok: true, kind: "ai", aiPct, matchedWords: mw ? +mw[1] : null, pages: dims ? +dims[1] : null, sentences: dims ? +dims[2] : null, totalWords: dims ? +dims[3] : null,
      humanPct: human ? parseFloat(human[1]) : null, blockTable, blocks: [], flaggedWords: 0, confidence: "rendah" };
    if (lastHelp < 0 || docFrom > nPages) return out; // tabel saja; teks blok tidak bisa dipetakan
    const xml = await run("pdftotext", ["-bbox-layout", "-enc", "UTF-8", "-f", String(docFrom), "-l", String(nPages), f, "-"]);
    await run("pdftoppm", ["-r", "72", "-f", String(docFrom), "-l", String(nPages), f, path.join(dir, "pg")], { binary: true });
    const imgs = (await fsp.readdir(dir)).filter(n => /^pg-\d+\.ppm$/.test(n)).sort();
    const pgs = parseBbox(xml);
    const seq = []; // urutan baca: {t, hl}
    for (let i = 0; i < pgs.length && i < imgs.length; i++) {
      const img = readPpm(await fsp.readFile(path.join(dir, imgs[i])));
      for (const wd of pgs[i].words) {
        if (wd.y0 < 48 || wd.y1 > pgs[i].h - 40) continue; // kepala dan kaki halaman laporan
        seq.push({ t: wd.t, hl: wordHighlighted(img, wd), p: i });
      }
    }
    // blok = rentetan kata tersorot; jeda sampai 3 kata tak tersorot (judul kecil, angka halaman) tidak memutus blok
    const blocks = []; let cur = null, gap = 0;
    for (const w of seq) {
      if (w.hl) { if (!cur) { cur = { words: [], gapBuf: [] }; } cur.words.push(...cur.gapBuf, w.t); cur.gapBuf = []; gap = 0; }
      else if (cur) { cur.gapBuf.push(w.t); if (++gap > GAP) { blocks.push(cur); cur = null; gap = 0; } }
    }
    if (cur) blocks.push(cur);
    out.blocks = blocks.map((b, i) => ({ n: i + 1, words: b.words.length, text: squeeze(b.words.join(" ")) })).filter(b => b.words >= 20);
    out.flaggedWords = out.blocks.reduce((n, b) => n + b.words, 0);
    const ref = out.matchedWords || 0;
    out.confidence = ref && Math.abs(out.flaggedWords - ref) / ref <= 0.04 && (!blockTable.length || blockTable.length === out.blocks.length) ? "tinggi" : ref && Math.abs(out.flaggedWords - ref) / ref <= 0.12 ? "sedang" : "rendah";
    return out;
  });
}

/* ---------- Laporan Similarity ---------- */
async function parseSim(buf) {
  return withTmp(buf, async f => {
    const raw = await run("pdftotext", ["-f", "1", "-l", "3", "-layout", f, "-"]);
    const t = squeeze(raw), rt = squeeze(await run("pdftotext", ["-f", "1", "-l", "1", "-raw", f, "-"]));
    const sim = t.match(/Similarity\s+(\d{1,3}(?:\.\d+)?)\s*%/i);
    if (!sim) return { ok: false, kind: "sim", error: "Angka similarity tidak terbaca dari laporan ini." };
    const pct = parseFloat(sim[1]);
    const grade = (t.match(/\b(\d{1,3}(?:\.\d+)?)\s+(\d+)\s+([A-D])\s+SIMILARITY\s*%/i) || [])[3] || (pct <= 10 ? "A" : pct <= 40 ? "B" : pct <= 60 ? "C" : "D");
    const dims = t.match(/Total\s+Pages,\s*Total\s+Words\s+(\d+),\s*(\d+)/i);
    const num = re => { const m = rt.match(re); return m ? parseFloat(m[1]) : null; };
    const types = { internet: num(/Internet\s+(\d+(?:\.\d+)?)\s*%/i), jurnal: num(/Publicatio\s*n\s+(\d+(?:\.\d+)?)\s*%/i), mahasiswa: num(/Student\s+Papers?\s+(\d+(?:\.\d+)?)\s*%/i) };
    const content = { kutipan: num(/Quotes\s+(\d+(?:\.\d+)?)\s*%/i), kurangDari14Kata: num(/Words\s*<\s*14,\s*(\d+(?:\.\d+)?)\s*%/i) };
    const excl = { kutipan: /Quotes\s+Excluded/i.test(t), pustaka: /References\/Bibliography\s+Excluded/i.test(t), kurangDari14Kata: /Excluded\s*<\s*14\s*Words\s+Excluded/i.test(t) };
    const src = []; // baris: "1 eprints.unmas.ac.id %  Publication" lalu persen di baris berikut
    const lines = raw.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*(\d{1,2})\s+([A-Za-z0-9][A-Za-z0-9.\-_/]*\.[a-z]{2,}[^\s]*)\s+(Publication|Internet Data|Student Papers?|Journal\w*|Repository\w*)\s*$/i);
      if (!m) continue;
      let p = null; for (let j = i - 1; j <= i + 2 && j < lines.length; j++) { if (j < 0 || j === i) continue; const q = lines[j].match(/^\s*(\d{1,2}(?:\.\d+)?)\s*$/); if (q) { p = parseFloat(q[1]); break; } }
      src.push({ n: +m[1], domain: m[2].slice(0, 120), type: m[3].replace(/\s+/g, " "), pct: p });
    }
    return { ok: true, kind: "sim", pct, grade, matchedSources: (t.match(/\b(\d+)\s+[A-D]\s+SIMILARITY/i) || [])[1] ? +t.match(/\b(\d+)\s+[A-D]\s+SIMILARITY/i)[1] : src.length,
      pages: dims ? +dims[1] : null, totalWords: dims ? +dims[2] : null, sourceTypes: types, content, excluded: excl, sources: src.slice(0, 20) };
  });
}

/* ---------- Petakan blok UT ke paragraf dokumen asli ---------- */
const nw = s => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean);
function shingles(words, n = 4) { const set = new Set(); for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(" ")); return set; }
/* paragraphs: [{idx,text}], splitSentences(text) -> [string]. Mengembalikan kalimat yang ≥ 60% n-gramnya ada di salah satu blok UT. */
function mapBlocks(blocks, paragraphs, splitSentences) {
  const sets = (blocks || []).map(b => shingles(nw(b.text)));
  const hits = []; let words = 0;
  for (const p of paragraphs || []) {
    const sents = splitSentences(p.text || "");
    sents.forEach((s, si) => {
      const w = nw(s); if (w.length < 5) return;
      const sh = [...shingles(w, w.length >= 4 ? 4 : w.length)]; if (!sh.length) return;
      let best = -1, bestFrac = 0;
      sets.forEach((set, bi) => { let c = 0; for (const g of sh) if (set.has(g)) c++; const fr = c / sh.length; if (fr > bestFrac) { bestFrac = fr; best = bi; } });
      if (bestFrac >= 0.6) { hits.push({ para_idx: p.idx, sent_idx: si, block: blocks[best].n, words: w.length }); words += w.length; }
    });
  }
  /* Satu blok UT berupa teks berurutan: simpan hanya gugus paragraf terpadat per blok (celah antarparagraf paling banyak 6),
     supaya kalimat umum yang kebetulan mirip di tempat lain tidak ikut tertandai. */
  const kept = [];
  for (const b of blocks || []) {
    const mine = hits.filter(h => h.block === b.n).sort((x, y) => x.para_idx - y.para_idx || x.sent_idx - y.sent_idx);
    let best = [], cur = [];
    for (const h of mine) {
      if (cur.length && h.para_idx - cur[cur.length - 1].para_idx > 15) { if (sum(cur) > sum(best)) best = cur; cur = []; }
      cur.push(h);
    }
    if (sum(cur) > sum(best)) best = cur;
    kept.push(...best);
  }
  return { hits: kept, words: sum(kept) };
}
function sum(a) { return a.reduce((n, h) => n + h.words, 0); }

/* Teks halaman pertama laporan (untuk mencari nama/NIM bila sampul dokumen tidak memuatnya). Gagal baca = string kosong. */
async function headText(buf) {
  try { return await withTmp(buf, async f => String(await run("pdftotext", ["-f", "1", "-l", "1", "-layout", f, "-"])).slice(0, 4000)); } catch { return ""; }
}
module.exports = { headText, detectKind, parseAi, parseSim, mapBlocks, kindOf };
