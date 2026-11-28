#!/usr/bin/env bash
# Audit SEO live catatanakademik.com (hanya baca). Memeriksa semua URL di sitemap.xml:
# status, title (30-65), meta description (70-160), jumlah H1 (=1), canonical, JSON-LD, skrip AdSense, ukuran HTML.
# Pakai: bash seo-audit.sh [batas-url]
python3 - "${1:-400}" <<'PY'
import re, sys, urllib.request, urllib.error, concurrent.futures as cf, collections
B = "https://catatanakademik.com"; LIM = int(sys.argv[1])
def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "seo-audit"}), timeout=25)
        return r.status, r.read().decode("utf8", "replace"), r.headers
    except urllib.error.HTTPError as e: return e.code, "", e.headers
    except Exception as e: return 0, "", {}
st, xml, _ = get(B + "/sitemap.xml"); print("sitemap status", st)
urls = re.findall(r"<loc>([^<]+)</loc>", xml); print("sitemap urls", len(urls), "lastmod", len(re.findall("<lastmod>", xml)))
st, rb, _ = get(B + "/robots.txt"); print("robots", st, "sitemap-line", "Sitemap:" in rb)
st, ad, _ = get(B + "/ads.txt"); print("ads.txt", st, ad.strip() == "google.com, pub-9747225711392759, DIRECT, f08c47fec0942fa0")
def chk(u):
    s, h, hd = get(u); p = {"u": u, "s": s}
    if s != 200: return p
    t = re.search(r"<title>(.*?)</title>", h, re.S); d = re.search(r'<meta name="description" content="([^"]*)"', h)
    p.update(t=len(t.group(1).strip()) if t else 0, d=len(d.group(1)) if d else 0, h1=len(re.findall(r"<h1[ >]", h)),
             can=bool(re.search(r'rel="canonical"', h)), ld=h.count("application/ld+json"), ads=h.count("adsbygoogle.js"),
             noidx="noindex" in h.lower().split("</head>")[0], sz=len(h), title=(t.group(1).strip() if t else ""), dsc=(d.group(1) if d else ""))
    return p
with cf.ThreadPoolExecutor(6) as ex: R = list(ex.map(chk, urls[:LIM]))
c = collections.Counter()
for p in R:
    if p["s"] != 200: c["status!=200"] += 1; print("BAD", p["s"], p["u"]); continue
    if not 30 <= p["t"] <= 65: c["title-len"] += 1; print("TITLE", p["t"], p["u"][len(B):])
    if not 70 <= p["d"] <= 160: c["desc-len"] += 1; print("DESC", p["d"], p["u"][len(B):])
    if p["h1"] != 1: c["h1!=1"] += 1; print("H1", p["h1"], p["u"][len(B):])
    if not p["can"]: c["no-canonical"] += 1; print("CANON", p["u"][len(B):])
    if p["noidx"]: c["noindex-in-sitemap"] += 1; print("NOINDEX", p["u"][len(B):])
    if p["ads"] != 1: c["ads!=1"] += 1; print("ADS", p["ads"], p["u"][len(B):])
    if not p["ld"]: c["no-jsonld"] += 1
tt = collections.Counter(p.get("title") for p in R if p["s"] == 200); dd = collections.Counter(p.get("dsc") for p in R if p["s"] == 200)
print("dup-title", sum(1 for k, v in tt.items() if k and v > 1), "dup-desc", sum(1 for k, v in dd.items() if k and v > 1))
print("checked", len(R), "issues", dict(c))
PY
