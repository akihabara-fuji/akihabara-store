#!/usr/bin/env bash
# Pasang panel "Tampilan depan" (/admin/kasus/depan) + galeri depan dari galeri.json (dikapriyadi.site).
# Tidak menyentuh data: works.json, karya.json, cases.json, galeri.json, /var/lib/dp-kasus, v/uploads.
# Jalankan sebagai root di VPS: bash update-portofolio-depan.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi; APP=/opt/dp-kasus; DATA=/var/lib/dp-kasus
BASE_SHA=23747cecc97d5eb5   # sha index.html live (commit e00d78c)
TS=$(date +%s); PRE=/root/dikapriyadi.pre-depan.$TS; NEW=/tmp/dp-depan-new.$$; PIDX=0; PAPP=0
fail(){ echo "GAGAL di baris $1, mengembalikan"
  [ "$PIDX" = 1 ] && cp -a "$PRE/index.html" "$ROOT/index.html"
  [ "$PAPP" = 1 ] && { cp -a "$PRE/server.js" "$APP/server.js"; [ -f "$PRE/depan.html" ] && cp -a "$PRE/depan.html" "$APP/depan.html" || rm -f "$APP/depan.html"; systemctl restart dp-kasus; }
  exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$ROOT/index.html" ]; [ -f "$APP/server.js" ]
systemctl is-active --quiet dp-kasus; systemctl is-active --quiet dp-admin
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti."; false; }
mkdir -p "$NEW" "$PRE"
for f in index.html server.js depan.html; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
node --check "$NEW/server.js"
grep -q 'window.__GAL' "$NEW/index.html"; grep -q 'CoverFlowMount' "$NEW/index.html"; grep -q 'class="bt"' "$NEW/index.html"; ! grep -q 'planet-canvas' "$NEW/index.html"
grep -q 'galeri.json' "$NEW/server.js"; grep -q 'Tampilan depan' "$NEW/depan.html"
cp -a "$ROOT/index.html" "$PRE/index.html"; cp -a "$APP/server.js" "$PRE/server.js"; [ -f "$APP/depan.html" ] && cp -a "$APP/depan.html" "$PRE/depan.html" || true
# cadangan data (hanya baca)
for f in works.json karya.json cases.json galeri.json; do [ -f "$ROOT/$f" ] && cp -a "$ROOT/$f" "$PRE/$f" || true; done
cp "$NEW/server.js" "$NEW/depan.html" "$APP"/; chown root:root "$APP"/*; chmod 644 "$APP"/*; PAPP=1
cp "$NEW/index.html" "$ROOT/index.html.new"; chown www-data:www-data "$ROOT/index.html.new"; chmod 644 "$ROOT/index.html.new"; mv "$ROOT/index.html.new" "$ROOT/index.html"; PIDX=1
systemctl restart dp-kasus; sleep 3; systemctl is-active --quiet dp-kasus
H=https://dikapriyadi.site; V=/tmp/dp-depan-v.$$
curl -fsS "$H/" -o "$V"; grep -q 'window.__GAL' "$V"
curl -fsS "$H/galeri.json" -o "$V"; grep -q '"skema"' "$V"; grep -q '"karya"' "$V"
curl -fsS "$H/cases.json" -o "$V"; grep -q '"skema"' "$V"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$H/admin/kasus/depan"); echo "admin depan: HTTP $CODE (401/302 = pintu login aktif)"
rm -f "$V"; rm -rf "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE/index.html $ROOT/index.html; cp -a $PRE/server.js $APP/server.js; rm -f $APP/depan.html; systemctl restart dp-kasus"
