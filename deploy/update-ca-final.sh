#!/usr/bin/env bash
# Rilis Catatan Akademik: blog publik baru, panel admin CA terpisah (/admin di catatanakademik.com),
# peran & log aktivitas, pesanan & konfirmasi pembayaran terpadu, SEO; termasuk pekerjaan fix/akun-sesi.
#
# Aman:
#  - Setiap berkas kode di VPS harus SAMA dengan salah satu versi yang dikenal (rilis foto d3321cb, atau deploy
#    fix/akun-sesi ea4b557) atau belum ada. Ada perubahan lain -> berhenti tanpa mengubah apa pun.
#  - Backup semua berkas kode + database dulu; cek sintaks; verifikasi setelah restart; rollback otomatis bila gagal.
#  - Bila ca-lock terpasang: dibuka hanya selama rilis, lalu dikunci lagi (juga saat rollback).
# Jalankan sebagai root di VPS:  bash update-ca-final.sh <commit>
set -euo pipefail
REF="${1:?pakai: update-ca-final.sh <commit>}"
APP=/var/www/mahyra-serv
KNOWN=(d3321cb ea4b557 4a8953e 3f29ccc e31a933 08cf5f2 12cfe4a dc31d36)   # 4a8953e = rilis CA pertama (live 23 Okt 14:17 WIB)
GH=https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz
cd "$APP"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/new"; curl -fsSL "$GH/$REF" | tar xz -C "$T/new" --strip-components=1
for k in "${KNOWN[@]}"; do mkdir -p "$T/$k"; curl -fsSL "$GH/$k" | tar xz -C "$T/$k" --strip-components=1; done

# daftar berkas yang dipasang: kode aplikasi akademik (bukan data, bukan panel/landing nextaja)
mapfile -t FILES < <(cd "$T/new" && { ls server.js blog-akun.js; find parafrase admin-ca -type f; ls public/assets/ca-blog.css public/assets/blog.css public/assets/admin-blog-seo.css public/assets/admin-blog-seo.js; } | sort)
echo "Memeriksa ${#FILES[@]} berkas…"
bad=0
for f in "${FILES[@]}"; do
  [ -e "$f" ] || continue                                  # berkas baru
  cmp -s "$f" "$T/new/$f" && continue                      # sudah sama dengan rilis
  ok=0; for k in "${KNOWN[@]}"; do [ -f "$T/$k/$f" ] && cmp -s "$f" "$T/$k/$f" && ok=1 && break; done
  [ $ok = 1 ] || { echo "  TIDAK DIKENAL: $f (diubah $(stat -c %y "$f" | cut -d. -f1))"; bad=1; }
done
[ $bad = 0 ] || { echo "BERHENTI: ada berkas di VPS yang berubah di luar versi yang dikenal. Tidak ada yang diubah. Jalankan 'ca-lock report' (atau kirim daftar di atas) untuk dicek."; exit 1; }
echo "Semua berkas dikenal."

STAMP=$(date +%Y%m%d-%H%M%S)
BK=/root/ca-final-backup-$STAMP.tgz
BKDB=/root/ca-final-parafrase-$STAMP.db
EXIST=(); for f in "${FILES[@]}"; do [ -e "$f" ] && EXIST+=("$f"); done
tar czf "$BK" -C "$APP" "${EXIST[@]}"
printf '%s\n' "${FILES[@]}" > "$BK.files"
node -e "require('$APP/node_modules/better-sqlite3')('$APP/data/parafrase.db',{readonly:true}).backup('$BKDB').then(()=>console.log('backup database ok'))"
echo "Backup berkas: $BK"; echo "Backup database: $BKDB"

