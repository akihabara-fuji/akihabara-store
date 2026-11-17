'use strict';
// Ruang admin portofolio dikapriyadi.catatanakademik.com — tanpa dependensi luar (Node >= 22.5, node:sqlite)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { pipeline, Transform } = require('stream');
const { DatabaseSync } = require('node:sqlite');
const APP = __dirname;
const DATA = process.env.DP_DATA || '/var/lib/dp-admin';
const WEB = process.env.DP_WEB || '/var/www/dikapriyadi';
const BAK = process.env.DP_BACKUP || '/var/backups/dp-admin';
const PORT = +process.env.DP_PORT || 3108;
const SECURE = !process.env.DP_INSECURE;
const MAX_IMG = 10 * 1024 * 1024, MAX_VID = 200 * 1024 * 1024;
for (const d of [DATA, BAK, path.join(DATA, 'orig'), path.join(DATA, 'trash'), path.join(DATA, 'index-history'), path.join(WEB, 'v', 'uploads')]) fs.mkdirSync(d, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'dp.db'));
db.exec('PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE IF NOT EXISTS versions(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT,note TEXT,state TEXT);CREATE TABLE IF NOT EXISTS fails(ip TEXT PRIMARY KEY,n INTEGER,t INTEGER);');
const kget = k => { const r = db.prepare('SELECT v FROM kv WHERE k=?').get(k); return r ? r.v : null; };
const kset = (k, v) => db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, v);
if (!kget('secret')) kset('secret', crypto.randomBytes(32).toString('hex'));
const SECRET = kget('secret');
if (!kget('pw')) {
  const f = path.join(DATA, 'initial_pw.txt');
  if (fs.existsSync(f)) { kset('pw', hashPw(fs.readFileSync(f, 'utf8').trim())); kset('must', '1'); try { fs.unlinkSync(f); } catch (e) {} }
}
function hashPw(pw) { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 32).toString('hex'); }
function checkPw(pw) {
  const v = kget('pw'); if (!v) return false; const [s, h] = v.split(':');
  const a = crypto.scryptSync(String(pw), s, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sign = x => crypto.createHmac('sha256', SECRET).update(String(x)).digest('hex');

// ---------- validasi ----------
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const bad = m => { const e = new Error(m); e.user = true; throw e; };
const PATH_RE = /^(v|assets)\/[A-Za-z0-9_\-\/.]{1,160}$/;
function cleanPath(p, label, required) {
  p = str(p, 200);
  if (!p) { if (required) bad(label + ' wajib diisi'); return ''; }
  if (!PATH_RE.test(p) || p.includes('..') || p.includes('//')) bad(label + ': lokasi file tidak valid');
  return p;
}
function cleanUrl(u, label) {
  u = str(u, 300); if (!u) return '';
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(u)) bad(label + ' harus diawali http:// atau https://');
  return u;
}
const tags = (a, n, m) => (Array.isArray(a) ? a : []).map(x => str(x, m)).filter(Boolean).slice(0, n);
const num = (v, lo, hi, label) => { const n = Math.round(+v); if (!(n >= lo && n <= hi)) bad(label + ' harus angka ' + lo + '–' + hi); return n; };
function slug(s) { return str(s, 60).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'proyek'; }
function cleanState(inp) {
  if (!inp || typeof inp !== 'object') bad('Data tidak valid');
  const out = { works: [], karya: [], remotion: [], site: {} };
  const W = Array.isArray(inp.works) ? inp.works : []; if (W.length > 40) bad('Maksimal 40 proyek');
  const ids = new Set();
  for (const w of W) {
    const title = str(w.title, 120); if (!title) bad('Judul proyek wajib diisi');
    let id = slug(w.id || title), k = id, i = 2; while (ids.has(id)) id = k + '-' + i++; ids.add(id);
    const o = { id, title, category: str(w.category, 60), image: cleanPath(w.image, 'Gambar proyek "' + title + '"', true), summary: str(w.summary, 500), workflow: str(w.workflow, 500), metrics: str(w.metrics, 300), tags: tags(w.tags, 8, 40) };
    const su = cleanUrl(w.storeUrl, 'Tautan toko'), lu = cleanUrl(w.liveUrl, 'Tautan situs');
    if (su) o.storeUrl = su; if (lu) o.liveUrl = lu; if (w.draft) o.draft = true;
    out.works.push(o);
  }
  const K = Array.isArray(inp.karya) ? inp.karya : []; if (K.length > 80) bad('Maksimal 80 karya');
  for (const x of K) {
    const judul = str(x.judul, 120); if (!judul) bad('Judul karya wajib diisi');
    const kat = str(x.kategori, 30) || 'Karya';
    const o = { judul, poster: cleanPath(x.poster, 'Poster "' + judul + '"', true), video: cleanPath(x.video, 'Video "' + judul + '"', false), keterangan: str(x.keterangan, 300), kategori: kat };
    if (Array.isArray(x.slides) && x.slides.length) o.slides = x.slides.slice(0, 20).map((s, i) => cleanPath(s, 'Slide ' + (i + 1) + ' "' + judul + '"', true));
    o.keahlian = tags(x.keahlian, 8, 40);
    if (x.draft) o.draft = true;
    out.karya.push(o);
  }
  const R = Array.isArray(inp.remotion) ? inp.remotion : []; if (R.length > 20) bad('Maksimal 20 tema');
  for (const t of R) {
    const tema = str(t.tema, 60); if (!tema) bad('Nama tema Remotion wajib diisi');
    const items = (Array.isArray(t.items) ? t.items : []).slice(0, 30).map(x => {
      const judul = str(x.judul, 120); if (!judul) bad('Judul video Remotion wajib diisi (tema ' + tema + ')');
      const o = { judul, poster: cleanPath(x.poster, 'Poster "' + judul + '"', true), video: cleanPath(x.video, 'Video "' + judul + '"', true), keterangan: str(x.keterangan, 300), lebar: num(x.lebar, 16, 10000, 'Lebar "' + judul + '"'), tinggi: num(x.tinggi, 16, 10000, 'Tinggi "' + judul + '"') };
      if (x.draft) o.draft = true; return o;
    });
    out.remotion.push({ tema, deskripsi: str(t.deskripsi, 300), items });
  }
  const s = inp.site || {};
  out.site = { judul: str(s.judul, 120), deskripsi: str(s.deskripsi, 300), heroSub: str(s.heroSub, 700), wa: str(s.wa, 20).replace(/\D/g, ''), fotoTentang: cleanPath(s.fotoTentang, 'Foto Tentang', false) };
  if (out.site.wa && !/^[1-9]\d{8,14}$/.test(out.site.wa)) bad('Nomor WhatsApp harus format internasional tanpa +, contoh 6285xxxxxxxxx');
  for (const w of out.works) if (!w.draft) assertFile(w.image, 'Gambar proyek "' + w.title + '"');
  for (const x of out.karya) if (!x.draft) { assertFile(x.poster, 'Poster "' + x.judul + '"'); if (x.video) assertFile(x.video, 'Video "' + x.judul + '"'); (x.slides || []).forEach(p => assertFile(p, 'Slide "' + x.judul + '"')); }
  for (const t of out.remotion) for (const x of t.items) if (!x.draft) { assertFile(x.poster, 'Poster "' + x.judul + '"'); assertFile(x.video, 'Video "' + x.judul + '"'); }
  if (out.site.fotoTentang) assertFile(out.site.fotoTentang, 'Foto Tentang');
  return out;
}
function assertFile(p, label) { const f = path.join(WEB, p); if (!f.startsWith(WEB + path.sep) || !fs.existsSync(f)) bad(label + ': file tidak ditemukan di server (' + p + ')'); }

// ---------- situs: baca & tulis bagian teks index.html ----------
const IDX = path.join(WEB, 'index.html');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', rarr: '→', larr: '←', nearr: '↗', hellip: '…', nbsp: ' ', middot: '·', bull: '•', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
const decode = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => { if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1); return c ? String.fromCodePoint(c) : m; } return ENT[e] !== undefined ? ENT[e] : m; });
const encode = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const encAttr = s => encode(s).replace(/"/g, '&quot;');
const MK_A = '<!--SLOT:heroSub-->', MK_B = '<!--/SLOT:heroSub-->';
function ensureMarkers() {
  let h = fs.readFileSync(IDX, 'utf8');
  if (h.includes(MK_A)) return;
  const orig = path.join(DATA, 'orig', 'index.html'); if (!fs.existsSync(orig)) fs.copyFileSync(IDX, orig);
  const re = /(<p class="hero-sub">)([\s\S]*?)(<\/p>)/; if (!re.test(h)) throw new Error('hero-sub tidak ditemukan');
  h = h.replace(re, (m, a, b, c) => a + MK_A + b + MK_B + c);
  atomicWrite(IDX, h);
}
function readSite() {
  const h = fs.readFileSync(IDX, 'utf8');
  const g = (re, i) => { const m = re.exec(h); return m ? decode(m[i || 1]) : ''; };
  const hs = new RegExp(MK_A + '([\\s\\S]*?)' + MK_B).exec(h);
  const wa = /wa\.me\/(\d+)/.exec(h);
  const ft = /<div class="portrait-frame[^>]*>\s*<img\s+src="([^"]*)"/.exec(h);
  return { judul: g(/<title>([\s\S]*?)<\/title>/), deskripsi: g(/<meta name="description" content="([^"]*)"/), heroSub: hs ? decode(hs[1]).replace(/\s+/g, ' ').trim() : '', wa: wa ? wa[1] : '', fotoTentang: ft ? ft[1] : '' };
}
function renderSite(site) {
  let h = fs.readFileSync(IDX, 'utf8'); const before = readSite(), tagCount = (h.match(/<script/g) || []).length, waCount = (h.match(/wa\.me\/\d+/g) || []).length;
  const ch = (k, a, b) => a !== b;
  if (site.judul && ch(0, site.judul, before.judul)) {
    h = h.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + encode(site.judul) + '</title>');
    h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, (m, a, b) => a + encAttr(site.judul) + b);
  }
  if (site.deskripsi && ch(0, site.deskripsi, before.deskripsi)) {
    h = h.replace(/(<meta name="description" content=")[^"]*(")/, (m, a, b) => a + encAttr(site.deskripsi) + b);
    h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, (m, a, b) => a + encAttr(site.deskripsi) + b);
  }
  if (site.heroSub && ch(0, site.heroSub, before.heroSub)) h = h.replace(new RegExp(MK_A + '[\\s\\S]*?' + MK_B), () => MK_A + '\n          ' + encode(site.heroSub) + '\n        ' + MK_B);
  if (site.wa && ch(0, site.wa, before.wa)) h = h.replace(/wa\.me\/\d+/g, 'wa.me/' + site.wa);
  if (site.fotoTentang && ch(0, site.fotoTentang, before.fotoTentang)) h = h.replace(/(<div class="portrait-frame[^>]*>\s*<img\s+src=")[^"]*(")/, (m, a, b) => a + encAttr(site.fotoTentang) + b);
  if ((h.match(/<script/g) || []).length !== tagCount || (h.match(/wa\.me\/\d+/g) || []).length !== waCount || !/id="collaborate"/.test(h) || !/id="galeri"/.test(h) || !/id="remotion"/.test(h) || !h.includes(MK_A)) bad('Pemeriksaan keamanan halaman gagal, perubahan dibatalkan');
  return h;
}
function atomicWrite(file, data) {
  const tmp = file + '.tmp-' + process.pid; const fd = fs.openSync(tmp, 'w', 0o644);
  try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}

// ---------- publikasi ----------
const pubFiles = { works: 'works.json', karya: 'karya.json', remotion: 'remotion.json' };
const strip = o => { const c = Object.assign({}, o); delete c.draft; return c; };
function publishedOf(st) {
  return {
    works: st.works.filter(x => !x.draft).map(strip),
    karya: st.karya.filter(x => !x.draft).map(strip),
    remotion: st.remotion.map(t => ({ tema: t.tema, deskripsi: t.deskripsi, items: t.items.filter(x => !x.draft).map(strip) })).filter(t => t.items.length)
  };
}
function publish(st) {
  const pub = publishedOf(st), old = {}, wrote = [];
  for (const k of Object.keys(pubFiles)) { const f = path.join(WEB, pubFiles[k]); old[k] = fs.existsSync(f) ? fs.readFileSync(f) : null; }
  let html = null, oldHtml = null;
  if (st.site && Object.keys(st.site).length) { html = renderSite(st.site); oldHtml = fs.readFileSync(IDX, 'utf8'); if (html === oldHtml) html = null; }
  try {
    for (const k of Object.keys(pubFiles)) {
      const next = JSON.stringify(pub[k], null, 2) + '\n';
      if (old[k] !== null && old[k].toString() === next) continue;
      atomicWrite(path.join(WEB, pubFiles[k]), next); wrote.push(k);
    }
    if (html !== null) {
      fs.writeFileSync(path.join(DATA, 'index-history', Date.now() + '.html'), oldHtml);
      const hs = fs.readdirSync(path.join(DATA, 'index-history')).sort(); for (const f of hs.slice(0, Math.max(0, hs.length - 20))) fs.unlinkSync(path.join(DATA, 'index-history', f));
      atomicWrite(IDX, html); wrote.push('index');
    }
  } catch (e) {
    for (const k of wrote) if (k !== 'index' && old[k] !== null) atomicWrite(path.join(WEB, pubFiles[k]), old[k]);
    if (wrote.includes('index') && oldHtml !== null) atomicWrite(IDX, oldHtml);
    throw new Error('Gagal menerbitkan, dikembalikan ke kondisi sebelumnya: ' + e.message);
  }
  return wrote;
}

// ---------- state ----------
function getState() { return JSON.parse(kget('state')); }
function putState(st, note) {
  kset('state', JSON.stringify(st));
  db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(), note, JSON.stringify(st));
  db.exec('DELETE FROM versions WHERE id NOT IN (SELECT id FROM versions ORDER BY id DESC LIMIT 120)');
}
function seed() {
  if (kget('state')) return;
  ensureMarkers();
  const rd = n => { try { return JSON.parse(fs.readFileSync(path.join(WEB, n), 'utf8')); } catch (e) { return []; } };
  for (const n of Object.values(pubFiles)) { const f = path.join(WEB, n); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(DATA, 'orig', n)); }
  const st = { works: rd('works.json'), karya: rd('karya.json'), remotion: rd('remotion.json'), site: readSite() };
  for (const k of ['karya']) for (const x of st[k]) { if (!x.keahlian) x.keahlian = []; if (!x.video) x.video = ''; }
  putState(st, 'Data awal dari situs yang sedang tayang');
}
try { seed(); ensureMarkers(); } catch (e) { console.error('seed gagal', e.message); process.exit(1); }

