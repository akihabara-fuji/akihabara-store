#!/usr/bin/env bash
# Pasang halaman Sistem Kerja Konten di https://dikapriyadi.site/sistem-kerja/ + menu "Sistem Kerja" di navigasi.
# Hanya menambah: halaman baru, satu tautan menu (index.html, konten.json, konten-state admin), dan izin tautan sistem-kerja/ di validasi admin.
# Tidak menyentuh: works.json, karya.json, cases.json, galeri.json, v/uploads, tema, kartu karya.
# Jalankan sebagai root di VPS: bash update-portofolio-sistemkerja.sh <commit>
set -uo pipefail
C="${1:?commit wajib}"
RAW="https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/$C/portofolio-kasus"
ROOT=/var/www/dikapriyadi; APP=/opt/dp-kasus; DATA=/var/lib/dp-kasus
BASE_SHA=7c48108b0d07146d   # sha index.html live (commit 1f18136)
TS=$(date +%s); PRE=/root/dikapriyadi.pre-sistemkerja.$TS; NEW=/tmp/dp-sk-new.$$; STAGE=0
fail(){ echo "GAGAL di baris $1, mengembalikan"
  if [ "$STAGE" = 1 ]; then
    cp -a "$PRE/index.html" "$ROOT/index.html"; cp -a "$PRE/server.js" "$APP/server.js"
    [ -f "$PRE/konten.seed.json" ] && cp -a "$PRE/konten.seed.json" "$APP/konten.seed.json"
    [ -f "$PRE/konten.json" ] && cp -a "$PRE/konten.json" "$ROOT/konten.json"
    [ -f "$PRE/konten-state.json" ] && cp -a "$PRE/konten-state.json" "$DATA/konten-state.json"
    rm -rf "$ROOT/sistem-kerja"; systemctl restart dp-kasus
  fi
  exit 1; }
trap 'fail $LINENO' ERR
set -e
[ -f "$ROOT/index.html" ]; [ -f "$APP/server.js" ]; systemctl is-active --quiet dp-kasus
LIVE=$(sha256sum "$ROOT/index.html" | cut -c1-16)
[ "$LIVE" = "$BASE_SHA" ] || { echo "index.html live berbeda dari dasar uji ($LIVE). Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
[ ! -e "$ROOT/sistem-kerja" ] || { echo "Folder $ROOT/sistem-kerja sudah ada. Berhenti tanpa mengubah apa pun."; trap - ERR; exit 1; }
mkdir -p "$NEW/sistem-kerja" "$PRE"
for f in index.html server.js konten.seed.json sistem-kerja/index.html; do curl -fsSL "$RAW/$f" -o "$NEW/$f"; done
node --check "$NEW/server.js"; node -e "JSON.parse(require('fs').readFileSync('$NEW/konten.seed.json','utf8'))"
grep -q 'href="sistem-kerja/">Sistem Kerja</a>' "$NEW/index.html"; grep -q 'window.__KON' "$NEW/index.html"; grep -q 'sistem-kerja' "$NEW/server.js"
grep -q '<title>Sistem Kerja Konten</title>' "$NEW/sistem-kerja/index.html"; grep -q 'DATA DEMO' "$NEW/sistem-kerja/index.html"
# cadangan
cp -a "$ROOT/index.html" "$PRE/"; cp -a "$APP/server.js" "$PRE/"; [ -f "$APP/konten.seed.json" ] && cp -a "$APP/konten.seed.json" "$PRE/" || true
[ -f "$ROOT/konten.json" ] && cp -a "$ROOT/konten.json" "$PRE/" || true; [ -f "$DATA/konten-state.json" ] && cp -a "$DATA/konten-state.json" "$PRE/" || true
for f in works.json karya.json cases.json galeri.json; do [ -f "$ROOT/$f" ] && cp -a "$ROOT/$f" "$PRE/$f" || true; done
STAGE=1
# halaman baru
mkdir -p "$ROOT/sistem-kerja"; cp "$NEW/sistem-kerja/index.html" "$ROOT/sistem-kerja/index.html"
chown -R www-data:www-data "$ROOT/sistem-kerja"; chmod 755 "$ROOT/sistem-kerja"; chmod 644 "$ROOT/sistem-kerja/index.html"
# server admin (izin tautan sistem-kerja/) + seed
cp "$NEW/server.js" "$NEW/konten.seed.json" "$APP"/; chown root:root "$APP/server.js" "$APP/konten.seed.json"; chmod 644 "$APP/server.js" "$APP/konten.seed.json"
# tambah satu tautan menu di data admin dan hasil terbit (hanya jika belum ada)
node -e '
const fs=require("fs");
for(const p of process.argv.slice(1)){ if(!fs.existsSync(p)) continue;
  const o=JSON.parse(fs.readFileSync(p,"utf8")); const L=o&&o.nav&&o.nav.links;
  if(!Array.isArray(L)){console.log("lewati (tanpa nav.links): "+p);continue}
  if(L.some(x=>x&&x.href==="sistem-kerja/")){console.log("sudah ada: "+p);continue}
  if(L.length>=8) throw new Error("menu sudah 8 tautan: "+p);
  L.push({teks:"Sistem Kerja",href:"sistem-kerja/"});
  const t=p+".tmp"; fs.writeFileSync(t,JSON.stringify(o,null,p.endsWith("konten.json")?1:0)+(p.endsWith("konten.json")?"\n":"")); fs.renameSync(t,p); console.log("ditambah: "+p) }' "$DATA/konten-state.json" "$ROOT/konten.json"
[ -f "$ROOT/konten.json" ] && { chown www-data:www-data "$ROOT/konten.json"; chmod 644 "$ROOT/konten.json"; }
[ -f "$DATA/konten-state.json" ] && chown --reference="$PRE/konten-state.json" "$DATA/konten-state.json" 2>/dev/null || true
# halaman utama
cp "$NEW/index.html" "$ROOT/index.html.new"; chown www-data:www-data "$ROOT/index.html.new"; chmod 644 "$ROOT/index.html.new"; mv "$ROOT/index.html.new" "$ROOT/index.html"
systemctl restart dp-kasus; sleep 3; systemctl is-active --quiet dp-kasus
H=https://dikapriyadi.site; V=/tmp/dp-sk-v.$$
curl -fsS "$H/" -o "$V"; grep -q 'href="sistem-kerja/">Sistem Kerja</a>' "$V"
curl -fsS "$H/sistem-kerja/" -o "$V"; grep -q '<title>Sistem Kerja Konten</title>' "$V"
curl -fsS "$H/konten.json" -o "$V"; grep -q 'sistem-kerja/' "$V"
curl -fsS "$H/galeri.json" -o /dev/null; curl -fsS "$H/cases.json" -o /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$H/admin/kasus/depan"); echo "admin depan: HTTP $CODE (401/302 = pintu login aktif)"
rm -f "$V"; rm -rf "$NEW"
echo "OK, commit $C live. Cadangan: $PRE"
echo "Rollback: cp -a $PRE/index.html $ROOT/; cp -a $PRE/server.js $PRE/konten.seed.json $APP/; cp -a $PRE/konten.json $ROOT/; cp -a $PRE/konten-state.json $DATA/; rm -rf $ROOT/sistem-kerja; systemctl restart dp-kasus"
