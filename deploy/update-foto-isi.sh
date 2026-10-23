#!/usr/bin/env bash
# Perbaikan foto di dalam isi artikel blog: ![alt](/uploads/...) tampil sebagai gambar, bukan "!" + tautan.
# Mengganti 4 berkas dan menaikkan satu nomor versi di admin/index.html. Backup, cek, dan rollback otomatis.
# Berkas hanya diganti bila isinya di VPS masih sama dengan snapshot 23 Okt 2026 (mencegah menimpa perubahan lain).
# Jalankan sebagai root di VPS:  bash update-foto-isi.sh <commit>
set -euo pipefail
REF="${1:?pakai: update-foto-isi.sh <commit>}"
APP=/var/www/mahyra-serv
RAW=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$REF
cd "$APP"

# sha256 berkas di VPS saat snapshot 20261023-115244
declare -A OLD=(
  [blog-akun.js]=d7f199e7c50305067353f145cf9549cfebab3e687ecf4542e4ccd3d878393679
  [public/assets/blog.css]=44295593b8cbe262d49d54db68fa97cbb118f109df3ca82b07f168ccc6391fd5
  [public/assets/admin-blog-seo.css]=a1069615e568004c740815f2ae45cf79589fe28c20981d86ba9bd8cd24cd6ced
  [public/assets/admin-blog-seo.js]=8c802c84978522dedd4183b93951f899defc700b26bc29a30034b35566190ba6
)
for f in "${!OLD[@]}"; do
  got=$(sha256sum "$f" | cut -d' ' -f1)
  [ "$got" = "${OLD[$f]}" ] || { echo "BERHENTI: $f di VPS sudah berbeda dari snapshot. Tidak ada yang diubah."; exit 1; }
done
grep -q 'admin-blog-seo.js?v=5' admin/index.html || { echo "BERHENTI: penanda versi admin-blog-seo.js?v=5 tidak ditemukan di admin/index.html."; exit 1; }

BK=/root/foto-isi-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C "$APP" "${!OLD[@]}" admin/index.html
rollback(){ echo "GAGAL -> rollback dari $BK"; tar xzf "$BK" -C "$APP"; pm2 restart nextaja --update-env >/dev/null || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR

T=$(mktemp -d)
for f in "${!OLD[@]}"; do mkdir -p "$T/$(dirname "$f")"; curl -fsSL "$RAW/$f" -o "$T/$f"; done
node --check "$T/blog-akun.js"
node --check "$T/public/assets/admin-blog-seo.js"
for f in "${!OLD[@]}"; do cp "$T/$f" "$APP/$f"; done
sed -i 's/admin-blog-seo\.js?v=5/admin-blog-seo.js?v=6/' admin/index.html
rm -rf "$T"

pm2 restart nextaja --update-env >/dev/null
sleep 4
P=/blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja
HTML=$(curl -fsS -H "Host: catatanakademik.com" "http://127.0.0.1:3200$P")
echo "$HTML" | grep -q '<figure><img src="/uploads/' || { echo "Foto belum tampil sebagai <img>"; false; }
if echo "$HTML" | grep -q '!<a href="/uploads/'; then echo "Masih ada tanda seru + tautan"; false; fi
c(){ curl -s -o /dev/null -w '%{http_code}' -H "Host: catatanakademik.com" "http://127.0.0.1:3200$1"; }
for u in /blog /ruangakademikut/blog-ut /admin/ /assets/blog.css?v=10 /assets/admin-blog-seo.js?v=6; do x=$(c "$u"); echo "$u $x"; [ "$x" = 200 ]; done
trap - ERR
echo "SELESAI. Buka https://catatanakademik.com$P lalu Ctrl+F5."
echo "Rollback: tar xzf $BK -C $APP && pm2 restart nextaja"
