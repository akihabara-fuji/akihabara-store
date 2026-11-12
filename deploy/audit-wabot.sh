#!/bin/bash
# Audit baca-saja bot WA (tidak mengubah apa pun). Pakai: bash audit-wabot.sh 1|2|3
A=/opt/wabot/app; P=${1:-1}
h(){ echo "== $1"; }
if [ "$P" = 1 ]; then
h "SERVICE"; systemctl is-active wabot; systemctl show wabot -p ActiveEnterTimestamp -p NRestarts -p MemoryCurrent | tr '\n' ' '; echo
h "NODE/DEPS"; node -v; grep -E '"(@whiskeysockets/baileys|baileys|better-sqlite3|axios|node-cron|qrcode-terminal|pino)"' $A/package.json
h "BAILEYS terpasang vs terbaru"; (cd $A; node -p "require('@whiskeysockets/baileys/package.json').version" 2>/dev/null); npm view @whiskeysockets/baileys version 2>/dev/null
h "FILE src"; wc -l $A/src/*.js | tail -25
h "AUTH"; for d in $A/auth_info_baileys $A/auth_info_order; do echo "$d $(ls $d 2>/dev/null | wc -l) file, ubah $(stat -c %y $d 2>/dev/null | cut -c1-16)"; done; ls -d $A/auth_info_order.* 2>/dev/null
h "DISK"; du -sh $A $A/auth_info_* 2>/dev/null; df -h / | tail -1
fi
if [ "$P" = 2 ]; then
h "LOG 24 JAM (hitung)"; J=$(journalctl -u wabot --since "24 hours ago" --no-pager 2>/dev/null); echo "baris: $(echo "$J" | wc -l)"
for k in "Connection Closed" "loggedOut" "401" "428" "440" "503" "Bad MAC" "Session error" "rate" "timeout" "ECONN" "TypeError" "ReferenceError" "unhandled" "UnhandledPromise"; do echo "$k: $(echo "$J" | grep -ci "$k")"; done
h "ERROR TERAKHIR"; echo "$J" | grep -iE "error|gagal|fail|closed" | tail -10 | cut -c1-170
h "WA2 KIRIM"; curl -s -m 5 -o /dev/null -w "3399 http %{http_code}\n" http://127.0.0.1:3399/ ; journalctl -u wabot --since "24 hours ago" --no-pager | grep -i "WA2" | tail -5 | cut -c1-170
fi
if [ "$P" = 3 ]; then
D=$(ls /var/www/mahyra-serv/data/parafrase.db 2>/dev/null); h "OUTBOX"; if command -v sqlite3 >/dev/null; then sqlite3 $D "select status,count(*) from wa_outbox group by 1; select count(*) from wa_outbox where created_at> strftime('%s','now','-1 day')*1000;" 2>&1 | head; else echo "sqlite3 tidak ada"; fi
h "FITUR (grep perintah/handler)"; grep -ohE "(case|startsWith\()\s*['\"][!/.]?[a-z]{3,14}['\"]" $A/src/*.js 2>/dev/null | sort -u | tr '\n' ' ' | cut -c1-600; echo
h "FILE KONFIG/ENV (nama saja)"; ls -a $A | grep -vE "node_modules|auth_info" | tr '\n' ' '; echo; grep -oE "^[A-Z_]+=" $A/.env 2>/dev/null | tr '\n' ' '; echo
h "AI/9ROUTER"; grep -rlE "9router|AI_BASE_URL|openai|anthropic" $A/src 2>/dev/null | head; grep -E "^(AI_BASE_URL|AI_MODEL)=" $A/.env 2>/dev/null | sed 's/=.*key.*/=***/'
fi
if [ "$P" = 4 ]; then
h "LOG TERAKHIR (30 baris, bersih)"; journalctl -u wabot -n 400 --no-pager 2>/dev/null | grep -vE "closed: -1|^\s*$|^\S+ \S+ \S+ \S+ node\[[0-9]+\]:\s+[\]\}\[\{,]*\s*$" | tail -30 | cut -c1-150
h "AI/9ROUTER"; B=$(grep -E "^NINE_ROUTER_BASE=" $A/.env | cut -d= -f2-); echo "base: $(echo "$B" | sed -E 's#(://[^/]{0,40}).*#\1#')"; [ -n "$B" ] && curl -s -m 8 -o /dev/null -w "9router http %{http_code}\n" "$B/models" || echo "kosong"
h "PESAN MASUK 3 JAM"; journalctl -u wabot --since "3 hours ago" --no-pager | grep -ciE "pesan|message|from|dari"
h "SOCKET"; journalctl -u wabot --since "6 hours ago" --no-pager | grep -iE "terhubung|connected|open|logged|pairing|qr" | tail -6 | cut -c1-150
fi
if [ "$P" = 5 ]; then
h "AI konfigurasi"; grep -E "^(AI_PROVIDER|AI_MODEL|NINE_ROUTER_BASE)=" $A/.env | sed -E 's/(KEY|key)=.*/\1=***/'; grep -cE "^(GEMINI|GOOGLE)[A-Z_]*KEY=.+" $A/.env | sed 's/^/jumlah kunci Gemini terisi: /'
h "AI gagal 24 jam"; J=$(journalctl -u wabot --since "24 hours ago" --no-pager); echo "Gemini gagal: $(echo "$J" | grep -c 'Gemini gagal')"; echo "$J" | grep -iE "Gemini gagal|AI gagal|9router" | sed -E 's/^.*node\[[0-9]+\]: //' | sort | uniq -c | sort -rn | head -5 | cut -c1-140
h "Tes Gemini langsung"; K=$(grep -E "^(GEMINI_API_KEY|GOOGLE_API_KEY|GEMINI_KEY)=" $A/.env | head -1 | cut -d= -f2-); M=$(grep -E "^AI_MODEL=" $A/.env | cut -d= -f2-); if [ -n "$K" ]; then curl -s -m 25 -o /tmp/g.json -w "http %{http_code} dalam %{time_total}s\n" "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent?key=$K" -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"balas: ok"}]}]}'; head -c 300 /tmp/g.json | sed -E 's/AIza[A-Za-z0-9_-]+/***/g'; echo; rm -f /tmp/g.json; else echo "kunci Gemini tidak ketemu di .env"; fi
h "Sebab sambung ulang"; echo "$J" | grep -iE "statusCode|reason|DisconnectReason|restartRequired|closed:" | grep -v "closed: -1" | sed -E 's/^.*node\[[0-9]+\]: //' | sort | uniq -c | sort -rn | head -6 | cut -c1-140
echo "$J" | grep -B3 "BOT GRUP BERHASIL" | grep -viE "upsert|masuk" | tail -8 | sed -E 's/^.*node\[[0-9]+\]: //' | cut -c1-140
fi
if [ "$P" = 6 ]; then
h "ENV yang dipakai kode (src)"; grep -ohE "process\.env\.[A-Z0-9_]+" $A/src/*.js | sort -u | sed 's/process.env.//' | tr '\n' ' '; echo
h "ENV terisi di .env (nama saja)"; grep -E "^[A-Z0-9_]+=.+" $A/.env | cut -d= -f1 | tr '\n' ' '; echo
h "ENV di unit systemd (nama saja)"; systemctl show wabot -p Environment -p EnvironmentFiles | sed -E 's/=[^ ]*/=*/g' | cut -c1-200
h "Tes keluar jaringan"; for u in https://generativelanguage.googleapis.com https://api.openai.com https://web.whatsapp.com; do curl -s -m 8 -o /dev/null -w "$u %{http_code} %{time_total}s\n" $u; done
h "Port 9router di VPS?"; (ss -ltn | grep -E ":(20128|3000|4000|8080)\b" | head -3) ; grep -rhoE "http://[0-9a-z.:-]+/v1" $A/.env $A/src/*.js 2>/dev/null | sort -u | head -3
fi
