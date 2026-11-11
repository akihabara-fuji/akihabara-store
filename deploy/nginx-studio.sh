#!/bin/bash
# Arahkan nextaja.com/studio.html ke aplikasi (port 3200). Backup, nginx -t, rollback.
set -e
F=/etc/nginx/sites-enabled/nextaja
grep -q 'location = /studio.html' "$F" && { echo "sudah ada"; exit 0; }
B=/root/nextaja.nginx.bak-$(date +%s); cp "$F" "$B"
chattr -i "$F"; trap 'chattr +i "$F"' EXIT
python3 - <<'PY'
f='/etc/nginx/sites-enabled/nextaja'; s=open(f).read()
k='location = /nugas'; i=s.find(k)
if i<0: raise SystemExit('anchor hilang')
i=s.rfind('\n',0,i)+1
blk='    location = /studio.html { proxy_pass http://127.0.0.1:3200; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-Proto $scheme; }\n'
open(f,'w').write(s[:i]+blk+s[i:])
PY
if nginx -t 2>/dev/null && systemctl reload nginx; then
  C=$(curl -s -o /dev/null -w '%{http_code}' https://nextaja.com/studio.html || true)
  echo "studio=$C"
  [ "$C" = "200" ] || { cp "$B" "$F"; nginx -t 2>/dev/null && systemctl reload nginx; echo "GAGAL, dikembalikan"; exit 1; }
  echo "OK studio live"
else cp "$B" "$F"; echo "nginx -t gagal, dikembalikan"; exit 1; fi
