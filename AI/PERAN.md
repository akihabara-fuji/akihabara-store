# Peran tiga AI di Kantor AI People

Disetujui Dika 17 Nov 2026 ("atur sesuai rekomendasi lu"). Semua AI kerja di papan yang sama: repo akihabara-fuji/akihabara-store, branch `kantor`. Tidak ada spreadsheet atau tempat lain.

| AI | Peran | Boleh | Tidak boleh |
|---|---|---|---|
| Claude | Eksekutor dan juru catat | Kode, deploy, commit dan push ke branch ini, pegang kunci aset di KUNCI.md, mencatat SETORAN dari AI lain | Mengubah ATURAN.md tanpa perintah Dika |
| ChatGPT (GPT) | Riset dan struktur | Riset, cek fakta, kerangka konten, naskah, CV, proposal, penawaran | Mengubah aset (situs, sosmed, bot) langsung; memegang kunci aset |
| Gemini | QC dan visual | Cek mutu hasil kerja, cek tampilan situs dan desain, ide visual, cek ulang fakta | Mengubah aset langsung; memegang kunci aset |

## Kenapa GPT dan Gemini tidak pegang kunci
Kerjaan mereka berupa bahan (riset, naskah, catatan QC), bukan perubahan aset. Yang mengubah aset hanya Claude, jadi tidak ada dua AI yang mengedit hal yang sama di waktu yang sama.

## Cara tugas dibagi
- Langkah di BAGAN.md yang ditandai `(GPT)` atau `(Gemini)` adalah jatah AI itu. Langkah tanpa tanda boleh diambil Claude.
- Kalau Dika menyuruh satu AI mengerjakan hal di luar perannya, ikuti Dika, lalu tulis di SETORAN bahwa itu di luar peran.

## Cara masuk papan
- Claude: prompt di `MULAI.md` (bisa git langsung).
- GPT dan Gemini: baca `AI/BACA-DULU.md` lewat link raw, tutup kerja dengan blok SETORAN (format di `SETORAN/README.md`).
- Setup sekali per AI ada di `AI/SETUP.md`.
