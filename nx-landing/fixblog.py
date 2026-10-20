#!/usr/bin/env python3
"""Perbaiki penanda (status dll) artikel 1 dengan menyalin dari artikel lama yang sudah tampil. Backup dulu."""
import sys,os,json,shutil,time,subprocess
BASE=(sys.argv[1] if len(sys.argv)>1 and not sys.argv[1].startswith('--') else '/var/www/mahyra-serv')
F=os.path.join(BASE,'data','blog.json'); SLUG='cara-mengerjakan-tugas-tutorial-ut-biar-rapi-dan-tidak-telat'
d=json.load(open(F,encoding='utf-8')); posts=d['posts']
new=next((p for p in posts if p.get('slug')==SLUG),None)
ref=next((p for p in posts if p.get('slug')!=SLUG),None)
assert new and ref,'artikel baru atau artikel pembanding tidak ada'
print('kolom artikel lama :',{k:(v if k not in('body','excerpt') else '...') for k,v in ref.items()})
print('kolom artikel baru :',{k:(v if k not in('body','excerpt') else '...') for k,v in new.items()})
skip=('id','slug','createdat','updatedat','title','topic','excerpt','body','image','cover','thumb','img','view','trash','delete')
fix=[]
for k,v in ref.items():
    if k not in new or new[k] in ('',None):
        if any(s in k.lower() for s in skip): continue
        new[k]=v; fix.append(k)
print('kolom disalin dari artikel lama:',fix or 'tidak ada')
if fix and '--no-restart' not in sys.argv:
    bk='/root/backups/nx-fixblog-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True); shutil.copy2(F,bk)
    open(F,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "artikel HTTP %{http_code}\\n" http://127.0.0.1:3200/blog/'+SLUG,shell=True,capture_output=True,text=True).stdout)
    print('backup:',bk)
