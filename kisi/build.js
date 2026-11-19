// Generator halaman statis "Kisi-Kisi & Ringkasan Fokus Belajar" (tanpa dependensi, Node 18+).
// Pakai: node kisi/build.js   -> dist/ (halaman publik), print/ (sumber PDF berbayar, TIDAK dipublikasikan)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const PRINT = path.join(ROOT, 'print');
const BASE = process.env.KISI_BASE ?? '/kisi-kisi';          // jalur URL publik
const BRAND = process.env.KISI_BRAND || 'CATATAN AKADEMIK';
const ORIGIN = process.env.KISI_ORIGIN || 'https://catatanakademik.com';
const WA = process.env.PAY_WA || '6285722227544';             // WA admin
const TYPE = { pg: 'Pilihan Ganda', sa: 'Sebab-Akibat', kk: 'Kompleks 1-2-3' };
const L = 'ABCD';
const rp = n => 'Rp' + n.toLocaleString('id-ID');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wa = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

const CSS = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

function kodeText(d) {
  return d.kode_lama.join(' / ') + (d.kode_baru ? ' / ' + d.kode_baru : '');
}

function soalHtml(q, showKey) {
  let body;
  if (q.tipe === 'sa') body = `<p><b>Pernyataan:</b> ${esc(q.pernyataan)}</p><p><b>SEBAB</b> Alasan: ${esc(q.alasan_soal)}</p>`;
  else body = `<p>${esc(q.pernyataan)}</p>` + (q.butir ? `<ol class="it">${q.butir.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '');
  const opts = q.opsi.map((o, i) => {
    const key = showKey && L[i] === q.kunci;
    return `<li class="${key ? 'key' : ''}"><i>${L[i]}.</i><span>${esc(o)}</span>${key ? '<em>✓ Kunci</em>' : ''}</li>`;
  }).join('');
  const pb = showKey ? `<div class="alasan"><b>Alasan:</b> ${esc(q.pembahasan)}</div>` : '';
  return `<article class="q"><div class="top"><b>Soal ${q.no}</b> · Modul ${q.modul} · <span class="tag">${TYPE[q.tipe]}</span></div>${body}<ul class="opts">${opts}</ul>${pb}</article>`;
}

const hasSoal = d => Array.isArray(d.soal) && d.soal.length > 0;
const hafalan = d => (d.poin_hafalan && d.poin_hafalan.length) ? `<section class="card"><h2>5 poin kunci untuk dihafal</h2><ol class="it">${d.poin_hafalan.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>` : '';

function modulRows(d, n) {
  const rows = d.moduls.map((m, i) => `<tr${i >= n ? ' class="x" hidden' : ''}><td>Modul ${m.no}</td><td><b>${esc(m.topik)}</b>${m.prioritas ? ` <em class="pri ${m.prioritas === 'Tinggi' ? 'hi' : ''}">Prioritas ${esc(m.prioritas)}</em>` : ''}<br><span>${esc(m.indikator || (m.fokus || []).join(' '))}</span></td></tr>`).join('');
  return rows;
}

function coursePage(d) {
  const title = `Kisi-Kisi & Ringkasan ${d.kode_lama[0]} ${d.nama_mk} per Modul`;
  const desc = `Ringkasan fokus belajar ${d.nama_mk} (${kodeText(d)}) per modul 1-${d.moduls.length} berdasarkan BMP${hasSoal(d) ? ', lengkap contoh soal latihan mandiri' : ''}. Versi lengkap ${rp(d.harga)}.`;
  const url = `${ORIGIN}${BASE}/${d.slug}/`;
  const free = hasSoal(d) ? d.soal.filter(q => d.gratis_soal.includes(q.no)) : [];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: title, description: desc, url, inLanguage: 'id' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Bank Soal', item: `${ORIGIN}${BASE}/` },
        { '@type': 'ListItem', position: 2, name: d.nama_mk, item: url } ] }
    ]
  };
  const buy = wa(`Halo admin, saya mau beli kisi-kisi lengkap ${d.kode_lama[0]} ${d.nama_mk} (${rp(d.harga)})`);
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:locale" content="id_ID"><meta property="og:type" content="website">
<script type="application/ld+json">${JSON.stringify(ld)}</script><style>${CSS}</style></head><body>
<header class="nav"><a class="brand" href="/">${BRAND}</a><nav><a href="${BASE}/">Bank Soal</a></nav></header>
<main>
<p class="crumb"><a href="${BASE}/">Bank Soal</a> › ${esc(d.fakultas)} › ${esc(d.kode_lama[0])}</p>
<h1>Kisi-Kisi & Ringkasan Fokus Belajar ${esc(d.kode_lama[0])} ${esc(d.nama_mk)}</h1>
<p class="kodes">Kode: <b>${esc(kodeText(d))}</b></p>
<p class="note">Ringkasan ini disusun dari Buku Materi Pokok (BMP) dan bukan kisi-kisi resmi dari UT. Isi adalah ringkasan belajar mandiri, bukan soal ujian asli.</p>
<section class="card"><h2>Fokus belajar per modul</h2><table><tbody>${modulRows(d, 3)}</tbody></table>
<button class="more" id="mm" type="button">Baca lengkap (Modul 1–${d.moduls.length})</button></section>
${hafalan(d)}${free.length ? `<section class="card"><h2>Contoh soal gratis (${free.length} dari ${d.soal.length})</h2>${free.map(q => soalHtml(q, true)).join('')}</section>` : ''}
<section class="card buy"><h2>Versi lengkap ${rp(d.harga)}</h2>
<ul><li>Ringkasan fokus semua modul dalam PDF</li>${hasSoal(d) ? `<li>${d.soal.length} soal latihan dengan kunci dan alasan</li>` : `<li>Penjabaran materi inti tiap modul dan rumus cepat</li>`}<li>Siap dibaca di HP atau dicetak</li></ul>
<a class="btn" href="${buy}" rel="noopener">Beli lewat WhatsApp</a><p class="hint">PDF dikirim admin setelah pembayaran.</p></section>
</main>
<footer>Platform ini adalah sarana belajar mandiri dan tidak berafiliasi dengan Universitas Terbuka. Tidak menyediakan naskah ujian asli maupun layanan pengerjaan ujian.</footer>
<script>document.getElementById('mm').addEventListener('click',function(){var h=document.querySelectorAll('tr.x');var o=h[0].hidden;h.forEach(function(r){r.hidden=!o});this.textContent=o?'Ringkas':'Baca lengkap (Modul 1–${d.moduls.length})'});</script>
</body></html>`;
}

function printPage(d) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(d.kode_lama[0])} ${esc(d.nama_mk)} - Kisi-Kisi Lengkap</title>
<style>${CSS}body{background:#fff;color:#111}</style></head><body class="print"><main>
<h1>Kisi-Kisi & Ringkasan Fokus Belajar<br>${esc(d.kode_lama[0])} ${esc(d.nama_mk)}</h1>
<p class="kodes">Kode: <b>${esc(kodeText(d))}</b> · Catatan Akademik</p>
<p class="note">Disusun dari Buku Materi Pokok (BMP), bukan kisi-kisi resmi UT dan bukan soal ujian asli. Untuk latihan mandiri.</p>
<h2>Ringkasan fokus per modul</h2><table><tbody>${modulRows(d, 99)}</tbody></table>
${hafalan(d)}${hasSoal(d) ? `<h2>Soal latihan, kunci, dan alasan</h2>${d.soal.map(q => soalHtml(q, true)).join('')}` : ''}
</main></body></html>`;
}

function indexPage(list) {
  const title = 'Bank Soal & Kisi-Kisi Mata Kuliah UT';
  const desc = 'Ringkasan fokus belajar per modul dan latihan soal mandiri untuk mata kuliah Universitas Terbuka.';
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | ${BRAND}</title><meta name="description" content="${desc}"><link rel="canonical" href="${ORIGIN}${BASE}/"><meta property="og:locale" content="id_ID"><style>${CSS}</style></head><body>
<header class="nav"><a class="brand" href="/">${BRAND}</a></header><main><h1>${title}</h1>
<p class="note">Ringkasan per modul gratis, versi lengkap berbayar. Bukan kisi-kisi resmi UT.</p>
<div class="grid">${list.map(d => `<a class="card mk" href="${BASE}/${d.slug}/"><b>${esc(d.kode_lama[0])}</b><span>${esc(d.nama_mk)}</span><em>${rp(d.harga)}</em></a>`).join('')}</div></main>
<footer>Tidak berafiliasi dengan Universitas Terbuka.</footer></body></html>`;
}

function main() {
  const dir = path.join(ROOT, 'data');
  const list = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  if (!list.length) { console.error('Tidak ada data JSON'); process.exit(1); }
  fs.rmSync(DIST, { recursive: true, force: true }); fs.rmSync(PRINT, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true }); fs.mkdirSync(PRINT, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(list));
  for (const d of list) {
    fs.mkdirSync(path.join(DIST, d.slug), { recursive: true });
    fs.writeFileSync(path.join(DIST, d.slug, 'index.html'), coursePage(d));
    fs.writeFileSync(path.join(PRINT, d.slug + '.html'), printPage(d));
  }
  const urls = [`${ORIGIN}${BASE}/`, ...list.map(d => `${ORIGIN}${BASE}/${d.slug}/`)];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  console.log(`OK: ${list.length} mata kuliah -> dist/ dan print/`);
}
main();
