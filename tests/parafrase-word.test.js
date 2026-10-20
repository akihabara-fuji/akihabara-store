"use strict";
const test = require("node:test");
const assert = require("node:assert");
const JSZip = require("jszip");
const { analyze } = require("../parafrase/docx");
const { analyzeFindings } = require("../parafrase/rules");
const { buildColored, recheck, acceptAndClean, MARK } = require("../parafrase/wordtools");

const CFG = { long_sentence_words: 35 };
const R = (t, rpr = "") => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const BODY =
  `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${R("Judul Uji Dokumen Parafrase")}</w:p>` +
  `<w:p>${R("Kalimat pembuka yang aman dan cukup panjang untuk dibaca. ", "<w:b/>")}${R("Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan. ")}${R("Sebanyak 45 persen perusahaan melaporkan peningkatan efisiensi operasional setelah digitalisasi.", "<w:i/>")}</w:p>` +
  `<w:p>${R("Paragraf kedua biasa saja tanpa catatan apa pun di dalamnya sama sekali.")}</w:p>`;
async function make() {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${BODY}</w:body></w:document>`);
  return z.generateAsync({ type: "nodebuffer" });
}
const part = async (buf, n) => (await JSZip.loadAsync(buf)).file(n) ? (await (await JSZip.loadAsync(buf)).file(n).async("string")) : null;

test("Word berwarna: teks tidak berubah, ada warna + komentar + Track Changes, format asli (tebal/miring) terjaga", async () => {
  const orig = await make(), a = await analyze(orig);
  const f = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, CFG);
  assert.ok(f.length >= 2);
  const colored = await buildColored(orig, f);
  const b = await analyze(colored);
  assert.deepStrictEqual(b.paragraphs.map(p => p.text.replace(/\s+/g, " ").trim()), a.paragraphs.map(p => p.text.replace(/\s+/g, " ").trim()), "teks harus sama persis");
  const doc = await part(colored, "word/document.xml");
  assert.ok(doc.includes(`w:color="${MARK}"`) && /w:fill="[0-9A-F]{6}"/.test(doc));
  assert.ok(doc.includes("<w:b/>") && doc.includes("<w:i/>"), "format asli hilang");
  assert.ok(doc.includes("commentRangeStart") && doc.includes("commentReference"));
  const cm = await part(colored, "word/comments.xml");
  assert.ok(cm.includes("[K]") || cm.includes("[O]") || cm.includes("[B]"));
  assert.ok((await part(colored, "[Content_Types].xml")).includes("/word/comments.xml"));
  assert.ok((await part(colored, "word/_rels/document.xml.rels")).includes("comments.xml"));
  assert.ok((await part(colored, "word/settings.xml")).includes("<w:trackRevisions/>"));
  assert.ok(doc.startsWith("<?xml"));
  // paragraf tanpa catatan tidak disentuh
  assert.ok(doc.includes("Paragraf kedua biasa saja"));
});

test("ekspor bersih: terima perubahan, buang warna/komentar/Track Changes, teks revisi utuh", async () => {
  const orig = await make(), a = await analyze(orig);
  const f = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, CFG);
  let colored = await buildColored(orig, f);
  // simulasi admin: hapus satu kalimat (w:del) dan sisipkan kalimat baru (w:ins)
  const zip = await JSZip.loadAsync(colored);
  let doc = await zip.file("word/document.xml").async("string");
  doc = doc.replace("Paragraf kedua biasa saja tanpa catatan apa pun di dalamnya sama sekali.",
    "Paragraf kedua biasa saja.</w:t></w:r><w:del w:id=\"90\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:delText>KALIMAT TERHAPUS</w:delText></w:r></w:del><w:ins w:id=\"91\" w:author=\"A\" w:date=\"2026-01-01T00:00:00Z\"><w:r><w:t xml:space=\"preserve\"> Kalimat hasil parafrase baru.</w:t></w:r></w:ins><w:r><w:t>");
  zip.file("word/document.xml", doc);
  const revised = await zip.generateAsync({ type: "nodebuffer" });
  const clean = await acceptAndClean(revised);
  const cdoc = await part(clean, "word/document.xml");
  for (const bad of ["<w:del", "<w:ins", "commentRange", "commentReference", MARK, "KALIMAT TERHAPUS"]) assert.ok(!cdoc.includes(bad), "sisa: " + bad);
  assert.ok(cdoc.includes("Kalimat hasil parafrase baru."));
  assert.strictEqual(await part(clean, "word/comments.xml"), null);
  assert.ok(!(await part(clean, "[Content_Types].xml")).includes("comments.xml"));
  assert.ok(!(await part(clean, "word/_rels/document.xml.rels")).includes("comments.xml"));
  assert.ok(!(await part(clean, "word/settings.xml")).includes("trackRevisions"));
  assert.ok(cdoc.includes("<w:b/>"), "format tebal terjaga");
  const b = await analyze(clean);
  assert.ok(b.paragraphs.map(p => p.text).join(" ").includes("Kalimat hasil parafrase baru."));
});

test("cek ulang: kalimat yang belum diubah terdeteksi, yang sudah ditulis ulang tidak", async () => {
  const orig = await make(), a = await analyze(orig);
  const f = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, CFG);
  const same = await recheck(orig, f, CFG);
  assert.strictEqual(same.unchangedSentences, f.filter(x => x.text.length > 12).length);
  const zip = await JSZip.loadAsync(orig);
  let doc = await zip.file("word/document.xml").async("string");
  doc = doc.replace("Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan.", "Menurut Rahman (2020), koordinasi antardivisi berperan besar dalam keberhasilan strategi perusahaan.");
  zip.file("word/document.xml", doc);
  const after = await recheck(await zip.generateAsync({ type: "nodebuffer" }), f, CFG);
  assert.ok(after.unchangedSentences < same.unchangedSentences);
  assert.ok(/bukan skor kemiripan/.test(after.note));
});
