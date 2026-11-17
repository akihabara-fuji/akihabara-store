# PAKET PAPAN KANTOR AI PEOPLE

Salinan otomatis branch kantor (2026-11-17 07:21 WIB). Jangan diedit di sini: sumbernya GitHub akihabara-fuji/akihabara-store branch kantor.
Isi: STATUS.md, AI/BACA-DULU.md, AI/PERAN.md, ATURAN.md, KUNCI.md, BAGAN.md, SETORAN/README.md, PROYEK/README.md, lalu HANDOFF tiap proyek.


========== FILE: STATUS.md ==========

# STATUS papan kantor

Dibuat otomatis oleh `alat/cek_papan.py` (2026-11-17 07:21 WIB). Jangan diedit manual: perbaiki file sumbernya, status ini ikut berubah.
Semua AI baca file ini dulu untuk tahu apa yang menunggu dicek.

## Rahasia bocor (harus segera dihapus)
- tidak ada

## Format rusak
- tidak ada

## Menunggu cek silang
- `LAPORAN/2026-11-17-0700-claude.md`: MENUNGGU Gemini

## Gagal cek silang (perlu diperbaiki pembuatnya)
- tidak ada

## Lulus cek silang (terbaru)
- `LAPORAN/2026-11-17-0555-claude.md`: LULUS GPT 2026-11-17 06:41 (dicek di Project ChatGPT "Kantor Ai People"; catatan: kurir n8n belum dibangun)

## Kunci aset yang sedang dipegang
- semua bebas

## Laporan terbaru
- `LAPORAN/2026-11-17-0700-claude.md`
- `LAPORAN/2026-11-17-0555-claude.md`
- `LAPORAN/2026-11-16-2252-remotion.md`
- `LAPORAN/2026-11-16-1938-kantor-ai.md`
- `LAPORAN/2026-11-16-1928-claude.md`

## Setoran terbaru
- tidak ada


========== FILE: AI/BACA-DULU.md ==========

# Baca dulu: untuk AI yang tidak bisa git (ChatGPT, Gemini, dan lainnya)

Kamu bekerja untuk Dika Priyadi di "Kantor AI People". Semua catatan kerja ada di repo publik GitHub akihabara-fuji/akihabara-store, branch `kantor`. Jangan minta Dika menjelaskan ulang: semuanya ada di file berikut.

## 1. Baca file ini dulu (urut)
0. Status papan (yang menunggu dicek, kunci, rahasia bocor): https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/STATUS.md
   Kalau ada yang "Menunggu cek silang" atas namamu, kerjakan cek itu dulu (cara di AI/PERAN.md).
1. Aturan: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/ATURAN.md
2. Peran tiap AI: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/AI/PERAN.md
3. Bagan dan status langkah: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/BAGAN.md
4. Kunci aset (siapa memegang apa): https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/KUNCI.md
5. Serah terima proyek yang dikerjakan: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/PROYEK/<nama-proyek>/HANDOFF.md
   Daftar nama proyek: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/PROYEK/README.md
6. Format setoran: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/SETORAN/README.md

Kalau satu link tidak bisa kamu buka, bilang ke Dika file mana, dan minta dia menempelkan isinya. Jangan menebak isinya.

## 2. Aturan kerja singkat
- Kerjakan sesuai peranmu di AI/PERAN.md. Kamu tidak mengubah situs, sosmed, atau bot secara langsung.
- Jangan mengarang angka, sumber, testimoni, jadwal, atau harga. Yang belum dicek ditulis "belum dicek", yang tidak ada ditulis "belum ada".
- Jangan tulis kata sandi, token, kunci API, nomor rekening, atau data pribadi klien. Repo ini publik.
- Ngobrol dengan Dika: Indonesia santai (gw/lo), pendek, inti dulu.

## 3. Tutup kerja dengan SETORAN
Setiap selesai satu pekerjaan, atau kalau kuota hampir habis, tulis satu blok SETORAN sesuai format di SETORAN/README.md. Dika akan meneruskan blok itu ke Claude, dan Claude yang mencatatnya ke GitHub.


========== FILE: AI/PERAN.md ==========

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


========== FILE: ATURAN.md ==========

# Aturan kerja (sumber: prompt serah terima 16 Nov 2026)

Diubah hanya atas perintah Dika. Status teknis di bawah adalah catatan 15 Nov 2026: cek ulang sebelum bertindak.

## Siapa dan untuk apa
Kamu bekerja untuk Dika Priyadi (Jakarta Barat). Dika memakai tiga AI bergantian: Claude, ChatGPT, dan Gemini, ditambah Hermes untuk pekerjaan rutin. Akun bisa berganti kapan saja karena kuota habis, jadi semua yang kamu perlu tahu ada di prompt ini. Jangan mengandalkan ingatan percakapan lain.

## Tujuan akhir
Semua kanal tumbuh bersama: pengikut naik di tiap akun, pengunjung mengalir ke heyaipeople.site, pesanan masuk lewat WhatsApp admin. Tiap pekerjaan harus menggerakkan salah satu dari tiga angka itu.
Urutan kerja: konten → profil → catatanakademik.com → heyaipeople.site → WhatsApp → pesanan → testimoni → konten lagi.

## Aturan kerja
1. Sumber tunggal adalah artefak "Kantor Ai People" (dulu bernama Gudang Prompt): https://claude.ai/artifact/QdeNyYegbV25h6EfVy47Zc. Lihat kunci aset sebelum mengubah apa pun. Aset yang dipegang sesi lain tidak disentuh.
2. Kerjakan langsung sesuai rekomendasi terbaikmu. Bertanya hanya bila tindakannya tidak bisa dibatalkan, menyangkut uang atau kata sandi, atau faktanya tidak bisa dicari sendiri.
3. Deploy web dibebaskan, tetapi hasil wajib kamu cek sendiri di tampilan nyata sebelum melapor. Yang belum dicek disebut belum dicek.
4. Jangan mengarang angka, testimoni, sumber, jadwal, atau harga. Yang tidak ada ditulis "belum ada".
5. Posting ke media sosial menunggu persetujuan Dika sampai dia mengubah aturannya.
6. catatanakademik.com adalah media edukasi mahasiswa UT yang independen, bukan kanal resmi Universitas Terbuka. Tombol layanan mengarah ke heyaipeople.site, dipasang setelah produk dan harganya ada.
7. Bot WhatsApp yang sudah jalan di VPS tidak disentuh tanpa cadangan.
8. Kata sandi, kunci API, dan nomor rekening tidak pernah ditulis di chat, di artefak, atau di repo. Login dilakukan Dika sendiri.
9. Proyek lama di luar tiga situs sekarang tidak dibahas dan tidak dipakai.

10. Papan kerja bersama: repo akihabara-fuji/akihabara-store, branch `kantor`. Tarik branch kantor sebelum kerja. Sesudah kerja tulis laporan di LAPORAN/, perbarui BAGAN.md, KUNCI.md, dan PROYEK/<folder>/HANDOFF.md. Tidak ada folder, branch, atau file serah terima lain.

## Gaya
- Chat dengan Dika: Indonesia santai (gw/lo), pendek, inti dulu, tanpa rekap.
- Teks di situs, portofolio, CV, LinkedIn: bahasa baku, kata ganti "saya".
- Halaman web simpel tanpa gulir panjang. Teks panjang memakai "Baca lengkap".

## Pembagian peran
Dika memutuskan. AI yang memimpin sesi bertindak sebagai CEO: membagi kerja, memeriksa hasil, melapor. Meja spesialis: Analis, Sosmed, Penulis, Blogger, Web, Prompt, Otomasi. Pekerja: Hermes (rutin, lewat 9Router), GPT (cek fakta), Canva (desain), Remotion (video), Admin (pelanggan).

