'use strict';
// Menyusun index.html dari content.json (dipakai server saat menyimpan, dan saat build awal).
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const att = esc;
const pad = n => String(n + 1).padStart(2, '0');
const arr = a => (Array.isArray(a) ? a : []);
const safeUrl = u => { u = String(u || '').trim(); return /^(https?:\/\/|mailto:|tel:|#|\/|assets\/|uploads\/)/i.test(u) ? u : '#'; };
const imgUrl = u => { u = String(u || '').trim(); return /^(assets\/|uploads\/|https:\/\/)[\w\-./%]+$/i.test(u) ? u : ''; };
const br = (a, b) => esc(a) + '<br><em>' + esc(b) + '</em>';

const phs = (list, fb) => arr(list).map(p => typeof p === 'string' ? { src: imgUrl(p), alt: fb } : { src: imgUrl(p.src), alt: p.alt || fb }).filter(p => p.src);
const lbImg = (p, g) => `<button class="lb" data-lb="${att(g)}" aria-label="Perbesar foto: ${att(p.alt)}"><img src="${att(p.src)}" alt="${att(p.alt)}" loading="lazy" decoding="async"></button>`;

const tlH = it => { const t = it.tl; return `<div class="tl"><div class="tsc">${arr(t.scope).map(s => `<span>${esc(s)}</span>`).join('')}</div><div class="tt">${arr(t.steps).map(s => `<div class="tn"><i></i><b>${esc(s.yr)}</b><strong>${esc(s.t)}</strong><p>${esc(s.d)}</p></div>`).join('')}</div><div class="tm"><span><em>${esc(t.team[0])}</em> staf</span><u><s></s></u><span><em>${esc(t.team[1])}</em> staf</span><small>Ukuran tim yang dipimpin</small></div><div class="fc">${arr(t.links).map(h => `<a href="#karya" data-go="karya" data-pick="${+h.to}">${esc(h.l)}</a>`).join('')}</div></div>`; };
const fanH = it => `<div class="fan" role="list">${arr(it.fan).map((f, n) => `<a class="fn" role="listitem" style="--o:${n - 2}" href="#karya" data-go="karya" data-pick="${+f.to}"><b>${esc(f.t)}</b><span>${esc(f.d)}</span></a>`).join('')}</div>`;
const NAV = [['home', 'Beranda'], ['karya', 'Karya'], ['about', 'Tentang'], ['skills', 'Keahlian'], ['experience', 'Pengalaman'], ['kontak', 'Kontak']];
const VER = '20261108';

function render(c, ver) {
  ver = ver || VER;
  const h = c.home || {}, a = c.about || {}, s = c.skills || {}, x = c.experience || {}, k = c.karya || {}, t = c.kontak || {}, m = c.meta || {};
  const poses = arr(h.poses).map(p => ({ src: imgUrl(p.src), alt: p.alt, w: p.w, h: p.h, hx: p.hx })).filter(p => p.src);
  const first = poses[0] ? poses[0].src : 'assets/model.webp';
  const title = esc(m.title);
  const stat = arr => arr.map(d => `<div><b>${esc(d.b)}</b><span>${esc(d.s)}</span></div>`).join('');
  let o = '';
  o += `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${att(m.desc)}">
<meta name="theme-color" content="#0B1220"><link rel="canonical" href="https://dikapriyadi.catatanakademik.com/">
<meta property="og:title" content="${att(m.title)}"><meta property="og:description" content="${att(m.desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="Dika Priyadi"><meta property="og:url" content="https://dikapriyadi.catatanakademik.com/"><meta property="og:image" content="https://dikapriyadi.catatanakademik.com/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Dika Priyadi, AI Automation &amp; Digital Solutions Builder">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${att(m.title)}"><meta name="twitter:description" content="${att(m.desc)}"><meta name="twitter:image" content="https://dikapriyadi.catatanakademik.com/og.jpg">
<link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: 'Dika Priyadi', url: 'https://dikapriyadi.catatanakademik.com/', image: 'https://dikapriyadi.catatanakademik.com/og.jpg', jobTitle: 'AI Automation & Digital Solutions Builder', description: m.desc, address: { '@type': 'PostalAddress', addressLocality: 'Jakarta Barat', addressCountry: 'ID' }, knowsAbout: ['AI automation', 'Bot WhatsApp', 'Pengembangan website', 'Facility management'], sameAs: arr(t.rows).map(x => x.url).filter(u => /^https:\/\/(?!wa\.me)/.test(u)) }).replace(/</g, '\\u003c')}</script>
<link rel="preload" as="image" href="${att(first)}" type="image/webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css?v=${ver}"></head>
<body><div id="ld" aria-hidden="true"><span>Dika Priyadi</span><i></i></div><div id="pg" aria-hidden="true"></div><div class="amb" aria-hidden="true"><i class="o1"></i><i class="o2"></i><i class="o3"></i><b class="p p1"></b><b class="p p2"></b><b class="p p3"></b><b class="p p4"></b><b class="p p5"></b></div>
<div class="cr" aria-hidden="true"></div><div class="cd" aria-hidden="true"></div>
<header class="top"><a href="#home" data-go="home" class="logo"><i></i>Dika Priyadi</a><nav class="menu" aria-label="Menu utama">${NAV.map(n => `<a href="#${n[0]}" data-go="${n[0]}" class="nl"><span>${n[1]}</span></a>`).join('')}</nav><a class="rt" href="${att(safeUrl(t.btnUrl))}" target="_blank" rel="noopener">Hubungi</a><button class="burger" aria-label="Buka menu" aria-expanded="false"><span></span><span></span></button></header>
<div class="drawer" aria-hidden="true">${NAV.map((n, i) => `<a href="#${n[0]}" data-go="${n[0]}"><b>${pad(i)}</b><span>${n[1]}</span><i>&rarr;</i></a>`).join('')}</div>
<main>
`;
  // HOME
  o += `<section class="screen on" id="home" data-s="home" tabindex="0" aria-label="Beranda"><div class="hs"><div class="hk">
<h1 class="hl-a" aria-label="${att(h.nameA)} ${att(h.nameB)}"><span class="ln"><span>${esc(h.nameA)}</span></span><span class="ln"><span class="ac">${esc(h.nameB)}</span></span></h1>
<div class="pw" aria-hidden="false">${poses.map((p, i) => `<img src="${att(p.src)}" width="${+p.w || 513}" height="${+p.h || 724}" alt="${att(p.alt)}" class="pose" data-i="${i}" data-hx="${+p.hx || .5}" decoding="async" ${i === 0 ? 'fetchpriority=high' : 'loading=eager'}>`).join('')}</div>
<div class="side"><div class="hi-l"><span class="hi-s">${esc(h.hi)}</span><strong class="hi-n">${esc(h.nama)}</strong><a class="btn pri" href="#karya" data-go="karya">${esc(h.btn1)}</a></div><div class="hi-r"><p>${esc(h.sub)}</p><a class="btn gh" href="#kontak" data-go="kontak">${esc(h.btn2)}</a></div></div>
<p class="vt" aria-hidden="true">${esc(h.label)}</p>
<div class="hl-b" aria-hidden="true"><p class="tg">${esc(h.h1a)}<br><em>${esc(h.h1b)}</em></p><p class="sub">${esc(h.sub)}</p><div class="btns"><a class="btn pri" href="#karya" data-go="karya" tabindex="-1">${esc(h.btn1)}</a><a class="btn gh" href="#kontak" data-go="kontak" tabindex="-1">${esc(h.btn2)}</a></div><p class="fl">${arr(h.stats).map(d => `<span><b>${esc(d.b)}</b> ${esc(d.s)}</span>`).join('')}</p></div>
<div class="hint"><span>${esc(h.hint)}</span><i></i><span class="dots">${[0, 1, 2].map(i => `<button type="button" data-d="${i}" aria-label="Tahap ${i + 1}"></button>`).join('')}</span></div>
<span class="ai">${esc(h.ai)}</span></div></div></section>
`;
  // ABOUT
  const aph = imgUrl(a.photo), gal = phs(a.gallery, 'Dika Priyadi'), cvu = a.cv && /^assets\/[\w\-.]+\.pdf$/i.test(a.cv.url || '') ? a.cv : null;
  const items = arr(k.items);
  const fam = x => x.grp === 'Pengalaman profesional' ? 'fm' : x.grp === 'Layanan freelance' ? 'fr' : 'ai';
  o += `<section class="screen" id="karya" data-s="karya"><div class="wrap col"><div class="rv"><p class="lab">${esc(k.lab)}</p><h2>${esc(k.h2a)} <em>${esc(k.h2b)}</em></h2></div><div class="kgrid rv d2"><div class="ktabs" role="tablist" aria-label="Kelompok karya">${[['ai', 'AI & Digital'], ['fr', 'Layanan freelance'], ['fm', 'Pengalaman Facility']].map((g, n) => { const ix = items.findIndex(x => fam(x) === g[0]); return ix < 0 ? '' : `<button type="button" role="tab" class="kt_${n === 0 ? ' on' : ''}" data-kt="${ix}" data-g="${g[0]}" aria-selected="${n === 0}">${esc(g[1])}</button>`; }).join('')}</div><div class="kwrap"><button class="kn_ kp" aria-label="Sebelumnya" type="button">&larr;</button><div class="klist" tabindex="0">${items.map((it, i) => `${it.grp && it.grp !== (items[i - 1] || {}).grp ? `<p class="kgrp">${esc(it.grp)}</p>` : ''}<button class="krow${i === 0 ? ' on' : ''}" data-k="${i}" data-g="${fam(it)}"><span class="km">${arr(it.photos)[0] ? `<img src="${att(it.photos[0].src)}" alt="" loading="lazy" draggable="false">` : `<s>${pad(i)}</s>`}<small>${esc(it.grp || '')}</small></span><span class="kt"><b>${pad(i)}</b><strong>${esc(it.name)}</strong><em>${esc(it.sub)}</em></span>${it.st ? `<u class="sd s-${it.st[0]}" title="${att(it.st)}"></u>` : ''}</button>`).join('')}</div><button class="kn_ kx" aria-label="Berikutnya" type="button">&rarr;</button></div><div class="kdets">${items.map((it, i) => {
    const ph = phs(it.photos, it.name);
    return `<article class="kdet${i === 0 ? ' on' : ''}" data-k="${i}"><p class="lab">${pad(i)} &middot; ${esc(it.lab)}${it.st ? ` <span class="stp s-${it.st[0]}">${esc(it.st)}</span>` : ''}</p><h3>${esc(it.name)}</h3><p class="kd">${esc(it.desc)}</p>${it.case ? `<div class="cs"><div><b>Masalah</b><p>${esc(it.case.m)}</p></div><div><b>Solusi</b><p>${esc(it.case.s)}</p></div><div><b>Hasil</b><p>${esc(it.case.h)}</p></div></div>` : ''}${it.tl ? tlH(it) : it.fan ? fanH(it) : it.flow ? `<div class="fl" role="list">${arr(it.flow.steps).map(s => `<div class="fs" role="listitem"><b>${esc(s.n)}</b>${s.to !== undefined ? `<a class="ft" href="#karya" data-go="karya" data-pick="${+s.to}">${esc(s.t)} <i>&rarr;</i></a>` : `<span class="ft">${esc(s.t)}</span>`}<p>${esc(s.d)}</p>${arr(s.chips).length ? `<div class="fc">${s.chips.map(h => `<a href="#karya" data-go="karya" data-pick="${+h.to}">${esc(h.l)}</a>`).join('')}</div>` : ''}</div>`).join('')}</div>` : `<ul>${arr(it.bullets).map(l => `<li>${esc(l)}</li>`).join('')}</ul><div class="tags">${arr(it.tags).map(l => `<span>${esc(l)}</span>`).join('')}</div>`}${ph.length ? `<div class="kph">${ph.map(p => lbImg(p, 'k' + i)).join('')}</div>` : ''}</article>`;
  }).join('')}</div></div></div></section>
`;
  // KONTAK
  o += `<section class="screen" id="about" data-s="about"><div class="wrap two"><div class="rv"><p class="lab">${esc(a.lab)}</p><h2>${br(a.h2a, a.h2b)}</h2>${arr(a.body).map(p => `<p class="body">${esc(p)}</p>`).join('')}
${arr(a.more).length ? `<div class="more" hidden>${arr(a.more).map(p => `<p class="body">${esc(p)}</p>`).join('')}</div><button class="rm" data-more>Baca lengkap <i>&rarr;</i></button>` : ''}${cvu ? `<a class="btn gh cv" href="${att(cvu.url)}" download>${esc(cvu.label)}</a>` : ''}${gal.length ? `<div class="gal">${gal.map(p => lbImg(p, 'about')).join('')}</div>` : ''}</div>
<div class="rv d2">${aph ? `<img class="aph" src="${att(aph)}" alt="${att(a.photoAlt || 'Foto Dika Priyadi')}" loading="lazy" decoding="async">` : ''}<div class="stats big">${stat(arr(a.stats))}</div>
<div class="facts">${arr(a.facts).map(f => `<div><strong>${esc(f.t)}</strong><span>${esc(f.d)}</span>${phs(f.photos, f.t).length ? `<div class="fph">${phs(f.photos, f.t).map(p => lbImg(p, 'aw')).join('')}</div>` : ''}</div>`).join('')}</div></div></div></section>
`;
  // SKILLS
  o += `<section class="screen" id="skills" data-s="skills"><div class="wrap col"><div class="rv"><p class="lab">${esc(s.lab)}</p><h2>${esc(s.h2a)} <em>${esc(s.h2b)}</em></h2></div>
${arr(s.folders).length ? `<p class="kfo-i rv d2">${esc(s.intro)}</p><div class="kfog rv d2">${arr(s.folders).map((f, i) => `<button type="button" class="kfo" data-kf="${i}" aria-expanded="false" aria-controls="kfoOv"><span class="kfo-pk" aria-hidden="true"><i></i><i></i><i></i></span><b>${esc(f.t)}</b><small>${esc(f.d)}</small><span class="kfo-n">${arr(f.steps).length} skill &darr;</span></button>`).join('')}</div><div class="kfo-ov" id="kfoOv" role="region" aria-label="Isi folder keahlian" aria-hidden="true">${arr(s.folders).map((f, i) => `<div class="kfo-p" data-kp="${i}" hidden><div class="kfo-l"><span class="kfo-b">KEAHLIAN ${pad(i)}</span><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p>${f.video ? `<video class="kfo-v" controls preload="none" playsinline src="${att(f.video)}"></video>` : ''}<div class="kfo-c"><a class="kfo-w" href="${att((c.kontak || {}).btnUrl || '#')}" rel="noopener">${esc(s.cta)}</a><button type="button" class="kfo-x">Tutup</button></div></div><ol class="kfo-s">${arr(f.steps).map((q, k) => `<li style="--d:${(0.35 + k * 0.28).toFixed(2)}s"><b>${esc(q[0])}</b><span>${esc(q[1])}</span></li>`).join('')}</ol></div>`).join('')}</div>` : arr(s.orbit).length ? `<div class="orb rv d2" role="region" aria-roledescription="carousel" aria-label="Keahlian dan bukti kerja"><div class="ost" tabindex="0" aria-label="Putar dengan panah kiri dan kanan"><div class="oring" aria-hidden="true"><i></i></div>${arr(s.orbit).map((o, i) => `<article class="oc" data-i="${i}"><b class="n">${pad(i)} &middot; Karya &amp; pengalaman</b><div class="ckw">${arr(o.ks).map(q => `<a class="ck" href="#karya" data-go="karya" data-pick="${+q.k}">${arr((arr(k.items)[+q.k] || {}).photos)[0] ? `<img src="${att(k.items[+q.k].photos[0].src)}" alt="" loading="lazy">` : ''}${esc(q.l)}</a>`).join('')}</div><div class="od"><span class="cat">${esc(o.c)}</span><h3>${esc(o.t)}</h3><p>${esc(o.d)}</p></div></article>`).join('')}</div><div class="octl"><button type="button" class="op" aria-label="Keahlian sebelumnya">&larr;</button><span class="odots" aria-hidden="true">${arr(s.orbit).map(() => '<u></u>').join('')}</span><button type="button" class="on_" aria-label="Keahlian berikutnya">&rarr;</button></div></div>` : `<div class="cols rv d2">${arr(s.cols).map((cd, i) => `<div class="card"><b class="n">${pad(i)}</b><h3>${esc(cd.t)}</h3><ul class="dash">${arr(cd.items).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`).join('')}</div>`}
<div class="tools rv d3"><p class="lab">${esc(s.toolsLab || 'Tools')}</p><div>${arr(s.tools).map(l => typeof l === 'string' ? `<span>${esc(l)}</span>` : `<span class="tl"><svg viewBox="${att(l.vb)}" aria-hidden="true" focusable="false"><path d="${att(l.d)}"/></svg>${esc(l.n)}</span>`).join('')}</div></div></div></section>
`;
  // EXPERIENCE
  o += `<section class="screen" id="experience" data-s="experience"><div class="wrap two"><div class="rv"><p class="lab">${esc(x.lab)}</p><h2>${br(x.h2a, x.h2b)}</h2>${arr(x.body).map(p => `<p class="body">${esc(p)}</p>`).join('')}${arr(x.more).length ? `<div class="more" hidden>${arr(x.more).map(p => `<p class="body">${esc(p)}</p>`).join('')}</div><button class="rm" data-more>Baca lengkap <i>&rarr;</i></button>` : ''}</div>
<div class="tl rv d2">${arr(x.rows).map(r => `<div class="xrow"><span class="yr">${esc(r.yr)}</span><div><strong>${esc(r.t)}</strong><em>${esc(r.sub)}</em></div></div>`).join('')}</div></div></section>
`;
  // KARYA
  o += `<section class="screen" id="kontak" data-s="kontak"><div class="wrap two"><div class="rv"><p class="lab">${esc(t.lab)}</p><h2>${esc(t.h2a)}<br><em class="shim">${esc(t.h2b)}</em></h2><p class="body">${esc(t.body)}</p><a class="btn pri" href="${att(safeUrl(t.btnUrl))}" target="_blank" rel="noopener">${esc(t.btn)}</a>${cvu ? `<a class="btn gh cv" href="${att(cvu.url)}" download>${esc(cvu.label)}</a>` : ''}</div>
<div class="crows rv d2">${arr(t.rows).map(r => { const u = safeUrl(r.url); const ext = /^https?:/i.test(u); return `<a href="${att(u)}"${ext ? ' target="_blank" rel="noopener"' : ''}><span>${esc(r.k)}</span><strong>${esc(r.v)}</strong><i>&rarr;</i></a>`; }).join('')}</div></div></section>
`;
  o += `</main><script src="script.js?v=${ver}" defer></script></body></html>`;
  return o;
}
module.exports = { render };
