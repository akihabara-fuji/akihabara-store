#!/usr/bin/env bash
# Gabungkan bagian Studio Konten (#studio) ke dalam Lab Studio (#produk) jadi satu kesatuan. Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-sosmed-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import re,sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
if '<!--nx-sosmed-->' in s: print("sudah digabung"); sys.exit(0)
m1=re.search(r'<section\b[^>]*\bid="produk"[^>]*>',s); m2=re.search(r'<section\b[^>]*\bid="studio"[^>]*>',s)
assert m1 and m2 and m1.start()<m2.start(), "bagian tidak ditemukan"
e1=s.index('</section>',m1.end()); assert '<section' not in s[m1.end():e1], "produk berisi section bersarang"
assert e1<m2.start(), "urutan bagian tak terduga"
e2=s.index('</section>',m2.end()); assert '<section' not in s[m2.end():e2], "studio berisi section bersarang"
inner=s[m2.end():e2]
merged=s[:e1]+'<!--nx-sosmed--><span id="studio"></span><div class="sosmed-sub" style="margin-top:56px">'+inner+'</div>'+s[e1:m2.start()]+s[e2+len('</section>'):]
open(f,'w',encoding='utf8').write(merged); print("digabung")
PY
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/#produk lalu Ctrl+F5. Rollback: cp $BK $F"
