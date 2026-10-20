/* Baca DOCX murid: validasi isi file, ekstraksi paragraf, kalimat, dan deteksi otomatis.
   Hanya aturan lokal. Tidak ada layanan luar. Tidak mengubah berkas asli. */
"use strict";
const JSZip = require("jszip");
const { DOMParser } = require("@xmldom/xmldom");

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const LIMITS = { entries: 3000, xmlBytes: 80 * 1024 * 1024 };

class DocxError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const HOWTO = " Buka di Word lalu Simpan Sebagai .docx, atau di Google Docs pilih Unduh sebagai .docx.";

/* ---------- validasi dan buka ---------- */
async function openDocx(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 100) throw new DocxError("kosong", "File kosong atau rusak.");
  // Berkas lama .doc dan docx berpassword sama-sama berupa OLE (D0CF11E0), bukan zip.
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0)
    throw new DocxError("ole", "File ini berformat Word lama (.doc) atau diberi password. Hapus password atau simpan ulang sebagai .docx." + HOWTO);
  if (buf.slice(0, 4).toString() === "%PDF") throw new DocxError("pdf", "File PDF tidak didukung karena tata letaknya bisa bergeser. Ubah dulu ke .docx." + HOWTO);
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new DocxError("bukan_docx", "File bukan dokumen Word (.docx)." + HOWTO);
  let zip;
  try { zip = await JSZip.loadAsync(buf, { checkCRC32: false }); }
  catch { throw new DocxError("rusak", "File Word rusak dan tidak bisa dibuka. Coba simpan ulang sebagai .docx."); }
  const names = Object.keys(zip.files);
  if (names.length > LIMITS.entries) throw new DocxError("terlalu_banyak", "Struktur file tidak wajar.");
  if (names.some(n => /vbaProject\.bin$/i.test(n))) throw new DocxError("makro", "File berisi makro. Simpan sebagai .docx biasa (bukan .docm).");
  if (!zip.file("word/document.xml")) throw new DocxError("bukan_word", "File ini bukan dokumen Word (.docx)." + HOWTO);
  if (names.includes("EncryptedPackage")) throw new DocxError("terenkripsi", "File diberi password. Hapus password lalu unggah lagi.");
  return zip;
}

async function readText(zip, name) {
  const f = zip.file(name);
  if (!f) return null;
  const size = f._data && f._data.uncompressedSize;
  if (size && size > LIMITS.xmlBytes) throw new DocxError("terlalu_besar", "Isi dokumen terlalu besar untuk diproses.");
  const s = await f.async("string");
  if (s.length > LIMITS.xmlBytes) throw new DocxError("terlalu_besar", "Isi dokumen terlalu besar untuk diproses.");
  return s;
}

/* ---------- ekstraksi paragraf ---------- */
function* elementChildren(node) {
  for (let c = node.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) yield c;
}
const isW = (el, name) => el.namespaceURI === W && el.localName === name;

function paraText(p) {
  let out = "";
  (function walk(n) {
    for (const c of elementChildren(n)) {
      if (c.namespaceURI !== W) { if (c.localName === "AlternateContent" || c.localName === "Fallback") continue; walk(c); continue; }
      switch (c.localName) {
        case "t": out += c.textContent; break;
        case "tab": out += "\t"; break;
        case "br": case "cr": out += "\n"; break;
        case "noBreakHyphen": out += "-"; break;
        case "del": case "delText": case "instrText": case "pPr": case "rPr": case "txbxContent": break;
        default: walk(c);
      }
    }
  })(p);
  return out;
}
function paraStyle(p) {
  for (const c of elementChildren(p)) if (isW(c, "pPr"))
    for (const s of elementChildren(c)) if (isW(s, "pStyle")) return s.getAttributeNS(W, "val") || s.getAttribute("w:val") || "";
  return "";
}

