# Panduan AI: cara memakai Jadwal konten

Berlaku untuk Claude, GPT, Gemini, Hermes, dan AI lain. Baca `ATURAN.md` dan `JADWAL/README.md` dulu. Bahasa ke Dika: Indonesia santai, pendek, inti dulu.

## Jalur A: AI yang bisa push ke GitHub (Claude, Hermes)
1. `git pull origin kantor`. 2. Ubah lewat `python3 alat/jadwal.py ...` (bukan edit CSV tangan; alat menolak data yang melanggar aturan). 3. `python3 alat/jadwal.py bangun`. 4. Commit dan push ke `kantor`. 5. Satu baris di LAPORAN seperti biasa. Sebelum mengubah satu konten, cek `KUNCI.md` kalau ada kunci aktif.

## Jalur B: AI yang tidak bisa push (GPT, Gemini di web)
Tambahkan baris di blok SETORAN (lewat kurir Telegram seperti biasa):
`Jadwal: <id> -> <STATUS> tanggal=2026-11-28 jam=19:00 acc_dika=ya`
Mesin menerapkannya lewat `terapkan-setoran`. Baris yang melanggar aturan ditolak dan tercatat di log.csv. DIPOSTING tidak bisa lewat jalur ini: itu hak Dika.

## Prompt siap tempel
**Claude / Hermes**
```
Kamu bekerja untuk Dika di Kantor AI People (repo akihabara-fuji/akihabara-store, branch kantor).
Tarik branch, baca ATURAN.md, JADWAL/README.md, JADWAL/PAPAN.md. Pakai python3 alat/jadwal.py.
Tugas: [mis. "periksa yang terlambat dan tentukan yang paling menggerakkan"]. Jangan memposting apa pun.
Selesai: validasi, bangun, commit, push, tulis LAPORAN. Angka hasil hanya dari data asli.
```
**GPT (naskah)**
```
Kamu penulis naskah untuk Dika. Baca JADWAL/PAPAN.md (tahap NASKAH = giliranmu). Untuk tiap konten pada tahap itu
tulis naskah + tabel SCENE sesuai ESTAFET/README.md. Di setoran tambahkan: Estafet: <id> -> LOCK_FLOW
Jangan karang angka, sumber, atau jadwal.
```
**Gemini (brief dan audit)**
```
Kamu peneliti dan auditor untuk Dika. Tahap BRIEF = giliranmu: riset dan brief (tujuan, audiens, pesan, bukti, CTA).
Audit: bandingkan baris jadwal dengan file ESTAFET dan laporkan yang tidak cocok. Setoran: Estafet: <id> -> LOCK_GPT
Untuk evaluasi, pakai hanya angka dari tangkapan layar yang Dika kirim; yang tidak ada ditulis "belum ada".
```

## Yang tidak boleh
Memposting atau menjadwalkan ke akun Dika langsung. Mengisi `acc_dika=ya` tanpa Dika benar-benar menyetujui. Mengubah tahap ESTAFET tanpa pemegangnya. Mengarang metrik.
