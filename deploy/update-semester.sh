#!/usr/bin/env bash
# Harga Paket Semester (rentang) di hub + admin. Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-semester.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/semester-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
curl -fsSL "$RAW/parafrase/settings.js" -o "$T/settings.js"; node --check "$T/settings.js"
curl -fsSL "$RAW/parafrase/pages/admin.js" -o "$T/pages/admin.js"
curl -fsSL "$RAW/parafrase/pages/hub.html" -o "$T/pages/hub.html"
cp "$T/settings.js" "$D/settings.js"; cp "$T/pages/admin.js" "$D/pages/admin.js"; cp "$T/pages/hub.html" "$D/pages/hub.html"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c http://127.0.0.1:3200/ruangakademikut)
CF=$(curl -s http://127.0.0.1:3200/ms/public-config | grep -c price_semester_min || true)
echo "hub $H, config semester $CF (200 dan >=1)"
[ "$H" = 200 ]; [ "$CF" -ge 1 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/ruangakademikut, Ctrl+F5."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
