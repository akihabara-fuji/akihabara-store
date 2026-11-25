# Jadwal konten (Konten OS)

Satu tabel untuk semua konten, dari ide sampai dievaluasi, dibaca semua AI. Melengkapi `ESTAFET/` (produksi) dengan tahap sesudahnya: jadwal, posting, hasil. Tidak menggantikan apa pun yang sudah ada.

- Sumber tunggal: `JADWAL/jadwal.csv` (satu baris = satu konten untuk satu platform).
- Tampilan: `JADWAL/PAPAN.md` (teks, otomatis) dan `JADWAL/dasbor/index.html` (Kanban, Tabel, Flowchart, Kalender; buka langsung di browser).
- Riwayat perubahan: `JADWAL/log.csv` (siapa, kapan, apa).
- Alat: `python3 alat/jadwal.py` (Python bawaan, tanpa instal).

## Tangga status (satu bahasa untuk semua AI)
`IDE` → `BRIEF` (Gemini) → `NASKAH` (GPT) → `KLIP` (Dika di Flow) → `RAKIT` (Claude) → `AUDIT` (Claude) → `ACC` (Dika) → `SIAP_JADWAL` → `TERJADWAL` (Dika) → `DIPOSTING` (Dika) → `DIEVALUASI`.

Tahap BRIEF sampai ACC tidak diisi tangan: dibaca dari `Status:` di `ESTAFET/<id>/PROYEK.md` lewat kolom `estafet`. Kolom `status_post` hanya memuat `IDE, SIAP_JADWAL, TERJADWAL, DIPOSTING, DIEVALUASI`. Konten tanpa estafet (misal artikel yang ditulis langsung) memakai `status_post` saja.

## Kolom jadwal.csv
`id, estafet, akun, platform, format, judul, tanggal, jam, status_post, acc_dika, file_drive, url_posting, diposting_oleh, views, likes, saves, shares, dievaluasi, catatan, diubah`
- akun: `pribadi` / `heyaipeople` / `catatanakademik`. platform: `instagram` `tiktok` `youtube` `facebook` `blog` `web`. format: `reels` `shorts` `carousel` `feed` `story` `video-panjang` `artikel`.
- tanggal `YYYY-MM-DD`, jam `HH:MM` (WIB). Satu konten di tiga platform = tiga baris (id berbeda, estafet sama).

## Aturan yang dijaga mesin (`validasi` menolak yang melanggar)
1. `TERJADWAL`, `DIPOSTING`, `DIEVALUASI` wajib: akun, platform, format, tanggal, jam, dan `acc_dika=ya`. Estafet-nya harus sudah `ACC_DIKA` atau `COMPLETED`.
2. `DIPOSTING` dan `DIEVALUASI` wajib `diposting_oleh=dika` dan `url_posting`. Tidak ada posting otomatis oleh AI mana pun (ATURAN.md nomor 5).
3. `DIEVALUASI` wajib minimal satu angka asli (views/likes/saves/shares) dan tanggal `dievaluasi`. Angka tidak boleh dikarang: kosong berarti belum ada.
4. Tanggal target lewat dan belum `DIPOSTING` otomatis ditandai **terlambat** di papan.
5. Kata sandi, kunci API, nomor rekening tidak ditulis di sini.

## Perintah
```
python3 alat/jadwal.py daftar [akun=.. platform=.. tahap=..]
python3 alat/jadwal.py telat
python3 alat/jadwal.py tambah id=reels-pecut-ai akun=pribadi platform=tiktok format=reels judul="..." tanggal=2026-11-28 jam=19:00 oleh=claude
python3 alat/jadwal.py pindah <id> TERJADWAL tanggal=2026-11-28 jam=19:00 acc_dika=ya oleh=claude
python3 alat/jadwal.py pindah <id> DIPOSTING url_posting=https://... oleh=dika
python3 alat/jadwal.py pindah <id> DIEVALUASI views=123 likes=4 saves=2 shares=1 dievaluasi=2026-12-01 oleh=claude
python3 alat/jadwal.py validasi && python3 alat/jadwal.py bangun
python3 alat/jadwal.py impor-estafet      # tarik proyek ESTAFET baru ke tabel
python3 alat/jadwal.py terapkan-setoran   # baca baris "Jadwal: ..." dari SETORAN/
```
`bangun` menyegarkan PAPAN.md, `jadwal.json`, dan dasbor. GitHub Actions menjalankannya otomatis tiap push ke `kantor` (lihat `JADWAL/cek-papan.yml.usulan` bila alur belum terpasang).

## Pemakaian per AI
Lihat `JADWAL/PANDUAN-AI.md` (prompt siap tempel untuk Claude, GPT, Gemini, Hermes).

## Hubungan dengan sistem lain
- ESTAFET = produksi satu konten. JADWAL = nasib konten itu sesudah jadi. Keduanya satu tangga.
- Halaman demo Sistem Kerja di portofolio memakai bentuk yang sama dengan data contoh (jadwal nyata tetap private). Pemasangannya menunggu ACC mock.
