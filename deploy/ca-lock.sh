#!/usr/bin/env bash
# Kunci kode Catatan Akademik di VPS (chattr +i) agar tidak bisa diubah tanpa sengaja oleh agen/skrip lain (mis. Hermes).
# Yang dikunci: kode aplikasi, .env, .git, konfigurasi nginx. TIDAK dikunci: data/, public/uploads, node_modules (situs tetap jalan).
#
#   bash ca-lock.sh install   pasang perintah /usr/local/sbin/ca-lock, cetak laporan, lalu kunci
#   ca-lock report            HANYA BACA: berkas yang beda dari versi live d3321cb + isi bedanya, login terakhir, kunci SSH
#   ca-lock status            tampilkan mana yang terkunci
#   ca-lock lock | unlock     kunci / buka (dicatat di /var/log/ca-lock.log)
set -euo pipefail
APP=/var/www/mahyra-serv
LOG=/var/log/ca-lock.log
LIVE_REF=d3321cb
CHECK=(blog-akun.js server.js parafrase/db.js parafrase/index.js parafrase/layanan.js parafrase/orders.js parafrase/pages.js parafrase/pages/admin.html parafrase/pages/admin.js parafrase/pages/blog-ut.html parafrase/settings.js)

targets() {
  cd "$APP"
  for p in server.js blog-akun.js package.json package-lock.json ecosystem.config.js icons.json .env .env.example .gitignore CARA-PASANG.md playwright.config.js \
           admin admin-ca parafrase studio views tests deploy .git public/assets; do
    [ -e "$p" ] && echo "$APP/$p"
  done
  for p in "$APP"/public/*; do [ -f "$p" ] && echo "$p"; done          # berkas di public/ (bukan folder uploads)
  for p in /etc/nginx/sites-available/catatanakademik /etc/nginx/sites-available/nextaja /etc/nginx/sites-enabled/nextaja; do [ -e "$p" ] && readlink -f "$p"; done | sort -u
}
note() { local from="${SSH_CLIENT:-konsol}"; echo "$(date -Is) $1 oleh ${SUDO_USER:-$(whoami)} dari ${from%% *}" >> "$LOG"; }

case "${1:-status}" in
  install)
    install -m 0755 "$0" /usr/local/sbin/ca-lock
    echo "Perintah terpasang: /usr/local/sbin/ca-lock"
    /usr/local/sbin/ca-lock report || true
    /usr/local/sbin/ca-lock lock
    ;;
  lock)
    while read -r p; do chattr -R +i "$p" 2>/dev/null || chattr +i "$p"; done < <(targets)
    note "KUNCI"; echo "TERKUNCI. Untuk deploy/ubah: ca-lock unlock  (lalu ca-lock lock lagi)."
    ;;
  unlock)
    while read -r p; do chattr -R -i "$p" 2>/dev/null || chattr -i "$p"; done < <(targets)
    note "BUKA"; echo "TERBUKA. Jangan lupa: ca-lock lock setelah selesai."
    ;;
  status)
    while read -r p; do a=$(lsattr -d "$p" 2>/dev/null | cut -c1-20); case "$a" in *i*) echo "terkunci  $p";; *) echo "TERBUKA   $p";; esac; done < <(targets)
    echo "--- 10 catatan terakhir:"; tail -n 10 "$LOG" 2>/dev/null || echo "(belum ada)"
    ;;
  report)
    cd "$APP"; T=$(mktemp -d)
    curl -fsSL "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$LIVE_REF" | tar xz -C "$T" --strip-components=1
    echo "=== berkas vs versi live $LIVE_REF ==="
    for f in "${CHECK[@]}"; do if cmp -s "$f" "$T/$f"; then echo "SAMA  $f"; else echo "BEDA  $f  (diubah $(stat -c %y "$f" | cut -d. -f1))"; fi; done
    echo "=== isi perbedaan (maks 150 baris per berkas) ==="
    for f in "${CHECK[@]}"; do cmp -s "$f" "$T/$f" || diff -u "$T/$f" "$f" | head -150; done
    echo "=== berkas kode yang diubah dalam 2 hari terakhir ==="
    find "$APP" \( -path "$APP/node_modules" -o -path "$APP/data" -o -path "$APP/public/uploads" -o -path "$APP/.git" \) -prune -o -type f -mtime -2 -printf '%TY-%Tm-%Td %TH:%TM  %p\n' | sort | tail -40
    echo "=== login SSH terakhir ==="; last -n 15 -i 2>/dev/null | head -16 || true
    echo "=== kunci SSH root yang terpasang (hanya jenis + komentar, bukan isi kunci) ==="
    awk '{print NR": "$1"  "$NF}' /root/.ssh/authorized_keys 2>/dev/null || echo "(tidak ada)"
    rm -rf "$T"
    ;;
  *) echo "pakai: ca-lock install|report|status|lock|unlock"; exit 2 ;;
esac
