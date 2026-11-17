#!/bin/bash
# Pasang blog HeyAIPeople (jalankan sebagai root): bash update-heyaipeople-blog.sh <commit>
C="$1"; [ -n "$C" ] || { echo "pakai: bash update-heyaipeople-blog.sh <commit>"; exit 1; }
R=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/heyaipeople-blog
D=/opt/hp-admin; W=/var/www/heyaipeople; B=/root/hp-admin.pre-blog.$(date +%s); T=$(mktemp -d)
for f in server.js blog.js admin.html template.html; do curl -fsSL "$R/$f" -o "$T/$f" || { echo "GAGAL unduh $f"; exit 1; }; done
for f in server.js blog.js; do node --check "$T/$f" || { echo "GAGAL cek $f"; exit 1; }; done
m() { md5sum < "$1" 2>/dev/null | cut -d' ' -f1; }
if [ "$FORCE" != "1" ] && { [ "$(m $D/server.js)" != "ca5c9943f0dfecdc27fb4094b6ab7a69" ] || [ "$(m $D/template.html)" != "07d515e8ee85e0e83294acb20aa2071a" ] || [ "$(m $D/admin.html)" != "cff47dc37f43b84cf3c6c8857f732c8c" ]; }; then echo "BERBEDA: file live bukan versi terakhir yang gw kenal. Tidak ada yang diubah."; echo "live: $(m $D/server.js) $(m $D/template.html) $(m $D/admin.html)"; exit 1; fi
mkdir -p "$B"; cp -a $D/server.js $D/admin.html $D/template.html "$B/"; cp -a $W/index.html "$B/index.html.live"; cp -a $W/sitemap.xml "$B/" 2>/dev/null || true
systemctl stop hp-admin; cp -a $D/data/hp.db "$B/hp.db" 2>/dev/null || true
cp "$T/server.js" "$T/blog.js" "$T/admin.html" "$T/template.html" $D/; chown -R www-data:www-data $D
systemctl start hp-admin; sleep 4
V() { curl -sk --resolve heyaipeople.site:443:127.0.0.1 -o /dev/null -w '%{http_code}' "https://heyaipeople.site$1"; }
OK=1; [ "$(systemctl is-active hp-admin)" = "active" ] || OK=0; [ "$(V /admin)" = "200" ] || OK=0; [ "$(V /blog/)" = "200" ] || OK=0; [ "$(V /)" = "200" ] || OK=0
echo "service: $(systemctl is-active hp-admin) | /: $(V /) | /blog/: $(V /blog/) | /admin: $(V /admin) | /api/me: $(V /api/me) | sitemap: $(V /sitemap.xml)"
echo "link Blog di beranda: $(curl -sk --resolve heyaipeople.site:443:127.0.0.1 https://heyaipeople.site/ | grep -c 'href=\"/blog/\"')"
if [ "$OK" != "1" ]; then echo "GAGAL, rollback..."; systemctl stop hp-admin; cp -a "$B/server.js" "$B/admin.html" "$B/template.html" $D/; rm -f $D/blog.js; cp -a "$B/index.html.live" $W/index.html; [ -f "$B/sitemap.xml" ] && cp -a "$B/sitemap.xml" $W/; systemctl start hp-admin; echo "rollback selesai"; exit 1; fi
echo "OK, commit $C live. Cadangan: $B"
