/* Rute koin: mahasiswa (saldo, riwayat, isi koin lewat QRIS + bukti bayar) dan admin (antrean, dana, penyesuaian).
   Logika uang ada di koin.js; berkas ini hanya HTTP, unggah bukti, dan pengecekan akses. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const { KATEGORI } = require("./koin");

const PROOF_MAX = 5 * 1024 * 1024;

module.exports = function mountKoin({ app, express, db, settings, koin, root, sameOrigin, requireAdmin, userFrom, users }) {
  const priv = p => path.join(root, "data", "private", p);
  fs.mkdirSync(priv("proofs"), { recursive: true });
  const J = express.json({ limit: "8kb" });
  const no = (res, c = 403, m = "Permintaan ditolak.") => res.status(c).json({ error: m });
  const wrap = fn => async (req, res) => { res.set("Cache-Control", "no-store"); try { await fn(req, res); } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message, ...(e.code ? { code: e.code } : {}) }); console.error("[koin]", e && e.message); res.status(500).json({ error: "Terjadi kesalahan. Coba lagi." }); } };
  const need = (req, res) => { const u = userFrom && userFrom(req); if (!u) { res.status(401).json({ error: "Masuk dulu untuk memakai koin.", login: true }); return null; } return u; };

  const buckets = new Map();
  const limited = (key, max, now = Date.now()) => {
    if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3600e3) buckets.delete(k);
    const arr = (buckets.get(key) || []).filter(t => now - t < 3600e3);
    if (arr.length >= max) { buckets.set(key, arr); return true; }
    arr.push(now); buckets.set(key, arr); return false;
  };
  const view = t => ({ token: t.token, base: t.base, coins: t.coins, uniqueCode: t.unique_code, total: t.total, status: t.status, rejectReason: t.reject_reason, hasProof: !!t.proof_path, expiresAt: t.pay_expires_at, createdAt: t.created_at, confirmedAt: t.confirmed_at });
  const cfgPub = () => ({ hasQris: !!settings.get("qris_image_path"), merchant: settings.getAll().qris_merchant_name, rate: koin.RP });

  /* ---------- mahasiswa ---------- */
  app.get("/ms/koin/me", wrap((req, res) => {
    const u = need(req, res); if (!u) return;
    const tops = db.prepare("SELECT * FROM coin_topups WHERE user_id=? ORDER BY created_at DESC LIMIT 10").all(String(u.id));
    res.json({ balance: koin.balance(u.id), history: koin.history(u.id, 60).map(r => ({ at: r.created_at, delta: r.delta, balance: r.balance_after, kind: r.kind, note: r.note })), topups: tops.map(view), ...cfgPub() });
  }));
  /* Hanya saldo, untuk chip di menu. Tanpa login: koin null. */
  app.get("/ms/koin/saldo", wrap((req, res) => { const u = userFrom && userFrom(req); res.json({ balance: u ? koin.balance(u.id) : null }); }));

  app.post("/ms/koin/topup", J, wrap((req, res) => {
    if (!sameOrigin(req)) return no(res);
    const u = need(req, res); if (!u) return;
    if (limited("kt:" + u.id, 12)) return no(res, 429, "Terlalu banyak tagihan. Coba lagi nanti.");
    const t = koin.createTopup(u.id, (req.body || {}).rupiah);
    res.json({ ok: true, topup: view(t), ...cfgPub() });
  }));
  const mine = (req, res) => { const u = need(req, res); if (!u) return null; const t = db.prepare("SELECT * FROM coin_topups WHERE token=? AND user_id=?").get(String(req.params.token), String(u.id)); if (!t) { no(res, 404, "Tagihan tidak ditemukan."); return null; } return t; };
  app.get("/ms/koin/topup/:token", wrap((req, res) => { const t = mine(req, res); if (t) res.json({ topup: view(t), ...cfgPub() }); }));
  const proofUp = multer({ storage: multer.memoryStorage(), limits: { fileSize: PROOF_MAX, files: 1 } }).single("proof");
  app.post("/ms/koin/topup/:token/proof", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return no(res);
    const t = mine(req, res); if (!t) return;
    if (limited("kp:" + t.token, 8)) return no(res, 429, "Terlalu banyak unggahan. Hubungi admin.");
    proofUp(req, res, async err => {
      if (err) return no(res, err.code === "LIMIT_FILE_SIZE" ? 413 : 400, err.code === "LIMIT_FILE_SIZE" ? "Foto terlalu besar (maksimal 5 MB)." : "Unggahan gagal.");
      if (!req.file) return no(res, 400, "Pilih foto bukti bayar.");
      try {
        let out;
        try {
          const meta = await sharp(req.file.buffer, { limitInputPixels: 50e6 }).metadata();
          if (!["jpeg", "png"].includes(meta.format)) throw new Error("format");
          out = await sharp(req.file.buffer, { limitInputPixels: 50e6 }).rotate().resize({ width: 1600, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        } catch { return no(res, 400, "File bukan foto JPG atau PNG yang valid."); }
        const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
        const rel = `proofs/koin-${t.token.slice(0, 12)}-${crypto.randomBytes(4).toString("hex")}.jpg`;
        await fsp.writeFile(priv(rel), out, { mode: 0o600 });
        let r; try { r = koin.attachProof(t.token, t.user_id, rel, hash); } catch (e) { fsp.unlink(priv(rel)).catch(() => {}); throw e; }
        if (r.old) fsp.unlink(priv(r.old)).catch(() => {});
        res.json({ ok: true, status: "menunggu_verifikasi" });
      } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message, ...(e.code ? { code: e.code } : {}) }); console.error("[koin] bukti:", e && e.message); res.status(500).json({ error: "Bukti bayar tidak bisa disimpan. Coba lagi." }); }
    });
  });

  /* ---------- simulasi presentasi: buka tanya jawab lengkap ---------- */
  const simOrder = (req, res) => {
    const u = need(req, res); if (!u) return null;
    const o = db.prepare("SELECT * FROM orders WHERE public_token=? AND service='simulasi'").get(String(req.params.token));
    if (!o || String(o.user_id || "") !== String(u.id)) { no(res, 404, "Simulasi tidak ditemukan di akunmu. Masuk dengan akun yang dipakai memesan."); return null; }
    if (o.status !== "terkirim") { no(res, 409, "Simulasi belum selesai dikerjakan."); return null; }
    return { u, o };
  };
  app.get("/ms/koin/simulasi/:token", wrap((req, res) => {
    const x = simOrder(req, res); if (!x) return;
    const st = koin.simState(x.u.id, x.o.id);
    res.json({ unlocked: st.unlocked, free: st.firstFree && !st.unlocked, coins: settings.getAll().sim_koin_price, balance: koin.balance(x.u.id) });
  }));
  app.post("/ms/koin/simulasi/:token/buka", J, wrap((req, res) => {
    if (!sameOrigin(req)) return no(res);
    const x = simOrder(req, res); if (!x) return;
    if (limited("ks:" + x.u.id, 30)) return no(res, 429, "Terlalu banyak percobaan. Coba lagi nanti.");
    try { const r = koin.unlockSim(x.u.id, x.o.id, settings.getAll().sim_koin_price); res.json({ ok: true, free: !!r.free, already: !!r.already, balance: r.balance }); }
    catch (e) { if (e.status === 402) return res.status(402).json({ error: `Saldo koinmu kurang ${e.short} koin. Isi koin dulu.`, short: e.short, balance: e.balance }); throw e; }
  }));

  /* ---------- admin ---------- */
  const who = req => (req.admin && req.admin.name) || "admin";
  const email = id => { const u = users && users.byId && users.byId(id); return u ? u.email : String(id); };
  app.get("/ms/admin/koin", requireAdmin, wrap((req, res) => {
    const pend = db.prepare("SELECT * FROM coin_topups WHERE status='menunggu_verifikasi' ORDER BY proof_at").all();
    const wd = db.prepare("SELECT * FROM fund_withdrawals ORDER BY id DESC LIMIT 50").all();
    res.json({ summary: koin.summary(), kategori: KATEGORI, pending: pend.map(t => ({ ...view(t), email: email(t.user_id), proofAt: t.proof_at })), withdrawals: wd });
  }));
  /* Antrean saja (tanpa angka dana): boleh dibuka admin pesanan. Ringkasan dana, pengambilan, dan penyesuaian khusus pemilik. */
  app.get("/ms/admin/koin/queue", requireAdmin, wrap((req, res) => {
    const pend = db.prepare("SELECT * FROM coin_topups WHERE status='menunggu_verifikasi' ORDER BY proof_at").all();
    res.json({ pending: pend.map(t => ({ ...view(t), email: email(t.user_id), proofAt: t.proof_at })) });
  }));
  app.get("/ms/admin/koin/topups/:token/proof", requireAdmin, async (req, res) => {
    const t = db.prepare("SELECT proof_path FROM coin_topups WHERE token=?").get(String(req.params.token));
    if (!t || !t.proof_path) return res.status(404).end();
    try { res.set("Cache-Control", "no-store").type("jpeg").send(await fsp.readFile(priv(t.proof_path))); } catch { res.status(404).end(); }
  });
  app.post("/ms/admin/koin/topups/:token/confirm", requireAdmin, wrap((req, res) => { const r = koin.confirmTopup(req.params.token, who(req)); res.json({ ok: true, balance: r.balance }); }));
  app.post("/ms/admin/koin/topups/:token/reject", requireAdmin, J, wrap((req, res) => { const r = koin.rejectTopup(req.params.token, (req.body || {}).reason); if (r.old) fsp.unlink(priv(r.old)).catch(() => {}); res.json({ ok: true }); }));
  app.post("/ms/admin/koin/withdraw", requireAdmin, J, wrap((req, res) => { const b = req.body || {}; const r = koin.withdraw(b.amount, b.category, b.note, who(req)); res.json({ ok: true, fromHolding: r.fromHolding, summary: r }); }));
  app.post("/ms/admin/koin/adjust", requireAdmin, J, wrap((req, res) => {
    const b = req.body || {}, u = users && users.byEmail && users.byEmail(b.email);
    if (!u) return no(res, 404, "Akun dengan email itu tidak ditemukan.");
    const delta = Number(b.delta); if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 5000) return no(res, 400, "Jumlah koin harus bilangan bulat, bukan 0, maksimal 5.000.");
    const r = koin.adjust(u.id, delta, b.reason, who(req), undefined, b.promo === true);
    res.json({ ok: true, balance: r.balance_after, email: u.email });
  }));
};
