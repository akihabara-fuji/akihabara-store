#!/usr/bin/env bash
# Satukan admin Ruang Akademik UT ke admin utama (tab "Ruang Akademik") dan perbaiki unggah QRIS + gambar kartu. Backup, uji, rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-admin.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
BK=/root/admin-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase server.js admin public/index.html
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="cards.js pages.js settings.js layanan.js orders.js audit.js index.js"
PG="admin.html admin.js common.js hub.html audit.html layanan-admin.html layanan-admin.js"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done
curl -fsSL "$RAW/deploy/patch-admin-tab.py" -o "$T/patch.py"
for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
python3 "$T/patch.py" "$APP/admin/index.html"
curl -fsSL "$RAW/deploy/patch-landing-prices.py" -o "$T/lp.py"
python3 "$T/lp.py" "$APP/public/index.html"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 4
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c http://127.0.0.1:3200/ruangakademikut)
AD=$(c http://127.0.0.1:3200/admin/)
AP=$(c "http://127.0.0.1:3200/admin/parafrase?embed=1")
AL=$(c "http://127.0.0.1:3200/admin/layanan?embed=1")
CI=$(c http://127.0.0.1:3200/ruangakademikut/img/tugas.webp)
B=$(c http://127.0.0.1:3200/blog)
echo "hub $H, admin $AD, admin akademik $AP, admin layanan $AL, gambar kartu bawaan $CI (404 boleh), blog $B (semua harus 200)"
for x in $H $AD $AP $AL $B; do [ "$x" = 200 ]; done
trap - ERR
echo "SELESAI. Buka nextaja.com/admin lalu Ctrl+F5, tab Ruang Akademik."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
