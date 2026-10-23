/* Login dan hak akses panel admin Catatan Akademik. Terpisah dari admin nextaja:
   cookie sendiri (ca_admin), akun sendiri (tabel ca_admins), sesi tersimpan di SQLite (tidak hilang saat restart).
   Akun bawaan "pemilik" memakai sandi CA_ADMIN_PASSWORD (atau ADMIN_PASSWORD bila belum diatur) agar tidak pernah terkunci. */
"use strict";
const crypto = require("crypto");

const ROLES = { owner: "Pemilik", editor: "Editor", cs: "Admin pesanan" };
const SESSION_MS = 12 * 3600e3;
const OWNER_USER = "pemilik";

/* Rute API yang dilindungi panel ini. Rute admin lain (toko nextaja) tetap memakai login nextaja. */
const CA_PREFIXES = ["/ms/admin/ca/", "/ms/admin/koin", "/ms/admin/posts", "/ms/admin/tag-suggestions", "/ms/admin/preview", "/ms/admin/comments", "/ms/admin/parafrase", "/ms/admin/layanan", "/ms/admin/ulasan", "/ms/admin/users", "/ms/admin/orders", "/ms/admin/site-images"];
const isCaPath = p => CA_PREFIXES.some(x => p.startsWith(x));

/* Pemilik boleh semuanya. Editor: konten blog. Admin pesanan (cs): pesanan, pembayaran, pelanggan (lihat). */
const COMMON = [/^\/ms\/admin\/ca\/(me|logout|password|dashboard)$/];
const RULES = {
  editor: [{ re: /^\/ms\/admin\/ca\/traffic$/, get: true }, /^\/ms\/admin\/posts(\/|$)/, /^\/ms\/admin\/tag-suggestions$/, /^\/ms\/admin\/preview(-page)?$/, /^\/ms\/admin\/comments(\/|$)/, /^\/ms\/admin\/ca\/(upload|media)(\/[^\/]+)?$/, /^\/ms\/admin\/ulasan(\/|$)/],
  cs: [/^\/ms\/admin\/koin\/(queue|topups\/[a-f0-9]+\/(proof|confirm|reject))$/, /^\/ms\/admin\/parafrase\/(orders|queue|outbox)(\/|$)/, /^\/ms\/admin\/layanan(\/|$)/, /^\/ms\/admin\/ca\/(orders|payments)(\/|$)/, /^\/ms\/admin\/orders(\/|$)/, { re: /^\/ms\/admin\/users$/, get: true }],
};
function can(role, method, p) {
  if (role === "owner") return true;
  if (COMMON.some(r => r.test(p))) return true;
  return (RULES[role] || []).some(r => (r instanceof RegExp ? r.test(p) : r.re.test(p) && (!r.get || method === "GET")));
}

