#!/usr/bin/env bash
# Pasang catatanakademik.com di nginx (berdampingan dengan nextaja.com) + SSL Let's Encrypt. nextaja.com tidak diubah.
# Sementara diberi noindex sampai cutover. Backup + rollback otomatis untuk bagian nginx.
set -euo pipefail
DOM=catatanakademik.com
AV=/etc/nginx/sites-available/catatanakademik
EN=/etc/nginx/sites-enabled/catatanakademik
BK=/root/nginx-full-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czf "$BK" -C /etc nginx
rollback(){ echo "GAGAL -> rollback"; rm -f "$EN" "$AV"; nginx -t && systemctl reload nginx || true; }
trap 'echo "GAGAL di baris $LINENO: $BASH_COMMAND"; rollback' ERR
if [ ! -e "$AV" ]; then
cat > "$AV" <<'NGX'
server {
    listen 80;
    listen [::]:80;
    server_name catatanakademik.com www.catatanakademik.com;
    client_max_body_size 30m;
    # noindex sementara (hapus saat cutover)
    add_header X-Robots-Tag "noindex, nofollow" always;
    location = / {
        rewrite ^ /ruangakademikut break;
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 300s;
    }
}
NGX
fi
ln -sf "$AV" "$EN"
nginx -t
systemctl reload nginx
sleep 1
c(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
H=$(c -H "Host: $DOM" http://127.0.0.1/)
N=$(c https://nextaja.com/)
echo "http baru / = $H (200), nextaja.com = $N (200)"
[ "$H" = 200 ]; [ "$N" = 200 ]
trap - ERR
# SSL: kegagalan di sini tidak membatalkan blok HTTP
if certbot --nginx -d "$DOM" -d "www.$DOM" --non-interactive --agree-tos --redirect; then
  nginx -t && systemctl reload nginx
  S=$(c https://$DOM/); S2=$(c https://$DOM/ruangakademikut); S3=$(c https://$DOM/blog); N2=$(c https://nextaja.com/)
  echo "https / $S, hub $S2, blog $S3, nextaja $N2 (semua 200)"
else
  echo "SSL GAGAL, situs masih HTTP saja. Cek DNS dan ulangi skrip."
fi
echo "SELESAI. Rollback nginx: tar xzf $BK -C /etc && nginx -t && systemctl reload nginx"
