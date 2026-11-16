#!/usr/bin/env bash
# Deploy portofolio CMS dikapriyadi.catatanakademik.com:
#   - index.html (planet 3D + galeri dari works.json), admin.html, works.json -> /var/www/dikapriyadi
#   - API Node (server.js) -> /opt/porto-api, jalan di PM2 "porto-api" port 3088
#   - Nginx: tambah /api/ + batas upload 60M hanya di server block situs portofolio
# Jalankan sebagai root di VPS: bash update-portofolio-cms.sh <commit>
# works.json di server TIDAK ditimpa kalau sudah ada (isi dari admin tetap aman).
set -uo pipefail
C="${1:?commit wajib}"
REPO=akihabara-fuji/akihabara-store
RAW="https://raw.githubusercontent.com/$REPO/$C"
ROOT=/var/www/dikapriyadi
API=/opt/porto-api
DOMAIN=dikapriyadi.catatanakademik.com
PORT=3088
ENVF=/root/.porto-admin.env
TS=$(date +%s)
BAK="$ROOT.prev-$TS"
APIBAK="$API.prev-$TS"
NEW=/tmp/porto-cms-$$
NGX=""
NGXBAK=""
PM2_WAS=0

fail(){
  echo "GAGAL di baris $1, rollback"
  [ -d "$BAK" ] && { rm -rf "$ROOT"; mv "$BAK" "$ROOT"; }
  [ -n "$NGXBAK" ] && [ -f "$NGXBAK" ] && { cp -a "$NGXBAK" "$NGX"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; }
  if [ -d "$APIBAK" ]; then rm -rf "$API"; mv "$APIBAK" "$API"; fi
  if [ "$PM2_WAS" = 0 ]; then pm2 delete porto-api >/dev/null 2>&1; else pm2 restart porto-api >/dev/null 2>&1; fi
  exit 1
}
trap 'fail $LINENO' ERR
set -e

# 0. Prasyarat
command -v node >/dev/null
NODEV=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODEV" -ge 18 ] || { echo "Node $NODEV terlalu lama, perlu >= 18"; false; }
command -v pm2 >/dev/null || npm install -g pm2
pm2 describe porto-api >/dev/null 2>&1 && PM2_WAS=1 || PM2_WAS=0
if [ "$PM2_WAS" = 0 ]; then
  LISTEN=$( (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) || true )
  case "$LISTEN" in *":$PORT "*) echo "Port $PORT dipakai proses lain"; false ;; esac
fi

# 1. Unduh file dari commit
mkdir -p "$NEW/api"
for f in index.html admin.html works.json; do curl -fsSL "$RAW/portofolio/$f" -o "$NEW/$f"; done
for f in server.js package.json package-lock.json; do curl -fsSL "$RAW/portofolio-api/$f" -o "$NEW/api/$f"; done
grep -q 'Dika Priyadi' "$NEW/index.html"
grep -q 'Admin Galeri Karya' "$NEW/admin.html"
python3 -c "import json,sys; assert len(json.load(open(sys.argv[1])))>0" "$NEW/works.json"
node --check "$NEW/api/server.js"

# 2. File web (aset lama di v/ dan assets/ tidak disentuh)
cp -a "$ROOT" "$BAK"
cp "$NEW/index.html" "$NEW/admin.html" "$ROOT/"
[ -f "$ROOT/works.json" ] || cp "$NEW/works.json" "$ROOT/works.json"
mkdir -p "$ROOT/v/uploads"
chown -R www-data:www-data "$ROOT"; chmod -R a+rX "$ROOT"

# 3. API Node
[ -d "$API" ] && cp -a "$API" "$APIBAK"
mkdir -p "$API"
cp "$NEW/api/server.js" "$NEW/api/package.json" "$NEW/api/package-lock.json" "$API/"
(cd "$API" && { npm ci --omit=dev --no-audit --no-fund >/dev/null 2>&1 || npm install --omit=dev --no-audit --no-fund >/dev/null; })
if [ ! -s "$ENVF" ]; then
  PW=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 14)
  echo "ADMIN_PASSWORD=$PW" > "$ENVF"; chmod 600 "$ENVF"
