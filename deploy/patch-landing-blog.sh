#!/usr/bin/env bash
# Landing: tulisan blog terbaru (6, semua kategori) tampil di bagian "Terbaru dari blog"; bagian "Berita viral" terpisah disembunyikan. Backup + rollback otomatis.
set -euo pipefail
F=/var/www/mahyra-serv/public/index.html
BK=/root/landing-backup-blog-$(date +%Y%m%d-%H%M%S).html
cp "$F" "$BK"
rollback(){ echo "GAGAL -> rollback"; cp "$BK" "$F"; }
trap 'echo "GAGAL di baris $LINENO"; rollback' ERR
python3 - "$F" <<'PY'
import sys
f=sys.argv[1]; s=open(f,encoding='utf8').read()
M='<!--nx-blog-v1-->'
if M in s: print("sudah dipatch"); sys.exit(0)
CSS='<style>#viral{display:none!important}#blogstrip .g3{margin-top:8px}</style>'
JS=M+'''<script>(function(){function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
fetch("/ms/blog/latest?limit=6",{cache:"no-cache"}).then(function(r){return r.json()}).then(function(d){var l=d.posts||[];if(!l.length)return;var sec=document.getElementById("blogstrip");if(!sec)return;var w=sec.querySelector(".wrap");
w.querySelectorAll("a.nx-bl").forEach(function(a){a.remove()});var g=document.createElement("div");g.className="g3";
g.innerHTML=l.map(function(p){return '<a class="card bp rv in" href="/blog/'+esc(p.slug)+'"><div class="cv">'+(p.cover?'<img src="'+esc(p.cover)+'" alt="" loading="lazy">':esc(p.topic))+'</div><div class="pb"><h3>'+esc(p.title)+'</h3><p>'+esc(p.excerpt)+'</p></div></a>'}).join("");w.appendChild(g);}).catch(function(){});})();</script>'''
s=s.replace('</head>',CSS+'</head>',1).replace('</body>',JS+'</body>',1)
open(f,'w',encoding='utf8').write(s); print("dipatch")
PY
sleep 1
C=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3200/)
echo "landing HTTP $C (harus 200)"
[ "$C" = 200 ]
trap - ERR
echo "SELESAI. Buka nextaja.com lalu Ctrl+F5. Rollback: cp $BK $F"