## Status teknis (catatan 15 Nov 2026, cek ulang sebelum bertindak)
- Repo: akihabara-fuji/akihabara-store. Branch: portofolio-dika (folder portofolio/), heyaipeople (folder heyaipeople/). Deploy lewat Web console hPanel VPS 2040957, skrip deploy/update-portofolio.sh dan deploy/update-heyaipeople.sh dengan argumen commit. Sukses bila ada baris "OK, commit ... live". Setelah itu cek situs hidup.
- hPanel harus login ke akun Hostinger yang benar (2FA oleh Dika). Terminal web sering membeku: tutup tab, buka ulang dari hPanel.
- Live: portofolio 6f84501, heyaipeople f91310f. Tautan sosial terpasang: Instagram priyadi_dika, YouTube Catatan Akademik, TikTok akihabara.fuzi.
- heyaipeople.site masih berbanner DRAFT dengan harga contoh. Jangan dicopot sebelum Dika memberi produk dan harga asli.
- catatanakademik.com jalan dari /var/www/mahyra-serv (port 3200, pm2 "nextaja"), kode di blog-akun.js dan admin-ca/, acuan live d3321cb, ada 143 berkas berubah yang tidak ada di GitHub. Berkas kunci dikunci chattr +i lewat /root/ca-lock.sh. JANGAN buka kunci tanpa izin Dika. Cadangan penuh: /root/mahyra-serv-backup-20261115-1338.tgz.
- Kantor Ai People per 16 Nov 2026: nama baru, warna berkilau, tiap kartu ide berwarna unik, bagan bergaya n8n (kabel berarah, simpul 3D), Kantor 3D malam. Artefak berstatus publik lewat tautan.
- Menunggu Dika: produk dan harga heyaipeople, izin membuka kunci kode Catatan Akademik.

## Angka awal pengikut (15 Nov 2026)
IG priyadi_dika 2.138 · IG catatanakademikut 209 · TikTok Akihabara Fuji 435 · FB Catatan Akademik 1 · YouTube Catatan Akademik 14 subscriber

## Skill dan memori
Skill dan memori hanya tersimpan di akun Claude utama. Di akun atau AI lain, pegang ringkasan ini:
- Akademik UT: diskusi Tuton, tugas tutorial, proposal metopen, parafrase, revisi dari laporan DrillBit. Dokumen akademik dikirim sebagai Word.
- Konten: artikel blog masuk draf dulu, sampul bergaya estetik tanpa wajah, carousel mengikuti SOP di menu Prompt.
- Video: Remotion, vertikal dan mendatar dari satu naskah, hemat render.
- Web: rencana, bangun, uji, deploy lewat Web console hPanel, cek situs hidup.
- Tampilan: hindari ciri tampilan buatan AI yang generik.
Kalau butuh aturan lengkap sebuah skill atau isi sebuah prompt, minta Dika menempelkannya.


========== FILE: KUNCI.md ==========

# Aset dan kunci

Format: aset | sumber | deploy | STATUS (bebas / DIPEGANG <nama sesi> · <tugas> · sejak <waktu>) | terakhir
Ambil kunci = commit + push sebelum kerja. Lepas kunci = isi 'terakhir', status jadi bebas.

- catatanakademik.com | sumber: akihabara-store · feat/koin (belum dicocokkan dengan server) | deploy: deploy/update-koin.sh, ada cek otomatis dan rollback | bebas | terakhir: 12 Nov, commit fcba462 | memegang pembayaran dan koin, menu atas tidak diubah
- Blog catatanakademik.com | unggah .md lewat menu blog, masuk draf | bebas | terbit 09.00 WIB tiap 2 hari setelah dicek satu per satu
- heyaipeople.site | branch heyaipeople | deploy/update-heyaipeople.sh | bebas | terakhir: 15 Nov 15.47, commit eb002ef (homepage jadi marketplace prompt foto AI + storyboard video) | cek commit terbaru dulu sebelum mengubah
- Blog heyaipeople.site | masih kosong, cara terbit belum dicatat | bebas
- Portofolio dikapriyadi.catatanakademik.com | branch portofolio-dika | sistem baru 16 Nov (CMS planet 3D): deploy/update-portofolio-cms.sh <commit>, update-portofolio.sh lama jangan dipakai; rincian di PROYEK/portofolio/HANDOFF.md | bebas | terakhir: 14 Nov 2026, commit c83dab1 (menurut data artefak; prompt Serah terima menyebut live 6f84501, belum dicek mana yang benar) | kunci lama "Claude (sesi 15 Nov sore)" untuk tugas tautan sosmed di kontak dilepas 16 Nov 18.38 atas izin Dika; tugas itu belum dicek selesai atau belum, cek situs hidup dulu. Di data artefak kunci ini juga sudah dilepas (16 Nov 19.28)
- Akun sosmed | posting hanya setelah persetujuan Dika | tersambung: IG priyadi_dika dan catatanakademikut, TikTok Akihabara Fuji, FB Catatan Akademik, YouTube Catatan Akademik | belum tersambung: IG heyaipeople, 2 akun TikTok, 1 halaman Facebook | belum ada: kanal YouTube HeyAIPeople
- Kantor Ai People (artefak) | perubahan halaman langsung terbit | data prompt, bagan, jadwal, aset ada di database artefak. Dicocokkan 16 Nov 18.38: BAGAN.md dan KUNCI.md sama dengan data artefak. Artefak sempat publik (database tidak bisa ditulis AI); per 16 Nov 19.28 berstatus privat, jadi database bisa ditulis sesi AI | bebas | terakhir: 16 Nov 2026 19.38, Claude akun-2 · Claude, data aset artefak diselaraskan dengan repo, aturan 10 prompt Serah terima memuat HANDOFF/PROYEK, folder PROYEK/kantor-ai ditulis (aturan 10) dan Serah terima ringkas (aturan 9), kunci portofolio dilepas di data artefak (artefak sendiri terakhir 15 Nov 2026: nama akun SOP diperbaiki, SOP Carousel jadi Prompt 00–12, prompt serah terima ringkas)
- Remotion (repo kang-catat-plus, seri BUILD WITH AI) | sumber: zip backup di D:\FOLDER VIDEO KONTEN\BUILD-WITH-AI\SERAH-TERIMA (tidak ada di GitHub); sandbox sementara | render lokal/sandbox, hasil ke D:\...\Part-XX | bebas | terakhir: 16 Nov 2026 22.52, Claude akun-2 · Remotion, Part 5 dan 6 selesai menunggu ACC | rincian di PROYEK/video-remotion/HANDOFF.md


========== FILE: BAGAN.md ==========

# Bagan dan status langkah

Disalin dari prompt serah terima 16 Nov 2026. Tiap sesi memperbarui tanda langkah yang dia kerjakan.

Dicocokkan dengan database artefak Kantor Ai People pada 16 Nov 2026 18.38: tidak ada beda status langkah. Catatan: di artefak, brief langkah 07 "Perbarui portofolio" masih menulis galeri dan tombol WhatsApp belum jalan; data aset artefak (15 Nov) dan BAGAN ini menyebut keduanya sudah berfungsi, jadi yang dipakai di sini.

Tanda: [S] selesai, [J] jalan, [B] belum. Dalam kurung: pemegang langkah.

