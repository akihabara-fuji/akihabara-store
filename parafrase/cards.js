/* Gambar kartu layanan di Ruang Akademik UT. Admin mengunggah dari panel; publik hanya bisa mengambil lewat nama tetap. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const SLUGS = ["cek", "semester", "metopen", "tugas", "diskusi", "makalah", "info"];
const MAX = 5 * 1024 * 1024;

module.exports = function mountCards({ app, root, requireAdmin }) {
  const dir = path.join(root, "data", "parafrase-cards");
  fs.mkdirSync(dir, { recursive: true });
  const file = slug => path.join(dir, slug + ".webp");

  app.get("/ruangakademikut/img/:name", (req, res) => {
    const m = /^([a-z]+)\.webp$/.exec(String(req.params.name));
    if (!m || !SLUGS.includes(m[1])) return res.status(404).end();
    res.set({ "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" });
    res.sendFile(file(m[1]), err => { if (err && !res.headersSent) res.status(404).end(); });
  });

  app.get("/ms/admin/parafrase/card-images", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ slugs: SLUGS.map(s => ({ slug: s, has: fs.existsSync(file(s)) })) });
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
