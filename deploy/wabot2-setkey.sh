#!/bin/bash
# Simpan kunci Gemini ke bot baru lewat isian TERSEMBUNYI (kunci tidak tampil di layar maupun chat). Pakai: bash wabot2-setkey.sh
set -eu; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
R=/opt/wabot2; read -rsp "Tempel kunci Gemini lalu Enter (tidak terlihat): " K; echo; [ -n "$K" ] || { echo "kosong, batal"; exit 1; }
read -rp "Nama model (kosongkan = gemini-2.5-flash): " M; M=${M:-gemini-2.5-flash}
echo "== uji kunci ke Google (tanpa menampilkan kunci)"
C=$(curl -s -o /tmp/gk.out -w "%{http_code}" -H "x-goog-api-key: $K" -H "content-type: application/json" -d '{"contents":[{"parts":[{"text":"balas: ok"}]}],"generationConfig":{"maxOutputTokens":10}}' "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent"); rm -f /tmp/gk.out
echo "hasil uji: HTTP $C"; [ "$C" = 200 ] || { echo "Kunci/model ditolak, tidak disimpan."; exit 1; }
for s in wa1 wa2; do sed -i "/^GEMINI_API_KEY=/d;/^GEMINI_MODEL=/d" $R/$s.env; printf 'GEMINI_API_KEY=%s\nGEMINI_MODEL=%s\n' "$K" "$M" >> $R/$s.env; done
unset K; systemctl is-active wabot2-wa2 >/dev/null && systemctl restart wabot2-wa2; systemctl is-active wabot2-wa1 >/dev/null && systemctl restart wabot2-wa1 || true
echo "SELESAI. Kunci tersimpan, model $M."
