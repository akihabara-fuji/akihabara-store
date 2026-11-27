/* Kisi-kisi: isi halaman (HTML dari server, agar terbaca mesin pencari). Dibungkus shell.html oleh pages.js. */
"use strict";
const EH = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rp = n => "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const HEADX = '<link rel="stylesheet" href="/ruangakademikut/assets/kisi.css?v=3">';
const FOOT = '<script src="/ruangakademikut/assets/kisi.js?v=2" defer></script>';

module.exports = function buildKisi(kisi) {
  const card = m => `<a class="ks-card" href="/ruangakademikut/kisi-kisi/${EH(m.slug)}" data-q="${EH((m.kode + " " + m.nama).toLowerCase())}"><div class="ks-cover${m.jenis === "Uraian" ? " u" : ""}"><span class="ks-chip">KISI-KISI</span><div class="ks-ct">${EH(m.nama)}</div><div class="ks-by"><span>Catatan Akademik</span><span>catatanakademik.com</span></div></div><div class="ks-body"><span class="ks-pill">${EH(m.kode)} · ${EH(m.jenis)}</span><h3>Kisi-kisi ${EH(m.nama)}</h3><p>5 soal latihan gratis, plus kisi-kisi lengkap periode ${EH(m.periode)}.</p><div class="ks-meta">Periode ${EH(m.periode)} · 5 soal gratis</div><span class="ks-rd">Latihan →</span></div></a>`;

  function katalog() {
    const items = kisi.list();
    return {
      title: "Kisi-kisi UT: Latihan 5 Soal Gratis per Mata Kuliah | Catatan Akademik",
      desc: "Ujian UT tinggal hitungan hari. Coba 5 soal latihan gratis untuk tiap mata kuliah, lalu lihat bagian mana yang belum nempel.",
      canon: "/ruangakademikut/kisi-kisi", headx: HEADX,
      body: `<main class="wrap ks"><a class="ks-back" href="/" data-back>← Kembali</a><br><span class="ks-eb">Kisi-kisi UT</span><h1>Ujian tinggal hitungan hari. <em>Latihan dulu</em> 5 soalnya.</h1><p class="ks-lead">Pilih mata kuliahmu, coba soal latihannya gratis, lalu lihat bagian mana yang belum nempel sebelum hari ujian.</p><input class="ks-s" id="ksq" type="search" placeholder="Cari kode atau nama mata kuliah" aria-label="Cari mata kuliah" autocomplete="off"><div class="ks-grid" id="ksgrid" data-max="8">${items.map(card).join("") || "<p>Belum ada mata kuliah.</p>"}</div><p class="ks-none" id="ksnone" hidden>Mata kuliah tidak ditemukan.</p>${items.length > 8 ? `<div class="ks-more" id="ksmore"><button class="ks-btn ghost" type="button">Lihat semua ${items.length} mata kuliah</button></div>` : ""}</main>${FOOT}`,
    };
  }

  function mk(slug) {
    const r = kisi.bySlug(slug); if (!r) return null;
    const soal = kisi.soalOf(r);
    const data = { slug: r.slug, nama: r.nama, kode: r.kode, harga: r.harga, ada_file: !!r.file_path, soal: soal.map(s => ({ k: s.k, b: s.b })) };
    const qs = soal.map((s, i) => `<fieldset class="ks-q"><legend>${i + 1}. ${EH(s.q)}</legend>${s.o.map((o, j) => `<label><input type="radio" name="s${i}" value="${j}"> <span>${"ABCD"[j]}. ${EH(o)}</span></label>`).join("")}<p class="ks-pb" hidden></p></fieldset>`).join("");
    return {
      title: `Kisi-kisi ${r.nama} (${r.kode}) UT: Latihan 5 Soal Gratis | Catatan Akademik`,
      desc: `Siap ujian ${r.nama}? Tes 5 soal latihan gratis, cek jawabanmu, lalu ambil kisi-kisi lengkap periode ${r.periode}.`,
      canon: "/ruangakademikut/kisi-kisi/" + r.slug, headx: HEADX,
      body: `<main class="wrap ks" id="ksmk" data-mk="${EH(JSON.stringify(data))}"><a class="ks-back" href="/ruangakademikut/kisi-kisi">← Semua mata kuliah</a><div class="ks-url"><span>catatanakademik.com<b>/kisi-kisi/${EH(r.slug)}</b></span><button class="ks-btn sm" type="button" id="kscopy">Salin link</button></div><div class="ks-tags"><span>${EH(r.kode)}</span><span>${EH(r.jenis)}</span><span>Periode ${EH(r.periode)}</span></div><h1>Siap ujian <em>${EH(r.nama)}</em>? Tes 5 soalnya dulu.</h1><p class="ks-lead">Jawab 5 soal ini, lalu cek hasilnya. Gratis, tanpa daftar.</p><form id="ksform" onsubmit="return false">${qs}</form><div class="ks-act"><button class="ks-btn ghost" type="button" id="kscek">Cek jawaban</button><span id="kshasil" role="status"></span></div><section class="ks-lock" aria-label="Kisi-kisi lengkap"><div class="ks-blur" aria-hidden="true"><b>Soal 6 sampai selesai</b><br>Bagian ini berisi kisi-kisi lengkap dan soal latihan tambahan untuk ${EH(r.nama)}. Dikirim sebagai berkas ke WhatsApp setelah pembayaran dikonfirmasi admin.<br><br>Bahasan inti, daftar topik yang sering keluar, dan soal berlatih tambahan.</div><div class="ks-cta"><h3>Mau kisi-kisi lengkap?</h3><span class="ks-sub">Bayar lewat QRIS, admin konfirmasi, file dikirim ke WhatsApp</span><button class="ks-btn" type="button" id="kspay">Mau kisi-kisi lengkap · ${rp(r.harga)}</button>${r.file_path ? '<span class="ks-sub sm">Punya kode voucher? Masukkan saat bayar</span>' : ""}</div></section>${r.file_path ? `<section class="ks-vban"><span class="ks-eb dark">Voucher</span><h2>${rp(r.harga)} jadi <em>${rp(Math.round(r.harga * 0.4))}</em>. Syaratnya cuma bagikan ke 5 grup.</h2><p>Bagikan link halaman ini ke 5 grup WhatsApp atau Telegram, kirim screenshot buktinya, dan kode voucher 60% dikirim ke WhatsApp-mu setelah admin cek valid.</p><button class="ks-btn acc" type="button" id="ksklaim">Klaim potongan 60%</button></section>` : ""}</main>${FOOT}`,
    };
  }

  function pesanan() {
    return { title: "Status pesanan Kisi-kisi | Catatan Akademik", desc: "Status pesanan kisi-kisi.", canon: "", robots: "noindex,nofollow", headx: HEADX,
      body: `<main class="wrap ks" id="kspesanan"><a class="ks-back" href="/ruangakademikut/kisi-kisi">← Semua mata kuliah</a><h1>Status pesanan</h1><div id="ksps">Memuat...</div></main>${FOOT}` };
  }
  return { katalog, mk, pesanan, card };
};
