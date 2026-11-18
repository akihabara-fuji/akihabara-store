#!/bin/bash
# Audit SEO blog + perbaikan hero HP HeyAIPeople (root): bash update-heyaipeople-seo.sh <commit>
C="$1"; [ -n "$C" ] || { echo "pakai: bash update-heyaipeople-seo.sh <commit>"; exit 1; }
R=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/heyaipeople-blog
D=/opt/hp-admin; W=/var/www/heyaipeople; B=/root/hp-admin.pre-seo.$(date +%s); T=$(mktemp -d)
for f in server.js blog.js admin.html template.html; do curl -fsSL "$R/$f" -o "$T/$f" || { echo "GAGAL unduh $f"; exit 1; }; done
for f in server.js blog.js; do node --check "$T/$f" || { echo "GAGAL cek $f"; exit 1; }; done
m() { md5sum < "$1" 2>/dev/null | cut -d' ' -f1; }
if [ "$FORCE" != "1" ] && { [ "$(m $D/server.js)" != "123ef8997429268a78ecfe2c40465433" ] || [ "$(m $D/blog.js)" != "879929fb95e859fa13e2f220af0d1dde" ] || [ "$(m $D/template.html)" != "9228d83f2c4b9a56552f480570f7b8ba" ] || [ "$(m $D/admin.html)" != "97b4e826df9aac46a23ac4d79b2693c7" ]; }; then echo "BERBEDA: file live bukan versi blog terakhir. Tidak ada yang diubah."; echo "live: $(m $D/server.js) $(m $D/blog.js) $(m $D/template.html) $(m $D/admin.html)"; exit 1; fi
mkdir -p "$B"; cp -a $D/server.js $D/blog.js $D/admin.html $D/template.html "$B/"; cp -a $W/index.html "$B/index.html.live"; cp -a $W/sitemap.xml "$B/" 2>/dev/null || true
systemctl stop hp-admin; cp -a $D/data/hp.db "$B/hp.db" 2>/dev/null || true
cp "$T/server.js" "$T/blog.js" "$T/admin.html" "$T/template.html" $D/; chown -R www-data:www-data $D
systemctl start hp-admin; sleep 4
V() { curl -sk --resolve heyaipeople.site:443:127.0.0.1 -o /dev/null -w '%{http_code}' "https://heyaipeople.site$1"; }
OK=1; [ "$(systemctl is-active hp-admin)" = "active" ] || OK=0; [ "$(V /admin)" = "200" ] || OK=0; [ "$(V /blog/)" = "200" ] || OK=0; [ "$(V /)" = "200" ] || OK=0
HERO=$(curl -sk --resolve heyaipeople.site:443:127.0.0.1 https://heyaipeople.site/ | grep -c 'minmax(0,1fr)')
echo "service: $(systemctl is-active hp-admin) | /: $(V /) | /blog/: $(V /blog/) | /admin: $(V /admin) | sitemap: $(V /sitemap.xml) | perbaikan hero: $HERO"
if [ "$OK" != "1" ]; then echo "GAGAL, rollback..."; systemctl stop hp-admin; cp -a "$B/server.js" "$B/blog.js" "$B/admin.html" "$B/template.html" $D/; cp -a "$B/index.html.live" $W/index.html; [ -f "$B/sitemap.xml" ] && cp -a "$B/sitemap.xml" $W/; systemctl start hp-admin; echo "rollback selesai"; exit 1; fi
echo "OK, commit $C live. Cadangan: $B"
