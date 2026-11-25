// Tambah karya #09 "Website Portofolio dan Panel Admin" + tonjolkan layanan pembuatan portofolio. Idempotent.
const fs=require('fs'),path=require('path');
const WEB=process.env.DK_WEB||'/var/www/dikapriyadi',DATA=process.env.DK_DATA||'/var/lib/dp-kasus';
const OUT=path.join(WEB,'cases.json'),STATE=path.join(DATA,'state.json');
const aw=(f,d)=>{const t=f+'.tmp-'+process.pid;fs.writeFileSync(t,d);fs.renameSync(t,f)};
const st=JSON.parse(fs.readFileSync(fs.existsSync(STATE)?STATE:OUT,'utf8'));
const B=(l,i)=>({label:l,isi:i});
const img='assets/k-portofolio.webp';
const k={id:'portofolio',judul:'Website Portofolio dan Panel Admin',status:'Tayang',
 ringkas:'Website portofolio satu halaman dengan panel admin untuk mengubah karya, galeri, dan tampilan depan sendiri, ditambah halaman demo sistem kerja. Terbuka untuk pembuatan portofolio serupa.',
 peran:'Perancang dan pembangun',tgl:'November 2026',batas:'Belum ada data pengunjung karena pelacak belum dipasang. Portofolio untuk klien lain belum ditampilkan di sini.',
 thumb:fs.existsSync(path.join(WEB,img))?img:'',tahap:[],
 media:fs.existsSync(path.join(WEB,img))?{Bukti:{src:img,alt:'Tampilan hero website portofolio dikapriyadi.site'}}:{},
 mediaAkhir:fs.existsSync(path.join(WEB,img))?[{src:img,teks:'Hero website ini: video, data audit nyata, dan alur sistem.',alt:'Tampilan hero website portofolio dikapriyadi.site'}]:[],
 bagian:[B('Masalah','Portofolio yang hanya berisi klaim sulit dipercaya, dan mengubah isinya tanpa programmer sering tidak mungkin.'),
 B('Yang dibangun','Website satu halaman dengan hero berisi video dan data audit nyata, studi kasus yang bisa dibuka beserta bukti dan batasannya, galeri video, dan halaman demo Sistem Kerja. Panel admin memungkinkan mengganti teks, karya, galeri, dan CV tanpa menyentuh kode, dengan riwayat versi yang bisa dikembalikan. Pemasangan memakai skrip yang membuat cadangan dan bisa dibatalkan.'),
 B('Bukti','Situs ini sendiri, beserta tangkapan layar hero.'),
 B('Batasan','Belum ada data pengunjung karena pelacak belum dipasang. Portofolio untuk klien lain belum ditampilkan di sini.')]};
const rest=st.karya.filter(x=>x.id!=='portofolio');
const at=rest.findIndex(x=>x.id==='heyaipeople');
if(at<0)throw new Error('kartu heyaipeople tidak ditemukan');
rest.splice(at+1,0,k);
st.karya=rest.map((x,i)=>Object.assign(x,{no:String(i+1).padStart(2,'0')}));
st.diperbarui=new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
aw(OUT,JSON.stringify({skema:1,diperbarui:st.diperbarui,karya:st.karya.filter(x=>!x.draft)},null,1)+'\n');
aw(STATE,JSON.stringify(st));
fs.mkdirSync(path.join(DATA,'versions'),{recursive:true});fs.writeFileSync(path.join(DATA,'versions',Date.now()+'.json'),JSON.stringify({note:'Tambah karya Website Portofolio dan Panel Admin',state:st}));
// layanan: sebut pembuatan portofolio
const patch=f=>{try{if(!fs.existsSync(f))return console.log('lewati',path.basename(f));const j=JSON.parse(fs.readFileSync(f,'utf8'));const root=j.state||j;const arr=(root.layanan&&root.layanan.kartu)||[];const c=arr.find(x=>x.id==='svc-web');if(!c)return console.log('svc-web tidak ada di',path.basename(f));
 c.desc='Membangun website, portofolio, dan sistem web yang bisa dikelola sendiri.';c.hasil='Website, portofolio, panel admin, sistem internal';c.buktiTeks='Lihat bukti: website portofolio ini →';c.buktiHref='#proyek/portofolio';c.wa='Halo Dika, saya ingin berdiskusi tentang pembuatan website portofolio atau sistem web.';
 aw(f,JSON.stringify(j));console.log('layanan diperbarui:',path.basename(f))}catch(e){console.log('layanan dilewati',path.basename(f),e.message)}};
patch(path.join(DATA,'konten-state.json'));patch(path.join(WEB,'konten.json'));
console.log('OK karya',st.karya.map(x=>x.id).join(','));
