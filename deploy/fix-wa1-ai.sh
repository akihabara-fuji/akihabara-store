#!/bin/bash
# Perbaiki jalur AI WA1: ambil kunci 9Router yang aktif, uji, ganti di .env (backup + rollback). Nilai kunci tidak pernah dicetak.
set -u
A=/opt/wabot/app; ENVF=$A/.env; [ "$(id -u)" = 0 ] || { echo "Jalankan sebagai root"; exit 1; }
B=$(grep -E "^NINE_ROUTER_BASE_URL=" $ENVF | cut -d= -f2-); OLD=$(grep -E "^NINE_ROUTER_API_KEY=" $ENVF | cut -d= -f2-)
chat(){ curl -s -m 40 -o /tmp/fw.json -w "%{http_code}" "$B/chat/completions" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"model\":\"$2\",\"messages\":[{\"role\":\"user\",\"content\":\"balas satu kata: ok\"}],\"max_tokens\":20}"; }
echo "== cari data 9Router"
WD=$(systemctl show 9router -p WorkingDirectory --value); U=$(systemctl show 9router -p User --value); H=$(getent passwd "${U:-root}" | cut -d: -f6)
CAND=$(find "$H/.9router" "$H/.config" "$WD" /var/lib/9router /opt/9router -maxdepth 3 -name "*.json" -size -5M 2>/dev/null | head -30)
KEYS=$(node -e '
const fs=require("fs");const out=[];
for(const f of process.argv.slice(1)){try{const j=JSON.parse(fs.readFileSync(f,"utf8"));const walk=o=>{if(!o||typeof o!=="object")return;if(Array.isArray(o)){o.forEach(walk);return}
 if(typeof o.key==="string"&&o.key.length>=16&&/^(sk-|[A-Za-z0-9_-]{20,})/.test(o.key)&&o.isActive!==false&&(o.name||o.id||"apiKey" in o||o.machineId))out.push(o.key);Object.values(o).forEach(walk)};walk(j.apiKeys||j)}catch(e){}}
console.log([...new Set(out)].join("\n"))' $CAND)
N=$(echo "$KEYS" | grep -c .); echo "kunci kandidat ditemukan: $N"
[ "$N" -ge 1 ] || { echo "Tidak ada kunci di data 9Router. Buka dashboard 9Router, salin API key, lalu beri tahu Claude."; exit 2; }
echo "== daftar model"
MODELS=$(curl -s -m 10 "$B/models" | grep -oE '"id":"[^"]+"' | cut -d'"' -f4); echo "$MODELS" | head -12 | tr '\n' ' '; echo
WANT=$(grep -E "^AI_MODEL=" $ENVF | cut -d= -f2-); GOODK=""; GOODM=""
for k in $KEYS; do
  for m in "$WANT" $(echo "$MODELS" | grep -iE "gemini" | head -3) $(echo "$MODELS" | head -4); do
    [ -n "$m" ] || continue; c=$(chat "$k" "$m"); echo "uji model $m -> HTTP $c"
    if [ "$c" = 200 ]; then GOODK=$k; GOODM=$m; break 2; fi
  done
done
rm -f /tmp/fw.json
[ -n "$GOODK" ] || { echo "Tidak ada kombinasi kunci+model yang berhasil. .env TIDAK diubah."; exit 3; }
cp $ENVF $ENVF.bak-ai-$(date +%Y%m%d-%H%M%S); echo "backup .env dibuat"
sed -i "s|^NINE_ROUTER_API_KEY=.*|NINE_ROUTER_API_KEY=$GOODK|" $ENVF
sed -i "s|^AI_MODEL=.*|AI_MODEL=$GOODM|" $ENVF
echo "diganti: kunci baru (tersembunyi), model=$GOODM"
systemctl restart wabot; sleep 25
echo "== status setelah restart"; systemctl is-active wabot; journalctl -u wabot --since "1 min ago" --no-pager | grep -iE "TERHUBUNG|gagal|error" | tail -4 | cut -c1-120
echo "SELESAI. Rollback: cp \$(ls -t $ENVF.bak-ai-* | head -1) $ENVF && systemctl restart wabot"
