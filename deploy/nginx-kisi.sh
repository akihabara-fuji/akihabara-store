#!/usr/bin/env bash
# Katalog Kisi-kisi baru (aplikasi) memakai /kisi-kisi dan /kisi-kisi/<slug>. Situs statis lama (4 halaman, /var/www/kisi-kisi/dist)
# tetap hidup di alamat lamanya. Pakai: bash nginx-kisi.sh apply | restore
set -euo pipefail
CONF=/etc/nginx/sites-available/catatanakademik
BAK=/root/nginx-catatanakademik.sebelum-kisi
# konfigurasi dikunci chattr +i (ca-lock): buka sementara, kunci lagi saat selesai, seperti skrip nginx lainnya
LOCKED=0; lsattr -d "$CONF" 2>/dev/null | cut -d" " -f1 | grep -q i && LOCKED=1
[ $LOCKED = 1 ] && chattr -i "$CONF"
trap '[ $LOCKED = 1 ] && chattr +i "$CONF"' EXIT
case "${1:-}" in
  restore)
    [ -f "$BAK" ] || { echo "Tidak ada cadangan nginx."; exit 1; }
    cp "$BAK" "$CONF"; nginx -t && systemctl reload nginx; echo "nginx dikembalikan ke versi sebelum Kisi-kisi."; exit 0;;
  apply) ;;
  *) echo "pakai: apply | restore"; exit 1;;
esac
[ -f "$BAK" ] || cp "$CONF" "$BAK"
python3 - "$CONF" <<'PY'
import re,sys
p=sys.argv[1]; s=open(p,encoding='utf8').read()
if 'kisi-kisi-lama' in s:
    print("nginx sudah diubah, tidak ada yang dilakukan."); sys.exit(0)
old=re.compile(r"    location = /kisi-kisi \{ return 301 /kisi-kisi/; \}\n    location \^~ /kisi-kisi/ \{\n.*?\n    \}\n", re.S)
assert len(old.findall(s))==1, "blok kisi-kisi lama tidak ditemukan persis satu kali"
new='''    # kisi-kisi-lama: 4 halaman statis tetap di alamat lamanya; selebihnya /kisi-kisi dilayani aplikasi (location / di bawah)
    location ~ ^/kisi-kisi/(ekma4111-pengantar-bisnis|ekma4116-manajemen|mkwu4108-bahasa-indonesia|s1-manajemen)(/.*)?$ {
        rewrite ^/kisi-kisi/(.*)$ /$1 break;
        root /var/www/kisi-kisi/dist;
        index index.html;
        try_files $uri $uri/index.html =404;
    }
    location = /kisi-kisi/sitemap.xml {
        alias /var/www/kisi-kisi/dist/sitemap.xml;
    }
'''
open(p,'w',encoding='utf8').write(old.sub(lambda m:new,s))
PY
if nginx -t 2>&1; then systemctl reload nginx; echo "nginx diperbarui."; else cp "$BAK" "$CONF"; nginx -t; echo "nginx -t gagal, dikembalikan."; exit 1; fi
