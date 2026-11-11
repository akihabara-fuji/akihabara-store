#!/usr/bin/env bash
# Pasang beranda nextaja.com baru (tanpa urusan UT, analisa TikTok ke /analisa-tiktok).
# Aman: berkas public/index.html di VPS harus sama dengan versi sebelumnya (BASE); kalau beda, berhenti tanpa mengubah apa pun.
# Backup dulu, pasang, verifikasi lewat aplikasi lokal; rollback otomatis bila gagal.
# Jalankan sebagai root di VPS:  bash update-nextaja-landing.sh <commit> <commit-versi-sebelumnya>
set -euo pipefail
REF="${1:?pakai: update-nextaja-landing.sh <commit> <base>}"; BASE="${2:?base}"
APP="${APP:-/var/www/mahyra-serv}"; GH="https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
for r in "$REF:new" "$BASE:base"; do mkdir -p "$T/${r#*:}"; curl -fsSL --retry 6 --retry-delay 4 "$GH/${r%%:*}" | tar xz -C "$T/${r#*:}" --strip-components=1; done
F=public/index.html
if ! cmp -s "$APP/$F" "$T/base/$F" && ! cmp -s "$APP/$F" "$T/new/$F"; then
  echo "BERHENTI: $F di VPS beda dengan versi sebelumnya ($BASE). Tidak ada yang diubah."; diff <(cat "$APP/$F") "$T/base/$F" | head -c 600 || true; exit 1
fi
LOCK=0; command -v ca-lock >/dev/null && LOCK=1
relock(){ [ $LOCK = 1 ] && ca-lock lock >/dev/null && echo "Kode dikunci lagi (ca-lock)." || true; }
trap 'relock; rm -rf "$T"' EXIT
[ $LOCK = 1 ] && ca-lock unlock >/dev/null
BK=/root/nextaja-landing-backup-$(date +%Y%m%d-%H%M%S).html; cp "$APP/$F" "$BK"; echo "Backup: $BK"
cp "$T/new/$F" "$APP/$F"
sleep 1
if curl -fsS http://127.0.0.1:3200/ | grep -q "Analisa Akun TikTok" && ! curl -fsS http://127.0.0.1:3200/ | grep -qi "Mahasiswa UT"; then
  echo "SELESAI. Beranda nextaja versi ${REF:0:7} aktif."
else
  cp "$BK" "$APP/$F"; echo "GAGAL verifikasi, dikembalikan dari $BK"; exit 1
fi
