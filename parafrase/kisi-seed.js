/* Isi awal Kisi-kisi: daftar mata kuliah dan 5 soal latihan per MK. Soal ditulis sendiri (konsep dasar tiap mata kuliah), bukan salinan situs lain.
   Admin bisa mengubah semuanya di /admin/kisi. Dipakai migrasi sekali jalan (INSERT OR IGNORE: tidak menimpa data yang sudah diubah admin). */
"use strict";
const S = (q, o, k, b) => ({ q, o, k, b });
const MK = [
  ["SPIN4401", "Objektif", "Filologi", [
    S("Filologi adalah ilmu yang mempelajari...", ["Kehidupan sosial masyarakat modern", "Naskah-naskah lama beserta isi dan latar budayanya", "Proses terbentuknya bahasa-bahasa dunia", "Struktur kalimat bahasa daerah"], 1, "Filologi menelaah naskah lama untuk memahami isi, sejarah teks, dan budaya yang melahirkannya."),
    S("Pengalihan tulisan dari satu sistem aksara ke aksara lain huruf demi huruf disebut...", ["Transliterasi", "Kodikologi", "Interpolasi", "Resensi"], 0, "Transliterasi mengalihkan aksara. Terjemahan mengalihkan bahasa."),
    S("Ilmu yang mempelajari naskah sebagai benda fisik (bahan, jilidan, cap kertas) adalah...", ["Paleografi", "Kodikologi", "Epigrafi", "Semantik"], 1, "Kodikologi meneliti wujud fisik naskah. Paleografi meneliti tulisan kuno, epigrafi meneliti prasasti."),
    S("Dalam filologi, teks dimaknai sebagai...", ["Wadah fisik tempat tulisan ditulis", "Bahan tulis berupa lontar atau daluang", "Kandungan isi naskah yang bersifat abstrak", "Jilidan dan sampul naskah"], 2, "Naskah adalah wujud konkret. Teks adalah isi atau gagasan yang abstrak."),
    S("Penerbitan naskah tunggal apa adanya, dengan ketelitian tinggi dan tanpa perubahan, disebut edisi...", ["Diplomatik", "Kritis", "Standar", "Eklektik"], 0, "Edisi diplomatik menyajikan naskah sesuai aslinya. Edisi kritis memilih bacaan terbaik dari beberapa naskah."),
  ]],
  ["SPGK4401", "Objektif", "Pengembangan Konsep dan Pembelajaran PKn di SD", [
    S("Nilai musyawarah untuk mufakat terkandung dalam Pancasila sila ke...", ["2", "3", "4", "5"], 2, "Sila ke-4 menekankan kerakyatan yang dipimpin hikmat kebijaksanaan dalam permusyawaratan/perwakilan."),
    S("Tujuan utama PKn di SD adalah membentuk siswa menjadi...", ["Warga negara yang paham hak dan kewajiban serta berkarakter", "Penghafal seluruh pasal undang-undang", "Calon politisi sejak dini", "Ahli sejarah peperangan"], 0, "PKn menyiapkan warga negara yang baik: memahami hak dan kewajiban, berkarakter, dan siap berpartisipasi."),
    S("Contoh kewajiban siswa di sekolah yang tepat adalah...", ["Memilih sendiri jam masuk", "Mematuhi tata tertib sekolah", "Menolak tugas kelompok", "Membawa barang apa saja ke kelas"], 1, "Kewajiban adalah sesuatu yang harus dilakukan, misalnya menaati tata tertib."),
    S("Semboyan Bhinneka Tunggal Ika dikutip dari kitab...", ["Negarakertagama", "Pararaton", "Babad Tanah Jawi", "Sutasoma"], 3, "Kalimat itu berasal dari kitab Sutasoma karya Mpu Tantular."),
    S("Guru mengajak siswa memecahkan masalah sampah di lingkungan sekolah secara berkelompok. Model pembelajaran yang dipakai adalah...", ["Problem based learning", "Ceramah murni", "Drill hafalan", "Demonstrasi saja"], 0, "Siswa menghadapi masalah nyata lalu mencari solusinya bersama: ciri problem based learning."),
  ]],
  ["SPMT4207", "Objektif", "Aljabar Linear", [
    S("Determinan matriks [[2, 1], [3, 4]] adalah...", ["5", "8", "11", "3"], 0, "det = (2)(4) - (1)(3) = 8 - 3 = 5."),
    S("Jika A berukuran 2x3 dan B berukuran 3x4, maka hasil kali AB berukuran...", ["3x3", "2x4", "4x2", "Tidak terdefinisi"], 1, "Kolom A (3) sama dengan baris B (3), hasilnya berukuran 2x4."),
    S("Hasil kali titik vektor u = (1, 2, 3) dan v = (4, 5, 6) adalah...", ["15", "21", "32", "28"], 2, "1(4) + 2(5) + 3(6) = 4 + 10 + 18 = 32."),
    S("Matriks persegi dikatakan singular jika...", ["Determinannya nol", "Semua elemennya positif", "Merupakan matriks identitas", "Determinannya satu"], 0, "Matriks singular tidak punya invers karena determinannya nol."),
    S("Untuk matriks identitas I dan matriks persegi A yang seordo, berlaku...", ["AI = 0", "AI = A", "AI = I", "AI = A kuadrat"], 1, "Matriks identitas adalah unsur netral perkalian matriks."),
  ]],
  ["STDA4201", "Objektif", "Basis Data NoSQL", [
    S("MongoDB termasuk jenis basis data NoSQL...", ["Key-value", "Graph", "Document store", "Column family"], 2, "MongoDB menyimpan data sebagai dokumen berformat mirip JSON (BSON)."),
    S("Redis paling dikenal sebagai basis data NoSQL bertipe...", ["Document", "Key-value", "Graph", "Relasional"], 1, "Redis menyimpan pasangan kunci dan nilai, sering dipakai untuk cache."),
    S("Basis data yang paling cocok untuk data dengan banyak relasi antarentitas, misalnya jejaring pertemanan, adalah...", ["Graph database seperti Neo4j", "Key-value store", "Berkas teks biasa", "Spreadsheet"], 0, "Graph database menyimpan simpul dan hubungan sebagai elemen utama."),
    S("Pada teorema CAP, tiga properti yang dimaksud adalah...", ["Cache, Atomicity, Performance", "Consistency, Availability, Partition tolerance", "Concurrency, Access, Persistence", "Consistency, Atomicity, Partition"], 1, "CAP: consistency, availability, partition tolerance. Saat terjadi partisi jaringan, sistem harus memilih antara konsistensi dan ketersediaan."),
    S("Singkatan BASE dalam konteks NoSQL mencakup properti...", ["Eventual consistency", "Strict serializability", "Foreign key constraint", "Two-phase locking"], 0, "BASE: Basically Available, Soft state, Eventual consistency."),
  ]],
  ["FSSP4101", "Objektif", "Pengantar Ilmu Administrasi", [
    S("Administrasi dalam arti sempit adalah...", ["Seluruh proses pencapaian tujuan organisasi", "Kegiatan ketatausahaan seperti mencatat dan surat-menyurat", "Pengambilan keputusan strategis", "Pengelolaan keuangan negara"], 1, "Arti sempit: kegiatan tata usaha. Arti luas: kerja sama untuk mencapai tujuan."),
    S("POSDCORB dikemukakan oleh...", ["Henri Fayol", "Max Weber", "Luther Gulick", "Frederick Taylor"], 2, "Luther Gulick: Planning, Organizing, Staffing, Directing, Coordinating, Reporting, Budgeting."),
    S("Prinsip unity of command berarti...", ["Bawahan menerima perintah dari satu atasan", "Semua pegawai bergaji sama", "Atasan boleh banyak dan bebas memerintah", "Pekerjaan dibagi tanpa batas"], 0, "Satu bawahan hanya bertanggung jawab kepada satu atasan agar tidak terjadi perintah ganda."),
    S("Ciri birokrasi ideal menurut Max Weber adalah...", ["Aturan tidak tertulis", "Hierarki jabatan dan aturan tertulis yang jelas", "Pembagian kerja ditentukan kedekatan pribadi", "Pengangkatan berdasarkan hubungan keluarga"], 1, "Weber menekankan hierarki, aturan tertulis, pembagian kerja jelas, dan impersonalitas."),
    S("Fungsi manajemen menurut Henri Fayol yang berkaitan dengan membandingkan hasil dengan rencana adalah...", ["Planning", "Commanding", "Coordinating", "Controlling"], 3, "Pengawasan (controlling) memastikan pelaksanaan sesuai rencana."),
  ]],
  ["MPMT5104", "Uraian", "Aljabar", [
    S("Teorema Lagrange menyatakan bahwa pada grup berhingga G, orde setiap subgrup H...", ["Selalu sama dengan orde G", "Membagi orde G", "Selalu lebih besar dari orde G", "Selalu bilangan prima"], 1, "|H| membagi |G|. Akibatnya orde unsur juga membagi orde grup."),
    S("Banyaknya unsur pembangun (generator) grup siklik Z6 terhadap penjumlahan adalah...", ["1", "2", "3", "6"], 1, "Generator Z6 adalah unsur yang relatif prima dengan 6, yaitu 1 dan 5."),
    S("Kernel dari suatu homomorfisma grup f: G -> H adalah...", ["Himpunan unsur G yang dipetakan ke identitas H", "Himpunan semua peta f", "Himpunan unsur H yang tidak punya prapeta", "Himpunan unsur G yang dipetakan ke dirinya sendiri"], 0, "Ker f = { g di G : f(g) = e di H } dan merupakan subgrup normal G."),
    S("Z_n merupakan lapangan (field) jika dan hanya jika...", ["n bilangan genap", "n bilangan prima", "n kuadrat sempurna", "n kelipatan 3"], 1, "Jika n prima, setiap unsur tak nol punya invers perkalian."),
    S("Subgrup normal N dari G memenuhi...", ["gN = Ng untuk setiap g di G", "N hanya berisi unsur identitas", "N selalu berorde dua", "G harus abelian"], 0, "Subgrup normal memungkinkan terbentuknya grup faktor G/N."),
  ]],
  ["SPBO4327", "Objektif", "Materi Kurikuler Biologi Sekolah Menengah", [
    S("Organel sel yang berperan utama dalam respirasi sel penghasil ATP adalah...", ["Ribosom", "Mitokondria", "Lisosom", "Badan Golgi"], 1, "Mitokondria adalah tempat respirasi aerob menghasilkan ATP."),
    S("Reaksi terang fotosintesis berlangsung di...", ["Stroma", "Sitoplasma", "Membran tilakoid", "Nukleus"], 2, "Reaksi terang terjadi di membran tilakoid (grana); reaksi gelap/siklus Calvin di stroma."),
    S("Pasangan basa nitrogen yang benar pada DNA adalah...", ["A dengan G", "A dengan T", "C dengan T", "A dengan U"], 1, "Adenin berpasangan dengan timin, guanin dengan sitosin."),
    S("Hukum Mendel I (segregasi) menyatakan bahwa...", ["Gen berpautan selalu diwariskan bersama", "Pasangan alel memisah saat pembentukan gamet", "Semua sifat bersifat dominan", "Sifat diwariskan hanya dari ibu"], 1, "Saat gametogenesis, kedua alel suatu gen memisah ke gamet yang berbeda."),
    S("Dalam ekosistem, yang berperan sebagai produsen adalah...", ["Jamur pengurai", "Rusa", "Tumbuhan hijau", "Harimau"], 2, "Tumbuhan hijau membuat zat organik sendiri lewat fotosintesis."),
  ]],
  ["SPMT4424", "Objektif", "Struktur Aljabar", [
    S("Himpunan bilangan bulat Z terhadap operasi pengurangan bukan grup karena...", ["Tidak ada unsur identitas", "Tidak tertutup", "Tidak asosiatif", "Tidak punya invers sama sekali"], 2, "(a - b) - c tidak selalu sama dengan a - (b - c), jadi pengurangan tidak asosiatif."),
    S("Unsur identitas pada (Z, +) adalah...", ["1", "0", "-1", "Tidak ada"], 1, "a + 0 = a untuk setiap bilangan bulat a."),
    S("Invers dari 3 dalam Z7 terhadap penjumlahan adalah...", ["3", "7", "4", "5"], 2, "3 + 4 = 7 yang kongruen 0 (mod 7)."),
    S("Grup (G, *) disebut abelian jika...", ["Memiliki tepat dua unsur", "Operasinya komutatif", "Setiap unsurnya sama dengan inversnya", "Memiliki unsur nol"], 1, "Abelian berarti a * b = b * a untuk semua a, b di G."),
    S("Pernyataan yang benar tentang 2Z (bilangan bulat genap) terhadap penjumlahan adalah...", ["Subgrup dari Z", "Bukan grup", "Himpunan dengan unsur identitas 2", "Tidak tertutup"], 0, "Jumlah dan invers bilangan genap tetap genap, serta memuat 0."),
  ]],
  ["SPTP4311", "Objektif", "Teknologi Pendidikan dalam Pendidikan Jarak Jauh", [
    S("Ciri utama pendidikan jarak jauh adalah...", ["Pengajar dan peserta didik terpisah jarak dan dijembatani media", "Semua pembelajaran tatap muka", "Tanpa evaluasi belajar", "Hanya memakai buku cetak"], 0, "PJJ menghubungkan pengajar dan peserta didik yang terpisah ruang atau waktu lewat media."),
    S("Pembelajaran asinkron ditandai dengan...", ["Semua peserta hadir pada jam yang sama", "Belajar dengan waktu fleksibel, misalnya lewat video rekaman dan forum", "Ujian lisan langsung", "Tidak ada bahan belajar"], 1, "Asinkron tidak menuntut kehadiran bersamaan. Sinkron berlangsung real time."),
    S("Moodle adalah contoh...", ["Aplikasi pengolah angka", "Learning Management System (LMS)", "Penyedia jaringan internet", "Peramban web"], 1, "Moodle adalah LMS sumber terbuka untuk mengelola kelas daring."),
    S("Singkatan ADDIE pada desain pembelajaran adalah...", ["Analysis, Design, Development, Implementation, Evaluation", "Audit, Draft, Deliver, Inspect, Evaluate", "Analysis, Direct, Develop, Introduce, Evaluate", "Assess, Decide, Deploy, Improve, End"], 0, "ADDIE: Analysis, Design, Development, Implementation, Evaluation."),
    S("Contoh pembelajaran sinkron dalam PJJ adalah...", ["Membaca modul kapan saja", "Menonton rekaman kuliah", "Kuliah lewat video conference pada jadwal tertentu", "Mengunduh slide"], 2, "Sinkron: pengajar dan peserta berinteraksi pada waktu yang sama."),
  ]],
  ["SPFI4306", "Objektif", "Fisika Atom", [
    S("Pada model atom Bohr, foton dipancarkan ketika elektron...", ["Berpindah ke tingkat energi lebih rendah", "Berpindah ke tingkat energi lebih tinggi", "Diam di orbit yang sama", "Keluar dari inti"], 0, "Energi foton sama dengan selisih energi kedua tingkat: E = E_awal - E_akhir."),
    S("Energi keadaan dasar atom hidrogen kira-kira...", ["+13,6 eV", "-13,6 eV", "-3,4 eV", "0 eV"], 1, "Energi tingkat n adalah -13,6 eV / n kuadrat, jadi n = 1 bernilai -13,6 eV."),
    S("Prinsip larangan Pauli menyatakan bahwa...", ["Elektron selalu bermuatan positif", "Dua elektron tidak boleh memiliki keempat bilangan kuantum yang sama", "Energi elektron bernilai kontinu", "Inti atom tidak bermuatan"], 1, "Setiap elektron dalam atom memiliki kombinasi bilangan kuantum yang unik."),
    S("Deret Balmer pada spektrum hidrogen terjadi pada transisi menuju tingkat...", ["n = 1", "n = 2", "n = 3", "n = 4"], 1, "Transisi ke n = 2 menghasilkan garis di daerah cahaya tampak."),
    S("Bilangan kuantum utama (n) menentukan...", ["Orientasi orbital", "Spin elektron", "Tingkat energi dan ukuran orbital", "Bentuk inti atom"], 2, "Makin besar n, makin tinggi energi dan makin besar orbitalnya."),
  ]],
  ["STIK4236", "Objektif", "Metode Sampling", [
    S("Pada simple random sampling, setiap anggota populasi memiliki...", ["Peluang terpilih yang sama", "Peluang terpilih berbeda sesuai ukuran", "Peluang nol bila jauh dari peneliti", "Jaminan pasti terpilih"], 0, "Pemilihan acak sederhana memberi peluang yang sama bagi setiap anggota populasi."),
    S("Stratified random sampling cocok digunakan bila populasi...", ["Homogen sempurna", "Heterogen dan dapat dibagi ke dalam strata", "Berjumlah sangat sedikit", "Tidak diketahui sama sekali"], 1, "Populasi dibagi ke strata homogen, lalu sampel diambil dari tiap strata."),
    S("Pada systematic sampling dengan populasi 1.000 dan sampel 100, interval pemilihan (k) adalah...", ["5", "100", "10", "1"], 2, "k = N / n = 1.000 / 100 = 10."),
    S("Yang termasuk teknik non-probability sampling adalah...", ["Simple random sampling", "Cluster sampling", "Purposive sampling", "Stratified sampling"], 2, "Purposive sampling memilih sampel berdasarkan pertimbangan peneliti, tanpa peluang yang diketahui."),
    S("Pada cluster sampling, yang dipilih secara acak adalah...", ["Individu satu per satu", "Kelompok atau gugus (misalnya wilayah)", "Hanya sampel pertama", "Strata tertinggi"], 1, "Gugus dipilih acak, lalu anggota di dalamnya diteliti."),
  ]],
  ["STPL4210", "Objektif", "Perencanaan Transportasi", [
    S("Urutan model perencanaan transportasi empat tahap yang benar adalah...", ["Bangkitan, distribusi, pemilihan moda, pembebanan", "Distribusi, bangkitan, pembebanan, pemilihan moda", "Pembebanan, bangkitan, distribusi, pemilihan moda", "Pemilihan moda, bangkitan, pembebanan, distribusi"], 0, "Trip generation, trip distribution, modal split, lalu trip assignment."),
    S("Tahap yang menentukan pembagian perjalanan ke berbagai moda (mobil, bus, motor) disebut...", ["Trip generation", "Trip assignment", "Trip distribution", "Modal split"], 3, "Modal split membagi perjalanan antarmoda."),
    S("Kapasitas jalan adalah...", ["Panjang total jalan", "Arus maksimum yang dapat melewati suatu titik pada kondisi tertentu", "Jumlah kendaraan yang parkir", "Kecepatan terendah kendaraan"], 1, "Kapasitas dinyatakan dalam kendaraan atau smp per jam."),
    S("Satuan mobil penumpang (smp) digunakan untuk...", ["Menghitung pajak kendaraan", "Menyetarakan berbagai jenis kendaraan ke satu satuan", "Mengukur kecepatan angin", "Menentukan tarif tol"], 1, "Tiap jenis kendaraan dikonversi ke smp dengan faktor ekivalen."),
    S("Tingkat pelayanan (Level of Service) A menggambarkan kondisi...", ["Arus bebas dengan hambatan sangat kecil", "Kemacetan total", "Arus tidak stabil", "Jalan tertutup"], 0, "LOS A adalah kondisi terbaik, LOS F kondisi terburuk."),
  ]],
  ["FSIP4308", "Objektif", "Pengelolaan Perpustakaan Sekolah", [
    S("Sistem klasifikasi yang banyak dipakai perpustakaan sekolah di Indonesia adalah...", ["Dewey Decimal Classification (DDC)", "Sistem abjad nama pengarang saja", "Urutan warna sampul", "Urutan tahun beli"], 0, "DDC mengelompokkan koleksi ke sepuluh kelas utama dengan angka desimal."),
    S("Daftar bahan pustaka yang disusun untuk membantu menemukan koleksi disebut...", ["Katalog", "Inventaris", "Statistik", "Surat edaran"], 0, "Katalog memuat deskripsi bibliografis dan letak koleksi."),
    S("Pencatatan koleksi yang baru diterima ke dalam buku induk disebut...", ["Sirkulasi", "Inventarisasi", "Penyiangan", "Referensi"], 1, "Inventarisasi mendata koleksi yang masuk."),
    S("Layanan peminjaman dan pengembalian buku disebut layanan...", ["Referensi", "Sirkulasi", "Penelusuran", "Pengolahan"], 1, "Sirkulasi menangani peminjaman, pengembalian, dan perpanjangan."),
    S("Salah satu fungsi perpustakaan sekolah adalah...", ["Mendukung proses belajar dan menumbuhkan minat baca", "Menggantikan guru sepenuhnya", "Menjual buku untuk laba", "Menyimpan arsip keuangan sekolah"], 0, "Fungsi utamanya pendidikan, informasi, rekreasi, penelitian, dan kebudayaan."),
  ]],
  ["SPAD4310", "Objektif", "Bimbingan Konseling untuk Anak Usia Dini", [
    S("Tahap perkembangan kognitif Piaget untuk anak usia 2 sampai 7 tahun adalah...", ["Sensorimotor", "Praoperasional", "Operasional konkret", "Operasional formal"], 1, "Pada tahap praoperasional anak mulai memakai simbol dan bahasa tetapi masih egosentris."),
    S("Pendekatan yang paling sesuai untuk membantu anak usia dini mengekspresikan perasaan adalah...", ["Wawancara panjang formal", "Bermain (terapi bermain)", "Ceramah berjam-jam", "Tes tertulis"], 1, "Bermain adalah bahasa alami anak."),
    S("Teknik pengumpulan data yang sering dipakai guru AUD untuk memahami perilaku anak adalah...", ["Observasi", "Survei nasional", "Eksperimen laboratorium berat", "Analisis dokumen hukum"], 0, "Observasi langsung mencatat perilaku anak dalam kegiatan sehari-hari."),
    S("Layanan bimbingan konseling di AUD lebih menekankan fungsi...", ["Hukuman", "Pencegahan dan pengembangan", "Seleksi masuk", "Penjurusan"], 1, "Pada usia dini fokusnya pencegahan masalah dan pengembangan potensi."),
    S("Peran orang tua dalam bimbingan anak usia dini adalah...", ["Tidak perlu dilibatkan", "Berkolaborasi dengan guru dan konselor", "Hanya membayar biaya sekolah", "Mengambil alih tugas guru sepenuhnya"], 1, "Kolaborasi rumah dan sekolah membuat dukungan lebih konsisten."),
  ]],
  ["SPFI4402", "Uraian", "Fisika Kuantum", [
    S("Prinsip ketidakpastian Heisenberg menyatakan bahwa...", ["Posisi dan momentum tidak dapat diketahui secara bersamaan dengan ketelitian sembarang", "Energi selalu kekal", "Elektron tidak bermuatan", "Cahaya hanya berupa gelombang"], 0, "Hasil kali ketidakpastian posisi dan momentum memiliki batas bawah: delta x delta p >= h-bar / 2."),
    S("Panjang gelombang de Broglie suatu partikel dinyatakan dengan...", ["lambda = h / p", "lambda = p / h", "lambda = h x p", "lambda = h / E"], 0, "lambda = h / p, dengan h tetapan Planck dan p momentum."),
    S("Efek fotolistrik mendukung gagasan bahwa cahaya...", ["Hanya bersifat gelombang", "Terdiri atas paket energi (foton) E = h f", "Tidak membawa energi", "Merambat lebih cepat dari foton"], 1, "Elektron terlepas hanya bila energi foton melampaui fungsi kerja logam."),
    S("Persamaan Schrodinger digunakan untuk menentukan...", ["Massa inti", "Fungsi gelombang sistem kuantum", "Kecepatan cahaya", "Muatan elektron"], 1, "Solusinya adalah fungsi gelombang yang memuat informasi tentang keadaan sistem."),
    S("Pada mekanika kuantum, operator Hamiltonian berkaitan dengan...", ["Momentum sudut", "Energi total sistem", "Muatan listrik", "Spin saja"], 1, "Nilai eigen Hamiltonian adalah tingkat-tingkat energi sistem."),
  ]],
  ["FSIK4306", "Objektif", "Komunikasi Persuasif", [
    S("Tiga bukti persuasi menurut Aristoteles adalah...", ["Ethos, pathos, logos", "Ethos, mythos, kosmos", "Logos, telos, kairos", "Pathos, nomos, ethos"], 0, "Ethos (kredibilitas), pathos (emosi), logos (logika)."),
    S("Ethos dalam persuasi berkaitan dengan...", ["Emosi audiens", "Kredibilitas komunikator", "Data dan statistik", "Pemilihan waktu"], 1, "Audiens lebih mudah dibujuk oleh pembicara yang dinilai terpercaya."),
    S("Tujuan komunikasi persuasif adalah...", ["Memaksa dengan ancaman", "Mengubah sikap atau perilaku secara sukarela", "Sekadar memberi hiburan", "Menyembunyikan informasi"], 1, "Persuasi memengaruhi tanpa paksaan."),
    S("Teknik foot-in-the-door dilakukan dengan...", ["Mengajukan permintaan kecil dulu, lalu permintaan yang lebih besar", "Mengajukan permintaan besar yang pasti ditolak", "Menolak semua permintaan", "Mengancam audiens"], 0, "Persetujuan atas permintaan kecil meningkatkan peluang disetujuinya permintaan berikutnya."),
    S("Penggunaan data, fakta, dan alasan yang runtut dalam berpidato termasuk daya tarik...", ["Pathos", "Ethos", "Logos", "Humor"], 2, "Logos adalah daya tarik rasional."),
  ]],
];
module.exports = { MK };
