#!/usr/bin/env bash
# Sembunyikan semua tautan Sahabat Nugas dari landing. Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-nugas-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
M='/*nx-nonugas*/'
if M in s: print("sudah"); sys.exit(0)
open(f,'w',encoding='utf8').write(s.replace('</head>','<style>'+M+'#nugasLink,a[href="/nugas"],a[href^="/nugas/"]{display:none!important}</style></head>',1)); print("disembunyikan")
PY
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Rollback: cp $BK $F"
