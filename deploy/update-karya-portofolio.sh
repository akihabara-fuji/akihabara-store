#!/usr/bin/env bash
# Tambah karya Website Portofolio dan Panel Admin (11 karya) + sebut pembuatan portofolio di layanan.
# Jalankan sebagai root di VPS: bash update-karya-portofolio.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
G="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C"
W=/var/www/dikapriyadi; D=/var/lib/dp-kasus
BASE_IDX=66fb46b7001bd479; TS=$(date +%s); B=/root/karya-portofolio.$TS; N=/tmp/dp-kp.$$
mkdir -p "$B" "$N"
FILES="$W/index.html $W/cases.json $W/konten.json $D/state.json $D/konten-state.json"
for f in $FILES; do [ -f "$f" ] && cp -a --parents "$f" "$B" || true; done
fail(){ echo "GAGAL di baris $1, mengembalikan"; for f in $FILES; do [ -f "$B$f" ] && cp -a "$B$f" "$f"; done; exit 1; }
trap 'fail $LINENO' ERR
set -e
LIVE=$(sha256sum "$W/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_IDX" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
curl -fsSL "$G/portofolio-kasus/index.html" -o "$N/index.html"
curl -fsSL "$G/deploy/add-karya-portofolio.js" -o "$N/add.js"
curl -fsSL "$G/portofolio/assets/k-portofolio.webp" -o "$W/assets/k-portofolio.webp"; chown www-data:www-data "$W/assets/k-portofolio.webp"; chmod 644 "$W/assets/k-portofolio.webp"
grep -q "portofolio:'Website'" "$N/index.html"; grep -q 'class="hgrid"' "$N/index.html"; ! grep -q 'dp-bg' "$N/index.html"
node "$N/add.js"
chown www-data:www-data "$W/cases.json" "$D/state.json" 2>/dev/null || true
cp "$N/index.html" "$W/index.html.new"; chown www-data:www-data "$W/index.html.new"; chmod 644 "$W/index.html.new"; mv "$W/index.html.new" "$W/index.html"
curl -fsS https://dikapriyadi.site/cases.json -o "$N/c.json"
python3 -c "import json;d=json.load(open('$N/c.json'));assert len(d['karya'])==11 and d['karya'][8]['id']=='portofolio';print('karya live:',len(d['karya']))"
[ "$(curl -s -o /dev/null -w '%{http_code}' https://dikapriyadi.site/assets/k-portofolio.webp)" = 200 ]
curl -fsS https://dikapriyadi.site/ -o "$N/v.html"; grep -q 'class="hgrid"' "$N/v.html"
systemctl is-active dp-kasus
echo "OK, commit $C live. Cadangan: $B"
echo "Rollback: cd $B && for f in index.html cases.json; do cp -a .$W/\$f $W/\$f; done; cp -a .$D/state.json $D/state.json"
