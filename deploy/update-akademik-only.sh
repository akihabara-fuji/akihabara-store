#!/usr/bin/env bash
# Domain akademik: buang menu Lab Studio/Analisa/Harga, tampilkan hanya blog topik akademik/UT (tulisan lain disembunyikan, tidak dihapus).
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
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"; node --check "$T/blog-akun.js"
PG="blog-ut hub cek audit audit-hasil layanan pesanan"
for p in $PG; do curl -fsSL "$RAW/parafrase/pages/$p.html" -o "$T/pages/$p.html"; done
cp "$T/blog-akun.js" "$APP/blog-akun.js"
for p in $PG; do cp "$T/pages/$p.html" "$APP/parafrase/pages/$p.html"; done
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut)
B=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/blog)
LS=$(curl -s -H 'Host: catatanakademik.com' http://127.0.0.1:3200/ruangakademikut | grep -c 'Lab Studio' || true)
SM=$(curl -s -H 'Host: catatanakademik.com' http://127.0.0.1:3200/sitemap.xml | grep -c '<loc>' || true)
VR=$(c -H 'Host: catatanakademik.com' http://127.0.0.1:3200/blog/siswi-smk-yang-hilang-ditemukan-di-apartemen-pik-2-polisi-masih-dalami-kronologi)
echo "hub $H blog $B | Lab Studio di hub: $LS (0) | sitemap loc: $SM | artikel viral: $VR (404)"
[ "$H" = 200 ]; [ "$B" = 200 ]; [ "$LS" = 0 ]; [ "$VR" = 404 ]
trap - ERR
echo "SELESAI. Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
