/* Isi awal Kelas Tuton. Teks mengikuti mock yang disetujui; video dan sumber diisi dari admin. Tidak ada data karangan. */
"use strict";
const TAHAP = ["Memahami soal", "Mencari sumber", "Menyusun kerangka", "Menulis", "Memeriksa"];
const J = {
  diskusi: {
    label: "Diskusi", title: "Diskusi: jawaban yang bernilai", desc: "Cara menyusun jawaban diskusi tuton yang rapi, dari membaca soal sampai memverifikasi sumber.",
    steps: [["Baca soal dan rubrik", "Tandai kata perintah (jelaskan, analisis, bandingkan) dan apa saja yang dinilai tutor."], ["Pahami materi di modul", "Cari kegiatan belajar yang relevan, catat konsep kunci dan halaman rujukannya."], ["Susun kerangka jawaban", "Pembuka, inti (2 sampai 3 poin), contoh, penutup. Kerangka dulu, kalimat belakangan."], ["Kembangkan bersama Gemini", "Minta Gemini menjelaskan konsep, menguji kerangka, dan memberi contoh. Bukan menulis jawaban akhirmu."], ["Verifikasi dan tulis dengan bahasamu", "Cek setiap fakta ke modul atau jurnal, cantumkan sumber, lalu tulis ulang dengan gaya sendiri."]],
    prompt: "Aku mahasiswa UT mata kuliah [nama MK]. Soal diskusinya: [tempel soal]. Ini kerangka jawabanku: [tempel kerangka]. Tolong beri 3 pertanyaan kritis yang menguji pemahamanku dan sebutkan bagian mana yang perlu aku cek ulang di modul. Jangan tulis jawabannya.",
    check: ["Menjawab semua bagian soal", "Ada konsep dari modul", "Ada contoh yang relevan", "Sumber dicantumkan dan bisa diverifikasi", "Ditulis dengan bahasa sendiri", "Dibaca ulang, tidak ada salah ketik"],
    links: [["Panduan diskusi di Blog", "/ruangakademikut/blog-ut", "Artikel blog"], ["Sitasi APA", "/ruangakademikut/sitasi-apa", "Alat UT"], ["Bedah Laporan", "/ruangakademikut/bedah-tulisan", "Alat UT"]]
  },
  tugas: {
    label: "Tugas", title: "Tugas: dari soal ke jawaban rapi", desc: "Memahami format dan rubrik tugas tutorial, lalu menyusun jawaban yang terstruktur dan bersumber.",
    steps: [["Pahami format dan rubrik", "Baca petunjuk tugas dan catat apa yang dinilai: isi, struktur, sumber, dan format."], ["Kumpulkan referensi dari modul", "Tandai bagian modul yang menjawab tiap bagian soal beserta halamannya."], ["Susun kerangka dan pembagian bagian", "Bagi jawaban per bagian soal, tentukan inti tiap bagian dalam satu kalimat."], ["Tulis dan rapikan dengan Gemini", "Pakai Gemini untuk menguji kerangka dan menjelaskan konsep, lalu kamu yang menulis."], ["Cek sitasi, format, dan sampul", "Cocokkan sitasi dengan daftar pustaka, periksa format, lalu lengkapi sampul tugas."]],
    prompt: "Aku mahasiswa UT mata kuliah [nama MK]. Petunjuk tugasnya: [tempel petunjuk]. Ini pembagian bagian jawabanku: [tempel kerangka]. Tolong periksa apakah tiap bagian sudah menjawab petunjuk, dan sebutkan bagian yang masih kurang. Jangan menulis jawabannya.",
    check: ["Semua bagian petunjuk terjawab", "Format sesuai ketentuan tutor", "Sitasi dan daftar pustaka cocok", "Ditulis dengan bahasa sendiri", "Sampul dan identitas lengkap", "Dibaca ulang sebelum dikirim"],
    links: [["Sampul & Template Tugas", "/ruangakademikut/sampul-tugas", "Alat UT"], ["Generator Sitasi APA", "/ruangakademikut/sitasi-apa", "Alat UT"], ["Bedah Laporan", "/ruangakademikut/bedah-tulisan", "Alat UT"]]
  },
  makalah: {
    label: "Makalah", title: "Makalah: kerangka sampai daftar pustaka", desc: "Menyusun makalah kuliah dengan alur yang jelas dan referensi yang bisa diverifikasi.",
    steps: [["Pilih topik dan rumusan masalah", "Sempitkan topik sampai bisa dibahas dalam satu makalah, lalu tulis rumusan masalahnya."], ["Susun kerangka bab", "Tentukan pendahuluan, pembahasan, dan penutup beserta poin tiap bab."], ["Cari referensi yang bisa diverifikasi", "Pilih sumber yang bisa kamu buka sendiri dan catat data lengkapnya."], ["Tulis per bagian", "Tulis satu bagian dalam satu waktu, setiap klaim diberi sumber."], ["Rapikan daftar pustaka", "Samakan gaya sitasi dan cocokkan setiap kutipan dengan daftar pustaka."]],
    prompt: "Aku mahasiswa UT, menulis makalah mata kuliah [nama MK] dengan topik [topik]. Ini kerangka babku: [tempel kerangka]. Tolong beri 3 pertanyaan kritis tentang alur dan bagian yang belum punya dasar, tanpa menulis isi makalahnya.",
    check: ["Rumusan masalah jelas", "Setiap bab punya poin utama", "Klaim punya sumber yang bisa dibuka", "Daftar pustaka konsisten", "Ditulis dengan bahasa sendiri", "Dibaca ulang dari awal"],
    links: [["Generator Sitasi APA", "/ruangakademikut/sitasi-apa", "Alat UT"], ["Bedah Laporan", "/ruangakademikut/bedah-tulisan", "Alat UT"]]
  },
  jurnal: {
    label: "Jurnal", title: "Jurnal: telaah yang jujur", desc: "Memilih, membaca, dan menelaah jurnal dengan sumber yang tercatat dengan benar.",
    steps: [["Pilih jurnal yang relevan", "Cari dari basis data jurnal resmi dan pastikan topiknya sesuai tugas."], ["Baca abstrak dan metode", "Pahami tujuan, metode, dan sampel sebelum membaca temuan."], ["Telaah temuan utama", "Catat temuan, keterbatasan, dan hubungannya dengan materi kuliah."], ["Catat kutipan dan sumber", "Simpan identitas jurnal lengkap: penulis, tahun, judul, nama jurnal, dan tautan."], ["Tulis telaah dengan bahasamu", "Ringkas dengan kata sendiri dan bandingkan dengan teori di modul."]],
    prompt: "Aku mahasiswa UT. Aku menelaah jurnal berjudul [judul]. Ini ringkasan yang kubuat sendiri: [tempel ringkasan]. Tolong beri 3 pertanyaan yang menguji apakah aku memahami metode dan temuannya, dan sebutkan bagian yang perlu kucek ulang di jurnalnya.",
    check: ["Identitas jurnal lengkap", "Tujuan, metode, temuan tercatat", "Keterbatasan disebut", "Kutipan punya sumber", "Ditulis dengan bahasa sendiri", "Dibaca ulang"],
    links: [["Generator Sitasi APA", "/ruangakademikut/sitasi-apa", "Alat UT"], ["Bedah Laporan", "/ruangakademikut/bedah-tulisan", "Alat UT"]]
  },
  metopen: {
    label: "Metopen", title: "Metopen: dari topik ke proposal", desc: "Memahami alur metodologi penelitian secara bertahap, dari topik sampai kerangka proposal.",
    steps: [["Tentukan topik dan masalah", "Mulai dari masalah nyata yang bisa diteliti dan datanya bisa kamu peroleh."], ["Rumuskan pertanyaan penelitian", "Tulis pertanyaan yang spesifik dan bisa dijawab dengan data."], ["Pilih metode yang sesuai", "Cocokkan pendekatan, sampel, dan alat pengumpul data dengan pertanyaanmu."], ["Susun kerangka proposal", "Tulis latar belakang, tujuan, tinjauan pustaka, dan metode secara berurutan."], ["Cek konsistensi antar bagian", "Pastikan masalah, tujuan, dan metode saling menjawab."]],
    prompt: "Aku mahasiswa UT mata kuliah Metodologi Penelitian. Topikku: [topik]. Rumusan masalahku: [tempel]. Tolong beri 3 pertanyaan kritis tentang kecocokan masalah, tujuan, dan metodenya, tanpa menulis proposalnya.",
    check: ["Masalah, tujuan, dan metode saling menjawab", "Pertanyaan penelitian spesifik", "Metode sesuai pertanyaan", "Sumber tinjauan pustaka bisa diverifikasi", "Ditulis dengan bahasa sendiri", "Dibaca ulang"],
    links: [["Panduan metopen di Blog", "/ruangakademikut/blog-ut", "Artikel blog"], ["Generator Sitasi APA", "/ruangakademikut/sitasi-apa", "Alat UT"]]
  }
};
module.exports = { TAHAP, J, KEYS: Object.keys(J) };
