/* Kisi-kisi: isi halaman (HTML dari server, agar terbaca mesin pencari). Dibungkus shell.html oleh pages.js. */
"use strict";
const EH = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rp = n => "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const HEADX = '<link rel="stylesheet" href="/ruangakademikut/assets/kisi.css?v=9">';
const FOOT = '<script src="/ruangakademikut/assets/kisi.js?v=4" defer></script>';

module.exports = function buildKisi(kisi) {
  const pill = (kode, jenis) => EH(kode) + (jenis ? " · " + EH(jenis) : "");
  /* 5 pola deskripsi kartu (dipilih dari kode MK) supaya teks tiap kartu tidak seragam. Sama persis dengan versi di pages/kisi.js. */
  const jt = j => (j === "Objektif" ? "pilihan ganda (objektif)" : j === "Uraian" ? "uraian" : "");
  const vi = k => { let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 5; return h; };
  const ket = m => {
    const t = jt(m.jenis), n = EH(m.nama), k = EH(m.kode), p = EH(m.periode);
    const a = [
      `Kisi-kisi UAS UT ${n} periode ${p}${t ? ", ujian " + t : ""}.`,
      `Persiapan UAS ${k} (${n}): latihan soal dan kisi-kisi lengkap.`,
      `Cek kesiapan UAS ${n} lewat latihan soal ${t || "mata kuliah"} periode ${p}.`,
      `${k}: latihan soal ${t ? t + " " : ""}${n} untuk UAS periode ${p}.`,
      `Belajar ${n} jelang UAS UT? Buka kisi-kisi lengkap periode ${p}.`,
    ][vi(m.kode)];
    return a + (m.jml_soal > 0 ? " 5 soal latihan gratis." : "");
  };
  const card = m => `<a class="ks-card" href="/ruangakademikut/kisi-kisi/${EH(m.slug)}" data-q="${EH((m.kode + " " + m.nama).toLowerCase())}"><div class="ks-cover${m.jenis === "Uraian" ? " u" : ""}"><span class="ks-chip">KISI-KISI</span><div class="ks-ct">${EH(m.nama)}</div><div class="ks-by"><span>Catatan Akademik</span><span>catatanakademik.com</span></div></div><div class="ks-body"><span class="ks-pill">${pill(m.kode, m.jenis)}</span><h3>Kisi-kisi ${EH(m.nama)}</h3><p>${ket(m)}</p><div class="ks-meta">Periode ${EH(m.periode)}${m.jml_soal > 0 ? " · 5 soal gratis" : ""}</div><span class="ks-rd">${m.jml_soal > 0 ? "Latihan" : "Lihat"} →</span></div></a>`;

  const FAQ = [
    ["Apa itu UAS UT?", "UAS adalah Ujian Akhir Semester di Universitas Terbuka. Ujian ini diikuti mahasiswa di akhir semester dan menjadi salah satu komponen nilai akhir mata kuliah. Bobot dan ketentuannya bisa berbeda tiap mata kuliah, jadi cek informasi resmi di ut.ac.id."],
    ["Apakah soal latihan di sini sama dengan soal UAS UT yang asli?", "Tidak. Soal di sini adalah latihan pembelajaran berbasis modul mata kuliahnya, bukan soal UAS yang asli dan bukan bocoran. Fungsinya mengecek bagian mana yang belum kamu kuasai sebelum ujian."],
    ["Apa bedanya ujian objektif dan uraian di UT?", "Ujian objektif berupa soal pilihan ganda, sedangkan ujian uraian meminta kamu menjawab dengan kalimat sendiri. Jenis ujian tiap mata kuliah tertera di kartu, kecuali yang belum disebut oleh sumbernya."],
    ["Bagaimana cara memakai kisi-kisi UAS UT biar efektif?", "Cari mata kuliahmu, kerjakan latihan soalnya dulu tanpa buka catatan, lalu catat topik yang salah. Fokuskan belajar ke topik itu, baru ulangi latihan menjelang hari ujian."],
    ["Apakah latihan soalnya gratis?", "Mata kuliah yang bertanda 5 soal gratis bisa dicoba tanpa daftar dan tanpa bayar. Kisi-kisi lengkap per mata kuliah tersedia berbayar, dengan pembayaran lewat QRIS dan konfirmasi admin."],
  ];
  const BASE = "https://catatanakademik.com";
  const ldJson = o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "</script>";
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const letterOf = m => { const c = String(m.nama || "").trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "Z"; };
  const letters = items => { const o = {}; items.forEach(m => { const l = letterOf(m); o[l] = (o[l] || 0) + 1; }); return o; };

  function katalog() {
    const items = kisi.list(), first = items.slice(0, 8), L = letters(items);
    const T = "UAS UT: Kisi-kisi & Latihan Soal | Catatan Akademik";
    const D = "Cari kisi-kisi UAS UT dan latihan soal UAS UT online per mata kuliah. " + fmt(items.length) + " mata kuliah, ada 5 soal latihan gratis. Coba sekarang!";
    const ld = [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: "Kisi-kisi UAS UT dan Latihan Soal per Mata Kuliah", url: BASE + "/kisi-kisi", description: D, inLanguage: "id", isPartOf: { "@type": "WebSite", name: "Catatan Akademik", url: BASE } },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f[0], acceptedAnswer: { "@type": "Answer", text: f[1] } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: BASE + "/" }, { "@type": "ListItem", position: 2, name: "Kisi-kisi UAS UT", item: BASE + "/kisi-kisi" }] },
    ].map(ldJson).join("");
    const idx = `<section class="ks-idx" aria-label="Daftar mata kuliah per huruf"><h2>Daftar kisi-kisi UAS UT berdasarkan huruf</h2><p>Tidak mau scroll? Pilih huruf depan nama mata kuliahmu.</p><nav>${Object.keys(L).sort().map(l => `<a href="/ruangakademikut/kisi-kisi/indeks/${l.toLowerCase()}">${l}<small>${L[l]}</small></a>`).join("")}</nav></section>`;
    const art = `<article class="ks-art"><h2>Latihan Soal UAS UT Online</h2><p>Menjelang UAS, banyak mahasiswa UT bingung mulai belajar dari mana. Halaman ini mengumpulkan kisi-kisi UAS UT untuk ${fmt(items.length)} mata kuliah. Tiap mata kuliah punya halaman sendiri, dan sebagian sudah dilengkapi 5 soal latihan yang bisa dicoba gratis.</p><h3>Perbedaan Ujian Objektif dan Uraian UT</h3><p>Ujian objektif berupa pilihan ganda, jadi kamu perlu teliti membaca opsi dan hafal konsep inti. Ujian uraian menuntut jawaban dengan kalimat sendiri, jadi latihannya lebih ke menjelaskan konsep dan memberi contoh. Jenis ujian tiap mata kuliah tertera di kartunya.</p><h3>Cara Menggunakan Kisi-Kisi UAS UT</h3><p>Mulai dengan mengerjakan latihan soal tanpa membuka catatan, lalu catat topik yang masih salah. Setelah itu pelajari topik tersebut lewat modul atau kisi-kisi lengkap, dan ulangi latihan beberapa hari sebelum ujian. Cara ini lebih hemat waktu daripada membaca semua modul dari awal.</p><h2>Pertanyaan yang Sering Diajukan tentang UAS UT</h2>${FAQ.map(f => `<h3>${EH(f[0])}</h3><p>${EH(f[1])}</p>`).join("")}</article>`;
    return {
      title: T, desc: D,
      canon: "/ruangakademikut/kisi-kisi", headx: HEADX + ld,
      body: `<main class="wrap ks"><a class="ks-back" href="/" data-back>← Kembali</a><br><span class="ks-eb">Kisi-kisi UAS UT</span><h1>Kisi-kisi UAS UT &amp; <em>Latihan Soal</em> per Mata Kuliah</h1><p class="ks-lead">Ujian tinggal hitungan hari. Latihan dulu 5 soalnya. Pilih mata kuliahmu, coba soal latihan UAS UT gratis, lalu lihat bagian mana yang belum nempel.</p><input class="ks-s" id="ksq" type="search" placeholder="Cari kode atau nama mata kuliah" aria-label="Cari mata kuliah" autocomplete="off"><div class="ks-grid" id="ksgrid" data-max="8" data-n="${items.length}">${first.map(card).join("") || "<p>Belum ada mata kuliah.</p>"}</div><p class="ks-none" id="ksnone" hidden>Mata kuliah tidak ditemukan.</p>${items.length > 8 ? `<div class="ks-more" id="ksmore"><button class="ks-btn ghost" type="button">Lihat semua ${fmt(items.length)} mata kuliah</button></div>` : ""}${idx}${art}</main>${FOOT}`,
    };
  }

  function indeks(h) {
    const l = String(h || "").toUpperCase(); if (!/^[A-Z]$/.test(l)) return null;
    const items = kisi.list(), L = letters(items), list = items.filter(m => letterOf(m) === l).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    if (!list.length) return null;
    const nav = Object.keys(L).sort().map(x => `<a href="/ruangakademikut/kisi-kisi/indeks/${x.toLowerCase()}"${x === l ? ' class="on"' : ""}>${x}</a>`).join("");
    const ld = ldJson({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: BASE + "/" }, { "@type": "ListItem", position: 2, name: "Kisi-kisi UAS UT", item: BASE + "/kisi-kisi" }, { "@type": "ListItem", position: 3, name: "Huruf " + l, item: BASE + "/kisi-kisi/indeks/" + l.toLowerCase() }] });
    return {
      title: `Kisi-kisi UAS UT Berawalan ${l}: ${list.length} Mata Kuliah | Catatan Akademik`,
      desc: `Daftar kisi-kisi UAS UT dan latihan soal untuk ${list.length} mata kuliah berawalan huruf ${l}, lengkap dengan kode MK dan jenis ujian.`,
      canon: "/ruangakademikut/kisi-kisi/indeks/" + l.toLowerCase(), headx: HEADX + ld,
      body: `<main class="wrap ks"><a class="ks-back" href="/ruangakademikut/kisi-kisi">← Semua mata kuliah</a><h1>Kisi-kisi UAS UT mata kuliah berawalan <em>${l}</em></h1><p class="ks-lead">${list.length} mata kuliah. Pilih salah satu untuk membuka kisi-kisi dan latihan soalnya.</p><nav class="ks-az">${nav}</nav><ul class="ks-ul">${list.map(m => `<li><a href="/ruangakademikut/kisi-kisi/${EH(m.slug)}"><b>${EH(m.nama)}</b><span>${pill(m.kode, m.jenis)}</span></a></li>`).join("")}</ul></main>${FOOT}`,
    };
  }

  function mk(slug) {
    const r = kisi.bySlug(slug); if (!r) return null;
    const soal = kisi.soalOf(r);
    const data = { slug: r.slug, nama: r.nama, kode: r.kode, harga: r.harga, ada_file: !!r.file_path, soal: soal.map(s => ({ k: s.k, b: s.b })) };
    const ada = soal.length > 0;
    const base = `Kisi-kisi ${r.nama} (${r.kode}) UT`, ttl = (base + " | Catatan Akademik").length <= 60 ? base + " | Catatan Akademik" : base;
    const dsc = ada ? `Siap ujian ${r.nama}? Tes 5 soal latihan gratis, cek jawabanmu, lalu ambil kisi-kisi lengkap periode ${r.periode}.` : `Siap ujian ${r.nama}? Kisi-kisi lengkap ${r.kode} periode ${r.periode}, bayar lewat QRIS dan dikirim ke WhatsApp.`;
    const ld = [
      { "@context": "https://schema.org", "@type": "WebPage", name: base, url: BASE + "/kisi-kisi/" + r.slug, description: dsc, inLanguage: "id", isPartOf: { "@type": "WebSite", name: "Catatan Akademik", url: BASE } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: BASE + "/" }, { "@type": "ListItem", position: 2, name: "Kisi-kisi UAS UT", item: BASE + "/kisi-kisi" }, { "@type": "ListItem", position: 3, name: r.nama, item: BASE + "/kisi-kisi/" + r.slug }] },
    ].map(ldJson).join("");
    const qs = soal.map((s, i) => `<fieldset class="ks-q"><legend>${i + 1}. ${EH(s.q)}</legend>${s.o.map((o, j) => `<label><input type="radio" name="s${i}" value="${j}"> <span>${"ABCD"[j]}. ${EH(o)}</span></label>`).join("")}<p class="ks-pb" hidden></p></fieldset>`).join("");
    return {
      title: ttl,
      desc: dsc,
      canon: "/ruangakademikut/kisi-kisi/" + r.slug, headx: HEADX + ld,
      body: `<main class="wrap ks" id="ksmk" data-mk="${EH(JSON.stringify(data))}"><a class="ks-back" href="/ruangakademikut/kisi-kisi">← Semua mata kuliah</a><div class="ks-url"><span>catatanakademik.com<b>/kisi-kisi/${EH(r.slug)}</b></span><button class="ks-btn sm" type="button" id="kscopy">Salin link</button></div><div class="ks-tags"><span>${EH(r.kode)}</span>${r.jenis ? `<span>${EH(r.jenis)}</span>` : ""}<span>Periode ${EH(r.periode)}</span></div>${ada ? `<h1>Siap ujian <em>${EH(r.nama)}</em>? Tes 5 soalnya dulu.</h1><p class="ks-lead">Jawab 5 soal ini, lalu cek hasilnya. Gratis, tanpa daftar.</p><form id="ksform" onsubmit="return false">${qs}</form><div class="ks-act"><button class="ks-btn ghost" type="button" id="kscek">Cek jawaban</button><span id="kshasil" role="status"></span></div>` : `<h1>Siap ujian <em>${EH(r.nama)}</em>?</h1><p class="ks-lead">Kisi-kisi lengkap periode ${EH(r.periode)} tersedia. Bayar lewat QRIS, admin konfirmasi, lalu kisi-kisi dikirim ke WhatsApp-mu.</p>`}<section class="ks-lock" aria-label="Kisi-kisi lengkap"><div class="ks-blur" aria-hidden="true"><b>${ada ? "Soal 6 sampai selesai" : "Isi kisi-kisi lengkap"}</b><br>Bagian ini berisi kisi-kisi lengkap dan soal latihan tambahan untuk ${EH(r.nama)}. Dikirim sebagai berkas ke WhatsApp setelah pembayaran dikonfirmasi admin.<br><br>Bahasan inti, daftar topik yang sering keluar, dan soal berlatih tambahan.</div><div class="ks-cta"><h3>Mau kisi-kisi lengkap?</h3><span class="ks-sub">Bayar lewat QRIS, admin konfirmasi, file dikirim ke WhatsApp</span><button class="ks-btn" type="button" id="kspay">Mau kisi-kisi lengkap · ${rp(r.harga)}</button>${r.file_path ? '<span class="ks-sub sm">Punya kode voucher? Masukkan saat bayar</span>' : ""}</div></section>${r.file_path ? `<section class="ks-vban"><span class="ks-eb dark">Voucher</span><h2>${rp(r.harga)} jadi <em>${rp(Math.round(r.harga * 0.4))}</em>. Syaratnya cuma bagikan ke 5 grup.</h2><p>Bagikan link halaman ini ke 5 grup WhatsApp atau Telegram, kirim screenshot buktinya, dan kode voucher 60% dikirim ke WhatsApp-mu setelah admin cek valid.</p><button class="ks-btn acc" type="button" id="ksklaim">Klaim potongan 60%</button></section>` : ""}</main>${FOOT}`,
    };
  }

  function pesanan() {
    return { title: "Status pesanan Kisi-kisi | Catatan Akademik", desc: "Status pesanan kisi-kisi.", canon: "", robots: "noindex,nofollow", headx: HEADX,
      body: `<main class="wrap ks" id="kspesanan"><a class="ks-back" href="/ruangakademikut/kisi-kisi">← Semua mata kuliah</a><h1>Status pesanan</h1><div id="ksps">Memuat...</div></main>${FOOT}` };
  }
  return { katalog, mk, pesanan, card, indeks, letters, letterOf };
};
