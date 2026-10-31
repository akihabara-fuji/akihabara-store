/* Studio Parafrase (admin): logika murni untuk Cek & Parafrase berbasis laporan UT.
   (1) ciri kalimat yang ditandai UT, diukur dari teksnya sendiri (tanpa persen mesin),
   (2) hitungan untuk mahasiswa (hanya warna dan total kalimat biru),
   (3) mengganti kalimat biru di DOCX asli tanpa mengubah format bagian lain,
   (4) mencocokkan hasil edit di Word ke kalimat biru. */
"use strict";
const { splitSentences, countWords, paraText, paragraphNodes, parseBody, openDocx, readText, W } = require("./docx");
const banding = require("./banding");

const LONG_MAX = 35;                 // sama dengan rules.analyzeFindings (cfg.long_sentence_words)
const TRANS = ["selain itu", "oleh karena itu", "selanjutnya", "di samping itu", "dengan demikian", "namun demikian", "lebih lanjut", "sehingga", "kemudian"];
const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const leadOf = t => { const n = norm(t); return TRANS.find(x => n.startsWith(x + " ") || n.startsWith(x + ",")) || null; };

/* Ciri satu kalimat. level: merah (bermasalah), hijau (aman), kuning (perlu detail), netral (hanya angka). */
function ciri(text, paraSents, longMax = LONG_MAX) {
  const w = countWords(text), commas = (String(text).match(/,/g) || []).length, out = [];
  out.push(w > longMax
    ? { key: "panjang", level: "merah", text: `Terlalu panjang: ${w} kata (batas ${longMax}). Pecah jadi dua kalimat.` }
    : { key: "panjang", level: "hijau", text: `Panjang aman: ${w} kata (batas ${longMax}).` });
  out.push({ key: "koma", level: "netral", text: `Koma: ${commas}.` });
  const lead = leadOf(text);
  if (lead) {
    const n = (paraSents || []).filter(s => leadOf(s) === lead).length;
    out.push({ key: "penyambung", level: n >= 3 ? "merah" : "netral", text: `Diawali penyambung "${lead}"` + (n >= 3 ? `; dipakai ${n} kali di paragraf ini. Variasikan.` : ".") });
  }
  const pw = (paraSents || []).reduce((a, s) => a + countWords(s), 0);
  if ((paraSents || []).length && paraSents.length <= 2 && pw < 35)
    out.push({ key: "dempet", level: "merah", text: `Paragraf dempet: hanya ${paraSents.length} kalimat (${pw} kata). Kembangkan dengan penjelasan atau contoh.` });
  const detail = /\d/.test(text) || /(?<=[a-z,;]\s)[A-Z][a-z]{2,}/.test(text);
  if (!detail) out.push({ key: "detail", level: "kuning", text: "Tanpa angka, nama, atau data kasus." });
  return out;
}

/* Hitungan untuk mahasiswa: hanya total kalimat biru dan jumlah per warna. Tanpa teks rekomendasi. */
function stats(items, sentsOfPara) {
  const pola = { definisi: 0, sintesis: 0, proposisi: 0, umum: 0, blok: 0 };
  const ciriMerah = { panjang: 0, dempet: 0, penyambung: 0 };
  for (const it of items) {
    for (const g of it.tags || []) if (g.id in pola) pola[g.id]++;
    for (const c of ciri(it.text, sentsOfPara(it.para_idx))) if (c.level === "merah" && c.key in ciriMerah) ciriMerah[c.key]++;
  }
  return { total: items.length, pola, ciriMerah };
}

