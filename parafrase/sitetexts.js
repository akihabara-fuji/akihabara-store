/* Kamus teks situs akademik: admin mengganti teks halaman publik (nama menu, nama dan deskripsi kartu layanan, judul, FAQ)
   dari panel, tanpa mengubah HTML dan tanpa membuka VPS.

   Cara kerja: server memindai teks polos di halaman publik (pages/*.html). Kunci = teks asli yang dirapikan spasinya, berlaku GLOBAL:
   mengganti "Metopen" mengubah semua teks yang persis "Metopen" (mis. menu di setiap halaman). Penggantian dilakukan di server saat
   halaman dikirim (bukan skrip), jadi Google dan pengunjung langsung melihat teks baru. Semua keluaran di-escape.

   Yang TIDAK bisa diubah di sini (sengaja): teks yang dibuat skrip di browser, isi elemen ber-id atau ber-data-* (diisi skrip,
   mis. harga), isi <script> dan <style>, dan teks artikel blog. Elemen tersebut dilewati agar halaman tidak rusak. */
"use strict";
const fs = require("fs");
const path = require("path");

const PAGES = {
  "beranda.html": "Beranda (landing)",
  "hub.html": "Halaman Layanan UT",
  "cek.html": "Cek & Parafrase Mandiri",
  "audit.html": "Audit Dokumen",
  "audit-hasil.html": "Hasil Audit Lengkap",
  "layanan.html": "Form Tugas, Diskusi, Metopen, Revisi",
  "pesanan.html": "Cek Pesanan",
  "blog-ut.html": "Halaman blog",
  "alat-nilai.html": "Kalkulator Nilai UT",
  "alat-pasfoto.html": "Pasfoto Yudisium",
  "alat-cv.html": "Buat CV ATS",
  "alat-sampul.html": "Sampul dan Template Tugas UT",
  "alat-surat.html": "Surat Lamaran Kerja",
  "alat-tracker.html": "Tracker Kelulusan dan IPK",
  "alat-kalender.html": "Kalender dan Pengingat Akademik",
  "panduan-maba.html": "Panduan Maba UT",
  "portal-ut.html": "Portal UT",
};
const EXTRA_PAGE = "Blog dan akun (menu & footer)";
const META_KEYS = new Set(["description", "og:title", "og:description", "twitter:title", "twitter:description"]);
const MAX = 400, MIN_KEY = 3;

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', nbsp: " ", middot: "·", times: "×", hellip: "…", ndash: "–", mdash: "—", rarr: "→", larr: "←" };
const decode = s => String(s).replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, d, h, n) => (d ? String.fromCodePoint(+d) : h ? String.fromCodePoint(parseInt(h, 16)) : (NAMED[n.toLowerCase()] != null ? NAMED[n.toLowerCase()] : m)));
const encode = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = s => decode(s).replace(/\s+/g, " ").trim();
const clean = v => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

/* urutan: bagian yang dilindungi | tag | teks */
const TOKEN = /(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<textarea\b[\s\S]*?<\/textarea>)|(<[^>]*>)|([^<]+)/gi;
/* teks hanya boleh diganti bila tag pembuka sebelumnya bukan elemen yang diisi skrip */
const editableAfter = tag => /^<[a-z]/i.test(tag) && !/\s(?:data-|id\s*=)/i.test(tag);
const isCandidate = k => k.length >= MIN_KEY && k.length <= 500 && /\p{L}/u.test(k);
const metaName = tag => { const m = tag.match(/\b(?:name|property)\s*=\s*"([^"]+)"/i); return m && META_KEYS.has(m[1].toLowerCase()) ? m[1].toLowerCase() : null; };

