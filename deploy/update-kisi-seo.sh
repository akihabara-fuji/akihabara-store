#!/bin/bash
# Ganti parafrase/kisi-pages.js (JSON-LD + judul kisi-kisi) dari commit tertentu. Rollback otomatis bila gagal.
set -u
C="${1:?commit}"; D=/var/www/mahyra-serv; F=parafrase/kisi-pages.js; B=/root/kisi-seo-bak-$(date +%Y%m%d-%H%M%S)
mkdir -p "$B" && cp "$D/$F" "$B/" || exit 1
rb(){ echo "GAGAL: $1, rollback"; cp "$B/kisi-pages.js" "$D/$F"; pm2 restart nextaja >/dev/null 2>&1; exit 1; }
curl -fsSL "https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/$F" -o /tmp/kisi-pages.new || rb unduh
node --check /tmp/kisi-pages.new || rb sintaks
cp /tmp/kisi-pages.new "$D/$F"; pm2 restart nextaja >/dev/null 2>&1; sleep 6
H="--resolve catatanakademik.com:443:127.0.0.1"
for u in kisi-kisi/fsap4203-sistem-administrasi-negara-kesatuan-republik-indonesia kisi-kisi/ekma4111-pengantar-bisnis; do
  P=$(curl -s $H https://catatanakademik.com/$u); S=$(curl -s -o /dev/null -w '%{http_code}' $H https://catatanakademik.com/$u)
  L=$(echo "$P" | grep -c 'application/ld+json'); A=$(echo "$P" | grep -c adsbygoogle.js)
  echo "$u $S ld=$L ads=$A"; [ "$S" = 200 ] && [ "$L" -ge 1 ] && [ "$A" -ge 1 ] || rb "cek $u"
done
[ "$(curl -s $H https://catatanakademik.com/ads.txt | head -c 20)" ] || rb adstxt
for u in / /kisi-kisi /blog; do [ "$(curl -s -o /dev/null -w '%{http_code}' $H https://catatanakademik.com$u)" = 200 ] || rb "status $u"; done
echo "OK, kisi SEO live. Backup: $B"
