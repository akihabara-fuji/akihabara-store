// Susun ulang "Karya" jadi satu sistem. Aman diulang. Pakai: node update-karya-sistem.js
const fs=require('fs'),path=require('path');
const WEB=process.env.DK_WEB||'/var/www/dikapriyadi',DATA=process.env.DK_DATA||'/var/lib/dp-kasus';
const OUT=path.join(WEB,'cases.json'),STATE=path.join(DATA,'state.json');
const aw=(f,d)=>{const t=f+'.tmp-'+process.pid;fs.writeFileSync(t,d);fs.renameSync(t,f)};
const st=JSON.parse(fs.readFileSync(fs.existsSync(STATE)?STATE:OUT,'utf8'));
const by=Object.fromEntries(st.karya.map(k=>[k.id,k]));
const base=(o)=>Object.assign({tahap:[],media:{},mediaAkhir:[],bagian:[],thumb:''},o);
const B=(l,i)=>({label:l,isi:i});
// 1. Analisis akun: alat + lembar kerja (menggantikan kartu "alat" yang tipis)
const alat=base(Object.assign({},by.alat,{id:'alat',judul:'Analisis Akun: Alat dan Sistem Laporan',status:'Prototipe',
 ringkas:'Alat yang membaca profil publik lalu memberi skor, kekuatan, kekurangan, dan saran, ditambah lembar kerja alur KPI, pilar konten, data, dasbor, dan laporan.',
 peran:'Perancang dan pembangun',tgl:'November 2026',batas:'Prototipe; belum dipakai publik. Data lembar kerja belum tersambung otomatis.',thumb:'assets/k-analisa1.webp',
 bagian:[B('Masalah','Membaca performa akun sering berhenti di angka mentah, tanpa kerangka untuk memutuskan apa yang diperbaiki.'),
 B('Yang dibangun','Dua bagian yang saling melengkapi. Pertama, alat yang membaca profil publik dan konten teratas, lalu menghitung skor, pola, dan saran per akun. Kedua, lembar kerja Social Media Specialist dengan alur KPI, pilar konten, data, dasbor, dan laporan untuk menganalisis akun sendiri.'),
 B('Peran AI dan manusia','AI membantu merangkum pola dan menyusun saran. Hal yang tidak terlihat dari data (visual dan suara) ditandai tidak terverifikasi, dan keputusan akhir tetap di tangan manusia.'),
 B('Batasan','Masih prototipe. Pengisian data lembar kerja dari akun belum tersambung otomatis dan belum ada data pemakaian publik.')]}));
// 2. Pengelolaan sosmed berbasis LLM (menyerap kartu "strategi")
const llm=base({id:'sosmed-llm',judul:'Pengelolaan Media Sosial Berbasis LLM',status:'Prototipe',
 ringkas:'Alur riset, pilar konten, naskah, desain, dan jadwal untuk akun Instagram, TikTok, YouTube, dan Facebook (Reels dan Shorts), dibagi antar LLM dengan pemeriksaan manusia.',
 peran:'Perancang alur dan operator',tgl:'November 2026',batas:'Prototipe; konten diunggah manual oleh pemilik akun dan belum ada data performa.',
 bagian:[B('Masalah','Mengelola beberapa akun dan format (Reels, Shorts, carousel) menuntut riset, naskah, desain, dan jadwal yang konsisten.'),
 B('Yang dibangun','Alur kerja dari riset sampai publikasi. Tugas dibagi antar LLM (Claude, GPT, Gemini) pada papan kerja bersama, setiap keluaran diperiksa silang sebelum dipakai, dan strategi pilar konten menjadi pegangan penyusunan naskah dan desain.'),
 B('Peran manusia','Tidak ada konten yang tayang otomatis. Konten disiapkan dan diperiksa, lalu pemilik akun yang mengunggahnya.'),
 B('Batasan','Belum ada data performa. Dokumen pilar dan evaluasi belum disertakan sebagai bukti.')]});
// 3. Spesialis affiliate = halaman demo Sistem Kerja
const aff=base({id:'affiliate',judul:'Sistem Spesialis Affiliate (demo)',status:'Prototipe',
 ringkas:'Sistem kerja affiliate dari riset niche, strategi, naskah, bukti, sampai evaluasi, satu induk dengan jalur analisis media sosial dan produksi video AI.',
 peran:'Perancang sistem',tgl:'November 2026',batas:'Demo dengan data contoh; belum ada hasil komisi atau penjualan nyata.',thumb:'assets/k-sistem-kerja.webp',media:{Bukti:{src:'assets/k-sistem-kerja.webp',alt:'Tangkapan layar dasbor halaman demo Sistem Kerja'}},
 bagian:[B('Masalah','Kerja affiliate tersebar di catatan, kalender, dan bukti yang terpisah, sehingga sulit diaudit.'),
 B('Yang dibangun','Halaman Sistem Kerja: dasbor, kalender, perencana campaign, penyusun naskah, gudang bukti, penyusun survei, penilaian niche, dan KPI, dengan tiga jalur dalam satu induk (affiliate, analisis media sosial, produksi video AI).'),
 B('Bukti','Halaman demo dapat dibuka dari menu Sistem Kerja di situs ini. Seluruh isinya data contoh dan diberi label demo.'),
 B('Batasan','Demo dengan data contoh. Belum ada hasil komisi, penjualan, atau data akun nyata.')]});
