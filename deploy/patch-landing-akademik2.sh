#!/usr/bin/env bash
# Landing nextaja.com: ganti bagian "Ruang Akademik UT" dengan kartu layanan baru (tanpa harga lama, diskon, free revisi 1x). Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-ak2-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
trap 'echo "GAGAL di baris $LINENO -> rollback"; cp "$BK" "$F"' ERR
python3 - "$F" <<'PY'
import re,sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
m=re.search(r'<section\b[^>]*\bid="akademik"[^>]*>.*?</section>',s,flags=re.S)
if not m: raise SystemExit("section akademik tidak ditemukan")
L="/ruangakademikut/layanan?s="
cards=[
("Tugas","Diskon 19%","Ketik kebutuhan, lampirkan soal. Hasil Word/PDF dikirim ke halaman pesananmu.",L+"tugas"),
("Diskusi","Diskon 19%","Jawaban diskusi siap tempel, ada tombol Salin.",L+"diskusi"),
("Metopen","Paket Rp919.000","Per tahap atau paket komplit dengan free revisi penuh.",L+"metopen_paket"),
("Cek dan Parafrase Mandiri","Baru","Unggah dokumen, lihat bagian yang perlu diperbaiki, tim kami merevisinya.","/ruangakademikut/cek-parafrase-mandiri"),
("Audit Dokumen","Mulai Rp35.000","Cek sitasi, daftar pustaka, dan DOI otomatis. Ringkasan gratis.","/ruangakademikut/audit"),
("Revisi","Free revisi 1x","Catatan tutor diperbaiki. Gratis 1x untuk hasil buatan kami.",L+"revisi_tugas"),
("Paket Semester","Paling hemat","Handle 1 semester: absen, diskusi, tugas, update nilai mingguan. Konsultasi harga ke admin.","/ruangakademikut"),
("Pengarahan Intensif","1 semester Rp99.000","Tanya apa saja soal UT, registrasi, dan update. Sampai lulus Rp199.000.","/ruangakademikut"),
("Info UT","Gratis","Jadwal, kabar penting, dan panduan terbaru seputar UT.","/blog?f=updateut"),
]
card=''.join('<a class="card mini rv" href="%s" style="text-decoration:none;color:inherit"><span style="align-self:flex-start;background:var(--acc);color:var(--on-accent);border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700">%s</span><h3>%s</h3><p>%s</p><span style="margin-top:auto;font-weight:700;color:var(--acc)">Lihat layanan →</span></a>'%(h,b,t,d) for t,b,d,h in cards)
new=('<section class="s" id="akademik"><div class="wrap">'
'<div class="sh"><div><h2>Ruang Akademik UT, semua kebutuhan kuliahmu</h2><p>Dikerjakan mandiri oleh tim NextAja, bukan hasil generate AI otomatis. Melewati tahap parafrase admin, lalu siap dikirim. Free revisi 1x untuk setiap layanan.</p></div><a class="btn btn-pri" href="/ruangakademikut">Lihat semua layanan</a></div>'
'<div class="g3">'+card+'</div>'
'<div class="note" style="margin-top:16px">Semua file terjaga kerahasiaannya, tidak dipakai untuk hal lain, dan otomatis terhapus 24 jam setelah pesanan selesai.</div>'
'</div></section>')
s=s.replace(m.group(0),new,1)
open(f,'w',encoding='utf8').write(s); print("section akademik diganti")
PY
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Rollback: cp $BK $F"
