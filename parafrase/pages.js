/* Halaman publik Ruang Akademik UT. Berkas statis dari parafrase/pages, {{SITE}} diisi dari SITE_URL. */
"use strict";
const path = require("path");
const fs = require("fs");

module.exports = function mountPages({ app, express }) {
  const dir = path.join(__dirname, "pages");
  // Tautan pesanan memuat token rahasia: jangan bocor lewat Referer ke pihak ketiga (mis. Google Fonts), dan jangan boleh di-iframe.
  const ADM = /^\/admin\/(parafrase|layanan)(\/|\?|$)/; // halaman admin boleh dibingkai oleh /admin (satu asal), halaman murid tidak
  app.use(["/ruangakademikut", "/ms/parafrase", "/ms/admin/parafrase", "/admin/parafrase", "/admin/layanan", "/ms/layanan"], (req, res, next) => {
    res.set({ "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Frame-Options": ADM.test(req.originalUrl) ? "SAMEORIGIN" : "DENY", "Content-Security-Policy": ADM.test(req.originalUrl) ? "frame-ancestors 'self'" : "frame-ancestors 'none'" });
    next();
  });
  const SITE = (process.env.ACAD_URL || process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  /* Domain akademik: tautan halaman dipendekkan (tanpa /ruangakademikut). nginx yang menerjemahkan balik; aset dan API tetap di jalur lama. */
  const SHORT = !!process.env.ACAD_URL && process.env.ACAD_URL.replace(/\/+$/, "") !== (process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  const shorten = h => !SHORT ? h : h
    .replace(/<link rel="icon"[^>]*>/g, '<link rel="icon" href="/ruangakademikut/assets/ca/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/ruangakademikut/assets/ca/favicon-32.png">')
    .replace(/<link rel="apple-touch-icon"[^>]*>/g, '<link rel="apple-touch-icon" href="/ruangakademikut/assets/ca/apple-touch-icon.png">')
    .replace(/<link rel="manifest"[^>]*>/g, '<link rel="manifest" href="/ruangakademikut/assets/ca/manifest.webmanifest">')
    .replace(/(<a [^>]*class="logo"[^>]*>)<b>C<\/b>/g, '$1<b class="lg"><img src="/ruangakademikut/assets/ca/logo-96.png" alt="" width="34" height="34"></b>')
    .replace("</head>", (h.includes("/site.css") ? '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme-svc.css?v=2">' : '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme.css?v=2">') + "</head>")
    .replace("</head>", "<style>.logo b.lg{background:none!important;box-shadow:none}.logo b.lg img{width:34px;height:34px;object-fit:contain;display:block}</style></head>")
    .replace(/\/ruangakademikut\/(cek-parafrase-mandiri|audit|layanan|blog-ut|pesanan)/g, "/$1")
    .replace(/(https?:\/\/[^"'\s<]+?)\/ruangakademikut(?=["'<\s?#)])/g, "$1/layanan-ut")
    .replace(/(["'(=])\/ruangakademikut(?=["'<\s?#)])/g, "$1/layanan-ut");
  const TRACK = new Set(["beranda.html", "hub.html", "cek.html", "audit.html", "layanan.html", "blog-ut.html"]); // halaman pesanan dan hasil memuat token rahasia: tidak dilacak
  const blogCards = req => typeof app.locals.renderAcadBlogCards === "function" ? app.locals.renderAcadBlogCards(req) : "";
  const page = file => (req, res) => {
    fs.readFile(path.join(dir, file), "utf8", (err, html) => {
      if (err) return res.status(500).type("text").send("Halaman tidak tersedia.");
      let out = html;
      if (file === "blog-ut.html") out = out.replace('<div id="bl" class="bx-host"></div>', `<div id="bl" class="bx-host">${blogCards(req)}</div>`);
      out = (TRACK.has(file) ? out.replace("</head>", '<script async src="/t.js"></script></head>') : out).replaceAll("{{SITE}}", SITE);
      res.set("Cache-Control", "no-cache").type("html").send(shorten(out));
    });
  };
  app.get(["/ruangakademikut", "/ruangakademikut/"], page("hub.html"));
  app.get("/beranda", page("beranda.html")); // landing domain akademik (nginx: / -> /beranda)
  app.get("/ruangakademikut/cek-parafrase-mandiri", page("cek.html"));
  app.get("/ruangakademikut/audit", page("audit.html"));
  app.get("/ruangakademikut/layanan", page("layanan.html"));
  app.get("/ruangakademikut/blog-ut", page("blog-ut.html"));
  app.get(["/admin/layanan", "/admin/layanan/"], (req, res) => fs.readFile(path.join(dir, "layanan-admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html)));
  app.get("/ruangakademikut/audit/hasil/:token", page("audit-hasil.html"));
  app.get(["/ruangakademikut/pesanan", "/ruangakademikut/pesanan/:token"], page("pesanan.html"));
  const CA = new Set(["theme.css", "theme-svc.css", "favicon.ico", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "logo-96.png", "manifest.webmanifest"]);
  app.get("/ruangakademikut/assets/ca/:f", (req, res) => {
    if (!CA.has(req.params.f)) return res.status(404).end();
    res.set("Cache-Control", "public, max-age=86400").sendFile(path.join(dir, "ca", req.params.f));
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
  const ASSETS = new Set(["site.css", "hub.css", "common.js", "cek.js", "pesanan.js", "admin.js", "audit.js", "audit-hasil.js", "layanan.js", "layanan-admin.js", "blog-ut.js"]);
  app.get("/ruangakademikut/assets/:f", (req, res) => {
    if (!ASSETS.has(req.params.f)) return res.status(404).end();
    res.set("Cache-Control", "no-cache").sendFile(path.join(dir, req.params.f));
  });
  app.get(["/admin/parafrase", "/admin/parafrase/"], (req, res) => {
    fs.readFile(path.join(dir, "admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html));
  });
  // Alamat lama
  app.get(["/kebutuhan-anak-ut", "/akademik"], (req, res) => res.redirect(301, "/ruangakademikut"));
};
