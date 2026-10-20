#!/usr/bin/env bash
# Landing: judul ulasan jadi "Apa kata mereka?"; kartu blog diseragamkan dengan kartu lain (tanpa bingkai kuning tebal, rasio 4:3). Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
G=/root/nxl/nx-landing/hero.css
BK=/root/landing-backup-ulasan-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" "$G" <<'PY'
import sys
f,g=sys.argv[1],sys.argv[2]
M='/*nx-ulasan-v1*/'
CSS=M+".bp .cv{padding:0!important;aspect-ratio:4/3!important;background:var(--surface2,#181838)!important;overflow:hidden}.bp .cv img{width:100%;height:100%;object-fit:cover;object-position:center}#blogstrip .bp .pb{padding:18px}"
s=open(f,encoding='utf8').read()
if M in s: print("sudah")
else:
    a='<h2 data-tx="t061">Ulasan asli, bukan karangan</h2><p data-tx="t062">Ditampilkan hanya dengan izin pelanggan.</p>'
    b='<h2>Apa kata mereka?</h2><p>Cuplikan chat pelanggan, ditampilkan dengan izin mereka.</p>'
    assert a in s, "judul ulasan tidak ditemukan"
    s=s.replace(a,b,1).replace('</head>','<style>'+CSS+'</style></head>',1)
    open(f,'w',encoding='utf8').write(s); print("diubah")
try:
    h=open(g,encoding='utf8').read()
    if M not in h: open(g,'a',encoding='utf8').write("\n"+CSS)
except FileNotFoundError: pass
PY
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
