/* Halaman publik Ruang Akademik UT. Berkas statis dari parafrase/pages, {{SITE}} diisi dari SITE_URL. */
"use strict";
const path = require("path");
const fs = require("fs");

module.exports = function mountPages({ app, express }) {
  const dir = path.join(__dirname, "pages");
  const SITE = (process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  const page = file => (req, res) => {
    fs.readFile(path.join(dir, file), "utf8", (err, html) => {
      if (err) return res.status(500).type("text").send("Halaman tidak tersedia.");
      res.set("Cache-Control", "no-cache").type("html").send(html.replaceAll("{{SITE}}", SITE));
    });
  };
  app.get(["/ruangakademikut", "/ruangakademikut/"], page("hub.html"));
  app.get("/ruangakademikut/cek-parafrase-mandiri", page("cek.html"));
  app.get("/ruangakademikut/pesanan", page("pesanan.html"));
  const ASSETS = new Set(["site.css", "hub.css", "common.js", "cek.js"]);
  app.get("/ruangakademikut/assets/:f", (req, res) => {
    if (!ASSETS.has(req.params.f)) return res.status(404).end();
    res.set("Cache-Control", "public, max-age=600").sendFile(path.join(dir, req.params.f));
  });
  // Alamat lama
  app.get(["/kebutuhan-anak-ut", "/akademik"], (req, res) => res.redirect(301, "/ruangakademikut"));
};
