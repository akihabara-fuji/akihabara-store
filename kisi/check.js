// Pemeriksa data MK sebelum build: node kisi/check.js [file.json ...]
// Menolak: kode tidak cocok KHS (kode-mk.json), soal cacat, kata terlarang.
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const FORBIDDEN = ['joki', 'jasa tugas', 'jasa tuton', 'terima beres', 'bocoran', 'kunci jawaban asli', 'pasti tembus', 'pasti keluar', 'sering diujikan', 'sering keluar'];
const kodeMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'kode-mk.json'), 'utf8'));
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.json')).map(f => path.join(ROOT, 'data', f));
let bad = 0;
for (const f of files) {
  const err = []; const raw = fs.readFileSync(f, 'utf8'); let d;
  try { d = JSON.parse(raw); } catch (e) { console.log(`X ${f}: JSON rusak (${e.message})`); bad++; continue; }
  const low = raw.toLowerCase(); FORBIDDEN.forEach(w => low.includes(w) && err.push(`kata terlarang "${w}"`));
  ['slug', 'nama_mk', 'prodi', 'semester', 'sks', 'harga', 'moduls'].forEach(k => (d[k] === undefined || d[k] === null) && err.push(`field ${k} kosong`));
  if (d.kode_baru) {
    const m = kodeMap.find(x => x.kode_baru === d.kode_baru);
    if (!m) err.push(`kode_baru ${d.kode_baru} tidak ada di KHS (kode-mk.json)`);
    else if (m.nama_mk.toLowerCase() !== String(d.nama_mk).toLowerCase()) err.push(`nama MK beda dari KHS: "${m.nama_mk}"`);
    else if (m.kode_lama && !(d.kode_lama || []).includes(m.kode_lama)) err.push(`kode_lama harus ${m.kode_lama}`);
    else if (m.sks !== d.sks) err.push(`SKS harus ${m.sks} menurut KHS`);
  } else err.push('kode_baru kosong');
  const n = (d.moduls || []).length; if (!n) err.push('modul kosong');
  (d.moduls || []).forEach((m, i) => { if (m.no !== i + 1) err.push(`nomor modul ${m.no} tidak urut`); });
  const seen = new Set();
  (d.soal || []).forEach(q => {
    const t = `soal ${q.no}`;
    if (seen.has(q.no)) err.push(`${t} ganda`); seen.add(q.no);
    if (!(q.modul >= 1 && q.modul <= n)) err.push(`${t}: modul ${q.modul} di luar 1-${n}`);
    if (!Array.isArray(q.opsi) || q.opsi.length !== 4) err.push(`${t}: opsi harus 4`);
    if (!['A', 'B', 'C', 'D'].includes(q.kunci)) err.push(`${t}: kunci "${q.kunci}" tidak valid`);
    if (!q.pembahasan) err.push(`${t}: pembahasan kosong`);
    if (Array.isArray(q.opsi) && new Set(q.opsi).size !== q.opsi.length) err.push(`${t}: ada opsi kembar`);
  });
  const perModul = {}; (d.soal || []).forEach(q => perModul[q.modul] = (perModul[q.modul] || 0) + 1);
  const kosong = Array.from({ length: n }, (_, i) => i + 1).filter(i => !perModul[i]);
  if ((d.soal || []).length && kosong.length) err.push(`modul tanpa soal: ${kosong.join(', ')}`);
  console.log(err.length ? `X ${path.basename(f)}\n   - ${err.join('\n   - ')}` : `OK ${path.basename(f)} (${n} modul, ${(d.soal || []).length} soal)`);
  bad += err.length ? 1 : 0;
}
process.exit(bad ? 1 : 0);
