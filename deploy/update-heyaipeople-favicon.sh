#!/bin/bash
# Favicon HeyAIPeople (logo dua orang): bash update-heyaipeople-favicon.sh <commit>
C="$1"; [ -n "$C" ] || { echo "pakai: bash update-heyaipeople-favicon.sh <commit>"; exit 1; }
R=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/heyaipeople-blog
D=/opt/hp-admin; W=/var/www/heyaipeople; B=/root/hp-admin.pre-favicon.$(date +%s); T=$(mktemp -d)
ICONS="favicon.svg favicon.ico favicon-16x16.png favicon-32x32.png apple-touch-icon.png icon-192.png icon-512.png"
for f in blog.js template.html; do curl -fsSL "$R/$f" -o "$T/$f" || { echo "GAGAL unduh $f"; exit 1; }; done
for f in $ICONS; do curl -fsSL "$R/favicon/$f" -o "$T/$f" || { echo "GAGAL unduh $f"; exit 1; }; done
node --check "$T/blog.js" || { echo "GAGAL cek blog.js"; exit 1; }
m() { md5sum < "$1" 2>/dev/null | cut -d' ' -f1; }
if [ "$FORCE" != "1" ] && { [ "$(m $D/blog.js)" != "8b12315031f7d558f74cd421ce470818" ] || [ "$(m $D/template.html)" != "7d223df48c827db5e426c1bf64c20f92" ]; }; then echo "BERBEDA: file live bukan versi SEO terakhir. Tidak ada yang diubah."; echo "live: $(m $D/blog.js) $(m $D/template.html)"; exit 1; fi
mkdir -p "$B/icons"; cp -a $D/blog.js $D/template.html "$B/"; cp -a $W/index.html "$B/index.html.live"
for f in $ICONS; do [ -f "$W/$f" ] && cp -a "$W/$f" "$B/icons/"; done
systemctl stop hp-admin
cp "$T/blog.js" "$T/template.html" $D/; chown www-data:www-data $D/blog.js $D/template.html
for f in $ICONS; do cp "$T/$f" "$W/$f"; chown www-data:www-data "$W/$f"; chmod 644 "$W/$f"; done
systemctl start hp-admin; sleep 4
H() { curl -sk --resolve heyaipeople.site:443:127.0.0.1 -o /dev/null -w '%{http_code} %{content_type}' "https://heyaipeople.site$1"; }
G() { curl -sk --resolve heyaipeople.site:443:127.0.0.1 "https://heyaipeople.site$1" | grep -c 'favicon.ico?v=2'; }
OK=1; [ "$(systemctl is-active hp-admin)" = "active" ] || OK=0
for f in $ICONS; do case "$(H /$f)" in 200*) ;; *) OK=0;; esac; done
[ "$(G /)" -ge 1 ] || OK=0; [ "$(G /blog/)" -ge 1 ] || OK=0
echo "service: $(systemctl is-active hp-admin) | ico: $(H /favicon.ico) | svg: $(H /favicon.svg) | apple: $(H /apple-touch-icon.png) | link beranda: $(G /) | link blog: $(G /blog/) | /admin: $(H /admin)"
if [ "$OK" != "1" ]; then echo "GAGAL, rollback..."; systemctl stop hp-admin; cp -a "$B/blog.js" "$B/template.html" $D/; cp -a "$B/index.html.live" $W/index.html; cp -a "$B/icons/." $W/ 2>/dev/null; systemctl start hp-admin; echo "rollback selesai"; exit 1; fi
echo "OK, commit $C live. Cadangan: $B"
