"use strict";
/* Syarat berkas tiap tahap Metopen: tahap berikutnya wajib melampirkan hasil tahap sebelumnya dan catatan tutor. */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const { requirements, checkStage } = require("../parafrase/metopen");

test("syarat per tahap: Tugas 3 butuh Tugas 1 dan Tugas 2 plus catatan tutor; Tugas 1 dan paket komplit mulai dari nol", () => {
  assert.deepStrictEqual(requirements("metopen3"), { needs: ["Tugas 1", "Tugas 2"], tutorNote: true });
  assert.deepStrictEqual(requirements("metopen2"), { needs: ["Tugas 1"], tutorNote: true });
  assert.deepStrictEqual(requirements("metopen4"), { needs: ["Tugas 1", "Tugas 2", "Tugas 3"], tutorNote: true });
  for (const k of ["metopen1", "metopen_paket", "tugas", "diskusi", "revisi_metopen"]) assert.deepStrictEqual(requirements(k), { needs: [], tutorNote: false }, k);
});

test("validasi pesanan Tugas 3: file tahap sebelumnya wajib, catatan tutor opsional (boleh kosong, dikerjakan sesuai template)", () => {
  const L = "Metopen Tugas 3", note = "Tutor minta rumusan masalah dipertajam dan teori dihubungkan ke variabel.";
  assert.match(checkStage("metopen3", L, 1, note), /Tugas 1 dan Tugas 2/);
  assert.match(checkStage("metopen3", L, 0, note), /Tugas 1 dan Tugas 2/);
  assert.strictEqual(checkStage("metopen3", L, 2, ""), null, "tanpa catatan tutor tetap diterima");
  assert.strictEqual(checkStage("metopen3", L, 2, note), null);
  assert.strictEqual(checkStage("metopen3", L, 3, ""), null, "catatan tutor boleh berupa file ketiga");
  assert.strictEqual(checkStage("metopen1", "Metopen Tugas 1", 0, "Masalah di tempat kerja saya adalah absensi"), null);
  assert.strictEqual(checkStage("tugas", "Tugas", 0, "soal ada di file"), null, "layanan lain tidak terpengaruh");
});

test("server memakai syarat itu, config mengirimkannya, dan halaman menampilkan catatan progres dan tautan Revisi", () => {
  const srv = fs.readFileSync(path.join(__dirname, "..", "parafrase", "layanan.js"), "utf8");
  assert.ok(/checkStage\(b\.service, sv\.label, files\.length, brief\)/.test(srv) && /\.\.\.requirements\(k\)/.test(srv) && /MAX_FILES = 5/.test(srv));
  const html = fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", "layanan.html"), "utf8");
  assert.ok(/Progres ini akan dikerjakan tim admin Catatan Akademik/.test(html) && /Jika ada revisi, silakan ke menu <a href="\/ruangakademikut\/layanan\?s=revisi_metopen">Revisi/.test(html));
  assert.ok(/id="slots"/.test(html));
  assert.ok(/Panduan catatan tutor/.test(html) && /Tidak ada catatan\? Kosongkan saja/.test(html) && /sesuai template yang berlaku/.test(html));
  assert.ok(/Admin Catatan Akademik mengirim file hasil ke WhatsApp-mu sesuai status pesanan/.test(html));
});
