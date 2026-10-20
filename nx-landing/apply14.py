#!/usr/bin/env python3
"""Tahap 14: semua teks beranda bisa diedit dari admin (kartu "Teks beranda"). Kosongkan = kembali ke teks asli.
- index.html: tiap teks (judul, paragraf, tombol, poin) diberi penanda data-tx="tNNN" + skrip penimpa teks
- server.js: settings.texts masuk whitelist (maks 300 teks x 500 huruf)
- admin/index.html: kartu "Teks beranda" dengan pencarian
Backup, node --check, rollback, idempotent. Pakai: python3 apply14.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage14-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
log=[]; changed=False
# ---------- 1) index.html ----------
IX=P('public','index.html'); h=rd(IX)
RT='''<script id="nx-tx">(function(){try{var d=JSON.parse(document.getElementById("store-data").textContent);var T=(d.settings&&d.settings.texts)||{};document.querySelectorAll("[data-tx]").forEach(function(e){var v=T[e.getAttribute("data-tx")];if(typeof v==="string"&&v.trim())e.textContent=v;});}catch(e){}})();</script>'''
if 'data-tx="' in h: log.append('index: sudah ditandai (tidak diulang)')
else:
    parts=re.split(r'(<script\b[\s\S]*?</script>|<style\b[\s\S]*?</style>|<svg\b[\s\S]*?</svg>|<template\b[\s\S]*?</template>)',h)
    n=[0]
    TAGS='h1|h2|h3|h4|p|summary|li|small|a|button|span'
    pat=re.compile(r'<(%s)\b([^>]*)>([^<>]{2,500})</\1>'%TAGS)
    def rep(m):
        tag,at,txt=m.group(1),m.group(2),m.group(3)
        t=txt.strip()
        if re.search(r'\bid\s*=|data-pk|data-m=|data-tx|\{|\}|\$|\bhidden\b',at): return m.group(0)
        if re.search(r'[{}$]|\{\{',t): return m.group(0)
        if not re.search(r'[A-Za-z]{3,}',t): return m.group(0)
        if tag=='span' and len(t)<12: return m.group(0)
        n[0]+=1
        return '<%s%s data-tx="t%03d">%s</%s>'%(tag,at,n[0],txt,tag)
    for i in range(0,len(parts),2): parts[i]=pat.sub(rep,parts[i])
    h2=''.join(parts)
    if n[0]>300:
        log.append('DILEWATI index: terlalu banyak teks (%d)'%n[0])
    elif '</body>' not in h2: log.append('DILEWATI index: </body> tidak ketemu')
    else:
        h2=h2.replace('</body>',RT+'\n</body>',1)
        shutil.copy2(IX,bk); open(IX,'wb').write(h2.encode('utf-8')); log.append('index: %d teks ditandai bisa diedit'%n[0]); changed=True
# ---------- 2) server.js whitelist ----------
S=P('server.js'); c=rd(S)
if 'texts: (function(o)' in c: log.append('server: sudah terpasang')
else:
    m=re.search(r'^([ \t]*)waChannelUrl:[^\n]*\n',c,re.M) or re.search(r'^([ \t]*)waNumber:[^\n]*\n',c,re.M)
    if not m: log.append('DILEWATI server: baris waChannelUrl/waNumber tidak ketemu')
    else:
        ind=m.group(1)
        fn=('texts: (function(o){var r={};if(o&&typeof o==="object"){Object.keys(o).slice(0,300).forEach(function(k){'
            'if(/^t\\d{3}$/.test(k)&&typeof o[k]==="string"){var v=o[k].replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]/g,"").trim().slice(0,500);if(v)r[k]=v;}});}return r;})(s.texts),')
        shutil.copy2(S,bk); open(S,'wb').write((c[:m.end()]+ind+fn+'\n'+c[m.end():]).encode('utf-8'))
        r=subprocess.run('node --check '+S,shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'server.js'),S); log.append('SYNTAX ERROR server.js, dikembalikan: '+r.stderr[:200])
        else: log.append('server: settings.texts masuk whitelist'); changed=True
# ---------- 3) admin ----------
AD=P('admin','index.html'); t=rd(AD); nl='\r\n' if '\r\n' in t else '\n'
if 'id="txList"' in t: log.append('admin: sudah terpasang')
else:
    ma=re.search(r'<div class="card">\s*<h3>Link channel &amp; harga di landing</h3>',t)
    a2='/* ---------- pengaturan ---------- */'
    if not ma or a2 not in t: log.append('DILEWATI admin: anchor tidak ketemu')
    else:
        CARD=('<div class="card"><h3>Teks beranda</h3><div class="hint">Ubah tulisan apa saja di beranda: judul, paragraf, tombol, poin. Kosongkan kolom = kembali ke teks asli. Perubahan tersimpan otomatis.</div>'
              '<input id="txSearch" placeholder="Cari teks…" style="margin:10px 0"><div id="txList" style="display:flex;flex-direction:column;gap:10px;max-height:520px;overflow:auto"><div class="empty">Memuat…</div></div></div>')
        JS='''/* nx-tx-admin */
(async function(){ const box=$("#txList"); try{
  const html=await (await fetch("/?"+Date.now(),{cache:"reload"})).text(); const doc=new DOMParser().parseFromString(html,"text/html");
  const els=[...doc.querySelectorAll("[data-tx]")]; const rows=els.map(e=>{const sec=e.closest("section"); return {k:e.getAttribute("data-tx"),orig:e.textContent.trim(),grp:(sec&&(sec.id||sec.className))||(e.closest("header")?"menu":(e.closest("footer")?"footer":"")) }});
  function draw(q){ q=(q||"").toLowerCase(); box.innerHTML=""; rows.filter(r=>!q||r.orig.toLowerCase().includes(q)||((ST.settings.texts||{})[r.k]||"").toLowerCase().includes(q)).forEach(r=>{
    const d=document.createElement("label"); d.style.cssText="display:block;font-size:12px;opacity:.95";
    const v=(ST.settings.texts||{})[r.k]||"";
    d.innerHTML='<span style="opacity:.6">'+esc(r.grp||"")+'</span><textarea rows="'+(r.orig.length>90?3:1)+'" maxlength="500" style="width:100%;margin-top:4px" placeholder="'+esc(r.orig)+'">'+esc(v)+'</textarea>';
    d.querySelector("textarea").addEventListener("input",e=>{ST.settings.texts=ST.settings.texts||{}; const x=e.target.value; if(x.trim()) ST.settings.texts[r.k]=x; else delete ST.settings.texts[r.k]; save(900);});
    box.appendChild(d); }); if(!box.children.length) box.innerHTML='<div class="empty">Tidak ada yang cocok.</div>'; }
  draw(); $("#txSearch").addEventListener("input",e=>draw(e.target.value));
 }catch(err){ box.innerHTML='<div class="empty">Gagal memuat daftar teks: '+esc(err.message)+'</div>'; } })();
'''
        shutil.copy2(AD,bk)
        t2=t[:ma.start()]+CARD+t[ma.start():]
        t2=t2.replace(a2,JS.replace('\n',nl)+a2,1)
        open(AD,'wb').write(t2.encode('utf-8')); log.append('admin: kartu Teks beranda ditambah'); changed=True
print('\n'.join(log)); print('backup ->',bk)
if changed and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s http://127.0.0.1:3200/ | grep -o "data-tx=" | wc -l; curl -s -o /dev/null -w "beranda HTTP %{http_code}\\n" http://127.0.0.1:3200/; curl -s -o /dev/null -w "admin HTTP %{http_code}\\n" http://127.0.0.1:3200/admin/',shell=True,capture_output=True,text=True).stdout)
