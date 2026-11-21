// Sinkronkan state admin (dp.db) dengan situs live: judul, deskripsi, heroSub, urutan & judul proyek.
// Jalankan setelah deploy supaya "Simpan & Terbitkan" tidak menimpa teks baru dengan nilai lama.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const WEB = '/var/www/dikapriyadi';
const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, '—');
const h = fs.readFileSync(WEB + '/index.html', 'utf8');
const m = (re) => { const x = re.exec(h); return x ? dec(x[1]).replace(/\s+/g, ' ').trim() : ''; };
const site = {
  judul: m(/<title>([\s\S]*?)<\/title>/),
  deskripsi: m(/<meta name="description" content="([^"]*)"/),
  heroSub: m(/<!--SLOT:heroSub-->([\s\S]*?)<!--\/SLOT:heroSub-->/),
};
if (!site.judul || !site.deskripsi || !site.heroSub) { console.error('GAGAL: judul/deskripsi/heroSub live kosong'); process.exit(1); }
const live = JSON.parse(fs.readFileSync(WEB + '/proyek.json', 'utf8'));
const db = new DatabaseSync('/var/lib/dp-admin/dp.db');
const st = JSON.parse(db.prepare("select v from kv where k='state'").get().v);
st.site = Object.assign({}, st.site, site);
const byId = Object.fromEntries(st.proyek.map(p => [p.id, p]));
const next = live.map(l => Object.assign({}, byId[l.id] || l, { judul: l.judul }));
for (const p of st.proyek) if (!next.find(x => x.id === p.id)) next.push(p);
st.proyek = next;
const json = JSON.stringify(st);
db.prepare("insert or replace into kv(k,v) values('state',?)").run(json);
db.prepare('insert into versions(ts,note,state) values(?,?,?)').run(new Date().toISOString(), 'Sinkron dengan reposisi AI Social Media Analyst', json);
console.log('OK sinkron:', site.judul, '|', st.proyek.map(p => p.id).join(','));
