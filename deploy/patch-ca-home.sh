#!/usr/bin/env bash
# Tambah baris sosial ke footer beranda catatanakademik.com (public/index.html). Idempoten, cadangan, rollback.
set -uo pipefail
F=/var/www/mahyra-serv/public/index.html
BAK=/root/index.html.bak-$(date +%s)
ca-lock unlock >/dev/null 2>&1 || bash /root/ca-lock.sh unlock >/dev/null 2>&1
cp "$F" "$BAK"
python3 - "$F" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
if 'ft-soc' in s: print('SUDAH_ADA'); sys.exit(0)
a='Kami tidak menjamin nilai atau kelulusan tertentu.</div>'
assert s.count(a)==1,'anchor tidak unik'
add='Kami tidak menjamin nilai atau kelulusan tertentu.<br><span class="ft-soc">Ikuti: <a href="https://www.instagram.com/catatanakademikut/" target="_blank" rel="noopener">Instagram</a> &middot; <a href="https://www.tiktok.com/@akihabara.fuzi" target="_blank" rel="noopener">TikTok</a></span></div>'
open(p,'w',encoding='utf-8').write(s.replace(a,add)); print('DIUBAH')
PY
if grep -q 'ft-soc' "$F" && [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)" = 200 ]; then echo OK_200; else cp "$BAK" "$F"; echo GAGAL_RESTORE; fi
ca-lock lock >/dev/null 2>&1 || bash /root/ca-lock.sh lock >/dev/null 2>&1
lsattr "$F"
