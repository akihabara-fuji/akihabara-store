/* Layanan Ruang Akademik UT: Tugas, Diskusi, Metopen (per tahap atau paket), dan Revisi.
   Alur: pelanggan login, tulis kebutuhan + unggah file, bayar QRIS (halaman pesanan yang sudah ada),
   admin mengerjakan lewat Hermes lalu mengirim hasil (file Word/PDF atau teks). Hasil dan lampiran dihapus 24 jam kemudian.
   Memakai tabel pesanan yang sama (doc_type='layanan'); tidak ada AI di server. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { requirements, checkStage } = require("./metopen");
const { checkFree } = require("./revisi");

const SV = {
  tugas:          { label: "Tugas", price: 35000, kind: "tugas" },
  diskusi:        { label: "Diskusi", price: 20000, kind: "diskusi" },
  metopen1:       { label: "Metopen Tugas 1", price: 250000, kind: "metopen" },
  metopen2:       { label: "Metopen Tugas 2", price: 200000, kind: "metopen" },
  metopen3:       { label: "Metopen Tugas 3", price: 250000, kind: "metopen" },
  metopen4:       { label: "Metopen Tugas 4", price: 300000, kind: "metopen" },
  metopen_paket:  { label: "Paket Komplit Metopen", price: 919000, kind: "metopen" },
  revisi_tugas:   { label: "Revisi Tugas", price: 20000, kind: "revisi", of: "tugas" },
  revisi_diskusi: { label: "Revisi Diskusi", price: 10000, kind: "revisi", of: "diskusi" },
  revisi_metopen: { label: "Revisi Metopen", price: 99000, kind: "revisi", of: "metopen" },
};
const MAX_FILES = 5, MAX_MB = 10;
const MAGIC = { docx: b => b.slice(0, 2).toString() === "PK", pdf: b => b.slice(0, 4).toString() === "%PDF", png: b => b.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), jpg: b => b[0] === 0xff && b[1] === 0xd8, jpeg: b => b[0] === 0xff && b[1] === 0xd8, txt: b => !b.includes(0) };

module.exports = function mountLayanan({ app, express, db, settings, orders, root, sameOrigin, secret, requireAdmin }) {
  const priceOf = k => { const v = settings.get("price_" + k); return Number.isInteger(v) ? v : SV[k].price; };
  const labelOf = k => labelFor(settings, k); // nama tampil: bisa diubah admin (label_<kode>), bawaan dari SV
  const priv = p => path.join(root, "data", "private", p);
  const hits = new Map();
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (key, max, now) => { const a = (hits.get(key) || []).filter(t => now - t < 3600e3); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); return false; };
  const wa62 = raw => { let d = String(raw || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };
  const safeName = n => String(n || "file").replace(/[^\w.\- ()]/g, "_").slice(0, 80) || "file";
  const ext = n => ((String(n).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || "").toLowerCase();
  const bad = (status, error) => Object.assign(new Error(error), { status });

  app.get("/ms/layanan/config", (req, res) => { res.set("Cache-Control", "public, max-age=5"); res.json(Object.fromEntries(Object.entries(SV).map(([k, v]) => [k, { label: labelOf(k), price: priceOf(k), kind: v.kind, ...(v.of ? { of: v.of } : {}), ...requirements(k) }]))); });

  const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1048576, files: MAX_FILES, fields: 8 } }).array("files", MAX_FILES);
  app.post("/ms/layanan/order", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("o:" + h, 10, now)) return res.status(429).json({ error: "Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti." });
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB per file).` : `Unggahan gagal. Maksimal ${MAX_FILES} file.` });
      try {
        const b = req.body || {}, files = req.files || [];
        const sv = SV[b.service]; if (!sv) throw bad(400, "Pilih jenis layanan.");
        if (String(settings.get("layanan_nonaktif") || "").split(",").includes(b.service)) throw bad(409, `Layanan ${labelOf(b.service)} sedang tidak dibuka. Hubungi admin lewat WhatsApp.`);
        const wa = wa62(b.wa); if (!wa) throw bad(400, "Nomor WhatsApp tidak valid.");
        if (b.agree !== "true") throw bad(400, "Centang persetujuan syarat dan kebijakan privasi.");
        const brief = String(b.brief || "").trim().slice(0, 4000);
        if (brief.length < 5 && !files.length) throw bad(400, "Tulis kebutuhanmu atau unggah file soalnya.");
        for (const f of files) { const e = ext(f.originalname); if (!MAGIC[e] || !MAGIC[e](f.buffer)) throw bad(415, "File harus berupa Word (.docx), PDF, gambar (.png/.jpg), atau .txt yang valid."); }
        const stageErr = checkStage(b.service, labelOf(b.service), files.length, brief); if (stageErr) throw bad(400, stageErr);
        const unpaid = db.prepare("SELECT 1 FROM orders WHERE wa_number=? AND status='menunggu_bayar' AND pay_expires_at>?").all(wa, now);
        if (unpaid.length >= 3) throw bad(429, "Kamu masih punya 3 pesanan yang belum dibayar. Selesaikan atau tunggu kedaluwarsa dulu.");

        let free = false, parent = null;
        if (sv.kind === "revisi") {
          const pid = String(b.parentId || "").trim().toUpperCase();
          if (pid) {
            parent = db.prepare("SELECT * FROM orders WHERE id=?").get(pid);
            const used = parent ? db.prepare("SELECT COUNT(*) n FROM orders WHERE parent_order_id=? AND service LIKE 'revisi%'").get(pid).n : 0;
            const bad2 = checkFree({ sv, parent, parentSv: parent && SV[parent.service], wa, used }); if (bad2) throw bad(bad2.status, bad2.error);
            free = true;
          } else if (!files.length) throw bad(400, "Revisi dari luar perlu file lamanya. Unggah file yang mau direvisi.");
          if (!brief || brief.length < 5) throw bad(400, "Tempel masukan dari tutor di kotak kebutuhan.");
        }

        const cfg = settings.getAll(), token = crypto.randomBytes(24).toString("hex");
        const base = free ? 0 : priceOf(b.service), payExp = now + cfg.payment_window_minutes * 60e3;
        const r = db.transaction(() => {
          const last = db.prepare("SELECT MAX(CAST(SUBSTR(id,4) AS INTEGER)) n FROM orders").get().n || 1000;
          const id = "NA-" + (last + 1);
          let code = 0;
          if (!free && cfg.unique_code_enabled) {
            const taken = new Set(db.prepare("SELECT total FROM orders WHERE status IN ('menunggu_bayar','menunggu_verifikasi')").all().map(x => x.total));
            const fr = []; for (let c = 1; c <= cfg.unique_code_max; c++) if (!taken.has(base + c)) fr.push(c);
            if (!fr.length) throw bad(503, "Sistem pembayaran sedang penuh. Coba lagi beberapa menit lagi.");
            code = fr[crypto.randomInt(fr.length)];
          }
          const total = base + code, title = labelOf(b.service) + (brief ? ": " + brief.replace(/\s+/g, " ").slice(0, 60) : "");
          db.prepare(`INSERT INTO orders(id,public_token,wa_number,title,language,doc_type,service,brief,word_count,original_file,status,lane,price_per_word,min_price,fast_price,base_total,unique_code,total,deadline_at,pay_expires_at,confirmed_at,confirmed_by,parent_order_id,created_at,updated_at)
                      VALUES(?,?,?,?,?,'layanan',?,?,0,NULL,?, 'biasa',0,0,0,?,?,?,?,?,?,?,?,?,?)`)
            .run(id, token, wa, title, "id", b.service, brief, free ? "baru_dibayar" : "menunggu_bayar", base, code, total, now + 7 * 86400e3, payExp, free ? now : null, free ? "gratis" : null, parent ? parent.id : null, now, now);
          orders.event(id, "dibuat", `layanan=${b.service} total=${total} gratis=${free} ip=${h}`, now);
          return { id, total };
        })();
        const att = [];
        for (let i = 0; i < files.length; i++) {
          const rel = `layanan/${r.id}/${i + 1}-${safeName(files[i].originalname)}`;
          await fsp.mkdir(path.dirname(priv(rel)), { recursive: true });
          await fsp.writeFile(priv(rel), files[i].buffer, { mode: 0o600 });
          att.push({ name: safeName(files[i].originalname), path: rel, size: files[i].size });
        }
        if (att.length) db.prepare("UPDATE orders SET attach_json=? WHERE id=?").run(JSON.stringify(att), r.id);
        res.json({ orderId: r.id, token, total: r.total, free, url: "/ruangakademikut/pesanan/" + token });
      } catch (e) {
        if (e.status) return res.status(e.status).json({ error: e.message });
        console.error("[layanan] pesanan gagal:", e && e.message); res.status(500).json({ error: "Pesanan tidak bisa dibuat. Coba lagi." });
      }
    });
  });

  /* ---------- admin ---------- */
  const attOf = o => { try { return JSON.parse(o.attach_json || "[]"); } catch { return []; } };
  app.get("/ms/admin/layanan", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const rows = db.prepare("SELECT * FROM orders WHERE doc_type='layanan' AND (status IN ('baru_dibayar','dikerjakan') OR (status='terkirim' AND files_deleted_at IS NULL)) ORDER BY CASE status WHEN 'terkirim' THEN 1 ELSE 0 END, created_at").all();
    res.json({ orders: rows.map(o => ({ id: o.id, service: o.service, label: SV[o.service] ? labelOf(o.service) : o.service, title: o.title, wa: o.wa_number, brief: o.brief, status: o.status, total: o.total, parent: o.parent_order_id, createdAt: o.created_at, deleteAt: o.delete_at, attachments: attOf(o).map((a, i) => ({ n: i + 1, name: a.name, size: a.size })), hasResult: !!(o.result_path || o.result_text) })) });
  });
  app.get("/ms/admin/layanan/:id/file/:n", requireAdmin, async (req, res) => {
    const o = db.prepare("SELECT * FROM orders WHERE id=? AND doc_type='layanan'").get(String(req.params.id));
    const a = o && attOf(o)[Number(req.params.n) - 1]; if (!a) return res.status(404).end();
    try { res.set({ "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${a.name}"`, "X-Content-Type-Options": "nosniff" }).type("application/octet-stream").send(await fsp.readFile(priv(a.path))); } catch { res.status(404).end(); }
  });
  app.post("/ms/admin/layanan/:id/mulai", requireAdmin, (req, res) => {
    const now = Date.now(), r = db.prepare("UPDATE orders SET status='dikerjakan', work_started_at=?, updated_at=? WHERE id=? AND doc_type='layanan' AND status='baru_dibayar'").run(now, now, String(req.params.id));
    if (!r.changes) return res.status(409).json({ error: "Pesanan tidak bisa dimulai." });
    orders.event(String(req.params.id), "dikerjakan", null, now); res.json({ ok: true });
  });
  const resUp = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1048576, files: 1, fields: 4 } }).single("file");
  app.post("/ms/admin/layanan/:id/hasil", requireAdmin, (req, res) => {
    resUp(req, res, async err => {
      if (err) return res.status(400).json({ error: "Unggahan hasil gagal (maksimal 25 MB)." });
      try {
        const id = String(req.params.id), now = Date.now();
        const o = db.prepare("SELECT * FROM orders WHERE id=? AND doc_type='layanan'").get(id);
        if (!o) throw bad(404, "Pesanan tidak ditemukan.");
        if (!["baru_dibayar", "dikerjakan", "terkirim"].includes(o.status)) throw bad(409, "Pesanan belum dibayar.");
        const text = String((req.body && req.body.text) || "").trim().slice(0, 60000), f = req.file;
        if (!text && !f) throw bad(400, "Isi teks hasil atau pilih file hasil (Word atau PDF).");
        let rel = null, name = null;
        if (f) {
          const e = ext(f.originalname); if (!["docx", "pdf"].includes(e) || !MAGIC[e](f.buffer)) throw bad(415, "File hasil harus Word (.docx) atau PDF yang valid.");
          name = safeName(f.originalname); rel = `layanan/${id}/hasil-${name}`;
          await fsp.mkdir(path.dirname(priv(rel)), { recursive: true }); await fsp.writeFile(priv(rel), f.buffer, { mode: 0o600 });
        }
        const hrs = settings.getAll().retention_hours || 24;
        db.prepare("UPDATE orders SET status='terkirim', result_path=COALESCE(?,result_path), result_name=COALESCE(?,result_name), result_text=COALESCE(?,result_text), sent_at=?, delete_at=?, reminder_sent_at=NULL, updated_at=? WHERE id=?").run(rel, name, text || null, now, now + hrs * 3600e3, now, id);
        orders.event(id, "hasil_dikirim", null, now);
        res.json({ ok: true });
      } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    });
  });
  return { SV };
};
module.exports.SV = SV;

/* Nama tampil sebuah layanan: pengaturan admin (label_<kode>) bila diisi, kalau tidak nama bawaan. Dipakai juga oleh panel admin. */
function labelFor(settings, k) { return SV[k] ? (settings.get("label_" + k) || SV[k].label) : k; }
module.exports.labelFor = labelFor;
