#!/usr/bin/env bash
# SEO catatanakademik.com: (1) sampul otomatis artikel diberi width/height 1200x630 (cegah layout bergeser),
# (2) 4 draf artikel UAS masuk ke menu draf blog lewat seed/artikel (TIDAK terbit sendiri).
# Tidak menyentuh skrip AdSense, ads.txt, atau berkas lain. Backup + cek + rollback otomatis.
# Jalankan sebagai root: bash update-seo.sh <commit>
set -euo pipefail
C="${1:?pakai: update-seo.sh <commit>}"
APP=/var/www/mahyra-serv
STAMP=$(date +%Y%m%d-%H%M%S); BK=/root/seo-bak-$STAMP; mkdir -p "$BK"
cd "$APP"
F=blog-akun.js
cp -a "$F" "$BK/$F"; cp -a data/blog.json "$BK/blog.json"; cp -a data/blog-seeded.json "$BK/blog-seeded.json" 2>/dev/null || true
IMM=0; lsattr -d "$F" 2>/dev/null | cut -d' ' -f1 | grep -q i && IMM=1
relock(){ [ "$IMM" = 1 ] && chattr +i "$F" 2>/dev/null || true; }
rollback(){ echo "GAGAL di baris $1 -> rollback"; chattr -i "$F" 2>/dev/null || true; cp -a "$BK/$F" "$F"; cp -a "$BK/blog.json" data/blog.json; [ -f "$BK/blog-seeded.json" ] && cp -a "$BK/blog-seeded.json" data/blog-seeded.json; pm2 restart nextaja >/dev/null 2>&1 || true; relock; }
trap 'rollback $LINENO' ERR
[ "$IMM" = 1 ] && chattr -i "$F"
T=$(mktemp -d)
curl -fsSL --retry 5 "https://codeload.github.com/akihabara-fuji/akihabara-store/tar.gz/$C" | tar xz -C "$T" --strip-components=1
python3 - <<'PY'
p = "blog-akun.js"; s = open(p).read()
old = 'alt="${esc(p.coverAlt || p.title)}" fetchpriority="high" decoding="async">${p.coverCaption'
new = 'alt="${esc(p.coverAlt || p.title)}"${/^\\/blog\\/cover\\//.test(cvSrc) ? \' width="1200" height="630"\' : ""} fetchpriority="high" decoding="async">${p.coverCaption'
if 'width="1200" height="630"' in s: print("blog-akun.js sudah ada")
else:
    assert s.count(old) == 1, "anchor tidak ditemukan"; open(p, "w").write(s.replace(old, new, 1)); print("blog-akun.js dipatch")
PY
node --check "$F"
for f in jadwal-uas-ut-2026-2 ujian-remedial-online-ut nilai-ut-keluar-kapan-2026-2 cara-membaca-ktpuo-ut; do install -m 644 "$T/seed/artikel/$f.md" "seed/artikel/$f.md"; done
rm -rf "$T"
pm2 restart nextaja >/dev/null; sleep 9
python3 - <<'PY'
import json
P = json.load(open("data/blog.json")); P = P["posts"] if isinstance(P, dict) else P
want = ["jadwal-uas-ut-2026-2", "ujian-remedial-online-ut", "nilai-ut-keluar-kapan-2026-2", "cara-membaca-ktpuo-ut"]
for w in want:
    x = [p for p in P if p.get("slug") == w]
    assert x and x[0].get("status") == "draft", w + ": draf tidak ditemukan"
    print("draf ok:", w, len(x[0].get("body", "")), "huruf")
PY
H() { curl -sk -o /dev/null -w '%{http_code}' --resolve catatanakademik.com:443:127.0.0.1 "https://catatanakademik.com$1"; }
G() { curl -sk --resolve catatanakademik.com:443:127.0.0.1 "https://catatanakademik.com$1"; }
for s in jadwal-uas-ut-2026-2 ujian-remedial-online-ut; do echo "publik /blog/$s -> $(H /blog/$s) (harus 404, masih draf)"; [ "$(H /blog/$s)" = 404 ]; done
[ "$(G /ads.txt)" = "google.com, pub-9747225711392759, DIRECT, f08c47fec0942fa0" ]; echo "ads.txt ok"
for u in / /blog /blog/cara-cek-jadwal-uas-ut; do n=$(G "$u" | grep -c 'adsbygoogle.js?client=ca-pub-9747225711392759'); echo "$u ads=$n"; [ "$n" = 1 ]; done
echo "cover width/height di artikel: $(G /blog/cara-cek-jadwal-uas-ut | grep -c 'width="1200" height="630"')"
pm2 describe nextaja | grep -q online
relock; trap - ERR
echo "OK, SEO live. Backup: $BK"
