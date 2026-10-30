/* Pustaka dokumen admin: simpan file (Bedah, Cek & Parafrase, metopen) dalam satu daftar yang bisa dicari dan diunduh.
   Hanya pemilik. File disimpan privat di data/private/library, otomatis dihapus setelah 30 hari kecuali disematkan. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const drillbit = require("./drillbit");

const TTL_MS = 30 * 24 * 3600 * 1000;
const MAX_MB = 25, MAX_FILES = 10;
const KINDS = ["bedah", "parafrase", "metopen", "lain"];
const EXT = /\.(docx?|pdf|txt|md|xlsx?|pptx?|rtf|ris|zip)$/i;

module.exports = function mountDokumen({ app, express, db, root, requireAdmin }) {
  const priv = path.join(root, "data", "private");
  const dir = path.join(priv, "library");
  fs.mkdirSync(dir, { recursive: true });
  const base = "/ms/admin/parafrase/dokumen";
  const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
  const kindOf = v => (KINDS.includes(v) ? v : "lain");
  const pct = v => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null; };
  const reach = (v, t) => (v == null || t == null ? null : v <= t);
  const view = r => ({ id: r.id, name: r.name, title: r.title, kind: r.kind, aiPct: r.ai_pct, simPct: r.sim_pct, targetAi: r.target_ai, targetSim: r.target_sim, aiOk: reach(r.ai_pct, r.target_ai), simOk: reach(r.sim_pct, r.target_sim), note: r.note, size: r.size, source: r.source, orderId: r.order_id, pinned: !!r.pinned, createdAt: r.created_at, expiresAt: r.pinned ? null : r.expires_at });
  const nowMs = () => Date.now();

  const insert = db.prepare("INSERT INTO doc_library(id,name,title,kind,ai_pct,sim_pct,target_ai,target_sim,note,size,path,source,order_id,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)");
  async function put(buf, name, kind, note, source, orderId, m) {
    m = m || {};
    const id = crypto.randomBytes(8).toString("hex"), ext = (/\.[a-z0-9]{1,5}$/i.exec(name) || [".bin"])[0].toLowerCase();
    const rel = "library/" + id + ext, now = nowMs();
    await fsp.writeFile(path.join(priv, rel), buf, { mode: 0o600 });
    insert.run(id, name, clip(m.title, 200), kindOf(kind), m.ai == null ? null : m.ai, m.sim == null ? null : m.sim, m.tAi == null ? null : m.tAi, m.tSim == null ? null : m.tSim, note, buf.length, rel, source, orderId || null, now, now + TTL_MS);
    return id;
  }

  app.get(base, requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const q = clip(req.query.q, 80).toLowerCase(), kind = KINDS.includes(req.query.kind) ? req.query.kind : "";
    const rows = db.prepare("SELECT * FROM doc_library WHERE expires_at>? OR pinned=1 ORDER BY pinned DESC, created_at DESC LIMIT 500").all(nowMs())
      .filter(r => (!kind || r.kind === kind) && (!q || (r.name + " " + r.title + " " + r.note + " " + (r.order_id || "")).toLowerCase().includes(q)));
    res.json({ items: rows.map(view), ttlDays: TTL_MS / 86400000, kinds: KINDS });
  });

  app.post(base, requireAdmin, (req, res) => {
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FILES, fields: 6 } }).fields([{ name: "file", maxCount: MAX_FILES }, { name: "ai", maxCount: 1 }, { name: "sim", maxCount: 1 }]);
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal." });
      const F = req.files || {}, files = F.file || [];
      if (!files.length) return res.status(400).json({ error: "Pilih minimal satu file." });
      const bad = files.find(f => !EXT.test(f.originalname || ""));
      if (bad) return res.status(415).json({ error: `Jenis file tidak didukung: ${clip(bad.originalname, 80)}. Pakai Word, PDF, teks, Excel, PowerPoint, RIS, atau ZIP.` });
      try {
        const b = req.body || {}, ids = [], warn = [];
        let ai = pct(b.aiPct), sim = pct(b.simPct);
        for (const f of [...(F.ai || []), ...(F.sim || [])]) {   // jenis laporan dibaca dari isinya, bukan dari kolom yang dipilih
          if (f.buffer.slice(0, 4).toString() !== "%PDF") { warn.push("Laporan Drillbit harus PDF asli."); continue; }
          const k = await drillbit.detectKind(f.buffer);
          if (k === "ai") { const r = await drillbit.parseAi(f.buffer); if (r && r.ok) ai = pct(r.aiPct); else warn.push("Persen AI tidak terbaca dari laporan."); }
          else if (k === "sim") { const r = await drillbit.parseSim(f.buffer); if (r && r.ok) sim = pct(r.pct); else warn.push("Persen similarity tidak terbaca dari laporan."); }
          else warn.push("Satu file laporan tidak dikenali sebagai laporan Drillbit.");
        }
        const m = { title: b.title, ai, sim, tAi: pct(b.targetAi), tSim: pct(b.targetSim) };
        for (const f of files) ids.push(await put(f.buffer, clip(Buffer.from(f.originalname, "latin1").toString("utf8"), 160), b.kind, clip(b.note, 300), "manual", null, m));
        res.json({ ok: true, ids, aiPct: ai, simPct: sim, warn });
      } catch (e) { console.error("[dokumen] simpan gagal:", e && e.message); res.status(500).json({ error: "File gagal disimpan." }); }
    });
  });

  /* Arsipkan file dari satu pesanan (asli, hasil, revisi) ke pustaka, supaya tidak hilang saat retensi pesanan habis. */
  app.post(base + "/pesanan/:oid", requireAdmin, express.json({ limit: "2kb" }), async (req, res) => {
    const o = db.prepare("SELECT id,title,original_file,result_path,revised_path,doc_type FROM orders WHERE id=?").get(String(req.params.oid || ""));
    if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    const kind = (req.body || {}).kind ? kindOf(req.body.kind) : (o.doc_type === "metopen" ? "metopen" : "parafrase");
    const parts = [["asli", o.original_file], ["hasil", o.result_path], ["revisi", o.revised_path]].filter(x => x[1]);
    if (!parts.length) return res.status(404).json({ error: "Pesanan ini tidak punya file tersimpan (mungkin sudah dihapus sesuai retensi)." });
    const done = [];
    for (const [label, rel] of parts) {
      try {
        const buf = await fsp.readFile(path.join(priv, rel)), ext = (/\.[a-z0-9]{1,5}$/i.exec(rel) || [".docx"])[0];
        if (db.prepare("SELECT 1 FROM doc_library WHERE order_id=? AND name=?").get(o.id, `${o.id} ${label}${ext}`)) { done.push(label + " (sudah ada)"); continue; }
        await put(buf, `${o.id} ${label}${ext}`, kind, "", "pesanan", o.id, { title: o.title }); done.push(label);
      } catch { /* file sudah dihapus */ }
    }
    if (!done.length) return res.status(404).json({ error: "File pesanan sudah dihapus dari server." });
    res.json({ ok: true, saved: done });
  });

  app.get(base + "/:id/unduh", requireAdmin, (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    res.set("Cache-Control", "no-store");
    res.download(path.join(priv, r.path), r.name);
  });

  app.patch(base + "/:id", requireAdmin, express.json({ limit: "2kb" }), (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    const b = req.body || {};
    const pv = (k, cur) => (b[k] === undefined ? cur : pct(b[k]));
    db.prepare("UPDATE doc_library SET note=?, title=?, kind=?, pinned=?, ai_pct=?, sim_pct=?, target_ai=?, target_sim=? WHERE id=?")
      .run(b.note === undefined ? r.note : clip(b.note, 300), b.title === undefined ? r.title : clip(b.title, 200), b.kind === undefined ? r.kind : kindOf(b.kind), b.pinned === undefined ? r.pinned : (b.pinned ? 1 : 0), pv("aiPct", r.ai_pct), pv("simPct", r.sim_pct), pv("targetAi", r.target_ai), pv("targetSim", r.target_sim), r.id);
    res.json({ ok: true });
  });

  app.delete(base + "/:id", requireAdmin, async (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    try { await fsp.unlink(path.join(priv, r.path)); } catch { /* sudah hilang */ }
    db.prepare("DELETE FROM doc_library WHERE id=?").run(r.id);
    res.json({ ok: true });
  });

  async function purgeExpired() {
    for (const r of db.prepare("SELECT id,path FROM doc_library WHERE pinned=0 AND expires_at<?").all(nowMs())) {
      try { await fsp.unlink(path.join(priv, r.path)); } catch { /* sudah hilang */ }
      db.prepare("DELETE FROM doc_library WHERE id=?").run(r.id);
    }
  }
  return { purgeExpired };
};
