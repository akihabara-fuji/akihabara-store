/* API panel admin Catatan Akademik (/ms/admin/ca/*). Semua rute lewat requireAdmin -> login dan peran CA (admin-ca/auth.js).
   Data: SQLite yang sama dengan modul parafrase (pesanan, event, catatan, akun admin, log) + blog.json lewat modul blog. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { SV } = require("../parafrase/layanan");

const STATUS = {
  menunggu_bayar: { label: "Menunggu pembayaran", tone: "warn" },
  menunggu_verifikasi: { label: "Menunggu konfirmasi", tone: "warn" },
  baru_dibayar: { label: "Dibayar, antre", tone: "info" },
  dianalisis: { label: "Dianalisis", tone: "info" },
  dikerjakan: { label: "Sedang diproses", tone: "info" },
  cek_ulang: { label: "Cek ulang", tone: "info" },
  terkirim: { label: "Selesai", tone: "ok" },
  dibatalkan: { label: "Dibatalkan", tone: "bad" },
  kedaluwarsa: { label: "Kedaluwarsa", tone: "mute" },
  dikembalikan: { label: "Dana dikembalikan", tone: "mute" },
};
const PROCESS = ["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang"];
const GROUPS = {
  semua: { label: "Semua pesanan", where: "1=1" },
  bayar: { label: "Menunggu pembayaran", where: "status='menunggu_bayar'" },
  konfirmasi: { label: "Menunggu konfirmasi", where: "status='menunggu_verifikasi'" },
  proses: { label: "Sedang diproses", where: `status IN (${PROCESS.map(s => `'${s}'`).join(",")})` },
  revisi: { label: "Perlu revisi", where: `service LIKE 'revisi%' AND status IN ('menunggu_verifikasi',${PROCESS.map(s => `'${s}'`).join(",")})` },
  selesai: { label: "Selesai", where: "status='terkirim'" },
  batal: { label: "Dibatalkan", where: "status IN ('dibatalkan','kedaluwarsa','dikembalikan')" },
};
const svcLabel = o => o.doc_type === "layanan" ? ((SV[o.service] || {}).label || o.service || "Layanan") : o.doc_type === "audit" ? "Audit Dokumen" : "Cek & Parafrase";
const WIB = 7 * 3600e3;
const dayKey = ms => new Date(ms + WIB).toISOString().slice(0, 10);
const dayStart = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "") ? Date.parse(`${s}T00:00:00+07:00`) : NaN;
const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max);
const bad = (status, error) => Object.assign(new Error(error), { status });
const send = fn => async (req, res) => { res.set("Cache-Control", "no-store"); try { res.json(await fn(req, res)); } catch (e) { if (!e.status) console.error("[ca-admin]", e); res.status(e.status || 500).json({ error: e.status ? e.message : "Terjadi kesalahan di server." }); } };

/* rentang tanggal dari query (?from=YYYY-MM-DD&to=YYYY-MM-DD, WIB); bawaan 30 hari terakhir */
function range(q, days = 30) {
  const now = Date.now();
  let to = dayStart(q.to), from = dayStart(q.from);
  to = Number.isFinite(to) ? to + 864e5 - 1 : now;
  from = Number.isFinite(from) ? from : dayStart(dayKey(now - (days - 1) * 864e5));
  if (from > to) throw bad(400, "Tanggal awal harus sebelum tanggal akhir.");
  if (to - from > 400 * 864e5) throw bad(400, "Rentang maksimal 400 hari.");
  return { from, to, fromKey: dayKey(from), toKey: dayKey(to) };
}

