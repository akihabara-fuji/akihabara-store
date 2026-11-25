'use strict';
// heyaipeople admin: server kecil tanpa dependensi. Menyimpan konten, menerbitkan store.json + index.html,
// menerima unggahan media, dan menghitung statistik sederhana. Prompt terkunci TIDAK PERNAH ditulis ke file publik.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.HEY_PORT || 3190);
const DATA = process.env.HEY_DATA || '/var/lib/hey-admin';
const WEB = process.env.HEY_WEB || '/var/www/heyaipeople';
const APP = __dirname;
const TEMPLATE = process.env.HEY_TEMPLATE || path.join(APP, 'index.template.html');
const ADMIN_HTML = path.join(APP, 'admin.html');
const SEED = path.join(APP, 'seed.json');
const SCHEMA = require(path.join(APP, 'schema.json'));
const MAX_UPLOAD = 60 * 1024 * 1024;

for (const d of [DATA, path.join(DATA, 'versions'), path.join(WEB, 'uploads')]) fs.mkdirSync(d, { recursive: true });
const F = {
  store: path.join(DATA, 'store.json'), auth: path.join(DATA, 'auth.json'),
  secret: path.join(DATA, 'secret.key'), stats: path.join(DATA, 'stats.json'), firstPw: path.join(DATA, 'PASSWORD-AWAL.txt'),
};

// ---------- util ----------
const readJSON = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fb; } };
const writeAtomic = (f, data, mode) => { const t = f + '.tmp' + process.pid; fs.writeFileSync(t, data, mode ? { mode } : undefined); fs.renameSync(t, f); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jstr = (s, max) => String(s == null ? '' : s).replace(/\r\n/g, '\n').slice(0, max);

let SECRET;
if (fs.existsSync(F.secret)) SECRET = fs.readFileSync(F.secret, 'utf8').trim();
else { SECRET = crypto.randomBytes(32).toString('hex'); writeAtomic(F.secret, SECRET, 0o600); }

// ---------- password ----------
function hashPw(pw, salt) { return crypto.scryptSync(pw, salt, 32).toString('hex'); }
function setPassword(pw) { const salt = crypto.randomBytes(16).toString('hex'); writeAtomic(F.auth, JSON.stringify({ salt, hash: hashPw(pw, salt) }), 0o600); }
function checkPassword(pw) {
  const a = readJSON(F.auth, null); if (!a) return false;
  const x = Buffer.from(hashPw(String(pw), a.salt), 'hex'), y = Buffer.from(a.hash, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
if (!fs.existsSync(F.auth)) {
  const pw = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, 'x');
  setPassword(pw); writeAtomic(F.firstPw, 'Password awal admin heyaipeople.site:\n' + pw + '\nGanti segera lewat menu Keamanan, lalu hapus file ini.\n', 0o600);
  console.log('[hey-admin] password awal dibuat di ' + F.firstPw);
}

// ---------- token & throttle ----------
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const makeToken = () => { const exp = String(Date.now() + 7 * 864e5); return exp + '.' + sign(exp); };
function okToken(t) {
  if (!t || t.indexOf('.') < 0) return false;
  const [exp, sig] = t.split('.'); if (Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp)); return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const buckets = new Map();
function limited(key, max, ms) {
  const now = Date.now(); const b = (buckets.get(key) || []).filter((t) => now - t < ms);
  b.push(now); buckets.set(key, b); return b.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (!v.some((t) => now - t < 600000)) buckets.delete(k); }, 60000).unref();
const ipOf = (req) => String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');

// ---------- data ----------
function loadStore() { let s = readJSON(F.store, null); if (!s) { s = readJSON(SEED, null); writeAtomic(F.store, JSON.stringify(s, null, 1)); } return s; }
const urlOK = (u) => u === '' || /^uploads\/[\w.\-]+$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u);
const id = (v, fb) => (/^[a-z0-9-]{1,40}$/.test(String(v || '')) ? String(v) : fb);
const price = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 99999999 ? n : 0; };

