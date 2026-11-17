'use strict';
// HeyAIPeople admin — tanpa dependensi luar (Node >= 22.5, node:sqlite)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const APP = __dirname;
const DATA = process.env.HP_DATA || path.join(APP, 'data');
const WEB = process.env.HP_WEB || '/var/www/heyaipeople';
const PORT = +process.env.HP_PORT || 3107;
const SECURE = !process.env.HP_INSECURE;
const PRESET = ['#FF4D1C', '#7C3AED', '#0EA5E9', '#16A34A', '#DB2777', '#09090B'];
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(path.join(WEB, 'uploads'), { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'hp.db'));
db.exec('PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT);CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT,items TEXT,total INTEGER,status TEXT DEFAULT "Baru");CREATE TABLE IF NOT EXISTS visits(day TEXT,vid TEXT,pv INTEGER DEFAULT 1,src TEXT,PRIMARY KEY(day,vid));CREATE TABLE IF NOT EXISTS pviews(day TEXT,pid TEXT,n INTEGER DEFAULT 0,PRIMARY KEY(day,pid));CREATE TABLE IF NOT EXISTS versions(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT,note TEXT,state TEXT);');
const kget = k => { const r = db.prepare('SELECT v FROM kv WHERE k=?').get(k); return r ? r.v : null; };
const kset = (k, v) => db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, v);
if (!kget('secret')) kset('secret', crypto.randomBytes(32).toString('hex'));
const SECRET = kget('secret');
if (!kget('pw')) {
  const f = path.join(APP, 'initial_pw.txt');
  if (fs.existsSync(f)) { kset('pw', fs.readFileSync(f, 'utf8').trim()); try { fs.unlinkSync(f); } catch (e) {} }
}
function hashPw(pw) { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(pw, s, 32).toString('hex'); }
function checkPw(pw) {
  const v = kget('pw'); if (!v) return false; const [s, h] = v.split(':');
  const a = crypto.scryptSync(String(pw), s, 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- validasi data ----------
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);
const num = v => Math.max(0, Math.min(99999999, Math.round(+v || 0)));
const IMG = /^\/uploads\/[a-f0-9]{32}\.jpg$/;
let SEEDSITE = {};
try { SEEDSITE = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8')).site || {}; } catch (e) {}
function cleanState(inp) {
  const o = { products: [], site: {} };
  const seen = new Set();
  for (const p of (Array.isArray(inp.products) ? inp.products : []).slice(0, 200)) {
    const kind = p.kind === 'storyboard' ? 'storyboard' : 'photo';
    let id = str(p.id, 40).replace(/[^a-zA-Z0-9_-]/g, ''); if (!id || seen.has(id)) id = 'p' + crypto.randomBytes(5).toString('hex');
    seen.add(id);
    const c = { kind, id, title: str(p.title, 120), category: str(p.category, 60), price: num(p.price), access: p.access === 'free' ? 'free' : 'paid', show: !!p.show, pin: !!p.pin };
    if (kind === 'photo') {
      Object.assign(c, { model: str(p.model, 60), ratio: str(p.ratio, 12), artType: str(p.artType, 20).replace(/[^a-zA-Z0-9]/g, '') || 'cyber', img: '', gallery: [], alt: str(p.alt, 200), promptPrefix: str(p.promptPrefix, 1500), promptSecret: str(p.promptSecret, 4000) });
      c.gallery = (Array.isArray(p.gallery) ? p.gallery : []).filter(x => IMG.test(x || '')).slice(0, 6);
      if (!c.gallery.length && IMG.test(p.img || '')) c.gallery = [p.img];
      c.img = c.gallery[0] || '';
    } else {
      Object.assign(c, { kf1Img: IMG.test(p.kf1Img || '') ? p.kf1Img : '', kf2Img: IMG.test(p.kf2Img || '') ? p.kf2Img : '', engine: str(p.engine, 60), animType: str(p.animType, 30).replace(/[^a-zA-Z0-9]/g, ''), kf1Label: str(p.kf1Label, 80), kf2Label: str(p.kf2Label, 80), promptImage: str(p.promptImage, 3000), promptVideo: str(p.promptVideo, 3000) });
    }
    o.products.push(c);
  }
  const s = Object.assign({}, inp.site || {});
  for (const k of ['bundles', 'steps', 'faq', 'footer']) if (s[k] === undefined) s[k] = SEEDSITE[k];
  o.site = {
    heroA: str(s.heroA, 80), heroEm: str(s.heroEm, 80), heroB: str(s.heroB, 80), lead: str(s.lead, 400), cta1: str(s.cta1, 40), cta2: str(s.cta2, 40),
    accent: PRESET.includes(s.accent) ? s.accent : PRESET[0],
    wa: str(s.wa, 20).replace(/\D/g, '').replace(/^0/, '62'), title: str(s.title, 120), desc: str(s.desc, 300), tpl: str(s.tpl, 600)
  };
  const url = v => { v = str(v, 300).trim(); return /^https?:\/\//i.test(v) ? v : ''; };
  o.site.bundles = (Array.isArray(s.bundles) ? s.bundles : []).slice(0, 8).map((b, i) => ({
    id: str(b.id, 40).replace(/[^a-zA-Z0-9_-]/g, '') || 'bundle-' + crypto.randomBytes(4).toString('hex'),
    flag: str(b.flag, 60), name: str(b.name, 120), desc: str(b.desc, 400), cartName: str(b.cartName, 120) || str(b.name, 120),
    price: num(b.price), old: num(b.old), items: (Array.isArray(b.items) ? b.items : []).slice(0, 8).map(x => str(x, 120)).filter(Boolean),
    btn: str(b.btn, 60) || '+ Tambah Paket', dark: !!b.dark, show: b.show !== false
  })).filter(b => b.name);
  o.site.steps = (Array.isArray(s.steps) ? s.steps : []).slice(0, 6).map(x => ({ t: str(x && x.t, 100), d: str(x && x.d, 400) })).filter(x => x.t);
  o.site.faq = (Array.isArray(s.faq) ? s.faq : []).slice(0, 20).map(x => ({ q: str(x && x.q, 200), a: str(x && x.a, 800) })).filter(x => x.q && x.a);
  const f = s.footer || {};
  o.site.footer = { copy: str(f.copy, 200), note: str(f.note, 300), ig: url(f.ig), tt: url(f.tt), yt: url(f.yt) };
  if (o.site.wa.length < 8) throw new Error('Nomor WhatsApp tidak valid');
  if (!o.site.title) throw new Error('Judul halaman wajib diisi');
  return o;
}

// ---------- render halaman statis ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsn = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const FILL = 'xxxxxxx xxxx xxxxx xxxxxx xxx xxxxxxxx xxxx xxxxxx xxxxx xxx xxxxxxx xxxx xxxxxx xxxxxxxx xxx xxxxx';
function mix(hex) { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c + (255 - c) * .3); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(x => x.toString(16).padStart(2, '0')).join(''); }
function build(st) {
  const s = st.site;
  const vis = st.products.filter(p => p.show);
  const ord = [...vis.filter(p => p.pin), ...vis.filter(p => !p.pin)];
  const photos = ord.filter(p => p.kind === 'photo').map(p => ({
    id: p.id, title: p.title, category: p.category, model: p.model, ratio: p.ratio, price: p.price, artType: p.artType, img: p.img || '', gal: p.gallery || [], alt: p.alt || '',
    free: p.access === 'free', promptPrefix: p.promptPrefix, promptSecret: p.access === 'free' ? p.promptSecret : FILL
  }));
  const sbs = ord.filter(p => p.kind === 'storyboard').map(p => ({
    id: p.id, title: p.title, category: p.category, engine: p.engine, price: p.price, animType: p.animType, kf1Label: p.kf1Label, kf2Label: p.kf2Label,
    kf1Img: p.kf1Img || '', kf2Img: p.kf2Img || '', promptImage: p.promptImage.slice(0, 70) + (p.promptImage.length > 70 ? FILL : ''), promptVideo: p.promptVideo ? FILL : ''
  }));
  const rp = n => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const q = v => esc(v).replace(/'/g, '&#39;');
  const STEPS_HTML = s.steps.map((x, i) => `  <div class="step rv"><div class="n disp">0${i + 1}</div><h3 class="disp">${esc(x.t)}</h3><p>${esc(x.d)}</p></div>`).join('\n');
  const BUNDLES_HTML = s.bundles.filter(b => b.show).map(b => `  <div class="b${b.dark ? ' dk' : ''} rv"><span class="flag">${esc(b.flag)}</span><h3 class="disp">${esc(b.name)}</h3><p${b.dark ? ' style="font-size:14px;color:#d4d4d8;line-height:1.6"' : ' class="sub" style="font-size:14px"'}>${esc(b.desc)}</p>
   <div class="big disp">${b.old > b.price ? `<span class="old" style="font-size:18px">${rp(b.old)}</span><br>` : ''}${rp(b.price)}</div>
   <ul>${b.items.map(x => '<li>' + esc(x) + '</li>').join('')}</ul>
   <button class="btn ${b.dark ? 'btn-o' : 'btn-d'}" onclick="addItem('${b.id}','${q(b.cartName)}',${b.price},this)">${esc(b.btn)}</button></div>`).join('\n');
  const FAQ_HTML = s.faq.length ? `<section id="faq" class="faq" style="padding-top:20px"><div class="wrap"><div class="head rv"><div><span class="kick">FAQ</span><h2 class="disp">Pertanyaan yang sering ditanya</h2></div></div>\n` + s.faq.map(x => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('\n') + `\n</div></section>` : '';
  const ft = s.footer;
  const F_LINKS = [['Instagram', ft.ig], ['TikTok', ft.tt], ['YouTube', ft.yt]].filter(x => x[1]).map(x => `<a href="${esc(x[1])}" target="_blank" rel="noopener">${x[0]}</a>`).join(' · ');
  const map = {
    STEPS_HTML, BUNDLES_HTML, FAQ_HTML, F_LINKS, F_COPY: esc(ft.copy), F_NOTE: esc(ft.note),
    TITLE_H: esc(s.title), DESC_H: esc(s.desc), H_A: esc(s.heroA), H_EM: esc(s.heroEm), H_B: esc(s.heroB), LEAD: esc(s.lead), CTA1: esc(s.cta1), CTA2: esc(s.cta2),
    COUNT: String(vis.length), ACCENT: s.accent, ACCENT2: mix(s.accent), WA: s.wa, TPL_JSON: jsn(s.tpl), PHOTOPRODUCTS_JSON: jsn(photos), STORYBOARDPRODUCTS_JSON: jsn(sbs)
  };
  let h = fs.readFileSync(path.join(APP, 'template.html'), 'utf8');
  for (const k in map) h = h.split('{{' + k + '}}').join(map[k]);
  if (/\{\{[A-Z_0-9]+\}\}/.test(h)) throw new Error('Template belum terisi lengkap');
  const out = path.join(WEB, 'index.html'), tmp = out + '.tmp';
  fs.writeFileSync(tmp, h); fs.renameSync(tmp, out);
}
function getState() { return JSON.parse(kget('state')); }
function putState(st, note) {
  kset('state', JSON.stringify(st));
  db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(), note || 'Simpan', JSON.stringify(st));
  db.exec('DELETE FROM versions WHERE id NOT IN (SELECT id FROM versions ORDER BY id DESC LIMIT 20)');
}
const bl = require('./blog')({ db, WEB, getState, mix });
if (!kget('state')) {
  const seed = cleanState(JSON.parse(fs.readFileSync(path.join(APP, 'seed.json'), 'utf8')));
  putState(seed, 'Data awal (dari web lama)');
  if (!process.env.HP_NOBUILD) build(seed);
}

if (kget('state') && !process.env.HP_NOBUILD) {
  try { const cur = getState(); if (!cur.site.bundles) { const m = cleanState(cur); putState(m, 'Migrasi tahap 2'); build(m); } } catch (e) { console.error('migrasi gagal', e.message); }
}

// ---------- backup harian ----------
const BK = path.join(DATA, 'backups');
fs.mkdirSync(BK, { recursive: true });
function doBackup() {
  const d = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const f = path.join(BK, 'hp-' + d + '.db');
  try { fs.unlinkSync(f); } catch (e) {}
  db.exec("VACUUM INTO '" + f.replace(/'/g, "''") + "'");
  try { require('child_process').execFileSync('tar', ['-czf', path.join(BK, 'uploads-' + d + '.tgz'), '-C', WEB, 'uploads'], { timeout: 60000 }); } catch (e) {}
  const all = fs.readdirSync(BK).filter(x => /^(hp|uploads)-/.test(x)).sort();
  const days = [...new Set(all.map(x => x.slice(x.indexOf('-') + 1, x.indexOf('-') + 11)))].sort().reverse();
  const keep = new Set(days.slice(0, 14));
  for (const x of all) if (!keep.has(x.slice(x.indexOf('-') + 1, x.indexOf('-') + 11))) try { fs.unlinkSync(path.join(BK, x)); } catch (e) {}
  return 'hp-' + d + '.db';
}
function listBackups() {
  return fs.readdirSync(BK).filter(x => /^(hp|uploads)-[0-9-]+\.(db|tgz)$/.test(x)).sort().reverse().map(x => ({ name: x, size: fs.statSync(path.join(BK, x)).size }));
}
if (!process.env.HP_NOBUILD) setInterval(() => {
  try { const wib = new Date(Date.now() + 7 * 3600e3), today = wib.toISOString().slice(0, 10);
    if (wib.getUTCHours() >= 3 && !listBackups().some(b => b.name.startsWith('hp-' + today))) doBackup(); } catch (e) { console.error('backup gagal', e.message); }
}, 600e3);

// ---------- sesi & batas login ----------
const sign = e => crypto.createHmac('sha256', SECRET).update(String(e)).digest('hex');
function newCookie() { const e = Date.now() + 12 * 3600e3; return `hp_s=${e}.${sign(e)}; HttpOnly; ${SECURE ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=43200`; }
function authed(req) {
  const m = /(?:^|;\s*)hp_s=(\d+)\.([a-f0-9]+)/.exec(req.headers.cookie || ''); if (!m) return false;
  const a = Buffer.from(sign(m[1])), b = Buffer.from(m[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && +m[1] > Date.now();
}
const fails = new Map(), orderRate = new Map();
setInterval(() => orderRate.clear(), 3600e3);
function limited(ip) { const r = fails.get(ip); return r && r.n >= 5 && Date.now() - r.t < 15 * 60e3; }
function fail(ip) { const r = fails.get(ip); if (!r || Date.now() - r.t > 15 * 60e3) fails.set(ip, { n: 1, t: Date.now() }); else r.n++; }

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
    req.on('data', c => { n += c.length; if (n > max) { no(new Error('Terlalu besar')); req.destroy(); } else a.push(c); });
    req.on('end', () => ok(Buffer.concat(a))); req.on('error', no);
  });
}
function hitSalt(day) { let k = db.prepare("SELECT v FROM kv WHERE k='hitkey'").get(); if (!k) { const v = crypto.randomBytes(24).toString('hex'); db.prepare("INSERT INTO kv(k,v) VALUES('hitkey',?)").run(v); k = { v }; } return crypto.createHash('sha256').update(k.v + day).digest('hex'); }
function classifySrc(ref, src) {
  const t = (src || '').toLowerCase().slice(0, 30);
  if (t) { if (t.includes('insta') || t === 'ig') return 'Instagram'; if (t.includes('tiktok') || t === 'tt') return 'TikTok'; if (t.includes('wa') || t.includes('whats')) return 'Langsung / WhatsApp'; }
  let h = ''; try { h = new URL(ref).hostname.toLowerCase(); } catch (e) { return 'Langsung / WhatsApp'; }
  if (h.includes('instagram.com') || h === 'l.instagram.com') return 'Instagram';
  if (h.includes('tiktok.com')) return 'TikTok';
  if (h.includes('heyaipeople.site') || h.includes('whatsapp') || h.includes('wa.me')) return 'Langsung / WhatsApp';
  return 'Lainnya';
}
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), p = u.pathname;
    const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
    if (req.method === 'GET' && (p === '/admin' || p === '/admin/')) return send(res, 200, fs.readFileSync(path.join(APP, 'admin.html')));
    if (!p.startsWith('/api/')) return send(res, 404, 'Tidak ditemukan');
    if (req.method !== 'GET' && req.headers['x-hp'] !== '1') return send(res, 403, { error: 'Ditolak' });
    if (p === '/api/hit' && req.method === 'POST') {
      if (authed(req)) return send(res, 200, { ok: true });
      const r = (orderRate.get('h' + ip) || []).filter(t => Date.now() - t < 60e3); if (r.length >= 40) return send(res, 429, { error: 'Terlalu cepat' });
      r.push(Date.now()); orderRate.set('h' + ip, r);
      const b = JSON.parse((await readBody(req, 600)).toString() || '{}');
      const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
      const vid = crypto.createHash('sha256').update(hitSalt(day) + '|' + ip + '|' + (req.headers['user-agent'] || '')).digest('hex').slice(0, 12);
      if (b.pid) {
        const st = getState(), ok = st.products.some(x => x.id === String(b.pid)) || (st.site.bundles || []).some(x => x.id === String(b.pid));
        if (ok) db.prepare('INSERT INTO pviews(day,pid,n) VALUES(?,?,1) ON CONFLICT(day,pid) DO UPDATE SET n=n+1').run(day, String(b.pid));
      } else {
        const src = classifySrc(String(b.ref || ''), String(b.src || ''));
        db.prepare('INSERT INTO visits(day,vid,pv,src) VALUES(?,?,1,?) ON CONFLICT(day,vid) DO UPDATE SET pv=pv+1').run(day, vid, src);
        db.exec("DELETE FROM visits WHERE day < date('now','-120 day'); DELETE FROM pviews WHERE day < date('now','-120 day');");
      }
      return send(res, 200, { ok: true });
    }
    if (p === '/api/order' && req.method === 'POST') {
      const r = (orderRate.get(ip) || []).filter(t => Date.now() - t < 60e3); if (r.length >= 8) return send(res, 429, { error: 'Terlalu cepat' });
      r.push(Date.now()); orderRate.set(ip, r);
      const b = JSON.parse((await readBody(req, 4000)).toString() || '{}'), st = getState(), price = {};
      for (const x of st.products) price[x.id] = [x.title, x.access === 'free' ? 0 : x.price];
      for (const x of st.site.bundles || []) price[x.id] = [x.cartName, x.price];
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).filter(x => x && price[x.id]).map(x => ({ id: x.id, title: price[x.id][0], price: price[x.id][1] }));
      if (!items.length) return send(res, 400, { error: 'Kosong' });
      db.prepare('INSERT INTO orders(ts,items,total) VALUES(?,?,?)').run(new Date().toISOString(), JSON.stringify(items), items.reduce((a, x) => a + x.price, 0));
      db.exec('DELETE FROM orders WHERE id NOT IN (SELECT id FROM orders ORDER BY id DESC LIMIT 2000)');
      return send(res, 200, { ok: true });
    }
    if (p === '/api/login' && req.method === 'POST') {
      if (limited(ip)) return send(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
      const b = JSON.parse((await readBody(req, 2000)).toString() || '{}');
      if (!checkPw(b.password || '')) { fail(ip); return send(res, 401, { error: 'Kata sandi salah' }); }
      fails.delete(ip); return send(res, 200, { ok: true }, { 'Set-Cookie': newCookie() });
    }
    if (p === '/api/logout') return send(res, 200, { ok: true }, { 'Set-Cookie': 'hp_s=; Max-Age=0; Path=/' });
    if (p === '/api/me') return send(res, 200, { ok: authed(req) });
    if (!authed(req)) return send(res, 401, { error: 'Belum login' });
    if (p.startsWith('/api/admin/posts')) { const r = await bl.api(p, req.method, u, () => readBody(req, 3e6)); return send(res, r.code || 200, r.body); }
    if (p === '/api/admin/state' && req.method === 'GET') return send(res, 200, getState());
    if (p === '/api/admin/save' && req.method === 'POST') {
      const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString()));
      build(st); putState(st, 'Simpan'); try { bl.build(); } catch (e) { console.error('blog', e.message); } return send(res, 200, { ok: true, state: st });
    }
    if (p === '/api/admin/versions' && req.method === 'GET') return send(res, 200, db.prepare('SELECT id,ts,note FROM versions ORDER BY id DESC').all());
    if (p === '/api/admin/restore' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 1000)).toString());
      const r = db.prepare('SELECT state FROM versions WHERE id=?').get(+b.id); if (!r) return send(res, 404, { error: 'Versi tidak ada' });
      const st = cleanState(JSON.parse(r.state)); build(st); try { bl.build(); } catch (e) {} putState(st, 'Kembalikan versi #' + (+b.id)); return send(res, 200, { ok: true, state: st });
    }
    if (p === '/api/admin/upload' && req.method === 'POST') {
      const buf = await readBody(req, 2.5e6);
      if (buf.length < 1000 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[2] !== 0xFF || buf[buf.length - 2] !== 0xFF || buf[buf.length - 1] !== 0xD9) return send(res, 400, { error: 'File harus gambar JPEG yang valid' });
      const name = crypto.randomBytes(16).toString('hex') + '.jpg';
      fs.writeFileSync(path.join(WEB, 'uploads', name), buf, { mode: 0o644 });
      return send(res, 200, { url: '/uploads/' + name });
    }
    if (p === '/api/admin/stats' && req.method === 'GET') {
      const rg = [1, 7, 30].includes(+u.searchParams.get('range')) ? +u.searchParams.get('range') : 7;
      const days = [], now = Date.now();
      for (let i = Math.max(rg, 7) - 1; i >= 0; i--) days.push(new Date(now + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10));
      const from = days[days.length - rg];
      const vrows = db.prepare('SELECT day,COUNT(*) u,SUM(pv) pv FROM visits WHERE day>=? GROUP BY day').all(from);
      const orows = db.prepare('SELECT ts FROM orders').all().map(r => new Date(new Date(r.ts).getTime() + 7 * 3600e3).toISOString().slice(0, 10)).filter(d => d >= from);
      const perDay = days.filter(d => d >= from).map(d => ({ d, u: (vrows.find(x => x.day === d) || {}).u || 0, o: orows.filter(x => x === d).length }));
      const uniq = perDay.reduce((a, x) => a + x.u, 0), pv = vrows.reduce((a, x) => a + (x.pv || 0), 0), clicks = orows.length;
      const src = db.prepare('SELECT src,COUNT(*) n FROM visits WHERE day>=? GROUP BY src ORDER BY n DESC').all(from);
      const prod = db.prepare('SELECT pid,SUM(n) n FROM pviews WHERE day>=? GROUP BY pid ORDER BY n DESC LIMIT 5').all(from);
      const st = getState(), nm = {}; st.products.forEach(x => { nm[x.id] = x.title; }); (st.site.bundles || []).forEach(x => { nm[x.id] = x.cartName; });
      return send(res, 200, { range: rg, uniq, pv, clicks, conv: uniq ? Math.round(clicks / uniq * 1000) / 10 : 0, perDay, src, prod: prod.map(x => ({ name: nm[x.pid] || x.pid, n: x.n })) });
    }
    if (p === '/api/admin/orders' && req.method === 'GET') {
      const rows = db.prepare('SELECT id,ts,items,total,status FROM orders ORDER BY id DESC LIMIT 200').all().map(r => ({ id: r.id, ts: r.ts, items: JSON.parse(r.items), total: r.total, status: r.status }));
      const days = [], now = Date.now();
      for (let i = 6; i >= 0; i--) { const d = new Date(now + 7 * 3600e3 - i * 86400e3).toISOString().slice(0, 10); days.push({ d, n: 0 }); }
      let week = 0, val = 0; const cnt = {};
      for (const r of rows) {
        const d = new Date(new Date(r.ts).getTime() + 7 * 3600e3).toISOString().slice(0, 10), x = days.find(z => z.d === d);
        if (x) { x.n++; week++; val += r.total; r.items.forEach(i => { cnt[i.title] = (cnt[i.title] || 0) + 1; }); }
      }
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      return send(res, 200, { rows: rows.slice(0, 50), days, week, val, top: top ? top[0] : '-' });
    }
    if (p === '/api/admin/order-status' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 500)).toString());
      if (!['Baru', 'Dibayar', 'Batal'].includes(b.status)) return send(res, 400, { error: 'Status tidak valid' });
      db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status, +b.id); return send(res, 200, { ok: true });
    }
    if (p === '/api/admin/orders.csv' && req.method === 'GET') {
      const rows = db.prepare('SELECT ts,items,total,status FROM orders ORDER BY id DESC').all();
      const c = v => '"' + String(v).replace(/"/g, '""') + '"';
      const out = '\ufeffwaktu,isi,total,status\n' + rows.map(r => [r.ts, JSON.parse(r.items).map(i => i.title).join('; '), r.total, r.status].map(c).join(',')).join('\n');
      res.writeHead(200, Object.assign({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="pesanan.csv"' }, HDR)); return res.end(out);
    }
    if (p === '/api/admin/backups' && req.method === 'GET') return send(res, 200, listBackups());
    if (p === '/api/admin/backup-now' && req.method === 'POST') { const n = doBackup(); return send(res, 200, { ok: true, name: n, list: listBackups() }); }
    if (p === '/api/admin/backup' && req.method === 'GET') {
      const n = u.searchParams.get('f') || ''; if (!/^(hp|uploads)-[0-9-]+\.(db|tgz)$/.test(n) || !fs.existsSync(path.join(BK, n))) return send(res, 404, { error: 'Tidak ada' });
      const buf = fs.readFileSync(path.join(BK, n));
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="' + n + '"' }, HDR)); return res.end(buf);
    }
    if (p === '/api/admin/password' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 1000)).toString());
      if (!checkPw(b.old || '')) return send(res, 403, { error: 'Kata sandi lama salah' });
      if (String(b.new || '').length < 10) return send(res, 400, { error: 'Kata sandi baru minimal 10 karakter' });
      kset('pw', hashPw(String(b.new))); return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Tidak ditemukan' });
  } catch (e) { send(res, 400, { error: e.message || 'Gagal' }); }
}).listen(PORT, '127.0.0.1', () => console.log('hp-admin jalan di 127.0.0.1:' + PORT));
try { build(getState()); console.log('halaman dibangun ulang'); } catch (e) { console.error('rebuild gagal', e.message); }
if (!process.env.HP_NOBUILD) { try { bl.tick(); bl.build(); } catch (e) { console.error('blog gagal', e.message); } setInterval(() => { try { bl.tick(); } catch (e) { console.error('jadwal gagal', e.message); } }, 30000); }