module.exports = function mountCaAdmin({ app, express, db, auth, requireAdmin, blog, settings, orders, ROOT, UPLOADS, sharp, ACAD }) {
  const J = express.json({ limit: "16kb" });
  const one = id => db.prepare("SELECT * FROM orders WHERE id=?").get(String(id));
  const row = o => ({ id: o.id, service: svcLabel(o), kind: o.doc_type, status: o.status, statusLabel: (STATUS[o.status] || {}).label || o.status, tone: (STATUS[o.status] || {}).tone || "mute",
    title: o.title, wa: o.wa_number, total: o.total, uniqueCode: o.unique_code, lane: o.lane, createdAt: o.created_at, proofAt: o.proof_uploaded_at, confirmedAt: o.confirmed_at, confirmedBy: o.confirmed_by, parent: o.parent_order_id, deadlineAt: o.deadline_at });
  const isPaid = o => !!o.confirmed_at && o.confirmed_by !== "gratis";

  /* ---------------- dashboard ---------------- */
  app.get("/ms/admin/ca/dashboard", requireAdmin, send(req => {
    const r = range(req.query, 30), posts = blog.posts(), now = Date.now();
    const p = { published: 0, draft: 0, review: 0, scheduled: 0, trash: 0 };
    for (const x of posts) { if (x.trashedAt) p.trash++; else if (blog.isLive(x, now)) p.published++; else if (p[x.status] !== undefined) p[x.status]++; }
    // Editor hanya mengurus konten: data pesanan dan pelanggan tidak dikirim (akses sesuai kebutuhan tugas)
    if (req.admin.role === "editor") return { range: r, posts: p, recentPosts: posts.filter(x => !x.trashedAt).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 8).map(x => ({ id: x.id, title: x.title, status: x.status, updatedAt: x.updatedAt })) };
    const cnt = Object.fromEntries(Object.entries(GROUPS).map(([k, g]) => [k, db.prepare(`SELECT COUNT(*) n FROM orders WHERE ${g.where}`).get().n]));
    const newToday = db.prepare("SELECT COUNT(*) n FROM orders WHERE created_at>=?").get(dayStart(dayKey(now))).n;
    const created = db.prepare("SELECT created_at FROM orders WHERE created_at BETWEEN ? AND ?").all(r.from, r.to);
    const paid = db.prepare("SELECT confirmed_at, total FROM orders WHERE confirmed_at BETWEEN ? AND ? AND COALESCE(confirmed_by,'')<>'gratis' AND status<>'dikembalikan'").all(r.from, r.to);
    const days = []; for (let t = r.from; t <= r.to; t += 864e5) days.push(dayKey(t));
    const series = Object.fromEntries(days.map(d => [d, { day: d, orders: 0, paid: 0, revenue: 0 }]));
    for (const x of created) { const s = series[dayKey(x.created_at)]; if (s) s.orders++; }
    for (const x of paid) { const s = series[dayKey(x.confirmed_at)]; if (s) { s.paid++; s.revenue += x.total; } }
    const recent = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 8").all().map(row);
    // ID artikel di log diganti judulnya agar terbaca manusia
    const postTitle = id => { const p = posts.find(x => x.id === id); return p ? p.title : null; };
    const acts = db.prepare("SELECT at, admin AS who, action, target FROM ca_admin_log WHERE action NOT LIKE 'login%' ORDER BY at DESC LIMIT 10").all().map(x => ({ ...x, label: /\/posts/.test(x.action) ? postTitle(x.target) : null, src: "admin" }))
      .concat(db.prepare("SELECT at, order_id AS target, type AS action FROM order_events ORDER BY at DESC LIMIT 10").all().map(x => ({ ...x, who: "sistem", src: "pesanan" })))
      .sort((a, b) => b.at - a.at).slice(0, 12);
    return { range: r, posts: p, orders: cnt, newToday, revenue: paid.reduce((a, x) => a + x.total, 0), paidCount: paid.length, customers: blog.usersCount(), series: days.map(d => series[d]), recent, activity: acts,
      definitions: { revenue: "Jumlah total pesanan yang pembayarannya dikonfirmasi admin dalam rentang (WIB), tanpa pesanan gratis dan dana dikembalikan.", orders: "Pesanan dibuat dalam rentang." } };
  }));

  /* ---------------- pesanan ---------------- */
  function orderWhere(q) {
    const g = GROUPS[q.group] || GROUPS.semua, w = [g.where], a = [];
    const s = str(q.q, 60);
    if (s) { w.push("(id LIKE ? OR wa_number LIKE ? OR title LIKE ? OR service LIKE ?)"); const like = `%${s.replace(/[%_]/g, "")}%`; a.push(like, like.replace(/^%0/, "%62"), like, like); }
    if (q.kind && ["layanan", "audit", "parafrase"].includes(q.kind)) { if (q.kind === "parafrase") w.push("doc_type NOT IN ('layanan','audit')"); else { w.push("doc_type=?"); a.push(q.kind); } }
    const f = dayStart(q.from), t = dayStart(q.to);
    if (Number.isFinite(f)) { w.push("created_at>=?"); a.push(f); }
    if (Number.isFinite(t)) { w.push("created_at<?"); a.push(t + 864e5); }
    return { sql: w.join(" AND "), args: a };
  }
  app.get("/ms/admin/ca/orders", requireAdmin, send(req => {
    const { sql, args } = orderWhere(req.query);
    const size = Math.min(100, Math.max(10, parseInt(req.query.size, 10) || 25)), page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const total = db.prepare(`SELECT COUNT(*) n FROM orders WHERE ${sql}`).get(...args).n;
    const items = db.prepare(`SELECT * FROM orders WHERE ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...args, size, (page - 1) * size).map(row);
    const counts = Object.fromEntries(Object.entries(GROUPS).map(([k, g]) => [k, db.prepare(`SELECT COUNT(*) n FROM orders WHERE ${g.where}`).get().n]));
    return { items, total, page, size, counts, groups: Object.fromEntries(Object.entries(GROUPS).map(([k, g]) => [k, g.label])) };
  }));
  app.get("/ms/admin/ca/orders/:id", requireAdmin, send(req => {
    const o = one(req.params.id); if (!o) throw bad(404, "Pesanan tidak ditemukan.");
    let att = []; try { att = JSON.parse(o.attach_json || "[]").map((x, i) => ({ n: i + 1, name: x.name, size: x.size })); } catch {}
    return { order: { ...row(o), brief: o.brief, words: o.word_count, language: o.language, docType: o.doc_type, baseTotal: o.base_total, fastPrice: o.fast_price, payExpiresAt: o.pay_expires_at, rejectReason: o.reject_reason,
        workStartedAt: o.work_started_at, sentAt: o.sent_at, deleteAt: o.delete_at, filesDeleted: !!o.files_deleted_at, revisionNo: o.revision_no, hasProof: !!o.proof_path, hasResult: !!(o.result_path || o.result_text), customerUrl: `${ACAD}/pesanan/${o.public_token}`, paid: isPaid(o) },
      attachments: att,
      events: db.prepare("SELECT type, detail, at FROM order_events WHERE order_id=? ORDER BY at").all(o.id).map(e => ({ ...e, detail: e.detail && /ip=/.test(e.detail) ? e.detail.replace(/\s*ip=\S+/, "") : e.detail })),
      notes: db.prepare("SELECT admin, text, at FROM order_notes WHERE order_id=? ORDER BY at DESC").all(o.id),
      children: db.prepare("SELECT * FROM orders WHERE parent_order_id=? ORDER BY created_at").all(o.id).map(row) };
  }));
  app.post("/ms/admin/ca/orders/:id/notes", requireAdmin, J, send(req => {
    const o = one(req.params.id); if (!o) throw bad(404, "Pesanan tidak ditemukan.");
    const text = str((req.body || {}).text, 1000); if (text.length < 2) throw bad(400, "Catatan masih kosong.");
    db.prepare("INSERT INTO order_notes(order_id,admin,text,at) VALUES(?,?,?,?)").run(o.id, req.admin.name, text, Date.now());
    return { ok: true };
  }));
  /* Batalkan: belum bayar -> langsung batal, file dihapus. Sudah bayar -> batal dengan catatan refund manual; tandai "dana dikembalikan" setelah transfer balik. */
  app.post("/ms/admin/ca/orders/:id/cancel", requireAdmin, J, send(async req => {
    const reason = str((req.body || {}).reason, 300); if (reason.length < 3) throw bad(400, "Tulis alasan pembatalan.");
    const now = Date.now(); let o;
    db.transaction(() => {
      o = one(req.params.id); if (!o) throw bad(404, "Pesanan tidak ditemukan.");
      if (["terkirim", "dibatalkan", "kedaluwarsa", "dikembalikan"].includes(o.status)) throw bad(409, `Pesanan berstatus ${(STATUS[o.status] || {}).label || o.status} tidak bisa dibatalkan.`);
      db.prepare("UPDATE orders SET status='dibatalkan', reject_reason=?, updated_at=? WHERE id=?").run(reason, now, o.id);
      db.prepare("UPDATE fast_reservations SET status='released' WHERE order_id=? AND status IN ('reserved','confirmed')").run(o.id);
      orders.event(o.id, "dibatalkan", `${req.admin.name}: ${reason}${isPaid(o) ? " (sudah dibayar: refund manual diperlukan)" : ""}`, now);
    })();
    if (!isPaid(o)) for (const f of [o.original_file, o.proof_path]) if (f) await fsp.unlink(orders.priv(f)).catch(() => {});
    return { ok: true, refundNeeded: isPaid(o) };
  }));
  app.post("/ms/admin/ca/orders/:id/refunded", requireAdmin, J, send(req => {
    const o = one(req.params.id); if (!o) throw bad(404, "Pesanan tidak ditemukan.");
    if (o.status !== "dibatalkan" || !isPaid(o)) throw bad(409, "Hanya pesanan dibayar yang sudah dibatalkan yang bisa ditandai dana dikembalikan.");
    const note = str((req.body || {}).note, 300);
    db.prepare("UPDATE orders SET status='dikembalikan', updated_at=? WHERE id=? AND status='dibatalkan'").run(Date.now(), o.id);
    orders.event(o.id, "dana_dikembalikan", `${req.admin.name}${note ? ": " + note : ""}`);
    return { ok: true };
  }));
  app.get("/ms/admin/ca/payments", requireAdmin, send(() => ({
    items: db.prepare("SELECT * FROM orders WHERE status='menunggu_verifikasi' ORDER BY proof_uploaded_at").all().map(o => ({ ...row(o), method: "QRIS (transfer manual)", hasProof: !!o.proof_path })),
    recent: db.prepare("SELECT * FROM orders WHERE confirmed_at IS NOT NULL AND COALESCE(confirmed_by,'')<>'gratis' ORDER BY confirmed_at DESC LIMIT 15").all().map(row),
  })));

  /* ---------------- layanan & harga ---------------- */
  app.get("/ms/admin/ca/services", requireAdmin, send(() => {
    const cfg = settings.getAll(), off = String(cfg.layanan_nonaktif || "").split(",").filter(Boolean);
    const used = Object.fromEntries(db.prepare("SELECT service, COUNT(*) n FROM orders WHERE doc_type='layanan' GROUP BY service").all().map(x => [x.service, x.n]));
    return { items: Object.entries(SV).map(([k, v]) => ({ key: k, label: v.label, kind: v.kind, price: Number.isInteger(cfg["price_" + k]) ? cfg["price_" + k] : v.price, priceKey: "price_" + k, active: !off.includes(k), orders: used[k] || 0 })),
      other: [["price_per_word", "Cek & Parafrase: harga per kata"], ["min_order_price", "Cek & Parafrase: harga minimum"], ["fast_lane_price", "Jalur cepat"], ["audit_per_word", "Audit Dokumen: per kata"], ["audit_min", "Audit Dokumen: minimum"],
        ["price_semester_min", "Paket Semester: mulai"], ["price_semester_max", "Paket Semester: sampai"], ["price_pengarahan_semester", "Pengarahan registrasi: semester"], ["price_pengarahan_lulus", "Pengarahan: lulus"], ["price_pengarahan_normal", "Pengarahan: normal"]]
        .map(([key, label]) => ({ key, label, price: cfg[key] })),
      note: "Harga baru hanya berlaku untuk pesanan baru. Pesanan lama tetap memakai harga yang tersimpan saat pesanan dibuat." };
  }));

  /* ---------------- laporan ---------------- */
  app.get("/ms/admin/ca/report", requireAdmin, send(req => {
    const r = range(req.query, 30);
    const made = db.prepare("SELECT * FROM orders WHERE created_at BETWEEN ? AND ?").all(r.from, r.to);
    const paid = db.prepare("SELECT * FROM orders WHERE confirmed_at BETWEEN ? AND ? AND COALESCE(confirmed_by,'')<>'gratis' AND status<>'dikembalikan'").all(r.from, r.to);
    const by = (list, key) => { const m = new Map(); for (const o of list) { const k = key(o); const v = m.get(k) || { name: k, count: 0, revenue: 0 }; v.count++; v.revenue += o.total; m.set(k, v); } return [...m.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count); };
    const posts = blog.posts().filter(p => !p.trashedAt && blog.isLive(p) && Date.parse(p.publishedAt) >= r.from && Date.parse(p.publishedAt) <= r.to);
    return { range: r,
      totals: { created: made.length, paid: paid.length, revenue: paid.reduce((a, o) => a + o.total, 0), cancelled: made.filter(o => ["dibatalkan", "dikembalikan"].includes(o.status)).length, expired: made.filter(o => o.status === "kedaluwarsa").length, done: made.filter(o => o.status === "terkirim").length, postsPublished: posts.length },
      byService: by(paid, svcLabel), byStatus: by(made, o => (STATUS[o.status] || {}).label || o.status).map(x => ({ name: x.name, count: x.count })),
      conversion: made.length ? Math.round(made.filter(o => isPaid(o)).length / made.length * 100) : 0,
      definitions: {
        created: "Pesanan yang dibuat dalam rentang tanggal (WIB), semua status.",
        paid: "Pesanan yang pembayarannya dikonfirmasi admin dalam rentang; tanpa pesanan gratis (revisi gratis) dan tanpa dana yang dikembalikan.",
        revenue: "Jumlah total (termasuk kode unik) dari pesanan terbayar di atas. Bukan laporan keuangan resmi.",
        conversion: "Persen pesanan dibuat dalam rentang yang akhirnya dibayar.",
        traffic: "Jumlah pengunjung tidak dihitung di sini; lihat Google Analytics 4 (ID diatur di Pengaturan).",
      } };
  }));

  /* ---------------- SEO ---------------- */
  app.get("/ms/admin/ca/seo", requireAdmin, send(() => {
    // hanya artikel yang tampil di domain akademik (kategori non-akademik disembunyikan di sini)
    const cfg = settings.getAll(), live = blog.posts().filter(p => !p.trashedAt && blog.isLive(p) && blog.ACAD_TOPICS.includes(p.topic));
    const checks = live.map(p => {
      const words = (String(p.body || "").match(/\S+/g) || []).length, issues = [];
      if (!/\b(ut|universitas terbuka)\b/i.test([p.title, p.metaDesc || p.excerpt || ""].join(" "))) issues.push("Judul/ringkasan belum menyebut “UT” atau “Universitas Terbuka”, kata yang dipakai mahasiswa saat mencari. Sebut secara wajar, jangan dijejalkan.");
      if ((p.metaTitle || p.title).length > 65) issues.push("Judul SEO lebih dari 65 karakter (bisa terpotong di Google).");
      if (!p.metaDesc && !p.excerpt) issues.push("Belum ada ringkasan/meta description.");
      if (p.cover && !p.coverAlt) issues.push("Foto sampul belum punya teks alt.");
      if (words >= 300 && !/^\s*##?\s+\S/m.test(p.body || "")) issues.push("Tulisan panjang tanpa sub-judul H2.");
      if (/!\[[^\]\s]*_[^\]\s]*\]\(/.test(p.body || "")) issues.push("Foto di dalam isi memakai nama file sebagai teks alt.");
      if (words < 300) issues.push(`Isi pendek (${words} kata).`);
      return { id: p.id, slug: p.slug, title: p.title, words, issues };
    });
    return { sitemap: `${ACAD}/sitemap.xml`, robots: `${ACAD}/robots.txt`, feed: `${ACAD}/blog/feed.xml`, live: live.length, gaId: cfg.ga_id, gtmId: cfg.gtm_id, googleVerifyFile: cfg.google_verify_file, checks,
      notes: ["Draf, review, dan tulisan terjadwal yang belum waktunya tidak masuk sitemap.", "Google menemukan tulisan lewat sitemap; daftarkan sitemap sekali di Google Search Console.", "Bing dan mesin lain diberi tahu lewat IndexNow setiap tulisan terbit."] };
  }));

  /* ---------------- media ---------------- */
  const IMG = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  /* Jenis gambar ditentukan dari ISI file (magic bytes), bukan dari tipe/nama yang dilaporkan browser (bisa dipalsukan). */
  const sniff = b => {
    if (!b || b.length < 16) return null;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
    if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    const h6 = b.subarray(0, 6).toString("latin1"); if (h6 === "GIF87a" || h6 === "GIF89a") return "gif";
    if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
    if (b.subarray(4, 8).toString("latin1") === "ftyp" && /^(avif|avis)$/.test(b.subarray(8, 12).toString("latin1"))) return "avif";
    return null;
  };
  const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1048576, files: 1 }, fileFilter: (req, f, cb) => cb(null, !!IMG[f.mimetype]) }).single("file");
  app.post("/ms/admin/ca/upload", requireAdmin, (req, res) => up(req, res, async err => {
    if (err || !req.file) return res.status(400).json({ error: "File harus gambar (JPG, PNG, WebP, GIF, AVIF), maks 15 MB." });
    const kind = sniff(req.file.buffer);
    if (!kind) return res.status(415).json({ error: "Isi file bukan gambar yang valid (JPG, PNG, WebP, GIF, AVIF)." });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    try {
      let out = req.file.buffer, ext = kind;
      if (sharp) { out = await sharp(req.file.buffer, { failOn: "error", limitInputPixels: 60e6 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(); ext = "webp"; }
      await fsp.writeFile(path.join(UPLOADS, `${name}.${ext}`), out);
      res.json({ ok: true, url: `/uploads/${name}.${ext}` });
    } catch { res.status(400).json({ error: "Gambar tidak bisa dibaca. Coba file lain." }); }
  }));
  app.get("/ms/admin/ca/media", requireAdmin, send(async () => {
    const posts = blog.posts(), files = (await fsp.readdir(UPLOADS).catch(() => [])).filter(f => /^[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png|gif|avif)$/i.test(f));
    const stats = await Promise.all(files.map(async f => { const s = await fsp.stat(path.join(UPLOADS, f)); const url = `/uploads/${f}`; return { url, size: s.size, at: s.mtimeMs, usedIn: posts.filter(p => p.cover === url || String(p.body || "").includes(url)).map(p => ({ title: p.title, slug: p.slug })) }; }));
    return { items: stats.sort((a, b) => b.at - a.at).slice(0, 400) };
  }));

  /* ---------------- admin & peran (hanya pemilik) ---------------- */
  const ROLE_KEYS = Object.keys(auth.ROLES);
  const pubAdmin = a => ({ id: a.id, username: a.username, name: a.name, role: a.role, roleLabel: auth.ROLES[a.role], active: !!a.active, createdAt: a.created_at, lastLoginAt: a.last_login_at });
  const checkPw = pw => { if (String(pw || "").length < 10) throw bad(400, "Sandi minimal 10 karakter."); return String(pw).slice(0, 200); };
  app.get("/ms/admin/ca/admins", requireAdmin, send(() => ({ items: db.prepare("SELECT * FROM ca_admins ORDER BY active DESC, name").all().map(pubAdmin), roles: auth.ROLES })));
  app.post("/ms/admin/ca/admins", requireAdmin, J, send(req => {
    const b = req.body || {}, username = str(b.username, 30).toLowerCase(), name = str(b.name, 60);
    if (!/^[a-z0-9._-]{3,30}$/.test(username) || username === "pemilik") throw bad(400, "Nama pengguna 3-30 huruf kecil/angka/titik/strip, dan bukan 'pemilik'.");
    if (name.length < 2) throw bad(400, "Isi nama lengkap.");
    if (!ROLE_KEYS.includes(b.role)) throw bad(400, "Pilih peran.");
    const pw = checkPw(b.password), salt = crypto.randomBytes(16).toString("hex");
    try { db.prepare("INSERT INTO ca_admins(username,name,role,salt,hash,active,created_at) VALUES(?,?,?,?,?,1,?)").run(username, name, b.role, salt, auth.hashPw(pw, salt), Date.now()); }
    catch { throw bad(409, "Nama pengguna sudah dipakai."); }
    return { ok: true };
  }));
  app.post("/ms/admin/ca/admins/:id", requireAdmin, J, send(req => {
    const a = db.prepare("SELECT * FROM ca_admins WHERE id=?").get(Number(req.params.id)); if (!a) throw bad(404, "Admin tidak ditemukan.");
    const b = req.body || {};
    if (b.name !== undefined) { const n = str(b.name, 60); if (n.length < 2) throw bad(400, "Isi nama lengkap."); a.name = n; }
    if (b.role !== undefined) { if (!ROLE_KEYS.includes(b.role)) throw bad(400, "Peran tidak dikenal."); a.role = b.role; }
    if (b.active !== undefined) a.active = b.active ? 1 : 0;
    if (b.password) { a.salt = crypto.randomBytes(16).toString("hex"); a.hash = auth.hashPw(checkPw(b.password), a.salt); }
    db.prepare("UPDATE ca_admins SET name=?, role=?, active=?, salt=?, hash=? WHERE id=?").run(a.name, a.role, a.active, a.salt, a.hash, a.id);
    if (!a.active || b.password || b.role !== undefined) auth.killSessionsOf(a.id); // sesi lama berhenti saat akses berubah
    return { ok: true };
  }));
  app.post("/ms/admin/ca/password", requireAdmin, J, send(req => {
    if (!req.admin.id) throw bad(400, "Sandi akun pemilik diatur lewat CA_ADMIN_PASSWORD di file .env server.");
    const a = db.prepare("SELECT * FROM ca_admins WHERE id=?").get(req.admin.id), b = req.body || {};
    if (!crypto.timingSafeEqual(Buffer.from(auth.hashPw(String(b.old || ""), a.salt), "hex"), Buffer.from(a.hash, "hex"))) throw bad(400, "Sandi lama salah.");
    const salt = crypto.randomBytes(16).toString("hex");
    db.prepare("UPDATE ca_admins SET salt=?, hash=? WHERE id=?").run(salt, auth.hashPw(checkPw(b.new), salt), a.id);
    return { ok: true };
  }));

  /* ---------------- log aktivitas (hanya pemilik) ---------------- */
  app.get("/ms/admin/ca/log", requireAdmin, send(req => {
    const r = range(req.query, 30), s = str(req.query.q, 60), page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const w = "at BETWEEN ? AND ?" + (s ? " AND (admin LIKE ? OR action LIKE ? OR target LIKE ?)" : ""), a = [r.from, r.to, ...(s ? [`%${s}%`, `%${s}%`, `%${s}%`] : [])];
    return { range: r, total: db.prepare(`SELECT COUNT(*) n FROM ca_admin_log WHERE ${w}`).get(...a).n,
      items: db.prepare(`SELECT at, admin, role, action, target, status FROM ca_admin_log WHERE ${w} ORDER BY at DESC LIMIT 100 OFFSET ?`).all(...a, (page - 1) * 100),
      settingsLog: db.prepare("SELECT key, old_value, new_value, by, at FROM settings_log WHERE at BETWEEN ? AND ? ORDER BY at DESC LIMIT 50").all(r.from, r.to) };
  }));

  return { STATUS, GROUPS };
};
module.exports.STATUS = STATUS;
module.exports.GROUPS = GROUPS;
