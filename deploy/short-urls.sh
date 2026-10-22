#!/usr/bin/env bash
# catatanakademik.com: URL pendek (/audit, /cek-parafrase-mandiri, /layanan, /blog-ut, /pesanan) tanpa /ruangakademikut.
# Sudah termasuk update-akademik-only.sh (nama brand, menu, blog akademik). Backup + rollback otomatis.
set -euo pipefail
REF="${1:?pakai: short-urls.sh <commit>}"
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
AV=/etc/nginx/sites-available/catatanakademik
[ -f "$AV" ] || { echo "nginx $AV tidak ada"; exit 1; }
BK=/root/nginx-short-backup-$(date +%Y%m%d-%H%M%S).conf
cp "$AV" "$BK"
curl -fsSL "$RAW/deploy/update-akademik-only.sh" | bash -s "$REF"
rollback(){ echo "GAGAL -> rollback nginx dari $BK"; cp "$BK" "$AV"; nginx -t && systemctl reload nginx || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
python3 - "$AV" <<'PY'
import sys,re
f=sys.argv[1]; s=open(f).read()
if "cek-parafrase-mandiri|audit" in s: print("nginx sudah berisi aturan URL pendek"); sys.exit(0)
PAGES="cek-parafrase-mandiri|audit|layanan|blog-ut|pesanan"
blk=f'''    # URL pendek: /audit dst -> diteruskan ke jalur lama; jalur lama -> 301 ke URL pendek
    location ~ ^/ruangakademikut/({PAGES})(/.*)?$ {{
        return 301 /$1$2$is_args$args;
    }}
    location ~ ^/ruangakademikut/?$ {{
        return 301 /;
    }}
    location ~ ^/({PAGES})(/.*)?$ {{
        rewrite ^/(.*)$ /ruangakademikut/$1 break;
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 300s;
    }}
'''
m=re.search(r'^[ \t]*location = / \{',s,re.M)
if not m: print("penanda 'location = /' tidak ditemukan"); sys.exit(2)
s=s[:m.start()]+blk+s[m.start():]
open(f,"w").write(s)
PY
nginx -t
systemctl reload nginx
sleep 1
R(){ curl -sk --resolve catatanakademik.com:443:127.0.0.1 "$@" https://catatanakademik.com$P; }
P=/audit; A=$(R -o /dev/null -w '%{http_code}')
P=/cek-parafrase-mandiri; B=$(R -o /dev/null -w '%{http_code}')
P=/ruangakademikut/audit; C=$(R -o /dev/null -w '%{http_code} %{redirect_url}')
P=/ruangakademikut; D=$(R -o /dev/null -w '%{http_code} %{redirect_url}')
P=/; E=$(R -o /dev/null -w '%{http_code}')
P=/blog; F=$(R -o /dev/null -w '%{http_code}')
echo "/audit $A | /cek-parafrase-mandiri $B | lama->pendek: $C | /ruangakademikut: $D | / $E | /blog $F"
[ "$A" = 200 ]; [ "$B" = 200 ]; [ "$E" = 200 ]; [ "$F" = 200 ]; [[ "$C" == 301* ]]; [[ "$D" == 301* ]]
trap - ERR
echo "SELESAI. Rollback nginx: cp $BK $AV && nginx -t && systemctl reload nginx"
