#!/usr/bin/env bash
# Pasang modul "Cek dan Parafrase Mandiri" ke nextaja di VPS. Aman: backup dulu, semua patch dicek anchor-nya,
# dites sebelum dipakai, dan otomatis dikembalikan kalau gagal. Bisa dijalankan ulang.
#
#   bash deploy/install-parafrase.sh --check        # hanya memeriksa, tidak mengubah apa pun
#   bash deploy/install-parafrase.sh                # pasang
# Variabel: APP_DIR (default /var/www/mahyra-serv), PM2_NAME (default nextaja), PORT (default 3200),
#           SKIP_NGINX=1, SKIP_RESTART=1 (untuk uji).
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${APP_DIR:-/var/www/mahyra-serv}"
PM2_NAME="${PM2_NAME:-nextaja}"
PORT="${PORT:-3200}"
CHECK_ONLY=0; [ "${1:-}" = "--check" ] && CHECK_ONLY=1
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="${BACKUP_DIR:-/root}/backup-parafrase-$STAMP.tgz"
LINE='require("./parafrase")({ app, express, requireAdmin, sameOrigin, ROOT });'
ANCHOR='app.use("/admin", express.static'

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nGAGAL: %s\n' "$*" >&2; exit 1; }

say "1. Pemeriksaan awal"
command -v node >/dev/null || die "Node.js tidak ditemukan."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ] || die "Butuh Node.js 18 atau lebih baru."
[ -f "$APP_DIR/server.js" ] || die "server.js tidak ada di $APP_DIR (atur APP_DIR=...)."
[ -d "$SRC/parafrase" ] || die "Folder parafrase/ tidak ada di paket ($SRC)."
for id in requireAdmin sameOrigin ROOT; do grep -q "\b$id\b" "$APP_DIR/server.js" || die "server.js live tidak punya '$id'. Versi live berbeda dari yang diuji; JANGAN dipaksa. Kirim server.js live ke Claude untuk disesuaikan."; done
if grep -qF "$LINE" "$APP_DIR/server.js"; then echo "server.js: baris pasang sudah ada."; else
  grep -qF "$ANCHOR" "$APP_DIR/server.js" || die "Anchor '$ANCHOR' tidak ditemukan di server.js live. Kirim server.js live ke Claude untuk disesuaikan."
fi
HAVE_INDEX=0; [ -f "$APP_DIR/public/index.html" ] && HAVE_INDEX=1
echo "OK: server.js cocok. index.html: $([ $HAVE_INDEX = 1 ] && echo ada || echo tidak ada)."
[ $CHECK_ONLY = 1 ] && { echo; echo "Mode --check selesai. Tidak ada yang diubah."; exit 0; }

say "2. Backup -> $BACKUP"
mkdir -p "$(dirname "$BACKUP")"
( cd "$APP_DIR" && tar czf "$BACKUP" server.js package.json $( [ -f package-lock.json ] && echo package-lock.json ) $( [ $HAVE_INDEX = 1 ] && echo public/index.html ) $( [ -d parafrase ] && echo parafrase ) $( [ -d data ] && echo --exclude=data/private --exclude=data/backups data ) )
echo "Backup selesai."

rollback() {
  echo; echo "GAGAL -> mengembalikan dari backup"
  ( cd "$APP_DIR" && tar xzf "$BACKUP" --exclude="data" --exclude="data/*" )
  if [ -n "${NGINX_FILE:-}" ] && [ -f "$NGINX_FILE.parafrase.bak" ]; then cp "$NGINX_FILE.parafrase.bak" "$NGINX_FILE"; nginx -t && systemctl reload nginx || true; fi
  [ "${SKIP_RESTART:-0}" = 1 ] || { command -v pm2 >/dev/null && pm2 restart "$PM2_NAME" >/dev/null 2>&1 || true; }
  exit 1
}
trap rollback ERR

say "3. Salin modul"
mkdir -p "$APP_DIR/parafrase"
if command -v rsync >/dev/null; then rsync -a --delete "$SRC/parafrase/" "$APP_DIR/parafrase/"; else rm -rf "$APP_DIR/parafrase" && cp -a "$SRC/parafrase" "$APP_DIR/parafrase"; fi

say "4. Dependensi (versi dikunci)"
cd "$APP_DIR"
need=""
while read -r name spec; do
  node -e "require('$name')" 2>/dev/null || need="$need $spec"
done <<LIST
better-sqlite3 better-sqlite3@13.0.3
jszip jszip@3.10.2
@xmldom/xmldom @xmldom/xmldom@0.9.12
multer multer@2.0.2
sharp sharp@0.34.4
LIST
if [ -n "$need" ]; then echo "Memasang:$need"; npm install --omit=dev --save-exact $need; else echo "Semua dependensi sudah ada."; fi

say "5. Patch server.js (satu baris)"
python3 - "$APP_DIR/server.js" "$LINE" "$ANCHOR" <<'PY'
import sys
p, line, anchor = sys.argv[1:4]
s = open(p).read()
if line in s:
    print("sudah terpasang"); sys.exit(0)