function sanitize(inp) {
  const o = { s: {}, t: {}, photos: [], sbs: [], bundles: [] };
  const s = inp.s || {};
  const sd = SCHEMA.settings;
  for (const f of sd) {
    if (f.type === 'bool') o.s[f.k] = !!s[f.k];
    else if (f.type === 'int') o.s[f.k] = Math.max(f.min || 0, Math.min(f.max || 9999, Math.round(Number(s[f.k]) || f.def)));
    else { const v = jstr(s[f.k], f.type === 'area' ? 2000 : 400).trim(); o.s[f.k] = f.type === 'url' && !/^$|^https:\/\//.test(v) ? '' : f.k === 'waNumber' ? v.replace(/\D/g, '') : v; }
  }
  for (const g of SCHEMA.texts) for (const f of g.fields) o.t[f.k] = jstr((inp.t || {})[f.k] != null ? inp.t[f.k] : f.def, 1200);
  const seen = new Set(); const uid = (v, p) => { let x = id(v, p + '-' + crypto.randomBytes(3).toString('hex')); while (seen.has(x)) x += '-' + crypto.randomBytes(1).toString('hex'); seen.add(x); return x; };
  for (const p of (inp.photos || []).slice(0, 200)) o.photos.push({
    id: uid(p.id, 'pf'), title: jstr(p.title, 120).trim() || 'Tanpa judul', category: jstr(p.category, 60).trim(), model: jstr(p.model, 60).trim(), ratio: jstr(p.ratio, 12).trim(),
    price: price(p.price), imageUrl: urlOK(String(p.imageUrl || '')) ? String(p.imageUrl || '') : '', prompt: jstr(p.prompt, 6000), free: !!p.free, hidden: !!p.hidden,
    artType: ['coffee', 'cozy2d', 'cyber', 'villa', 'perfume', 'mascot2d'].includes(p.artType) ? p.artType : 'coffee',
  });
  for (const p of (inp.sbs || []).slice(0, 100)) o.sbs.push({
    id: uid(p.id, 'sb'), title: jstr(p.title, 120).trim() || 'Tanpa judul', category: jstr(p.category, 60).trim(), engine: jstr(p.engine, 80).trim(), price: price(p.price),
    kf1Label: jstr(p.kf1Label, 60), kf2Label: jstr(p.kf2Label, 60),
    kf1Url: urlOK(String(p.kf1Url || '')) ? String(p.kf1Url || '') : '', kf2Url: urlOK(String(p.kf2Url || '')) ? String(p.kf2Url || '') : '',
    videoUrl: urlOK(String(p.videoUrl || '')) ? String(p.videoUrl || '') : '', videoPoster: urlOK(String(p.videoPoster || '')) ? String(p.videoPoster || '') : '',
    promptImage: jstr(p.promptImage, 6000), promptVideo: jstr(p.promptVideo, 6000), free: !!p.free, hidden: !!p.hidden,
    animType: ['coffeeMotion', 'charMotion', 'airMotion', 'saasMotion', 'none'].includes(p.animType) ? p.animType : 'none',
  });
  for (const b of (inp.bundles || []).slice(0, 20)) o.bundles.push({
    id: uid(b.id, 'bundle'), title: jstr(b.title, 120).trim() || 'Paket', chip: jstr(b.chip, 60), desc: jstr(b.desc, 400), scope: ['photos', 'storyboards', 'all'].includes(b.scope) ? b.scope : 'all',
    price: price(b.price), originalPrice: price(b.originalPrice), badge: jstr(b.badge, 60), cta: jstr(b.cta, 60),
    features: (Array.isArray(b.features) ? b.features : []).slice(0, 12).map((x) => jstr(x, 160)).filter(Boolean), highlighted: !!b.highlighted, hidden: !!b.hidden,
  });
  return o;
}

function cut(text, n) {
  const t = String(text || '').trim(); if (t.length <= n) return t;
  let c = t.slice(0, n); const i = c.lastIndexOf(' '); if (i > n * 0.6) c = c.slice(0, i); return c.replace(/[,;:\s]+$/, '') + '…';
}

function publicStore(st) {
  const n0 = st.s.previewChars || 60;
  const cutp = (t) => cut(t, Math.min(n0, Math.floor(String(t || '').length * 0.5)));
  const pub = {
    t: st.t,
    s: { waNumber: st.s.waNumber, ann: st.s.ann, annOn: st.s.annOn, instagram: st.s.instagram, tiktok: st.s.tiktok, youtube: st.s.youtube, waTemplate: st.s.waTemplate, bundleBadge: st.s.bundleBadge },
    photos: st.photos.filter((p) => !p.hidden).map((p) => ({ id: p.id, title: p.title, category: p.category, model: p.model, ratio: p.ratio, price: p.price, imageUrl: p.imageUrl, artType: p.artType, free: p.free, prefix: cutp(p.prompt), prompt: p.free ? p.prompt : null })),
    sbs: st.sbs.filter((p) => !p.hidden).map((p) => ({ id: p.id, title: p.title, category: p.category, engine: p.engine, price: p.price, kf1Label: p.kf1Label, kf2Label: p.kf2Label, kf1Url: p.kf1Url, kf2Url: p.kf2Url, videoUrl: p.videoUrl, videoPoster: p.videoPoster, animType: p.animType, free: p.free, imagePrefix: cutp(p.promptImage), videoPrefix: cutp(p.promptVideo), promptImage: p.free ? p.promptImage : null, promptVideo: p.free ? p.promptVideo : null })),
    bundles: st.bundles.filter((b) => !b.hidden).map((b) => ({ id: b.id, title: b.title, chip: b.chip, desc: b.desc, scope: b.scope, price: b.price, originalPrice: b.originalPrice, badge: b.badge, cta: b.cta, features: b.features, highlighted: b.highlighted })),
  };
  return pub;
}

function render(tpl, st) {
  let h = tpl;
  const title = esc(st.s.seoTitle || 'heyaipeople'), desc = esc(st.s.seoDesc || '');
  h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>' + title + '</title>');
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, '$1' + desc + '$2');
  return h;
}

