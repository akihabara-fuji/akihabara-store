#!/bin/bash
# Pasang bot WA baru di /opt/wabot2 BERDAMPINGAN dengan bot lama (bot lama tidak disentuh). Hanya WA2 yang dinyalakan (menunggu scan QR).
# Pakai: wabot2-install.sh <commit>
set -eu; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
SHA=${1:?commit}; R=/opt/wabot2; mkdir -p $R/app $R/data $R/auth
id wabot2 >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin wabot2
echo "== unduh kode $SHA"; T=$(mktemp -d); curl -fsSL "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$SHA" | tar -xz -C $T
SRC=$(ls -d $T/*/wabot); [ -f $SRC/package.json ] || { echo "folder wabot tidak ada di commit ini"; exit 1; }
rm -rf $R/app/src $R/app/tests; cp -r $SRC/src $R/app/src; cp $SRC/package.json $R/app/package.json; rm -rf $T
echo "== pasang paket"; (cd $R/app && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -3)
(cd $R/app && node -e "require('better-sqlite3')(':memory:').close(); console.log('sqlite OK')" 2>&1 | tail -2)
[ -s $R/secret ] || { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n' > $R/secret; }
SEC=$(cat $R/secret)
mk() { # slot port
  [ -f $R/$1.env ] || cat > $R/$1.env <<ENV
SLOT=$1
DATA_DIR=$R/data
AUTH_DIR=$R/auth/$1
ADMIN_NUMBERS=6285722227544
SITE_INTERNAL_URL=http://127.0.0.1:3200
KIRIM_SECRET=$SEC
HUB_PORT=$2
BOT_NAME=Nara
GEMINI_API_KEY=
GEMINI_MODEL=
ENV
}
mk wa1 3401; mk wa2 3400
for s in wa1 wa2; do cat > /etc/systemd/system/wabot2-$s.service <<UNIT
[Unit]
Description=Bot WhatsApp baru ($s)
After=network-online.target
Wants=network-online.target
[Service]
User=wabot2
WorkingDirectory=$R/app
EnvironmentFile=$R/$s.env
ExecStart=/usr/bin/env node src/main.js
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$R
[Install]
WantedBy=multi-user.target
UNIT
done
chown -R wabot2:wabot2 $R; chmod 750 $R; chmod 640 $R/*.env; chmod 600 $R/secret; chown root:wabot2 $R/*.env; chown root:root $R/secret
systemctl daemon-reload; systemctl enable wabot2-wa2 >/dev/null 2>&1; systemctl restart wabot2-wa2; sleep 6
echo "== status WA2 baru"; systemctl is-active wabot2-wa2
curl -s -H "Authorization: Bearer $SEC" http://127.0.0.1:3400/status | sed 's/"number":[^,]*,//'; echo
echo "== bot lama (tidak disentuh): $(systemctl is-active wabot)"
echo "SELESAI. WA2 baru menunggu scan QR. WA1 baru BELUM dinyalakan."
