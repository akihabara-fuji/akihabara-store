#!/usr/bin/env bash
# Perbarui HANYA halaman /sistem-kerja/ (tombol kembali + label Indonesia). Tidak menyentuh berkas lain.
# Jalankan sebagai root di VPS: bash update-sistemkerja-v2.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
F=/var/www/dikapriyadi/sistem-kerja/index.html; TS=$(date +%s); PRE=/root/sistemkerja-index.pre.$TS; NEW=/tmp/dp-sk2.$$
fail(){ echo "GAGAL di baris $1, mengembalikan"; [ -f "$PRE" ] && cp -a "$PRE" "$F"; exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$F" ]
curl -fsSL "$RAW/sistem-kerja/index.html" -o "$NEW"
grep -q '<title>Sistem Kerja Konten</title>' "$NEW"; grep -q 'DATA DEMO' "$NEW"; grep -q 'Kembali ke portofolio' "$NEW"
cp -a "$F" "$PRE"
cp "$NEW" "$F.new"; chown www-data:www-data "$F.new"; chmod 644 "$F.new"; mv "$F.new" "$F"
V=/tmp/dp-sk2v.$$
curl -fsS https://dikapriyadi.site/sistem-kerja/ -o "$V"; grep -q 'Kembali ke portofolio' "$V"
curl -fsS https://dikapriyadi.site/ -o "$V"; grep -q 'href="sistem-kerja/">Sistem Kerja</a>' "$V"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE $F"
