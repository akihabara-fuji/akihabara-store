#!/usr/bin/env python3
"""Tahap 9: SEO artikel blog: og:image, og:type=article, twitter card, dateModified terisi. Backup, node --check, rollback.
Pakai: python3 apply9.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
S=os.path.join(BASE,'server.js')
bk='/root/backups/nx-stage9-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
code=open(S,'rb').read().decode('utf-8')
if 'nx-seo-mw' in code: print('sudah terpasang'); sys.exit(0)
m=re.search(r'app\.set\(\s*["\']trust proxy["\'][^;]*;',code)
if not m: print('DILEWATI: baris trust proxy tidak ketemu di server.js'); sys.exit(0)
MW='''
// nx-seo-mw: tambah og:image, og:type article, twitter card, dateModified di halaman artikel blog
app.use(function (req, res, next) {
  if (req.method !== "GET" || !/^\\/blog\\/[^\\/]+/.test(req.path)) return next();
  var send = res.send;
  res.send = function (b) {
    try {
      if (typeof b === "string" && b.indexOf("</head>") > -1) {
        var img = b.match(/"image":"(https?:[^"]+)"/);
        b = b.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">');
        if (img && b.indexOf('property="og:image"') < 0) {
          b = b.replace('<meta property="og:url"', '<meta property="og:image" content="' + img[1] + '"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + img[1] + '"><meta property="og:url"');
        }
        var dp = b.match(/"datePublished":"([^"]+)"/);
        if (dp) b = b.replace('"dateModified":""', '"dateModified":"' + dp[1] + '"');
      }
    } catch (e) {}
    return send.call(this, b);
  };
  next();
});
'''
shutil.copy2(S,bk)
open(S,'wb').write((code[:m.end()]+'\n'+MW+code[m.end():]).encode('utf-8'))
r=subprocess.run('node --check '+S,shell=True,capture_output=True,text=True)
if r.returncode:
    shutil.copy2(os.path.join(bk,'server.js'),S); print('SYNTAX ERROR, dikembalikan:',r.stderr[:200]); sys.exit(1)
print('SEO artikel dipasang | backup ->',bk)
if '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s http://127.0.0.1:3200/blog/cara-membagi-waktu-kuliah-ut-sambil-bekerja | grep -o \'og:image[^>]*>\\|og:type[^>]*>\' ; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog',shell=True,capture_output=True,text=True).stdout)
