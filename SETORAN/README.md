# SETORAN: hasil kerja dari AI yang tidak bisa git

ChatGPT, Gemini, atau AI lain menutup kerjanya dengan satu blok di bawah. Dika menempel blok itu ke chat Claude mana pun dan bilang "catat setoran".

## Format (wajib persis)

```
SETORAN · <GPT / Gemini / AI lain> · <YYYY-MM-DD HH:MM>
Proyek: <nama folder di PROYEK/, atau "di luar proyek">
Bagan/langkah: <nomor bagan dan langkah, atau "-">
Tugas: <yang diminta Dika, satu kalimat>
Hasil:
<isi hasil kerja: riset, naskah, catatan QC, dst. Sumber ditulis lengkap dengan link>
Belum dicek: <klaim atau bagian yang belum diverifikasi, atau "-">
Status langkah: <BELUM / JALAN / SELESAI>
Lanjutan berikutnya: <langkah berikut dan siapa yang cocok mengerjakan>
Butuh dari Dika: <atau "-">
Cek silang: MENUNGGU <AI pengecek, lihat AI/PERAN.md>
```

## Yang dilakukan Claude saat "catat setoran"
1. `git pull origin kantor`.
2. Simpan blok apa adanya ke `SETORAN/<YYYY-MM-DD>-<HHMM>-<ai>.md`. Jangan ubah isi hasilnya.
3. Buang dulu kalau ada kata sandi, token, nomor rekening, atau data pribadi klien, lalu bilang ke Dika apa yang dibuang.
4. Perbarui status langkah di BAGAN.md (jaga akhir baris CRLF/LF), tambah baris di `PROYEK/<nama>/LOG.md`, dan perbarui "Langkah berikutnya" di `PROYEK/<nama>/HANDOFF.md`.
5. Pastikan baris `Cek silang:` terisi pengecek yang benar (AI/PERAN.md). Kalau Dika menempel blok CEK dengan kata "catat cek", ubah baris itu jadi LULUS/GAGAL sesuai blok.
6. Commit `setoran: <ai> <proyek> <langkah>`, push, lalu laporkan ke Dika dalam satu-dua kalimat.

## Kurir Telegram (otomatis)
Dika meneruskan blok SETORAN atau CEK ke bot Telegram Kantor Ai People. Tiap 10 menit GitHub Actions (workflow `kurir-setoran` di branch main, skrip `alat/kurir_setoran.py`) mengambil pesannya, menyimpan SETORAN ke folder ini atau mengubah baris Cek silang file yang disebut di blok CEK, memperbarui STATUS.md dan PAKET-AI.md, lalu bot membalas apa yang tercatat.
- Pesan yang ada token atau kata sandinya ditolak.
- `/status` ke bot: daftar yang menunggu cek silang.
- Setoran panjang yang terpotong Telegram tetap digabung kalau terkirim berurutan; atau kirim sebagai file .txt/.md.
- Kurir tidak memperbarui BAGAN.md dan HANDOFF. Itu dikerjakan sesi Claude berikutnya yang membaca SETORAN baru.
- Butuh secret repo `TELEGRAM_BOT_TOKEN`. Chat pertama yang mengirim /start ke bot jadi satu-satunya pengirim yang diterima (tersimpan di alat/kurir_chat.txt).
