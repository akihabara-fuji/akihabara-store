#!/usr/bin/env bash
# Pasang / perbarui Ruang Admin portofolio (dikapriyadi.catatanakademik.com).
# Jalankan sebagai root di VPS: bash update-portofolio-admin.sh <commit>
# Tidak menimpa works.json / karya.json / remotion.json / index.html (isinya dikelola dari admin).
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-admin"
APP=/opt/dp-admin; DATA=/var/lib/dp-admin; BKP=/var/backups/dp-admin; ROOT=/var/www/dikapriyadi
SNIP=/etc/nginx/snippets/dp-admin.conf; TS=$(date +%s); PRE=/root/dikapriyadi.pre-admin.$TS
NGX=""; NGXBAK=""; NEWPW=""
fail(){
  echo "GAGAL di baris $1, mengembalikan"
  [ -n "$NGXBAK" ] && [ -f "$NGXBAK" ] && { cp -a "$NGXBAK" "$NGX"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; }
  systemctl stop dp-admin 2>/dev/null
  [ -f "$PRE/index.html" ] && cp -a "$PRE/index.html" "$ROOT/index.html"
  exit 1
}
trap 'fail $LINENO' ERR
set -e
NODE=$(command -v node || true)
[ -z "$NODE" ] && NODE=$(grep -ho 'ExecStart=[^ ]*' /etc/systemd/system/hp-admin.service | head -1 | cut -d= -f2)
"$NODE" -e "require('node:sqlite')" 2>/dev/null || { echo "Node di $NODE belum mendukung node:sqlite"; false; }
[ -f "$ROOT/index.html" ] && [ -f "$ROOT/karya.json" ]
cp -a "$ROOT" "$PRE"
mkdir -p "$APP" "$DATA" "$BKP" /tmp/dp-new
curl -fsSL "$RAW/server.js" -o /tmp/dp-new/server.js
curl -fsSL "$RAW/admin.html" -o /tmp/dp-new/admin.html
"$NODE" --check /tmp/dp-new/server.js
grep -q 'Ruang Admin' /tmp/dp-new/admin.html
cp /tmp/dp-new/server.js /tmp/dp-new/admin.html "$APP"/
if [ ! -f "$DATA/dp.db" ]; then
  NEWPW=$(python3 -c "import secrets;a='abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';print(''.join(secrets.choice(a) for _ in range(12)))")
  printf '%s' "$NEWPW" > "$DATA/initial_pw.txt"
fi
chown -R www-data:www-data "$DATA" "$BKP"; chown -R root:root "$APP"; chmod 755 "$APP"; chmod 644 "$APP"/server.js "$APP"/admin.html
[ -f "$DATA/initial_pw.txt" ] && { chown www-data:www-data "$DATA/initial_pw.txt"; chmod 600 "$DATA/initial_pw.txt"; }
cat > /etc/systemd/system/dp-admin.service <<U
[Unit]
Description=Ruang Admin Portofolio
After=network.target
[Service]
User=www-data
WorkingDirectory=$APP
Environment=DP_PORT=3108 DP_WEB=$ROOT DP_DATA=$DATA DP_BACKUP=$BKP
ExecStart=$NODE $APP/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$ROOT $DATA $BKP
[Install]
WantedBy=multi-user.target
U
# Nginx: tambahkan include ke server block situs ini (sekali saja, dengan cadangan)
cat > "$SNIP" <<'N'
location = /admin { proxy_pass http://127.0.0.1:3108; proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host; }
location ^~ /admin/ { proxy_pass http://127.0.0.1:3108; proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host; }
location ^~ /api/ {
  proxy_pass http://127.0.0.1:3108;
  proxy_set_header X-Real-IP $remote_addr; proxy_set_header Host $host;
  client_max_body_size 210m; proxy_request_buffering off;
  proxy_read_timeout 600s; proxy_send_timeout 600s;
}
location ^~ /v/uploads/ { try_files $uri =404; add_header X-Content-Type-Options "nosniff" always; add_header Cache-Control "public, max-age=2592000, immutable"; }
N
NGX=$(grep -l 'server_name[^;]*dikapriyadi.catatanakademik.com' /etc/nginx/sites-enabled/* 2>/dev/null | head -1 || true)
[ -n "$NGX" ] || { echo "Konfigurasi nginx situs portofolio tidak ditemukan"; false; }
NGX=$(readlink -f "$NGX")
if ! grep -q 'snippets/dp-admin.conf' "$NGX"; then
  NGXBAK="/root/nginx-dp-admin.bak-$TS"; cp -a "$NGX" "$NGXBAK"
  python3 - "$NGX" <<'P'
import sys,re
f=sys.argv[1]; s=open(f).read()
i=s.index('root /var/www/dikapriyadi;'); j=s.index('location / {', i)
s=s[:j]+'include snippets/dp-admin.conf;\n    '+s[j:]
open(f,'w').write(s)
P
fi
nginx -t
systemctl daemon-reload
systemctl enable dp-admin >/dev/null 2>&1
systemctl restart dp-admin
for i in 1 2 3 4 5 6 7 8 9 10; do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3108/admin)" = 200 ] && break; sleep 1; done
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3108/admin)" = 200 ]
systemctl reload nginx
D=dikapriyadi.catatanakademik.com
L(){ curl -sk --resolve $D:443:127.0.0.1 "$@"; }
for p in / /works.json /karya.json /remotion.json /style.css /script.js /admin; do
  s=$(L -o /dev/null -w '%{http_code}' "https://$D$p"); echo "$p $s"; [ "$s" = 200 ] || fail $LINENO
done
echo "/api/me: $(L https://$D/api/me)"
grep -c 'SLOT:heroSub' "$ROOT/index.html" | sed 's/^/penanda index: /'
sha256sum "$ROOT"/works.json "$ROOT"/karya.json "$ROOT"/remotion.json | cut -c1-12,65-
echo "OK, admin commit $C aktif. Cadangan situs: $PRE"
[ -n "$NEWPW" ] && echo "KATA SANDI AWAL: $NEWPW"
