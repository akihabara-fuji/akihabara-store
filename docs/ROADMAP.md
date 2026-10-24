# Roadmap catatanakademik (dipegang Claude)

Diperbarui 22 Okt 2026. Aturan: jangan sentuh order, pelanggan, bot, database, DNS, .env tanpa persetujuan. admin/index.html dan server.js di VPS beda dari repo, ubah lewat patch idempoten. Jangan karang data; yang belum terverifikasi ditandai TIDAK TERVERIFIKASI.

## Urutan kerja
1. **Audit teks dan angka yang tertanam di kode** (nama menu, deskripsi kartu, teks hub, FAQ, tombol, urutan kartu). Hasil: daftar.
2. **Admin fleksibel tingkat 1**: teks, kartu, menu, urutan, sembunyikan; draf dan pratinjau; riwayat dan kembalikan ke bawaan; validasi isian.
3. **Admin fleksibel tingkat 2**: tabel nilai UT dan aturan warna audit sebagai data yang bisa diedit.
4. **Kalkulator Nilai dan IPK UT** (alat gratis, SEO).
5. **Penamaan menu baru** (lihat tabel di bawah).
6. **Migrasi domain catatanakademik**: nginx, SSL, kode ikut domain (sitemap, canonical, RSS, IndexNow), jalan berdampingan, tes pesanan dan pembayaran, lalu 301 dari nextaja.com, daftar ulang Search Console, Bing, IndexNow.
7. **Drillbit dan warna Audit** dari tips tutor + laporan asli.
8. **Modul Metopen** dipecah: langsung dipasang / butuh keputusan / dilewati.
9. Ditunda: Toko Atribut (jas almamater, cetak KTPU).

## Fakta nilai UT (sumber: UT, Registrasi Pembelajaran dan Pengujian 2025)
Bobot: A 4, A- 3,5, B 3, B- 2,5, C 2, C- 1,5, D 1, E 0 (tidak ada B+ dan C+).
Rentang angka beda per tingkat kesulitan mata kuliah:
- Mudah: A 80-100, A- 75-<80, B 70-<75, B- 60-<70, C 55-<60, C- 50-<55, D 40-<50, E <40
- Sedang: A 75-100, A- 70-<75, B 65-<70, B- 55-<65, C 50-<55, C- 45-<50, D 35-<45, E <35
- Sukar: A 70-100, A- 65-<70, B 60-<65, B- 50-<60, C 45-<50, C- 40-<45, D 30-<40, E <30
Kontribusi tutorial ke nilai akhir: TUTON 30%, TMK 20%, TTM/TUWEB 50%, berlaku jika capaian UAS 30% benar.
TIDAK TERVERIFIKASI: rumus nilai akhir lengkap dan efek UAS di bawah syarat. Cocokkan dengan contoh nilai asli (daftar mata kuliah huruf+SKS dan IPK resmi) sebelum rilis. IPK = jumlah(bobot x SKS) / jumlah SKS.
Metopen hanya sampai Tugas 3 (tidak ada Tugas 4 dan Final). Turnitin dan penurunan skor AI dikerjakan di Cek dan Parafrase Mandiri.

## Penamaan menu
Layanan UT; Tugas dan Diskusi UT; Bimbingan Metopen UT; Audit Dokumen; Cek dan Parafrase Mandiri; Pengarahan Registrasi UT; Paket Semester; Info dan Tips UT; Cek Pesanan; Kalkulator Nilai dan IPK UT. Jangan pakai klaim "bebas plagiasi".

## Keputusan pemilik yang masih terbuka
- Beli domain (.com atau .id, atau dua-duanya) dan nextaja.com tetap dipertahankan atau tidak.
- Masa simpan file: dibuat bisa diatur di admin, bukan patokan 24 jam.
- Toko Atribut: tunda dulu.

## Syarat sebelum mulai
- Sambungan ke komputer pemilik tersambung lagi (akses VPS dan browser).
- Domain sudah dibeli (untuk langkah 6).
- Lampiran: tips tutor, laporan Drillbit, modul Metopen, daftar mata kuliah dan IPK (untuk langkah 4, 7, 8).
- Error "Teks beranda" di admin utama VPS dicek (diff VPS vs repo).
