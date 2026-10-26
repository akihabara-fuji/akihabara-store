/* Statistik pengunjung milik sendiri, tanpa cookie dan tanpa menyimpan IP.
   - Pengunjung unik per hari = hash(garam + hari + IP + browser) yang berganti tiap hari, jadi tidak bisa dilacak antarhari.
   - Yang disimpan hanya: hari, jalur halaman, jumlah tampilan, hash harian, dan sumber (Google, WhatsApp, Langsung, dst).
   - Bot, kunjungan admin, sinyal Do Not Track/GPC, dan halaman bertoken rahasia tidak dihitung. */
"use strict";
const crypto = require("crypto");

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|python|curl|wget|monitor|uptime|axios|node-fetch|go-http|java\//i;
const SKIP = /^\/(admin|admin-ca|ms|uploads|t\.js|favicon|robots|sitemap|google|bingsiteauth|ruangakademikut\/assets|assets\/ut)/i;
const WIB = 7 * 3600e3;
const dayOf = ms => new Date(ms + WIB).toISOString().slice(0, 10);

/* Jalur dinormalkan: huruf kecil, tanpa query dan garis miring akhir, token rahasia jadi *. */
function normPath(p) {
  let s = String(p || "/").split("?")[0];
  try { s = decodeURI(s); } catch {}
  s = s.toLowerCase().replace(/\/+$/, "").replace(/\/[a-f0-9]{32,}(?=\/|$)/g, "/*");
  return (s || "/").slice(0, 120);
}
const GROUPS = [
  ["Blog dan artikel", /^\/(blog|ruangakademikut\/blog-ut)/],
  ["Alat gratis", /\/(kalkulator-nilai-ut|pasfoto-yudisium|buat-cv-ats|sampul-tugas|surat-lamaran|tracker-kelulusan|kalender-akademik|panduan-maba|sitasi-apa)/],
  ["Cek & Parafrase", /cek-parafrase-mandiri/],
  ["Audit Dokumen", /\/audit/],
  ["Layanan dan pesan", /\/(layanan|layanan-ut|pesanan|koin|beranda)|^\/ruangakademikut$/],
];
const groupOf = p => (GROUPS.find(([, re]) => re.test(p)) || ["Lainnya"])[0];

function refOf(req) {
  const r = String(req.headers.referer || req.headers.referrer || "").trim();
  if (!r) return "Langsung";
  let h = ""; try { h = new URL(r).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "Langsung"; }
  const me = String(req.hostname || "").toLowerCase().replace(/^www\./, "");
  if (h === me) return null; // pindah halaman di situs sendiri: bukan sumber baru
  if (/(^|\.)google\./.test(h)) return "Google";
  if (/bing\.com$/.test(h)) return "Bing";
  if (/duckduckgo\.com$/.test(h)) return "DuckDuckGo";
  if (/(facebook|fb)\.com$|^l\.facebook|^lm\.facebook/.test(h)) return "Facebook";
  if (/instagram\.com$/.test(h)) return "Instagram";
  if (/tiktok\.com$/.test(h)) return "TikTok";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(h)) return "WhatsApp";
  if (/(t\.co|twitter\.com|x\.com)$/.test(h)) return "X";
  if (/youtube\.com$|youtu\.be$/.test(h)) return "YouTube";
  if (/(t\.me|telegram\.org)$/.test(h)) return "Telegram";
  return h.slice(0, 40);
}

