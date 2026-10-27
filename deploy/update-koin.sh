#!/usr/bin/env bash
# Rilis Catatan Akademik "koin": sistem koin & akun gratis, Audit/Cek/Parafrase terbaru, impor artikel .md,
# peta warna mode gelap, daftar temuan Audit ringkas, Kalkulator/Sitasi/Pas Foto, dsb. (branch feat/koin).
#
# Aman (pola sama dengan update-ca-final.sh):
#  - Setiap berkas kode di VPS harus SAMA dengan salah satu versi yang dikenal atau belum ada.
#    Ada perubahan lain -> berhenti tanpa mengubah apa pun.
#  - package.json (dependensi) di VPS harus sama dengan rilis; bila beda -> berhenti (npm install tidak dijalankan otomatis).
#  - Backup berkas kode + database dulu; cek sintaks; verifikasi setelah restart; rollback otomatis bila gagal.
#  - Bila ca-lock terpasang: dibuka hanya selama rilis, lalu dikunci lagi (juga saat rollback).
#  - Tidak menyentuh panel/landing nextaja (admin/index.html, public/index.html) maupun data/.
# Jalankan sebagai root di VPS:  bash update-koin.sh <commit>
set -euo pipefail
REF="${1:?pakai: update-koin.sh <commit>}"
APP="${APP:-/var/www/mahyra-serv}"
KNOWN=(d3321cb ea4b557 4a8953e 3f29ccc e31a933 08cf5f2 12cfe4a dc31d36 c7f60c8 1b5c15a ec8523c 091972e 54d72bc 1574580 b623210 b3ad6ff 40d7848 bc2a821 256add9 1c861f1 8aaef92 4adfff0 ac04263 fbd0646 c5aed04 1366e15 3520907 beee9ca 30de5e8 8430614 e9dc347 24d1beb c8ef2a9 6c293b0 1dd323d 394b043 453b928 07d62b2 25df56b feabda8 cc24c43 728e5dd a5060eb bef8f54 c2a6ac3)
GH="${GH:-https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz}"
cd "$APP"

T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/new"; curl -fsSL "$GH/$REF" | tar xz -C "$T/new" --strip-components=1
for k in "${KNOWN[@]}"; do mkdir -p "$T/$k"; curl -fsSL "$GH/$k" | tar xz -C "$T/$k" --strip-components=1; done

# dependensi harus sama (rilis ini tidak menambah paket)
dep(){ node -e "const p=require('$1');console.log(JSON.stringify([p.dependencies,p.optionalDependencies]))"; }
[ "$(dep "$APP/package.json")" = "$(dep "$T/new/package.json")" ] || { echo "BERHENTI: dependensi package.json di VPS beda dengan rilis. Tidak ada yang diubah."; exit 1; }

mapfile -t FILES < <(cd "$T/new" && { ls server.js blog-akun.js blog-import.js blog-seo.js blog-cover.js rev-metopen.png; find parafrase admin-ca public/assets/galeri public/assets/fonts -type f; ls public/assets/ca-blog.css public/assets/blog.css public/assets/admin-blog-seo.css public/assets/admin-blog-seo.js; } | sort)
echo "Memeriksa ${#FILES[@]} berkas…"
bad=0
for f in "${FILES[@]}"; do
  [ -e "$f" ] || continue
  cmp -s "$f" "$T/new/$f" && continue
  ok=0; for k in "${KNOWN[@]}"; do [ -f "$T/$k/$f" ] && cmp -s "$f" "$T/$k/$f" && ok=1 && break; done
  [ $ok = 1 ] || { echo "  TIDAK DIKENAL: $f (diubah $(stat -c %y "$f" | cut -d. -f1))"; bad=1; }
done
[ $bad = 0 ] || { echo "BERHENTI: ada berkas di VPS yang berubah di luar versi yang dikenal. Tidak ada yang diubah. Kirim daftar di atas untuk dicek."; exit 1; }
echo "Semua berkas dikenal."

