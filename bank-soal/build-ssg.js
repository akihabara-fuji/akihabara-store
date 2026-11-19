'use strict';
// Generator halaman statis: dist/bank-soal/index.html, dist/bank-soal/<slug>/index.html,
// dist/aktivasi/index.html (noindex), dist/sitemap.xml
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./db');

const SITE = (process.env.SITE_URL || 'https://catatanakademik.com').replace(/\/$/, '');
const DIST = path.join(__dirname, 'dist');
const TIPE_LABEL = { pg_biasa: 'PG Biasa', sebab_akibat: 'Sebab-Akibat', kompleks_123: 'Kompleks 1-2-3' };
const DISCLAIMER = 'Bank Soal & Simulasi UO Catatan Akademik adalah sarana latihan mandiri yang independen dan tidak berafiliasi dengan Universitas Terbuka. Seluruh butir soal disusun sendiri berdasarkan topik buku materi pokok sebagai bahan belajar, bukan soal ujian asli, dan selaras dengan tata tertib akademik Universitas Terbuka.';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const jsonForScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028|\u2029/g, '');
const write = (rel, content) => { const f = path.join(DIST, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };

function loadCourses() {
  const cs = db.prepare('SELECT * FROM courses ORDER BY kode_baru').all();
  return cs.map((c) => {
    const qs = db.prepare('SELECT * FROM questions WHERE course_id=? ORDER BY nomor_urut').all(c.id).map((q) => ({
      n: q.nomor_urut, modul: q.modul, tipe: q.tipe, konten: JSON.parse(q.konten_json), opsi: JSON.parse(q.opsi_json),
      kunci: q.kunci, pembahasan: q.pembahasan, free: q.is_free === 1,
    }));
    return { ...c, kodeLama: JSON.parse(c.kode_lama_json), kisi: JSON.parse(c.kisi_kisi_json), qs };
  });
}

function nav(active) {
  const l = (href, label, key) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<header class="top"><div class="wrap bar">
  <a class="brand" href="/bank-soal/">CATATAN AKADEMIK <span class="badge">SIMULATOR UO</span></a>
  <nav aria-label="Menu utama">${l('/bank-soal/', 'Bank Soal', 'bank')}${l('/bank-soal/#simulasi', 'Simulasi UO', 'sim')}${l('#kisi-kisi', 'Kisi-Kisi Modul', 'kisi')}</nav>
  <div class="switch" role="group" aria-label="Tampilan kode mata kuliah">
    <button type="button" data-kur="obe" aria-pressed="true">Kurikulum OBE</button>
    <button type="button" data-kur="lama" aria-pressed="false">Kode Lama</button>
  </div></div></header>`;
}
const footer = `<footer class="foot"><div class="wrap"><p class="disc">${esc(DISCLAIMER)}</p><p class="copy">&copy; ${new Date().getFullYear()} Catatan Akademik</p></div></footer>`;
const head = ({ title, desc, canonical, robots, ld }) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="${robots}"><meta name="theme-color" content="#0A0A0A">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}">
<link rel="stylesheet" href="/bank-soal/assets/style.css">${(ld || []).map((o) => `<script type="application/ld+json">${jsonForScript(o)}</script>`).join('')}</head>`;

function courseCodes(c) {
  return `<span class="codes"><span class="code code-obe">${esc(c.kode_baru)}</span><span class="sep"> / </span><span class="code code-lama">${esc(c.kodeLama.join(', ') || '-')}</span></span>`;
}

function renderIndex(courses) {
  const cards = courses.map((c) => `<a class="card course" href="/bank-soal/${esc(c.slug)}/">
    <div class="kode">${courseCodes(c)}</div><h2>${esc(c.nama_mk)}</h2>
    <p>${c.sks ? c.sks + ' SKS' : ''}${c.edisi_bmp ? ' &middot; ' + esc(c.edisi_bmp) : ''}</p>
    <p class="muted">${c.qs.length} butir soal latihan &middot; ${c.qs.filter((q) => q.free).length} soal gratis</p></a>`).join('');
  const desc = 'Simulasi Latihan Mandiri (LM) dan Tryout Ujian Online (UO) berbasis modul BMP dengan pemetaan kisi-kisi kurikulum OBE untuk mahasiswa Universitas Terbuka.';
  const ld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Bank Soal & Simulasi UO Catatan Akademik', description: desc, url: SITE + '/bank-soal/',
    mainEntity: { '@type': 'ItemList', itemListElement: courses.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/bank-soal/${c.slug}/`, name: `${c.kode_baru} ${c.nama_mk}` })) } }];
  return head({ title: 'Bank Soal & Simulasi UO Universitas Terbuka | Catatan Akademik', desc, canonical: SITE + '/bank-soal/', robots: 'index, follow', ld }) +
    `<body>${nav('bank')}<main class="wrap" id="simulasi"><section class="hero"><h1>Bank Soal &amp; Simulasi UO</h1>
    <p class="lead">Simulasi Latihan Mandiri (LM) dan Tryout Ujian Online (UO) berbasis modul BMP, lengkap dengan pemetaan kisi-kisi kurikulum OBE. Soal nomor 1 sampai 10 gratis pada setiap mata kuliah.</p></section>
    <div class="grid">${cards || '<p class="muted">Belum ada mata kuliah. Jalankan import-course.js.</p>'}</div></main>${footer}<script src="/bank-soal/assets/nav.js" defer></script></body></html>`;
}

function renderCourse(c) {
  const free = c.qs.filter((q) => q.free);
  const locked = c.qs.filter((q) => !q.free).map((q) => ({ n: q.n, modul: q.modul, tipe: q.tipe }));
  const url = `${SITE}/bank-soal/${c.slug}/`;
  const title = `Bank Soal ${c.kode_baru} / ${c.kodeLama.join(', ')} ${c.nama_mk} | Simulasi UO`;
  const desc = `Simulasi Latihan Mandiri dan tryout UO ${c.nama_mk} (${c.kode_baru} / ${c.kodeLama.join(', ')}) berbasis modul BMP, kisi-kisi Modul 1-${c.kisi.length || 1}, soal nomor 1-10 gratis lengkap dengan pembahasan.`;
  const faq = [
    ['Apa itu Simulasi UO Catatan Akademik?', 'Sarana latihan mandiri yang meniru format Ujian Online: soal bernomor, penanda ragu-ragu, pengatur waktu, dan skor per modul untuk mengetahui bagian yang perlu diperkuat.'],
    ['Apakah soal di sini soal ujian asli?', 'Bukan. Seluruh butir soal adalah soal latihan yang disusun sendiri berdasarkan topik buku materi pokok.'],
    ['Soal mana yang gratis?', 'Soal nomor 1 sampai 10 dapat dikerjakan dan dibaca pembahasannya tanpa token. Soal nomor 11 dan seterusnya dibuka dengan token akses.'],
    ['Apa beda Kurikulum OBE dan Kode Lama?', `Mata kuliah ini memiliki kode kurikulum baru ${c.kode_baru} dan kode lama ${c.kodeLama.join(', ') || '-'}. Tombol di navbar mengubah kode yang ditonjolkan, isi latihan tetap sama.`],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Quiz', name: `Simulasi Latihan ${c.nama_mk} (${c.kode_baru})`, description: desc, url, inLanguage: 'id', educationalLevel: 'Perguruan Tinggi',
      about: { '@type': 'Thing', name: c.nama_mk }, educationalAlignment: { '@type': 'AlignmentObject', alignmentType: 'teaches', targetName: `${c.kode_baru} / ${c.kodeLama.join(', ')}` },
      hasPart: free.map((q) => { const t = q.tipe === 'pg_biasa' ? q.konten.pertanyaan : q.tipe === 'sebab_akibat' ? `${q.konten.pernyataan} Sebab: ${q.konten.alasan}` : `${q.konten.pengantar} (1) ${q.konten.item_1} (2) ${q.konten.item_2} (3) ${q.konten.item_3}`;
        return { '@type': 'Question', eduQuestionType: 'Multiple choice', text: t, suggestedAnswer: ['A', 'B', 'C', 'D'].map((o) => ({ '@type': 'Answer', text: q.opsi[o] })), acceptedAnswer: { '@type': 'Answer', text: q.opsi[q.kunci], answerExplanation: { '@type': 'Comment', text: q.pembahasan } } }; }) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const data = { slug: c.slug, nama: c.nama_mk, kodeBaru: c.kode_baru, kodeLama: c.kodeLama, total: c.qs.length, harga: c.harga_satuan, semester: c.semester, free, locked, moduls: c.kisi.map((k) => k.modul) };
  const kisiRows = c.kisi.map((k) => `<tr><td>Modul ${k.modul}</td><th scope="row">${esc(k.judul)}</th><td>${esc(k.fokus)}</td></tr>`).join('');
  const freeList = free.map((q) => { const body = q.tipe === 'pg_biasa' ? `<p>${esc(q.konten.pertanyaan)}</p>` : q.tipe === 'sebab_akibat'
      ? `<p><strong>Pernyataan:</strong> ${esc(q.konten.pernyataan)}</p><p><strong>Sebab:</strong> ${esc(q.konten.alasan)}</p>`
      : `<p>${esc(q.konten.pengantar)}</p><ol class="ro"><li>${esc(q.konten.item_1)}</li><li>${esc(q.konten.item_2)}</li><li>${esc(q.konten.item_3)}</li></ol>`;
    return `<article class="card q"><h3>Soal ${q.n} <span class="tag">Modul ${q.modul} &bull; ${TIPE_LABEL[q.tipe]}</span></h3>${body}
      <ul class="opt">${['A', 'B', 'C', 'D'].map((o) => `<li><b>${o}.</b> ${esc(q.opsi[o])}</li>`).join('')}</ul>
      <p><strong>Kunci:</strong> ${q.kunci}. ${esc(q.opsi[q.kunci])}</p><p class="muted"><strong>Pembahasan:</strong> ${esc(q.pembahasan)}</p></article>`; }).join('');
  const modOpts = '';
  return head({ title, desc, canonical: url, robots: 'index, follow', ld }) + `<body data-course="${esc(c.slug)}">${nav('sim')}
<main class="wrap">
 <section class="chead"><div class="kode" data-codes>${courseCodes(c)}</div>
  <h1><span data-h1-kode>${esc(c.kode_baru)}</span> ${esc(c.nama_mk)}: Bank Soal &amp; Simulasi UO</h1>
  <p class="muted">${c.sks ? c.sks + ' SKS &middot; ' : ''}${esc(c.edisi_bmp || '')}</p>
  <div class="tabs" role="tablist" aria-label="Filter tipe soal">
   <button role="tab" data-tipe="all" aria-selected="true">Semua Tipe</button><button role="tab" data-tipe="pg_biasa" aria-selected="false">PG Biasa</button>
   <button role="tab" data-tipe="sebab_akibat" aria-selected="false">Sebab-Akibat</button><button role="tab" data-tipe="kompleks_123" aria-selected="false">Kompleks 1-2-3</button></div>
 </section>
 <section class="sim" id="simulator" aria-label="Simulator UO">
  <div class="left card" id="exam">
   <div class="qhead"><span id="qno">Soal 1 dari ${c.qs.length}</span><span class="tag" id="qtag"></span></div>
   <div class="modes" role="group" aria-label="Mode"><button type="button" data-mode="belajar" aria-pressed="true">Mode Belajar</button><button type="button" data-mode="ujian" aria-pressed="false">Mode Ujian UO</button></div>
   <div class="petunjuk" id="petunjuk" hidden></div>
   <div class="qbody" id="qbody"><noscript>Aktifkan JavaScript untuk memakai simulator. Soal gratis tetap dapat dibaca di bagian bawah halaman.</noscript></div>
   <div class="opts" id="opts" role="radiogroup" aria-label="Pilihan jawaban"></div>
   <div class="pemb" id="pemb" hidden></div>
   <div class="navq"><button type="button" class="btn" id="prev">Sebelumnya</button><button type="button" class="btn amber" id="flag" aria-pressed="false">Ragu-Ragu</button><button type="button" class="btn" id="next">Selanjutnya</button></div>
   <p class="hint">Pintasan keyboard: A B C D untuk memilih, panah kiri dan kanan untuk berpindah soal.</p>
  </div>
  <aside class="right card" aria-label="Panel kontrol UO">
   <div class="timer" id="timer" role="timer" aria-live="off">01:30:00</div>
   <div class="prog"><div class="pbar"><i id="barfill"></i></div><span id="proglabel">0/${c.qs.length} Terjawab</span></div>
   <div class="grid45" id="grid" aria-label="Nomor soal"></div>
   <ul class="legend"><li><i class="l done"></i>Terjawab</li><li><i class="l flag"></i>Ragu-ragu</li><li><i class="l todo"></i>Belum</li><li><i class="l lock"></i>Terkunci</li></ul>
   <button type="button" class="btn primary wide" id="finish">Selesaikan Simulasi</button>
   <button type="button" class="btn wide" id="unlock">Masukkan Token Akses</button>
  </aside>
 </section>
 <section class="seo" id="kisi-kisi"><h2>Kisi-Kisi Fokus Ujian Modul 1&ndash;${c.kisi.length || 1}</h2>
  <div class="tw"><table><thead><tr><th>Modul</th><th>Topik</th><th>Fokus latihan</th></tr></thead><tbody>${kisiRows}</tbody></table></div>
  <h2>Soal Gratis Nomor 1&ndash;10 beserta Pembahasan</h2><div class="qlist">${freeList}</div>
  <h2>Pertanyaan yang Sering Diajukan</h2>${faq.map(([q, a]) => `<details class="card"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
 </section>
</main>${footer}
<div class="modal" id="modal" hidden><div class="mbox card" role="dialog" aria-modal="true" aria-labelledby="mtitle"><button type="button" class="x" id="mclose" aria-label="Tutup">&times;</button><div id="mcontent"></div></div></div>
<script>window.__BS__=${jsonForScript(data)};</script><script src="/bank-soal/assets/nav.js" defer></script><script src="/bank-soal/assets/simulator.js" defer></script></body></html>`;
}

function renderAktivasi() {
  return head({ title: 'Aktivasi Token | Catatan Akademik', desc: 'Aktivasi token akses Bank Soal.', canonical: SITE + '/bank-soal/aktivasi/', robots: 'noindex, nofollow' }) +
    `<body>${nav('')}<main class="wrap narrow"><section class="card"><h1>Aktivasi Token Akses</h1><p class="muted">Masukkan kode token dengan format CA-XXXX-XXXX yang Anda terima setelah pembayaran.</p>
    <form id="f"><label for="t">Kode token</label><input id="t" name="t" autocomplete="off" placeholder="CA-XXXX-XXXX" maxlength="12" required><button class="btn primary" type="submit">Aktifkan</button></form><p id="msg" role="status"></p></section></main>${footer}
    <script src="/bank-soal/assets/nav.js" defer></script><script src="/bank-soal/assets/aktivasi.js" defer></script></body></html>`;
}

function main() {
  const courses = loadCourses();
  fs.rmSync(DIST, { recursive: true, force: true });
  write('bank-soal/index.html', renderIndex(courses));
  for (const c of courses) write(`bank-soal/${c.slug}/index.html`, renderCourse(c));
  write('bank-soal/aktivasi/index.html', renderAktivasi());
  const pub = path.join(__dirname, 'public', 'assets');
  for (const f of fs.readdirSync(pub)) { fs.mkdirSync(path.join(DIST, 'bank-soal', 'assets'), { recursive: true }); fs.copyFileSync(path.join(pub, f), path.join(DIST, 'bank-soal', 'assets', f)); }
  const d = new Date().toISOString().slice(0, 10);
  const urls = [`${SITE}/bank-soal/`, ...courses.map((c) => `${SITE}/bank-soal/${c.slug}/`)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  console.log(`SSG selesai: ${courses.length} mata kuliah, ${urls.length} URL di sitemap`);
}
main();
