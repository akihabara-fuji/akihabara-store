# PROGRESS: Cek dan Parafrase Mandiri

Cabang: `feature/cek-parafrase-mandiri` (dari `nextaja-baru`). Jangan deploy sebelum disetujui pemilik.

## Keputusan
- Pembayaran: QRIS manual (foto QRIS + bukti bayar + verifikasi admin). Webhook ditunda ke v2.
- Database: SQLite (better-sqlite3), berkas `data/parafrase.db`.
- WhatsApp: bot Baileys yang sudah ada di VPS (belum dihubungkan).
- Modul terpisah di `parafrase/`, dipasang dari server.js dengan satu baris. Tidak mengubah rute lama.
- Versi live di VPS bisa berbeda dari repo; pasang ke live lewat skrip pasang bercadangan (anchor dicek, ada rollback), bukan menimpa folder.

## Selesai
- Tahap 1: audit (lihat AUDIT di chat).
- Tahap 2: skema SQLite (settings, settings_log, orders, findings, order_events, fast_reservations), modul pengaturan dengan validasi dan log, `GET /ms/public-config`, `GET/PUT /ms/admin/parafrase/settings`. 7 tes lulus (`npm run test:unit`).

## Langkah berikutnya
1. Tahap 3: upload DOCX (privat, di luar /uploads), validasi isi file, ekstraksi per paragraf dan kalimat, deteksi judul/bahasa/kata.
2. Tahap 4a/4b: mesin analisis dan penyamaran server.
3. Tahap 5: halaman /ruanglabut dan halaman murid.
