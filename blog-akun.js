/* =================================================================
   nextaja — Blog + Akun customer
   Dipasang dari server.js:  require("./blog-akun")({ ...helpers })
   Data: data/blog.json, data/users.json (dibuat otomatis, tidak masuk git)
   ================================================================= */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { shortPaths } = require("./parafrase/acadpaths");
const crypto = require("crypto");

module.exports = function mount(ctx) {
  const { app, express, requireAdmin, sameOrigin, getCookie, SECURE_COOKIE, ROOT, SITE } = ctx;
  const DATA_DIR = path.join(ROOT, "data");
  const BLOG = path.join(DATA_DIR, "blog.json");
  const USERS = path.join(DATA_DIR, "users.json");
  const BLOG_BAK = path.join(DATA_DIR, "backups-blog");
  const SECRET_FILE = path.join(DATA_DIR, ".secret");
  fs.mkdirSync(BLOG_BAK, { recursive: true });

  /* ---------- util ---------- */
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const str = (v, max = 300) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
  const img = v => { const s = str(v, 200); return /^\/uploads\/[a-z0-9._-]+$/i.test(s) ? s : ""; };
  const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
  const writeJson = async (file, obj) => {
    const tmp = file + ".tmp";
    await fsp.writeFile(tmp, JSON.stringify(obj, null, 2));
    await fsp.rename(tmp, file);
  };
  const fmtDate = iso => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

  /* ============================== BLOG ============================== */
  const TOPICS = {
    study: { label: "Tips Kuliah UT", ask: "Belajar, kuliah, dan tugas" },
    social: { label: "Social Media Update", ask: "Kabar dan tips social media" },
    ai: { label: "AI & Info Lain", ask: "AI, teknologi, dan info lain" },
    viral: { label: "Berita viral hari ini", ask: "Berita viral hari ini" },
    updateut: { label: "Info UT", ask: "Info terbaru seputar UT" },
    karier: { label: "Karier & Lowongan", ask: "CV, lamaran, dan info kerja" },
    produktif: { label: "Produktivitas", ask: "Manajemen waktu dan kebiasaan belajar" },
  };
  const tl = k => (TOPICS[k] || { label: "Lainnya" }).label;
  /* Tag topik untuk mahasiswa UT: nama tampil + aturan saran (kata kunci di judul/ringkasan/isi). Saran hanya usulan;
     tag baru terpasang setelah admin menyetujuinya (panel SEO atau editor). Tag lain di luar daftar tetap boleh. */
  const TAGS = {
    "uas": ["UAS", /\b(uas|ujian akhir semester|ujian online|ujian ut)\b/i],
    "take-home-exam": ["Take Home Exam (THE)", /\b(take home exam|the ut|ujian the)\b/i],
    "jadwal-ut": ["Jadwal UT", /\b(jadwal|kalender akademik|tanggal penting)\b/i],
    "registrasi": ["Registrasi Mata Kuliah", /\b(registrasi|krs|daftar ulang|sia ut)\b/i],
    "tugas-tutorial": ["Tugas Tutorial", /\b(tugas tutorial|tugas tuton|tugas ut|tmk)\b/i],
    "diskusi-tuton": ["Diskusi Tuton", /\b(diskusi tuton|jawaban diskusi|forum diskusi)\b/i],
    "tuton": ["Tutorial Online (Tuton)", /\b(tuton|tutorial online)\b/i],
    "nilai-ut": ["Nilai UT", /\b(nilai|ipk|ips|transkrip)\b/i],
    "metopen": ["Metopen UT", /\b(metopen|metode penelitian|proposal penelitian)\b/i],
    "makalah": ["Makalah", /\bmakalah\b/i],
    "referensi-sitasi": ["Referensi & Sitasi", /\b(mendeley|sitasi|daftar pustaka|referensi|jurnal)\b/i],
    "parafrase": ["Parafrase & Plagiarisme", /\b(parafrase|plagiat|plagiarisme|turnitin|drillbit)\b/i],
    "modul-ut": ["Modul UT", /\b(modul|bmp)\b/i],
    "kuliah-sambil-kerja": ["Kuliah Sambil Kerja", /\b(sambil bekerja|sambil kerja|karyawan)\b/i],
    "tips-lulus-ut": ["Tips Lulus UT", /\b(lulus|wisuda|tips sukses)\b/i],
  };
  const tagLabel = t => (TAGS[t] ? TAGS[t][0] : String(t).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
  /* Saran kategori (hanya untuk dua kategori akademik): pengumuman/jadwal = Info UT; cara/tips/panduan belajar = Tips Kuliah UT.
     Hanya usulan untuk admin; tidak mengubah apa pun sendiri. */
  function suggestTopic(p) {
    if (!["study", "updateut"].includes(p.topic)) return null;
    const t = String(p.title || "");
    const s = /^(update|pengumuman|info)\b|terverifikasi|\bper \d{1,2}\b|\b(jadwal|kalender akademik)\b/i.test(t) ? "updateut"
      : /\b(cara|tips|kerangka|kesalahan|checklist|persiapan|sitasi|panduan belajar|trik|langkah)\b/i.test(t) ? "study" : null;
    return s && s !== p.topic ? s : null;
  }
  /* Saran tag: aturan di atas dicocokkan ke judul + ringkasan (bobot 3) dan isi (bobot 1); skor minimal 3; maks 5 tag terkuat. */
  function suggestTags(p) {
    const head = [p.title, p.excerpt].join(" "), body = String(p.body || "");
    return Object.entries(TAGS).map(([k, [, re]]) => { const g = new RegExp(re.source, "gi"); return [k, (head.match(g) || []).length * 3 + (body.match(g) || []).length]; })
      .filter(([, s]) => s >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k); // ada di judul/ringkasan, atau ≥3 kali di isi
  }
  let blog = readJson(BLOG, { posts: [] });
  if (!Array.isArray(blog.posts)) blog.posts = [];
  const TRASH_MS = 30 * 24 * 3600 * 1000;
  let blogWrite = Promise.resolve();
  function saveBlog() {
    blogWrite = blogWrite.then(async () => {
      if (fs.existsSync(BLOG)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await fsp.copyFile(BLOG, path.join(BLOG_BAK, `blog-${stamp}.json`)).catch(() => {});
        const files = (await fsp.readdir(BLOG_BAK)).filter(f => f.endsWith(".json")).sort();
        for (const f of files.slice(0, Math.max(0, files.length - 40))) await fsp.unlink(path.join(BLOG_BAK, f)).catch(() => {});
      }
      await writeJson(BLOG, blog);
    });
    return blogWrite;
  }
  // sekali jalan: seluruh penulis artikel diseragamkan menjadi "dk" (permintaan pemilik); setelah itu penulis boleh diubah lagi per artikel
  if (!blog.authorDk) { blog.posts.forEach(x => { x.author = "dk"; }); blog.authorDk = true; saveBlog(); }
  // buang isi sampah yang sudah lewat 30 hari
  const before = blog.posts.length;
  blog.posts = blog.posts.filter(p => !(p.trashedAt && Date.now() - new Date(p.trashedAt).getTime() > TRASH_MS));
  if (blog.posts.length !== before) saveBlog();

  const slugify = t => str(t, 90).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "tulisan";
  function uniqueSlug(base, selfId) {
    let s = base, n = 2;
    while (blog.posts.some(p => p.slug === s && p.id !== selfId)) s = `${base}-${n++}`;
    return s;
  }
  /* Domain akademik (ACAD_URL beda dari situs utama): hanya topik akademik/UT yang tampil. Tulisan lain tidak dihapus, hanya disembunyikan. */
  const ACAD_ONLY = !!process.env.ACAD_URL && process.env.ACAD_URL.replace(/\/+$/, "") !== (process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  /* Domain akademik: penulis tercatat "Tim Catatan Akademik" (bukan inisial lama "dk"); dijalankan sekali. */
  if (ACAD_ONLY && !blog.authorTim) { blog.posts.forEach(x => { if (!x.author || x.author === "dk") x.author = "Tim Catatan Akademik"; }); blog.authorTim = true; saveBlog(); }
  /* Topik di luar fokus akademik UT: tetap bisa dibaca, tetapi noindex dan tidak masuk sitemap agar otoritas topik situs tidak kabur. */
  const OFF_TOPIC = ACAD_ONLY ? ["social", "ai", "viral"] : [];
  /* Redirect 301 artikel yang digabung: seed/redirects.json = { "slug-lama": "slug-tujuan" }. Slug lama tidak pernah ditampilkan di daftar, sitemap, atau pencarian. */
  const REDIR = (() => { if (!ACAD_ONLY) return {}; try { return JSON.parse(fs.readFileSync(path.join(ROOT, "seed", "redirects.json"), "utf8")); } catch { return {}; } })();
  const ACAD_TOPICS = Object.keys(TOPICS); // semua kategori boleh dipilih penulis; yang tampil sebagai filter hanya yang sudah punya artikel
  const ACAD_HOST = (() => { try { return new URL(process.env.ACAD_URL || "").host; } catch { return ""; } })();
  const onAcadHost = req => ACAD_ONLY && !!ACAD_HOST && String(req.headers.host || "").toLowerCase() === ACAD_HOST.toLowerCase();
  const BRAND = ACAD_ONLY ? "Catatan Akademik" : "nextaja";
  /* Sampul otomatis (judul + kategori) untuk artikel tanpa foto sampul; khusus domain Catatan Akademik. Lihat blog-cover.js. */
  const cover = require("./blog-cover");
  const COVER_OK = ACAD_ONLY && cover.init(path.join(DATA_DIR, "blog-covers"));
  const COVER_DIR = path.join(DATA_DIR, "blog-covers");
  const coverOpts = p => ({ title: p.title, topic: p.topic, topicLabel: tl(p.topic), brand: BRAND, host: new URL(SITE).host, seed: p.slug });
  const autoCover = p => COVER_OK && p.slug ? `/blog/cover/${p.slug}.jpg?v=${cover.keyOf(coverOpts(p))}` : "";
  /* Di domain akademik, nama "nextaja" pada teks halaman diganti nama brand akademik (URL dan alamat email tidak disentuh). */
  const shortPath = shortPaths; // alamat pendek domain akademik (parafrase/acadpaths.js)
  const caBrand = h => String(h)
    .replace(/<link rel="icon"[^>]*>/g, '<link rel="icon" href="/ruangakademikut/assets/ca/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/ruangakademikut/assets/ca/favicon-32.png">')
    .replace(/<link rel="apple-touch-icon"[^>]*>/g, '<link rel="apple-touch-icon" href="/ruangakademikut/assets/ca/apple-touch-icon.png">')
    .replace(/<link rel="manifest"[^>]*>/g, '<link rel="manifest" href="/ruangakademikut/assets/ca/manifest.webmanifest">')
    .replace(/(<a [^>]*class="logo"[^>]*>)<b>[^<]*<\/b>/g, '$1<b class="lg"><img src="/ruangakademikut/assets/ca/logo-96.png" alt="" width="34" height="34"></b>')
    .replace("</head>", '<link rel="stylesheet" href="/ruangakademikut/assets/ca/theme.css?v=2"></head>')
    .replace("</head>", "<style>.logo b.lg{background:none!important}.logo b.lg img{width:34px;height:34px;object-fit:contain;display:block}</style></head>");
  const TEMA = require("./parafrase/tema");
  /* Tema dipasang paling akhir: shortPath menyisipkan theme.css tepat sebelum </head>, jadi tema harus sesudahnya. */
  const rebrand = h => (ACAD_ONLY ? TEMA.inject(shortPath(caBrand(String(h).replace(/(?<![\w./@-])nextaja(?![\w-]|\.\w)/gi, BRAND))), ctx.getCa && ctx.getCa("ca_tema")) : h);
  /* Terjadwal = tampil otomatis saat publishAt lewat (tanpa cron). Draf, review, dan terjadwal yang belum waktunya tidak pernah tampil publik. */
  const isLive = (p, now = Date.now()) => !p.trashedAt && (p.status === "published" || (p.status === "scheduled" && Date.parse(p.publishAt) <= now));
  const published = () => blog.posts.filter(p => isLive(p) && (!ACAD_ONLY || ACAD_TOPICS.includes(p.topic)) && !Object.prototype.hasOwnProperty.call(REDIR, p.slug)).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const modifiedAt = p => p.contentUpdatedAt || p.updatedAt || p.publishedAt;
  const readMin = p => Math.max(1, Math.round(String(p.body || "").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").split(/\s+/).filter(Boolean).length / 200));
  const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const matches = (p, q) => { const t = norm(q).split(/\s+/).filter(Boolean); if (!t.length) return true; const hay = norm([p.title, p.excerpt, (p.tags || []).join(" "), p.body].join(" ")); return t.every(w => hay.includes(w)); };
  /* Daftar judul dikelompokkan: Bulan (bisa dilipat; hanya bulan terbaru terbuka) > Minggu ke-N, terbaru di atas. Zona waktu WIB. */
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const wib = iso => { const d = new Date(new Date(iso).getTime() + 7 * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
  const weekOf = day => Math.min(4, Math.ceil(day / 7));
  const titleRow = p => `<li><a href="/blog/${esc(p.slug)}"><time datetime="${esc(p.publishedAt)}">${esc(new Date(p.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }))}</time><span class="t">${esc(p.title)}</span><span class="tag">${esc(tl(p.topic))}</span></a></li>`;
  const SMARTNAV = '<script>(function(){var n=document.querySelector("header.nav,.nav");if(!n)return;var y=scrollY,t=0;function f(){t=0;var c=scrollY,d=c-y;if(Math.abs(d)<8)return;var o=n.querySelector(".links.open,.dd[open]")||n.contains(document.activeElement)&&document.activeElement!==document.body;if(c>120&&d>0&&!o)n.classList.add("nav-hide");else if(d<0||c<=120)n.classList.remove("nav-hide");y=c}addEventListener("scroll",function(){if(!t)t=requestAnimationFrame(f)},{passive:true})})()</script>';
  const groupedList = posts => {
    const months = new Map();
    for (const p of posts) { const w = wib(p.publishedAt), k = w.y * 12 + w.m; if (!months.has(k)) months.set(k, { w, weeks: new Map(), n: 0 }); const M = months.get(k), wk = weekOf(w.d); if (!M.weeks.has(wk)) M.weeks.set(wk, []); M.weeks.get(wk).push(p); M.n++; }
    return [...months.entries()].sort((a, b) => b[0] - a[0]).map(([, M], i) => {
      const last = new Date(Date.UTC(M.w.y, M.w.m + 1, 0)).getUTCDate();
      const weeks = [...M.weeks.entries()].sort((a, b) => b[0] - a[0]).map(([wk, arr], wi) => {
        const a = (wk - 1) * 7 + 1, b = wk === 4 ? last : wk * 7;
        return `<details class="blog-week"${i === 0 && wi === 0 ? " open" : ""}><summary><span>Minggu ke-${wk} <small>${a}\u2013${b} ${BULAN[M.w.m]}</small></span><small>${arr.length}</small></summary><ul class="blog-titles">${arr.map(titleRow).join("")}</ul></details>`;
      }).join("");
      return `<details class="blog-month"${i === 0 ? " open" : ""}><summary><span>${BULAN[M.w.m]} ${M.w.y}</span><small>${M.n}</small></summary><div class="blog-tree">${weeks}</div></details>`;
    }).join("");
  };
  /* ---------- Beranda blog (dipakai /blog dan /blog-ut): cari, filter, artikel pilihan, kartu terbaru, arsip ---------- */
  const shortDate = iso => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
  /* hi=true untuk gambar utama di layar pertama (kandidat LCP): dimuat segera dan diprioritaskan, bukan lazy. */
  const cardCover = (p, hi = false) => { const src = p.cover || autoCover(p); return src ? `<img src="${esc(src)}" alt="${esc(p.coverAlt || "")}" ${hi ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>` : posterHtml(p); };
  const blogCard = p => `<article class="bx-card"><a href="/blog/${esc(p.slug)}"><div class="bx-cv">${cardCover(p)}</div><div class="bx-b"><span class="bx-tag">${esc(tl(p.topic))}</span><h3>${esc(p.title)}</h3>${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}<div class="bx-ft"><span><time datetime="${esc(p.publishedAt)}">${esc(shortDate(p.publishedAt))}</time> · ${readMin(p)} menit baca</span><span class="bx-go">Baca <i aria-hidden="true">→</i></span></div></div></a></article>`;
  /* Daftar publik (kartu, filter, tag, terkait, RSS ringkas): di domain akademik topik di luar fokus UT tidak ditampilkan. Alamat langsung artikelnya tetap bisa dibuka (noindex), jadi tidak ada tautan lama yang putus. */
  const listed = () => published().filter(p => !OFF_TOPIC.includes(p.topic));
  const topicsShown = () => Object.keys(TOPICS).filter(k => !ACAD_ONLY || k === "study" || k === "updateut" || (!OFF_TOPIC.includes(k) && blog.posts.some(p => p.topic === k && isLive(p))));
  const topTags = (posts, n) => { const c = new Map(); for (const p of posts) for (const t of p.tags || []) c.set(t, (c.get(t) || 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(x => x[0]); };
  function blogFilters(req) {
    const f = TOPICS[req.query.f] && topicsShown().includes(req.query.f) ? req.query.f : "";
    return { f, tag: str(req.query.tag, 40).toLowerCase(), q: str(req.query.q, 80) };
  }
  function blogIndex(req, base) {
    const { f, tag, q } = blogFilters(req), all = listed();
    const list = all.filter(p => (!f || p.topic === f) && (!tag || (p.tags || []).includes(tag)) && matches(p, q));
    const filtering = !!(f || tag || q);
    const featured = filtering ? null : (all.find(p => p.featured) || all.find(p => p.cover) || all[0]);
    const latest = filtering ? list.slice(0, 24) : all.filter(p => p !== featured).slice(0, 8);
    const link = (k, v, label, on) => `<a class="bx-chip${on ? " on" : ""}" href="${base}${k ? `?${k}=${encodeURIComponent(v)}` : ""}"${on ? ' aria-current="page"' : ""}>${esc(label)}</a>`;
    const chips = [link("", "", "Semua", !filtering), ...topicsShown().map(k => link("f", k, TOPICS[k].label, f === k))].join("");
    // Topik populer = tag yang benar-benar dipakai artikel tayang (tautan internal ke halaman tag yang bisa dirayapi)
    const popular = topTags(all, 8);
    const popHtml = popular.length ? `<nav class="bx-pop" aria-label="Topik populer"><span>Topik populer:</span>${popular.map(t => `<a href="${base}?tag=${encodeURIComponent(t)}"${tag === t ? ' aria-current="page" class="on"' : ""}>${esc(tagLabel(t))}</a>`).join("")}</nav>` : "";
    const hero = `<section class="bx-hero"><div class="bx-hero-t">
        <span class="bx-eyebrow">Update Terbaru</span>
        <h1>${ACAD_ONLY ? 'Informasi dan Panduan Kuliah <span class="bx-hl">Universitas Terbuka</span>' : "Blog dan tulisan terbaru"}</h1>
        <p class="bx-lead">${ACAD_ONLY ? "Jadwal, registrasi, ujian, tugas, Metopen, tips belajar, dan pengalaman mahasiswa UT. Bukan situs resmi UT: selalu cocokkan dengan pengumuman resmi di ut.ac.id." : "Catatan tentang belajar, social media, AI, dan hal-hal yang lagi ramai."}</p>
        <form class="bx-search" role="search" action="${base}" method="get"><label class="bx-sr" for="bxq">Cari artikel</label><input id="bxq" type="search" name="q" value="${esc(q)}" maxlength="80" placeholder="Cari artikel, contoh: jadwal ujian, registrasi, tugas…"><button type="submit">Cari</button></form>
        <nav class="bx-chips" aria-label="Filter kategori">${chips}</nav>${popHtml}
      </div>${featured ? `<article class="bx-feat"><a href="/blog/${esc(featured.slug)}"><div class="bx-cv">${cardCover(featured, true)}<span class="bx-badge">Artikel Pilihan</span></div><div class="bx-b"><h2>${esc(featured.title)}</h2>${featured.excerpt ? `<p>${esc(featured.excerpt)}</p>` : ""}<div class="bx-ft"><span><time datetime="${esc(featured.publishedAt)}">${esc(shortDate(featured.publishedAt))}</time> · ${esc(tl(featured.topic))}</span><span class="bx-go">Baca selengkapnya <i aria-hidden="true">→</i></span></div></div></a></article>` : ""}</section>`;
    const what = q ? `Hasil pencarian “${esc(q)}”` : tag ? `Artikel tentang ${esc(tagLabel(tag))}` : f ? esc(TOPICS[f].label) : "Artikel Terbaru";
    const head = `<div class="bx-head"><h2>${what}</h2>${filtering ? `<span class="bx-count">${list.length} artikel · <a href="${base}">Hapus filter</a></span>` : ""}</div>`;
    const grid = latest.length ? `<div class="bx-grid">${latest.map(blogCard).join("")}</div>` : `<div class="bx-empty"><b>Belum ada artikel yang cocok.</b><span>Coba kata lain, atau <a href="${base}">lihat semua artikel</a>.</span></div>`;
    const more = filtering && list.length > latest.length ? `<p class="bx-more">Menampilkan ${latest.length} dari ${list.length}. Persempit pencarian untuk hasil yang lebih tepat.</p>` : "";
    const archive = !filtering && all.length > latest.length + 1 ? `<section class="bx-arch" aria-labelledby="bxArch"><div class="bx-head"><h2 id="bxArch">Arsip artikel</h2><span class="bx-count">${all.length} artikel</span></div><div class="blog-ctl"><button type="button" data-bx="open">Buka semua</button><button type="button" data-bx="close">Tutup semua</button></div>${groupedList(all)}<script>document.querySelectorAll("[data-bx]").forEach(function(b){b.onclick=function(){document.querySelectorAll(".bx-arch details").forEach(function(d){d.open=b.dataset.bx==="open"})}})</script></section>` : "";
    const grupOn = ACAD_ONLY && /^https:\/\/chat\.whatsapp\.com\//.test(String((ctx.getCa && ctx.getCa("update_group_url")) || "").trim());
    const grupStrip = grupOn ? `<aside class="bx-grup" aria-label="Grup mahasiswa UT"><div><b>Cari grup mahasiswa UT?</b><span>Tanya registrasi, PKBJJ, jadwal, dan Tuton bersama mahasiswa lain. Bukan grup resmi UT.</span></div><a class="bx-grup-b" href="/grup?dari=blog" rel="nofollow">Gabung grup WhatsApp <i aria-hidden="true">→</i></a></aside>` : "";
    return `<div class="bx">${hero}${grupStrip}<section class="bx-list" aria-live="polite">${head}${grid}${more}</section>${archive}</div><script>(function(){var i=document.getElementById("bxq");if(!i)return;var cs=[].slice.call(document.querySelectorAll(".bx-card,.blog-titles li")),n=document.querySelector(".bx-head .bx-count");i.addEventListener("input",function(){var q=i.value.toLowerCase().trim();if(q.length<2){cs.forEach(function(c){c.hidden=false});return}var k=0;cs.forEach(function(c){var m=c.textContent.toLowerCase().indexOf(q)>-1;c.hidden=!m;if(m)k++});[].forEach.call(document.querySelectorAll(".blog-week,.blog-month"),function(d){if(q.length>=2){d.open=!!d.querySelector("li:not([hidden])");d.hidden=!d.open}});if(n)n.textContent=k+" artikel cocok"})})()</script>${SMARTNAV}`;
  }
  app.locals.renderAcadBlogCards = req => blogIndex(req, "/blog-ut");
  app.locals.acadPostTitle = slug => { const p = blog.posts.find(x => x.slug === slug && isLive(x)); return p ? p.title : null; };
  /* potongan HTML daftar untuk filter di halaman Update UT */
  app.get("/ms/blog/list-html", (req, res) => {
    res.set("Cache-Control", "no-cache");
    const f = TOPICS[req.query.f] || req.query.f === "ut" ? req.query.f : "";
    const list = listed().filter(p => !f || p.topic === f || (f === "ut" && (p.topic === "updateut" || p.topic === "study")));
    res.json({ n: list.length, html: groupedList(list) });
  });

  /* Foto di dalam isi: ![alt](/uploads/nama.webp). Hanya berkas gambar dari /uploads; selain itu yang tampil cukup teks alt-nya. */
  const IMG_SRC = /^\/uploads\/[a-z0-9][a-z0-9._-]*\.(?:webp|jpe?g|png|gif|avif)$/i;
  const IMG_MD = /!\[([^\]]*)\]\(([^)\s]*)\)/g;
  const IMG_LINE = /^!\[[^\]]*\]\(([^)\s]*)\)$/;
  function inline(t) {
    return esc(t)
      .replace(IMG_MD, (m, alt, src) => IMG_SRC.test(src) ? `<img src="${src}" alt="${alt.replace(/\*/g, "")}" loading="lazy" decoding="async">` : alt)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?![*\w])/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((\/[^\s)\/][^\s)]*|https?:\/\/[^\s)]+)\)/g, (m, txt, url) => isOwn(url) ? `<a href="${url}">${txt}</a>` : `<a href="${url}" rel="nofollow noopener" target="_blank">${txt}</a>`);
  }
  /* tautan ke situs sendiri (relatif atau domain utama/akademik): tab yang sama, tanpa nofollow */
  const OWN_HOSTS = [(() => { try { return new URL(SITE).host; } catch { return ""; } })(), ACAD_HOST].filter(Boolean);
  function isOwn(u) { if (u[0] === "/") return true; try { return OWN_HOSTS.includes(new URL(u.replace(/&amp;/g, "&")).host); } catch { return false; } }
  function renderBody(txt) {
    let html = "", list = "", para = [], quote = [];
    const ids = new Map(); // id unik per judul bagian, dipakai daftar isi
    const head = (tag, raw) => { const inner = inline(raw); let id = slugify(inner.replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/gi, " ")) || "bagian"; const n = ids.get(id) || 0; ids.set(id, n + 1); if (n) id += "-" + (n + 1); html += `<${tag} id="${id}">${inner}</${tag}>`; };
    const flush = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
    const endList = () => { if (list) { html += `</${list}>`; list = ""; } };
    const endQuote = () => { if (quote.length) { html += `<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`; quote = []; } };
    const item = (kind, l, re) => { flush(); endQuote(); if (list !== kind) { endList(); html += `<${kind}>`; list = kind; } html += `<li>${inline(l.replace(re, ""))}</li>`; };
    /* tabel: baris berawal dan berakhir "|"; baris kedua "|---|---|" menandai judul kolom */
    let rows = [];
    const cells = l => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    const endTable = () => {
      if (!rows.length) return;
      const sep = rows.length > 1 && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(rows[1]);
      const headRow = sep ? cells(rows[0]) : null, bodyRows = (sep ? rows.slice(2) : rows).map(cells);
      html += `<div class="tbl"><table>${headRow ? `<thead><tr>${headRow.map(c => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${bodyRows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      rows = [];
    };
    for (const raw of String(txt || "").replace(/\r/g, "").split("\n")) {
      const l = raw.trim();
      if (/^\|.*\|$/.test(l)) { flush(); endList(); endQuote(); rows.push(l); continue; }
      endTable();
      if (!l) { flush(); endList(); endQuote(); continue; }
      if (/^>\s?/.test(l)) { flush(); endList(); quote.push(l.replace(/^>\s?/, "")); continue; }
      endQuote();
      if (IMG_LINE.test(l) && IMG_SRC.test(l.match(IMG_LINE)[1])) { flush(); endList(); html += `<figure>${inline(l)}</figure>`; continue; }
      if (/^#\s+/.test(l)) { flush(); endList(); head("h2", l.replace(/^#\s+/, "")); continue; } // H1 hanya dari kolom Judul; "# " di isi dijadikan H2
      if (/^##\s+/.test(l)) { flush(); endList(); head("h2", l.replace(/^##\s+/, "")); continue; }
      if (/^###\s+/.test(l)) { flush(); endList(); head("h3", l.replace(/^###\s+/, "")); continue; }
      if (/^#{4,6}\s+/.test(l)) { flush(); endList(); head("h" + l.match(/^#+/)[0].length, l.replace(/^#{4,6}\s+/, "")); continue; }
      if (/^[-*\u2022]\s+/.test(l)) { item("ul", l, /^[-*\u2022]\s+/); continue; }
      if (/^\d{1,2}[.)]\s+/.test(l)) { item("ol", l, /^\d{1,2}[.)]\s+/); continue; }
      endList(); para.push(l);
    }
    flush(); endList(); endQuote(); endTable();
    return html;
  }

  /* ============================== AKUN ============================== */
  let secret;
  try { secret = fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch {}
  if (!secret || secret.length < 32) { secret = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 }); }
  let db = readJson(USERS, { users: [], orders: [] });
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.orders)) db.orders = [];
  let dbWrite = Promise.resolve();
  const saveDb = () => (dbWrite = dbWrite.then(() => writeJson(USERS, db)));

  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const mac = s => crypto.createHmac("sha256", secret).update(s).digest("base64url");
  const SESSION_MS = 30 * 24 * 3600 * 1000;
  /* v = sidik singkat dari sandi: mengganti sandi membatalkan semua sesi lama (token lama tanpa v tetap diterima sampai kedaluwarsa). */
  const ver = u => crypto.createHash("sha256").update(String(u.hash || "google")).digest("hex").slice(0, 10);
  function makeToken(uid) { const u = db.users.find(x => x.id === uid); const p = b64({ u: uid, e: Date.now() + SESSION_MS, v: u ? ver(u) : "" }); return `${p}.${mac(p)}`; }
  function userFrom(req) {
    const t = getCookie(req, "nx_user");
    const [p, m] = String(t || "").split(".");
    if (!p || !m) return null;
    const good = Buffer.from(mac(p)), got = Buffer.from(m);
    if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
    try {
      const d = JSON.parse(Buffer.from(p, "base64url").toString());
      if (!d.e || d.e < Date.now()) return null;
      const u = db.users.find(x => x.id === d.u);
      if (!u || (d.v !== undefined && d.v !== ver(u))) return null;
      return u;
    } catch { return null; }
  }
  const setSession = (res, uid) => res.setHeader("Set-Cookie", `nx_user=${makeToken(uid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${SECURE_COOKIE ? "; Secure" : ""}`);
  const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
  const checkPw = (pw, u) => { if (!u.hash || !u.salt) return false; const a = Buffer.from(hashPw(pw, u.salt), "hex"), b = Buffer.from(u.hash, "hex"); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  /* Persetujuan email info/promosi: akun Gmail dan login Google wajib setuju; disimpan dengan waktunya. */
  const isGmail = e => /@(gmail|googlemail)\.com$/i.test(String(e || ""));
  const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
  const pubUser = u => ({ id: u.id, name: u.name, email: u.email });
  const fails = new Map();
  function limited(req, key) { const f = fails.get(key); return f && f.until > Date.now(); }
  const regs = new Map();
  const regLimited = ip => { const now = Date.now(), a = (regs.get(ip) || []).filter(t => now - t < 3600e3); regs.set(ip, a); if (regs.size > 5000) regs.delete(regs.keys().next().value); return a.length >= 10; };
  const regNote = ip => regs.get(ip).push(Date.now());
  function fail(key) { if (fails.size > 5000) for (const [k, v] of fails) if (!v.until || v.until < Date.now()) fails.delete(k); const f = fails.get(key) || { n: 0 }; f.n++; f.until = f.n >= 6 ? Date.now() + 15 * 60 * 1000 : 0; fails.set(key, f); }
  const STATUSES = ["Diterima", "Dikerjakan", "Review", "Selesai", "Dibatalkan"];
  const json = express.json({ limit: "8kb" });
  const needOrigin = (req, res, next) => (sameOrigin(req) ? next() : res.status(403).json({ error: "Permintaan ditolak." }));

  app.get("/ms/auth/me", (req, res) => { res.set("Cache-Control", "no-store"); const u = userFrom(req); res.json({ user: u ? pubUser(u) : null }); });
  app.post("/ms/auth/register", json, needOrigin, async (req, res) => {
    const key = "r:" + req.ip;
    if (limited(req, key) || regLimited(req.ip)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const name = str(req.body?.name, 60), email = str(req.body?.email, 254).toLowerCase(), pw = String(req.body?.password || "");
    if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
    if (!EMAIL.test(email)) return res.status(400).json({ error: "Email tidak valid." });
    if (pw.length < 8 || pw.length > 100) return res.status(400).json({ error: "Sandi minimal 8 karakter." });
    if (db.users.some(u => u.email === email)) { fail(key); return res.status(409).json({ error: "Email ini sudah terdaftar. Coba masuk." }); }
    const promo = req.body?.promo === true;
    if (isGmail(email) && !promo) return res.status(400).json({ error: "Akun Gmail wajib mencentang persetujuan menerima email info dan promosi.", needPromo: true });
    const salt = crypto.randomBytes(16).toString("hex");
    const u = { id: crypto.randomBytes(8).toString("hex"), name, email, salt, hash: hashPw(pw, salt), createdAt: new Date().toISOString(), ...(promo ? { promo: { at: new Date().toISOString(), via: "daftar" } } : {}) };
    db.users.push(u);
    try { await saveDb(); } catch { db.users = db.users.filter(x => x.id !== u.id); return res.status(500).json({ error: "Pendaftaran belum bisa disimpan. Coba lagi sebentar." }); }
    regNote(req.ip); setSession(res, u.id);
    res.json({ ok: true, user: pubUser(u) });
  });
  app.post("/ms/auth/login", json, needOrigin, (req, res) => {
    const email = str(req.body?.email, 254).toLowerCase(), pw = String(req.body?.password || "");
    const key = "l:" + req.ip + ":" + email;
    if (limited(req, key)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const u = db.users.find(x => x.email === email);
    if (!u || !checkPw(pw, u)) { fail(key); return res.status(401).json({ error: "Email atau sandi salah." }); }
    fails.delete(key); setSession(res, u.id);
    res.json({ ok: true, user: pubUser(u) });
  });
  const GOOGLE_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  app.post("/ms/auth/google", json, needOrigin, async (req, res) => {
    if (!GOOGLE_ID) return res.status(503).json({ error: "Masuk dengan Google belum aktif." });
    const key = "g:" + req.ip;
    if (limited(req, key)) return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." });
    const cred = String(req.body?.credential || "");
    if (cred.length < 20 || cred.length > 4000) { fail(key); return res.status(400).json({ error: "Token tidak valid." }); }
    try {
      const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(cred), { signal: AbortSignal.timeout(8000) });
      const t = await r.json();
      const okIss = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
      if (!r.ok || t.aud !== GOOGLE_ID || !okIss || String(t.email_verified) !== "true" || !t.email || Number(t.exp) * 1000 < Date.now()) { fail(key); return res.status(401).json({ error: "Login Google ditolak. Coba lagi." }); }
      const email = String(t.email).toLowerCase();
      let u = db.users.find(x => x.email === email);
      const promo = req.body?.promo === true;
      if (!(u && u.promo) && !promo) return res.status(400).json({ error: "Centang persetujuan menerima email info dan promosi dulu untuk masuk dengan Google.", needPromo: true });
      if (u && !u.promo) { u.promo = { at: new Date().toISOString(), via: "google" }; await saveDb(); }
      if (!u) {
        u = { id: crypto.randomBytes(8).toString("hex"), name: str(t.name || email.split("@")[0], 60), email, google: true, createdAt: new Date().toISOString(), promo: { at: new Date().toISOString(), via: "google" } };
        db.users.push(u); await saveDb();
      }
      fails.delete(key); setSession(res, u.id);
      res.json({ ok: true, user: pubUser(u) });
    } catch { res.status(502).json({ error: "Tidak bisa menghubungi Google. Coba lagi." }); }
  });
  app.post("/ms/auth/logout", (req, res) => { if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." }); res.setHeader("Set-Cookie", "nx_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + (SECURE_COOKIE ? "; Secure" : "")); res.json({ ok: true }); });
  app.post("/ms/auth/password", json, needOrigin, async (req, res) => {
    const u = userFrom(req); if (!u) return res.status(401).json({ error: "Silakan masuk dulu." });
    const old = String(req.body?.old || ""), nw = String(req.body?.new || "");
    if (u.hash && !checkPw(old, u)) return res.status(401).json({ error: "Sandi lama salah." });
    if (nw.length < 8 || nw.length > 100) return res.status(400).json({ error: "Sandi baru minimal 8 karakter." });
    const prev = { salt: u.salt, hash: u.hash };
    u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(nw, u.salt);
    try { await saveDb(); } catch { u.salt = prev.salt; u.hash = prev.hash; return res.status(500).json({ error: "Sandi belum bisa disimpan. Coba lagi sebentar." }); }
    setSession(res, u.id);
    res.json({ ok: true });
  });
  app.get("/ms/auth/orders", (req, res) => {
    const u = userFrom(req); if (!u) return res.status(401).json({ error: "Silakan masuk dulu." });
    res.set("Cache-Control", "no-store");
    res.json({ orders: db.orders.filter(o => o.userId === u.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map(o => ({ id: o.id, title: o.title, status: o.status, note: o.note, updatedAt: o.updatedAt })) });
  });

  /* ---------------- API admin: blog ---------------- */
  const adminJson = express.json({ limit: "400kb" });
  app.get("/ms/admin/posts", requireAdmin, (req, res) => {
    let all = blog.posts.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    let topics = TOPICS;
    /* di catatanakademik.com, menu tulis hanya menawarkan topik akademik */
    if (onAcadHost(req)) { topics = Object.fromEntries(Object.entries(TOPICS).filter(([k]) => ACAD_TOPICS.includes(k))); all = all.filter(p => ACAD_TOPICS.includes(p.topic)); }
    const withV = a => a.map(p => ({ ...p, views: viewsOf(p.slug) }));
    res.json({ topics, posts: withV(all.filter(p => !p.trashedAt)), trash: withV(all.filter(p => p.trashedAt)) });
  });
  /* Status tulisan: draft (draf), review (menunggu review editor), scheduled (terbit otomatis di publishAt), published (terbit).
     Field tambahan hanya diubah bila dikirim, supaya editor lama yang belum mengenal field baru tidak menghapusnya. */
  const STATUSES_POST = ["draft", "review", "scheduled", "published"];
  /* Hook layanan di artikel: ajakan ke satu layanan yang paling nyambung. Otomatis dari isi artikel; admin bisa pilih layanan lain, ubah kalimat, atau matikan per artikel. */
  const HOOKS = {
    audit: { name: "Cek & Parafrase Mandiri", top: "Takut tugasmu kena similarity tinggi?", sub: "Unggah dokumenmu, lihat bagian yang perlu diperbaiki, lalu admin yang memparafrase.", btn: "Cek dokumen", href: "/ruangakademikut/cek-parafrase-mandiri", side: "Periksa kalimat bermasalah sebelum dikumpulkan.", re: /plagiar|plagiat|similarity|parafrase|sitasi|kutipan|referensi|daftar pustaka|turnitin|orisinal/i },
    metopen: { name: "Metopen UT", top: "Bingung menyusun tugas metopen?", sub: "Pendampingan Tugas 1 sampai 3, per tahap atau paket.", btn: "Lihat metopen", href: "/ruangakademikut/layanan?s=metopen_paket", side: "Pendampingan Tugas 1 sampai 3, per tahap atau paket komplit.", re: /metopen|metodologi penelitian|proposal|rumusan masalah|kerangka teori|skripsi/i },
    diskusi: { name: "Diskusi", top: "Diskusi tuton belum terjawab?", sub: "Jawaban siap tempel dengan poin utama dan referensi yang bisa dicek.", btn: "Pesan diskusi", href: "/ruangakademikut/layanan?s=diskusi", side: "Jawaban diskusi siap tempel, dengan referensi yang bisa dicek.", re: /diskusi|tuton|tutorial online|forum/i },
    tugas: { name: "Tugas tutorial", top: "Tugas tutorial mepet deadline?", sub: "Dikerjakan sesuai soal dan format, kamu periksa dulu sebelum dikirim.", btn: "Pesan tugas", href: "/ruangakademikut/layanan?s=tugas", side: "Dikerjakan sesuai soal dan ketentuan format.", re: /tugas|deadline|nilai|ujian|uas|uts|jawaban/i },
  };
  const HOOK_KEYS = Object.keys(HOOKS);
  function hookFor(p) {
    if (p.hookService === "off") return null;
    const text = [p.title, (p.tags || []).join(" "), p.excerpt || ""].join(" ");
    const key = HOOKS[p.hookService] ? p.hookService : (HOOK_KEYS.find(k => HOOKS[k].re.test(text)) || "audit");
    const h = HOOKS[key];
    return { ...h, key, top: p.hookText || h.top };
  }
  const cleanTags = v => [...new Set((Array.isArray(v) ? v : String(v || "").split(",")).map(t => str(t, 30).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 -]/g, "").trim().replace(/\s+/g, "-")).filter(Boolean))].slice(0, 8);
  const REV_DIR = path.join(DATA_DIR, "blog-revisions");
  const revFile = id => path.join(REV_DIR, `${String(id).replace(/[^a-f0-9]/gi, "")}.json`);
  const readRevs = id => readJson(revFile(id), []);
  async function pushRevision(p, by) {
    await fsp.mkdir(REV_DIR, { recursive: true });
    const revs = readRevs(p.id);
    revs.unshift({ at: new Date().toISOString(), by, title: p.title, excerpt: p.excerpt || "", body: p.body || "", status: p.status });
    await writeJson(revFile(p.id), revs.slice(0, 30));
  }
  function validatePost(b, current) {
    const title = str(b.title, 140);
    if (!title) throw new Error("Judul wajib diisi.");
    const status = STATUSES_POST.includes(b.status) ? b.status : "draft";
    const body = importMd.htmlToMd(String(b.body ?? (current ? current.body : "") ?? "")).slice(0, 60000);
    let publishAt = current ? current.publishAt : undefined;
    if (status === "scheduled") {
      const t = Date.parse(b.publishAt);
      if (!Number.isFinite(t)) throw new Error("Isi tanggal dan jam terbit untuk tulisan terjadwal.");
      if (t < Date.now() - 60e3) throw new Error("Jadwal terbit sudah lewat. Pilih waktu yang akan datang atau pilih Terbitkan sekarang.");
      publishAt = new Date(t).toISOString();
    }
    if (status === "published" || status === "scheduled") { // aturan struktur judul untuk Google: tulisan panjang wajib punya sub-judul H2
      const words = (body.match(/\S+/g) || []).length;
      if (words >= 300 && !/^\s*##?\s+\S/m.test(body)) throw new Error("Tulisan sepanjang ini wajib punya sub-judul H2. Tulis ## di awal baris judul bagian, atau simpan sebagai Draf.");
    }
    return { title, status, body, publishAt };
  }
  app.post("/ms/admin/posts", requireAdmin, adminJson, async (req, res) => {
    const b = req.body || {};
    let p = b.id ? blog.posts.find(x => x.id === b.id) : null;
    if (b.id && !p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    let v; try { v = validatePost(b, p); } catch (e) { return res.status(400).json({ error: e.message }); }
    const topic = TOPICS[b.topic] && (!onAcadHost(req) || ACAD_TOPICS.includes(b.topic)) ? b.topic : (p ? p.topic : (onAcadHost(req) ? "study" : "social"));
    const by = (req.admin && req.admin.name) || "admin";
    const now = new Date().toISOString();
    const isNew = !p;
    if (p && (p.title !== v.title || (p.body || "") !== v.body || (p.excerpt || "") !== str(b.excerpt, 260))) await pushRevision(p, by);
    if (!p) { p = { id: crypto.randomBytes(6).toString("hex"), slug: uniqueSlug(slugify(v.title)), createdAt: now, author: DEFAULT_AUTHOR }; blog.posts.push(p); }
    const wasLive = !isNew && isLive(p);
    const contentChanged = isNew || p.title !== v.title || (p.body || "") !== v.body || (p.excerpt || "") !== str(b.excerpt, 260);
    Object.assign(p, { title: v.title, topic, excerpt: str(b.excerpt, 260), body: v.body, cover: img(b.cover), status: v.status, updatedAt: now, updatedBy: by });
    if ("tags" in b) p.tags = cleanTags(b.tags);
    if ("author" in b) p.author = str(b.author, 60) || DEFAULT_AUTHOR;
    if ("coverAlt" in b) p.coverAlt = str(b.coverAlt, 160);
    if ("coverCaption" in b) p.coverCaption = str(b.coverCaption, 200);
    if ("metaTitle" in b) p.metaTitle = str(b.metaTitle, 70);
    if ("metaDesc" in b) p.metaDesc = str(b.metaDesc, 170);
    if ("hookService" in b) p.hookService = HOOK_KEYS.includes(b.hookService) || b.hookService === "off" ? b.hookService : "";
    if ("hookText" in b) p.hookText = str(b.hookText, 120);
    if ("recommendedAt" in b) p.recommendedAt = /^\d{4}-\d{2}-\d{2}$/.test(b.recommendedAt) ? b.recommendedAt : "";
    if ("recommendedWhy" in b) p.recommendedWhy = str(b.recommendedWhy, 160);
    if (v.status === "scheduled") { p.publishAt = v.publishAt; p.publishedAt = v.publishAt; } else delete p.publishAt;
    if (v.status === "published" && (!p.publishedAt || Date.parse(p.publishedAt) > Date.now())) p.publishedAt = now;
    // slug hanya boleh diubah selama belum pernah tayang (URL yang sudah tayang tidak diganti)
    if ("slug" in b && !wasLive && str(b.slug, 80)) p.slug = uniqueSlug(slugify(b.slug), p.id);
    if (contentChanged && wasLive) p.contentUpdatedAt = now;
    await saveBlog(); res.json({ ok: true, post: p });
    if (isLive(p)) pingIndex([p.slug]);
  });
  /* Impor file Markdown: tiap file menjadi SATU draf (tidak pernah langsung terbit). Berkas dibaca di browser dan dikirim sebagai teks,
     jadi tidak ada unggahan berkas ke server. Judul yang sudah ada dilewati supaya impor ulang tidak menggandakan draf. */
  const importMd = require("./blog-import");
  app.post("/ms/admin/posts/import", requireAdmin, express.json({ limit: "3mb" }), async (req, res) => {
    const files = Array.isArray((req.body || {}).files) ? req.body.files.slice(0, 30) : [];
    if (!files.length) return res.status(400).json({ error: "Pilih minimal satu file .md." });
    const acad = onAcadHost(req);
    const { posts, results } = importMd.buildDrafts(files, {
      existing: blog.posts.filter(x => !x.trashedAt), uniqueSlug, slugify, cleanTags, str, newId: () => crypto.randomBytes(6).toString("hex"),
      topics: TOPICS, allowedTopics: acad ? ACAD_TOPICS : null, defaultTopic: acad ? "study" : "social", author: DEFAULT_AUTHOR,
      by: (req.admin && req.admin.name) || "admin", now: new Date().toISOString(),
    });
    if (posts.length) { blog.posts.push(...posts); try { await saveBlog(); } catch { blog.posts.splice(blog.posts.length - posts.length, posts.length); return res.status(500).json({ error: "Draf belum bisa disimpan. Coba lagi sebentar." }); } }
    res.json({ ok: true, created: posts.length, results });
  });
  /* Draf bawaan rilis: file di seed/artikel/*.md masuk SEKALI sebagai draf (tidak pernah terbit sendiri). Nama file yang sudah pernah
     dimasukkan dicatat di data/blog-seeded.json, jadi draf yang dihapus admin tidak muncul lagi. */
  if (ACAD_ONLY) setTimeout(async () => {
    try {
      const dir = path.join(ROOT, "seed", "artikel"); if (!fs.existsSync(dir)) return;
      const MARK = path.join(DATA_DIR, "blog-seeded.json"), done = new Set(readJson(MARK, []));
      const files = fs.readdirSync(dir).filter(f => /\.md$/i.test(f) && !done.has(f)).map(f => ({ name: f, text: fs.readFileSync(path.join(dir, f), "utf8") }));
      if (!files.length) return;
      const { posts, results } = importMd.buildDrafts(files, {
        existing: blog.posts.filter(x => !x.trashedAt), uniqueSlug, slugify, cleanTags, str, newId: () => crypto.randomBytes(6).toString("hex"),
        topics: TOPICS, allowedTopics: null, defaultTopic: "study", author: DEFAULT_AUTHOR, by: "rilis", now: new Date().toISOString(),
      });
      if (posts.length) { blog.posts.push(...posts); await saveBlog(); }
      for (const r of results) if (r.ok || r.skipped) done.add(r.name);
      fs.writeFileSync(MARK, JSON.stringify([...done]));
      console.log(`[blog] draf bawaan: ${posts.length} masuk`);
    } catch (e) { console.error("[blog] draf bawaan gagal:", e && e.message); }
  }, 3000);
  /* Rapikan artikel yang sudah dialihkan (seed/redirects.json): artikel lamanya diarsipkan (masuk Sampah, bisa dipulihkan dari admin)
     dan baris daftar "- [judul](.../blog/slug-lama)" dihapus dari artikel lain. Dijalankan SEKALI per isi redirects.json (dicatat di blog-seeded.json).
     Cadangan blog.json dibuat otomatis oleh saveBlog. */
  if (ACAD_ONLY) setTimeout(async () => {
    try {
      const keys = Object.keys(REDIR).sort(); if (!keys.length) return;
      const MARK = path.join(DATA_DIR, "blog-seeded.json"), done = new Set(readJson(MARK, [])), tag = "migrasi-redirect:" + keys.join(",");
      if (done.has(tag)) return;
      const now = new Date().toISOString(); let arch = 0, lines = 0;
      for (const k of keys) { const old = blog.posts.find(x => x.slug === k && !x.trashedAt); if (old) { old.trashedAt = now; arch++; } }
      for (const x of blog.posts) {
        if (!x.body || x.trashedAt) continue;
        let b = x.body;
        for (const k of keys) b = b.replace(new RegExp("^[ \\t]*[-*][ \\t]*\\[[^\\]\\n]*\\]\\([^)\\n]*/blog/" + k.replace(/[^a-z0-9-]/g, "") + "\\)[ \\t]*\\n?", "gm"), () => { lines++; return ""; });
        if (b !== x.body) x.body = b;
      }
      if (arch || lines) await saveBlog();
      done.add(tag); fs.writeFileSync(MARK, JSON.stringify([...done]));
      console.log(`[blog] migrasi redirect: ${arch} diarsipkan, ${lines} tautan dibersihkan`);
    } catch (e) { console.error("[blog] migrasi redirect gagal:", e && e.message); }
  }, 5000);
  /* Tautkan artikel saudara yang niatnya beda (bukan digabung): sebelum tenggat vs sesudah tenggat. Sekali saja (tercatat di blog-seeded.json). */
  if (ACAD_ONLY) setTimeout(async () => {
    try {
      const PAIRS = [["panduan-deadline-tuton-ut", "tuton-ut-terlambat-belum-terkirim"], ["tuton-ut-terlambat-belum-terkirim", "panduan-deadline-tuton-ut"]];
      const MARK = path.join(DATA_DIR, "blog-seeded.json"), done = new Set(readJson(MARK, [])), tag = "tautan-tuton-1";
      if (done.has(tag)) return;
      let n = 0;
      for (const [from, to] of PAIRS) {
        const a = blog.posts.find(x => x.slug === from && !x.trashedAt), b = blog.posts.find(x => x.slug === to && !x.trashedAt);
        if (!a || !b || !a.body || a.body.includes("/blog/" + to)) continue;
        const li = `- [${String(b.title).replace(/[\[\]]/g, "")}](https://catatanakademik.com/blog/${to})\n`;
        if (/^## Baca juga[^\n]*\n\n/m.test(a.body)) a.body = a.body.replace(/^(## Baca juga[^\n]*\n\n)/m, "$1" + li);
        else if (/^## Sumber/m.test(a.body)) a.body = a.body.replace(/^## Sumber/m, "## Baca juga\n\n" + li + "\n## Sumber");
        else a.body = a.body.replace(/\s*$/, "\n\n## Baca juga\n\n" + li);
        n++;
      }
      if (n) await saveBlog();
      done.add(tag); fs.writeFileSync(MARK, JSON.stringify([...done]));
      console.log(`[blog] tautan tuton: ${n} artikel diperbarui`);
    } catch (e) { console.error("[blog] tautan tuton gagal:", e && e.message); }
  }, 7000);
  /* Hanya tag (tanpa revisi dan tanpa mengubah tanggal "diperbarui", karena isi artikel tidak berubah). */
  app.post("/ms/admin/posts/:id/tags", requireAdmin, adminJson, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    p.tags = cleanTags((req.body || {}).tags); await saveBlog();
    res.json({ ok: true, tags: p.tags });
  });
  app.get("/ms/admin/tag-suggestions", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store").json({ labels: Object.fromEntries(Object.entries(TAGS).map(([k, v]) => [k, v[0]])), items: blog.posts.filter(p => !p.trashedAt).map(p => ({ id: p.id, title: p.title, topic: p.topic, tags: p.tags || [], suggested: suggestTags(p).filter(t => !(p.tags || []).includes(t)), suggestedTopic: suggestTopic(p) })), topics: Object.fromEntries(Object.entries(TOPICS).map(([k, v]) => [k, v.label])) });
  });
  /* Pindah kategori saja (tidak mengubah isi, tanggal diperbarui, atau slug). */
  app.post("/ms/admin/posts/:id/topic", requireAdmin, adminJson, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    const t = String((req.body || {}).topic || "");
    if (!TOPICS[t] || (onAcadHost(req) && !ACAD_TOPICS.includes(t))) return res.status(400).json({ error: "Kategori tidak dikenal." });
    p.topic = t; await saveBlog(); res.json({ ok: true, topic: t });
  });
  /* Rekomendasi tayang diisi langsung dari daftar draf: tanggal (boleh kosong) dan catatan alasan. */
  app.post("/ms/admin/posts/:id/recommend", requireAdmin, adminJson, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    const b = req.body || {};
    if ("recommendedAt" in b) { const d = String(b.recommendedAt || ""); if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return res.status(400).json({ error: "Format tanggal tidak benar." }); p.recommendedAt = d; }
    if ("recommendedWhy" in b) p.recommendedWhy = str(b.recommendedWhy, 160);
    await saveBlog(); res.json({ ok: true, recommendedAt: p.recommendedAt || "", recommendedWhy: p.recommendedWhy || "" });
  });
  app.post("/ms/admin/posts/:id/featured", requireAdmin, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    const on = !p.featured; blog.posts.forEach(x => { delete x.featured; }); if (on) p.featured = true;
    await saveBlog(); res.json({ ok: true, featured: on });
  });
  app.get("/ms/admin/posts/:id/revisions", requireAdmin, (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    res.set("Cache-Control", "no-store").json({ items: readRevs(p.id).map((r, n) => ({ n, at: r.at, by: r.by, title: r.title, status: r.status, words: (r.body.match(/\S+/g) || []).length })) });
  });
  app.get("/ms/admin/posts/:id/revisions/:n", requireAdmin, (req, res) => {
    const r = readRevs(req.params.id)[Number(req.params.n)];
    if (!r) return res.status(404).json({ error: "Versi tidak ditemukan." });
    res.set("Cache-Control", "no-store").json(r);
  });
  /* Pratinjau memakai template publik yang sebenarnya; hanya untuk admin, noindex, tidak di-cache. */
  const sendPreview = (res, p) => res.set({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" }).type("html").send(articlePage(p, { preview: true }));
  app.get("/ms/admin/posts/:id/preview", requireAdmin, (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    sendPreview(res, p);
  });
  app.post("/ms/admin/preview-page", requireAdmin, adminJson, (req, res) => {
    const b = req.body || {}, cur = b.id ? blog.posts.find(x => x.id === b.id) : null;
    const p = { ...(cur || { slug: "pratinjau", topic: "study" }), title: str(b.title, 140) || "(Judul belum diisi)", excerpt: str(b.excerpt, 260), body: String(b.body || "").slice(0, 60000), cover: img(b.cover), status: STATUSES_POST.includes(b.status) ? b.status : "draft",
      topic: TOPICS[b.topic] ? b.topic : (cur ? cur.topic : "study"), tags: cleanTags(b.tags), author: str(b.author, 60) || DEFAULT_AUTHOR, coverAlt: str(b.coverAlt, 160), coverCaption: str(b.coverCaption, 200), metaTitle: str(b.metaTitle, 70), metaDesc: str(b.metaDesc, 170), publishAt: b.publishAt, publishedAt: (cur && cur.publishedAt) || new Date().toISOString() };
    sendPreview(res, p);
  });
  app.post("/ms/admin/preview", requireAdmin, adminJson, (req, res) => {
    const b = req.body || {};
    res.json({ title: str(b.title, 140), html: renderBody(cleanBody(String(b.body || "").slice(0, 60000))) });
  });
  app.post("/ms/admin/posts/:id/trash", requireAdmin, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    p.trashedAt = new Date().toISOString(); await saveBlog(); res.json({ ok: true });
  });
  app.post("/ms/admin/posts/:id/restore", requireAdmin, async (req, res) => {
    const p = blog.posts.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    delete p.trashedAt; await saveBlog(); res.json({ ok: true });
  });
  /* Aksi massal dari daftar artikel: satu kali simpan (satu cadangan), bukan satu per artikel. action: trash | restore | delete (delete hanya untuk yang sudah di sampah). */
  app.post("/ms/admin/posts/bulk", requireAdmin, adminJson, async (req, res) => {
    const b = req.body || {}, ids = [...new Set(Array.isArray(b.ids) ? b.ids.map(String) : [])].slice(0, 200);
    if (!ids.length || !["trash", "restore", "delete"].includes(b.action)) return res.status(400).json({ error: "Pilih artikel dan aksinya dulu." });
    const sel = blog.posts.filter(p => ids.includes(p.id));
    let n = 0;
    if (b.action === "trash") sel.forEach(p => { if (!p.trashedAt) { p.trashedAt = new Date().toISOString(); n++; } });
    else if (b.action === "restore") sel.forEach(p => { if (p.trashedAt) { delete p.trashedAt; n++; } });
    else { const gone = new Set(sel.filter(p => p.trashedAt).map(p => p.id)); n = gone.size; blog.posts = blog.posts.filter(p => !gone.has(p.id)); }
    if (n) await saveBlog();
    res.json({ ok: true, count: n });
  });
  app.delete("/ms/admin/posts/:id", requireAdmin, async (req, res) => {
    const i = blog.posts.findIndex(x => x.id === req.params.id && x.trashedAt); if (i < 0) return res.status(400).json({ error: "Hanya tulisan di sampah yang bisa dihapus permanen." });
    blog.posts.splice(i, 1); await saveBlog(); res.json({ ok: true });
  });

  /* ---------------- API admin: pelanggan & pesanan ---------------- */
  app.get("/ms/admin/users", requireAdmin, (req, res) => {
    res.json({ statuses: STATUSES, users: db.users.map(u => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, orders: db.orders.filter(o => o.userId === u.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) })) });
  });
  app.post("/ms/admin/orders", requireAdmin, express.json({ limit: "8kb" }), async (req, res) => {
    const b = req.body || {};
    const u = db.users.find(x => x.id === b.userId); if (!u) return res.status(404).json({ error: "Pelanggan tidak ditemukan." });
    const title = str(b.title, 120); if (!title) return res.status(400).json({ error: "Nama pesanan wajib diisi." });
    const o = { id: crypto.randomBytes(6).toString("hex"), userId: u.id, title, status: STATUSES.includes(b.status) ? b.status : "Diterima", note: str(b.note, 300), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.orders.push(o); await saveDb(); res.json({ ok: true, order: o });
  });
  app.put("/ms/admin/orders/:id", requireAdmin, express.json({ limit: "8kb" }), async (req, res) => {
    const o = db.orders.find(x => x.id === req.params.id); if (!o) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    const b = req.body || {};
    if (b.title !== undefined) o.title = str(b.title, 120) || o.title;
    if (STATUSES.includes(b.status)) o.status = b.status;
    if (b.note !== undefined) o.note = str(b.note, 300);
    o.updatedAt = new Date().toISOString(); await saveDb(); res.json({ ok: true, order: o });
  });
  app.delete("/ms/admin/orders/:id", requireAdmin, async (req, res) => {
    const i = db.orders.findIndex(x => x.id === req.params.id); if (i < 0) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
    db.orders.splice(i, 1); await saveDb(); res.json({ ok: true });
  });
  // sandi sementara untuk pelanggan yang lupa sandi (tidak ada email otomatis)
  app.post("/ms/admin/users/:id/reset", requireAdmin, async (req, res) => {
    const u = db.users.find(x => x.id === req.params.id); if (!u) return res.status(404).json({ error: "Pelanggan tidak ditemukan." });
    const temp = crypto.randomBytes(6).toString("base64url");
    u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(temp, u.salt); await saveDb();
    res.json({ ok: true, tempPassword: temp });
  });

  /* ---------------- API publik blog (untuk beranda) ---------------- */
  app.get("/ms/blog/latest", (req, res) => {
    res.set("Cache-Control", "no-cache");
    const f = TOPICS[req.query.f] || req.query.f === "ut" ? req.query.f : "";
    const lim = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 3));
    const list = listed().filter(p => !f || p.topic === f || (f === "ut" && (p.topic === "updateut" || p.topic === "study"))).slice(0, lim);
    res.json({ posts: list.map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt, topic: tl(p.topic), cover: p.cover || autoCover(p), date: p.publishedAt })) });
  });

  /* ============================ HALAMAN ============================ */
  const SOCIAL = () => (ctx.getSettings ? ctx.getSettings() : {}) || {};
  /* Teks menu dan footer ikut kamus teks admin (parafrase/sitetexts.js); tanpa kamus = teks bawaan. */
  const CHROME = ["Layanan UT", "Blog", "Masuk", "Privasi", "Ketentuan", "Gelap", "Terang", "Jakarta Barat. Layanan UT dan Blog."];
  const T = () => { const tx = ctx.getTexts && ctx.getTexts(); if (!tx) return s => esc(s); if (!T.reg) { tx.registerExtra(CHROME); T.reg = true; } const m = tx.load(); return s => esc(m.get(s) != null ? m.get(s) : s); };
  function layout({ title, desc, path: pth, body, extra = "", image = "", type = "website", noindex = false, canonical = "" }) {
    const st = SOCIAL(), t = ACAD_ONLY ? T() : esc;
    // Di domain akademik nama merek dikunci (isian "brand" di admin milik landing nextaja dan pernah salah ketik).
    const brand = esc(ACAD_ONLY ? BRAND : (st.brand || BRAND));
    const canon = `${SITE}${canonical || pth}`;
    return rebrand(`<!doctype html>
<html lang="id" data-theme="dark">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${ACAD_ONLY ? "#0b1326" : "#f6f3ff"}">
<link rel="canonical" href="${esc(canon)}">
<meta name="robots" content="${noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1"}">
<meta property="og:type" content="${type}"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="${brand}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canon)}">${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:image" content="${esc(image)}">` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><link rel="alternate" type="application/rss+xml" title="${brand}" href="${SITE}/blog/feed.xml">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Bricolage+Grotesque:wght@600;700&display=swap" rel="stylesheet">
<script>try{var t=localStorage.getItem("nx-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}</script>
<link rel="stylesheet" href="/assets/blog.css?v=10"><link rel="stylesheet" href="/assets/ca-blog.css?v=16"><script async src="/t.js"></script>
${extra}
</head>
<body>
<header class="nav"><div class="wrap">
  <a href="/" class="logo" aria-label="${brand}, beranda"><b>${brand.charAt(0)}</b><span>${brand}</span></a>
  <nav class="links" id="links" aria-label="Menu utama">
    <a href="/ruangakademikut">${t("Layanan UT")}</a><a href="/blog" class="on">${t("Blog")}</a>
  </nav>
  <div class="nav-r">
    <div class="mode" role="group" aria-label="Mode tampilan"><button type="button" data-m="dark">${t("Gelap")}</button><button type="button" data-m="light">${t("Terang")}</button></div>
    <a class="btn btn-pri btn-sm" id="navAcc" href="/ms/masuk">${t("Masuk")}</a>
    <button class="burger" id="burger" aria-label="Buka menu" aria-expanded="false">☰</button>
  </div>
</div></header>
<main>${body}</main>
<footer class="ft"><div class="wrap ft-in"><div class="ft-b"><b>${brand}</b><span>${t("Jakarta Barat. Layanan UT dan Blog.")}</span><small>© ${new Date().getFullYear()} Semua hak dilindungi.</small></div><nav class="ft-n" aria-label="Footer"><a href="/ruangakademikut">${t("Layanan UT")}</a><a href="/blog">${t("Blog")}</a><a href="/ms/masuk">${t("Masuk")}</a><a href="/ms/privasi">${t("Privasi")}</a><a href="/ms/ketentuan">${t("Ketentuan")}</a></nav></div></footer>
<script>
(function(){
function setMode(m){document.documentElement.dataset.theme=m;try{localStorage.setItem("nx-theme",m)}catch(e){}var tc=document.querySelector('meta[name=theme-color]');if(tc)tc.content=m==="light"?${JSON.stringify(ACAD_ONLY ? "#f5f7fa" : "#f6f3ff")}:${JSON.stringify(ACAD_ONLY ? "#0b1326" : "#0a0a1c")};}
document.querySelectorAll(".mode button").forEach(function(b){b.addEventListener("click",function(){setMode(b.dataset.m)})});
setMode(document.documentElement.dataset.theme||"light");
var bg=document.getElementById("burger"),ln=document.getElementById("links");
bg.addEventListener("click",function(){var o=ln.classList.toggle("open");bg.setAttribute("aria-expanded",o)});
fetch("/ms/auth/me",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d.user){var a=document.getElementById("navAcc");a.textContent="Akun saya";a.href="/ms/akun";}}).catch(function(){});
})();
</script>
</body></html>`);
  }

  const PORTAL_IMG = { "": ["blog-berita", "Blog dan berita nextaja"], viral: ["blog-berita", "Blog dan berita nextaja"], updateut: ["jadwal-kalender", "Info UT: jadwal, registrasi, dan ujian"], study: ["materi-belajar", "Materi belajar dan tips kuliah"], ai: ["tools-ai", "Tools AI dan otomatisasi"], social: ["video-studio", "Konten dan social media"] };
  const portalBanner = (key, w, h) => { const [n, alt] = PORTAL_IMG[key] || PORTAL_IMG[""]; return `<img class="pbanner" src="/site-img/portal/${n}.webp" alt="${esc(alt)}" width="${w || 300}" height="${h || 233}" loading="lazy">`; };
  const topicChip = (key, active) => `<a class="chip${active ? " on" : ""}" href="${key ? "/blog?f=" + key : "/blog"}">${key ? esc(TOPICS[key].label) : "Semua"}</a>`;
  const POSTER_POS = ["50% 8%", "62% 20%", "40% 12%", "70% 30%"], POSTER_Z = [1.05, 1.25, 1.15, 1.4];
  const posterHtml = p => { const h = [...String(p.slug || "")].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 4; return `<span class="cvt" style="--pos:${POSTER_POS[h]};--z:${POSTER_Z[h]}"><i>${esc(tl(p.topic))}</i><b>${esc(BRAND)}</b></span>`; };
  const coverHtml = p => ACAD_ONLY ? cardCover(p) : p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : `<span class="ph-t">${esc(tl(p.topic))}</span>`;

  app.get("/blog", (req, res) => {
    const { f, tag, q } = blogFilters(req);
    const heading = q ? `Cari: ${q}` : tag ? `${tagLabel(tag)}: kumpulan artikel` : f ? TOPICS[f].label : (ACAD_ONLY ? "Info dan Panduan Kuliah UT" : "Tulisan terbaru");
    const body = `<section class="pg"><div class="wrap">${blogIndex(req, "/blog")}</div></section>`;
    const blogTitle = `${heading} — Blog ${ACAD_ONLY ? "Catatan Akademik" : "nextaja"}`;
    // halaman tag punya judul & deskripsi sendiri (bukan salinan beranda blog)
    const tagCount = tag ? listed().filter(p => (p.tags || []).includes(tag)).length : 0;
    const blogDesc = tag ? `${tagCount} artikel Catatan Akademik tentang ${tagLabel(tag)} untuk mahasiswa Universitas Terbuka: panduan, tips, dan info terbaru.`
      : ACAD_ONLY ? "Info dan panduan kuliah Universitas Terbuka: jadwal, registrasi, ujian, tugas, Metopen, dan tips belajar dari Catatan Akademik." : "Catatan tentang belajar, social media, AI, dan berita viral hari ini dari nextaja.";
    // halaman pencarian dan tag kosong tidak diindeks; filter kategori/tag yang berisi tetap boleh
    const blogLd = (!f && !tag && !q) ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", "name": blogTitle, "url": `${SITE}/blog`, "description": blogDesc, "isPartOf": { "@type": "WebSite", "name": BRAND, "url": `${SITE}/` }, "mainEntity": { "@type": "ItemList", "itemListElement": published().slice(0, 20).map((p, i) => ({ "@type": "ListItem", "position": i + 1, "url": `${SITE}/blog/${p.slug}`, "name": p.title })) } }).replace(/</g, "\\u003c")}</script>` : "";
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: blogTitle, desc: blogDesc, path: f ? `/blog?f=${f}` : tag ? `/blog?tag=${encodeURIComponent(tag)}` : "/blog", body, extra: blogLd, noindex: !!q || (!!tag && !tagCount) }));
  });
  /* ===== Halaman pillar "Tugas UT": satu pusat topik, artikel pendukung dibaca otomatis dari tulisan yang terbit ===== */
  const CLUSTER = [
    ["Mengerjakan tugas dan Tuton", /tugas|tuton|tutorial|diskusi/i],
    ["Ujian, nilai, dan IPK", /uas|ujian|nilai|ipk|ktpu|kelulusan/i],
    ["Penelitian dan Metopen", /metopen|skripsi|penelitian|taps/i]];
  const clusterOf = p => { const t = `${p.slug} ${p.title} ${(p.tags || []).join(" ")}`; return CLUSTER.findIndex(c => c[1].test(t)); };
  app.get("/tugas-ut", (req, res, next) => {
    if (!ACAD_ONLY) return next();
    const groups = CLUSTER.map(([label]) => ({ label, items: [] }));
    for (const p of listed()) { const i = clusterOf(p); if (i >= 0) groups[i].items.push(p); }
    const all = groups.flatMap(g => g.items);
    const mod = all.map(p => String(modifiedAt(p) || "").slice(0, 10)).filter(Boolean).sort().pop();
    const tools = [["Cek &amp; Parafrase Mandiri", "/ruangakademikut/cek-parafrase-mandiri", "Tandai kalimat yang terlalu mirip, lalu parafrase tanpa mengubah makna."], ["Bedah Laporan Penelitian UT", "/ruangakademikut/bedah-laporan", "Unggah laporan Drillbit dari UT, lihat kalimat yang ditandai dan cara memperbaikinya."], ["Kalkulator nilai UT", "/ruangakademikut/kalkulator-nilai-ut", "Hitung estimasi nilai akhir dan target IPK. Nilai resmi tetap dari MyUT."], ["Tracker Kelulusan &amp; IPK", "/ruangakademikut/tracker-kelulusan", "Pantau SKS dan IPK menuju kelulusan."], ["Kalender Akademik", "/ruangakademikut/kalender-akademik", "Jadwal dan tenggat yang sering terlewat."]];
    const sect = g => g.items.length ? `<section class="ax-box" style="margin:0 0 18px"><h2>${esc(g.label)}</h2><ul style="margin:0;padding-left:18px;line-height:1.9">${g.items.map(p => `<li><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a></li>`).join("")}</ul></section>` : "";
    const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [
      { "@type": "CollectionPage", "name": "Panduan Tugas UT", "url": `${SITE}/tugas-ut`, "description": "Pusat panduan tugas, Tuton, nilai, dan Metopen untuk mahasiswa Universitas Terbuka.", "dateModified": mod, "isPartOf": { "@type": "WebSite", "name": BRAND, "url": `${SITE}/` }, "mainEntity": { "@type": "ItemList", "itemListElement": all.map((p, i) => ({ "@type": "ListItem", "position": i + 1, "url": `${SITE}/blog/${p.slug}`, "name": p.title })) } },
      { "@type": "BreadcrumbList", "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Beranda", "item": `${SITE}/` }, { "@type": "ListItem", "position": 2, "name": "Panduan Tugas UT", "item": `${SITE}/tugas-ut` }] }] }).replace(/</g, "\\u003c");
    const body = `<section class="pg"><div class="wrap" style="max-width:860px">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><span aria-hidden="true">/</span><span aria-current="page">Panduan Tugas UT</span></nav>
      <h1>Panduan Tugas UT: Tuton, Tugas Mandiri, dan Cara Mengeceknya</h1>
      <p class="bx-lead">Satu halaman untuk mulai: apa yang perlu disiapkan sebelum mengerjakan tugas UT, tulisan pendukung yang sudah kami terbitkan, dan alat untuk memeriksa tugasmu sebelum dikumpulkan.</p>
      <section class="ax-box" style="margin:0 0 18px"><h2>Urutan kerja yang aman</h2><ol style="margin:0;padding-left:20px;line-height:1.85"><li>Baca soal dan petunjuk tugas dari tutor, lalu catat tenggat dan format yang diminta.</li><li>Pakai modul dan sumber resmi UT sebagai rujukan utama. Fakta resmi dicek ke <a href="https://www.ut.ac.id" rel="noopener" target="_blank">ut.ac.id</a>.</li><li>Tulis dengan bahasamu sendiri, cantumkan sitasi dan daftar pustaka yang bisa ditelusuri.</li><li>Periksa dulu lewat <a href="/ruangakademikut/cek-parafrase-mandiri">Cek &amp; Parafrase Mandiri</a>, lalu perbaiki bagian yang ditandai.</li><li>Kumpulkan sebelum tenggat, dan simpan bukti pengumpulannya.</li></ol></section>
      ${groups.map(sect).join("")}
      <section class="ax-box" style="margin:0 0 18px"><h2>Alat yang membantu</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">${tools.map(([n, u, d]) => `<a class="ax-rel" href="${u}" style="display:block;padding:12px 14px"><b>${n}</b><br><span style="font-size:13px;opacity:.8">${d}</span></a>`).join("")}</div></section>
      <p class="ax-note">Angka dan skor di alat kami dihitung berdasarkan aturan modul. Itu bukan hasil Drillbit dan bukan penilaian resmi UT, dan kami tidak menjanjikan nilai atau persentase tertentu. ${mod ? `Terakhir diperbarui ${esc(shortDate(mod))}. ` : ""}Lihat <a href="/ruangakademikut/tentang#editorial">kebijakan editorial dan sumber</a>.</p>
    </div></section>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: `Panduan Tugas UT: Tuton, Tugas Mandiri, dan Cara Cek | ${BRAND}`, desc: "Panduan tugas UT untuk mahasiswa Universitas Terbuka: urutan kerja, tulisan tentang Tuton, nilai, IPK, dan Metopen, plus alat cek tugas sebelum dikumpulkan.", path: "/tugas-ut", body, extra: `<script type="application/ld+json">${ld}</script>` }));
  });
  /* Indeks cepat: IndexNow (Bing, Yandex, dll) dipanggil otomatis saat tulisan terbit, berubah, atau dihapus.
     Google tidak punya jalur ping: Google menemukan tulisan lewat sitemap.xml yang selalu diperbarui (daftarkan sekali di Search Console). */
  const KEYF = path.join(DATA_DIR, "indexnow.key");
  let INK = ""; try { INK = fs.readFileSync(KEYF, "utf8").trim(); } catch {}
  if (!/^[a-f0-9]{32}$/.test(INK)) { INK = crypto.randomBytes(16).toString("hex"); try { fs.writeFileSync(KEYF, INK); } catch {} }
  app.get(/^\/([a-f0-9]{32})\.txt$/, (req, res, next) => (req.params[0] === INK ? res.type("text/plain").send(INK) : next()));
  function pingIndex(slugs) {
    if (process.env.NODE_ENV === "test") return;
    const send = (base, urls) => {
      if (!/^https:\/\//.test(base)) return;
      fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host: new URL(base).host, key: INK, keyLocation: `${base}/${INK}.txt`, urlList: urls }), signal: AbortSignal.timeout(8000) })
        .then(r => console.log("IndexNow", new URL(base).host, r.status, urls.length, "url")).catch(e => console.log("IndexNow gagal:", e.message));
    };
    send(SITE, [...slugs.map(s => `${SITE}/blog/${s}`), `${SITE}/blog`]);
  }
  app.get("/blog/feed.xml", (req, res) => {
    const x = t => esc(t);
    res.type("application/rss+xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${BRAND} blog</title><link>${SITE}/blog</link><description>Tips akademik, UT, dan layanan ${BRAND}.</description><language>id-id</language>\n${published().slice(0, 30).map(p => `<item><title>${x(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${x(p.excerpt || p.title)}</description></item>`).join("\n")}\n</channel></rss>\n`);
  });

  /* Bagian penutup lama ("Kalau kamu butuh bantuan ...") di dalam isi tulisan diganti bubble WhatsApp di bawah. */
  const cleanBody = t => importMd.scrubInternal(importMd.htmlToMd(String(t || ""))).replace(/\r/g, "").replace(/\n[ \t]*(?:#{1,3}[ \t]*)?(?:\*\*)?Kalau kamu butuh bantuan(?:\*\*)?[ \t]*\n[\s\S]{0,1600}$/i, "").trimEnd();
  /* Halaman artikel. preview=true: pratinjau admin untuk draf/terjadwal (noindex, tanpa komentar, tidak pernah di-cache). */
  const DEFAULT_AUTHOR = ACAD_ONLY ? "Tim Catatan Akademik" : "dk";
  /* Blok komunitas otomatis di bawah tiap artikel (domain akademik). Tautan dari Pengaturan admin; yang kosong tidak ditampilkan. */
  function communityBlock() {
    if (!ACAD_ONLY) return "";
    const g = k => { const v = String((ctx.getCa && ctx.getCa(k)) || "").trim(); return /^https?:\/\//i.test(v) ? v : ""; };
    const links = [["WhatsApp", g("update_group_url") ? "/grup?dari=artikel" : "", "Grup mahasiswa UT: tanya registrasi, PKBJJ, dan jadwal"], ["Instagram", g("ca_instagram_url"), "Tips dan pengingat"], ["TikTok", g("ca_tiktok_url"), "Video singkat belajar UT"], ["Facebook", g("ca_facebook_url"), "Kabar terbaru"]].filter(x => x[1]);
    if (!links.length) return "";
    return `<aside class="ax-comm" aria-labelledby="axCommH"><h2 id="axCommH">Gabung komunitas ${esc(BRAND)}</h2><p>Biar tidak ketinggalan jadwal dan info penting seputar UT.</p><div class="ax-comm-l">${links.map(([n, u, d]) => `<a href="${esc(u)}" rel="noopener nofollow" target="_blank"><b>${esc(n)}</b><span>${esc(d)}</span></a>`).join("")}</div></aside>`;
  }
  /* ============ PENGUNJUNG ARTIKEL ============
     Dihitung di server saat artikel dibuka: satu pengunjung (IP + browser) dihitung sekali per artikel per hari, bot/crawler dan pratinjau admin tidak dihitung.
     Disimpan di data/blog-views.json: { slug: { t: total, d: { "YYYY-MM-DD": n } } } (rincian harian hanya 35 hari terakhir). */
  const VIEWS = path.join(DATA_DIR, "blog-views.json");
  const views = readJson(VIEWS, {});
  const dayKey = (t = Date.now()) => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
  const seenView = new Map(); let seenDay = dayKey(); let viewTimer = null;
  const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless|lighthouse|monitor|uptime|httpclient|go-http|axios|node-fetch/i;
  function countView(req, slug) {
    const ua = String(req.headers["user-agent"] || "");
    if (req.method !== "GET" || !ua || BOT.test(ua)) return;
    if (req.headers["purpose"] === "prefetch" || req.headers["sec-purpose"]) return;
    const d = dayKey(); if (d !== seenDay) { seenView.clear(); seenDay = d; }
    const key = crypto.createHash("sha1").update(`${req.ip}|${ua}|${slug}`).digest("base64").slice(0, 16);
    if (seenView.has(key)) return; seenView.set(key, 1);
    const v = views[slug] || (views[slug] = { t: 0, d: {} });
    v.t++; v.d[d] = (v.d[d] || 0) + 1;
    const cut = dayKey(Date.now() - 35 * 864e5); for (const k of Object.keys(v.d)) if (k < cut) delete v.d[k];
    if (!viewTimer) viewTimer = setTimeout(() => { viewTimer = null; writeJson(VIEWS, views).catch(() => {}); }, 5000).unref();
  }
  process.on("exit", () => { if (viewTimer) { try { fs.writeFileSync(VIEWS, JSON.stringify(views)); } catch {} } });
  const viewsOf = slug => { const v = views[slug]; if (!v) return { total: 0, week: 0 }; const cut = dayKey(Date.now() - 6 * 864e5); return { total: v.t || 0, week: Object.entries(v.d || {}).filter(([k]) => k >= cut).reduce((a, [, n]) => a + n, 0) }; };
  const nf = n => new Intl.NumberFormat("id-ID").format(n);
  function articlePage(p, { preview = false } = {}) {
    const plain = String(p.body || "").replace(IMG_MD, " ").replace(/[#*_>`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim();
    const desc = p.metaDesc || p.excerpt || (plain.length > 155 ? plain.slice(0, 152).replace(/\s+\S*$/, "") + "…" : plain) || p.title;
    const cvSrc = p.cover || (preview ? "" : autoCover(p));
    const img = cvSrc ? (/^https?:/.test(cvSrc) ? cvSrc : SITE + cvSrc) : SITE + "/icon-512.png";
    const url = `${SITE}/blog/${p.slug}`;
    const author = ACAD_ONLY && (!p.author || p.author === "dk") ? "Tim Catatan Akademik" : (p.author || DEFAULT_AUTHOR);
    const pub = p.publishedAt || p.publishAt || new Date().toISOString();
    const mod = modifiedAt(p) || pub;
    const showUpd = Date.parse(mod) - Date.parse(pub) > 864e5; // "Diperbarui" hanya bila isi berubah lebih dari sehari setelah terbit
    const bodyHtml = renderBody(cleanBody(p.body));
    const toc = [...bodyHtml.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map(m => ({ lv: m[1], id: m[2], t: m[3].replace(/<[^>]+>/g, "") }));
    const tocList = `<ol>${toc.map(h => `<li class="l${h.lv}"><a href="#${h.id}">${h.t}</a></li>`).join("")}</ol>`;
    /* Daftar isi samping: hanya 4 judul utama (H2) yang terlihat; sisanya di balik tombol "Baca lainnya". */
    const li = h => `<li class="l${h.lv}"><a href="#${h.id}">${h.t}</a></li>`;
    const mains = toc.filter(h => h.lv === "2"), shown = new Set(mains.slice(0, 4)), rest = toc.filter(h => !shown.has(h));
    const tocSide = `<ol>${toc.filter(h => shown.has(h)).map(li).join("")}</ol>${rest.length ? `<details class="ax-more"><summary>Baca lainnya</summary><ol>${rest.map(li).join("")}</ol></details>` : ""}`;
    const tags = (p.tags || []).filter(Boolean);
    const overlap = x => (x.tags || []).filter(t => tags.includes(t)).length;
    // terkait: tag yang sama dulu, lalu kategori yang sama, lalu terbaru (selalu terisi bila ada artikel lain)
    const score = x => overlap(x) * 2 + (x.topic === p.topic ? 1 : 0);
    const related = listed().filter(x => x.slug !== p.slug).sort((a, b) => score(b) - score(a) || new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 4);
    const topicLink = `/blog?f=${encodeURIComponent(p.topic)}`;
    const ld = JSON.stringify([{ "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title.slice(0, 110), datePublished: pub, dateModified: mod, description: desc, image: [img], inLanguage: "id-ID", wordCount: plain ? plain.split(" ").length : 0, ...(tags.length ? { keywords: tags.join(", ") } : {}), articleSection: tl(p.topic), author: ACAD_ONLY && author === "Tim Catatan Akademik" ? { "@type": "Organization", name: author, url: `${SITE}/ruangakademikut/tentang` } : { "@type": "Person", name: author }, publisher: { "@type": "Organization", name: BRAND, logo: { "@type": "ImageObject", url: SITE + "/icon-512.png" } }, mainEntityOfPage: { "@type": "WebPage", "@id": url } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Beranda", item: SITE + "/" }, { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog" }, { "@type": "ListItem", position: 3, name: tl(p.topic), item: SITE + topicLink }, { "@type": "ListItem", position: 4, name: p.title, item: url }] }]).replace(/</g, "\\u003c");
    const coverFig = cvSrc
      ? `<figure class="ax-cover"><img src="${esc(cvSrc)}" alt="${esc(p.coverAlt || p.title)}" fetchpriority="high" decoding="async">${p.coverCaption ? `<figcaption>${esc(p.coverCaption)}</figcaption>` : ""}</figure>`
      : (ACAD_ONLY ? `<div class="article-cover article-poster" role="img" aria-label="${esc(p.title)}">${posterHtml(p)}</div>` : "");
    /* Artikel untuk mahasiswa baru: satu kotak di akhir isi (panduan + grup), menggantikan ajakan layanan supaya tidak ada dua CTA bersaing. */
    const isMaba = ACAD_ONLY && ((p.tags || []).some(t => /^(maba|mahasiswa-baru)$/.test(t)) || /mahasiswa baru|\bmaba\b/i.test(p.title));
    const mabaBox = isMaba ? `<aside class="ax-maba" aria-labelledby="axMabaH"><b id="axMabaH">Baru di UT? Baca panduannya dulu.</b><p>Ada checklist setelah registrasi, cara pakai MyUT, dan kalkulator nilai. Kalau masih bingung, tanya mahasiswa lain di grup.</p><div class="ax-maba-b"><a class="ax-hook-b" href="/ruangakademikut/panduan-maba">Buka Panduan Mahasiswa Baru</a><a class="ax-maba-g" href="/grup?dari=artikel">Gabung Komunitas Mahasiswa UT</a></div></aside>` : "";
    const hk = ACAD_ONLY && !isMaba ? hookFor(p) : null;
    const hookTop = hk ? `<div class="ax-hook" role="note"><div><b>${esc(hk.top)}</b><span>${esc(hk.sub)}</span></div><a class="ax-hook-b" href="${esc(hk.href)}">${esc(hk.btn)}</a></div>` : "";
    const hookSide = hk ? `<section class="ax-box ax-hook-side" aria-label="Rekomendasi layanan"><small>Rekomendasi untuk artikel ini</small><h2>${esc(hk.name)}</h2><p>${esc(hk.side)}</p><a class="ax-hook-b" href="${esc(hk.href)}">${esc(hk.btn)}</a></section>` : "";
    const relatedHtml = related.length ? `<section class="ax-box" aria-labelledby="axRelH"><h2 id="axRelH">Artikel Terkait</h2><div class="ax-rels">${related.map(x => `<a class="ax-rel" href="/blog/${esc(x.slug)}"><span class="ax-rel-cv">${cardCover(x)}</span><span><b>${esc(x.title)}</b><small>${esc(tl(x.topic))} · ${esc(shortDate(x.publishedAt))}</small></span></a>`).join("")}</div></section>` : "";
    const readAlso = related.length ? `<section class="ax-also" aria-labelledby="axAlsoH"><h2 id="axAlsoH">Baca juga</h2><p class="ax-also-s">Dipilih otomatis dari tag dan kategori yang sama.</p><div class="ax-also-g">${related.slice(0, 3).map(x => `<a class="ax-also-c" href="/blog/${esc(x.slug)}"><span class="ax-also-cv">${cardCover(x)}</span><b>${esc(x.title)}</b></a>`).join("")}</div><a class="ax-also-all" href="/blog">Lihat semua artikel →</a></section>` : "";
    const otherSvc = ACAD_ONLY ? `<section class="ax-box" aria-label="Layanan lain"><h2>Layanan lain</h2><div class="ax-svc"><a href="/cek-parafrase-mandiri">Cek &amp; Parafrase</a><a href="/tutorial-online">Tutorial Online</a><a href="/ruangakademikut/portal-ut">Portal &amp; Alat UT</a></div></section>` : "";
    /* Navigator situs di samping isi artikel: pohon menu di kanan, "Di artikel ini" di kiri. Di HP kanan jadi laci. */
    const NAVT = [["Blog", [["Semua artikel", "/blog"], ...topicsShown().map(k => [TOPICS[k].label, "/blog?f=" + k])]]];
    if (ACAD_ONLY) NAVT.push(
      ["Tutorial Online", [["Semua Tutorial Online", "/ruangakademikut/tutorial-online"], ["Diskusi", "/ruangakademikut/tutorial-online?tab=harga&s=diskusi"], ["Tugas", "/ruangakademikut/tutorial-online?tab=harga&s=tugas"], ["Makalah", "/ruangakademikut/tutorial-online?tab=harga&s=makalah"], ["Jurnal", "/ruangakademikut/tutorial-online?tab=harga&s=jurnal"], ["Metodologi Penelitian", "/ruangakademikut/tutorial-online?tab=harga&s=metopen"]]],
      ["Layanan", [["Simulasi Presentasi", "/ruangakademikut/layanan?s=simulasi"]]],
      ["Cek & Bedah", [["Cek & Parafrase", "/ruangakademikut/cek-parafrase-mandiri"], ["Bedah Laporan Penelitian UT", "/ruangakademikut/bedah-laporan"]]],
      ["Alat Gratis", [["Kalkulator Nilai & IPK", "/ruangakademikut/kalkulator-nilai-ut"], ["Generator Sitasi APA", "/ruangakademikut/sitasi-apa"], ["Tracker Kelulusan & IPK", "/ruangakademikut/tracker-kelulusan"], ["Kalender Akademik", "/ruangakademikut/kalender-akademik"], ["Sampul & Template Tugas", "/ruangakademikut/sampul-tugas"], ["Panduan Maba", "/ruangakademikut/panduan-maba"]]],
      ["Portal UT", [["Portal UT", "/ruangakademikut/portal-ut"]]]);
    const navTree = NAVT.map(([g, ls], i) => `<details${i === 0 ? " open" : ""}><summary>${esc(g)}</summary><ul>${ls.map(([n, h]) => `<li><a href="${esc(h)}"${h === "/blog?f=" + p.topic ? ' aria-current="page" class="on"' : ""}>${esc(n)}</a></li>`).join("")}</ul></details>`).join("");
    const statusLabel = { draft: "Draf", review: "Menunggu review", scheduled: `Terjadwal ${p.publishAt ? shortDate(p.publishAt) : ""}`, published: "Terbit" }[p.status] || p.status;
    const body = `${preview ? `<div class="ax-prev" role="status">Pratinjau admin · status: <b>${esc(statusLabel)}</b>. Halaman ini tidak terlihat publik dan tidak diindeks.</div>` : ""}<div class="wrap ax${toc.length >= 3 ? "" : " ax-notoc"}">${toc.length >= 3 ? `<aside class="ax-left"><nav class="ax-toc ax-toc-side" aria-labelledby="axTocH"><h2 id="axTocH">Di artikel ini</h2>${tocSide}</nav></aside>` : ""}<article class="ax-main">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Beranda</a><span aria-hidden="true">/</span><a href="/blog">Blog</a><span aria-hidden="true">/</span><a href="${topicLink}">${esc(tl(p.topic))}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.title)}</span></nav>
      <div class="ax-meta"><a class="bx-tag" href="${topicLink}">${esc(tl(p.topic))}</a><time datetime="${esc(pub)}">${esc(shortDate(pub))}</time>${showUpd ? `<span>Diperbarui <time datetime="${esc(mod)}">${esc(shortDate(mod))}</time></span>` : ""}<span>${readMin(p)} menit baca</span><span class="ax-views" title="Jumlah pembaca artikel ini"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>${nf(viewsOf(p.slug).total)} dilihat</span></div>
      ${hookTop}<h1>${esc(p.title)}</h1>
      ${p.excerpt ? `<p class="ax-lead">${esc(p.excerpt)}</p>` : ""}
      <div class="ax-by">Oleh <b>${ACAD_ONLY ? `<a href="/ruangakademikut/tentang" style="color:inherit">${esc(author)}</a>` : esc(author)}</b></div>
      ${coverFig}
      ${toc.length >= 3 ? `<details class="ax-toc ax-toc-in"><summary>Daftar Isi</summary>${tocList}</details>` : ""}
      <div class="prose">${bodyHtml}</div>
      ${mabaBox}
      ${ACAD_ONLY && clusterOf(p) >= 0 ? `<p class="ax-pillar" style="margin:18px 0;font-size:14.5px;line-height:1.7">Lanjut baca: <a href="/tugas-ut">panduan tugas UT</a>, <a href="/ruangakademikut/kalkulator-nilai-ut">kalkulator nilai UT</a>, dan <a href="/ruangakademikut/kalkulator-nilai-ut">cara menghitung IPK UT</a>.</p>` : ""}
      ${tags.length ? `<div class="ax-tags" aria-label="Tag">${tags.map(t => `<a href="/blog?tag=${encodeURIComponent(t)}" rel="tag">${esc(tagLabel(t))}</a>`).join("")}</div>` : ""}
      ${communityBlock()}
      ${readAlso}
      <p class="ax-note">${BRAND} adalah layanan belajar independen yang dikelola oleh mahasiswa UT. Bukan situs resmi Universitas Terbuka. Selalu pegang ketentuan dari tutor dan sumber resmi UT di <a href="https://www.ut.ac.id" rel="noopener" target="_blank">ut.ac.id</a>.${ACAD_ONLY ? ' Lihat <a href="/ruangakademikut/tentang#editorial">kebijakan editorial dan sumber</a>.' : ""}</p>
      <a class="back" href="${topicLink}">← Kembali ke ${esc(tl(p.topic))}</a>
      ${preview ? "" : commentsBlock(p.slug)}
    </article>
    <aside class="ax-side">${hookSide}${otherSvc}<nav class="ax-box ax-navt" id="axNav" aria-label="Navigasi situs"><h2>Navigasi</h2>${navTree}</nav></aside></div>
    <button type="button" class="ax-navbtn" id="axNavBtn" aria-controls="axDrawer" aria-expanded="false" aria-label="Buka navigasi situs">Navigasi</button>
    <div class="ax-drawer" id="axDrawer" role="dialog" aria-label="Navigasi situs" hidden><div class="ax-drawer-in"><button type="button" class="ax-drawer-x" id="axNavX" aria-label="Tutup navigasi">×</button><h2>Navigasi</h2>${navTree}</div></div>
    <script>(function(){var b=document.getElementById("axNavBtn"),d=document.getElementById("axDrawer"),x=document.getElementById("axNavX");if(b&&d){var set=function(o){d.hidden=!o;b.setAttribute("aria-expanded",o);document.body.style.overflow=o?"hidden":"";if(!o)b.focus();};b.addEventListener("click",function(){set(true)});x.addEventListener("click",function(){set(false)});d.addEventListener("click",function(e){if(e.target===d)set(false)});document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!d.hidden)set(false)});}
var links=[].slice.call(document.querySelectorAll(".ax-left a")),hs=links.map(function(a){return document.getElementById(a.getAttribute("href").slice(1))}).filter(Boolean);if(hs.length&&"IntersectionObserver"in window){var cur=null;var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)cur=e.target.id});links.forEach(function(a){var on=a.getAttribute("href")==="#"+cur;a.classList.toggle("on",on);if(on){a.setAttribute("aria-current","true");var L=a.closest(".ax-left");if(L&&L.scrollHeight>L.clientHeight){var t=a.offsetTop-L.clientHeight/2;L.scrollTop=Math.max(0,t)}}else a.removeAttribute("aria-current")});},{rootMargin:"-80px 0px -65% 0px"});hs.forEach(function(h){io.observe(h)});}var sd=document.querySelector(".ax-side");if(sd){var tk=0;function sy(){tk=0;var m=sd.scrollHeight-sd.clientHeight;if(m<=0)return;var D=document.documentElement,p=D.scrollTop/Math.max(1,D.scrollHeight-innerHeight);sd.scrollTop=Math.min(1,Math.max(0,p))*m}addEventListener("scroll",function(){if(!tk)tk=requestAnimationFrame(sy)},{passive:true});sy()}})();</script>${SMARTNAV}
    <a class="wa-bubble" href="/ruangakademikut"><span>Layanan ${esc(BRAND)}</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg></a>`;
    return layout({ title: `${p.metaTitle || p.title} — ${BRAND}`, desc, path: `/blog/${p.slug}`, body, image: img, type: "article", noindex: preview || OFF_TOPIC.includes(p.topic),
      extra: `${cvSrc ? `<meta property="og:image:alt" content="${esc(p.coverAlt || p.title)}"><meta name="twitter:image:alt" content="${esc(p.coverAlt || p.title)}">` : ""}<meta property="article:published_time" content="${esc(pub)}"><meta property="article:modified_time" content="${esc(mod)}">${tags.map(t => `<meta property="article:tag" content="${esc(t)}">`).join("")}${preview ? "" : `<script type="application/ld+json">${ld}</script>`}` });
  }
  const coverJobs = new Map();
  app.get("/blog/cover/:slug.jpg", async (req, res) => {
    const p = COVER_OK && published().find(x => x.slug === req.params.slug);
    if (!p) return res.status(404).type("text").send("Tidak ada");
    const file = path.join(COVER_DIR, cover.keyOf(coverOpts(p)) + ".jpg");
    try {
      if (!fs.existsSync(file)) {
        let job = coverJobs.get(file);
        if (!job) { job = cover.render(coverOpts(p)).then(async b => { await fsp.mkdir(COVER_DIR, { recursive: true }); await fsp.writeFile(file, b); }).finally(() => coverJobs.delete(file)); coverJobs.set(file, job); }
        await job;
      }
      res.set("Cache-Control", "public, max-age=604800").type("jpg").sendFile(file);
    } catch { res.status(500).type("text").send("Gagal membuat sampul"); }
  });
  /* Redirect 301 untuk artikel yang digabung: seed/redirects.json = { "slug-lama": "slug-tujuan" }. Hanya dipakai di domain akademik.
     Slug lama diarahkan walau artikelnya masih ada, jadi cukup hapus/arsipkan artikel lama di admin kapan saja. */
  app.get("/blog/:slug", (req, res, next) => {
    const to = Object.prototype.hasOwnProperty.call(REDIR, req.params.slug) ? String(REDIR[req.params.slug]) : "";
    if (/^[a-z0-9-]{1,90}$/.test(to) && to !== req.params.slug) return res.redirect(301, "/blog/" + to);
    next();
  });
  app.get("/blog/:slug", (req, res, next) => {
    const p = published().find(x => x.slug === req.params.slug);
    if (!p) return next();
    countView(req, p.slug);
    res.set("Cache-Control", "no-cache").type("html").send(articlePage(p));
  });


  /* ============================== KOMENTAR ============================== */
  const CMT = path.join(DATA_DIR, "comments.json");
  let cm = readJson(CMT, { items: [] });
  if (!Array.isArray(cm.items)) cm.items = [];
  let cmWrite = Promise.resolve();
  const saveCm = () => (cmWrite = cmWrite.then(() => writeJson(CMT, cm)));
  const cmRate = new Map();
  function cmLimited(ip) {
    const now = Date.now();
    const arr = (cmRate.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
    cmRate.set(ip, arr);
    if (arr.length >= 3) return true;
    arr.push(now); return false;
  }
  const pubCm = c => ({ id: c.id, name: c.name, text: c.text, at: c.at, reply: c.reply || null });
  app.get("/ms/blog/:slug/comments", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ items: cm.items.filter(c => c.slug === req.params.slug && !c.hidden).sort((a, b) => new Date(a.at) - new Date(b.at)).map(pubCm) });
  });
  app.post("/ms/blog/:slug/comments", express.json({ limit: "4kb" }), needOrigin, async (req, res) => {
    const post = published().find(x => x.slug === req.params.slug);
    if (!post) return res.status(404).json({ error: "Tulisan tidak ditemukan." });
    const b = req.body || {};
    if (b.website) return res.json({ ok: true });
    const u = userFrom(req);
    if (!u) return res.status(401).json({ error: "Masuk dulu untuk berkomentar.", login: true });
    const name = str(u.name || String(u.email || "").split("@")[0], 40);
    const text = str(b.text, 1000);
    if (name.length < 2) return res.status(400).json({ error: "Nama minimal 2 huruf." });
    if (text.length < 3) return res.status(400).json({ error: "Komentar terlalu pendek." });
    if ((text.match(/https?:\/\/|www\./gi) || []).length > 1) return res.status(400).json({ error: "Maksimal satu tautan per komentar." });
    if (cm.items.some(c => c.slug === post.slug && c.name === name && c.text === text)) return res.status(409).json({ error: "Komentar yang sama sudah ada." });
    if (cmLimited(req.ip)) return res.status(429).json({ error: "Terlalu cepat. Coba lagi beberapa menit lagi." });
    const c = { id: crypto.randomBytes(6).toString("hex"), slug: post.slug, name, text, at: new Date().toISOString(), hidden: false, uid: u ? u.id : null };
    cm.items.push(c);
    if (cm.items.length > 5000) cm.items = cm.items.slice(-5000);
    await saveCm();
    res.json({ ok: true, item: pubCm(c) });
  });
  app.get("/ms/admin/comments", requireAdmin, (req, res) => {
    res.json({ items: cm.items.slice().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 300) });
  });
  app.post("/ms/admin/comments/:id/reply", requireAdmin, express.json({ limit: "4kb" }), async (req, res) => {
    const c = cm.items.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    const text = str((req.body || {}).text, 1000);
    c.reply = text ? { text, at: new Date().toISOString() } : null;
    await saveCm(); res.json({ ok: true });
  });
  app.post("/ms/admin/comments/:id/hide", requireAdmin, async (req, res) => {
    const c = cm.items.find(x => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    c.hidden = !c.hidden; await saveCm(); res.json({ ok: true, hidden: c.hidden });
  });
  app.delete("/ms/admin/comments/:id", requireAdmin, async (req, res) => {
    const n = cm.items.length;
    cm.items = cm.items.filter(x => x.id !== req.params.id);
    if (cm.items.length === n) return res.status(404).json({ error: "Komentar tidak ditemukan." });
    await saveCm(); res.json({ ok: true });
  });
  const commentsBlock = slug => `<section class="cmts" id="komentar" aria-labelledby="cmH">
      <h2 id="cmH">Komentar <span id="cmN"></span></h2>
      <div id="cmList" aria-live="polite"><p class="small">Memuat komentar…</p></div>
      <div id="cmLogin" class="cm-login" hidden><b>Mau ikut komentar?</b><span>Masuk dulu (bisa lewat Google, cuma beberapa detik).</span><a class="btn btn-pri btn-sm" href="/ms/masuk?next=${encodeURIComponent("/blog/" + slug)}">Masuk untuk berkomentar</a></div>
      <form id="cmF" class="cmf" novalidate hidden>
        <label>Komentar<textarea name="text" rows="4" maxlength="1000" required placeholder="Tulis pertanyaan atau tanggapan kamu…"></textarea></label>
        <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0">
        <p class="err" id="cmE" role="alert"></p>
        <button class="btn btn-pri" type="submit">Kirim komentar</button>
        <p class="small" id="cmWho"></p>
      </form>
      <script>
      (function(){var slug=${JSON.stringify(slug)},L=document.getElementById("cmList"),F=document.getElementById("cmF"),E=document.getElementById("cmE"),isAdmin=false;
      function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
      function fd(i){return new Date(i).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}
      function api(m,u,b){return fetch(u,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})}
      function render(items){L.textContent="";document.getElementById("cmN").textContent=items.length?"("+items.length+")":"";
        if(!items.length){L.appendChild(el("p","small","Belum ada komentar. Jadi yang pertama."));return}
        items.forEach(function(c){var d=el("div","cm"+(c.hidden?" cm-hid":""));var h=el("div","cm-h");h.appendChild(el("b",null,c.name+(c.hidden?" (disembunyikan)":"")));h.appendChild(el("span","small",fd(c.at)));d.appendChild(h);d.appendChild(el("p",null,c.text));
          if(c.reply){var r=el("div","cm-r");var rh=el("div","cm-h");rh.appendChild(el("b",null,"Admin nextaja"));rh.appendChild(el("span","small",fd(c.reply.at)));r.appendChild(rh);r.appendChild(el("p",null,c.reply.text));d.appendChild(r)}
          if(isAdmin){var a=el("div","cm-a");
            var br=el("button",null,c.reply?"Ubah balasan":"Balas");br.type="button";br.onclick=function(){var t=prompt("Balasan admin:",c.reply?c.reply.text:"");if(t===null)return;api("POST","/ms/admin/comments/"+c.id+"/reply",{text:t}).then(load)};
            var bh=el("button",null,c.hidden?"Tampilkan":"Sembunyikan");bh.type="button";bh.onclick=function(){api("POST","/ms/admin/comments/"+c.id+"/hide").then(load)};
            var bd=el("button",null,"Hapus");bd.type="button";bd.onclick=function(){if(confirm("Hapus komentar ini?"))api("DELETE","/ms/admin/comments/"+c.id).then(load)};
            a.appendChild(br);a.appendChild(bh);a.appendChild(bd);d.appendChild(a)}
          L.appendChild(d)})}
      function load(){var u=isAdmin?"/ms/admin/comments":"/ms/blog/"+encodeURIComponent(slug)+"/comments";
        fetch(u,{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){var it=j.items||[];if(isAdmin)it=it.filter(function(c){return c.slug===slug}).reverse();render(it)}).catch(function(){L.textContent="Komentar gagal dimuat."})}
      fetch("/ms/admin/comments",{cache:"no-store"}).then(function(r){isAdmin=r.ok;load()}).catch(load);
      fetch("/ms/auth/me",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d.user){F.hidden=false;document.getElementById("cmWho").textContent="Berkomentar sebagai "+(d.user.name||d.user.email)+". Admin akan membalas di bawah komentarmu."}else document.getElementById("cmLogin").hidden=false}).catch(function(){document.getElementById("cmLogin").hidden=false});
      F.addEventListener("submit",function(e){e.preventDefault();E.textContent="";var b=F.querySelector("button");b.disabled=true;
        api("POST","/ms/blog/"+encodeURIComponent(slug)+"/comments",{text:F.text.value,website:F.website.value}).then(function(x){b.disabled=false;
          if(x.ok){F.text.value="";load()}else E.textContent=x.j.error||"Gagal mengirim."}).catch(function(){b.disabled=false;E.textContent="Tidak bisa terhubung."})});
      })();
      </script>
    </section>`;


  /* ============================== LAB STUDIO (satu kesatuan) ============================== */
  app.get("/ms/labstudio", (req, res, next) => {
    if (ACAD_ONLY) return res.redirect(301, (process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "") + "/ms/labstudio");
    const wa = String(SOCIAL().waNumber || "6285722227544").replace(/\D/g, "");
    const body = `<section class="pg"><div class="wrap">
      <span class="eyebrow">Lab Studio</span>
      <h1>Preset, template, dan Studio Konten. Satu tempat.</h1>
      <p class="lead">Semua alat untuk bikin feed Instagram yang satu vibe. Lihat dulu semuanya, coba Studio Konten langsung di browser, lalu pilih yang cocok.</p>
      <div class="card ls-studio" id="studio">
        <div><h2>Studio Konten <span class="soon">beta</span></h2>
        <p>Unggah foto, pilih gaya tipografi, atur teksnya, lalu unduh gambarnya. Ada juga ide hook dan kerangka caption. Semua diproses di browser kamu.</p>
        <a class="btn btn-pri" href="/ms/studio">Coba Studio Konten</a></div>
        <img class="ls-img" src="/site-img/portal/video-studio.webp" alt="Video Content Studio" width="311" height="233" loading="lazy">
      </div>
      <div class="ls-hd" id="produk"><h2 class="ls-h">Preset &amp; Template</h2><img class="ls-img" src="/site-img/portal/preset-template.webp" alt="Preset dan template" width="297" height="233" loading="lazy"></div>
      <div class="chips" id="lt" role="tablist"></div>
      <div class="grid" id="lp"><p class="small">Memuat produk…</p></div>
    </div></section>
    <script>
    (function(){var WA=${JSON.stringify(wa)},cat="all",D=null,T=document.getElementById("lt"),P=document.getElementById("lp");
    function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
    function rp(n){return n?"Rp"+Number(n).toLocaleString("id-ID"):""}
    function draw(){P.textContent="";var items=D.products.filter(function(p){return p.active!==false&&(cat==="all"||p.type===cat)});
      if(!items.length){P.appendChild(el("p","small","Belum ada produk di kategori ini."));return}
      items.forEach(function(p){var c=el("article","card post ls-p");var cv=el("div","cv");
        if(/^\\/uploads\\/[a-z0-9._-]+$/i.test(p.image||"")){var im=el("img");im.src=p.image;im.alt="";im.loading="lazy";cv.appendChild(im)}else{cv.style.background="linear-gradient(135deg,"+(p.c1||"#7c3aed")+","+(p.c2||"#0a0a1c")+")";cv.appendChild(el("span","ph-t",p.title||p.name))}
        if(p.badge)cv.appendChild(el("span","ls-bd",p.badge));
        var b=el("div","pb");b.appendChild(el("h3",null,p.name));b.appendChild(el("p","small",p.desc||""));
        if(p.items&&p.items.length){var u=el("ul","ls-it");p.items.forEach(function(x){u.appendChild(el("li",null,x))});b.appendChild(u)}
        var pr=el("div","ls-pr");pr.appendChild(el("b",null,rp(p.price)));if(p.old&&p.old>p.price)pr.appendChild(el("s",null,rp(p.old)));b.appendChild(pr);
        var a=el("a","btn btn-pri btn-sm","Pesan via WhatsApp");a.target="_blank";a.rel="noopener";a.href="https://wa.me/"+WA+"?text="+encodeURIComponent("Halo admin nextaja, saya mau pesan: "+p.name);b.appendChild(a);
        c.appendChild(cv);c.appendChild(b);P.appendChild(c)})}
    fetch("/ms/store",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){D=d;
      var cats=(d.settings&&d.settings.categories||[]).filter(function(c){return d.products.some(function(p){return p.type===c.id&&p.active!==false})});
      var all=[{id:"all",label:"Semua"}].concat(cats);
      all.forEach(function(c){var b=el("button","chip"+(c.id==="all"?" on":""),c.label);b.type="button";b.onclick=function(){cat=c.id;T.querySelectorAll(".chip").forEach(function(x){x.classList.toggle("on",x===b)});draw()};T.appendChild(b)});
      if(all.length<3)T.hidden=true;draw()}).catch(function(){P.textContent="Produk gagal dimuat. Muat ulang halaman."});
    })();
    </script>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: "Lab Studio: preset, template, dan Studio Konten — nextaja", desc: "Preset Lightroom, template Canva, dan Studio Konten untuk feed Instagram yang satu vibe.", path: "/ms/labstudio", body }));
  });

  /* ---- Studio Konten Fase 0: desain tipografi + kerangka caption, semua di browser ---- */
  app.get("/ms/studio", (req, res) => {
    const body = `<section class="pg"><div class="wrap">
  <span class="eyebrow">Studio Konten · Fase 0</span>
  <h1>Foto jadi konten siap posting</h1>
  <p class="lead">Unggah foto, pilih gaya, atur teksnya, lalu unduh gambarnya. Semua diproses di browser kamu dan fotonya tidak dikirim ke server kami. Posting otomatis ke TikTok dan Instagram belum tersedia.</p>
  <div class="stu stu-wrap">
    <div class="stu-card card">
      <h3>1. Foto dan ukuran</h3>
      <label>Foto (JPG, PNG, atau WebP, maksimal 15 MB)<input type="file" id="file" accept="image/*"></label>
      <div class="row"><button type="button" class="pill" id="clear">Hapus foto</button></div>
      <div class="row" id="fmt" role="group" aria-label="Ukuran"><button type="button" class="pill" data-f="4:5" aria-pressed="true">4:5 Feed</button><button type="button" class="pill" data-f="1:1" aria-pressed="false">1:1 Kotak</button><button type="button" class="pill" data-f="9:16" aria-pressed="false">9:16 Story/Reels</button></div>
      <label>Zoom foto<input type="range" id="zoom" min="1" max="3" step="0.01" value="1"></label>
      <p class="small" id="msg" aria-live="polite" style="margin:0"></p>
      <h3>2. Gaya tipografi</h3>
      <div class="row" id="tpl" role="group" aria-label="Gaya"><button type="button" class="pill" data-t="bold" aria-pressed="true">Bold bawah</button><button type="button" class="pill" data-t="center" aria-pressed="false">Tengah</button><button type="button" class="pill" data-t="editorial" aria-pressed="false">Editorial</button><button type="button" class="pill" data-t="poster" aria-pressed="false">Poster merah</button><button type="button" class="pill" data-t="quote" aria-pressed="false">Kutipan</button><button type="button" class="pill" data-t="minimal" aria-pressed="false">Minimal</button></div>
      <h3>3. Teks</h3>
      <label>Headline<textarea id="head" maxlength="180">Judul kontenmu di sini</textarea></label>
      <label>Subteks<input type="text" id="sub" maxlength="120" value="Subteks singkat yang menjelaskan isinya"></label>
      <div class="two"><label>Nama akun<input type="text" id="handle" maxlength="40" value="@akunmu"></label><label>Warna aksen<input type="color" id="acc" value="#7c3aed"></label></div>
      <label>Ukuran headline<input type="range" id="size" min="60" max="140" step="1" value="100"></label>
      <button type="button" class="btn btn-pri" id="dl">Unduh PNG</button>
      <p class="stu-note">Cek lagi teks dan hak pakai fotonya sebelum diposting. Kamu yang bertanggung jawab atas isi kontenmu.</p>
    </div>
    <div class="stu-prev"><canvas id="cv" width="1080" height="1350" aria-label="Pratinjau desain. Geser untuk mengatur posisi foto."></canvas><p class="small">Geser foto di pratinjau untuk mengatur posisi.</p></div>
  </div>

  <div class="stu-card card" style="margin-top:24px">
    <h3>Ide hook dan kerangka caption</h3>
    <p class="small" style="margin:0">Dibuat dari templat kalimat, bukan AI. Selalu edit supaya cocok dengan isi kontenmu.</p>
    <div class="two"><label>Topik<input type="text" id="topic" maxlength="60" placeholder="contoh: analisa TikTok"></label><label>Untuk siapa<input type="text" id="aud" maxlength="40" placeholder="contoh: Kreator pemula"></label></div>
    <div class="row"><button type="button" class="btn btn-pri btn-sm" id="hookGo">Buat ide hook</button></div>
    <div id="hooks" style="display:grid;gap:10px"></div>
    <h3>Kerangka caption</h3>
    <label>Hook<input type="text" id="cHook" maxlength="200" placeholder="tempel atau ketik hook"></label>
    <label>Poin isi (satu baris satu poin)<textarea id="cPts" placeholder="Poin 1&#10;Poin 2&#10;Poin 3"></textarea></label>
    <label>Tujuan<select id="cGoal"><option value="edukasi">Edukasi</option><option value="jualan">Jualan</option><option value="cerita">Cerita</option></select></label>
    <div class="row"><button type="button" class="btn btn-ghost btn-sm" id="capGo">Susun caption</button><button type="button" class="btn btn-ghost btn-sm" id="capCopy">Salin caption</button></div>
    <label>Hasil caption (boleh diedit)<textarea id="cOut" style="min-height:160px"></textarea></label>
  </div>
</div></section>
<script src="/assets/studio.js?v=1" defer></script>`;
    res.set("Cache-Control", "no-cache").type("html").send(layout({ title: "Studio Konten — nextaja", desc: "Ubah fotomu jadi desain tipografi siap posting dan susun kerangka caption, langsung di browser.", path: "/ms/studio", body, extra: '<link rel="stylesheet" href="/assets/studio.css?v=1">' }));
  });

  /* ---- kebijakan privasi & ketentuan ---- */
  const legalPage = (title, desc, pth, html) => (req, res) => {
    const wa = String((SOCIAL().waNumber) || "6285722227544");
    const body = `<section class="pg"><div class="wrap narrow"><article class="card" style="padding:28px;line-height:1.75">${html.replace(/\{WA\}/g, `<a href="https://wa.me/${wa}" rel="noopener">WhatsApp admin</a>`)}</article></div></section>`;
    res.type("html").send(layout({ title, desc, path: pth, body }));
  };
  app.get("/ms/privasi", legalPage("Kebijakan Privasi — nextaja", "Data apa yang nextaja kumpulkan dan bagaimana dipakai.", "/ms/privasi", `
    <h1>Kebijakan Privasi</h1>
    <p>Terakhir diperbarui: Oktober 2026. Situs ini dikelola oleh nextaja, Jakarta Barat.</p>
    <h2>Data yang kami simpan</h2>
    <p>Kalau kamu membuat akun atau masuk dengan Google, kami menyimpan nama dan alamat email kamu. Kalau kamu memesan jasa, kami menyimpan nama pesanan, statusnya, dan catatan yang diperlukan untuk mengerjakannya. Sandi akun email-sandi disimpan dalam bentuk acak (hash), bukan teks asli.</p>
    <h2>Masuk dengan Google</h2>
    <p>Kami hanya menerima nama dan alamat email dari akun Google kamu untuk membuat dan mengenali akunmu. Kami tidak mengakses Gmail, kontak, Drive, atau data Google lainnya.</p>
    <h2>Untuk apa data dipakai</h2>
    <p>Hanya untuk menjalankan akun dan pesananmu, serta menghubungi kamu terkait pesanan. Kami tidak menjual atau menyewakan data kamu kepada pihak lain.</p>
    <h2>Cookie</h2>
    <p>Kami memakai cookie sesi agar kamu tetap masuk, dan penyimpanan lokal untuk mengingat pilihan tampilan terang atau gelap. Tidak ada cookie iklan.</p>
    <h2>Statistik kunjungan</h2>
    <p>Kami menghitung jumlah kunjungan dan halaman yang dibuka untuk mengetahui materi apa yang dibutuhkan pembaca. Penghitungan ini tidak memakai cookie dan tidak menyimpan alamat IP: pengunjung hanya dikenali lewat kode acak yang berganti setiap hari. Kami menghormati sinyal Do Not Track dan Global Privacy Control, dan tidak menghitung kunjungan admin.</p>
    <h2>Hapus data kamu</h2>
    <p>Minta penghapusan akun dan datamu kapan saja lewat {WA}.</p>`));
  app.get("/ms/ketentuan", legalPage("Ketentuan Layanan — nextaja", "Aturan pemakaian situs dan layanan nextaja.", "/ms/ketentuan", `
    <h1>Ketentuan Layanan</h1>
    <p>Terakhir diperbarui: Oktober 2026. Dengan memakai situs ini, kamu setuju dengan ketentuan berikut.</p>
    <h2>Layanan</h2>
    <p>nextaja menyediakan analisa akun, preset dan template, bantuan akademik, serta jasa housekeeping. Detail, harga, dan jadwal disepakati lewat WhatsApp sebelum pengerjaan.</p>
    <h2>Bantuan akademik</h2>
    <p>Bantuan akademik berupa pendampingan dan referensi untuk membantu kamu belajar. Kami tidak menjamin nilai atau kelulusan. Kamu bertanggung jawab atas karya yang kamu kumpulkan dan atas kepatuhan pada aturan kampusmu.</p>
    <h2>Pembayaran</h2>
    <p>Pembayaran memakai QRIS dengan nominal rupiah yang tertera di halaman pesanan. Pesanan diproses setelah kamu mengunggah bukti bayar dan admin mengonfirmasinya. Jika pembayaran tidak bisa diverifikasi karena kendala dari pihak kami, dananya dikembalikan.</p>
    <h2>Akun</h2>
    <p>Jaga kerahasiaan akunmu. Kami bisa menonaktifkan akun yang dipakai untuk menyalahgunakan layanan.</p>
    <h2>Perubahan</h2>
    <p>Ketentuan dan layanan bisa berubah. Pertanyaan: {WA}.</p>`));

  /* ---- login & akun ---- */
  app.get("/ms/masuk", (req, res) => {
    if (userFrom(req)) return res.redirect("/ms/akun");
    const body = `<section class="pg"><div class="wrap narrow">
      <div class="card form">
        <div class="tabs2" role="tablist"><button type="button" data-t="in" aria-pressed="true">Masuk</button><button type="button" data-t="up" aria-pressed="false">Daftar</button></div>
        <form id="f" novalidate>
          <label id="lName" hidden>Nama<input name="name" autocomplete="name" maxlength="60"></label>
          <label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
          <label id="lPromo" class="small" hidden style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="promo" style="width:auto;margin-top:3px"><span>Saya setuju menerima email info dan promosi dari Catatan Akademik. <b>Wajib untuk akun Gmail.</b> Bisa berhenti kapan saja.</span></label>
          <label>Sandi<span class="pw"><input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="100"><button type="button" id="pwT" aria-label="Tampilkan sandi" aria-pressed="false">Lihat</button></span><small id="hint" hidden>Minimal 8 karakter.</small></label>
          <p class="err" id="err" role="alert"></p>
          <button class="btn btn-pri" id="go" type="submit">Masuk</button>
        </form>
        <div id="gWrap" hidden><div class="or"><span>atau</span></div><label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px"><input type="checkbox" id="gPromo" style="width:auto;margin-top:3px"><span>Saya setuju menerima email info dan promosi dari Catatan Akademik (wajib untuk masuk dengan Google).</span></label><div id="gBtn" style="display:flex;justify-content:center;opacity:.4;pointer-events:none"></div></div>
        <p class="small">Lupa sandi? <a id="wa" href="#" target="_blank" rel="noopener">Hubungi admin lewat WhatsApp</a> dan minta sandi sementara.</p>
      </div></div></section>
      <script>
      (function(){var NEXT=(function(){var n=new URLSearchParams(location.search).get("next")||"";return /^\\/[a-zA-Z0-9\\/_\\-?=&.%]*$/.test(n)&&n.indexOf("//")!==0?n:"/ms/akun"})();var mode="in",f=document.getElementById("f"),err=document.getElementById("err");
      var w=${JSON.stringify(String((SOCIAL().waNumber) || "6285722227544"))};document.getElementById("wa").href="https://wa.me/"+w+"?text="+encodeURIComponent("Halo admin nextaja, saya lupa sandi akun saya.");
      document.querySelectorAll(".tabs2 button").forEach(function(b){b.addEventListener("click",function(){mode=b.dataset.t;
        document.querySelectorAll(".tabs2 button").forEach(function(x){x.setAttribute("aria-pressed",x===b)});
        document.getElementById("lName").hidden=mode!=="up";document.getElementById("lPromo").hidden=mode!=="up";document.getElementById("hint").hidden=mode!=="up";
        document.getElementById("go").textContent=mode==="up"?"Buat akun":"Masuk";f.password.autocomplete=mode==="up"?"new-password":"current-password";err.textContent="";});});
      document.getElementById("pwT").addEventListener("click",function(){var sh=f.password.type==="password";f.password.type=sh?"text":"password";this.textContent=sh?"Sembunyi":"Lihat";this.setAttribute("aria-pressed",sh);this.setAttribute("aria-label",sh?"Sembunyikan sandi":"Tampilkan sandi")});
      var GID=${JSON.stringify(GOOGLE_ID)};
      if(GID){var sc=document.createElement("script");sc.src="https://accounts.google.com/gsi/client";sc.async=true;sc.onload=function(){
        google.accounts.id.initialize({client_id:GID,callback:function(r){err.textContent="";
          fetch("/ms/auth/google",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:r.credential,promo:document.getElementById("gPromo").checked})})
          .then(function(x){return x.json().then(function(j){return {ok:x.ok,j:j}})}).then(function(x){if(x.ok)location.href=NEXT;else err.textContent=x.j.error||"Gagal. Coba lagi.";})
          .catch(function(){err.textContent="Tidak bisa terhubung. Coba lagi.";});}});
        google.accounts.id.renderButton(document.getElementById("gBtn"),{theme:"outline",size:"large",text:"continue_with",shape:"pill",width:300,locale:"id"});
        document.getElementById("gWrap").hidden=false;document.getElementById("gPromo").addEventListener("change",function(){var b=document.getElementById("gBtn");b.style.opacity=this.checked?"1":".4";b.style.pointerEvents=this.checked?"auto":"none";});};document.head.appendChild(sc);}
      f.addEventListener("submit",function(e){e.preventDefault();err.textContent="";var go=document.getElementById("go");if(go.disabled)return;var lbl=go.textContent;go.disabled=true;go.textContent="Memproses...";
        var d={email:f.email.value,password:f.password.value};if(mode==="up"){d.name=f.name.value;d.promo=f.promo.checked;if(/@(gmail|googlemail)\\.com$/i.test(f.email.value.trim())&&!d.promo){err.textContent="Akun Gmail wajib mencentang persetujuan email info dan promosi.";go.disabled=false;go.textContent=lbl;return;}}
        fetch("/ms/auth/"+(mode==="up"?"register":"login"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){if(x.ok)location.href=NEXT;else err.textContent=x.j.error||"Gagal. Coba lagi.";})
        .catch(function(){err.textContent="Tidak bisa terhubung. Coba lagi.";}).then(function(){go.disabled=false;go.textContent=lbl;});});})();
      </script>`;
    res.set("Cache-Control", "no-store").type("html").send(layout({ title: "Masuk atau daftar — nextaja", desc: "Masuk ke akun nextaja untuk melihat pesanan kamu.", path: "/ms/masuk", body }));
  });
  app.get("/ms/akun", (req, res) => {
    const u = userFrom(req);
    if (!u) return res.redirect("/ms/masuk");
    const body = `<section class="pg"><div class="wrap narrow">
      <span class="eyebrow">Akun saya</span><h1>Halo, ${esc(u.name)}</h1><p class="lead">${esc(u.email)}</p>
      <div class="card form"><h3>Pesanan saya</h3><div id="orders" class="orders"><div class="empty">Memuat…</div></div></div>
      <div class="card form"><h3>Ganti sandi</h3>
        <form id="pw" novalidate><label>Sandi lama<input name="old" type="password" autocomplete="current-password"></label><label>Sandi baru<input name="new" type="password" autocomplete="new-password" minlength="8"></label><p class="err" id="pe" role="alert"></p><button class="btn btn-pri btn-sm" type="submit">Simpan sandi</button></form></div>
      <button class="btn btn-ghost btn-sm" id="out" type="button" style="margin-top:18px">Keluar</button>
      </div></section>
      <script>
      (function(){var box=document.getElementById("orders");
      function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
      fetch("/ms/auth/orders",{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){
        var o=d.orders||[];box.innerHTML=o.length?o.map(function(x){return '<div class="ord"><div><b>'+esc(x.title)+'</b>'+(x.note?'<small>'+esc(x.note)+'</small>':'')+'</div><span class="st st-'+esc(x.status)+'">'+esc(x.status)+'</span></div>'}).join(""):'<div class="empty">Belum ada pesanan. Pesanan yang kamu buat lewat WhatsApp akan muncul di sini setelah admin mencatatnya.</div>';
      }).catch(function(){box.innerHTML='<div class="empty">Gagal memuat pesanan.</div>'});
      document.getElementById("out").addEventListener("click",function(){fetch("/ms/auth/logout",{method:"POST"}).then(function(){location.href="/"})});
      var f=document.getElementById("pw"),pe=document.getElementById("pe");
      f.addEventListener("submit",function(e){e.preventDefault();pe.textContent="";pe.style.color="";
        fetch("/ms/auth/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({old:f.old.value,new:f.new.value})})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})}).then(function(x){if(x.ok){pe.style.color="var(--acc)";pe.textContent="Sandi sudah diganti.";f.reset();}else pe.textContent=x.j.error||"Gagal.";});});})();
      </script>`;
    res.set("Cache-Control", "no-store").type("html").send(layout({ title: "Akun saya — nextaja", desc: "Pesanan dan pengaturan akun nextaja.", path: "/ms/akun", body }));
  });

  /* Halaman 404 bermerek (status tetap 404). Di domain non-akademik cukup halaman polos tanpa merek akademik. */
  function notFound(req, res) {
    res.status(404).set("Cache-Control", "no-store");
    if (ACAD_ONLY && !onAcadHost(req)) return res.type("html").send('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Halaman tidak ditemukan</title><body style="font-family:system-ui;padding:40px"><h1>Halaman tidak ditemukan</h1><p><a href="/">Kembali ke beranda</a></p></body></html>');
    const latest = listed().slice(0, 4);
    const body = `<section class="pg"><div class="wrap nf">
      <span class="bx-eyebrow">Error 404</span><h1>Halaman tidak ditemukan</h1>
      <p class="bx-lead">Alamat yang kamu buka tidak ada atau sudah dipindah. Coba cari artikelnya, atau buka salah satu halaman di bawah.</p>
      <form class="bx-search" role="search" action="/blog" method="get"><label class="bx-sr" for="nfq">Cari artikel</label><input id="nfq" type="search" name="q" maxlength="80" placeholder="Cari artikel…"><button type="submit">Cari</button></form>
      <nav class="bx-chips" aria-label="Halaman utama"><a class="bx-chip" href="/">Beranda</a><a class="bx-chip" href="/blog">Blog</a><a class="bx-chip" href="/ruangakademikut">Layanan UT</a><a class="bx-chip" href="/ruangakademikut/pesanan">Cek Pesanan</a></nav>
      ${latest.length ? `<div class="bx-head"><h2>Artikel terbaru</h2></div><div class="bx-grid">${latest.map(blogCard).join("")}</div>` : ""}
    </div></section>`;
    res.type("html").send(layout({ title: `Halaman tidak ditemukan — ${BRAND}`, desc: "Halaman tidak ditemukan.", path: "/404", body, noindex: true }));
  }

  /* halaman statis di sitemap: lastmod = kapan berkas halamannya terakhir berubah (tanggal rilis), bukan tanggal buatan */
  const SITEMAP_PAGES = { "/ruangakademikut": "hub.html", "/ruangakademikut/cek-parafrase-mandiri": "cek.html", "/ruangakademikut/tentang": "tentang.html", "/ruangakademikut/bedah-laporan": "bedah.html", "/ruangakademikut/layanan": "layanan.html", "/ruangakademikut/tutorial-online": "tutorial-online.html", "/ruangakademikut/kalkulator-nilai-ut": "alat-nilai.html", "/ruangakademikut/sampul-tugas": "alat-sampul.html", "/ruangakademikut/tracker-kelulusan": "alat-tracker.html", "/ruangakademikut/kalender-akademik": "alat-kalender.html", "/ruangakademikut/panduan-maba": "panduan-maba.html", "/ruangakademikut/sitasi-apa": "sitasi.html", "/ruangakademikut/portal-ut": "portal-ut.html" };
  const pageMod = file => { try { return fs.statSync(path.join(__dirname, "parafrase", "pages", file)).mtime.toISOString().slice(0, 10); } catch { return undefined; } };
  // untuk sitemap. /blog-ut tidak didaftarkan: isinya sama dengan /blog (kanonis ke /blog).
  return { userFrom, userById: id => db.users.find(x => x.id === id) || null, userByEmail: e => db.users.find(x => String(x.email || "").toLowerCase() === String(e || "").trim().toLowerCase()) || null, notFound, articlePage, isLive, suggestTags, suggestTopic, tagLabel, posts: () => blog.posts, usersCount: () => db.users.length, TOPICS, ACAD_TOPICS, pageUrls: () => (ACAD_ONLY ? [{ loc: `${SITE}/`, lastmod: pageMod("beranda.html"), pri: "1.0" }, { loc: `${SITE}/tugas-ut`, lastmod: published().map(p => String(modifiedAt(p) || "").slice(0, 10)).filter(Boolean).sort().pop(), pri: "0.9" }] : []).concat(Object.entries(SITEMAP_PAGES).map(([u, file]) => ({ loc: `${SITE}${ACAD_ONLY ? (u === "/ruangakademikut" ? "/layanan-ut" : shortPath(u)) : u}`, lastmod: pageMod(file), pri: "0.7" }))), blogUrls: () => published().filter(p => !OFF_TOPIC.includes(p.topic)).map(p => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: String(modifiedAt(p) || "").slice(0, 10), pri: "0.6" })) };
};
