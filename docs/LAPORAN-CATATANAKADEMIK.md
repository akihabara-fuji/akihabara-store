# Laporan akhir: profesionalisasi CatatanAkademik.com

Tanggal: 23 Oktober 2026. Branch: `feature/ca-final` (dari `fix/foto-isi-artikel` ← `production-vps-20261023`).
Status: **selesai di kode dan teruji lokal. Belum di-push dan belum di-deploy.**

## 1. Ringkasan

| Bagian prompt | Status |
|---|---|
| A. Audit read-only | Selesai (`D:\zianka putri\AUDIT-CATATANAKADEMIK-TAHAP1.md`, termasuk bagian 8 snapshot VPS) |
| B. Design system | Token warna navy/biru CA untuk blog dan panel; mode gelap/terang; fokus keyboard; target sentuh ≥38–44px; animasi ringan + `prefers-reduced-motion` |
| C. Blog publik | Selesai sesuai mockup (detail di bagian 2) |
| D. Dashboard admin | Selesai, data nyata, menu sesuai mockup, **terpisah dari admin nextaja** |
| E. CMS & editor | Selesai (draf, review, jadwal, terbit, sampah, revisi, pratinjau template publik, SEO) |
| F/G. Pesanan & pembayaran | Selesai di atas sistem yang ada (tanpa mengubah cara bayar QRIS manual) |
| H. Layanan & harga | Harga per layanan + buka/tutup layanan; pesanan lama tetap memakai harga lama |
| I. Peran, laporan, log | Peran Pemilik/Editor/Admin pesanan, log semua aksi admin, laporan dengan definisi metrik |
| J. SEO | Lihat bagian 2 dan 3 |
| K. Keamanan | Lihat bagian 4 |
| L. Testing | 66/66 tes lulus (3 kali berturut-turut) + uji manual di browser |

## 2. Yang berubah

### Blog publik (`/blog`, `/blog-ut`, `/blog/<slug>`, 404)
- Beranda blog sesuai mockup: hero "Informasi dan Panduan Kuliah **Universitas Terbuka**", kotak pencarian, filter kategori + tag populer, **Artikel Pilihan**, kartu artikel bergambar (kategori, judul, ringkasan, tanggal, waktu baca), arsip bulanan.
- `/blog-ut` memakai isi yang sama dan kanonis ke `/blog` (tidak ada konten ganda di Google). Alamat lama tetap berfungsi.
- Halaman artikel dua kolom: breadcrumb dengan kategori, tanggal terbit dan **"Diperbarui"** (hanya bila isi benar-benar berubah > 1 hari setelah terbit), waktu baca, penulis, sampul + alt + keterangan, **daftar isi otomatis** (≥3 judul), tag, catatan sumber resmi UT, artikel terkait bergambar, kembali ke kategori.
- Isi artikel kini mendukung H2–H6, miring, kutipan, daftar bernomor, **tabel**, dan **foto di dalam isi**.
- Merek di domain akademik dikunci "Catatan Akademik" (typo "Catata Akademi UT" dari isian admin nextaja tidak tampil lagi).
- 404 bermerek dengan status HTTP 404; pencarian `?q=` diberi `noindex`.

### Panel admin Catatan Akademik — `https://catatanakademik.com/admin/`
Terpisah total dari `nextaja.com/admin`: akun, sandi, sesi (cookie `ca_admin`), dan hak akses sendiri. API akademik menolak login nextaja.

Menu: Dashboard · Artikel Blog · Tulis Artikel · Kategori & Tag · Media · Komentar · Pesanan Layanan (Menunggu pembayaran / Menunggu konfirmasi / Sedang diproses / Perlu revisi / Selesai / Dibatalkan) · Konfirmasi Pembayaran · Antrean Cek & Parafrase · Kirim Hasil Layanan · Pelanggan · Layanan & Harga · Laporan & Statistik · Pengaturan Website · SEO & Sitemap · Admin & Peran · Log Aktivitas · Akun saya.

## 3. Berkas berubah

