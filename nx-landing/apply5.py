#!/usr/bin/env python3
"""Tahap 5: gambar sampul 3 artikel + artikel berita viral (tanpa sampul). Backup dulu. Pakai: python3 apply5.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess,secrets
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
F=P('data','blog.json'); d=json.loads(rd(F)); posts=d['posts']; code=rd(P('blog-akun.js'))
log=[]
# cari folder uploads dari sampul artikel lama
old=next((p.get('cover') for p in posts if p.get('cover','').startswith('/uploads/')),None)
updir=None
if old:
    fn=os.path.basename(old)
    for root in (P('public','uploads'),P('uploads'),P('data','uploads')):
        if os.path.exists(os.path.join(root,fn)): updir=root; break
if not updir:
    for root in (P('public','uploads'),P('uploads'),P('data','uploads')):
        if os.path.isdir(root): updir=root; break
assert updir,'folder uploads tidak ketemu'
log.append('folder uploads: '+updir)
cov={'cara-mengerjakan-tugas-tutorial-ut-biar-rapi-dan-tidak-telat':'tugas','sitasi-apa-dengan-mendeley-untuk-mahasiswa-ut':'sitasi','kenapa-views-tiktok-turun-10-hal-yang-perlu-dicek':'views'}
for p in posts:
    k=cov.get(p['slug'])
    if k and not p.get('cover'):
        name='nx-cover-%s.jpg'%k
        shutil.copy2(os.path.join(HERE,'assets','cover','cover-%s.jpg'%k),os.path.join(updir,name))
        p['cover']='/uploads/'+name; log.append('sampul dipasang: '+p['slug'][:40])
# berita viral
SL='siswi-smk-yang-hilang-ditemukan-di-apartemen-pik-2-polisi-masih-dalami-kronologi'
if not any(p['slug']==SL for p in posts):
    m=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Berita viral hari ini["\']',code)
    if not m: log.append('DILEWATI berita viral: id kategori tidak ketemu')
    else:
        ref=next(p for p in posts if p['slug'] not in cov and not p['slug'].startswith('siswi-smk'))
        ts=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime())
        n={}
        for k,v in ref.items():
            n[k]=v if k in('status','author') else (False if isinstance(v,bool) else ([] if isinstance(v,list) else (0 if isinstance(v,(int,float)) else ('' if isinstance(v,str) else None))))
        n.update({'id':secrets.token_hex(6),'slug':SL,'createdAt':ts,'publishedAt':ts,'title':'Siswi SMK yang Hilang Ditemukan di Apartemen PIK 2, Polisi Masih Dalami Kronologi','topic':m.group(1),
          'excerpt':'Siswi SMK berusia 16 tahun asal Tasikmalaya yang dilaporkan hilang sejak 2 Oktober ditemukan selamat di apartemen kawasan PIK 2. Polisi masih mendalami kronologinya.','body':rd(os.path.join(HERE,'parts','artikel4.txt')).strip()})
        posts.insert(0,n); log.append('berita viral ditambah (kategori %s)'%m.group(1))
else: log.append('berita viral sudah ada')
print('\n'.join(log))
if any(l.startswith(('sampul','berita viral ditambah')) for l in log):
    bk='/root/backups/nx-stage5-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True); shutil.copy2(F,bk)
    open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); print('backup ->',bk)
    if '--no-restart' not in sys.argv:
        print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; for s in %s %s; do curl -s -o /dev/null -w "$s HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog/$s; done; for f in nx-cover-tugas nx-cover-sitasi nx-cover-views; do curl -s -o /dev/null -w "$f HTTP %%{http_code}\\n" http://127.0.0.1:3200/uploads/$f.jpg; done'%(SL,'sitasi-apa-dengan-mendeley-untuk-mahasiswa-ut'),shell=True,capture_output=True,text=True).stdout)
