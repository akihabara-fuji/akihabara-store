#!/usr/bin/env bash
# Perbarui HANYA index.html portofolio (galeri Karya muat satu layar). Cek sha live dulu, cadangan, rollback otomatis.
# Jalankan sebagai root di VPS: bash update-portofolio-index-fix.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"; RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi; BASE_SHA=af5756aba285b9dd; TS=$(date +%s); PRE=/root/dikapriyadi.pre-karyafit.$TS; NEW=/tmp/dp-idx.$$
fail(){ echo "GAGAL di baris $1, mengembalikan"; [ -f "$PRE" ] && cp -a "$PRE" "$ROOT/index.html"; exit 1; }
trap 'fail $LINENO' ERR
set -e
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
curl -fsSL "$RAW/index.html" -o "$NEW"; grep -q '#karya .showcase-copy{max-width:980px}' "$NEW"; grep -q 'skb2' "$NEW"; grep -q 'nd-go' "$NEW"; grep -q 'window.__KON' "$NEW"
cp -a "$ROOT/index.html" "$PRE"
cp "$NEW" "$ROOT/index.html.new"; chown www-data:www-data "$ROOT/index.html.new"; chmod 644 "$ROOT/index.html.new"; mv "$ROOT/index.html.new" "$ROOT/index.html"
V=/tmp/dp-idxv.$$; curl -fsS https://dikapriyadi.site/ -o "$V"; grep -q '#karya .showcase-copy{max-width:980px}' "$V"; rm -f "$V" "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"; echo "Rollback: cp -a $PRE $ROOT/index.html"
