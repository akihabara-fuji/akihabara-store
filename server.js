/* =================================================================
   nextaja — server web + panel admin
   - Web publik  : /            (public/index.html, data diisi dari data/store.json)
   - Panel admin : /admin       (login pakai ADMIN_PASSWORD di file .env)
   - API publik  : /ms/store
   ================================================================= */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");

loadEnv(path.join(__dirname, ".env"));
const PORT = +process.env.PORT || 3200;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECURE_COOKIE = process.env.SECURE_COOKIE !== "false"; // false hanya untuk tes lokal tanpa https
if (ADMIN_PASSWORD.length < 10) {
  console.error("\n[!] ADMIN_PASSWORD di file .env belum diisi / kurang dari 10 karakter. Panel admin dikunci.\n");
}

const ROOT = __dirname;
const PUB = path.join(ROOT, "public");
const UPLOADS = path.join(PUB, "uploads");
const DATA = path.join(ROOT, "data", "store.json");
const BACKUPS = path.join(ROOT, "data", "backups");
const ICONS = JSON.parse(fs.readFileSync(path.join(ROOT, "icons.json"), "utf8"));
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(BACKUPS, { recursive: true });

let sharp = null;
try { sharp = require("sharp"); } catch { console.warn("[i] sharp tidak terpasang — foto disimpan apa adanya (tanpa kompres)."); }

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
  });
  next();
});

/* ---------------- tema UI ---------------- */
// Mode gelap/terang diatur di halaman (tombol Gelap|Terang). Di sini cuma pilihan warna aksen.
const THEMES = {
  terra:  { name: "Terakota (default)", bg: "#1f1e1d", a1: "#ff6a1a", a2: "#ffa43a", on: "#1f1e1d" },
  indigo: { name: "Indigo", bg: "#fbfbff", a1: "#4a3aff", a2: "#ff6a1a", on: "#ffffff" },
  ocean:  { name: "Ocean", bg: "#0a1217", a1: "#22d3ee", a2: "#3b82f6", on: "#04121a" },
  matcha: { name: "Matcha", bg: "#0d120d", a1: "#4ade80", a2: "#a3e635", on: "#06140a" },
  sakura: { name: "Sakura", bg: "#140c10", a1: "#f472b6", a2: "#fb7185", on: "#ffffff" },
  mono:   { name: "Monokrom", bg: "#111111", a1: "#f5f5f5", a2: "#a3a3a3", on: "#0a0a0a" },
};
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function themeCss(t = {}) {
  const base = THEMES[t.preset] || THEMES.terra;
  const a1 = t.a1 || base.a1, a2 = t.a2 || base.a2;
  // teks tombol otomatis gelap/terang supaya tetap kebaca
  const on = luminance(a1) > 0.4 ? "#11112b" : "#ffffff";
  // tema bawaan: halaman memakai warna aksen sendiri per mode (gelap = terakota, terang = indigo)
  // identitas nextaja (putih, hitam, merah) dikunci di halaman; hanya warna kustom (a1/a2) yang dihormati
  if (!t.a1 && !t.a2) return "";
  return `:root{--acc:${a1};--acc2:${a2};--on-accent:${on}}`;
}

/* ---------------- data store ---------------- */
let store = JSON.parse(fs.readFileSync(DATA, "utf8"));
let writing = Promise.resolve();

async function saveStore(next) {
  // tulis atomik + simpan cadangan (maks 40 terakhir)
  writing = writing.then(async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fsp.copyFile(DATA, path.join(BACKUPS, `store-${stamp}.json`)).catch(() => {});
    const tmp = DATA + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(next, null, 2));
    await fsp.rename(tmp, DATA);
    store = next;
    const files = (await fsp.readdir(BACKUPS)).filter(f => f.endsWith(".json")).sort();
    for (const f of files.slice(0, Math.max(0, files.length - 40))) await fsp.unlink(path.join(BACKUPS, f)).catch(() => {});
  });
  return writing;
}

