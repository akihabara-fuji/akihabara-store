"""Landing: gambar maskot dan patung lewat /site-img (bisa diganti dari admin). Sitemap: tambahkan halaman Ruang Akademik. Idempoten."""
import sys, re
landing, server = sys.argv[1], sys.argv[2]
s = open(landing, encoding="utf8").read()
n = 0
for old, new in [("/assets/hero/mascot-hero-s.webp", "/site-img/hero/mascot-hero-s.webp"), ("/assets/hero/mascot-hero.webp", "/site-img/hero/mascot-hero.webp"),
                 ("/assets/hero/mascot-studio.webp", "/site-img/hero/mascot-studio.webp"), ("/assets/hero/statue-640.webp", "/site-img/hero/statue-640.webp"),
                 ("/assets/hero/statue-1000.webp", "/site-img/hero/statue-1000.webp"), ("/assets/portal/", "/site-img/portal/")]:
    n += s.count(old); s = s.replace(old, new)
open(landing, "w", encoding="utf8").write(s); print("landing: %d gambar dialihkan" % n)
t = open(server, encoding="utf8").read()
if "extra.pageUrls()" in t: print("sitemap sudah memuat Ruang Akademik")
else:
    a = "...extra.blogUrls()]"
    if a not in t: raise SystemExit("penanda sitemap di server.js tidak ditemukan")
    open(server, "w", encoding="utf8").write(t.replace(a, "...extra.pageUrls(), ...extra.blogUrls()]", 1)); print("sitemap: halaman Ruang Akademik ditambahkan")
