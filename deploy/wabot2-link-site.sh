#!/bin/bash
# Arahkan notifikasi order situs ke WA2 BARU (port 3400). Aman: WA2 lama tidak tertaut sehingga notifikasi lama memang gagal. Backup .env dulu.
set -eu; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
NEXT=/var/www/mahyra-serv; ENV=$NEXT/.env; [ -s /opt/wabot2/secret ] || { echo "pasang bot baru dulu"; exit 1; }
cp $ENV $ENV.bak-wabot2-$(date +%Y%m%d-%H%M%S)
setk() { if grep -q "^$1=" $ENV; then sed -i "s|^$1=.*|$1=$2|" $ENV; else echo "$1=$2" >> $ENV; fi; }
setk PARAFRASE_WA_SECRET "$(cat /opt/wabot2/secret)"; setk PARAFRASE_WA_WEBHOOK "http://127.0.0.1:3400/kirim"
pm2 restart nextaja --update-env >/dev/null; sleep 4
echo "pm2: $(pm2 jlist 2>/dev/null | grep -o '"status":"[a-z]*"' | head -1)"
curl -s -o /dev/null -w "situs: HTTP %{http_code}\n" http://127.0.0.1:3200/ms/public-config
echo "SELESAI. Notifikasi order sekarang lewat bot WA2 baru. Backup .env: $(ls -t $ENV.bak-wabot2-* | head -1)"
