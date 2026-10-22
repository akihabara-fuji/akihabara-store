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
  const TRACK = new Set(["hub.html", "cek.html", "audit.html", "layanan.html", "blog-ut.html"]); // halaman pesanan dan hasil memuat token rahasia: tidak dilacak
  const page = file => (req, res) => {
    fs.readFile(path.join(dir, file), "utf8", (err, html) => {
      if (err) return res.status(500).type("text").send("Halaman tidak tersedia.");
      res.set("Cache-Control", "no-cache").type("html").send((TRACK.has(file) ? html.replace("</head>", '<script async src="/t.js"></script></head>') : html).replaceAll("{{SITE}}", SITE));
    });
  };
  app.get(["/ruangakademikut", "/ruangakademikut/"], page("hub.html"));
  app.get("/ruangakademikut/cek-parafrase-mandiri", page("cek.html"));
  app.get("/ruangakademikut/audit", page("audit.html"));
  app.get("/ruangakademikut/layanan", page("layanan.html"));
  app.get("/ruangakademikut/blog-ut", page("blog-ut.html"));
  app.get(["/admin/layanan", "/admin/layanan/"], (req, res) => fs.readFile(path.join(dir, "layanan-admin.html"), "utf8", (err, html) => err ? res.status(500).end() : res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).type("html").send(html)));
  app.get("/ruangakademikut/audit/hasil/:token", page("audit-hasil.html"));
  app.get(["/ruangakademikut/pesanan", "/ruangakademikut/pesanan/:token"], page("pesanan.html"));
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
