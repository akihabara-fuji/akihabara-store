"""Tambahkan ACAD_URL ke server.js live (sitemap/robots per host, blog memakai ACAD). Idempoten. Gagal tanpa mengubah apa pun bila penanda tidak ditemukan."""
import sys
f = sys.argv[1]
s = open(f, encoding="utf8").read()
if "const ACAD =" in s:
    print("ACAD sudah dipasang"); raise SystemExit(0)
def rep(old, new):
    global s
    if s.count(old) != 1:
        raise SystemExit("penanda tidak ditemukan tepat satu kali: " + old[:70])
    s = s.replace(old, new, 1)
SITE_L = 'const SITE = (process.env.SITE_URL || "https://nextaja.com").replace(/\\/+$/, "");'
rep(SITE_L, SITE_L + '\n// Alamat rumah layanan akademik dan blog. Bila ACAD_URL belum diatur, sama dengan SITE (perilaku lama).\nconst ACAD = (process.env.ACAD_URL || SITE).replace(/\\/+$/, "");\nconst ACAD_HOSTS = ACAD === SITE ? [] : [new URL(ACAD).hostname, "www." + new URL(ACAD).hostname];\nconst isAcadHost = req => ACAD_HOSTS.includes(req.hostname);')
rep('  res.type("text/plain").send(`User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /ms/\\n\\nSitemap: ${SITE}/sitemap.xml\\n`);',
    '  const base = isAcadHost(req) ? ACAD : SITE;\n  res.type("text/plain").send(`User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /ms/\\n\\nSitemap: ${base}/sitemap.xml\\n`);')
import re
m = re.search(r'  const urls = \[\{ loc: `\$\{SITE\}/`, pri: "1\.0" \}, \{ loc: `\$\{SITE\}/blog`, pri: "0\.8" \}(?P<tail>[^\]]*)\];', s)
if not m or len(re.findall(r'  const urls = \[', s)) != 1:
    raise SystemExit("penanda sitemap tidak ditemukan")
tail = m.group("tail")
s = s[:m.start()] + ('  const urls = ACAD === SITE\n    ? [{ loc: `${SITE}/`, pri: "1.0" }, { loc: `${SITE}/blog`, pri: "0.8" }' + tail + ']\n    : isAcadHost(req)\n      ? [{ loc: `${ACAD}/blog`, pri: "0.8" }' + tail + ']\n      : [{ loc: `${SITE}/`, pri: "1.0" }];') + s[m.end():]
rep('SITE: (process.env.SITE_URL || "https://nextaja.com").replace(/\\/+$/, ""), getSettings', 'SITE: ACAD, getSettings')
open(f, "w", encoding="utf8").write(s)
print("ACAD dipasang")
