/* Kisi-kisi: katalog mata kuliah, 5 soal latihan gratis, voucher (klaim bukti bagikan ke grup), dan pesanan QRIS.
   Mandiri: tabel sendiri (kisi_*), tidak menyentuh tabel pesanan lain. Harga dan potongan dihitung di server.
   File lengkap dikirim admin manual ke WhatsApp pelanggan setelah pembayaran dikonfirmasi (sama seperti pesanan lain). */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const MAX_SHOT = 5 * 1048576, MAX_FILE = 25 * 1048576, KLAIM_GRUP = 5, KLAIM_PCT = 60, VOUCHER_HARI = 14, EXPIRE_MS = 24 * 3600e3;
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa O, I, 0, 1 agar tidak salah baca
const SHOT_OK = { jpg: b => b[0] === 0xff && b[1] === 0xd8, jpeg: b => b[0] === 0xff && b[1] === 0xd8, png: b => b.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), webp: b => b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP" };
const FILE_OK = { pdf: b => b.slice(0, 4).toString() === "%PDF", docx: b => b.slice(0, 2).toString() === "PK", zip: b => b.slice(0, 2).toString() === "PK", png: SHOT_OK.png, jpg: SHOT_OK.jpg, jpeg: SHOT_OK.jpg };
const ext = n => ((String(n).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || "").toLowerCase();
const bad = (status, error) => Object.assign(new Error(error), { status });
const wa62 = raw => { const d = String(raw || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };
const slugOf = (kode, nama) => (String(kode) + "-" + String(nama)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,100}$/;
const newCode = () => Array.from(crypto.randomBytes(8), b => ALPH[b % ALPH.length]).join("");

/* Soal latihan: maksimal 5, masing-masing { q, o:[4 opsi], k:0-3, b: pembahasan }. Bentuk dirapikan dan dipotong di sini. */
function cleanSoal(arr) {
  if (!Array.isArray(arr)) throw bad(400, "Format soal tidak valid.");
  return arr.slice(0, 5).map((s, i) => {
    const q = String((s && s.q) || "").trim().slice(0, 600), o = Array.isArray(s && s.o) ? s.o.slice(0, 4).map(x => String(x || "").trim().slice(0, 240)) : [];
    const k = Number(s && s.k), b = String((s && s.b) || "").trim().slice(0, 600);
    if (!q || o.length !== 4 || o.some(x => !x) || !Number.isInteger(k) || k < 0 || k > 3) throw bad(400, `Soal ${i + 1} belum lengkap (pertanyaan, 4 pilihan, kunci).`);
    return { q, o, k, b };
  });
}

module.exports = function mountKisi({ app, express, db, settings, root, sameOrigin, requireAdmin, secret }) {
  const priv = (...p) => path.join(root, "data", "private", "kisi", ...p);
  fs.mkdirSync(priv("klaim"), { recursive: true }); fs.mkdirSync(priv("file"), { recursive: true });
  const hits = new Map();
  const hashIp = ip => crypto.createHmac("sha256", secret || "x").update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (key, max, now, win = 3600e3) => { const a = (hits.get(key) || []).filter(t => now - t < win); if (a.length >= max) { hits.set(key, a); return true; } a.push(now); hits.set(key, a); if (hits.size > 5000) hits.clear(); return false; };
  const fail = (res, e) => res.status(e.status || 500).json({ error: e.status ? e.message : "Terjadi kesalahan. Coba lagi." });
  const guardPost = (req, res) => { res.set("Cache-Control", "no-store"); if (!sameOrigin(req)) { res.status(403).json({ error: "Permintaan ditolak." }); return false; } return true; };
  const json = express.json({ limit: "64kb" });

  /* ---------- data ---------- */
  const mkRow = r => r && ({ id: r.id, kode: r.kode, nama: r.nama, jenis: r.jenis, periode: r.periode, slug: r.slug, harga: r.harga, tampil: !!r.tampil, ada_file: !!r.file_path, jml_soal: r.jml != null ? r.jml : soalOf(r).length });
  const list = () => db.prepare("SELECT id,kode,nama,jenis,periode,slug,harga,tampil,file_path,json_array_length(soal) AS jml FROM kisi_mk WHERE tampil=1 ORDER BY id").all().map(mkRow);
  const bySlug = slug => db.prepare("SELECT * FROM kisi_mk WHERE slug=? AND tampil=1").get(String(slug || ""));
  const soalOf = r => { try { return JSON.parse(r.soal || "[]"); } catch { return []; } };

  /* Voucher sah bila aktif, belum habis kuota, belum lewat masa, cocok MK dan nomor WA bila dibatasi. */
  function voucherCek(code, mk, wa, now = Date.now()) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false, error: "Tulis kode voucher." };
    const v = db.prepare("SELECT * FROM kisi_voucher WHERE code=?").get(c);
    if (!v || !v.aktif) return { ok: false, error: "Kode tidak berlaku." };
    if (v.terpakai >= v.kuota) return { ok: false, error: "Kuota voucher sudah habis." };
    if (v.berlaku_sampai && v.berlaku_sampai < now) return { ok: false, error: "Voucher sudah kedaluwarsa." };
    if (mk && !mk.file_path) return { ok: false, error: "Voucher hanya berlaku untuk kisi-kisi yang file lengkapnya sudah tersedia." };
    if (v.mk_id && mk && v.mk_id !== mk.id) return { ok: false, error: "Voucher ini untuk mata kuliah lain." };
    if (v.wa && wa && v.wa !== wa) return { ok: false, error: "Voucher ini terikat ke nomor WhatsApp lain." };
    return { ok: true, v };
  }
  const potongan = (harga, pct) => Math.min(harga, Math.round(harga * pct / 100));

  /* Pesanan belum dibayar lewat 24 jam dibatalkan dan voucher dikembalikan. */
  function expire(now = Date.now()) {
    const rows = db.prepare("SELECT id, voucher_code FROM kisi_pesanan WHERE status IN ('menunggu_bayar','menunggu_konfirmasi') AND created_at<?").all(now - EXPIRE_MS);
    for (const r of rows) release(r, "dibatalkan");
    return rows.length;
  }
  function release(o, status) {
    db.transaction(() => {
      db.prepare("UPDATE kisi_pesanan SET status=? WHERE id=?").run(status, o.id);
      if (o.voucher_code) db.prepare("UPDATE kisi_voucher SET terpakai=MAX(0,terpakai-1) WHERE code=?").run(o.voucher_code);
    })();
  }

  /* ---------- API publik ---------- */
  app.get("/ms/kisi/list", (req, res) => { res.set("Cache-Control", "public, max-age=60"); res.json({ items: list().map(m => [m.kode, m.jenis, m.nama, m.slug, m.periode, m.jml_soal]) }); });

  app.get("/ms/kisi/mk/:slug", (req, res) => {
    const r = bySlug(req.params.slug); if (!r) return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
    res.set("Cache-Control", "public, max-age=10"); res.json({ mk: mkRow(r), soal: soalOf(r) });
  });

  app.get("/ms/kisi/voucher", (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now(); if (limited("vc:" + hashIp(req.ip), 30, now, 600e3)) return res.status(429).json({ error: "Terlalu sering mencoba. Tunggu sebentar." });
    const mk = bySlug(req.query.slug); if (!mk) return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
    const wa = wa62(req.query.wa), r = voucherCek(req.query.kode, mk, wa);
    if (!r.ok) return res.status(400).json({ error: r.error });
    res.json({ ok: true, pct: r.v.pct, potongan: potongan(mk.harga, r.v.pct), total: mk.harga - potongan(mk.harga, r.v.pct) });
  });

  /* Buat pesanan: harga dari server, voucher diperiksa ulang, kode unik agar transfer mudah dicocokkan. */
  app.post("/ms/kisi/pesan", json, (req, res) => {
    if (!guardPost(req, res)) return;
    try {
      const now = Date.now(); if (limited("ps:" + hashIp(req.ip), 12, now)) throw bad(429, "Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti.");
      const b = req.body || {}, mk = bySlug(b.slug); if (!mk) throw bad(404, "Mata kuliah tidak ditemukan.");
      const wa = wa62(b.wa); if (!wa) throw bad(400, "Nomor WhatsApp tidak valid.");
      if (db.prepare("SELECT COUNT(*) n FROM kisi_pesanan WHERE wa=? AND status IN ('menunggu_bayar','menunggu_konfirmasi')").get(wa).n >= 3) throw bad(429, "Masih ada 3 pesanan yang belum selesai dibayar.");
      expire(now);
      const out = db.transaction(() => {
        let v = null, pot = 0;
        if (String(b.voucher || "").trim()) { const r = voucherCek(b.voucher, mk, wa, now); if (!r.ok) throw bad(400, r.error); v = r.v; pot = potongan(mk.harga, v.pct); }
        const base = mk.harga - pot, cfg = settings.getAll();
        let uc = 0;
        if (cfg.unique_code_enabled) {
          const taken = new Set(db.prepare("SELECT total FROM kisi_pesanan WHERE status IN ('menunggu_bayar','menunggu_konfirmasi')").all().map(x => x.total));
          const free = []; for (let c = 1; c <= cfg.unique_code_max; c++) if (!taken.has(base + c)) free.push(c);
          uc = free.length ? free[crypto.randomInt(free.length)] : 0;
        }
        const seq = db.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(id,4) AS INTEGER)),1000)+1 n FROM kisi_pesanan").get().n;
        const id = "KS-" + seq, token = crypto.randomBytes(24).toString("base64url");
        db.prepare("INSERT INTO kisi_pesanan(id,token,mk_id,wa,harga,voucher_code,potongan,unique_code,total,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,'menunggu_bayar',?)").run(id, token, mk.id, wa, mk.harga, v ? v.code : null, pot, uc, base + uc, now);
        if (v) { const u = db.prepare("UPDATE kisi_voucher SET terpakai=terpakai+1 WHERE code=? AND terpakai<kuota").run(v.code); if (!u.changes) throw bad(400, "Kuota voucher sudah habis."); }
        return { id, token, total: base + uc };
      })();
      res.json({ ok: true, ...out });
    } catch (e) { fail(res, e); }
  });

  const pubOrder = (o, mk, cfg) => ({ id: o.id, status: o.status, wa: "•••" + o.wa.slice(-4), mk: { kode: mk.kode, nama: mk.nama, slug: mk.slug }, harga: o.harga, potongan: o.potongan, kode_unik: o.unique_code, total: o.total, voucher: o.voucher_code || null, hasQris: !!cfg.qris_image_path, ada_file: !!mk.file_path, admin_wa: String(cfg.admin_wa_number || "").replace(/\D/g, "").replace(/^0/, "62"), merchant: cfg.qris_merchant_name, dibuat: o.created_at });
  app.get("/ms/kisi/pesanan/:token", (req, res) => {
    res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    const o = /^[\w-]{20,60}$/.test(req.params.token) ? db.prepare("SELECT * FROM kisi_pesanan WHERE token=?").get(req.params.token) : null;
    if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    res.json(pubOrder(o, db.prepare("SELECT * FROM kisi_mk WHERE id=?").get(o.mk_id), settings.getAll()));
  });
  /* Unduh file lengkap: hanya setelah admin mengonfirmasi pembayaran. Pertama kali diunduh, pesanan otomatis jadi Terkirim. */
  app.get("/ms/kisi/pesanan/:token/file", (req, res) => {
    res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
    const o = /^[\w-]{20,60}$/.test(req.params.token) ? db.prepare("SELECT * FROM kisi_pesanan WHERE token=?").get(req.params.token) : null;
    if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (!["lunas", "terkirim"].includes(o.status)) return res.status(403).json({ error: "File dibuka setelah pembayaran dikonfirmasi admin." });
    const mk = db.prepare("SELECT * FROM kisi_mk WHERE id=?").get(o.mk_id);
    if (!mk || !mk.file_path) return res.status(404).json({ error: "File belum tersedia. Hubungi admin lewat WhatsApp." });
    if (o.status === "lunas") db.prepare("UPDATE kisi_pesanan SET status='terkirim', sent_at=? WHERE id=?").run(Date.now(), o.id);
    res.download(priv("file", path.basename(mk.file_path)), mk.file_name || "kisi-kisi");
  });
  app.post("/ms/kisi/pesanan/:token/bayar", json, (req, res) => {
    if (!guardPost(req, res)) return;
    const o = /^[\w-]{20,60}$/.test(req.params.token) ? db.prepare("SELECT * FROM kisi_pesanan WHERE token=?").get(req.params.token) : null;
    if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    if (o.status === "menunggu_bayar") db.prepare("UPDATE kisi_pesanan SET status='menunggu_konfirmasi', paid_claimed_at=? WHERE id=?").run(Date.now(), o.id);
    else if (o.status !== "menunggu_konfirmasi") return res.status(409).json({ error: "Status pesanan sudah berubah." });
    res.json({ ok: true });
  });

  /* Klaim voucher 60%: 5 screenshot bukti bagikan ke 5 grup. Satu nomor satu klaim aktif per MK; gambar yang sama tidak boleh dipakai ulang. */
  const upShots = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SHOT, files: KLAIM_GRUP, fields: 6 } }).array("shots", KLAIM_GRUP);
  app.post("/ms/kisi/klaim", (req, res) => {
    if (!guardPost(req, res)) return;
    const now = Date.now(); if (limited("kl:" + hashIp(req.ip), 6, now)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
    upShots(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Screenshot terlalu besar (maksimal 5 MB per gambar)." : "Unggahan gagal. Maksimal 5 screenshot." });
      let dir = null;
      try {
        const b = req.body || {}, files = req.files || [], mk = bySlug(b.slug); if (!mk) throw bad(404, "Mata kuliah tidak ditemukan.");
        if (!mk.file_path) throw bad(400, "Klaim voucher belum dibuka untuk mata kuliah ini.");
        const wa = wa62(b.wa); if (!wa) throw bad(400, "Nomor WhatsApp tidak valid.");
        if (files.length < KLAIM_GRUP) throw bad(400, `Baru ${files.length} dari ${KLAIM_GRUP} screenshot. Lengkapi dulu ya.`);
        for (const f of files) { const e = ext(f.originalname); if (!SHOT_OK[e] || !SHOT_OK[e](f.buffer)) throw bad(415, "Screenshot harus berupa gambar .jpg, .png, atau .webp yang valid."); }
        const hashes = files.map(f => crypto.createHash("sha256").update(f.buffer).digest("hex"));
        if (new Set(hashes).size !== hashes.length) throw bad(400, "Ada screenshot yang sama. Tiap grup butuh screenshot sendiri.");
        const aktif = db.prepare("SELECT id, status FROM kisi_klaim WHERE wa=? AND mk_id=? AND status IN ('baru','valid')").get(wa, mk.id);
        if (aktif) throw bad(409, aktif.status === "valid" ? "Klaim untuk nomor ini sudah disetujui. Cek WhatsApp-mu untuk kodenya." : "Klaimmu sedang dicek admin. Tunggu kodenya di WhatsApp.");
        const dup = db.prepare("SELECT hashes FROM kisi_klaim WHERE status IN ('baru','valid')").all().some(r => { try { return JSON.parse(r.hashes).some(h => hashes.includes(h)); } catch { return false; } });
        if (dup) throw bad(409, "Screenshot ini sudah pernah dipakai di klaim lain.");
        dir = crypto.randomBytes(10).toString("hex"); await fsp.mkdir(priv("klaim", dir), { recursive: true });
        const names = []; for (let i = 0; i < files.length; i++) { const n = `${i + 1}.${ext(files[i].originalname) === "jpeg" ? "jpg" : ext(files[i].originalname)}`; await fsp.writeFile(priv("klaim", dir, n), files[i].buffer, { mode: 0o600 }); names.push(dir + "/" + n); }
        db.prepare("INSERT INTO kisi_klaim(mk_id,wa,shots,hashes,status,created_at) VALUES(?,?,?,?, 'baru', ?)").run(mk.id, wa, JSON.stringify(names), JSON.stringify(hashes), now);
        res.json({ ok: true });
      } catch (e) { if (dir) fsp.rm(priv("klaim", dir), { recursive: true, force: true }).catch(() => {}); fail(res, e); }
    });
  });

  /* ---------- API admin ---------- */
  const adm = (req) => (req.admin && req.admin.name) || "admin";
  app.get("/ms/admin/kisi", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store"); expire();
    const mks = db.prepare("SELECT * FROM kisi_mk ORDER BY id").all();
    res.json({
      mk: mks.map(r => ({ ...mkRow(r), soal: soalOf(r), file: r.file_name || null })),
      voucher: db.prepare("SELECT code,pct,kuota,terpakai,berlaku_sampai,mk_id,wa,aktif,created_at FROM kisi_voucher ORDER BY created_at DESC LIMIT 200").all(),
      klaim: db.prepare("SELECT k.id,k.mk_id,m.nama mk_nama,k.wa,k.shots,k.status,k.voucher_code,k.note,k.created_at FROM kisi_klaim k JOIN kisi_mk m ON m.id=k.mk_id ORDER BY (k.status='baru') DESC, k.created_at DESC LIMIT 100").all().map(k => ({ ...k, shots: JSON.parse(k.shots).length })),
      pesanan: db.prepare("SELECT o.id,o.mk_id,m.nama mk_nama,m.file_name,o.wa,o.harga,o.voucher_code,o.potongan,o.total,o.status,o.created_at,o.paid_claimed_at,o.confirmed_at,o.sent_at FROM kisi_pesanan o JOIN kisi_mk m ON m.id=o.mk_id ORDER BY CASE o.status WHEN 'menunggu_konfirmasi' THEN 0 WHEN 'lunas' THEN 1 WHEN 'menunggu_bayar' THEN 2 ELSE 3 END, o.created_at DESC LIMIT 200").all(),
    });
  });
  const A = (m, p, h) => app[m](p, requireAdmin, (req, res) => { try { h(req, res); } catch (e) { fail(res, e); } });

  /* tambah / ubah MK */
  app.put("/ms/admin/kisi/mk", requireAdmin, json, (req, res) => {
    try {
      const b = req.body || {}, kode = String(b.kode || "").trim().toUpperCase(), nama = String(b.nama || "").trim().slice(0, 120);
      if (!/^[A-Z]{3,5}\d{3,5}$/.test(kode)) throw bad(400, "Kode MK tidak valid (contoh SPMT4207).");
      if (nama.length < 3) throw bad(400, "Nama mata kuliah terlalu pendek.");
      const jenis = b.jenis === "Uraian" ? "Uraian" : b.jenis === "Objektif" ? "Objektif" : "", periode = /^\d{5}$/.test(String(b.periode || "")) ? String(b.periode) : "20262";
      const harga = Number.isInteger(b.harga) && b.harga >= 1000 && b.harga <= 1000000 ? b.harga : 50000;
      const soal = b.soal === undefined ? null : cleanSoal(b.soal), tampil = b.tampil ? 1 : 0;
      if (tampil && !(soal ? soal.length : soalOf(db.prepare("SELECT soal FROM kisi_mk WHERE kode=?").get(kode) || { soal: "[]" }).length)) throw bad(400, "Isi soal latihan dulu sebelum ditampilkan.");
      const ex = db.prepare("SELECT id FROM kisi_mk WHERE kode=?").get(kode);
      if (ex) db.prepare("UPDATE kisi_mk SET nama=?,jenis=?,periode=?,harga=?,tampil=?,slug=?" + (soal ? ",soal=?" : "") + " WHERE id=?").run(...[nama, jenis, periode, harga, tampil, slugOf(kode, nama)].concat(soal ? [JSON.stringify(soal)] : [], [ex.id]));
      else db.prepare("INSERT INTO kisi_mk(kode,nama,jenis,periode,slug,harga,tampil,soal,created_at) VALUES(?,?,?,?,?,?,?,?,?)").run(kode, nama, jenis, periode, slugOf(kode, nama), harga, tampil, JSON.stringify(soal || []), Date.now());
      res.json({ ok: true });
    } catch (e) { fail(res, e); }
  });
  app.post("/ms/admin/kisi/harga", requireAdmin, json, (req, res) => {
    const h = req.body && req.body.harga; if (!Number.isInteger(h) || h < 1000 || h > 1000000) return res.status(400).json({ error: "Harga tidak valid." });
    db.prepare("UPDATE kisi_mk SET harga=?").run(h); res.json({ ok: true });
  });

  /* file lengkap per MK: disimpan privat, admin yang mengirim ke WhatsApp */
  app.post("/ms/admin/kisi/mk/:id/file", requireAdmin, (req, res) => {
    multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE, files: 1 } }).single("file")(req, res, async err => {
      try {
        if (err) throw bad(413, "File terlalu besar (maksimal 25 MB).");
        const mk = db.prepare("SELECT * FROM kisi_mk WHERE id=?").get(Number(req.params.id)); if (!mk) throw bad(404, "MK tidak ditemukan.");
        const f = req.file; if (!f) throw bad(400, "Pilih file dulu.");
        const e = ext(f.originalname); if (!FILE_OK[e] || !FILE_OK[e](f.buffer)) throw bad(415, "File harus PDF, Word (.docx), ZIP, atau gambar yang valid.");
        const name = `${mk.id}-${crypto.randomBytes(5).toString("hex")}.${e}`;
        await fsp.writeFile(priv("file", name), f.buffer, { mode: 0o600 });
        if (mk.file_path) fsp.rm(priv("file", path.basename(mk.file_path)), { force: true }).catch(() => {});
        db.prepare("UPDATE kisi_mk SET file_path=?, file_name=? WHERE id=?").run(name, String(f.originalname).replace(/[^\w.\- ()]/g, "_").slice(0, 80), mk.id);
        res.json({ ok: true });
      } catch (e) { fail(res, e); }
    });
  });
  A("get", "/ms/admin/kisi/mk/:id/file", (req, res) => {
    const mk = db.prepare("SELECT * FROM kisi_mk WHERE id=?").get(Number(req.params.id));
    if (!mk || !mk.file_path) throw bad(404, "File belum ada.");
    res.download(priv("file", path.basename(mk.file_path)), mk.file_name || "kisi-kisi");
  });

  /* voucher manual */
  app.post("/ms/admin/kisi/voucher", requireAdmin, json, (req, res) => {
    try {
      const b = req.body || {}, pct = Number(b.pct), kuota = Number(b.kuota || 1);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) throw bad(400, "Potongan 1 sampai 100 persen.");
      if (!Number.isInteger(kuota) || kuota < 1 || kuota > 10000) throw bad(400, "Kuota 1 sampai 10.000.");
      let code = String(b.code || "").trim().toUpperCase(); if (code && !/^[A-Z0-9]{4,24}$/.test(code)) throw bad(400, "Kode 4 sampai 24 huruf atau angka.");
      code = code || newCode(); if (db.prepare("SELECT 1 FROM kisi_voucher WHERE code=?").get(code)) throw bad(409, "Kode sudah ada.");
      const sampai = b.sampai ? Date.parse(String(b.sampai) + "T23:59:59+07:00") : null; if (b.sampai && !Number.isFinite(sampai)) throw bad(400, "Tanggal tidak valid.");
      const mk = b.mk_id ? Number(b.mk_id) : null; if (mk && !db.prepare("SELECT 1 FROM kisi_mk WHERE id=?").get(mk)) throw bad(400, "MK tidak ditemukan.");
      db.prepare("INSERT INTO kisi_voucher(code,pct,kuota,berlaku_sampai,mk_id,aktif,created_at) VALUES(?,?,?,?,?,1,?)").run(code, pct, kuota, sampai, mk, Date.now());
      res.json({ ok: true, code });
    } catch (e) { fail(res, e); }
  });
  app.post("/ms/admin/kisi/voucher/:code/aktif", requireAdmin, json, (req, res) => {
    db.prepare("UPDATE kisi_voucher SET aktif=? WHERE code=?").run(req.body && req.body.aktif ? 1 : 0, String(req.params.code).toUpperCase()); res.json({ ok: true });
  });

  /* klaim: lihat bukti, setujui (buat kode), tolak, atau minta lengkapi */
  A("get", "/ms/admin/kisi/klaim/:id/shot/:n", (req, res) => {
    const k = db.prepare("SELECT shots FROM kisi_klaim WHERE id=?").get(Number(req.params.id)); if (!k) throw bad(404, "Klaim tidak ditemukan.");
    const s = JSON.parse(k.shots)[Number(req.params.n)]; if (!s) throw bad(404, "Screenshot tidak ada.");
    res.set("Cache-Control", "no-store").sendFile(priv("klaim", ...s.split("/").map(x => path.basename(x))));
  });
  app.post("/ms/admin/kisi/klaim/:id/:aksi", requireAdmin, json, (req, res) => {
    try {
      const k = db.prepare("SELECT * FROM kisi_klaim WHERE id=?").get(Number(req.params.id)); if (!k) throw bad(404, "Klaim tidak ditemukan.");
      if (k.status !== "baru") throw bad(409, "Klaim ini sudah diputuskan.");
      const now = Date.now(), aksi = req.params.aksi, note = String((req.body && req.body.note) || "").slice(0, 200);
      if (aksi === "valid") {
        const code = newCode(); db.transaction(() => {
          db.prepare("INSERT INTO kisi_voucher(code,pct,kuota,berlaku_sampai,mk_id,wa,klaim_id,aktif,created_at) VALUES(?,?,?,?,?,?,?,1,?)").run(code, KLAIM_PCT, 1, now + VOUCHER_HARI * 86400e3, k.mk_id, k.wa, k.id, now);
          db.prepare("UPDATE kisi_klaim SET status='valid', voucher_code=?, decided_at=? WHERE id=?").run(code, now, k.id);
        })();
        const mk = db.prepare("SELECT nama FROM kisi_mk WHERE id=?").get(k.mk_id);
        const msg = `Halo, klaim voucher Kisi-kisi ${mk.nama} sudah divalidasi. Kode voucher potongan ${KLAIM_PCT}%: ${code} (sekali pakai, berlaku ${VOUCHER_HARI} hari). Masukkan kode saat membayar di Catatan Akademik.`;
        return res.json({ ok: true, code, wa: `https://wa.me/${k.wa}?text=${encodeURIComponent(msg)}` });
      }
      if (aksi === "tolak" || aksi === "kurang") { db.prepare("UPDATE kisi_klaim SET status=?, note=?, decided_at=? WHERE id=?").run(aksi === "tolak" ? "ditolak" : "kurang", note, now, k.id); return res.json({ ok: true }); }
      throw bad(400, "Aksi tidak dikenal.");
    } catch (e) { fail(res, e); }
  });

  /* pesanan: konfirmasi bayar, tandai terkirim, batalkan */
  app.post("/ms/admin/kisi/pesanan/:id/:aksi", requireAdmin, json, (req, res) => {
    try {
      const o = db.prepare("SELECT * FROM kisi_pesanan WHERE id=?").get(String(req.params.id)); if (!o) throw bad(404, "Pesanan tidak ditemukan.");
      const now = Date.now(), aksi = req.params.aksi;
      if (aksi === "konfirmasi") {
        if (!["menunggu_bayar", "menunggu_konfirmasi"].includes(o.status)) throw bad(409, "Status pesanan tidak bisa dikonfirmasi.");
        db.prepare("UPDATE kisi_pesanan SET status='lunas', confirmed_at=? WHERE id=?").run(now, o.id);
        const mk = db.prepare("SELECT nama, file_path FROM kisi_mk WHERE id=?").get(o.mk_id);
        if (mk.file_path) return res.json({ ok: true, auto: true });
        return res.json({ ok: true, wa: `https://wa.me/${o.wa}?text=${encodeURIComponent(`Halo, pembayaran Kisi-kisi ${mk.nama} (${o.id}) sudah kami terima. File lengkap kami kirim di chat ini.`)}` });
      }
      if (aksi === "terkirim") { if (o.status !== "lunas") throw bad(409, "Konfirmasi pembayaran dulu."); db.prepare("UPDATE kisi_pesanan SET status='terkirim', sent_at=? WHERE id=?").run(now, o.id); return res.json({ ok: true }); }
      if (aksi === "batal") { if (["lunas", "terkirim", "dibatalkan"].includes(o.status)) throw bad(409, "Pesanan tidak bisa dibatalkan."); release(o, "dibatalkan"); return res.json({ ok: true }); }
      throw bad(400, "Aksi tidak dikenal.");
    } catch (e) { fail(res, e); }
  });

  return { list, bySlug, soalOf, expire, voucherCek, slugOf };
};
module.exports.cleanSoal = cleanSoal;
module.exports.slugOf = slugOf;
