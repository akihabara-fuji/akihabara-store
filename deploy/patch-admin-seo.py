"""Pasang skrip editor blog (tombol H2/H3 + daftar periksa SEO) ke admin/index.html. Idempoten, hanya menambah satu baris <script>."""
import sys
f = sys.argv[1]
s = open(f, encoding="utf8").read()
tag = '<script src="/assets/admin-blog-seo.js?v=1" defer></script>\n'
if "admin-blog-seo.js" in s:
    print("skrip SEO editor sudah terpasang"); raise SystemExit(0)
i = s.rfind("</body>")
if i < 0: raise SystemExit("penanda </body> tidak ditemukan")
open(f, "w", encoding="utf8").write(s[:i] + tag + s[i:])
print("skrip SEO editor dipasang")
