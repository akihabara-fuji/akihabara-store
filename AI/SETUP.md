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

## Tes pertama (belum dicek)
Belum dicek apakah ChatGPT dan Gemini di akun Dika bisa membuka link raw GitHub. Tes pertama: minta masing-masing "ringkas isi BACA-DULU.md dalam 3 poin". Kalau gagal, laporkan ke Claude supaya caranya diganti.
