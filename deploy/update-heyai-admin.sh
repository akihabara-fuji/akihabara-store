#!/usr/bin/env bash
# Pasang / perbarui ruang admin heyaipeople.site. Jalankan sebagai root: bash update-heyai-admin.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/heyai-admin"
APP=/opt/hey-admin; DATA=/var/lib/hey-admin; WEB=/var/www/heyaipeople; TS=$(date +%s)
BAK=/root/heyai-admin.$TS; NEW=/tmp/heyai-admin-new-$$
mkdir -p "$BAK" "$NEW"
NGX=""
rollback(){
  echo "GAGAL di baris $1, rollback"
  [ -d "$BAK/web" ] && { rm -rf "$WEB"; cp -a "$BAK/web" "$WEB"; }
  if [ -d "$BAK/app" ]; then rm -rf "$APP"; cp -a "$BAK/app" "$APP"; else rm -rf "$APP"; fi
  [ -n "$NGX" ] && [ -f "$BAK/nginx.conf" ] && cp -a "$BAK/nginx.conf" "$NGX"
  rm -f /etc/nginx/snippets/hey-admin.conf
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  systemctl stop hey-admin 2>/dev/null; systemctl disable hey-admin 2>/dev/null; rm -f /etc/systemd/system/hey-admin.service; systemctl daemon-reload
  exit 1
}
trap 'rollback $LINENO' ERR
set -e
for f in server.js admin.html schema.json seed.json index.template.html; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
node --check "$NEW/server.js"
NODE=$(command -v node); "$NODE" -e 'process.exit(parseInt(process.versions.node)>=18?0:1)'
# cadangan
[ -d "$WEB" ] && cp -a "$WEB" "$BAK/web"
[ -d "$APP" ] && cp -a "$APP" "$BAK/app" || true
[ -d "$DATA" ] && cp -a "$DATA" "$BAK/data" || true
# nginx: cari berkas yang memuat heyaipeople.site
NGX=$(grep -rl 'server_name[^;]*heyaipeople\.site' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -1)
[ -n "$NGX" ] || { echo "konfigurasi nginx heyaipeople.site tidak ditemukan"; false; }
NGX=$(readlink -f "$NGX"); cp -a "$NGX" "$BAK/nginx.conf"
# pasang aplikasi
mkdir -p "$APP" "$DATA" "$WEB/uploads"
cp "$NEW"/* "$APP"/
id www-data >/dev/null
chown -R www-data:www-data "$APP" "$DATA" "$WEB/uploads"
cat > /etc/systemd/system/hey-admin.service <<UNIT
[Unit]
Description=heyaipeople admin
After=network.target
[Service]
User=www-data
Environment=HEY_PORT=3190 HEY_DATA=$DATA HEY_WEB=$WEB
ExecStart=$NODE $APP/server.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/nginx/snippets/hey-admin.conf <<'SNIP'
location = /admin { proxy_pass http://127.0.0.1:3190; proxy_set_header Host $host; }
location /hey-api/ { proxy_pass http://127.0.0.1:3190; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; client_max_body_size 65M; proxy_read_timeout 120s; }
SNIP
# sisipkan include sekali, hanya di blok server yang punya ssl
python3 - "$NGX" <<'PY'
import re,sys
p=sys.argv[1]; s=open(p).read()
if 'snippets/hey-admin.conf' not in s:
    out=[];i=0;n=0
    for m in re.finditer(r'server\s*\{',s):
        pass
    # tandai blok server dengan pencocokan kurung
    pos=0;res=''
    while True:
        m=re.search(r'\bserver\s*\{',s[pos:])
        if not m: res+=s[pos:]; break
        st=pos+m.start(); b=pos+m.end(); d=1; k=b
        while d and k<len(s):
            d+= (s[k]=='{') - (s[k]=='}'); k+=1
        blk=s[st:k]
        if re.search(r'server_name[^;]*heyaipeople\.site',blk) and re.search(r'listen[^;]*(443|ssl)',blk):
            blk=re.sub(r'(server_name[^;]*;)',r'\1\n    include /etc/nginx/snippets/hey-admin.conf;',blk,1); n+=1
        res+=s[pos:st]+blk; pos=k
    if n==0: sys.exit('blok https heyaipeople.site tidak ditemukan')
    open(p,'w').write(res)
PY
grep -q 'Disallow: /admin' "$WEB/robots.txt" 2>/dev/null || printf '\nDisallow: /admin\n' >> "$WEB/robots.txt"
nginx -t
systemctl daemon-reload; systemctl enable hey-admin >/dev/null 2>&1; systemctl restart hey-admin
sleep 2
systemctl is-active --quiet hey-admin
chown -R www-data:www-data "$WEB/index.html" "$WEB/store.json" 2>/dev/null || true
systemctl reload nginx
# verifikasi (tanpa pipa, supaya pipefail tidak menipu)
H='Host: heyaipeople.site'
chk(){ s=$(curl -sk -o "$2" -w '%{http_code}' -H "$H" "https://127.0.0.1$1"); echo "$1 $s"; [ "$s" = "$3" ] || { echo "status salah untuk $1"; false; }; }
chk / /tmp/v-index.html 200
chk /store.json /tmp/v-store.json 200
chk /admin /tmp/v-admin.html 200
chk /hey-api/store /tmp/v-api.json 401
chk /cara-pesan.html /tmp/v-cp.html 200
grep -q 'id="bundle-grid"' /tmp/v-index.html
grep -q 'Admin\|Ruang Admin' /tmp/v-admin.html
if grep -q 'Studio Ghibli' /tmp/v-index.html /tmp/v-store.json; then echo "PROMPT TERKUNCI BOCOR"; false; fi
echo "OK, commit $C live. Cadangan: $BAK"
echo "Rollback: bash -c 'systemctl stop hey-admin; rm -rf $WEB $APP; cp -a $BAK/web $WEB; cp -a $BAK/nginx.conf $NGX; rm -f /etc/nginx/snippets/hey-admin.conf; nginx -t && systemctl reload nginx'"
[ -f "$DATA/PASSWORD-AWAL.txt" ] && { echo "--- PASSWORD AWAL ---"; cat "$DATA/PASSWORD-AWAL.txt"; }
