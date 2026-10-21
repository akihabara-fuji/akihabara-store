#!/usr/bin/env bash
# Pasang GA4 (ID diatur dari admin) di landing, blog, dan halaman Ruang Akademik UT. Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-tracking.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/track-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase blog-akun.js public/index.html
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="index.js settings.js pages.js"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
curl -fsSL "$RAW/parafrase/pages/admin.js" -o "$T/pages/admin.js"
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
curl -fsSL "$RAW/deploy/patch-landing-track.py" -o "$T/lt.py"
for f in $JS; do cp "$T/$f" "$D/$f"; done
cp "$T/pages/admin.js" "$D/pages/admin.js"; cp "$T/blog-akun.js" "$APP/blog-akun.js"
python3 "$T/lt.py" "$APP/public/index.html"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
J=$(c http://127.0.0.1:3200/t.js)
L=$(curl -s http://127.0.0.1:3200/ | grep -c '/t.js' || true)
H=$(curl -s http://127.0.0.1:3200/ruangakademikut | grep -c '/t.js' || true)
B=$(curl -s http://127.0.0.1:3200/blog | grep -c '/t.js' || true)
G=$(curl -s http://127.0.0.1:3200/t.js | grep -c 'G-LM2GBRG1YX' || true)
P=$(curl -s http://127.0.0.1:3200/ruangakademikut/pesanan | grep -c '/t.js' || true)
echo "t.js $J, landing $L, hub $H, blog $B, ID GA4 di t.js $G, pesanan $P (harus 0)"
[ "$J" = 200 ]; [ "$L" -ge 1 ]; [ "$H" -ge 1 ]; [ "$B" -ge 1 ]; [ "$G" -ge 1 ]; [ "$P" = 0 ]
trap - ERR
echo "SELESAI. Cek GA4 > Laporan > Waktu nyata sambil buka nextaja.com."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