00 · Kebutuhan eksekusi dari Dika (0/11; hal yang hanya bisa dilakukan pemilik akun)
[B] Izinkan konektor Windsor dan Supermetrics di artefak · [B] Login hPanel di browser Claude (catatan: sudah login per 15 Nov, tinggal ditandai) · [B] Laptop nyala, aplikasi Claude terbuka · [B] Tentukan produk dan harga heyaipeople.site · [B] Pastikan nama akun (IG sudah dipastikan priyadi_dika) · [B] Sambungkan akun yang belum · [B] Buat kanal YouTube HeyAIPeople · [B] Aturan persetujuan posting · [B] Bahan portofolio · [B] Suara untuk video · [B] Simpan kartu skill dan hapus skill usang

01 · Analisa sosial media (2/9; putaran mingguan tiap Senin)
[S] Tentukan tujuan dan akun (Dika) · [S] Tarik data (Claude) · [J] Cek kualitas data (Claude) · [B] Hitung metrik per akun · [B] Bandingkan konten sendiri · [B] Tulis laporan mingguan, tiga temuan bernomor · [B] Pilih satu eksperimen (Dika) · [B] Masukkan ke jadwal · [B] Evaluasi 7 hari

02 · Produksi carousel Instagram (0/8; riset dulu, desain belakangan)
[B] Riset masalah audiens (Claude) · [B] Cek fakta (GPT) · [B] Hook dan naskah slide · [B] Desain di Canva 1080 × 1350 · [B] Cek mutu · [B] Caption dan CTA ke heyaipeople.site · [B] Persetujuan (Dika) · [B] Terbit dan catat tautan

03 · Artikel blog Catatan Akademik (0/7; satu artikel tiap 2 hari, 09.00 WIB, masuk draf dulu)
[B] Daftar judul per minggu (Claude) · [B] Tulis file .md, fakta UT hanya dari sumber resmi (Hermes) · [B] Unggah ke draf blog (Dika) · [B] Cek satu per satu (Dika) · [B] Sampul estetik faceless · [B] Terbit 09.00 WIB · [B] Turunkan jadi carousel (Canva)

04 · Video pendek Remotion (0/7; turunan artikel atau carousel)
[B] Pilih topik · [B] Skrip 30–45 detik, hook 3 detik pertama · [B] Rekam suara (Dika) · [B] Susun dan render 1080 × 1920 (Remotion) · [B] Cek hasil · [B] Terbit ke TikTok, Reels, Shorts (Dika) · [B] Catat penayangan 7 hari

05 · Jalur pembeli ke heyaipeople.site (0/8, 3 jalan)
[B] Konten sosmed, satu ajakan per konten · [B] Profil dan tautan bio (Dika) · [B] catatanakademik.com: tombol layanan ke heyaipeople.site · [B] heyaipeople.site: daftar produk, harga, cara pesan · [J] WhatsApp admin · [J] Pembayaran QRIS · [J] Kirim hasil · [B] Testimoni jadi konten (Admin)

06 · Web dan deploy (1/7; berlaku untuk tiga situs, ambil kunci aset dulu)
[S] Catat kondisi awal · [J] Rencana perubahan · [B] Bangun · [B] Cek tampilan sendiri, ponsel dan desktop · [B] Deploy, cadangkan dulu · [B] Cek situs hidup · [B] Catat perubahan

07 · Portofolio dan personal branding (0/5)
[B] Kumpulkan karya minggu ini (Dika) · [B] Tulis studi kasus, hanya angka berbukti · [B] Perbarui portofolio (yang kurang: tautan sosmed) · [B] Posting LinkedIn dan Instagram (Dika) · [B] Selaraskan CV (Dika)

08 · Otomasi AI: bot WhatsApp (0/7; dua bot di VPS)
[B] Catat kebutuhan (Dika) · [B] Rancang alur percakapan · [B] Tulis prompt bot · [B] Cadangkan bot yang jalan · [B] Pasang lewat 9Router · [B] Uji 10 percakapan (Dika) · [B] Pantau dan catat (Admin)

09 · Koordinasi alur kerja AI (0/7)
[B] Tugas masuk (Dika) · [B] Cek artefak dan kunci · [B] Pecah jadi langkah · [B] Brief ke Hermes · [B] Hermes mengerjakan · [B] Periksa hasil · [B] Serahkan dan lepas kunci

10 · Alat analisis dokumen (0/8, semua jalan; Bedah Laporan dan Cek & Parafrase di catatanakademik.com)
[J] Mahasiswa masuk akun · [J] Unggah 3 file · [J] Baca dan tandai kalimat · [J] Pratinjau gratis · [J] Bayar QRIS · [J] Pengerjaan di Studio admin · [J] Kirim file Word · [J] Arsip 30 hari

11 · Gambar dan suara AI (0/6; Gemini, Google Flow, ElevenLabs, CapCut, Canva)
[B] Brief visual atau suara (Dika) · [B] Tulis prompt · [B] Buat sekali (Dika) · [B] Pilih dan periksa · [B] Rapikan (Canva) · [B] Simpan dengan nama baku AKUN_KAMPANYE_POST-SLIDE_VERSI

12 · Pabrik prompt (0/7; prompt yang dipakai lebih dari sekali wajib masuk menu Prompt)
[B] Tulis kebutuhan (Dika) · [B] Cari yang sudah ada dulu · [B] Susun prompt · [B] Uji 3 kali · [B] Perbaiki · [B] Simpan di menu Prompt · [B] Tautkan ke bagan

13 · YouTube Catatan Akademik, Remotion (0/9; 1 video panjang Sabtu + Shorts Senin dan Rabu)
[B] Pilih topik mingguan · [B] Naskah dan papan cerita · [B] Suara (Dika) · [B] Susun di Remotion, 1920 × 1080 dan 1080 × 1920 dari satu data · [B] Thumbnail (Canva) · [B] Judul, deskripsi, bab · [B] Persetujuan dan unggah terjadwal (Dika) · [B] Sebar ulang ke TikTok dan Reels · [B] Evaluasi 7 hari

14 · YouTube HeyAIPeople, Remotion (0/10; kanal belum ada; 1 video panjang Rabu + Shorts Selasa dan Jumat)
[B] Buat kanal (Dika) · [B] Pilih topik mingguan · [B] Naskah dan papan cerita · [B] Suara (Dika) · [B] Susun di Remotion · [B] Thumbnail (Canva) · [B] Judul, deskripsi, bab · [B] Persetujuan dan unggah terjadwal (Dika) · [B] Sebar ulang · [B] Evaluasi 7 hari

15 · Artikel blog HeyAIPeople (0/9; blog masih kosong)
[B] Cek cara terbit di situs · [B] Daftar judul per minggu · [B] Riset ke sumber resmi alat · [B] Tulis artikel (Hermes) · [B] Cek fakta (GPT) · [B] Cek satu per satu (Dika) · [B] Sampul (Canva) · [B] Terbit, selang-seling dengan blog Catatan Akademik · [B] Turunkan jadi carousel dan Shorts

Konten berjalan · "7 cara menggunakan AI untuk membuat konten profesional" (0/5; akun heyaipeople, carousel Puzzle 1–2–3 lalu video Remotion)
[B] Riset (Claude) · [B] Konfirmasi riset (Dika) · [B] Cek fakta (GPT) · [B] Carousel di Canva, 3 posting + panorama · [B] Versi video Remotion


========== FILE: SETORAN/README.md ==========

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


========== FILE: PROYEK/README.md ==========

# Proyek

Satu folder per proyek, **namanya tetap, pakai daftar ini** (jangan bikin nama lain, jangan bikin folder atau branch handoff di tempat lain):

