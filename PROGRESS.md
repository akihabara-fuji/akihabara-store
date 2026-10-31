# PROGRESS: Cek dan Parafrase Mandiri

Cabang: `feature/cek-parafrase-mandiri` (dari `nextaja-baru`). Jangan deploy sebelum disetujui pemilik.

## Keputusan
- Nama menu/hub final: "Catatan Akademik" di `/ruangakademikut` (menggantikan "Kebutuhan anak UT" dan #akademik; nama layanan: "Cek dan Parafrase Mandiri", label menu pendek "Cek & Parafrase").
- Pembayaran: QRIS manual (foto QRIS + bukti bayar + verifikasi admin). Webhook ditunda ke v2.
- Database: SQLite (better-sqlite3), berkas `data/parafrase.db`.
- WhatsApp: bot Baileys yang sudah ada di VPS (belum dihubungkan).
- Modul terpisah di `parafrase/`, dipasang dari server.js dengan satu baris. Tidak mengubah rute lama.
- Versi live di VPS bisa berbeda dari repo; pasang ke live lewat skrip pasang bercadangan (anchor dicek, ada rollback), bukan menimpa folder.

## Selesai
- Tahap 1: audit (lihat AUDIT di chat).
- Tahap 2: skema SQLite (settings, settings_log, orders, findings, order_events, fast_reservations), modul pengaturan dengan validasi dan log, `GET /ms/public-config`, `GET/PUT /ms/admin/parafrase/settings`. 7 tes lulus (`npm run test:unit`).

- Tahap 3: upload DOCX saja (`POST /ms/parafrase/upload`): validasi isi file (tolak PDF, .doc/berpassword, makro, rusak, tanpa teks), simpan privat di `data/private/docs` (bukan /uploads), ekstraksi paragraf/tabel/kalimat, deteksi judul/bahasa/jenis/daftar pustaka/jumlah kata, harga dihitung server (`pricing.js`), batas laju 10/jam/IP, hapus otomatis unggahan tak terpakai setelah 2 jam. 18 tes lulus (`npm run test:unit`), diuji juga dengan file Word asli dan server asli.

- Tahap 4a: mesin analisis lokal `parafrase/rules.js` untuk 8 kategori (U, O, B, K, M-internal, H, P, A), ambang dari pengaturan, kode utama per kalimat, `saveFindings`. Upload sekarang mengembalikan `notes` (jumlah per kode). 29 tes lulus. Catatan: M v1 hanya kalimat berulang di dalam dokumen; kemiripan sumber luar butuh laporan DrillBit murid (v2) atau tanda manual admin. Aturan bersifat heuristik, perlu penyetelan dengan dokumen asli.

## Langkah berikutnya
1. Tahap 4b: penyamaran server pada pratinjau (kalimat pertama terbuka, sisanya berwarna tapi teks diganti karakter pengganti; teks asli tidak boleh bocor di respons, HTML, atau cache).
2. Penyetelan aturan 4a dengan 3 sampai 5 dokumen tugas asli (kurangi salah tandai).
3. Tahap 5: halaman /ruangakademikut ("Catatan Akademik") dan halaman murid.

## Tahap 4b selesai
- `parafrase/preview.js`: pratinjau dengan penyamaran di server (kalimat pertama terbuka, sisanya diganti karakter acak deterministik dengan panjang sama; alasan catatan tidak dikirim saat terkunci).
- Rute `GET /ms/parafrase/preview/:id` (no-store, 200 permintaan/jam/IP, paginasi). Pengaturan baru `preview_open_sentences` (default 1).
- Tes kebocoran otomatis: 34 tes lulus.
- Berikutnya: tuning aturan 4a pada 3-5 dokumen asli, lalu Tahap 5 (halaman).

## Tahap 5 selesai (halaman)
- `parafrase/pages.js` + `parafrase/pages/`: `/ruangakademikut` (hub), `/ruangakademikut/cek-parafrase-mandiri` (unggah, pratinjau 8 warna, detail, harga, jalur cepat), `/ruangakademikut/pesanan` (placeholder sampai Tahap 7), aset di `/ruangakademikut/assets/*` (daftar putih). `/akademik` dan `/kebutuhan-anak-ut` dialihkan 301.
- `public/index.html` (salinan repo): menu Akademik -> Catatan Akademik, `#akademik` dialihkan lewat skrip kecil. Versi live harus disesuaikan lewat skrip pasang.
- Contoh terbuka kini = kalimat BERCATATAN pertama (bukan judul).
- Tombol Bayar dengan QRIS belum membuat pesanan (Tahap 6a). 35 tes lulus, diuji di browser (desktop dan HP).
- Berikutnya: Tahap 6a (pesanan + QRIS manual + bukti bayar + Konfirmasi/Tolak).

## Tahap 6a selesai (pesanan + QRIS manual)
- `parafrase/orders.js`: POST /ms/parafrase/order (harga, kode unik, slot jalur cepat dihitung di server; WA dinormalkan 62; deadline wajib), GET /ms/parafrase/order/:token, GET /ms/parafrase/qris (foto QRIS dari pengaturan), POST .../proof (JPG/PNG maks 5 MB, EXIF dibuang lewat sharp, hash SHA-256, duplikat antar pesanan ditolak, queue_time = waktu bukti diunggah), GET .../preview (terbuka hanya setelah konfirmasi).
- Admin: GET /ms/admin/parafrase/orders[?status], GET .../orders/:id/proof, POST .../confirm, POST .../reject {reason}, POST /ms/admin/parafrase/qris (unggah foto QRIS). `confirmPayment(orderId, source)` = antarmuka tunggal konfirmasi (siap untuk pembayaran otomatis kelak).
- expireUnpaid (job 10 menit): pesanan tak dibayar -> kedaluwarsa, slot jalur cepat dilepas, dokumen dihapus.
- Halaman /ruangakademikut/pesanan/:token (QRIS, kode unik, hitung mundur, unggah bukti, status otomatis, catatan terbuka setelah dikonfirmasi). Tombol Bayar di halaman unggah sudah membuat pesanan.
- 41 tes lulus + uji alur penuh di browser.
- Berikutnya: 6b (nomor antrean, urutan, jalur cepat vs biasa, "Dikerjakan" tidak tergeser), lalu 7 (Cek Pesanan, WhatsApp, retensi 24 jam), 8a-c (panel admin, Word berwarna, cek ulang).

## Tahap 6b-10 selesai
6b antrean, 7 Cek Pesanan/WA/retensi, 8a panel admin, 8b Word berwarna, 8c cek ulang + ekspor bersih, 9 keamanan, 10 installer + LAPORAN-AKHIR.md. Sisa: setel aturan 4a dengan dokumen asli, sambungkan bot WA, pasang setelah ACC.
