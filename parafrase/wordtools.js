/* Alat Word untuk admin: (1) DOCX berwarna + komentar alasan + Track Changes aktif, (2) cek ulang hasil revisi,
   (3) terima semua perubahan dan buang warna/komentar menjadi DOCX bersih. Tidak mengubah berkas asli (bekerja pada salinan di memori). */
"use strict";
const JSZip = require("jszip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const { openDocx, readText, parseBody, paragraphNodes, splitSentences, analyze, W } = require("./docx");
const { analyzeFindings, countByCode } = require("./rules");

const FILL = { M: "F8BBBB", O: "FFD8A8", K: "FFF3A0", B: "BBD7F5", U: "D9C2F0", H: "BFE5C8", P: "F7BBD5", A: "D5DADD" };
const MARK = "0A0B0C"; // penanda warna buatan kita pada <w:shd w:color>, dipakai untuk membersihkan
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const parse = xml => new DOMParser({ onError: () => {} }).parseFromString(xml, "text/xml");
const ser = doc => { const s = new XMLSerializer().serializeToString(doc); return s.startsWith("<?xml") ? s : DECL + s; };
const kids = n => { const o = []; for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) o.push(c); return o; };
const isW = (el, name) => el && el.namespaceURI === W && el.localName === name;
const wel = (doc, name, attrs = {}) => { const e = doc.createElementNS(W, "w:" + name); for (const [k, v] of Object.entries(attrs)) e.setAttributeNS(W, "w:" + k, v); return e; };

/* ---------- Word berwarna ---------- */
const AFTER_SHD = new Set(["fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"]);
function setShading(doc, run, fill) {
  let rPr = kids(run).find(c => isW(c, "rPr"));
  if (!rPr) { rPr = wel(doc, "rPr"); run.insertBefore(rPr, run.firstChild); }
  for (const c of kids(rPr)) if (isW(c, "shd")) rPr.removeChild(c);
  const shd = wel(doc, "shd", { val: "clear", color: MARK, fill });
  const before = kids(rPr).find(c => AFTER_SHD.has(c.localName));
  before ? rPr.insertBefore(shd, before) : rPr.appendChild(shd);
}
const runText = r => { let t = "", plain = true; for (const c of kids(r)) { if (isW(c, "rPr")) continue; if (isW(c, "t")) t += c.textContent; else if (isW(c, "tab")) { t += "\t"; plain = false; } else if (isW(c, "br") || isW(c, "cr")) { t += "\n"; plain = false; } else plain = false; } return { t, plain }; };
const mkRunLike = (doc, src, text) => {
  const r = src.cloneNode(false);
  const rPr = kids(src).find(c => isW(c, "rPr")); if (rPr) r.appendChild(rPr.cloneNode(true));
  const t = wel(doc, "t"); t.setAttribute("xml:space", "preserve"); t.appendChild(doc.createTextNode(text)); r.appendChild(t);
  return r;
};

