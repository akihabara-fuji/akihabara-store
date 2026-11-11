#!/bin/bash
# Pasang nextaja.com/analisa-tiktok -> aplikasi analisa (gunicorn). Aman: backup, nginx -t, rollback.
set -e
F=/etc/nginx/sites-enabled/nextaja
P=$(grep -o 'proxy_pass http://127.0.0.1:[0-9]*' /etc/nginx/sites-enabled/analisa | head -1 | grep -o '[0-9]*$')
[ -n "$P" ] || { echo "port analisa tidak ketemu"; exit 1; }
if grep -q '/analisa-tiktok' "$F"; then echo "sudah terpasang"; exit 0; fi
B=/root/nextaja.nginx.bak-$(date +%s); cp "$F" "$B"
chattr -i "$F"; trap 'chattr +i "$F"' EXIT
python3 - "$P" <<'PY'
import sys
p=sys.argv[1]; f='/etc/nginx/sites-enabled/nextaja'; s=open(f).read()
blk='''    location = /analisa-tiktok { return 301 /analisa-tiktok/; }
    location /analisa-tiktok/ {
        proxy_pass http://127.0.0.1:%s/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Accept-Encoding "";
        proxy_read_timeout 130s;
        client_max_body_size 20m;
        sub_filter_once off;
        sub_filter_types text/html application/javascript;
        sub_filter '"/static/' '"/analisa-tiktok/static/';
        sub_filter "'/static/" "'/analisa-tiktok/static/";
        sub_filter '"/api/' '"/analisa-tiktok/api/';
        sub_filter "'/api/" "'/analisa-tiktok/api/";
        sub_filter 'href="/"' 'href="/analisa-tiktok/"';
    }
''' % p
k='location = /nugas'
i=s.find(k)
if i>=0: i=s.rfind('\n',0,i)+1
if i<0: print('anchor hilang'); sys.exit(1)
open(f,'w').write(s[:i]+blk+s[i:])
PY
if nginx -t 2>/dev/null && systemctl reload nginx; then
  sleep 1
  C=$(curl -s -o /dev/null -w '%{http_code}' https://nextaja.com/analisa-tiktok/ || true)
  H=$(curl -s https://nextaja.com/analisa-tiktok/ | grep -c '/analisa-tiktok/static/' || true)
  echo "HTTP $C, path ditulis ulang: $H"
  if [ "$C" != "200" ]; then cp "$B" "$F"; nginx -t 2>/dev/null && systemctl reload nginx; echo "GAGAL, dikembalikan"; exit 1; fi
  echo "OK analisa-tiktok live"
else
  cp "$B" "$F"; echo "nginx -t gagal, dikembalikan"; exit 1
fi
