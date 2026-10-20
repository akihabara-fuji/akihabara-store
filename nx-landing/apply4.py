#!/usr/bin/env python3
"""Tahap 4: perbaiki tanggal artikel 1 + tambah artikel 2 dan 3. Backup dulu. Pakai: python3 apply4.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess,secrets
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
F=P('data','blog.json'); d=json.loads(rd(F)); posts=d['posts']
code=rd(P('blog-akun.js'))
def topic_for(label):
    m=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']%s["\']'%re.escape(label),code)
    return m.group(1) if m else None
S1='cara-mengerjakan-tugas-tutorial-ut-biar-rapi-dan-tidak-telat'
ref=next((p for p in posts if not p['slug'].startswith(('cara-mengerjakan-tugas','sitasi-apa','kenapa-views'))),None); assert ref,'artikel pembanding tidak ada'
now=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime())
log=[]
for p in posts:
    if p['slug']==S1 and p.get('publishedAt')!=p.get('createdAt'): p['publishedAt']=p['createdAt']; log.append('tanggal artikel 1 diperbaiki')
def add(slug,title,excerpt,fn,label,offset):
    if any(p['slug']==slug for p in posts): log.append('sudah ada: '+slug); return
    t=topic_for(label)
    if not t: log.append('DILEWATI %s: id kategori "%s" tidak ketemu'%(slug,label)); return
    p={}
    for k,v in ref.items():
        p[k]=v if k in('status','author') else (False if isinstance(v,bool) else ([] if isinstance(v,list) else (0 if isinstance(v,(int,float)) else ('' if isinstance(v,str) else None))))
    ts=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime(time.time()+offset))
    p.update({'id':secrets.token_hex(6),'slug':slug,'createdAt':ts,'publishedAt':ts,'title':title,'topic':t,'excerpt':excerpt,'body':rd(os.path.join(HERE,'parts',fn)).strip()})
    posts.insert(0,p); log.append('ditambah: %s (kategori %s)'%(slug,t))
add('sitasi-apa-dengan-mendeley-untuk-mahasiswa-ut','Sitasi APA dengan Mendeley untuk Mahasiswa UT','Langkah praktis merapikan sitasi dan daftar pustaka gaya APA memakai Mendeley, plus kesalahan yang paling sering terjadi.','artikel2.txt','Study',-60)
add('kenapa-views-tiktok-turun-10-hal-yang-perlu-dicek','Kenapa Views TikTok Turun? 10 Hal yang Perlu Dicek','Sepuluh hal yang bisa kamu periksa sendiri saat views TikTok turun, dari tiga detik pertama sampai pedoman komunitas.','artikel3.txt','Social Media Update',-120)
print('\n'.join(log))
if any(l.startswith(('ditambah','tanggal')) for l in log):
    bk='/root/backups/nx-stage4-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True); shutil.copy2(F,bk)
    open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); print('backup ->',bk)
    if '--no-restart' not in sys.argv:
        print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; for s in %s sitasi-apa-dengan-mendeley-untuk-mahasiswa-ut kenapa-views-tiktok-turun-10-hal-yang-perlu-dicek; do curl -s -o /dev/null -w "$s HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog/$s; done'%S1,shell=True,capture_output=True,text=True).stdout)
