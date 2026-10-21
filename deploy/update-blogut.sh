#!/usr/bin/env bash
# Menu "Update UT baca disini" di samping Cek Pesanan di Ruang Akademik UT (halaman /ruangakademikut/blog-ut). Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-blogut.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/blogut-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase blog-akun.js public/index.html
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
PG="blog-ut.html blog-ut.js hub.html cek.html audit.html audit-hasil.html layanan.html pesanan.html"
curl -fsSL "$RAW/parafrase/pages.js" -o "$T/pages.js"; node --check "$T/pages.js"
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done
curl -fsSL "$RAW/deploy/patch-landing-prices.py" -o "$T/lp.py"
cp "$T/pages.js" "$D/pages.js"; cp "$T/blog-akun.js" "$APP/blog-akun.js"
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
python3 "$T/lp.py" "$APP/public/index.html"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
P=$(c http://127.0.0.1:3200/ruangakademikut/blog-ut)
J=$(c http://127.0.0.1:3200/ruangakademikut/assets/blog-ut.js)
H=$(c http://127.0.0.1:3200/ruangakademikut)
B=$(c "http://127.0.0.1:3200/ms/blog/latest?f=ut&limit=30")
S=$(curl -s http://127.0.0.1:3200/sitemap.xml | grep -c blog-ut || true)
echo "blog-ut $P, js $J, hub $H, api $B, sitemap $S (semua 200, sitemap >=1)"
for x in $P $J $H $B; do [ "$x" = 200 ]; done
[ "$S" -ge 1 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/ruangakademikut lalu Ctrl+F5, menu Update UT baca disini di samping Cek Pesanan."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
