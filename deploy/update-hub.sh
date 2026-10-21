#!/usr/bin/env bash
# Pasang pesanan Layanan (Tugas, Diskusi, Metopen, Revisi) di Ruang Akademik UT. Backup, cek sintaks, restart nextaja, uji, rollback otomatis bila gagal.
# Tidak menyentuh kartu harga, pesanan, atau Paket Metopen.
set -euo pipefail
REF="${1:?pakai: update-hub.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
BK=/root/hub-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase server.js
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS=""
PG="hub.html layanan.html cek.html pesanan.html audit.html"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done

for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 4
H=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut)
A=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut/layanan)
J=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut/assets/layanan.js)
O=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3200/ms/layanan/order)
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ms/layanan/config)
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/blog)
echo "hub $H, layanan $A, layanan.js $J, pesan tanpa login $O (401), config $C, blog $B"
[ "$H" = 200 ]
[ "$A" = 200 ]
[ "$J" = 200 ]
[ "$O" = 401 ]
[ "$C" = 200 ]
[ "$B" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/ruangakademikut/layanan lalu Ctrl+F5. Admin: nextaja.com/admin/layanan"
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