/* ---------- ganti kalimat di DOM Word ---------- */
const kidsOf = n => { const o = []; for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) o.push(c); return o; };
const isW = (el, name) => el && el.namespaceURI === W && el.localName === name;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Satu kalimat dalam satu paragraf. Hanya paragraf sederhana (run + penanda); selain itu dilewati dan dilaporkan. */
function replaceInParagraph(p, sentIdx, newText) {
  const kids = kidsOf(p).filter(c => !isW(c, "pPr"));
  const okKind = new Set(["r", "bookmarkStart", "bookmarkEnd", "proofErr"]);
  if (!kids.every(c => c.namespaceURI === W && okKind.has(c.localName))) return "paragraf_rumit";
  const runs = kids.filter(c => isW(c, "r"));
  const info = runs.map(r => { const ts = kidsOf(r).filter(c => isW(c, "t")); return { r, ts, text: ts.map(t => t.textContent).join(""), other: kidsOf(r).some(c => !isW(c, "rPr") && !isW(c, "t")) }; });
  const full = info.map(x => x.text).join("");
  const sents = splitSentences(paraText(p));
  const s = sents[sentIdx];
  if (!s) return "kalimat_tidak_ada";
  const m = new RegExp(s.split(/\s+/).map(esc).join("\\s+")).exec(full);
  if (!m) return "teks_tidak_cocok";
  const a = m.index, b = m.index + m[0].length;
  let pos = 0, done = false;
  for (const x of info) {
    const start = pos, end = pos + x.text.length; pos = end;
    if (end <= a || start >= b || !x.text.length) continue;
    const from = Math.max(a, start) - start, to = Math.min(b, end) - start;
    const next = x.text.slice(0, from) + (done ? "" : newText) + x.text.slice(to);
    done = true;
    x.ts.forEach((t, i) => { if (i) t.parentNode.removeChild(t); });
    if (x.ts[0]) { x.ts[0].textContent = next; x.ts[0].setAttribute("xml:space", "preserve"); }
  }
  return done ? null : "teks_tidak_cocok";
}

/* edits: [{ para_idx, sent_idx, text }]. Dikerjakan dari kalimat paling belakang supaya indeks kalimat di depannya tetap benar. */
function applyEditsToDom(body, edits) {
  const nodes = paragraphNodes(body), skipped = [];
  let applied = 0;
  const list = [...edits].sort((x, y) => y.para_idx - x.para_idx || y.sent_idx - x.sent_idx);
  for (const e of list) {
    const n = nodes[e.para_idx];
    const why = n ? replaceInParagraph(n.node, e.sent_idx, String(e.text == null ? "" : e.text)) : "paragraf_tidak_ada";
    if (why) skipped.push({ para_idx: e.para_idx, sent_idx: e.sent_idx, reason: why }); else applied++;
  }
  return { applied, skipped };
}

async function applyEdits(buf, edits) {
  const { XMLSerializer } = require("@xmldom/xmldom");
  const zip = await openDocx(buf);
  const { doc, body } = parseBody(await readText(zip, "word/document.xml"));
  const r = applyEditsToDom(body, edits);
  const xml = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", xml.startsWith("<?xml") ? xml : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + xml);
  return { buf: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), ...r };
}

/* Edit dari item (bisa meliputi beberapa kalimat berurutan) menjadi daftar edit per kalimat Word:
   teks baru masuk ke kalimat pertama milik item, kalimat lain milik item itu dikosongkan.
   Beberapa item bisa berbagi satu kalimat Word (UT menyorot satu kalimat panjang yang kita pecah jadi dua): teksnya digabung berurutan,
   dan bagian yang tidak diedit memakai teks aslinya supaya tidak hilang. */
function editsFromItems(items, texts) {
  const slot = new Map(), order = [];
  let edited = new Set();
  for (const it of items) {
    const t = texts[it.n], has = t != null && String(t).trim() !== "";
    const parts = it.parts && it.parts.length ? it.parts : [[it.para_idx, it.sent_idx]];
    parts.forEach(([pi, si], j) => {
      const k = pi + ":" + si;
      if (!slot.has(k)) { slot.set(k, { para_idx: pi, sent_idx: si, pieces: [] }); order.push(k); }
      slot.get(k).pieces.push(j === 0 ? (has ? String(t).trim() : String(it.text || "").trim()) : "");
      if (has) edited.add(k);
    });
  }
  return order.filter(k => edited.has(k)).map(k => { const s = slot.get(k); return { para_idx: s.para_idx, sent_idx: s.sent_idx, text: s.pieces.filter(Boolean).join(" ") }; });
}

