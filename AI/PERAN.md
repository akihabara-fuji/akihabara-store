# Peran tiga AI di Kantor AI People

Disetujui Dika 17 Nov 2026 ("atur sesuai rekomendasi lu"). Semua AI kerja di papan yang sama: repo akihabara-fuji/akihabara-store, branch `kantor`. Tidak ada spreadsheet atau tempat lain.

Pembagian resmi mengikuti MASTER COMMAND HeyAIPeople v4.0 (PROYEK/heyaipeople/MASTER_COMMAND_v4.md, dari Dika 17 Nov 2026).

| AI | Peran v4 | Boleh | Tidak boleh |
|---|---|---|---|
| GPT | Editorial Director & Lead Scriptwriter; lewat Cowork juga operator desain Canva | Strategi editorial, ide/angle/hook, naskah final 7 slide, caption/CTA/hashtag, arahan visual, editorial QC, eksekusi desain Canva lewat Cowork dan catat Canva Design ID | Mengarang data/hasil/testimoni/klien; klaim desain FINAL sebelum dicek |
| Gemini | Research & Information Intelligence | Riset tren, berita, tools AI, data dan referensi (topik, ringkasan, sumber asli, URL, tanggal terbit, tanggal cek, klaim terverifikasi, yang belum pasti) | Menetapkan naskah final; membuat desain Canva |
| Claude | Project Manager & AI Operations Coordinator; juga eksekutor teknis (kode, deploy, Remotion) | Dokumentasi papan, registry, pembagian tugas, status, Design QA, laporan progres, kunci aset, commit/push | Mengambil alih desain Canva GPT; mengubah naskah final GPT sepihak (revisi substansi dikoordinasikan ke GPT); mengubah ATURAN.md tanpa perintah Dika |
| Image/Video AI (Google Flow dll.) | Produksi aset | Ilustrasi, aset gambar, video generatif sesuai arahan | Mengubah identitas visual tanpa persetujuan |
| ElevenLabs | Suara | Voice-over dan narasi. Suara Rafiq dipakai sampai Part 10 BUILD WITH AI (keputusan Dika 17 Nov) | - |
| CapCut | Editing video | Editing, subtitle, motion, transisi, sinkron audio | - |

Cara GPT ke Canva: GPT mendesain di Canva lewat plugin Canva di ChatGPT (akun "Dikha's Canva account" sudah tersambung; dites 17 Nov 09.01: GPT membuka DAHbITwgs6A, judul dan 7 halaman benar). Work/Cowork tidak diperlukan. Kerja desain dilakukan di chat dalam Project ChatGPT "Kantor Ai People", bukan chat di luar Project.

Aturan Canva: SATU DESAIN SATU KONTEN (TERKUNCI, Dika 17 Nov 2026): kalau carousel gagal QA atau perlu revisi, edit langsung di desain Canva yang sama (Canva Design ID tetap). Dilarang membuat salinan/desain baru untuk revisi. Dari desain lama yang sudah terlanjur ganda, hanya hasil final yang dipakai; sisanya ARCHIVED.

GPT dan Gemini tidak pegang kunci aset; Claude yang mengubah aset (situs, bot, repo).

## Kenapa GPT dan Gemini tidak pegang kunci
Kerjaan mereka berupa bahan (riset, naskah, catatan QC), bukan perubahan aset. Yang mengubah aset hanya Claude, jadi tidak ada dua AI yang mengedit hal yang sama di waktu yang sama.

## Cara tugas dibagi
- Langkah di BAGAN.md yang ditandai `(GPT)` atau `(Gemini)` adalah jatah AI itu. Langkah tanpa tanda boleh diambil Claude.
- Kalau Dika menyuruh satu AI mengerjakan hal di luar perannya, ikuti Dika, lalu tulis di SETORAN bahwa itu di luar peran.

## Cek silang (wajib, berlaku mulai 17 Nov 2026)
Tidak ada AI yang mengecek hasilnya sendiri. Tiap SETORAN dan LAPORAN punya baris `Cek silang:` berisi `MENUNGGU <AI pengecek>`, `LULUS <AI> <tanggal>`, atau `GAGAL <AI> <alasan>`.

| Pembuat | Pengecek |
|---|---|
| GPT, naskah | Gemini (fakta dan sumber) |
| GPT lewat Cowork, desain Canva | Claude (Design QA pakai PROYEK/heyaipeople/QA_CHECKLIST.md) |
| Gemini, riset | GPT (relevansi editorial) |
| Claude, laporan/dokumentasi/kode | GPT (atau Gemini bila menyangkut fakta) |

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
