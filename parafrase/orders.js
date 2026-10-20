/* Pesanan: buat pesanan (harga dihitung di server), QRIS manual, bukti bayar, verifikasi admin.
   Status: menunggu_bayar -> menunggu_verifikasi -> baru_dibayar (selanjutnya dikelola Tahap 6b/8). */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const { analyze } = require("./docx");
const { analyzeFindings, saveFindings, countByCode } = require("./rules");
const { quote } = require("./pricing");
const { buildPreview } = require("./preview");
const queue = require("./queue");
const wordtools = require("./wordtools");

const PAID = new Set(["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang", "terkirim"]);
const PROOF_MAX = 5 * 1024 * 1024;

module.exports = function mountOrders({ app, express, db, settings, root, sameOrigin, requireAdmin, secret, notifier }) {
  const priv = p => path.join(root, "data", "private", p);
  for (const d of ["proofs", "qris"]) fs.mkdirSync(priv(d), { recursive: true });
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const buckets = new Map();
  const limited = (key, max, now = Date.now()) => {
    if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3600e3) buckets.delete(k); // cegah memori membengkak
    const arr = (buckets.get(key) || []).filter(t => now - t < 3600e3);
    if (arr.length >= max) { buckets.set(key, arr); return true; }
    arr.push(now); buckets.set(key, arr); return false;
  };
  const event = (orderId, type, detail, now = Date.now()) => db.prepare("INSERT INTO order_events(order_id,type,detail,at) VALUES(?,?,?,?)").run(orderId, type, detail == null ? null : String(detail).slice(0, 500), now);
  const byToken = t => (/^[a-f0-9]{48}$/.test(String(t)) ? db.prepare("SELECT * FROM orders WHERE public_token=?").get(t) : undefined);
  const wa62 = raw => { let d = String(raw || "").replace(/\D/g, ""); d = d.replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };
  const J = express.json({ limit: "16kb" });

  /* ---------- buat pesanan ---------- */
  function createOrder(body, ipHash, now = Date.now()) {
    const cfg = settings.getAll();
    const up = db.prepare("SELECT * FROM uploads WHERE id=?").get(String(body.uploadId || ""));
    if (!up || up.expires_at < now) throw Object.assign(new Error("Unggahan tidak ditemukan atau kedaluwarsa. Unggah ulang dokumenmu."), { status: 404 });
    if (up.order_id) throw Object.assign(new Error("Dokumen ini sudah dipakai untuk pesanan."), { status: 409 });
    const wa = wa62(body.wa); if (!wa) throw Object.assign(new Error("Nomor WhatsApp tidak valid."), { status: 400 });
    if (body.agree !== true) throw Object.assign(new Error("Centang persetujuan syarat dan kebijakan privasi."), { status: 400 });
    const dl = Number(body.deadline);
    if (!Number.isFinite(dl) || dl <= now || dl > now + 120 * 86400e3) throw Object.assign(new Error("Deadline harus waktu yang belum lewat."), { status: 400 });
    const det = JSON.parse(up.detected);
    const excl = body.excludeBib !== false && det.hasBibliography;
    const words = excl ? det.wordsWithoutBibliography : det.words;
    const wantFast = body.fast === true;
    const unpaid = db.prepare("SELECT lane FROM orders WHERE wa_number=? AND status='menunggu_bayar' AND pay_expires_at>?").all(wa, now);
    if (unpaid.length >= 3) throw Object.assign(new Error("Kamu masih punya 3 pesanan yang belum dibayar. Selesaikan atau tunggu kedaluwarsa dulu."), { status: 429 });
    if (wantFast && unpaid.some(u => u.lane === "cepat")) throw Object.assign(new Error("Kamu masih punya pesanan jalur cepat yang belum dibayar. Selesaikan dulu atau pilih jalur biasa."), { status: 409 });
    if (wantFast && !(cfg.fast_lane_enabled && cfg.fast_lane_daily_cap > 0)) throw Object.assign(new Error("Jalur cepat sedang tidak tersedia."), { status: 409 });
    const q = quote(words, wantFast, cfg);
    const title = String(body.title || det.title || "").trim().slice(0, 200);
    const lang = body.language === "en" ? "en" : "id";
    const docType = ["umum", "metopen", "artikel"].includes(body.docType) ? body.docType : det.docType || "umum";
    const token = crypto.randomBytes(24).toString("hex");
    const payExp = now + cfg.payment_window_minutes * 60e3;

    const tx = db.transaction(() => {
      if (wantFast) {
        const used = settings.fastLaneUsed(now);
        if (used >= cfg.fast_lane_daily_cap) throw Object.assign(new Error("Jalur cepat penuh hari ini."), { status: 409, code: "fast_full" });
      }
      const last = db.prepare("SELECT MAX(CAST(SUBSTR(id,4) AS INTEGER)) n FROM orders").get().n || 1000;
      const id = "NA-" + (last + 1);
      let code = 0;
      if (cfg.unique_code_enabled) {
        const taken = new Set(db.prepare("SELECT total FROM orders WHERE status IN ('menunggu_bayar','menunggu_verifikasi')").all().map(r => r.total));
        const free = []; for (let c = 1; c <= cfg.unique_code_max; c++) if (!taken.has(q.total + c)) free.push(c);
        if (!free.length) throw Object.assign(new Error("Sistem pembayaran sedang penuh. Coba lagi beberapa menit lagi."), { status: 503 });
        code = free[crypto.randomInt(free.length)];
      }
      const total = q.total + code;
      db.prepare(`INSERT INTO orders(id,public_token,wa_number,title,language,doc_type,word_count,original_file,status,lane,price_per_word,min_price,fast_price,base_total,unique_code,total,deadline_at,pay_expires_at,created_at,updated_at)
                  VALUES(?,?,?,?,?,?,?,?,'menunggu_bayar',?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, token, wa, title, lang, docType, words, up.path, wantFast ? "cepat" : "biasa", q.price_per_word, q.min_price, q.fast_price, q.base_total, code, total, dl, payExp, now, now);
      if (wantFast) db.prepare("INSERT INTO fast_reservations(order_id,day,status,expires_at,created_at) VALUES(?,?,?,?,?)").run(id, settings.wibDay(now), "reserved", payExp, now);
      db.prepare("UPDATE uploads SET order_id=? WHERE id=?").run(id, up.id);
      event(id, "dibuat", `kata=${words} total=${total} lane=${wantFast ? "cepat" : "biasa"} ip=${ipHash}`, now);
      return { id, total, code };
    });
    const r = tx();
    return { r, token, payExp, up };
  }

  app.post("/ms/parafrase/order", J, async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const ipHash = hashIp(req.ip);
    if (limited("o:" + ipHash, 10)) return res.status(429).json({ error: "Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti." });
    try {
      const { r, token, payExp, up } = createOrder(req.body || {}, ipHash);
      // Simpan catatan di database (teks asli tetap di server).
      try {
        const buf = await fsp.readFile(priv(up.path)); const a = await analyze(buf);
        saveFindings(db, r.id, analyzeFindings(a.paragraphs, a.bibliographyParagraphIndex, settings.getAll()));
      } catch (e) { console.error("[parafrase] simpan catatan gagal:", e && e.message); }
      res.json({ orderId: r.id, token, total: r.total, uniqueCode: r.code, expiresAt: payExp, url: "/ruangakademikut/pesanan/" + token });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message, code: e.code });
      console.error("[parafrase] buat pesanan gagal:", e && e.message); res.status(500).json({ error: "Pesanan tidak bisa dibuat. Coba lagi." });
    }
  });

  /* ---------- status publik ---------- */
  const view = (o, now = Date.now()) => {
    const cfg = settings.getAll();
    return {
      orderId: o.id, status: o.status, lane: o.lane, title: o.title, words: o.word_count,
      total: o.total, baseTotal: o.base_total, fastPrice: o.fast_price, uniqueCode: o.unique_code, pricePerWord: o.price_per_word,
      deadlineAt: o.deadline_at, payExpiresAt: o.pay_expires_at, expired: o.status === "menunggu_bayar" && o.pay_expires_at < now,
      proofUploaded: !!o.proof_uploaded_at, rejectReason: o.status === "menunggu_bayar" ? o.reject_reason : null,
      paid: PAID.has(o.status), hasQris: !!cfg.qris_image_path, merchantName: cfg.qris_merchant_name,
      adminWa: cfg.admin_wa_number, paymentWindowMinutes: cfg.payment_window_minutes,
      queue: ["baru_dibayar", "dianalisis", "dikerjakan"].includes(o.status) ? queue.info(db, o.id, cfg) : null,
      resultReady: o.status === "terkirim" && !!o.result_path && !o.files_deleted_at && (!o.delete_at || o.delete_at > now),
      resultName: o.result_name || null, deleteAt: o.delete_at || null, filesDeleted: !!o.files_deleted_at,
    };
  };
  app.get("/ms/parafrase/order/:token", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (limited("g:" + hashIp(req.ip), 600)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    const o = byToken(req.params.token); if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    res.json(view(o));
  });

  /* Foto QRIS toko: memang publik (dipindai pembeli), disajikan lewat rute, bukan folder statis. */
  app.get("/ms/parafrase/qris", async (req, res) => {
    const p = settings.get("qris_image_path");
    if (!p) return res.status(404).end();
    try { res.set("Cache-Control", "no-cache").type("png").send(await fsp.readFile(priv(p))); } catch { res.status(404).end(); }
  });

  /* ---------- bukti bayar ---------- */
  const proofUp = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX, files: 1 } }).single("proof");
  app.post("/ms/parafrase/order/:token/proof", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const o = byToken(req.params.token); if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (limited("p:" + o.id, 8)) return res.status(429).json({ error: "Terlalu banyak unggahan. Hubungi admin." });
    proofUp(req, res, async err => {
      if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Foto terlalu besar. Maksimal 5 MB." : "Unggahan gagal." });
      const now = Date.now(), f = req.file;
      if (!f) return res.status(400).json({ error: "Pilih foto bukti bayar." });
      const cur = db.prepare("SELECT * FROM orders WHERE id=?").get(o.id);
      if (!["menunggu_bayar", "menunggu_verifikasi"].includes(cur.status)) return res.status(409).json({ error: "Pesanan ini tidak menerima bukti bayar lagi." });
      if (cur.status === "menunggu_bayar" && cur.pay_expires_at < now) return res.status(409).json({ error: "Waktu pembayaran habis. Hubungi admin dengan menyebut ID pesananmu.", code: "expired" });
      try {
        const meta = await sharp(f.buffer, { limitInputPixels: 50e6 }).metadata();
        if (!["jpeg", "png"].includes(meta.format)) throw new Error("format");
        const out = await sharp(f.buffer, { limitInputPixels: 50e6 }).rotate().resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); // metadata (EXIF/GPS) dibuang
        const hash = crypto.createHash("sha256").update(f.buffer).digest("hex");
        const dup = db.prepare("SELECT id FROM orders WHERE proof_hash=? AND id<>? AND status<>'dikembalikan'").get(hash, cur.id);
        if (dup) return res.status(409).json({ error: "Foto ini sudah dipakai di pesanan lain. Unggah bukti bayar untuk pesanan ini." });
        const rel = `proofs/${cur.id}-${crypto.randomBytes(4).toString("hex")}.jpg`;
        await fsp.writeFile(priv(rel), out, { mode: 0o600 });
        if (cur.proof_path) fsp.unlink(priv(cur.proof_path)).catch(() => {});
        db.transaction(() => {
          db.prepare("UPDATE orders SET proof_path=?, proof_hash=?, proof_uploaded_at=?, queue_time=?, status='menunggu_verifikasi', reject_reason=NULL, updated_at=? WHERE id=?").run(rel, hash, now, now, now, cur.id);
          event(cur.id, "bukti_diunggah", `hash=${hash.slice(0, 12)}`, now);
        })();
        res.json({ ok: true, status: "menunggu_verifikasi" });
      } catch (e) { res.status(400).json({ error: "File bukan foto JPG atau PNG yang valid." }); }
    });
  });

  /* ---------- konfirmasi (dipakai admin; antarmuka sama bila nanti ada pembayaran otomatis) ---------- */
  function confirmPayment(orderId, source = "admin", now = Date.now()) {
    return db.transaction(() => {
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
      if (!o) throw Object.assign(new Error("Pesanan tidak ditemukan."), { status: 404 });
      if (!["menunggu_verifikasi", "menunggu_bayar"].includes(o.status)) throw Object.assign(new Error("Status pesanan tidak bisa dikonfirmasi: " + o.status), { status: 409 });
      db.prepare("UPDATE orders SET status='baru_dibayar', confirmed_at=?, confirmed_by=?, queue_time=COALESCE(queue_time,?), reject_reason=NULL, updated_at=? WHERE id=?").run(now, source, now, now, orderId);
      if (o.lane === "cepat") {
        const r = db.prepare("UPDATE fast_reservations SET status='confirmed' WHERE order_id=?").run(orderId);
        if (!r.changes) db.prepare("INSERT INTO fast_reservations(order_id,day,status,expires_at,created_at) VALUES(?,?,?,?,?)").run(orderId, settings.wibDay(now), "confirmed", now, now);
      }
      event(orderId, "dikonfirmasi", source, now);
      const done = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
      notifier.send("dikonfirmasi", done, now);
      return done;
    })();
  }
  function rejectPayment(orderId, reason, now = Date.now()) {
    const cfg = settings.getAll();
    return db.transaction(() => {
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
      if (!o) throw Object.assign(new Error("Pesanan tidak ditemukan."), { status: 404 });
      if (o.status !== "menunggu_verifikasi") throw Object.assign(new Error("Hanya pesanan menunggu verifikasi yang bisa ditolak."), { status: 409 });
      const why = String(reason || "").trim().slice(0, 200) || "Bukti bayar tidak sesuai.";
      const exp = now + cfg.payment_window_minutes * 60e3;
      db.prepare("UPDATE orders SET status='menunggu_bayar', reject_reason=?, proof_path=NULL, proof_hash=NULL, proof_uploaded_at=NULL, queue_time=NULL, pay_expires_at=?, updated_at=? WHERE id=?").run(why, exp, now, orderId);
      db.prepare("UPDATE fast_reservations SET expires_at=? WHERE order_id=? AND status='reserved'").run(exp, orderId);
      if (o.proof_path) fsp.unlink(priv(o.proof_path)).catch(() => {});
      event(orderId, "ditolak", why, now);
      notifier.send("ditolak", { ...db.prepare("SELECT * FROM orders WHERE id=?").get(orderId), revision_no: now }, now);
    })();
  }

  /* Pesanan yang tidak dibayar sampai batas waktu: kedaluwarsa, slot jalur cepat dilepas, dokumen dihapus. */
  async function expireUnpaid(now = Date.now()) {
    // Bukti yang tidak pernah diverifikasi lebih dari 7 hari juga dilepas agar tidak menggantung selamanya.
    db.prepare("UPDATE orders SET pay_expires_at=?, status='menunggu_bayar' WHERE status='menunggu_verifikasi' AND proof_uploaded_at<?").run(now - 1, now - 7 * 86400e3);
    const rows = db.prepare("SELECT id, original_file, proof_path FROM orders WHERE status='menunggu_bayar' AND pay_expires_at<?").all(now);
    for (const r of rows) {
      db.transaction(() => {
        db.prepare("UPDATE orders SET status='kedaluwarsa', updated_at=? WHERE id=?").run(now, r.id);
        db.prepare("UPDATE fast_reservations SET status='released' WHERE order_id=? AND status='reserved'").run(r.id);
        event(r.id, "kedaluwarsa", null, now);
        notifier.send("kedaluwarsa", db.prepare("SELECT * FROM orders WHERE id=?").get(r.id), now);
      })();
      for (const f of [r.original_file, r.proof_path]) if (f) { try { await fsp.unlink(priv(f)); } catch {} }
      db.prepare("DELETE FROM uploads WHERE order_id=?").run(r.id);
    }
    return rows.length;
  }

  /* ---------- pratinjau terbuka (hanya pesanan yang sudah dikonfirmasi) ---------- */
  app.get("/ms/parafrase/order/:token/preview", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const o = byToken(req.params.token); if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (limited("v:" + o.id, 300)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    try {
      const a = await analyze(await fsp.readFile(priv(o.original_file)));
      const findings = db.prepare("SELECT code, para_idx, sent_idx, reason FROM findings WHERE order_id=? ORDER BY seq").all(o.id);
      res.json(buildPreview(a, findings, secret, o.id, { unlocked: PAID.has(o.status), openSentences: settings.get("preview_open_sentences"), page: parseInt(req.query.page, 10) || 1, pageSize: parseInt(req.query.size, 10) || 30 }));
    } catch { res.status(404).json({ error: "Dokumen tidak tersedia (mungkin sudah dihapus)." }); }
  });

  /* ---------- admin ---------- */
  app.get("/ms/admin/parafrase/orders", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const st = String(req.query.status || "");
    const rows = st ? db.prepare("SELECT * FROM orders WHERE status=? ORDER BY COALESCE(queue_time,created_at)").all(st)
                    : db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300").all();
    res.json({ orders: rows.map(o => ({ ...view(o), wa: o.wa_number, proofAt: o.proof_uploaded_at, queueTime: o.queue_time, createdAt: o.created_at, hasProof: !!o.proof_path, rejectReasonRaw: o.reject_reason })) });
  });
  app.get("/ms/admin/parafrase/orders/:id/proof", requireAdmin, async (req, res) => {
    const o = db.prepare("SELECT proof_path FROM orders WHERE id=?").get(String(req.params.id));
    if (!o || !o.proof_path) return res.status(404).end();
    try { res.set("Cache-Control", "no-store").type("jpeg").send(await fsp.readFile(priv(o.proof_path))); } catch { res.status(404).end(); }
  });
  const wrap = fn => (req, res) => { try { res.json({ ok: true, order: view(fn(req)) }); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };
  app.post("/ms/admin/parafrase/orders/:id/confirm", requireAdmin, wrap(req => confirmPayment(String(req.params.id), "admin")));
  app.post("/ms/admin/parafrase/orders/:id/reject", requireAdmin, J, wrap(req => { rejectPayment(String(req.params.id), req.body && req.body.reason); return db.prepare("SELECT * FROM orders WHERE id=?").get(String(req.params.id)); }));
  app.post("/ms/admin/parafrase/qris", requireAdmin, (req, res) => {
    multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX, files: 1 } }).single("qris")(req, res, async err => {
      if (err || !req.file) return res.status(400).json({ error: "Pilih foto QRIS (JPG atau PNG, maks 5 MB)." });
      try {
        const out = await sharp(req.file.buffer, { limitInputPixels: 50e6 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png().toBuffer();
        await fsp.writeFile(priv("qris/qris.png"), out, { mode: 0o600 });
        settings.set({ qris_image_path: "qris/qris.png" }, "admin");
        res.json({ ok: true });
      } catch { res.status(400).json({ error: "File bukan gambar yang valid." }); }
    });
  });

  /* ---------- Cek Pesanan: ID + nomor WhatsApp ---------- */
  app.post("/ms/parafrase/lookup", J, (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const ipk = "l:" + hashIp(req.ip);
    if (limited(ipk, 12)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
    const id = String((req.body && req.body.orderId) || "").trim().toUpperCase(), wa = wa62(req.body && req.body.wa);
    if (limited("lo:" + id, 12)) return res.status(429).json({ error: "Terlalu banyak percobaan untuk pesanan ini. Hubungi admin." });
    const o = /^NA-\d{3,9}$/.test(id) && wa ? db.prepare("SELECT public_token FROM orders WHERE id=? AND wa_number=?").get(id, wa) : null;
    if (!o) return res.status(404).json({ error: "ID pesanan dan nomor WhatsApp tidak cocok." });
    res.json({ url: "/ruangakademikut/pesanan/" + o.public_token });
  });

  /* ---------- unduh hasil (hanya setelah terkirim dan sebelum dihapus) ---------- */
  app.get("/ms/parafrase/order/:token/result", async (req, res) => {
    const o = byToken(req.params.token); if (!o) return res.status(404).end();
    if (limited("d:" + o.id, 60)) return res.status(429).end();
    const now = Date.now();
    if (o.status !== "terkirim" || !o.result_path || o.files_deleted_at || (o.delete_at && o.delete_at <= now)) return res.status(410).json({ error: "File hasil tidak tersedia (belum selesai atau sudah dihapus)." });
    try {
      const buf = await fsp.readFile(priv(o.result_path));
      const name = (o.result_name || o.id + ".docx").replace(/[^\w.\- ()]/g, "_");
      res.set({ "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${name}"`, "X-Content-Type-Options": "nosniff" })
        .type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(buf);
      event(o.id, "diunduh", null, now);
    } catch { res.status(410).json({ error: "File hasil tidak tersedia." }); }
  });

  /* ---------- admin: antrean, mulai kerja, kotak keluar WA ---------- */
  app.get("/ms/admin/parafrase/queue", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    const cfg = settings.getAll();
    const full = id => db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    res.json({ queue: queue.rows(db).map(q => { const o = full(q.id); return { ...view(o), wa: o.wa_number, position: q.position, queueTime: o.queue_time, workStartedAt: o.work_started_at, hasRevised: !!o.revised_path }; }), avgWordsPerHour: cfg.avg_words_per_hour });
  });
  function startWork(orderId, now = Date.now()) {
    return db.transaction(() => {
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
      if (!o) throw Object.assign(new Error("Pesanan tidak ditemukan."), { status: 404 });
      if (!["baru_dibayar", "dianalisis"].includes(o.status)) throw Object.assign(new Error("Pesanan ini tidak bisa dimulai: " + o.status), { status: 409 });
      db.prepare("UPDATE orders SET status='dikerjakan', work_started_at=?, updated_at=? WHERE id=?").run(now, now, orderId);
      event(orderId, "dikerjakan", null, now);
      notifier.send("dikerjakan", db.prepare("SELECT * FROM orders WHERE id=?").get(orderId), now);
      return db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
    })();
  }
  app.post("/ms/admin/parafrase/orders/:id/start", requireAdmin, wrap(req => startWork(String(req.params.id))));
  app.get("/ms/admin/parafrase/outbox", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ webhook: notifier.hookConfigured(), rows: db.prepare("SELECT id, order_id, to_number, kind, text, status, attempts, last_error, created_at, sent_at FROM wa_outbox ORDER BY id DESC LIMIT 100").all() });
  });
  app.post("/ms/admin/parafrase/outbox/:id/sent", requireAdmin, (req, res) => {
    const r = db.prepare("UPDATE wa_outbox SET status='sent', sent_at=? WHERE id=? AND status IN ('manual','queued','failed')").run(Date.now(), parseInt(req.params.id, 10) || 0);
    res.status(r.changes ? 200 : 404).json({ ok: !!r.changes });
  });

  /* ---------- retensi: pengingat dan penghapusan file ---------- */
  async function sweepRetention(now = Date.now()) {
    const cfg = settings.getAll(); let deleted = 0;
    for (const o of db.prepare("SELECT * FROM orders WHERE status='terkirim' AND delete_at IS NOT NULL AND files_deleted_at IS NULL").all()) {
      if (o.delete_at <= now) {
        for (const f of [o.original_file, o.result_path, o.revised_path, o.proof_path]) if (f) { try { await fsp.unlink(priv(f)); } catch {} }
        db.prepare("UPDATE orders SET files_deleted_at=?, updated_at=? WHERE id=?").run(now, now, o.id);
        db.prepare("DELETE FROM uploads WHERE order_id=?").run(o.id);
        db.prepare("UPDATE findings SET text='' WHERE order_id=?").run(o.id);
        event(o.id, "file_dihapus", null, now); deleted++;
      } else if (cfg.reminder_before_delete_hours > 0 && !o.reminder_sent_at && o.delete_at - cfg.reminder_before_delete_hours * 3600e3 <= now) {
        notifier.send("pengingat", o, now);
        db.prepare("UPDATE orders SET reminder_sent_at=? WHERE id=?").run(now, o.id);
      }
    }
    return deleted;
  }

  /* ---------- admin: Word berwarna, unggah revisi, cek ulang, kirim hasil bersih ---------- */
  const rowById = id => db.prepare("SELECT * FROM orders WHERE id=?").get(String(id));
  const dbFindings = id => db.prepare("SELECT seq, code, para_idx, sent_idx, text, reason FROM findings WHERE order_id=? ORDER BY seq").all(id);
  const slug = t => String(t || "dokumen").normalize("NFKD").replace(/[^\w ()-]/g, "").trim().replace(/\s+/g, " ").slice(0, 60) || "dokumen";
  const fail = (res, e) => res.status(e.status || 500).json({ error: e.status ? e.message : "Terjadi kesalahan." });

  app.get("/ms/admin/parafrase/orders/:id/colored", requireAdmin, async (req, res) => {
    const o = rowById(req.params.id);
    if (!o || o.files_deleted_at || !PAID.has(o.status)) return res.status(404).json({ error: "Pesanan tidak ditemukan, belum dibayar, atau file sudah dihapus." });
    try {
      const buf = await wordtools.buildColored(await fsp.readFile(priv(o.original_file)), dbFindings(o.id));
      res.set({ "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${o.id} berwarna.docx"` })
        .type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(buf);
      event(o.id, "word_berwarna_diunduh", null);
    } catch (e) { console.error("[parafrase] berwarna gagal:", e && e.message); res.status(500).json({ error: "Word berwarna gagal dibuat." }); }
  });

  const revUp = () => multer({ storage: multer.memoryStorage(), limits: { fileSize: settings.get("file_max_mb") * 1048576, files: 1 } }).single("file");
  app.post("/ms/admin/parafrase/orders/:id/revised", requireAdmin, (req, res) => {
    revUp()(req, res, async err => {
      const o = rowById(req.params.id);
      if (!o || o.files_deleted_at) return res.status(404).json({ error: "Pesanan tidak ditemukan atau file sudah dihapus." });
      if (!["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang", "terkirim"].includes(o.status)) return res.status(409).json({ error: "Status pesanan belum bisa menerima revisi: " + o.status });
      if (err || !req.file || !/\.docx$/i.test(req.file.originalname || "")) return res.status(400).json({ error: "Pilih file Word (.docx) hasil revisi." });
      try {
        await analyze(req.file.buffer); // validasi: DOCX sah dan berisi teks
        const rel = `revised/${o.id}.docx`; fs.mkdirSync(priv("revised"), { recursive: true });
        await fsp.writeFile(priv(rel), req.file.buffer, { mode: 0o600 });
        const now = Date.now();
        db.prepare("UPDATE orders SET revised_path=?, status=CASE WHEN status='terkirim' THEN status ELSE 'cek_ulang' END, updated_at=? WHERE id=?").run(rel, now, o.id);
        event(o.id, "revisi_diunggah", req.file.size, now);
        res.json({ ok: true, report: await wordtools.recheck(req.file.buffer, dbFindings(o.id), settings.getAll()) });
      } catch (e) { res.status(422).json({ error: e && e.code ? e.message : "File revisi tidak bisa dibaca." }); }
    });
  });
  app.get("/ms/admin/parafrase/orders/:id/recheck", requireAdmin, async (req, res) => {
    const o = rowById(req.params.id);
    if (!o || !o.revised_path || o.files_deleted_at) return res.status(404).json({ error: "Belum ada file revisi." });
    try { res.set("Cache-Control", "no-store").json({ report: await wordtools.recheck(await fsp.readFile(priv(o.revised_path)), dbFindings(o.id), settings.getAll()) }); } catch (e) { fail(res, e); }
  });
  app.post("/ms/admin/parafrase/orders/:id/finalize", requireAdmin, async (req, res) => {
    const o = rowById(req.params.id);
    if (!o || !o.revised_path || o.files_deleted_at) return res.status(404).json({ error: "Belum ada file revisi untuk dikirim." });
    if (!["cek_ulang", "dikerjakan", "terkirim"].includes(o.status)) return res.status(409).json({ error: "Status tidak bisa dikirim: " + o.status });
    try {
      const clean = await wordtools.acceptAndClean(await fsp.readFile(priv(o.revised_path)));
      await analyze(clean); // pastikan hasil bersih masih DOCX sah
      const rel = `results/${o.id}.docx`; fs.mkdirSync(priv("results"), { recursive: true });
      await fsp.writeFile(priv(rel), clean, { mode: 0o600 });
      const cfg = settings.getAll(), now = Date.now(), resend = o.status === "terkirim";
      db.prepare("UPDATE orders SET status='terkirim', result_path=?, result_name=?, sent_at=?, delete_at=?, reminder_sent_at=NULL, revision_no=revision_no+?, updated_at=? WHERE id=?")
        .run(rel, `${slug(o.title)} - NextAja.docx`, now, now + cfg.retention_hours * 3600e3, resend ? 1 : 0, now, o.id);
      event(o.id, resend ? "hasil_dikirim_ulang" : "hasil_dikirim", null, now);
      notifier.send("selesai", rowById(o.id), now);
      res.json({ ok: true, order: view(rowById(o.id)) });
    } catch (e) { console.error("[parafrase] finalisasi gagal:", e && e.message); res.status(500).json({ error: "Gagal membuat file bersih." }); }
  });

  return { createOrder, confirmPayment, rejectPayment, expireUnpaid, startWork, sweepRetention, byToken, event, view, priv };

};
