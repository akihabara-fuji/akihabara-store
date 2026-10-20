#!/usr/bin/env bash
# Sambungkan notifikasi Cek & Parafrase ke WA2 (wabot). Aman: backup + rollback otomatis kalau gagal.
set -euo pipefail
APP=/opt/wabot/app
NEXT=/var/www/mahyra-serv
BASE=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/feature/cek-parafrase-mandiri/deploy/wa2
[ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
[ "$(grep -c '^    wa2Socket = sock;$' $APP/src/bot.js)" = 1 ] || { echo "Anchor wa2Socket tidak ditemukan/ganda. Batal."; exit 1; }
grep -q 'kirim-wa2' $APP/src/bot.js && { echo "Sudah terpasang."; exit 0; }
cp -n $APP/src/bot.js $APP/src/bot.js.bak-parafrase
rollback(){ echo "GAGAL -> rollback"; cp $APP/src/bot.js.bak-parafrase $APP/src/bot.js; rm -f $APP/src/kirim-wa2.js; systemctl restart wabot || true; }
trap rollback ERR
curl -fsSL "$BASE/kirim-wa2.js" -o $APP/src/kirim-wa2.js
node --check $APP/src/kirim-wa2.js
[ -s $APP/.kirim-secret ] || { openssl rand -hex 24 > $APP/.kirim-secret; }
chmod 600 $APP/.kirim-secret; chown wabot:wabot $APP/.kirim-secret $APP/src/kirim-wa2.js
sed -i '/^    wa2Socket = sock;$/a\    require("./kirim-wa2")(() => wa2Socket);' $APP/src/bot.js
node --check $APP/src/bot.js
if ! grep -q '^PARAFRASE_WA_WEBHOOK=' $NEXT/.env; then
  printf 'PARAFRASE_WA_WEBHOOK=http://127.0.0.1:3399/kirim\nPARAFRASE_WA_SECRET=%s\n' "$(cat $APP/.kirim-secret)" >> $NEXT/.env
fi
systemctl restart wabot
sleep 20
SEC=$(cat $APP/.kirim-secret)
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3399/kirim -H "Authorization: Bearer $SEC" -H 'Content-Type: application/json' -d '{"to":"6285722227544","text":"Tes: notifikasi Cek & Parafrase sudah tersambung ke WA2."}')
echo "Hasil tes kirim: HTTP $CODE (200 = pesan masuk ke WA admin)"
[ "$CODE" = 200 ] || { echo "Tes tidak 200 (503 = WA2 belum konek, tunggu lalu coba lagi manual)."; }
trap - ERR
pm2 restart nextaja --update-env >/dev/null
echo "SELESAI. Rollback: cp $APP/src/bot.js.bak-parafrase $APP/src/bot.js && rm $APP/src/kirim-wa2.js && systemctl restart wabot"
