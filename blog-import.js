/* Impor artikel dari file Markdown (.md) menjadi draf blog.
   Format yang diterima:
     ---
     title: Judul artikel
     slug: judul-artikel            (opsional)
     meta_title: ...                (opsional, maks. 60 karakter disarankan)
     meta_description: ...          (opsional, maks. 155 karakter disarankan)
     tags: [tuton, uas ut]          (opsional, daftar atau dipisah koma)
     topic: study                   (opsional: study = Tips Kuliah UT, updateut = Info UT)
     keyword: kata kunci utama      (opsional, dicatat untuk pemeriksaan)
     excerpt: ringkasan             (opsional; bila kosong diambil dari paragraf pertama)
     ---
     isi artikel dalam Markdown
   Tanpa front matter: judul diambil dari baris "# Judul" pertama.
   Fungsi murni (tanpa berkas dan jaringan) supaya mudah diuji. Semua hasil impor SELALU berstatus draf. */
"use strict";

const ALIAS = {
  title: ["title", "judul"], slug: ["slug", "url"],
  metaTitle: ["meta_title", "metatitle", "seo_title", "meta-title"],
  metaDesc: ["meta_description", "metadescription", "meta_desc", "description", "deskripsi", "meta-description"],
  excerpt: ["excerpt", "ringkasan", "summary"], tags: ["tags", "tag", "label"],
  topic: ["topic", "kategori", "category"], keyword: ["keyword", "kata_kunci", "focus_keyword", "kata-kunci", "keywords"],
  author: ["author", "penulis"],
};
const keyOf = k => { k = String(k).trim().toLowerCase(); for (const [name, list] of Object.entries(ALIAS)) if (list.includes(k)) return name; return null; };
const unquote = v => { v = String(v).trim(); const m = /^(["'])([\s\S]*)\1$/.exec(v); return m ? m[2].replace(/\\"/g, '"') : v; };

/* Front matter sederhana: "kunci: nilai", daftar "[a, b]" atau baris "- a". Bukan YAML lengkap, dan itu disengaja. */
function parseFrontMatter(text) {
  const m = /^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!m) return { fm: {}, rest: text, had: false };
  const fm = {}; let last = null;
  for (const line of m[1].split("\n")) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && last && Array.isArray(fm[last])) { fm[last].push(unquote(item[1])); continue; }
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = keyOf(kv[1]); last = key; if (!key) continue;
    const val = kv[2].trim();
    if (val === "") fm[key] = [];
    else if (/^\[.*\]$/.test(val)) fm[key] = val.slice(1, -1).split(",").map(unquote).filter(Boolean);
    else fm[key] = unquote(val);
  }
  return { fm, rest: text.slice(m[0].length), had: true };
}

const plain = s => String(s || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>#]/g, "").replace(/\s+/g, " ").trim();

/* Membersihkan Markdown agar sesuai yang bisa ditampilkan renderer blog (tanpa garis pemisah, kode, atau judul tautan). */
function cleanMarkdown(body) {
  return String(body || "").replace(/^﻿/, "").replace(/\r/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "")        // garis pemisah ---, ***
    .replace(/\]\(([^)\s]+)\s+"[^"]*"\)/g, "]($1)")             // [teks](url "judul") -> [teks](url)
    .replace(/`([^`\n]+)`/g, "$1")                              // `kode` -> teks
    .replace(/__([^_\n]+)__/g, "**$1**")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function toTags(v) { return (Array.isArray(v) ? v : String(v || "").split(",")).map(s => String(s).trim()).filter(Boolean); }

/* name: nama berkas (cadangan judul). Hasil: { ok, error?, title, slug, body, excerpt, tags, topic, metaTitle, metaDesc, keyword, author } */
function parseMd(text, name = "") {
  text = String(text || "").replace(/^﻿/, "").replace(/\r/g, "");
  const { fm, rest } = parseFrontMatter(text);
  let body = rest, title = fm.title ? String(fm.title).trim() : "";
  const h1 = /^\s*#[ \t]+(.+?)[ \t]*(?:\n|$)/.exec(body);
  if (h1) { if (!title) title = h1[1].trim(); if (h1[1].trim().toLowerCase() === title.toLowerCase()) body = body.slice(h1[0].length); }
  if (!title) title = String(name).replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ").trim();
  body = cleanMarkdown(body);
  if (!title) return { ok: false, error: "Judul tidak ditemukan. Tulis `title:` di front matter atau baris `# Judul`." };
  if (plain(body).length < 80) return { ok: false, error: "Isi artikel kosong atau terlalu pendek." };
  const firstPara = body.split(/\n\s*\n/).map(plain).find(p => p && !/^\|/.test(p)) || "";
  return {
    ok: true, title, slug: fm.slug ? String(fm.slug) : "", body,
    excerpt: fm.excerpt ? plain(fm.excerpt) : firstPara.slice(0, 260),
    tags: toTags(fm.tags), topic: fm.topic ? String(fm.topic) : "", metaTitle: fm.metaTitle ? String(fm.metaTitle) : "",
    metaDesc: fm.metaDesc ? String(fm.metaDesc) : "", keyword: fm.keyword ? toTags(fm.keyword).join(", ") : "", author: fm.author ? String(fm.author) : "",
  };
}

const TOPIC_ALIAS = { study: "study", "tips kuliah ut": "study", "tips kuliah": "study", tips: "study", updateut: "updateut", "info ut": "updateut", info: "updateut", berita: "updateut" };
const topicKey = v => TOPIC_ALIAS[String(v || "").trim().toLowerCase()] || "";

