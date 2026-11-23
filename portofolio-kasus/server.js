'use strict';
// Modul "Studi Kasus" untuk Ruang Admin portofolio. Berdiri sendiri: tidak mengubah server admin lama.
// Login: setiap permintaan diteruskan ke admin lama (/api/me) dengan cookie yang sama, jadi login tidak diduplikasi.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const APP = __dirname;
const WEB = process.env.DK_WEB || '/var/www/dikapriyadi';
const DATA = process.env.DK_DATA || '/var/lib/dp-kasus';
const AUTH = process.env.DK_AUTH || 'http://127.0.0.1:3108';
const PORT = +process.env.DK_PORT || 3109;
const OUT = path.join(WEB, 'cases.json'), STATE = path.join(DATA, 'state.json'), VER = path.join(DATA, 'versions');
fs.mkdirSync(VER, { recursive: true });

const bad = m => { const e = new Error(m); e.user = true; throw e; };
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, n);
const PATH_RE = /^(v|assets)\/[A-Za-z0-9_\-\/.]{1,160}$/;
const EXT_RE = /\.(jpg|jpeg|png|webp|mp4)$/i;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const STATUS = ['Tayang', 'Karya', 'Prototipe'];
// Pemindai rahasia: tolak teks yang tampak seperti kata sandi / kunci / token / nomor kartu.
const SECRET = [
  [/\bsk-[A-Za-z0-9_\-]{16,}/, 'kunci API (sk-...)'], [/\bAKIA[0-9A-Z]{16}\b/, 'kunci AWS'], [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'token GitHub'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'token Slack'], [/\bAIza[0-9A-Za-z_\-]{30,}/, 'kunci Google'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\b(password|passwd|kata\s*sandi|api[_\s-]?key|secret|token)\s*[:=]\s*\S{4,}/i, 'kata sandi / kunci / token'], [/\bBearer\s+[A-Za-z0-9._\-]{20,}/, 'token Bearer'],
  [/\b[A-Fa-f0-9]{40,}\b/, 'string hex panjang (mirip kunci)'], [/\b(?:\d[ -]?){15,19}\b/, 'deretan angka mirip nomor kartu/rekening'],
  [/(?:^|[^\d])(?:\+62|62|0)8\d{8,11}\b/, 'nomor telepon pribadi']
];
function scan(label, s) { for (const [re, nama] of SECRET) if (re.test(s)) bad(label + ': terdeteksi ' + nama + '. Hapus atau samarkan dulu.'); return s; }
const T = (label, v, n) => scan(label, str(v, n));
const list = (label, v, maxN, maxLen) => (Array.isArray(v) ? v : []).slice(0, maxN).map(x => T(label, x, maxLen)).filter(Boolean);

