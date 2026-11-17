# Kantor AI People: papan kerja bersama

Branch `kantor` ini dipakai bersama oleh semua Claude (dan AI lain) yang kerja untuk Dika. Isinya cuma catatan kerja, tidak ada kode situs. Tampilan untuk Dika tetap di artefak Kantor Ai People: https://claude.ai/artifact/QdeNyYegbV25h6EfVy47Zc

## Isi folder

| File | Isi | Siapa yang ubah |
|---|---|---|
| `ATURAN.md` | Tujuan akhir dan aturan kerja (dari prompt serah terima 16 Nov 2026) | Hanya atas perintah Dika |
| `KUNCI.md` | Aset dan siapa yang sedang memegangnya | Setiap sesi, sebelum dan sesudah kerja |
| `BAGAN.md` | Bagan 00–15 dan status tiap langkah | Setiap sesi, sesudah kerja |
| `CHAT.md` | Daftar chat Claude dan meja/bagan yang dikerjakannya | Setiap sesi baru mencatat dirinya |
| `LAPORAN/` | Satu file laporan per sesi kerja | Setiap sesi, di akhir kerja |
| `PROYEK/<nama>/` | HANDOFF.md dan LOG.md tiap proyek (lihat PROYEK/README.md) | Sesi yang mengerjakan proyek itu |
| `MULAI.md` | Prompt pembuka untuk chat Claude baru | Hanya atas perintah Dika |
| `AI/` | Peran tiga AI (PERAN.md), pintu masuk GPT/Gemini (BACA-DULU.md), setup sekali per AI (SETUP.md) | PERAN.md hanya atas perintah Dika |
| `STATUS.md` | Status papan buatan otomatis: yang menunggu cek silang, kunci, rahasia bocor | Otomatis (alat/cek_papan.py), jangan diedit manual |
| `ESTAFET/` | Proyek produksi 4 tahap (Gemini, GPT, Flow, Claude); status = kunci giliran | Lewat kurir Telegram atau Claude |
| `ARTEFAK/` | Salinan isi artefak Kantor Ai People | Claude akun pemilik artefak |
| `SETORAN/` | Hasil kerja GPT/Gemini yang dicatat Claude (format di SETORAN/README.md) | Claude, saat Dika bilang "catat setoran" |

## Alur kerja tiap sesi (wajib)

1. **Tarik dulu:** `git pull origin kantor`. Jangan kerja dari salinan lama.
2. **Baca** `ATURAN.md`, `KUNCI.md`, baris bagan yang mau dikerjakan di `BAGAN.md`, dan `PROYEK/<nama>/HANDOFF.md` proyeknya.
3. **Ambil kunci:** kalau aset yang mau diubah berstatus `bebas`, ganti jadi `DIPEGANG <nama sesi>`, isi tugas dan waktunya, lalu commit dan push **sebelum** mulai kerja. Kalau push ditolak karena ada perubahan baru, tarik lagi dan cek ulang kuncinya. Aset yang dipegang sesi lain tidak disentuh.
4. **Catat diri** di `CHAT.md` kalau belum ada (link chat, meja, bagan).
5. **Kerjakan.**
6. **Tutup:** tulis `LAPORAN/<YYYY-MM-DD>-<HHMM>-<meja>.md` pakai format di bawah, perbarui status langkah di `BAGAN.md`, perbarui `PROYEK/<nama>/HANDOFF.md` dan tambah baris di `LOG.md`, lepas kunci di `KUNCI.md` (isi kolom "terakhir"), commit, push. Lakukan ini juga kalau token hampir habis, sebelum chat berhenti.

Nama sesi: `<AI> <akun> · <meja>`, contoh `Claude akun-2 · Web`.

## Format laporan

```
# Laporan <tanggal jam> · <nama sesi>
Chat: <link chat>
Bagan: <nomor dan nama>

SELESAI: ...
BELUM: ...
STATUS LANGKAH: nomor bagan, nomor langkah, status baru (BELUM / JALAN / SELESAI)
PERUBAHAN ASET: aset, apa yang berubah, commit atau tautan
BUTUH DARI DIKA: ...
Cek silang: MENUNGGU <AI pengecek, lihat AI/PERAN.md>
```

Mulai 17 Nov 2026 tiap laporan wajib punya baris Cek silang. Sebelum kerja, baca `STATUS.md` (dibuat otomatis tiap push) dan kerjakan dulu cek silang yang menunggu kamu.

## Larangan

- Tidak menulis kata sandi, kunci API, token, atau nomor rekening di branch ini.
- Tidak mengarang angka, jadwal, harga, atau status. Yang belum dicek ditulis "belum dicek".
- Tidak mengubah branch situs (`feat/koin`, `heyaipeople`, `portofolio-dika`) dari branch ini.