module.exports = function createCaAuth({ db, getCookie, sameOrigin, SECURE_COOKIE, ownerPassword, sharedWithNextaja, secret }) {
  const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
  const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString("hex");
  const safeEq = (a, b) => { const x = Buffer.from(sha(a)), y = Buffer.from(sha(b)); return crypto.timingSafeEqual(x, y); };
  const ipHash = ip => crypto.createHmac("sha256", secret || "ca").update(String(ip || "")).digest("hex").slice(0, 16);
  const OWNER = { id: 0, username: OWNER_USER, name: "Pemilik", role: "owner", builtin: true };

  const q = {
    byUser: db.prepare("SELECT * FROM ca_admins WHERE username=?"),
    byId: db.prepare("SELECT * FROM ca_admins WHERE id=?"),
    addSess: db.prepare("INSERT INTO ca_sessions(token_hash,admin_id,expires_at,created_at) VALUES(?,?,?,?)"),
    getSess: db.prepare("SELECT * FROM ca_sessions WHERE token_hash=?"),
    delSess: db.prepare("DELETE FROM ca_sessions WHERE token_hash=?"),
    delSessOf: db.prepare("DELETE FROM ca_sessions WHERE admin_id=?"),
    purge: db.prepare("DELETE FROM ca_sessions WHERE expires_at<?"),
    seen: db.prepare("UPDATE ca_admins SET last_login_at=? WHERE id=?"),
    log: db.prepare("INSERT INTO ca_admin_log(at,admin,role,action,target,status,ip_hash) VALUES(?,?,?,?,?,?,?)"),
  };
  const log = (who, action, target, status, ip) => { try { q.log.run(Date.now(), who ? who.name + (who.username ? ` (${who.username})` : "") : "-", who ? who.role : "-", action, target || null, status || null, ip ? ipHash(ip) : null); } catch (e) { console.error("[ca-admin] log gagal:", e.message); } };

  function current(req) {
    const t = getCookie(req, "ca_admin");
    if (!t || t.length < 32) return null;
    const s = q.getSess.get(sha(t));
    if (!s || s.expires_at < Date.now()) return null;
    if (s.admin_id === 0) return ownerPassword ? OWNER : null;
    const a = q.byId.get(s.admin_id);
    return a && a.active ? { id: a.id, username: a.username, name: a.name, role: a.role, builtin: false } : null;
  }

  function guard(req, res, next) {
    const who = current(req);
    if (!who) return res.status(401).json({ error: "Sesi habis, silakan login lagi.", login: "/admin/" });
    if (req.method !== "GET" && !sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    if (!can(who.role, req.method, req.path)) return res.status(403).json({ error: `Akses ditolak untuk peran ${ROLES[who.role] || who.role}.` });
    req.admin = who;
    if (req.method !== "GET") res.on("finish", () => log(who, `${req.method} ${req.path}`, req.params && (req.params.id || req.params.slug), res.statusCode, req.ip));
    next();
  }

  /* percobaan login gagal per IP: 5 kali -> kunci 15 menit */
  const fails = new Map();
  function mount(app, express) {
    const J = express.json({ limit: "4kb" });
    app.post("/ms/admin/ca/login", J, (req, res) => {
      res.set("Cache-Control", "no-store");
      if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
      const f = fails.get(req.ip), now = Date.now();
      if (f && f.until > now) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
      const user = String((req.body || {}).username || "").trim().toLowerCase().slice(0, 40), pw = String((req.body || {}).password || "").slice(0, 200);
      let who = null;
      if (user === OWNER_USER) { if (ownerPassword && ownerPassword.length >= 10 && safeEq(pw, ownerPassword)) who = OWNER; }
      else { const a = q.byUser.get(user); if (a && a.active && crypto.timingSafeEqual(Buffer.from(hashPw(pw, a.salt), "hex"), Buffer.from(a.hash, "hex"))) who = { id: a.id, username: a.username, name: a.name, role: a.role }; }
      if (!who) {
        const n = ((f && f.n) || 0) + 1; fails.set(req.ip, { n, until: n >= 5 ? now + 15 * 60e3 : 0 });
        if (fails.size > 5000) fails.clear();
        log({ name: user || "-", role: "-" }, "login gagal", null, 401, req.ip);
        return res.status(401).json({ error: "Nama pengguna atau sandi salah." });
      }
      fails.delete(req.ip); q.purge.run(now);
      const token = crypto.randomBytes(32).toString("hex");
      q.addSess.run(sha(token), who.id, now + SESSION_MS, now);
      if (who.id) q.seen.run(now, who.id);
      res.setHeader("Set-Cookie", `ca_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MS / 1000}${SECURE_COOKIE ? "; Secure" : ""}`);
      log(who, "login", null, 200, req.ip);
      res.json({ ok: true, admin: { name: who.name, role: who.role } });
    });
    app.post("/ms/admin/ca/logout", (req, res) => {
      const t = getCookie(req, "ca_admin"); if (t) q.delSess.run(sha(t));
      res.setHeader("Set-Cookie", `ca_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${SECURE_COOKIE ? "; Secure" : ""}`);
      res.json({ ok: true });
    });
    app.get("/ms/admin/ca/me", (req, res) => {
      res.set("Cache-Control", "no-store");
      const who = current(req);
      if (!who) return res.status(401).json({ error: "Belum login." });
      res.json({ name: who.name, username: who.username, role: who.role, roleLabel: ROLES[who.role], builtin: !!who.builtin, ownerPasswordShared: !!(who.builtin && sharedWithNextaja) });
    });
  }

  return { guard, mount, current, can, log, isCaPath, hashPw, killSessionsOf: id => q.delSessOf.run(id), ROLES };
};
module.exports.isCaPath = isCaPath;
module.exports.can = can;
module.exports.ROLES = ROLES;
