"use strict";
const test = require("node:test"), assert = require("node:assert");
const JSZip = require("jszip");
const wordtools = require("../parafrase/wordtools");
const { analyze } = require("../parafrase/docx");
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
async function makeDocx(paras) {
  const z = new JSZip();
  z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const body = paras.map(t => `<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`).join("");
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`);
  return z.generateAsync({ type: "nodebuffer" });
}
test("buildBlue: hanya kalimat bertanda yang biru, teks dan huruf lain tetap, tanpa komentar", async () => {
  const buf = await makeDocx(["Kalimat satu ada di sini. Kalimat dua yang ditandai UT. Kalimat tiga biasa saja.", "Paragraf lain tidak ditandai sama sekali."]);
  const a = await analyze(buf);
  const out = await wordtools.buildBlue(buf, [{ para_idx: a.paragraphs[0].idx, sent_idx: 1, code: "X", reason: "UT" }]);
  const z = await JSZip.loadAsync(out), xml = await z.file("word/document.xml").async("string");
  const blue = [...xml.matchAll(/<w:r>(?:(?!<\/w:r>).)*?<w:color w:val="0000FF"\/>(?:(?!<\/w:r>).)*?<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]);
  assert.deepStrictEqual(blue.map(s => s.trim()), ["Kalimat dua yang ditandai UT."]);
  assert.match(xml, /Kalimat satu ada di sini\./); assert.match(xml, /Kalimat tiga biasa saja\./); assert.match(xml, /Paragraf lain tidak ditandai sama sekali\./);
  assert.ok(/w:rFonts w:ascii="Arial"/.test(xml) && /<w:b\/>/.test(xml) && /w:sz w:val="24"/.test(xml));
  assert.ok(!/w:shd/.test(xml) && !z.file("word/comments.xml") && !z.file("word/settings.xml"));
});
test("buildColored: catatan 'tidak menjamin nilai Drillbit turun' ada di paragraf pertama, kalimat tetap berwarna dengan rekomendasi", async () => {
  const buf = await makeDocx(["Kalimat satu ada di sini. Kalimat dua yang ditandai UT. Kalimat tiga biasa saja."]);
  const a = await analyze(buf);
  const out = await wordtools.buildColored(buf, [{ para_idx: a.paragraphs[0].idx, sent_idx: 1, code: "X", reason: "", note: "Perbaiki: tambah data sendiri." }], Date.now(), { notice: "CATATAN: Hasil ini tidak menjamin nilai Drillbit turun." });
  const z = await JSZip.loadAsync(out), xml = await z.file("word/document.xml").async("string");
  assert.ok(xml.indexOf("tidak menjamin nilai Drillbit turun") < xml.indexOf("Kalimat satu"));
  assert.match(xml, /w:shd/); assert.ok(z.file("word/comments.xml"));
  assert.match(await z.file("word/comments.xml").async("string"), /tambah data sendiri/);
});
