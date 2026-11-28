#!/usr/bin/env bash
# Pasang Google AdSense (Iklan Otomatis) + /ads.txt di catatanakademik.com. Hanya menambah:
#  - parafrase/tema.js : skrip adsbygoogle di <head> lewat inject() pusat (hanya host catatanakademik.com, tanpa halaman noindex)
#  - parafrase/pages.js: kirim hostname ke inject()
#  - server.js         : route GET /ads.txt (domain akademik)
#  - halaman statis Kisi-kisi: dibangun ulang dari branch kisi-kisi
# Patch ditempel pada berkas VPS apa adanya (tidak menimpa perubahan lain). Backup + cek + rollback otomatis.
# Jalankan sebagai root: bash update-ads.sh <commit-kisi-kisi>
set -euo pipefail
KISI="${1:?pakai: update-ads.sh <commit-kisi-kisi>}"
APP=/var/www/mahyra-serv
KK=/var/www/kisi-kisi/dist
STAMP=$(date +%Y%m%d-%H%M%S); BK=/root/ads-bak-$STAMP; mkdir -p "$BK/parafrase"
cd "$APP"
FILES=(parafrase/tema.js parafrase/pages.js server.js)
declare -A IMM
for f in "${FILES[@]}"; do cp -a "$f" "$BK/$f"; lsattr -d "$f" 2>/dev/null | cut -d' ' -f1 | grep -q i && IMM[$f]=1 || IMM[$f]=0; done
[ -d "$KK" ] && cp -a "$KK" "$BK/kisi-dist"
relock(){ for f in "${FILES[@]}"; do [ "${IMM[$f]}" = 1 ] && chattr +i "$f" 2>/dev/null || true; done; }
rollback(){ echo "GAGAL di baris $1 -> rollback"; for f in "${FILES[@]}"; do chattr -i "$f" 2>/dev/null || true; cp -a "$BK/$f" "$f"; done; [ -d "$BK/kisi-dist" ] && { rm -rf "$KK"; cp -a "$BK/kisi-dist" "$KK"; }; pm2 restart nextaja >/dev/null 2>&1 || true; relock; exit 1; }
trap 'rollback $LINENO' ERR
for f in "${FILES[@]}"; do [ "${IMM[$f]}" = 1 ] && chattr -i "$f"; done
python3 - <<'PY'
import re
ADS = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9747225711392759" crossorigin="anonymous"></script>'
def patch(p, old, new, marker):
    s = open(p).read()
    if marker in s: print(p, "sudah ada"); return
    assert s.count(old) == 1, p + ": anchor tidak ditemukan"
    open(p, "w").write(s.replace(old, new, 1)); print(p, "dipatch")
patch("parafrase/tema.js",
 'const inject = (html, v) => { const h = head(v); return h ? html.replace("</head>", h + "</head>") : html; };',
 "/* Google AdSense (Iklan Otomatis): satu skrip di <head>, hanya halaman publik catatanakademik.com; halaman admin/privat (noindex) tanpa iklan. */\n"
 "const ADS = '" + ADS + "';\n"
 "const adsOk = (html, host) => (host === undefined || /(^|\\.)catatanakademik\\.com$/i.test(String(host))) && !/noindex/i.test(html) && !html.includes(\"adsbygoogle.js\");\n"
 'const inject = (html, v, host) => { const h = head(v) + (adsOk(html, host) ? ADS : ""); return h ? html.replace("</head>", () => h + "</head>") : html; };',
 "adsbygoogle.js")
patch("parafrase/pages.js",
 'return tema.inject(shorten(out), settings ? settings.get("ca_tema") : "");',
 'return tema.inject(shorten(out), settings ? settings.get("ca_tema") : "", req ? req.hostname : undefined);',
 'req ? req.hostname : undefined')
patch("server.js",
 'app.get("/robots.txt", (req, res) => {',
 '/* ads.txt Google AdSense: hanya untuk domain akademik (catatanakademik.com). */\n'
 'app.get("/ads.txt", (req, res) => (isAcadHost(req) ? res.type("text/plain").send("google.com, pub-9747225711392759, DIRECT, f08c47fec0942fa0\\n") : res.status(404).type("text").send("Not found")));\n'
 'app.get("/robots.txt", (req, res) => {',
 'app.get("/ads.txt"')
PY
for f in "${FILES[@]}"; do node --check "$f"; done
# halaman statis Kisi-kisi
T=$(mktemp -d); trap 'rm -rf "$T"; rollback $LINENO' ERR
curl -fsSL --retry 5 "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$KISI" | tar xz -C "$T" --strip-components=1
(cd "$T/kisi" && node check.js >/dev/null && node build.js >/dev/null)
grep -q 'adsbygoogle.js' "$T/kisi/dist/index.html"
rm -rf "$KK".new && cp -a "$T/kisi/dist" "$KK".new && rm -rf "$KK" && mv "$KK".new "$KK"
chmod -R a+rX "$KK"
pm2 restart nextaja >/dev/null; sleep 6
C() { curl -sk --resolve catatanakademik.com:443:127.0.0.1 "https://catatanakademik.com$1"; }
[ "$(C /ads.txt)" = "google.com, pub-9747225711392759, DIRECT, f08c47fec0942fa0" ]
echo "ads.txt ok"
CT=$(curl -sk -o /dev/null -w '%{content_type}' --resolve catatanakademik.com:443:127.0.0.1 https://catatanakademik.com/ads.txt); echo "content-type: $CT"
for u in / /blog /layanan /kisi-kisi/ /kisi-kisi/ekma4116-manajemen/; do
  n=$(C "$u" | grep -c 'adsbygoogle.js?client=ca-pub-9747225711392759'); echo "$u ads=$n"; [ "$n" = 1 ]
done
ART=$(C /blog | grep -o 'href="/blog/[^"#?]*"' | head -1 | cut -d'"' -f2); [ -n "$ART" ] && { n=$(C "$ART" | grep -c 'adsbygoogle.js'); echo "$ART ads=$n"; [ "$n" = 1 ]; }
n=$(curl -sk --resolve nextaja.com:443:127.0.0.1 https://nextaja.com/ | grep -c adsbygoogle || true); echo "nextaja.com ads=$n"
pm2 describe nextaja | grep -q online
relock
trap - ERR
echo "OK, AdSense live. Backup: $BK"