STAMP=$(date +%Y%m%d-%H%M%S)
BK=/root/koin-backup-$STAMP.tgz
BKDB=/root/koin-parafrase-$STAMP.db
EXIST=(); for f in "${FILES[@]}"; do [ -e "$f" ] && EXIST+=("$f"); done
tar czf "$BK" -C "$APP" "${EXIST[@]}"
printf '%s\n' "${FILES[@]}" > "$BK.files"
node -e "require('$APP/node_modules/better-sqlite3')('$APP/data/parafrase.db',{readonly:true}).backup('$BKDB').then(()=>console.log('backup database ok'))"
echo "Backup berkas: $BK"; echo "Backup database: $BKDB"

LOCK=0; command -v ca-lock >/dev/null && LOCK=1
relock(){ [ $LOCK = 1 ] && ca-lock lock >/dev/null && echo "Kode dikunci lagi (ca-lock)." || true; }
rollback(){
  echo "GAGAL -> rollback dari $BK"
  for f in "${FILES[@]}"; do case " ${EXIST[*]} " in *" $f "*) ;; *) rm -f "$APP/$f";; esac; done
  tar xzf "$BK" -C "$APP"
  pm2 restart nextaja --update-env >/dev/null || true
  relock
  echo "Berkas dikembalikan. Database: server baru menambah tabel/kolom saja; bila perlu pulihkan dari $BKDB (hentikan app dulu)."
}
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback; rm -rf "$T"' ERR

for f in "${FILES[@]}"; do case "$f" in *.js) node --check "$T/new/$f";; esac; done
[ $LOCK = 1 ] && ca-lock unlock >/dev/null && echo "Kunci dibuka sementara untuk rilis."
for f in "${FILES[@]}"; do mkdir -p "$(dirname "$APP/$f")"; cp "$T/new/$f" "$APP/$f"; done

pm2 restart nextaja --update-env >/dev/null
sleep 5
# cek lewat nginx di server ini (HTTPS, seperti pengunjung)
c(){ curl -s -o /dev/null -w '%{http_code}' --resolve "$1:443:127.0.0.1" "https://$1$2"; }
get(){ curl -fsS --resolve "$1:443:127.0.0.1" "https://$1$2"; }
has(){ local b; b=$(get "$1" "$2") || return 1; [[ "$b" == *"$3"* ]]; }
CA="${CA_HOST:-catatanakademik.com}"
for u in / /blog /sitemap.xml /robots.txt /admin/ /layanan /portal-ut /kalkulator-nilai-ut /ms/layanan/config /ms/galeri /buat-cv-ats /sampul-tugas /surat-lamaran /tracker-kelulusan /kalender-akademik /panduan-maba; do x=$(c $CA "$u"); echo "$CA$u $x"; [ "$x" = 200 ]; done
x=$(c $CA /ruangakademikut/audit); echo "$CA/ruangakademikut/audit $x"; [ "$x" = 200 ] || [ "$x" = 301 ]
has $CA /admin/ 'Admin · Catatan Akademik' || { echo "Panel admin CA tidak tampil di /admin"; false; }
has $CA /ms/layanan/config 'metopen' || { echo "Konfigurasi layanan tidak terbaca"; false; }
echo "Isi halaman: OK"
for u in /ms/admin/ca/me /ms/admin/posts /ms/admin/koin; do x=$(c $CA $u); echo "API $u tanpa login: $x"; [ "$x" = 401 ]; done
x=$(c $CA /halaman-tidak-ada); echo "404: $x"; [ "$x" = 404 ]
trap - ERR
relock

echo
echo "SELESAI. Cek manual: login https://$CA/admin/ -> Blog -> 'Impor file .md' (1 contoh jadi draf) -> Preview; /ruangakademikut/audit mode gelap; /koin harus dialihkan ke /layanan."
echo "Rollback: ca-lock unlock; xargs -a $BK.files -I{} rm -f $APP/{}; tar xzf $BK -C $APP && pm2 restart nextaja --update-env; ca-lock lock"
