#!/usr/bin/env bash
# Pindahkan portofolio ke dikapriyadi.site (tanpa menyentuh isi dari admin).
# Jalankan sebagai root di VPS:  bash migrate-dikapriyadi-site.sh  [redirect]
#  - tanpa argumen : pasang domain baru + SSL, ganti link canonical/OG/sitemap/robots/JSON-LD, domain lama tetap hidup.
#  - argumen redirect : jadikan domain lama 301 ke domain baru (jalankan setelah domain baru terverifikasi).
set -uo pipefail
NEW=dikapriyadi.site; OLD=dikapriyadi.catatanakademik.com; ROOT=/var/www/dikapriyadi
TS=$(date +%s); BAK=/root/nginx-migrate.bak-$TS; mkdir -p "$BAK"
SRC=$(grep -l "server_name[^;]*$OLD" /etc/nginx/sites-enabled/* | head -1); SRC=$(readlink -f "$SRC")
CONF=/etc/nginx/sites-available/dikapriyadi-site
fail(){ echo "GAGAL di baris $1, mengembalikan"; rm -f /etc/nginx/sites-enabled/dikapriyadi-site; [ -f "$BAK/src.conf" ] && cp -a "$BAK/src.conf" "$SRC"; [ -d "$BAK/web" ] && cp -a "$BAK/web/." "$ROOT/"; nginx -t >/dev/null 2>&1 && systemctl reload nginx; exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$SRC" ]; cp -a "$SRC" "$BAK/src.conf"

if [ "${1:-}" = "redirect" ]; then
  python3 - "$SRC" "$OLD" "$NEW" <<'PY'
import re,sys
p,old,new=sys.argv[1:4]; s=open(p).read()
if 'return 301 https://'+new in s: print('redirect sudah ada'); sys.exit(0)
out=[];i=0;n=0
for m in re.finditer(r'server\s*\{',s):
    pass
# sisipkan return 301 tepat setelah baris server_name yang memuat domain lama, di semua blok server
s2=re.sub(r'(server_name[^;]*'+re.escape(old)+r'[^;]*;)', r'\1\n    return 301 https://'+new+r'$request_uri;', s)
open(p,'w').write(s2); print('redirect dipasang di',s2.count('return 301 https://'+new),'blok')
PY
  nginx -t; systemctl reload nginx
  H=$(curl -sk -o /dev/null -w '%{http_code} %{redirect_url}' --resolve "$OLD:443:127.0.0.1" "https://$OLD/"); echo "domain lama -> $H"
  echo "OK, domain lama kini 301 ke $NEW. Cadangan: $BAK"; exit 0
fi

# 0. DNS harus sudah menunjuk ke VPS ini
MYIP=$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | head -1)
GOT=$(getent hosts $NEW | awk '{print $1}' | head -1)
echo "IP VPS=$MYIP  DNS $NEW=$GOT"
[ "$GOT" = "$MYIP" ] || { echo "DNS belum menunjuk ke VPS ini. Tunggu lalu ulangi."; false; }
command -v certbot >/dev/null

# 1. blok sementara port 80 untuk validasi sertifikat
cat > $CONF <<N
server { listen 80; listen [::]:80; server_name $NEW www.$NEW; root $ROOT; location /.well-known/acme-challenge/ { try_files \$uri =404; } location / { return 301 https://$NEW\$request_uri; } }
N
ln -sf $CONF /etc/nginx/sites-enabled/dikapriyadi-site
nginx -t; systemctl reload nginx
if [ ! -f /etc/letsencrypt/live/$NEW/fullchain.pem ]; then
  certbot certonly --webroot -w "$ROOT" -d $NEW -d www.$NEW --non-interactive --agree-tos --register-unsafely-without-email || \
  certbot certonly --webroot -w "$ROOT" -d $NEW --non-interactive --agree-tos --register-unsafely-without-email
fi
CERT=/etc/letsencrypt/live/$NEW; [ -f $CERT/fullchain.pem ]
WWW=""; openssl x509 -in $CERT/fullchain.pem -noout -ext subjectAltName 2>/dev/null | grep -q "www.$NEW" && WWW=1

# 2. blok 443 baru = salinan blok 443 domain lama (admin, API, snippet kasus ikut), nama + sertifikat diganti
python3 - "$SRC" "$CONF" "$OLD" "$NEW" "$ROOT" "$WWW" <<'PY'
import re,sys
src,conf,old,new,root,www=sys.argv[1:7]; s=open(src).read()
blocks=[];i=0
for m in re.finditer(r'(?m)^\s*server\s*\{',s):
    st=m.start(); d=0; j=m.end()-1
    while True:
        c=s[j]
        if c=='{': d+=1
        elif c=='}':
            d-=1
            if d==0: break
        j+=1
    blocks.append(s[st:j+1])
b=[x for x in blocks if old in x and re.search(r'listen\s+(\[::\]:)?443',x)]
assert b, 'blok 443 domain lama tidak ketemu'
b=b[0]
names=new+(' www.'+new if www else '')
b=re.sub(r'server_name[^;]*;','server_name '+names+';',b,1)
b=re.sub(r'ssl_certificate\s+[^;]*;','ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;'%new,b)
b=re.sub(r'ssl_certificate_key\s+[^;]*;','ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;'%new,b)
b=b.replace(old,new)
if www:
    b=re.sub(r'(server_name[^;]*;)',r'\1\n    if ($host = www.%s) { return 301 https://%s$request_uri; }'%(new,new),b,1)
http='server { listen 80; listen [::]:80; server_name %s; root %s; location /.well-known/acme-challenge/ { try_files $uri =404; } location / { return 301 https://%s$request_uri; } }\n'%(names,root,new)
open(conf,'w').write(http+b+'\n')
PY
nginx -t; systemctl reload nginx

# 3. verifikasi domain baru dulu (belum mengubah isi)
V=$(mktemp); curl -sk --resolve "$NEW:443:127.0.0.1" "https://$NEW/" -o "$V"; grep -q 'Berbasis AI' "$V"
A=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$NEW:443:127.0.0.1" "https://$NEW/admin" || true); echo "admin di domain baru: $A"
K=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$NEW:443:127.0.0.1" "https://$NEW/api/kasus/state" || true); echo "api kasus tanpa login: $K (harus 401)"

# 4. ganti link di berkas statis (canonical, OG, JSON-LD, sitemap, robots); cadangan dulu
mkdir -p "$BAK/web"; for f in index.html sitemap.xml robots.txt; do [ -f "$ROOT/$f" ] && cp -a "$ROOT/$f" "$BAK/web/$f"; done
for f in index.html sitemap.xml robots.txt; do [ -f "$ROOT/$f" ] && sed -i "s#$OLD#$NEW#g" "$ROOT/$f"; done
grep -q "https://$NEW/" "$ROOT/index.html"
! grep -q "$OLD" "$ROOT/index.html" || echo "peringatan: masih ada $OLD di index.html"
nginx -t; systemctl reload nginx
echo "OK, $NEW live. sha index baru: $(sha256sum $ROOT/index.html | cut -c1-16). Cadangan: $BAK"
