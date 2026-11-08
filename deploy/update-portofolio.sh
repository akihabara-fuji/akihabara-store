#!/usr/bin/env bash
# Deploy portofolio dikapriyadi.catatanakademik.com. Jalankan sebagai root di VPS: bash update-portofolio.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
REPO=akihabara-fuji/akihabara-store
RAW="https://raw.githubusercontent.com/$REPO/$C/portofolio"
ROOT=/var/www/dikapriyadi
NEW=/tmp/porto-new-$$
BAK="$ROOT.prev-$(date +%s)"
fail(){ echo "GAGAL di baris $1, rollback"; [ -d "$BAK" ] && { rm -rf "$ROOT"; mv "$BAK" "$ROOT"; }; exit 1; }
trap 'fail $LINENO' ERR
set -e
mkdir -p "$NEW/assets"
for f in index.html style.css script.js assets/m1.webp; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
grep -q 'Dari ide' "$NEW/index.html"
[ "$(stat -c %s "$NEW/assets/m1.webp")" -gt 10000 ]
cp -a "$ROOT" "$BAK"
rm -f "$ROOT"/index.html "$ROOT"/style.css "$ROOT"/script.js
cp "$NEW"/index.html "$NEW"/style.css "$NEW"/script.js "$ROOT"/
mkdir -p "$ROOT/assets" && cp "$NEW/assets/m1.webp" "$ROOT/assets/"
chown -R www-data:www-data "$ROOT"; chmod -R a+rX "$ROOT"
for p in / /style.css /script.js /assets/m1.webp; do
  s=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: dikapriyadi.catatanakademik.com' "http://127.0.0.1$p"); echo "$p $s"
  [ "$s" = 200 ] || [ "$s" = 301 ] || fail $LINENO
done
echo "OK, commit $C live. Cadangan: $BAK"
