#!/usr/bin/env bash
# Ruang Admin: tambah menu Proyek Utama (tambah/ubah/hapus/urut) + pindah video. Jalankan sebagai root: bash patch-admin-2.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C"
APP=/opt/dp-admin; DATA=/var/lib/dp-admin; WEB=/var/www/dikapriyadi
TS=$(date +%s); BK=$DATA/pre-v3-$TS
mkdir -p "$BK"
cp -a "$APP/server.js" "$APP/admin.html" "$BK/"; cp -a "$WEB/index.html" "$BK/"
[ -f "$WEB/proyek.json" ] && cp -a "$WEB/proyek.json" "$BK/"
rollback(){ echo "GAGAL: $1 -> rollback"; cp -a "$BK/server.js" "$BK/admin.html" "$APP/"; [ -f "$BK/dp.db" ] && cp -a "$BK/dp.db" "$DATA/dp.db"; systemctl restart dp-admin; exit 1; }
curl -fsSL "$RAW/portofolio-api/admin-v2.html" -o /tmp/admin-v3.html || rollback "unduh admin"
curl -fsSL "$RAW/portofolio/proyek.json" -o /tmp/proyek-seed.json || rollback "unduh proyek.json"
grep -q "Proyek Utama" /tmp/admin-v3.html || rollback "admin tidak valid"
python3 -c "import json;assert len(json.load(open('/tmp/proyek-seed.json')))>0" || rollback "proyek.json kosong"
[ -s "$WEB/proyek.json" ] || cp /tmp/proyek-seed.json "$WEB/proyek.json"

python3 - "$APP/server.js" <<'PY' || rollback "patch server.js"
import sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
if "proyek: 'proyek.json'" in s: print('server.js sudah dipatch'); sys.exit(0)
def rep(old,new):
    global s
    assert s.count(old)==1,(old[:60],s.count(old)); s=s.replace(old,new)
rep("const out = { works: [], karya: [], remotion: [], site: {} };","const out = { works: [], karya: [], remotion: [], proyek: [], site: {} };")
rep("  if (out.site.fotoTentang) assertFile(","""  const PR = Array.isArray(inp.proyek) ? inp.proyek : []; if (PR.length > 12) bad('Maksimal 12 proyek');
  const pt = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const pids = new Set();
  for (const x of PR) {
    const judul = pt(x.judul, 120); if (!judul) bad('Judul proyek wajib diisi');
    let id = pt(x.id, 60).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || ('proyek-' + (pids.size + 1));
    while (pids.has(id)) id += '-x'; pids.add(id);
    const o = { id, status: pt(x.status, 40) || 'Proyek', judul, ringkas: pt(x.ringkas, 400), media: [], bagian: [], meta: [] };
    if (!o.ringkas) bad('Ringkasan proyek "' + judul + '" wajib diisi');
    for (const m of (Array.isArray(x.media) ? x.media : []).slice(0, 8)) {
      const src = cleanPath(m.src, 'Media proyek "' + judul + '"', false); if (!src) continue; assertFile(src, 'Media proyek "' + judul + '"');
      const mm = { tipe: m.tipe === 'video' ? 'video' : 'gambar', src, poster: '', teks: pt(m.teks, 300), alt: pt(m.alt, 200) };
      if (m.poster) { mm.poster = cleanPath(m.poster, 'Poster proyek "' + judul + '"', false); if (mm.poster) assertFile(mm.poster, 'Poster proyek "' + judul + '"'); }
      o.media.push(mm);
    }
    for (const b of (Array.isArray(x.bagian) ? x.bagian : []).slice(0, 40)) { const label = pt(b.label, 80), isi = pt(b.isi, 1500); if (label || isi) o.bagian.push({ label, isi }); }
    for (const t of (Array.isArray(x.meta) ? x.meta : []).slice(0, 12)) { const k = pt(t.k, 60), v = pt(t.v, 300); if (k || v) o.meta.push({ k, v }); }
    if (x.draft) o.draft = true;
    out.proyek.push(o);
  }
  if (out.site.fotoTentang) assertFile(""")
rep("remotion: 'remotion.json' };","remotion: 'remotion.json', proyek: 'proyek.json' };")
rep("    karya: st.karya.filter(x => !x.draft).map(strip),","    karya: st.karya.filter(x => !x.draft).map(strip),\n    proyek: (st.proyek || []).filter(x => !x.draft).map(strip),")
open(p,'w',encoding='utf8').write(s); print('server.js dipatch')
PY
node --check "$APP/server.js" || rollback "sintaks server.js"
cp /tmp/admin-v3.html "$APP/admin.html"

systemctl stop dp-admin
cp -a "$DATA/dp.db" "$BK/dp.db"
node --no-warnings - <<'JS' || rollback "migrasi data"
const {DatabaseSync}=require('node:sqlite'); const fs=require('fs');
const db=new DatabaseSync('/var/lib/dp-admin/dp.db');
const st=JSON.parse(db.prepare("SELECT v FROM kv WHERE k='state'").get().v);
if(!Array.isArray(st.proyek)||!st.proyek.length){
  st.proyek=JSON.parse(fs.readFileSync('/var/www/dikapriyadi/proyek.json','utf8'));
  const j=JSON.stringify(st);
  db.prepare("INSERT OR REPLACE INTO kv(k,v) VALUES('state',?)").run(j);
  db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(),'Tambah menu Proyek Utama (admin v3)',j);
}
console.log('migrasi ok: proyek',st.proyek.length);
JS
systemctl start dp-admin; sleep 2
systemctl is-active dp-admin | grep -q active || rollback "layanan tidak aktif"
S=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3108/admin); echo "admin /admin -> $S"
[ "$S" = 200 ] || rollback "admin tidak merespons"
echo "OK, admin v3 aktif. Cadangan: $BK"
