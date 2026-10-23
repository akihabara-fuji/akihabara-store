"use strict";
/* Panel admin Catatan Akademik: login terpisah dari admin nextaja, peran, log aktivitas, pesanan, blog terjadwal, revisi. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");

const OWNER_PW = "sandi-pemilik-ca-123";
async function setup() {
  process.env.PARAFRASE_DB = ":memory:";
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ca-admin-"));
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.mkdirSync(path.join(root, "public", "uploads"), { recursive: true });
  const db = require("../parafrase/db").open(":memory:");
  const app = express();
  app.set("trust proxy", 1);
  const getCookie = (req, name) => { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)")); return m ? decodeURIComponent(m[1]) : ""; };
  const sameOrigin = req => !!req.headers.origin;
  const auth = require("../admin-ca/auth")({ db, getCookie, sameOrigin, SECURE_COOKIE: false, ownerPassword: OWNER_PW, sharedWithNextaja: false, secret: "x".repeat(40) });
  auth.mount(app, express);
  // sama seperti server.js: API CA -> login CA; selain itu login nextaja (di tes: selalu ditolak kecuali cookie ms_admin=ok)
  const requireAdmin = (req, res, next) => auth.isCaPath(req.path) ? auth.guard(req, res, next) : (getCookie(req, "ms_admin") === "ok" ? next() : res.status(401).json({ error: "nextaja" }));
  const blog = require("../blog-akun")({ app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE: false, ROOT: root, SITE: "https://contoh.test", getSettings: () => ({}) });
  const pf = require("../parafrase")({ app, express, requireAdmin, sameOrigin, ROOT: root, db });
  require("../admin-ca")({ app, express, db, auth, requireAdmin, blog, settings: pf.settings, orders: pf.orders, ROOT: root, UPLOADS: path.join(root, "public", "uploads"), sharp: null, ACAD: "https://contoh.test" });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const call = async (p, { cookie = "", method = "GET", json } = {}) => {
    const r = await fetch(base + p, { method, headers: { origin: base, cookie, ...(json ? { "content-type": "application/json" } : {}) }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json() : await r.text(), headers: r.headers };
  };
  const login = async (username, password) => { const r = await fetch(base + "/ms/admin/ca/login", { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: JSON.stringify({ username, password }) }); assert.strictEqual(r.status, 200, "login " + username); return r.headers.get("set-cookie").split(";")[0]; };
  return { srv, db, base, call, login, pf };
}

test("API admin akademik tidak bisa dibuka dengan login nextaja atau tanpa login", async () => {
  const { srv, call } = await setup();
  try {
    for (const p of ["/ms/admin/ca/dashboard", "/ms/admin/posts", "/ms/admin/parafrase/orders", "/ms/admin/users"]) {
      assert.strictEqual((await call(p)).status, 401, p);
      assert.strictEqual((await call(p, { cookie: "ms_admin=ok" })).status, 401, "login nextaja tidak boleh berlaku: " + p);
    }
    assert.strictEqual((await call("/ms/admin/ca/login", { method: "POST", json: { username: "pemilik", password: "salah-sandi-1234" } })).status, 401);
  } finally { srv.close(); }
});

test("pemilik membuat editor dan admin pesanan; peran dibatasi; aksi tercatat di log", async () => {
  const { srv, call, login } = await setup();
  try {
    const own = await login("pemilik", OWNER_PW);
    assert.strictEqual((await call("/ms/admin/ca/dashboard", { cookie: own })).status, 200);
    assert.strictEqual((await call("/ms/admin/ca/admins", { cookie: own, method: "POST", json: { username: "rina", name: "Rina Editor", role: "editor", password: "editor-sandi-123" } })).status, 200);
    assert.strictEqual((await call("/ms/admin/ca/admins", { cookie: own, method: "POST", json: { username: "budi", name: "Budi CS", role: "cs", password: "cs-sandi-12345" } })).status, 200);
    assert.strictEqual((await call("/ms/admin/ca/admins", { cookie: own, method: "POST", json: { username: "budi", name: "Lagi", role: "cs", password: "cs-sandi-12345" } })).status, 409);
    const ed = await login("rina", "editor-sandi-123"), cs = await login("budi", "cs-sandi-12345");
    assert.strictEqual((await call("/ms/admin/posts", { cookie: ed })).status, 200);
    assert.strictEqual((await call("/ms/admin/ca/orders", { cookie: ed })).status, 403);
    assert.strictEqual((await call("/ms/admin/ca/admins", { cookie: ed })).status, 403);
    assert.strictEqual((await call("/ms/admin/ca/orders", { cookie: cs })).status, 200);
    assert.strictEqual((await call("/ms/admin/parafrase/orders", { cookie: cs })).status, 200);
    assert.strictEqual((await call("/ms/admin/posts", { cookie: cs })).status, 403);
    assert.strictEqual((await call("/ms/admin/parafrase/settings", { cookie: cs })).status, 403);
    const w = await call("/ms/admin/posts", { cookie: ed, method: "POST", json: { title: "Tulisan editor", body: "Isi pendek.", status: "draft", topic: "study" } });
    assert.strictEqual(w.status, 200);
    const log = await call("/ms/admin/ca/log", { cookie: own });
    assert.ok(log.body.items.some(x => x.action === "POST /ms/admin/posts" && /Rina Editor/.test(x.admin)), JSON.stringify(log.body.items));
    // nonaktifkan editor: sesinya langsung berhenti
    const list = (await call("/ms/admin/ca/admins", { cookie: own })).body.items, rina = list.find(x => x.username === "rina");
    await call("/ms/admin/ca/admins/" + rina.id, { cookie: own, method: "POST", json: { active: false } });
    assert.strictEqual((await call("/ms/admin/posts", { cookie: ed })).status, 401);
  } finally { srv.close(); }
});

test("tulisan terjadwal tidak tampil sebelum waktunya; pratinjau admin noindex; revisi tersimpan", async () => {
  const { srv, call, login } = await setup();
  try {
    const own = await login("pemilik", OWNER_PW);
    const future = new Date(Date.now() + 3 * 864e5).toISOString();
    const r = await call("/ms/admin/posts", { cookie: own, method: "POST", json: { title: "Jadwal UAS", body: "## Bagian\n\nIsi.", status: "scheduled", publishAt: future, topic: "updateut", tags: "UAS, Jadwal Ujian", coverAlt: "x", metaDesc: "Ringkas" } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.body));
    const p = r.body.post;
    assert.deepStrictEqual(p.tags, ["uas", "jadwal-ujian"]);
    assert.strictEqual((await call("/blog/" + p.slug)).status, 404, "terjadwal belum boleh tampil");
    const pv = await call(`/ms/admin/posts/${p.id}/preview`, { cookie: own });
    assert.strictEqual(pv.status, 200);
    assert.match(pv.body, /noindex/);
    assert.strictEqual(pv.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.strictEqual((await call(`/ms/admin/posts/${p.id}/preview`)).status, 401, "pratinjau wajib login");
    const past = await call("/ms/admin/posts", { cookie: own, method: "POST", json: { id: p.id, title: "Jadwal UAS", body: "## Bagian\n\nIsi diubah.", status: "scheduled", publishAt: new Date(Date.now() - 3600e3).toISOString() } });
    assert.strictEqual(past.status, 400, "jadwal yang sudah lewat ditolak");
    const pub = await call("/ms/admin/posts", { cookie: own, method: "POST", json: { id: p.id, title: "Jadwal UAS 2026", body: "## Bagian\n\nIsi diubah.", status: "published" } });
    assert.strictEqual(pub.status, 200);
    assert.deepStrictEqual(pub.body.post.tags, ["uas", "jadwal-ujian"], "field yang tidak dikirim tidak terhapus");
    const page = await call("/blog/" + p.slug);
    assert.strictEqual(page.status, 200);
    assert.match(page.body, /article:tag" content="uas"/);
    const revs = await call(`/ms/admin/posts/${p.id}/revisions`, { cookie: own });
    assert.ok(revs.body.items.length >= 1 && revs.body.items[0].title === "Jadwal UAS", JSON.stringify(revs.body));
  } finally { srv.close(); }
});

test("pesanan: catatan internal, batal belum bayar, tidak bisa batal dua kali, layanan nonaktif ditolak", async () => {
  const { srv, call, login, db, pf } = await setup();
  try {
    const own = await login("pemilik", OWNER_PW), now = Date.now();
    db.prepare(`INSERT INTO orders(id,public_token,wa_number,title,doc_type,service,status,lane,price_per_word,min_price,base_total,unique_code,total,pay_expires_at,created_at,updated_at)
      VALUES('NA-2001','tok','6281234567890','Tugas: makalah','layanan','tugas','menunggu_bayar','biasa',0,0,40000,7,40007,?,?,?)`).run(now + 3600e3, now, now);
    const list = await call("/ms/admin/ca/orders?group=bayar&q=081234", { cookie: own });
    assert.strictEqual(list.body.total, 1, "cari nomor WA dengan awalan 0");
    assert.strictEqual((await call("/ms/admin/ca/orders/NA-2001/notes", { cookie: own, method: "POST", json: { text: "Pelanggan minta format APA" } })).status, 200);
    assert.strictEqual((await call("/ms/admin/ca/orders/NA-2001/cancel", { cookie: own, method: "POST", json: { reason: "" } })).status, 400);
    const c = await call("/ms/admin/ca/orders/NA-2001/cancel", { cookie: own, method: "POST", json: { reason: "Pelanggan membatalkan" } });
    assert.strictEqual(c.status, 200); assert.strictEqual(c.body.refundNeeded, false);
    assert.strictEqual((await call("/ms/admin/ca/orders/NA-2001/cancel", { cookie: own, method: "POST", json: { reason: "lagi" } })).status, 409);
    const d = await call("/ms/admin/ca/orders/NA-2001", { cookie: own });
    assert.strictEqual(d.body.order.status, "dibatalkan");
    assert.strictEqual(d.body.notes[0].admin, "Pemilik");
    assert.ok(d.body.events.some(e => e.type === "dibatalkan"));
    pf.settings.set({ layanan_nonaktif: "tugas" }, "tes");
    const svc = await call("/ms/admin/ca/services", { cookie: own });
    assert.strictEqual(svc.body.items.find(x => x.key === "tugas").active, false);
  } finally { srv.close(); }
});

test("unggah gambar: isi file dicek (magic bytes); HTML/skrip berkedok .png ditolak; gambar asli diterima", async () => {
  const { srv, base, call, login } = await setup();
  try {
    const own = await login("pemilik", OWNER_PW);
    const send = async (bytes, type, name) => { const fd = new FormData(); fd.append("file", new Blob([bytes], { type }), name); const r = await fetch(base + "/ms/admin/ca/upload", { method: "POST", headers: { origin: base, cookie: own }, body: fd }); return { status: r.status, body: await r.json() }; };
    const html = Buffer.from("<html><script>alert(document.cookie)</script></html>" + " ".repeat(40));
    assert.strictEqual((await send(html, "image/png", "foto.png")).status, 415, "HTML berkedok PNG");
    assert.strictEqual((await send(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>" + " ".repeat(40)), "image/svg+xml", "x.svg")).status, 400, "SVG tidak diterima");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const ok = await send(png, "image/png", "../../etc/passwd.png");
    assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
    assert.match(ok.body.url, /^\/uploads\/[a-z0-9]+-[a-f0-9]{8}\.png$/, "nama file dibuat server, bukan dari nama unggahan");
    // tipe yang dilaporkan browser berbohong (JPEG di-klaim sebagai PNG): ekstensi mengikuti ISI file
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0"), Buffer.alloc(40)]);
    const lie = await send(jpg, "image/png", "a.png");
    assert.ok(lie.status === 200 && lie.body.url.endsWith(".jpg"), JSON.stringify(lie));
  } finally { srv.close(); }
});

test("SEO admin: hanya artikel akademik diperiksa; judul/ringkasan tanpa 'UT' ditandai, yang menyebut UT tidak", async () => {
  const { srv, call, login } = await setup();
  try {
    const own = await login("pemilik", OWNER_PW), body = "## Bagian\n\n" + "kata ".repeat(310);
    const mk = (title, topic, excerpt) => call("/ms/admin/posts", { cookie: own, method: "POST", json: { title, topic, excerpt, body, status: "published" } });
    await mk("Cara membagi waktu kuliah sambil bekerja", "study", "Langkah praktis membagi waktu antara kerja dan keluarga.");
    await mk("Jadwal UAS UT semester ini", "updateut", "Cek tanggal ujian di laman resmi.");
    await mk("Berita viral hari ini", "viral", "Tidak relevan di domain akademik.");
    const s = await call("/ms/admin/ca/seo", { cookie: own });
    const by = Object.fromEntries(s.body.checks.map(c => [c.title, c.issues.some(i => /belum menyebut/.test(i))]));
    assert.deepStrictEqual(by, { "Cara membagi waktu kuliah sambil bekerja": true, "Jadwal UAS UT semester ini": false });
    assert.strictEqual(s.body.checks.length, 2, "artikel non-akademik tidak ikut diperiksa");
  } finally { srv.close(); }
});
