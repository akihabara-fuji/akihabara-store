#!/usr/bin/env bash
# Perbarui Ruang Admin portofolio (server.js + admin.html + data) agar sama dengan halaman live.
# Jalankan sebagai root di VPS: bash patch-admin.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C"
APP=/opt/dp-admin; DATA=/var/lib/dp-admin; WEB=/var/www/dikapriyadi
TS=$(date +%s); BK=$DATA/pre-v2-$TS
mkdir -p "$BK"
cp -a "$APP/server.js" "$APP/admin.html" "$BK/"
cp -a "$WEB/index.html" "$WEB/works.json" "$WEB/karya.json" "$WEB/remotion.json" "$BK/"
rollback(){ echo "GAGAL: $1 -> rollback"; cp -a "$BK/server.js" "$BK/admin.html" "$APP/"; [ -f "$BK/dp.db" ] && cp -a "$BK/dp.db" "$DATA/dp.db"; cp -a "$BK/index.html" "$BK/works.json" "$BK/karya.json" "$BK/remotion.json" "$WEB/"; systemctl restart dp-admin; exit 1; }

curl -fsSL "$RAW/portofolio-api/admin-v2.html" -o /tmp/admin-v2.html || rollback "unduh admin"
grep -q "Ruang Admin Portofolio" /tmp/admin-v2.html || rollback "admin tidak valid"

# 1. patch server.js
python3 - "$APP/server.js" <<'PY' || rollback "patch server.js"
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf8').read()
def rep(old,new,cnt=1):
    global s
    n=s.count(old)
    assert n>=1 and (cnt==0 or n==cnt), (old[:50], n)
    s=s.replace(old,new)
rep('/id="collaborate"/','/id="kolaborasi"/',0)
rep('/id="galeri"/','/id="karya"/',0)
rep('/id="remotion"/','/id="karya-ai"/',0)
rep("if (w.draft) o.draft = true;",
"""for (const k of ['badge', 'mediaType', 'jenis', 'status']) if (w[k]) o[k] = str(w[k], 60);
    if (w.promptOrWorkflow) o.promptOrWorkflow = str(w.promptOrWorkflow, 1500);
    if (w.mediaUrl) o.mediaUrl = cleanPath(w.mediaUrl, 'Media "' + title + '"', false);
    if (w.posterUrl) o.posterUrl = cleanPath(w.posterUrl, 'Poster "' + title + '"', false);
    if (Array.isArray(w.tools)) o.tools = tags(w.tools, 12, 40);
    if (w.externalLink) o.externalLink = cleanUrl(w.externalLink, 'Tautan');
    if (w.draft) o.draft = true;""")
rep("o.keahlian = tags(x.keahlian, 8, 40);","o.keahlian = tags(x.keahlian, 8, 40);\n    if (x.jenis) o.jenis = str(x.jenis, 30);")
open(p,'w',encoding='utf8').write(s)
PY
node --check "$APP/server.js" || rollback "sintaks server.js"
cp /tmp/admin-v2.html "$APP/admin.html"

# 2. migrasi data admin agar sama dengan live
systemctl stop dp-admin
cp -a "$DATA/dp.db" "$BK/dp.db"
node --no-warnings - <<'JS' || rollback "migrasi data"
const {DatabaseSync}=require('node:sqlite'); const fs=require('fs');
const WEB='/var/www/dikapriyadi';
const db=new DatabaseSync('/var/lib/dp-admin/dp.db');
const st=JSON.parse(db.prepare("SELECT v FROM kv WHERE k='state'").get().v);
const rd=f=>JSON.parse(fs.readFileSync(WEB+'/'+f,'utf8'));
const MOT='AI Motion (Remotion)', VID=['AI Video & Content','Video Iklan','Video Drama'];
st.works=rd('works.json').map(w=>{
  const o={id:w.id,title:w.title,category:w.category||'',image:w.posterUrl||w.mediaUrl||'',summary:w.summary||'',
    workflow:(w.promptOrWorkflow||'').slice(0,500),metrics:w.metrics||'',tags:(w.tools||[]).slice(0,8),
    mediaUrl:w.mediaUrl||'',mediaType:w.mediaType||'image',posterUrl:w.posterUrl||'',promptOrWorkflow:w.promptOrWorkflow||'',
    tools:w.tools||[],badge:w.badge||''};
  if(/^https?:\/\//.test(w.externalLink||''))o.externalLink=w.externalLink;
  if(o.category===MOT)o.jenis='Remotion Portofolio'; else if(VID.includes(o.category))o.jenis='Video AI';
  return o;
});
st.karya=rd('karya.json').map(x=>{
  const t=((x.judul||'')+' '+(x.kategori||'')).toLowerCase();
  const o=Object.assign({},x,{keahlian:x.keahlian||[],video:x.video||''});
  o.jenis=x.kategori==='Carousel'?'Carousel':(/iklan/.test(t)?'Video Iklan':(/tuntasync|komersial|commercial|promo|brand/.test(t)?'Video Komersial':'Video AI'));
  return o;
});
const h=fs.readFileSync(WEB+'/index.html','utf8');
const dec=s=>s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const g=(re)=>{const m=re.exec(h);return m?dec(m[1]):''};
const hs=/<!--SLOT:heroSub-->([\s\S]*?)<!--\/SLOT:heroSub-->/.exec(h);
const wa=/wa\.me\/(\d+)/.exec(h);
st.site=Object.assign({},st.site,{judul:g(/<title>([\s\S]*?)<\/title>/),deskripsi:g(/<meta name="description" content="([^"]*)"/),
  heroSub:hs?dec(hs[1]).replace(/\s+/g,' ').trim():'',wa:wa?wa[1]:'',fotoTentang:''});
const j=JSON.stringify(st);
db.prepare("INSERT OR REPLACE INTO kv(k,v) VALUES('state',?)").run(j);
db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(),'Sinkron dengan halaman live (admin v2)',j);
console.log('migrasi ok: works',st.works.length,'karya',st.karya.length,'site',Object.keys(st.site).join(','));
JS
systemctl start dp-admin
sleep 2
systemctl is-active dp-admin | grep -q active || rollback "layanan tidak aktif"
S=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3108/admin); echo "admin /admin -> $S"
[ "$S" = 200 ] || rollback "admin tidak merespons"
echo "OK, admin v2 aktif. Cadangan: $BK"
