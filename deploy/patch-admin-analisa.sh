#!/bin/bash
# Tambah tombol "Admin Analisa" di header admin nextaja (satu pintu). Backup + rollback.
set -e
F=/var/www/mahyra-serv/admin/index.html
grep -q 'href="/analisa/admin"' "$F" && { echo "sudah ada"; exit 0; }
LOCK=0; command -v ca-lock >/dev/null && LOCK=1
relock(){ [ $LOCK = 1 ] && ca-lock lock >/dev/null && echo "Kode dikunci lagi (ca-lock)." || true; }
trap relock EXIT
[ $LOCK = 1 ] && ca-lock unlock >/dev/null
B=/root/admin-index-backup-$(date +%Y%m%d-%H%M%S).html; cp "$F" "$B"
python3 - <<'PY'
f='/var/www/mahyra-serv/admin/index.html'; s=open(f).read()
k='<a class="btn btn-sm" href="/" target="_blank" rel="noopener">Lihat web'
if k not in s: raise SystemExit('anchor tidak ketemu')
s=s.replace(k,'<a class="btn btn-sm" href="/analisa/admin" target="_blank" rel="noopener">Admin Analisa ↗</a>\n        '+k,1)
open(f,'w').write(s)
PY
C=$(curl -s http://127.0.0.1:3200/admin/ | grep -c 'href="/analisa/admin"' || true)
if [ "$C" -ge 1 ]; then echo "OK: tombol Admin Analisa terpasang"; else cp "$B" "$F"; echo "GAGAL, dikembalikan"; exit 1; fi
