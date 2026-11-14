#!/usr/bin/env bash
# Deploy heyaipeople.site. Jalankan sebagai root di VPS: bash update-heyaipeople.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
REPO=akihabara-fuji/akihabara-store
RAW="https://raw.githubusercontent.com/$REPO/$C/heyaipeople"
ROOT=/var/www/heyaipeople
NEW=/tmp/heyaipeople-new-$$
BAK="$ROOT.prev-$(date +%s)"
fail(){ echo "GAGAL di baris $1, rollback"; [ -d "$BAK" ] && { rm -rf "$ROOT"; mv "$BAK" "$ROOT"; }; exit 1; }
trap 'fail $LINENO' ERR
set -e
mkdir -p "$NEW"
for f in index.html cara-pesan.html style.css script.js favicon.svg robots.txt sitemap.xml; do
  curl -fsSL "$RAW/$f" -o "$NEW/$f"
done
grep -q 'heyaipeople' "$NEW/index.html"
[ -d "$ROOT" ] && cp -a "$ROOT" "$BAK" || true
mkdir -p "$ROOT"
rm -f "$ROOT"/index.html "$ROOT"/cara-pesan.html "$ROOT"/style.css "$ROOT"/script.js "$ROOT"/favicon.svg "$ROOT"/robots.txt "$ROOT"/sitemap.xml
cp "$NEW"/index.html "$NEW"/cara-pesan.html "$NEW"/style.css "$NEW"/script.js "$NEW"/favicon.svg "$NEW"/robots.txt "$NEW"/sitemap.xml "$ROOT"/
chown -R www-data:www-data "$ROOT"; chmod -R a+rX "$ROOT"
for p in / /cara-pesan.html /style.css /script.js /favicon.svg /robots.txt /sitemap.xml; do
  s=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: heyaipeople.site' "http://127.0.0.1$p"); echo "$p $s"
  [ "$s" = 200 ] || fail $LINENO
done
echo "OK, commit $C live. Cadangan: $BAK"
