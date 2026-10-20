#!/usr/bin/env python3
"""Tahap 13: foto di dalam isi artikel. Editor: tombol 'Tambah foto ke isi' + daftar foto isi dengan tombol hapus.
Halaman artikel: tulisan ![keterangan](/uploads/x.jpg) tampil sebagai foto. Backup, node --check, rollback.
Pakai: python3 apply13.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess,glob
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage13-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
log=[]; changed=False
# ---- 1) server.js: render foto di isi artikel ----
S=P('server.js'); code=rd(S)
if 'nx-img-mw' in code: log.append('server: sudah terpasang')
else:
    m=re.search(r'app\.set\(\s*["\']trust proxy["\'][^;]*;',code)
    if not m: log.append('DILEWATI server: baris trust proxy tidak ketemu')
    else:
        MW='''
// nx-img-mw: foto di isi artikel. Tulisan ![keterangan](/uploads/x.jpg) tampil sebagai gambar
app.use(function (req, res, next) {
  if (req.method !== "GET" || !/^\\/blog\\/[^\\/]+/.test(req.path)) return next();
  var send = res.send;
  res.send = function (b) {
    try {
      if (typeof b === "string" && b.indexOf('class="prose"') > -1) {
        var fig = function (src, alt) {
          return '<figure class="nx-fig"><img src="' + src + '" alt="' + alt + '" loading="lazy">' + (alt ? '<figcaption>' + alt + '</figcaption>' : '') + '</figure>';
        };
        b = b.replace(/<p>\\s*!\\[([^\\]]*)\\]\\((\\/uploads\\/[^)\\s"<>]+)\\)\\s*<\\/p>/g, function (_, alt, src) { return fig(src, alt); });
        b = b.replace(/<p>\\s*!<a [^>]*href="(\\/uploads\\/[^"]+)"[^>]*>([^<]*)<\\/a>\\s*<\\/p>/g, function (_, src, alt) { return fig(src, alt); });
        b = b.replace(/!\\[([^\\]]*)\\]\\((\\/uploads\\/[^)\\s"<>]+)\\)/g, function (_, alt, src) { return fig(src, alt); });
      }
    } catch (e) {}
    return send.call(this, b);
  };
  next();
});
'''
        shutil.copy2(S,bk); open(S,'wb').write((code[:m.end()]+'\n'+MW+code[m.end():]).encode('utf-8'))
        r=subprocess.run('node --check '+S,shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'server.js'),S); log.append('SYNTAX ERROR server.js, dikembalikan: '+r.stderr[:150])
        else: log.append('server: foto di isi artikel dipasang'); changed=True
# ---- 2) blog.css ----
cs=(glob.glob(P('public','assets','blog.css'))+glob.glob(P('assets','blog.css')))
if cs:
    c=rd(cs[0])
    if 'nx-fig' not in c:
        shutil.copy2(cs[0],bk); open(cs[0],'wb').write((c+'\n/* nx-fig */\n.prose .nx-fig{margin:22px 0}\n.prose .nx-fig img{display:block;width:100%;height:auto;border-radius:14px}\n.prose .nx-fig figcaption{font-size:14px;opacity:.7;margin-top:8px;text-align:center}\n').encode('utf-8')); log.append('css: gaya foto isi ditambah'); changed=True
# ---- 3) admin ----
AD=P('admin','index.html')
if os.path.exists(AD):
    t=rd(AD); nl='\r\n' if '\r\n' in t else '\n'
    if 'bFile2' in t: log.append('admin: sudah terpasang')
    else:
        a1='id="bImgDel">Hapus foto</button></div></div>'
        a2='$("#bForm").addEventListener("submit"'
        if a1 not in t or a2 not in t: log.append('DILEWATI admin: pola tombol/handler tidak ketemu')
        else:
            HTML=('id="bImgDel">Hapus foto</button></div></div>'
              '<div><div style="font-size:13px;font-weight:600;color:var(--muted);margin:14px 0 6px">Foto di dalam isi <small>(muncul di tengah tulisan, di posisi kursor)</small></div>'
              '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-sm" style="cursor:pointer;color:var(--text)">+ Tambah foto ke isi<input type="file" id="bFile2" accept="image/*" multiple hidden></label></div>'
              '<div id="bImgs" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"></div></div>')
            JS=('''/* nx-img-admin */
const bBody=$("#bBody");
function bImgList(){const re=/!\\[([^\\]]*)\\]\\((\\/uploads\\/[^)\\s]+)\\)/g,out=[];let m;while((m=re.exec(bBody.value))) out.push({full:m[0],alt:m[1],src:m[2]});return out;}
function renderImgs(){const box=$("#bImgs"); if(!box) return; const L=bImgList(); box.innerHTML=L.length?"":'<span style="font-size:13px;opacity:.6">Belum ada foto di isi.</span>';
  L.forEach(it=>{const d=document.createElement("div"); d.style.cssText="position:relative;width:96px";
    d.innerHTML='<div style="width:96px;height:96px;border-radius:12px;background:#222 center/cover no-repeat;background-image:url(\\''+it.src+'\\')"></div><button type="button" class="btn btn-sm btn-bad" style="position:absolute;top:4px;right:4px;padding:2px 8px">✕</button>';
    d.querySelector("button").onclick=()=>{bBody.value=bBody.value.replace(it.full,"").replace(/\\n{3,}/g,"\\n\\n"); renderImgs();};
    box.appendChild(d);});}
bBody.addEventListener("input",renderImgs); $("#bDlg").addEventListener("focusin",renderImgs);
$("#bFile2").onchange=async e=>{const files=[...e.target.files]; if(!files.length) return;
  for(const file of files){ const fd=new FormData(); fd.append("file",await shrink(file));
    try{ const d=await api("/ms/admin/upload",{method:"POST",body:fd});
      const ins="\\n\\n!["+(file.name.replace(/\\.[^.]+$/,"").replace(/[\\[\\]()]/g,"").slice(0,60))+"]("+d.url+")\\n\\n";
      const p=bBody.selectionStart==null?bBody.value.length:bBody.selectionStart; bBody.value=bBody.value.slice(0,p)+ins+bBody.value.slice(p); bBody.selectionStart=bBody.selectionEnd=p+ins.length;
      toast("Foto ditambahkan ke isi"); }catch(err){ toast(err.message); } }
  e.target.value=""; renderImgs();};
''')
            t2=t.replace(a1,HTML.replace('\n',''),1)
            t2=t2.replace(a2,JS.replace('\n',nl)+a2,1)
            t2=t2.replace('<code>[teks](https://link)</code>','<code>[teks](https://link)</code>, foto pakai tombol di bawah',1)
            shutil.copy2(AD,bk); open(AD,'wb').write(t2.encode('utf-8')); log.append('admin: tombol foto di isi artikel ditambah'); changed=True
print('\n'.join(log)); print('backup ->',bk)
if changed and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog; curl -s -o /dev/null -w "admin HTTP %{http_code}\\n" http://127.0.0.1:3200/admin/',shell=True,capture_output=True,text=True).stdout)
