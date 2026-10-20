#!/usr/bin/env python3
"""Tahap 10: gabungkan kategori Study ke Update UT. Pindahkan semua artikel Study -> updateut, lalu hapus kategori Study bila aman.
Backup, node --check, rollback. Pakai: python3 apply10.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage10-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
BA=P('blog-akun.js'); F=P('data','blog.json'); code=rd(BA); log=[]
mu=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Update UT["\']',code)
ms=re.search(r'\b([a-z][a-z0-9_-]{1,19})\s*:\s*\{\s*label\s*:\s*["\']Study["\']',code)
if not mu: print('DILEWATI: kategori Update UT tidak ketemu'); sys.exit(0)
tu=mu.group(1); ts=ms.group(1) if ms else 'study'
d=json.loads(rd(F)); n=0
shutil.copy2(F,bk)
for p in d['posts']:
    if p.get('topic')==ts: p['topic']=tu; n+=1
open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
log.append('artikel dipindah ke Update UT: %d'%n)
if ms:
    line=re.search(r'^[ \t]*'+re.escape(ts)+r'\s*:\s*\{[^\n]*\},?[ \t]*\n',code,re.M)
    others=len(re.findall(r'\b'+re.escape(ts)+r'\b',code))
    if line and others==1:
        shutil.copy2(BA,bk)
        open(BA,'wb').write(code.replace(line.group(0),'',1).encode('utf-8'))
        r=subprocess.run('node --check '+BA,shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'blog-akun.js'),BA); log.append('SYNTAX ERROR, kategori Study dikembalikan')
        else: log.append('kategori Study dihapus')
    else: log.append('kategori Study TIDAK dihapus (masih dipakai %d tempat di kode); artikel tetap sudah dipindah'%others)
print('\n'.join(log)); print('backup ->',bk)
if '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog; curl -s -o /dev/null -w "kategori HTTP %{http_code}\\n" "http://127.0.0.1:3200/blog?topic='+tu+'"',shell=True,capture_output=True,text=True).stdout)
