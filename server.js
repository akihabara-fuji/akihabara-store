// Server web toko + panel admin + tema bersama.
// Jalankan: npm install, isi .env, lalu `npm start`.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { PRESETS, FONTS, FONT_URL, tokens, colorsFor, GFONT } = require("./theme-data");

/* ---------- baca .env tanpa library tambahan ---------- */
(function loadEnv() {
  const f = path.join(__dirname, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const PORT = +process.env.PORT || 3100;
const PASS = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.SESSION_SECRET || "";
if (PASS.length < 8 || SECRET.length < 16) {
  console.error("\n[!] Buka file .env lalu isi ADMIN_PASSWORD (min. 8 karakter) dan SESSION_SECRET (min. 16 karakter acak).\n");
  process.exit(1);
}

const DATA = path.join(__dirname, "data");
const BACKUP = path.join(DATA, "backups");
const UPLOADS = path.join(__dirname, "uploads");
const SITE = path.join(DATA, "site.json");
for (const d of [DATA, BACKUP, UPLOADS]) fs.mkdirSync(d, { recursive: true });
if (!fs.existsSync(SITE)) fs.copyFileSync(path.join(DATA, "site.default.json"), SITE);

const readSite = () => JSON.parse(fs.readFileSync(SITE, "utf8"));
function writeSite(obj) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(SITE, path.join(BACKUP, `site-${stamp}.json`));
  const old = fs.readdirSync(BACKUP).filter(f => f.endsWith(".json")).sort();
  for (const f of old.slice(0, Math.max(0, old.length - 30))) fs.unlinkSync(path.join(BACKUP, f));
  const tmp = SITE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 1));
  fs.renameSync(tmp, SITE);
}

/* ---------- sesi admin (cookie bertanda tangan) ---------- */
const COOKIE = "afs_admin", AGE = 7 * 24 * 3600 * 1000;
const sign = v => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const makeToken = () => { const t = Date.now().toString(); return `${t}.${sign(t)}`; };
function isAdmin(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
  if (!raw) return false;
  const [t, s] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split(".");
  if (!t || !s || s.length !== 64) return false;
  const ok = crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sign(t)));
  return ok && Date.now() - +t < AGE;
}
const needAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: "Sesi habis. Masuk lagi." });
function setCookie(req, res, value, maxAge) {
  const secure = req.secure ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
const tries = new Map();
function samePass(a) {
  const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(PASS).digest();
  return crypto.timingSafeEqual(x, y);
}

/* ---------- helper ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function themeInfo(site) {
  const th = site.theme || {}, f = FONTS[th.font] ? th.font : "anton";
  const cf = th.fontCustom && GFONT.test(th.fontCustom.name || "") ? th.fontCustom.name : null;
  const fontUrl = cf ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cf).replace(/%20/g, "+")}:wght@${[400, 700, 900].includes(+th.fontCustom.weight) ? +th.fontCustom.weight : 700}&display=swap` : null;
  const allowed = site.visitor && site.visitor.on ? (site.visitor.presets || []).filter(p => PRESETS[p]) : [];
  return {
    brand: site.brand, font: f, fontFamily: cf ? `"${cf}",sans-serif` : FONTS[f].fam, fontUrl: FONT_URL, extraFontUrl: fontUrl,
    radius: Math.max(0, Math.min(40, +th.radius || 0)),
    tokens: tokens(colorsFor(th)),
    visitor: { on: !!(site.visitor && site.visitor.on), presets: Object.fromEntries(allowed.map(p => [p, tokens(colorsFor({ preset: p }))])) }
  };
}
function themeCss(site) {
  const t = themeInfo(site), v = t.tokens;
  const lines = Object.entries(v).filter(([k]) => k !== "scheme").map(([k, val]) => `  --afs-${k}: ${val};`);
  return `/* Tema bersama dari ${esc(site.brand.name)} — pakai var(--afs-...) di CSS web lain */\n@import url("${FONT_URL}");\n${t.extraFontUrl ? `@import url("${t.extraFontUrl}");\n` : ""}:root{\n${lines.join("\n")}\n  --afs-radius: ${t.radius}px;\n  --afs-font-display: ${t.fontFamily};\n  --afs-font-body: "Plus Jakarta Sans",system-ui,sans-serif;\n  color-scheme: ${v.scheme};\n}\n`;
}

/* ---------- app ---------- */
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); next(); });

const DIST = fs.existsSync(path.join(__dirname, "dist", "index.html")) ? path.join(__dirname, "dist") : path.join(__dirname, "public");
const indexTpl = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
app.get(["/", "/index.html"], (req, res) => {
  const s = readSite(), title = `${s.brand.name} ${s.brand.sub}`.trim();
  const img = s.imgs && s.imgs.person ? `${req.protocol}://${req.get("host")}${s.imgs.person}` : "";
  res.type("html").send(indexTpl
    .replace(/{{TITLE}}/g, esc(title))
    .replace(/{{DESC}}/g, esc((s.seo && s.seo.description) || s.text.coverLead || ""))
    .replace("{{OG_IMAGE}}", img ? `<meta property="og:image" content="${esc(img)}">` : ""));
});
app.get("/admin", (req, res) => { res.setHeader("X-Robots-Tag", "noindex"); res.sendFile(path.join(DIST, "admin.html")); });
app.get("/contoh-tema", (req, res) => res.sendFile(path.join(__dirname, "public", "contoh-tema.html")));

