# HANDOFF portofolio Dika Priyadi (baca ini dulu, jangan tanya ulang)

Web: https://dikapriyadi.catatanakademik.com | Posisi: AI Automation | Teks formal Indonesia. Dika memakai gw/lo; balas santai, ringkas, tanpa rekap.

## Kode (semua ada di repo akihabara-fuji/akihabara-store, branch portofolio-dika)
- portofolio-src/content.default.json = isi teks/data. portofolio-src/render.js = pembuat HTML. portofolio-src/build.sh = bangun.
- portofolio/ = hasil yang dideploy (index.html hasil build, style.css, script.js, assets/). style.css dan script.js diedit langsung.
- JANGAN edit portofolio/index.html langsung; ubah JSON/render.js lalu build.
- Build: `git pull` lalu `bash portofolio-src/build.sh <versi>`. Versi wajib naik tiap deploy (nginx cache css/js 1 tahun). Versi live terakhir: 20261144 (Beranda = hero asli DIKA PRIYADI di atas + rincian di bawah: chip jalur, 8 kartu bernomor, karya pilihan, angka, CTA)
- Uji: Playwright, Chrome di /usr/bin/google-chrome, ukuran 1440x900, 1366x700, 390x844. Tanpa pageerror, tanpa scroll horizontal.

## Struktur halaman
#home, #karya (bagian 01), #about, #skills, #experience, #kontak. Karya punya 3 tab: AI & Digital, Layanan freelance, Pengalaman Facility. Tiap tab diawali kartu animasi sendiri (AI = grafik alur, Layanan freelance = kartu mengipas, Facility = garis waktu). AI di atas, facility di bawah.
- Jangan pakai class `.cd` (bentrok dengan kursor komet). Jangan pakai `.screen.on` sebagai penanda bagian aktif.
- Trail kursor sengaja dihapus (bentrok dengan teks). Jangan dipasang lagi.
- Item Karya direferensikan lewat indeks (data-pick, orbit ks[].k, flow to). Kalau menyisipkan atau mengurutkan item, petakan ulang semua indeks itu, dan cek tab (data-kt) ikut benar.

## Deploy (jalankan sendiri, jangan minta Dika menempel skrip)
1. Tes lokal lolos, lalu commit dan push ke portofolio-dika (baris Co-Authored-By dan Claude-Session).
2. Buka https://hpanel.hostinger.com/vps/2040957/overview, tunggu 10 detik. Klik "Web console" (sekitar 1398,238), sering perlu 2-3 klik. Terminal terbuka di tab baru dci.hostingervps.com/5181.
3. Klik terminal, ketik: `clear; curl -fsSL https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/<commit>/deploy/update-portofolio.sh -o /tmp/up-porto.sh && bash /tmp/up-porto.sh <commit> 2>&1 | tail -15` lalu Enter, tunggu 10 detik, baca layar. Sukses jika ada `OK, commit <commit> live`. Skrip rollback sendiri kalau gagal.
4. Tutup tab terminal, buka situs live di tab baru, cek lewat javascript (boolean atau teks pendek), tutup tab.
- hPanel macet di logo loading: minta Dika login sekali, ulangi.
- Web root VPS: /var/www/dikapriyadi. Hanya situs ini yang disentuh.
- Aset baru (gambar) WAJIB ditambahkan ke daftar unduhan di deploy/update-portofolio.sh (daftar `for f in ...`), kalau tidak 404 di live. Saat ini 11 aset terdaftar dan semuanya sinkron.

## Jangan tabrakan
- catatanakademik.com utama = proyek lain: branch feat/koin, skrip deploy/update-koin.sh. Jangan push ke sana atau menjalankan skripnya untuk portofolio.
- Jangan sentuh nginx situs lain. Ubah nginx hanya setelah `nginx -t` lolos dan dengan cadangan.
- Sebelum kerja: `git pull origin portofolio-dika` dan `git log -5`, supaya tidak menimpa commit sesi lain. Satu sesi deploy pada satu waktu.

## Aturan Dika
- Web ini hanya soal catatanakademik.com. Tanpa proyek lama (Klipin) kecuali diminta. Jangan sebut "Ruang Akademik" atau /ruangakademikut.
- Jangan karang angka, testimoni, atau sertifikat. Data harus sama dengan CV. Nomor HP pribadi tidak tampil di web (kontak berupa tombol).
- Halaman simpel tanpa scroll panjang; teks panjang pakai "Baca lengkap".
- Perintah singkat dibaca harfiah ("tuker", "taruh di atas"). Lakukan persis, lalu cek hasil nyata di HTML.
- Cek sendiri hasil (kode dan tampilan) sebelum lapor. Jangan ulang instruksi cek manual setelah deploy.
- Tanya hanya jika keputusan tidak bisa dibatalkan atau fakta tak bisa dicari. Selain itu pilih yang terbaik, kerjakan, lapor 1-2 kalimat.

## Belum selesai
- Audit QA penuh (read-only dulu, perbaikan hanya setelah disetujui).
- CV PDF Indonesia: halaman 2 hampir kosong. CV Inggris 1 halaman sudah ada (CV_Dika_Priyadi_2026_EN.docx, dikirim ke Dika).
- Galeri Karya 10-11 menunggu hasil Canva dari Dika.

## Riwayat commit penting
Keahlian jadi folder skill dengan panel alur kerja (versi 20261136; data di skills.folders, video opsional lewat field video)
25bc308 (live) animasi per kelompok, trail dihapus | 37f184b tab Karya | fff5d02 AI dulu, facility bawah | abd7cbf Karya jadi bagian 01
Beranda: sapaan "Halo, saya" + nama + bio di tahap awal (home.hi, home.nama); folder Keahlian jadi dropdown di bawah grid, bukan modal (versi 20261137)