| Folder | Isi |
|---|---|
| `catatanakademik` | catatanakademik.com: web, admin, koin, blog, Cek & Parafrase, Bedah Laporan |
| `heyaipeople` | heyaipeople.site: web, produk, blog |
| `portofolio` | dikapriyadi.catatanakademik.com, CV, profil kerja, lamaran |
| `konten-sosmed` | analisa sosmed, carousel IG, jadwal posting, akun sosmed |
| `video-remotion` | Remotion, YouTube, video otomatis, maskot |
| `bot-wa` | bot WhatsApp di VPS |
| `akademik-ut` | tugas tutorial, diskusi, metopen, parafrase dan revisi DrillBit untuk klien |
| `hermes-9router` | Hermes dan 9Router di laptop |
| `kantor-ai` | artefak Kantor Ai People dan papan kerja ini |

Proyek baru yang tidak masuk daftar: tanya Dika dulu, lalu tambahkan barisnya di tabel ini.

**Satu sumber saja.** HANDOFF hanya ada di `PROYEK/<folder>/HANDOFF.md` di branch `kantor`. HANDOFF, catatan serah terima, atau README sesi di branch situs dan di laptop tidak dipakai lagi: isinya dipindah ke sini, file lamanya diganti penunjuk ke sini.

Tiap folder berisi:

- `HANDOFF.md`: semua yang perlu diketahui sesi berikutnya. Tujuan, status sekarang, keputusan yang sudah di-ACC Dika (terkunci), aturan khusus proyek, file/repo/branch/link penting, cara deploy atau cara kerja, langkah berikutnya, yang ditunggu dari Dika. Ditulis supaya Claude baru yang belum pernah lihat chat-nya bisa langsung lanjut.
- `LOG.md`: catatan singkat per sesi, terbaru di atas. Satu sesi = tanggal, nama sesi, apa yang berubah, commit atau link.

Aturan:
- HANDOFF.md selalu diperbarui di akhir sesi, bukan ditambah terus. Yang sudah basi dihapus.
- File besar (video, gambar, Word) tidak masuk sini. Tulis lokasinya saja (folder laptop D:, Drive, artefak).
- Tidak ada kata sandi, token, kunci API, atau nomor rekening.


========== FILE: PROYEK/kantor-ai/HANDOFF.md ==========

# HANDOFF kantor-ai: artefak Kantor Ai People dan papan kerja GitHub

Terakhir diperbarui: 17 Nov 2026 07.00, Claude akun-1. Baca ini dulu, jangan tanya ulang ke Dika.

## Tujuan
Semua pekerjaan Dika (3 situs, sosmed, video, bot, akademik UT) terpantau di dua tempat yang selaras:
- Tampilan untuk Dika: artefak "Kantor Ai People" (dulu Gudang Prompt).
- Catatan bersama yang bisa dibaca semua akun Claude dan AI lain: repo akihabara-fuji/akihabara-store, branch `kantor`.
Tujuan akhir semua kerja: pengikut naik, pengunjung ke heyaipeople.site, pesanan lewat WhatsApp admin (rincian di ATURAN.md).

## Status sekarang (16 Nov 2026)
- Artefak: https://claude.ai/artifact/QdeNyYegbV25h6EfVy47Zc (slug untuk tool artefak: bf60001d-9bea-47c8-b8dc-5a1d139580b3). Berstatus PRIVAT sejak Dika mengubahnya 16 Nov sore; saat publik, tool AI menolak menulis database.
- Database artefak punya 4 koleksi: `aset` (kunci aset, 7 dokumen), `ide` (bagan 00–15 dan konten berjalan, 17 dokumen), `jadwal` (8 entri 15–22 Nov), `prompts` (prompt, termasuk dua varian Serah terima).
- BAGAN.md dan KUNCI.md dicocokkan dengan artefak 16 Nov 18.38: status 16 bagan sama persis. Satu beda: brief langkah bagan 07 "Perbarui portofolio" di artefak masih menulis galeri dan tombol WhatsApp belum jalan, padahal data aset 15 Nov bilang sudah berfungsi (BAGAN.md memakai yang kedua).
- Aturan GitHub sudah ada di prompt: Serah terima (aturan 10) dan Serah terima ringkas (aturan 9). Tombol "prompt mulai per bagan" di halaman artefak membaca teks dari prompt Serah terima (p-serah-terima).
- Kunci portofolio "Claude (sesi 15 Nov sore)" dilepas atas izin Dika 16 Nov, di KUNCI.md dan di data artefak.
- Konektor Windsor dan Supermetrics di artefak belum disetujui Dika (bagan 00 langkah 1), jadi kolom "Sekarang" di halaman kosong.

## Tiga AI satu papan (17 Nov 2026)
- Claude = eksekutor dan juru catat; GPT = riset dan struktur; Gemini = QC dan visual. Rincian di AI/PERAN.md.
- GPT dan Gemini masuk lewat AI/BACA-DULU.md (link raw, repo publik), tidak pegang kunci aset, menutup kerja dengan blok SETORAN.
- Dika menempel SETORAN ke Claude mana pun dengan kata "catat setoran"; Claude ikuti langkah di SETORAN/README.md.
- Setup ChatGPT (Project) dan Gemini (Gem) di akun dikha.priyadhi SUDAH dan sudah dites (rincian dan link di AI/SETUP.md bagian Status setup). Gem tidak bisa buka link: diberi Google Doc yang disalin dari PAKET-AI.md tiap jam oleh Apps Script.
- Cek silang dan pemeriksa otomatis jalan: alat/cek_papan.py lewat GitHub Actions menulis STATUS.md dan PAKET-AI.md tiap push.
- Tahap 2 (belum dibangun): kurir n8n Telegram ke GitHub. Draf lama workflow order klien (4 jalur, ACC Dika) ada di PROYEK/kantor-ai/n8n/ dan DITUNDA: Dika bilang belum masuk ke klien.

## Keputusan TERKUNCI (dari Dika)
- TERKUNCI (17 Nov): ketiga AI bekerja di branch `kantor` yang sama dengan peran di AI/PERAN.md; aturan berubah cukup di GitHub, tidak setel ulang tiap AI.
- TERKUNCI: sumber tunggal catatan serah terima = PROYEK/<folder>/HANDOFF.md di branch kantor. Tidak ada folder, branch, atau file serah terima di tempat lain.
- TERKUNCI: tiap sesi ikut alur README.md (tarik dulu, ambil kunci dan push sebelum ubah aset, lepas kunci dan push laporan sesudahnya).
- TERKUNCI: laporan ke Dika berformat SELESAI / BELUM / STATUS LANGKAH / PERUBAHAN ASET / BUTUH DARI DIKA, dan file yang sama di-push ke LAPORAN/.
- TERKUNCI: artefak tetap jadi tampilan untuk Dika; GitHub jadi catatan bersama.
- TERKUNCI: ATURAN.md diubah hanya atas perintah Dika.

## Aturan khusus proyek ini
- Sebelum mengubah artefak (halaman atau database), ambil kunci "Kantor Ai People (artefak)" di KUNCI.md, commit, push.
- Tulis ke database artefak butuh artefak privat (atau dibagikan ke orang tertentu), bukan publik.
- Jangan tulis kata sandi, token, kunci API, nomor rekening di repo maupun artefak.
- BAGAN.md campuran akhir baris CRLF dan LF. Edit dengan alat yang menjaga akhir baris, kalau tidak seluruh file tampak berubah di git.

