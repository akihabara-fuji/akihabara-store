#!/usr/bin/env bash
# Pasang galeri CoverFlow, slider kartu, About rapi, dan ruang alur n8n (dikapriyadi.site).
# Jalankan sebagai root di VPS: bash update-portofolio-galeri.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi
BASE_SHA=5cae929d980a6392   # sha index.html live sebelum perubahan ini
TS=$(date +%s); PRE=/root/dikapriyadi.pre-galeri.$TS; NEW=/tmp/dp-galeri-new.$$; DONE=0
fail(){ echo "GAGAL di baris $1, mengembalikan"; [ "$DONE" = 1 ] && cp -a "$PRE/index.html" "$ROOT/index.html"; rm -f "$ROOT/wb-flow.js.bak"; exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$ROOT/index.html" ]
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
if [ "$LIVE" != "$BASE_SHA" ]; then echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti agar isi dari admin tidak tertimpa."; false; fi
mkdir -p "$NEW" "$PRE"
for f in index.html wb-flow.js; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
grep -q 'Berbasis AI' "$NEW/index.html"; grep -q 'id="case-modal"' "$NEW/index.html"; grep -q 'CoverFlowMount' "$NEW/index.html"; grep -q 'WBFlowMount' "$NEW/wb-flow.js"
cp -a "$ROOT/index.html" "$PRE/index.html"
cp "$NEW/wb-flow.js" "$ROOT/wb-flow.js"; chown www-data:www-data "$ROOT/wb-flow.js"; chmod 644 "$ROOT/wb-flow.js"
cp "$NEW/index.html" "$ROOT/index.html.new"; chown www-data:www-data "$ROOT/index.html.new"; chmod 644 "$ROOT/index.html.new"; mv "$ROOT/index.html.new" "$ROOT/index.html"; DONE=1
H=https://dikapriyadi.site; V=/tmp/dp-galeri-v.$$
curl -fsS "$H/" -o "$V"; grep -q 'CoverFlowMount' "$V"
curl -fsS "$H/wb-flow.js" -o "$V"; grep -q 'WBFlowMount' "$V"
curl -fsS "$H/cases.json" -o "$V"; grep -q '"skema"' "$V"; rm -f "$V"
rm -rf "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE/index.html $ROOT/index.html"
