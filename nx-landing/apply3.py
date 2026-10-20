#!/usr/bin/env python3
"""Tahap 3: (a) IP asli untuk pembatas login, (b) artikel blog 1. Backup dulu; ragu = batal tanpa mengubah.
Pakai: python3 apply3.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess,secrets
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
RESTART='--no-restart' not in sys.argv
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage3-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
changed=[]
# (a) trust proxy
srv=rd(P('server.js'))
if 'trust proxy' in srv:
    print('[a] trust proxy sudah ada: dilewati')
else:
    m=re.findall(r'^(const app = express\(\);)[ \t]*$',srv,re.M)
    if len(m)!=1: print('[a] DILEWATI: "const app = express();" tidak tunggal (%d)'%len(m))
    else:
        shutil.copy2(P('server.js'),bk)
        new=srv.replace('const app = express();','const app = express();\napp.set("trust proxy", "loopback"); // IP asli dari nginx (pembatas login per IP)',1)
        open(P('server.js'),'wb').write(new.encode())
        r=subprocess.run('node --check '+P('server.js'),shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'server.js'),P('server.js')); print('[a] syntax error, dikembalikan:',r.stderr[:200])
        else: changed.append('server.js'); print('[a] trust proxy ditambahkan')
# (b) artikel
bj=json.loads(rd(P('data','blog.json'))); posts=bj['posts']
SLUG='cara-mengerjakan-tugas-tutorial-ut-biar-rapi-dan-tidak-telat'
if any(p.get('slug')==SLUG for p in posts): print('[b] artikel sudah ada: dilewati')
else:
    code=rd(P('blog-akun.js'))
    tops={p.get('topic') for p in posts}|set(re.findall(r'["\']([a-z0-9-]{2,20})["\']',code))
    pick=None
    for pat in (r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Study["\']',
                r'["\']?([A-Za-z0-9_-]{2,20})["\']?\s*:\s*["\'](?:Study|study)["\']',            # id: "Study"
                r'(?:id|key|value|slug)\s*:\s*["\']([A-Za-z0-9_-]{2,20})["\'][^{}]{0,80}(?:label|name|title)\s*:\s*["\']Study["\']',
                r'\[\s*["\']([A-Za-z0-9_-]{2,20})["\']\s*,\s*["\']Study["\']'):
        m=re.search(pat,code)
        if m and m.group(1) not in ('label','name','title','id'): pick=m.group(1); break
    if not pick:
        for t in ('study','ut','akademik','update-ut','updateut','tutorial','kuliah'):
            if re.search(r'["\']%s["\']'%t,code) or t in {p.get('topic') for p in posts}: pick=t; break
    if not pick:
        print('[b] baris "Study" di blog-akun.js:')
        for n,l in enumerate(code.splitlines(),1):
            if re.search(r'Study|study',l): print('   ',n,l.strip()[:160])
    print('[b] topik di data blog:',sorted({p.get('topic') for p in posts if p.get('topic')}),'| dipilih:',pick)
    if not pick: print('[b] DILEWATI: belum ada topik UT/akademik. Kirim daftar topik di atas ke Claude.')
    else:
        tpl=posts[0]; p={}
        for k,v in tpl.items():
            p[k]=False if isinstance(v,bool) else ([] if isinstance(v,list) else (0 if isinstance(v,(int,float)) else ('' if isinstance(v,str) else None)))
        title='Cara Mengerjakan Tugas Tutorial UT Biar Rapi dan Tidak Telat'
        body=rd(os.path.join(HERE,'parts','artikel1.txt')).strip()
        p.update({'id':secrets.token_hex(6),'slug':SLUG,'createdAt':time.strftime('%Y-%m-%dT%H:%M:%S.000Z',time.gmtime()),'title':title,'topic':pick,
                  'excerpt':'Panduan langkah demi langkah mengerjakan tugas tutorial UT: baca soal, susun jawaban, cek sitasi, dan kirim sebelum tenggat.','body':body})
        shutil.copy2(P('data','blog.json'),bk)
        posts.insert(0,p)
        open(P('data','blog.json'),'w',encoding='utf-8').write(json.dumps(bj,ensure_ascii=False,indent=2)+'\n')
        changed.append('blog.json'); print('[b] artikel 1 ditambahkan (topik: %s)'%pick)
print('backup ->',bk,'| berubah:',changed or 'tidak ada')
if changed and RESTART:
    print(subprocess.run('pm2 restart nextaja --update-env 2>&1 | tail -2; sleep 2; curl -s -o /dev/null -w "HTTP %{http_code}\\n" http://127.0.0.1:3200/blog',shell=True,capture_output=True,text=True).stdout)
    print('Cek: https://nextaja.com/blog  dan  https://nextaja.com/blog/'+SLUG)
print('Rollback: salin file di',bk,'ke tempat asalnya lalu pm2 restart nextaja')
