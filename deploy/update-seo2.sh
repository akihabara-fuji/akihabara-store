#!/bin/bash
# Deskripsi halaman <=160 dan judul blog <=65 (tanpa merek bila kepanjangan). Rollback otomatis.
set -u
C="${1:?commit}"; D=/var/www/mahyra-serv; B=/root/seo2-bak-$(date +%Y%m%d-%H%M%S)
FILES="blog-akun.js parafrase/pages/alat-cv.html parafrase/pages/alat-kalender.html parafrase/pages/alat-sampul.html parafrase/pages/audit.html parafrase/pages/bedah.html parafrase/pages/beranda.html parafrase/pages/cek.html parafrase/pages/panduan-maba.html parafrase/pages/sitasi.html parafrase/pages/tentang.html"
mkdir -p "$B"; IMMF=""
for f in $FILES; do mkdir -p "$B/$(dirname $f)"; cp -a "$D/$f" "$B/$f" || exit 1; lsattr "$D/$f" | cut -c5 | grep -q i && IMMF="$IMMF $f"; done
relock(){ for f in $IMMF; do chattr +i "$D/$f" 2>/dev/null || true; done; }
rb(){ echo "GAGAL: $1, rollback"; for f in $FILES; do chattr -i "$D/$f" 2>/dev/null || true; cp -a "$B/$f" "$D/$f"; done; pm2 restart nextaja >/dev/null 2>&1; relock; exit 1; }
mkdir -p /tmp/seo2n; for f in $FILES; do mkdir -p /tmp/seo2n/$(dirname $f); curl -fsSL "https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/$f" -o /tmp/seo2n/$f || rb "unduh $f"; done
cp /tmp/seo2n/blog-akun.js /tmp/seo2n/chk.js; node --check /tmp/seo2n/chk.js || rb sintaks
cd "$D"; for f in $FILES; do chattr -i "$f" 2>/dev/null || true; cp /tmp/seo2n/$f "$f" || rb "salin $f"; done
pm2 restart nextaja >/dev/null 2>&1; sleep 6
H="--resolve catatanakademik.com:443:127.0.0.1"
for u in / /sampul-tugas /kalender-akademik /sitasi-apa /panduan-maba /cek-parafrase-mandiri /bedah-laporan /blog/formulir-resmi-ut-untuk-mahasiswa-baru /blog/cara-cek-jadwal-uas-ut; do
  P=$(curl -s $H https://catatanakademik.com$u); S=$(curl -s -o /dev/null -w '%{http_code}' $H https://catatanakademik.com$u)
  T=$(echo "$P" | grep -o '<title>[^<]*' | head -1 | cut -c8- | wc -c); D2=$(echo "$P" | grep -o '<meta name="description" content="[^"]*' | head -1 | cut -c35- | wc -c); A=$(echo "$P" | grep -c adsbygoogle.js)
  echo "$u $S title=$((T-1)) desc=$((D2-1)) ads=$A"; [ "$S" = 200 ] && [ "$A" -ge 1 ] || rb "cek $u"
done
[ -n "$(curl -s $H https://catatanakademik.com/ads.txt | head -c 20)" ] || rb adstxt
relock; echo "OK, seo2 live. Backup: $B"
