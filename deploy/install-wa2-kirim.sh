#!/usr/bin/env bash
# Sambungkan notifikasi Cek & Parafrase ke WA2 (wabot, ES module). Selalu mulai dari backup bersih; rollback otomatis kalau gagal.
set -euo pipefail
APP=/opt/wabot/app
NEXT=/var/www/mahyra-serv
BASE=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/bc3115a19a07523102ddd19889da66ba1f4c19c1/deploy/wa2
BAK=$APP/src/bot.js.bak-parafrase
[ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
[ -f "$BAK" ] || cp $APP/src/bot.js "$BAK"
grep -q 'kirim-wa2' "$BAK" && { echo "Backup tidak bersih, batal."; exit 1; }
rollback(){ echo "GAGAL -> rollback"; cp "$BAK" $APP/src/bot.js; rm -f $APP/src/kirim-wa2.js; systemctl restart wabot || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
cp "$BAK" $APP/src/bot.js
[ "$(grep -c '^    wa2Socket = sock;$' $APP/src/bot.js)" = 1 ] || { echo "Anchor wa2Socket tidak ditemukan/ganda."; exit 1; }
curl -fsSL "$BASE/kirim-wa2.js" -o $APP/src/kirim-wa2.js
cp $APP/src/kirim-wa2.js /tmp/k-check.mjs && node --check /tmp/k-check.mjs && rm -f /tmp/k-check.mjs
[ -s $APP/.kirim-secret ] || openssl rand -hex 24 > $APP/.kirim-secret
chmod 600 $APP/.kirim-secret; chown wabot $APP/.kirim-secret $APP/src/kirim-wa2.js
sed -i '/^    wa2Socket = sock;$/a\    import("./kirim-wa2.js").then(m => m.default(() => wa2Socket)).catch(e => console.error("kirim-wa2:", e.message));' $APP/src/bot.js
node --check $APP/src/bot.js 2>/dev/null || cp $APP/src/bot.js /tmp/b-check.mjs && node --check /tmp/b-check.mjs && rm -f /tmp/b-check.mjs
if grep -q '^PARAFRASE_WA_SECRET=' $NEXT/.env; then
  sed -i "s|^PARAFRASE_WA_SECRET=.*|PARAFRASE_WA_SECRET=$(cat $APP/.kirim-secret)|" $NEXT/.env
else
  printf 'PARAFRASE_WA_SECRET=%s\n' "$(cat $APP/.kirim-secret)" >> $NEXT/.env
fi
if grep -q '^PARAFRASE_WA_WEBHOOK=' $NEXT/.env; then
  sed -i 's|^PARAFRASE_WA_WEBHOOK=.*|PARAFRASE_WA_WEBHOOK=http://127.0.0.1:3399/kirim|' $NEXT/.env
else
  echo 'PARAFRASE_WA_WEBHOOK=http://127.0.0.1:3399/kirim' >> $NEXT/.env
fi
systemctl restart wabot
SEC=$(cat $APP/.kirim-secret)
CODE=000
for i in $(seq 1 12); do
  sleep 10
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3399/kirim -H "Authorization: Bearer $SEC" -H 'Content-Type: application/json' -d '{"to":"6285722227544","text":"Tes: notifikasi Cek & Parafrase sudah tersambung ke WA2."}' || true)
  echo "percobaan $i: HTTP $CODE"
  [ "$CODE" = 200 ] && break
done
echo "Hasil tes kirim: HTTP $CODE (200 = pesan masuk ke WA admin)"
trap - ERR
pm2 restart nextaja --update-env >/dev/null
journalctl -u wabot -n 40 --no-pager | grep -iE "WA2|kirim-wa2" | tail -5 | cut -c1-140 || true
echo "SELESAI. Rollback: cp $BAK $APP/src/bot.js && rm $APP/src/kirim-wa2.js && systemctl restart wabot"
