#!/usr/bin/env bash
# Pasang kartu bertingkat + modul admin "Studi Kasus" (dikapriyadi.catatanakademik.com).
# Jalankan sebagai root di VPS: bash update-portofolio-kasus.sh <commit>
# Aman: tidak menyentuh admin lama (dp-admin). Menolak jalan bila index.html live sudah berubah dari dasar yang diuji.
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi; APP=/opt/dp-kasus; DATA=/var/lib/dp-kasus; SNIP=/etc/nginx/snippets/dp-kasus.conf
BASE_SHA=aadaa89d82e5240b   # 16 hex pertama sha256 index.html live yang diuji (23 Nov 2026)
TS=$(date +%s); PRE=/root/dikapriyadi.pre-kasus.$TS; NEW=/tmp/dp-kasus-new.$$; NGX=""; NGXBAK=""; DONE_IDX=0; HAD_CASES=1
fail(){
  echo "GAGAL di baris $1, mengembalikan"
  [ "$DONE_IDX" = 1 ] && [ -f "$PRE/index.html" ] && cp -a "$PRE/index.html" "$ROOT/index.html"
  [ "$HAD_CASES" = 0 ] && rm -f "$ROOT/cases.json"
  [ -n "$NGXBAK" ] && [ -f "$NGXBAK" ] && { cp -a "$NGXBAK" "$NGX"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; }
  systemctl stop dp-kasus 2>/dev/null
  exit 1
}
trap 'fail $LINENO' ERR
set -e
NODE=$(command -v node || true); [ -n "$NODE" ]
"$NODE" -e "process.exit(+process.versions.node.split('.')[0]>=18?0:1)"
[ -f "$ROOT/index.html" ]
systemctl is-active --quiet dp-admin || { echo "dp-admin (admin lama) tidak aktif, berhenti"; false; }
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
if [ "$LIVE" != "$BASE_SHA" ]; then echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti agar isi dari admin tidak tertimpa."; false; fi
mkdir -p "$NEW"
for f in index.html cases.json server.js kasus.html; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
"$NODE" --check "$NEW/server.js"
grep -q 'Berbasis AI' "$NEW/index.html"; grep -q 'id="case-modal"' "$NEW/index.html"; grep -q 'Studi Kasus' "$NEW/kasus.html"
python3 -c "import json,sys;d=json.load(open(sys.argv[1]));assert d['skema']==1 and len(d['karya'])==8" "$NEW/cases.json"
mkdir -p "$PRE"; cp -a "$ROOT/index.html" "$PRE/index.html"; [ -f "$ROOT/cases.json" ] && cp -a "$ROOT/cases.json" "$PRE/cases.json" || HAD_CASES=0
# 1. modul admin kasus
mkdir -p "$APP" "$DATA"; cp "$NEW/server.js" "$NEW/kasus.html" "$APP"/
chown -R root:root "$APP"; chmod 755 "$APP"; chmod 644 "$APP"/*; chown -R www-data:www-data "$DATA"
cat > /etc/systemd/system/dp-kasus.service <<U
[Unit]
Description=Ruang Admin Portofolio - Studi Kasus
After=network.target dp-admin.service
[Service]
User=www-data
WorkingDirectory=$APP
Environment=DK_PORT=3109 DK_WEB=$ROOT DK_DATA=$DATA DK_AUTH=http://127.0.0.1:3108
ExecStart=$NODE $APP/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$ROOT $DATA
[Install]
WantedBy=multi-user.target
U
# 2. cases.json: dipasang hanya bila belum ada (isi dari admin tidak ditimpa)
[ -f "$ROOT/cases.json" ] || { cp "$NEW/cases.json" "$ROOT/cases.json"; chown www-data:www-data "$ROOT/cases.json"; chmod 644 "$ROOT/cases.json"; }
# 3. nginx
cat > "$SNIP" <<'N'
location = /admin/kasus { proxy_pass http://127.0.0.1:3109; proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host; }
location ^~ /admin/kasus/ { proxy_pass http://127.0.0.1:3109; proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host; }
location ^~ /api/kasus/ { proxy_pass http://127.0.0.1:3109; proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host; proxy_read_timeout 60s; }
N
NGX=$(grep -l 'server_name[^;]*dikapriyadi.catatanakademik.com' /etc/nginx/sites-enabled/* 2>/dev/null | head -1 || true); [ -n "$NGX" ]; NGX=$(readlink -f "$NGX")
if ! grep -q 'snippets/dp-kasus.conf' "$NGX"; then
  NGXBAK="/root/nginx-dp-kasus.bak-$TS"; cp -a "$NGX" "$NGXBAK"
  python3 - "$NGX" <<'P'
import sys
f=sys.argv[1]; s=open(f).read()
i=s.index('include snippets/dp-admin.conf;') if 'include snippets/dp-admin.conf;' in s else s.index('location / {')
s=s[:i]+'include snippets/dp-kasus.conf;\n    '+s[i:]
open(f,'w').write(s)
P
fi
nginx -t
systemctl daemon-reload; systemctl enable dp-kasus >/dev/null 2>&1; systemctl restart dp-kasus
systemctl reload nginx; sleep 2
# 4. index.html baru terakhir (supaya kartu baru hanya tayang setelah datanya ada)
cp "$NEW/index.html" "$ROOT/index.html.new" && mv "$ROOT/index.html.new" "$ROOT/index.html"; DONE_IDX=1
# 5. verifikasi
systemctl is-active --quiet dp-kasus
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3109/api/kasus/state)" = 401 ]
H=https://dikapriyadi.catatanakademik.com
curl -fsS "$H/admin/kasus" | grep -q 'Studi Kasus'
curl -fsS "$H/cases.json" | grep -q '"skema"'
curl -fsS "$H/" | grep -q 'Berbasis AI'
[ "$(curl -s -o /dev/null -w '%{http_code}' $H/admin)" = 200 ]
rm -rf "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE/index.html $ROOT/index.html"
