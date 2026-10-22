#!/usr/bin/env bash
# Domain akademik: ganti nama jadi Catatan Akademik, buang menu Lab Studio/Analisa/Harga, tampilkan hanya blog topik akademik/UT (tulisan lain disembunyikan, tidak dihapus).
# Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: update-akademik-only.sh <commit>}"
APP=/var/www/mahyra-serv
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/akademik-only-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase blog-akun.js
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
EXTRA="pages/pesanan.js pages/common.js pages/admin.js wordtools.js orders.js pages.js notify.js index.js ulasan.js"
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
PG="beranda blog-ut hub cek audit audit-hasil layanan pesanan admin"
for p in $PG; do curl -fsSL "$RAW/parafrase/pages/$p.html" -o "$T/pages/$p.html"; done
for e in $EXTRA; do curl -fsSL "$RAW/parafrase/$e" -o "$T/$e"; node --check "$T/$e"; done
mkdir -p "$T/ca"; for f in favicon.ico favicon-32.png apple-touch-icon.png icon-192.png icon-512.png logo-96.png manifest.webmanifest; do curl -fsSL "$RAW/parafrase/pages/ca/$f" -o "$T/ca/$f"; done
curl -fsSL "$RAW/public/assets/blog.css" -o "$T/blog.css"
cp "$T/blog-akun.js" "$APP/blog-akun.js"
[ -d "$APP/public/assets" ] && cp "$T/blog.css" "$APP/public/assets/blog.css" || echo "PERINGATAN: $APP/public/assets tidak ada, blog.css dilewati"
for e in $EXTRA; do cp "$T/$e" "$APP/parafrase/$e"; done
for p in $PG; do cp "$T/pages/$p.html" "$APP/parafrase/pages/$p.html"; done
mkdir -p "$APP/parafrase/pages/ca"; cp "$T"/ca/* "$APP/parafrase/pages/ca/"
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut)
B=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/blog)
LS=$(curl -s -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut | grep -c 'Lab Studio' || true)
[ -f "$APP/public/assets/hero/model-ut.jpg" ] || echo "PERINGATAN: model-ut.jpg tidak ada di $APP/public/assets/hero"
SM=$(curl -s -H 'Host: catatanakademik.com' http://127.0.0.1:3200/sitemap.xml | grep -c '<loc>' || true)
VR=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/blog/siswi-smk-yang-hilang-ditemukan-di-apartemen-pik-2-polisi-masih-dalami-kronologi)
NX=$(curl -s -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut | grep -ci 'nextaja' || true)
UL=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ms/ulasan)
FV=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut/assets/ca/favicon.ico)
echo "favicon: $FV (200)"; [ "$FV" = 200 ]
echo "ulasan API: $UL (200)"
[ "$UL" = 200 ]
echo "nextaja tersisa di hub: $NX | hub $H blog $B | Lab Studio di hub: $LS (0) | sitemap loc: $SM | artikel viral: $VR (404)"
[ "$H" = 200 ]; [ "$B" = 200 ]; [ "$LS" = 0 ]; [ "$VR" = 404 ]
trap - ERR
echo "SELESAI. Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
