/* Gambar situs yang bisa diganti admin tanpa buka VPS: maskot dan patung di landing, banner blog dan portal.
   Publik mengambil lewat /site-img/<grup>/<nama>.webp; bila belum diganti, dipakai berkas asli di public/assets. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const GROUPS = {
  hero: { label: "Landing Catatan Akademik", names: { "mascot-hero": "Maskot utama (atas landing)", "mascot-hero-s": "Maskot utama versi ringan (HP)", "mascot-studio": "Maskot bagian Studio", "statue-640": "Patung latar (ukuran kecil)", "statue-1000": "Patung latar (ukuran besar)", "model-ut": "Foto utama (mahasiswi di atas landing)" } },
  portal: { label: "Banner blog dan portal", names: { "blog-berita": "Blog dan berita", "jadwal-kalender": "Info UT: jadwal", "materi-belajar": "Materi belajar", "karir-lowongan": "Karir dan lowongan", "metodologi": "Metodologi penelitian", "preset-template": "Preset dan template", "registrasi": "Registrasi", "ruang-akademik": "Ruang Akademik", "selamat-datang": "Selamat datang", "tentang": "Tentang", "tips-kuliah": "Tips kuliah", "tools-ai": "Tools AI", "tugas-diskusi": "Tugas dan diskusi", "ujian-ut": "Ujian UT", "video-studio": "Video Content Studio" } },
};
const MAX = 12 * 1024 * 1024;

module.exports = function mountSiteImg({ app, root, requireAdmin }) {
  const dir = path.join(root, "data", "site-images");
  const file = (g, n) => path.join(dir, g, n + ".webp");
  const ok = (g, n) => !!(GROUPS[g] && GROUPS[g].names[n]);
  for (const g of Object.keys(GROUPS)) fs.mkdirSync(path.join(dir, g), { recursive: true });

  app.get("/site-img/:g/:f", (req, res) => {
    const m = /^([a-z0-9-]+)\.webp$/.exec(String(req.params.f)), g = String(req.params.g);
    if (!m || !ok(g, m[1])) return res.status(404).end();
    res.set({ "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    res.sendFile(file(g, m[1]), err => {
      if (!err || res.headersSent) return;
      res.sendFile(path.join(root, "public", "assets", g, m[1] + ".webp"), e2 => {
        if (!e2 || res.headersSent) return;
        res.sendFile(path.join(root, "public", "assets", g, m[1] + ".jpg"), e3 => { if (e3 && !res.headersSent) res.status(404).end(); });
      });
    });
  });

  app.get("/ms/admin/site-images", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ groups: Object.entries(GROUPS).map(([g, d]) => ({ group: g, label: d.label, items: Object.entries(d.names).map(([n, label]) => ({ name: n, label, has: fs.existsSync(file(g, n)) })) })) });
  });

  app.post("/ms/admin/site-images/:g/:n", requireAdmin, (req, res) => {
    const g = String(req.params.g), n = String(req.params.n);
    if (!ok(g, n)) return res.status(400).json({ error: "Gambar tidak dikenal." });
    multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX, files: 1 } }).single("img")(req, res, async err => {
      if (err || !req.file) return res.status(400).json({ error: "Pilih gambar (JPG, PNG, atau WebP, maks 12 MB)." });
      try {
        const out = await sharp(req.file.buffer, { limitInputPixels: 80e6 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
        await fsp.writeFile(file(g, n), out);
        res.json({ ok: true });
      } catch { res.status(400).json({ error: "File bukan gambar yang valid." }); }
    });
  });

  app.delete("/ms/admin/site-images/:g/:n", requireAdmin, async (req, res) => {
    const g = String(req.params.g), n = String(req.params.n);
    if (!ok(g, n)) return res.status(400).json({ error: "Gambar tidak dikenal." });
    await fsp.rm(file(g, n), { force: true });
    res.json({ ok: true });
  });
  return { GROUPS };
};