app.use("/uploads", express.static(UPLOADS, { maxAge: "30d", immutable: true }));
app.use(express.static(DIST, { index: false, maxAge: "1h" }));
app.use(express.static(path.join(__dirname, "public"), { index: false, maxAge: "1h" }));

/* data publik */
app.get("/api/site", (req, res) => { res.setHeader("Cache-Control", "no-cache"); res.json({ site: readSite(), presets: PRESETS, fonts: FONTS }); });

/* tema bersama untuk web lain (boleh diambil dari domain mana pun) */
const cors = (req, res, next) => { res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Cache-Control", "public, max-age=60"); next(); };
app.get("/api/theme", cors, (req, res) => res.json(themeInfo(readSite())));
app.get("/theme.css", cors, (req, res) => res.type("text/css").send(themeCss(readSite())));

/* login admin */
app.get("/api/me", (req, res) => res.json({ admin: isAdmin(req) }));
app.post("/api/login", (req, res) => {
  const ip = req.ip, now = Date.now(), t = tries.get(ip) || { n: 0, until: 0 };
  if (t.until > now) return res.status(429).json({ error: "Terlalu banyak percobaan. Tunggu 15 menit." });
  if (!samePass(req.body && req.body.password)) {
    t.n++; if (t.n >= 5) { t.n = 0; t.until = now + 15 * 60 * 1000; } tries.set(ip, t);
    return res.status(401).json({ error: "Password salah." });
  }
  tries.delete(ip); setCookie(req, res, makeToken(), AGE / 1000); res.json({ ok: true });
});
app.post("/api/logout", (req, res) => { setCookie(req, res, "", 0); res.json({ ok: true }); });

/* simpan pengaturan */
const REQUIRED = ["brand", "theme", "sections", "text", "products", "works", "pay", "imgs", "visitor"];
app.put("/api/site", needAdmin, (req, res) => {
  const s = req.body;
  if (!s || typeof s !== "object" || REQUIRED.some(k => !(k in s))) return res.status(400).json({ error: "Data pengaturan tidak lengkap." });
  writeSite(s); res.json({ ok: true });
});

/* riwayat & pulihkan */
app.get("/api/backups", needAdmin, (req, res) => res.json(fs.readdirSync(BACKUP).filter(f => f.endsWith(".json")).sort().reverse()));
app.post("/api/restore", needAdmin, (req, res) => {
  const name = String(req.body && req.body.name || "");
  if (!/^site-[\w-]+\.json$/.test(name) || !fs.existsSync(path.join(BACKUP, name))) return res.status(404).json({ error: "Cadangan tidak ditemukan." });
  writeSite(JSON.parse(fs.readFileSync(path.join(BACKUP, name), "utf8"))); res.json({ ok: true });
});

/* upload foto */
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOADS, filename: (req, f, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[f.mimetype]) }),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, f, cb) => cb(null, !!EXT[f.mimetype])
});
app.post("/api/upload", needAdmin, (req, res) => {
  upload.single("file")(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Foto maksimal 6 MB." : "Upload gagal." });
    if (!req.file) return res.status(400).json({ error: "Format foto harus JPG, PNG, WEBP, atau GIF." });
    res.json({ url: "/uploads/" + req.file.filename });
  });
});

app.use((req, res) => res.status(404).type("text").send("Halaman tidak ditemukan"));
app.listen(PORT, () => console.log(`Toko jalan di http://localhost:${PORT}  (admin: /admin)`));
