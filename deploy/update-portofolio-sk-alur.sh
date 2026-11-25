#!/usr/bin/env bash
# Sistem Kerja menonjol: menu pertama + tombol hero + alur 11 tahap (gaya n8n) + ruang kerja demo berwarna.
# Hanya mengubah: index.html, sistem-kerja/index.html, urutan menu + 1 tombol hero di konten.json / konten-state.json.
# Video hero, karya, galeri, cases, upload TIDAK disentuh. Berhenti otomatis kalau index.html live berbeda dari dasar uji.
# Jalankan sebagai root di VPS: bash update-portofolio-sk-alur.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi; APP=/opt/dp-kasus; DATA=/var/lib/dp-kasus
BASE_SHA=504b5df5ea22edbe
TS=$(date +%s); PRE=/root/dikapriyadi.pre-skalur.$TS; NEW=/tmp/dp-ska-new.$$; STAGE=0
fail(){ echo "GAGAL di baris $1, mengembalikan"
  if [ "$STAGE" = 1 ]; then
    cp -a "$PRE/index.html" "$ROOT/index.html"; cp -a "$PRE/sk-index.html" "$ROOT/sistem-kerja/index.html"
    [ -f "$PRE/konten.json" ] && cp -a "$PRE/konten.json" "$ROOT/konten.json"
    [ -f "$PRE/konten-state.json" ] && cp -a "$PRE/konten-state.json" "$DATA/konten-state.json"
    cp -a "$PRE/konten.seed.json" "$APP/konten.seed.json" 2>/dev/null || true
    systemctl restart dp-kasus
  fi
  exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$ROOT/index.html" ]; [ -f "$ROOT/sistem-kerja/index.html" ]; systemctl is-active --quiet dp-kasus
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
mkdir -p "$NEW/sistem-kerja" "$PRE"
for f in index.html konten.seed.json sistem-kerja/index.html; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
node -e "JSON.parse(require('fs').readFileSync('$NEW/konten.seed.json','utf8'))"
grep -q 'skb2' "$NEW/index.html"; grep -q 'nd-go' "$NEW/index.html"; grep -q 'window.__KON' "$NEW/index.html"
grep -q "id:'alur'" "$NEW/sistem-kerja/index.html"; grep -q 'DATA DEMO' "$NEW/sistem-kerja/index.html"
grep -q '<video' "$NEW/index.html"
cp -a "$ROOT/index.html" "$PRE/"; cp -a "$ROOT/sistem-kerja/index.html" "$PRE/sk-index.html"
[ -f "$ROOT/konten.json" ] && cp -a "$ROOT/konten.json" "$PRE/" || true
[ -f "$DATA/konten-state.json" ] && cp -a "$DATA/konten-state.json" "$PRE/" || true
[ -f "$APP/konten.seed.json" ] && cp -a "$APP/konten.seed.json" "$PRE/" || true
STAGE=1
cp "$NEW/sistem-kerja/index.html" "$ROOT/sistem-kerja/index.html.new"; chown www-data:www-data "$ROOT/sistem-kerja/index.html.new"; chmod 644 "$ROOT/sistem-kerja/index.html.new"; mv "$ROOT/sistem-kerja/index.html.new" "$ROOT/sistem-kerja/index.html"
cp "$NEW/konten.seed.json" "$APP/konten.seed.json"; chown root:root "$APP/konten.seed.json"; chmod 644 "$APP/konten.seed.json"
# menu: Sistem Kerja jadi pertama; hero: tambah tombol utama "Lihat Sistem Kerja" di depan (hanya hapus gaya utama lama)
node -e '
const fs=require("fs");
for(const p of process.argv.slice(1)){ if(!fs.existsSync(p)) continue;
  const o=JSON.parse(fs.readFileSync(p,"utf8")); let ch=0;
  const L=o&&o.nav&&o.nav.links;
  if(Array.isArray(L)){ const i=L.findIndex(x=>x&&x.href==="sistem-kerja/"); if(i>0){const [x]=L.splice(i,1);L.unshift(x);ch=1} else if(i<0){ if(L.length>=8) throw new Error("menu penuh: "+p); L.unshift({teks:"Sistem Kerja",href:"sistem-kerja/"});ch=1} }
  const T=o&&o.hero&&o.hero.tombol;
  if(Array.isArray(T)&&!T.some(x=>x&&x.href==="sistem-kerja/")){ T.forEach(x=>{if(x&&x.gaya==="utama")x.gaya="garis"}); T.unshift({teks:"Lihat Sistem Kerja",href:"sistem-kerja/",gaya:"utama"});ch=1 }
  if(ch){const t=p+".tmp"; const k=p.endsWith("konten.json"); fs.writeFileSync(t,JSON.stringify(o,null,k?1:0)+(k?"\n":"")); fs.renameSync(t,p); console.log("diubah: "+p)} else console.log("tanpa perubahan: "+p) }' "$DATA/konten-state.json" "$ROOT/konten.json"
[ -f "$ROOT/konten.json" ] && { chown www-data:www-data "$ROOT/konten.json"; chmod 644 "$ROOT/konten.json"; }
[ -f "$DATA/konten-state.json" ] && chown --reference="$PRE/konten-state.json" "$DATA/konten-state.json" 2>/dev/null || true
cp "$NEW/index.html" "$ROOT/index.html.new"; chown www-data:www-data "$ROOT/index.html.new"; chmod 644 "$ROOT/index.html.new"; mv "$ROOT/index.html.new" "$ROOT/index.html"
systemctl restart dp-kasus; sleep 3; systemctl is-active --quiet dp-kasus
H=https://dikapriyadi.site; V=/tmp/dp-ska-v.$$
curl -fsS "$H/" -o "$V"; grep -q 'skb2' "$V"; grep -q 'nd-go' "$V"
curl -fsS "$H/sistem-kerja/" -o "$V"; grep -q "id:'alur'" "$V"
curl -fsS "$H/konten.json" -o "$V"; node -e "const o=JSON.parse(require('fs').readFileSync('$V','utf8'));if(o.nav.links[0].href!=='sistem-kerja/')process.exit(1);if(o.hero.tombol[0].href!=='sistem-kerja/')process.exit(1)"
curl -fsS "$H/galeri.json" -o /dev/null; curl -fsS "$H/cases.json" -o /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$H/admin/kasus/depan"); echo "admin depan: HTTP $CODE (401/302 = pintu login aktif)"
rm -f "$V"; rm -rf "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE/index.html $ROOT/; cp -a $PRE/sk-index.html $ROOT/sistem-kerja/index.html; cp -a $PRE/konten.json $ROOT/; cp -a $PRE/konten-state.json $DATA/; cp -a $PRE/konten.seed.json $APP/; systemctl restart dp-kasus"
