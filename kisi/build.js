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

const FORBIDDEN = ['joki', 'jasa tugas', 'jasa tuton', 'terima beres', 'bocoran', 'kunci jawaban asli', 'pasti tembus', 'pasti keluar', 'sering diujikan', 'sering keluar'];
function validateClean(raw, name) {
  const low = raw.toLowerCase(), hit = FORBIDDEN.filter(w => low.includes(w));
  if (hit.length) { console.error(`[DITOLAK] ${name} memuat kata terlarang: ${hit.join(', ')}`); process.exit(1); }
}

const CSS = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');

function kodeShort(d) { return d.kode_baru ? `${d.kode_baru} (${d.kode_lama[0]})` : d.kode_lama[0]; }
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
  const title = `Kisi-Kisi & Ringkasan ${kodeShort(d)} ${d.nama_mk} per Modul`;
  const desc = `Ringkasan fokus belajar ${d.nama_mk} (${kodeText(d)}) per modul 1-${d.moduls.length} berdasarkan BMP${hasSoal(d) ? ', lengkap contoh soal latihan mandiri' : ''}. Versi lengkap ${rp(d.harga)}.`;
  const url = `${ORIGIN}${BASE}/${d.slug}/`;
  const free = hasSoal(d) ? d.soal.filter(q => (d.gratis_soal || []).includes(q.no) && q.verifikasi !== 'menunggu') : [];
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: title, description: desc, url, inLanguage: 'id' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kisi-Kisi UT', item: `${ORIGIN}${BASE}/` },
        { '@type': 'ListItem', position: 2, name: d.nama_mk, item: url } ] }
    ]
  };
  const buy = wa(`Halo admin, saya mau ${d.pdf_ready ? 'beli' : 'pesan'} kisi-kisi lengkap ${d.kode_lama[0]} ${d.nama_mk} (${rp(d.harga)})`);
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:locale" content="id_ID"><meta property="og:type" content="website">
<script type="application/ld+json">${JSON.stringify(ld)}</script><style>${CSS}</style></head><body>
<header class="nav"><a class="brand" href="/">${BRAND}</a><nav><a href="${BASE}/">Bank Soal</a></nav></header>
<main>
<p class="crumb"><a href="${BASE}/">Kisi-Kisi UT</a>${d.prodi ? ` › <a href="${BASE}/${slugify(d.prodi)}/">${esc(d.prodi)}</a>` : ''} › ${esc(d.kode_lama[0])}</p>
<h1>Kisi-Kisi & Ringkasan Fokus Belajar ${esc(kodeShort(d))} ${esc(d.nama_mk)}</h1>
<p class="kodes">Kode: <b>${esc(kodeText(d))}</b></p>
<p class="note">Ringkasan ini disusun dari Buku Materi Pokok (BMP) dan bukan kisi-kisi resmi dari UT. Isi adalah ringkasan belajar mandiri, bukan soal ujian asli.</p>
<section class="card"><h2>Fokus belajar per modul</h2><table><tbody>${modulRows(d, 3)}</tbody></table>
<button class="more" id="mm" type="button">Baca lengkap (Modul 1–${d.moduls.length})</button></section>
${hafalan(d)}${free.length ? `<section class="card"><h2>Contoh soal gratis (${free.length} dari ${d.soal.length})</h2>${free.map(q => soalHtml(q, true)).join('')}</section>` : ''}
<section class="card buy"><h2>Versi lengkap ${rp(d.harga)}</h2>
<ul><li>Ringkasan fokus semua modul dalam PDF</li>${hasSoal(d) ? `<li>${d.soal.length} soal latihan dengan kunci dan alasan</li>` : `<li>Penjabaran materi inti tiap modul dan rumus cepat</li>`}<li>Siap dibaca di HP atau dicetak</li></ul>
<a class="btn" href="${buy}" rel="noopener">${d.pdf_ready ? 'Beli lewat WhatsApp' : 'Pesan lewat WhatsApp'}</a><p class="hint">${d.pdf_ready ? 'PDF dikirim admin setelah pembayaran.' : 'PDF sedang disiapkan. Admin kabari saat siap, bayar setelah file siap.'}</p></section>
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

