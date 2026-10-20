#!/usr/bin/env bash
# Landing: isi halaman selebar banner (tidak lagi menyempit di tengah) + tulisan kartu lebih besar di layar lebar. Hanya CSS. Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
G=/root/nxl/nx-landing/hero.css
BK=/root/landing-backup-width-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" "$G" <<'PY'
import sys
f,g=sys.argv[1],sys.argv[2]
M='/*nx-width-v1*/'
CSS=M+"""@media(min-width:981px){
main .wrap,section .wrap{max-width:none!important;padding-left:clamp(20px,2.6vw,48px)!important;padding-right:clamp(20px,2.6vw,48px)!important}
.nav .wrap{padding-left:clamp(12px,1.2vw,20px)!important;padding-right:clamp(12px,1.2vw,20px)!important}
.sh h2{font-size:clamp(30px,2.4vw,46px)}.sh p{font-size:clamp(15px,1vw,18px)}
.mini h3,.pc h3,.bp h3,.svc h3{font-size:clamp(18px,1.25vw,23px)}
.mini p,.mini small,.pc p,.bp p,.svc p,.rev .who{font-size:clamp(14px,.95vw,17px)}
.mini .price,.pc .price{font-size:clamp(18px,1.3vw,24px)}
.btn-sm{font-size:clamp(13.5px,.9vw,16px)}
}
@media(min-width:1500px){.g3{grid-template-columns:repeat(3,minmax(0,1fr))}}
"""
s=open(f,encoding='utf8').read()
if M in s: print("sudah")
else:
    open(f,'w',encoding='utf8').write(s.replace('</head>','<style>'+CSS+'</style></head>',1)); print("diubah")
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
