#!/usr/bin/env bash
# Landing: semua CTA mengarah ke fitur (bukan chat admin). Menu & kartu Lab Studio masuk ke halaman /ms/labstudio. Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-ls-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import re,sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
M='<!--nx-ls-v1-->'
if M in s: print("sudah dipatch"); sys.exit(0)
log=[]
# 1) judul + tombol bagian akademik
a=re.search(r'<section\b[^>]*\bid="akademik"[^>]*>.*?</section>',s,flags=re.S)
if a:
    blk=a.group(0); nb=blk
    nb=nb.replace('<h2 data-tx="t020">Kebutuhan anak UT, harganya jelas</h2>','<h2>Ruang Akademik UT, harganya jelas</h2>')
    # semua tombol chat admin/tanya admin di bagian ini -> ke fitur
    def rep(m):
        t=m.group(0)
        if 'data-wa=' not in t: return t
        cls=re.search(r'class="([^"]*)"',t); c=cls.group(1) if cls else 'btn btn-ghost btn-sm'
        big='btn-sm' not in c
        return '<a class="%s" href="/ruangakademikut">%s</a>'%(c,'Lihat semua layanan' if big else 'Lihat layanan')
    nb=re.sub(r'<a\b[^>]*data-wa=[^>]*>.*?</a>',rep,nb,flags=re.S)
    s=s.replace(blk,nb,1); log.append("akademik")
# 2) menu Lab Studio + CTA Studio Konten -> /ms/labstudio
s=s.replace('<a href="#produk" data-tx="t003"','<a href="/ms/labstudio" data-tx="t003"')
s=s.replace('href="/ms/studio" data-tx="t055">Coba Studio Konten','href="/ms/labstudio#studio" data-tx="t055">Coba Studio Konten')
# 3) klik kartu produk -> halaman Lab Studio
JS='<script>document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("#products .pc");if(t){e.preventDefault();e.stopPropagation();location.href="/ms/labstudio#produk"}},true);document.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("#products .pc .pt")){e.preventDefault();e.stopPropagation();location.href="/ms/labstudio#produk"}},true);</script>'
s=s.replace('</body>',M+JS+'</body>',1)
open(f,'w',encoding='utf8').write(s); print("dipatch:",log)
PY
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
L=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ms/labstudio)
echo "landing HTTP $C, labstudio HTTP $L (harus 200 semua)"
[ "$C" = 200 ]
[ "$L" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
