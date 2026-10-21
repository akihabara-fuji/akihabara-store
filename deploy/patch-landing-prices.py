"""Landing: harga di bagian Ruang Akademik ikut pengaturan admin (/ms/public-config). Idempoten."""
import re, sys
f = sys.argv[1]
s = open(f, encoding="utf8").read()
m = re.search(r'<section\b[^>]*\bid="akademik"[^>]*>.*?</section>', s, flags=re.S)
if not m:
    raise SystemExit("section akademik tidak ditemukan")
sec = m.group(0)
new = sec
for a, b in [
    ("Paket Rp919.000", 'Paket Rp<span data-p="price_metopen_paket">919.000</span>'),
    ("Mulai Rp35.000", 'Mulai Rp<span data-p="audit_min">35.000</span>'),
    ("1 semester Rp99.000", '1 semester Rp<span data-p="price_pengarahan_semester">99.000</span>'),
    ("sampai lulus Rp199.000", 'sampai lulus Rp<span data-p="price_pengarahan_lulus">199.000</span>'),
]:
    new = new.replace(a, b)
if new != sec:
    s = s.replace(sec, new, 1)
if "data-p-sync" not in s:
    js = ('<script data-p-sync>fetch("/ms/public-config").then(function(r){return r.json()}).then(function(c){'
          'document.querySelectorAll("[data-p]").forEach(function(e){var v=c[e.getAttribute("data-p")];'
          'if(v!=null)e.textContent=Number(v).toLocaleString("id-ID")})}).catch(function(){})</script>\n')
    i = s.rfind("</body>")
    s = s[:i] + js + s[i:]
open(f, "w", encoding="utf8").write(s)
print("landing: harga akademik sinkron dengan admin")
