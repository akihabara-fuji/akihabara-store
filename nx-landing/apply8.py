#!/usr/bin/env python3
"""Tahap 8: bingkai sampul kartu blog dibuat tipis & halus (hapus padding 12px + gradien ungu di .cv). Backup, idempotent.
Pakai: python3 apply8.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess,glob
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
bk='/root/backups/nx-stage8-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
cands=[f for f in glob.glob(P('public','assets','blog.css'))+glob.glob(P('assets','blog.css'))+glob.glob(P('public','blog.css'))]
if not cands: print('DILEWATI: blog.css tidak ketemu'); sys.exit(0)
F=cands[0]; css=open(F,'rb').read().decode('utf-8')
MARK='/* nx-soft-cover */'
HERE=os.path.dirname(os.path.abspath(__file__))
# ganti sampul UT dengan versi soft (selalu, aman diulang)
cv=0
for ud in (P('public','uploads'),P('uploads'),P('data','uploads')):
    if os.path.exists(os.path.join(ud,'nx-cover-ut1.jpg')):
        for i in range(1,11):
            src=os.path.join(HERE,'assets','cover','cover-ut%d.jpg'%i)
            if os.path.exists(src): shutil.copy2(src,os.path.join(ud,'nx-cover-ut%d.jpg'%i)); cv+=1
        break
print('sampul UT diganti:',cv)
if MARK in css:
    print('css sudah terpasang'); subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1',shell=True); sys.exit(0)
shutil.copy2(F,bk)
css+='\n'+MARK+'\n.cv{padding:0 !important;background:#14142e !important}\n.post{border-radius:14px}\n.post .cv{border-radius:14px 14px 0 0;overflow:hidden}\n'
open(F,'wb').write(css.encode('utf-8'))
# naikkan versi cache blog.css
n=0
for f in glob.glob(P('*.js')):
    t=open(f,'rb').read().decode('utf-8','ignore')
    if 'blog.css?v=' in t:
        shutil.copy2(f,bk); t2=re.sub(r'blog\.css\?v=(\d+)',lambda m:'blog.css?v='+str(int(m.group(1))+1),t); open(f,'wb').write(t2.encode('utf-8')); n+=1
print('blog.css dipatch:',F,'| versi cache dinaikkan di',n,'file | backup ->',bk)
if '--no-restart' not in sys.argv:
    print(subprocess.run('node --check %s >/dev/null 2>&1; pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "blog HTTP %%{http_code}\\n" http://127.0.0.1:3200/blog'%P('blog-akun.js'),shell=True,capture_output=True,text=True).stdout)
