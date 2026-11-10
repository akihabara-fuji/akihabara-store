/* Halaman publik Catatan Akademik. Berkas statis dari parafrase/pages, {{SITE}} diisi dari SITE_URL. */
"use strict";
const path = require("path");
const { SHORT, shortPaths } = require("./acadpaths");
const fs = require("fs");
const tema = require("./tema");
const navfix = require("./navfix");
const buildKonten = require("./konten-pages");

module.exports = function mountPages({ app, express, texts = null, settings = null }) {
  const dir = path.join(__dirname, "pages");
  // Tautan pesanan memuat token rahasia: jangan bocor lewat Referer ke pihak ketiga (mis. Google Fonts), dan jangan boleh di-iframe.
  const ADM = /^\/admin\/(parafrase|layanan)(\/|\?|$)/; // halaman admin boleh dibingkai oleh /admin (satu asal), halaman murid tidak
  app.use(["/ruangakademikut", "/ms/parafrase", "/ms/admin/parafrase", "/admin/parafrase", "/admin/layanan", "/ms/layanan"], (req, res, next) => {
    res.set({ "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Frame-Options": ADM.test(req.originalUrl) ? "SAMEORIGIN" : "DENY", "Content-Security-Policy": ADM.test(req.originalUrl) ? "frame-ancestors 'self'" : "frame-ancestors 'none'" });
    next();
  });
  const SITE = (process.env.ACAD_URL || process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  /* Domain akademik: tautan halaman dipendekkan (tanpa /ruangakademikut). nginx yang menerjemahkan balik; aset dan API tetap di jalur lama. */
  const shorten = h => !SHORT ? h : shortPaths(h
    .replace(/<link rel="icon"[^>]*>/g, '<link rel="icon" href="/ruangakademikut/assets/ca/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/ruangakademikut/assets/ca/favicon-32.png"><link rel="icon" type="image/png" sizes="192x192" href="/ruangakademikut/assets/ca/icon-192.png">')
    .replace(/<link rel="apple-touch-icon"[^>]*>/g, '<link rel="apple-touch-icon" href="/ruangakademikut/assets/ca/apple-touch-icon.png">')
    .replace(/<link rel="manifest"[^>]*>/g, '<link rel="manifest" href="/ruangakademikut/assets/ca/manifest.webmanifest">')
    .replace(/(<a [^>]*class="logo"[^>]*>)<b>C<\/b>/g, '$1<b class="lg"><img src="/ruangakademikut/assets/ca/logo-96.png" alt="" width="34" height="34"></b>')
    .replace("</head>", (h.includes("/site.css") ? '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme-svc.css?v=2">' : '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme.css?v=2">') + '<link rel="stylesheet" href="/ruangakademikut/assets/ca/nav.css?v=4"></head>')
    .replace("</head>", "<style>.logo b.lg{background:none!important;box-shadow:none}.logo b.lg img{width:34px;height:34px;object-fit:contain;display:block}</style></head>")
    );
  const TRACK = new Set(["shell.html", "beranda.html", "hub.html", "tentang.html", "cek.html", "bedah.html", "layanan.html", "tutorial-online.html", "blog-ut.html", "alat-nilai.html", "alat-sampul.html", "alat-tracker.html", "alat-kalender.html", "panduan-maba.html", "sitasi.html", "portal-ut.html"]); // halaman pesanan dan hasil memuat token rahasia: tidak dilacak
  const blogCards = req => typeof app.locals.renderAcadBlogCards === "function" ? app.locals.renderAcadBlogCards(req) : "";
  /* Satu jalur render untuk halaman publik DAN pratinjau admin. Kamus teks (sitetexts.js) dan kartu tersembunyi diterapkan di sini,
     di server, jadi pengunjung dan Google langsung menerima teks yang sudah diganti. opts: { over: Map pengganti sementara, mark: teks yang disorot } */
  const hiddenCards = () => (settings ? String(settings.get("kartu_sembunyi") || "").split(",").filter(Boolean) : []);
  /* Beranda: pilihan cepat, panduan terpopuler, dan langkah mahasiswa baru. Artikel yang belum tayang (terjadwal) tidak ditautkan, jadi tidak ada tautan mati. */
  const live = slug => (typeof app.locals.acadPostTitle === "function" ? app.locals.acadPostTitle(slug) : null);
  const EH = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CHIPS = [["Cara daftar kuliah di UT", "cara-daftar-kuliah-di-ut-mahasiswa-baru"], ["Cek jadwal PKBJJ", "cara-cek-jadwal-pkbjj-ut"], ["Aktivasi dan login Tuton", "cara-aktivasi-dan-login-tuton-ut"], ["Cek jadwal UAS", "cara-cek-jadwal-uas-ut"], ["Lihat nilai UAS dan DNU", "cara-melihat-nilai-uas-dnu-ut"], ["Hitung IPS dan IPK", "/kalkulator-nilai-ut"], ["Registrasi mata kuliah", "cara-registrasi-mata-kuliah-ut"], ["Syarat lulus", "syarat-lulus-kuliah-ut-ipk-tap"]];
  const STEPS = [["Daftar", "Akun admisi, billing, dokumen", "cara-daftar-kuliah-di-ut-mahasiswa-baru"], ["Registrasi", "Pilih mata kuliah tiap semester", "cara-registrasi-mata-kuliah-ut"], ["PKBJJ", "Jadwal dan lokasi kegiatan", "cara-cek-jadwal-pkbjj-ut"], ["Tuton", "Aktivasi dan kumpulkan tugas", "cara-aktivasi-dan-login-tuton-ut"], ["UAS", "Jadwal lewat KTPU di MyUT", "cara-cek-jadwal-uas-ut"], ["Nilai", "DNU, IPS, dan IPK", "cara-melihat-nilai-uas-dnu-ut"], ["Lulus", "IPK minimal, nilai E, dan TAP", "syarat-lulus-kuliah-ut-ipk-tap"]];
  const MC = [3, 5, 4, 13, 7, 24, 19]; // nomor stiker maskot per langkah
  const FALLBACK = ["cara-melihat-nilai-uas-dnu-ut", "cara-cek-jadwal-uas-ut", "hitung-nilai-akhir-ips-ipk-ut", "metopen-ut-tugas-bobot-syarat-taps", "persiapan-uas-ut", "cara-mengumpulkan-tugas-tuton-ut", "cara-daftar-kuliah-di-ut-mahasiswa-baru", "cara-cek-jadwal-pkbjj-ut", "cara-aktivasi-dan-login-tuton-ut", "cara-registrasi-mata-kuliah-ut", "syarat-lulus-kuliah-ut-ipk-tap", "kesalahan-umum-tugas-tutorial-ut-yang-membuat-nilai-turun"];
  function hk(h) {
    const chips = CHIPS.map(([t, s]) => s[0] === "/" ? [t, s] : (live(s) ? [t, "/blog/" + s] : null)).filter(Boolean).slice(0, 8).concat([["Tutorial Online", "/ruangakademikut/tutorial-online"], ["Cek & Bedah", "/ruangakademikut/cek-parafrase-mandiri"]]).map(([t, u]) => `<a class="hk-chip" href="${EH(u)}">${EH(t)}</a>`).join("");
    const steps = STEPS.map(([t, d, s], i) => `<li><a href="${live(s) ? "/blog/" + s : "/panduan-maba"}"><img class="hk-mc m${i % 6}" src="/ruangakademikut/assets/ca/mc-${String(MC[i]).padStart(2, "0")}.webp" alt="" width="44" height="44" loading="lazy"><i>${i + 1}</i><b>${EH(t)}</b><small>${EH(d)}</small></a></li>`).join("");
    let top = []; try { top = typeof app.locals.acadTop === "function" ? app.locals.acadTop(12) : []; } catch { top = []; }
    const fromStats = top.length >= 3;
    if (!fromStats) top = [];
    /* Terowongan 3D butuh minimal 12 kartu supaya tidak renggang: lengkapi dengan panduan pilihan yang sudah tayang. */
    FALLBACK.forEach(s => { if (top.length < 12 && !top.some(x => x.slug === s) && live(s)) top.push({ slug: s, title: live(s) }); });
    const pop = top.length ? `<div class="wrap"><div class="sh"><div><span class="hk-eb">${fromStats ? "Lagi banyak dibaca" : "Panduan pilihan"}</span><h2>${fromStats ? "Yang paling dicari mahasiswa UT sekarang" : "Panduan yang paling sering dibutuhkan"}</h2><p>${fromStats ? "Diurutkan dari panduan yang paling banyak dibuka 30 hari terakhir." : "Mulai dari sini kalau bingung."}</p></div><a class="btn btn-ghost btn-sm" href="/blog-ut">Semua panduan</a></div><div class="hk-pop">${top.map((x, i) => `<a href="/blog/${EH(x.slug)}"><i>${i + 1}</i><b>${EH(x.title)}</b></a>`).join("")}</div></div>` : "";
    return h.replace("{{HK_CHIPS}}", chips).replace("{{HK_LANGKAH}}", steps).replace("{{HK_POPULER}}", pop).replace('<section class="s" id="populer"></section>', "");
  }
  function render(file, req, opts = {}) {
    let out = fs.readFileSync(path.join(dir, file), "utf8");
    if (opts.vars) { const v = opts.vars; out = out.replace("{{BODY}}", () => v.body).replace(/\{\{TITLE\}\}/g, () => EH(v.title)).replace(/\{\{DESC\}\}/g, () => EH(v.desc)).replace("{{CANON}}", () => v.canon || "").replace("{{HEADX}}", () => v.headx || "").replace("{{ROBOTS}}", () => v.robots ? '<meta name="robots" content="' + v.robots + '">' : ""); }
    if (file === "blog-ut.html") out = out.replace('<div id="bl" class="bx-host"></div>', `<div id="bl" class="bx-host">${blogCards(req)}</div>`);
    if (file === "beranda.html" && typeof app.locals.ulasanPublic === "function" && !opts.preview) {
      /* Testimoni asli ditulis di HTML awal (bukan hanya lewat JavaScript) supaya terbaca mesin pencari. Skrip halaman membangunnya ulang untuk efek tilt. */
      const E = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      const items = app.locals.ulasanPublic().slice(0, 6);
      if (items.length) {
        const cards = items.map((x, n) => `<figure class="po p${n % 6 + 1}" tabindex="0"><div class="po-ph">${x.img ? `<img loading="lazy" alt="Tangkapan layar chat dari ${E(x.nama)}" src="${E(x.img)}">` : `<q>${E(x.teks)}</q>`}</div><figcaption><b>${E(x.nama)}</b>${x.ket ? `<span>${E(x.ket)}</span>` : ""}</figcaption></figure>`).join("");
        out = out.replace('<section class="s" id="ulasan" hidden>', '<section class="s" id="ulasan">').replace('<div class="ul3" id="ulList"></div>', `<div class="ul3 po-grid" id="ulList">${cards}</div>`);
      }
    }
    /* Menu Testimoni disembunyikan selama belum ada testimoni yang tampil */
    if (typeof app.locals.ulasanPublic === "function" && !opts.preview) { let n = 0; try { n = app.locals.ulasanPublic().length; } catch { n = 0; } if (!n) out = out.replace(/<a [^>]*#ulasan[^>]*>Testimoni<\/a>\s*/g, ""); }
    if (file === "beranda.html") out = hk(out);
    if (file === "hub.html" && texts) out = texts.hideCards(out, opts.hidden || hiddenCards());
    if (texts) out = texts.apply(out, opts.over || null, { mark: opts.mark, edit: opts.edit });
    out = (TRACK.has(file) && !opts.preview ? out.replace("</head>", '<script async src="/t.js"></script></head>') : out).replaceAll("{{SITE}}", SITE);
    const on = k => !!(settings && settings.get(k));
    out = navfix.fix(out, { file, active: opts.vars ? (opts.vars.active || "") : undefined, cek: on("tampil_cek_pesanan"), harga: on("tampil_harga_pesan") || file === "cek.html" });
    return tema.inject(shorten(out), settings ? settings.get("ca_tema") : "");
  }
  const page = file => (req, res) => {
    let out; try { out = render(file, req); } catch { return res.status(500).type("text").send("Halaman tidak tersedia."); }
    res.set("Cache-Control", "no-cache").type("html").send(out);
  };
  app.get(["/ruangakademikut", "/ruangakademikut/"], page("hub.html"));
  app.get("/beranda", page("beranda.html")); // landing domain akademik (nginx: / -> /beranda)
  app.get("/ruangakademikut/cek-parafrase-mandiri", page("cek.html"));
  app.get(["/ruangakademikut/audit", "/audit", "/ruangakademikut/audit-parafrase", "/audit-parafrase", "/ruangakademikut/audit/hasil/:token"], (req, res) => res.redirect(301, SHORT ? "/cek-parafrase-mandiri" : "/ruangakademikut/cek-parafrase-mandiri"));
  app.get(SHORT ? ["/ruangakademikut/bedah-laporan", "/bedah-laporan"] : "/ruangakademikut/bedah-laporan", page("bedah.html"));
  /* Halaman berbasis data (Kelas Tuton, Komunitas, Portofolio, Bedah teks): isi dibangun di konten-pages.js, dibungkus shell.html */
  const KP = buildKonten(app);
  const bedahCfg = () => ({ mb: settings ? settings.get("bedahteks_max_mb") : 10, hal: settings ? settings.get("bedahteks_max_halaman") : 30 });
  const kpage = (fn, active) => (req, res) => {
    let out;
    try {
      const r = fn(req);
      out = r ? render("shell.html", req, { vars: Object.assign({ active }, r) }) : render("shell.html", req, { vars: { active, title: "Halaman tidak ditemukan", desc: "Halaman tidak ditemukan.", canon: "", robots: "noindex", body: '<main class="wrap kt"><section class="kt-hd"><h1>Halaman tidak ditemukan</h1><p><a href="/ruangakademikut/tutorial-online">Ke Kelas Tuton</a> · <a href="/ruangakademikut/komunitas">Ke Komunitas</a></p></section></main>' } });
      if (!r) res.status(404);
    } catch (e) { console.error("[halaman]", e); return res.status(500).type("text").send("Halaman tidak tersedia."); }
    res.set("Cache-Control", "no-cache").type("html").send(out);
  };
  app.get(SHORT ? ["/ruangakademikut/tentang", "/tentang"] : "/ruangakademikut/tentang", kpage(() => KP.tentang(), ""));
  app.get(SHORT ? ["/ruangakademikut/komunitas", "/komunitas"] : "/ruangakademikut/komunitas", kpage(() => KP.komunitas(), "komunitas"));
  app.get(SHORT ? ["/ruangakademikut/kegiatan/:slug", "/kegiatan/:slug"] : "/ruangakademikut/kegiatan/:slug", kpage(req => KP.kegiatan(String(req.params.slug)), "komunitas"));
  app.get(SHORT ? ["/ruangakademikut/bedah-data-ut", "/bedah-data-ut"] : "/ruangakademikut/bedah-data-ut", kpage(() => KP.bedahTeks(bedahCfg()), "alat"));
  app.get(SHORT ? ["/ruangakademikut/tutorial-online/materi/:id", "/tutorial-online/materi/:id"] : "/ruangakademikut/tutorial-online/materi/:id", kpage(req => { const r = KP.materi(String(req.params.id)); if (r && app.locals.konten) app.locals.konten.hit(String(req.params.id)).catch(() => {}); return r; }, "tuton"));
  app.get("/ruangakademikut/layanan", page("layanan.html"));
  app.get(SHORT ? ["/ruangakademikut/tutorial-online", "/tutorial-online"] : "/ruangakademikut/tutorial-online", kpage(req => KP.tuton(req), "tuton"));
  app.get("/ruangakademikut/blog-ut", page("blog-ut.html"));
  /* Alat gratis: di domain akademik alamat resminya pendek (/kalkulator-nilai-ut); jalur lama /ruangakademikut/... dialihkan 301. */
  for (const [slug, file] of [["kalkulator-nilai-ut", "alat-nilai.html"], ["sampul-tugas", "alat-sampul.html"], ["tracker-kelulusan", "alat-tracker.html"], ["kalender-akademik", "alat-kalender.html"], ["panduan-maba", "panduan-maba.html"], ["sitasi-apa", "sitasi.html"], ["portal-ut", "portal-ut.html"]]) {
    if (SHORT) app.get("/ruangakademikut/" + slug, (req, res) => res.redirect(301, "/" + slug));
    app.get(SHORT ? "/" + slug : ["/ruangakademikut/" + slug, "/" + slug], page(file));
  }
  /* Alat di luar fokus UT sudah dihapus: alamat lama dialihkan 301 ke Portal & Alat UT. */
  for (const slug of ["pasfoto-yudisium", "buat-cv-ats", "surat-lamaran"]) app.get(["/ruangakademikut/" + slug, "/" + slug], (req, res) => res.redirect(301, SHORT ? "/portal-ut" : "/ruangakademikut/portal-ut"));
  app.get(["/admin/layanan", "/admin/layanan/"], (req, res) => fs.readFile(path.join(dir, "layanan-admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html)));
  /* Koin sudah tidak dipakai: halaman lama diarahkan ke layanan (semua pembayaran lewat QRIS). */
  app.get(["/koin", "/ruangakademikut/koin"], (req, res) => res.redirect(302, SHORT ? "/layanan" : "/ruangakademikut/layanan"));
  app.get(["/ruangakademikut/pesanan", "/ruangakademikut/pesanan/:token"], page("pesanan.html"));
  const CA = new Set(["theme.css", "theme-svc.css", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "logo-96.png", "manifest.webmanifest", "ms.webp", "model-f.webp", "model-m.webp", "nav.css", "dd.css", ...Array.from({ length: 24 }, (_, i) => `mc-${String(i + 1).padStart(2, "0")}.webp`)]);
  /* Berkas teks (JS, manifest) ditulis ulang di server: tautan di dalamnya ikut alamat pendek di domain akademik. Hasil disimpan per waktu ubah berkas. */
  const rewritten = new Map();
  function sendAsset(res, file, cache) {
    const text = /\.(js|webmanifest)$/.test(file) && SHORT;
    if (!text) return res.set("Cache-Control", cache).sendFile(file);
    let st; try { st = fs.statSync(file); } catch { return res.status(404).end(); }
    let e = rewritten.get(file); if (!e || e.m !== st.mtimeMs) { e = { m: st.mtimeMs, s: shortPaths(fs.readFileSync(file, "utf8")) }; rewritten.set(file, e); }
    res.set("Cache-Control", cache).type(file.endsWith(".js") ? "application/javascript; charset=utf-8" : "application/manifest+json").send(e.s);
  }
  app.get(["/ruangakademikut/assets/ca/:f", "/assets/ut/ca/:f"], (req, res) => {
    if (!CA.has(req.params.f)) return res.status(404).end();
    sendAsset(res, path.join(dir, "ca", req.params.f), "public, max-age=86400");
  });
  /* Domain akademik: browser/Google meminta ikon di jalur root. Tanpa ini yang keluar ikon "n" milik nextaja. */
  const ACH = (() => { try { return new URL(process.env.ACAD_URL || "").hostname.toLowerCase(); } catch { return ""; } })();
  const ROOT_ICON = { "/favicon.ico": "favicon.ico", "/apple-touch-icon.png": "apple-touch-icon.png", "/icon-192.png": "icon-192.png", "/icon-512.png": "icon-512.png", "/manifest.webmanifest": "manifest.webmanifest" };
  app.get(Object.keys(ROOT_ICON), (req, res, next) => {
    const h = String(req.headers.host || "").toLowerCase().replace(/:\d+$/, "");
    if (!SHORT || !ACH || (h !== ACH && h !== "www." + ACH)) return next();
    res.set("Cache-Control", "public, max-age=3600").sendFile(path.join(dir, "ca", ROOT_ICON[req.path]));
  });
  /* Verifikasi Bing Webmaster Tools (kode per akun, bukan rahasia) */
  app.get("/BingSiteAuth.xml", (req, res) => res.type("application/xml").set("Cache-Control", "public, max-age=3600")
    .send('<?xml version="1.0"?>\n<users>\n\t<user>5A51A6D49E191DE95E89EA165A5F3815</user>\n</users>'));
  const ASSETS = new Set(["konten.css", "konten.js", "bedah-teks.js", "site.css", "hub.css", "common.js", "cek.js", "pesanan.js", "admin.js", "studio.js", "bedah.js", "layanan.js", "tutorial.js", "tutorial.css", "baru.css", "layanan-admin.js", "blog-ut.js", "nilai-ut.js", "kalkulator.js", "wordlib.js", "sampul.js", "tracker.js", "kalender.js", "maba.js", "logo-ut.png", "sitasi-apa.js", "sitasi.js"]);
  app.get(["/ruangakademikut/assets/:f", "/assets/ut/:f"], (req, res) => {
    if (!ASSETS.has(req.params.f)) return res.status(404).end();
    sendAsset(res, path.join(dir, req.params.f), "no-cache");
  });
  app.get(["/ms/admin/studio-page", "/admin/parafrase/studio", "/admin/parafrase/studio/"], (req, res) => {
    fs.readFile(path.join(dir, "studio.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html));
  });
  app.get(["/admin/parafrase", "/admin/parafrase/"], (req, res) => {
    fs.readFile(path.join(dir, "admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html));
  });
  // Alamat lama
  app.get(["/kebutuhan-anak-ut", "/akademik"], (req, res) => res.redirect(301, "/ruangakademikut"));
  return { render };
};
