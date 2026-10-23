/* Aturan revisi gratis. Revisi gratis berlaku untuk hasil buatan kami (pesanan asli atau hasil revisi sebelumnya).
   Tiap hasil yang sudah terkirim bisa direvisi gratis 1x, dan hasil revisinya bisa direvisi lagi gratis,
   sehingga mahasiswa boleh kembali selama hasilnya masih belum sesuai catatan tutor. Paket komplit Metopen tanpa batas. */
"use strict";
const familyOf = sv => (sv && sv.kind === "revisi" ? sv.of : sv && sv.kind) || null;
/* parent: baris pesanan induk; parentSv: definisi layanan induk; used: jumlah revisi yang sudah dibuat dari induk ini.
   Mengembalikan null jika boleh gratis, atau {status, error}. */
function checkFree({ sv, parent, parentSv, wa, used }) {
  if (!parent || parent.doc_type !== "layanan" || parent.wa_number !== wa || familyOf(parentSv) !== sv.of) return { status: 404, error: "ID pesanan tidak cocok dengan nomor WhatsApp atau jenis layanannya." };
  if (parent.status !== "terkirim") return { status: 409, error: "Pesanan itu belum selesai, jadi belum bisa direvisi." };
  if (used >= 1 && parent.service !== "metopen_paket") return { status: 409, error: "Pesanan ini sudah pernah direvisi. Kalau hasil revisinya masih belum sesuai catatan tutor, isi ID pesanan revisi yang terakhir (bukan ID pesanan awal), tetap gratis." };
  return null;
}
module.exports = { checkFree, familyOf };