/* ---------------- validasi input admin ---------------- */
const str = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const int = (v, max = 100000000) => { const n = Math.round(Number(String(v).replace(/[^\d]/g, ""))); return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0; };
const color = v => (/^#[0-9a-f]{6}$/i.test(v) ? v : "#5b21b6");
const slug = v => str(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, "") || crypto.randomBytes(3).toString("hex");
const url = v => { const s = str(v, 300); return /^(https?:\/\/|\/)[^\s"'<>]*$/i.test(s) ? s : ""; };
const img = v => { const s = str(v, 200); return /^\/uploads\/[a-z0-9._-]+$/i.test(s) ? s : ""; };
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

function clean(input) {
  const s = input.settings || {};
  const cats = arr(s.categories, 12).map(c => ({ id: slug(c.id), label: str(c.label, 40) })).filter(c => c.label);
  const catIds = new Set(cats.map(c => c.id));
  const uniq = new Set();
  const uid = (id, pre) => { let v = slug(id); if (!v || uniq.has(v)) v = pre + crypto.randomBytes(3).toString("hex"); uniq.add(v); return v; };
  return {
    settings: {
      waNumber: str(s.waNumber, 20).replace(/\D/g, ""),
      analisaUrl: url(s.analisaUrl),
      nugasUrl: url(s.nugasUrl),
      analisaFree: str(s.analisaFree, 60),
      analisaPrice: str(s.analisaPrice, 30),
      showPrices: s.showPrices === true,           // harga disembunyikan sampai admin menyalakan
      brand: str(s.brand, 30) || "nextaja",
      tiktok: str(s.tiktok, 40),
      instagram: str(s.instagram, 40),
      facebook: str(s.facebook, 60),
      facebookUrl: url(s.facebookUrl),
      studioSoon: s.studioSoon !== false,
      workPhoto: img(s.workPhoto),
      heroEyebrow: str(s.heroEyebrow, 80),
      heroTitle: str(s.heroTitle, 160),
      heroLead: str(s.heroLead, 300),
      marquee: arr(s.marquee, 20).map(x => str(x, 40)).filter(Boolean),
      categories: cats.length ? cats : [{ id: "preset", label: "Preset Lightroom" }],
      theme: {
        preset: THEMES[(s.theme || {}).preset] ? s.theme.preset : "terra",
        a1: /^#[0-9a-f]{6}$/i.test((s.theme || {}).a1) ? s.theme.a1 : "",
        a2: /^#[0-9a-f]{6}$/i.test((s.theme || {}).a2) ? s.theme.a2 : "",
      },
      nx: true,
    },
    products: arr(input.products, 200).map(p => ({
      id: uid(p.id, "p"),
      type: catIds.has(p.type) ? p.type : (cats[0] || { id: "preset" }).id,
      name: str(p.name, 80) || "Produk tanpa nama",
      desc: str(p.desc, 240),
      price: int(p.price),
      old: int(p.old),
      badge: str(p.badge, 20),
      items: arr(p.items, 10).map(x => str(x, 90)).filter(Boolean),
      image: img(p.image),
      c1: color(p.c1), c2: color(p.c2),
      title: str(p.title, 40),
      active: p.active !== false,
    })),
    services: arr(input.services, 60).map(x => ({
      id: uid(x.id, "s"),
      name: str(x.name, 60) || "Layanan",
      desc: str(x.desc, 140),
      icon: ICONS[x.icon] ? x.icon : "sparkle",
      image: img(x.image),
      g: [color((x.g || [])[0]), color((x.g || [])[1])],
      active: x.active !== false,
    })),
    reviews: arr(input.reviews, 60).map(r => ({
      id: uid(r.id, "r"),
      image: img(r.image),
      name: str(r.name, 40),
      text: str(r.text, 280),
      area: ["akademik", "umum", "housekeeping"].includes(r.area) ? r.area : "umum",
      active: r.active !== false,
    })).filter(r => r.image || r.text),
    faq: arr(input.faq, 40).map(f => ({ id: uid(f.id, "f"), q: str(f.q, 160), a: str(f.a, 800) })).filter(f => f.q),
  };
}

/* ---------------- auth (sesi di memori, cookie httpOnly) ---------------- */
const sessions = new Map(); // token -> expiry
const SESSION_MS = 12 * 3600 * 1000;
const fails = new Map(); // ip -> {n, until}

function getCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function isAuthed(req) {
  const t = getCookie(req, "ms_admin");
  const exp = t && sessions.get(t);
  if (!exp || exp < Date.now()) { if (t) sessions.delete(t); return false; }
  return true;
}
function sameOrigin(req) {
  const o = req.headers.origin || req.headers.referer || "";
  if (!o) return false;
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}
function requireAdmin(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ error: "Sesi habis, silakan login lagi." });
  if (req.method !== "GET" && !sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
  next();
}
function safeEqual(a, b) {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

app.post("/ms/admin/login", express.json({ limit: "4kb" }), (req, res) => {
  const ip = req.ip;
  const f = fails.get(ip);
  if (f && f.until > Date.now()) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
  if (ADMIN_PASSWORD.length < 10) return res.status(503).json({ error: "ADMIN_PASSWORD di server belum diatur." });
  if (!safeEqual(String(req.body?.password || ""), ADMIN_PASSWORD)) {
    const n = (f?.n || 0) + 1;
    fails.set(ip, { n, until: n >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
    return res.status(401).json({ error: "Password salah." });
  }
  fails.delete(ip);
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_MS);
  res.setHeader("Set-Cookie", `ms_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${SECURE_COOKIE ? "; Secure" : ""}`);
  res.json({ ok: true });
});
app.post("/ms/admin/logout", (req, res) => {
  sessions.delete(getCookie(req, "ms_admin"));
  res.setHeader("Set-Cookie", "ms_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  res.json({ ok: true });
});

/* ---------------- API ---------------- */
app.get("/ms/store", (req, res) => { res.set("Cache-Control", "no-store"); res.json(publicStore()); });

app.get("/ms/admin/me", (req, res) => res.json({ authed: isAuthed(req) }));
app.get("/ms/admin/store", requireAdmin, (req, res) => res.json({ store, icons: ICONS, themes: THEMES }));
app.put("/ms/admin/store", requireAdmin, express.json({ limit: "1mb" }), async (req, res) => {
  try { const next = clean(req.body || {}); await saveStore(next); res.json({ ok: true, store: next }); }
  catch (e) { console.error(e); res.status(500).json({ error: "Gagal menyimpan." }); }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpe?g|png|webp|gif|avif|tiff|bmp)$/.test(file.mimetype)),
});
const uploadOne = (req, res, next) => upload.single("file")(req, res, err => {
  if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Foto terlalu besar (maks 30MB)." : "Upload gagal. Coba lagi." });
  next();
});
app.post("/ms/admin/upload", requireAdmin, uploadOne, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File harus berupa gambar (JPG, PNG, WebP, GIF, AVIF), maks 30MB." });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    let out, ext;
    if (sharp) {
      out = await sharp(req.file.buffer, { failOn: "error" }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      ext = "webp";
    } else {
      out = req.file.buffer; ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[req.file.mimetype];
    }
    await fsp.writeFile(path.join(UPLOADS, `${name}.${ext}`), out);
    res.json({ ok: true, url: `/uploads/${name}.${ext}` });
  } catch (e) { res.status(400).json({ error: "Gambar tidak bisa dibaca. Coba file lain." }); }
});

app.get("/ms/admin/backups", requireAdmin, async (req, res) => {
  const files = (await fsp.readdir(BACKUPS)).filter(f => f.endsWith(".json")).sort().reverse();
  res.json({ backups: files });
});
app.post("/ms/admin/restore", requireAdmin, express.json({ limit: "4kb" }), async (req, res) => {
  const f = String(req.body?.file || "");
  if (!/^store-[\w-]+\.json$/.test(f)) return res.status(400).json({ error: "File cadangan tidak valid." });
  try {
    const data = JSON.parse(await fsp.readFile(path.join(BACKUPS, f), "utf8"));
    const next = clean(data); await saveStore(next); res.json({ ok: true, store: next });
  } catch { res.status(404).json({ error: "Cadangan tidak ditemukan." }); }
});

/* ---------------- halaman ---------------- */
function publicStore() {
  const st = store.settings || {};
  const show = st.showPrices === true;
  return {
    settings: show ? st : { ...st, analisaPrice: "" },
    products: store.products.filter(p => p.active).map(p => (show ? p : { ...p, price: 0, old: 0 })),
    services: store.services.filter(s => s.active).map(s => ({ ...s, icon: ICONS[s.icon] || ICONS.sparkle })),
    reviews: (store.reviews || []).filter(r => r.active),
    faq: store.faq,
  };
}
const SITE = (process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
// Alamat rumah layanan akademik dan blog. Bila ACAD_URL belum diatur, sama dengan SITE (perilaku lama).
const ACAD = (process.env.ACAD_URL || SITE).replace(/\/+$/, "");
const ACAD_HOSTS = ACAD === SITE ? [] : [new URL(ACAD).hostname, "www." + new URL(ACAD).hostname];
const isAcadHost = req => ACAD_HOSTS.includes(req.hostname);
const TEMPLATE = path.join(PUB, "index.html");
app.get("/robots.txt", (req, res) => {
  const base = isAcadHost(req) ? ACAD : SITE;
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /ms/\n\nSitemap: ${base}/sitemap.xml\n`);
});
app.get("/sitemap.xml", (req, res) => {
  const urls = ACAD === SITE
    ? [{ loc: `${SITE}/`, pri: "1.0" }, { loc: `${SITE}/blog`, pri: "0.8" }, ...extra.pageUrls(), ...extra.blogUrls()]
    : isAcadHost(req)
      ? [{ loc: `${ACAD}/blog`, pri: "0.8" }, ...extra.pageUrls(), ...extra.blogUrls()]
      : [{ loc: `${SITE}/`, pri: "1.0" }];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`).join("\n")}\n</urlset>\n`);
});
app.get(["/", "/index.html"], async (req, res) => {
  const html = await fsp.readFile(TEMPLATE, "utf8");
  const json = JSON.stringify(publicStore()).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
  res.set("Cache-Control", "no-cache");
  const st = store.settings || {};
    res.type("html").send(html.replaceAll("{{SITE}}", SITE)
    .replace('<style id="theme-vars"></style>', `<style id="theme-vars">${themeCss(st.theme)}</style>`)
    .replace('<script id="store-data" type="application/json">null</script>', `<script id="store-data" type="application/json">${json}</script>`));
});
/* ---------------- blog + akun customer ---------------- */
const extra = require("./blog-akun")({ app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE, ROOT, SITE: ACAD, getSettings: () => store.settings });

/* ---------------- Cek dan Parafrase Mandiri (modul terpisah, lihat parafrase/) ---------------- */
/* fitur coba (unggah & pesan) wajib login; halaman dan harga tetap terbuka */
const needLogin = (req, res, next) => (extra.userFrom(req) ? next() : res.status(401).json({ error: "Masuk dulu untuk mencoba fitur ini.", login: true }));
app.post("/ms/parafrase/upload", needLogin);
app.post("/ms/parafrase/order", needLogin);
app.post("/ms/layanan/order", needLogin);
app.post("/ms/audit/order", needLogin);
app.post("/ms/audit/upload", needLogin);
require("./parafrase")({ app, express, requireAdmin, sameOrigin, ROOT });

app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html" }));
app.use("/uploads", express.static(UPLOADS, { maxAge: "30d", immutable: true }));
app.use(express.static(PUB, { maxAge: "1h", index: false }));
/* Paling akhir: 404. API menjawab JSON, halaman menjawab 404 bermerek. */
app.use((req, res) => (req.path.startsWith("/ms/") ? res.status(404).json({ error: "Tidak ditemukan." }) : extra.notFound(req, res)));

/* ---------------- migrasi satu kali ke desain nextaja ----------------
   Jalan sekali saja (ditandai settings.nx). Cadangan otomatis dibuat sebelum menyimpan.
   Hanya mengganti teks/layanan yang MASIH berupa data bawaan lama; yang sudah diubah admin tidak disentuh. */
(async () => {
  try {
    if (store.settings && store.settings.nx) return;
    const next = JSON.parse(JSON.stringify(store));
    const s = next.settings = next.settings || {};
    s.showPrices = false;
    s.brand = "nextaja"; s.tiktok = "@akihabara.fuzi"; s.instagram = "@deikaru.dz"; s.facebook = "Next Aja"; s.studioSoon = true;
    s.theme = { preset: "terra", a1: "", a2: "" };
    if (/\*estetik\*/.test(s.heroTitle || "")) {
      s.heroEyebrow = "Operasional 8+ tahun, sekarang membangun jasa analisa social media";
      s.heroTitle = "Naik kelas pelan-pelan, dengan *data* yang jujur.";
      s.heroLead = "Analisa akun TikTok dan Instagram, preset dan template IG, bantuan akademik, serta service housekeeping, dari satu tempat.";
    }
    if ((s.marquee || []).includes("Deep Cleaning")) s.marquee = ["Analisa TikTok", "Analisa Instagram", "Akun Affiliator", "Preset IG", "Template IG", "Bantu Akademik", "Service Housekeeping"];
    const oldIds = new Set(["apt", "kamar", "rumah", "deep", "ruang", "taman", "fog", "nyamuk", "rayap", "sofa"]);
    if ((next.services || []).every(x => oldIds.has(x.id))) {
      next.services = [
        { id: "pest", name: "Pest control", desc: "Inspeksi, pengendalian, dan pencegahan. Dikerjakan mitra berizin.", icon: "rayap", g: ["#ff6a1a", "#92400e"], active: true },
        { id: "fog", name: "Cold fogging", desc: "Disinfeksi ruangan menyeluruh.", icon: "fog", g: ["#e2e8f0", "#64748b"], active: true },
        { id: "clean", name: "Cleaning service", desc: "Apartemen, rumah, kantor, dan gedung.", icon: "rumah", g: ["#ffa43a", "#ff6a1a"], active: true },
        { id: "general", name: "General cleaning", desc: "Pembersihan menyeluruh untuk pindahan atau habis renovasi.", icon: "deep", g: ["#fde68a", "#d97706"], active: true },
      ];
    }
    await saveStore(clean(next));
    console.log("[nextaja] migrasi data selesai (cadangan ada di data/backups).");
  } catch (e) { console.error("[nextaja] migrasi gagal, data lama tidak diubah:", e.message); }
})();

/* penyegaran warna oranye (satu kali, hanya kartu layanan yang masih memakai warna lama) */
(async () => {
  try {
    const OLD = { "#d97757": "#ff6a1a", "#e8a87c": "#ffa43a" };
    const next = JSON.parse(JSON.stringify(store));
    let changed = false;
    for (const sv of next.services || []) for (let i = 0; i < (sv.g || []).length; i++) if (OLD[String(sv.g[i]).toLowerCase()]) { sv.g[i] = OLD[String(sv.g[i]).toLowerCase()]; changed = true; }
    if (changed) { await saveStore(clean(next)); console.log("[nextaja] warna kartu layanan diperbarui."); }
  } catch (e) { console.error("[nextaja] penyegaran warna gagal:", e.message); }
})();

app.listen(PORT, "127.0.0.1", () => console.log(`nextaja jalan di http://127.0.0.1:${PORT}  (admin: /admin)`));

/* ---------------- util ---------------- */
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
