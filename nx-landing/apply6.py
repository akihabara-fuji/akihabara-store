#!/usr/bin/env python3
"""Tahap 6: kategori baru "Update UT" + artikel jadwal UT terverifikasi + sampul. Backup dulu, cek sintaks, rollback otomatis.
Pakai: python3 apply6.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess,secrets
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage6-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
log=[]; BA=P('blog-akun.js'); F=P('data','blog.json')
code=rd(BA); topic=None
m=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Update UT["\']',code)
if m: topic=m.group(1); log.append('kategori Update UT sudah ada')
else:
    ms=re.search(r'^([ \t]*)study\s*:\s*\{[^\n]*\},?[ \t]*$',code,re.M)
    if not ms: log.append('DILEWATI: baris kategori study tidak ketemu, kategori tidak ditambah')
    else:
        shutil.copy2(BA,bk)
        line=ms.group(0); ind=ms.group(1)
        new=code.replace(line,line.rstrip(',')+','+'\n'+ind+'updateut: { label: "Update UT", ask: "Kabar dan jadwal terbaru Universitas Terbuka" },',1) if line.rstrip().endswith(',') or True else code
        open(BA,'wb').write(new.encode())
        r=subprocess.run('node --check '+BA,shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'blog-akun.js'),BA); log.append('SYNTAX ERROR blog-akun.js, dikembalikan: '+r.stderr[:150])
        else: topic='updateut'; log.append('kategori "Update UT" ditambahkan')
d=json.loads(rd(F)); posts=d['posts']; SL='update-ut-jadwal-penting-yang-sudah-terverifikasi-per-20-oktober-2026'
if not topic: log.append('artikel tidak ditambah (kategori tidak ada)')
elif any(p['slug']==SL for p in posts): log.append('artikel sudah ada')
else:
    ref=next(p for p in posts if 'cover' in p)
    ts=time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime()); n={}
    for k,v in ref.items():
        n[k]=v if k in('status','author') else (False if isinstance(v,bool) else ([] if isinstance(v,list) else (0 if isinstance(v,(int,float)) else ('' if isinstance(v,str) else None))))
    old=next((p.get('cover') for p in posts if str(p.get('cover','')).startswith('/uploads/nx-cover-')),None)
    if not old: old=next((p.get('cover') for p in posts if str(p.get('cover','')).startswith('/uploads/')),None)
    fn=os.path.basename(old); updir=next(r for r in (P('public','uploads'),P('uploads'),P('data','uploads')) if os.path.exists(os.path.join(r,fn)))
    shutil.copy2(os.path.join(HERE,'assets','cover','cover-updateut.jpg'),os.path.join(updir,'nx-cover-updateut.jpg'))
    n.update({'id':secrets.token_hex(6),'slug':SL,'createdAt':ts,'publishedAt':ts,'title':'Update UT: Jadwal Penting yang Sudah Terverifikasi per 20 Oktober 2026','topic':topic,'cover':'/uploads/nx-cover-updateut.jpg',
      'excerpt':'Rangkuman jadwal pendaftaran, admisi pascasarjana, dan pola kalender semester UT yang bisa diverifikasi, lengkap dengan bagian yang belum terverifikasi.','body':rd(os.path.join(HERE,'parts','artikel5.txt')).strip()})
    shutil.copy2(F,bk); posts.insert(0,n)
    open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); log.append('artikel Update UT ditambah (kategori %s)'%topic)
print('\n'.join(log)); print('backup ->',bk)
if any(l.startswith(('kategori "Update','artikel Update')) for l in log) and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "blog HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog; curl -s -o /dev/null -w "artikel HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog/%s; curl -s -o /dev/null -w "sampul HTTP %%{http_code}\\n" http://127.0.0.1:3200/uploads/nx-cover-updateut.jpg'%SL,shell=True,capture_output=True,text=True).stdout)
