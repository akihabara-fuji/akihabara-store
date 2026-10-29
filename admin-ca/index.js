/* API panel admin Catatan Akademik (/ms/admin/ca/*). Semua rute lewat requireAdmin -> login dan peran CA (admin-ca/auth.js).
   Data: SQLite yang sama dengan modul parafrase (pesanan, event, catatan, akun admin, log) + blog.json lewat modul blog. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const seo = require("../blog-seo");
const multer = require("multer");
const { SV, labelFor } = require("../parafrase/layanan");

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
let labelOf = k => (SV[k] || {}).label; // diganti di mountCaAdmin agar ikut nama buatan admin
const svcLabel = o => o.doc_type === "layanan" ? (labelOf(o.service) || o.service || "Layanan") : o.doc_type === "audit" ? "Audit Dokumen" : "Cek & Parafrase";
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

module.exports = function mountCaAdmin({ app, express, db, auth, requireAdmin, blog, settings, orders, texts, pages, ROOT, UPLOADS, sharp, ACAD, traffic }) {
  const J = express.json({ limit: "16kb" });
  labelOf = k => labelFor(settings, k);
  const one = id => db.prepare("SELECT * FROM orders WHERE id=?").get(String(id));
  const row = o => ({ id: o.id, service: svcLabel(o), kind: o.doc_type, status: o.status, statusLabel: (STATUS[o.status] || {}).label || o.status, tone: (STATUS[o.status] || {}).tone || "mute",
    title: o.title, wa: o.wa_number, total: o.total, uniqueCode: o.unique_code, lane: o.lane, createdAt: o.created_at, proofAt: o.proof_uploaded_at, confirmedAt: o.confirmed_at, confirmedBy: o.confirmed_by, parent: o.parent_order_id, deadlineAt: o.deadline_at });
  const isPaid = o => !!o.confirmed_at && o.confirmed_by !== "gratis";


  /* Rekomendasi dan audit kesehatan web: dihitung dari data yang sudah ada, muncul hanya bila datanya cukup. Tidak ada angka karangan. */
  function insights(posts, now, withOrders) {
    const live = x => !x.trashedAt && blog.isLive(x, now), drafts = posts.filter(x => !x.trashedAt && !blog.isLive(x, now) && x.status !== "scheduled");
    const noDate = drafts.filter(x => !x.recommendedAt), noImg = drafts.filter(x => !x.cover), liveNoAlt = posts.filter(x => live(x) && x.cover && !x.coverAlt);
    const recs = [];
    if (withOrders) {
      try {
        const t = traffic.summary(30), views = t.pages.filter(x => /\/audit/.test(x.path) && !/hasil/.test(x.path)).reduce((a, x) => a + x.views, 0);
        const paid = db.prepare("SELECT COUNT(*) n FROM orders WHERE doc_type='audit' AND confirmed_at IS NOT NULL AND COALESCE(confirmed_by,'')<>'gratis'").get().n;
        if (views >= 30 && paid / views < 0.05) recs.push({ title: "Banyak yang membuka Audit tapi sedikit yang memesan.", why: `${views} tayangan halaman Audit dalam 30 hari, ${paid} pesanan audit berbayar sepanjang waktu. Ini titik terbesar calon pelanggan hilang.`, tip: "Coba ubah kalimat tombol dan perlihatkan lebih banyak temuan sebelum bagian yang diburamkan.", href: "#/seo" });
        const top = t.pages.find(x => /^\/blog\//.test(x.path) && x.views >= 20);
        if (top) recs.push({ title: `Artikel “${top.label || top.path}” ramai dibaca.`, why: `${top.views} tayangan dalam 30 hari.`, tip: "Pastikan hook layanannya tepat dan jadikan bahan konten sosmed.", href: "#/studio" });
      } catch { /* statistik opsional */ }
    }
    if (noDate.length) recs.push({ title: `${noDate.length} draf belum punya tanggal terbit yang disarankan.`, why: "Draf tanpa tanggal mudah menumpuk.", tip: "Isi tanggal rekomendasi dari tanggal penting UT yang sudah terverifikasi.", href: "#/posts?status=draft" });
    return { recommendations: recs, health: [
      { level: noImg.length ? "warn" : "ok", text: noImg.length ? `${noImg.length} draf belum punya gambar sampul` : "Semua draf sudah punya gambar sampul", href: "#/posts?status=draft" },
      { level: noDate.length ? "warn" : "ok", text: noDate.length ? `${noDate.length} draf belum punya tanggal rekomendasi` : "Semua draf sudah punya tanggal rekomendasi", href: "#/posts?status=draft" },
      { level: liveNoAlt.length ? "warn" : "ok", text: liveNoAlt.length ? `${liveNoAlt.length} artikel terbit dengan gambar tanpa teks alternatif` : "Gambar artikel terbit sudah bersama teks alternatif", href: "#/posts?status=published" },
    ] };
  }

  /* ---------------- pemeriksaan sistem ---------------- */
  /* Daftar cek cepat untuk pemilik: pengaturan penting yang kosong dan masalah konten (artikel kembar, terbit serentak, di luar niche).
     Hanya membaca; tidak mengubah apa pun. Tiap butir: tone ok|warn|bad, teks, dan tautan ke menu terkait bila ada. */
  app.get("/ms/admin/ca/health", requireAdmin, send(req => {
    if (req.admin.role === "editor") return { items: [] };
    const cfg = settings.getAll(), items = [], add = (tone, text, href) => items.push({ tone, text, href: href || "" });
    const url = v => /^https:\/\/\S+$/.test(String(v || "").trim());
    if (!url(cfg.update_group_url)) add("bad", "Tautan grup WhatsApp belum diisi. Tombol komunitas di menu, banner, dan artikel tidak punya tujuan.", "#/settings");
    if (!/^62\d{8,13}$/.test(String(cfg.admin_wa_number || "").replace(/\D/g, ""))) add("bad", "Nomor WhatsApp admin kosong atau formatnya salah (harus diawali 62).", "#/settings");
    if (!String(cfg.qris_image_path || "").trim()) add("warn", "Gambar QRIS belum diatur. Pembayaran otomatis tidak bisa ditampilkan.", "#/payments");
    if (!(Number(cfg.price_per_word) > 0)) add("bad", "Harga Cek & Parafrase per kata belum valid.", "#/settings");
    if (!(Number(cfg.bedah_harga_per_1000) > 0)) add("warn", "Harga Bedah per 1.000 kata bernilai 0, jadi Bedah gratis.", "#/settings");
    const live = blog.posts().filter(x => !x.trashedAt && blog.isLive(x)), now = Date.now();
    const off = live.filter(x => ["social", "ai", "viral"].includes(x.topic));
    if (off.length) add("warn", `${off.length} artikel terbit di luar fokus UT (sosmed, AI, viral). Disembunyikan dari daftar blog dan noindex; arsipkan bila tidak dipakai.`, "#/posts");
    const byDay = {}; for (const x of live) { const d = String(x.publishedAt || "").slice(0, 10); if (d && now - Date.parse(x.publishedAt) < 14 * 864e5) byDay[d] = (byDay[d] || 0) + 1; }
    const burst = Object.entries(byDay).filter(([, n]) => n >= 5).map(([d, n]) => `${d} (${n})`);
    if (burst.length) add("warn", `Artikel terbit serentak dalam 14 hari terakhir: ${burst.join(", ")}. Sebar 2–3 per minggu dengan status Terjadwal.`, "#/posts");
    const pairs = [], acad = live.filter(x => !["social", "ai", "viral"].includes(x.topic));
    for (let i = 0; i < acad.length && pairs.length < 5; i++) for (let j = i + 1; j < acad.length && pairs.length < 5; j++) if (seo.similarity(acad[i].title, acad[j].title) >= 0.6) pairs.push(`“${String(acad[i].title).slice(0, 48)}” dan “${String(acad[j].title).slice(0, 48)}”`);
    if (pairs.length) add("warn", `Judul yang bersaing untuk kata kunci sama: ${pairs.join("; ")}. Gabungkan lewat redirect 301.`, "#/posts");
    const waiting = db.prepare("SELECT COUNT(*) n FROM orders WHERE status='menunggu_verifikasi' AND updated_at<?").get(now - 6 * 3600e3).n;
    if (waiting) add("bad", `${waiting} pesanan menunggu konfirmasi pembayaran lebih dari 6 jam.`, "#/orders");
    const drafts = live.length ? blog.posts().filter(x => !x.trashedAt && x.status === "draft").length : 0;
    if (drafts >= 10) add("warn", `${drafts} draf belum diselesaikan.`, "#/posts?status=draft");
    if (!items.length) add("ok", "Semua pemeriksaan lolos.");
    return { items };
  }));
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
    let tr = null; try {
      const t = traffic.summary(Math.max(1, Math.round((r.to - r.from) / 864e5) + 1));
      const au = t.pages.filter(x => /\/audit/.test(x.path) && !/hasil/.test(x.path));
      const auditViews = au.reduce((a, x) => a + x.views, 0), auditVisitors = au.reduce((a, x) => a + x.visitors, 0);
      const paidAudit = db.prepare("SELECT COUNT(*) n FROM orders WHERE doc_type='audit' AND confirmed_at BETWEEN ? AND ? AND COALESCE(confirmed_by,'')<>'gratis' AND status<>'dikembalikan'").get(r.from, r.to).n;
      tr = { views: t.total.views, visitors: t.total.visitors, auditViews, paidAudit, conv: auditVisitors >= 30 ? Math.round(paidAudit / auditVisitors * 1000) / 10 : null, groups: t.groups.slice(0, 6), pages: t.pages.slice(0, 6) };
    } catch { /* statistik opsional */ }
    return { range: r, posts: p, traffic: tr, ...insights(posts, now, true), orders: cnt, newToday, revenue: paid.reduce((a, x) => a + x.total, 0), paidCount: paid.length, customers: blog.usersCount(), series: days.map(d => series[d]), recent, activity: acts,
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

  /* ---------------- pengunjung dan konten yang dicari ---------------- */
  const PAGE_LABEL = [[/(^|\/)kalkulator-nilai-ut$/, "Kalkulator Nilai Akhir UT"], [/(^|\/)pasfoto-yudisium$/, "Pasfoto Yudisium"], [/(^|\/)sitasi-apa$/, "Generator Sitasi APA"], [/(^|\/)buat-cv-ats$/, "Buat CV ATS"], [/(^|\/)sampul-tugas$/, "Sampul & Template Tugas"], [/(^|\/)surat-lamaran$/, "Surat Lamaran Kerja"], [/(^|\/)tracker-kelulusan$/, "Tracker Kelulusan & IPK"], [/(^|\/)kalender-akademik$/, "Kalender Akademik"], [/(^|\/)panduan-maba$/, "Panduan Maba UT"], [/cek-parafrase-mandiri$/, "Cek & Parafrase Mandiri"], [/(^|\/)audit$/, "Audit Dokumen"], [/(^|\/)layanan$/, "Form pesan layanan"], [/(^|\/)(layanan-ut|ruangakademikut)$/, "Halaman Layanan UT"], [/(^|\/)blog-ut$/, "Blog & Berita UT"], [/^\/blog$/, "Daftar blog"], [/(^|\/)koin$/, "Koin"], [/^\/(beranda)?$/, "Beranda"], [/pesanan\/\*$/, "Halaman pesanan (token)"]];
  app.get("/ms/admin/ca/traffic", requireAdmin, send(req => {
    const titles = new Map(((blog && blog.posts && blog.posts()) || []).map(p => ["/blog/" + String(p.slug).toLowerCase(), p.title]));
    const label = p => titles.get(p) || (PAGE_LABEL.find(([re]) => re.test(p)) || [])[1] || null;
    return traffic.summary(req.query.days, label);
  }));

  /* ---------------- layanan & harga ---------------- */
  app.get("/ms/admin/ca/services", requireAdmin, send(() => {
    const cfg = settings.getAll(), off = String(cfg.layanan_nonaktif || "").split(",").filter(Boolean), hiddenCards = String(cfg.kartu_sembunyi || "").split(",").filter(Boolean);
    const used = Object.fromEntries(db.prepare("SELECT service, COUNT(*) n FROM orders WHERE doc_type='layanan' GROUP BY service").all().map(x => [x.service, x.n]));
    return { items: Object.entries(SV).filter(([, v]) => !v.hidden).map(([k, v]) => ({ key: k, label: labelFor(settings, k), labelDefault: v.label, labelKey: "label_" + k, kind: v.kind, price: Number.isInteger(cfg["price_" + k]) ? cfg["price_" + k] : v.price, priceKey: "price_" + k, active: !off.includes(k), orders: used[k] || 0 })),
      other: [["price_per_word", "Cek & Parafrase: harga per kata"], ["min_order_price", "Cek & Parafrase: harga minimum"], ["fast_lane_price", "Jalur cepat"], ["audit_per_word", "Audit Dokumen: per kata"], ["audit_min", "Audit Dokumen: minimum"],
        ["free_words", "Audit dan Cek & Parafrase: jumlah kata gratis (kata pertama dokumen)"], ["price_semester_min", "Paket Semester: mulai"], ["price_semester_max", "Paket Semester: sampai"], ["price_pengarahan_semester", "Pengarahan registrasi: semester"], ["price_pengarahan_lulus", "Pengarahan: lulus"], ["price_pengarahan_normal", "Pengarahan: normal"]]
        .map(([key, label]) => ({ key, label, price: cfg[key] })),
      cards: texts ? texts.cards().map(c => ({ ...c, shown: !hiddenCards.includes(c.slug) })) : [],
      note: "Harga baru hanya berlaku untuk pesanan baru. Pesanan lama tetap memakai harga yang tersimpan saat pesanan dibuat." };
  }));

  /* ---------------- tema & font (parafrase/tema.js): hanya ID paket yang disimpan ---------------- */
  if (settings) {
    const tema = require("../parafrase/tema");
    app.get("/ms/admin/ca/tema", requireAdmin, send(() => ({ current: tema.id(settings.get("ca_tema")), presets: Object.entries(tema.PRESETS).map(([id, p]) => ({ id, ...p })) })));
    app.post("/ms/admin/ca/tema", requireAdmin, J, send(req => {
      const v = req.body && req.body.id;
      if (typeof v !== "string" || !Object.prototype.hasOwnProperty.call(tema.PRESETS, v)) throw bad(400, "Paket tema tidak dikenal.");
      settings.set({ ca_tema: v }, req.admin.name || req.admin.username || "admin");
      return { current: v };
    }));
  }
  /* ---------------- teks & nama situs (kamus teks: parafrase/sitetexts.js) ---------------- */
  if (texts) {
    const who = req => req.admin.name || req.admin.username || "admin";
    app.get("/ms/admin/ca/texts", requireAdmin, send(() => ({ ...texts.list(), files: texts.PAGES, max: texts.MAX, log: texts.log(30) })));
    app.post("/ms/admin/ca/texts", requireAdmin, J, send(req => texts.set(str(req.body && req.body.orig, 600), req.body && req.body.value, who(req))));
    app.post("/ms/admin/ca/texts/reset", requireAdmin, J, send(req => texts.reset(str(req.body && req.body.orig, 600), who(req))));
    /* pratinjau: halaman asli dengan teks usulan (belum disimpan) dan teks yang diubah disorot */
    app.post("/ms/admin/ca/texts/preview", requireAdmin, J, send(req => {
      const b = req.body || {}, file = String(b.page || "");
      if (!pages || !Object.keys(texts.PAGES).includes(file) || /^(audit-hasil|pesanan)\.html$/.test(file)) throw bad(400, "Halaman tidak dikenal.");
      const over = new Map(texts.load()), orig = texts.norm(str(b.orig, 600));
      if (orig && typeof b.value === "string" && b.value.trim()) over.set(orig, str(b.value, texts.MAX).replace(/[<>]/g, ""));
      return { html: pages.render(file, req, { over, mark: orig || undefined, preview: true }) };
    }));
  }

  /* ---------------- editor halaman visual: halaman asli dengan teks yang bisa diklik (papan 4 di mock) ---------------- */
  if (texts && pages) {
    const EDITOR_JS = `(function(){var st=document.createElement("style");st.textContent="[data-ed]{cursor:pointer}[data-ed]:hover{outline:2px solid #7c3aed;outline-offset:2px;background:rgba(124,58,237,.14)}.ed-sel{outline:3px solid #7c3aed!important;outline-offset:2px}img.nx-bg,[data-g]{cursor:pointer}img.nx-bg:hover,[data-g]:hover .gal{outline:3px solid #7c3aed;outline-offset:-3px}";document.head.appendChild(st);
function sel(el){document.querySelectorAll(".ed-sel").forEach(function(x){x.classList.remove("ed-sel")});el.classList.add("ed-sel")}
document.addEventListener("click",function(e){var t=e.target.closest("[data-ed]"),im=e.target.closest("img.nx-bg"),g=e.target.closest("[data-g]");
if(!t&&!im&&!g){if(e.target.closest("a,button,summary,label"))e.preventDefault();return}
e.preventDefault();e.stopPropagation();
if(t){sel(t);var o=t.getAttribute("data-ed"),n=0;document.querySelectorAll("[data-ed]").forEach(function(x){if(x.getAttribute("data-ed")===o)n++});parent.postMessage({ed:"text",orig:o,value:t.textContent,count:n},"*")}
else if(im){sel(im);parent.postMessage({ed:"img",kind:"site",id:"hero/model-ut",label:"Foto utama di atas landing"},"*")}
else{sel(g);var h=g.querySelector("h3");parent.postMessage({ed:"img",kind:"card",id:g.getAttribute("data-g"),label:"Foto kartu "+(h?h.textContent:g.getAttribute("data-g"))},"*")}
},true);
document.addEventListener("submit",function(e){e.preventDefault()},true);
})();`;
    app.post("/ms/admin/ca/editor/page", requireAdmin, J, send(req => {
      const file = String((req.body || {}).page || "");
      if (!Object.keys(texts.PAGES).includes(file) || /^(audit-hasil|pesanan)\.html$/.test(file)) throw bad(400, "Halaman tidak dikenal.");
      const html = pages.render(file, req, { edit: true, preview: true });
      return { html: html.includes("</body>") ? html.replace("</body>", `<script>${EDITOR_JS}</script></body>`) : html + `<script>${EDITOR_JS}</script>` };
    }));
  }

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
    const cfg = settings.getAll(), live = blog.posts().filter(p => !p.trashedAt && blog.isLive(p) && ["study", "updateut"].includes(p.topic));
    const rivals = seo.cannibal(live);
    const checks = live.map(p => {
      const words = (String(p.body || "").match(/\S+/g) || []).length, issues = [];
      if (!/\b(ut|universitas terbuka)\b/i.test([p.title, p.metaDesc || p.excerpt || ""].join(" "))) issues.push("Judul/ringkasan belum menyebut “UT” atau “Universitas Terbuka”, kata yang dipakai mahasiswa saat mencari. Sebut secara wajar, jangan dijejalkan.");
      if ((p.metaTitle || p.title).length > 65) issues.push("Judul SEO lebih dari 65 karakter (bisa terpotong di Google).");
      if (!p.metaDesc && !p.excerpt) issues.push("Belum ada ringkasan/meta description.");
      if (p.cover && !p.coverAlt) issues.push("Foto sampul belum punya teks alt.");
      if (words >= 300 && !/^\s*##?\s+\S/m.test(p.body || "")) issues.push("Tulisan panjang tanpa sub-judul H2.");
      if (/!\[[^\]\s]*_[^\]\s]*\]\(/.test(p.body || "")) issues.push("Foto di dalam isi memakai nama file sebagai teks alt.");
      if (words < 300) issues.push(`Isi pendek (${words} kata).`);
      if (seo.slugTooLong(p.slug)) issues.push(`Slug panjang (${p.slug.length} karakter): ringkas jadi 3 sampai 5 kata inti.`);
      { const tb = seo.timeBound(p.title); if (tb) issues.push(`Judul memuat ${tb === "tanggal" ? "tanggal" : tb === "tahun" ? "tahun" : "nomor sesi"}: cepat kedaluwarsa. Pertimbangkan panduan abadi.`); }
      for (const o of live) if (o.id !== p.id && seo.bodySimilarity(p.body, o.body) >= 0.6) issues.push(`Isi hampir sama dengan “${String(o.title).slice(0, 60)}” (konten ganda). Pilih satu atau gabungkan.`);
      for (const c of rivals) { if (c.a.id === p.id || c.b.id === p.id) { const o = c.a.id === p.id ? c.b : c.a; issues.push(`Bersaing dengan “${String(o.title).slice(0, 60)}” (kata kunci mirip ${c.score}%). Gabungkan atau bedakan.`); } }
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
  /* Crop gambar sampul: hasilnya file baru (asli di Media tidak berubah), supaya tampil sama di artikel, kartu, dan pratinjau bagikan. */
  const RATIOS = { "3:2": 3 / 2, "16:9": 16 / 9, "1.91:1": 1.91, "1:1": 1 };
  const srcFile = u => { const m = /^\/uploads\/([a-z0-9][a-z0-9._-]*\.(?:webp|jpe?g|png|avif|gif))$/i.exec(String(u || "")); if (!m) throw bad(400, "Alamat gambar tidak valid."); return path.join(UPLOADS, m[1]); };
  const needSharp = () => { if (!sharp) throw bad(501, "Crop butuh modul gambar di server yang belum aktif."); };
  const readImg = async u => { try { return await fsp.readFile(srcFile(u)); } catch (e) { if (e.status) throw e; throw bad(404, "Gambar tidak ditemukan di Media."); } };
  app.post("/ms/admin/ca/crop-auto", requireAdmin, J, send(async req => {
    needSharp(); const r = RATIOS[String((req.body || {}).ratio)]; if (!r) throw bad(400, "Rasio tidak dikenal.");
    const buf = await readImg((req.body || {}).src);
    const meta = await sharp(buf, { limitInputPixels: 60e6 }).rotate().metadata();
    const { width: W0, height: H0 } = (await sharp(buf, { limitInputPixels: 60e6 }).rotate().toBuffer({ resolveWithObject: true })).info;
    const W = W0 || meta.width, H = H0 || meta.height; if (!W || !H) throw bad(400, "Gambar tidak bisa dibaca.");
    const cw = W / H > r ? H * r : W, ch = W / H > r ? H : W / r;
    const tw = 1200, th = Math.round(tw / r), sc = Math.max(tw / W, th / H);
    const { info } = await sharp(buf, { limitInputPixels: 60e6 }).rotate().resize(tw, th, { fit: "cover", position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true });
    const x = Math.min(Math.max(0, (info.cropOffsetLeft || 0) / sc), W - cw), y = Math.min(Math.max(0, (info.cropOffsetTop || 0) / sc), H - ch);
    return { rect: { x: x / W, y: y / H, w: cw / W, h: ch / H } };
  }));
  app.post("/ms/admin/ca/crop", requireAdmin, J, send(async req => {
    needSharp(); const b = req.body || {}, r = RATIOS[String(b.ratio)]; if (!r) throw bad(400, "Rasio tidak dikenal.");
    const rc = b.rect || {}, n = k => Number(rc[k]); if (![n("x"), n("y"), n("w"), n("h")].every(Number.isFinite)) throw bad(400, "Area crop tidak valid.");
    const buf = await readImg(b.src);
    const img = sharp(buf, { limitInputPixels: 60e6 }).rotate(), { data, info } = await img.toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;
    let w = Math.round(Math.min(1, Math.max(0.02, n("w"))) * W), h = Math.round(Math.min(1, Math.max(0.02, n("h"))) * H);
    w = Math.min(w, W); h = Math.min(h, H);
    const left = Math.round(Math.min(Math.max(0, n("x") * W), W - w)), top = Math.round(Math.min(Math.max(0, n("y") * H), H - h));
    if (Math.abs(w / h - r) / r > 0.06) throw bad(400, "Bentuk area crop tidak sesuai rasio.");
    const out = await sharp(data, { limitInputPixels: 60e6 }).extract({ left, top, width: w, height: h }).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}-crop`;
    await fsp.writeFile(path.join(UPLOADS, `${name}.webp`), out);
    return { ok: true, url: `/uploads/${name}.webp` };
  }));
  app.get("/ms/admin/ca/media", requireAdmin, send(async () => {
    const posts = blog.posts(), files = (await fsp.readdir(UPLOADS).catch(() => [])).filter(f => /^[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png|gif|avif)$/i.test(f));
    const stats = await Promise.all(files.map(async f => { const s = await fsp.stat(path.join(UPLOADS, f)); const url = `/uploads/${f}`; return { url, size: s.size, at: s.mtimeMs, usedIn: posts.filter(p => p.cover === url || String(p.body || "").includes(url)).map(p => ({ title: p.title, slug: p.slug })) }; }));
    return { items: stats.sort((a, b) => b.at - a.at).slice(0, 400) };
  }));

  /* hapus gambar: hanya yang tidak dipakai artikel mana pun (termasuk draf dan sampah), supaya tidak ada gambar patah */
  app.delete("/ms/admin/ca/media/:file", requireAdmin, send(async req => {
    const f = String(req.params.file || "");
    if (!/^[a-z0-9][a-z0-9._-]*\.(webp|jpe?g|png|gif|avif)$/i.test(f) || f.includes("..")) throw bad(400, "Nama berkas tidak valid.");
    const url = `/uploads/${f}`, use = blog.posts().filter(p => p.cover === url || String(p.body || "").includes(url));
    if (use.length) throw bad(409, `Gambar masih dipakai di: ${use.slice(0, 3).map(p => p.title).join(", ")}. Ganti gambar di artikel itu dulu.`);
    try { await fsp.unlink(path.join(UPLOADS, f)); } catch (e) { if (e.code === "ENOENT") throw bad(404, "Gambar tidak ditemukan."); throw e; }
    return { ok: true };
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
