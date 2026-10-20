#!/usr/bin/env python3
"""Tahap 7: 10 artikel UT (kategori Study) + sampul model Naya. Backup dulu, idempotent.
Pakai: python3 apply7.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess,secrets
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage7-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
F=P('data','blog.json'); BA=P('blog-akun.js')
code=rd(BA); m=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Study["\']',code)
topic=m.group(1) if m else 'study'
d=json.loads(rd(F)); posts=d['posts']
ref=next(p for p in posts if 'cover' in p)
old=next((p.get('cover') for p in posts if str(p.get('cover','')).startswith('/uploads/nx-cover-')),None) or next(p.get('cover') for p in posts if str(p.get('cover','')).startswith('/uploads/'))
fn=os.path.basename(old); updir=next(r for r in (P('public','uploads'),P('uploads'),P('data','uploads')) if os.path.exists(os.path.join(r,fn)))
A=json.loads(rd(os.path.join(HERE,'parts','ut-articles.json')))
shutil.copy2(F,bk); added=0; t0=time.time()
for i,a in enumerate(A):
    if any(p['slug']==a['slug'] for p in posts): continue
    cf='nx-cover-ut%d.jpg'%(i+1)
    shutil.copy2(os.path.join(HERE,'assets','cover','cover-ut%d.jpg'%(i+1)),os.path.join(updir,cf))
    ts=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime(t0-i*60)); n={}
    for k,v in ref.items():
        n[k]=v if k in('status','author') else (False if isinstance(v,bool) else ([] if isinstance(v,list) else (0 if isinstance(v,(int,float)) else ('' if isinstance(v,str) else None))))
    n.update({'id':secrets.token_hex(6),'slug':a['slug'],'createdAt':ts,'publishedAt':ts,'title':a['title'],'topic':topic,'cover':'/uploads/'+cf,'excerpt':a['excerpt'],'body':a['body']})
    posts.append(n); added+=1
posts.sort(key=lambda p:p.get('publishedAt') or p.get('createdAt') or '',reverse=True) if False else None
# artikel baru ditaruh di depan, urutan sesuai daftar
new=[p for p in posts if p['slug'] in {a['slug'] for a in A}]; rest=[p for p in posts if p not in new]
new.sort(key=lambda p:p['publishedAt'],reverse=True); d['posts']=new+rest
open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('artikel ditambah:',added,'| kategori:',topic,'| backup ->',bk)
if added and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "blog HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog; curl -s -o /dev/null -w "artikel HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog/%s; curl -s -o /dev/null -w "sampul HTTP %%{http_code}\\n" http://127.0.0.1:3200/uploads/nx-cover-ut1.jpg'%A[0]['slug'],shell=True,capture_output=True,text=True).stdout)
