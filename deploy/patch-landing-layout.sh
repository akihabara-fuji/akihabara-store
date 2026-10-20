#!/usr/bin/env bash
# Landing: logo rata kiri sejajar banner, menu rata kanan, footer seragam. Backup + rollback otomatis. Aman dijalankan ulang.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
G=/root/nxl/nx-landing/hero.css
[ -f "$F" ] || { echo "index.html tidak ada"; exit 1; }
BK=/root/landing-backup-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" "$G" <<'PY'
import re,sys
f,g=sys.argv[1],sys.argv[2]
M="/*nx-layout-v1*/"
CSS=M+""".nav .wrap{max-width:none!important;justify-content:flex-start!important;padding-left:clamp(12px,1.2vw,20px)!important;padding-right:clamp(12px,1.2vw,20px)!important}
.nav .links{margin-left:auto!important;margin-right:22px!important}
@media(max-width:980px){.nav .links{margin:0!important}}
.ft{margin-top:80px;border-top:1px solid var(--border,#2b2b58);padding:40px 0 32px;color:var(--muted,#b9b3dd);font-size:13.5px}
.ft .ft-in{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:24px;padding:0 clamp(12px,1.2vw,20px)}
.ft-b{display:grid;gap:4px;max-width:420px}.ft-b b{color:var(--text,#f3f0ff);font-size:16px}.ft-b small{font-size:12.5px}
.ft-n{display:flex;flex-wrap:wrap;gap:12px 22px}.ft-n a{color:var(--muted,#b9b3dd);text-decoration:none}.ft-n a:hover{color:var(--text,#f3f0ff)}
"""
FT='<footer class="ft"><div class="ft-in"><div class="ft-b"><b id="brand2">nextaja</b><span>Jakarta Barat. Ruang Akademik UT, Lab Studio, Analisa, dan Blog.</span><small>© <span id="yr"></span> nextaja. Semua hak dilindungi.</small><div id="footSocial" class="ft-s"></div></div><nav class="ft-n" aria-label="Footer"><a href="/ruangakademikut">Ruang Akademik UT</a><a href="/#produk">Lab Studio</a><a href="/#analisa">Analisa</a><a href="/blog">Blog</a><a href="/ms/masuk">Masuk</a><a href="/ms/privasi">Privasi</a><a href="/ms/ketentuan">Ketentuan</a></nav></div></footer>'
s=open(f,encoding='utf8').read()
if M not in s:
    s=s.replace('</head>','<style>'+CSS+'</style></head>',1)
    n=len(re.findall(r'<footer\b',s))
    if n==1 and 'class="ft"' not in s:
        s=re.sub(r'<footer\b.*?</footer>',lambda m:FT,s,count=1,flags=re.S); print("footer diganti")
    else: print("footer dilewati (jumlah footer:",n,")")
    open(f,'w',encoding='utf8').write(s)
try:
    h=open(g,encoding='utf8').read()
    if M not in h: open(g,'a',encoding='utf8').write("\n"+CSS)
except FileNotFoundError: pass
PY
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
