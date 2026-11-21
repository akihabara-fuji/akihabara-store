/**
 * server.js — Micro-backend portofolio Dika Priyadi
 * Express + Multer + CORS. Menangani upload media ke v/uploads/ dan update works.json.
 *
 * Jalankan:
 *   npm install
 *   ADMIN_PASSWORD='GantiPasswordKuat' pm2 start server.js --name porto-api
 *   pm2 save
 *
 * Contoh konfigurasi Nginx (di dalam blok server dikapriyadi.catatanakademik.com):
 *
 *   client_max_body_size 60M;          # upload video sampai 50MB
 *
 *   location /api/ {
 *     proxy_pass http://127.0.0.1:3088;
 *     proxy_http_version 1.1;
 *     proxy_set_header Host $host;
 *     proxy_set_header X-Real-IP $remote_addr;
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 *     proxy_read_timeout 300s;
 *   }
 *
 *   location = /works.json {
 *     add_header Cache-Control "no-store";
 *   }
 *
 * File statis (index.html, admin.html, works.json, v/, assets/) tetap dilayani Nginx
 * dari folder yang sama dengan server.js. Server ini juga bisa melayani file statis
 * sendiri untuk tes lokal: buka http://127.0.0.1:3088/
 */

'use strict';

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3088);
// Folder web (index.html, works.json, v/). Di VPS: SITE_ROOT=/var/www/dikapriyadi
const ROOT = path.resolve(process.env.SITE_ROOT || __dirname);
const WORKS_FILE = path.join(ROOT, 'works.json');
const UPLOAD_DIR = path.join(ROOT, 'v', 'uploads');
const UPLOAD_PUBLIC_PREFIX = 'v/uploads/';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'DikaAdmin2026!';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const CATEGORIES = ['AI Video & Content', 'Web & SEO', 'AI Automation', 'Social Media Strategy', 'AI Motion (Remotion)'];
const BADGES = ['Live', 'Showcase', 'Viral', 'Internal Use', 'Internal Tool', 'Prototype', 'Personal Project', 'In Development', 'Concept'];
const MEDIA_TYPES = ['image', 'video', 'embed'];

const ALLOWED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm']
};

if (!process.env.ADMIN_PASSWORD) {
  console.warn('[PERINGATAN] ADMIN_PASSWORD belum diset, memakai password bawaan. Set env ADMIN_PASSWORD sebelum dipakai di produksi.');
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(WORKS_FILE)) fs.writeFileSync(WORKS_FILE, '[]\n');

// ---------- Penyimpanan works.json ----------
function readWorks() {
  try {
    const data = JSON.parse(fs.readFileSync(WORKS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Gagal membaca works.json:', err.message);
    return [];
  }
}

function writeWorks(list) {
  const tmp = WORKS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2) + '\n');
  fs.renameSync(tmp, WORKS_FILE); // tulis atomik, file tidak pernah setengah jadi
}

function isUploadedAsset(url) {
  return typeof url === 'string' && url.startsWith(UPLOAD_PUBLIC_PREFIX) && !url.includes('..');
}

function deleteUploadedFile(url) {
  if (!isUploadedAsset(url)) return; // aset bawaan (v/jeans.jpg, assets/...) tidak pernah dihapus
  const abs = path.join(ROOT, url);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return;
  fs.promises.unlink(abs).catch(() => {});
}

// ---------- Sesi sederhana ----------
const sessions = new Map(); // token -> expiresAt
const loginAttempts = new Map(); // ip -> { count, until }

function issueToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + TOKEN_TTL_MS);
  return token;
}

function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim();
  const exp = sessions.get(token);
  if (!token || !exp || exp < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Sesi tidak valid atau sudah habis. Silakan login ulang.' });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of sessions) if (exp < now) sessions.delete(t);
  for (const [ip, a] of loginAttempts) if (a.until && a.until < now) loginAttempts.delete(ip);
}, 10 * 60 * 1000).unref();

// ---------- Upload (Multer) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, path.extname(file.originalname))
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'media';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExts = ALLOWED[file.mimetype];
    if (!okExts || !okExts.includes(ext)) {
      return cb(new Error('Format tidak didukung. Gunakan .jpg, .png, .webp, .mp4, atau .webm.'));
    }
    cb(null, true);
  }
});

const mediaFields = upload.fields([{ name: 'media', maxCount: 1 }, { name: 'poster', maxCount: 1 }]);

function handleUpload(req, res, next) {
  mediaFields(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran file melebihi 50MB.' : err.message;
    res.status(400).json({ error: msg });
  });
}

function cleanupReqFiles(req) {
  const files = req.files || {};
  Object.values(files).flat().forEach((f) => fs.promises.unlink(f.path).catch(() => {}));
}

// ---------- Validasi metadata ----------
function parseTools(raw) {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return parseTools(arr);
  } catch (e) { /* bukan JSON, anggap dipisah koma */ }
  return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
}

const str = (v, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function safeLink(v) {
  const s = str(v, 1000);
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : '';
}

function safeLocalOrUrl(v) {
  const s = str(v, 1000);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w\-./]+$/.test(s) && !s.includes('..')) return s.replace(/^\/+/, '');
  return '';
}

