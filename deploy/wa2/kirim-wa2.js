// Endpoint lokal (127.0.0.1) untuk kirim WA lewat WA2. Dipakai nextaja (Cek & Parafrase). Versi ES module.
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let started = false;

export default function kirimWa2(getSock) {
  if (started) return;
  started = true;
  let secret = '';
  try { secret = fs.readFileSync(path.join(dir, '..', '.kirim-secret'), 'utf8').trim(); } catch (e) {}
  if (!secret) { console.error('kirim-wa2: .kirim-secret tidak ada, endpoint nonaktif'); return; }
  const out = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/kirim') return out(res, 404, { ok: false });
    const a = Buffer.from(String(req.headers.authorization || '')), b = Buffer.from('Bearer ' + secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return out(res, 401, { ok: false });
    let body = '';
    req.on('data', d => { body += d; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const j = JSON.parse(body);
        if (!/^62\d{8,13}$/.test(String(j.to)) || typeof j.text !== 'string' || !j.text || j.text.length > 4000) return out(res, 400, { ok: false });
        const sock = getSock();
        if (!sock || !sock.user) return out(res, 503, { ok: false, error: 'WA2 belum terhubung' });
        await sock.sendMessage(j.to + '@s.whatsapp.net', { text: j.text });
        out(res, 200, { ok: true });
      } catch (e) { out(res, 500, { ok: false }); }
    });
  }).on('error', e => console.error('kirim-wa2:', e.message)).listen(3399, '127.0.0.1');
}
