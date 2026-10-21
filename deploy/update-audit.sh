#!/usr/bin/env bash
# Pasang Audit Ringkas (gratis, wajib login) di Ruang Akademik UT. Backup, cek sintaks, restart nextaja, uji, rollback otomatis bila gagal.
# Tidak menyentuh kartu harga, pesanan, atau Paket Metopen.
set -euo pipefail
REF="${1:?pakai: update-audit.sh <commit>}"
APP=/var/www/mahyra-serv
D=$APP/parafrase
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
[ -d "$D" ] || { echo "Folder $D tidak ada"; exit 1; }
BK=/root/audit-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" parafrase server.js
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d); mkdir -p "$T/pages"
JS="index.js pages.js audit.js auditrules.js"
PG="audit.html audit.js cek.html pesanan.html"
for f in $JS; do curl -fsSL "$RAW/parafrase/$f" -o "$T/$f"; node --check "$T/$f"; done
for f in $PG; do curl -fsSL "$RAW/parafrase/pages/$f" -o "$T/pages/$f"; done
node --check "$T/pages/audit.js"
# server.js: wajib login untuk unggah audit (idempotent)
python3 - <<'PY'
p="/var/www/mahyra-serv/server.js"
s=open(p).read()
line='app.post("/ms/audit/upload", needLogin);'
if line in s:
    print("server.js sudah punya needLogin audit")
else:
    k='app.post("/ms/parafrase/order", needLogin);'
    if k not in s: raise SystemExit("penanda needLogin tidak ditemukan di server.js")
    open(p,"w").write(s.replace(k,k+"\n"+line,1)); print("server.js dipatch")
PY
node --check $APP/server.js
for f in $JS; do cp "$T/$f" "$D/$f"; done
for f in $PG; do cp "$T/pages/$f" "$D/pages/$f"; done
rm -rf "$T"
pm2 restart nextaja --update-env >/dev/null
sleep 4
H=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut)
A=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut/audit)
J=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ruangakademikut/assets/audit.js)
U=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3200/ms/audit/upload)
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/blog)
echo "hub $H (200), halaman audit $A (200), audit.js $J (200), unggah tanpa login $U (401), blog $B (200)"
[ "$H" = 200 ]
[ "$A" = 200 ]
[ "$J" = 200 ]
[ "$U" = 401 ]
[ "$B" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com/ruangakademikut/audit lalu Ctrl+F5 dan coba unggah satu file Word."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