## Repo, file, tautan
- Repo/branch: akihabara-fuji/akihabara-store, branch `kantor` (tanpa kode situs). Clone cepat: `git clone --depth 1 --branch kantor --single-branch <url>`.
- Isi: README.md (alur), ATURAN.md, KUNCI.md, BAGAN.md, CHAT.md, MULAI.md (prompt pembuka chat baru), LAPORAN/, PROYEK/<folder>/.
- Catatan alat artefak (Claude): panggil tool database dengan slug UUID di atas, bukan id dari URL. Setiap tulis ke dokumen yang sudah ada wajib bawa ifVersion dari bacaan terakhir. db_whoami tidak berlaku untuk artefak ini.
- Berkas lokal di laptop: belum dicek (laptop tidak tersambung di sesi ini).

## Cara kerja
1. `git pull origin kantor`, baca ATURAN.md, KUNCI.md, BAGAN.md, HANDOFF.md proyek yang dikerjakan.
2. Ambil kunci, push. Kerjakan. Perbarui BAGAN.md, HANDOFF.md, LOG.md. Tulis LAPORAN/<tanggal>-<jam>-<meja>.md. Lepas kunci. Push.
3. Kalau token hampir habis, lakukan langkah 2 dulu sebelum chat berhenti.
4. Kalau push ditolak, `git pull --rebase origin kantor`, cek kunci lagi, push ulang.

## Langkah berikutnya
- Gem di akun akihabara.fuzi@gmail.com: Dika login dulu di browser bawaan Claude, lalu Claude buat Gem yang sama dan bagikan Doc papan (lihat) ke akun itu.
- Setelah setoran manual jalan beberapa kali, bangun kurir n8n Telegram ke GitHub (tahap 2).
- Buka halaman artefak di browser dan lihat langsung bahwa aturan 10 muncul di tombol prompt mulai (belum dicek, baru database yang dicek).
- Selaraskan data aset artefak dengan HANDOFF proyek lain begitu folder proyeknya terisi (catatanakademik, heyaipeople, konten-sosmed, video-remotion, bot-wa, akademik-ut, hermes-9router belum punya HANDOFF per 16 Nov 19.37).
- Cek ke server commit live yang sebenarnya untuk heyaipeople dan catatanakademik (ATURAN.md: heyaipeople f91310f; data aset artefak: eb002ef). Untuk portofolio, ikuti PROYEK/portofolio/HANDOFF.md.

## Menunggu dari Dika
- Setujui konektor Windsor dan Supermetrics di halaman artefak.
- Putuskan artefak tetap privat atau dipublikkan lagi (AI tidak bisa mengubah pengaturan berbagi). Selama privat, sesi di akun lain tidak bisa membuka tampilannya, hanya GitHub.
- Produk dan harga heyaipeople.site, izin membuka kunci kode Catatan Akademik (dari ATURAN.md).


========== FILE: PROYEK/portofolio/HANDOFF.md ==========

<!-- Dipindah dari branch portofolio-dika: portofolio-src/HANDOFF.md (versi f0c8db0, 16 Nov 2026 19.30). Mulai sekarang hanya file ini yang diperbarui. -->
# HANDOFF portofolio Dika Priyadi (baca ini dulu, jangan tanya ulang)

## SISTEM BARU (2026-11-16): CMS planet 3D + works.json  ← ini yang live
- portofolio/index.html = halaman tunggal (Three.js planet 3D, Lenis, glassmorphism). Edit langsung file ini, BUKAN lewat render.js.
- Galeri Karya dibaca dari works.json (di server). Isi awal: 5 proyek + 13 karya galeri lama (karya.json). Dika menambah/mengedit lewat https://dikapriyadi.catatanakademik.com/admin.html
- API: portofolio-api/server.js (Express+Multer) di VPS /opt/porto-api, PM2 "porto-api", port 3088, SITE_ROOT=/var/www/dikapriyadi. Password admin di /root/.porto-admin.env. Upload ke v/uploads/.
- Deploy: `bash update-portofolio-cms.sh <commit>` (deploy/update-portofolio-cms.sh). works.json di server TIDAK ditimpa kalau sudah ada. Nginx: blok porto-cms-begin/end di server block situs ini (cadangan /root/nginx-*.bak-*).
- update-portofolio.sh lama (render.js/style.css/script.js/karya.json) JANGAN dipakai lagi; akan menimpa index.html baru dengan versi commit lama.
- Video di kartu tidak autoplay; diputar saat kartu diklik (aturan Dika).

## SISTEM LAMA (arsip, sebelum 2026-11-16)

Web: https://dikapriyadi.catatanakademik.com | Posisi: AI Automation | Teks formal Indonesia. Dika memakai gw/lo; balas santai, ringkas, tanpa rekap.

## Kode (semua ada di repo akihabara-fuji/akihabara-store, branch portofolio-dika)
- portofolio-src/content.default.json = isi teks/data. portofolio-src/render.js = pembuat HTML. portofolio-src/build.sh = bangun.
- portofolio/ = hasil yang dideploy (index.html hasil build, style.css, script.js, assets/). style.css dan script.js diedit langsung.
- JANGAN edit portofolio/index.html langsung; ubah JSON/render.js lalu build.
- Build: `git pull` lalu `bash portofolio-src/build.sh <versi>`. Versi wajib naik tiap deploy (nginx cache css/js 1 tahun). Versi live terakhir: 20261145 (kartu 05 punya 4 folder 3D: carousel IG, konten edukasi, affiliate, iklan layanan AI, 10 video ber-caption, aset c-*.webp dan v-*.mp4 wajib masuk daftar update-portofolio.sh; rail Karya kartu melayang 3D; sebelumnya 20261144: Beranda = hero asli DIKA PRIYADI di atas + rincian di bawah: chip jalur, 8 kartu bernomor, karya pilihan, angka, CTA)
- Uji: Playwright, Chrome di /usr/bin/google-chrome, ukuran 1440x900, 1366x700, 390x844. Tanpa pageerror, tanpa scroll horizontal.

## Struktur halaman
#home, #karya (bagian 01), #about, #skills, #experience, #kontak. Karya punya 3 tab: AI & Digital, Layanan freelance, Pengalaman Facility. Tiap tab diawali kartu animasi sendiri (AI = grafik alur, Layanan freelance = kartu mengipas, Facility = garis waktu). AI di atas, facility di bawah.
- Jangan pakai class `.cd` (bentrok dengan kursor komet). Jangan pakai `.screen.on` sebagai penanda bagian aktif.
- Trail kursor sengaja dihapus (bentrok dengan teks). Jangan dipasang lagi.
- Item Karya direferensikan lewat indeks (data-pick, orbit ks[].k, flow to). Kalau menyisipkan atau mengurutkan item, petakan ulang semua indeks itu, dan cek tab (data-kt) ikut benar.

## Deploy (jalankan sendiri, jangan minta Dika menempel skrip)
1. Tes lokal lolos, lalu commit dan push ke portofolio-dika (baris Co-Authored-By dan Claude-Session).
2. Buka https://hpanel.hostinger.com/vps/2040957/overview, tunggu 10 detik. Klik "Web console" (sekitar 1398,238), sering perlu 2-3 klik. Terminal terbuka di tab baru dci.hostingervps.com/5181.
3. Klik terminal, ketik: `clear; curl -fsSL https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/<commit>/deploy/update-portofolio.sh -o /tmp/up-porto.sh && bash /tmp/up-porto.sh <commit> 2>&1 | tail -15` lalu Enter, tunggu 10 detik, baca layar. Sukses jika ada `OK, commit <commit> live`. Skrip rollback sendiri kalau gagal.
4. Tutup tab terminal, buka situs live di tab baru, cek lewat javascript (boolean atau teks pendek), tutup tab.
- hPanel macet di logo loading: minta Dika login sekali, ulangi.
- Web root VPS: /var/www/dikapriyadi. Hanya situs ini yang disentuh.
- Aset baru (gambar) WAJIB ditambahkan ke daftar unduhan di deploy/update-portofolio.sh (daftar `for f in ...`), kalau tidak 404 di live. Saat ini 11 aset terdaftar dan semuanya sinkron.

