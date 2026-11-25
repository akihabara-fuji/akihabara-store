#!/usr/bin/env bash
# Hero split, latar seragam, reveal kalimat, penutup bawah, tab Tangga status, shell Ruang Admin.
# Jalankan sebagai root di VPS: bash update-tampilan-final.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
G="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C"
W=/var/www/dikapriyadi; APP=/opt/dp-kasus
BASE_IDX=c1e612f16cf0f61a; TS=$(date +%s); B=/root/tampilan-final.$TS; N=/tmp/dp-tf.$$
mkdir -p "$B" "$N"
FILES="$W/index.html $W/sistem-kerja/index.html $APP/depan.html $APP/kasus.html"
for f in $FILES; do [ -f "$f" ] && cp -a --parents "$f" "$B" || true; done
fail(){ echo "GAGAL di baris $1, mengembalikan"; for f in $FILES; do [ -f "$B$f" ] && cp -a "$B$f" "$f"; done; exit 1; }
trap 'fail $LINENO' ERR
set -e
LIVE=$(sha256sum "$W/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_IDX" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
curl -fsSL "$G/portofolio-kasus/index.html" -o "$N/index.html"
curl -fsSL "$G/portofolio-kasus/sistem-kerja/index.html" -o "$N/sk.html"
curl -fsSL "$G/portofolio-kasus/depan.html" -o "$N/depan.html"
curl -fsSL "$G/portofolio-kasus/kasus.html" -o "$N/kasus.html"
grep -q 'class="hgrid"' "$N/index.html"; grep -q 'id="penutup"' "$N/index.html"; grep -q 'window.__KON' "$N/index.html"; ! grep -q 'dp-bg' "$N/index.html"
grep -q "C.tangga=" "$N/sk.html"; grep -q 'class="sb"' "$N/depan.html"; grep -q 'class="sb"' "$N/kasus.html"
for a in v-remotion-ep001.mp4 v-remotion-ep001.webp; do
  if [ ! -s "$W/assets/$a" ]; then curl -fsSL "$G/portofolio/assets/$a" -o "$W/assets/$a"; chown www-data:www-data "$W/assets/$a"; chmod 644 "$W/assets/$a"; echo "aset dipasang: $a"; fi
done
inst(){ cp "$1" "$2.new"; chown "$3" "$2.new"; chmod 644 "$2.new"; mv "$2.new" "$2"; }
inst "$N/index.html" "$W/index.html" www-data:www-data
inst "$N/sk.html" "$W/sistem-kerja/index.html" www-data:www-data
inst "$N/depan.html" "$APP/depan.html" root:root
inst "$N/kasus.html" "$APP/kasus.html" root:root
V=/tmp/dp-v.$$
curl -fsS https://dikapriyadi.site/ -o "$V"; grep -q 'class="hgrid"' "$V"; grep -q 'id="penutup"' "$V"; ! grep -q 'dp-bg' "$V"
curl -fsS https://dikapriyadi.site/sistem-kerja/ | grep -q "C.tangga="
curl -fsS https://dikapriyadi.site/admin/kasus/depan | grep -q 'class="sb"'
curl -fsS https://dikapriyadi.site/admin/kasus | grep -q 'class="sb"'
for a in v-remotion-ep001.mp4 v-remotion-ep001.webp; do [ "$(curl -s -o /dev/null -w '%{http_code}' https://dikapriyadi.site/assets/$a)" = 200 ]; done
curl -fsS https://dikapriyadi.site/cases.json | python3 -c "import sys,json;d=json.load(sys.stdin);assert len(d['karya'])==10;print('karya live:',len(d['karya']))"
systemctl is-active dp-kasus
echo "OK, commit $C live. Cadangan: $B"
echo "Rollback: cd $B && cp -a .$W/index.html $W/index.html && cp -a .$W/sistem-kerja/index.html $W/sistem-kerja/index.html && cp -a .$APP/depan.html $APP/depan.html && cp -a .$APP/kasus.html $APP/kasus.html"
