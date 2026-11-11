#!/bin/bash
# Alihkan analisa.sahabatanalisis.tech ke nextaja.com/analisa (308 menjaga metode). Backup, nginx -t, rollback.
set -e
F=/etc/nginx/sites-enabled/analisa
grep -q 'nextaja.com/analisa' "$F" && { echo "sudah dialihkan"; exit 0; }
B=/root/analisa.nginx.bak-$(date +%s); cp "$F" "$B"
LOCKED=0; lsattr "$F" 2>/dev/null | cut -c5 | grep -q i && LOCKED=1
[ $LOCKED = 1 ] && chattr -i "$F"
trap '[ $LOCKED = 1 ] && chattr +i "$F"' EXIT
python3 - <<'PY'
import re
f='/etc/nginx/sites-enabled/analisa'; s=open(f).read()
n=re.sub(r'location / \{.*?\n    \}', 'location / { return 308 https://nextaja.com/analisa$request_uri; }', s, count=1, flags=re.S)
if n==s: raise SystemExit('blok location / tidak ketemu')
open(f,'w').write(n)
PY
if nginx -t 2>/dev/null && systemctl reload nginx; then
  sleep 1
  L=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://analisa.sahabatanalisis.tech/ || true)
  N=$(curl -s -o /dev/null -w '%{http_code}' https://nextaja.com/analisa/ || true)
  echo "lama: $L | baru: $N"
  if [ "$N" != "200" ]; then cp "$B" "$F"; nginx -t 2>/dev/null && systemctl reload nginx; echo "GAGAL, dikembalikan"; exit 1; fi
  echo "OK domain lama dialihkan"
else
  cp "$B" "$F"; echo "nginx -t gagal, dikembalikan"; exit 1
fi
