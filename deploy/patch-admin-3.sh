#!/bin/bash
# Patch panel admin: label "Studi Kasus" + penjaga kata terlarang di Teks Halaman saat Simpan & Terbitkan.
set -e
cd /opt/dp-admin
cp -n server.js server.js.bak3; cp -n admin.html admin.html.bak3
node - <<'JS'
const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
if (!s.includes('BLOCKED_SITE')) {
  const anchor = "const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString()));\n      const wrote = publish(st);";
  if (!s.includes(anchor)) { console.error('ANCHOR TIDAK KETEMU'); process.exit(1); }
  const guard = "const st = cleanState(JSON.parse((await readBody(req, 2e6)).toString()));\n      const BLOCKED_SITE = /whatsapp\\s*bot|bot\\s*whatsapp|automation\\s*specialist|otomasi\\s*whatsapp/i;\n      const hit = ['judul', 'deskripsi', 'heroSub'].find(k => st.site && BLOCKED_SITE.test(st.site[k] || ''));\n      if (hit) return send(res, 400, { error: 'Teks \"' + hit + '\" memuat kata yang sudah dikeluarkan dari positioning (WhatsApp bot / Automation Specialist). Ganti dulu sebelum terbit.' });\n      const wrote = publish(st);";
  s = s.replace(anchor, guard);
  fs.writeFileSync('server.js', s);
}
let h = fs.readFileSync('admin.html', 'utf8');
h = h.split('Proyek Utama').join('Studi Kasus');
fs.writeFileSync('admin.html', h);
console.log('patched');
JS
node --check server.js
systemctl restart dp-admin; sleep 2; systemctl is-active dp-admin
grep -c "Studi Kasus" admin.html; grep -c BLOCKED_SITE server.js
