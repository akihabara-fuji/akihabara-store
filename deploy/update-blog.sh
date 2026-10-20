#!/usr/bin/env bash
# Perbarui blog-akun.js (komentar blog wajib login, login ?next=) + blog.css + halaman Ruang Akademik UT. Backup, cek sintaks, rollback otomatis bila gagal.
set -euo pipefail
REF="${1:?pakai: update-blog.sh <commit>}"
APP=/var/www/mahyra-serv
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
BK=/root/blog-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" server.js blog-akun.js public/assets/blog.css parafrase
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
T=$(mktemp -d)
curl -fsSL "$RAW/server.js" -o "$T/server.js"
curl -fsSL "$RAW/blog-akun.js" -o "$T/blog-akun.js"
curl -fsSL "$RAW/public/assets/blog.css" -o "$T/blog.css"
node --check "$T/blog-akun.js"
mkdir -p "$APP/public/assets/portal"
for n in selamat-datang ruang-akademik metodologi tugas-diskusi jadwal-kalender registrasi ujian-ut materi-belajar tips-kuliah tools-ai video-studio preset-template blog-berita karir-lowongan tentang; do curl -fsSL "$RAW/public/assets/portal/$n.webp" -o "$T/$n.webp"; done
cp "$T/server.js" "$T/chk-server.js"; node --check "$T/chk-server.js"
cp "$T/server.js" "$APP/server.js"
cp "$T/blog-akun.js" "$APP/blog-akun.js"
cp "$T/blog.css" "$APP/public/assets/blog.css"
cp "$T"/*.webp "$APP/public/assets/portal/"
rm -rf "$T"
bash "$(dirname "$0")/update-module.sh" "$REF" 2>/dev/null || bash /root/update-module.sh "$REF"
pm2 restart nextaja --update-env >/dev/null
sleep 4
B=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/blog)
U=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3200/ms/parafrase/upload)
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/ms/blog/tes/comments)
echo "blog HTTP $B (harus 200), komentar HTTP $C (harus 200)"
[ "$B" = 200 ]
[ "$C" = 200 ]
[ "$U" = 401 ] || { echo "upload tanpa login harus 401, dapat $U"; false; }
trap - ERR
echo "SELESAI. Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