| Berkas | Isi perubahan |
|---|---|
| `server.js` | login CA untuk API akademik, `/admin` per domain, 404 terakhir, sitemap tanpa `lastmod` palsu |
| `blog-akun.js` | beranda blog, halaman artikel, 404, field & status artikel, jadwal, revisi, pratinjau, tabel, id judul |
| `admin-ca/auth.js` (baru) | akun, sesi, peran, batas percobaan login, log |
| `admin-ca/index.js` (baru) | API dashboard, pesanan, catatan, batal/refund, pembayaran, layanan, laporan, SEO, media, admin, log |
| `admin-ca/public/*` (baru) | UI panel |
| `public/assets/ca-blog.css` (baru) | tampilan blog |
| `parafrase/db.js` | migrasi 5 (tabel baru saja) |
| `parafrase/index.js`, `orders.js`, `layanan.js`, `settings.js`, `pages.js`, `pages/admin.*`, `pages/blog-ut.html` | pakai db bersama, nama admin di log, layanan bisa ditutup, login CA di halaman admin lama, `/blog-ut` baru |
| `tests/*` | 2 berkas tes baru, 3 tes lama disesuaikan |
| `deploy/update-ca-final.sh` (baru) | skrip rilis dengan backup + rollback |

**Database:** migrasi 5 hanya **menambah** tabel `ca_admins`, `ca_sessions`, `ca_admin_log`, `order_notes`. Tabel pesanan/pelanggan tidak diubah. Data blog: field baru opsional di `blog.json` (lama tetap terbaca). Riwayat revisi di `data/blog-revisions/`.
**Konfigurasi:** variabel baru opsional `CA_ADMIN_PASSWORD` di `.env` (sandi akun `pemilik` panel CA). Pengaturan baru `layanan_nonaktif`. nginx tidak perlu diubah.

## 4. Keamanan
- Semua API admin akademik wajib login CA + cek asal permintaan untuk aksi tulis; peran dicek per rute di server (bukan hanya disembunyikan di menu).
- Editor tidak menerima data pesanan/pelanggan (termasuk dari dashboard).
- Sandi admin di-hash scrypt; token sesi hanya disimpan sebagai hash; 5 kali salah → kunci 15 menit; menonaktifkan/mengganti peran/sandi langsung mengakhiri sesi orang itu.
- Isi artikel tetap di-escape (format Markdown terbatas, bukan HTML bebas) → aman dari XSS; gambar hanya dari `/uploads`; pratinjau dibuka di iframe tanpa izin skrip.
- Draf/review/terjadwal tidak tampil publik, tidak masuk sitemap; pratinjau wajib login + `noindex`.
- Konfirmasi pembayaran: dialog konfirmasi, tombol dikunci saat proses, status dicek di server (konfirmasi ganda ditolak 409). Bukti unggahan tidak dianggap lunas.

## 5. Hasil tes (aktual)
```
node --test tests/*.test.js   →   tests 66, pass 66, fail 0   (diulang 3x, stabil)
npm run check                 →   lulus
```
Uji manual di browser (server lokal + data blog asli dari snapshot + pesanan contoh):
- 19 halaman panel terbuka tanpa error JavaScript.
- Tulis artikel → draf (publik 404) → pratinjau bertema → terbitkan (publik 200 + masuk sitemap).
- Konfirmasi pembayaran, catatan internal, batal pesanan berbayar → tandai dana dikembalikan; semua tercatat di log atas nama admin.
- Tampilan HP 375px: tanpa scroll ke samping (blog dan panel).

## 6. Yang masih tersisa / di luar cakupan
- **Panel nextaja tidak disentuh** (sesuai permintaan). Tab Blog/Pelanggan/Ruang Akademik di sana akan menampilkan "sesi habis" karena API akademik sekarang khusus login CA.
- Format isi artikel tetap Markdown dengan toolbar (bukan editor WYSIWYG), demi keamanan dan kecocokan dengan 17 artikel yang ada.
- Kategori masih tetap di kode (Study, Info UT); tag bebas dari editor.
- Pengunjung/trafik tidak dihitung panel; pakai GA4.
- IndexNow tidak dikirim otomatis saat artikel terjadwal tayang (Google tetap lewat sitemap).
- 6 artikel lama > 300 kata tanpa H2 dan 1 foto dengan alt nama file: terdaftar di menu **SEO & Sitemap** untuk diperbaiki dari editor.
- Tes e2e Playwright lama (`tests/site.spec.js`) dan lint belum dijalankan (tidak ada konfigurasi lint).
- Sintaks skrip deploy belum bisa dicek otomatis (bash diblokir di laptop); sudah diperiksa manual.

