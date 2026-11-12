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
