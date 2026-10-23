/* Syarat berkas per tahap Metopen. Tugas berikutnya dibangun di atas tugas sebelumnya, jadi pemesan wajib melampirkan hasil tahap
   sebelumnya dan catatan dari tutor. Fungsi murni (tanpa database) supaya mudah diuji. */
"use strict";

const NEEDS = {
  metopen1: [],
  metopen2: ["Tugas 1"],
  metopen3: ["Tugas 1", "Tugas 2"],
  metopen4: ["Tugas 1", "Tugas 2", "Tugas 3"],
  metopen_paket: [],
};
const NEEDS_NOTE = new Set(["metopen2", "metopen3", "metopen4"]);

/* { needs: ["Tugas 1", ...], tutorNote: bool } untuk layanan; kosong bila bukan tahap yang bergantung. */
function requirements(service) { return { needs: (NEEDS[service] || []).slice(), tutorNote: NEEDS_NOTE.has(service) }; }

/* Mengembalikan pesan galat (string) atau null bila syarat terpenuhi. files: jumlah berkas terlampir (sudah divalidasi isinya). */
function checkStage(service, label, fileCount, brief) {
  const r = requirements(service);
  if (r.needs.length && fileCount < r.needs.length) return `${label} dibangun dari tugas sebelumnya. Lampirkan file ${r.needs.join(" dan ")} (satu file per tahap).`;
  if (r.tutorNote && String(brief || "").trim().length < 10 && fileCount <= r.needs.length) return "Sertakan catatan dari tutor: tempel di kotak kebutuhan, atau lampirkan filenya.";
  return null;
}

module.exports = { requirements, checkStage, NEEDS };
