/* Halaman publik Ruang Akademik UT. Berkas statis dari parafrase/pages, {{SITE}} diisi dari SITE_URL. */
"use strict";
const path = require("path");
const { SHORT, shortPaths } = require("./acadpaths");
const fs = require("fs");

module.exports = function mountPages({ app, express, texts = null, settings = null }) {
  const dir = path.join(__dirname, "pages");
  // Tautan pesanan memuat token rahasia: jangan bocor lewat Referer ke pihak ketiga (mis. Google Fonts), dan jangan boleh di-iframe.
  const ADM = /^\/admin\/(parafrase|layanan)(\/|\?|$)/; // halaman admin boleh dibingkai oleh /admin (satu asal), halaman murid tidak
  app.use(["/ruangakademikut", "/ms/parafrase", "/ms/admin/parafrase", "/admin/parafrase", "/admin/layanan", "/ms/layanan", "/ms/koin", "/ms/admin/koin"], (req, res, next) => {
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
    .replace("</head>", (h.includes("/site.css") ? '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme-svc.css?v=2">' : '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme.css?v=2">') + "</head>")
    .replace("</head>", "<style>.logo b.lg{background:none!important;box-shadow:none}.logo b.lg img{width:34px;height:34px;object-fit:contain;display:block}</style></head>")
    );
  const TRACK = new Set(["beranda.html", "hub.html", "cek.html", "audit.html", "layanan.html", "blog-ut.html", "alat-nilai.html", "alat-pasfoto.html", "sitasi.html", "portal-ut.html"]); // halaman pesanan dan hasil memuat token rahasia: tidak dilacak
  const blogCards = req => typeof app.locals.renderAcadBlogCards === "function" ? app.locals.renderAcadBlogCards(req) : "";
  /* Satu jalur render untuk halaman publik DAN pratinjau admin. Kamus teks (sitetexts.js) dan kartu tersembunyi diterapkan di sini,
     di server, jadi pengunjung dan Google langsung menerima teks yang sudah diganti. opts: { over: Map pengganti sementara, mark: teks yang disorot } */
  const hiddenCards = () => (settings ? String(settings.get("kartu_sembunyi") || "").split(",").filter(Boolean) : []);
  function render(file, req, opts = {}) {
    let out = fs.readFileSync(path.join(dir, file), "utf8");
    if (file === "blog-ut.html") out = out.replace('<div id="bl" class="bx-host"></div>', `<div id="bl" class="bx-host">${blogCards(req)}</div>`);
    if (file === "hub.html" && texts) out = texts.hideCards(out, opts.hidden || hiddenCards());
    if (texts) out = texts.apply(out, opts.over || null, { mark: opts.mark });
    out = (TRACK.has(file) && !opts.preview ? out.replace("</head>", '<script async src="/t.js"></script></head>') : out).replaceAll("{{SITE}}", SITE);
    if (!opts.preview) out = out.replace("</body>", '<script defer src="/ruangakademikut/assets/koin-chip.js?v=20261202"></script></body>'); // chip koin di samping "Akun saya"
    return shorten(out);
  }
  const page = file => (req, res) => {
    let out; try { out = render(file, req); } catch { return res.status(500).type("text").send("Halaman tidak tersedia."); }
    res.set("Cache-Control", "no-cache").type("html").send(out);
  };
  app.get(["/ruangakademikut", "/ruangakademikut/"], page("hub.html"));
  app.get("/beranda", page("beranda.html")); // landing domain akademik (nginx: / -> /beranda)
  app.get("/ruangakademikut/cek-parafrase-mandiri", page("cek.html"));
  app.get("/ruangakademikut/audit", page("audit.html"));
  app.get("/ruangakademikut/layanan", page("layanan.html"));
  app.get("/ruangakademikut/blog-ut", page("blog-ut.html"));
  /* Alat gratis: di domain akademik alamat resminya pendek (/kalkulator-nilai-ut); jalur lama /ruangakademikut/... dialihkan 301. */
  for (const [slug, file] of [["kalkulator-nilai-ut", "alat-nilai.html"], ["pasfoto-yudisium", "alat-pasfoto.html"], ["sitasi-apa", "sitasi.html"], ["koin", "koin.html"], ["portal-ut", "portal-ut.html"]]) {
    if (SHORT) app.get("/ruangakademikut/" + slug, (req, res) => res.redirect(301, "/" + slug));
    app.get(SHORT ? "/" + slug : ["/ruangakademikut/" + slug, "/" + slug], page(file));
  }
  app.get(["/admin/layanan", "/admin/layanan/"], (req, res) => fs.readFile(path.join(dir, "layanan-admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html)));
  app.get("/ruangakademikut/audit/hasil/:token", page("audit-hasil.html"));
  app.get(["/ruangakademikut/pesanan", "/ruangakademikut/pesanan/:token"], page("pesanan.html"));
  const CA = new Set(["theme.css", "theme-svc.css", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "logo-96.png", "manifest.webmanifest"]);
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
  const ASSETS = new Set(["site.css", "hub.css", "common.js", "cek.js", "pesanan.js", "admin.js", "audit.js", "audit-hasil.js", "layanan.js", "layanan-admin.js", "blog-ut.js", "nilai-ut.js", "kalkulator.js", "pasfoto.js", "koin.js", "koin-chip.js", "sitasi-apa.js", "sitasi.js"]);
  app.get(["/ruangakademikut/assets/:f", "/assets/ut/:f"], (req, res) => {
    if (!ASSETS.has(req.params.f)) return res.status(404).end();
    sendAsset(res, path.join(dir, req.params.f), "no-cache");
  });
  app.get(["/admin/parafrase", "/admin/parafrase/"], (req, res) => {
    fs.readFile(path.join(dir, "admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html));
  });
  // Alamat lama
  app.get(["/kebutuhan-anak-ut", "/akademik"], (req, res) => res.redirect(301, "/ruangakademikut"));
  return { render };
};
