#!/usr/bin/env bash
# Kembalikan nextaja ke keadaan sebelum modul parafrase dipasang.   bash deploy/rollback-parafrase.sh /root/backup-parafrase-XXXX.tgz
# Data pesanan (data/parafrase.db) dan berkas privat TIDAK dihapus.
set -euo pipefail
BK="${1:?Sebutkan berkas backup .tgz}"; APP_DIR="${APP_DIR:-/var/www/mahyra-serv}"; PM2_NAME="${PM2_NAME:-nextaja}"
[ -f "$BK" ] || { echo "Backup tidak ada: $BK"; exit 1; }
cd "$APP_DIR" && tar xzf "$BK" --exclude="data" --exclude="data/*"   # data pesanan dan toko tidak ditimpa
python3 - "$APP_DIR/server.js" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
s = "\n".join(l for l in s.split("\n") if 'require("./parafrase")' not in l)
open(p, "w").write(s)
PY
node --check "$APP_DIR/server.js"
for f in /etc/nginx/sites-enabled/*; do r=$(readlink -f "$f"); [ -f "$r.parafrase.bak" ] && cp "$r.parafrase.bak" "$r" && echo "nginx dikembalikan: $r"; done
nginx -t 2>/dev/null && systemctl reload nginx || true
command -v pm2 >/dev/null && pm2 restart "$PM2_NAME" --update-env >/dev/null && echo "pm2 restart selesai."
echo "Rollback selesai."
