# Rencana Catatan Akademik (disimpan 24 Okt 2026)

Dibuat dari diskusi dengan Dika. Semua kerja ada di branch `feat/koin`. Rilis dipegang sesi Claude Code (unlock dan lock server oleh sesi itu, bukan oleh sesi desain).

## Keputusan final
- Cek kecocokan sitasi dan daftar pustaka TIDAK dibuat terpisah. Fungsinya masuk ke Audit Dokumen.
- Ulasan dari pelanggan TIDAK dibuat. Cukup admin yang membagikan foto atau teks testimoni (sistem ulasan admin yang sekarang tetap dipakai). Alasan: pelanggan tidak mau tugasnya diketahui orang lain.
- Pengingat deadline tuton TIDAK dibuat.
- Login Google dan feed komunitas ala UT Family TIDAK dibuat. Grup WhatsApp cukup.
- Tombol "poles bahasa agar alami manusiawi" ala UT Family TIDAK dibuat (menyamarkan tulisan dari deteksi AI).
- Latihan soal dari unggahan modul UT ditunda (risiko hak cipta).
- Harga di sistem koin sebaiknya tampil dalam koin, bukan ribuan rupiah (sedang dibahas di sesi Claude Code). 1 koin = Rp1.000.

## Antrean pengerjaan (urut)
1. Cek Pesanan: tombol WhatsApp berisi ID pesanan otomatis.
2. Cari Jurnal: Crossref atau OpenAlex, hasil diurut paling relevan lalu mengarah ke paling baru, tombol "Buat sitasi APA" (isi otomatis Generator Sitasi), pintasan ke Garuda, Neliti, DOAJ, Google Scholar. Tidak scraping Google Scholar.
3. Portal UT gabungan (lihat desain di bawah).
4. Audit Dokumen dari judul sampai penutup: 9 bagian (sampul, abstrak, daftar isi, pendahuluan, tinjauan pustaka, metode dan pembahasan, kesimpulan, daftar pustaka, format). Hanya .docx. Bagian yang tidak dikenali ditandai TIDAK DITEMUKAN. Termasuk pencocokan sitasi dengan daftar pustaka. Perlu tes dengan dokumen asli.
5. Halaman layanan Metopen: switch Pesanan baru / Revisi, daftar paket vertikal, Paket Komplit emas dengan label Paling hemat (hemat dihitung dari harga, bukan angka tetap), satu instruksi saja, keterangan koin dekat tombol bayar.
6. Beranda: tombol utama ke layanan (kalkulator jadi sekunder), kartu samping maksimal 3, garis tepi lebih halus, tombol Daftar jika alur daftar terpisah dari login.
7. Konten blog (draf, bukan terbit): "Panduan Mahasiswa Baru UT", "Cara Menghitung Nilai Akhir UT". Simpan ke draf setelah login admin.
8. Skill `artikel-blog-ut`: keluaran ke draf blog, bukan Word (kartu usulan sudah dikirim).

## Desain Portal UT gabungan
Satu halaman `/ruangakademikut/portal-ut`, disusun menurut perjalanan mahasiswa, bukan menurut jenis:
1. Mulai kuliah: MyUT, Kalender Akademik, Katalog, Panduan Mahasiswa Baru (artikel kita).
2. Belajar dan tuton: Tuton, Ruang Baca Modul, Silayar (praktikum, tuweb, TTM).
3. Tugas dan karil: Cari Jurnal, Generator Sitasi APA, Audit ringkas (gratis).
4. Ujian dan nilai: Kalkulator Nilai UT, Simulasi dan Target IPK, Kalender Akademik.
5. Lulus dan administrasi: AKSI UT (kelulusan, surat keaktifan), Pasfoto Yudisium, Hallo UT.
Tiap kartu diberi label: "Resmi UT" (tautan keluar, dicek dari sumber resmi) atau "Alat gratis kami". Kotak cari dan chip filter di atas. Menu atas: "Portal UT" sendiri. Penafian: bukan situs resmi UT.
Syarat sebelum tayang: semua alamat UT diverifikasi dan tanggal cek ditulis benar.

## Aturan klaim (jangan dilanggar)
- Tanpa janji hasil: "lolos Turnitin", "garansi", "jaminan", "nilai aman", "Cum Laude".
- Tanpa kelangkaan palsu ("kuota terbatas", "sisa slot") dan tanpa angka tak nyata.
- Angka boleh dipakai bila sumbernya jelas: 17.400+ file (beranda), 800+ anggota grup WhatsApp, 2.100+ mahasiswa menghubungi sejak 2022 (riwayat chat). Jangan menulis "membantu 800 mahasiswa".
- Penafian standar: "Kami tidak menjamin nilai atau kelulusan. Semangat!"
- Nama layanan jelas dan sesuai yang dikerjakan, tidak diganti supaya terdengar bukan joki.

## Pengamatan UT Family (utfamily.my.id)
Komunitas dengan login Google. Info Update, Tools Mahasiswa, dan Kegiatan ada di balik login (tidak terindeks Google). Empat tools: Tools Tugas (bedah soal AI, cari jurnal berupa tautan portal, panduan NotebookLM, format UT), Tools UAS (unggah modul lalu soal), Kalkulator Nilai (hanya 70/30 dan 50/50), Cek Sitasi. Portal Link: 8 tautan resmi UT. Kelemahan mereka: alamat `#/`, isi di balik login, token pengguna sendiri.

## Status rilis
Kode sudah di `feat/koin` (ujung 2b6c654 saat catatan ini dibuat). Pesan serah-terima rilis dan daftar verifikasi sudah diberikan ke Dika untuk sesi Claude Code.
