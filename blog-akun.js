/* =================================================================
   nextaja — Blog + Akun customer
   Dipasang dari server.js:  require("./blog-akun")({ ...helpers })
   Data: data/blog.json, data/users.json (dibuat otomatis, tidak masuk git)
   ================================================================= */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

module.exports = function mount(ctx) {
  const { app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE, ROOT, SITE } = ctx;
  const DATA_DIR = path.join(ROOT, "data");
  const BLOG = path.join(DATA_DIR, "blog.json");
  const USERS = path.join(DATA_DIR, "users.json");
  const BLOG_BAK = path.join(DATA_DIR, "backups-blog");
  const SECRET_FILE = path.join(DATA_DIR, ".secret");
  fs.mkdirSync(BLOG_BAK, { recursive: true });

  /* ---------- util ---------- */
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const str = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
  const img = v => { const s = str(v, 200); return /^\/uploads\/[a-z0-9._-]+$/i.test(s) ? s : ""; };
  const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
  const writeJson = async (file, obj) => {
    const tmp = file + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(obj, null, 2));
    await fsp.rename(tmp, file);
  };
  const fmtDate = iso => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  /* ============================== BLOG ============================== */
  const TOPICS = {
    study: { label: "Study", ask: "Belajar, kuliah, dan tugas" },
    social: { label: "Social Media Update", ask: "Kabar dan tips social media" },
    ai: { label: "AI & Info Lain", ask: "AI, teknologi, dan info lain" },
    viral: { label: "Berita viral hari ini", ask: "Berita viral hari ini" },
    updateut: { label: "Info UT", ask: "Info terbaru seputar UT" },
  };
  const tl = k => (TOPICS[k] || { label: "Lainnya" }).label;
  let blog = readJson(BLOG, { posts: [] });
  if (!Array.isArray(blog.posts)) blog.posts = [];
  const TRASH_MS = 30 * 24 * 3600 * 1000;
  let blogWrite = Promise.resolve();
  function saveBlog() {
    blogWrite = blogWrite.then(async () => {
      if (fs.existsSync(BLOG)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await fsp.copyFile(BLOG, path.join(BLOG_BAK, `blog-${stamp}.json`)).catch(() => {});
        const files = (await fsp.readdir(BLOG_BAK)).filter(f => f.endsWith(".json")).sort();
        for (const f of files.slice(0, Math.max(0, files.length - 40))) await fsp.unlink(path.join(BLOG_BAK, f)).catch(() => {});
      }
      await writeJson(BLOG, blog);
    });
    return blogWrite;
  }
  // buang isi sampah yang sudah lewat 30 hari
  const before = blog.posts.length;
  blog.posts = blog.posts.filter(p => !(p.trashedAt && Date.now() - new Date(p.trashedAt).getTime() > TRASH_MS));
  if (blog.posts.length !== before) saveBlog();

  const slugify = t => str(t, 90).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "tulisan";
  function uniqueSlug(base, selfId) {
    let s = base, n = 2;
    while (blog.posts.some(p => p.slug === s && p.id !== selfId)) s = `${base}-${n++}`;
    return s;
  }
  const published = () => blog.posts.filter(p => p.status === "published" && !p.trashedAt).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  function inline(t) {
    return esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="nofollow noopener" target="_blank">$1</a>');
  }
  function renderBody(txt) {
    let html = "", list = false, para = [];
    const flush = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
    const endList = () => { if (list) { html += "</ul>"; list = false; } };
    for (const raw of String(txt || "").replace(/\r/g, "").split("\n")) {
      const l = raw.trim();
      if (!l) { flush(); endList(); continue; }
      if (/^##\s+/.test(l)) { flush(); endList(); html += `<h2>${inline(l.replace(/^##\s+/, ""))}</h2>`; continue; }
      if (/^###\s+/.test(l)) { flush(); endList(); html += `<h3>${inline(l.replace(/^###\s+/, ""))}</h3>`; continue; }
      if (/^[-*]\s+/.test(l)) { flush(); if (!list) { html += "<ul>"; list = true; } html += `<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`; continue; }
      endList(); para.push(l);
    }
    flush(); endList();
    return html;
  }

  /* ============================== AKUN ============================== */
  let secret;
  try { secret = fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch {}
  if (!secret || secret.length < 32) { secret = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 }); }
  let db = readJson(USERS, { users: [], orders: [] });
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  let dbWrite = Promise.resolve();
  const saveDb = () => (dbWrite = dbWrite.then(() => writeJson(USERS, db)));

  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const mac = s => crypto.createHmac("sha256", secret).update(s).digest("base64url");
  const SESSION_MS = 30 * 24 * 3600 * 1000;
  function makeToken(uid) { const p = b64({ u: uid, e: Date.now() + SESSION_MS }); return `${p}.${mac(p)}`; }
  function userFrom(req) {
    const t = getCookie(req, "nx_user");
    const [p, m] = String(t || "").split(".");
    if (!p || !m) return null;
    const good = Buffer.from(mac(p)), got = Buffer.from(m);
    if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
    try {
      const d = JSON.parse(Buffer.from(p, "base64url").toString());
      if (!d.e || d.e < Date.now()) return null;
      return db.users.find(u => u.id === d.u) || null;
    } catch { return null; }
  }
  const setSession = (res, uid) => res.setHeader("Set-Cookie", `nx_user=${makeToken(uid)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${SECURE_COOKIE ? "; Secure" : ""}`);
  const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
  const checkPw = (pw, u) => { if (!u.hash || !u.salt) return false; const a = Buffer.from(hashPw(pw, u.salt), "hex"), b = Buffer.from(u.hash, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
  const pubUser = u => ({ id: u.id, name: u.name, email: u.email });
  const fails = new Map();
  function limited(req, key) { const f = fails.get(key); return f && f.until > Date.now(); }
  function fail(key) { const f = fails.get(key) || { n: 0 }; f.n++; f.until = f.n >= 6 ? Date.now() + 15 * 60 * 1000 : 0; fails.set(key, f); }
  const STATUSES = ["Diterima", "Dikerjakan", "Review", "Selesai", "Dibatalkan"];
  const json = express.json({ limit: "8kb" });
  const needOrigin = (req, res, next) => (sameOrigin(req) ? next() : res.status(403).json({ error: "Permintaan ditolak." }));

  app.get("/ms/auth/me", (req, res) => { res.set("Cache-Control", "no-store"); const u = userFrom(req); res.json({ user: u ? pubUser(u) : null }); });
  app.post("/ms/auth/register", json, needOrigin, async (req, res) => {
    const key = "r:" + req.ip;
    if (limited(req, key)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const name = str(req.body?.name, 60), email = str(req.body?.email, 254).toLowerCase(), pw = String(req.body?.password || "");
    if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
    if (!EMAIL.test(email)) return res.status(400).json({ error: "Email tidak valid." });
    if (pw.length < 8 || pw.length > 100) return res.status(400).json({ error: "Sandi minimal 8 karakter." });
    if (db.users.some(u => u.email === email)) { fail(key); return res.status(409).json({ error: "Email ini sudah terdaftar. Coba masuk." }); }
    const salt = crypto.randomBytes(16).toString("hex");
    const u = { id: crypto.randomBytes(8).toString("hex"), name, email, salt, hash: hashPw(pw, salt), createdAt: new Date().toISOString() };
    db.users.push(u); await saveDb(); setSession(res, u.id);
    res.json({ ok: true, user: pubUser(u) });
  });
  app.post("/ms/auth/login", json, needOrigin, (req, res) => {
    const email = str(req.body?.email, 254).toLowerCase(), pw = String(req.body?.password || "");
    const key = "l:" + req.ip + ":" + email;
    if (limited(req, key)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const u = db.users.find(x => x.email === email);
    if (!u || !checkPw(pw, u)) { fail(key); return res.status(401).json({ error: "Email atau sandi salah." }); }
    fails.delete(key); setSession(res, u.id);
    res.json({ ok: true, user: pubUser(u) });
  });
  const GOOGLE_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  app.post("/ms/auth/google", json, needOrigin, async (req, res) => {
    if (!GOOGLE_ID) return res.status(503).json({ error: "Masuk dengan Google belum aktif." });
    const key = "g:" + req.ip;
    if (limited(req, key)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const cred = String(req.body?.credential || "");
    if (cred.length < 20 || cred.length > 4000) { fail(key); return res.status(400).json({ error: "Token tidak valid." }); }
    try {
      const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(cred), { signal: AbortSignal.timeout(8000) });
      const t = await r.json();
      const okIss = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
      if (!r.ok || t.aud !== GOOGLE_ID || !okIss || String(t.email_verified) !== "true" || !t.email || Number(t.exp) * 1000 < Date.now()) { fail(key); return res.status(401).json({ error: "Login Google ditolak. Coba lagi." }); }
      const email = String(t.email).toLowerCase();
      let u = db.users.find(x => x.email === email);
      if (!u) {
        u = { id: crypto.randomBytes(8).toString("hex"), name: str(t.name || email.split("@")[0], 60), email, google: true, createdAt: new Date().toISOString() };
        db.users.push(u); await saveDb();
      }
      fails.delete(key); setSession(res, u.id);
      res.json({ ok: true, user: pubUser(u) });
    } catch { res.status(502).json({ error: "Tidak bisa menghubungi Google. Coba lagi." }); }
  });
  app.post("/ms/auth/logout", (req, res) => { res.setHeader("Set-Cookie", "nx_user=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"); res.json({ ok: true }); });
  app.post("/ms/auth/password", json, needOrigin, async (req, res) => {
    const u = userFrom(req); if (!u) return res.status(401).json({ error: "Silakan masuk dulu." });
    const old = String(req.body?.old || ""), nw = String(req.body?.new || "");
    if (u.hash && !checkPw(old, u)) return res.status(401).json({ error: "Sandi lama salah." });
    if (nw.length < 8 || nw.length > 100) return res.status(400).json({ error: "Sandi baru minimal 8 karakter." });
    u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(nw, u.salt); await saveDb();
    res.json({ ok: true });
  });
  app.get("/ms/auth/orders", (req, res) => {
    const u = userFrom(req); if (!u) return res.status(401).json({ error: "Silakan masuk dulu." });
    res.set("Cache-Control", "no-store");
    res.json({ orders: db.orders.filter(o => o.userId === u.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(o => ({ id: o.id, title: o.title, status: o.status, note: o.note, updatedAt: o.updatedAt })) });
  });

  /* ---------------- API admin: blog ---------------- */
  const adminJson = express.json({ limit: "400kb" });
  app.get("/ms/admin/posts", requireAdmin, (req, res) => {
    const all = blog.posts.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ topics: TOPICS, posts: all.filter(p => !p.trashedAt), trash: all.filter(p => p.trashedAt) });
  });
  app.post("/ms/admin/posts", requireAdmin, adminJson, async (req, res) => {
    const b = req.body || {};
    const title = str(b.title, 140);
    if (!title) return res.status(400).json({ error: "Judul wajib diisi." });
    const topic = TOPICS[b.topic] ? b.topic : "social";
    const status = b.status === "published" ? "published" : "draft";
    const now = new Date().toISOString();
    let p = b.id ? blog.posts.find(x => x.id === b.id) : null;
    if (!p) { p = { id: crypto.randomBytes(6).toString("hex"), slug: uniqueSlug(slugify(title)), createdAt: now }; blog.posts.push(p); }
    Object.assign(p, { title, topic, excerpt: str(b.excerpt, 260), body: String(b.body || "").slice(0, 60000), cover: img(b.cover), status, updatedAt: now });
    if (status === "published" && !p.publishedAt) p.publishedAt = now;
    await saveBlog(); res.json({ ok: true, post: p });
    if (status === "published") pingIndex([p.slug]);
  });
  app.post("/ms/admin/posts/:id/trash", requireAdmin, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    p.trashedAt = new Date().toISOString(); await saveBlog(); res.json({ ok: true });
  });
  app.post("/ms/admin/posts/:id/restore", requireAdmin, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    delete p.trashedAt; await saveBlog(); res.json({ ok: true });
  });
  app.delete("/ms/admin/posts/:id", requireAdmin, async (req, res) => {
    const i = blog.posts.findIndex(x => x.id === req.params.id && x.trashedAt); if (i < 0) return res.status(400).json({ error: "Hanya tulisan di sampah yang bisa dihapus permanen." });
    blog.posts.splice(i, 1); await saveBlog(); res.json({ ok: true });
  });

  /* ---------------- API admin: pelanggan & pesanan ---------------- */
  app.get("/ms/admin/users", requireAdmin, (req, res) => {
    res.json({ statuses: STATUSES, users: db.users.map(u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, orders: db.orders.filter(o => o.userId === u.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) })) });
  });
  app.post("/ms/admin/orders", requireAdmin, express.json({ limit: "8kb" }), async (req, res) => {
    const b = req.body || {};
    const u = db.users.find(x => x.id === b.userId); if (!u) return res.status(404).json({ error: "Pelanggan tidak ditemukan." });
    const title = str(b.title, 120); if (!title) return res.status(400).json({ error: "Nama pesanan wajib diisi." });
    const o = { id: crypto.randomBytes(6).toString("hex"), userId: u.id, title, status: STATUSES.includes(b.status) ? b.status : "Diterima", note: str(b.note, 300), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.orders.push(o); await saveDb(); res.json({ ok: true, order: o });
  });
  app.put("/ms/admin/orders/:id", requireAdmin, express.json({ limit: "8kb" }), async (req, res) => {
    const o = db.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    const b = req.body || {};
    if (b.title !== undefined) o.title = str(b.title, 120) || o.title;
    if (STATUSES.includes(b.status)) o.status = b.status;
    if (b.note !== undefined) o.note = str(b.note, 300);
    o.updatedAt = new Date().toISOString(); await saveDb(); res.json({ ok: true, order: o });
  });
  app.delete("/ms/admin/orders/:id", requireAdmin, async (req, res) => {
    const i = db.orders.findIndex(x => x.id === req.params.id); if (i < 0) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    db.orders.splice(i, 1); await saveDb(); res.json({ ok: true });
  });
  // sandi sementara untuk pelanggan yang lupa sandi (tidak ada email otomatis)
  app.post("/ms/admin/users/:id/reset", requireAdmin, async (req, res) => {
    const u = db.users.find(x => x.id === req.params.id); if (!u) return res.status(404).json({ error: "Pelanggan tidak ditemukan." });
    const temp = crypto.randomBytes(6).toString("base64url");
    u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(temp, u.salt); await saveDb();
    res.json({ ok: true, tempPassword: temp });
  });

  /* ---------------- API publik blog (untuk beranda) ---------------- */
  app.get("/ms/blog/latest", (req, res) => {
    res.set("Cache-Control", "no-cache");
    const f = TOPICS[req.query.f] || req.query.f === "ut" ? req.query.f : "";
    const lim = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 3));
    const list = published().filter(p => !f || p.topic === f || (f === "ut" && (p.topic === "updateut" || p.topic === "study"))).slice(0, lim);
    res.json({ posts: list.map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, topic: tl(p.topic), cover: p.cover, date: p.publishedAt })) });
  });

  /* ============================ HALAMAN ============================ */
  const SOCIAL = () => (ctx.getSettings ? ctx.getSettings() : {}) || {};
  function layout({ title, desc, path: pth, body, extra = "", image = "", type = "website", noindex = false }) {
    const st = SOCIAL();
    const brand = esc(st.brand || "nextaja");
    const canon = `${SITE}${pth}`;
    return `<!doctype html>
<html lang="id" data-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#f6f3ff">
<link rel="canonical" href="${esc(canon)}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1"}">
<meta property="og:type" content="${type}"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="${brand}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}">${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:image" content="${esc(image)}">` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><link rel="alternate" type="application/rss+xml" title="${brand}" href="${SITE}/blog/feed.xml">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Bricolage+Grotesque:wght@600;700&display=swap" rel="stylesheet">
<script>try{var t=localStorage.getItem("nx-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}</script>
<link rel="stylesheet" href="/assets/blog.css?v=4">
${extra}
</head>
<body>
<header class="nav"><div class="wrap">
  <a href="/" class="logo" aria-label="${brand}, beranda"><b>N</b><span>${brand}</span></a>
  <nav class="links" id="links" aria-label="Menu utama">
    <a href="/ruangakademikut">Ruang Akademik UT</a><a href="/#harga">Harga</a><a href="/ms/labstudio">Lab Studio</a><a href="/#analisa">Analisa</a><a href="/blog" class="on">Blog</a>
  </nav>
  <div class="nav-r">
    <div class="mode" role="group" aria-label="Mode tampilan"><button type="button" data-m="dark">Gelap</button><button type="button" data-m="light">Terang</button></div>
    <a class="btn btn-pri btn-sm" id="navAcc" href="/ms/masuk">Masuk</a>
    <button class="burger" id="burger" aria-label="Buka menu" aria-expanded="false">☰</button>
  </div>
</div></header>
<main>${body}</main>
<footer class="ft"><div class="wrap ft-in"><div class="ft-b"><b>${brand}</b><span>Jakarta Barat. Ruang Akademik UT, Lab Studio, Analisa, dan Blog.</span><small>© ${new Date().getFullYear()} Semua hak dilindungi.</small></div><nav class="ft-n" aria-label="Footer"><a href="/ruangakademikut">Ruang Akademik UT</a><a href="/ms/labstudio">Lab Studio</a><a href="/#analisa">Analisa</a><a href="/blog">Blog</a><a href="/ms/masuk">Masuk</a><a href="/ms/privasi">Privasi</a><a href="/ms/ketentuan">Ketentuan</a></nav></div></footer>
<script>
(function(){
function setMode(m){document.documentElement.dataset.theme=m;try{localStorage.setItem("nx-theme",m)}catch(e){}var tc=document.querySelector('meta[name=theme-color]');if(tc)tc.content=m==="light"?"#f6f3ff":"#0a0a1c";}
document.querySelectorAll(".mode button").forEach(function(b){b.addEventListener("click",function(){setMode(b.dataset.m)})});
setMode(document.documentElement.dataset.theme||"light");
var bg=document.getElementById("burger"),ln=document.getElementById("links");
bg.addEventListener("click",function(){var o=ln.classList.toggle("open");bg.setAttribute("aria-expanded",o)});
fetch("/ms/auth/me",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d.user){var a=document.getElementById("navAcc");a.textContent="Akun saya";a.href="/ms/akun";}}).catch(function(){});
})();
</script>
</body></html>`;
  }

  const PORTAL_IMG = { "": ["blog-berita", "Blog dan berita nextaja"], viral: ["blog-berita", "Blog dan berita nextaja"], updateut: ["jadwal-kalender", "Info UT: jadwal, registrasi, dan ujian"], study: ["materi-belajar", "Materi belajar dan tips kuliah"], ai: ["tools-ai", "Tools AI dan otomatisasi"], social: ["video-studio", "Konten dan social media"] };
  const portalBanner = (key, w, h) => { const [n, alt] = PORTAL_IMG[key] || PORTAL_IMG[""]; return `<img class="pbanner" src="/site-img/portal/${n}.webp" alt="${esc(alt)}" width="${w || 300}" height="${h || 233}" loading="lazy">`; };
  const topicChip = (key, active) => `<a class="chip${active ? " on" : ""}" href="${key ? "/blog?f=" + key : "/blog"}">${key ? esc(TOPICS[key].label) : "Semua"}</a>`;
  const coverHtml = p => p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : `<span class="ph-t">${esc(tl(p.topic))}</span>`;

  app.get("/blog", (req, res) => {
    const f = TOPICS[req.query.f] ? req.query.f : "";
    const list = published().filter(p => !f || p.topic === f).slice(0, 60);
    const heading = f ? TOPICS[f].label : "Tulisan terbaru";
    const body = `<section class="pg"><div class="wrap">
      ${portalBanner(f)}
      <span class="eyebrow">Blog</span><h1>${esc(f === "viral" ? "Berita viral apa hari ini?" : heading)}</h1>
      <p class="lead">Catatan tentang belajar, social media, AI, dan hal-hal yang lagi ramai. Ditulis apa adanya.</p>
      <div class="chips">${topicChip("", !f)}${Object.keys(TOPICS).map(k => topicChip(k, f === k)).join("")}</div>
      ${list.length ? `<div class="grid">${list.map(p => `<a class="card post" href="/blog/${esc(p.slug)}"><div class="cv">${coverHtml(p)}</div><div class="pb"><span class="tag">${esc(tl(p.topic))}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><small>${esc(fmtDate(p.publishedAt))}</small></div></a>`).join("")}</div>`
        : `<div class="empty">Belum ada tulisan di sini. Tulisan pertama segera terbit.</div>`}
    </div></section>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: `${heading} — Blog nextaja`, desc: "Catatan tentang belajar, social media, AI, dan berita viral hari ini dari nextaja.", path: f ? `/blog?f=${f}` : "/blog", body }));
  });
  /* Indeks cepat: IndexNow (Bing, Yandex, dll) dipanggil otomatis saat tulisan terbit, berubah, atau dihapus.
     Google tidak punya jalur ping: Google menemukan tulisan lewat sitemap.xml yang selalu diperbarui (daftarkan sekali di Search Console). */
  const KEYF = path.join(DATA_DIR, "indexnow.key");
  let INK = ""; try { INK = fs.readFileSync(KEYF, "utf8").trim(); } catch {}
  if (!/^[a-f0-9]{32}$/.test(INK)) { INK = crypto.randomBytes(16).toString("hex"); try { fs.writeFileSync(KEYF, INK); } catch {} }
  app.get(/^\/([a-f0-9]{32})\.txt$/, (req, res, next) => (req.params[0] === INK ? res.type("text/plain").send(INK) : next()));
  function pingIndex(slugs) {
    if (!/^https:\/\//.test(SITE) || process.env.NODE_ENV === "test") return;
    const urls = [...slugs.map(s => `${SITE}/blog/${s}`), `${SITE}/blog`];
    fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host: new URL(SITE).host, key: INK, keyLocation: `${SITE}/${INK}.txt`, urlList: urls }), signal: AbortSignal.timeout(8000) })
      .then(r => console.log("IndexNow", r.status, urls.length, "url")).catch(e => console.log("IndexNow gagal:", e.message));
  }
  app.get("/blog/feed.xml", (req, res) => {
    const x = t => esc(t);
    res.type("application/rss+xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>nextaja blog</title><link>${SITE}/blog</link><description>Tips akademik, UT, dan layanan nextaja.</description><language>id-id</language>\n${published().slice(0, 30).map(p => `<item><title>${x(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${x(p.excerpt || p.title)}</description></item>`).join("\n")}\n</channel></rss>\n`);
  });

  app.get("/blog/:slug", (req, res, next) => {
    const p = published().find(x => x.slug === req.params.slug);
    if (!p) return next();
    const plain = String(p.body || "").replace(/[#*_>`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
    const desc = p.excerpt || (plain.length > 155 ? plain.slice(0, 152).replace(/\s+\S*$/, "") + "…" : plain) || p.title;
    const img = p.cover ? (/^https?:/.test(p.cover) ? p.cover : SITE + p.cover) : SITE + "/icon-512.png";
    const url = `${SITE}/blog/${p.slug}`;
    const ld = JSON.stringify([{ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title.slice(0, 110), datePublished: p.publishedAt, dateModified: p.updatedAt || p.publishedAt, description: desc, image: [img], inLanguage: "id-ID", wordCount: plain.split(" ").length, author: { "@type": "Person", name: "Dika Priyadi" }, publisher: { "@type": "Organization", name: "nextaja", logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" } }, mainEntityOfPage: { "@type": "WebPage", "@id": url } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog" }, { "@type": "ListItem", position: 3, name: p.title, item: url }] }]).replace(/</g, "\\u003c");
    const body = `<article class="pg art"><div class="wrap narrow">
      <a class="back" href="/blog?f=${esc(p.topic)}">← ${esc(tl(p.topic))}</a>
      <h1>${esc(p.title)}</h1>
      <div class="meta">${esc(fmtDate(p.publishedAt))} · Dika Priyadi</div>
      ${p.cover ? `<img class="hero-img" src="${esc(p.cover)}" alt="${esc(p.title)}">` : ""}
      <div class="prose">${renderBody(p.body)}</div>
      ${commentsBlock(p.slug)}
      <div class="cta-box"><b>Butuh bantuan?</b><span>Analisa akun, template IG, bantuan akademik, atau housekeeping.</span><a class="btn btn-pri btn-sm" href="/#analisa">Lihat layanan</a></div>
    </div></article>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: `${p.title} — nextaja`, desc, path: `/blog/${p.slug}`, body, image: img, type: "article", extra: `<meta property="article:published_time" content="${esc(p.publishedAt)}"><meta property="article:modified_time" content="${esc(p.updatedAt || p.publishedAt)}"><script type="application/ld+json">${ld}</script>` }));
  });


  /* ============================== KOMENTAR ============================== */
  const CMT = path.join(DATA_DIR, "comments.json");
  let cm = readJson(CMT, { items: [] });
  if (!Array.isArray(cm.items)) cm.items = [];
  let cmWrite = Promise.resolve();
  const saveCm = () => (cmWrite = cmWrite.then(() => writeJson(CMT, cm)));
  const cmRate = new Map();
  function cmLimited(ip) {
    const now = Date.now();
    const arr = (cmRate.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
    cmRate.set(ip, arr);
    if (arr.length >= 3) return true;
    arr.push(now); return false;
  }
  const pubCm = c => ({ id: c.id, name: c.name, text: c.text, at: c.at, reply: c.reply || null });
  app.get("/ms/blog/:slug/comments", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ items: cm.items.filter(c => c.slug === req.params.slug && !c.hidden).sort((a, b) => new Date(a.at) - new Date(b.at)).map(pubCm) });
  });
  app.post("/ms/blog/:slug/comments", express.json({ limit: "4kb" }), needOrigin, async (req, res) => {
    const post = published().find(x => x.slug === req.params.slug);
    if (!post) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    const b = req.body || {};
    if (b.website) return res.json({ ok: true });
    const u = userFrom(req);
    if (!u) return res.status(401).json({ error: "Masuk dulu untuk berkomentar.", login: true });
    const name = str(u.name || String(u.email || "").split("@")[0], 40);
    const text = str(b.text, 1000);
    if (name.length < 2) return res.status(400).json({ error: "Nama minimal 2 huruf." });
    if (text.length < 3) return res.status(400).json({ error: "Komentar terlalu pendek." });
    if ((text.match(/https?:\/\/|www\./gi) || []).length > 1) return res.status(400).json({ error: "Maksimal satu tautan per komentar." });
    if (cm.items.some(c => c.slug === post.slug && c.name === name && c.text === text)) return res.status(409).json({ error: "Komentar yang sama sudah ada." });
    if (cmLimited(req.ip)) return res.status(429).json({ error: "Terlalu cepat. Coba lagi beberapa menit lagi." });
    const c = { id: crypto.randomBytes(6).toString("hex"), slug: post.slug, name, text, at: new Date().toISOString(), hidden: false, uid: u ? u.id : null };
    cm.items.push(c);
    if (cm.items.length > 5000) cm.items = cm.items.slice(-5000);
    await saveCm();
    res.json({ ok: true, item: pubCm(c) });
  });
  app.get("/ms/admin/comments", requireAdmin, (req, res) => {
    res.json({ items: cm.items.slice().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 300) });
  });
  app.post("/ms/admin/comments/:id/reply", requireAdmin, express.json({ limit: "4kb" }), async (req, res) => {
    const c = cm.items.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    const text = str((req.body || {}).text, 1000);
    c.reply = text ? { text, at: new Date().toISOString() } : null;
    await saveCm(); res.json({ ok: true });
  });
  app.post("/ms/admin/comments/:id/hide", requireAdmin, async (req, res) => {
    const c = cm.items.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    c.hidden = !c.hidden; await saveCm(); res.json({ ok: true, hidden: c.hidden });
  });
  app.delete("/ms/admin/comments/:id", requireAdmin, async (req, res) => {
    const n = cm.items.length;
    cm.items = cm.items.filter(x => x.id !== req.params.id);
    if (cm.items.length === n) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    await saveCm(); res.json({ ok: true });
  });
  const commentsBlock = slug => `<section class="cmts" id="komentar" aria-labelledby="cmH">
      <h2 id="cmH">Komentar <span id="cmN"></span></h2>
      <div id="cmList" aria-live="polite"><p class="small">Memuat komentar…</p></div>
      <div id="cmLogin" class="cm-login" hidden><b>Mau ikut komentar?</b><span>Masuk dulu (bisa lewat Google, cuma beberapa detik).</span><a class="btn btn-pri btn-sm" href="/ms/masuk?next=${encodeURIComponent("/blog/" + slug)}">Masuk untuk berkomentar</a></div>
      <form id="cmF" class="cmf" novalidate hidden>
        <label>Komentar<textarea name="text" rows="4" maxlength="1000" required placeholder="Tulis pertanyaan atau tanggapan kamu…"></textarea></label>
        <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0">
        <p class="err" id="cmE" role="alert"></p>
        <button class="btn btn-pri" type="submit">Kirim komentar</button>
        <p class="small" id="cmWho"></p>
      </form>
      <script>
      (function(){var slug=${JSON.stringify(slug)},L=document.getElementById("cmList"),F=document.getElementById("cmF"),E=document.getElementById("cmE"),isAdmin=false;
      function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
      function fd(i){return new Date(i).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
      function api(m,u,b){return fetch(u,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})}
      function render(items){L.textContent="";document.getElementById("cmN").textContent=items.length?"("+items.length+")":"";
        if(!items.length){L.appendChild(el("p","small","Belum ada komentar. Jadi yang pertama."));return}
        items.forEach(function(c){var d=el("div","cm"+(c.hidden?" cm-hid":""));var h=el("div","cm-h");h.appendChild(el("b",null,c.name+(c.hidden?" (disembunyikan)":"")));h.appendChild(el("span","small",fd(c.at)));d.appendChild(h);d.appendChild(el("p",null,c.text));
          if(c.reply){var r=el("div","cm-r");var rh=el("div","cm-h");rh.appendChild(el("b",null,"Admin nextaja"));rh.appendChild(el("span","small",fd(c.reply.at)));r.appendChild(rh);r.appendChild(el("p",null,c.reply.text));d.appendChild(r)}
          if(isAdmin){var a=el("div","cm-a");
            var br=el("button",null,c.reply?"Ubah balasan":"Balas");br.type="button";br.onclick=function(){var t=prompt("Balasan admin:",c.reply?c.reply.text:"");if(t===null)return;api("POST","/ms/admin/comments/"+c.id+"/reply",{text:t}).then(load)};
            var bh=el("button",null,c.hidden?"Tampilkan":"Sembunyikan");bh.type="button";bh.onclick=function(){api("POST","/ms/admin/comments/"+c.id+"/hide").then(load)};
            var bd=el("button",null,"Hapus");bd.type="button";bd.onclick=function(){if(confirm("Hapus komentar ini?"))api("DELETE","/ms/admin/comments/"+c.id).then(load)};
            a.appendChild(br);a.appendChild(bh);a.appendChild(bd);d.appendChild(a)}
          L.appendChild(d)})}
      function load(){var u=isAdmin?"/ms/admin/comments":"/ms/blog/"+encodeURIComponent(slug)+"/comments";
        fetch(u,{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){var it=j.items||[];if(isAdmin)it=it.filter(function(c){return c.slug===slug}).reverse();render(it)}).catch(function(){L.textContent="Komentar gagal dimuat."})}
      fetch("/ms/admin/comments",{cache:"no-store"}).then(function(r){isAdmin=r.ok;load()}).catch(load);
      fetch("/ms/auth/me",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d.user){F.hidden=false;document.getElementById("cmWho").textContent="Berkomentar sebagai "+(d.user.name||d.user.email)+". Admin akan membalas di bawah komentarmu."}else document.getElementById("cmLogin").hidden=false}).catch(function(){document.getElementById("cmLogin").hidden=false});
      F.addEventListener("submit",function(e){e.preventDefault();E.textContent="";var b=F.querySelector("button");b.disabled=true;
        api("POST","/ms/blog/"+encodeURIComponent(slug)+"/comments",{text:F.text.value,website:F.website.value}).then(function(x){b.disabled=false;
          if(x.ok){F.text.value="";load()}else E.textContent=x.j.error||"Gagal mengirim."}).catch(function(){b.disabled=false;E.textContent="Tidak bisa terhubung."})});
      })();
      </script>
    </section>`;


  /* ============================== LAB STUDIO (satu kesatuan) ============================== */
  app.get("/ms/labstudio", (req, res) => {
    const wa = String(SOCIAL().waNumber || "6285722227544").replace(/\D/g, "");
    const body = `<section class="pg"><div class="wrap">
      <span class="eyebrow">Lab Studio</span>
      <h1>Preset, template, dan Studio Konten. Satu tempat.</h1>
      <p class="lead">Semua alat untuk bikin feed Instagram yang satu vibe. Lihat dulu semuanya, coba Studio Konten langsung di browser, lalu pilih yang cocok.</p>
      <div class="card ls-studio" id="studio">
        <div><h2>Studio Konten <span class="soon">beta</span></h2>
        <p>Unggah foto, pilih gaya tipografi, atur teksnya, lalu unduh gambarnya. Ada juga ide hook dan kerangka caption. Semua diproses di browser kamu.</p>
        <a class="btn btn-pri" href="/ms/studio">Coba Studio Konten</a></div>
        <img class="ls-img" src="/site-img/portal/video-studio.webp" alt="Video Content Studio" width="311" height="233" loading="lazy">
      </div>
      <div class="ls-hd" id="produk"><h2 class="ls-h">Preset &amp; Template</h2><img class="ls-img" src="/site-img/portal/preset-template.webp" alt="Preset dan template" width="297" height="233" loading="lazy"></div>
      <div class="chips" id="lt" role="tablist"></div>
      <div class="grid" id="lp"><p class="small">Memuat produk…</p></div>
    </div></section>
    <script>
    (function(){var WA=${JSON.stringify(wa)},cat="all",D=null,T=document.getElementById("lt"),P=document.getElementById("lp");
    function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
    function rp(n){return n?"Rp"+Number(n).toLocaleString("id-ID"):""}
    function draw(){P.textContent="";var items=D.products.filter(function(p){return p.active!==false&&(cat==="all"||p.type===cat)});
      if(!items.length){P.appendChild(el("p","small","Belum ada produk di kategori ini."));return}
      items.forEach(function(p){var c=el("article","card post ls-p");var cv=el("div","cv");
        if(/^\\/uploads\\/[a-z0-9._-]+$/i.test(p.image||"")){var im=el("img");im.src=p.image;im.alt="";im.loading="lazy";cv.appendChild(im)}else{cv.style.background="linear-gradient(135deg,"+(p.c1||"#7c3aed")+","+(p.c2||"#0a0a1c")+")";cv.appendChild(el("span","ph-t",p.title||p.name))}
        if(p.badge)cv.appendChild(el("span","ls-bd",p.badge));
        var b=el("div","pb");b.appendChild(el("h3",null,p.name));b.appendChild(el("p","small",p.desc||""));
        if(p.items&&p.items.length){var u=el("ul","ls-it");p.items.forEach(function(x){u.appendChild(el("li",null,x))});b.appendChild(u)}
        var pr=el("div","ls-pr");pr.appendChild(el("b",null,rp(p.price)));if(p.old&&p.old>p.price)pr.appendChild(el("s",null,rp(p.old)));b.appendChild(pr);
        var a=el("a","btn btn-pri btn-sm","Pesan via WhatsApp");a.target="_blank";a.rel="noopener";a.href="https://wa.me/"+WA+"?text="+encodeURIComponent("Halo admin nextaja, saya mau pesan: "+p.name);b.appendChild(a);
        c.appendChild(cv);c.appendChild(b);P.appendChild(c)})}
    fetch("/ms/store",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){D=d;
      var cats=(d.settings&&d.settings.categories||[]).filter(function(c){return d.products.some(function(p){return p.type===c.id&&p.active!==false})});
      var all=[{id:"all",label:"Semua"}].concat(cats);
      all.forEach(function(c){var b=el("button","chip"+(c.id==="all"?" on":""),c.label);b.type="button";b.onclick=function(){cat=c.id;T.querySelectorAll(".chip").forEach(function(x){x.classList.toggle("on",x===b)});draw()};T.appendChild(b)});
      if(all.length<3)T.hidden=true;draw()}).catch(function(){P.textContent="Produk gagal dimuat. Muat ulang halaman."});
    })();
    </script>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: "Lab Studio: preset, template, dan Studio Konten — nextaja", desc: "Preset Lightroom, template Canva, dan Studio Konten untuk feed Instagram yang satu vibe.", path: "/ms/labstudio", body }));
  });

  /* ---- Studio Konten Fase 0: desain tipografi + kerangka caption, semua di browser ---- */
  app.get("/ms/studio", (req, res) => {
    const body = `<section class="pg"><div class="wrap">
  <span class="eyebrow">Studio Konten · Fase 0</span>
  <h1>Foto jadi konten siap posting</h1>
  <p class="lead">Unggah foto, pilih gaya, atur teksnya, lalu unduh gambarnya. Semua diproses di browser kamu dan fotonya tidak dikirim ke server kami. Posting otomatis ke TikTok dan Instagram belum tersedia.</p>
  <div class="stu stu-wrap">
    <div class="stu-card card">
      <h3>1. Foto dan ukuran</h3>
      <label>Foto (JPG, PNG, atau WebP, maksimal 15 MB)<input type="file" id="file" accept="image/*"></label>
      <div class="row"><button type="button" class="pill" id="clear">Hapus foto</button></div>
      <div class="row" id="fmt" role="group" aria-label="Ukuran"><button type="button" class="pill" data-f="4:5" aria-pressed="true">4:5 Feed</button><button type="button" class="pill" data-f="1:1" aria-pressed="false">1:1 Kotak</button><button type="button" class="pill" data-f="9:16" aria-pressed="false">9:16 Story/Reels</button></div>
      <label>Zoom foto<input type="range" id="zoom" min="1" max="3" step="0.01" value="1"></label>
      <p class="small" id="msg" aria-live="polite" style="margin:0"></p>
      <h3>2. Gaya tipografi</h3>
      <div class="row" id="tpl" role="group" aria-label="Gaya"><button type="button" class="pill" data-t="bold" aria-pressed="true">Bold bawah</button><button type="button" class="pill" data-t="center" aria-pressed="false">Tengah</button><button type="button" class="pill" data-t="editorial" aria-pressed="false">Editorial</button><button type="button" class="pill" data-t="poster" aria-pressed="false">Poster merah</button><button type="button" class="pill" data-t="quote" aria-pressed="false">Kutipan</button><button type="button" class="pill" data-t="minimal" aria-pressed="false">Minimal</button></div>
      <h3>3. Teks</h3>
      <label>Headline<textarea id="head" maxlength="180">Judul kontenmu di sini</textarea></label>
      <label>Subteks<input type="text" id="sub" maxlength="120" value="Subteks singkat yang menjelaskan isinya"></label>
      <div class="two"><label>Nama akun<input type="text" id="handle" maxlength="40" value="@akunmu"></label><label>Warna aksen<input type="color" id="acc" value="#7c3aed"></label></div>
      <label>Ukuran headline<input type="range" id="size" min="60" max="140" step="1" value="100"></label>
      <button type="button" class="btn btn-pri" id="dl">Unduh PNG</button>
      <p class="stu-note">Cek lagi teks dan hak pakai fotonya sebelum diposting. Kamu yang bertanggung jawab atas isi kontenmu.</p>
    </div>
    <div class="stu-prev"><canvas id="cv" width="1080" height="1350" aria-label="Pratinjau desain. Geser untuk mengatur posisi foto."></canvas><p class="small">Geser foto di pratinjau untuk mengatur posisi.</p></div>
  </div>

  <div class="stu-card card" style="margin-top:24px">
    <h3>Ide hook dan kerangka caption</h3>
    <p class="small" style="margin:0">Dibuat dari templat kalimat, bukan AI. Selalu edit supaya cocok dengan isi kontenmu.</p>
    <div class="two"><label>Topik<input type="text" id="topic" maxlength="60" placeholder="contoh: analisa TikTok"></label><label>Untuk siapa<input type="text" id="aud" maxlength="40" placeholder="contoh: Kreator pemula"></label></div>
    <div class="row"><button type="button" class="btn btn-pri btn-sm" id="hookGo">Buat ide hook</button></div>
    <div id="hooks" style="display:grid;gap:10px"></div>
    <h3>Kerangka caption</h3>
    <label>Hook<input type="text" id="cHook" maxlength="200" placeholder="tempel atau ketik hook"></label>
    <label>Poin isi (satu baris satu poin)<textarea id="cPts" placeholder="Poin 1&#10;Poin 2&#10;Poin 3"></textarea></label>
    <label>Tujuan<select id="cGoal"><option value="edukasi">Edukasi</option><option value="jualan">Jualan</option><option value="cerita">Cerita</option></select></label>
    <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="capGo">Susun caption</button><button type="button" class="btn btn-ghost btn-sm" id="capCopy">Salin caption</button></div>
    <label>Hasil caption (boleh diedit)<textarea id="cOut" style="min-height:160px"></textarea></label>
  </div>
</div></section>
<script src="/assets/studio.js?v=1" defer></script>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: "Studio Konten — nextaja", desc: "Ubah fotomu jadi desain tipografi siap posting dan susun kerangka caption, langsung di browser.", path: "/ms/studio", body, extra: '<link rel="stylesheet" href="/assets/studio.css?v=1">' }));
  });

  /* ---- kebijakan privasi & ketentuan ---- */
  const legalPage = (title, desc, pth, html) => (req, res) => {
    const wa = String((SOCIAL().waNumber) || "6285722227544");
    const body = `<section class="pg"><div class="wrap narrow"><article class="card" style="padding:28px;line-height:1.75">${html.replace(/\{WA\}/g, `<a href="https://wa.me/${wa}" rel="noopener">WhatsApp admin</a>`)}</article></div></section>`;
    res.type("html").send(layout({ title, desc, path: pth, body }));
  };
  app.get("/ms/privasi", legalPage("Kebijakan Privasi — nextaja", "Data apa yang nextaja kumpulkan dan bagaimana dipakai.", "/ms/privasi", `
    <h1>Kebijakan Privasi</h1>
    <p>Terakhir diperbarui: Oktober 2026. Situs ini dikelola oleh nextaja, Jakarta Barat.</p>
    <h2>Data yang kami simpan</h2>
    <p>Kalau kamu membuat akun atau masuk dengan Google, kami menyimpan nama dan alamat email kamu. Kalau kamu memesan jasa, kami menyimpan nama pesanan, statusnya, dan catatan yang diperlukan untuk mengerjakannya. Sandi akun email-sandi disimpan dalam bentuk acak (hash), bukan teks asli.</p>
    <h2>Masuk dengan Google</h2>
    <p>Kami hanya menerima nama dan alamat email dari akun Google kamu untuk membuat dan mengenali akunmu. Kami tidak mengakses Gmail, kontak, Drive, atau data Google lainnya.</p>
    <h2>Untuk apa data dipakai</h2>
    <p>Hanya untuk menjalankan akun dan pesananmu, serta menghubungi kamu terkait pesanan. Kami tidak menjual atau menyewakan data kamu kepada pihak lain.</p>
    <h2>Cookie</h2>
    <p>Kami memakai cookie sesi agar kamu tetap masuk, dan penyimpanan lokal untuk mengingat pilihan tampilan terang atau gelap. Tidak ada cookie iklan.</p>
    <h2>Hapus data kamu</h2>
    <p>Minta penghapusan akun dan datamu kapan saja lewat {WA}.</p>`));
  app.get("/ms/ketentuan", legalPage("Ketentuan Layanan — nextaja", "Aturan pemakaian situs dan layanan nextaja.", "/ms/ketentuan", `
    <h1>Ketentuan Layanan</h1>
    <p>Terakhir diperbarui: Oktober 2026. Dengan memakai situs ini, kamu setuju dengan ketentuan berikut.</p>
    <h2>Layanan</h2>
    <p>nextaja menyediakan analisa akun, preset dan template, bantuan akademik, serta jasa housekeeping. Detail, harga, dan jadwal disepakati lewat WhatsApp sebelum pengerjaan.</p>
    <h2>Bantuan akademik</h2>
    <p>Bantuan akademik berupa pendampingan dan referensi untuk membantu kamu belajar. Kami tidak menjamin nilai atau kelulusan. Kamu bertanggung jawab atas karya yang kamu kumpulkan dan atas kepatuhan pada aturan kampusmu.</p>
    <h2>Akun</h2>
    <p>Jaga kerahasiaan akunmu. Kami bisa menonaktifkan akun yang dipakai untuk menyalahgunakan layanan.</p>
    <h2>Perubahan</h2>
    <p>Ketentuan dan layanan bisa berubah. Pertanyaan: {WA}.</p>`));

  /* ---- login & akun ---- */
  app.get("/ms/masuk", (req, res) => {
    if (userFrom(req)) return res.redirect("/ms/akun");
    const body = `<section class="pg"><div class="wrap narrow">
      <div class="card form">
        <div class="tabs2" role="tablist"><button type="button" data-t="in" aria-pressed="true">Masuk</button><button type="button" data-t="up" aria-pressed="false">Daftar</button></div>
        <form id="f" novalidate>
          <label id="lName" hidden>Nama<input name="name" autocomplete="name" maxlength="60"></label>
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <label>Sandi<span class="pw"><input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="100"><button type="button" id="pwT" aria-label="Tampilkan sandi" aria-pressed="false">Lihat</button></span><small id="hint" hidden>Minimal 8 karakter.</small></label>
          <p class="err" id="err" role="alert"></p>
          <button class="btn btn-pri" id="go" type="submit">Masuk</button>
        </form>
        <div id="gWrap" hidden><div class="or"><span>atau</span></div><div id="gBtn" style="display:flex;justify-content:center"></div></div>
        <p class="small">Lupa sandi? <a id="wa" href="#" target="_blank" rel="noopener">Hubungi admin lewat WhatsApp</a> dan minta sandi sementara.</p>
      </div></div></section>
      <script>
      (function(){var NEXT=(function(){var n=new URLSearchParams(location.search).get("next")||"";return /^\/[a-zA-Z0-9\/_\-?=&.%]*$/.test(n)&&n.indexOf("//")!==0?n:"/ms/akun"})();var mode="in",f=document.getElementById("f"),err=document.getElementById("err");
      var w=${JSON.stringify(String((SOCIAL().waNumber) || "6285722227544"))};document.getElementById("wa").href="https://wa.me/"+w+"?text="+encodeURIComponent("Halo admin nextaja, saya lupa sandi akun saya.");
      document.querySelectorAll(".tabs2 button").forEach(function(b){b.addEventListener("click",function(){mode=b.dataset.t;
        document.querySelectorAll(".tabs2 button").forEach(function(x){x.setAttribute("aria-pressed",x===b)});
        document.getElementById("lName").hidden=mode!=="up";document.getElementById("hint").hidden=mode!=="up";
        document.getElementById("go").textContent=mode==="up"?"Buat akun":"Masuk";f.password.autocomplete=mode==="up"?"new-password":"current-password";err.textContent="";});});
      document.getElementById("pwT").addEventListener("click",function(){var sh=f.password.type==="password";f.password.type=sh?"text":"password";this.textContent=sh?"Sembunyi":"Lihat";this.setAttribute("aria-pressed",sh);this.setAttribute("aria-label",sh?"Sembunyikan sandi":"Tampilkan sandi")});
      var GID=${JSON.stringify(GOOGLE_ID)};
      if(GID){var sc=document.createElement("script");sc.src="https://accounts.google.com/gsi/client";sc.async=true;sc.onload=function(){
        google.accounts.id.initialize({client_id:GID,callback:function(r){err.textContent="";
          fetch("/ms/auth/google",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:r.credential})})
          .then(function(x){return x.json().then(function(j){return {ok:x.ok,j:j}})}).then(function(x){if(x.ok)location.href=NEXT;else err.textContent=x.j.error||"Gagal. Coba lagi.";})
          .catch(function(){err.textContent="Tidak bisa terhubung. Coba lagi.";});}});
        google.accounts.id.renderButton(document.getElementById("gBtn"),{theme:"outline",size:"large",text:"continue_with",shape:"pill",width:300,locale:"id"});
        document.getElementById("gWrap").hidden=false;};document.head.appendChild(sc);}
      f.addEventListener("submit",function(e){e.preventDefault();err.textContent="";
        var d={email:f.email.value,password:f.password.value};if(mode==="up")d.name=f.name.value;
        fetch("/ms/auth/"+(mode==="up"?"register":"login"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){if(x.ok)location.href=NEXT;else err.textContent=x.j.error||"Gagal. Coba lagi.";})
        .catch(function(){err.textContent="Tidak bisa terhubung. Coba lagi.";});});})();
      </script>`;
    res.set("Cache-Control", "no-store").type("html").send(layout({ title: "Masuk atau daftar — nextaja", desc: "Masuk ke akun nextaja untuk melihat pesanan kamu.", path: "/ms/masuk", body }));
  });
  app.get("/ms/akun", (req, res) => {
    const u = userFrom(req);
    if (!u) return res.redirect("/ms/masuk");
    const body = `<section class="pg"><div class="wrap narrow">
      <span class="eyebrow">Akun saya</span><h1>Halo, ${esc(u.name)}</h1><p class="lead">${esc(u.email)}</p>
      <div class="card form"><h3>Pesanan saya</h3><div id="orders" class="orders"><div class="empty">Memuat…</div></div></div>
      <div class="card form"><h3>Ganti sandi</h3>
        <form id="pw" novalidate><label>Sandi lama<input name="old" type="password" autocomplete="current-password"></label><label>Sandi baru<input name="new" type="password" autocomplete="new-password" minlength="8"></label><p class="err" id="pe" role="alert"></p><button class="btn btn-pri btn-sm" type="submit">Simpan sandi</button></form></div>
      <button class="btn btn-ghost btn-sm" id="out" type="button" style="margin-top:18px">Keluar</button>
      </div></section>
      <script>
      (function(){var box=document.getElementById("orders");
      function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
      fetch("/ms/auth/orders",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
        var o=d.orders||[];box.innerHTML=o.length?o.map(function(x){return '<div class="ord"><div><b>'+esc(x.title)+'</b>'+(x.note?'<small>'+esc(x.note)+'</small>':'')+'</div><span class="st st-'+esc(x.status)+'">'+esc(x.status)+'</span></div>'}).join(""):'<div class="empty">Belum ada pesanan. Pesanan yang kamu buat lewat WhatsApp akan muncul di sini setelah admin mencatatnya.</div>';
      }).catch(function(){box.innerHTML='<div class="empty">Gagal memuat pesanan.</div>'});
      document.getElementById("out").addEventListener("click",function(){fetch("/ms/auth/logout",{method:"POST"}).then(function(){location.href="/"})});
      var f=document.getElementById("pw"),pe=document.getElementById("pe");
      f.addEventListener("submit",function(e){e.preventDefault();pe.textContent="";pe.style.color="";
        fetch("/ms/auth/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({old:f.old.value,new:f.new.value})})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){if(x.ok){pe.style.color="var(--acc)";pe.textContent="Sandi sudah diganti.";f.reset();}else pe.textContent=x.j.error||"Gagal.";});});})();
      </script>`;
    res.set("Cache-Control", "no-store").type("html").send(layout({ title: "Akun saya — nextaja", desc: "Pesanan dan pengaturan akun nextaja.", path: "/ms/akun", body }));
  });

  // untuk sitemap
  return { userFrom, pageUrls: () => ["/ruangakademikut", "/ruangakademikut/cek-parafrase-mandiri", "/ruangakademikut/audit", "/ruangakademikut/layanan", "/ruangakademikut/blog-ut"].map(u => ({ loc: `${SITE}${u}`, pri: "0.7" })), blogUrls: () => published().map(p => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: (p.updatedAt || p.publishedAt || "").slice(0, 10), pri: "0.6" })) };
};
