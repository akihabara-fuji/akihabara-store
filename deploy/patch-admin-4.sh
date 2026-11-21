#!/bin/bash
# Patch panel admin 4: label video jelas, tombol preview Desktop/HP, peringatan kuning kata terlarang, label WhatsApp.
set -e
cd /opt/dp-admin
cp -n admin.html admin.html.bak4 2>/dev/null || true
node - <<'JS'
const fs = require('fs');
let h = fs.readFileSync('admin.html', 'utf8');
if (h.includes('DP_PATCH4')) { console.log('sudah dipatch'); process.exit(0); }
const rep = (a, b) => { if (!h.includes(a)) { console.error('ANCHOR HILANG: ' + a.slice(0, 50)); process.exit(1); } h = h.split(a).join(b); };
rep("t:'Karya Video AI',i:'Video iklan, komersial, carousel'", "t:'Video AI · Daftar utama',i:'Tampil di bagian Video dan konten buatan AI'");
rep("t:'Galeri Karya & Motion AI',i:'Remotion drama/iklan/horror/portofolio'", "t:'Video AI · Galeri & Remotion',i:'Tampil di bagian Galeri video AI (ada filter kategori)'");
h = h.split('Karya Video AI').join('Video AI · Daftar utama');
h = h.split('Galeri Karya &amp; Motion AI').join('Video AI · Galeri &amp; Remotion');
h = h.split('Nomor WhatsApp (').join('Nomor WhatsApp kontak (dipakai semua tombol Hubungi; ');
rep('<b id="pvl"></b></div>', '<b id="pvl"></b><button class="btn" id="dv-d" type="button">Desktop</button><button class="btn" id="dv-m" type="button">HP 390px</button></div>');
const js = `<script>/*DP_PATCH4*/(function(){
var pv=document.getElementById('pv');
function dev(w){pv.style.width=w;pv.style.margin=w==='100%'?'0':'0 auto';pv.style.boxShadow=w==='100%'?'none':'0 0 0 1px #888'}
document.getElementById('dv-d').onclick=function(){dev('100%')};
document.getElementById('dv-m').onclick=function(){dev('390px')};
var ban=document.createElement('div');
ban.style.cssText='display:none;position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:99;background:#f5c542;color:#1a1400;padding:8px 16px;border-radius:8px;font:600 13px system-ui;box-shadow:0 6px 20px rgba(0,0,0,.4);max-width:90vw';
document.body.appendChild(ban);
var RE=/whatsapp\\s*bot|bot\\s*whatsapp|wa\\s*bot|automation\\s*specialist|otomasi\\s*whatsapp/i;
setInterval(function(){try{var s=(typeof S!=='undefined'&&S&&S.site)||{},bad=['judul','deskripsi','heroSub'].filter(function(k){return RE.test(s[k]||'')});
if(bad.length){ban.textContent='Peringatan: '+bad.join(', ')+' masih memuat kata yang sudah dikeluarkan dari positioning (WhatsApp bot / Automation Specialist). Server akan menolak terbit.';ban.style.display='block'}else ban.style.display='none'}catch(e){}},800);
})();</script>`;
if (!h.includes('</body>')) { console.error('NO </body>'); process.exit(1); }
h = h.replace('</body>', js + '</body>');
fs.writeFileSync('admin.html', h);
console.log('patched');
JS
systemctl restart dp-admin; sleep 2; systemctl is-active dp-admin
grep -c "Video AI · Daftar utama" admin.html
