#!/bin/bash
# Admin HeyAIPeople tahap 3: semua teks halaman + banner bisa diubah dari admin (root): bash update-heyaipeople-admin2.sh <commit>
C="$1"; [ -n "$C" ] || { echo "pakai: bash update-heyaipeople-admin2.sh <commit>"; exit 1; }
R=https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/heyaipeople-blog
D=/opt/hp-admin; W=/var/www/heyaipeople; B=/root/hp-admin.pre-admin2.$(date +%s); T=$(mktemp -d)
for f in server.js admin.html template.html text.default.json; do curl -fsSL "$R/$f" -o "$T/$f" || { echo "GAGAL unduh $f"; exit 1; }; done
node --check "$T/server.js" || { echo "GAGAL cek server.js"; exit 1; }
m() { md5sum < "$1" 2>/dev/null | cut -d' ' -f1; }
if [ "$FORCE" != "1" ] && { [ "$(m $D/server.js)" != "123ef8997429268a78ecfe2c40465433" ] || [ "$(m $D/admin.html)" != "8ac1cf2f2d0c34724983995adc2807a6" ] || [ "$(m $D/template.html)" != "8d26afd71b3c6e9179006bd02c1658ec" ]; }; then echo "BERBEDA: file admin di VPS bukan versi terakhir. Tidak ada yang diubah."; echo "live: $(m $D/server.js) $(m $D/admin.html) $(m $D/template.html)"; exit 1; fi
mkdir -p "$B"; cp -a $D/server.js $D/admin.html $D/template.html "$B/"; cp -a $W/index.html "$B/index.html.live"; cp -a $W/sitemap.xml "$B/" 2>/dev/null || true
systemctl stop hp-admin; cp -a $D/data/hp.db "$B/hp.db" 2>/dev/null || true
cp "$T/server.js" "$T/admin.html" "$T/template.html" "$T/text.default.json" $D/; chown -R www-data:www-data $D
systemctl start hp-admin; sleep 5
V() { curl -sk --resolve heyaipeople.site:443:127.0.0.1 -o /dev/null -w '%{http_code}' "https://heyaipeople.site$1"; }
P=$(curl -sk --resolve heyaipeople.site:443:127.0.0.1 https://heyaipeople.site/)
OK=1; [ "$(systemctl is-active hp-admin)" = "active" ] || OK=0; [ "$(V /admin)" = "200" ] || OK=0; [ "$(V /blog/)" = "200" ] || OK=0; [ "$(V /)" = "200" ] || OK=0
echo "$P" | grep -q 'Hemat hingga [0-9]*% · sekali bayar' || OK=0
echo "$P" | grep -q 'KERANGKA' && OK=0
echo "service: $(systemctl is-active hp-admin) | /: $(V /) | /blog/: $(V /blog/) | /admin: $(V /admin) | sitemap: $(V /sitemap.xml) | hemat: $(echo "$P" | grep -o 'Hemat hingga [0-9]*%' | head -1) | sisa KERANGKA: $(echo "$P" | grep -c KERANGKA)"
if [ "$OK" != "1" ]; then echo "GAGAL, rollback..."; systemctl stop hp-admin; cp -a "$B/server.js" "$B/admin.html" "$B/template.html" $D/; rm -f $D/text.default.json; [ -f "$B/hp.db" ] && cp -a "$B/hp.db" $D/data/hp.db; cp -a "$B/index.html.live" $W/index.html; systemctl start hp-admin; echo "rollback selesai"; exit 1; fi
# bersihkan sisa percobaan admin kedua (jika ada)
rm -rf /opt/hey-admin /var/lib/hey-admin /etc/nginx/snippets/hey-admin.conf /etc/systemd/system/hey-admin.service 2>/dev/null; systemctl daemon-reload 2>/dev/null
echo "OK, commit $C live. Cadangan: $B"
