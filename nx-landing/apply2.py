#!/usr/bin/env python3
"""Tahap 2: kolom admin untuk link WhatsApp Channel + 4 harga, perbaikan strip HP.
Pakai: python3 apply2.py [/var/www/mahyra-serv] [--no-restart]. Backup dulu; anchor salah = batal tanpa mengubah apa pun."""
import sys,os,re,glob,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
RESTART='--no-restart' not in sys.argv
P=lambda *a: os.path.join(BASE,*a)
def rd(f): return open(f,'rb').read().decode('utf-8')
def rep(s,old,new,n=1):
    assert s.count(old)==n,'ditemukan %d (harap %d): %s'%(s.count(old),n,old[:70]); return s.replace(old,new)

# --- server.js
srv=rd(P('server.js'))
assert 'waChannelUrl' not in srv,'server.js sudah dipatch'
m=re.findall(r'(\n[ \t]*)facebookUrl: url\(s\.facebookUrl\),',srv); assert len(m)==1,'anchor facebookUrl tidak tunggal'
ind=m[0]
add=(ind+'waChannelUrl: (function(v){v=String(v||"").trim();return /^https:\\/\\/(www\\.)?whatsapp\\.com\\/channel\\/[A-Za-z0-9_-]{5,80}$/.test(v)?v:""})(s.waChannelUrl),'
     +''.join(ind+'%s: str(s.%s, 20),'%(k,k) for k in ('priceMetopen','priceTugas','priceDiskusi','priceMakalah')))
srv2=srv.replace('facebookUrl: url(s.facebookUrl),','facebookUrl: url(s.facebookUrl),'+add,1)

# --- admin
cands=[f for f in glob.glob(P('admin','**','*.html'),recursive=True)+glob.glob(P('public','admin','**','*.html'),recursive=True) if 'id="facebookUrl"' in rd(f)]
assert len(cands)==1,'file admin tidak tunggal: %s'%cands
AD=cands[0]; adm_raw=rd(AD); crlf='\r\n' in adm_raw; adm=adm_raw.replace('\r\n','\n')
assert 'waChannelUrl' not in adm
adm=rep(adm,'"facebook","facebookUrl"]','"facebook","facebookUrl","waChannelUrl","priceMetopen","priceTugas","priceDiskusi","priceMakalah"]')
mm=re.search(r'<div class="card">\s*<h3>Nama &amp; sosial media</h3>|<div class="card">\s*<h3>Nama & sosial media</h3>',adm); assert mm,'kartu sosial media tidak ketemu'
card='''<div class="card">
        <h3>Link channel &amp; harga di landing</h3>
        <label>Link WhatsApp Channel<input id="waChannelUrl" type="url" placeholder="https://whatsapp.com/channel/..."></label>
        <div class="grid2">
          <label>Harga Paket Metopen<input id="priceMetopen" maxlength="20" placeholder="Rp850.000"></label>
          <label>Harga Tugas (per tugas)<input id="priceTugas" maxlength="20" placeholder="Rp40.000"></label>
        </div>
        <div class="grid2">
          <label>Harga Diskusi (per mata kuliah)<input id="priceDiskusi" maxlength="20" placeholder="Rp20.000"></label>
          <label>Harga Makalah<input id="priceMakalah" maxlength="20" placeholder="Rp45.000"></label>
        </div>
        <p class="hint">Kosongkan harga untuk memakai angka bawaan. Link channel hanya menerima https://whatsapp.com/channel/...</p>
      </div>
      '''
adm=adm[:mm.start()]+card+adm[mm.start():]

# --- index.html
idx=rd(P('public','index.html')); assert 'id="nx-landing"' in idx,'landing belum terpasang'
for k,v in (('priceMetopen','Rp850.000'),('priceTugas','Rp40.000'),('priceDiskusi','Rp20.000'),('priceMakalah','Rp45.000')):
    if 'data-pk="%s"'%k not in idx:
        idx=rep(idx,'<div class="price">%s'%v,'<div class="price" data-pk="%s">%s'%(k,v))
if 'data-pk]' not in idx.split('/* alur */')[0] and 'querySelectorAll("[data-pk]")' not in idx:
    js='''/* harga dari admin */
document.querySelectorAll("[data-pk]").forEach(function(e){var v=S[e.dataset.pk];if(v&&/^[A-Za-z0-9 .,\\/-]{1,24}$/.test(v)){var n=e.firstChild;if(n&&n.nodeType===3)n.nodeValue=v+" ";else e.textContent=v}});
/* alur */'''
    idx=rep(idx,'/* alur */',js)
idx=idx.replace('@media (max-width:860px){.hero.hx{min-height:0;display:flex;flex-direction:column','@media (max-width:860px){.hero.hx{min-height:0;display:flex;align-items:stretch;flex-direction:column') if 'align-items:stretch;flex-direction:column' not in idx else idx

# --- tulis
bk='/root/backups/nx-stage2-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk)
for f in (P('server.js'),AD,P('public','index.html')): shutil.copy2(f,os.path.join(bk,os.path.basename(f)+('.admin' if f==AD else '')))
open(P('server.js'),'wb').write(srv2.encode())
open(AD,'wb').write((adm.replace('\n','\r\n') if crlf else adm).encode())
open(P('public','index.html'),'wb').write(idx.encode())
print('backup ->',bk,'| admin:',AD)
r=subprocess.run('node --check %s'%P('server.js'),shell=True,capture_output=True,text=True)
if r.returncode:
    print('SYNTAX ERROR server.js, rollback otomatis:',r.stderr[:300]); shutil.copy2(os.path.join(bk,'server.js'),P('server.js')); sys.exit(1)
if RESTART:
    print(subprocess.run('pm2 restart nextaja --update-env 2>&1 | tail -3; sleep 2; curl -s -o /dev/null -w "HTTP %{http_code}\\n" http://127.0.0.1:3200/',shell=True,capture_output=True,text=True).stdout)
print('Rollback: cp %s/server.js %s && cp %s/index.html %s && cp %s/%s.admin %s && pm2 restart nextaja'%(bk,P('server.js'),bk,P('public','index.html'),bk,os.path.basename(AD),AD))