LOCK=0; command -v ca-lock >/dev/null && LOCK=1
relock(){ [ $LOCK = 1 ] && ca-lock lock >/dev/null && echo "Kode dikunci lagi (ca-lock)." || true; }
rollback(){
  echo "GAGAL -> rollback dari $BK"
  for f in "${FILES[@]}"; do case " ${EXIST[*]} " in *" $f "*) ;; *) rm -f "$APP/$f";; esac; done   # buang berkas yang baru dibuat
  tar xzf "$BK" -C "$APP"
  pm2 restart nextaja --update-env >/dev/null || true
  relock
  echo "Berkas dikembalikan. Database tidak perlu dipulihkan (tabel baru diabaikan kode lama); salinannya di $BKDB."
}
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback; rm -rf "$T"' ERR

for f in "${FILES[@]}"; do case "$f" in *.js) node --check "$T/new/$f";; esac; done
[ $LOCK = 1 ] && ca-lock unlock >/dev/null && echo "Kunci dibuka sementara untuk rilis."
for f in "${FILES[@]}"; do mkdir -p "$(dirname "$APP/$f")"; cp "$T/new/$f" "$APP/$f"; done

pm2 restart nextaja --update-env >/dev/null
sleep 5
# cek lewat nginx di server ini (HTTPS, sama seperti pengunjung), supaya URL pendek nginx (/layanan-ut, /blog-ut) ikut teruji
c(){ curl -s -o /dev/null -w '%{http_code}' --resolve "$1:443:127.0.0.1" "https://$1$2"; }
get(){ curl -fsS --resolve "$1:443:127.0.0.1" "https://$1$2"; }
# isi halaman diambil utuh dulu, baru dicari (pipa "curl | grep -q" memutus curl di tengah jalan dan gagal saat pipefail aktif)
has(){ local b; b=$(get "$1" "$2") || return 1; [[ "$b" == *"$3"* ]]; }
CA=catatanakademik.com
for u in / /blog /blog-ut /layanan-ut /sitemap.xml /robots.txt /admin/ /blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja; do x=$(c $CA "$u"); echo "$CA$u $x"; [ "$x" = 200 ]; done
has $CA /blog 'class="bx-hero"' || { echo "Beranda blog baru tidak tampil"; false; }
has $CA /admin/ 'Admin · Catatan Akademik' || { echo "Panel admin CA tidak tampil di /admin"; false; }
has $CA /blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja '<figure><img src="/uploads/' || { echo "Foto di isi artikel hilang"; false; }
has $CA /sitemap.xml '/layanan-ut<' || { echo "Halaman layanan hilang dari sitemap"; false; }
has $CA /ms/layanan/config 'metopen' || { echo "Konfigurasi layanan (Metopen) tidak terbaca"; false; }
echo "Isi halaman baru: OK"
x=$(c $CA /ms/admin/ca/me); echo "API admin CA tanpa login: $x"; [ "$x" = 401 ]
x=$(c $CA /ms/admin/posts); echo "API blog admin tanpa login: $x"; [ "$x" = 401 ]
x=$(c $CA /halaman-tidak-ada); echo "404 bermerek: $x"; [ "$x" = 404 ]
x=$(c nextaja.com /admin/); echo "panel nextaja: $x"; [ "$x" = 200 ]
has nextaja.com /admin/ 'Masuk panel admin' || { echo "Panel nextaja berubah tanpa sengaja"; false; }
trap - ERR
relock

echo
echo "SELESAI. Panel admin Catatan Akademik: https://catatanakademik.com/admin/  (nama pengguna: pemilik)"
if grep -q '^CA_ADMIN_PASSWORD=' "$APP/.env" 2>/dev/null; then echo "Sandi pemilik: CA_ADMIN_PASSWORD di .env."; else echo "PENTING: CA_ADMIN_PASSWORD belum ada di .env, jadi sandi 'pemilik' masih SAMA dengan ADMIN_PASSWORD nextaja."; fi
echo "Rollback: ca-lock unlock; xargs -a $BK.files -I{} rm -f $APP/{}; tar xzf $BK -C $APP && pm2 restart nextaja --update-env; ca-lock lock"
