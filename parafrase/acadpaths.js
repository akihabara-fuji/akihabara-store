/* Alamat di domain akademik: tanpa awalan /ruangakademikut. Satu tempat untuk semua penulisan ulang alamat
   (halaman, aset, gambar kartu, hub), dipakai pages.js, blog-akun.js, dan keluaran JSON server.
   Jalur lama /ruangakademikut/... tetap dilayani agar tautan dan hasil Google lama tidak putus. */
"use strict";

const clean = u => String(u || "").replace(/\/+$/, "");
const SHORT = !!process.env.ACAD_URL && clean(process.env.ACAD_URL) !== clean(process.env.SITE_URL || "https://nextaja.com");

const PAGES = "tentang|audit-parafrase|cek-parafrase-mandiri|audit|bedah-laporan|layanan|blog-ut|pesanan|kalkulator-nilai-ut|pasfoto-yudisium|buat-cv-ats|sampul-tugas|surat-lamaran|tracker-kelulusan|kalender-akademik|panduan-maba|sitasi-apa|koin|portal-ut|grup";
const RE_PAGE = new RegExp(`/ruangakademikut/(${PAGES})`, "g");

function shortPaths(s) {
  return String(s)
    .replace(/\/ruangakademikut\/assets\//g, "/assets/ut/")
    .replace(/\/ruangakademikut\/img\//g, "/assets/ut/img/")
    .replace(RE_PAGE, "/$1")
    .replace(/(https?:\/\/[^"'\s<]+?)\/ruangakademikut(?=["'<\s?#)])/g, "$1/layanan-ut")
    .replace(/(["'(=])\/ruangakademikut(?=["'<\s?#)])/g, "$1/layanan-ut");
}

/* alamat untuk keluaran server (JSON, pesan): pendek hanya di domain akademik */
const U = p => (SHORT ? shortPaths(p) : p);

module.exports = { SHORT, PAGES, shortPaths, U };