function cleanBukti(b, label) {
  const o = {}; o.src = str(b && b.src, 200);
  if (!PATH_RE.test(o.src) || o.src.includes('..') || o.src.includes('//') || !EXT_RE.test(o.src)) bad(label + ': lokasi berkas bukti tidak valid');
  if (!fs.existsSync(path.join(WEB, o.src))) bad(label + ': berkas bukti belum ada di server (' + o.src + ')');
  o.teks = T(label + ' keterangan', b.teks, 300); o.alt = T(label + ' teks alternatif', b.alt, 200);
  if (/\.(jpe?g|png|webp)$/i.test(o.src)) { if (b.samar !== true) bad(label + ': centang "sudah disamarkan" setelah memastikan gambar tidak memuat data pribadi/rahasia'); o.samar = true; }
  if (b.poster) { const p = str(b.poster, 200); if (PATH_RE.test(p) && !p.includes('..')) o.poster = p; }
  return o;
}
function cleanAngka(a, label) {
  const o = { nama: T(label + ' nama metrik', a && a.nama, 120), nilai: T(label + ' nilai', a && a.nilai, 120), sumber: T(label + ' sumber', a && a.sumber, 160), periode: T(label + ' periode', a && a.periode, 80), sampel: T(label + ' sampel', a && a.sampel, 80) };
  for (const k of ['nama', 'nilai', 'sumber', 'periode', 'sampel']) if (!o[k]) bad(label + ': kolom "' + k + '" wajib diisi (setiap angka harus punya sumber, periode, dan sampel)');
  return o;
}
function cleanTahap(t, kl, idx) {
  const label = kl + ' tahap ' + (idx + 1);
  const id = str(t && t.id, 40) || ('t' + (idx + 1)); if (!ID_RE.test(id)) bad(label + ': kode tahap harus huruf kecil/angka/strip');
  const nama = T(label + ' nama', t.nama, 120); if (!nama) bad(label + ': nama tahap wajib diisi');
  const o = { id, n: String(idx + 1).padStart(2, '0'), nama, tujuan: T(label + ' tujuan', t.tujuan, 400), keluaran: T(label + ' keluaran', t.keluaran, 500),
    tata: list(label + ' tata cara', t.tata, 30, 600), alat: list(label + ' alat', t.alat, 20, 80), ai: T(label + ' peran AI', t.ai, 600), manusia: T(label + ' peran manusia', t.manusia, 600),
    bukti: (Array.isArray(t.bukti) ? t.bukti : []).slice(0, 20).map((b, i) => cleanBukti(b, label + ' bukti ' + (i + 1))),
    hasil: T(label + ' hasil', t.hasil, 900), angka: (Array.isArray(t.angka) ? t.angka : []).slice(0, 30).map((a, i) => cleanAngka(a, label + ' angka ' + (i + 1))),
    kendala: T(label + ' kendala', t.kendala, 800), batasan: T(label + ' batasan', t.batasan, 600) };
  if (t.draft === true) o.draft = true; return o;
}
function cleanState(inp) {
  const K = Array.isArray(inp && inp.karya) ? inp.karya : bad('Data karya tidak ada'); if (K.length < 1 || K.length > 20) bad('Jumlah karya harus 1–20');
  const seen = new Set();
  const karya = K.map((k, i) => {
    const kl = 'Karya ' + (i + 1); const id = str(k.id, 40); if (!ID_RE.test(id)) bad(kl + ': kode karya harus huruf kecil/angka/strip'); if (seen.has(id)) bad(kl + ': kode karya ganda (' + id + ')'); seen.add(id);
    const judul = T(kl + ' judul', k.judul, 140); if (!judul) bad(kl + ': judul wajib diisi');
    const status = STATUS.includes(k.status) ? k.status : bad(kl + ': status harus Tayang, Karya, atau Prototipe');
    let thumb = str(k.thumb, 200); if (thumb) { if (!PATH_RE.test(thumb) || thumb.includes('..') || !/\.(jpe?g|png|webp)$/i.test(thumb)) bad(kl + ': gambar kartu tidak valid'); }
    const ts = new Set();
    const tahap = (Array.isArray(k.tahap) ? k.tahap : []).slice(0, 20).map((t, j) => { const c = cleanTahap(t, kl, j); if (ts.has(c.id)) bad(kl + ': kode tahap ganda (' + c.id + ')'); ts.add(c.id); return c; });
    const o = { id, no: String(i + 1).padStart(2, '0'), judul, status, ringkas: T(kl + ' ringkasan', k.ringkas, 400), peran: T(kl + ' peran', k.peran, 140), tgl: T(kl + ' waktu', k.tgl, 140), batas: T(kl + ' batasan', k.batas, 400), thumb, tahap };
    if (k.draft === true) o.draft = true; return o;
  });
  return { skema: 1, diperbarui: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), karya };
}
const stripDraft = st => ({ skema: st.skema, diperbarui: st.diperbarui, karya: st.karya.filter(k => !k.draft).map((k, i) => Object.assign({}, k, { no: String(i + 1).padStart(2, '0'), tahap: k.tahap.filter(t => !t.draft).map((t, j) => { const c = Object.assign({}, t, { n: String(j + 1).padStart(2, '0') }); delete c.draft; return c; }) })).map(k => { delete k.draft; return k; }) });
function atomicWrite(file, data) { const tmp = file + '.tmp-' + process.pid; const fd = fs.openSync(tmp, 'w', 0o644); try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.renameSync(tmp, file); }
function getState() {
  if (fs.existsSync(STATE)) return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  if (fs.existsSync(OUT)) { const st = JSON.parse(fs.readFileSync(OUT, 'utf8')); atomicWrite(STATE, JSON.stringify(st)); return st; }
  return { skema: 1, diperbarui: '', karya: [] };
}
function putState(st, note) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT) : null; const next = JSON.stringify(stripDraft(st), null, 1) + '\n';
  try { if (!old || old.toString() !== next) atomicWrite(OUT, next); atomicWrite(STATE, JSON.stringify(st)); }
  catch (e) { if (old) atomicWrite(OUT, old); throw new Error('Gagal menerbitkan, dikembalikan: ' + e.message); }
  fs.writeFileSync(path.join(VER, Date.now() + '.json'), JSON.stringify({ note, state: st }));
  const names = fs.readdirSync(VER).sort(); for (const f of names.slice(0, Math.max(0, names.length - 40))) fs.unlinkSync(path.join(VER, f));
}
function versions() { return fs.readdirSync(VER).sort().reverse().map(f => { const j = JSON.parse(fs.readFileSync(path.join(VER, f), 'utf8')); return { id: f.replace('.json', ''), ts: new Date(+f.replace('.json', '')).toISOString(), note: j.note }; }); }

