#!/usr/bin/env bash
# Deploy konten portofolio saja (index.html, aset, karya baru ke works.json). Tanpa nginx dan tanpa API.
# Jalankan sebagai root di VPS: bash update-portofolio-konten.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio"
ROOT=/var/www/dikapriyadi
NEW=/tmp/porto-konten-$$
BAK="$ROOT.prev-$(date +%s)"
fail(){ echo "GAGAL di baris $1, rollback"; [ -d "$BAK" ] && { rm -rf "$ROOT"; mv "$BAK" "$ROOT"; }; exit 1; }
trap 'fail $LINENO' ERR
set -e
mkdir -p "$NEW/assets" "$NEW/v"
for f in index.html works.json; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
grep -q 'Dika Priyadi' "$NEW/index.html"
for a in v-uaop v-cek-nilai v-showcase v-explainer; do for x in mp4 webp; do curl -fsSL "$RAW/assets/$a.$x" -o "$NEW/assets/$a.$x"; done; done
curl -fsSL "$RAW/assets/v-bukti-cover.mp4" -o "$NEW/assets/v-bukti-cover.mp4"
curl -fsSL "$RAW/assets/v-bukti-cover.jpg" -o "$NEW/assets/v-bukti-cover.jpg"
for x in v-catatanakademik-walkthrough.mp4 v-catatanakademik-walkthrough.webp wa-bot-menu.webp wa-bot-topik.webp CV_Dika_Priyadi.pdf v-overview.mp4 v-overview.webp v-remotion-ep001.mp4 v-remotion-ep001.webp v-analisis-sistem.mp4 v-analisis-sistem.webp; do curl -fsSL "$RAW/assets/$x" -o "$NEW/assets/$x"; done
python3 -c "import json,sys; assert len(json.load(open(sys.argv[1])))>0" "$NEW/works.json"
cp -a "$ROOT" "$BAK"
# teks yang diedit lewat Ruang Admin (judul, deskripsi, hero, WhatsApp) dipertahankan
python3 - "$NEW/index.html" "$ROOT/index.html" <<'PY'
import re,sys
n=open(sys.argv[1],encoding='utf8').read(); o=open(sys.argv[2],encoding='utf8').read()
A,B='<!--SLOT:heroSub-->','<!--/SLOT:heroSub-->'
if A in o and A in n:
    def seg(h,pat):
        m=re.search(pat,h); return m
    t=re.search(r'<title>[\s\S]*?</title>',o); n=re.sub(r'<title>[\s\S]*?</title>',lambda m:t.group(0),n,1) if t else n
    for pat in (r'<meta property="og:title" content="[^"]*"',r'<meta name="description" content="[^"]*"',r'<meta property="og:description" content="[^"]*"'):
        m=re.search(pat,o)
        if m: n=re.sub(pat,lambda _:m.group(0),n,1)
    m=re.search(re.escape(A)+r'[\s\S]*?'+re.escape(B),o)
    if m: n=re.sub(re.escape(A)+r'[\s\S]*?'+re.escape(B),lambda _:m.group(0),n,1)
    w=re.search(r'wa\.me/(\d+)',o)
    if w: n=re.sub(r'wa\.me/\d+','wa.me/'+w.group(1),n)
    open(sys.argv[1],'w',encoding='utf8').write(n); print('teks admin dipertahankan')
PY
cp "$NEW/index.html" "$ROOT/index.html"
mkdir -p "$ROOT/assets" && cp "$NEW"/assets/* "$ROOT/assets/"
python3 - "$NEW/works.json" "$ROOT/works.json" <<'PY'
import json, sys
new = json.load(open(sys.argv[1])); cur = json.load(open(sys.argv[2]))
have = {w.get('id') for w in cur}
add = [w for w in new if w.get('id') not in have]
if add:
    json.dump(cur + add, open(sys.argv[2], 'w'), ensure_ascii=False, indent=2)
print('works.json: +%d karya baru, total %d' % (len(add), len(cur) + len(add)))
PY
chown -R www-data:www-data "$ROOT"; chmod -R a+rX "$ROOT"
for p in / /works.json /assets/v-uaop.mp4 /assets/v-uaop.webp /assets/v-bukti-cover.mp4 /assets/v-bukti-cover.jpg /assets/v-cek-nilai.mp4 /assets/v-showcase.mp4 /assets/v-catatanakademik-walkthrough.mp4 /assets/wa-bot-menu.webp /assets/v-explainer.mp4; do
  s=$(curl -sk -o /dev/null -w '%{http_code}' --resolve dikapriyadi.catatanakademik.com:443:127.0.0.1 "https://dikapriyadi.catatanakademik.com$p"); echo "$p $s"
  [ "$s" = 200 ] || fail $LINENO
done
echo "OK, commit $C live. Cadangan: $BAK"
