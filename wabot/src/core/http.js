// API lokal (127.0.0.1) untuk situs: kirim notifikasi, status, QR. Semua pakai Bearer secret.
import http from "node:http";
import crypto from "node:crypto";
export function createHttp({ cfg, wa, kirim, log }) {
  const out = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); };
  const authed = req => { if (!cfg.secret) return false; const a = Buffer.from(String(req.headers.authorization || "")), b = Buffer.from("Bearer " + cfg.secret); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const server = http.createServer((req, res) => {
    if (!authed(req)) return out(res, 401, { ok: false });
    const url = req.url.split("?")[0];
    if (req.method === "GET" && url === "/status") return out(res, 200, { ok: true, ...wa.status() });
    if (req.method === "GET" && url === "/qr") return out(res, 200, { ok: true, qr: wa.qr(), state: wa.status().state });
    if (req.method === "POST" && url === "/relink") { wa.relink().catch(e => log.error(e, "relink")); return out(res, 202, { ok: true }); }
    if (req.method === "POST" && (url === "/kirim") && kirim) {
      let body = ""; req.on("data", d => { body += d; if (body.length > 20000) req.destroy(); });
      req.on("end", async () => { try { const j = JSON.parse(body); const r = await kirim(j); out(res, r.code || 200, r.body || { ok: true }); } catch (e) { out(res, 500, { ok: false }); } });
      return;
    }
    out(res, 404, { ok: false });
  });
  return { listen: () => new Promise(r => server.listen(cfg.port, "127.0.0.1", r)), close: () => server.close(), server };
}
