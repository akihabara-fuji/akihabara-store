#!/usr/bin/env bash
# Gambar situs bisa diganti dari admin + blog siap indeks Google (JSON-LD, sitemap, IndexNow, RSS, verifikasi Search Console). Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-images-seo.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/imgseo-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase server.js blog-akun.js admin public/index.html
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="siteimg.js index.js settings.js"
PG="admin.html admin.js"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
curl -fsSL "$RAW/deploy/patch-landing-images.py" -o "$T/p.py"
for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
cp "$T/blog-akun.js" "$APP/blog-akun.js"
python3 "$T/p.py" "$APP/public/index.html" "$APP/server.js"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
L=$(c http://127.0.0.1:3200/)
H=$(c http://127.0.0.1:3200/site-img/hero/mascot-hero.webp)
P=$(c http://127.0.0.1:3200/site-img/portal/blog-berita.webp)
B=$(c http://127.0.0.1:3200/blog)
F=$(c http://127.0.0.1:3200/blog/feed.xml)
S=$(curl -s http://127.0.0.1:3200/sitemap.xml | grep -c ruangakademikut || true)
A=$(c http://127.0.0.1:3200/admin/)
echo "landing $L, maskot $H, banner $P, blog $B, feed $F, sitemap Ruang Akademik $S baris, admin $A (semua 200, sitemap >=1)"
for x in $L $H $P $B $F $A; do [ "$x" = 200 ]; done
[ "$S" -ge 1 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/admin, tab Ruang Akademik, Gambar situs."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
