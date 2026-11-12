// Anti-spam grup: banjir pesan, pesan kembar, mention massal, link jualan toko lain, undangan grup.
// Admin bot dan admin grup tidak pernah dikenai aturan. Tangga sanksi: peringatan 1, 2, lalu keluarkan.
const URL_RE = /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|id|co\.id|net|org|me|xyz|shop|store|link|site|online|app|io|info|ac\.id|my\.id|biz|cc|ly)(?:\/[^\s]*)?/gi;
const SELL_RE = /\b(jual|dijual|open\s*po|order|pesan\s+sekarang|diskon|promo|murah|harga|ready\s*stock|jasa|joki|cod|testimoni|racun|checkout|keranjang|garansi|bonus|cashback|komisi|reseller|dropship|slot\s+terbatas|dm\s+aja|wa\s+aja|hubungi)\b/i;
const INVITE_RE = /chat\.whatsapp\.com\/|t\.me\/|discord\.gg\//i;
export const DEFAULT_ALLOW = ["youtube.com", "youtu.be", "google.com", "docs.google.com", "drive.google.com", "meet.google.com", "forms.gle", "zoom.us", "ut.ac.id", "kemdikbud.go.id", "wikipedia.org", "catatanakademik.com", "nextaja.com"];

export const hostOf = u => { try { return new URL(/^https?:/i.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
export const linksIn = text => [...String(text || "").matchAll(URL_RE)].map(m => hostOf(m[0])).filter(Boolean);
const allowed = (host, list) => list.some(a => host === a || host.endsWith("." + a));

export function createAntispam({ db, cfg, now = () => Date.now() }) {
  const recent = new Map(); // chat|member -> [{t, text}]
  const getCfg = chat => db.prepare("SELECT * FROM group_cfg WHERE chat=?").get(chat) || { chat, antispam: 1, strict_links: 1, flood_limit: 6, allow_domains: "" };
  const setCfg = (chat, patch) => { const c = { ...getCfg(chat), ...patch }; db.prepare("INSERT INTO group_cfg(chat,antispam,strict_links,flood_limit,allow_domains) VALUES(?,?,?,?,?) ON CONFLICT(chat) DO UPDATE SET antispam=excluded.antispam,strict_links=excluded.strict_links,flood_limit=excluded.flood_limit,allow_domains=excluded.allow_domains").run(chat, c.antispam, c.strict_links, c.flood_limit, c.allow_domains); return c; };
  const allowList = c => [...DEFAULT_ALLOW, ...String(c.allow_domains || "").split(",").map(s => s.trim()).filter(Boolean)];

  /** Nilai satu pesan. Kembalikan null kalau aman, atau { reason, detail }. */
  function inspect(n) {
    const c = getCfg(n.chat); if (!c.antispam) return null;
    const t = now(), key = n.chat + "|" + n.sender;
    const arr = (recent.get(key) || []).filter(x => t - x.t < 60000); arr.push({ t, text: n.text }); recent.set(key, arr);
    if (arr.filter(x => t - x.t < 10000).length > c.flood_limit) return { reason: "flood", detail: "terlalu banyak pesan beruntun" };
    if (n.text && n.text.length > 8 && arr.filter(x => x.text === n.text).length >= 3) return { reason: "kembar", detail: "pesan yang sama diulang" };
    if (n.mentionCount >= 8) return { reason: "mention", detail: "menandai terlalu banyak orang" };
    const links = linksIn(n.text);
    if (INVITE_RE.test(n.text || "")) return { reason: "undangan", detail: "link undangan grup/channel lain" };
    const bad = links.filter(h => !allowed(h, allowList(c)));
    if (bad.length && SELL_RE.test(n.text)) return { reason: "jualan", detail: "link jualan (" + bad[0] + ")" };
    if (bad.length && c.strict_links && /\b(shopee|tokopedia|lazada|tiktok|bukalapak|blibli|linktr\.ee|bit\.ly|s\.id|wa\.me|shp\.ee)\b/i.test(bad.join(" "))) return { reason: "toko", detail: "link toko online (" + bad[0] + ")" };
    return null;
  }
  function strike(chat, member) {
    const t = now(), row = db.prepare("SELECT * FROM warnings WHERE chat=? AND member=?").get(chat, member);
    const count = (row && t - row.last_at < 7 * 86400e3 ? row.count : 0) + 1;
    db.prepare("INSERT INTO warnings(chat,member,count,last_at) VALUES(?,?,?,?) ON CONFLICT(chat,member) DO UPDATE SET count=excluded.count,last_at=excluded.last_at").run(chat, member, count, t);
    return count;
  }
  const clear = (chat, member) => db.prepare("DELETE FROM warnings WHERE chat=? AND member=?").run(chat, member);
  return { inspect, strike, clear, getCfg, setCfg, allowList };
}
