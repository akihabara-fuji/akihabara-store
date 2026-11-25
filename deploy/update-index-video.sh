#!/usr/bin/env bash
# Ganti HANYA index.html beranda: gabung dua jalur video jadi satu bagian bertab.
# Jalankan sebagai root di VPS: bash update-index-tampilan.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
F=/var/www/dikapriyadi/index.html; BASE_SHA=82709e44869fea84; TS=$(date +%s); PRE=/root/index.pre-video.$TS; NEW=/tmp/dp-idx.$$
fail(){ echo "GAGAL di baris $1, mengembalikan"; [ -f "$PRE" ] && cp -a "$PRE" "$F"; exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$F" ]
LIVE=$(sha256sum "$F" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
curl -fsSL "$RAW/index.html" -o "$NEW"
grep -q 'window.__KON' "$NEW"; grep -q 'id="tentang"' "$NEW"; ! grep -q 'dp-bg' "$NEW"; grep -q 'id="lane-video"' "$NEW"
cp -a "$F" "$PRE"
cp "$NEW" "$F.new"; chown www-data:www-data "$F.new"; chmod 644 "$F.new"; mv "$F.new" "$F"
V=/tmp/dp-idxv.$$
curl -fsS https://dikapriyadi.site/ -o "$V"; ! grep -q 'dp-bg' "$V"; grep -q 'href="sistem-kerja/">Sistem Kerja</a>' "$V"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE $F"
