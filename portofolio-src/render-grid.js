'use strict';
// Landing versi grid kartu. Isi: grid.json. Hasil: ../portofolio/index.html
// Pakai: node render-grid.js <versi>
const fs = require('fs');
const path = require('path');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const arr = a => (Array.isArray(a) ? a : []);
const pad = n => String(n + 1).padStart(2, '0');
const safeUrl = u => { u = String(u || '').trim(); return /^(https?:\/\/|mailto:|tel:|#|\/|assets\/|uploads\/)/i.test(u) ? u : '#'; };
const imgUrl = u => { u = String(u || '').trim(); return /^(assets\/|uploads\/|https:\/\/)[\w\-./%]+$/i.test(u) ? u : ''; };
const ext = u => /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';

function item(q, i) {
  const img = imgUrl(q.img), url = q.url ? safeUrl(q.url) : '';
  const pic = img
    ? `<span class="gi-p"><img src="${esc(img)}" alt="${esc(q.alt || q.t)}" loading="lazy" decoding="async"></span>`
    : `<span class="gi-p gi-e" aria-hidden="true"><b>${pad(i)}</b></span>`;
  const body = `${pic}<span class="gi-b">${q.tag ? `<em>${esc(q.tag)}</em>` : ''}<strong>${esc(q.t)}</strong><small>${esc(q.d)}</small></span>`;
  const st = `style="--i:${i};--r:${((i % 3) - 1) * 4}deg"`;
  if (url) return `<a class="gi gi-l" ${st} href="${esc(url)}"${ext(url)}>${body}<i class="gi-a" aria-hidden="true">&nearr;</i></a>`;
  if (img) return `<button type="button" class="gi gi-z" ${st} data-zoom="${esc(img)}" aria-label="Perbesar foto: ${esc(q.alt || q.t)}">${body}</button>`;
  return `<div class="gi" ${st}>${body}</div>`;
}

function render(c, ver) {
  const m = c.meta || {}, h = c.hero || {}, cards = arr(c.cards);
  const photo = imgUrl(h.photo), wa = safeUrl(h.wa), cv = safeUrl(h.cv);
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: 'Dika Priyadi', url: 'https://dikapriyadi.catatanakademik.com/', image: 'https://dikapriyadi.catatanakademik.com/og.jpg', jobTitle: 'AI Automation & Digital Solutions Builder', description: m.desc, address: { '@type': 'PostalAddress', addressLocality: 'Jakarta Barat', addressCountry: 'ID' } };
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.desc)}">
<meta name="theme-color" content="#0B1220"><link rel="canonical" href="https://dikapriyadi.catatanakademik.com/">
<meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="id_ID"><meta property="og:site_name" content="Dika Priyadi"><meta property="og:url" content="https://dikapriyadi.catatanakademik.com/"><meta property="og:image" content="https://dikapriyadi.catatanakademik.com/og.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(m.title)}"><meta name="twitter:description" content="${esc(m.desc)}"><meta name="twitter:image" content="https://dikapriyadi.catatanakademik.com/og.jpg">
<link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="apple-touch-icon.png">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
${photo ? `<link rel="preload" as="image" href="${esc(photo)}" type="image/webp">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="style.css?v=${ver}"></head>
<body>
<div class="amb" aria-hidden="true"><i class="o1"></i><i class="o2"></i><i class="o3"></i><b class="p1"></b><b class="p2"></b><b class="p3"></b><b class="p4"></b><b class="p5"></b></div>
<header class="top"><a href="#" class="logo"><i></i>Dika Priyadi</a><span class="top-r"><a class="tb gh" href="${esc(cv)}" download>${esc(h.cvLabel)}</a><a class="tb pri" href="${esc(wa)}" target="_blank" rel="noopener">Hubungi</a></span></header>
<main>
<section class="hero"><div class="hero-t"><p class="lab">${esc(h.label)}</p><h1>${esc(h.h1a)} <em>${esc(h.h1b)}</em></h1><p class="sub">${esc(h.sub)}</p><ul class="st">${arr(h.stats).map(d => `<li><b>${esc(d.b)}</b><span>${esc(d.s)}</span></li>`).join('')}</ul></div>${photo ? `<figure class="hero-p"><img src="${esc(photo)}" alt="${esc(h.photoAlt)}" width="527" height="724" fetchpriority="high"><figcaption>${esc(h.ai)}</figcaption></figure>` : ''}</section>
<p class="intro">${esc(c.intro)}</p>
<section class="grid" aria-label="Keahlian dan pengalaman">${cards.map((k, i) => { const cov = imgUrl(k.cover); return `<button type="button" class="gc" id="k${i + 1}" data-k="${i}" style="--i:${i}" aria-haspopup="dialog"><span class="gc-c${cov ? '' : ' gc-e'}">${cov ? `<img src="${esc(cov)}" alt="" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async">` : ''}<b>${pad(i)}</b></span><span class="gc-b"><strong>${esc(k.t)}</strong><small>${esc(k.d)}</small><em>${arr(k.items).length} kartu <i>&rarr;</i></em></span></button>`; }).join('')}</section>
${arr(c.tools).length ? `<section class="tools" aria-label="Perangkat"><span>Perangkat</span>${arr(c.tools).map(t => `<i>${esc(t)}</i>`).join('')}</section>` : ''}
</main>
<a class="fab" href="${esc(wa)}" target="_blank" rel="noopener">${esc(h.waLabel)}</a>
<div class="ov" id="ov" aria-hidden="true">${cards.map((k, i) => `<div class="pn" data-p="${i}" role="dialog" aria-modal="true" aria-label="${esc(k.t)}" hidden><div class="pn-h"><span class="pn-n">${pad(i)}</span><div><h2>${esc(k.t)}</h2><p>${esc(k.d)}</p></div><span class="pn-c"><a class="tb pri" href="${esc(wa)}" target="_blank" rel="noopener">${esc(c.cta)}</a><button type="button" class="tb gh pn-x">Tutup</button></span></div>${k.video ? `<video class="pn-v" controls preload="none" playsinline src="${esc(safeUrl(k.video))}"></video>` : ''}<div class="pn-g">${arr(k.items).map(item).join('')}</div></div>`).join('')}</div>
<div class="zm" id="zm" aria-hidden="true"><img alt=""><button type="button" class="tb gh">Tutup</button></div>
<script src="script.js?v=${ver}" defer></script>
</body></html>
`;
}

module.exports = { render };
if (require.main === module) {
  const ver = process.argv[2];
  if (!ver) { console.error('versi wajib'); process.exit(1); }
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, 'grid.json'), 'utf8'));
  fs.writeFileSync(path.join(__dirname, '..', 'portofolio', 'index.html'), render(c, ver));
  console.log('OK index.html (grid) dibangun, versi ' + ver);
}
