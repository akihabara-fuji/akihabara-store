#!/usr/bin/env bash
# Perbarui modul Cek & Parafrase di server (halaman + gambar kartu). Backup, cek sintaks, restart nextaja, uji, rollback otomatis bila gagal.
set -euo pipefail
REF="${1:?pakai: update-module.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF/parafrase
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
BK=/root/parafrase-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$D" .
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$D"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="index.js cards.js"
PG="site.css hub.css common.js cek.js admin.js hub.html cek.html pesanan.html admin.html"
for f in $JS; do curl -fsSL "$RAW/$f" -o "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/pages/$f" -o "$T/pages/$f"; done
for f in $JS; do cp "$T/$f" "$T/chk-$f"; node --check "$T/$f"; done
for f in common.js cek.js admin.js; do node --check "$T/pages/$f"; done
for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 4
H=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut)
I=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut/img/tugas.webp)
echo "hub HTTP $H (harus 200), gambar kartu HTTP $I (200 bila sudah ada gambar, 404 bila belum)"
[ "$H" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/ruangakademikut lalu Ctrl+F5. Gambar kartu diatur di /admin/parafrase > Gambar kartu."
echo "Rollback: tar xzf $BK -C $D && pm2 restart nextaja"
