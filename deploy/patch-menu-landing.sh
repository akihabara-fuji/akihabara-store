#!/usr/bin/env bash
# Ganti menu "Kebutuhan anak UT" (header + footer) di landing nextaja.com menjadi "Ruang Akademik UT" -> /ruangakademikut.
# Aman: backup dulu, idempotent, juga menambal sumber (parts/hero.html) supaya tidak hilang saat landing dibangun ulang.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
for F in /var/www/mahyra-serv/public/index.html /root/nxl/nx-landing/parts/hero.html; do
  [ -f "$F" ] || { echo "lewati (tidak ada): $F"; continue; }
  [ -f "$F.bak-menu" ] || cp "$F" "$F.bak-menu"
  python3 - "$F" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
n_before = s.count("Kebutuhan anak UT")
s2, n = re.subn(r'<a href="#akademik"(?: data-tx="t\d+")?>Kebutuhan anak UT</a>', '<a href="/ruangakademikut">Ruang Akademik UT</a>', s)
if n: open(p, "w", encoding="utf-8").write(s2)
print(f"{p}: {n} menu diganti (sisa teks 'Kebutuhan anak UT' lain: {s2.count('Kebutuhan anak UT')})")
PY
done
curl -s http://127.0.0.1:3200/ | grep -o 'href="/ruangakademikut"[^<]*<' | head -3 || true
echo "SELESAI. Muat ulang nextaja.com (Ctrl+F5). Rollback: cp <file>.bak-menu <file>"