function create(db, { secret = "ca", now = () => Date.now() } = {}) {
  const addView = db.prepare("INSERT INTO pv_day(day,path,views) VALUES(?,?,1) ON CONFLICT(day,path) DO UPDATE SET views=views+1");
  const addUniq = db.prepare("INSERT OR IGNORE INTO pv_uniq(day,path,vh) VALUES(?,?,?)");
  const addRef = db.prepare("INSERT INTO pv_ref(day,ref,views) VALUES(?,?,1) ON CONFLICT(day,ref) DO UPDATE SET views=views+1");
  let lastPurge = "";

  /* Dipanggil setelah respons selesai. Mengembalikan true bila dicatat. */
  function record(req, res) {
    if (req.method !== "GET" || res.statusCode !== 200) return false;
    if (!String(res.getHeader("content-type") || "").includes("text/html")) return false;
    if (SKIP.test(req.path)) return false;
    const ua = String(req.headers["user-agent"] || ""); if (!ua || BOT.test(ua)) return false;
    if (req.headers.dnt === "1" || req.headers["sec-gpc"] === "1") return false;
    if (/(^|;\s*)(ca_admin|nx_admin)=/.test(String(req.headers.cookie || ""))) return false; // kunjungan admin sendiri
    const t = now(), day = dayOf(t), path = normPath(req.path);
    const vh = crypto.createHash("sha256").update(secret + "|" + day + "|" + (req.ip || "") + "|" + ua).digest("hex").slice(0, 16);
    db.transaction(() => {
      addView.run(day, path); addView.run(day, "*");
      addUniq.run(day, path, vh); addUniq.run(day, "*", vh);
      const ref = refOf(req); if (ref) addRef.run(day, ref);
      if (lastPurge !== day) { lastPurge = day; db.prepare("DELETE FROM pv_uniq WHERE day<?").run(dayOf(t - 40 * 86400e3)); db.prepare("DELETE FROM pv_day WHERE day<?").run(dayOf(t - 800 * 86400e3)); db.prepare("DELETE FROM pv_ref WHERE day<?").run(dayOf(t - 800 * 86400e3)); }
    })();
    return true;
  }

  /* Ringkasan untuk panel admin. label(path) boleh mengembalikan nama tampil (mis. judul artikel). */
  function summary(days = 30, label = () => null) {
    days = Math.min(Math.max(Number(days) || 30, 1), 400);
    const t = now(), from = dayOf(t - (days - 1) * 86400e3), to = dayOf(t);
    const g = (sql, ...a) => db.prepare(sql).all(...a);
    const series = {}; for (let i = days - 1; i >= 0; i--) series[dayOf(t - i * 86400e3)] = { day: dayOf(t - i * 86400e3), views: 0, visitors: 0 };
    g("SELECT day, views FROM pv_day WHERE path='*' AND day BETWEEN ? AND ?", from, to).forEach(r => { if (series[r.day]) series[r.day].views = r.views; });
    g("SELECT day, COUNT(*) n FROM pv_uniq WHERE path='*' AND day BETWEEN ? AND ? GROUP BY day", from, to).forEach(r => { if (series[r.day]) series[r.day].visitors = r.n; });
    const uniq = g("SELECT path, COUNT(*) n FROM pv_uniq WHERE path<>'*' AND day BETWEEN ? AND ? GROUP BY path", from, to), un = Object.fromEntries(uniq.map(r => [r.path, r.n]));
    const pages = g("SELECT path, SUM(views) v FROM pv_day WHERE path<>'*' AND day BETWEEN ? AND ? GROUP BY path ORDER BY v DESC LIMIT 60", from, to)
      .map(r => ({ path: r.path, label: label(r.path), group: groupOf(r.path), views: r.v, visitors: un[r.path] || 0 }));
    const groups = {}; g("SELECT path, SUM(views) v FROM pv_day WHERE path<>'*' AND day BETWEEN ? AND ? GROUP BY path", from, to).forEach(r => { const k = groupOf(r.path); groups[k] = (groups[k] || 0) + r.v; });
    const sum = k => Object.values(series).reduce((a, x) => a + x[k], 0);
    const last = n => Object.values(series).slice(-n).reduce((a, x) => ({ views: a.views + x.views, visitors: a.visitors + x.visitors }), { views: 0, visitors: 0 });
    return {
      from, to, days, series: Object.values(series), today: series[to] || { views: 0, visitors: 0 }, last7: last(7),
      total: { views: sum("views"), visitors: sum("visitors") },
      pages, groups: Object.entries(groups).map(([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views),
      refs: g("SELECT ref, SUM(views) v FROM pv_ref WHERE day BETWEEN ? AND ? GROUP BY ref ORDER BY v DESC LIMIT 12", from, to).map(r => ({ ref: r.ref, views: r.v })),
      note: "Pengunjung dihitung per hari (orang yang sama di hari berbeda dihitung lagi). Tanpa cookie dan tanpa menyimpan IP. Bot dan kunjungan admin tidak dihitung.",
    };
  }
  return { record, summary };
}

module.exports = { create, normPath, groupOf, refOf, dayOf };