const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const shell = (title, desc, canon, body) => `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${BRAND}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canon}"><meta property="og:locale" content="id_ID"><meta property="og:title" content="${esc(title)}"><style>${CSS}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px}.chip{font:inherit;font-size:13px;min-height:44px;padding:0 14px;border-radius:99px;border:1px solid var(--bd);background:var(--s1);color:var(--mu);cursor:pointer}.chip[aria-pressed=true]{background:var(--ac);color:#111;border-color:var(--ac)}.srch{width:100%;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--bd);background:var(--s1);color:var(--tx);font:inherit;margin-top:8px}</style></head><body>
<header class="nav"><a class="brand" href="/">${BRAND}</a><nav><a href="${BASE}/">Kisi-Kisi UT</a></nav></header><main>${body}</main>
<footer>Platform ini adalah sarana belajar mandiri dan tidak berafiliasi dengan Universitas Terbuka. Tidak menyediakan naskah ujian asli maupun layanan pengerjaan ujian.</footer></body></html>`;
const mkCard = d => `<a class="card mk" data-sem="${d.semester || ''}" data-q="${esc((kodeText(d) + ' ' + d.nama_mk).toLowerCase())}" href="${BASE}/${d.slug}/"><b>${esc(kodeShort(d))}</b><span>${esc(d.nama_mk)}</span><em>Sem ${d.semester || '-'} · ${d.sks || '-'} SKS · ${d.pdf_ready ? 'PDF siap' : 'Kisi-kisi'}</em></a>`;
const filterJs = `<script>(function(){var q=document.getElementById('s'),c=[].slice.call(document.querySelectorAll('.mk[data-q]')),b=[].slice.call(document.querySelectorAll('.chip')),sem='all';function f(){var t=q.value.toLowerCase().trim();c.forEach(function(x){x.style.display=(x.dataset.q.indexOf(t)>-1&&(sem==='all'||x.dataset.sem===sem))?'':'none'})}q.addEventListener('input',f);b.forEach(function(x){x.addEventListener('click',function(){sem=x.dataset.sem;b.forEach(function(y){y.setAttribute('aria-pressed',y===x)});f()})})})();</script>`;
function listBlock(list) {
  const sems = [...new Set(list.map(d => d.semester).filter(Boolean))].sort((a, b) => a - b);
  return `<input id="s" class="srch" type="search" placeholder="Cari kode atau nama MK, contoh EMBS4101 atau Manajemen" aria-label="Cari mata kuliah">
<div class="chips"><button class="chip" type="button" data-sem="all" aria-pressed="true">Semua</button>${sems.map(s => `<button class="chip" type="button" data-sem="${s}" aria-pressed="false">Sem ${s}</button>`).join('')}</div>
<div class="grid">${list.map(mkCard).join('')}</div>${filterJs}`;
}
function prodiPage(p, list) {
  const title = `Kisi-Kisi & Ringkasan Mata Kuliah ${p.nama} Universitas Terbuka`;
  const desc = `Ringkasan fokus belajar per modul dan latihan soal mandiri mata kuliah ${p.nama} UT, kode baru dan kode lama.`;
  return shell(title, desc, `${ORIGIN}${BASE}/${p.slug}/`, `<p class="crumb"><a href="${BASE}/">Kisi-Kisi UT</a> › ${esc(p.fakultas)}</p><h1>${esc(title)}</h1><p class="note">Bukan kisi-kisi resmi UT. Ringkasan disusun dari BMP untuk belajar mandiri.</p>${listBlock(list)}`);
}
function indexPage(list, prodis) {
  const title = 'Kisi-Kisi & Latihan Soal Mata Kuliah Universitas Terbuka';
  const desc = 'Ringkasan fokus belajar per modul dan latihan soal mandiri mata kuliah Universitas Terbuka per fakultas dan program studi.';
  return shell(title, desc, `${ORIGIN}${BASE}/`, `<h1>${title}</h1><p class="note">Ringkasan per modul gratis, versi lengkap berbayar. Bukan kisi-kisi resmi UT.</p>
<h2>Program studi</h2><div class="grid">${prodis.map(p => `<a class="card mk" href="${BASE}/${p.slug}/"><b>${esc(p.nama)}</b><span>${esc(p.fakultas)}</span><em>${p.n} mata kuliah</em></a>`).join('')}</div>
<h2 style="margin-top:18px">Semua mata kuliah</h2>${listBlock(list)}`);
}

function main() {
  const dir = path.join(ROOT, 'data');
  const list = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => (r => { validateClean(r, f); return JSON.parse(r); })(fs.readFileSync(path.join(dir, f), 'utf8')));
  if (!list.length) { console.error('Tidak ada data JSON'); process.exit(1); }
  fs.rmSync(DIST, { recursive: true, force: true }); fs.rmSync(PRINT, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true }); fs.mkdirSync(PRINT, { recursive: true });
  const prodis = [...new Set(list.map(d => d.prodi).filter(Boolean))].map(n => { const m = list.filter(d => d.prodi === n); return { nama: n, slug: slugify(n), fakultas: m[0].fakultas, n: m.length, m }; });
  fs.writeFileSync(path.join(DIST, 'index.html'), indexPage(list, prodis));
  for (const p of prodis) { fs.mkdirSync(path.join(DIST, p.slug), { recursive: true }); fs.writeFileSync(path.join(DIST, p.slug, 'index.html'), prodiPage(p, p.m)); }
  for (const d of list) {
    fs.mkdirSync(path.join(DIST, d.slug), { recursive: true });
    fs.writeFileSync(path.join(DIST, d.slug, 'index.html'), coursePage(d));
    fs.writeFileSync(path.join(PRINT, d.slug + '.html'), printPage(d));
  }
  const urls = [`${ORIGIN}${BASE}/`, ...prodis.map(p => `${ORIGIN}${BASE}/${p.slug}/`), ...list.map(d => `${ORIGIN}${BASE}/${d.slug}/`)];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  console.log(`OK: ${list.length} mata kuliah -> dist/ dan print/`);
}
main();