// 4. Chatbot WhatsApp
const grup=base({id:'bot-wa-grup',judul:'Chatbot WhatsApp: Asisten Grup',status:'Karya',
 ringkas:'Asisten grup berbahasa Indonesia: mencatat, mengingatkan, membukukan kas masuk dan keluar, menyusun laporan, serta antispam dan izin tautan oleh admin.',
 peran:'Perancang dan pengelola',tgl:'November 2026',batas:'Bukti berupa tangkapan layar uji coba; belum ada data pemakaian.',thumb:'assets/wa-bot-menu.webp',
 media:{Bukti:{src:'assets/wa-bot-menu.webp',alt:'Tangkapan layar menu perintah chatbot grup WhatsApp'}},mediaAkhir:[{src:'assets/wa-bot-menu.webp',teks:'Menu perintah asisten grup pada uji coba.',alt:'Tangkapan layar menu perintah chatbot grup WhatsApp'}],
 bagian:[B('Masalah','Grup WhatsApp membutuhkan pencatatan, pengingat, dan penertiban yang rutin.'),
 B('Yang dibangun','Chatbot grup yang dipanggil dengan nama atau dengan membalas pesannya. Perintah ditulis dalam bahasa sehari-hari: catat dan lihat catatan, pengingat, kas masuk dan keluar dengan saldo, laporan harian, mingguan, atau bulanan, dan bantuan belajar. Admin dapat menyalakan antispam dan mengizinkan tautan tertentu.'),
 B('Bukti','Tangkapan layar menu perintah dari uji coba di grup.'),
 B('Batasan','Bukti berasal dari uji coba. Belum ada data jumlah grup atau pemakaian.')]});
const qa=base({id:'bot-wa-qa',judul:'Chatbot WhatsApp: Tanya Jawab Otomatis',status:'Karya',
 ringkas:'Chatbot yang menjawab pertanyaan otomatis dengan gaya santai, dibatasi pada topik belajar, dan mengarahkan pertanyaan di luar topik ke sumber resmi.',
 peran:'Perancang dan pengelola',tgl:'November 2026',batas:'Bukti berupa tangkapan layar uji coba; jawaban LLM dapat keliru dan belum ada data akurasi.',thumb:'assets/wa-bot-topik.webp',
 media:{Bukti:{src:'assets/wa-bot-topik.webp',alt:'Tangkapan layar percakapan uji coba chatbot tanya jawab WhatsApp'}},mediaAkhir:[{src:'assets/wa-bot-topik.webp',teks:'Percakapan uji coba tanya jawab dengan batas topik.',alt:'Tangkapan layar percakapan uji coba chatbot tanya jawab WhatsApp'}],
 bagian:[B('Masalah','Pertanyaan yang sama berulang dan perlu dijawab cepat tanpa admin harus selalu siaga.'),
 B('Yang dibangun','Chatbot berbasis LLM yang menjawab dalam bahasa santai, membatasi diri pada topik belajar, dan mengalihkan pertanyaan administratif atau di luar topik ke sumber resmi. Pengguna bisa menunjukkan jawaban yang keliru dan bot meminta rincian untuk dikoreksi.'),
 B('Bukti','Tangkapan layar percakapan uji coba.'),
 B('Batasan','Jawaban dihasilkan LLM sehingga dapat keliru. Belum ada data akurasi atau jumlah percakapan.')]});
// urutan sistem
const order=[by.analisis,alat,by.remotion,by['video-sosmed'],llm,aff,by.catatanakademik,by.heyaipeople,grup,qa];
if(order.some(x=>!x))throw new Error('kartu dasar tidak lengkap');
// aset yang dipakai harus ada
for(const k of order){if(k.thumb&&!fs.existsSync(path.join(WEB,k.thumb))){console.log('thumb hilang, dikosongkan:',k.thumb);k.thumb=''}}
st.karya=order.map((k,i)=>Object.assign(k,{no:String(i+1).padStart(2,'0')}));
st.diperbarui=new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
const o=JSON.stringify({skema:1,diperbarui:st.diperbarui,karya:st.karya.filter(k=>!k.draft)},null,1)+'\n';
aw(OUT,o);aw(STATE,JSON.stringify(st));
fs.mkdirSync(path.join(DATA,'versions'),{recursive:true});fs.writeFileSync(path.join(DATA,'versions',Date.now()+'.json'),JSON.stringify({note:'Karya disusun jadi satu sistem (10 karya)',state:st}));
console.log('OK karya',st.karya.map(k=>k.id).join(','));
