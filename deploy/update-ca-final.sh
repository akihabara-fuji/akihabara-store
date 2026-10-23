#!/usr/bin/env bash
# Rilis Catatan Akademik: blog publik baru, panel admin CA terpisah (/admin di catatanakademik.com),
# peran & log aktivitas, pesanan & konfirmasi pembayaran terpadu, SEO.
# Aman: berhenti tanpa mengubah apa pun bila berkas di VPS berbeda dari versi live (commit d3321cb);
# backup berkas + database dulu; cek sintaks; verifikasi setelah restart; rollback otomatis bila gagal.
# Jalankan sebagai root di VPS:  bash update-ca-final.sh <commit>
set -euo pipefail
REF="${1:?pakai: update-ca-final.sh <commit>}"
APP=/var/www/mahyra-serv
cd "$APP"

# sha256 berkas yang akan DIGANTI, sesuai versi live (commit d3321cb = snapshot 23 Okt + perbaikan foto)
declare -A OLD=(
  [blog-akun.js]=5d105cb87a9133f5dfdf8a8329bfdd9544e955acdf9439d51f1b5e8493982044
  [parafrase/db.js]=88e2db439eb56ce56170f471e6fc3dec7d4bc0e1fb1a3439f63a027e4a0f41ce
  [parafrase/index.js]=4a5c419422ce6f55afac568efd9384d26d09ccfbb054355734ad5204f0060229
  [parafrase/layanan.js]=057456b8df42f497ccdd7f316b9ee481d4b27990733e00e9f5768a4a473559eb
  [parafrase/orders.js]=e2dd763e057a770f1597a0911d4e89f0d714ae67bc4ba8a8d0c8e6bb64b11def
  [parafrase/pages.js]=01f9bd0bc57f5c1e7d51cc50f0652894273805e449cdd01acaf218044510b248
  [parafrase/pages/admin.html]=fbba6c8bcf3816665701568c46809e637c3b7ebefa03e7fc8248353ddae106f9
  [parafrase/pages/admin.js]=685d15d96695b8a87f78ffd9968cf3b6dc2d10108f43f4a48ed0a6bbce4df63b
  [parafrase/pages/blog-ut.html]=d24d930e5439175046702aadd0fa906860db52e585bb8a6341b27fedcc2e0962
  [parafrase/settings.js]=d320e6a10049c43dfa8175db42a05b84ac7d65bd086ecf3b4291213a6c3aacd5
  [server.js]=e276605b35173d4930841a2e62a0eb870837eb74568e576c61fb55a9118308ad
)
NEW=(admin-ca/auth.js admin-ca/index.js admin-ca/public/index.html admin-ca/public/app.css admin-ca/public/app.js public/assets/ca-blog.css)

for f in "${!OLD[@]}"; do
  got=$(sha256sum "$f" | cut -d' ' -f1)
  [ "$got" = "${OLD[$f]}" ] || { echo "BERHENTI: $f di VPS berbeda dari versi live yang diketahui. Tidak ada yang diubah."; exit 1; }
done
for f in "${NEW[@]}"; do [ ! -e "$f" ] || { echo "BERHENTI: $f sudah ada di VPS (rilis ganda?). Tidak ada yang diubah."; exit 1; }; done

STAMP=$(date +%Y%m%d-%H%M%S)
BK=/root/ca-final-backup-$STAMP.tgz
BKDB=/root/ca-final-parafrase-$STAMP.db
tar czf "$BK" -C "$APP" "${!OLD[@]}"
# salinan database yang konsisten walau aplikasi berjalan (API backup SQLite)
node -e "require('$APP/node_modules/better-sqlite3')('$APP/data/parafrase.db',{readonly:true}).backup('$BKDB').then(()=>console.log('backup database ok'))"
echo "Backup berkas: $BK"; echo "Backup database: $BKDB"

rollback(){
  echo "GAGAL -> rollback dari $BK"
  tar xzf "$BK" -C "$APP"
  rm -rf "$APP/admin-ca" "$APP/public/assets/ca-blog.css"
  pm2 restart nextaja --update-env >/dev/null || true
  echo "Berkas dikembalikan. Database tidak perlu dipulihkan (tabel baru tidak dipakai kode lama); salinannya tetap di $BKDB."
}
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR

T=$(mktemp -d)
curl -fsSL "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$REF" | tar xz -C "$T" --strip-components=1
for f in "${!OLD[@]}" "${NEW[@]}"; do [ -f "$T/$f" ] || { echo "Berkas $f tidak ada di commit $REF"; false; }; done
for f in server.js blog-akun.js admin-ca/auth.js admin-ca/index.js admin-ca/public/app.js parafrase/db.js parafrase/index.js parafrase/layanan.js parafrase/orders.js parafrase/pages.js parafrase/pages/admin.js parafrase/settings.js; do node --check "$T/$f"; done
mkdir -p "$APP/admin-ca/public"
for f in "${!OLD[@]}" "${NEW[@]}"; do cp "$T/$f" "$APP/$f"; done
rm -rf "$T"

pm2 restart nextaja --update-env >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' -H "Host: $1" "http://127.0.0.1:3200$2"; }
get(){ curl -fsS -H "Host: $1" "http://127.0.0.1:3200$2"; }
CA=catatanakademik.com
for u in / /blog /ruangakademikut/blog-ut /layanan-ut /sitemap.xml /robots.txt /admin/ /blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja; do x=$(c $CA "$u"); echo "$CA$u $x"; [ "$x" = 200 ]; done
get $CA /blog | grep -q 'class="bx-hero"' || { echo "Beranda blog baru tidak tampil"; false; }
get $CA /admin/ | grep -q 'Admin · Catatan Akademik' || { echo "Panel admin CA tidak tampil di /admin"; false; }
get $CA /blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja | grep -q '<figure><img src="/uploads/' || { echo "Foto di isi artikel hilang"; false; }
x=$(c $CA /ms/admin/ca/me); echo "API admin CA tanpa login: $x"; [ "$x" = 401 ]
x=$(c $CA /ms/admin/posts); echo "API blog admin tanpa login: $x"; [ "$x" = 401 ]
x=$(c $CA /halaman-tidak-ada); echo "404 bermerek: $x"; [ "$x" = 404 ]
x=$(c nextaja.com /admin/); echo "panel nextaja: $x"; [ "$x" = 200 ]
get nextaja.com /admin/ | grep -q 'Masuk panel admin' || { echo "Panel nextaja berubah tanpa sengaja"; false; }
trap - ERR

echo
echo "SELESAI. Panel admin Catatan Akademik: https://catatanakademik.com/admin/  (nama pengguna: pemilik)"
if grep -q '^CA_ADMIN_PASSWORD=' "$APP/.env" 2>/dev/null; then echo "Sandi pemilik: CA_ADMIN_PASSWORD di .env."; else echo "PENTING: CA_ADMIN_PASSWORD belum ada di .env, jadi sandi 'pemilik' masih SAMA dengan ADMIN_PASSWORD nextaja. Tambahkan baris CA_ADMIN_PASSWORD=<sandi baru min 10 karakter> ke $APP/.env lalu: pm2 restart nextaja --update-env"; fi
echo "Rollback: tar xzf $BK -C $APP && rm -rf $APP/admin-ca $APP/public/assets/ca-blog.css && pm2 restart nextaja --update-env"
