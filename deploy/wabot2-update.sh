#!/bin/bash
# Perbarui kode bot baru (src) dari commit lalu restart yang sedang aktif. Data & sesi tidak disentuh. Pakai: wabot2-update.sh <commit>
set -eu; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
SHA=${1:?commit}; R=/opt/wabot2; T=$(mktemp -d); curl -fsSL "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$SHA" | tar -xz -C $T
SRC=$(ls -d $T/*/wabot); rm -rf $R/app/src.bak-prev; cp -r $R/app/src $R/app/src.bak-prev; rm -rf $R/app/src; cp -r $SRC/src $R/app/src; cp $SRC/package.json $R/app/package.json; rm -rf $T
(cd $R/app && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1); chown -R wabot2:wabot2 $R/app
for s in wa1 wa2; do sed -i "/^BOT_NAME=/d" $R/$s.env; echo "BOT_NAME=${BOT_NAME:-Putri}" >> $R/$s.env; done
for s in wa1 wa2; do systemctl is-active --quiet wabot2-$s && systemctl restart wabot2-$s && echo "restart $s"; done; sleep 8
SEC=$(cat $R/secret); for p in 3401 3400; do curl -s -H "Authorization: Bearer $SEC" http://127.0.0.1:$p/status | sed 's/"number":"[0-9]*",//'; echo; done
rm -rf $R/app/src.bak-prev; echo "SELESAI. Versi $SHA aktif."