function publish(st) {
  const pub = publicStore(st);
  const json = JSON.stringify(pub);
  for (const x of st.photos.concat(st.sbs)) {
    if (x.free || x.hidden) continue;
    for (const t of [x.prompt, x.promptImage, x.promptVideo]) if (t && t.length > 12 && json.includes(JSON.stringify(t).slice(1, -1))) throw new Error('penjaga: prompt terkunci bocor ke file publik');
  }
  fs.mkdirSync(WEB, { recursive: true });
  writeAtomic(path.join(WEB, 'store.json'), json, 0o644);
  writeAtomic(path.join(WEB, 'index.html'), render(fs.readFileSync(TEMPLATE, 'utf8'), st), 0o644);
}

function saveVersion(note) {
  const cur = fs.existsSync(F.store) ? fs.readFileSync(F.store) : null; if (!cur) return;
  const name = new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  fs.writeFileSync(path.join(DATA, 'versions', name), cur);
  const all = fs.readdirSync(path.join(DATA, 'versions')).sort();
  for (const old of all.slice(0, Math.max(0, all.length - 40))) fs.unlinkSync(path.join(DATA, 'versions', old));
}

// ---------- statistik ----------
let stats = readJSON(F.stats, { days: {}, items: {} }); let dirty = false;
const today = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
function hit(e, item) {
  if (!['pageview', 'add_to_cart', 'wa_click'].includes(e)) return;
  const d = (stats.days[today()] = stats.days[today()] || { pageview: 0, add_to_cart: 0, wa_click: 0 }); d[e]++;
  if (e === 'add_to_cart' && /^[a-z0-9-]{1,40}$/.test(item || '')) stats.items[item] = (stats.items[item] || 0) + 1;
  dirty = true;
}
setInterval(() => {
  if (!dirty) return; dirty = false;
  const keep = Object.keys(stats.days).sort().slice(-120); for (const k of Object.keys(stats.days)) if (!keep.includes(k)) delete stats.days[k];
  writeAtomic(F.stats, JSON.stringify(stats));
}, 10000).unref();

// ---------- http ----------
function body(req, max) {
  return new Promise((res, rej) => {
    const ch = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { rej(Object.assign(new Error('Terlalu besar'), { code: 413 })); req.destroy(); } else ch.push(c); });
    req.on('end', () => res(Buffer.concat(ch))); req.on('error', rej);
  });
}
const send = (res, code, obj) => { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(b); };
const authed = (req) => okToken((req.headers.authorization || '').replace(/^Bearer /, ''));

