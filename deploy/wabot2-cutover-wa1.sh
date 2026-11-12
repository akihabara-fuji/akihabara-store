#!/bin/bash
# Ganti bot WA1 lama dengan yang baru: pakai ulang sesi login lama (tanpa scan QR), salin catatan/kas lama, rollback otomatis bila gagal.
# Bot lama TIDAK dihapus: hanya dihentikan dan dinonaktifkan (bisa dihidupkan lagi).
set -u; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
R=/opt/wabot2; OLD=/opt/wabot/app; SEC=$(cat $R/secret)
[ -s $OLD/auth_info_baileys/creds.json ] || { echo "sesi lama tidak ditemukan, batal"; exit 1; }
ls /root/backup-wabot/wabot-*.tgz >/dev/null 2>&1 || { echo "backup belum ada, batal"; exit 1; }
rollback() { echo "GAGAL -> rollback: bot lama dihidupkan lagi"; systemctl stop wabot2-wa1; systemctl disable wabot2-wa1 >/dev/null 2>&1; rm -rf $R/auth/wa1; systemctl start wabot; sleep 5; echo "bot lama: $(systemctl is-active wabot)"; exit 1; }
echo "== hentikan bot lama (sesi tidak boleh dipakai dua proses)"; systemctl stop wabot; sleep 2
echo "== salin sesi login"; rm -rf $R/auth/wa1; mkdir -p $R/auth; cp -a $OLD/auth_info_baileys $R/auth/wa1 || rollback
echo "== salin catatan & kas lama"; cd $R/app
if [ -f $R/data/wa1.db ] && sqlite3 $R/data/wa1.db ".tables" 2>/dev/null | grep -qw migrated; then echo "sudah pernah dimigrasi, lewati"; else node src/tools/migrate.js $OLD/src/bot.db $R/data/wa1.db --apply 2>&1 | tail -6; fi
chown -R wabot2:wabot2 $R; chmod 700 $R/auth/wa1
echo "== nyalakan WA1 baru"; systemctl enable wabot2-wa1 >/dev/null 2>&1; systemctl restart wabot2-wa1
for i in $(seq 1 12); do sleep 5; S=$(curl -s -H "Authorization: Bearer $SEC" http://127.0.0.1:3401/status); echo "$S" | grep -q '"state":"tersambung"' && break; done
echo "$S" | sed 's/"number":"[0-9]*"/"number":"(tersembunyi)"/'
echo "$S" | grep -q '"state":"tersambung"' || rollback
systemctl disable wabot >/dev/null 2>&1
echo "== log terakhir WA1 baru"; journalctl -u wabot2-wa1 -n 6 --no-pager | cut -c1-160
echo "SELESAI. WA1 baru aktif memakai sesi lama. Bot lama dihentikan (dibackup, tidak dihapus). Kembali ke lama: systemctl stop wabot2-wa1; systemctl enable --now wabot"
