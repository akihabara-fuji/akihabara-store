#!/usr/bin/env bash
# Karya jadi satu sistem (10 karya) + gabung jalur video. Ganti index.html, data cases.json/state.json, 1 aset.
# Jalankan sebagai root di VPS: bash update-karya-sistem.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
G="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C"
W=/var/www/dikapriyadi; F=$W/index.html; S=/var/lib/dp-kasus/state.json; O=$W/cases.json
BASE_SHA=82709e44869fea84; TS=$(date +%s); B=/root/karya-sistem.$TS; NEW=/tmp/dp-idx.$$; JS=/tmp/dp-karya.$$.js
echo "--- status bot WhatsApp (info) ---"; (systemctl list-units --type=service --state=running 2>/dev/null | grep -iE 'wa|bot|baileys' | cut -c1-110; command -v pm2 >/dev/null && pm2 jlist 2>/dev/null | python3 -c "import sys,json;[print('pm2',p['name'],p['pm2_env']['status']) for p in json.load(sys.stdin)]") || true
echo "--- mulai ---"
mkdir -p "$B"
fail(){ echo "GAGAL di baris $1, mengembalikan"; [ -f "$B/index.html" ] && cp -a "$B/index.html" "$F"; [ -f "$B/cases.json" ] && cp -a "$B/cases.json" "$O"; [ -f "$B/state.json" ] && cp -a "$B/state.json" "$S"; exit 1; }
trap 'fail $LINENO' ERR
set -e
LIVE=$(sha256sum "$F" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
curl -fsSL "$G/portofolio-kasus/index.html" -o "$NEW"
grep -q 'window.__KON' "$NEW"; grep -q 'id="tentang"' "$NEW"; ! grep -q 'dp-bg' "$NEW"; grep -q 'id="lane-video"' "$NEW"; grep -q 'bot-wa-grup' "$NEW"
curl -fsSL "$G/deploy/update-karya-sistem.js" -o "$JS"
curl -fsSL "$G/portofolio/assets/k-sistem-kerja.webp" -o "$W/assets/k-sistem-kerja.webp"; chown www-data:www-data "$W/assets/k-sistem-kerja.webp"; chmod 644 "$W/assets/k-sistem-kerja.webp"
cp -a "$F" "$B/index.html"; cp -a "$O" "$B/cases.json"; [ -f "$S" ] && cp -a "$S" "$B/state.json"
node "$JS"
chown www-data:www-data "$O" "$S" 2>/dev/null || true
cp "$NEW" "$F.new"; chown www-data:www-data "$F.new"; chmod 644 "$F.new"; mv "$F.new" "$F"
curl -fsS https://dikapriyadi.site/ -o /tmp/dp-v.$$; ! grep -q 'dp-bg' /tmp/dp-v.$$; grep -q 'id="lane-video"' /tmp/dp-v.$$
curl -fsS "https://dikapriyadi.site/cases.json" | python3 -c "import sys,json;d=json.load(sys.stdin);assert len(d['karya'])==10;print('karya live:',len(d['karya']))"
systemctl is-active dp-kasus
echo "OK, commit $C live. Cadangan: $B"
echo "Rollback: cp -a $B/index.html $F; cp -a $B/cases.json $O; cp -a $B/state.json $S"
