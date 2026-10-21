"""Tambahkan tab "Ruang Akademik" ke admin utama (admin/index.html). Idempoten."""
import re, sys

f = sys.argv[1]
s = open(f, encoding="utf8").read()
if 'data-tab="akademik"' in s:
    print("tab sudah ada")
    raise SystemExit(0)
m = re.search(r'<button[^>]*data-tab="pengaturan"[^>]*>', s)
n = re.search(r'<section[^>]*data-panel="pengaturan"', s)
if not m or not n:
    raise SystemExit("penanda tab Pengaturan tidak ditemukan")
btn = '<button role="tab" aria-selected="false" data-tab="akademik">Ruang Akademik</button>\n      '
sec = ('<section data-panel="akademik" hidden><iframe id="akFrame" data-src="/admin/parafrase?embed=1" '
       'title="Admin Ruang Akademik UT" style="width:100%;height:88vh;border:0;border-radius:14px"></iframe></section>\n    ')
s = s[:n.start()] + sec + s[n.start():]
s = s[:m.start()] + btn + s[m.start():]
js = ('<script>document.querySelectorAll(\'[data-tab="akademik"]\').forEach(function(b){b.addEventListener("click",function(){'
      'var f=document.getElementById("akFrame");if(f&&!f.getAttribute("src"))f.setAttribute("src",f.dataset.src)})});'
      'if(location.hash==="#akademik"){var _b=document.querySelector(\'[data-tab="akademik"]\');if(_b)setTimeout(function(){_b.click()},400)}</script>\n')
i = s.rfind("</body>")
s = s[:i] + js + s[i:]
open(f, "w", encoding="utf8").write(s)
print("tab Ruang Akademik dipasang")
