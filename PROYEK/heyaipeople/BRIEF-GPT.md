# BRIEF GPT: tujuan, aturan, dan cara kerja heyaipeople (audit Claude, 17 Nov 2026 10.20)
Baca ini SEBELUM tiap tugas. Ringkas, urut dari tujuan sampai larangan. Sumber lengkap: MASTER_COMMAND_v4.md, HANDOFF.md, QA_CHECKLIST.md.

## 1. Tujuan Dika
Akun Instagram HeyAIPeople tampil premium dan konsisten: grid profil terbaca sebagai satu panorama puzzle, tiap carousel 7 slide berisi dan jujur, tanpa auto-publish. Hasil harus sesuai keinginan Dika, bukan sekadar "terkirim".

## 2. SOP COVER DULU, ISI BELAKANGAN (berlaku untuk SEMUA konten, TERKUNCI Dika 17 Nov 10.09 dan 10.11)
COVER DULU berlaku untuk SEMUA konten (carousel tunggal, seri, puzzle, apa pun), bukan hanya Puzzle (Dika 17 Nov 2026 10.11, TERKUNCI): konsep cover, presentasi ke Dika, ACC cover, baru isi. Puzzle hanya tambahan: cover berupa satu panorama utuh dibagi N panel.
Urutan di bawah memakai contoh Puzzle 3; untuk konten non-puzzle, langkah 3 cukup satu cover tunggal.
1. Dika beri topik/tema (dan jumlah puzzle kalau puzzle).
2. GPT buat konsep visual cover (foto/ilustrasi, komposisi, warna, tipografi, hubungan ketiga cover).
3. GPT buat SATU panorama utuh yang dibagi tiga panel (bukan tiga foto terpisah). Seri 01: monochrome, grid P03 | P02 | P01.
4. GPT presentasikan cover ke Dika. Dika ACC atau revisi. Isi carousel JANGAN disentuh sebelum ACC.
5. Setelah ACC: isi lengkap 7 slide (Cover, Hook, Problem, Pembahasan, Contoh, Insight, CTA).
6. Desain di Canva (desain yang sama, ID tetap) lalu Design QA Claude, lalu ACC publikasi Dika.
Cover harus mencerminkan isi konten; visual keren tapi tidak relevan = gagal.

## 3. Pembagian peran
GPT: arah editorial, naskah, desain Canva (plugin Canva, bukan Claude). Gemini: riset dan cek fakta/sumber. Claude: koordinasi, Design QA, dokumentasi. Dika: ACC.

## 4. Kenapa GPT sering meleset (temuan audit) dan perbaikannya
| Temuan | Perbaikan wajib |
|---|---|
| GPT tidak bisa melihat gambar thumbnail Canva, jadi berhenti atau mengira | Buat panorama sebagai gambar utuh lewat pembuat gambar ChatGPT, unggah ke Canva, bagi tiga. Minta Claude inspeksi tertulis (lihat QA-COVER-S01-0940.md) untuk hasil di Canva |
| Setoran berisi niat ("akan dikerjakan") dibaca seolah progres | Setoran JALAN boleh, tapi tulis jelas Hasil = yang SUDAH tersimpan (Canva ID + jumlah halaman) dan Belum dicek = sisanya |
| Cover lama = tiga foto terpisah, aksen kuning/biru/ungu, bukan panorama | Ganti pendekatan: panorama utuh monochrome. Cover lama dibuang di desain yang sama |
| Aturan tersebar di banyak file, bentrok (brand lama boleh aksen, seri 01 tidak) | Pegang urutan prioritas: perintah terbaru Dika > BRIEF-GPT.md > HANDOFF.md > MASTER_BRAND_GUIDELINES.md |
| Naskah lengkap seri 01 belum pernah disetor, teks hanya di Canva | Setor teks 7 slide per post di SETORAN setelah cover ACC, Gemini cek fakta |
| Minta "GAS" ke Dika untuk hal yang sudah jelas | Tanya Dika hanya untuk ACC cover dan ACC publikasi |

## 5. Larangan
Desain/salinan baru untuk revisi. Aksen warna di seri 01. Isi carousel sebelum cover ACC. Menulis "selesai" sebelum tersimpan dan dicek. Publikasi tanpa ACC. Ejaan selain "HeyAIPeople".

## 6. Urutan posting
Wajib P01, P02, P03 supaya grid IG terbaca P03 | P02 | P01.