/* Hasil edit di Word: cari kalimat padanan tiap item di dokumen yang diedit (dekat posisi paragrafnya). */
function matchImported(items, importedParas) {
  const pool = [];
  for (const p of importedParas) for (const t of splitSentences(p.text || "")) pool.push({ idx: p.idx, text: t });
  const sug = {};
  for (const it of items) {
    let best = null;
    for (const c of pool) {
      if (Math.abs(c.idx - it.para_idx) > 3) continue;
      const sc = banding.similarity(it.text, c.text).score;
      if (!best || sc > best.sc) best = { c, sc };
    }
    if (best && best.sc >= 0.25 && norm(best.c.text) !== norm(it.text)) sug[it.n] = best.c.text;
  }
  return sug;
}


/* ---------- PDF asli: tidak ada Word untuk diedit, jadi Word dibuat dari teks PDF (format PDF tidak ikut) ---------- */
/* Teks paragraf setelah edit. Indeks kalimat mengacu ke kalimat paragraf asli; teks kosong berarti kalimat dihapus. */
function rewriteParagraphs(paragraphs, edits) {
  const by = new Map();
  for (const e of edits) { if (!by.has(e.para_idx)) by.set(e.para_idx, new Map()); by.get(e.para_idx).set(e.sent_idx, String(e.text == null ? "" : e.text)); }
  let applied = 0;
  const out = paragraphs.map(p => {
    const m = by.get(p.idx), text = String(p.text || "");
    if (!m) return text;
    const ss = splitSentences(text);
    ss.forEach((t, i) => { if (m.has(i)) { ss[i] = m.get(i); applied++; } });
    return ss.map(x => x.trim()).filter(Boolean).join(" ");
  });
  return { texts: out, applied };
}
const xe = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* texts: teks per paragraf; marks: Set "paraIdx:sentIdx" yang disorot (untuk Word edit). */
async function plainDocx(paragraphs, texts, marks, notes) {
  const JSZip = require("jszip"), zip = new JSZip();
  const body = paragraphs.map((p, i) => {
    const t = String(texts ? texts[i] : p.text || ""); if (!t.trim()) return "";
    const ss = marks ? splitSentences(t) : [t];
    const runs = ss.map((x, j) => `<w:r>${marks && marks.has(p.idx + ":" + j) ? '<w:rPr><w:shd w:val="clear" w:color="auto" w:fill="B2EBF2"/></w:rPr>' : ""}<w:t xml:space="preserve">${xe(x)}${j < ss.length - 1 ? " " : ""}</w:t></w:r>`).join("");
    let out = `<w:p><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>${runs}</w:p>`;
    /* Rekomendasi per kalimat biru: kotak abu di bawah paragrafnya (Word hasil kirim tidak memuat ini; hanya untuk admin). */
    for (const n of (notes && notes.get(p.idx)) || []) {
      out += n.split("\n").map((line, k) => `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F1F3F5"/><w:spacing w:after="${k === n.split("\n").length - 1 ? 160 : 0}"/><w:ind w:left="360"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/>${k === 0 ? "<w:b/>" : ""}</w:rPr><w:t xml:space="preserve">${xe(line)}</w:t></w:r></w:p>`).join("");
    }
    return out;
  }).join("");
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1701" w:right="1701" w:bottom="1701" w:left="2268" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

module.exports = { rewriteParagraphs, plainDocx, LONG_MAX, ciri, stats, applyEditsToDom, applyEdits, editsFromItems, matchImported, replaceInParagraph, leadOf };
