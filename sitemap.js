"use strict";
/* Generator sitemap.xml otomatis. Satu sumber kebenaran: dipakai route GET /sitemap.xml dan file fisik public/sitemap.xml.
   lastmod selalu dari data nyata (tanggal buat MK, tanggal ubah artikel, mtime file halaman), bukan tanggal hari ini. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FALLBACK_MOD = "2026-11-01"; // tanggal tetap bila data tidak punya tanggal; sengaja bukan new Date()
const TOOLS = new Set(["kelas-tuton", "bedah-data", "kalkulator-nilai-ut", "sampul-tugas-ut", "sampul-tugas", "blog-ut", "tutorial-online", "tracker-kelulusan", "kalender-akademik"]);

const xmlEscape = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const day = v => {
  if (v == null || v === "") return "";
  const d = typeof v === "number" ? new Date(v) : /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? new Date(String(v).slice(0, 10) + "T00:00:00Z") : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};
const maxDay = list => list.map(day).filter(Boolean).sort().pop() || "";

function create({ SITE, ACAD, extra, kisiList, pub, log = () => {} }) {
  const cache = new Map(); // mode -> { xml, etag, count }

  function entries(mode) {
    const base = mode === "acad" ? ACAD : SITE;
    const out = new Map(); // loc -> entry (dedupe, entri pertama menang)
    const add = (loc, pri, freq, lastmod) => { if (loc && !out.has(loc)) out.set(loc, { loc, pri, freq, lastmod: day(lastmod) || FALLBACK_MOD }); };

    let mk = [];
    try { mk = kisiList() || []; } catch (e) { log("kisiList gagal: " + e.message); }
    const mkMod = maxDay(mk.map(m => m.dibuat));

    let pages = [], blog = [];
    try { pages = ACAD === SITE || mode === "acad" ? extra.pageUrls() : []; } catch (e) { log("pageUrls gagal: " + e.message); }
    try { blog = ACAD === SITE || mode === "acad" ? extra.blogUrls() : []; } catch (e) { log("blogUrls gagal: " + e.message); }
    const blogMod = maxDay(blog.map(b => b.lastmod));

    // 1. Beranda
    const isHome = p => p.loc === `${SITE}/` || p.loc === `${base}/`;
    const home = pages.find(isHome);
    add(`${mode === "acad" ? base : SITE}/`, "1.0", "daily", home && home.lastmod || blogMod || mkMod);
    if (mode !== "acad" && ACAD !== SITE) return [...out.values()];

    // 2. Kisi-kisi
    if (mk.length) add(`${base}/kisi-kisi`, "0.9", "daily", mkMod);
    // 3. Halaman alat / layanan statis
    for (const p of pages) {
      if (isHome(p)) continue;
      const seg = p.loc.replace(/\/+$/, "").split("/").pop();
      if (/\/kisi-kisi$/.test(p.loc)) continue; // sudah ditulis di atas
      add(p.loc, TOOLS.has(seg) ? "0.8" : p.pri || "0.7", "weekly", p.lastmod);
    }
    // 4. Indeks huruf
    const byLetter = new Map();
    for (const m of mk) {
      const c = String(m.nama || "").trim().charAt(0).toUpperCase();
      const l = /[A-Z]/.test(c) ? c : "Z";
      byLetter.set(l, [...(byLetter.get(l) || []), m.dibuat]);
    }
    for (const l of [...byLetter.keys()].sort()) add(`${base}/kisi-kisi/indeks/${l.toLowerCase()}`, "0.8", "weekly", maxDay(byLetter.get(l)));
    // 5. Halaman MK
    for (const m of mk) if (m.slug) add(`${base}/kisi-kisi/${m.slug}`, "0.7", "monthly", m.dibuat);
    // 6. Artikel blog
    add(`${base}/blog`, "0.8", "daily", blogMod);
    for (const b of blog) add(b.loc, "0.7", "weekly", b.lastmod);
    return [...out.values()];
  }

  function render(mode) {
    const list = entries(mode);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      list.map(u => `  <url><loc>${xmlEscape(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join("\n") + `\n</urlset>\n`;
    return { xml, etag: '"' + crypto.createHash("sha1").update(xml).digest("hex").slice(0, 16) + '"', count: list.length };
  }

  /* Bangun ulang semua varian, simpan di memori, dan tulis file fisik (atomik) untuk host utama. */
  function generateSitemap() {
    for (const mode of ACAD === SITE ? ["site"] : ["site", "acad"]) cache.set(mode, render(mode));
    const main = cache.get(ACAD === SITE ? "site" : "acad");
    try {
      const file = path.join(pub, "sitemap.xml"), tmp = file + ".tmp";
      fs.writeFileSync(tmp, main.xml); fs.renameSync(tmp, file);
    } catch (e) { log("tulis sitemap.xml gagal: " + e.message); }
    return main.count;
  }

  let timer = null;
  const schedule = (ms = 3000) => { clearTimeout(timer); timer = setTimeout(() => { try { generateSitemap(); } catch (e) { log("generate gagal: " + e.message); } }, ms); if (timer.unref) timer.unref(); };

  function serve(isAcadHost) {
    return (req, res) => {
      const mode = ACAD !== SITE && isAcadHost(req) ? "acad" : "site";
      if (!cache.has(mode)) generateSitemap();
      const c = cache.get(mode);
      res.set({ ETag: c.etag, "Cache-Control": "public, max-age=600" });
      if (req.headers["if-none-match"] === c.etag) return res.status(304).end();
      res.type("application/xml").send(c.xml);
    };
  }

  return { generateSitemap, schedule, serve, xmlEscape, entries };
}

module.exports = { create, xmlEscape, day };
