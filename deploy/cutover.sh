#!/usr/bin/env bash
# Cutover: layanan akademik + blog pindah ke catatanakademik.com. Backup + rollback otomatis.
# 1) ACAD_URL dinyalakan di PM2  2) noindex domain baru dihapus  3) nextaja.com: 301 untuk /ruangakademikut* dan /blog*
# Admin (/admin, /admin/parafrase, /admin/layanan, /ms/) TETAP di nextaja.com.
set -euo pipefail
NEW=https://catatanakademik.com
APP=/var/www/mahyra-serv
BK=/root/cutover-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C /etc nginx
rollback(){ echo "GAGAL -> rollback"; tar xzf "$BK" -C /etc; nginx -t && systemctl reload nginx || true; ACAD_URL="" pm2 restart nextaja --update-env >/dev/null 2>&1 || true; pm2 save >/dev/null 2>&1 || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
NX=$(readlink -f /etc/nginx/sites-enabled/nextaja)
CA=$(readlink -f /etc/nginx/sites-enabled/catatanakademik)
# noindex dihapus di domain baru
sed -i '/X-Robots-Tag "noindex, nofollow"/d' "$CA"
# 301 di nextaja.com (diletakkan di awal blok agar mendahului lokasi regex lain)
if ! grep -q "acad-301" "$NX"; then
  sed -i '0,/server_name nextaja.com www.nextaja.com;/s//&\n    location ~ ^\/(ruangakademikut|blog)(\/|$) { return 301 https:\/\/catatanakademik.com$request_uri; } # acad-301/' "$NX"
fi
nginx -t
systemctl reload nginx
# nyalakan ACAD_URL
ACAD_URL=$NEW pm2 restart nextaja --update-env >/dev/null
pm2 save >/dev/null
sleep 5
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
R=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://nextaja.com/ruangakademikut)
H=$(c $NEW/ruangakademikut); B=$(c $NEW/blog); L=$(c https://nextaja.com/); A=$(c https://nextaja.com/admin/); AP=$(c "https://nextaja.com/admin/parafrase?embed=1")
SN=$(curl -s $NEW/sitemap.xml | grep -c 'nextaja.com' || true)
SL=$(curl -s https://nextaja.com/sitemap.xml | grep -c '<loc>' || true)
CN=$(curl -s $NEW/ruangakademikut | grep -c 'catatanakademik.com' || true)
NI=$(curl -sI $NEW/ | grep -ci 'x-robots-tag' || true)
echo "301 nextaja hub: $R (301 https://catatanakademik.com/ruangakademikut)"
echo "baru hub $H blog $B | nextaja landing $L admin $A admin-parafrase $AP (semua 200)"
echo "sitemap baru memuat nextaja: $SN (0) | sitemap nextaja jumlah loc: $SL (1) | canonical baru: $CN (>=1) | noindex baru: $NI (0)"
[ "$H" = 200 ]; [ "$B" = 200 ]; [ "$L" = 200 ]; [ "$A" = 200 ]; [ "$AP" = 200 ]
[ "$SN" = 0 ]; [ "$SL" = 1 ]; [ "$CN" -ge 1 ]; [ "$NI" = 0 ]
case "$R" in "301 https://catatanakademik.com/ruangakademikut") : ;; *) false ;; esac
trap - ERR
echo "SELESAI. Rollback: tar xzf $BK -C /etc && nginx -t && systemctl reload nginx && cd $APP && pm2 restart nextaja --update-env"
