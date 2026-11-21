const {DatabaseSync}=require('node:sqlite');const fs=require('fs');
const P={id:'video-sosmed',status:'Karya',judul:'Video Sosial Media',ringkas:'Video pendek vertikal untuk sosial media: iklan produk, edukasi, dan penjelasan analisis akun, dengan visual hasil AI.',
media:[{tipe:'video',src:'assets/v-es-krim.mp4',poster:'assets/v-es-krim.webp',teks:'Contoh iklan produk (es). Video dibuat dengan AI.',alt:''},{tipe:'video',src:'assets/v-jeans-flare.mp4',poster:'assets/v-jeans-flare.webp',teks:'Contoh iklan fashion. Video dibuat dengan AI.',alt:''}],
bagian:[
{label:'Masalah',isi:'Akun sosial media butuh video pendek yang rutin, sementara produksi manual memakan waktu dan biaya.'},
{label:'Yang dibangun',isi:'Kumpulan video pendek: iklan produk dan fashion, video edukasi, motion brand, dan penjelasan analisis akun. Visual dihasilkan dengan alat AI.'},
{label:'Bukti',isi:'Video bisa diputar langsung di kartu ini dan di galeri Karya Video AI.'},
{label:'Batasan',isi:'Belum ada data performa (tayangan, retensi, share) untuk video ini. Visualnya hasil AI, bukan rekaman produk nyata.'}],
meta:[{k:'Peran',v:'Perancang dan pembuat video'},{k:'Status',v:'Karya (galeri video)'},{k:'Bukti',v:'Video yang bisa diputar'},{k:'Batasan',v:'Belum ada data performa'}]};
function swap(a){a=a||[];const i=a.findIndex(x=>x.id==='whatsapp');a=a.filter(x=>x.id!==P.id&&x.id!=='whatsapp');a.splice(i<0?a.length:i,0,P);return a}
const db=new DatabaseSync('/var/lib/dp-admin/dp.db');
const st=JSON.parse(db.prepare("SELECT v FROM kv WHERE k='state'").get().v);
st.proyek=swap(st.proyek);const j=JSON.stringify(st);
db.prepare("INSERT OR REPLACE INTO kv(k,v) VALUES('state',?)").run(j);
db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(),'Hapus proyek Otomasi WhatsApp, ganti Video Sosial Media',j);
const f='/var/www/dikapriyadi/proyek.json';fs.writeFileSync(f,JSON.stringify(swap(JSON.parse(fs.readFileSync(f,'utf8'))),null,1));
console.log('OK',st.proyek.map(x=>x.id).join(','));
