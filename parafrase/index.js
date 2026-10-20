/* Cek dan Parafrase Mandiri: modul mandiri. Dipasang dari server.js dengan satu baris:
     require("./parafrase")({ app, express, requireAdmin, ROOT });
   Tidak mengubah rute atau data yang sudah ada. */
"use strict";
const path = require("path");
const { open } = require("./db");
const { create } = require("./settings");

module.exports = function mount(ctx) {
  const { app, express, requireAdmin, ROOT } = ctx;
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

  return { db, settings };
};
