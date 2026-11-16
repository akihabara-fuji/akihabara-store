# Setup sekali per AI (untuk Dika)

Cukup sekali. Setelah itu tiap chat baru di AI tersebut langsung tahu aturannya, karena instruksinya cuma menyuruh membaca GitHub. Kalau aturan berubah, yang diedit file di GitHub, bukan setelan AI-nya.

## Claude
Sudah jalan. Tempel isi `MULAI.md` di chat baru.

## ChatGPT
1. Di ChatGPT, buat Project baru bernama "Kantor Ai People".
2. Buka setelan Project, bagian instruksi, lalu tempel teks di bawah.
3. Kerjakan semua tugas Kantor dari chat di dalam Project ini.

## Gemini
1. Di Gemini, buat Gem baru bernama "Kantor Ai People".
2. Di kolom instruksi Gem, tempel teks yang sama di bawah, lalu simpan.
3. Kerjakan semua tugas Kantor lewat Gem ini.

## Teks instruksi (sama untuk ChatGPT dan Gemini)

```
Kamu bekerja untuk Dika Priyadi di "Kantor AI People".
Sebelum mengerjakan apa pun di chat ini, buka dan baca:
https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/AI/BACA-DULU.md
lalu baca semua file yang disebut di sana. Ikuti aturan dan peranmu di file itu.
Kalau link tidak bisa dibuka, bilang ke Dika dan minta dia menempel isinya; jangan menebak.
Setiap selesai kerja atau saat kuota hampir habis, tutup dengan blok SETORAN sesuai format di file itu.
Bahasa: Indonesia santai (gw/lo), pendek, inti dulu.
```

## Cara pakai harian
1. Kasih tugas ke AI yang perannya cocok (lihat AI/PERAN.md).
2. Kalau GPT atau Gemini selesai, salin blok SETORAN-nya.
3. Tempel ke chat Claude mana pun, bilang "catat setoran". Claude yang menyimpan ke GitHub dan memperbarui bagan.

## Status setup (17 Nov 2026, dicek Claude di browser Dika)
- ChatGPT, akun dikha.priyadhi@gmail.com (paket Go): Project "Kantor Ai People" sudah dibuat dan instruksi terpasang. Tes: bisa membuka link raw GitHub, membaca STATUS.md, dan menulis blok CEK yang benar. Link: https://chatgpt.com/g/g-p-6afb94910be48191896bf1a01bc797f3/project
- Gemini, akun dikha.priyadhi@gmail.com (Plus): Gem "Kantor Ai People" sudah dibuat. Gem TIDAK bisa membuka link, jadi papan diberikan lewat Google Doc terlampir (lihat di bawah). Tes: Gem membaca doc dan menulis blok SETORAN yang benar. Link: https://gemini.google.com/gem/6e1f33643558
- Gemini, akun akihabara.fuzi@gmail.com: belum (akun belum login di browser bawaan Claude).

## Jembatan untuk Gemini (Gem tidak bisa buka link)
1. GitHub Actions menyusun `PAKET-AI.md` (gabungan STATUS, BACA-DULU, PERAN, ATURAN, KUNCI, BAGAN, SETORAN/README, PROYEK/README, semua HANDOFF) tiap push ke branch kantor.
2. Apps Script milik dikha.priyadhi ("Project tak berjudul", fungsi `sinkron`, pemicu tiap 1 jam) menyalin PAKET-AI.md ke Google Doc "Kantor Ai People - Papan (otomatis dari GitHub)", id `1EDxEklPH0EE2D_oMqJ975jiG97boVBC9va8Rle2VNzA`.
3. Doc itu terlampir sebagai pengetahuan Gem. Jadi Gem tertinggal paling lama sekitar 1 jam dari GitHub.
4. Kalau Gem bilang isinya lama, cek jam salinan di baris atas doc. Untuk memaksa segar: buka script.google.com, project itu, jalankan `sinkron`.
5. Instruksi Gem = teks di atas ditambah: "PENTING: kamu tidak bisa membuka link, jadi isi semua file papan ada di dokumen terlampir "Kantor Ai People - Papan (otomatis dari GitHub)" yang diperbarui tiap jam. Baca dokumen itu sebagai pengganti link, mulai dari bagian STATUS.md."
