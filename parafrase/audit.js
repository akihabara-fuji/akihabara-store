/* Audit Dokumen.
   - Audit Ringkas (gratis, wajib login): ringkasan jumlah dan kategori. Penjelasan TIDAK dikirim ke browser.
   - Audit Lengkap (berbayar): memakai pesanan + QRIS yang sudah ada (doc_type='audit'). Setelah admin mengonfirmasi bayar,
     hasil lengkap terbuka lewat tautan rahasia pesanan, dan file dihapus otomatis sesuai masa simpan.
   Semua temuan dari aturan pasti dan pengecekan DOI nyata, tanpa AI dan tanpa tebakan. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { analyze, DocxError } = require("./docx");
const { runAudit } = require("./auditrules");
const { buildTriageBase, withDrillbit, parseDrill, settingsSig } = require("./triage");

const MAX_MB = 10, RATE = { max: 10, windowMs: 3600 * 1000 }, UPLOAD_TTL_MS = 2 * 3600 * 1000;

module.exports = function mountAudit({ app, express, db, settings, orders, root, sameOrigin, secret, fetchFn, userFrom = null }) {
  const dir = path.join(root, "data", "private", "docs");
  fs.mkdirSync(dir, { recursive: true });
  const hits = new Map();
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (key, max, now) => {
    const arr = (hits.get(key) || []).filter(t => now - t < RATE.windowMs);
    if (arr.length >= max) { hits.set(key, arr); return true; }
    arr.push(now); hits.set(key, arr); return false;
  };
  const doFetch = fetchFn || (typeof fetch === "function" ? fetch : null);
  let running = 0; // batas pekerjaan bersamaan, supaya server tidak berat saat ramai
  const MAX_RUNNING = 3;
  const insert = db.prepare(`INSERT INTO uploads(id,path,original_name,size,sha256,detected,ip_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`);
  const quote = words => { const r = orders.auditRate(settings.getAll()); return { words, perWord: r.perWord, min: r.min, total: Math.max(words * r.perWord, r.min) }; };

  app.post("/ms/audit/upload", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("u:" + h, RATE.max, now)) return res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi satu jam lagi atau chat admin." });
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
        const cfg = settings.getAll();
        const r = await runAudit(a, { fetchFn: doFetch, cfg });
        const words = a.wordsAll || 0;
        const triage = withDrillbit(buildTriageBase({ paras: a.paragraphs, bibAt: r.bodyAt, findings: r.docFindings, cfg }), null); // tanpa teks dokumen (gratis)
        // Simpan sementara (2 jam) supaya bisa dibeli sebagai Audit Lengkap; yang tidak dibeli dihapus otomatis oleh purgeExpired.
        const id = crypto.randomBytes(16).toString("hex"), rel = `docs/${id}.docx`;
        await fsp.writeFile(path.join(root, "data", "private", rel), f.buffer, { mode: 0o600 });
        insert.run(id, rel, name, f.size, crypto.createHash("sha256").update(f.buffer).digest("hex"), JSON.stringify({ kind: "audit", words, wordsWithoutBibliography: a.wordsBody, hasBibliography: !!a.hasBibliography }), h, now, now + UPLOAD_TTL_MS);
        res.json({
          uploadId: id, file: { name, size: f.size }, words, counts: r.counts, refs: r.refs, score: r.score, triage,
          /* Hanya tingkat, kategori, dan lokasi. Penjelasan ada di Audit Lengkap. */
          findings: r.findings.map(x => ({ sev: x.sev, cat: x.cat, where: x.where })),
          quote: quote(words),
        });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        console.error("[audit] gagal:", e && e.message);
        res.status(500).json({ error: "Dokumen tidak bisa diproses. Coba simpan ulang sebagai .docx lalu unggah lagi." });
      } finally { running--; }
    });
  });

  /* Beli Audit Lengkap: membuat pesanan; pembayaran lewat halaman pesanan (QRIS + bukti bayar). */
  app.post("/ms/audit/order", express.json({ limit: "8kb" }), (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("o:" + h, 10, now)) return res.status(429).json({ error: "Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti." });
    try {
      const { r, token, payExp } = orders.createAuditOrder(req.body || {}, h, now, userFrom ? userFrom(req) : null);
      res.json({ orderId: r.id, token, total: r.total, expiresAt: payExp, ...(r.coins ? { paid: "koin", coins: r.coins } : {}), url: "/ruangakademikut/pesanan/" + token });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message, ...(e.login ? { login: true } : {}), ...(e.short ? { short: e.short, balance: e.balance } : {}) });
      console.error("[audit] pesanan gagal:", e && e.message); res.status(500).json({ error: "Pesanan tidak bisa dibuat. Coba lagi." });
    }
  });

  /* Hasil lengkap: hanya untuk pesanan audit yang sudah dikonfirmasi dan filenya belum dihapus. */
  const cache = new Map();
  app.get("/ms/audit/report/:token", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now();
    if (limited("r:" + hashIp(req.ip), 120, now)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    const o = orders.byToken(req.params.token);
    if (!o || o.doc_type !== "audit") return res.status(404).json({ error: "Hasil tidak ditemukan." });
    if (!orders.view(o, now).auditReady) return res.status(402).json({ error: "Hasil belum terbuka (belum dibayar) atau file sudah dihapus." });
    const drill = parseDrill(req.query); // angka Drillbit opsional dari murid (tidak disimpan)
    const hit = cache.get(o.id), sig = settingsSig(settings.getAll());
    if (hit && hit.sig === sig && now - hit.at < 10 * 60 * 1000) return res.json({ ...hit.data, triage: withDrillbit(hit.base, drill) });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Sedang ramai. Muat ulang beberapa detik lagi." });
    running++;
    try {
      const a = await analyze(await fsp.readFile(orders.priv(o.original_file)));
      const cfg = settings.getAll();
      const r = await runAudit(a, { fetchFn: doFetch, cfg });
      const base = buildTriageBase({ paras: a.paragraphs, bibAt: r.bodyAt, findings: r.docFindings, cfg, withText: true }); // berbayar: potongan awal paragraf boleh tampil
      const data = { title: o.title, words: o.word_count, counts: r.counts, refs: r.refs, score: r.score, findings: r.findings, deleteAt: o.delete_at };
      cache.set(o.id, { at: now, data, base, sig }); if (cache.size > 20) cache.delete(cache.keys().next().value);
      res.json({ ...data, triage: withDrillbit(base, drill) });
    } catch (e) { console.error("[audit] laporan gagal:", e && e.message); res.status(500).json({ error: "Hasil tidak bisa dibuat. Hubungi admin dengan ID pesananmu." }); }
    finally { running--; }
  });
};