function colorParagraph(doc, p, rawFindings, nextId, comments) {
  const bySent = new Map();
  for (const f of rawFindings) (bySent.get(f.sent_idx) || bySent.set(f.sent_idx, []).get(f.sent_idx)).push(f);
  const children = kids(p).filter(c => !isW(c, "pPr"));
  const passthrough = new Set(["r", "bookmarkStart", "bookmarkEnd", "proofErr"]);
  const runs = children.filter(c => isW(c, "r"));
  const simple = children.every(c => c.namespaceURI === W && passthrough.has(c.localName)) && runs.length > 0;
  const addComment = (startRef, endRef, fs) => {
    const id = nextId(); comments.push({ id, text: fs.map(f => `[${f.code}] ${f.reason}`).join("\n") });
    p.insertBefore(wel(doc, "commentRangeStart", { id }), startRef);
    const after = endRef.nextSibling;
    const e = wel(doc, "commentRangeEnd", { id }), ref = wel(doc, "r"); ref.appendChild(wel(doc, "commentReference", { id }));
    after ? (p.insertBefore(e, after), p.insertBefore(ref, after)) : (p.appendChild(e), p.appendChild(ref));
  };
  const primaryFill = fs => FILL[(fs.find(f => f.primary) || fs[0]).code];

  if (!simple) { // paragraf rumit: warnai seluruh paragraf, satu komentar
    if (!runs.length) return;
    runs.forEach(r => setShading(doc, r, primaryFill(rawFindings)));
    addComment(runs[0], runs[runs.length - 1], rawFindings);
    return;
  }
  const info = runs.map(r => runText(r));
  const raw = info.map(i => i.t).join("");
  let norm = "", map = [], prevSpace = true;
  for (let i = 0; i < raw.length; i++) {
    if (/\s/.test(raw[i])) { if (!prevSpace) { norm += " "; map.push(i); prevSpace = true; } } else { norm += raw[i]; map.push(i); prevSpace = false; }
  }
  if (norm.endsWith(" ")) { norm = norm.slice(0, -1); map.pop(); }
  const sents = splitSentences(raw), spans = new Map(); let pos = 0, ok = true;
  sents.forEach((s, i) => { const at = norm.indexOf(s, pos); if (at < 0) { ok = false; return; } spans.set(i, [map[at], map[at + s.length - 1] + 1]); pos = at + s.length; });
  const flagged = [...bySent.keys()].filter(i => spans.has(i));
  if (!ok || !flagged.length) { runs.forEach(r => setShading(doc, r, primaryFill(rawFindings))); addComment(runs[0], runs[runs.length - 1], rawFindings); return; }

  // titik potong per kalimat bertanda, lalu bangun ulang run
  const cover = off => { for (const i of flagged) { const [a, b] = spans.get(i); if (off >= a && off < b) return i; } return -1; };
  const sentRuns = new Map(); // sent_idx -> {first,last}
  let off = 0;
  runs.forEach((r, ri) => {
    const { t, plain } = info[ri], start = off, end = off + t.length; off = end;
    const pieces = [];
    if (!plain) { const hit = flagged.find(i => { const [a, b] = spans.get(i); return a < end && b > start; }); pieces.push({ node: r, sent: hit == null ? -1 : hit, reuse: true }); }
    else {
      let cut = start, curSent = t.length ? cover(start) : -1;
      for (let o = start + 1; o <= end; o++) { const s = o < end ? cover(o) : -2; if (s !== curSent || o === end) { if (o > cut) pieces.push({ text: t.slice(cut - start, o - start), sent: curSent }); cut = o; curSent = s; } }
      if (!pieces.length) pieces.push({ node: r, sent: -1, reuse: true });
    }
    for (const pc of pieces) {
      const node = pc.reuse ? pc.node : mkRunLike(doc, r, pc.text);
      if (pc.sent >= 0) { setShading(doc, node, primaryFill(bySent.get(pc.sent))); const e = sentRuns.get(pc.sent) || { first: node }; e.last = node; sentRuns.set(pc.sent, e); }
      if (!pc.reuse) p.insertBefore(node, r);
    }
    if (!pieces[0].reuse) p.removeChild(r);
  });
  for (const [i, { first, last }] of sentRuns) addComment(first, last, bySent.get(i));
}