## 7. Rilis dan rollback
1. Push branch `feature/ca-final` ke GitHub.
2. Di VPS (root): `curl -fsSL https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/<commit>/deploy/update-ca-final.sh -o /root/update-ca-final.sh && bash /root/update-ca-final.sh <commit>`
3. Skrip berhenti tanpa perubahan bila berkas VPS tidak sama dengan versi live; membuat backup berkas + database; verifikasi 13 hal setelah restart; rollback otomatis bila salah satu gagal.
4. Rollback manual: perintah dicetak di akhir skrip (`tar xzf <backup> ...`). Database tidak perlu dikembalikan (tabel baru diabaikan kode lama).
5. Setelah rilis: tambahkan `CA_ADMIN_PASSWORD=<sandi baru>` ke `.env`, lalu `pm2 restart nextaja --update-env`.

## 8. Panduan singkat admin
- **Masuk:** `catatanakademik.com/admin/`, nama pengguna `pemilik`, sandi `CA_ADMIN_PASSWORD`. Buat akun bernama untuk tim di **Admin & Peran** (Editor untuk penulis, Admin pesanan untuk CS).
- **Menulis:** Tulis Artikel → isi judul, kategori, isi (pakai H2 untuk bagian utama) → panel kanan: status, tag, sampul + alt → tab SEO → **Pratinjau** → Simpan/Terbitkan/Jadwalkan. Ctrl+S menyimpan. Draf lokal otomatis tersimpan di browser.
- **Artikel Pilihan:** Artikel Blog → Aksi → Jadikan Artikel Pilihan.
- **Pembayaran:** Konfirmasi Pembayaran → Lihat bukti → cocokkan nominal (dengan kode unik) di mutasi QRIS → Konfirmasi, atau Tolak dengan alasan.
- **Pesanan:** Pesanan Layanan → klik baris → Mulai kerjakan / Kirim hasil / Catatan internal / Batalkan (pesanan berbayar: kembalikan dana lalu "Tandai dana sudah dikembalikan") / Hubungi via WhatsApp.
- **Harga & layanan:** Layanan & Harga → ubah angka atau centang "Dibuka" → Simpan (berlaku untuk pesanan baru).
- **Jejak:** Log Aktivitas menampilkan siapa melakukan apa dan kapan.

## 9. Audit Dokumen ↔ Cek & Parafrase (urgensi + resep), 23 Okt 2026

Audit = diagnosis, Cek & Parafrase = obat. Satu mesin (`parafrase/triage.js`) dan satu set angka admin dipakai keduanya.

- **Urgensi dokumen** (Mendesak / Perlu perhatian / Relatif aman): bila murid menempel angka Drillbit resmi (tidak diverifikasi), angka itu menentukan terhadap batas acuan admin; tanpa angka, memakai estimasi pola tulisan + jumlah paragraf mendesak. Selalu berlabel estimasi, bukan skor Drillbit/Turnitin/detektor AI.
- **Urutan perbaikan**: paragraf diurutkan dari yang paling mendesak (bobot: kalimat berulang 5, kutipan tanpa sitasi 4, paragraf umum/frasa seragam/panjang seragam 3, dst.), bernomor sama dengan peta warna di Cek & Parafrase.
- **Jembatan**: tombol "Obati lewat Cek & Parafrase Mandiri" di hasil Audit membawa dokumen yang sama (`/cek-parafrase-mandiri?u=<id>`, tersimpan 2 jam), tanpa unggah ulang; angka Drillbit yang ditempel ikut terbawa.
- **Deteksi baru**: panjang kalimat seragam per paragraf (kode A), frasa "penting untuk diingat", "dalam era digital". Jenis temuan kode A kini diturunkan dari teks alasan, sehingga hasil dari database sama dengan analisis baru.
- **Resep**: panduan tulis ulang MANUAL (variasi panjang kalimat, kurangi penghubung berulang, tambah analisis sendiri, sitasi lengkap, teknik baca-tutup-tulis ulang). Tidak ada penulisan ulang otomatis dan tidak ada janji skor Drillbit/AI.
- **Pengaturan admin baru** (Pengaturan → Audit Dokumen): `urgensi_ai_sedang` (30), `urgensi_ai_tinggi` (60), `urgensi_paragraf_skor` (8), `urgensi_paragraf_persen` (15). Perubahan langsung berlaku (cache dibatalkan otomatis).
- **Privasi**: keluaran urgensi hanya hitungan, nomor paragraf, dan label umum; tidak memuat kalimat dokumen saat pratinjau terkunci. Potongan awal paragraf hanya di hasil berbayar.
- Tes: `tests/triage.test.js` (13 tes). Total 121/121.
