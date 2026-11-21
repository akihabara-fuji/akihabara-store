const {DatabaseSync}=require('node:sqlite');const fs=require('fs');
const W='/var/www/dikapriyadi/';
const db=new DatabaseSync('/var/lib/dp-admin/dp.db');
const st=JSON.parse(db.prepare("SELECT v FROM kv WHERE k='state'").get().v);
const rd=n=>JSON.parse(fs.readFileSync(W+n,'utf8'));
for(const n of ['karya.json','works.json','proyek.json','remotion.json']){const s=fs.statSync(W+n);console.log(n,'diubah',s.mtime.toISOString(),'item',rd(n).length)}
const lk=rd('karya.json'),lw=rd('works.json');
console.log('STATE karya',st.karya.length,'works',st.works.length,'proyek',(st.proyek||[]).length,'| LIVE karya',lk.length,'works',lw.length);
console.log('ADA DI LIVE tapi TIDAK di state (karya):',lk.filter(x=>!st.karya.some(y=>y.judul===x.judul)).map(x=>x.judul));
console.log('ADA DI LIVE tapi TIDAK di state (works):',lw.filter(x=>!st.works.some(y=>y.title===x.title)).map(x=>x.title));
console.log('draf di state karya:',st.karya.filter(x=>x.draft).map(x=>x.judul),'works:',st.works.filter(x=>x.draft).map(x=>x.title));
for(const r of db.prepare('SELECT id,ts,note FROM versions ORDER BY id DESC LIMIT 5').all())console.log('versi',r.id,r.ts,r.note);
