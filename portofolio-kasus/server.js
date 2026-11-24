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
  fs.mkdirSync(VER, { recursive: true });
  fs.writeFileSync(path.join(VER, Date.now() + '.json'), JSON.stringify({ note, state: st }));
  const names = fs.readdirSync(VER).sort(); for (const f of names.slice(0, Math.max(0, names.length - 40))) fs.unlinkSync(path.join(VER, f));
}
function versions() { return fs.readdirSync(VER).sort().reverse().map(f => { const j = JSON.parse(fs.readFileSync(path.join(VER, f), 'utf8')); return { id: f.replace('.json', ''), ts: new Date(+f.replace('.json', '')).toISOString(), note: j.note }; }); }


// ================= Galeri depan (karya.json + works.json -> galeri.json) =================
// Sumber kebenaran tunggal setelah modul ini dipasang: state galeri di DATA, hasil terbit di WEB/galeri.json.
// Item yang dihapus dari state tidak pernah dimunculkan lagi oleh deploy (deploy hanya mengganti kode, bukan data).
const GST = path.join(DATA, 'galeri-state.json'), GOUT = path.join(WEB, 'galeri.json'), GVER = path.join(DATA, 'versions-galeri');
fs.mkdirSync(GVER, { recursive: true });
const MEDIA_EXT = /\.(jpg|jpeg|png|webp|mp4|webm)$/i, IMG_EXT = /\.(jpg|jpeg|png|webp)$/i;
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'item';
const SUBS0 = { 'AI Motion (Remotion)': ['Remotion Drama', 'Remotion Iklan', 'Remotion Horror', 'Remotion Portofolio'], 'AI Video & Content': ['Video AI', 'Video Iklan', 'Video Komersial'], 'Video Iklan': ['Video AI', 'Video Iklan', 'Video Komersial'], 'Video Drama': ['Video AI', 'Video Iklan', 'Video Komersial'] };
function worksJenis(w) {
  if (w.jenis) return String(w.jenis); if (!SUBS0[w.category]) return ''; const t = ((w.title || '') + '').toLowerCase();
  if (w.category === 'AI Motion (Remotion)') { if (/drama/.test(t)) return 'Remotion Drama'; if (/horror|horor/.test(t)) return 'Remotion Horror'; if (/iklan|promo/.test(t)) return 'Remotion Iklan'; return 'Remotion Portofolio'; }
  if (w.category === 'Video Iklan' || /iklan/.test(t)) return 'Video Iklan'; if (/komersial|commercial|brand/.test(t)) return 'Video Komersial'; return 'Video AI';
}
function karyaJenis(x) {
  const t = ((x.judul || '') + ' ' + (x.kategori || '')).toLowerCase(); if (x.jenis) return String(x.jenis);
  return x.kategori === 'Carousel' ? 'Carousel' : (/iklan/.test(t) ? 'Video Iklan' : (/tuntasync|komersial|commercial|promo|brand/.test(t) ? 'Video Komersial' : 'Video AI'));
}
function uniq(a) { return a.filter((v, i) => v && a.indexOf(v) === i); }
function importGaleri() {
  const rd = f => { try { return JSON.parse(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { return []; } };
  const W = rd('works.json'), K = rd('karya.json'); const used = new Set();
  const uid = (base) => { let id = base, n = 2; while (used.has(id)) id = base + '-' + n++; used.add(id); return id; };
  const works = (Array.isArray(W) ? W : []).map(w => ({ id: uid(slug(w.id || w.title)), title: w.title || '', category: w.category || '', jenis: worksJenis(w), summary: w.summary || '', metrics: w.metrics || '',
    mediaUrl: w.mediaUrl || '', mediaType: w.mediaType || 'image', posterUrl: w.posterUrl || '', promptOrWorkflow: w.promptOrWorkflow || '', tools: Array.isArray(w.tools) ? w.tools : [], externalLink: /^https:\/\//.test(w.externalLink || '') ? w.externalLink : '', badge: w.badge || '' }));
  const karya = (Array.isArray(K) ? K : []).map(x => { const o = { id: uid(slug(x.judul)), judul: x.judul || '', jenis: [karyaJenis(x)], video: x.video || '', poster: x.poster || '', keterangan: x.keterangan || '', keahlian: Array.isArray(x.keahlian) ? x.keahlian : [] };
    if (Array.isArray(x.slides)) o.slides = x.slides.map(v => typeof v === 'string' ? v : (v && v.src)).filter(Boolean); return o; });
  const subs = {}; for (const c of uniq(works.map(w => w.category))) subs[c] = uniq((SUBS0[c] || []).concat(works.filter(w => w.category === c).map(w => w.jenis)));
  return { skema: 1, bagian: { kartu: { label: '', judul: '', intro: '' }, video: { label: '', judul: '', intro: '' }, karya: { label: '', judul: '', intro: '' } },
    kategori_works: uniq(works.map(w => w.category)), subs, jenis_video: uniq(['Video AI', 'Video Iklan', 'Video Komersial'].concat(karya.map(x => x.jenis[0]))), works, karya };
}
const gp = (label, v, ext) => { const x = str(v, 200); if (!x) return ''; if (!PATH_RE.test(x) || x.includes('..') || x.includes('//') || !ext.test(x)) bad(label + ': lokasi berkas tidak valid'); return x; };
function cleanGaleri(inp) {
  if (!inp || typeof inp !== 'object') bad('Data galeri tidak ada');
  const ids = new Set(); const nid = (l, v) => { const id = str(v, 40); if (!ID_RE.test(id)) bad(l + ': kode tidak valid'); if (ids.has(id)) bad(l + ': kode ganda (' + id + ')'); ids.add(id); return id; };
  const nm = (l, v, n) => { const x = T(l, v, n || 80); return x; };
  const arr = (v, max) => Array.isArray(v) ? v.slice(0, max) : [];
  const B = inp.bagian || {}; const bagian = {}; for (const k of ['kartu', 'video', 'karya']) { const b = B[k] || {}; bagian[k] = { label: T('Nama bagian ' + k + ' label', b.label, 80), judul: T('Nama bagian ' + k + ' judul', b.judul, 120), intro: T('Nama bagian ' + k + ' pengantar', b.intro, 400) }; }
  const kategori_works = uniq(arr(inp.kategori_works, 20).map(x => nm('Kategori', x, 60)));
  const subs = {}; for (const c of Object.keys(inp.subs || {}).slice(0, 20)) { const cc = nm('Kategori', c, 60); if (cc) subs[cc] = uniq(arr(inp.subs[c], 30).map(x => nm('Jenis', x, 60))); }
  const jenis_video = uniq(arr(inp.jenis_video, 30).map(x => nm('Jenis video', x, 60)));
  const works = arr(inp.works, 80).map((w, i) => { const l = 'Galeri karya ' + (i + 1); const title = T(l + ' judul', w.title, 140); if (!title) bad(l + ': judul wajib diisi');
    const mt = ['image', 'video', 'embed'].includes(w.mediaType) ? w.mediaType : 'image'; let mediaUrl = str(w.mediaUrl, 300);
    if (mt === 'embed') { if (mediaUrl && !/^https:\/\//.test(mediaUrl)) bad(l + ': tautan embed harus https'); } else mediaUrl = gp(l + ' media', mediaUrl, MEDIA_EXT);
    const o = { id: nid(l, w.id), title, category: nm(l + ' kategori', w.category, 60), jenis: nm(l + ' jenis', w.jenis, 60), summary: T(l + ' keterangan', w.summary, 600), metrics: T(l + ' hasil', w.metrics, 400),
      mediaUrl, mediaType: mt, posterUrl: gp(l + ' sampul', w.posterUrl, IMG_EXT), promptOrWorkflow: T(l + ' alur kerja', w.promptOrWorkflow, 1500), tools: arr(w.tools, 12).map(x => T(l + ' tools', x, 60)).filter(Boolean),
      externalLink: str(w.externalLink, 300), badge: T(l + ' lencana', w.badge, 40) };
    if (o.externalLink && !/^https:\/\//.test(o.externalLink)) bad(l + ': tautan luar harus https'); if (w.sembunyi === true) o.sembunyi = true; return o; });
  const karya = arr(inp.karya, 80).map((x, i) => { const l = 'Galeri video ' + (i + 1); const judul = T(l + ' judul', x.judul, 140); if (!judul) bad(l + ': judul wajib diisi');
    const o = { id: nid(l, x.id), judul, jenis: uniq(arr(x.jenis, 6).map(j => nm(l + ' jenis', j, 60))), video: gp(l + ' video', x.video, /\.(mp4|webm)$/i), poster: gp(l + ' sampul', x.poster, IMG_EXT), keterangan: T(l + ' keterangan', x.keterangan, 600), keahlian: arr(x.keahlian, 8).map(j => T(l + ' keahlian', j, 80)).filter(Boolean) };
    if (Array.isArray(x.slides)) o.slides = x.slides.slice(0, 20).map((s, j) => gp(l + ' slide ' + (j + 1), s, IMG_EXT)).filter(Boolean); if (!o.poster && !(o.slides && o.slides.length)) bad(l + ': sampul wajib ada agar bisa tampil'); if (x.sembunyi === true) o.sembunyi = true; return o; });
  for (const w of works) { if (w.category && !kategori_works.includes(w.category)) kategori_works.push(w.category); if (w.category && w.jenis) { subs[w.category] = subs[w.category] || []; if (!subs[w.category].includes(w.jenis)) subs[w.category].push(w.jenis); } }
  for (const x of karya) for (const j of x.jenis) if (!jenis_video.includes(j)) jenis_video.push(j);
  return { skema: 1, bagian, kategori_works, subs, jenis_video, works, karya };
}
function galeriOut(st) {
  const vis = x => x.sembunyi !== true;
  return { skema: 1, diperbarui: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), bagian: st.bagian, kategori_works: st.kategori_works, subs: st.subs, jenis_video: st.jenis_video,
    works: st.works.filter(vis).map(w => { const o = Object.assign({}, w); delete o.sembunyi; return o; }),
    karya: st.karya.filter(vis).map(x => { const o = Object.assign({}, x); delete o.sembunyi; o.kategori = (x.jenis && x.jenis[0]) || 'Video'; return o; }) };
}
function galeriPaths(st) { const s = new Set(); for (const w of st.works) { s.add(w.mediaUrl); s.add(w.posterUrl); } for (const x of st.karya) { s.add(x.video); s.add(x.poster); (x.slides || []).forEach(v => s.add(v)); } s.delete(''); return s; }
function getGaleri() { if (fs.existsSync(GST)) return JSON.parse(fs.readFileSync(GST, 'utf8')); const st = importGaleri(); atomicWrite(GST, JSON.stringify(st)); return st; }
function ensureGaleriOut() { const st = getGaleri(); if (!fs.existsSync(GOUT)) atomicWrite(GOUT, JSON.stringify(galeriOut(st), null, 1) + '\n'); return st; }
function purgeFiles(oldSt, newSt) {
  // Hapus permanen: berkas unggahan (v/uploads/) yang tidak dipakai lagi oleh galeri maupun kartu karya.
  const keep = galeriPaths(newSt); try { const c = getState(); for (const k of c.karya) { keep.add(k.thumb); for (const t of (k.tahap || [])) for (const b of (t.bukti || [])) { keep.add(b.src); keep.add(b.poster); } } } catch (e) { /* abaikan */ }
  const gone = []; for (const f of galeriPaths(oldSt)) { if (keep.has(f) || !/^v\/uploads\/[A-Za-z0-9_\-.]+$/.test(f)) continue; const fp = path.join(WEB, f); try { if (fp.startsWith(path.join(WEB, 'v', 'uploads') + path.sep) && fs.existsSync(fp)) { fs.unlinkSync(fp); gone.push(f); } } catch (e) { /* abaikan */ } }
  return gone;
}
function putGaleri(st, note) {
  const old = getGaleri(); const oldOut = fs.existsSync(GOUT) ? fs.readFileSync(GOUT) : null; const next = JSON.stringify(galeriOut(st), null, 1) + '\n';
  try { atomicWrite(GOUT, next); atomicWrite(GST, JSON.stringify(st)); } catch (e) { if (oldOut) atomicWrite(GOUT, oldOut); throw new Error('Gagal menerbitkan, dikembalikan: ' + e.message); }
  fs.mkdirSync(GVER, { recursive: true });
  fs.writeFileSync(path.join(GVER, Date.now() + '.json'), JSON.stringify({ note, state: st }));
  const names = fs.readdirSync(GVER).sort(); for (const f of names.slice(0, Math.max(0, names.length - 40))) fs.unlinkSync(path.join(GVER, f));
  return purgeFiles(old, st);
}
function galeriVersions() { return fs.readdirSync(GVER).sort().reverse().map(f => { const j = JSON.parse(fs.readFileSync(path.join(GVER, f), 'utf8')); return { id: f.replace('.json', ''), ts: new Date(+f.replace('.json', '')).toISOString(), note: j.note, works: j.state.works.length, karya: j.state.karya.length }; }); }
function casePaths(st) { const s = new Set(); for (const k of (st.karya || [])) { s.add(k.thumb); for (const t of (k.tahap || [])) for (const b of (t.bukti || [])) { s.add(b.src); s.add(b.poster); } } s.delete(''); s.delete(undefined); return s; }
function purgeCases(oldSt, newSt) {
  const keep = casePaths(newSt); try { for (const f of galeriPaths(getGaleri())) keep.add(f); } catch (e) { /* abaikan */ }
  for (const f of casePaths(oldSt)) { if (keep.has(f) || !/^v\/uploads\/[A-Za-z0-9_\-.]+$/.test(f)) continue; const fp = path.join(WEB, f); try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (e) { /* abaikan */ } }
}
try { ensureGaleriOut(); } catch (e) { console.error('galeri awal gagal:', e.message); }
// ================= akhir modul galeri =================

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
let lastSave = 0, lastGSave = 0;
http.createServer(async (req, res) => {
  try {
    const p = new URL(req.url, 'http://x').pathname;
    if (req.method === 'GET' && (p === '/admin/kasus' || p === '/admin/kasus/')) return send(res, 200, fs.readFileSync(path.join(APP, 'kasus.html')));
    if (req.method === 'GET' && (p === '/admin/kasus/depan' || p === '/admin/kasus/depan/')) return send(res, 200, fs.readFileSync(path.join(APP, 'depan.html')));
    if (!p.startsWith('/api/kasus/')) return send(res, 404, 'Tidak ditemukan');
    if (req.method !== 'GET' && req.headers['x-hp'] !== '1') return send(res, 403, { error: 'Ditolak' });
    if (!(await authOK(req))) return send(res, 401, { error: 'Belum login. Buka /admin, login, lalu muat ulang halaman ini.' });
    if (p === '/api/kasus/state' && req.method === 'GET') return send(res, 200, getState());
    if (p === '/api/kasus/save' && req.method === 'POST') {
      if (Date.now() - lastSave < 700) return send(res, 429, { error: 'Terlalu cepat, coba lagi sebentar' });
      const before = getState(); const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString())); putState(st, 'Simpan'); purgeCases(before, st); lastSave = Date.now(); return send(res, 200, { ok: true, state: st });
    }
    if (p === '/api/kasus/galeri' && req.method === 'GET') return send(res, 200, getGaleri());
    if (p === '/api/kasus/galeri/save' && req.method === 'POST') {
      if (Date.now() - lastGSave < 700) return send(res, 429, { error: 'Terlalu cepat, coba lagi sebentar' });
      const st = cleanGaleri(JSON.parse((await readBody(req, 2e6)).toString())); const gone = putGaleri(st, 'Simpan'); lastGSave = Date.now(); return send(res, 200, { ok: true, state: st, terhapus: gone });
    }
    if (p === '/api/kasus/galeri/versions' && req.method === 'GET') return send(res, 200, galeriVersions());
    if (p === '/api/kasus/galeri/restore' && req.method === 'POST') {
      const b = JSON.parse((await readBody(req, 1000)).toString()); if (!/^\d{10,16}$/.test(String(b.id))) bad('Versi tidak valid');
      const f = path.join(GVER, b.id + '.json'); if (!fs.existsSync(f)) return send(res, 404, { error: 'Versi tidak ada' });
      const st = cleanGaleri(JSON.parse(fs.readFileSync(f, 'utf8')).state); putGaleri(st, 'Kembalikan versi ' + b.id); return send(res, 200, { ok: true, state: st });
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
module.exports = { cleanState, stripDraft, cleanGaleri, galeriOut, importGaleri };
