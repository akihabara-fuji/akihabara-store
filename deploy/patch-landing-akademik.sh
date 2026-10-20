#!/usr/bin/env bash
# Ganti "Bantu Akademik" di landing nextaja.com menjadi "Ruang Akademik UT" (kartu di bagian "Yang bisa kamu pesan" juga menuju /ruangakademikut).
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
FILES="/var/www/mahyra-serv/public/index.html $(grep -rlI 'Bantu Akademik' /root/nxl/nx-landing/parts 2>/dev/null | tr '\n' ' ')"
for F in $FILES; do
  [ -f "$F" ] || continue
  [ -f "$F.bak-akd" ] || cp "$F" "$F.bak-akd"
  python3 - "$F" <<'PY'
import sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a = s.count("Bantu Akademik")
s = s.replace('<a class="card mini rv" href="#akademik"><h3 data-tx="t050">Bantu Akademik</h3>', '<a class="card mini rv" href="/ruangakademikut"><h3 data-tx="t050">Ruang Akademik UT</h3>')
s = s.replace("Bantu Akademik", "Ruang Akademik UT")
open(p, "w", encoding="utf-8").write(s)
print(f"{p}: {a} kemunculan 'Bantu Akademik' diganti")
PY
done
echo "SELESAI. Muat ulang nextaja.com (Ctrl+F5). Rollback: cp <file>.bak-akd <file>"
