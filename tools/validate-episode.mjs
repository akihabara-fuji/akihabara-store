// Validasi editorial: node tools/validate-episode.mjs [episodes/<dir>/episode.json ...]
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'episodes');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = args.length
  ? args
  : fs.readdirSync(dir).map((n) => path.join(dir, n, 'episode.json')).filter((f) => fs.existsSync(f));
const CTA_OK = ['follow', 'komentar', 'simpan', 'bagikan', 'coba-skill', 'episode-berikutnya'];
const OPEN_BAD = /^(halo|hai|selamat|perkenalkan|saya\s+\w+\s+priyadi|nama saya)/i;
let bad = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const e = [], w = [];
  const ed = d.editorial || {};
  const sc = d.scenes || [];
  const h = ed.hook, c = ed.cta;
  if (!h || !h.text) e.push('hook belum ada');
  else {
    if (!sc[0] || ((sc[0].besar || [sc[0].caption || '']).join(' ')).trim() !== h.text.trim()) e.push('scene 1 harus memuat teks hook persis');
    if ((h.appearBySec ?? 99) > 3) e.push('hook harus muncul maks 3 detik');
    if (sc[0] && (sc[0].sec ?? 99) > 4.5) e.push('scene hook terlalu panjang (maks 4,5 dtk)');
    if (OPEN_BAD.test(h.text.trim())) e.push('hook berupa perkenalan/salam');
  }
  if (!c || !c.text) e.push('CTA belum ada');
  else {
    if (!CTA_OK.includes(c.action)) e.push(`aksi CTA harus salah satu: ${CTA_OK.join(', ')}`);
    const last = sc[sc.length - 1];
    if (!last || (last.caption || '').trim() !== c.text.trim()) e.push('scene terakhir harus memuat teks CTA persis');
  }
  if (!ed.message) e.push('pesan utama (satu pesan) belum diisi');
  const ph = sc.filter((s) => s.placeholder).length;
  const FINAL = process.argv.includes('--final');
  if (ph) { const m = `${ph} scene masih PLACEHOLDER (hanya untuk preview)`; if (d.status === 'ready' || FINAL) e.push(m + ': dilarang masuk final'); else w.push(m); }
  const cap = sc.filter((x) => x.caption && !x.besar).filter((x) => x.caption.length > 110);
  if (cap.length) w.push(`${cap.length} caption >110 karakter (sulit dibaca)`);
  if (sc.some((x) => x.type === 'split' && !x.besar && !x.title)) w.push('ada scene tanpa judul');
  if (d.status === 'ready' && e.length) e.push('status READY ditolak');
  console.log(`${d.title} [${d.status}] ${e.length ? 'GAGAL' : 'LOLOS'}`);
  e.forEach((x) => console.log('  x ' + x));
  w.forEach((x) => console.log('  ! ' + x));
  if (e.length) bad++;
}
process.exit(bad ? 1 : 0);