// ---- auth via admin lama ----
function authOK(req) {
  return new Promise(ok => {
    const u = new URL(AUTH + '/api/me'); const r = http.request({ host: u.hostname, port: u.port, path: u.pathname, method: 'GET', headers: { cookie: req.headers.cookie || '' }, timeout: 4000 }, res => {
      let b = ''; res.on('data', c => { b += c; }); res.on('end', () => { try { const j = JSON.parse(b); ok(!!(j.ok && !j.must)); } catch (e) { ok(false); } });
    }); r.on('error', () => ok(false)); r.on('timeout', () => { r.destroy(); ok(false); }); r.end();
  });
}
const HDR = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
function send(res, code, body, extra) { const isObj = typeof body === 'object' && !Buffer.isBuffer(body); res.writeHead(code, Object.assign({ 'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' }, HDR, extra || {})); res.end(isObj ? JSON.stringify(body) : body); }
function readBody(req, max) { return new Promise((ok, no) => { const a = []; let n = 0; req.on('data', c => { n += c.length; if (n > max) { no(Object.assign(new Error('Data terlalu besar'), { user: true })); req.destroy(); } else a.push(c); }); req.on('end', () => ok(Buffer.concat(a))); req.on('error', no); }); }
let lastSave = 0;
http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://x').pathname;
    if (req.method === 'GET' && (p === '/admin/kasus' || p === '/admin/kasus/')) return send(res, 200, fs.readFileSync(path.join(APP, 'kasus.html')));
    if (!p.startsWith('/api/kasus/')) return send(res, 404, 'Tidak ditemukan');
    if (req.method !== 'GET' && req.headers['x-hp'] !== '1') return send(res, 403, { error: 'Ditolak' });
    if (!(await authOK(req))) return send(res, 401, { error: 'Belum login. Buka /admin, login, lalu muat ulang halaman ini.' });
    if (p === '/api/kasus/state' && req.method === 'GET') return send(res, 200, getState());
    if (p === '/api/kasus/save' && req.method === 'POST') {
      if (Date.now() - lastSave < 700) return send(res, 429, { error: 'Terlalu cepat, coba lagi sebentar' });
      const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString())); putState(st, 'Simpan'); lastSave = Date.now(); return send(res, 200, { ok: true, state: st });
    }
    if (p === '/api/kasus/versions' && req.method === 'GET') return send(res, 200, versions());
    if (p === '/api/kasus/restore' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 1000)).toString()); if (!/^\d{10,16}$/.test(String(b.id))) bad('Versi tidak valid');
      const f = path.join(VER, b.id + '.json'); if (!fs.existsSync(f)) return send(res, 404, { error: 'Versi tidak ada' });
      const st = cleanState(JSON.parse(fs.readFileSync(f, 'utf8')).state); putState(st, 'Kembalikan versi ' + b.id); return send(res, 200, { ok: true, state: st });
    }
    return send(res, 404, { error: 'Tidak ada' });
  } catch (e) { if (!e.user) console.error(e); send(res, e.user ? 400 : 500, { error: e.user ? e.message : 'Terjadi kesalahan server' }); }
}).listen(PORT, '127.0.0.1', () => console.log('dp-kasus di 127.0.0.1:' + PORT));
module.exports = { cleanState, stripDraft };