## Jangan tabrakan
- catatanakademik.com utama = proyek lain: branch feat/koin, skrip deploy/update-koin.sh. Jangan push ke sana atau menjalankan skripnya untuk portofolio.
- Jangan sentuh nginx situs lain. Ubah nginx hanya setelah `nginx -t` lolos dan dengan cadangan.
- Sebelum kerja: `git pull origin portofolio-dika` dan `git log -5`, supaya tidak menimpa commit sesi lain. Satu sesi deploy pada satu waktu.

## Aturan Dika
- Web ini hanya soal catatanakademik.com. Tanpa proyek lama (Klipin) kecuali diminta. Jangan sebut "Ruang Akademik" atau /ruangakademikut.
- Jangan karang angka, testimoni, atau sertifikat. Data harus sama dengan CV. Nomor HP pribadi tidak tampil di web (kontak berupa tombol).
- Halaman simpel tanpa scroll panjang; teks panjang pakai "Baca lengkap".
- Perintah singkat dibaca harfiah ("tuker", "taruh di atas"). Lakukan persis, lalu cek hasil nyata di HTML.
- Cek sendiri hasil (kode dan tampilan) sebelum lapor. Jangan ulang instruksi cek manual setelah deploy.
- Tanya hanya jika keputusan tidak bisa dibatalkan atau fakta tak bisa dicari. Selain itu pilih yang terbaik, kerjakan, lapor 1-2 kalimat.

## Belum selesai
- Audit QA penuh (read-only dulu, perbaikan hanya setelah disetujui).
- CV PDF Indonesia: halaman 2 hampir kosong. CV Inggris 1 halaman sudah ada (CV_Dika_Priyadi_2026_EN.docx, dikirim ke Dika).
- Galeri Karya 10-11 menunggu hasil Canva dari Dika.

## Riwayat commit penting
Keahlian jadi folder skill dengan panel alur kerja (versi 20261136; data di skills.folders, video opsional lewat field video)
25bc308 (live) animasi per kelompok, trail dihapus | 37f184b tab Karya | fff5d02 AI dulu, facility bawah | abd7cbf Karya jadi bagian 01
Beranda: sapaan "Halo, saya" + nama + bio di tahap awal (home.hi, home.nama); folder Keahlian jadi dropdown di bawah grid, bukan modal (versi 20261137)


========== FILE: PROYEK/video-remotion/HANDOFF.md ==========

# HANDOFF — video-remotion (seri BUILD WITH AI, repo Remotion kang-catat-plus)

Terakhir diperbarui: 16 Nov 2026 22.52 WIB · Claude akun-2 · Remotion. Satu-satunya HANDOFF proyek ini; file serah terima lain (D:\...\SERAH-TERIMA\PROMPT-SERAH-TERIMA.*, dokumen Project claude.ai "handoff-remotion-kang-catat.md") sudah jadi penunjuk ke sini.

## Ringkas
- Tujuan: produksi video vertikal 1080x1920 30fps seri "BUILD WITH AI" (Part 1–30) dengan Remotion 4.0.539, suara Rafiq (ElevenLabs web, Eleven v4), biaya nol, laptop i3/8GB. Per Part: video + thumbnail A/B + paket caption (hook baris 1, CTA lengkap baris terakhir). Tidak diposting sebelum Dika ACC.
- Status: Part 1–2 selesai lama. Part 3 dan 4 (v3) selesai. Part 5 "Prompt jelas bukan panjang" dan Part 6 "AI partner berpikir": v1 selesai, validator LOLOS, menunggu ACC Dika (revisi mungkin: volume SFX, gerakan). Part 7+ belum dikerjakan (naskah dari 30 naskah resmi di artefak Kantor Ai People dan file 30_naskah_dika_priyadi_build_with_ai.md di Downloads laptop).
- Lokasi hasil: laptop Dika `D:\FOLDER VIDEO KONTEN\BUILD-WITH-AI\Part-03 … Part-06` (video, thumbnail-A/B, caption.txt; Part 3/4 belum punya caption). Folder lama `Downloads\BUILD-WITH-AI` masih ada (belum bisa dihapus dari sandbox), boleh dihapus Dika. Source repo Remotion: zip di `D:\FOLDER VIDEO KONTEN\BUILD-WITH-AI\SERAH-TERIMA\kang-catat-plus-source.zip`; di sandbox lama `/home/claude/kang-catat-plus` (hilang bila sesi berakhir).
- Terkunci (ACC Dika): naskah resmi per Part dipakai persis; layout SplitScene (panel atas, kotak kiri-bawah SidePanel, foto Dika kanan-bawah, subtitle menonjol); tanpa animasi mulut, tanpa emote tertawa; "Part" bukan "Episode"; tanpa musik tambahan; hasil selalu juga ditaruh di folder D: Dika.
- Nunggu Dika: ACC Part 5 dan 6; perintah mengerjakan Part 7; apakah caption Part 3/4 dibuat.
- Belum dicek: apakah akses folder D: masih terhubung di sesi baru (minta lagi dengan device_request_folder_access); isi artefak "Kantor Ai People" 30 naskah (baca langsung dari DB artefak).

## Prompt kerja untuk sesi baru

Kamu melanjutkan produksi seri video "BUILD WITH AI" milik Dika Priyadi (Jakarta Barat, bahasa gaul gw/lo, jawaban pendek tanpa rekap). Baca seluruh dokumen ini sampai habis, termasuk Lampiran A–H (semua skill Remotion), sebelum melakukan apa pun.

