/* Audit Dokumen: Audit Ringkas (gratis, wajib login). Dokumen TIDAK disimpan; hanya dibaca di memori.
   Detail temuan (penjelasan) sengaja tidak dikirim ke browser: itu bagian Audit Lengkap berbayar. */
"use strict";
const crypto = require("crypto");
const multer = require("multer");
const { analyze, DocxError } = require("./docx");
const { runAudit } = require("./auditrules");

const PRICE_PER_WORD = 20, MIN_PRICE = 35000;
const MAX_MB = 10, RATE = { max: 10, windowMs: 3600 * 1000 };

module.exports = function mountAudit({ app, sameOrigin, secret, fetchFn }) {
  const hits = new Map();
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (h, now) => {
    const arr = (hits.get(h) || []).filter(t => now - t < RATE.windowMs);
    if (arr.length >= RATE.max) { hits.set(h, arr); return true; }
    arr.push(now); hits.set(h, arr); return false;
  };
  const doFetch = fetchFn || (typeof fetch === "function" ? fetch : null);
  let running = 0; // batas pekerjaan bersamaan, supaya server tidak berat saat ramai
  const MAX_RUNNING = 3;

  app.post("/ms/audit/upload", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now();
    if (limited(hashIp(req.ip), now)) return res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi satu jam lagi atau chat admin." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Antrean audit sedang penuh. Coba lagi beberapa saat." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 2 } }).single("file");
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal. Coba lagi." });
      const f = req.file;
      if (!f) return res.status(400).json({ error: "Pilih satu file Word (.docx)." });
      const name = String(f.originalname || "").slice(0, 200);
      if (!/\.docx$/i.test(name)) return res.status(415).json({ error: "Hanya file Word (.docx) yang diterima. Punya PDF? Ubah dulu ke .docx." });
      running++;
      try {
        const a = await analyze(f.buffer);
        const r = await runAudit(a, { fetchFn: doFetch });
        const words = a.wordsAll || a.wordsBody || 0;
        res.json({
          file: { name, size: f.size },
          words,
          counts: r.counts,
          refs: r.refs,
          /* Hanya tingkat, kategori, dan lokasi. Penjelasan dan saran ada di Audit Lengkap. */
          findings: r.findings.map(x => ({ sev: x.sev, cat: x.cat, where: x.where })),
          quote: { words, perWord: PRICE_PER_WORD, min: MIN_PRICE, total: Math.max(words * PRICE_PER_WORD, MIN_PRICE) },
        });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        console.error("[audit] gagal:", e && e.message);
        res.status(500).json({ error: "Dokumen tidak bisa diproses. Coba simpan ulang sebagai .docx lalu unggah lagi." });
      } finally { running--; }
    });
  });
  return { PRICE_PER_WORD, MIN_PRICE };
};
