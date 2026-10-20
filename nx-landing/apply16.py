#!/usr/bin/env python3
"""Tahap 16 (admin): toolbar format, hitung kata + waktu baca, pratinjau, ceklis kualitas di editor blog.
Backup, idempotent. Pakai: python3 apply16.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
AD=os.path.join(BASE,'admin','index.html')
bk='/root/backups/nx-stage16-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
t=open(AD,'rb').read().decode('utf-8'); nl='\r\n' if '\r\n' in t else '\n'
if 'id="bTools"' in t: print('sudah terpasang'); sys.exit(0)
a1='<textarea name="body" rows="12" id="bBody"></textarea>'
a2='$("#bForm").addEventListener("submit"'
if a1 not in t or a2 not in t: print('DILEWATI: anchor editor tidak ketemu'); sys.exit(0)
B=lambda f,l,tt='': '<button type="button" class="btn btn-sm" data-f="%s" title="%s" style="padding:4px 10px">%s</button>'%(f,tt or l,l)
TOOLS=('<div id="bTools" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">'
  +B('h2','Judul','Judul bagian')+B('h3','Sub','Sub judul')+B('b','<b>B</b>','Tebal')+B('i','<i>I</i>','Miring')
  +B('ol','1. 2. 3.','Daftar bernomor (pilih beberapa baris dulu)')+B('ul','• Poin','Daftar poin (pilih beberapa baris dulu)')+B('q','❝ Kutipan','Kutipan')+B('a','Link','Sisipkan link')+'</div>')
AFTER=('<div style="display:flex;gap:10px;align-items:center;margin:6px 0"><span id="bStats" style="font-size:13px;opacity:.7"></span>'
  '<button type="button" id="bPrevBtn" class="btn btn-sm" style="margin-left:auto">Lihat pratinjau</button></div>'
  '<div id="bPrev" hidden style="border:1px solid rgba(127,127,160,.35);border-radius:12px;padding:12px 16px;margin:6px 0;max-height:320px;overflow:auto;line-height:1.7"></div>'
  '<div id="bQA" style="border:1px dashed rgba(127,127,160,.45);border-radius:12px;padding:10px 14px;margin:8px 0"></div>')
js=open(os.path.join(HERE,'edit16.js'),encoding='utf-8').read()
shutil.copy2(AD,bk)
t2=t.replace(a1,TOOLS+a1+AFTER,1).replace(a2,js.replace('\n',nl)+nl+a2,1)
open(AD,'wb').write(t2.encode('utf-8')); print('editor: toolbar, hitung kata, pratinjau, ceklis kualitas dipasang | backup ->',bk)
if '--no-restart' not in sys.argv:
    print(subprocess.run('curl -s -o /dev/null -w "admin HTTP %{http_code}\\n" http://127.0.0.1:3200/admin/',shell=True,capture_output=True,text=True).stdout)
