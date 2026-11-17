# RINGKAS: isi artefak Kantor Ai People

Dibuat 2026-11-17 08:29 WIB oleh Claude akun-2 dari ekspor DB artefak (ARTEFAK/*.json, sumber asli: slug bf60001d-9bea-47c8-b8dc-5a1d139580b3). Jangan diedit di sini; perbarui lewat ekspor ulang.

## Jadwal posting (jadwal.json)

| Tanggal | Judul | Kanal | Bagan | Status | Catatan |
|---|---|---|---|---|---|
| Min 2026-11-15 | Rombak Gudang Prompt + catat angka awal | Web / Portofolio | - | selesai | 7 sistem disusun, angka pengikut awal dicatat dari Windsor. |
| Sen 2026-11-16 | Laporan mingguan pertama | Instagram, TikTok, Facebook | 01 | belum tayang | Sistem 01: hitung metrik 7 hari, pilih satu eksperimen. |
| Sel 2026-11-17 | Carousel: 7 cara AI untuk konten | Instagram | 02 | belum tayang | Sistem 02. Tayang setelah persetujuan. |
| Rab 2026-11-18 | Artikel blog 09.00 + buat kanal YouTube HeyAIPeople | Web / Portofolio, YouTube | 03, 14 | belum tayang | Sistem 03 dan 14. Video panjang pertama kanal AI menyusul setelah kanal jadi. |
| Kam 2026-11-19 | Portofolio: galeri dan tautan sosmed | Web / Portofolio | 07 | belum tayang | Sistem 07. |
| Jum 2026-11-20 | Artikel blog 09.00 + carousel UT | Web / Portofolio, Instagram | - | belum tayang | Akun catatanakademikut. |
| Sab 2026-11-21 | YouTube: video panjang pertama + Shorts | TikTok, YouTube, Instagram | 13, 04 | belum tayang | Sistem 13 dan 04. Satu naskah, dua ukuran, lalu ke TikTok dan Reels. |
| Min 2026-11-22 | Artikel blog 09.00 + evaluasi 7 hari | Web / Portofolio | 01 | belum tayang | Sistem 01 langkah terakhir. |

Catatan: kolom Bagan = nomor sistem di ide.json (sys-NN). Status dari field `done`.

## Prompt per kategori (prompts.json)

### Analisa sosmed (2)
- `p-analis-sosmed` · Analis Sosial Media: laporan mingguan
- `p-riset-topik` · Riset topik mingguan

### Blog (1)
- `p-artikel-blog` · Artikel blog UT (.md siap masuk draf)

### Caption (1)
- `p-caption-cta` · Caption + CTA ke heyaipeople.site

### Instagram carousel (1)
- `p-carousel-master` · AI Carousel Content Studio: SOP & Master Prompt Library v1.2

### Kampanye BUILD WITH AI (7)
- `p-bwai-aturan` · BUILD WITH AI · aturan kampanye, CTA, caption, checklist
- `p-bwai-ep01-05` · BUILD WITH AI · naskah Episode 001–005 (identitas dan sudut pandang)
- `p-bwai-ep01-status` · Episode 001 · status produksi dan paket posting
- `p-bwai-ep06-12` · BUILD WITH AI · naskah Episode 006–012 (tools dan workflow)
- `p-bwai-ep13-18` · BUILD WITH AI · naskah Episode 013–018 (produk dan proyek)
- `p-bwai-ep19-24` · BUILD WITH AI · naskah Episode 019–024 (cara kerja dan kredibilitas)
- `p-bwai-ep25-30` · BUILD WITH AI · naskah Episode 025–030 (eksperimen dan perjalanan)

### Koordinasi (1)
- `p-brief-hermes` · Brief kerja untuk Hermes

### Portofolio (1)
- `p-studi-kasus` · Studi kasus portofolio

### Prompt (1)
- `p-buat-prompt` · Pabrik prompt: bikin prompt baru

### SOP Carousel (13)
- `p-sop-00` · SOP 00 · Master Content Director
- `p-sop-01` · SOP 01 · Research Engine
- `p-sop-02` · SOP 02 · Fact Checker
- `p-sop-03` · SOP 03 · Content Strategist
- `p-sop-04` · SOP 04 · Hook Generator
- `p-sop-05` · SOP 05 · Carousel Copywriter
- `p-sop-06` · SOP 06 · Creative Director
- `p-sop-07` · SOP 07 · Puzzle Planner 1–2–3
- `p-sop-08` · SOP 08 · Grid Planner 3×3
- `p-sop-09` · SOP 09 · Canva Design Builder
- `p-sop-10` · SOP 10 · Quality Control
- `p-sop-11` · SOP 11 · Publishing Pack
- `p-sop-12` · SOP 12 · Performance Analyst

### Serah terima (2)
- `p-serah-terima` · Serah terima: aturan kerja, tujuan, memori, skill
- `p-serah-terima-ringkas` · Serah terima ringkas (tanpa detail server)

### Sosmed (1)
- `p-balas-komentar` · Balas komentar dan DM

### Video (2)
- `p-brief-remotion` · Brief video Remotion
- `p-skrip-video` · Skrip video pendek 25–45 detik

## 30 naskah resmi BUILD WITH AI (Part = Episode)

Sumber: prompt `p-bwai-ep01-05`, `p-bwai-ep06-12`, `p-bwai-ep13-18`, `p-bwai-ep19-24`, `p-bwai-ep25-30`; aturan di `p-bwai-aturan`. Status produksi dari PROYEK/video-remotion/HANDOFF.md.

| Part | Judul | Hook | Status produksi |
|---|---|---|---|
| 1 | Satu orang, banyak AI | Satu orang. Banyak AI. Bisa bikin apa? | selesai lama (versi sopan; keputusan versi menunggu Dika) |
| 2 | AI bukan tombol ajaib | AI nggak bisa menyelamatkan brief yang berantakan. | selesai lama |
| 3 | Satu tim AI, tugasnya beda-beda | Jangan suruh semua AI mengerjakan hal yang sama. | selesai (v3) |
| 4 | Claude Code bukan sekadar tempat bertanya | AI coding paling berguna saat dia bekerja di dalam proyek. | selesai (v3) |
| 5 | Prompt panjang belum tentu prompt bagus | Prompt 1.000 kata belum tentu lebih pintar. | v1 selesai, menunggu ACC Dika |
| 6 | ChatGPT: jangan cuma minta jawaban | Jangan cuma tanya ChatGPT. Minta dia menguji idemu. | v1 selesai, menunggu ACC Dika |
| 7 | Gemini dalam workflow | Satu tugas, coba uji di dua model. | belum dikerjakan |
| 8 | Dari ide ke video dengan Flow | Ide bagus belum jadi video sebelum punya visual. | belum dikerjakan |
| 9 | ElevenLabs untuk narasi | Suara AI bagus pun bisa bikin video gagal. | belum dikerjakan |
| 10 | Kenapa pakai Remotion? | Video berulang jangan diedit dari nol terus. | belum dikerjakan |
| 11 | Foto jadi karakter berbicara | Satu foto bisa punya banyak ekspresi. | belum dikerjakan |
| 12 | Otomatisasi dimulai dari masalah | Jangan otomatisasi proses yang belum lo pahami. | belum dikerjakan |
| 13 | Chatbot vs AI agent | Chatbot dan AI agent itu bukan hal yang sama. | belum dikerjakan |
| 14 | Social Analyzer | Followers banyak belum tentu kontennya efektif. | belum dikerjakan |
| 15 | Audit akun jangan asal menebak | Views rendah bukan otomatis salah algoritma. | belum dikerjakan |
| 16 | Website bukan cuma pajangan | Website portfolio harus membuktikan sesuatu. | belum dikerjakan |
| 17 | Katalog prompt dan storyboard | Prompt foto bagus perlu arahan visual yang jelas. | belum dikerjakan |
| 18 | Website dan sistem bukan hal yang sama | Tampilan website bagus belum tentu sistemnya siap. | belum dikerjakan |
| 19 | Error adalah bagian dari development | Bagian paling sering dari coding? Bukan ngetik. Debugging. | belum dikerjakan |
| 20 | Kenapa proyek perlu QA? | Bisa jalan sekali bukan berarti sudah siap. | belum dikerjakan |
| 21 | AI untuk pekerjaan operasional | AI paling berguna saat menyelesaikan masalah kerja nyata. | belum dikerjakan |
| 22 | Data berantakan, laporan ikut berantakan | Laporan lambat kadang masalahnya ada di input. | belum dikerjakan |
| 23 | Satu ide jadi banyak format | Satu ide bisa jadi empat konten berbeda. | belum dikerjakan |
| 24 | Kenapa subtitle harus sinkron? | Subtitle muncul terlalu cepat bisa merusak video. | belum dikerjakan |
| 25 | Jangan percaya semua jawaban AI | AI bisa terdengar yakin, tapi tetap salah. | belum dikerjakan |
| 26 | Uji model dengan cara yang adil | Mau tahu AI mana yang cocok? Jangan cuma lihat benchmark. | belum dikerjakan |
| 27 | Laptop terbatas, workflow harus realistis | Nggak semua workflow AI butuh PC mahal. | belum dikerjakan |
| 28 | Build in public bukan pamer hasil | Build in public bukan berarti semua harus terlihat sukses. | belum dikerjakan |
| 29 | Dari ide ke sistem | Ide aplikasi itu murah. Sistem yang jalan itu tantangannya. | belum dikerjakan |
| 30 | 30 hari membangun dengan AI | 30 hari pakai AI belum tentu bikin lo jago. | belum dikerjakan |

## Aset (aset.json)

- `a1-catatanakademik` · catatanakademik.com · https://catatanakademik.com
- `a2-blog` · Blog catatanakademik.com · https://catatanakademik.com/blog
- `a3-heyaipeople` · heyaipeople.site · https://heyaipeople.site
- `a3b-blog-heyai` · Blog heyaipeople.site · https://heyaipeople.site (bagian blog)
- `a4-portofolio` · Portofolio · https://dikapriyadi.catatanakademik.com
- `a5-sosmed` · Akun sosmed · Instagram, TikTok, Facebook, YouTube
- `a6-gudang` · Kantor Ai People · Artefak ini

## Bagan (ide.json)

- `i-carousel-heyai` · Konten berjalan · 7 cara menggunakan AI untuk membuat konten profesional (5 langkah, 0 selesai)
- `sys-00-kebutuhan` · 00 · Kebutuhan eksekusi dari Dika (11 langkah, 0 selesai)
- `sys-01-analisa` · 01 · Analisa sosial media (9 langkah, 2 selesai)
- `sys-02-carousel` · 02 · Produksi carousel Instagram (8 langkah, 0 selesai)
- `sys-03-blog` · 03 · Artikel blog Catatan Akademik (7 langkah, 0 selesai)
- `sys-04-video` · 04 · Video pendek (Remotion) (7 langkah, 0 selesai)
- `sys-05-jalur` · 05 · Jalur pembeli ke heyaipeople.site (8 langkah, 0 selesai)
- `sys-06-web` · 06 · Web dan deploy (7 langkah, 1 selesai)
- `sys-07-porto` · 07 · Portofolio dan personal branding (5 langkah, 0 selesai)
- `sys-08-bot` · 08 · Otomasi AI: bot WhatsApp (7 langkah, 0 selesai)
- `sys-09-koordinasi` · 09 · Koordinasi alur kerja AI (7 langkah, 0 selesai)
- `sys-10-dokumen` · 10 · Alat analisis dokumen (8 langkah, 0 selesai)
- `sys-11-gambar-suara` · 11 · Gambar dan suara AI (6 langkah, 0 selesai)
- `sys-12-prompt` · 12 · Pabrik prompt (7 langkah, 0 selesai)
- `sys-13-youtube` · 13 · YouTube Catatan Akademik (Remotion) (9 langkah, 0 selesai)
- `sys-14-youtube-heyai` · 14 · YouTube HeyAIPeople (Remotion) (10 langkah, 0 selesai)
- `sys-15-blog-heyai` · 15 · Artikel blog HeyAIPeople (9 langkah, 0 selesai)