function ensureRel(zip, relsPath, type, target) {
  return zip.file(relsPath) ? zip.file(relsPath).async("string") : Promise.resolve(`${DECL}<Relationships xmlns="${REL_NS}"/>`);
}
async function addPart(zip, partName, contentType, relType, relTarget, relsFile) {
  let ct = await zip.file("[Content_Types].xml").async("string");
  if (!ct.includes(`PartName="/${partName}"`)) ct = ct.replace("</Types>", `<Override PartName="/${partName}" ContentType="${contentType}"/></Types>`);
  zip.file("[Content_Types].xml", ct);
  let rels = await ensureRel(zip, relsFile);
  if (!rels.includes(relType)) {
    const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map(m => +m[1]);
    rels = rels.replace(/<\/Relationships>|\/>\s*$/, m => m === "/>" ? ">" + `<Relationship Id="rId${Math.max(0, ...ids) + 1}" Type="${relType}" Target="${relTarget}"/></Relationships>` : `<Relationship Id="rId${Math.max(0, ...ids) + 1}" Type="${relType}" Target="${relTarget}"/></Relationships>`);
  }
  zip.file(relsFile, rels);
}
const SETTINGS_BEFORE = new Set(["writeProtection", "view", "zoom", "removePersonalInformation", "removeDateAndTime", "doNotDisplayPageBoundaries", "displayBackgroundShape", "printPostScriptOverText", "printFractionalCharacterWidth", "printFormsData", "embedTrueTypeFonts", "embedSystemFonts", "saveSubsetFonts", "saveFormsData", "mirrorMargins", "alignBordersAndEdges", "bordersDoNotSurroundHeader", "bordersDoNotSurroundFooter", "gutterAtTop", "hideSpellingErrors", "hideGrammaticalErrors", "activeWritingStyle", "proofState", "formsDesign", "attachedTemplate", "linkStyles", "stylePaneFormatFilter", "stylePaneSortMethod", "documentType", "mailMerge", "revisionView"]);
async function enableTrackRevisions(zip) {
  const SET = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
  if (!zip.file("word/settings.xml")) {
    zip.file("word/settings.xml", `${DECL}<w:settings xmlns:w="${W}"><w:trackRevisions/></w:settings>`);
    await addPart(zip, "word/settings.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml", SET, "settings.xml", "word/_rels/document.xml.rels");
    return;
  }
  const doc = parse(await zip.file("word/settings.xml").async("string")), root = doc.documentElement;
  if (kids(root).some(c => isW(c, "trackRevisions"))) return;
  const el = wel(doc, "trackRevisions"), list = kids(root), lastBefore = list.filter(c => SETTINGS_BEFORE.has(c.localName)).pop();
  if (lastBefore) lastBefore.nextSibling ? root.insertBefore(el, lastBefore.nextSibling) : root.appendChild(el);
  else root.insertBefore(el, root.firstChild);
  zip.file("word/settings.xml", ser(doc));
}

async function buildColored(buf, findings, now = Date.now()) {
  const zip = await openDocx(buf);
  const { doc, body } = parseBody(await readText(zip, "word/document.xml"));
  const nodes = paragraphNodes(body), byPara = new Map();
  for (const f of findings) (byPara.get(f.para_idx) || byPara.set(f.para_idx, []).get(f.para_idx)).push(f);
  // komentar yang sudah ada (jangan bentrok id)
  let existing = null, maxId = -1;
  if (zip.file("word/comments.xml")) { existing = parse(await zip.file("word/comments.xml").async("string")); for (const c of kids(existing.documentElement)) maxId = Math.max(maxId, parseInt(c.getAttributeNS(W, "id") || c.getAttribute("w:id"), 10) || 0); }
  let id = maxId; const comments = [];
  for (const [idx, fs] of byPara) if (nodes[idx]) colorParagraph(doc, nodes[idx].node, fs, () => ++id, comments);
  zip.file("word/document.xml", ser(doc));
  if (comments.length) {
    const cdoc = existing || parse(`${DECL}<w:comments xmlns:w="${W}"/>`);
    for (const c of comments) {
      const ce = wel(cdoc, "comment", { id: c.id, author: "NextAja", initials: "NA", date: new Date(now).toISOString().replace(/\.\d+Z$/, "Z") });
      for (const line of c.text.split("\n")) { const p = wel(cdoc, "p"), r = wel(cdoc, "r"), t = wel(cdoc, "t"); t.setAttribute("xml:space", "preserve"); t.appendChild(cdoc.createTextNode(line)); r.appendChild(t); p.appendChild(r); ce.appendChild(p); }
      cdoc.documentElement.appendChild(ce);
    }
    zip.file("word/comments.xml", ser(cdoc));
    if (!existing) await addPart(zip, "word/comments.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments", "comments.xml", "word/_rels/document.xml.rels");
  }
  await enableTrackRevisions(zip);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/* ---------- cek ulang ---------- */
const nz = s => s.replace(/\s+/g, " ").trim().toLowerCase();
async function recheck(revisedBuf, originalFindings, cfg) {
  const a = await analyze(revisedBuf);                       // teks "diterima": sisipan dihitung, hapusan diabaikan
  const now = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, cfg);
  const body = nz(a.paragraphs.map(p => p.text).join(" "));
  const still = originalFindings.filter(f => f.text && f.text.length > 12 && body.includes(nz(f.text)));
  const stillBy = {}; for (const f of still) stillBy[f.code] = (stillBy[f.code] || 0) + 1;
  return {
    words: a.wordsBody, now: countByCode(now), before: countByCode(originalFindings),
    unchangedSentences: still.length, unchangedByCode: stillBy,
    unchanged: still.slice(0, 40).map(f => ({ code: f.code, para: f.para_idx + 1, snippet: f.text.slice(0, 90) })),
    note: "Pemeriksaan Internal NextAja: aturan lokal, bukan skor kemiripan dan tidak membandingkan dengan database jurnal atau internet.",
  };
}

