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
const KINDS = ["bedah", "audit", "parafrase", "metopen", "lain"];
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
  const STATUS = ["baru", "diproses", "perbaikan_dikirim", "revisi"];
  const view = r => ({ studentKey: r.student_key, studentName: r.student_name, nim: r.nim, wa: r.wa, status: r.status, revisionNo: r.revision_no, hasFix: !!r.fix_path, fixName: r.fix_name, fixSentAt: r.fix_sent_at, words: r.words, hasAi: !!r.ai_path, hasSim: !!r.sim_path, id: r.id, name: r.name, title: r.title, kind: r.kind, aiPct: r.ai_pct, simPct: r.sim_pct, targetAi: r.target_ai, targetSim: r.target_sim, aiOk: reach(r.ai_pct, r.target_ai), simOk: reach(r.sim_pct, r.target_sim), note: r.note, size: r.size, source: r.source, orderId: r.order_id, pinned: !!r.pinned, createdAt: r.created_at, expiresAt: r.pinned ? null : r.expires_at });
  const nowMs = () => Date.now();
  const wa62 = raw => { let d = String(raw || "").replace(/\D/g, ""); d = d.replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };

  const insert = db.prepare("INSERT INTO doc_library(id,name,title,kind,ai_pct,sim_pct,target_ai,target_sim,note,size,path,source,order_id,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)");
  async function put(buf, name, kind, note, source, orderId, m) {
    m = m || {};
    const id = crypto.randomBytes(8).toString("hex"), ext = (/\.[a-z0-9]{1,5}$/i.exec(name) || [".bin"])[0].toLowerCase();
    const rel = "library/" + id + ext, now = nowMs();
    await fsp.writeFile(path.join(priv, rel), buf, { mode: 0o600 });
    insert.run(id, name, clip(m.title, 200), kindOf(kind), m.ai == null ? null : m.ai, m.sim == null ? null : m.sim, m.tAi == null ? null : m.tAi, m.tSim == null ? null : m.tSim, note, buf.length, rel, source, orderId || null, now, now + TTL_MS);
    return id;
  }

  /* Dipanggil Bedah setiap kali mahasiswa mengunggah: file asli, laporan AI, laporan similarity, dan hasil bacaannya. */
  async function saveBedah({ user, name, buf, aiBuf, simBuf, ai, sim, words, problemPct, wa, nama, nim, service }) {
    const id = crypto.randomBytes(8).toString("hex"), now = nowMs();
    const ext = (/\.[a-z0-9]{1,5}$/i.exec(name) || [".docx"])[0].toLowerCase();
    const rel = "library/" + id + ext, aiRel = aiBuf ? "library/" + id + ".ai.pdf" : null, simRel = simBuf ? "library/" + id + ".sim.pdf" : null;
    const data = {
      words: words || null, problemPct: problemPct == null ? null : problemPct,
      ai: ai && { pct: ai.aiPct, humanPct: ai.humanPct, matchedWords: ai.matchedWords, totalWords: ai.totalWords, pages: ai.pages, sentences: ai.sentences, confidence: ai.confidence, blockTable: ai.blockTable, blocks: (ai.blocks || []).map(b => ({ n: b.n, words: b.words })) },
      sim: sim && { pct: sim.pct, grade: sim.grade, matchedSources: sim.matchedSources, pages: sim.pages, totalWords: sim.totalWords, sourceTypes: sim.sourceTypes, content: sim.content, excluded: sim.excluded, sources: sim.sources }
    };
    /* Satu mahasiswa = NIM yang sama (bila ada), kalau tidak, nomor WhatsApp yang sama. Unggahan berikutnya otomatis jadi revisi di bawah namanya. */
    const cleanNim = String(nim || "").replace(/\D/g, "").slice(0, 12), cleanName = clip(nama, 80);
    /* Satu mahasiswa = satu akun. Layanan lain (Audit, Cek & Parafrase) memakai kunci akun yang sama, jadi semua dokumennya satu kelompok.
       Bila NIM yang terbaca sudah dikenal di kelompok lain (akun berbeda), unggahan ikut kelompok itu. */
    let key = user && user.id ? "user:" + user.id : (cleanNim.length >= 8 ? "nim:" + cleanNim : wa ? "wa:" + wa : null);
    if (cleanNim.length >= 8) { const hit = db.prepare("SELECT student_key k FROM doc_library WHERE nim=? AND student_key IS NOT NULL ORDER BY created_at LIMIT 1").get(cleanNim); if (hit) key = hit.k; }
    let rev = 0, status = "baru", mismatch = false;
    if (key) {
      const prev = db.prepare("SELECT student_name, wa, nim, revision_no FROM doc_library WHERE student_key=? ORDER BY created_at DESC LIMIT 1").get(key);
      const n = db.prepare("SELECT COUNT(*) c FROM doc_library WHERE student_key=? AND kind='bedah'").get(key).c;
      if (n > 0) { rev = n; status = "revisi"; }
      const norm = v => String(v || "").toLowerCase().replace(/[^a-z]/g, "");
      mismatch = !!(prev && cleanName && prev.student_name && norm(prev.student_name) !== norm(cleanName));
      if (prev && !cleanName) nama = prev.student_name; // nama kosong: ikut yang sudah tercatat
      if (!nama && user && user.name) nama = user.name;
      if (prev && !wa) wa = prev.wa;
    }
    data.nameMismatch = mismatch;
    /* File yang sama (sha256) milik akun yang sama sudah tersimpan dari layanan lain (Cek & Parafrase atau Bedah): jangan simpan salinan kedua,
       cukup lengkapi baris yang ada dengan laporan Drillbit dan hasil bacaannya. */
    data.sha = crypto.createHash("sha256").update(buf).digest("hex"); data.usedIn = [service === "cek" ? "cek" : "bedah"];
    if (key) {
      const dup = db.prepare("SELECT id, data FROM doc_library WHERE student_key=? AND data LIKE ? LIMIT 1").get(key, '%"sha":"' + data.sha + '"%');
      if (dup) {
        let od = {}; try { od = dup.data ? JSON.parse(dup.data) : {}; } catch { /* data lama rusak */ }
        const dAi = aiBuf ? "library/" + dup.id + ".ai.pdf" : null, dSim = simBuf ? "library/" + dup.id + ".sim.pdf" : null;
        if (dAi) await fsp.writeFile(path.join(priv, dAi), aiBuf, { mode: 0o600 });
        if (dSim) await fsp.writeFile(path.join(priv, dSim), simBuf, { mode: 0o600 });
        const merged = { ...od, ...data, usedIn: [...new Set([...(od.usedIn || []), service === "cek" ? "cek" : "bedah"])] };
        db.prepare("UPDATE doc_library SET ai_path=COALESCE(?,ai_path), sim_path=COALESCE(?,sim_path), ai_pct=COALESCE(?,ai_pct), sim_pct=COALESCE(?,sim_pct), words=COALESCE(?,words), data=?, nim=COALESCE(nim,?), wa=COALESCE(wa,?), student_name=COALESCE(student_name,?) WHERE id=?")
          .run(dAi, dSim, ai ? pct(ai.aiPct) : null, sim ? pct(sim.pct) : null, words || null, JSON.stringify(merged), cleanNim || null, wa || null, clip(nama, 80) || null, dup.id);
        return dup.id;
      }
    }
    await fsp.writeFile(path.join(priv, rel), buf, { mode: 0o600 });
    if (aiRel) await fsp.writeFile(path.join(priv, aiRel), aiBuf, { mode: 0o600 });
    if (simRel) await fsp.writeFile(path.join(priv, simRel), simBuf, { mode: 0o600 });
    db.prepare("INSERT INTO doc_library(id,name,title,kind,ai_pct,sim_pct,target_ai,target_sim,note,size,path,ai_path,sim_path,words,data,student_key,student_name,nim,wa,status,revision_no,source,order_id,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,NULL,NULL,'',?,?,?,?,?,?,?,?,?,?,?,?,'bedah',NULL,0,?,?)")
      .run(id, clip(name, 160), clip(name.replace(/\.[a-z0-9]{1,5}$/i, ""), 200), "bedah", ai ? pct(ai.aiPct) : null, sim ? pct(sim.pct) : null, buf.length, rel, aiRel, simRel, words || null, JSON.stringify(data), key, clip(nama, 80) || null, cleanNim || null, wa || null, status, rev, now, now + TTL_MS);
    if (key) db.prepare("UPDATE doc_library SET nim=COALESCE(nim,?), wa=COALESCE(wa,?), student_name=COALESCE(student_name,?) WHERE student_key=?").run(cleanNim || null, wa || null, clip(nama, 80) || null, key);
    return id;
  }

  /* Setiap unggahan Audit Dokumen atau Cek & Parafrase langsung disimpan di sini, sebelum ada pembayaran atau pesanan.
     Satu akun (user) = satu kelompok; unggahan file yang sama oleh akun yang sama tidak digandakan. */
  async function saveUpload({ kind, name, buf, user, words, summary }) {
    const sha = crypto.createHash("sha256").update(buf).digest("hex");
    const key = user && user.id ? "user:" + user.id : null;
    /* File yang sama dari akun yang sama tidak digandakan, di layanan mana pun ia diunggah lebih dulu (Audit, Bedah, Cek & Parafrase). */
    const dup = key ? db.prepare("SELECT id, data FROM doc_library WHERE student_key=? AND data LIKE ? LIMIT 1").get(key, '%"sha":"' + sha + '"%') : db.prepare("SELECT id, data FROM doc_library WHERE kind=? AND student_key IS NULL AND data LIKE ? LIMIT 1").get(kindOf(kind), '%"sha":"' + sha + '"%');
    if (dup) {
      try { const od = dup.data ? JSON.parse(dup.data) : {}; const u = [...new Set([...(od.usedIn || []), kindOf(kind)])]; if (u.length !== (od.usedIn || []).length) db.prepare("UPDATE doc_library SET data=? WHERE id=?").run(JSON.stringify({ ...od, usedIn: u }), dup.id); } catch { /* biarkan */ }
      return dup.id;
    }
    const id = crypto.randomBytes(8).toString("hex"), now = nowMs();
    const ext = (/\.[a-z0-9]{1,5}$/i.exec(name) || [".docx"])[0].toLowerCase(), rel = "library/" + id + ext;
    await fsp.writeFile(path.join(priv, rel), buf, { mode: 0o600 });
    const n = key ? db.prepare("SELECT COUNT(*) c FROM doc_library WHERE student_key=? AND kind=?").get(key, kindOf(kind)).c : 0;
    const data = { sha, usedIn: [kindOf(kind)], words: words || null, summary: summary || null, email: (user && user.email) || null };
    db.prepare("INSERT INTO doc_library(id,name,title,kind,note,size,path,words,data,student_key,student_name,nim,wa,status,revision_no,source,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,?,?,?,0,?,?)")
      .run(id, clip(name, 160), clip(name.replace(/\.[a-z0-9]{1,5}$/i, ""), 200), kindOf(kind), clip(user && user.email, 120), buf.length, rel, words || null, JSON.stringify(data), key, clip(user && user.name, 80) || null, n ? "revisi" : "baru", n, kindOf(kind), now, now + TTL_MS);
    return id;
  }

  /* Laporan Drillbit (PDF AI dan Similarity) yang diunggah murid di Cek & Parafrase: dilekatkan ke dokumen yang sama di Dokumen Saya
     (dicari lewat sha256 file, kelompok akun yang sama), sama seperti yang dilakukan Bedah. */
  async function attachReports({ sha, user, aiBuf, simBuf, ai, sim }) {
    const key = user && user.id ? "user:" + user.id : "";
    const row = db.prepare("SELECT id, data FROM doc_library WHERE IFNULL(student_key,'')=? AND data LIKE ? ORDER BY created_at DESC LIMIT 1").get(key, '%"sha":"' + sha + '"%');
    if (!row) return null;
    const aiRel = aiBuf ? "library/" + row.id + ".ai.pdf" : null, simRel = simBuf ? "library/" + row.id + ".sim.pdf" : null;
    if (aiRel) await fsp.writeFile(path.join(priv, aiRel), aiBuf, { mode: 0o600 });
    if (simRel) await fsp.writeFile(path.join(priv, simRel), simBuf, { mode: 0o600 });
    let data = {}; try { data = row.data ? JSON.parse(row.data) : {}; } catch { /* data lama rusak: mulai baru */ }
    data.usedIn = [...new Set([...(data.usedIn || []), "parafrase"])];
    if (ai) data.ai = { pct: ai.aiPct, humanPct: ai.humanPct, matchedWords: ai.matchedWords, totalWords: ai.totalWords, pages: ai.pages, sentences: ai.sentences, confidence: ai.confidence, blockTable: ai.blockTable };
    if (sim) data.sim = { pct: sim.pct, grade: sim.grade, matchedSources: sim.matchedSources, pages: sim.pages, totalWords: sim.totalWords, sourceTypes: sim.sourceTypes, content: sim.content, excluded: sim.excluded, sources: sim.sources };
    db.prepare("UPDATE doc_library SET ai_path=COALESCE(?,ai_path), sim_path=COALESCE(?,sim_path), ai_pct=COALESCE(?,ai_pct), sim_pct=COALESCE(?,sim_pct), data=? WHERE id=?")
      .run(aiRel, simRel, ai ? pct(ai.aiPct) : null, sim ? pct(sim.pct) : null, JSON.stringify(data), row.id);
    return row.id;
  }

  app.get(base + "/:id(" + "[a-f0-9]{16}" + ")", requireAdmin, (req, res) => {
    const r = db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    let data = null; try { data = r.data ? JSON.parse(r.data) : null; } catch { /* abaikan */ }
    res.set("Cache-Control", "no-store").json({ item: view(r), data });
  });

  app.get(base, requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const q = clip(req.query.q, 80).toLowerCase(), kind = KINDS.includes(req.query.kind) ? req.query.kind : "";
    const rows = db.prepare("SELECT * FROM doc_library WHERE expires_at>? OR pinned=1 ORDER BY pinned DESC, created_at DESC LIMIT 500").all(nowMs())
      .filter(r => (!kind || r.kind === kind) && (!q || (r.name + " " + r.title + " " + r.note + " " + (r.student_name || "") + " " + (r.nim || "") + " " + (r.wa || "") + " " + (r.order_id || "")).toLowerCase().includes(q)));
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

  /* File perbaikan: simpan salinannya (opsional) dan tandai bahwa perbaikan sudah dikirim ke mahasiswa. */
  app.post(base + "/:id/perbaikan", requireAdmin, (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 2 } }).single("file");
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: "Unggahan gagal atau file terlalu besar." });
      try {
        let fixRel = r.fix_path, fixName = r.fix_name;
        if (req.file) {
          if (!EXT.test(req.file.originalname || "")) return res.status(415).json({ error: "Jenis file tidak didukung." });
          if (fixRel) { try { await fsp.unlink(path.join(priv, fixRel)); } catch { /* sudah hilang */ } }
          fixName = clip(Buffer.from(req.file.originalname, "latin1").toString("utf8"), 160);
          fixRel = "library/" + r.id + ".fix" + ((/\.[a-z0-9]{1,5}$/i.exec(fixName) || [".docx"])[0].toLowerCase());
          await fsp.writeFile(path.join(priv, fixRel), req.file.buffer, { mode: 0o600 });
        }
        db.prepare("UPDATE doc_library SET fix_path=?, fix_name=?, fix_sent_at=?, status='perbaikan_dikirim' WHERE id=?").run(fixRel, fixName, nowMs(), r.id);
        res.json({ ok: true });
      } catch (e) { console.error("[dokumen] perbaikan gagal:", e && e.message); res.status(500).json({ error: "File perbaikan gagal disimpan." }); }
    });
  });

  app.get(base + "/:id/unduh", requireAdmin, (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    res.set("Cache-Control", "no-store");
    const f = req.query.f === "fix" && r.fix_path ? [r.fix_path, r.fix_name || "perbaikan"] : req.query.f === "ai" && r.ai_path ? [r.ai_path, r.name.replace(/\.[a-z0-9]{1,5}$/i, "") + " laporan AI.pdf"] : req.query.f === "sim" && r.sim_path ? [r.sim_path, r.name.replace(/\.[a-z0-9]{1,5}$/i, "") + " laporan similarity.pdf"] : [r.path, r.name];
    res.download(path.join(priv, f[0]), f[1]);
  });

  app.patch(base + "/:id", requireAdmin, express.json({ limit: "2kb" }), (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    const b = req.body || {};
    const pv = (k, cur) => (b[k] === undefined ? cur : pct(b[k]));
    db.prepare("UPDATE doc_library SET note=?, title=?, kind=?, pinned=?, ai_pct=?, sim_pct=?, target_ai=?, target_sim=?, status=?, wa=?, student_name=? WHERE id=?")
      .run(b.note === undefined ? r.note : clip(b.note, 300), b.title === undefined ? r.title : clip(b.title, 200), b.kind === undefined ? r.kind : kindOf(b.kind), b.pinned === undefined ? r.pinned : (b.pinned ? 1 : 0), pv("aiPct", r.ai_pct), pv("simPct", r.sim_pct), pv("targetAi", r.target_ai), pv("targetSim", r.target_sim), STATUS.includes(b.status) ? b.status : r.status, b.wa === undefined ? r.wa : (wa62(b.wa) || r.wa), b.studentName === undefined ? r.student_name : clip(b.studentName, 80), r.id);
    res.json({ ok: true });
  });

  app.delete(base + "/:id", requireAdmin, async (req, res) => {
    const r = /^[a-f0-9]{16}$/.test(req.params.id) && db.prepare("SELECT * FROM doc_library WHERE id=?").get(req.params.id);
    if (!r) return res.status(404).json({ error: "Dokumen tidak ditemukan." });
    for (const p of [r.path, r.ai_path, r.sim_path, r.fix_path]) if (p) { try { await fsp.unlink(path.join(priv, p)); } catch { /* sudah hilang */ } }
    db.prepare("DELETE FROM doc_library WHERE id=?").run(r.id);
    res.json({ ok: true });
  });

  async function purgeExpired() {
    for (const r of db.prepare("SELECT id,path,ai_path,sim_path,fix_path FROM doc_library WHERE pinned=0 AND expires_at<?").all(nowMs())) {
      for (const p of [r.path, r.ai_path, r.sim_path, r.fix_path]) if (p) { try { await fsp.unlink(path.join(priv, p)); } catch { /* sudah hilang */ } }
      db.prepare("DELETE FROM doc_library WHERE id=?").run(r.id);
    }
  }
  return { purgeExpired, saveBedah, saveUpload, attachReports };
};
