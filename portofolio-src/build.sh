#!/usr/bin/env bash
# Bangun portofolio/index.html (landing grid kartu) dari grid.json + render-grid.js.
# Pakai: bash portofolio-src/build.sh <versi-baru>   (versi wajib naik tiap deploy)
set -euo pipefail
V="${1:?versi wajib, naikkan dari versi terakhir di HANDOFF.md}"
cd "$(dirname "$0")"
node render-grid.js "$V"
node -e "new Function(require('fs').readFileSync('../portofolio/script.js','utf8'))"
grep -q 'Solusi digital' ../portofolio/index.html || { echo "GAGAL: frasa 'Solusi digital' wajib ada (dicek skrip deploy)"; exit 1; }
echo "OK versi $V"
