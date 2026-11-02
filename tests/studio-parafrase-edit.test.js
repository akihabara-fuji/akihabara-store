"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const studio = require("../parafrase/studio");
const { analyze } = require("../parafrase/docx");

const paras = [
  { idx: 0, text: "Kalimat satu ini cukup jelas. Kalimat dua juga ada di sini. Kalimat tiga menutup paragraf ini." },
  { idx: 1, text: "Paragraf kedua tidak berubah sama sekali." },
];

test("parasToEdits: jumlah kalimat sama -> hanya kalimat yang berubah", () => {
  const e = studio.parasToEdits(paras, { 0: "Kalimat satu ini cukup jelas. Kalimat dua diganti total. Kalimat tiga menutup paragraf ini.", 1: paras[1].text });
  assert.deepEqual(e, [{ para_idx: 0, sent_idx: 1, text: "Kalimat dua diganti total." }]);
});
test("parasToEdits: jumlah kalimat beda -> seluruh paragraf ditaruh di kalimat pertama", () => {
  const e = studio.parasToEdits(paras, { 0: "Satu kalimat saja sekarang." });
  assert.equal(e.length, 3); assert.equal(e[0].text, "Satu kalimat saja sekarang."); assert.equal(e[1].text, ""); assert.equal(e[2].text, "");
});
test("parasToEdits: tanpa perubahan atau indeks asing -> kosong", () => {
  assert.deepEqual(studio.parasToEdits(paras, { 0: paras[0].text, 9: "x" }), []);
  assert.deepEqual(studio.parasToEdits(paras, null), []);
});
test("newFacts: angka dan nama baru terdeteksi, yang sudah ada di sumber tidak", () => {
  const src = "Menurut Budi, hasil survei naik 20% pada 2020. Hal ini penting.";
  assert.deepEqual(studio.newFacts(src, "Hasil survei naik 20% pada 2020."), []);
  const x = studio.newFacts(src, "Hasil survei naik 35% pada 2021, kata Rina.");
  assert.ok(x.includes("35%") && x.includes("2021"));
});
test("revisePrompt: memuat larangan fakta baru, batas kata, dan kalimat sumber", () => {
  const p = studio.revisePrompt({ text: "Kalimat sumber.", tags: [{ label: "Umum", fix: "Beri detail.", jangan: "Jangan menambah angka." }] }, "Paragraf konteks.", 35);
  for (const k of ["Kalimat sumber.", "Paragraf konteks.", "35", "[butuh data dari mahasiswa]", "Dilarang menambah angka"]) assert.ok(p.includes(k), k);
});
test("alur lengkap: edit paragraf -> docx baru, kalimat lain utuh", async () => {
  const src = await studio.plainDocx(paras, null, null);
  const a = await analyze(src);
  const edits = studio.parasToEdits(a.paragraphs, { [a.paragraphs[0].idx]: "Kalimat satu ini cukup jelas. Kalimat dua diganti total. Kalimat tiga menutup paragraf ini." });
  const r = await studio.applyEdits(src, edits);
  assert.equal(r.skipped.length, 0);
  const b = await analyze(r.buf), t = b.paragraphs.map(p => p.text).join("\n");
  assert.ok(t.includes("Kalimat dua diganti total.")); assert.ok(!t.includes("Kalimat dua juga ada")); assert.ok(t.includes("Paragraf kedua tidak berubah sama sekali."));
  assert.ok(src.length > 0 && (await analyze(src)).paragraphs[0].text.includes("Kalimat dua juga ada"), "sumber tidak berubah");
});
