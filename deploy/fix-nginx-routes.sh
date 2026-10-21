#!/usr/bin/env bash
# Nginx: arahkan /site-img/, /t.js, berkas kunci IndexNow, dan berkas verifikasi Google ke aplikasi (port 3200). Backup + nginx -t + rollback otomatis.
set -euo pipefail
F=$(grep -l 'manifest\\.webmanifest' /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null | head -1 || true)
[ -n "$F" ] || { echo "berkas nginx tidak ditemukan"; exit 1; }
BK=/root/nginx-backup-$(date +%Y%m%d-%H%M%S).conf
cp "$F" "$BK"
trap 'echo "GAGAL -> rollback"; cp "$BK" "$F"; nginx -t && systemctl reload nginx' ERR
python3 - "$F" <<'PY'
import sys
f = sys.argv[1]; s = open(f).read()
if "site-img" in s: print("rute sudah ada"); raise SystemExit(0)
old = r'manifest\.webmanifest)$"'
if old not in s: raise SystemExit("penanda rute tidak ditemukan")
new = r'manifest\.webmanifest)$|^/(site-img/|t\.js$|[a-f0-9]{32}\.txt$|google[a-z0-9]{8,40}\.html$)"'
open(f, "w").write(s.replace(old, new, 1)); print("rute ditambahkan di", f)
PY
nginx -t
systemctl reload nginx
sleep 1
c(){ curl -s -o /dev/null -w '%{http_code}' -H 'Host: nextaja.com' "$@"; }
A=$(c http://127.0.0.1/site-img/hero/mascot-hero.webp)
B=$(c http://127.0.0.1/t.js)
K=$(cat /var/www/mahyra-serv/data/indexnow.key 2>/dev/null || echo none)
C=$(c "http://127.0.0.1/$K.txt")
echo "site-img $A, t.js $B, kunci indexnow $C (semua 200)"
[ "$A" = 200 ] && [ "$B" = 200 ] && [ "$C" = 200 ]
trap - ERR
echo "SELESAI. Rollback: cp $BK $F && nginx -t && systemctl reload nginx"
