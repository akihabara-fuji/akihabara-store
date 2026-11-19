'use strict';
// Pemakaian: node import-course.js data/mkwn4109.json
// Upsert mata kuliah + soal ke SQLite, lalu membangun ulang halaman statis.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { db } = require('./db');

const file = process.argv[2];
if (!file) { console.error('Pemakaian: node import-course.js <file.json>'); process.exit(1); }
const d = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

const TIPE = ['pg_biasa', 'sebab_akibat', 'kompleks_123'];
function fail(m) { console.error('GAGAL:', m); process.exit(1); }
for (const k of ['slug', 'kode_baru', 'nama_mk']) if (!d[k]) fail('field wajib kosong: ' + k);
if (!/^[a-z0-9-]+$/.test(d.slug)) fail('slug hanya boleh huruf kecil, angka, dan strip');
const seen = new Set();
for (const q of d.questions || []) {
  if (!(q.nomor_urut >= 1 && q.nomor_urut <= 45)) fail('nomor_urut di luar 1-45: ' + q.nomor_urut);
  if (seen.has(q.nomor_urut)) fail('nomor_urut ganda: ' + q.nomor_urut);
  seen.add(q.nomor_urut);
  if (!(q.modul >= 1 && q.modul <= 9)) fail('modul di luar 1-9 pada soal ' + q.nomor_urut);
  if (!TIPE.includes(q.tipe)) fail('tipe tidak dikenal pada soal ' + q.nomor_urut);
  if (!['A', 'B', 'C', 'D'].includes(q.kunci)) fail('kunci tidak valid pada soal ' + q.nomor_urut);
  for (const o of 'ABCD') if (!q.opsi || !q.opsi[o]) fail(`opsi ${o} kosong pada soal ${q.nomor_urut}`);
  const c = q.konten || {};
  const need = q.tipe === 'pg_biasa' ? ['pertanyaan'] : q.tipe === 'sebab_akibat' ? ['pernyataan', 'alasan'] : ['pengantar', 'item_1', 'item_2', 'item_3'];
  for (const n of need) if (!c[n]) fail(`konten.${n} kosong pada soal ${q.nomor_urut}`);
}

const now = new Date().toISOString();
db.exec('BEGIN');
try {
  db.prepare(`INSERT INTO courses (slug,kode_baru,kode_lama_json,nama_mk,fakultas,prodi,semester,sks,edisi_bmp,kisi_kisi_json,harga_satuan,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET kode_baru=excluded.kode_baru,kode_lama_json=excluded.kode_lama_json,nama_mk=excluded.nama_mk,
      fakultas=excluded.fakultas,prodi=excluded.prodi,semester=excluded.semester,sks=excluded.sks,edisi_bmp=excluded.edisi_bmp,
      kisi_kisi_json=excluded.kisi_kisi_json,harga_satuan=excluded.harga_satuan,updated_at=excluded.updated_at`)
    .run(d.slug, d.kode_baru, JSON.stringify(d.kode_lama || []), d.nama_mk, d.fakultas || null, d.prodi || null,
      d.semester ?? null, d.sks ?? null, d.edisi_bmp || null, JSON.stringify(d.kisi_kisi || []), d.harga_satuan ?? 15000, now);
  const cid = db.prepare('SELECT id FROM courses WHERE slug=?').get(d.slug).id;
  db.prepare('DELETE FROM questions WHERE course_id=?').run(cid);
  const ins = db.prepare(`INSERT INTO questions (course_id,nomor_urut,modul,tipe,konten_json,opsi_json,kunci,pembahasan,is_free)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const q of d.questions || []) {
    ins.run(cid, q.nomor_urut, q.modul, q.tipe, JSON.stringify(q.konten), JSON.stringify(q.opsi), q.kunci, q.pembahasan || '',
      q.nomor_urut <= 10 ? 1 : 0);
  }
  db.exec('COMMIT');
  console.log(`OK: ${d.slug} (${(d.questions || []).length} soal)`);
} catch (e) { db.exec('ROLLBACK'); fail(e.message); }

const r = spawnSync(process.execPath, [path.join(__dirname, 'build-ssg.js')], { stdio: 'inherit' });
process.exit(r.status || 0);
