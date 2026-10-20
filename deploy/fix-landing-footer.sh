#!/usr/bin/env bash
# PERBAIKAN: footer baru menghilangkan elemen #brand2, #yr, #footSocial yang dipakai script landing, sehingga produk tidak tampil.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-fix-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
if 'id="brand2"' in s and 'id="footSocial"' in s and 'id="yr"' in s: print("sudah benar"); sys.exit(0)
a='<div class="ft-b"><b>nextaja</b><span>Jakarta Barat. Ruang Akademik UT, Lab Studio, Analisa, dan Blog.</span><small>© nextaja. Semua hak dilindungi.</small></div>'
b='<div class="ft-b"><b id="brand2">nextaja</b><span>Jakarta Barat. Ruang Akademik UT, Lab Studio, Analisa, dan Blog.</span><small>© <span id="yr"></span> nextaja. Semua hak dilindungi.</small><div id="footSocial" class="ft-s"></div></div>'
assert a in s, "footer baru tidak ditemukan"
s=s.replace(a,b,1)
s=s.replace('</head>','<style>.ft-s{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px}.ft-s a{color:var(--muted,#b9b3dd)}.ft-s a:hover{color:var(--text,#f3f0ff)}</style></head>',1)
open(f,'w',encoding='utf8').write(s); print("diperbaiki")
PY
for id in brand2 yr footSocial; do grep -q "id=\"$id\"" "$F"; done
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
