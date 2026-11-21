const {DatabaseSync}=require('node:sqlite');const fs=require('fs');
const P={id:'heyaipeople',status:'Live',judul:'heyaipeople.site',ringkas:'Katalog prompt foto AI dan paket storyboard video 2D, dengan keranjang dan pemesanan lewat WhatsApp.',media:[],
bagian:[
{label:'Masalah',isi:'Kreator pemula butuh prompt foto AI dan kerangka storyboard video yang siap dipakai, tanpa harus menyusun dari nol.'},
{label:'Yang dibangun',isi:'Situs katalog dengan filter kategori (produk dan iklan, karakter dan potret, arsitektur dan interior, ilustrasi 2D), pratinjau hasil, keranjang, dan tombol pesan ke WhatsApp admin.'},
{label:'Isi katalog',isi:'6 prompt foto AI, 4 paket storyboard ke video dengan kode Remotion 2D, dan 2 paket bundling.'},
{label:'Bukti',isi:'Situs yang bisa dibuka langsung di heyaipeople.site.'},
{label:'Batasan',isi:'Halaman masih menyebut dirinya kerangka/draf: produk dan harga contoh belum final. Pembayaran dan pengiriman prompt dilakukan manual lewat chat, belum otomatis. Belum ada data penjualan.'}],
meta:[{k:'Peran',v:'Pembangun situs dan penyusun katalog'},{k:'Status',v:'Live (isi katalog masih draf)'},{k:'Bukti',v:'URL live heyaipeople.site'},{k:'Batasan',v:'Produk dan harga belum final, belum ada data penjualan'}]};
const db=new DatabaseSync('/var/lib/dp-admin/dp.db');
const st=JSON.parse(db.prepare("SELECT v FROM kv WHERE k='state'").get().v);
st.proyek=st.proyek||[];
if(!st.proyek.some(x=>x.id===P.id)){st.proyek.push(P);const j=JSON.stringify(st);
 db.prepare("INSERT OR REPLACE INTO kv(k,v) VALUES('state',?)").run(j);
 db.prepare('INSERT INTO versions(ts,note,state) VALUES(?,?,?)').run(new Date().toISOString(),'Tambah proyek heyaipeople.site',j)}
const f='/var/www/dikapriyadi/proyek.json';const live=JSON.parse(fs.readFileSync(f,'utf8'));
if(!live.some(x=>x.id===P.id)){live.push(P);fs.writeFileSync(f,JSON.stringify(live,null,1))}
console.log('OK proyek',live.length,'state',st.proyek.length);
