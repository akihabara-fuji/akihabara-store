#!/bin/bash
# Ganti jalur analisa di nextaja.com dari /analisa-tiktok menjadi /analisa; yang lama dialihkan. Backup, nginx -t, rollback.
set -e
F=/etc/nginx/sites-enabled/nextaja
grep -q 'location /analisa-tiktok/' "$F" || { echo "blok lama tidak ada"; exit 1; }
grep -q 'location /analisa/' "$F" && { echo "sudah diganti"; exit 0; }
B=/root/nextaja.nginx.bak-$(date +%s); cp "$F" "$B"
chattr -i "$F"; trap 'chattr +i "$F"' EXIT
sed -i \
 -e 's#location = /analisa-tiktok { return 301 /analisa-tiktok/; }#location = /analisa { return 301 /analisa/; }\n    location ~ ^/analisa-tiktok(/.*)?$ { return 301 /analisa$1; }#' \
 -e 's#location /analisa-tiktok/ {#location /analisa/ {#' \
 -e "s#/analisa-tiktok/static/#/analisa/static/#g" \
 -e "s#/analisa-tiktok/api/#/analisa/api/#g" \
 -e 's#href="/analisa-tiktok/"#href="/analisa/"#' "$F"
if nginx -t 2>/dev/null && systemctl reload nginx; then
  sleep 1
  C=$(curl -s -o /dev/null -w '%{http_code}' https://nextaja.com/analisa/ || true)
  R=$(curl -s -o /dev/null -w '%{http_code}' https://nextaja.com/analisa-tiktok/ || true)
  H=$(curl -s https://nextaja.com/analisa/ | grep -c '/analisa/static/' || true)
  echo "analisa=$C lama=$R path=$H"
  if [ "$C" != "200" ]; then cp "$B" "$F"; nginx -t 2>/dev/null && systemctl reload nginx; echo "GAGAL, dikembalikan"; exit 1; fi
  echo "OK /analisa live"
else
  cp "$B" "$F"; echo "nginx -t gagal, dikembalikan"; exit 1
fi
