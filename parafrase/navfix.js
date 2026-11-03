/* Navigator & footer terpusat untuk semua halaman Catatan Akademik. Dipanggil di server (render pages.js dan blog-akun.js),
   jadi satu tempat mengubah menu di ~27 halaman. Tautan lama (pesanan, masuk) tetap hidup; hanya disembunyikan dari tampilan. */
"use strict";
const J = ["diskusi", "tugas", "makalah", "jurnal", "metopen"];
const JN = { diskusi: ["Diskusi", "Cara menyusun jawaban diskusi sendiri"], tugas: ["Tugas", "Memahami soal sampai memeriksa"], makalah: ["Makalah", "Kerangka, isi, daftar pustaka"], jurnal: ["Jurnal", "Telaah jurnal langkah demi langkah"], metopen: ["Metodologi Penelitian", "Proposal dan tugas Metopen"] };
const ALAT = '<details class="dd"><summary class="dds{ON}">Alat UT</summary><div class="ddp desc two end"><a href="/ruangakademikut/portal-ut"><b>Info Alat UT</b><small>Tautan resmi UT di satu tempat</small></a><a href="/ruangakademikut/kalkulator-nilai-ut"><b>Kalkulator Nilai UT</b><small>Nilai akhir dan target IPK</small></a><a href="/ruangakademikut/tracker-kelulusan"><b>Tracker Kelulusan &amp; IPK</b><small>SKS lulus dan sisa semester</small></a><a href="/ruangakademikut/kalender-akademik"><b>Kalender &amp; Pengingat</b><small>Tanggal penting jadi pengingat</small></a><a href="/ruangakademikut/sampul-tugas"><b>Sampul &amp; Template Tugas</b><small>Sampul TMK, UAS, makalah</small></a><a href="/ruangakademikut/sitasi-apa"><b>Generator Sitasi APA</b><small>Rapikan daftar pustaka</small></a><a href="/ruangakademikut/bedah-data-ut"><b>Bedah Data UT</b><small>Periksa kalimat tulisanmu sendiri</small></a></div></details>';

/* active: tuton | komunitas | alat | maba | blog | "" */
function navLinks({ active = "", cek = false } = {}) {
  const on = k => (active === k ? " on" : "");
  const dd = '<details class="dd"><summary class="dds' + on("tuton") + '">Kelas Tuton</summary><div class="ddp desc"><a href="/ruangakademikut/tutorial-online"><b>Semua Kelas Tuton</b><small>Pilih jenis, belajar di tempat</small></a>'
    + J.map(k => '<a href="/ruangakademikut/tutorial-online?j=' + k + '"><b>' + JN[k][0] + "</b><small>" + JN[k][1] + "</small></a>").join("") + "</div></details>";
  return '<nav class="links" id="links" aria-label="Menu utama">' + dd
    + '<a href="/ruangakademikut/komunitas" class="' + on("komunitas").trim() + '">Komunitas</a>'
    + ALAT.replace("{ON}", on("alat"))
    + '<a href="/ruangakademikut/panduan-maba" class="' + on("maba").trim() + '">Panduan Maba</a>'
    + '<a href="/ruangakademikut/blog-ut" class="' + on("blog").trim() + '">Blog</a>'
    + (cek ? '<a href="/ruangakademikut/pesanan" class="only-m">Cek Pesanan</a>' : "") + "</nav>";
}
const FILE_ACTIVE = { "tutorial-online.html": "tuton", "komunitas.html": "komunitas", "kegiatan.html": "komunitas", "panduan-maba.html": "maba", "blog-ut.html": "blog", "bedah.html": "alat", "portal-ut.html": "alat", "alat-nilai.html": "alat", "alat-sampul.html": "alat", "alat-tracker.html": "alat", "alat-kalender.html": "alat", "sitasi.html": "alat" };
const HIDE_PRICE = "<style>.price,.soon-p,[data-harga]{display:none!important}</style>";

function fix(html, { file = "", active, cek = false, harga = false } = {}) {
  let h = String(html);
  const a = active != null ? active : (FILE_ACTIVE[file] || "");
  h = h.replace(/<nav class="links" id="links"[\s\S]*?<\/nav>/, () => navLinks({ active: a, cek }));
  if (!cek) {
    h = h.replace(/<a [^>]*class="nav-ord"[^>]*>[\s\S]*?<\/a>/g, "");
    h = h.replace(/<div class="top">File dihapus otomatis[\s\S]*?<\/div>/, "");
    h = h.replace(/<a [^>]*aria-label="Cek pesanan"[^>]*>[\s\S]*?<\/a>/g, "").replace(/<a [^>]*href="[^"]*\/pesanan"[^>]*>\s*Cek Pesanan\s*<\/a>/g, "")
      .replace(/Pantau statusnya di Cek Pesanan/g, "Pantau statusnya lewat tautan pesananmu").replace(/Pantau di Cek Pesanan/g, "Pantau lewat tautan pesananmu");
  }
  /* "Masuk": tetap ada di DOM (skrip halaman memakainya) tapi tidak tampil */
  h = h.replace(/<a ([^>]*id="navAcc"[^>]*)>/g, (m, at) => /\bhidden\b/.test(at) ? m : "<a hidden style=\"display:none\" " + at + ">")
    .replace(/<a (class="btn[^"]*" href="\/ms\/masuk")>Masuk<\/a>/g, "<a hidden style=\"display:none\" $1>Masuk</a>")
    .replace(/<a href="\/ms\/masuk">(?:Masuk)<\/a>/g, "");
  h = h.replace(/<small class="ft-dis">[^<]*<\/small>/, '<small class="ft-dis">Situs informasi independen, bukan situs resmi Universitas Terbuka (UT). Cocokkan informasi dengan ut.ac.id.</small>');
  if (!/ft-dis/.test(h)) h = h.replace(/(<small>© [^<]*<\/small>)(<\/div><nav class="ft-n")/, '$1<small class="ft-dis">Situs informasi independen, bukan situs resmi Universitas Terbuka (UT). Cocokkan informasi dengan ut.ac.id.</small>$2');
  if (!harga) h = h.replace("</head>", HIDE_PRICE + "</head>");
  return h;
}
module.exports = { fix, navLinks, J, JN };
