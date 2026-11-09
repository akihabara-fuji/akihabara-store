#!/usr/bin/env bash
# Bangun portofolio/index.html dari content.default.json + render.js.
# Pakai: bash portofolio-src/build.sh <versi-baru>   (versi wajib naik tiap deploy, contoh 20261136)
set -euo pipefail
V="${1:?versi wajib, naikkan dari versi terakhir di HANDOFF.md}"
cd "$(dirname "$0")"
node -e "const {render}=require('./render.js');const c=require('./content.default.json');require('fs').writeFileSync('../portofolio/index.html',render(c,'$V'))"
node -e "new Function(require('fs').readFileSync('../portofolio/script.js','utf8'))"
echo "OK index.html dibangun, versi $V"
