# Peran tiga AI di Kantor AI People

Disetujui Dika 17 Nov 2026 ("atur sesuai rekomendasi lu"). Semua AI kerja di papan yang sama: repo akihabara-fuji/akihabara-store, branch `kantor`. Tidak ada spreadsheet atau tempat lain.

| AI | Peran | Boleh | Tidak boleh |
|---|---|---|---|
| Claude | Eksekutor dan juru catat | Kode, deploy, commit dan push ke branch ini, pegang kunci aset di KUNCI.md, mencatat SETORAN dari AI lain | Mengubah ATURAN.md tanpa perintah Dika |
| ChatGPT (GPT) | Riset dan struktur | Riset, cek fakta, kerangka konten, naskah, CV, proposal, penawaran | Mengubah aset (situs, sosmed, bot) langsung; memegang kunci aset |
| Gemini | QC dan visual | Cek mutu hasil kerja, cek tampilan situs dan desain, ide visual, cek ulang fakta | Mengubah aset langsung; memegang kunci aset |

## Peran dalam ESTAFET produksi (17 Nov 2026)
Untuk proyek konten/klien yang lewat estafet (ESTAFET/README.md), urutannya: Gemini riset dan brief (`LOCK_GEMINI`), GPT naskah, panduan carousel Canva, dan tabel SCENE berisi prompt Google Flow (`LOCK_GPT`), Dika menjalankan Google Flow jadi klip scene_XX.mp4 (`LOCK_FLOW`), Claude merakit di Remotion, audit, lalu deploy/kirim setelah ACC Dika (`LOCK_CLAUDE_REMOTION` sampai `COMPLETED`). Peran QC/cek silang di tabel atas tetap berlaku untuk tiap setoran estafet.

## Kenapa GPT dan Gemini tidak pegang kunci
Kerjaan mereka berupa bahan (riset, naskah, catatan QC), bukan perubahan aset. Yang mengubah aset hanya Claude, jadi tidak ada dua AI yang mengedit hal yang sama di waktu yang sama.

## Cara tugas dibagi
- Langkah di BAGAN.md yang ditandai `(GPT)` atau `(Gemini)` adalah jatah AI itu. Langkah tanpa tanda boleh diambil Claude.
- Kalau Dika menyuruh satu AI mengerjakan hal di luar perannya, ikuti Dika, lalu tulis di SETORAN bahwa itu di luar peran.

## Cek silang (wajib, berlaku mulai 17 Nov 2026)
Tidak ada AI yang mengecek hasilnya sendiri. Tiap SETORAN dan LAPORAN punya baris `Cek silang:` berisi `MENUNGGU <AI pengecek>`, `LULUS <AI> <tanggal>`, atau `GAGAL <AI> <alasan>`.

| Pembuat | Pengecek |
|---|---|
| GPT | Gemini |
| Gemini | GPT |
| Claude, kerjaan tampilan/web/visual | Gemini |
| Claude, kerjaan fakta/teks/riset | GPT |
| Kode dan teknis dari GPT/Gemini | Claude |

Cara mengecek: buka STATUS.md, bagian "Menunggu cek silang", ambil yang menunggu kamu, lalu periksa fakta dan sumbernya, ikut ATURAN.md atau tidak, sama brief atau tidak. Tutup dengan blok:

```
CEK · <AI> · <YYYY-MM-DD HH:MM>
File: <SETORAN/... atau LAPORAN/...>
Hasil: LULUS / GAGAL
Catatan: <yang salah dan harus diperbaiki, atau "-">
```

Claude menulis hasilnya langsung ke baris `Cek silang:` file itu. GPT/Gemini menyerahkan blok CEK ke Dika, lalu Dika menempelnya ke Claude dengan kata "catat cek".

Yang LULUS boleh lanjut ke langkah berikutnya tanpa ditanyakan ke Dika. ACC Dika hanya untuk tiga hal: posting ke media sosial, uang atau harga, dan tindakan yang tidak bisa dibatalkan.

## Pemeriksa otomatis
Tiap push ke branch kantor, GitHub menjalankan `alat/cek_papan.py`. Skrip itu mengecek format SETORAN/LAPORAN, baris cek silang, kunci aset, dan rahasia yang bocor (token, kata sandi), lalu menulis hasilnya ke `STATUS.md`. Semua AI membaca STATUS.md sebelum mulai kerja.

## Cara masuk papan
- Claude: prompt di `MULAI.md` (bisa git langsung).
- GPT dan Gemini: baca `AI/BACA-DULU.md` lewat link raw, tutup kerja dengan blok SETORAN (format di `SETORAN/README.md`).
- Setup sekali per AI ada di `AI/SETUP.md`.
