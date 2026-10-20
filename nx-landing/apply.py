#!/usr/bin/env python3
"""Terapkan landing final nextaja. Aman: backup dulu, semua anchor dicek tepat 1x, gagal = tidak ada yang berubah.
Pakai:  python3 apply.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,json,shutil,time,subprocess
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
RESTART='--no-restart' not in sys.argv
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,encoding='utf-8').read()
part=lambda n: rd(os.path.join(HERE,'parts',n))

idx=rd(P('public','index.html'))
store=json.loads(rd(P('data','store.json')))

def cut(s,start,end,new,keep_end=True):
    assert s.count(start)==1,'anchor awal tidak tunggal: '+start
    i=s.index(start); j=s.index(end,i)
    assert s.count(end)>=1 and j>i,'anchor akhir tidak ketemu: '+end
    return s[:i]+new+s[j:]
def rep(s,old,new,n=1):
    assert s.count(old)==n,'ditemukan %d (harap %d): %s'%(s.count(old),n,old[:60])
    return s.replace(old,new)

if 'id="nx-landing"' in idx:
    sys.exit('Sudah pernah diterapkan (nx-landing ada). Batal.')

new=idx
new=cut(new,'<section class="hero" id="heroSec">','<section class="s" id="angka"',part('hero.html'))
new=cut(new,'<section class="s" id="akademik">','<section class="s" id="analisa">',part('akademik.html'))
new=cut(new,'<section class="s" id="alur">','<section class="s" id="ulasan"',part('alur.html'))
new=rep(new,'<section class="s" id="faq">',part('sosial.html')+'<section class="s" id="faq">')
new=rep(new,'<a href="#akademik">Pendampingan UT</a>','<a href="#akademik">Kebutuhan anak UT</a>',2)
new=rep(new,'© <span id="yr"></span> Semua hak dilindungi.','© <span id="yr"></span> Semua hak dilindungi.<br>Situs ini bukan situs resmi Universitas Terbuka.')
new=rep(new,'</head>','<style id="nx-landing">\n'+part('hero.css')+'</style>\n</head>')
new=rep(new,'</body>',part('nx.js')+'</body>')

# data toko
s=store['settings']
s['heroEyebrow']='Belajar, Tugas, dan Jalur Karir'
s['heroTitle']='Urus kuliah UT atau bangun akun kontenmu, *mulai dari sini.*'
s['heroLead']='Pendampingan tugas, diskusi, dan metopen untuk mahasiswa UT. Atau ambil jalan lain dan manfaatkan skill serta kontenmu untuk kreator dan affiliator.'
for f in store['faq']:
    if f.get('id')=='f6':
        f['q']='Bagaimana soal nilai dan revisi?'
        f['a']='Ada tahap review sebelum dikirim ke tutor, dan revisi atas setiap masukan tutor terjamin selama sesi masih aktif. Nilai akhir tetap ditentukan oleh tutor.'
rv=store.setdefault('reviews',[])
have={r.get('id') for r in rv}
caps=['Tugas dinilai tutor, hasil dikabari lewat chat','Dicek ulang sebelum dikirim, jawaban sudah betul','Masukan tutor dibantu direvisi']
for i,c in enumerate(caps,1):
    if 'nxt%d'%i not in have:
        rv.append({'id':'nxt%d'%i,'image':'/assets/testi/testi-%d.jpg'%i,'name':'Pelanggan (data disamarkan)','text':'','area':'akademik','active':True})

m=re.search(r'(<script id="store-data" type="application/json">)(.*?)(</script>)',new,re.S)
assert m,'store-data tidak ketemu'
inj=json.dumps(store,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
new=new[:m.start(2)]+inj+new[m.end(2):]
assert new.count('<script id="store-data"')==1

# --- tulis (backup dulu)
ts=time.strftime('%Y%m%d-%H%M%S'); bk='/root/backups/nx-landing-'+ts
os.makedirs(bk,exist_ok=True)
for f in (P('public','index.html'),P('data','store.json')): shutil.copy2(f,bk)
print('backup ->',bk)
os.makedirs(P('public','assets','hero'),exist_ok=True); os.makedirs(P('public','assets','testi'),exist_ok=True)
shutil.copy2(os.path.join(HERE,'assets','model-ut.jpg'),P('public','assets','hero','model-ut.jpg'))
for i in (1,2,3): shutil.copy2(os.path.join(HERE,'assets','testi-%d.jpg'%i),P('public','assets','testi','testi-%d.jpg'%i))
open(P('public','index.html'),'w',encoding='utf-8').write(new)
indent=2 if rd(P('data','store.json')).startswith('{\n  "') else None
open(P('data','store.json'),'w',encoding='utf-8').write(json.dumps(store,ensure_ascii=False,indent=indent)+('\n' if indent else ''))
print('index.html + store.json diperbarui')
if RESTART:
    print(subprocess.run('pm2 restart nextaja --update-env 2>&1 | tail -4',shell=True,capture_output=True,text=True).stdout)
    time.sleep(2)
    print(subprocess.run('curl -s -o /dev/null -w "HTTP %{http_code} %{size_download} bytes\\n" http://127.0.0.1:3200/; curl -s http://127.0.0.1:3200/ | grep -c "nx-landing"',shell=True,capture_output=True,text=True).stdout)
print('Rollback: cp %s/index.html %s && cp %s/store.json %s && pm2 restart nextaja'%(bk,P('public','index.html'),bk,P('data','store.json')))
