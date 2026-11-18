'use strict';
// Modul blog HeyAIPeople: artikel .md -> halaman statis /blog, jadwal tayang (WIB)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
module.exports = function (ctx) {
  const { db, WEB, getState } = ctx;
  db.exec('CREATE TABLE IF NOT EXISTS posts(slug TEXT PRIMARY KEY,title TEXT,cat TEXT,descr TEXT,tags TEXT,cover TEXT,body TEXT,cta_t TEXT,cta_u TEXT,status TEXT DEFAULT \'draft\',pub_at TEXT,created TEXT,updated TEXT)');
  for (const c of ['mtitle', 'keyword']) { try { db.exec('ALTER TABLE posts ADD COLUMN ' + c + ' TEXT DEFAULT \'\''); } catch (e) {} }
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);
  const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const COVER = /^\/uploads\/[a-f0-9]{32}\.jpg$/;
  const safeUrl = v => { v = str(v, 300).trim(); return /^(https?:\/\/|\/)[^\s<>"]*$/.test(v) ? v : ''; };
  const slugify = t => str(t, 200).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
  const wibDate = iso => new Date(new Date(iso).getTime() + 7 * 3600e3);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const fmt = iso => { const d = wibDate(iso); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); };

  // ---------- parser .md ----------
  function parseMd(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const o = { title: '', slug: '', mtitle: '', keyword: '', cat: '', descr: '', tags: '', cover: '', cta_t: '', cta_u: '', body: text };
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (m) {
      o.body = text.slice(m[0].length);
      for (const line of m[1].split('\n')) {
        const k = /^([A-Za-z_]+)\s*:\s*(.*)$/.exec(line); if (!k) continue;
        let v = k[2].trim().replace(/^["']|["']$/g, '');
        const key = k[1].toLowerCase();
        if (key === 'title') o.title = v; else if (key === 'slug') o.slug = v;
        else if (key === 'meta_title' || key === 'metatitle') o.mtitle = v; else if (key === 'keyword' || key === 'kata_kunci') o.keyword = v;
        else if (key === 'topic') { if (!o.cat) o.cat = v; }
        else if (key === 'category' || key === 'kategori') o.cat = v;
        else if (key === 'description' || key === 'meta' || key === 'deskripsi') o.descr = v;
        else if (key === 'tags' || key === 'tag') o.tags = v.replace(/^\[|\]$/g, '').split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean).join(', ');
        else if (key === 'cta_text') o.cta_t = v; else if (key === 'cta_url') o.cta_u = v;
      }
    }
    if (!o.title) { const h = /^#\s+(.+)$/m.exec(o.body); if (h) o.title = h[1].trim(); }
    o.body = o.body.replace(/^\s*#\s+.+\n/, m2 => (o.title && m2.includes(o.title) ? '' : m2)).trim();
    return o;
  }
  function clean(i) {
    const title = str(i.title, 140).trim(); if (!title) throw new Error('Judul wajib diisi');
    let slug = str(i.slug, 80).trim().toLowerCase(); if (!slug) slug = slugify(title);
    if (!SLUG.test(slug)) throw new Error('Alamat (slug) hanya huruf kecil, angka, dan tanda minus');
    const body = str(i.body, 60000).trim(); if (body.length < 50) throw new Error('Isi artikel terlalu pendek');
    return { slug, title, mtitle: str(i.mtitle, 120).trim(), keyword: str(i.keyword, 80).trim(), cat: str(i.cat, 40).trim() || 'Umum', descr: str(i.descr, 300).trim() || body.replace(/[#*>\-`\[\]()]/g, '').replace(/\s+/g, ' ').slice(0, 155),
      tags: str(i.tags, 200), cover: COVER.test(i.cover || '') ? i.cover : '', body, cta_t: str(i.cta_t, 60).trim(), cta_u: safeUrl(i.cta_u) };
  }

  // ---------- markdown -> html (aman: semua teks di-escape) ----------
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]*)\)/g, (m, t, u) => '<a href="' + u + '"' + (u[0] === '/' ? '' : ' target="_blank" rel="noopener"') + '>' + t + '</a>');
    return s;
  }
  function md2html(md) {
    const L = String(md).split('\n'), out = []; let i = 0;
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = /^(#{1,3})\s+(.+)$/.exec(l))) { out.push(m[1].length === 3 ? '<h3>' + inline(m[2]) + '</h3>' : '<h2>' + inline(m[2]) + '</h2>'); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(l)) { const b = []; while (i < L.length && /^>\s?/.test(L[i])) b.push(L[i++].replace(/^>\s?/, '')); out.push('<blockquote>' + inline(b.join(' ')) + '</blockquote>'); continue; }
      if (/^\s*[-*]\s+/.test(l)) { const b = []; while (i < L.length && /^\s*[-*]\s+/.test(L[i])) b.push('<li>' + inline(L[i++].replace(/^\s*[-*]\s+/, '')) + '</li>'); out.push('<ul>' + b.join('') + '</ul>'); continue; }
      if (/^\s*\d+[.)]\s+/.test(l)) { const b = []; while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) b.push('<li>' + inline(L[i++].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); out.push('<ol>' + b.join('') + '</ol>'); continue; }
      const b = []; while (i < L.length && L[i].trim() && !/^(#{1,3}\s|>|\s*[-*]\s+|\s*\d+[.)]\s+|-{3,}\s*$)/.test(L[i])) b.push(L[i++].trim());
      out.push('<p>' + inline(b.join(' ')) + '</p>');
    }
    return out.join('\n');
  }

  // ---------- halaman publik ----------
  const GRAD = [['#FF4D1C', '#FF8A3D'], ['#7C3AED', '#0EA5E9'], ['#16A34A', '#0EA5E9'], ['#09090B', '#3F3F46'], ['#DB2777', '#FF8A3D'], ['#0EA5E9', '#7C3AED']];
  const grad = slug => GRAD[parseInt(crypto.createHash('md5').update(slug).digest('hex').slice(0, 4), 16) % GRAD.length];
  const covHtml = (p, big) => p.cover ? '<div class="cov"><img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' :
    '<div class="cov" style="background:linear-gradient(135deg,' + grad(p.slug)[0] + ',' + grad(p.slug)[1] + ')"><span>' + esc((p.cat || 'A').trim().charAt(0).toUpperCase()) + '</span></div>';
  const CSS = ':root{--o:%A%;--o2:%B%;--ink:#0B0B0F;--ink2:#3F3F46;--mut:#71717A;--paper:#FBFAF7;--line:#E7E5DF}*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:Inter,sans-serif;background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}a{color:inherit;text-decoration:none}.wrap{max-width:1180px;margin:0 auto;padding:0 22px}.disp{font-family:"Plus Jakarta Sans",Inter,sans-serif;font-weight:800;letter-spacing:-.03em}'
    + '.bg{position:fixed;inset:0;z-index:-1;background:radial-gradient(60vw 50vw at 85% -10%,rgba(255,138,61,.22),transparent 60%),radial-gradient(50vw 45vw at -10% 30%,rgba(255,77,28,.12),transparent 60%),var(--paper)}'
    + 'nav{position:sticky;top:12px;z-index:50;margin:12px auto 0;max-width:1120px;padding:0 14px}.nav-in{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px 9px 18px;background:rgba(255,255,255,.78);backdrop-filter:blur(16px);border:1px solid rgba(231,229,223,.9);border-radius:999px;box-shadow:0 10px 30px -14px rgba(0,0,0,.18)}.logo{font-weight:800;font-size:18px;letter-spacing:-.03em}.logo b{color:var(--o)}.nl{display:flex;gap:4px}.nl a{padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;color:var(--ink2)}.nl a:hover{background:#f1efe9}.nl a.on{background:var(--ink);color:#fff}'
    + '.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:999px;font-weight:700;font-size:14px;transition:.2s}.btn-o{background:var(--o);color:#fff;box-shadow:0 10px 24px -8px rgba(255,77,28,.6)}.btn-o:hover{transform:translateY(-2px)}.btn-w{background:#fff;color:var(--ink)}'
    + '.kick{font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--o);text-transform:uppercase}.bh{padding:56px 0 24px}.bh h1{font-size:clamp(2.2rem,5vw,3.8rem);line-height:1.04;margin:10px 0 12px}.bh h1 em{font-style:normal;background:linear-gradient(100deg,var(--o),var(--o2));-webkit-background-clip:text;background-clip:text;color:transparent}.bh p{color:var(--ink2);max-width:560px;line-height:1.65}'
    + '.chips{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}.chip{padding:8px 16px;border-radius:99px;border:1.5px solid var(--line);background:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}'
    + '.cov{background:linear-gradient(135deg,var(--o),var(--o2));min-height:150px;position:relative;display:grid;place-items:center;color:#fff;overflow:hidden}.cov span{font-size:48px;font-weight:800;opacity:.9;font-family:"Plus Jakarta Sans",sans-serif}.cov img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}'
    + '.feat{display:grid;grid-template-columns:1.1fr 1fr;background:#fff;border:1px solid var(--line);border-radius:28px;overflow:hidden;margin-bottom:22px}.feat .cov{min-height:260px}.fb{padding:30px}.fb h2{font-size:26px;line-height:1.15;margin:8px 0 10px}.fb p{color:var(--ink2);font-size:14.5px;line-height:1.6}.meta{font-size:12px;color:var(--mut);font-weight:600;margin-top:14px}'
    + '.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding-bottom:50px}.card{background:#fff;border:1px solid var(--line);border-radius:24px;overflow:hidden;transition:.2s;display:block}.card:hover{transform:translateY(-4px);box-shadow:0 24px 40px -24px rgba(0,0,0,.3)}.cb{padding:18px}.cb h3{font-size:17px;line-height:1.25;margin:6px 0 8px}.cb p{font-size:13px;color:var(--ink2);line-height:1.55}.tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--o)}'
    + '.art{max-width:720px;margin:0 auto;padding:46px 22px 30px}.art h1{font-size:clamp(2rem,4.4vw,3rem);line-height:1.08;margin:12px 0}.art .meta{margin:0 0 22px}.art .cov{border-radius:24px;min-height:240px;margin-bottom:26px}.art p{font-size:16.5px;line-height:1.8;color:#27272a;margin-bottom:16px}.art h2{font-size:23px;margin:30px 0 10px;font-family:"Plus Jakarta Sans",sans-serif;font-weight:800;letter-spacing:-.02em}.art h3{font-size:18px;margin:22px 0 8px;font-family:"Plus Jakarta Sans",sans-serif;font-weight:800}.art ul,.art ol{margin:0 0 16px 22px;line-height:1.8;font-size:16px}.art blockquote{border-left:4px solid var(--o);padding:4px 16px;margin:0 0 16px;color:var(--ink2);font-style:italic}.art code{background:#f1efe9;padding:2px 6px;border-radius:6px;font-size:.9em}.art a{color:var(--o);font-weight:600;text-decoration:underline}.art hr{border:0;border-top:1px solid var(--line);margin:26px 0}'
    + '.cta{background:var(--ink);color:#fff;border-radius:26px;padding:28px;margin:30px 0;display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap}.cta h3{font-size:20px;margin:0}.cta p{color:#d4d4d8;font-size:14px;margin:6px 0 0}.cta .bt{display:flex;gap:10px;flex-wrap:wrap}.rel{display:grid;grid-template-columns:1fr 1fr;gap:14px}.back{font-size:13px;font-weight:700;color:var(--mut)}'
    + 'footer{background:var(--ink);color:#a1a1aa;padding:30px 0;font-size:13px;margin-top:30px}footer a{color:#fff;margin-right:12px}.empty{padding:60px 0;color:var(--mut);text-align:center}'
    + '@media(max-width:800px){.grid,.feat,.rel{grid-template-columns:1fr}.nl{display:none}}';
  function shell(st, title, descr, canon, body, extraHead, navOn) {
    const s = st.site, ft = s.footer || {}, wa = 'https://wa.me/' + s.wa;
    const css = CSS.replace('%A%', s.accent).replace('%B%', ctx.mix ? ctx.mix(s.accent) : '#FF8A3D');
    const links = [['Instagram', ft.ig], ['TikTok', ft.tt], ['YouTube', ft.yt]].filter(x => x[1]).map(x => '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + x[0] + '</a>').join('');
    return '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(descr) + '"><link rel="canonical" href="' + esc(canon) + '"><link rel="icon" href="/favicon.svg" type="image/svg+xml">'
      + '<meta property="og:site_name" content="heyaipeople"><meta property="og:locale" content="id_ID"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(descr) + '"><meta property="og:url" content="' + esc(canon) + '"><meta name="twitter:card" content="summary">' + (extraHead || '')
      + '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet"><style>' + css + '</style></head><body><div class="bg"></div>'
      + '<nav><div class="nav-in"><a class="logo" href="/">heyaipeople<b>.site</b></a><div class="nl"><a href="/#prompt-foto">Prompt Foto</a><a href="/#storyboard">Storyboard → Video</a><a href="/#cara-kerja">Cara Kerja</a><a href="/blog/" class="' + (navOn ? 'on' : '') + '">Blog</a></div><a class="btn btn-o" href="' + wa + '" target="_blank" rel="noopener">Pesan via WhatsApp</a></div></nav>'
      + body + '<footer><div class="wrap"><div style="margin-bottom:8px">' + links + '</div>' + esc(ft.copy || 'heyaipeople.site') + '</div></footer></body></html>';
  }
  const SITE = 'https://heyaipeople.site';
  function readMin(b) { return Math.max(1, Math.round(String(b).split(/\s+/).length / 200)); }
  function atomic(f, c) { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, c); fs.renameSync(t, f); }

  function build() {
    const st = getState(), s = st.site;
    const rows = db.prepare("SELECT * FROM posts WHERE status='tayang' ORDER BY pub_at DESC").all();
    const cats = [...new Set(rows.map(r => r.cat))];
    let list;
    if (!rows.length) list = '<div class="empty">Artikel segera hadir.</div>';
    else {
      const f = rows[0];
      list = '<a class="feat" id="feat" data-cat="' + esc(f.cat) + '" href="/blog/' + f.slug + '/">' + covHtml(f) + '<div class="fb"><span class="tag">' + esc(f.cat) + '</span><h2 class="disp">' + esc(f.title) + '</h2><p>' + esc(f.descr) + '</p><div class="meta">' + fmt(f.pub_at) + ' · ' + readMin(f.body) + ' menit baca</div></div></a><div class="grid" id="grid">'
        + rows.slice(1).map(r => '<a class="card" data-cat="' + esc(r.cat) + '" href="/blog/' + r.slug + '/">' + covHtml(r) + '<div class="cb"><span class="tag">' + esc(r.cat) + '</span><h3 class="disp">' + esc(r.title) + '</h3><p>' + esc(r.descr) + '</p><div class="meta">' + fmt(r.pub_at) + ' · ' + readMin(r.body) + ' mnt</div></div></a>').join('') + '</div>';
    }
    const chips = cats.length > 1 ? '<div class="chips"><button class="chip on" data-f="">Semua</button>' + cats.map(c => '<button class="chip" data-f="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' : '';
    const js = '<script>document.querySelectorAll(".chip").forEach(function(b){b.onclick=function(){document.querySelectorAll(".chip").forEach(function(x){x.classList.remove("on")});b.classList.add("on");var f=b.getAttribute("data-f");document.querySelectorAll("[data-cat]").forEach(function(c){c.style.display=(!f||c.getAttribute("data-cat")===f)?"":"none"})}})</script>';
    const idx = shell(st, 'Blog — panduan prompt foto & storyboard AI | heyaipeople', 'Panduan prompt foto AI, storyboard, dan alur bikin video 2D. Ringkas dan bisa langsung dipraktikkan.', SITE + '/blog/',
      '<div class="wrap"><div class="bh"><span class="kick">Blog</span><h1 class="disp">Belajar bikin konten <em>pakai AI</em></h1><p>Panduan prompt foto AI, storyboard, dan alur bikin video 2D. Ditulis ringkas, bisa langsung dipraktikkan.</p>' + chips + '</div>' + list + '</div>' + js,
      '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog heyaipeople', url: SITE + '/blog/', inLanguage: 'id' }).replace(/</g, '\\u003c') + '</script>', true);
    atomic(path.join(WEB, 'blog', 'index.html'), idx);
    for (const r of rows) {
      const rel = rows.filter(x => x.slug !== r.slug).sort((a, b) => (b.cat === r.cat) - (a.cat === r.cat)).slice(0, 2);
      const ctaT = r.cta_t || 'Lihat Prompt Foto', ctaU = r.cta_u || '/#prompt-foto';
      const body = '<article class="art"><a class="back" href="/blog/">← Semua artikel</a><h1 class="disp">' + esc(r.title) + '</h1><div class="meta">' + esc(r.cat) + ' · ' + fmt(r.pub_at) + ' · ' + readMin(r.body) + ' menit baca</div>' + (r.cover ? covHtml(r) : '') + md2html(r.body)
        + '<div class="cta"><div><h3 class="disp">Mau yang sudah jadi?</h3><p>Ada pertanyaan? Tanya di sini lewat WhatsApp admin.</p></div><div class="bt"><a class="btn btn-o" href="' + esc(ctaU) + '">' + esc(ctaT) + '</a><a class="btn btn-w" href="https://wa.me/' + s.wa + '" target="_blank" rel="noopener">Tanya di sini</a></div></div>'
        + (rel.length ? '<h3 class="disp" style="margin:26px 0 12px;font-size:18px">Baca juga</h3><div class="rel">' + rel.map(x => '<a class="card" href="/blog/' + x.slug + '/"><div class="cb"><span class="tag">' + esc(x.cat) + '</span><h3 class="disp">' + esc(x.title) + '</h3></div></a>').join('') + '</div>' : '') + '</article>';
      const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: r.title, description: r.descr, datePublished: r.pub_at, dateModified: r.updated || r.pub_at, inLanguage: 'id', mainEntityOfPage: SITE + '/blog/' + r.slug + '/', author: { '@type': 'Organization', name: 'heyaipeople' }, publisher: { '@type': 'Organization', name: 'heyaipeople', logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg' } } }).replace(/</g, '\\u003c') + '</script><meta property="og:type" content="article"><meta property="article:published_time" content="' + esc(r.pub_at) + '">' + (r.cover ? '<meta property="og:image" content="' + SITE + esc(r.cover) + '">' : '');
      atomic(path.join(WEB, 'blog', r.slug, 'index.html'), shell(st, (r.mtitle || r.title) + ' | heyaipeople', r.descr, SITE + '/blog/' + r.slug + '/', body, ld, true));
    }
    // hapus halaman yang tidak tayang lagi
    const keep = new Set(rows.map(r => r.slug));
    for (const d of fs.readdirSync(path.join(WEB, 'blog'), { withFileTypes: true })) if (d.isDirectory() && SLUG.test(d.name) && !keep.has(d.name)) fs.rmSync(path.join(WEB, 'blog', d.name), { recursive: true, force: true });
    // sitemap: pertahankan entri lama non-blog, tambahkan beranda + blog
    let old = ''; try { old = fs.readFileSync(path.join(WEB, 'sitemap.xml'), 'utf8'); } catch (e) {}
    const kept = (old.match(/<url>[\s\S]*?<\/url>/g) || []).filter(u => !/\/blog(\/|<)/.test(u) && !/<loc>https:\/\/heyaipeople\.site\/?<\/loc>/.test(u));
    const mk = (loc, d) => '<url><loc>' + loc + '</loc>' + (d ? '<lastmod>' + d.slice(0, 10) + '</lastmod>' : '') + '</url>';
    atomic(path.join(WEB, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [mk(SITE + '/'), mk(SITE + '/blog/', rows[0] && rows[0].pub_at)].concat(rows.map(r => mk(SITE + '/blog/' + r.slug + '/', r.updated || r.pub_at))).concat(kept).join('\n') + '\n</urlset>\n');
    return rows.length;
  }
  function tick() {
    const now = new Date().toISOString();
    let n = 0;
    for (const x of db.prepare("SELECT slug FROM posts WHERE status='jadwal' AND pub_at<=?").all(now)) {
      if (gate(x.slug).ok) { db.prepare("UPDATE posts SET status='tayang' WHERE slug=?").run(x.slug); n++; }
      else { db.prepare("UPDATE posts SET status='draft' WHERE slug=?").run(x.slug); n++; }
    }
    const r = { changes: n };
    if (r.changes) { try { build(); } catch (e) { console.error('blog gagal', e.message); } }
    return r.changes;
  }

  // ---------- API admin ----------
  const toWib = iso => iso ? new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16) : '';
  const fromWib = v => { if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v || '')) throw new Error('Tanggal/jam tidak valid'); const d = new Date(v + ':00+07:00'); if (isNaN(d)) throw new Error('Tanggal/jam tidak valid'); return d.toISOString(); };

  // ---------- audit SEO (standar catatanakademik, disesuaikan untuk heyaipeople) ----------
  const TITLE_SUFFIX = ' | heyaipeople';
  const FORBID = [/garansi/i, /dijamin/i, /jaminan/i, /pasti (?:laku|viral|cuan|untung)/i, /100\s?%/, /tanpa risiko/i, /stok terbatas/i, /hanya hari ini/i, /sisa \d+ (?:slot|kuota)/i, /situs resmi|website resmi|official partner/i, /lolos (?:moderasi|review) (?:pasti|dijamin)/i];
  const INTERNAL_OK = ['/', '/blog/', '/cara-pesan.html'];
  const wc = t => (String(t).match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'’\-]*/g) || []).length;
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  function audit(r, all) {
    const C = [], add = (id, level, ok, msg) => C.push({ id, level, ok: !!ok, msg });
    const body = String(r.body || ''), title = r.title || '', mt = r.mtitle || '', kw = norm(r.keyword), descr = r.descr || '';
    const cut = body.search(/^##\s+Sumber\s*$/mi), main = cut >= 0 ? body.slice(0, cut) : body;
    const words = wc(main.replace(/^#{1,6}\s+/gm, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'));
    add('keyword', 'err', kw.length >= 3, kw ? 'Kata kunci utama terisi: "' + r.keyword + '"' : 'Isi keyword di frontmatter (kata kunci utama artikel)');
    add('kw-title', 'err', !kw || norm(title).includes(kw), 'Kata kunci harus persis ada di judul (title)');
    const tt = (mt || title) + TITLE_SUFFIX;
    add('mtitle-ada', 'err', !!mt, mt ? 'meta_title terisi' : 'Isi meta_title (judul untuk Google)');
    add('kw-mtitle', 'err', !kw || !mt || norm(mt).includes(kw), 'Kata kunci harus persis ada di meta_title');
    add('mtitle-len', 'err', tt.length <= 60, 'Title tag ' + tt.length + ' karakter (maks 60 termasuk "' + TITLE_SUFFIX + '", jadi meta_title maks ' + (60 - TITLE_SUFFIX.length) + ')');
    add('descr-len', 'err', descr.length >= 120 && descr.length <= 155, 'meta_description ' + descr.length + ' karakter (harus 120–155)');
    add('kw-descr', 'warn', !kw || norm(descr).includes(kw), 'Kata kunci sebaiknya ada di meta_description');
    const first100 = norm(main.replace(/^#{1,6}\s+.*$/gm, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`>]/g, '').split(/\s+/).slice(0, 100).join(' '));
    add('kw-100', 'err', !kw || first100.includes(kw), 'Kata kunci harus ada di 100 kata pertama isi artikel');
    add('words', 'err', words >= 600, 'Isi artikel ' + words + ' kata (minimal 600, tidak termasuk daftar Sumber)');
    const h2 = (body.match(/^##\s+(?!Sumber\s*$).+$/gmi) || []).length, h1 = /^#\s+\S/m.test(body);
    add('h2', 'err', h2 >= 4 && h2 <= 8, h2 + ' subjudul H2 (harus 4–8, di luar "Sumber")');
    add('no-h1', 'err', !h1, 'Isi artikel tidak boleh memuat H1 (judul sudah dibuat otomatis)');
    add('no-rule', 'err', !/^\s*---\s*$/m.test(body) && !/^```/m.test(body), 'Tanpa pemisah --- dan tanpa blok kode di isi artikel');
    add('no-meta-line', 'err', !/^\s*(slug|judul seo|meta ?title|meta ?description|deskripsi|tags?)\s*:/im.test(body), 'Jangan ada baris metadata di isi artikel');
    const bad = FORBID.filter(re => re.test(title + ' ' + descr + ' ' + body)).map(re => (re.exec(title + ' ' + descr + ' ' + body) || [''])[0]);
    add('forbid', 'err', !bad.length, bad.length ? 'Kata/klaim terlarang: ' + bad.join(', ') : 'Tidak ada klaim terlarang (garansi, pasti laku, dll.)');
    // tautan
    const links = []; body.split('\n').forEach((ln, i) => { const re = /\[([^\]]*)\]\(([^)\s]*)\)/g; let m; const seen = {}; while ((m = re.exec(ln))) { links.push({ t: m[1], u: m[2], line: i }); seen[m[2]] = (seen[m[2]] || 0) + 1; } for (const k in seen) if (seen[k] > 1) links.push({ dup: k }); });
    const badLinks = [], slugs = new Set((all || []).map(x => x.slug)), live = new Set((all || []).filter(x => x.status === 'tayang').map(x => x.slug));
    let internal = 0, notLive = [];
    for (const l of links) {
      if (l.dup) { badLinks.push('tautan ganda ke ' + l.dup + ' dalam satu baris'); continue; }
      if (!l.t.trim()) badLinks.push('teks tautan kosong');
      else if (/^(klik|di sini|disini|link|tautan|baca)$/i.test(l.t.trim())) badLinks.push('teks tautan terlalu umum: "' + l.t + '"');
      if (/^https?:\/\//i.test(l.u)) { if (!/^https:\/\//i.test(l.u)) badLinks.push('tautan harus https: ' + l.u); continue; }
      if (l.u[0] === '/') {
        internal++; const p = l.u.split('#')[0].split('?')[0] || '/', m = /^\/blog\/([a-z0-9-]+)\/?$/.exec(p);
        if (m) { if (!slugs.has(m[1])) badLinks.push('artikel tujuan tidak ada: ' + p); else if (!live.has(m[1])) notLive.push(m[1]); }
        else if (!INTERNAL_OK.includes(p)) badLinks.push('alamat internal tidak dikenal: ' + l.u);
      } else badLinks.push('alamat tautan tidak valid: ' + l.u);
    }
    add('links', 'err', !badLinks.length, badLinks.length ? 'Tautan bermasalah: ' + badLinks.slice(0, 3).join('; ') : 'Semua tautan valid');
    add('links-live', 'warn', !notLive.length, notLive.length ? 'Tautan ke artikel yang belum tayang: ' + notLive.join(', ') + ' (tayangkan bersamaan)' : 'Tautan antarartikel tayang');
    add('internal', 'warn', internal >= 1, 'Sertakan minimal 1 tautan internal (ke prompt/storyboard atau artikel lain)');
    add('wa-body', 'err', !/wa\.me|whatsapp\.com|api\.whatsapp/i.test(body), 'Jangan taruh tautan WhatsApp di isi artikel: tombol "Tanya di sini" sudah otomatis dari template');
    add('cta', 'err', !!(r.cta_t && r.cta_u), 'Isi tombol ajakan (cta_text + cta_url) satu saja per artikel');
    add('cta-len', 'warn', !r.cta_t || r.cta_t.length <= 32, 'Teks tombol ajakan ringkas (maks 32 karakter)');
    // sumber & penafian
    const src = cut >= 0 ? body.slice(cut) : '', urls = (src.match(/https:\/\/[^\s)>\]]+/g) || []);
    add('sumber', 'err', cut >= 0 && urls.length >= 1, cut >= 0 ? urls.length + ' tautan sumber' : 'Tambahkan bagian "## Sumber" berisi alamat dokumen asli');
    add('sumber-spesifik', 'err', !urls.some(u => /^https:\/\/[^\/]+\/?$/.test(u)), 'Sumber harus halaman dokumen spesifik, bukan beranda situs');
    const tail = src.split('\n').filter(x => x.trim() && !/^##\s+Sumber/i.test(x) && !/^\s*(?:[-*]|\d+\.)\s/.test(x)).join(' ');
    add('disclaimer', 'err', /bukan (?:situs )?resmi|tidak berafiliasi|tidak terafiliasi/i.test(tail) && !/^\s*(?:[-*>]|\d+\.)\s.*(bukan|tidak berafiliasi)/im.test(src), 'Penafian harus ada setelah daftar Sumber sebagai paragraf biasa (bukan bullet/kutipan)');
    // tag, slug, kanibal
    const tags = String(r.tags || '').split(',').map(x => x.trim()).filter(Boolean), hay = norm(title + ' ' + r.keyword + ' ' + main);
    add('tags-n', 'warn', tags.length >= 2 && tags.length <= 6, tags.length + ' tag (ideal 2–6)');
    const off = tags.filter(t => !t.toLowerCase().split(/\s+/).some(w => w.length > 2 && hay.includes(w)));
    add('tags-fit', 'warn', !off.length, off.length ? 'Tag tidak nyambung dengan isi: ' + off.join(', ') : 'Semua tag sesuai topik');
    add('slug-len', 'warn', String(r.slug).length <= 70, 'Slug maks 70 karakter');
    const dup = kw ? (all || []).filter(x => x.slug !== r.slug && norm(x.keyword) === kw).map(x => x.slug) : [];
    add('kanibal', 'err', !dup.length, dup.length ? 'Kata kunci sama dengan artikel lain (' + dup.join(', ') + '). Satu topik = satu artikel' : 'Tidak kanibal dengan artikel lain');
    add('cover', 'warn', !!r.cover, r.cover ? 'Gambar sampul terpasang' : 'Belum ada gambar sampul (halaman tetap tayang tanpa gambar)');
    const errs = C.filter(c => !c.ok && c.level === 'err'), warns = C.filter(c => !c.ok && c.level === 'warn');
    const score = Math.max(0, Math.round(100 - errs.length * 100 / C.filter(c => c.level === 'err').length * 0.8 - warns.length * 3));
    return { ok: errs.length === 0, score, words, errs: errs.length, warns: warns.length, checks: C };
  }
  const allRows = () => db.prepare('SELECT slug,title,mtitle,keyword,descr,tags,cover,body,cta_t,cta_u,status FROM posts').all();
  function gate(slug) { const all = allRows(), r = all.find(x => x.slug === slug); if (!r) throw new Error('Artikel tidak ada'); const a = audit(r, all); return a; }

  const list = () => { const all = allRows(); return db.prepare('SELECT * FROM posts ORDER BY CASE status WHEN \'jadwal\' THEN 0 WHEN \'draft\' THEN 1 ELSE 2 END, pub_at DESC, created DESC').all().map(r => Object.assign({}, r, { pub_wib: toWib(r.pub_at), audit: audit(r, all) })); };
  function setStatus(slug, status, pubIso) {
    const cur = db.prepare('SELECT status,pub_at FROM posts WHERE slug=?').get(slug); if (!cur) throw new Error('Artikel tidak ada');
    const now = new Date().toISOString();
    if (status === 'tayang' || status === 'jadwal') { const a = gate(slug); if (!a.ok) { const e = new Error('Belum lolos audit SEO (' + a.errs + ' masalah): ' + a.checks.filter(c => !c.ok && c.level === 'err').map(c => c.msg).slice(0, 3).join(' | ')); e.audit = true; throw e; } }
    if (status === 'tayang') db.prepare("UPDATE posts SET status='tayang',pub_at=?,updated=? WHERE slug=?").run(cur.status === 'tayang' && cur.pub_at ? cur.pub_at : now, now, slug);
    else if (status === 'jadwal') { if (!pubIso) throw new Error('Isi tanggal dan jam tayang'); db.prepare("UPDATE posts SET status=?,pub_at=?,updated=? WHERE slug=?").run(pubIso <= now ? 'tayang' : 'jadwal', pubIso, now, slug); }
    else db.prepare("UPDATE posts SET status='draft',updated=? WHERE slug=?").run(now, slug);
  }
  async function api(p, method, u, body) {
    if (p === '/api/admin/posts' && method === 'GET') return { body: list() };
    if (method !== 'POST') return { code: 404, body: { error: 'Tidak ditemukan' } };
    const b = JSON.parse((await body()).toString() || '{}'), now = new Date().toISOString();
    if (p === '/api/admin/posts/import') {
      const res = []; for (const f of (Array.isArray(b.files) ? b.files : []).slice(0, 20)) {
        const name = str(f && f.name, 100);
        try {
          const c = clean(parseMd(f.text)), ex = db.prepare('SELECT status FROM posts WHERE slug=?').get(c.slug);
          if (ex && ex.status === 'tayang') { res.push({ name, ok: false, msg: 'Slug sudah tayang: ' + c.slug + ' (ubah lewat editor)' }); continue; }
          if (ex) db.prepare('UPDATE posts SET title=?,mtitle=?,keyword=?,cat=?,descr=?,tags=?,body=?,cta_t=?,cta_u=?,updated=? WHERE slug=?').run(c.title, c.mtitle, c.keyword, c.cat, c.descr, c.tags, c.body, c.cta_t, c.cta_u, now, c.slug);
          else db.prepare("INSERT INTO posts(slug,title,mtitle,keyword,cat,descr,tags,cover,body,cta_t,cta_u,status,pub_at,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,'draft','',?,?)").run(c.slug, c.title, c.mtitle, c.keyword, c.cat, c.descr, c.tags, c.cover, c.body, c.cta_t, c.cta_u, now, now);
          res.push({ name, ok: true, slug: c.slug, msg: ex ? 'Draf diperbarui' : 'Masuk sebagai draf' });
        } catch (e) { res.push({ name, ok: false, msg: e.message }); }
      }
      return { body: { ok: true, res, list: list() } };
    }
    if (p === '/api/admin/posts/save') {
      const c = clean(b), old = str(b.old, 80), action = b.action;
      if (old && old !== c.slug) { if (db.prepare('SELECT 1 FROM posts WHERE slug=?').get(c.slug)) throw new Error('Slug sudah dipakai artikel lain'); db.prepare('UPDATE posts SET slug=? WHERE slug=?').run(c.slug, old); }
      const ex = db.prepare('SELECT status FROM posts WHERE slug=?').get(c.slug);
      if (ex) db.prepare('UPDATE posts SET title=?,mtitle=?,keyword=?,cat=?,descr=?,tags=?,cover=?,body=?,cta_t=?,cta_u=?,updated=? WHERE slug=?').run(c.title, c.mtitle, c.keyword, c.cat, c.descr, c.tags, c.cover, c.body, c.cta_t, c.cta_u, now, c.slug);
      else db.prepare("INSERT INTO posts(slug,title,mtitle,keyword,cat,descr,tags,cover,body,cta_t,cta_u,status,pub_at,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,'draft','',?,?)").run(c.slug, c.title, c.mtitle, c.keyword, c.cat, c.descr, c.tags, c.cover, c.body, c.cta_t, c.cta_u, now, now);
      let note = '';
      if (['tayang', 'jadwal', 'draft'].includes(action)) setStatus(c.slug, action, action === 'jadwal' ? fromWib(b.pub_wib) : '');
      else { const cur = db.prepare('SELECT status FROM posts WHERE slug=?').get(c.slug); if (cur && cur.status !== 'draft' && !gate(c.slug).ok) { db.prepare("UPDATE posts SET status='draft' WHERE slug=?").run(c.slug); note = 'Perubahan tersimpan tapi artikel belum lolos audit SEO, jadi dikembalikan ke draf.'; } }
      build(); return { body: { ok: true, slug: c.slug, note, list: list() } };
    }
    if (p === '/api/admin/posts/bulk') {
      const slugs = (Array.isArray(b.slugs) ? b.slugs : []).map(x => str(x, 80)).filter(x => SLUG.test(x)).slice(0, 200);
      if (!slugs.length) throw new Error('Belum ada artikel dipilih');
      const skipped = [];
      if (b.action === 'hapus') for (const s of slugs) db.prepare('DELETE FROM posts WHERE slug=?').run(s);
      else if (b.action === 'tayang' || b.action === 'draft') for (const s of slugs) { try { setStatus(s, b.action, ''); } catch (e) { skipped.push({ slug: s, msg: e.message }); } }
      else if (b.action === 'jadwal') {
        const gap = Math.max(0, Math.min(60, +b.everyDays || 0)), start = new Date(fromWib(b.start)).getTime(); let i = 0;
        for (const s of slugs) { try { setStatus(s, 'jadwal', new Date(start + i * gap * 86400e3).toISOString()); i++; } catch (e) { skipped.push({ slug: s, msg: e.message }); } }
      } else throw new Error('Aksi tidak dikenal');
      build(); return { body: { ok: true, list: list(), skipped } };
    }
    return { code: 404, body: { error: 'Tidak ditemukan' } };
  }
  return { api, build, tick, list, parseMd, clean, md2html, audit };
};
