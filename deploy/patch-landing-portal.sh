#!/usr/bin/env bash
# Landing: galeri "Jelajah semua portal" (15 foto, tiap foto ke halaman sesuai judulnya). Butuh update-blog.sh dijalankan dulu (membawa gambar). Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
[ -f /var/www/mahyra-serv/public/assets/portal/tentang.webp ] || { echo "Jalankan update-blog.sh dulu (gambar portal belum ada)"; exit 1; }
BK=/root/landing-backup-portal-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import sys,re
f=sys.argv[1]; s=open(f,encoding='utf8').read()
M='<!--nx-portal-v1-->'
if M in s: print("sudah"); sys.exit(0)
T=[("selamat-datang",372,290,"/ruangakademikut","Selamat datang di NextAja.com"),
("ruang-akademik",242,290,"/ruangakademikut","Ruang Akademik UT"),
("metodologi",274,290,"/ruangakademikut","Metodologi Penelitian"),
("tugas-diskusi",282,290,"/ruangakademikut","Tugas dan Diskusi UT"),
("jadwal-kalender",335,290,"/blog?f=updateut","Jadwal dan Kalender Akademik"),
("registrasi",311,236,"/blog?f=updateut","Registrasi dan Administrasi"),
("ujian-ut",298,236,"/blog?f=updateut","Ujian UT"),
("materi-belajar",285,236,"/blog?f=study","Materi Belajar"),
("tips-kuliah",281,236,"/blog?f=study","Tips Kuliah dan Produktivitas"),
("tools-ai",329,236,"/blog?f=ai","Tools AI dan Otomatisasi"),
("video-studio",311,233,"/ms/labstudio#studio","Video Content Studio"),
("preset-template",297,233,"/ms/labstudio#produk","Preset dan Template"),
("blog-berita",286,233,"/blog","Blog dan Berita"),
("karir-lowongan",303,233,"/blog","Karir dan Lowongan"),
("tentang",306,233,"/#faq","Tentang NextAja.com")]
tiles=''.join('<a href="%s" style="--a:%.3f" aria-label="%s"><img src="/assets/portal/%s.webp" alt="%s" width="%d" height="%d" loading="lazy"></a>'%(h,w/hh,a,n,a,w,hh) for n,w,hh,h,a in T)
CSS='<style>#jelajah .pg-grid{display:flex;flex-wrap:wrap;gap:12px}#jelajah .pg-grid a{flex:var(--a) 1 calc(var(--a)*200px);display:block;border-radius:18px;overflow:hidden;border:1px solid var(--border);transition:transform .2s,border-color .2s}#jelajah .pg-grid a:hover{transform:translateY(-4px);border-color:var(--acc)}#jelajah .pg-grid img{display:block;width:100%;height:auto}#jelajah .pg-grid:after{content:"";flex:20 1 0}@media(max-width:640px){#jelajah .pg-grid a{flex-basis:calc(var(--a)*120px)}}@media(prefers-reduced-motion:reduce){#jelajah .pg-grid a{transition:none}}</style>'
SEC=M+'<section class="s" id="jelajah"><div class="wrap"><div class="sh"><div><h2>Jelajah semua portal</h2><p>Semua solusi, satu tempat. Pilih yang kamu butuhkan.</p></div></div><div class="pg-grid">'+tiles+'</div></div></section>'
m=re.search(r'<section\b[^>]*\bid="akademik"[^>]*>',s)
assert m, "bagian akademik tidak ditemukan"
s=s[:m.start()]+SEC+s[m.start():]
s=s.replace('</head>',CSS+'</head>',1)
open(f,'w',encoding='utf8').write(s); print("galeri dipasang")
PY
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
I=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/assets/portal/tentang.webp)
echo "landing HTTP $C, gambar HTTP $I (harus 200 semua)"
[ "$C" = 200 ]
[ "$I" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
