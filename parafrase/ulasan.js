/* Ulasan pelanggan: dikelola dari admin (teks + tangkapan layar chat), tampil di landing.
   Data: data/ulasan.json, gambar: data/ulasan-img/<id>.webp. Publik hanya melihat yang berstatus tampil. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

module.exports = function mountUlasan({ app, root, requireAdmin }) {
  const file = path.join(root, "data", "ulasan.json");
  const dir = path.join(root, "data", "ulasan-img");
  fs.mkdirSync(dir, { recursive: true });
  let items = [];
  try { items = JSON.parse(fs.readFileSync(file, "utf8")); if (!Array.isArray(items)) items = []; } catch {}
  let chain = Promise.resolve();
  const save = () => (chain = chain.then(() => fsp.writeFile(file + ".tmp", JSON.stringify(items, null, 1)).then(() => fsp.rename(file + ".tmp", file))));
  const imgPath = id => path.join(dir, id + ".webp");
  const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
  const pub = it => ({ id: it.id, nama: it.nama, ket: it.ket, teks: it.teks, img: it.img ? `/ms/ulasan/img/${it.id}.webp?v=${it.at}` : "" });

  app.get("/ms/ulasan", (req, res) => {
    res.set("Cache-Control", "public, max-age=30");
    res.json({ items: items.filter(i => i.tampil).sort((a, b) => b.at - a.at).map(pub) });
  });
  app.get("/ms/ulasan/img/:f", (req, res) => {
    const m = /^([a-f0-9]{12})\.webp$/.exec(String(req.params.f));
    const it = m && items.find(i => i.id === m[1] && i.tampil && i.img);
    if (!it) return res.status(404).end();
    res.set({ "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" });
    res.sendFile(imgPath(it.id), e => { if (e && !res.headersSent) res.status(404).end(); });
  });

  app.get("/ms/admin/ulasan", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ items: items.slice().sort((a, b) => b.at - a.at).map(i => Object.assign(pub(i), { tampil: i.tampil, izin: !!i.izin, at: i.at, imgAdmin: i.img ? `/ms/admin/ulasan/${i.id}/img?v=${i.at}` : "" })) });
  });
  app.get("/ms/admin/ulasan/:id/img", requireAdmin, (req, res) => {
    const it = items.find(i => i.id === String(req.params.id));
    if (!it || !it.img) return res.status(404).end();
    res.set("Cache-Control", "no-store"); res.sendFile(imgPath(it.id), e => { if (e && !res.headersSent) res.status(404).end(); });
  });

  /* tambah (tanpa id) atau ubah (dengan id); gambar opsional */
  app.post("/ms/admin/ulasan", requireAdmin, (req, res) => {
    multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 8 } }).single("img")(req, res, async err => {
      if (err) return res.status(400).json({ error: "Gambar maksimal 12 MB (JPG, PNG, atau WebP)." });
      const b = req.body || {};
      const nama = clip(b.nama, 60), teks = clip(b.teks, 500);
      if (!nama || !teks) return res.status(400).json({ error: "Nama dan isi ulasan wajib diisi." });
      let it = b.id ? items.find(i => i.id === String(b.id)) : null;
      if (b.id && !it) return res.status(404).json({ error: "Ulasan tidak ditemukan." });
      // testimoni asli: wajib ada izin pelanggan untuk menayangkan kata-katanya (dicatat bersama ulasan)
      if (!it && b.izin !== "1") return res.status(400).json({ error: "Centang dulu: pelanggan sudah mengizinkan ulasannya ditayangkan." });
      if (!it) { it = { id: crypto.randomBytes(6).toString("hex"), img: false }; items.push(it); }
      try {
        if (req.file) {
          const out = await sharp(req.file.buffer, { limitInputPixels: 80e6 }).rotate().resize({ width: 1000, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
          await fsp.writeFile(imgPath(it.id), out); it.img = true;
        } else if (b.hapusGambar === "1" && it.img) { await fsp.rm(imgPath(it.id), { force: true }); it.img = false; }
      } catch { items = items.filter(x => x !== it || x.img); return res.status(400).json({ error: "File bukan gambar yang valid." }); }
      Object.assign(it, { nama, ket: clip(b.ket, 80), teks, izin: !!it.izin || b.izin === "1", tampil: b.tampil !== "0" && b.tampil !== "false", at: Date.now() });
      await save(); res.json({ ok: true, id: it.id });
    });
  });
  app.post("/ms/admin/ulasan/:id/toggle", requireAdmin, async (req, res) => {
    const it = items.find(i => i.id === String(req.params.id)); if (!it) return res.status(404).json({ error: "Ulasan tidak ditemukan." });
    it.tampil = !it.tampil; await save(); res.json({ ok: true, tampil: it.tampil });
  });
  app.delete("/ms/admin/ulasan/:id", requireAdmin, async (req, res) => {
    const it = items.find(i => i.id === String(req.params.id)); if (!it) return res.status(404).json({ error: "Ulasan tidak ditemukan." });
    items = items.filter(i => i !== it); await save(); await fsp.rm(imgPath(it.id), { force: true }); res.json({ ok: true });
  });
};