ATURAN KERAS
1. JANGAN bikin proyek Remotion baru dan JANGAN merusak komposisi lama. Pakai repo `kang-catat-plus` (Remotion 4.0.539, 1080x1920, 30 fps). Source dibackup di `D:\FOLDER VIDEO KONTEN\BUILD-WITH-AI\SERAH-TERIMA\kang-catat-plus-source.zip` (laptop Dika; ±58 MB, tidak masuk repo ini) (tanpa node_modules dan out; jalankan `npm install` setelah ekstrak). Kalau sandbox lama masih ada, repo ada di `/home/claude/kang-catat-plus`.
2. Naskah wajib dari 30 naskah resmi di artefak "Kantor Ai People" (dulu Gudang Prompt) — cek DB artefak (mcp__claude-artifacts__db_query/db_list) dan file `30_naskah_dika_priyadi_build_with_ai.md` di Downloads. JANGAN karang naskah. Pakai persis hook, screen text, CTA resmi.
3. Tiap Part, serahkan: video jadi, thumbnail (A dan B), paket caption (hook di baris pertama, CTA lengkap di baris terakhir). JANGAN posting di mana pun sebelum Dika ACC.
4. Setiap hasil WAJIB juga ditaruh di folder komputer Dika: `D:\FOLDER VIDEO KONTEN\BUILD-WITH-AI\Part-XX\` (PartX-video.mp4, PartX-thumbnail-A.png, -B.png, PartX-caption.txt). Minta akses folder itu dengan `device_request_folder_access` bila belum terhubung, lalu SendUserFile → `device_commit_files`. (Sebelumnya di `C:\Users\dikha\Downloads\BUILD-WITH-AI`; sudah dipindah ke D atas permintaan Dika.)
5. Biaya nol. Laptop i3/8 GB. Tanpa WebGL. Tidak ada musik tambahan; audio asli = suara Rafiq (ElevenLabs). SFX hanya CC0.
6. Gaya: seadanya dan profesional, tanpa emote tertawa, tanpa animasi mulut, "Part" bukan "Episode", subtitle menonjol, kata "prompt" di narasi/teks video untuk umum tetap sesuai naskah resmi, jangan pose nunjuk di foto Dika. Panel monitor jangan berisi teks (dobel subtitle): isi alur stickman Kang Catat, maskot AI, ikon, panah. Kotak bawah-kiri (500x800) diisi panel interaktif (SidePanel), bukan sekadar chat.
7. Verifikasi sendiri sebelum lapor: validator, still frame, board frame akhir, ffprobe (ada stream aac), volumedetect, ukuran file. Jangan bilang beres tanpa melihat hasil.
8. Kesalahan berulang → usulkan perbaikan skill lewat propose_skills. Jangan tulis API key/secret di chat.
9. Render hanya setelah naskah dan layout jelas; kalau ragu, tanya dulu (satu pertanyaan). Satu render penuh per permintaan; cek still dulu.

STATUS TERKINI
- Part 1–2: selesai sebelumnya (episodes/001, 002).
- Part 3 dan 4: video v3 selesai (ada di folder Part-03 dan Part-04 di D:). Caption Part 3/4 belum dibuat file-nya di folder (cek bila diminta).
- Part 5 "Prompt jelas bukan panjang" dan Part 6 "AI partner berpikir": video v1, thumbnail A/B, caption sudah dikirim dan ada di folder; MENUNGGU ACC Dika. Revisi mungkin: volume SFX, gerakan.
- Part 7 dst: ambil dari 30 naskah resmi, belum dikerjakan.

---

## BAHAN

### 1. Orang dan tujuan
Dika Priyadi, supervisor operasional/fasilitas ±8 tahun, fokus proyek AI dan konten. Seri "BUILD WITH AI" = personal brand engine: Remotion sebagai mesin komposisi, ElevenLabs suara (Rafiq, model Eleven v4), Flow sumber visual (aset Flow belum ada; jangan karang footage). Maskot stickman Kang Catat (kaos kuning UT #FFC20E), foto asli Dika (public/dika-real), maskot AI (Claude, ChatGPT, Gemini, Flow, n8n, WhatsApp, TikTok, Instagram) di public/mascot.
Aturan kampanye: hook dalam 2 detik, tanpa salam/logo, satu pesan per video, tunjukkan bukti, jangan mengarang hasil, ada label status ("ilustrasi edukasi, bukan hasil uji atau klaim performa"), hashtag #BuildWithAI #AIAutomation #AICreator #DigitalSolutions (IG maks 5; #PromptTok hanya TikTok), suara asli tanpa musik tambahan. CTA bukan selalu "follow" tapi harus relevan.
Naskah Part 5: Hook "Prompt 1.000 kata belum tentu lebih pintar." Screen text "JELAS LEBIH PENTING DARI PANJANG". CTA "Follow dan cek bio buat kumpulan prompt dan contoh penerapannya."
Naskah Part 6: Hook "Jangan cuma tanya ChatGPT. Minta dia menguji idemu." Screen text "JADIKAN AI PARTNER BERPIKIR". CTA "Follow dan cek bio buat prompt yang bisa langsung lo praktikkan."

### 2. Struktur repo (kang-catat-plus)
- `episodes/<NNN-slug>/episode.json` → `node tools/gen-episodes.mjs` → `src/episodes.generated.ts` (komposisi `Episode<NNN>`, dirender `src/Generic.tsx`). Validator: `npm run episode:check -- --final` (hook = caption scene[0]; caption scene terakhir = CTA; peringatan caption >110 karakter / scene tanpa judul boleh).
- `src/plus/`: Stage2.tsx (panel atas: node/edge/badge/fx/stick/term/kamera/sfxq, ±40 ikon, pose stickman tambahan), Side.tsx (SidePanel 500x800: head, rows, meter, big, cast), Scenes5.tsx (SplitScene: judul y=225, panel atas 920x610, kotak kiri-bawah 500x800, foto Dika kanan-bawah, subtitle CaptionKit), CaptionKit.tsx (kata per kata, garis squiggle untuk kata tekan), Scenes.tsx (tipe PlusSpec).
- `tools/bwai2lib.py` helper (N, Mx, E, Bd, Fx, STK, R, Cs, dk, Sc, `build(num,slug,title,msg,hook,ctatext,tag,scs)`), `tools/ep005.py`, `tools/ep006.py` (contoh 7 scene dengan cue per kata). Jalankan ulang: `python3 tools/ep005.py && python3 tools/ep006.py && node tools/gen-episodes.mjs`.
- `tools/word-timing.py` (silencedetect per mp3 → `public/voice-epNNN/wt.json`, frame audio per kata), `tools/cut-at.py <src.mp3> <voiceDir> <detik potong...>`, `tools/make-env.py voice-epNNN` (argumen `voice-epNNN`, BUKAN `public/...`), `tools/tts.mjs`, `tools/setup.mjs`.
- `src/Root.tsx`: komposisi Thumb005A/B, Thumb006A/B (thumbnail), dll. Render thumbnail ke `out/epNNN/thumb-A|B.png`.
- SFX CC0 di `public/sfx2/{pop,tick,ok,bad,ask,hit,thud,whoosh,step,power,boing,paper,click,slide}.mp3` (dari stickman-video-director B-audio-library: Kenney, artisticdude, ez-boings); dipicu otomatis dari event stage dan `sfxq`.
- Paket terpasang: @remotion/shapes, noise, paths, motion-blur, layout-utils, rough-notation, starburst, animation-utils, transitions, fonts, elevenlabs. Hindari paket yang butuh CDN (jaringan render diblokir).
- Referensi gaya: https://github.com/kaomei/stickman-video-director (skill sutradara stickman).

### 3. Timing (jangan salah)
- Durasi scene = panjang audio + PAD 12 frame. Scene saling overlap OV=16 frame. Frame lokal scene = frame audio + 16 untuk scene index > 0.
- Sequence caption dan audio mulai tepat di `starts[i]`, jadi `wt` caption dalam frame audio TANPA offset OV. Generator menambah OV ke semua cue stage/side.
- `w("kata", d, k)` mengembalikan frame lokal scene dari wt.json.
- Word timing: silencedetect, batas frasa di jeda terpanjang, bobot kata per suku kata.

### 4. Alur suara Rafiq (ElevenLabs web di built-in browser) — LENGKAP
Jangan klik Regenerate sembarangan (hemat kredit; 1 karakter = 1 kredit). MCP ElevenLabs boleh dicoba dulu; kalau "Free generations are busy" atau suara tidak sesuai, pakai web app (Dika sudah login). Audio asli = suara Rafiq, Eleven v4, TANPA musik.
1. Muat tool browser: ToolSearch `mcp__remote-devices__Claude_Browser__` (max_results 64) sekali. Baca skill built-in-browser (Lampiran E) dulu. Pane browser harus tampil (Ctrl+Shift+B di app desktop).
2. `tabs_context`, buka/ pilih tab "seed" di https://elevenlabs.io/app/speech-synthesis/text-to-speech (pilih voice Rafiq, model Eleven v4). Bila site belum diizinkan, panggil `request_access`.
3. `read_page` (filter interaktif) → ref textbox naskah (sebelumnya ref_213) → klik → ctrl+a → ketik seluruh naskah satu blok. Tombol "Generate speech" (sebelumnya ref_246) → tunggu ±12 detik. Ref bisa berubah: selalu `read_page` ulang.
4. Unduh dengan tombol "Download" PER-GENERATION di riwayat (hasil read_page), BUKAN "Download Audio" di player bawah (itu mengunduh generasi lama; pernah salah mengambil file 521831 byte milik Part 4). Selalu cek ukuran file vs file lama.
5. Ambil file lewat `mcp__remote-devices__device_bash` (Linux VM di komputer Dika; Downloads = `~/mnt/Downloads` atau folder yang terhubung): `touch /tmp/refX` sebelum klik; lalu polling `find . -maxdepth 1 -name '*.tmp' -newer /tmp/refX -size +100k`; `cp` ke `epNNN-rafiq.mp3`. Lalu `device_stage_files` → `/mnt/user-data/uploads/Downloads/<file>.mp3` (butuh folder Downloads terhubung; bila tidak, minta akses).
6. Ejaan fonetik di naskah suara: "A I", "Cet Ji Pi Ti", "Klod", "Flo", "Jemini", "Kanva", "Kep Kat", "Eleven Labs"; tag ekspresi v4 tanpa tanda hubung: [confident] [casual] [serious] [warmly] [curious] [calm] [upbeat] [short pause]. Kata terlarang/klaim: tidak ada.
7. Potong per scene di tengah jeda alami: `python3 tools/cut-at.py <src.mp3> public/voice-epNNN <detik...>` (cek jeda asli dengan ffmpeg silencedetect -30dB d=0.12, parse pasangan silence_start/silence_end dengan python; JANGAN pakai cut-prop.py karena memotong di koma yang salah). Lalu `python3 tools/make-env.py voice-epNNN`, lalu `python3 tools/word-timing.py episodes/<NNN-slug>/episode.json`.
8. Kredit: cek `mcp__ElevenLabs__account_get_usage` sebelum generate. Jangan percepat suara.
Contoh potongan: EP005 (28,37 dtk) potong di 3.14 6.40 14.35 17.76 21.23 24.31; EP006 (29,96 dtk) potong di 4.0 6.30 9.02 15.61 20.25 26.14.

### 5. Render
- Command: `npx remotion render src/index.ts Episode005 out/ep005/x.mp4 --browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --chrome-mode=headless-shell --concurrency=2 --crf=23` (sandbox cloud; jalankan dengan nohup, ±2–3 menit). Di laptop Dika cukup `npm run render -- Episode005 out/x.mp4`.
- Still: `npx remotion still src/index.ts <Id> out/a.png --frame=N` dengan flag browser yang sama. Cek frame terpadat sebelum render penuh. Thumbnail: render komposisi Thumb ke PNG.
- Verifikasi: ffprobe (stream aac), volumedetect (target mean ±−22 dB), board 6 still.

### 6. Caption package (format)
Baris 1 = hook. Isi body. "Status: ilustrasi edukasi, bukan hasil uji atau klaim performa. Efek suara: CC0 (Kenney, dll)." Baris hashtag. Baris TERAKHIR = CTA lengkap. TikTok tambah #PromptTok; IG maksimal 5 hashtag.

### 7. Kesalahan yang sudah terjadi (jangan ulangi)
- `Mx()` param `emo` bentrok → dipakai `e0`.
- Audio salah unduh (player bawah) → pakai Download per-generation.
- Cut di gap koma salah → pakai cut-at.py dengan silence nyata.
- Parse silencedetect pakai awk → pakai python pasangan start/end.
- Kata caption saling tumpuk (scale terlalu besar) → scale 1.05/1.07, margin 0 11px.
- Fx burst hijau terlalu besar, baris "KITA PUTUSKAN" wrap → kecilkan / ganti "KEPUTUSAN".
- Celah kosong besar di side panel → pakai meterTop, geser/besarkan cast.
- `rm -f out/.../st/*` diblok; device shell tidak bisa hapus (rm "Operation not permitted") → tulis ke folder baru atau minta `device_request_delete_permission`.
- Naskah resmi harus dari Kantor Ai People, bukan karangan ("naskah? kan lu bisa cek di gudang prompt ada 30 naskah").
- Stickman jangan lari terlalu cepat untuk "AI jawab ngebut"; kotak monitor bukan tempat teks.
- Video harus mencantumkan nomor Part (#003, #004 dst) sesuai project.

### 8. Preferensi Dika (ringkas, tersimpan di memori project)
Jawaban pendek gaul; jangan kirim file yang tidak diminta; Claude menentukan efek/kamera sendiri dan mengerjakan sampai selesai; hasil sesuai gambar acuan dan bahan (maskot, screenshot); thumbnail dibuat sekalian; hasil selalu juga di folder komputer; bila bingung tanya satu pertanyaan; jangan buang token dengan render asal.

### 9. Dokumen Project "remotion" (claude.ai Projects)
`claude/handoff-remotion-kang-catat.md` (handoff Kang Catat lama, UAOP/token/cek nilai), `claude/catatan-engine-status.md` (engine plus), `claude/panduan-setup-suara-elevenlabs.md`, `claude/naskah-uaop-terkunci.md`. Baca via Projects project_read bila relevan.

---



### 9. Arsip: Kang Catat lama (dipindah dari dokumen Project claude.ai "handoff-remotion-kang-catat", 9 Nov 2026)
Repo awal `stickman-remotion/` (maskot Kang Catat kaos kuning UT #FFC20E; Remotion 4.0.539). Komposisi lama: StickmanStory, ExplainerStory, Showcase, Uaop, KangCatat, Kenalan, Hook, Video (uaop.json), VideoToken, VideoNilai, VideoContoh, ModelSheet; mesin JSON `src/Generic.tsx` dengan tipe scene intro/hook/list/stats/vs/outro/desk/jump/cta/room + 10 tipe plus (judul, kartu, angka, paket, statchart, ranking, versus, notif, chat, daycounter). Rig: `src/engine/Stickman.tsx`. Palet: kertas #F3F3F0, tinta #111, merah #E5322D, biru #2F6BFF, hijau #12A672, kuning #FFC93C, oranye #E8825F; kamar malam #24434f→#0f222b.
Video lama: (a) UAOP 32 dtk, naskah per scene TERKUNCI (dokumen Project `claude/naskah-uaop-terkunci.md`, `src/data/uaop.json`); (b) "Token abis" (portofolio): cerita bikin web portofolio bareng Claude, token habis 2 hari, beli Pro jadi 2 akun, habis lagi; JSON ditulis ulang, belum dirender; (c) Cek nilai UAS 30,5 dtk sudah dirender dan dikirim (sumber blog catatanakademik.com/blog/cara-melihat-nilai-uas-dnu-ut; CTA ke menu "Kalkulator Nilai UT"). Angka layar contoh wajib berlabel ilustrasi. Naskah suara harus persis sama dengan teks layar scene; TTS maksimal 500 karakter per scene.
Dokumen Project claude.ai "remotion" lain: `claude/catatan-engine-status.md` (engine plus 13 Nov), `claude/panduan-setup-suara-elevenlabs.md` (setup API key lokal `.env`, jangan tulis key di chat).

### 10. Skill Remotion lengkap
Folder `PROYEK/video-remotion/skills/`: remotion-suara-rafiq, catatan-remotion, project-remotion, catatan-analisa-sosmed, built-in-browser, video-making, hemat-token, EDITORIAL-aturan-editorial. Skill asli hanya di akun Claude utama; baca salinan ini bila di akun lain.

### 11. Langkah berikutnya
1. Tunggu ACC Dika untuk Part 5 dan 6; revisi hanya yang diminta.
2. Part 7: ambil naskah resmi, ikuti alur suara Rafiq (bagian 4), render sekali, thumbnail A/B, caption, taruh di D:\...\Part-07, laporkan.
3. Bila kesalahan berulang muncul, ajukan perbaikan skill (propose_skills).
