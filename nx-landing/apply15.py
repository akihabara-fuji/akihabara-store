#!/usr/bin/env python3
"""Tahap 15 (server+css): format tulisan (1. 2. 3., poin simbol, kutipan, miring, ### sub), waktu baca, alt sampul, bagikan WhatsApp, Baca juga.
Backup, node --check, rollback, idempotent. Pakai: python3 apply15.py [/var/www/mahyra-serv] [--no-restart]"""
import sys,os,re,shutil,time,subprocess,glob
HERE=os.path.dirname(os.path.abspath(__file__))
args=[a for a in sys.argv[1:] if not a.startswith('--')]
BASE=args[0] if args else '/var/www/mahyra-serv'
P=lambda *a: os.path.join(BASE,*a)
rd=lambda f: open(f,'rb').read().decode('utf-8')
bk='/root/backups/nx-stage15-'+time.strftime('%Y%m%d-%H%M%S'); os.makedirs(bk,exist_ok=True)
log=[]; changed=False
S=P('server.js'); code=rd(S)
if 'nx-fmt-mw' in code: log.append('server: sudah terpasang')
else:
    m=re.search(r'app\.set\(\s*["\']trust proxy["\'][^;]*;',code)
    if not m: log.append('DILEWATI server: baris trust proxy tidak ketemu')
    else:
        fmt=re.sub(r'\nif \(typeof module.*$','',rd(os.path.join(HERE,'fmt15.js')),flags=re.S)
        MW='''
// nx-fmt-mw: format isi artikel + waktu baca + alt sampul + bagikan + baca juga
'''+fmt+r'''
app.use(function (req, res, next) {
  if (req.method !== "GET" || !/^\/blog\/[^\/]+/.test(req.path)) return next();
  var send = res.send;
  res.send = function (b) {
    try {
      if (typeof b === "string" && b.indexOf('<div class="prose">') > -1) {
        var s0 = b.indexOf('<div class="prose">');
        var e0 = b.indexOf('<div class="cta-box"', s0); if (e0 < 0) e0 = b.indexOf("</article>", s0); if (e0 < 0) e0 = b.length;
        var seg = b.slice(s0, e0), cta = "";
        var words = seg.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        var mins = Math.max(1, Math.round(words / 200));
        var titleRaw = ((b.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || "").replace(/<[^>]+>/g, "");
        var titleAttr = titleRaw.replace(/"/g, "&quot;");
        var esc2 = function (x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
        var extra = '<div class="nx-share"><a href="https://wa.me/?text=' + encodeURIComponent(titleRaw + " https://nextaja.com" + req.path) + '" target="_blank" rel="noopener">Bagikan ke WhatsApp</a></div>';
        try {
          var cur = decodeURIComponent(req.path.replace(/^\/blog\//, "")).replace(/\/$/, "");
          var all = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "data", "blog.json"), "utf8")).posts || [];
          var me = all.filter(function (p) { return p.slug === cur; })[0];
          var rel = all.filter(function (p) { return p.status === "published" && p.slug !== cur && me && p.topic === me.topic; })
            .sort(function (a, c) { return String(c.publishedAt || "").localeCompare(String(a.publishedAt || "")); }).slice(0, 3);
          if (rel.length) extra += '<aside class="nx-rel"><h3>Baca juga</h3><ul>' + rel.map(function (p) { return '<li><a href="/blog/' + esc2(p.slug) + '">' + esc2(p.title) + '</a></li>'; }).join("") + '</ul></aside>';
        } catch (e2) {}
        var seg2 = nxFmt(seg) + extra;
        b = b.slice(0, s0) + seg2 + b.slice(e0);
        b = b.replace(/(<img class="hero-img" src="[^"]*" alt=")(")/, "$1" + titleAttr + "$2");
        b = b.replace(/(<div class="meta">[^<]*)(<\/div>)/, "$1 · " + mins + " menit baca$2");
      }
    } catch (e) {}
    return send.call(this, b);
  };
  next();
});
'''
        shutil.copy2(S,bk); open(S,'wb').write((code[:m.end()]+'\n'+MW+code[m.end():]).encode('utf-8'))
        r=subprocess.run('node --check '+S,shell=True,capture_output=True,text=True)
        if r.returncode: shutil.copy2(os.path.join(bk,'server.js'),S); log.append('SYNTAX ERROR server.js, dikembalikan: '+r.stderr[:200])
        else: log.append('server: format, waktu baca, alt sampul, bagikan, baca juga dipasang'); changed=True
cs=glob.glob(P('public','assets','blog.css'))+glob.glob(P('assets','blog.css'))
if cs:
    c=rd(cs[0])
    if 'nx-fmt' not in c:
        shutil.copy2(cs[0],bk)
        css='''
/* nx-fmt */
.prose ol,.prose ul{padding-left:1.4em;margin:12px 0}
.prose li{margin:6px 0}
.prose blockquote{margin:18px 0;padding:6px 18px;border-left:4px solid var(--acc,#a855f7);opacity:.92;font-style:italic}
.prose em{font-style:italic}
.prose h3.nx-step{font-size:1.18em;margin:1.6em 0 .35em;display:flex;gap:10px;align-items:baseline}
.prose h3.nx-step span{flex:none;display:inline-grid;place-items:center;min-width:1.7em;height:1.7em;border-radius:999px;background:var(--acc,#a855f7);color:#fff;font-size:.8em;font-weight:700}
.nx-share{margin:26px 0 8px}
.nx-share a{display:inline-block;padding:10px 16px;border-radius:999px;border:1px solid currentColor;text-decoration:none;font-size:14px;font-weight:600}
.nx-rel{margin:22px 0;padding:18px 20px;border-radius:14px;border:1px solid rgba(127,127,160,.3)}
.nx-rel h3{margin:0 0 8px;font-size:1.05em}
.nx-rel ul{margin:0;padding-left:1.2em}
.nx-rel li{margin:6px 0}
'''
        open(cs[0],'wb').write((c+css).encode('utf-8')); log.append('css: gaya format ditambah'); changed=True
print('\n'.join(log)); print('backup ->',bk)
if changed and '--no-restart' not in sys.argv:
    print(subprocess.run('pm2 restart nextaja --update-env >/dev/null 2>&1; sleep 2; curl -s http://127.0.0.1:3200/blog/tips-aktif-di-tutorial-online-ut | grep -o "nx-step\\|menit baca\\|nx-rel\\|nx-share" | sort | uniq -c; curl -s -o /dev/null -w "blog HTTP %{http_code}\\n" http://127.0.0.1:3200/blog',shell=True,capture_output=True,text=True).stdout)
