# PROGRESS: Cek dan Parafrase Mandiri

Cabang: `feature/cek-parafrase-mandiri` (dari `nextaja-baru`). Jangan deploy sebelum disetujui pemilik.

## Keputusan
- Nama menu/hub final: "Ruang Akademik UT" di `/ruangakademikut` (menggantikan "Kebutuhan anak UT" dan #akademik; nama layanan: "Cek dan Parafrase Mandiri", label menu pendek "Cek & Parafrase").
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
3. Tahap 5: halaman /ruangakademikut ("Ruang Akademik UT") dan halaman murid.

## Tahap 4b selesai
- `parafrase/preview.js`: pratinjau dengan penyamaran di server (kalimat pertama terbuka, sisanya diganti karakter acak deterministik dengan panjang sama; alasan catatan tidak dikirim saat terkunci).
- Rute `GET /ms/parafrase/preview/:id` (no-store, 200 permintaan/jam/IP, paginasi). Pengaturan baru `preview_open_sentences` (default 1).
- Tes kebocoran otomatis: 34 tes lulus.
- Berikutnya: tuning aturan 4a pada 3-5 dokumen asli, lalu Tahap 5 (halaman).