function extractParagraphs(xml) {
  const doc = new DOMParser({ onError: () => {} }).parseFromString(xml, "text/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new DocxError("bukan_word", "Isi dokumen Word tidak bisa dibaca.");
  const paras = [];
  (function walk(n, inTable) {
    for (const c of elementChildren(n)) {
      if (isW(c, "p")) paras.push({ idx: paras.length, text: paraText(c), style: paraStyle(c), inTable });
      else if (isW(c, "tbl") || isW(c, "tr") || isW(c, "tc") || isW(c, "sdt") || isW(c, "sdtContent") || isW(c, "ins"))
        walk(c, inTable || isW(c, "tbl"));
    }
  })(body, false);
  return paras;
}

/* ---------- kalimat ---------- */
const ABBR = /(?:^|[\s(])(?:dkk|dll|dsb|dst|dgn|yg|dr|drs|prof|ir|no|hlm|vol|ed|et al|al|e\.g|i\.e|vs|tn|ny|sdr|jl|st|mr|mrs|ms|bpk|ibu|sbb|spt|cth|tsb|dpt|pt|cv|ud|tbk|rp|mm|cm|km)\.$/i;
function splitSentences(text) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const out = []; let start = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch !== "." && ch !== "?" && ch !== "!") continue;
    let j = i; while (j + 1 < t.length && /[.?!"'”’)\]]/.test(t[j + 1])) j++;
    const next = t.slice(j + 1);
    if (next.length && !/^\s/.test(next)) { i = j; continue; }       // 3.5, a.b, URL
    const head = t.slice(start, j + 1);
    if (ch === "." && (ABBR.test(head) || /(?:^|\s)[A-Z]\.$/.test(head))) { i = j; continue; } // singkatan, inisial
    if (next.length && /^\s+[a-z]/.test(next) && ch === ".") { i = j; continue; }             // lanjut huruf kecil
    out.push(head.trim()); start = j + 1; i = j;
  }
  const rest = t.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/* ---------- deteksi daftar pustaka ---------- */
const BIB_HEAD = /^\s*(?:bab\s+[ivx\d]+\s*[.:-]?\s*)?(daftar\s+pustaka|daftar\s+referensi|daftar\s+rujukan|referensi|rujukan|pustaka|references|bibliography|reference\s+list)\s*[:.]?\s*$/i;
function findBibliography(paras) {
  let at = -1;
  for (let i = paras.length - 1; i >= 0; i--) {
    const p = paras[i];
    if (!p.inTable && p.text.length <= 60 && BIB_HEAD.test(p.text)) { at = i; break; }
  }
  if (at < 0) return null;
  // judul harus ada di paruh akhir dokumen supaya "Referensi" di daftar isi tidak terhitung
  const totalWords = paras.reduce((n, p) => n + countWords(p.text), 0);
  const before = paras.slice(0, at).reduce((n, p) => n + countWords(p.text), 0);
  if (totalWords && before / totalWords < 0.4) return null;
  return at;
}

const countWords = s => { const m = s.trim().match(/\S+/g); return m ? m.length : 0; };

/* ---------- bahasa, judul, jenis ---------- */
const ID_STOP = new Set("yang dan di ke dari untuk dengan pada adalah dalam tidak ini itu atau juga oleh akan dapat sebagai karena telah serta bahwa para antara lebih sangat agar sehingga mereka kami kita saya".split(" "));
const EN_STOP = new Set("the and of to in is that for with as on are by this be from or an at it which was were has have not can their these its also more than such".split(" "));
function detectLanguage(text) {
  const w = (text.toLowerCase().match(/[a-z]+/g) || []).slice(0, 4000);
  let a = 0, b = 0;
  for (const x of w) { if (ID_STOP.has(x)) a++; if (EN_STOP.has(x)) b++; }
  if (a + b < 8) return "id";
  return b > a * 1.2 ? "en" : "id";
}
function guessTitle(paras, coreTitle) {
  const head = paras.slice(0, 40).filter(p => p.text.trim());
  const styled = head.find(p => /^(title|judul)$/i.test(p.style) && p.text.length <= 250);
  if (styled) return styled.text.trim();
  if (coreTitle && coreTitle.trim().length >= 8 && !/^(document|dokumen|untitled|microsoft word)/i.test(coreTitle.trim())) return coreTitle.trim().slice(0, 250);
  const cand = head.slice(0, 15).filter(p => { const t = p.text.trim(); const n = countWords(t); return n >= 3 && n <= 30 && t.length <= 250 && !/^(bab|daftar|abstrak|nama|nim|tugas|mata kuliah|program studi)\b/i.test(t); });
  return cand.length ? cand[0].text.trim() : "";
}
function guessDocType(text) {
  const t = text.toLowerCase();
  const metopen = ["rumusan masalah", "tujuan penelitian", "kerangka teori", "kerangka konseptual", "metode penelitian", "manfaat penelitian", "hipotesis", "populasi dan sampel", "latar belakang"].filter(k => t.includes(k)).length;
  if (metopen >= 3) return "metopen";
  const art = ["abstrak", "abstract", "kata kunci", "keywords", "pendahuluan", "kesimpulan"].filter(k => t.includes(k)).length;
  if (art >= 4) return "artikel";
  return "umum";
}

/* ---------- analisis utama ---------- */
async function analyze(buf) {
  const zip = await openDocx(buf);
  const xml = await readText(zip, "word/document.xml");
  const core = await readText(zip, "docProps/core.xml");
  const paras = extractParagraphs(xml);
  const nonEmpty = paras.filter(p => p.text.trim());
  if (!nonEmpty.length) throw new DocxError("tanpa_teks", "Dokumen tidak berisi teks yang bisa dibaca. Pastikan isinya bukan gambar atau hasil scan.");

  const bibAt = findBibliography(paras);
  const bodyParas = bibAt == null ? paras : paras.slice(0, bibAt);
  const wordsAll = paras.reduce((n, p) => n + countWords(p.text), 0);
  const wordsBody = bodyParas.reduce((n, p) => n + countWords(p.text), 0);
  const sample = bodyParas.map(p => p.text).join("\n");
  let coreTitle = ""; if (core) { const m = core.match(/<dc:title>([^<]*)<\/dc:title>/); if (m) coreTitle = m[1]; }

  return {
    paragraphCount: nonEmpty.length,
    wordsAll, wordsBody,
    hasBibliography: bibAt != null,
    bibliographyParagraphIndex: bibAt,
    title: guessTitle(paras, coreTitle),
    language: detectLanguage(sample),
    docType: guessDocType(sample),
    paragraphs: paras,
  };
}

/* Versi ringan untuk dikirim ke klien (tanpa isi dokumen). */
const summary = a => ({
  title: a.title, language: a.language, docType: a.docType,
  words: a.wordsAll, wordsWithoutBibliography: a.wordsBody, hasBibliography: a.hasBibliography,
  paragraphs: a.paragraphCount,
});

module.exports = { analyze, summary, splitSentences, countWords, DocxError, openDocx };
