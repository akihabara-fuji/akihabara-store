/* Cek dan Parafrase Mandiri: modul mandiri. Dipasang dari server.js dengan satu baris:
     require("./parafrase")({ app, express, requireAdmin, ROOT });
   Tidak mengubah rute atau data yang sudah ada. */
"use strict";
const path = require("path");
const { open } = require("./db");
const crypto = require("crypto");
const fs = require("fs");
const { create } = require("./settings");
const mountUploads = require("./uploads");

module.exports = function mount(ctx) {
  const { app, express, requireAdmin, ROOT, sameOrigin } = ctx;
  const db = open(process.env.PARAFRASE_DB || path.join(ROOT, "data", "parafrase.db"));
  const settings = create(db);

  /* Publik: hanya harga, minimum, jalur cepat, dan kontak. Cache pendek agar perubahan admin cepat terlihat. */
  app.get("/ms/public-config", (req, res) => {
    res.set("Cache-Control", "public, max-age=10");
    res.json(settings.publicConfig());
  });

  /* Admin: lihat dan ubah pengaturan, riwayat perubahan. requireAdmin sudah memeriksa sesi dan asal permintaan. */
  app.get("/ms/admin/parafrase/settings", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ values: settings.getAll(), log: settings.log(30), fastLane: settings.publicConfig().fast_lane });
  });
  app.put("/ms/admin/parafrase/settings", requireAdmin, express.json({ limit: "8kb" }), (req, res) => {
    try {
      const values = settings.set(req.body && req.body.values, "admin");
      res.json({ ok: true, values });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  /* Rahasia untuk meng-hash IP (tidak menyimpan IP mentah). Disimpan di data/private. */
  const secretFile = path.join(ROOT, "data", "private", ".parafrase-secret");
  let secret = ""; try { secret = fs.readFileSync(secretFile, "utf8").trim(); } catch {}
  if (secret.length < 32) { fs.mkdirSync(path.dirname(secretFile), { recursive: true }); secret = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(secretFile, secret, { mode: 0o600 }); }

  const uploads = mountUploads({ app, db, settings, root: ROOT, sameOrigin: sameOrigin || (() => true), secret });
  const t = setInterval(() => uploads.purgeExpired().catch(() => {}), 10 * 60 * 1000); t.unref();

  return { db, settings, uploads };
};