/* ---------- ekspor bersih ---------- */
const DROP = new Set(["del", "moveFrom", "rPrChange", "pPrChange", "sectPrChange", "tblPrChange", "tblGridChange", "trPrChange", "tcPrChange", "numberingChange", "cellIns", "cellDel", "cellMerge", "moveFromRangeStart", "moveFromRangeEnd", "moveToRangeStart", "moveToRangeEnd", "commentRangeStart", "commentRangeEnd"]);
function cleanDom(doc) {
  const walk = node => {
    for (const c of kids(node)) {
      if (c.namespaceURI !== W) { walk(c); continue; }
      const n = c.localName, parent = c.parentNode && c.parentNode.localName;
      if (DROP.has(n) || ((n === "ins") && (parent === "rPr" || parent === "trPr"))) { node.removeChild(c); continue; }
      if (n === "r" && kids(c).some(x => isW(x, "commentReference"))) { node.removeChild(c); continue; }
      if (n === "shd" && c.getAttributeNS(W, "color") === MARK || (n === "shd" && c.getAttribute("w:color") === MARK)) { node.removeChild(c); continue; }
      if (n === "ins" || n === "moveTo") { walk(c); while (c.firstChild) node.insertBefore(c.firstChild, c); node.removeChild(c); continue; }
      walk(c);
    }
  };
  walk(doc.documentElement);
}
async function acceptAndClean(buf) {
  const zip = await openDocx(buf);
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(name)) continue;
    const doc = parse(await zip.file(name).async("string")); cleanDom(doc); zip.file(name, ser(doc));
  }
  if (zip.file("word/settings.xml")) {
    const doc = parse(await zip.file("word/settings.xml").async("string"));
    for (const c of kids(doc.documentElement)) if (isW(c, "trackRevisions")) doc.documentElement.removeChild(c);
    zip.file("word/settings.xml", ser(doc));
  }
  // buang bagian komentar beserta relasinya
  const CP = /^word\/(comments|commentsExtended|commentsIds|commentsExtensible|people)\.xml$/;
  const removed = Object.keys(zip.files).filter(n => CP.test(n)); removed.forEach(n => zip.remove(n));
  if (removed.length) {
    if (zip.file("word/_rels/document.xml.rels")) {
      let rels = await zip.file("word/_rels/document.xml.rels").async("string");
      rels = rels.replace(/<Relationship\b[^>]*\/>/g, m => (/Target="(comments|commentsExtended|commentsIds|commentsExtensible|people)\.xml"/.test(m) ? "" : m));
      zip.file("word/_rels/document.xml.rels", rels);
    }
    let ct = await zip.file("[Content_Types].xml").async("string");
    ct = ct.replace(/<Override\b[^>]*PartName="\/word\/(comments|commentsExtended|commentsIds|commentsExtensible|people)\.xml"[^>]*\/>/g, "");
    zip.file("[Content_Types].xml", ct);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

module.exports = { buildColored, recheck, acceptAndClean, FILL, MARK };
