'use strict';
// API Bank Soal (Node 22, tanpa dependensi). Semua rute berada di bawah /bank-soal/api/ agar
// tidak bertabrakan dengan /api milik aplikasi lain di domain yang sama.
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { db } = require('./db');

const PORT = +process.env.BS_PORT || 3110;
const HOST = process.env.BS_HOST || '127.0.0.1';
const BASE = '/bank-soal/api';
const TOKEN_DAYS = +process.env.TOKEN_DAYS || 180;
const BUNDLE_PRICE = process.env.BUNDLE_PRICE ? +process.env.BUNDLE_PRICE : null;
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';
const adapter = require(path.join(__dirname, 'adapters', (process.env.PAYMENT_ADAPTER || 'manual').replace(/[^a-z0-9_-]/gi, '') + '.js'));

const HDR = { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const send = (res, code, obj) => { res.writeHead(code, HDR); res.end(JSON.stringify(obj)); };

// pembatas laju sederhana per IP
const hits = new Map();
function limited(ip, key, max, windowMs) {
  const k = key + '|' + ip, now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 600000)) hits.delete(k); }, 300000).unref();

function readBody(req, max = 16384) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('Body terlalu besar'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const parseJson = (buf) => { try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { return null; } };
const clientIp = (req) => (req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeToken() {
  for (;;) {
    const part = () => Array.from({ length: 4 }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join('');
    const code = `CA-${part()}-${part()}`;
    if (!db.prepare('SELECT 1 FROM access_tokens WHERE token_code=?').get(code)) return code;
  }
}
const TOKEN_RE = /^CA-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function course(slug) { return db.prepare('SELECT * FROM courses WHERE slug=?').get(slug); }
function validToken(code, c) {
  if (!TOKEN_RE.test(code || '')) return null;
  const t = db.prepare('SELECT * FROM access_tokens WHERE token_code=?').get(code);
  if (!t || new Date(t.expires_at) < new Date()) return null;
  if (!db.prepare("SELECT 1 FROM orders WHERE order_id=? AND status='paid'").get(t.order_id)) return null;
  if (c) {
    if (t.scope_type === 'single_course' && t.scope_value !== c.slug) return null;
    if (t.scope_type === 'semester_bundle' && String(c.semester) !== String(t.scope_value)) return null;
  }
  return t;
}
const bearer = (req) => { const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || ''); return m ? m[1].toUpperCase() : ''; };
function paket(c) {
  const p = { single_course: { scope_value: c.slug, harga: c.harga_satuan } };
  if (BUNDLE_PRICE) p.semester_bundle = { scope_value: String(c.semester), harga: BUNDLE_PRICE };
  return p;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x'); const p = url.pathname;
  if (!p.startsWith(BASE + '/')) return send(res, 404, { error: 'Tidak ditemukan' });
  const r = p.slice(BASE.length); const ip = clientIp(req);

  if (req.method === 'GET' && r === '/health') return send(res, 200, { ok: true });

  let m;
  if (req.method === 'GET' && (m = /^\/course\/([a-z0-9-]+)\/locked-questions$/.exec(r))) {
    if (limited(ip, 'lq', 60, 60000)) return send(res, 429, { error: 'Terlalu banyak permintaan' });
    const c = course(m[1]); if (!c) return send(res, 404, { error: 'Mata kuliah tidak ditemukan' });
    if (!validToken(bearer(req), c)) return send(res, 402, { error: 'Token akses diperlukan', paket: paket(c) });
    const rows = db.prepare('SELECT * FROM questions WHERE course_id=? AND is_free=0 ORDER BY nomor_urut').all(c.id);
    return send(res, 200, { questions: rows.map((q) => ({ n: q.nomor_urut, modul: q.modul, tipe: q.tipe, konten: JSON.parse(q.konten_json), opsi: JSON.parse(q.opsi_json), kunci: q.kunci, pembahasan: q.pembahasan })) });
  }

  if (req.method === 'POST' && r === '/token/verify') {
    if (limited(ip, 'tv', 10, 60000)) return send(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi sebentar.' });
    const b = parseJson(await readBody(req)); if (!b) return send(res, 400, { error: 'JSON tidak valid' });
    const code = String(b.token || '').trim().toUpperCase();
    const c = b.slug ? course(String(b.slug)) : null;
    const t = validToken(code, c);
    if (!t) return send(res, 401, { error: 'Token tidak valid, kedaluwarsa, atau bukan untuk mata kuliah ini.' });
    return send(res, 200, { ok: true, scope: { type: t.scope_type, value: t.scope_value }, expires_at: t.expires_at });
  }

  if (req.method === 'POST' && r === '/checkout/create') {
    if (limited(ip, 'co', 8, 600000)) return send(res, 429, { error: 'Terlalu banyak permintaan' });
    const b = parseJson(await readBody(req)); if (!b) return send(res, 400, { error: 'JSON tidak valid' });
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return send(res, 400, { error: 'Email tidak valid.' });
    const wa = String(b.whatsapp || '').replace(/[^\d+]/g, '').slice(0, 20);
    let amount, scopeValue; const type = b.scope_type;
    if (type === 'single_course') { const c = course(String(b.scope_value || '')); if (!c) return send(res, 404, { error: 'Mata kuliah tidak ditemukan' }); amount = c.harga_satuan; scopeValue = c.slug; }
    else if (type === 'semester_bundle') { if (!BUNDLE_PRICE) return send(res, 400, { error: 'Paket semester belum tersedia.' }); const s = String(b.scope_value || ''); if (!/^\d{1,2}$/.test(s) || !db.prepare('SELECT 1 FROM courses WHERE semester=?').get(+s)) return send(res, 404, { error: 'Semester tidak ditemukan' }); amount = BUNDLE_PRICE; scopeValue = s; }
    else return send(res, 400, { error: 'scope_type tidak dikenal' });
    const order = { order_id: 'BS-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase(), buyer_email: email, buyer_whatsapp: wa || null, scope_type: type, scope_value: scopeValue, amount, status: 'pending', created_at: new Date().toISOString() };
    let g; try { g = await adapter.create(order); } catch (e) { console.error('adapter:', e.message); return send(res, 502, { error: 'Gateway pembayaran tidak dapat dihubungi.' }); }
    db.prepare('INSERT INTO orders (order_id,buyer_email,buyer_whatsapp,scope_type,scope_value,amount,status,payment_gateway_ref,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(order.order_id, order.buyer_email, order.buyer_whatsapp, order.scope_type, order.scope_value, order.amount, 'pending', g.payment_gateway_ref || null, order.created_at);
    return send(res, 201, { order_id: order.order_id, amount, status: 'pending', payment: g.payment || {} });
  }

  if (req.method === 'POST' && r === '/webhook/payment') {
    if (!WEBHOOK_SECRET) return send(res, 503, { error: 'Webhook belum dikonfigurasi' });
    const raw = await readBody(req);
    const sig = String(req.headers['x-signature'] || '').trim().toLowerCase();
    const exp = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
    const ok = sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
    if (!ok) return send(res, 401, { error: 'Signature tidak valid' });
    const b = parseJson(raw); if (!b || !b.order_id) return send(res, 400, { error: 'Payload tidak valid' });
    const o = db.prepare('SELECT * FROM orders WHERE order_id=?').get(String(b.order_id));
    if (!o) return send(res, 404, { error: 'Pesanan tidak ditemukan' });
    if (String(b.status || '').toLowerCase() !== 'paid') return send(res, 200, { ok: true, ignored: true });
    const exist = db.prepare('SELECT * FROM access_tokens WHERE order_id=?').get(o.order_id);
    if (exist) return send(res, 200, { ok: true, order_id: o.order_id, token: exist.token_code, buyer_email: o.buyer_email, buyer_whatsapp: o.buyer_whatsapp, expires_at: exist.expires_at, repeat: true });
    const now = new Date(); const exp2 = new Date(now.getTime() + TOKEN_DAYS * 86400000).toISOString(); const code = makeToken();
    db.exec('BEGIN');
    try {
      db.prepare("UPDATE orders SET status='paid', payment_gateway_ref=COALESCE(?,payment_gateway_ref) WHERE order_id=?").run(b.gateway_ref ? String(b.gateway_ref) : null, o.order_id);
      db.prepare('INSERT INTO access_tokens (token_code,order_id,scope_type,scope_value,expires_at,created_at) VALUES (?,?,?,?,?,?)').run(code, o.order_id, o.scope_type, o.scope_value, exp2, now.toISOString());
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    return send(res, 200, { ok: true, order_id: o.order_id, token: code, buyer_email: o.buyer_email, buyer_whatsapp: o.buyer_whatsapp, expires_at: exp2,
      notify_text: `Pembayaran pesanan ${o.order_id} diterima. Token akses Bank Soal Anda: ${code} (berlaku sampai ${exp2.slice(0, 10)}). Aktifkan di catatanakademik.com/bank-soal/aktivasi/` });
  }

  return send(res, 404, { error: 'Tidak ditemukan' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => { if (e && e.code === 413) return send(res, 413, { error: 'Body terlalu besar' }); console.error(e); if (!res.headersSent) send(res, 500, { error: 'Kesalahan server' }); });
});
server.requestTimeout = 15000;
if (require.main === module) server.listen(PORT, HOST, () => console.log(`bank-soal api di http://${HOST}:${PORT}${BASE}/`));
module.exports = { server };
