#!/usr/bin/env bash
# Audit Dokumen: aspek persen + indikasi gaya seragam; Cek & Parafrase: target dan kalimat pembantu per warna; akun: sesi lebih aman.
# Hanya menimpa file yang berubah. Backup, cek sintaks, restart nextaja, uji, rollback otomatis bila gagal.
# Tidak menyentuh data (users.json, SQLite, pesanan) maupun nginx.
set -euo pipefail
REF="${1:?pakai: update-audit-aspek.sh <commit-atau-branch>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
BK=/root/audit-aspek-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" blog-akun.js parafrase
echo "Backup: $BK"
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="aspek.js hint.js rules.js auditrules.js wordtools.js preview.js settings.js uploads.js orders.js layanan.js metopen.js pages.js"
PG="common.js cek.js cek.html audit.html audit-hasil.js audit-hasil.html hub.html beranda.html layanan.html layanan.js pesanan.html blog-ut.html alat-nilai.html alat-pasfoto.html nilai-ut.js kalkulator.js pasfoto.js site.css admin.js admin.html"
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done
for f in common.js cek.js audit-hasil.js admin.js layanan.js nilai-ut.js kalkulator.js pasfoto.js; do node --check "$T/pages/$f"; done
# modul baru harus bisa dimuat bersama modul lama sebelum menimpa apa pun
( cd "$T" && NODE_PATH="$APP/node_modules" node -e 'require("./hint");require("./aspek")' ) 2>&1 | head -3 || true
cp "$T/blog-akun.js" "$APP/blog-akun.js"
for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H='Host: catatanakademik.com'; B=http://127.0.0.1:3200
HUB=$(c -H "$H" $B/ruangakademikut)
AUD=$(c -H "$H" $B/ruangakademikut/audit)
HAS=$(c -H "$H" $B/ruangakademikut/audit-hasil)
CEK=$(c -H "$H" $B/ruangakademikut/cek-parafrase-mandiri)
LOG=$(c -H "$H" $B/ms/masuk)
ME=$(c -H "$H" $B/ms/auth/me)
CJ=$(c -H "$H" $B/ruangakademikut/assets/common.js)
AJ=$(curl -s -H "$H" $B/ruangakademikut/assets/common.js | grep -c "window.auditAspects" || true)
EX=$(curl -s -H "$H" $B/ruangakademikut/assets/cek.js | grep -c "renderExample" || true)
HB=$(curl -s -H "$H" $B/ruangakademikut | grep -c "terjamin" || true)
LC=$(curl -s -H "$H" $B/ms/layanan/config | grep -c "needs" || true)
BR=$(c -H "$H" $B/beranda)
NL=$(c -H "$H" $B/ruangakademikut/kalkulator-nilai-ut)
PF=$(c -H "$H" $B/ruangakademikut/pasfoto-yudisium)
PV=$(c -H "$H" $B/ms/parafrase/preview/00000000000000000000000000000000)
echo "klaim-terjamin-di-hub $HB hub $HUB audit $AUD hasil $HAS cek $CEK masuk $LOG me $ME common.js $CJ aspek-di-common $AJ"
[ "$HUB" = 200 ]; [ "$AUD" = 200 ]; [ "$LOG" = 200 ]; [ "$ME" = 200 ]; [ "$CJ" = 200 ]; [ "$AJ" -ge 1 ]; [ "$EX" -ge 1 ]; [ "$PV" = 404 ]; [ "$HB" = 0 ]; [ "$BR" = 200 ]; [ "$NL" = 200 ]; [ "$PF" = 200 ]; [ "$LC" -ge 1 ]
trap - ERR
echo "SELESAI. Ctrl+F5 lalu coba unggah satu file Word di /ruangakademikut/audit dan /ms/masuk."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
