#!/bin/bash
# Deskripsi halaman <=160 dan judul blog <=65 (tanpa merek bila kepanjangan). Rollback otomatis.
set -u
C="${1:?commit}"; D=/var/www/mahyra-serv; B=/root/seo3-bak-$(date +%Y%m%d-%H%M%S)
FILES="parafrase/kisi-pages.js parafrase/pages/bedah.html parafrase/pages/cek.html parafrase/pages/alat-sampul.html parafrase/pages/alat-tracker.html parafrase/pages/alat-kalender.html parafrase/pages/panduan-maba.html"
mkdir -p "$B"; IMMF=""
for f in $FILES; do mkdir -p "$B/$(dirname $f)"; cp -a "$D/$f" "$B/$f" || exit 1; lsattr "$D/$f" | cut -c5 | grep -q i && IMMF="$IMMF $f"; done
relock(){ for f in $IMMF; do chattr +i "$D/$f" 2>/dev/null || true; done; }
rb(){ echo "GAGAL: $1, rollback"; for f in $FILES; do chattr -i "$D/$f" 2>/dev/null || true; cp -a "$B/$f" "$D/$f"; done; pm2 restart nextaja >/dev/null 2>&1; relock; exit 1; }
mkdir -p /tmp/seo3n; for f in $FILES; do mkdir -p /tmp/seo3n/$(dirname $f); curl -fsSL "https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/$f" -o /tmp/seo3n/$f || rb "unduh $f"; done
cp /tmp/seo3n/parafrase/kisi-pages.js /tmp/seo3n/chk.js; node --check /tmp/seo3n/chk.js || rb sintaks
cd "$D"; for f in $FILES; do chattr -i "$f" 2>/dev/null || true; cp /tmp/seo3n/$f "$f" || rb "salin $f"; done
pm2 restart nextaja >/dev/null 2>&1; sleep 6
H="--resolve catatanakademik.com:443:127.0.0.1"
for u in / /sampul-tugas /bedah-laporan /cek-parafrase-mandiri /panduan-maba /kisi-kisi/spgk4305-desain-kurikulum-pendidikan-sekolah-dasar-untuk-pembangunan-berkelanjutan; do
  P=$(curl -s $H https://catatanakademik.com$u); S=$(curl -s -o /dev/null -w '%{http_code}' $H https://catatanakademik.com$u)
  T=$(echo "$P" | grep -o '<title>[^<]*' | head -1 | cut -c8- | wc -c); D2=$(echo "$P" | grep -o '<meta name="description" content="[^"]*' | head -1 | cut -c35- | wc -c); A=$(echo "$P" | grep -c adsbygoogle.js)
  echo "$u $S title=$((T-1)) desc=$((D2-1)) ads=$A"; [ "$S" = 200 ] && [ "$A" -ge 1 ] || rb "cek $u"
done
[ -n "$(curl -s $H https://catatanakademik.com/ads.txt | head -c 20)" ] || rb adstxt
relock; echo "OK, seo3 live. Backup: $B"
