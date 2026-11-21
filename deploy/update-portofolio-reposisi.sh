#!/usr/bin/env bash
# Deploy portofolio + atur urutan dan judul proyek di proyek.json live (isi CMS lain dipertahankan).
# Jalankan sebagai root di VPS: bash update-portofolio-reposisi.sh <commit>
set -euo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/deploy/update-portofolio.sh"
curl -fsSL "$RAW" -o /tmp/up-porto-base.sh
bash /tmp/up-porto-base.sh "$C"
F=/var/www/dikapriyadi/proyek.json
[ -s "$F" ] || curl -fsSL "https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio/proyek.json" -o "$F"
cp -a "$F" "$F.prev-$(date +%s)"
python3 - "$F" <<'PY'
import json,sys
f=sys.argv[1]; p=json.load(open(f,encoding='utf8'))
order=['analisis','remotion','video-sosmed','catatanakademik','heyaipeople']
p.sort(key=lambda x:order.index(x['id']) if x.get('id') in order else 99)
for x in p:
    if x.get('id')=='analisis': x['judul']='Analisis Performa Konten Media Sosial — CatatanAkademik'
json.dump(p,open(f,'w',encoding='utf8'),ensure_ascii=False,indent=2)
print('proyek.json diatur:',[x.get('id') for x in p])
PY
chown www-data:www-data "$F"; chmod a+r "$F"
echo "OK reposisi proyek selesai"

# sinkron state admin supaya Simpan & Terbitkan tidak menimpa teks baru
curl -fsSL "https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/${1:-portofolio-dika}/deploy/sync-admin-state.js" -o /tmp/sync-admin-state.js && node --no-warnings /tmp/sync-admin-state.js
