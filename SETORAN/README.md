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
```

## Yang dilakukan Claude saat "catat setoran"
1. `git pull origin kantor`.
2. Simpan blok apa adanya ke `SETORAN/<YYYY-MM-DD>-<HHMM>-<ai>.md`. Jangan ubah isi hasilnya.
3. Buang dulu kalau ada kata sandi, token, nomor rekening, atau data pribadi klien, lalu bilang ke Dika apa yang dibuang.
4. Perbarui status langkah di BAGAN.md (jaga akhir baris CRLF/LF), tambah baris di `PROYEK/<nama>/LOG.md`, dan perbarui "Langkah berikutnya" di `PROYEK/<nama>/HANDOFF.md`.
5. Commit `setoran: <ai> <proyek> <langkah>`, push, lalu laporkan ke Dika dalam satu-dua kalimat.

## Tahap berikutnya (belum jalan)
Kurir otomatis lewat n8n: Dika meneruskan blok SETORAN ke bot Telegram, n8n yang menulis filenya ke branch ini. Rencana ada di PROYEK/kantor-ai/HANDOFF.md. Selama belum dibangun, pakai cara manual di atas.
