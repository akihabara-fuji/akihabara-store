#!/usr/bin/env bash
# Hero landing: banner pas satu layar desktop, tulisan lebih besar. Hanya CSS (layar >= 981px). Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
G=/root/nxl/nx-landing/hero.css
BK=/root/landing-backup-hero-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" "$G" <<'PY'
import sys
f,g=sys.argv[1],sys.argv[2]
M='/*nx-hero-v1*/'
CSS=M+"""@media(min-width:981px){
.hero.hx{min-height:calc(100svh - 108px);display:flex;align-items:stretch}
.nx-hc{display:flex;flex-direction:column;justify-content:center;padding-top:clamp(28px,5vh,64px);padding-bottom:clamp(120px,15vh,160px)}
#heroSec h1{font-size:clamp(46px,3.7vw,72px);line-height:1.05}
.nx-eb{font-size:clamp(14px,.95vw,16px)}
.nx-lead{font-size:clamp(18px,1.3vw,23px);max-width:640px;line-height:1.55}
.nx-door{min-height:128px;padding:20px 22px}.nx-door small{font-size:clamp(14px,.95vw,16px)}.nx-door .nx-t{font-size:clamp(17px,1.2vw,21px)}
.nx-help{font-size:clamp(14.5px,1vw,16px)}
.nx-chip{width:96px;font-size:clamp(13.5px,.9vw,15px);padding:14px 6px}
.nx-fc b{font-size:clamp(15px,1vw,17px)}.nx-fc small{font-size:clamp(13px,.85vw,14.5px)}.nx-fc{padding:12px 16px}
.nx-strip{height:88px}.hero.hx .nx-bg{height:calc(100% - 88px)}
.nx-strip span{font-size:clamp(14px,.95vw,16px)}.nx-strip small{font-size:clamp(12.5px,.85vw,14px)}.nx-strip .nx-rt{font-size:clamp(13px,.9vw,15px)}
}
"""
s=open(f,encoding='utf8').read()
if M not in s:
    assert '</head>' in s
    open(f,'w',encoding='utf8').write(s.replace('</head>','<style>'+CSS+'</style></head>',1)); print("dipatch")
else: print("sudah")
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
