# Brief untuk Hermes: migrasi akademik ke catatanakademik.com

Peran: **Hermes mengerjakan kode, Claude mengaudit dan men-deploy.** Hermes tidak men-deploy, tidak menyentuh VPS.

## Keputusan rute (final, dari pemilik)
- **Pindah ke https://catatanakademik.com:** semua Ruang Akademik UT (`/ruangakademikut*`), blog akademik (`/blog*`), pesanan dan audit, serta admin Ruang Akademik.
- **Tetap di https://nextaja.com:** landing dan layanan non-akademik (analisa akun, template IG, housekeeping, portofolio).
- Redirect 301 dari nextaja.com ke domain baru untuk jalur akademik dikerjakan **Claude di nginx**, bukan di kode.
- Domain sudah dibeli, DNS sudah mengarah ke VPS. Nginx dan SSL dikerjakan Claude.

## Aturan keras
1. Kerja di branch baru `feature/catatanakademik` dari `feature/cek-parafrase-mandiri`. Jangan push ke branch lain.
2. Tetap Express dan JS biasa. **Jangan tulis ulang ke Next.js.**
3. Jangan sentuh: data order, pelanggan, bot, database (skema boleh ditambah hanya lewat migrasi aman), DNS, `.env`, secret. Jangan jalankan apa pun di VPS. Jangan buat skrip deploy yang dijalankan, cukup tulis.
4. `admin/index.html` dan `server.js` di VPS berbeda dari repo (fitur "Teks beranda"). Ubah keduanya **hanya lewat patch idempoten** (`deploy/patch-*.py`), jangan timpa. Catat di laporan apa saja yang bergantung padanya.
5. Jangan karang data. Yang belum terverifikasi tandai `TIDAK TERVERIFIKASI` di kode dan dokumen.
6. Semua tes lulus: `node --test tests/parafrase-*.test.js` (sekarang 56 lulus). Tambah tes untuk tiap fitur baru.
7. Jangan klaim "bebas plagiasi". Skor audit berlabel analisis NextAja, bukan skor resmi Drillbit atau Turnitin.

## Tugas (urut)
**A. SELESAI dikerjakan Claude (jangan dikerjakan ulang): `ACAD_URL` sudah ada di server.js, pages.js, notify.js.** Catatan lama: Sekarang `SITE_URL` satu nilai (bawaan nextaja.com) di `server.js`, `blog-akun.js`, `parafrase/pages.js`, `parafrase/notify.js`. Tambah `ACAD_URL` (bawaan `https://catatanakademik.com`). Halaman akademik dan blog memakai `ACAD_URL` untuk canonical, og:url, JSON-LD, RSS, sitemap, IndexNow, dan tautan notifikasi. Landing tetap `SITE_URL`. `robots.txt` dan `sitemap.xml` menyesuaikan header `Host`. Tes: canonical, sitemap, RSS, dan notifikasi memakai domain yang benar.
**B. Admin fleksibel tingkat 1.** Teks hub, nama dan deskripsi kartu, nama menu, FAQ, urutan, sembunyikan kartu, bisa diubah dari admin (tab Ruang Akademik). Wajib: validasi isian, batas panjang, tombol kembalikan ke bawaan, riwayat perubahan (pakai pola log pengaturan yang sudah ada), pratinjau sebelum simpan.
**C. Kalkulator Nilai dan IPK UT** (halaman publik, gratis). Data dari `docs/ROADMAP.md`: bobot A 4, A- 3,5, B 3, B- 2,5, C 2, C- 1,5, D 1, E 0; rentang angka per tingkat kesulitan (mudah, sedang, sukar); pilihan jalur TUTON (30%), TMK (20%), TTM atau TUWEB (50%); syarat capaian UAS 30% benar. Rumus nilai akhir lengkap TIDAK TERVERIFIKASI: tampilkan catatan itu di UI dan simpan rumus sebagai data yang bisa diubah dari admin. IPK = jumlah(bobot x SKS) / jumlah SKS. Simulasi UAS minimal.
**D. Penamaan menu** sesuai tabel di `docs/ROADMAP.md`.
Tunda: Toko Atribut, Drillbit dan warna Audit (butuh lampiran), modul Metopen.

## Hasil yang harus diserahkan
- Branch `feature/catatanakademik` di-push, tes lulus (tempel hasil mentah).
- Daftar berkas berubah dan alasannya, per tugas.
- Daftar apa yang bergantung pada berkas VPS yang beda dari repo.
- Cara verifikasi manual tiap tugas.

## Proses audit (Claude)
Claude membaca diff, menjalankan ulang tes, memeriksa aturan keras di atas, lalu men-deploy lewat skrip `deploy/` dengan backup dan rollback otomatis, dan memverifikasi hasilnya di domain live. Temuan yang salah dikembalikan ke Hermes.