module.exports = function createTexts({ db, dir }) {
  const q = {
    all: db.prepare("SELECT orig, value, updated_by, updated_at FROM site_texts"),
    up: db.prepare("INSERT INTO site_texts(orig,value,updated_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(orig) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at"),
    del: db.prepare("DELETE FROM site_texts WHERE orig=?"),
    one: db.prepare("SELECT value FROM site_texts WHERE orig=?"),
    log: db.prepare("INSERT INTO site_texts_log(orig,old_value,new_value,by,at) VALUES(?,?,?,?,?)"),
    recent: db.prepare("SELECT orig, old_value, new_value, by, at FROM site_texts_log ORDER BY id DESC LIMIT ?"),
  };
  let map = null; const load = () => map || (map = new Map(q.all.all().map(r => [r.orig, r.value])));
  const extras = new Set();
  const registerExtra = list => { for (const s of list) { const k = norm(s); if (isCandidate(k)) extras.add(k); } };

  /* ---------- terapkan penggantian pada HTML ---------- */
  function apply(html, over = null, opts = {}) {
    const m = over || load();
    if (!m.size && !opts.edit) return html;
    let last = "";
    return String(html).replace(TOKEN, (all, prot, tag, text) => {
      if (prot) return all;
      if (tag) {
        last = tag;
        if (!/^<meta\b/i.test(tag) || !metaName(tag)) return tag;
        return tag.replace(/\bcontent\s*=\s*"([^"]*)"/i, (c, v) => { const k = norm(v); return m.has(k) ? `content="${encode(m.get(k))}"` : c; });
      }
      if (!editableAfter(last)) return all;
      const k = norm(text);
      if (opts.edit && isCandidate(k) && !/^<(?:title|option)\b/i.test(last)) {
        const lead0 = text.match(/^\s*/)[0], trail0 = text.match(/\s*$/)[0], shown = m.has(k) ? m.get(k) : k;
        return lead0 + `<span data-ed="${encode(k)}" class="ed-t">${encode(shown)}</span>` + trail0;
      }
      if (!isCandidate(k) || !m.has(k)) return all;
      const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], val = encode(m.get(k));
      return lead + (opts.mark === k ? `<mark style="background:#ffe066;color:#111;padding:0 2px;border-radius:3px">${val}</mark>` : val) + trail;
    });
  }

  /* ---------- pindai semua teks yang bisa diubah ---------- */
  let cache = { sig: "", items: [] };
  function scan() {
    const files = Object.keys(PAGES).filter(f => fs.existsSync(path.join(dir, f)));
    const sig = files.map(f => fs.statSync(path.join(dir, f)).mtimeMs).join("|") + "#" + extras.size;
    if (cache.sig === sig) return cache.items;
    const seen = new Map();
    const add = (k, label) => { if (!isCandidate(k)) return; const e = seen.get(k) || { orig: k, count: 0, pages: new Set() }; e.count++; e.pages.add(label); seen.set(k, e); };
    for (const f of files) {
      let last = "";
      fs.readFileSync(path.join(dir, f), "utf8").replace(TOKEN, (all, prot, tag, text) => {
        if (prot) return all;
        if (tag) { last = tag; if (/^<meta\b/i.test(tag) && metaName(tag)) { const c = tag.match(/\bcontent\s*=\s*"([^"]*)"/i); if (c) add(norm(c[1]), PAGES[f]); } return all; }
        if (editableAfter(last)) add(norm(text), PAGES[f]);
        return all;
      });
    }
    for (const k of extras) add(k, EXTRA_PAGE);
    cache = { sig, items: [...seen.values()].map(e => ({ orig: e.orig, count: e.count, pages: [...e.pages] })) };
    return cache.items;
  }
  const known = k => scan().some(x => x.orig === k);

  /* ---------- ubah, kembalikan, riwayat ---------- */
  function validate(value) {
    const v = clean(value);
    if (!v) throw Object.assign(new Error("Teks pengganti tidak boleh kosong. Pakai tombol Kembalikan untuk memakai teks bawaan."), { status: 400 });
    if (v.length > MAX) throw Object.assign(new Error(`Teks terlalu panjang (maksimal ${MAX} karakter).`), { status: 400 });
    if (/[<>]/.test(v)) throw Object.assign(new Error("Tulis teks biasa saja, tanpa tanda < atau >."), { status: 400 });
    return v;
  }
  function set(orig, value, by) {
    const k = norm(orig);
    if (!known(k)) throw Object.assign(new Error("Teks ini tidak dikenal di halaman publik (mungkin sudah berubah). Muat ulang daftar."), { status: 404 });
    const v = validate(value);
    if (v === k) return reset(k, by);
    const old = (q.one.get(k) || {}).value ?? null;
    if (old === v) return { ok: true, unchanged: true };
    db.transaction(() => { q.up.run(k, v, by || "admin", Date.now()); q.log.run(k, old, v, by || "admin", Date.now()); })();
    map = null; return { ok: true };
  }
  function reset(orig, by) {
    const k = norm(orig), old = (q.one.get(k) || {}).value ?? null;
    if (old == null) return { ok: true, unchanged: true };
    db.transaction(() => { q.del.run(k); q.log.run(k, old, null, by || "admin", Date.now()); })();
    map = null; return { ok: true };
  }
  function list() {
    const m = load(), meta = new Map(q.all.all().map(r => [r.orig, r]));
    const items = scan().map(x => ({ ...x, value: m.get(x.orig) ?? null, by: meta.get(x.orig) ? meta.get(x.orig).updated_by : null, at: meta.get(x.orig) ? meta.get(x.orig).updated_at : null }));
    // teks yang pernah diubah tetapi sudah tidak ada di halaman (HTML berubah): tetap ditampilkan agar bisa dibersihkan
    const orphans = [...m.keys()].filter(k => !items.some(i => i.orig === k)).map(k => ({ orig: k, count: 0, pages: [], value: m.get(k), orphan: true }));
    return { items: items.concat(orphans), pages: Object.values(PAGES).concat(EXTRA_PAGE) };
  }

  /* ---------- kartu layanan di halaman hub ---------- */
  const CARD = /<article\b[^>]*\bdata-slug="([a-z_]+)"[^>]*>([\s\S]*?)<\/article>/g;
  function hideCards(html, slugs) {
    const hide = new Set((slugs || []).filter(s => /^[a-z_]+$/.test(s)));
    return hide.size ? String(html).replace(CARD, (all, slug) => (hide.has(slug) ? "" : all)) : html;
  }
  function cards() {
    const f = path.join(dir, "hub.html"); if (!fs.existsSync(f)) return [];
    const out = [];
    for (const m of fs.readFileSync(f, "utf8").matchAll(CARD)) { const t = m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/i); out.push({ slug: m[1], title: t ? norm(t[1].replace(/<[^>]+>/g, "")) : m[1] }); }
    return out;
  }

  return { PAGES, apply, scan, list, set, reset, log: (n = 50) => q.recent.all(Math.min(200, n)), hideCards, cards, registerExtra, norm, load, MAX };
};
module.exports.norm = norm;
