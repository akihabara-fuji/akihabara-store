#!/usr/bin/env bash
# Perbarui tampilan halaman Ruang Akademik UT (tema ikut nextaja.com + semua layanan). Backup dulu; tanpa restart.
set -euo pipefail
REF="${1:?pakai: update-pages.sh <commit>}"
D=/var/www/mahyra-serv/parafrase/pages
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF/parafrase/pages
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
tar czf /root/pages-backup-$(date +%Y%m%d-%H%M%S).tgz -C "$D" .
T=$(mktemp -d)
for f in site.css hub.css common.js hub.html cek.html pesanan.html admin.html; do curl -fsSL "$RAW/$f" -o "$T/$f"; done
node --check "$T/common.js"
for f in site.css hub.css common.js hub.html cek.html pesanan.html admin.html; do cp "$T/$f" "$D/$f"; done
rm -rf "$T"
echo "SELESAI. Buka nextaja.com/ruangakademikut lalu Ctrl+F5. Rollback: tar xzf /root/pages-backup-*.tgz -C $D"
