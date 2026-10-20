#!/usr/bin/env bash
# Pisahkan Sahabat Nugas dari nextaja.com: /nugas dialihkan permanen ke /ruangakademikut. Aplikasi TIDAK dihapus dan TIDAK dihentikan.
set -euo pipefail
FILES=$(grep -ls "server_name[^;]*nextaja\.com" /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf 2>/dev/null || true)
[ -n "$FILES" ] || { echo "config nginx nextaja.com tidak ditemukan"; exit 1; }
BK=/root/nginx-backup-$(date +%Y%m%d-%H%M%S).tgz
tar czhf "$BK" /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || tar czf "$BK" /etc/nginx
rollback(){ echo "GAGAL -> rollback nginx"; tar xzf "$BK" -C / ; nginx -t && systemctl reload nginx || true; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - $FILES <<'PY'
import re,sys
for f in sys.argv[1:]:
    s=open(f).read()
    if 'nx-nugas-redirect' in s: print(f,"sudah"); continue
    add='\n    # nx-nugas-redirect\n    location = /nugas { return 301 /ruangakademikut; }\n    location ^~ /nugas/ { return 301 /ruangakademikut; }\n'
    n=0
    def rep(m):
        global n; n+=1; return m.group(0)+add
    s2=re.sub(r'server_name[^;]*nextaja\.com[^;]*;',rep,s)
    open(f,'w').write(s2); print(f,"blok diubah:",n)
PY
nginx -t
systemctl reload nginx
sleep 1
R=$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://127.0.0.1/nugas -H 'Host: nextaja.com' || true)
echo "/nugas -> $R (harus 301 ... /ruangakademikut)"
trap - ERR
echo "SELESAI. Sahabat Nugas masih hidup di port 3000 (tidak dihapus). Rollback: tar xzf $BK -C / && systemctl reload nginx"
