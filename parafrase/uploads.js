/* Unggah DOCX murid: simpan privat (di luar /uploads dan public), deteksi otomatis, hitung harga di server. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { analyze, summary, DocxError } = require("./docx");
const { quote } = require("./pricing");
const { analyzeFindings, countByCode } = require("./rules");
const { buildPreview } = require("./preview");
const { buildTriageBase, withDrillbit, parseDrill, settingsSig } = require("./triage");

const UPLOAD_TTL_MS = 2 * 3600 * 1000;       // unggahan yang tidak jadi pesanan dihapus setelah 2 jam
const RATE = { max: 10, windowMs: 3600 * 1000 };

module.exports = function mountUploads({ app, db, settings, root, sameOrigin, secret }) {
  const dir = path.join(root, "data", "private", "docs");
  fs.mkdirSync(dir, { recursive: true });
  const hits = new Map(); // ipHash -> [timestamps]
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (h, now) => {
    const arr = (hits.get(h) || []).filter(t => now - t < RATE.windowMs);
    if (arr.length >= RATE.max) { hits.set(h, arr); return true; }
    arr.push(now); hits.set(h, arr); return false;
  };

  const insert = db.prepare(`INSERT INTO uploads(id,path,original_name,size,sha256,detected,ip_hash,created_at,expires_at)
                             VALUES(?,?,?,?,?,?,?,?,?)`);

  app.post("/ms/parafrase/upload", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), ipHash = hashIp(req.ip);
    if (limited(ipHash, now)) return res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi satu jam lagi atau chat admin." });
    const cfg = settings.getAll();
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.file_max_mb * 1024 * 1024, files: 1, fields: 4 } }).single("file");
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${cfg.file_max_mb} MB).` : "Unggahan gagal. Coba lagi." });
      const f = req.file;
      if (!f) return res.status(400).json({ error: "Pilih satu file Word (.docx)." });
      const name = String(f.originalname || "").slice(0, 200);
      if (!/\.docx$/i.test(name)) {
        const ext = (name.match(/\.([a-z0-9]{1,5})$/i) || [])[1];
        return res.status(415).json({ error: `Hanya file Word (.docx) yang diterima${ext ? `, bukan .${ext.toLowerCase()}` : ""}. Punya PDF? Ubah dulu ke .docx supaya tata letak tidak bergeser.` });
      }
      try {
        const a = await analyze(f.buffer);
        const id = crypto.randomBytes(16).toString("hex");
        const rel = `docs/${id}.docx`;
        await fsp.writeFile(path.join(root, "data", "private", rel), f.buffer, { mode: 0o600 });
        const sha = crypto.createHash("sha256").update(f.buffer).digest("hex");
        const det = summary(a);
        const found = analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, cfg);
        const notes = countByCode(found);
        insert.run(id, rel, name, f.size, sha, JSON.stringify(det), ipHash, now, now + UPLOAD_TTL_MS);
        res.json({
          uploadId: id,
          file: { name, size: f.size },
          detected: det,
          notes,
          triage: withDrillbit(buildTriageBase({ paras: a.paragraphs, bibAt: a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex, findings: found, cfg }), null),
          quote: quote(det.wordsWithoutBibliography, false, cfg),
          fastLane: settings.publicConfig(now).fast_lane,
          expiresInMinutes: UPLOAD_TTL_MS / 60000,
        });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        console.error("[parafrase] upload gagal:", e && e.message);
        res.status(500).json({ error: "Dokumen tidak bisa diproses. Coba simpan ulang sebagai .docx lalu unggah lagi." });
      }
    });
  });

  /* Pratinjau terkunci: unggahan belum punya pesanan berbayar, jadi SELALU terkunci. (Pesanan berbayar memakai buildPreview dengan unlocked=true di tahap 6.) */
  const cache = new Map(); // id -> {a, findings, at}; kecil dan berumur pendek
  const getAnalysis = async (id, cfg) => {
    const c = cache.get(id), sig = settingsSig(cfg);
    if (c && Date.now() - c.at < 10 * 60 * 1000) {
      // admin mengubah ambang sejak analisis di-cache: hitung ulang temuan dan triage dari teks yang sama
      if (c.sig !== sig) { c.findings = analyzeFindings(c.a.paragraphs, c.a.bibliographyParagraphIndex, cfg); c.sig = sig; c.base = null; }
      return c;
    }
    const row = db.prepare("SELECT path, expires_at, order_id FROM uploads WHERE id=?").get(id);
    if (!row || row.expires_at < Date.now()) return null;
    let buf; try { buf = await fsp.readFile(path.join(root, "data", "private", row.path)); } catch { return null; }
    const a = await analyze(buf);
    const entry = { a, findings: analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, cfg), at: Date.now(), sig };
    cache.set(id, entry); if (cache.size > 8) cache.delete(cache.keys().next().value);
    return entry;
  };
  const pvHits = new Map();
  app.get("/ms/parafrase/preview/:id", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const id = String(req.params.id || "");
    if (!/^[a-f0-9]{32}$/.test(id)) return res.status(404).json({ error: "Unggahan tidak ditemukan." });
    const now = Date.now(), h = hashIp(req.ip);
    const arr = (pvHits.get(h) || []).filter(t => now - t < 3600 * 1000);
    if (arr.length >= 200) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba lagi nanti." });
    arr.push(now); pvHits.set(h, arr);
    try {
      const cfg = settings.getAll();
      const e = await getAnalysis(id, cfg);
      if (!e) return res.status(404).json({ error: "Unggahan tidak ditemukan atau sudah kedaluwarsa. Unggah ulang dokumenmu." });
      res.json(buildPreview(e.a, e.findings, secret, id, { unlocked: false, openParagraphs: cfg.preview_open_paragraphs, cfg, page: parseInt(req.query.page, 10) || 1, pageSize: parseInt(req.query.size, 10) || 30 }));
    } catch (err) { console.error("[parafrase] preview gagal:", err && err.message); res.status(500).json({ error: "Pratinjau tidak bisa dibuat." }); }
  });

  /* Lanjutkan unggahan yang sudah ada (mis. dari Audit Dokumen) tanpa unggah ulang, sekaligus menghitung ulang urgensi
     dengan angka Drillbit milik murid (?sim=&ai=, tidak disimpan). Responsnya sama dengan POST /upload. ID unggahan acak 128-bit dan
     hanya hidup 2 jam; unggahan yang sudah jadi pesanan tidak bisa dibuka lagi lewat sini. */
  app.get("/ms/parafrase/upload/:id", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const id = String(req.params.id || "");
    if (!/^[a-f0-9]{32}$/.test(id)) return res.status(404).json({ error: "Unggahan tidak ditemukan." });
    const now = Date.now(), h = hashIp(req.ip);
    const arr = (pvHits.get(h) || []).filter(t => now - t < 3600 * 1000);
    if (arr.length >= 200) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba lagi nanti." });
    arr.push(now); pvHits.set(h, arr);
    try {
      const row = db.prepare("SELECT original_name, size, expires_at, order_id FROM uploads WHERE id=?").get(id);
      if (!row || row.expires_at < now || row.order_id) return res.status(404).json({ error: "Unggahan tidak ditemukan, sudah kedaluwarsa, atau sudah dipakai pesanan. Unggah ulang dokumenmu." });
      const cfg = settings.getAll(), e = await getAnalysis(id, cfg);
      if (!e) return res.status(404).json({ error: "Unggahan tidak ditemukan atau sudah kedaluwarsa. Unggah ulang dokumenmu." });
      const a = e.a, det = summary(a), bibAt = a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex;
      e.base = e.base || buildTriageBase({ paras: a.paragraphs, bibAt, findings: e.findings, cfg });
      res.json({
        uploadId: id, file: { name: row.original_name, size: row.size }, detected: det, notes: countByCode(e.findings),
        quote: quote(det.wordsWithoutBibliography, false, cfg), fastLane: settings.publicConfig(now).fast_lane,
        triage: withDrillbit(e.base, parseDrill(req.query)), expiresInMinutes: Math.max(1, Math.round((row.expires_at - now) / 60000)),
      });
    } catch (err) { console.error("[parafrase] lanjut unggahan gagal:", err && err.message); res.status(500).json({ error: "Dokumen tidak bisa dimuat. Unggah ulang dokumenmu." }); }
  });

  /* Hapus unggahan yang kedaluwarsa dan belum jadi pesanan. */
  async function purgeExpired(now = Date.now()) {
    const rows = db.prepare("SELECT id, path FROM uploads WHERE expires_at<? AND order_id IS NULL").all(now);
    for (const r of rows) {
      try { await fsp.unlink(path.join(root, "data", "private", r.path)); } catch (e) { if (e.code !== "ENOENT") continue; }
      db.prepare("DELETE FROM uploads WHERE id=?").run(r.id);
    }
    return rows.length;
  }
  return { purgeExpired, dir };
};
