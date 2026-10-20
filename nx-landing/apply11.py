#!/usr/bin/env python3
"""Tahap 11: hapus link Housekeeping/#jasa dari header & footer blog; cetak baris sampul untuk audit editor. Backup, node --check, rollback."""
import sys,os,re,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
BA=os.path.join(BASE,'blog-akun.js')
bk='/root/backups/nx-stage11-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
code=open(BA,'rb').read().decode('utf-8')
pat=re.compile(r'[ \t]*<a\b[^>]*href=["\']/?#jasa["\'][^>]*>\s*(?:Housekeeping|Jasa[^<]*)\s*</a>[ \t]*\n?',re.I)
n=len(pat.findall(code))
if n:
    shutil.copy2(BA,bk); new=pat.sub('',code)
    open(BA,'wb').write(new.encode('utf-8'))
    r=subprocess.run('node --check '+BA,shell=True,capture_output=True,text=True)
    if r.returncode: shutil.copy2(os.path.join(bk,'blog-akun.js'),BA); print('SYNTAX ERROR, dikembalikan:',r.stderr[:200]); n=0
    else: print('link Housekeeping dihapus: %d tempat | backup -> %s'%(n,bk))
else:
    print('tidak ada link Housekeeping/#jasa yang cocok pola; sisa baris terkait:')
    for i,l in enumerate(code.split('\n'),1):
        if re.search(r'housekeeping|#jasa',l,re.I): print(i,l.strip()[:160])
print('--- baris sampul/cover di editor blog (untuk audit) ---')
for i,l in enumerate(open(BA,encoding='utf-8').read().split('\n'),1):
    if re.search(r'cover|upload|<input[^>]*file',l,re.I): print(i,l.strip()[:170])
if n and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s http://127.0.0.1:3200/blog | grep -ci housekeeping; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog',shell=True,capture_output=True,text=True).stdout)
