"""Pasang skrip editor blog (toolbar, pratinjau, panel SEO) ke admin/index.html. Idempoten: hanya menambah/menaikkan versi satu baris <script>."""
import re, sys
f = sys.argv[1]
V = "5"  # naikkan angka ini tiap skrip berubah, supaya cache browser tidak menyimpan versi lama
s = open(f, encoding="utf8").read()
tag = '<script src="/assets/admin-blog-seo.js?v=%s" defer></script>\n' % V
if "admin-blog-seo.js" in s:
    n = re.sub(r"admin-blog-seo\.js\?v=\d+", "admin-blog-seo.js?v=" + V, s)
    if n != s: open(f, "w", encoding="utf8").write(n)
    print("skrip SEO editor sudah terpasang (v%s)" % V); raise SystemExit(0)
i = s.rfind("</body>")
if i < 0: raise SystemExit("penanda </body> tidak ditemukan")
open(f, "w", encoding="utf8").write(s[:i] + tag + s[i:])
print("skrip SEO editor dipasang (v%s)" % V)
