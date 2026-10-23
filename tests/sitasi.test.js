"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../parafrase/pages/sitasi-apa");
const A = t => S.parseAuthors(t);

test("penulis: format Belakang, Depan dan Depan Belakang, inisial, lembaga dengan !", () => {
  assert.deepEqual(A("Priyadi, Dika Putra"), [{ last: "Priyadi", first: "Dika Putra" }]);
  assert.deepEqual(A("Dika Priyadi"), [{ last: "Priyadi", first: "Dika" }]);
  assert.deepEqual(A("Sugiyono"), [{ org: "Sugiyono" }]);
  assert.deepEqual(A("!Universitas Terbuka"), [{ org: "Universitas Terbuka" }]);
  assert.equal(S.initials("Jean-Paul Dika"), "J.-P. D.");
  assert.equal(S.authorsRef(A("Priyadi, Dika")), "Priyadi, D.");
  assert.equal(S.authorsRef(A("Priyadi, Dika\nFuji, Akihabara")), "Priyadi, D., & Fuji, A.");
  assert.equal(S.authorsRef(A("A, Budi\nB, Citra\nC, Dewi")), "A, B., B, C., & C, D.");
  assert.equal(S.authorsRef(A("!Universitas Terbuka")), "Universitas Terbuka.");
});
test("lebih dari 20 penulis: 19 pertama, titik-titik, penulis terakhir", () => {
  const list = Array.from({ length: 22 }, (_, i) => ({ last: "N" + (i + 1), first: "X" }));
  const s = S.authorsRef(list);
  assert.match(s, /^N1, X\., N2, X\./); assert.match(s, /N19, X\., \. \. \. N22, X\.$/); assert.doesNotMatch(s, /N20|N21/);
});
test("jurnal", () => {
  const f = { type: "jurnal", authors: A("Priyadi, Dika\nFuji, Akihabara"), year: "2023", title: "Pengaruh belajar daring terhadap motivasi mahasiswa", journal: "Jurnal Pendidikan Terbuka", volume: "12", issue: "2", pages: "101-115", doi: "10.1234/jpt.v12i2.567" };
  const r = S.reference(f, { id: true });
  assert.equal(r.text, "Priyadi, D., & Fuji, A. (2023). Pengaruh belajar daring terhadap motivasi mahasiswa. Jurnal Pendidikan Terbuka, 12(2), 101–115. https://doi.org/10.1234/jpt.v12i2.567");
  assert.equal(r.html, "Priyadi, D., &amp; Fuji, A. (2023). Pengaruh belajar daring terhadap motivasi mahasiswa. <i>Jurnal Pendidikan Terbuka</i>, <i>12</i>(2), 101–115. https://doi.org/10.1234/jpt.v12i2.567");
});
test("buku, dengan dan tanpa edisi, nama tunggal", () => {
  const f = { type: "buku", authors: A("Sugiyono"), year: "2019", title: "Metode penelitian kuantitatif, kualitatif, dan R&D", edition: "2", publisher: "Alfabeta" };
  assert.equal(S.reference(f, { id: true }).text, "Sugiyono. (2019). Metode penelitian kuantitatif, kualitatif, dan R&D (Edisi ke-2). Alfabeta.");
  assert.equal(S.reference(f, {}).text, "Sugiyono. (2019). Metode penelitian kuantitatif, kualitatif, dan R&D (2nd ed.). Alfabeta.");
  assert.equal(S.reference({ ...f, edition: "" }, { id: true }).html, "Sugiyono. (2019). <i>Metode penelitian kuantitatif, kualitatif, dan R&amp;D</i>. Alfabeta.");
});
test("web: tanggal, situs sama dengan lembaga tidak diulang, tanpa tanggal", () => {
  const f = { type: "web", authors: A("!Universitas Terbuka"), year: "2026", month: "3", day: "5", title: "Panduan registrasi mahasiswa", site: "Universitas Terbuka", url: "https://www.ut.ac.id/panduan" };
  assert.equal(S.reference(f, { id: true }).text, "Universitas Terbuka. (2026, 5 Maret). Panduan registrasi mahasiswa. https://www.ut.ac.id/panduan");
  assert.equal(S.reference({ ...f, site: "Situs Resmi" }, { id: true }).text, "Universitas Terbuka. (2026, 5 Maret). Panduan registrasi mahasiswa. Situs Resmi. https://www.ut.ac.id/panduan");
  assert.match(S.reference({ ...f, year: "" }, { id: true }).text, /\(t\.t\.\)/);
  assert.match(S.reference({ ...f, year: "" }, {}).text, /\(n\.d\.\)/);
});
test("skripsi", () => {
  const f = { type: "skripsi", authors: A("Priyadi, Dika"), year: "2022", title: "Efektivitas tutorial online", thesis: "Skripsi", university: "Universitas Terbuka" };
  assert.equal(S.reference(f, { id: true }).text, "Priyadi, D. (2022). Efektivitas tutorial online [Skripsi tidak dipublikasikan, Universitas Terbuka].");
  assert.equal(S.reference({ ...f, published: true, repo: "Repository UT", url: "https://repository.ut.ac.id/1" }, { id: true }).text, "Priyadi, D. (2022). Efektivitas tutorial online [Skripsi, Universitas Terbuka]. Repository UT. https://repository.ut.ac.id/1");
});
test("tanpa penulis: judul pindah ke depan", () => {
  const r = S.reference({ type: "jurnal", authors: [], year: "2020", title: "Studi tanpa nama", journal: "Jurnal X", volume: "1" }, { id: true });
  assert.equal(r.text, "Studi tanpa nama. (2020). Jurnal X, 1.");
});
test("kutipan dalam teks", () => {
  const f = n => ({ type: "jurnal", year: "2023", title: "t", authors: A(n) });
  assert.deepEqual(S.inText(f("Priyadi, Dika"), { id: true }), { paren: "(Priyadi, 2023)", narrative: "Priyadi (2023)" });
  assert.equal(S.inText(f("Priyadi, Dika\nFuji, Akihabara"), { id: true }).paren, "(Priyadi & Fuji, 2023)");
  assert.equal(S.inText(f("Priyadi, Dika\nFuji, Akihabara"), { id: true }).narrative, "Priyadi dan Fuji (2023)");
  assert.equal(S.inText(f("A, B\nC, D\nE, F"), { id: true }).paren, "(A dkk., 2023)");
  assert.equal(S.inText(f("A, B\nC, D\nE, F"), {}).paren, "(A et al., 2023)");
  assert.equal(S.inText({ ...f("A, B"), cite_page: "12-14" }, { id: true }).paren, "(A, 2023, hlm. 12-14)");
  assert.equal(S.inText({ ...f("A, B"), cite_page: "12" }, {}).paren, "(A, 2023, p. 12)");
});
test("urut abjad dan peringatan", () => {
  const l = S.sortList([{ authors: A("Zed, A"), year: "2020" }, { authors: A("Adi, B"), year: "2021" }, { authors: [], title: "The Mango", year: "2019" }]);
  assert.deepEqual(l.map(x => (x.authors[0] || {}).last || x.title), ["Adi", "The Mango", "Zed"]);
  const w = S.checks({ type: "jurnal", authors: [], title: "Pengaruh Belajar Daring Terhadap Motivasi Mahasiswa Terbuka" }, { id: true });
  assert.ok(w.some(x => /Nama jurnal/.test(x)) && w.some(x => /huruf kapital/.test(x)) && w.some(x => /Tanpa penulis/.test(x)));
});