function slugId(title) {
  const base = String(title || 'karya').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'karya';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function mediaTypeFromFile(file) {
  return file.mimetype.startsWith('video/') ? 'video' : 'image';
}

function buildFields(body, existing = {}) {
  const out = { ...existing };
  if (body.title !== undefined) out.title = str(body.title, 200);
  if (body.category !== undefined) out.category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];
  if (body.badge !== undefined) out.badge = BADGES.includes(body.badge) ? body.badge : '';
  if (body.mediaType !== undefined && MEDIA_TYPES.includes(body.mediaType)) out.mediaType = body.mediaType;
  if (body.mediaUrl !== undefined) out.mediaUrl = safeLocalOrUrl(body.mediaUrl);
  if (body.posterUrl !== undefined) out.posterUrl = safeLocalOrUrl(body.posterUrl);
  if (body.externalLink !== undefined) out.externalLink = safeLink(body.externalLink);
  if (body.summary !== undefined) out.summary = str(body.summary, 3000);
  if (body.metrics !== undefined) out.metrics = str(body.metrics, 300);
  if (body.promptOrWorkflow !== undefined) out.promptOrWorkflow = str(body.promptOrWorkflow, 8000);
  if (body.tools !== undefined) out.tools = parseTools(body.tools);
  return out;
}

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/login', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.ip;
  const a = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (a.until && a.until > Date.now()) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
  }
  const password = String((req.body && req.body.password) || '');
  const ok = password.length === ADMIN_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
  if (!ok) {
    a.count += 1;
    if (a.count >= 5) { a.until = Date.now() + 5 * 60 * 1000; a.count = 0; }
    loginAttempts.set(ip, a);
    return res.status(401).json({ error: 'Password salah.' });
  }
  loginAttempts.delete(ip);
  res.json({ token: issueToken(), expiresIn: TOKEN_TTL_MS });
});

app.get('/api/session', requireAuth, (req, res) => res.json({ ok: true }));

app.get('/api/works', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readWorks());
});

app.post('/api/works', requireAuth, handleUpload, (req, res) => {
  const media = req.files && req.files.media && req.files.media[0];
  const poster = req.files && req.files.poster && req.files.poster[0];
  const item = buildFields(req.body, {
    id: '', title: '', category: CATEGORIES[0], badge: 'Showcase', mediaType: 'image',
    mediaUrl: '', posterUrl: '', externalLink: '', summary: '', metrics: '', promptOrWorkflow: '', tools: []
  });
  if (media) {
    item.mediaUrl = UPLOAD_PUBLIC_PREFIX + media.filename;
    item.mediaType = mediaTypeFromFile(media);
  }
  if (poster) item.posterUrl = UPLOAD_PUBLIC_PREFIX + poster.filename;
  if (!item.title) { cleanupReqFiles(req); return res.status(400).json({ error: 'Judul karya wajib diisi.' }); }
  if (!item.mediaUrl) { cleanupReqFiles(req); return res.status(400).json({ error: 'Pilih file media atau isi link embed.' }); }
  item.id = slugId(item.title);
  item.createdAt = new Date().toISOString();

  const list = readWorks();
  list.unshift(item); // karya baru di urutan paling atas
  writeWorks(list);
  res.status(201).json(item);
});

app.put('/api/works/:id', requireAuth, handleUpload, (req, res) => {
  const list = readWorks();
  const idx = list.findIndex((w) => w.id === req.params.id);
  if (idx === -1) { cleanupReqFiles(req); return res.status(404).json({ error: 'Karya tidak ditemukan.' }); }

  const old = list[idx];
  const item = buildFields(req.body, old);
  const media = req.files && req.files.media && req.files.media[0];
  const poster = req.files && req.files.poster && req.files.poster[0];

  if (media) {
    item.mediaUrl = UPLOAD_PUBLIC_PREFIX + media.filename;
    item.mediaType = mediaTypeFromFile(media);
  }
  if (poster) item.posterUrl = UPLOAD_PUBLIC_PREFIX + poster.filename;
  if (!item.title) { cleanupReqFiles(req); return res.status(400).json({ error: 'Judul karya wajib diisi.' }); }
  if (!item.mediaUrl) { cleanupReqFiles(req); return res.status(400).json({ error: 'Media karya tidak boleh kosong.' }); }

  item.id = old.id;
  item.updatedAt = new Date().toISOString();
  list[idx] = item;
  writeWorks(list);

  // hapus file upload lama yang sudah tidak dipakai
  if (old.mediaUrl !== item.mediaUrl) deleteUploadedFile(old.mediaUrl);
  if (old.posterUrl && old.posterUrl !== item.posterUrl) deleteUploadedFile(old.posterUrl);
  res.json(item);
});

app.delete('/api/works/:id', requireAuth, (req, res) => {
  const list = readWorks();
  const idx = list.findIndex((w) => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Karya tidak ditemukan.' });
  const [removed] = list.splice(idx, 1);
  writeWorks(list);
  deleteUploadedFile(removed.mediaUrl);
  deleteUploadedFile(removed.posterUrl);
  res.json({ ok: true, removed: removed.id });
});

app.post('/api/works/reorder', requireAuth, (req, res) => {
  const ids = req.body && req.body.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Format urutan tidak valid.' });
  const list = readWorks();
  const byId = new Map(list.map((w) => [w.id, w]));
  const ordered = [];
  ids.forEach((id) => { if (byId.has(id)) { ordered.push(byId.get(id)); byId.delete(id); } });
  byId.forEach((w) => ordered.push(w)); // item yang tidak disebut tetap disimpan di akhir
  writeWorks(ordered);
  res.json({ ok: true, ids: ordered.map((w) => w.id) });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

// Jangan pernah melayani kode server / dependensi sebagai file statis
const BLOCKED = /^\/(server\.js|package(-lock)?\.json|node_modules|works\.json\.tmp)(\/|$)/i;
app.use((req, res, next) => (BLOCKED.test(req.path) ? res.status(404).end() : next()));

// Static untuk tes lokal (di produksi Nginx yang melayani file statis)
app.use(express.static(ROOT, {
  index: 'index.html',
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('works.json')) res.set('Cache-Control', 'no-store');
  }
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan di server.' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Portofolio API berjalan di http://127.0.0.1:${PORT}`);
});