// ---------- backup ----------
const wibDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
function doBackup(force) {
  const day = wibDay(), stamp = day + '-' + new Date(Date.now() + 7 * 3600e3).toISOString().slice(11, 16).replace(':', '');
  if (!force && fs.readdirSync(BAK).some(f => f.startsWith('db-' + day))) return null;
  const dbf = path.join(BAK, 'db-' + stamp + '.sqlite'); if (fs.existsSync(dbf)) fs.unlinkSync(dbf);
  db.exec("VACUUM INTO '" + dbf.replace(/'/g, "''") + "'");
  const jd = path.join(BAK, 'json-' + stamp); fs.mkdirSync(jd, { recursive: true });
  for (const n of Object.values(pubFiles).concat(['index.html'])) { const f = path.join(WEB, n); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(jd, n)); }
  const names = fs.readdirSync(BAK).filter(f => /^db-/.test(f)).sort();
  for (const f of names.slice(0, Math.max(0, names.length - 14))) { try { fs.unlinkSync(path.join(BAK, f)); fs.rmSync(path.join(BAK, f.replace(/^db-/, 'json-').replace(/\.sqlite$/, '')), { recursive: true, force: true }); } catch (e) {} }
  return stamp;
}
function listBackups() {
  return fs.readdirSync(BAK).filter(f => /^db-.*\.sqlite$/.test(f)).sort().reverse().map(f => ({ nama: f.replace(/^db-|\.sqlite$/g, ''), ukuran: fs.statSync(path.join(BAK, f)).size }));
}
function purgeTrash() { const d = path.join(DATA, 'trash'); for (const f of fs.readdirSync(d)) { try { if (Date.now() - fs.statSync(path.join(d, f)).mtimeMs > 30 * 86400e3) fs.rmSync(path.join(d, f), { force: true }); } catch (e) {} } }
function tick() { try { doBackup(false); purgeTrash(); } catch (e) { console.error('backup gagal', e.message); } }
tick(); setInterval(tick, 3600e3).unref();

// ---------- auth ----------
const cookieName = 'dp_s';
function newCookie() { const e = Date.now() + 12 * 3600e3; return `${cookieName}=${e}.${sign('s' + e)}; HttpOnly; ${SECURE ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=43200`; }
function authed(req) {
  const m = new RegExp('(?:^|;\\s*)' + cookieName + '=(\\d+)\\.([a-f0-9]+)').exec(req.headers.cookie || ''); if (!m) return false;
  const a = Buffer.from(sign('s' + m[1])), b = Buffer.from(m[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && +m[1] > Date.now();
}
function limited(ip) { const r = db.prepare('SELECT n,t FROM fails WHERE ip=?').get(ip); return !!(r && r.n >= 5 && Date.now() - r.t < 15 * 60e3); }
function failLogin(ip) { const r = db.prepare('SELECT n,t FROM fails WHERE ip=?').get(ip); if (!r || Date.now() - r.t > 15 * 60e3) db.prepare('INSERT INTO fails(ip,n,t) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET n=1,t=excluded.t').run(ip, Date.now()); else db.prepare('UPDATE fails SET n=n+1,t=? WHERE ip=?').run(Date.now(), ip); }

// ---------- file media ----------
function stripJpeg(b) {
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;
  const out = [b.subarray(0, 2)]; let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xFF) return null;
    const m = b[i + 1]; if (m === 0xFF) { i++; continue; }
    if (m === 0xDA) { out.push(b.subarray(i)); const t = Buffer.concat(out); return t[t.length - 2] === 0xFF && t[t.length - 1] === 0xD9 ? t : null; }
    const len = b.readUInt16BE(i + 2); if (len < 2 || i + 2 + len > b.length) return null;
    if (!(m === 0xE1 || m === 0xED || m === 0xFE)) out.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}
function kindOfImage(b) {
  if (b.length > 100 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) { const s = stripJpeg(b); return s ? { ext: 'jpg', buf: s } : null; }
  if (b.length > 100 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) && b.subarray(b.length - 8, b.length - 4).toString('latin1') === 'IEND') return { ext: 'png', buf: b };
  if (b.length > 100 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' && b.readUInt32LE(4) + 8 === b.length) return { ext: 'webp', buf: b };
  return null;
}
function mp4Info(file) {
  const fd = fs.openSync(file, 'r'); const size = fs.fstatSync(fd).size; const info = { faststart: null, lebar: 0, tinggi: 0, detik: 0 };
  try {
    const rd = (pos, n) => { const b = Buffer.alloc(n); const r = fs.readSync(fd, b, 0, n, pos); return b.subarray(0, r); };
    let pos = 0, moovAt = -1, mdatAt = -1, moov = null, n = 0;
    while (pos + 8 <= size && n++ < 200) {
      const h = rd(pos, 16); let sz = h.readUInt32BE(0); const type = h.subarray(4, 8).toString('latin1'); let hl = 8;
      if (sz === 1) { sz = Number(h.readBigUInt64BE(8)); hl = 16; } else if (sz === 0) sz = size - pos;
      if (sz < hl || pos + sz > size) return null;
      if (type === 'moov') { moovAt = pos; if (sz < 30 * 1024 * 1024) moov = rd(pos + hl, sz - hl); }
      if (type === 'mdat' && mdatAt < 0) mdatAt = pos;
      pos += sz;
    }
    if (moovAt < 0 || !moov) return null;
    info.faststart = mdatAt < 0 || moovAt < mdatAt;
    const kids = buf => { const r = []; let p = 0; while (p + 8 <= buf.length) { let s = buf.readUInt32BE(p); const t = buf.subarray(p + 4, p + 8).toString('latin1'); let h = 8; if (s === 1) { s = Number(buf.readBigUInt64BE(p + 8)); h = 16; } else if (s === 0) s = buf.length - p; if (s < h || p + s > buf.length) break; r.push({ t, b: buf.subarray(p + h, p + s) }); p += s; } return r; };
    for (const k of kids(moov)) {
      if (k.t === 'mvhd') { const v = k.b[0]; const ts = k.b.readUInt32BE(v ? 20 : 12); const du = v ? Number(k.b.readBigUInt64BE(24)) : k.b.readUInt32BE(16); if (ts) info.detik = Math.round(du / ts * 10) / 10; }
      if (k.t === 'trak') for (const c of kids(k.b)) if (c.t === 'tkhd' && !info.lebar) {
        const v = c.b[0], o = v ? 88 : 76, mo = v ? 52 : 40; const w = c.b.readUInt32BE(o) / 65536, h = c.b.readUInt32BE(o + 4) / 65536;
        if (w > 0 && h > 0) { const a = c.b.readInt32BE(mo), bb = c.b.readInt32BE(mo + 4); const rot = a === 0 && bb !== 0; info.lebar = Math.round(rot ? h : w); info.tinggi = Math.round(rot ? w : h); }
      }
    }
    return info;
  } finally { fs.closeSync(fd); }
}
function freeBytes() { try { const s = fs.statfsSync(WEB); return s.bavail * s.bsize; } catch (e) { return Infinity; } }
let activeUploads = 0;

// ---------- http ----------
const HDR = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
function send(res, code, body, extra) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, Object.assign({ 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' }, HDR, extra || {}));
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, max) {
  return new Promise((ok, no) => {
    const a = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { no(Object.assign(new Error('Berkas terlalu besar'), { user: true })); req.destroy(); } else a.push(c); });
    req.on('end', () => ok(Buffer.concat(a))); req.on('error', no);
  });
}
const walk = (d, base) => { let r = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) r = r.concat(walk(p, base)); else r.push(path.relative(base, p).split(path.sep).join('/')); } return r; };
function refsOf(textBlobs) { const s = new Set(); for (const t of textBlobs) for (const m of t.matchAll(/v\/uploads\/[A-Za-z0-9_\-\/.]+/g)) s.add(m[0]); return s; }
function orphans() {
  const used = refsOf([kget('state') || '']); const cut = new Date(Date.now() - 14 * 86400e3).toISOString();
  for (const v of db.prepare('SELECT state FROM versions WHERE ts>=?').all(cut)) for (const x of refsOf([v.state])) used.add(x);
  const base = path.join(WEB, 'v', 'uploads'); const out = [];
  for (const rel of walk(base, WEB)) { if (used.has(rel)) continue; const st = fs.statSync(path.join(WEB, rel)); if (Date.now() - st.mtimeMs < 86400e3) continue; out.push({ path: rel, ukuran: st.size }); }
  return out;
}
const OPEN = new Set(['/api/me', '/api/login', '/api/logout']);
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), p = u.pathname;
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
    if (req.method === 'GET' && (p === '/admin' || p === '/admin/')) return send(res, 200, fs.readFileSync(path.join(APP, 'admin.html')));
    if (!p.startsWith('/api/')) return send(res, 404, 'Tidak ditemukan');
    if (req.method !== 'GET' && req.headers['x-hp'] !== '1') return send(res, 403, { error: 'Ditolak' });
    if (p === '/api/login' && req.method === 'POST') {
      if (limited(ip)) return send(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
      const b = JSON.parse((await readBody(req, 2000)).toString() || '{}');
      if (!checkPw(b.password || '')) { failLogin(ip); return send(res, 401, { error: 'Kata sandi salah' }); }
      db.prepare('DELETE FROM fails WHERE ip=?').run(ip); return send(res, 200, { ok: true, must: kget('must') === '1' }, { 'Set-Cookie': newCookie() });
    }
    if (p === '/api/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': cookieName + '=; Max-Age=0; Path=/' });
    if (p === '/api/me') { const a = authed(req); return send(res, 200, { ok: a, must: a && kget('must') === '1' }); }
    if (!authed(req)) return send(res, 401, { error: 'Belum login' });
    if (kget('must') === '1' && p !== '/api/admin/password') return send(res, 403, { error: 'Ganti kata sandi dulu', must: true });
    if (p === '/api/admin/password' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 2000)).toString() || '{}');
      if (!checkPw(b.lama || '')) return send(res, 400, { error: 'Kata sandi lama salah' });
      const n = String(b.baru || ''); if (n.length < 10 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) return send(res, 400, { error: 'Kata sandi baru minimal 10 karakter, berisi huruf dan angka' });
      kset('pw', hashPw(n)); kset('must', '0'); return send(res, 200, { ok: true });
    }
    if (p === '/api/admin/state' && req.method === 'GET') return send(res, 200, getState());
    if (p === '/api/admin/save' && req.method === 'POST') {
      const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString()));
      const wrote = publish(st); putState(st, 'Simpan' + (wrote.length ? ' (' + wrote.join(', ') + ')' : ' (tanpa perubahan tayang)'));
      return send(res, 200, { ok: true, state: st, tayang: wrote });
    }
    if (p === '/api/admin/versions' && req.method === 'GET') return send(res, 200, db.prepare('SELECT id,ts,note FROM versions ORDER BY id DESC').all());
    if (p === '/api/admin/restore' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 1000)).toString());
      const r = db.prepare('SELECT state FROM versions WHERE id=?').get(+b.id); if (!r) return send(res, 404, { error: 'Versi tidak ada' });
      const st = cleanState(JSON.parse(r.state)); publish(st); putState(st, 'Kembalikan versi #' + (+b.id)); return send(res, 200, { ok: true, state: st });
    }
    if (p === '/api/admin/upload' && req.method === 'POST') {
      const kind = u.searchParams.get('kind') === 'video' ? 'video' : 'image';
      const len = +req.headers['content-length'] || 0, max = kind === 'video' ? MAX_VID : MAX_IMG;
      if (!len) return send(res, 411, { error: 'Ukuran berkas tidak diketahui' });
      if (len > max) return send(res, 413, { error: (kind === 'video' ? 'Video' : 'Gambar') + ' maksimal ' + Math.round(max / 1048576) + ' MB' });
      if (freeBytes() < len * 2 + 500 * 1048576) return send(res, 507, { error: 'Ruang disk server hampir penuh' });
      const sub = wibDay().slice(0, 7), dir = path.join(WEB, 'v', 'uploads', sub); fs.mkdirSync(dir, { recursive: true });
      const rnd = crypto.randomBytes(12).toString('hex');
      if (kind === 'image') {
        const k = kindOfImage(await readBody(req, MAX_IMG)); if (!k) return send(res, 400, { error: 'File harus gambar JPEG, PNG, atau WebP yang valid' });
        const name = rnd + '.' + k.ext; fs.writeFileSync(path.join(dir, name), k.buf, { mode: 0o644 });
        return send(res, 200, { path: 'v/uploads/' + sub + '/' + name, ukuran: k.buf.length });
      }
      if (activeUploads >= 2) return send(res, 429, { error: 'Sedang ada unggahan lain, coba sebentar lagi' });
      activeUploads++;
      const tmp = path.join(DATA, 'up-' + rnd + '.part'); let total = 0, head = Buffer.alloc(0), over = false;
      const counter = new Transform({ transform(c, e, cb) { total += c.length; if (head.length < 12) head = Buffer.concat([head, c]).subarray(0, 12); if (total > MAX_VID) { over = true; return cb(new Error('terlalu besar')); } cb(null, c); } });
      await new Promise(ok => pipeline(req, counter, fs.createWriteStream(tmp, { mode: 0o644 }), err => { activeUploads--; ok(err); })).then(err => { if (err) { try { fs.unlinkSync(tmp); } catch (e) {} throw Object.assign(new Error(over ? 'Video melebihi batas 200 MB' : 'Unggahan terputus'), { user: true }); } });
      if (head.length < 12 || head.subarray(4, 8).toString('latin1') !== 'ftyp') { fs.unlinkSync(tmp); return send(res, 400, { error: 'File harus video MP4 yang valid' }); }
      const info = mp4Info(tmp); if (!info || !info.lebar) { fs.unlinkSync(tmp); return send(res, 400, { error: 'Video MP4 tidak dapat dibaca (rusak atau bukan video)' }); }
      const name = rnd + '.mp4'; try { fs.renameSync(tmp, path.join(dir, name)); } catch (e) { fs.copyFileSync(tmp, path.join(dir, name)); fs.unlinkSync(tmp); } fs.chmodSync(path.join(dir, name), 0o644);
      return send(res, 200, { path: 'v/uploads/' + sub + '/' + name, ukuran: total, lebar: info.lebar, tinggi: info.tinggi, detik: info.detik, faststart: info.faststart });
    }
    if (p === '/api/admin/orphans' && req.method === 'GET') return send(res, 200, orphans());
    if (p === '/api/admin/orphans/clean' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 20000)).toString()); const ok = new Set(orphans().map(x => x.path)); let n = 0;
      for (const rel of Array.isArray(b.paths) ? b.paths : []) { if (!ok.has(rel)) continue; fs.renameSync(path.join(WEB, rel), path.join(DATA, 'trash', crypto.randomBytes(4).toString('hex') + '-' + path.basename(rel))); n++; }
      return send(res, 200, { ok: true, dipindah: n });
    }
    if (p === '/api/admin/backups' && req.method === 'GET') { let free = 0; try { free = freeBytes(); } catch (e) {} return send(res, 200, { daftar: listBackups(), diskBebas: free }); }
    if (p === '/api/admin/backup' && req.method === 'POST') { const s = doBackup(true); return send(res, 200, { ok: true, nama: s }); }
    return send(res, 404, { error: 'Tidak ada' });
  } catch (e) {
    if (!e.user) console.error(e);
    send(res, e.user ? 400 : 500, { error: e.user ? e.message : (e.message || 'Terjadi kesalahan server') });
  }
}).listen(PORT, '127.0.0.1', () => console.log('dp-admin di 127.0.0.1:' + PORT));
