#!/usr/bin/env bash
# Pindahkan portal Mahyra Serv ke domain utama (sahabatanalisis.tech).
#  - /, /admin, /blog, /ms/, /uploads, /assets, robots.txt, sitemap.xml  -> Mahyra Serv (port 3200)
#  - /nugas  -> halaman depan Sahabat Nugas (dulu di "/")
#  - semua jalur lain (/app, /login, /api/..., dst) tetap ke Sahabat Nugas (port 3000)
#  - toko.sahabatanalisis.tech -> redirect 301 ke domain utama
# Aman: backup dulu, tes `nginx -t`, otomatis dikembalikan kalau gagal. Bisa dijalankan ulang.
set -euo pipefail

MAIN=$(readlink -f /etc/nginx/sites-enabled/sahabatnugas)
TOKO=$(readlink -f /etc/nginx/sites-enabled/mahyra-serv)
STAMP=$(date +%Y%m%d-%H%M%S)
cp "$MAIN" "/root/nginx-sahabatnugas.$STAMP.bak"
cp "$TOKO" "/root/nginx-mahyra-serv.$STAMP.bak"

restore() {
  echo "GAGAL -> mengembalikan config lama"
  cp "/root/nginx-sahabatnugas.$STAMP.bak" "$MAIN"
  cp "/root/nginx-mahyra-serv.$STAMP.bak" "$TOKO"
  nginx -t && systemctl reload nginx
  exit 1
}

python3 - "$MAIN" "$TOKO" <<'PY'
import re, sys
main, toko = sys.argv[1], sys.argv[2]

H = ("proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; "
     "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;")
block = f'''    # --- mahyra-portal: portal utama di domain utama ---
    location = / {{ proxy_pass http://127.0.0.1:3200; {H} }}
    location = /index.html {{ proxy_pass http://127.0.0.1:3200; {H} }}
    location ~ "^/(admin(/|$)|ms/|blog(/|$)|uploads/|assets/)|^/(robots\\.txt|sitemap\\.xml|manifest\\.webmanifest)$" {{ proxy_pass http://127.0.0.1:3200; {H} }}
    location = /nugas {{ proxy_pass http://127.0.0.1:3000/index; {H} }}
    # --- end mahyra-portal ---

'''
s = open(main).read()
if "mahyra-portal" not in s:
    i = s.find("location / {")
    assert i > 0, "location / tidak ketemu di config domain utama"
    s = s[:i] + block.lstrip(" ") + "    " + s[i:]
    open(main, "w").write(s)
    print("config domain utama: blok Mahyra ditambahkan")
else:
    print("config domain utama: sudah terpasang, dilewati")

t = open(toko).read()
if "mahyra-redirect" not in t:
    new, n = re.subn(r"location / \{.*?\n\s*\}", "location / { return 301 https://sahabatanalisis.tech$request_uri; } # mahyra-redirect", t, count=1, flags=re.S)
    assert n == 1, "location / tidak ketemu di config toko"
    open(toko, "w").write(new)
    print("config toko: redirect 301 ke domain utama dipasang")
else:
    print("config toko: sudah redirect, dilewati")
PY

nginx -t || restore
systemctl reload nginx
echo "SELESAI: nginx di-reload. Backup ada di /root/nginx-*.$STAMP.bak"
