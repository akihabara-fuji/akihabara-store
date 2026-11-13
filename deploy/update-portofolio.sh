#!/usr/bin/env bash
# Deploy portofolio dikapriyadi.catatanakademik.com. Jalankan sebagai root di VPS: bash update-portofolio.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
REPO=akihabara-fuji/akihabara-store
RAW="https://raw.githubusercontent.com/$REPO/$C/portofolio"
ROOT=/var/www/dikapriyadi
NEW=/tmp/porto-new-$$
BAK="$ROOT.prev-$(date +%s)"
fail(){ echo "GAGAL di baris $1, rollback"; [ -d "$BAK" ] && { rm -rf "$ROOT"; mv "$BAK" "$ROOT"; }; exit 1; }
trap 'fail $LINENO' ERR
set -e
mkdir -p "$NEW/assets" "$NEW/v"
for f in index.html karya.json v/hero_robot.webp v/ks-1.webp v/ks-2.webp v/ks-3.webp v/ks-4.webp v/ks-5.webp v/ks-6.webp v/produksi_ai.jpg v/produksi_ai_full.mp4 v/hero_dika.webp v/hero_dika_bw.webp v/hands-cutout.png style.css script.js lanyard.js gf.js v/an1.jpg v/an2.jpg v/an3.jpg v/an4.jpg v/an5.jpg v/an6.jpg v/blouse.jpg v/blouse_full.mp4 v/car1.jpg v/car2.jpg v/car3.jpg v/car4.jpg v/car5.jpg v/car6.jpg v/car7.jpg v/es.jpg v/es.mp4 v/es_full.mp4 v/jeans.jpg v/jeans.mp4 v/jeans_full.mp4 v/kids.jpg v/kids_full.mp4 v/naya1.jpg v/naya1.mp4 v/naya1_full.mp4 v/naya2.jpg v/naya2.mp4 v/naya2_full.mp4 v/student.jpg v/student_full.mp4 v/tuntasync.jpg v/tuntasync.mp4 v/tuntasync_full.mp4 v/uaop.jpg v/uaop_full.mp4 v/wide.jpg v/wide_full.mp4 v/bot.jpg v/bot.mp4 v/bot_full.mp4 assets/m1.webp assets/CV_Dika_Priyadi.pdf assets/k-admin.webp assets/k-analisa1.webp assets/k-analisa2.webp assets/k-bot.webp assets/f-lapangan.webp assets/f-kafe.webp assets/f-selamat.webp assets/f-sadewa.webp assets/f-ramadhan.webp assets/c-1.webp assets/c-2.webp assets/c-3.webp assets/c-4.webp assets/c-5.webp assets/c-6.webp assets/c-7.webp assets/v-cek-nilai.mp4 assets/v-cek-nilai.webp assets/v-es-krim.mp4 assets/v-es-krim.webp assets/v-explainer.mp4 assets/v-explainer.webp assets/v-jeans-flare.mp4 assets/v-jeans-flare.webp assets/v-jeans-wide.mp4 assets/v-jeans-wide.webp assets/v-mga-iklan.mp4 assets/v-mga-iklan.webp assets/v-naya-1.mp4 assets/v-naya-1.webp assets/v-showcase.mp4 assets/v-showcase.webp assets/v-tuntasync.mp4 assets/v-tuntasync.webp assets/v-uaop.mp4 assets/v-uaop.webp og.jpg favicon.svg apple-touch-icon.png robots.txt sitemap.xml; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
grep -q 'Dika Priyadi' "$NEW/index.html"
[ "$(stat -c %s "$NEW/assets/m1.webp")" -gt 10000 ]
cp -a "$ROOT" "$BAK"
rm -f "$ROOT"/index.html "$ROOT"/style.css "$ROOT"/script.js "$ROOT"/lanyard.js "$ROOT"/gf.js
cp "$NEW"/index.html "$NEW"/style.css "$NEW"/script.js "$NEW"/lanyard.js "$NEW"/gf.js "$ROOT"/
mkdir -p "$ROOT/v" && cp "$NEW"/v/* "$ROOT/v/"
mkdir -p "$ROOT/assets" && cp "$NEW"/assets/* "$ROOT/assets/"
cp "$NEW"/karya.json "$ROOT"/
cp "$NEW"/og.jpg "$NEW"/favicon.svg "$NEW"/apple-touch-icon.png "$NEW"/robots.txt "$NEW"/sitemap.xml "$ROOT"/
chown -R www-data:www-data "$ROOT"; chmod -R a+rX "$ROOT"
for p in / /style.css /script.js /lanyard.js /gf.js /karya.json /v/hero_robot.webp /v/ks-1.webp /v/ks-6.webp /v/produksi_ai.jpg /v/produksi_ai_full.mp4 /v/hero_dika.webp /v/hero_dika_bw.webp /v/hands-cutout.png /v/jeans_full.mp4 /v/bot_full.mp4 /assets/m1.webp /assets/CV_Dika_Priyadi.pdf /assets/k-bot.webp /assets/f-sadewa.webp /assets/c-1.webp /assets/v-uaop.mp4 /og.jpg /favicon.svg /robots.txt /sitemap.xml; do
  s=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: dikapriyadi.catatanakademik.com' "http://127.0.0.1$p"); echo "$p $s"
  [ "$s" = 200 ] || [ "$s" = 301 ] || fail $LINENO
done
echo "OK, commit $C live. Cadangan: $BAK"
