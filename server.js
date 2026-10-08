/* =================================================================
   MAHYRA SERV — server web + panel admin
   - Web publik  : /            (public/index.html, data diisi dari data/store.json)
   - Panel admin : /admin       (login pakai ADMIN_PASSWORD di file .env)
   - API publik  : /api/store
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
// Semua tema berbasis gelap (desain web memang dark). Warna aksen bisa di-custom dari admin.
const THEMES = {
  violet: { name: "Violet Night (default)", bg: "#07060d", bg2: "#0e0c18", card: "#13111f", card2: "#1a1729", input: "#0d0b16", a1: "#8b5cf6", a2: "#ec4899", on: "#ffffff" },
  sakura: { name: "Sakura", bg: "#0b0709", bg2: "#140c10", card: "#181014", card2: "#21161b", input: "#100a0d", a1: "#f472b6", a2: "#fb7185", on: "#ffffff" },
  ocean:  { name: "Ocean", bg: "#050a0d", bg2: "#0a1217", card: "#0f171c", card2: "#142027", input: "#0a1115", a1: "#22d3ee", a2: "#3b82f6", on: "#04121a" },
  matcha: { name: "Matcha", bg: "#070a07", bg2: "#0d120d", card: "#111711", card2: "#182018", input: "#0b100b", a1: "#4ade80", a2: "#a3e635", on: "#06140a" },
  sunset: { name: "Sunset", bg: "#0c0806", bg2: "#140e0a", card: "#19120e", card2: "#221812", input: "#110c09", a1: "#f97316", a2: "#f43f5e", on: "#ffffff" },
  mono:   { name: "Monokrom", bg: "#0a0a0a", bg2: "#111111", card: "#151515", card2: "#1d1d1d", input: "#0f0f0f", a1: "#f5f5f5", a2: "#a3a3a3", on: "#0a0a0a" },
};
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function themeCss(t = {}) {
  const base = THEMES[t.preset] || THEMES.violet;
  const a1 = t.a1 || base.a1, a2 = t.a2 || base.a2;
  // teks tombol otomatis gelap/terang supaya tetap kebaca
  const on = (t.a1 || t.a2) ? ((luminance(a1) + luminance(a2)) / 2 > 0.4 ? "#0a0a0a" : "#ffffff") : base.on;
  return `:root{--bg:${base.bg};--bg2:${base.bg2};--card:${base.card};--card2:${base.card2};--input:${base.input};--violet:${a1};--pink:${a2};--on-accent:${on}}`;
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
      heroEyebrow: str(s.heroEyebrow, 80),
      heroTitle: str(s.heroTitle, 160),
      heroLead: str(s.heroLead, 300),
      marquee: arr(s.marquee, 20).map(x => str(x, 40)).filter(Boolean),
      categories: cats.length ? cats : [{ id: "preset", label: "Preset Lightroom" }],
      theme: {
        preset: THEMES[(s.theme || {}).preset] ? s.theme.preset : "violet",
        a1: /^#[0-9a-f]{6}$/i.test((s.theme || {}).a1) ? s.theme.a1 : "",
        a2: /^#[0-9a-f]{6}$/i.test((s.theme || {}).a2) ? s.theme.a2 : "",
      },
      mascot: s.mascot !== false,
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
      g: [color((x.g || [])[0]), color((x.g || [])[1])],
      active: x.active !== false,
    })),
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

app.post("/api/admin/login", express.json({ limit: "4kb" }), (req, res) => {
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
app.post("/api/admin/logout", (req, res) => {
  sessions.delete(getCookie(req, "ms_admin"));
  res.setHeader("Set-Cookie", "ms_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  res.json({ ok: true });
});

/* ---------------- API ---------------- */
app.get("/api/store", (req, res) => { res.set("Cache-Control", "no-store"); res.json(publicStore()); });

app.get("/api/admin/me", (req, res) => res.json({ authed: isAuthed(req) }));
app.get("/api/admin/store", requireAdmin, (req, res) => res.json({ store, icons: ICONS, themes: THEMES }));
app.put("/api/admin/store", requireAdmin, express.json({ limit: "1mb" }), async (req, res) => {
  try { const next = clean(req.body || {}); await saveStore(next); res.json({ ok: true, store: next }); }
  catch (e) { console.error(e); res.status(500).json({ error: "Gagal menyimpan." }); }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)),
});
app.post("/api/admin/upload", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File harus berupa gambar (JPG/PNG/WebP), maks 8MB." });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  try {
    let out, ext;
    if (sharp) {
      out = await sharp(req.file.buffer, { failOn: "error" }).rotate().resize({ width: 1000, height: 1250, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      ext = "webp";
    } else {
      out = req.file.buffer; ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" }[req.file.mimetype];
    }
    await fsp.writeFile(path.join(UPLOADS, `${name}.${ext}`), out);
    res.json({ ok: true, url: `/uploads/${name}.${ext}` });
  } catch (e) { res.status(400).json({ error: "Gambar tidak bisa dibaca. Coba file lain." }); }
});

app.get("/api/admin/backups", requireAdmin, async (req, res) => {
  const files = (await fsp.readdir(BACKUPS)).filter(f => f.endsWith(".json")).sort().reverse();
  res.json({ backups: files });
});
app.post("/api/admin/restore", requireAdmin, express.json({ limit: "4kb" }), async (req, res) => {
  const f = String(req.body?.file || "");
  if (!/^store-[\w-]+\.json$/.test(f)) return res.status(400).json({ error: "File cadangan tidak valid." });
  try {
    const data = JSON.parse(await fsp.readFile(path.join(BACKUPS, f), "utf8"));
    const next = clean(data); await saveStore(next); res.json({ ok: true, store: next });
  } catch { res.status(404).json({ error: "Cadangan tidak ditemukan." }); }
});

/* ---------------- halaman ---------------- */
function publicStore() {
  return {
    settings: store.settings,
    products: store.products.filter(p => p.active),
    services: store.services.filter(s => s.active).map(s => ({ ...s, icon: ICONS[s.icon] || ICONS.sparkle })),
    faq: store.faq,
  };
}
const TEMPLATE = path.join(PUB, "index.html");
app.get(["/", "/index.html"], async (req, res) => {
  const html = await fsp.readFile(TEMPLATE, "utf8");
  const json = JSON.stringify(publicStore()).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
  res.set("Cache-Control", "no-cache");
  const st = store.settings || {};
  const bg = (THEMES[(st.theme || {}).preset] || THEMES.violet).bg;
  res.type("html").send(html
    .replace('<style id="theme-vars"></style>', `<style id="theme-vars">${themeCss(st.theme)}</style>`)
    .replace('<meta name="theme-color" content="#07060d">', `<meta name="theme-color" content="${bg}">`)
    .replace('<html lang="id">', st.mascot === false ? '<html lang="id" class="no-mascot">' : '<html lang="id">')
    .replace('<script id="store-data" type="application/json">null</script>', `<script id="store-data" type="application/json">${json}</script>`));
});
app.use("/admin", express.static(path.join(ROOT, "admin"), { index: "index.html" }));
app.use("/uploads", express.static(UPLOADS, { maxAge: "30d", immutable: true }));
app.use(express.static(PUB, { maxAge: "1h", index: false }));

app.listen(PORT, "127.0.0.1", () => console.log(`Mahyra Serv jalan di http://127.0.0.1:${PORT}  (admin: /admin)`));

/* ---------------- util ---------------- */
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
