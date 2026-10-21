"""Landing: pasang pelacak /t.js (ID diatur dari admin). Idempoten."""
import sys
f = sys.argv[1]; s = open(f, encoding="utf8").read()
if "/t.js" in s: print("pelacak sudah ada")
else:
    i = s.find("</head>")
    if i < 0: raise SystemExit("</head> tidak ditemukan")
    s = s[:i] + '<script async src="/t.js"></script>\n' + s[i:]
    open(f, "w", encoding="utf8").write(s); print("pelacak dipasang di landing")