fi
PW=$(grep '^ADMIN_PASSWORD=' "$ENVF" | cut -d= -f2-)
[ -n "$PW" ]
pm2 delete porto-api >/dev/null 2>&1 || true
SITE_ROOT="$ROOT" PORT="$PORT" ADMIN_PASSWORD="$PW" pm2 start "$API/server.js" --name porto-api --update-env >/dev/null
pm2 save >/dev/null
sleep 2
[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/api/works)" = 200 ]

# 4. Nginx (hanya server block portofolio)
for d in /etc/nginx/sites-enabled /etc/nginx/conf.d; do
  [ -d "$d" ] || continue
  for f in "$d"/*; do
    [ -f "$f" ] || continue
    if grep -qE "server_name[^;]*\b$DOMAIN\b" "$f"; then NGX=$(readlink -f "$f"); break 2; fi
  done
done
[ -n "$NGX" ] || { echo "Konfigurasi nginx untuk $DOMAIN tidak ketemu"; false; }
if ! grep -q 'porto-cms-begin' "$NGX"; then
  NGXBAK="/root/nginx-$(basename "$NGX").bak-$TS"
  cp -a "$NGX" "$NGXBAK"
  python3 - "$NGX" "$DOMAIN" "$PORT" "$ROOT" <<'PY'
import re, sys
path, domain, port, root = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src = open(path).read()
has_body = 'client_max_body_size' in src
block = "\n    # porto-cms-begin\n"
if not has_body:
    block += "    client_max_body_size 60M;\n"
block += (
    "    location ^~ /api/ {\n"
    f"        proxy_pass http://127.0.0.1:{port};\n"
    "        proxy_http_version 1.1;\n"
    "        proxy_set_header Host $host;\n"
    "        proxy_set_header X-Real-IP $remote_addr;\n"
    "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n"
    "        proxy_read_timeout 300s;\n"
    "        client_max_body_size 60M;\n"
    "    }\n"
    f"    location = /works.json {{ root {root}; add_header Cache-Control \"no-store\"; try_files $uri =404; }}\n"
    f"    location = /admin.html {{ root {root}; add_header Cache-Control \"no-store\"; add_header X-Robots-Tag \"noindex\"; try_files $uri =404; }}\n"
    "    # porto-cms-end\n"
)
pat = re.compile(r'(server_name[^;]*\b' + re.escape(domain) + r'\b[^;]*;)')
new, n = pat.subn(lambda m: m.group(1) + block, src)
if n == 0:
    sys.exit("server_name tidak ketemu")
open(path, 'w').write(new)
print(f"nginx: blok ditambahkan ke {n} server block")
PY
  nginx -t
  systemctl reload nginx
fi

# 5. Cek hasil lewat HTTPS lokal
H() { curl -sk -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN$1"; }
for p in / /admin.html /works.json /api/works /v/bot_full.mp4 /v/about-photo.webp /assets/CV_Dika_Priyadi.pdf /assets/k-admin.webp; do
  s=$(H "$p"); echo "$p $s"
  if [ "$s" != 200 ]; then
    echo "--- DIAGNOSA $p (status $s) ---"
    curl -sk -i --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN$p" | head -12 || true
    echo "--- langsung ke node ---"
    curl -s -i "http://127.0.0.1:$PORT$p" | head -6 || true
    echo "--- config nginx ($NGX) ---"
    grep -nE 'server_name|listen|location|proxy_pass|include|return|root ' "$NGX" | head -70 || true
    echo "--- error.log ---"
    tail -4 /var/log/nginx/error.log 2>/dev/null || true
    fail $LINENO
  fi
done
PAGE=$(curl -sk --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/")
case "$PAGE" in *works.json*) ;; *) echo "index.html live tidak memuat works.json"; fail $LINENO ;; esac
rm -rf "$NEW"
echo "Karya di works.json: $(python3 -c "import json;print(len(json.load(open('$ROOT/works.json'))))")"
echo "ADMIN: https://$DOMAIN/admin.html  PASSWORD: $PW"
echo "OK, commit $C live. Cadangan: $BAK"
