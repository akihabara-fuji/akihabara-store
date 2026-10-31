/* Gambar kartu layanan di Catatan Akademik. Admin mengunggah dari panel; publik hanya bisa mengambil lewat nama tetap. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const BASE = ["tugas", "diskusi", "metopen", "audit", "revisi", "pengarahan", "cek", "semester", "cv", "info"];
/* kartu baru di menu (data-slug="...") otomatis ikut: nama diambil dari judul <h2> kartunya */
const SLUGS = BASE.slice();
const LABELS = {};
try {
  const dirP = path.join(__dirname, "pages");
  for (const f of fs.readdirSync(dirP).filter(n => n.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dirP, f), "utf8");
    const re = /<article[^>]*data-slug="([a-z]+)"[^>]*>[\s\S]*?<h2>([^<]+)<\/h2>/g; let m;
    while ((m = re.exec(html))) { if (!SLUGS.includes(m[1])) SLUGS.push(m[1]); if (!LABELS[m[1]]) LABELS[m[1]] = m[2].replace(/&amp;/g, "&").trim(); }
  }
} catch {}
const MAX = 5 * 1024 * 1024;

module.exports = function mountCards({ app, root, requireAdmin }) {
  const dir = path.join(root, "data", "parafrase-cards");
  fs.mkdirSync(dir, { recursive: true });
  const file = slug => path.join(dir, slug + ".webp");
  // gambar bawaan bila admin belum mengunggah; unggahan admin selalu menang
  const DEFAULTS = { audit: "tools-ai", cv: "karir-lowongan", cek: "ruang-akademik", semester: "tips-kuliah", metopen: "metodologi", tugas: "tugas-diskusi", diskusi: "tugas-diskusi", revisi: "materi-belajar", pengarahan: "registrasi", info: "jadwal-kalender", bedah: "ujian-ut" };

  app.get(["/ruangakademikut/img/:name", "/assets/ut/img/:name"], (req, res) => {
    const m = /^([a-z]+)\.webp$/.exec(String(req.params.name));
    if (!m || !SLUGS.includes(m[1])) return res.status(404).end();
    res.set({ "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    res.sendFile(file(m[1]), err => {
      if (!err || res.headersSent) return;
      const d = DEFAULTS[m[1]];
      if (!d) return res.status(404).end();
      res.sendFile(path.join(root, "public", "assets", "portal", d + ".webp"), e2 => { if (e2 && !res.headersSent) res.status(404).end(); });
    });
  });

  app.get("/ms/admin/parafrase/card-images", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ slugs: SLUGS.map(s => ({ slug: s, label: LABELS[s] || null, has: fs.existsSync(file(s)) })) });
  });

  app.post("/ms/admin/parafrase/card-images/:slug", requireAdmin, (req, res) => {
    const slug = String(req.params.slug);
    if (!SLUGS.includes(slug)) return res.status(400).json({ error: "Kartu tidak dikenal." });
    multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX, files: 1 } }).single("img")(req, res, async err => {
      if (err || !req.file) return res.status(400).json({ error: "Pilih gambar (JPG, PNG, atau WebP, maks 5 MB)." });
      try {
        const out = await sharp(req.file.buffer, { limitInputPixels: 50e6 }).rotate().resize({ width: 1200, height: 900, fit: "cover" }).webp({ quality: 82 }).toBuffer();
        await fsp.writeFile(file(slug), out);
        res.json({ ok: true });
      } catch { res.status(400).json({ error: "File bukan gambar yang valid." }); }
    });
  });

  app.delete("/ms/admin/parafrase/card-images/:slug", requireAdmin, async (req, res) => {
    const slug = String(req.params.slug);
    if (!SLUGS.includes(slug)) return res.status(400).json({ error: "Kartu tidak dikenal." });
    await fsp.rm(file(slug), { force: true });
    res.json({ ok: true });
  });
  return { SLUGS };
};
