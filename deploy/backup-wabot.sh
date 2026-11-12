#!/bin/bash
# Backup penuh bot WA lama (sesi login, konfigurasi, catatan, keuangan, kode) + peta isi. Tidak mengubah apa pun di bot.
set -u; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
D=/root/backup-wabot; TS=$(date +%Y%m%d-%H%M%S); mkdir -p $D; chmod 700 $D; F=$D/wabot-$TS.tgz
echo "== backup"; systemctl cat wabot > $D/wabot.service.$TS.txt 2>/dev/null
tar --exclude=node_modules --exclude='*.log' -czf $F /opt/wabot 2>/tmp/tar.err; chmod 600 $F
echo "file: $F"; du -h $F | cut -f1 | sed 's/^/ukuran: /'; echo "isi: $(tar -tzf $F | wc -l) berkas"; sha256sum $F | cut -c1-16 | sed 's/^/sha256: /'; tail -2 /tmp/tar.err
tar -tzf $F | grep -cE "auth_info_baileys/creds.json" | sed 's/^/creds WA1 ikut: /'; tar -tzf $F | grep -cE "\.env$" | sed 's/^/.env ikut: /'
A=/opt/wabot/app; O=$D/outline-$TS.txt
{
echo "### BERKAS TOP"; ls -la $A | grep -vE "node_modules|auth_info" 
echo "### DATA (db/json non-auth)"; find /opt/wabot -maxdepth 4 \( -name "*.db" -o -name "*.sqlite*" -o -name "*.json" \) -not -path "*node_modules*" -not -path "*auth_info*" -printf "%s\t%p\n" | sort -rn | head -40
echo "### SQLITE"; for db in $(find /opt/wabot -maxdepth 4 \( -name "*.db" -o -name "*.sqlite" \) -not -path "*node_modules*" -not -path "*auth_info*"); do echo "-- $db"; for t in $(sqlite3 $db ".tables" 2>/dev/null); do echo "$t: $(sqlite3 $db "select count(*) from $t" 2>/dev/null) baris | $(sqlite3 $db ".schema $t" 2>/dev/null | tr '\n' ' ' | cut -c1-230)"; done; done
echo "### FUNGSI bot.js"; grep -nE "^(async )?function [A-Za-z0-9_]+|^const [A-Za-z0-9_]+ = (async )?\(.*\) =>" $A/src/bot.js | cut -c1-110
echo "### PERINTAH/TRIGGER"; grep -noE "(case|startsWith\(|=== |includes\()['\"][!/.]?[a-zA-Z ]{3,24}['\"]" $A/src/bot.js | cut -c1-80 | head -150
echo "### FILE LAIN"; for f in asisten catatan faq foto grupai sekolah curhat; do echo "-- $f.js"; grep -nE "^(export )?(async )?function [A-Za-z0-9_]+" $A/src/$f.js | cut -c1-100; done
echo "### SPAM/LINK"; grep -nEi "spam|link|jual|blacklist|whitelist|kick|warn" $A/src/bot.js | cut -c1-120 | head -60
echo "### KEUANGAN/CATATAN"; grep -nEi "keuangan|pemasukan|pengeluaran|catat|jadwal|remind|ingat" $A/src/bot.js | cut -c1-120 | head -40
} > $O 2>&1; chmod 600 $O
echo "== peta isi disimpan: $O ($(wc -l < $O) baris)"; sed -n '/### SQLITE/,/### FUNGSI/p' $O | head -28 | cut -c1-150
echo "SELESAI backup. Pulihkan: tar -xzf $F -C /"
