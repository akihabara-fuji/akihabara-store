#!/usr/bin/env python3
"""Tahap 12: hapus sisa Housekeeping: teks di blog/ketentuan, dan sembunyikan tab Jasa di admin. Backup, node --check, rollback.
Pakai: python3 apply12.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
bk='/root/backups/nx-stage12-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
rd=lambda f: open(f,'rb').read().decode('utf-8')
log=[]; changed=False
# 1) blog-akun.js: teks
BA=P('blog-akun.js'); c=rd(BA); c2=c
c2=re.sub(r',\s*(?:serta|atau|dan)\s+(?:jasa\s+)?housekeeping','',c2,flags=re.I)
c2=re.sub(r'(?:serta|atau|dan)\s+(?:jasa\s+)?housekeeping,\s*','',c2,flags=re.I)
a=re.compile(r'[ \t]*<a\b[^>]*href=["\']/?#jasa["\'][^>]*>\s*(?:Housekeeping|Jasa[^<]*)\s*</a>[ \t]*\n?',re.I); c2=a.sub('',c2)
if c2!=c:
    shutil.copy2(BA,bk); open(BA,'wb').write(c2.encode('utf-8'))
    r=subprocess.run('node --check '+BA,shell=True,capture_output=True,text=True)
    if r.returncode: shutil.copy2(os.path.join(bk,'blog-akun.js'),BA); log.append('SYNTAX ERROR blog-akun.js, dikembalikan')
    else: log.append('blog-akun.js: teks/link Housekeeping dibersihkan'); changed=True
left=[(i,l.strip()[:150]) for i,l in enumerate(rd(BA).split('\n'),1) if re.search('housekeeping',l,re.I)]
log.append('sisa "housekeeping" di blog-akun.js: %d'%len(left)); log+=['  %d: %s'%x for x in left]
# 2) admin: sembunyikan tab Jasa
AD=P('admin','index.html')
if os.path.exists(AD):
    t=rd(AD); t2=re.sub(r'(<button\b[^>]*data-tab="jasa")((?![^>]*display:none)[^>]*>)\s*Jasa\s*</button>',r'\1 style="display:none"\2Jasa</button>',t)
    t2=t2.replace('foto, jasa, FAQ','foto, FAQ')
    if t2!=t:
        shutil.copy2(AD,bk); open(AD,'wb').write(t2.encode('utf-8')); log.append('admin: tab Jasa disembunyikan'); changed=True
    else: log.append('admin: tab Jasa sudah tersembunyi / pola tidak ketemu')
# 3) store.json: kosongkan services, laporkan sisa
F=P('data','store.json')
if os.path.exists(F):
    d=json.loads(rd(F)); sv=d.get('services') or []
    if sv:
        shutil.copy2(F,bk); d['services']=[]; open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); log.append('store.json: %d jasa lama dikosongkan'%len(sv)); changed=True
    s=json.dumps(d,ensure_ascii=False)
    log.append('sisa "housekeeping" di store.json: %d'%len(re.findall('housekeeping',s,re.I)))
print('\n'.join(log)); print('backup ->',bk)
if changed and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s http://127.0.0.1:3200/ms/ketentuan | grep -ci housekeeping; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog',shell=True,capture_output=True,text=True).stdout)
