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

/* Blok label gaya "**Slug:** isi" di awal file (format draf Hermes), baik sebelum maupun sesudah judul "# ...".
   Barisnya diambil sebagai metadata lalu dibuang dari isi supaya tidak tampil di artikel. Hanya label yang dikenal. */
const LABELS = [
  [/^slug$/i, "slug"], [/^(meta[ _-]?title|seo[ _-]?title)$/i, "metaTitle"], [/^meta[ _-]?description$/i, "metaDesc"],
  [/^kata[ _-]?kunci[ _-]?utama$/i, "keyword"], [/^kata[ _-]?kunci[ _-]?turunan$/i, "derived"],
  [/^tags?$/i, "tags"], [/^(topik|topic|kategori)$/i, "topic"],
];
/* Label yang dikenali tetapi tidak dipakai: dibuang dari isi supaya tidak tampil di artikel. */
const IGNORED = /^(meta[ _-]?(title|description)[ _-]?length|status|alt[ _-]?text[^:]*|jumlah[ _-]?kata|panjang[^:]*|tanggal[^:]*|penulis|author|kategori[ _-]?konten)$/i;
function takeLabelHeader(body) {
  const out = {}; let rest = body, found = false;
  for (;;) {
    // "**Slug:** isi", "- **Slug:** isi", "Slug: isi"; label boleh diberi keterangan "(59 karakter)"
    const m = /^\s*(?:[-*]\s+)?(?:\*\*([^*\n:]{2,48}?)(?:\s*\([^)\n]*\))?\s*:\*\*|([A-Za-z][A-Za-z _-]{2,30}?)(?:\s*\([^)\n]*\))?\s*:)[ \t]*(.*?)[ \t]*(?:\n|$)/.exec(rest);
    if (!m) break;
    const label = (m[1] || m[2]).trim(), val = m[3];
    const hit = LABELS.find(([re]) => re.test(label));
    if (hit) out[hit[1]] = unquote(val.replace(/`/g, ""));
    else if (!IGNORED.test(label)) break;
    found = true; rest = rest.slice(m[0].length);
  }
  return { meta: out, body: found ? rest : body, found };
}

/* ---------- Draf gaya Hermes yang berantakan ----------
   1) teks rusak karakter (UTF-8 terbaca sebagai Latin-1, mis. "â€”") diperbaiki;
   2) penanda kerangka "# [H1 — JUDUL]", "## [METADATA SEO]", "## [H2 — ...]", "## [CTA ...]", "## [SUMBER RESMI]" diubah jadi Markdown biasa;
   3) bagian internal (Audit Lessons, Hasil Audit Otomatis, Tautan Internal, Kanal Sosial, Gabung komunitas) dibuang dari isi,
      kalimat penafian di dalamnya dipertahankan. Hasilnya dilaporkan di notes agar editor tahu apa yang berubah. */
const DISCLAIMER = "Catatan Akademik bukan situs resmi Universitas Terbuka. Kami tidak menjamin nilai atau kelulusan. Semangat!";
function fixMojibake(text) {
  return String(text || "").replace(/[\u00c2-\u00f4][\u0080-\u00bf]{1,3}/g, m => { try { const r = Buffer.from(m, "latin1").toString("utf8"); return r.includes("\ufffd") ? m : r; } catch { return m; } });
}
const ACR = new Set(["UT", "UAS", "UTS", "IPK", "IPS", "TMK", "TTM", "TAPS", "DOI", "MYUT", "APA", "KTPU", "UTM", "UO", "THE", "LKAM", "DNU", "TUTON", "TUWEB", "PRATON", "METOPEN", "H1", "H2", "H3", "SKS", "UPBJ", "PDF", "WA"]);
const ACR_FIX = { MYUT: "MyUT", TUTON: "Tuton", TUWEB: "Tuweb", PRATON: "Praton", METOPEN: "Metopen" };
function senCase(t) {
  t = String(t).trim(); if (/[a-z]/.test(t)) return t;                       // sudah campuran huruf: biarkan
  const parts = t.toLowerCase().split(/(\s+)/);
  const w = parts.map((x, i) => {
    const m = /^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u.exec(x); if (!m) return x;
    const u = m[2].toUpperCase(); if (!ACR.has(u)) return x;
    // "APA" di awal kalimat tanya ("Apa itu IPK?") bukan gaya sitasi; huruf besar hanya bila diikuti angka/edisi/gaya
    if (u === "APA" && !/^(?:\d|edisi|style|gaya|7)/.test((parts[i + 2] || "").trim())) return x;
    return m[1] + (ACR_FIX[u] || u) + m[3];
  }).join("");
  return w.charAt(0).toUpperCase() + w.slice(1);
}
const DROP_H2 = /^(audit lessons|hasil audit|self[- ]?check|tautan internal|tautan & anchor|kanal sosial|gabung komunitas|blok komunitas|catatan (editor|internal|untuk admin|yang harus dicek)|gambar & alt text|alt text|metadata seo|catatan audit|temuan audit|audit (?:otomatis|teknis)|template komunitas|disclaimer|rekomendasi gambar|gambar utama)\b|gambar(?: dan alt text)?$|\((untuk admin|tempel)/i;
/* Baris kosong di antara baris tabel memutus tabel Markdown (tampil sebagai teks mentah): rapatkan. */
const fixTables = t => String(t).replace(/(^\|[^\n]*\|[ \t]*)\n(?:[ \t]*\n)+(?=\|)/gm, "$1\n");
/* Gabungkan semua bagian "Sumber" jadi satu daftar tanpa duplikat. Alamat catatanakademik.com bukan sumber rujukan (itu tautan layanan kita) dan dibuang dari daftar. */
function mergeSumber(t) {
  const parts = String(t).split(/^(?=##[ \t]+[^#\n])/m), isS = s => /^##[ \t]+Sumber[ \t]*$/im.test(s.split("\n")[0] || "");
  if (parts.filter(isS).length === 0) return t;
  const seen = new Set(), items = [], key = u => u.toLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/[\/#?]+$/, "");
  for (const sec of parts.filter(isS)) for (const raw of sec.split("\n").slice(1)) {
    const l = raw.trim().replace(/^(?:[-*]|\d{1,2}[.)]|\[\d{1,2}\])\s+/, ""); if (!l) continue;
    let title = "", url = "", m;
    if ((m = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(l))) { title = m[1]; url = m[2]; }
    else if ((m = /^(https?:\/\/\S+)\s*(?:[—–-]+\s*(.*))?$/.exec(l))) { url = m[1]; title = (m[2] || "").trim() || url; }
    else { const k = "t:" + l.toLowerCase(); if (!seen.has(k)) { seen.add(k); items.push("- " + l); } continue; }
    if (/catatanakademik\.com/i.test(url) || seen.has(key(url))) continue;
    seen.add(key(url)); items.push(`- [${title}](${url})`);
  }
  let placed = false; const out = [];
  for (const sec of parts) {
    if (!isS(sec)) { out.push(sec); continue; }
    if (!placed && items.length) { out.push("## Sumber\n\n" + items.join("\n") + "\n\n"); placed = true; }
  }
  return out.join("").replace(/\n{3,}/g, "\n\n");
}
function hermesClean(text) {
  const notes = []; let t = fixMojibake(text); if (t !== text) notes.push("Karakter rusak diperbaiki.");
  t = t.replace(/\r/g, "");
  // judul kerangka
  t = t.replace(/^(\s*)#[ \t]*\[H1[^\]\n]*\][ \t]*\n+([^\n#][^\n]*)\n/, (m, a, title) => { notes.push("Penanda [H1] diganti judul."); return `# ${title.trim()}\n`; });
  // bagian metadata kerangka -> baris label tepat setelah judul
  let metaLines = "";
  t = t.replace(/^##[ \t]*\[METADATA[^\]\n]*\][ \t]*\n([\s\S]*?)(?=^##[ \t]|(?![\s\S]))/m, (m, blk) => { metaLines = blk.split("\n").filter(l => /^\s*[-*]\s+\*\*[^*]+:\*\*/.test(l)).join("\n"); notes.push("Bagian metadata kerangka dibaca lalu dibuang dari isi."); return ""; });
  if (metaLines) t = /^\s*#[ \t]+[^\n]+\n/.test(t) ? t.replace(/^(\s*#[ \t]+[^\n]+\n)/, `$1\n${metaLines}\n\n`) : `${metaLines}\n\n${t}`;
  // penanda judul bagian
  t = t.replace(/^(#{2,4})[ \t]*\[(H[2-4])[ \t]*[—–-]+[ \t]*([^\]\n]+)\][ \t]*$/gm, (m, h, lv, txt) => { notes.push("Penanda [" + lv + "] diganti judul."); return "#".repeat(Number(lv[1])) + " " + senCase(txt); });
  t = t.replace(/^##[ \t]*\[CTA[^\]\n]*\][ \t]*$/gm, "## Langkah berikutnya");
  t = t.replace(/^##[ \t]*\[SUMBER[^\]\n]*\][ \t]*$/gm, "## Sumber");
  t = t.replace(/^##[ \t]*Sources[ \t]*$/gm, "## Sumber");
  t = t.replace(/^#{1,3}[ \t]*\[[A-Z][^\]\n]{2,60}\][ \t]*\n?/gm, "");        // penanda lain (mis. [PEMBUKA — JAWABAN LANGSUNG]) dibuang
  // buang bagian internal; simpan kalimat penafian
  let disclaimer = "";
  const parts = t.split(/^(?=##[ \t]+[^#\n])/m), keep = [];
  for (const sec of parts) {
    const h = /^##[ \t]+([^\n]+)/.exec(sec);
    if (h && DROP_H2.test(h[1].replace(/[*`]/g, "").trim())) {
      const d = /Catatan Akademik bukan situs resmi[^\n]*/.exec(sec); if (d) disclaimer = d[0].replace(/^[>\s*]+/, "").replace(/\*+/g, "").trim();
      notes.push("Bagian internal dibuang: " + h[1].replace(/[*`]/g, "").trim().slice(0, 50)); continue;
    }
    keep.push(sec);
  }
  t = keep.join("");
  { const c = (t.match(/\s*\[unverified\]/gi) || []).length; if (c) { t = t.replace(/[ \t]*\[unverified\]/gi, ""); notes.push(`Penanda [unverified] dibuang (${c} tempat). Kalimat itu belum terverifikasi oleh penulis aslinya: baca ulang sebelum terbit.`); } }
  { const n1 = t; t = fixTables(t); if (t !== n1) notes.push("Tabel yang terputus baris kosong dirapikan."); }
  { const n1 = t; t = t.split("\n").filter(l => !INTERNAL_LINE.test(l)).join("\n"); if (t !== n1) notes.push("Baris Gambar/Alt text/catatan pemilik dibuang."); }
  { const n0 = t; t = mergeSumber(t); if (t !== n0) notes.push("Bagian Sumber ganda digabung jadi satu daftar."); }
  // baris placeholder dan catatan untuk admin dibuang; judul yang jadi kosong ikut dibuang
  const before = t;
  t = t.split("\n").filter(l => !/DATA BELUM TERSEDIA|Catatan untuk Admin|Kanal sosial terverifikasi/i.test(l)).join("\n");
  t = t.replace(/^(#{2,4}[ \t]+[^\n]+)\n+(?=#{1,4}[ \t]|(?![\s\S]))/gm, "");
  if (t !== before) notes.push("Baris placeholder (DATA BELUM TERSEDIA / catatan admin) dibuang.");
  // kalimat catatan internal yang terselip di paragraf
  t = t.replace(/ dan jelaskan bagian yang sudah tersedia/g, "").replace(/;\s*cakupan final perlu dikonfirmasi kepada admin\./g, ".");
  // penanda kutipan sisa alat riset, mis. "...sendiri.[2][4][5]" (tanpa daftar rujukan, hanya mengganggu pembaca)
  const t0 = t; t = t.replace(/(?:\[\d{1,2}\])+(?=[\s.,;:)]|$)/g, ""); if (t !== t0) notes.push("Penanda kutipan [1][2] sisa alat riset dibuang.");
  // tautan: awalan lama /ruangakademikut/ dan dua alamat yang tidak ada
  t = t.replace(/https?:\/\/(?:www\.)?catatanakademik\.com\/ruangakademikut\//g, "https://catatanakademik.com/")
       .replace(/https?:\/\/(?:www\.)?catatanakademik\.com\/layanan-ut\/metopen\b/g, "https://catatanakademik.com/layanan?s=metopen_paket")
       .replace(/https?:\/\/(?:www\.)?catatanakademik\.com\/layanan-ut\/tugas-diskusi\b/g, "https://catatanakademik.com/layanan?s=tugas");
  // tautan telanjang <https://...> -> [teks](url)
  t = t.replace(/^(\s*[-*]\s+)\*\*([^*\n]+)\*\*\s*(?:→|->|—|-)\s*([^\n<]*?):\s*<(https?:\/\/[^>\s]+)>[ \t]*$/gm, "$1[$2]($4): $3").replace(/<(https?:\/\/[^>\s]+)>/g, "[$1]($1)");
  if (disclaimer && /tidak\s+menjamin/i.test(disclaimer) && !/tidak\s+menjamin\s+nilai\s+atau\s+kelulusan/i.test(t)) { t = t.replace(/\s+$/, "") + "\n\n> " + disclaimer + "\n"; notes.push("Penafian dari bagian yang dibuang dipertahankan di akhir."); }
  return { text: t, notes };
}

/* name: nama berkas (cadangan judul). Hasil: { ok, error?, title, slug, body, excerpt, tags, topic, metaTitle, metaDesc, keyword, author } */
function parseMd(text, name = "") {
  text = String(text || "").replace(/^﻿/, "").replace(/\r/g, "");
  const hc = hermesClean(text); text = hc.text;
  const { fm, rest } = parseFrontMatter(text);
  let body = rest, title = fm.title ? String(fm.title).trim() : "";
  const lab = {}; const eat = () => { const t = takeLabelHeader(body); if (t.found) { Object.assign(lab, t.meta); body = t.body; } };
  eat();
  const h1 = /^\s*#[ \t]+(.+?)[ \t]*(?:\n|$)/.exec(body);
  if (h1) { if (!title) title = h1[1].trim(); if (h1[1].trim().toLowerCase() === title.toLowerCase()) body = body.slice(h1[0].length); }
  eat();
  if (!title) title = String(name).replace(/\.(md|markdown|txt)$/i, "").replace(/[-_]+/g, " ").trim();
  body = cleanMarkdown(body);
  if (!title) return { ok: false, error: "Judul tidak ditemukan. Tulis `title:` di front matter atau baris `# Judul`." };
  if (plain(body).length < 80) return { ok: false, error: "Isi artikel kosong atau terlalu pendek." };
  const firstPara = body.split(/\n\s*\n/).map(plain).find(p => p && !/^\|/.test(p)) || "";
  return {
    ok: true, title, slug: fm.slug ? String(fm.slug) : (lab.slug || ""), body,
    excerpt: fm.excerpt ? plain(fm.excerpt) : firstPara.slice(0, 260),
    tags: toTags(fm.tags || lab.tags || lab.derived), topic: fm.topic ? String(fm.topic) : (lab.topic || ""), metaTitle: fm.metaTitle ? String(fm.metaTitle) : (lab.metaTitle || ""),
    metaDesc: fm.metaDesc ? String(fm.metaDesc) : (lab.metaDesc || ""), keyword: fm.keyword ? toTags(fm.keyword).join(", ") : (lab.keyword || ""), author: fm.author ? String(fm.author) : "",
    notes: hc.notes,
  };
}

const TOPIC_ALIAS = { study: "study", "tips kuliah ut": "study", "tips kuliah": "study", tips: "study", updateut: "updateut", "info ut": "updateut", info: "updateut", berita: "updateut" };
const topicKey = v => TOPIC_ALIAS[String(v || "").trim().toLowerCase()] || "";

/* Peringatan untuk diperiksa saat meninjau draf. Tidak menolak apa pun: draf tetap tersimpan. */
const seo = require("./blog-seo");
function checkDraft(d) {
  const w = [], body = d.body || "", words = (plain(body).match(/\S+/g) || []).length;
  if (words < 600) w.push(`Cukup pendek (${words} kata). Artikel yang menjawab tuntas biasanya lebih panjang.`);
  if (words >= 300 && !/^##\s+\S/m.test(body.replace(/^#\s+/gm, "## "))) w.push("Belum ada sub-judul H2. Wajib ada sebelum bisa diterbitkan.");
  if (!d.metaTitle) w.push("Meta title kosong."); else if (d.metaTitle.length > 60) w.push(`Meta title ${d.metaTitle.length} karakter (disarankan maks. 60).`);
  if (!d.metaDesc) w.push("Meta description kosong."); else if (d.metaDesc.length > 155) w.push(`Meta description ${d.metaDesc.length} karakter (disarankan maks. 155).`);
  { const tb = seo.timeBound(d.title); if (tb) w.push(`Judul memuat ${tb === "tanggal" ? "tanggal" : tb === "tahun" ? "tahun" : "nomor sesi"}: artikel cepat kedaluwarsa di Google. Pertimbangkan versi abadi (tanpa ${tb === "tanggal" ? "tanggal" : tb === "tahun" ? "tahun" : "sesi"}) atau gabungkan ke panduan induk.`); }
  if (d.slug && seo.slugTooLong(d.slug)) w.push(`Slug terlalu panjang (${String(d.slug).length} karakter). Ringkas jadi 3 sampai 5 kata inti.`);
  if (d.title.length > 70) w.push(`Judul ${d.title.length} karakter, mungkin terpotong di Google.`);
  const hay = body + " " + d.title, bad = [...new Set([...hay.matchAll(/\b(garansi|jaminan|dijamin|pasti lolos|lolos turnitin|nilai aman|cum\s*laude)\b/gi)]
    .filter(m => !/(bukan|tidak|tanpa|jangan|tak|bebas dari|menjanjikan|janji|klaim)[^.\n]{0,40}$/i.test(hay.slice(Math.max(0, m.index - 60), m.index)))
    .map(m => m[0].toLowerCase()))];
  if (bad.length) w.push("Kata klaim yang dilarang: " + bad.join(", ") + ".");
  if (/\b(slot|kuota)\s+(tinggal|terbatas)|hanya\s+\d+\s+(slot|kuota)|terbatas\s+hari\s+ini/i.test(body)) w.push("Ada kesan kelangkaan palsu (slot atau kuota terbatas).");
  if (!/tidak\s+menjamin\s+nilai\s+atau\s+kelulusan/i.test(body)) w.push('Penafian "Kami tidak menjamin nilai atau kelulusan. Semangat!" belum ada.');
  if (!/\]\((?:\/|https?:\/\/(?:www\.)?catatanakademik\.com)[^)]*\)/i.test(body)) w.push("Belum ada tautan internal ke layanan Catatan Akademik.");
  if (!/\]\(https?:\/\/[^)]*\.ut\.ac\.id[^)]*\)|\]\(https?:\/\/(?:www\.)?ut\.ac\.id/i.test(body)) w.push("Belum ada tautan ke sumber resmi UT.");
  if (/<\/?[a-z][^>]*>/i.test(body)) w.push("Ada tag HTML. Di blog ini tag akan tampil sebagai teks biasa.");
  if (/\]\[[^\]]*\]/.test(body)) w.push("Tautan gaya referensi tidak didukung. Pakai [teks](url).");
  if (!/\]\((?:https?:\/\/(?:www\.)?catatanakademik\.com)?\/(?:ruangakademikut\/)?(?:layanan|audit|cek-parafrase-mandiri)[^)]*\)/i.test(body)) w.push("Belum ada ajakan (CTA) ke layanan kita: Layanan, Audit, atau Cek & Parafrase.");
  if (/\[(?:H[1-4]|CTA|PEMBUKA|SUMBER|METADATA)\b[^\]\n]*\]/.test(body)) w.push("Masih ada penanda kerangka seperti [H2 — ...] di isi. Hapus sebelum terbit.");
  if (/DATA BELUM TERSEDIA/i.test(body)) w.push("Masih ada penanda DATA BELUM TERSEDIA di isi. Lengkapi atau hapus sebelum terbit.");
  if (/CTA dipilih|intent-nya|cakupan final perlu dikonfirmasi|jelaskan bagian yang sudah tersedia|catatan (untuk )?(editor|internal)/i.test(body)) w.push("Ada kalimat catatan internal di isi (bukan untuk pembaca). Hapus sebelum terbit.");
  if (/[\u00c2\u00e2][\u0080-\u00bf]/.test(body)) w.push("Ada karakter rusak (mis. â€”) di isi.");
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
    const slug = ctx.uniqueSlug(ctx.slugify(d.slug || seo.shortSlug(ctx.slugify(title)))), taken = posts.some(p => p.slug === slug);
    const post = {
      id: ctx.newId(), slug: taken ? ctx.uniqueSlug(ctx.slugify((d.slug || title) + "-" + (posts.length + 2))) : slug, createdAt: ctx.now, author: ctx.str(d.author, 60) || ctx.author,
      title, topic, excerpt: ctx.str(d.excerpt, 260), body: d.body, cover: "", status: "draft", updatedAt: ctx.now, updatedBy: ctx.by + " (impor .md)",
      tags: ctx.cleanTags(d.tags), metaTitle: ctx.str(d.metaTitle, 70), metaDesc: ctx.str(d.metaDesc, 170),
    };
    if (d.keyword) post.keyword = ctx.str(d.keyword, 120);
    posts.push(post);
    const warnings = checkDraft({ ...d, title });
    // kanibalisasi: judul yang menyasar kata kunci sama dengan artikel lain (yang sudah ada, atau satu paket impor ini)
    const rivals = [...ctx.existing, ...posts.slice(0, -1)].filter(p => p.title && seo.similarity(title, p.title) >= 0.6).slice(0, 3);
    if (rivals.length) warnings.push(`Bersaing dengan artikel lain untuk kata kunci yang sama: ${rivals.map(p => `“${String(p.title).slice(0, 60)}”`).join("; ")}. Gabungkan jadi satu panduan, atau bedakan sudut dan kata kuncinya.`);
    const twins = [...ctx.existing, ...posts.slice(0, -1)].filter(p => p.body && seo.bodySimilarity(d.body, p.body) >= 0.6).slice(0, 3);
    if (twins.length) warnings.push(`Isi hampir sama dengan: ${twins.map(p => `“${String(p.title).slice(0, 60)}”`).join("; ")}. Konten ganda: pilih satu saja atau gabungkan.`);
    results.push({ name, ok: true, id: post.id, title: post.title, slug: post.slug, words: (plain(d.body).match(/\S+/g) || []).length, warnings, cleaned: d.notes || [] });
  }
  return { posts, results };
}

/* Penyaring saat TAMPIL (artikel, pratinjau): bagian dan baris internal tidak pernah sampai ke pembaca, juga untuk draf lama yang
   sudah terlanjur diimpor. Blok komunitas dibuang karena dipasang otomatis sebagai templat di bawah artikel. */
const INTERNAL_LINE = /^\s*(?:[-*]\s+)?(?:\*\*)?\s*(?:gambar|alt text(?: sampul| foto)?|catatan pemilik[^:\n]*|catatan (?:admin|editor|internal)[^:\n]*|kanal sosial terverifikasi)\s*:(?:\*\*)?|DATA BELUM TERSEDIA|GAMBAR BELUM TERSEDIA|Catatan untuk Admin/i;
function scrubInternal(text) {
  const t = String(text || "").replace(/\r/g, "");
  const parts = t.split(/^(?=#{2,3}[ \t]+[^#\n])/m);
  const out = [];
  for (const sec of parts) {
    const h = /^#{2,3}[ \t]+([^\n]+)/.exec(sec), name = h ? h[1].replace(/[*`]/g, "").trim() : "";
    if (h && DROP_H2.test(name)) continue;
    out.push(h && /^sources$/i.test(name) ? sec.replace(/^(#{2,3})[ \t]+Sources/i, "$1 Sumber") : sec);
  }
  return mergeSumber(fixTables(out.join("")).replace(/[ \t]*\[unverified\]/gi, "").split("\n").filter(l => !INTERNAL_LINE.test(l)).join("\n")).replace(/\n{3,}/g, "\n\n");
}

module.exports = { scrubInternal, buildDrafts, parseMd, parseFrontMatter, cleanMarkdown, checkDraft, topicKey };
