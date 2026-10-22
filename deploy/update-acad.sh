#!/usr/bin/env bash
# Tautan situs akademik dan blog bisa mengikuti ACAD_URL (domain baru). Aman: tanpa ACAD_URL perilaku tidak berubah. Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-acad.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/acad-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" server.js parafrase
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d)
for f in pages.js notify.js; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
curl -fsSL "$RAW/deploy/patch-acad.py" -o "$T/patch.py"
cp "$APP/server.js" "$T/server.js"
python3 "$T/patch.py" "$T/server.js"
node --check "$T/server.js"
cp "$T/pages.js" "$D/pages.js"; cp "$T/notify.js" "$D/notify.js"; cp "$T/server.js" "$APP/server.js"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c http://127.0.0.1:3200/ruangakademikut)
L=$(c http://127.0.0.1:3200/)
B=$(c http://127.0.0.1:3200/blog)
S=$(c http://127.0.0.1:3200/sitemap.xml)
echo "hub $H, landing $L, blog $B, sitemap $S (semua 200)"
for x in $H $L $B $S; do [ "$x" = 200 ]; done
trap - ERR
echo "SELESAI. Perilaku belum berubah sampai ACAD_URL diatur."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
