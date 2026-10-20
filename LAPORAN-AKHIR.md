# Laporan akhir: Cek dan Parafrase Mandiri (Ruang Akademik UT)

Branch: `feature/cek-parafrase-mandiri` (repo akihabara-store). **Belum dipasang ke nextaja.com.** Menunggu ACC.

## Yang sudah jadi
| Bagian | Isi |
|---|---|
| Halaman murid | `/ruangakademikut` (hub), `/ruangakademikut/cek-parafrase-mandiri` (unggah DOCX, pratinjau 8 warna, harga, jalur cepat), `/ruangakademikut/pesanan[/token]` (bayar QRIS, status, antrean, unduh hasil, Cek Pesanan lewat ID + WA). `/akademik` dan `/#akademik` dialihkan. |
| Pembayaran | QRIS manual: foto QRIS dari pengaturan, kode unik 1-99, batas 60 menit, unggah bukti (EXIF dibuang, duplikat ditolak), Konfirmasi/Tolak oleh admin. |
| Antrean | Dikerjakan tidak tergeser, jalur cepat sebelum biasa, lalu waktu bukti bayar. Deadline tidak memengaruhi urutan. Posisi dan perkiraan jam tampil di halaman murid. |
| Panel admin | `/admin/parafrase`: Antrean, Verifikasi bayar (lihat bukti), Semua pesanan, Pengaturan & QRIS (harga, kuota jalur cepat, dll, tersinkron ke murid), Pesan WhatsApp. |
| Pengerjaan Word | Unduh Word berwarna (warna per kalimat + komentar alasan + Track Changes aktif, format asli terjaga) -> unggah revisi -> cek ulang (kalimat bertanda yang belum diubah) -> Kirim hasil (terima semua perubahan, buang warna dan komentar). |
| WhatsApp | Kotak keluar + webhook ke bot. Tanpa webhook, pesan manual lewat tautan wa.me di panel. |
| Retensi | File dihapus 24 jam setelah hasil dikirim, pengingat 3 jam sebelumnya, pesanan tak dibayar kedaluwarsa dan dokumennya dihapus. |
| Keamanan | Penyamaran teks di server (tes kebocoran otomatis), semua rute admin diaudit otomatis (harus 401), CSRF, pembatasan laju, 3 pesanan belum bayar maks per nomor, header anti-iframe dan no-referrer, jalur berkas tidak bocor. |
| Pemasangan | `deploy/install-parafrase.sh` (cek anchor, backup, patch satu baris, nginx, uji, rollback otomatis) dan `deploy/rollback-parafrase.sh`. |

54 tes otomatis lulus, plus uji alur penuh di browser (desktop dan HP) dan file DOCX berwarna dibuka di LibreOffice.

## Batas yang jujur
- Warna adalah aturan heuristik lokal ("Pemeriksaan Internal NextAja"). **M (merah) hanya mendeteksi kalimat sama persis di dalam dokumen sendiri**, bukan perbandingan dengan jurnal atau internet. Tidak ada skor, tidak ada janji lolos.
- Aturan 4a belum disetel dengan dokumen mahasiswa asli. Kirim 3-5 DOCX contoh (nama dan NIM disensor) supaya ambang dan pola bisa dirapikan.
- Bot WhatsApp Baileys belum disambung (API-nya belum saya lihat). Kontrak webhook ada di `parafrase/notify.js`.
- Versi live di VPS dibangun lewat skrip apply, bukan dari repo. Installer akan **menolak** bila `server.js` live tidak punya anchor yang diharapkan. Jalankan `--check` dulu.
- Estimasi waktu antrean memakai kecepatan rata-rata (pengaturan), bukan jaminan.

## Langkah pasang (setelah ACC)
1. Di VPS: salin branch ini, lalu `bash deploy/install-parafrase.sh --check`.
2. Bila OK: `bash deploy/install-parafrase.sh`.
3. Buka `/admin/parafrase`, unggah foto QRIS, cek pengaturan.
4. Uji satu pesanan sendiri dari awal sampai hasil terkirim, baru umumkan.
5. Kembali kapan saja: `bash deploy/rollback-parafrase.sh <file-backup>`.