function magicExt(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.slice(0, 4).toString('hex') === '89504e47') return 'png';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (b.slice(4, 8).toString() === 'ftyp') return 'mp4';
  if (b.slice(0, 4).toString('hex') === '1a45dfa3') return 'webm';
  return null;
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://x'); const p = u.pathname; const m = req.method;
  if (m === 'GET' && (p === '/admin' || p === '/admin/')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'" });
    return res.end(fs.readFileSync(ADMIN_HTML));
  }
  if (!p.startsWith('/hey-api/')) {
    if (process.env.HEY_DEV && m === 'GET') { // hanya untuk uji lokal; di VPS nginx yang menyajikan berkas statis
      const fp = path.join(WEB, p === '/' ? 'index.html' : p.replace(/\.\.+/g, ''));
      if (fp.startsWith(WEB) && fs.existsSync(fp) && fs.statSync(fp).isFile()) { const ext = path.extname(fp); res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' }[ext] || 'application/octet-stream' }); return fs.createReadStream(fp).pipe(res); }
    }
    res.writeHead(404); return res.end('Not found');
  }
  const r = p.slice(9);

  if (m === 'POST' && r === 'track') {
    if (limited('t' + ipOf(req), 90, 60000)) return send(res, 204, {});
    try { const b = JSON.parse((await body(req, 1024)).toString() || '{}'); hit(String(b.e), String(b.i || '')); } catch {}
    res.writeHead(204); return res.end();
  }
  if (m === 'POST' && r === 'login') {
    if (limited('l' + ipOf(req), 8, 600000)) return send(res, 429, { error: 'Terlalu banyak percobaan. Tunggu 10 menit.' });
    let b = {}; try { b = JSON.parse((await body(req, 4096)).toString()); } catch {}
    if (b.password && checkPassword(b.password)) return send(res, 200, { ok: true, token: makeToken() });
    return send(res, 401, { error: 'Password salah.' });
  }
  if (!authed(req)) return send(res, 401, { error: 'Sesi habis. Masuk lagi.' });

  if (m === 'GET' && r === 'store') return send(res, 200, { store: loadStore(), schema: SCHEMA, firstPw: fs.existsSync(F.firstPw) });
  if (m === 'PUT' && r === 'store') {
    let inp; try { inp = JSON.parse((await body(req, 4 * 1024 * 1024)).toString()); } catch { return send(res, 400, { error: 'Data tidak terbaca.' }); }
    const st = sanitize(inp);
    saveVersion(); writeAtomic(F.store, JSON.stringify(st, null, 1)); publish(st);
    return send(res, 200, { ok: true, store: st, at: new Date().toISOString() });
  }
  if (m === 'GET' && r === 'versions') return send(res, 200, { list: fs.readdirSync(path.join(DATA, 'versions')).sort().reverse() });
  if (m === 'POST' && r === 'restore') {
    let b = {}; try { b = JSON.parse((await body(req, 2048)).toString()); } catch {}
    const f = path.basename(String(b.file || '')); const fp = path.join(DATA, 'versions', f);
    if (!/^[\w\-]+\.json$/.test(f) || !fs.existsSync(fp)) return send(res, 404, { error: 'Versi tidak ada.' });
    const st = sanitize(JSON.parse(fs.readFileSync(fp, 'utf8')));
    saveVersion(); writeAtomic(F.store, JSON.stringify(st, null, 1)); publish(st);
    return send(res, 200, { ok: true, store: st });
  }
  if (m === 'POST' && r === 'upload') {
    const buf = await body(req, MAX_UPLOAD).catch((e) => e);
    if (buf instanceof Error) return send(res, buf.code === 413 ? 413 : 400, { error: buf.code === 413 ? 'File lebih dari 60 MB.' : 'Unggahan gagal.' });
    const ext = magicExt(buf); if (!ext) return send(res, 400, { error: 'Format harus JPG, PNG, WEBP, MP4, atau WEBM.' });
    const name = Date.now() + '-' + crypto.randomBytes(3).toString('hex') + '.' + ext;
    fs.writeFileSync(path.join(WEB, 'uploads', name), buf, { mode: 0o644 });
    return send(res, 200, { ok: true, url: 'uploads/' + name, bytes: buf.length });
  }
  if (m === 'GET' && r === 'media') {
    const dir = path.join(WEB, 'uploads');
    const list = fs.readdirSync(dir).filter((f) => /^[\w.\-]+$/.test(f)).map((f) => { const s = fs.statSync(path.join(dir, f)); return { url: 'uploads/' + f, bytes: s.size, at: s.mtimeMs }; }).sort((a, b) => b.at - a.at);
    return send(res, 200, { list });
  }
  if (m === 'DELETE' && r === 'media') {
    const f = path.basename(String(u.searchParams.get('f') || '')); const fp = path.join(WEB, 'uploads', f);
    if (!/^[\w.\-]+$/.test(f) || !fs.existsSync(fp)) return send(res, 404, { error: 'File tidak ada.' });
    fs.unlinkSync(fp); return send(res, 200, { ok: true });
  }
  if (m === 'GET' && r === 'stats') {
    const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() + 7 * 36e5 - i * 864e5).toISOString().slice(0, 10); days.push(Object.assign({ d, pageview: 0, add_to_cart: 0, wa_click: 0 }, stats.days[d] || {})); }
    return send(res, 200, { days, items: stats.items, since: Object.keys(stats.days).sort()[0] || null });
  }
  if (m === 'POST' && r === 'password') {
    let b = {}; try { b = JSON.parse((await body(req, 4096)).toString()); } catch {}
    if (!checkPassword(b.old || '')) return send(res, 403, { error: 'Password lama salah.' });
    if (String(b.next || '').length < 10) return send(res, 400, { error: 'Password baru minimal 10 karakter.' });
    setPassword(String(b.next)); try { fs.unlinkSync(F.firstPw); } catch {}
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'Tidak ditemukan.' });
}

if (process.argv.includes('--rebuild')) { publish(loadStore()); console.log('[hey-admin] index.html + store.json diterbitkan ulang'); process.exit(0); }

http.createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Kesalahan server.' }); }); })
  .listen(PORT, '127.0.0.1', () => { try { publish(loadStore()); } catch (e) { console.error('publish awal gagal', e.message); } console.log('[hey-admin] jalan di 127.0.0.1:' + PORT); });