/* Peringatan untuk diperiksa saat meninjau draf. Tidak menolak apa pun: draf tetap tersimpan. */
function checkDraft(d) {
  const w = [], body = d.body || "", words = (plain(body).match(/\S+/g) || []).length;
  if (words < 600) w.push(`Cukup pendek (${words} kata). Artikel yang menjawab tuntas biasanya lebih panjang.`);
  if (words >= 300 && !/^##\s+\S/m.test(body.replace(/^#\s+/gm, "## "))) w.push("Belum ada sub-judul H2. Wajib ada sebelum bisa diterbitkan.");
  if (!d.metaTitle) w.push("Meta title kosong."); else if (d.metaTitle.length > 60) w.push(`Meta title ${d.metaTitle.length} karakter (disarankan maks. 60).`);
  if (!d.metaDesc) w.push("Meta description kosong."); else if (d.metaDesc.length > 155) w.push(`Meta description ${d.metaDesc.length} karakter (disarankan maks. 155).`);
  if (d.title.length > 70) w.push(`Judul ${d.title.length} karakter, mungkin terpotong di Google.`);
  const bad = [...new Set((body + " " + d.title).match(/\b(garansi|jaminan|dijamin|pasti lolos|lolos turnitin|nilai aman|cum\s*laude)\b/gi) || [])];
  if (bad.length) w.push("Kata klaim yang dilarang: " + bad.join(", ") + ".");
  if (/\b(slot|kuota)\s+(tinggal|terbatas)|hanya\s+\d+\s+(slot|kuota)|terbatas\s+hari\s+ini/i.test(body)) w.push("Ada kesan kelangkaan palsu (slot atau kuota terbatas).");
  if (!/tidak\s+menjamin\s+nilai\s+atau\s+kelulusan/i.test(body)) w.push('Penafian "Kami tidak menjamin nilai atau kelulusan. Semangat!" belum ada.');
  if (!/\]\((?:\/|https?:\/\/(?:www\.)?catatanakademik\.com)[^)]*\)/i.test(body)) w.push("Belum ada tautan internal ke layanan Catatan Akademik.");
  if (!/\]\(https?:\/\/[^)]*\.ut\.ac\.id[^)]*\)|\]\(https?:\/\/(?:www\.)?ut\.ac\.id/i.test(body)) w.push("Belum ada tautan ke sumber resmi UT.");
  if (/<\/?[a-z][^>]*>/i.test(body)) w.push("Ada tag HTML. Di blog ini tag akan tampil sebagai teks biasa.");
  if (/\]\[[^\]]*\]/.test(body)) w.push("Tautan gaya referensi tidak didukung. Pakai [teks](url).");
  if (d.keyword) { const k = d.keyword.split(",")[0].trim().toLowerCase(); if (k && !d.title.toLowerCase().includes(k) && !(d.metaTitle || "").toLowerCase().includes(k)) w.push(`Kata kunci utama "${k}" tidak ada di judul maupun meta title.`); }
  return w;
}

/* files: [{name, text}]. ctx: pembantu dari blog-akun.js (uniqueSlug, slugify, cleanTags, str, newId, topics, allowedTopics, defaultTopic, author, by, now, existing).
   Mengembalikan { posts, results }: posts = objek tulisan baru (status draf) yang belum dimasukkan ke blog; results = laporan per file. */
function buildDrafts(files, ctx) {
  const posts = [], results = [], norm = t => String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
  const seen = new Set(ctx.existing.map(p => norm(p.title)));
  for (const f of files) {
    const name = ctx.str(f && f.name, 120) || "tanpa-nama.md", text = String((f && f.text) || "");
    if (!/\.(md|markdown|txt)$/i.test(name)) { results.push({ name, ok: false, error: "Hanya file .md." }); continue; }
    if (text.length > 120000) { results.push({ name, ok: false, error: "File terlalu besar." }); continue; }
    const d = parseMd(text, name);
    if (!d.ok) { results.push({ name, ok: false, error: d.error }); continue; }
    if (d.body.length > 60000) { results.push({ name, ok: false, error: "Isi lebih dari 60.000 karakter. Pecah jadi dua artikel." }); continue; }
    const title = ctx.str(d.title, 140);
    if (seen.has(norm(title))) { results.push({ name, ok: false, skipped: true, title, error: "Sudah ada artikel dengan judul yang sama, dilewati." }); continue; }
    seen.add(norm(title));
    const tk = topicKey(d.topic), topic = tk && ctx.topics[tk] && (!ctx.allowedTopics || ctx.allowedTopics.includes(tk)) ? tk : ctx.defaultTopic;
    const slug = ctx.uniqueSlug(ctx.slugify(d.slug || title)), taken = posts.some(p => p.slug === slug);
    const post = {
      id: ctx.newId(), slug: taken ? ctx.uniqueSlug(ctx.slugify((d.slug || title) + "-" + (posts.length + 2))) : slug, createdAt: ctx.now, author: ctx.str(d.author, 60) || ctx.author,
      title, topic, excerpt: ctx.str(d.excerpt, 260), body: d.body, cover: "", status: "draft", updatedAt: ctx.now, updatedBy: ctx.by + " (impor .md)",
      tags: ctx.cleanTags(d.tags), metaTitle: ctx.str(d.metaTitle, 70), metaDesc: ctx.str(d.metaDesc, 170),
    };
    if (d.keyword) post.keyword = ctx.str(d.keyword, 120);
    posts.push(post);
    results.push({ name, ok: true, id: post.id, title: post.title, slug: post.slug, words: (plain(d.body).match(/\S+/g) || []).length, warnings: checkDraft({ ...d, title }) });
  }
  return { posts, results };
}

module.exports = { buildDrafts, parseMd, parseFrontMatter, cleanMarkdown, checkDraft, topicKey };