i = s.index(anchor)
ls = s.rfind("\n", 0, i) + 1
s = s[:ls] + line + "\n" + s[ls:]
open(p, "w").write(s); print("baris ditambahkan")
PY
node --check "$APP_DIR/server.js"

say "6. Patch index.html (menu + alihan #akademik), dilewati bila anchor tidak ada"
if [ $HAVE_INDEX = 1 ]; then
python3 - "$APP_DIR/public/index.html" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read(); o = s
if 'location.replace("/ruangakademikut")' not in s and "<title>" in s:
    s = s.replace("<title>", '<script>if(location.hash==="#akademik")location.replace("/ruangakademikut");</script>\n<title>', 1)
s = s.replace('<a href="#akademik">Akademik</a>', '<a href="/ruangakademikut">Ruang Akademik UT</a>')
if s != o: open(p, "w").write(s); print("index.html diperbarui")
else: print("index.html: tidak ada yang diubah (anchor tidak ada atau sudah terpasang)")
PY
fi

if [ "${SKIP_NGINX:-0}" != 1 ] && command -v nginx >/dev/null; then
say "7. Nginx: arahkan /ruangakademikut dan izinkan unggah besar"
NGINX_FILE=$(grep -ls "mahyra-portal" /etc/nginx/sites-enabled/* 2>/dev/null | head -1 || true)
if [ -z "$NGINX_FILE" ]; then echo "PERINGATAN: blok 'mahyra-portal' tidak ditemukan di nginx. Lewati. Tambahkan lokasi /ruangakademikut dan /ms/parafrase ke port $PORT secara manual."; else
  NGINX_FILE=$(readlink -f "$NGINX_FILE")
  if grep -q "parafrase-portal" "$NGINX_FILE"; then echo "nginx: sudah terpasang."; else
    cp "$NGINX_FILE" "$NGINX_FILE.parafrase.bak"
    python3 - "$NGINX_FILE" "$PORT" <<'PY'
import sys
f, port = sys.argv[1], sys.argv[2]
s = open(f).read()
H = ("proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; "
     "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;")
blk = f'''    # --- parafrase-portal: Ruang Akademik UT + unggah dokumen ---
    location ~ ^/ms/(parafrase|admin/parafrase)/ {{ client_max_body_size 30m; proxy_pass http://127.0.0.1:{port}; {H} }}
    location ~ ^/(ruangakademikut|admin/parafrase) {{ proxy_pass http://127.0.0.1:{port}; {H} }}
    # --- end parafrase-portal ---

'''
i = s.find("# --- mahyra-portal")
if i < 0: sys.exit("anchor mahyra-portal hilang")
ls = s.rfind("\n", 0, i) + 1
open(f, "w").write(s[:ls] + blk + s[ls:])
PY
    nginx -t
    systemctl reload nginx
    echo "nginx: terpasang dan di-reload."
  fi
fi
fi

say "8. Restart dan uji"
if [ "${SKIP_RESTART:-0}" = 1 ]; then echo "SKIP_RESTART=1: restart dilewati."; else
  command -v pm2 >/dev/null || die "pm2 tidak ditemukan."
  pm2 restart "$PM2_NAME" --update-env >/dev/null
  sleep 3
fi
code() { curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$1" || echo 000; }
if [ "${SKIP_RESTART:-0}" != 1 ]; then
  [ "$(code /ms/public-config)" = 200 ] || die "/ms/public-config tidak 200."
  [ "$(code /ruangakademikut)" = 200 ] || die "/ruangakademikut tidak 200."
  [ "$(code /ruangakademikut/cek-parafrase-mandiri)" = 200 ] || die "halaman unggah tidak 200."
  [ "$(code /admin/parafrase/)" = 200 ] || die "panel admin tidak 200."
  [ "$(code /ms/admin/parafrase/queue)" = 401 ] || die "rute admin harus 401 tanpa login."
  [ "$(code /)" = 200 ] || die "halaman utama rusak."
fi
trap - ERR
say "SELESAI"
cat <<MSG
Backup: $BACKUP
Cara kembali: bash $SRC/deploy/rollback-parafrase.sh $BACKUP

Langkah berikut (manual, sekali saja):
 1. Buka https://domainmu/admin/parafrase  -> tab "Pengaturan & QRIS" -> unggah foto QRIS.
 2. (Opsional) sambungkan bot WhatsApp: tambahkan ke .env  PARAFRASE_WA_WEBHOOK=http://127.0.0.1:<port-bot>/kirim  dan  PARAFRASE_WA_SECRET=<rahasia>, lalu pm2 restart $PM2_NAME --update-env.
    Tanpa itu, pesan WhatsApp tetap tercatat dan bisa dikirim manual dari tab "Pesan WhatsApp".
 3. Coba satu pesanan uji dari awal sampai akhir sebelum diumumkan.
MSG
