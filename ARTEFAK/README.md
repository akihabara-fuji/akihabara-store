# ARTEFAK: salinan isi artefak Kantor Ai People di papan

Perintah Dika 17 Nov 2026: semua isi artefak "Kantor Ai People" (dulu Gudang Prompt) dinaikkan ke papan ini supaya ikut terpantau sistem (STATUS.md, PAKET-AI.md untuk Gemini, estafet).

## TUGAS untuk Claude akun pemilik artefak (akun-2)
Akun-1 hanya bisa melihat artefak (Can view) dan tool database artefak menjawab "not found", jadi ekspor harus dari akun pemilik.

1. Tarik branch kantor. Ambil kunci "Kantor Ai People (artefak)" di KUNCI.md, push.
2. Pakai tool database artefak (slug `bf60001d-9bea-47c8-b8dc-5a1d139580b3`), db_list tiap koleksi `aset`, `ide`, `jadwal`, `prompts` sampai habis (ikuti nextCursor).
3. Simpan apa adanya ke `ARTEFAK/aset.json`, `ARTEFAK/ide.json`, `ARTEFAK/jadwal.json`, `ARTEFAK/prompts.json` (array of {id, data, updatedAt}). Jangan ubah isi. Buang dulu kalau ada token/kata sandi.
4. Tulis `ARTEFAK/RINGKAS.md`: daftar jadwal (tanggal, judul, kanal, bagan, status), daftar judul prompt per kategori, dan 30 naskah resmi BUILD WITH AI (judul Part + hook) kalau ada di DB.
5. Untuk tiap entri jadwal yang belum tayang dan berupa konten (carousel, video, artikel): buat folder estafet `ESTAFET/<id>/PROYEK.md` dengan format di ESTAFET/README.md. Status awal: `LOCK_GEMINI` bila belum ada brief; `LOCK_GPT` bila brief/naskah sudah ada di artefak (tulis di mana); untuk Part BUILD WITH AI yang videonya sudah jadi dan menunggu ACC Dika pakai `MENUNGGU_ACC_DIKA`.
6. Tambahkan ARTEFAK/RINGKAS.md ke daftar URUT di alat/paket_ai.py supaya Gemini ikut membaca.
7. Lepas kunci, tulis LAPORAN, push. Cek silang: MENUNGGU GPT.

Prompt untuk Dika tempel di chat Claude akun-2:
"Kerjakan TUGAS di ARTEFAK/README.md branch kantor repo akihabara-fuji/akihabara-store sampai selesai."

## Status
- 17 Nov 2026 08.30: belum diekspor. Yang terlihat dari akun-1: 33 prompt, jadwal posting 16–22 Nov (Senin laporan mingguan; Selasa carousel "7 cara AI untuk konten" sistem 02 tayang setelah persetujuan; Rabu artikel blog 09.00 + video panjang sistem 03 dan 14; Kamis portofolio galeri sistem 07; Jumat artikel blog + posting carousel catatanakademik; Sabtu-Minggu belum terbaca).
- 17 Nov 2026 08.29: DIEKSPOR oleh Claude akun-2 (aset 7, ide 17, jadwal 8, prompts 33). RINGKAS.md dan 8 estafet dibuat. Ekspor ulang bila artefak berubah.
