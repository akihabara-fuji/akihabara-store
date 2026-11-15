#!/usr/bin/env bash
# Tambah baris sosial ke footer catatanakademik.com lewat parafrase/navfix.js. Idempoten, dengan cadangan dan rollback.
set -uo pipefail
APP=/var/www/mahyra-serv
F=$APP/parafrase/navfix.js
BAK=/root/navfix.js.bak-$(date +%s)
ca-lock unlock >/dev/null 2>&1 || bash /root/ca-lock.sh unlock >/dev/null 2>&1
cp "$F" "$BAK"
python3 - "$F" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
if 'ft-soc' in s:
    print('SUDAH_ADA'); sys.exit(0)
anchor='  if (!harga) h = h.replace("</head>"'
assert s.count(anchor)==1, 'anchor tidak unik'
add=('  if (!/ft-soc/.test(h)) h = h.replace(/(<small class="ft-dis">[^<]*<\\/small>)/, '
     "'$1<small class=\"ft-soc\">Ikuti: <a href=\"https://www.instagram.com/catatanakademikut/\" target=\"_blank\" rel=\"noopener\">Instagram</a> &middot; <a href=\"https://www.tiktok.com/@akihabara.fuzi\" target=\"_blank\" rel=\"noopener\">TikTok</a></small>');\n")
open(p,'w',encoding='utf-8').write(s.replace(anchor,add+anchor))
print('DIUBAH')
PY
if node --check "$F" && pm2 restart nextaja >/dev/null; then echo "RESTART_OK"; else cp "$BAK" "$F"; pm2 restart nextaja >/dev/null; echo "GAGAL_RESTORE"; fi
ca-lock lock >/dev/null 2>&1 || bash /root/ca-lock.sh lock >/dev/null 2>&1
lsattr "$F"
