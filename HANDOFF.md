# HANDOFF — Proyek Remotion "Kang Catat" (lanjutkan tanpa ada yang terlewat)

Tempel bagian **PROMPT** di bawah ke Claude baru, lampirkan `paket-kang-catat.zip` + `model-sheet.png`. Sisanya (BAHAN) adalah referensi lengkap; Claude baru wajib membacanya sebelum bekerja.

---
## PROMPT (tempel ini)

Kamu melanjutkan proyek Remotion milik Dika Priyadi (Jakarta Barat, Bahasa Indonesia gaul gw/lo). Baca seluruh file HANDOFF.md ini dan isi zip dulu. JANGAN bangun ulang yang sudah jalan; audit dulu, sampaikan rencana singkat, baru ubah.

Tujuan: mesin motion graphics Remotion yang reusable untuk video vertikal 1080x1920 30fps (TikTok/Reels/Shorts) berisi maskot stickman **Kang Catat** (kaos kuning UT #FFC20E), cepat jadi konten yang menghasilkan. Aturan keras: **biaya nol** (tanpa layanan/API/template berbayar; hanya npm/GitHub gratis, SVG/CSS/React/Remotion), laptop **Intel i3 / 8 GB RAM / Windows** jadi ringan, tanpa WebGL. Efek "3D" = pseudo-3D (bayangan keras berlapis, parallax, perspektif CSS, kamera zoom); jujur ke user bahwa ini bukan 3D sungguhan.

Cara balas ke Dika: pendek, simpel, gaul (gaya caveman + hemat token), jawaban dulu, tanpa basa-basi atau rekap. Jangan bahas posting Instagram. Jangan kirim file yang tidak diminta. Jangan mengarang data/angka/tanggal; kalau ragu tulis "cek info resmi". Audit hasil sendiri (lihat frame/still) sebelum bilang selesai. Kalau ada kesalahan berulang, usulkan perbaikan skill/cara kerja.

Pekerjaan berikutnya (urut): lihat bagian "TUGAS BERIKUTNYA" di bawah.

---
## BAHAN

### 1. Siapa dan kenapa
- Dika Priyadi, supervisor operasional/fasilitas ±8 tahun, kini fokus proyek AI dan konten. Layanan: Catatan Akademik (catatanakademik.com, layanan mahasiswa UT). Handle brand: **@catatanakademik**. Portofolio live: dikapriyadi.catatanakademik.com. Teks situs portofolio memakai bahasa baku ("saya"); video/konten TikTok boleh gaul.
- Hanya web catatanakademik.com yang dibahas; jangan pakai proyek/web lama dari riwayat kecuali diminta.
- Suara video: **suara Dika sendiri**, dibaca biasa (bukan AI). Alternatif gratis: edge-tts (id-ID-ArdiNeural / GadisNeural, rate -5%). Jangan kloning suara orang lain. Kloning suara (F5-TTS CC-BY-NC, OpenVoice MIT) dibahas tapi berisiko lisensi untuk konten monetisasi; ElevenLabs gratis punya batas kredit dan lisensi komersial terbatas.
- Maskot bernama **Kang Catat** (dipakai di semua video). Nama dan handle tampil sebagai tag pojok setelah scene pertama.

### 2. Aturan naskah suara (PENTING, sering jadi sumber marah)
- Video tetap pendek; Dika merekam suaranya sendiri DI ATAS video, jadi **tiap kalimat harus muat di durasi scene-nya dan isinya sama persis dengan teks di layar scene itu**.
- Naskah UAOP **terkunci** (jangan diubah): tersimpan di dokumen Project "naskah-uaop-terkunci" dan di `src/data/uaop.json` (field `voice`).
- TTS: maksimal 500 karakter per scene; tulis singkatan dengan spasi agar terbaca benar ("S E B", "K T P U O", "D N U", "myut titik ut titik ac titik id").
- Dika belum mengirim rekaman 8 file suara UAOP (1.mp3–8.mp3, urut scene). Kalau sudah ada: taruh di `public/voice/N.mp3`, durasi scene otomatis mengikuti (+12 frame), render ulang, lalu gabungkan.

### 3. Teknologi
- Remotion **4.0.539** (dipaku persis), `@remotion/cli` 4.0.539, `@remotion/media-utils` 4.0.539, React 18. Tanpa dependency berat lain.
- Windows: `npm install`, `npm run dev` (preview). Render: `npx remotion render src/index.ts <IdKomposisi> out/x.mp4 --concurrency=2 --crf=23`. Remotion mengunduh Chrome sendiri di laptop Dika.
- Sandbox Claude (bukan laptop Dika): Chrome Remotion tidak bisa diunduh, pakai Chromium lokal: tambahkan `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell --chrome-mode=headless-shell`. Still: `npx remotion still src/index.ts <Id> out/a.png --frame=N` dengan flag sama. Render 30 detik ±2 menit.
- Sandbox tidak bisa menjangkau edge-tts, HuggingFace, atau memakai ASR; ffmpeg tersedia. Jangan klaim tes TTS berhasil dari sandbox.
- Emoji di headless Chromium kadang tidak tampil; pakai simbol teks/SVG bila perlu.

### 4. Struktur proyek (`stickman-remotion/`)
- `src/Root.tsx` — daftar komposisi: StickmanStory, ExplainerStory, Showcase, Uaop (lama, hardcode), KangCatat (lembar gaya, 2000x1300), Kenalan (intro 150f), Hook (75f), **Video** (data uaop.json), **VideoToken** (portofolio-token.json), **VideoNilai** (cek-nilai.json), VideoContoh (stats/vs/outro), ModelSheet (2400x1700).
- `src/Generic.tsx` — mesin berbasis JSON. `calcGeneric` (calculateMetadata) menghitung durasi per scene dari `public/voice/N.mp3` (+12f, minimal 60f) atau dari `sec`. Transisi CircleReveal 16 frame antar scene. Tag Brand muncul mulai scene ke-2. Audio per scene lewat `<Audio>`.
- Tipe scene (JSON): `intro`, `hook` (words[{t,hl}], warn), `list` (pill, pillColor, title dengan *aksen*, rows[{t,sub,mark,color}] maks 5), `stats` (3 angka 0–100), `vs` (left/right{title,lines}), `outro` (pill,title,rows,sticker), `desk` (latar kertas + jendela ala OS: terminal/meter/chat/browser, notif, flash), `jump` (lompatan waktu: jam, label, big, punch, reverse), `cta` (kartu follow + kursor tap + bubble komentar), `room` (kamar malam gaya referensi: chip warna, layar monitor berganti: cal/login/dnu/check/split/calc/blank, confetti, foot, cta). Global: `brand{name,handle}`, `gear` (togaglasses|toga|glasses|cap|headset|peci|pensil|none).
- `src/engine/Stickman.tsx` — rig kinematik SVG. POSES: idle, shock, stress, stressDown, typeA, typeB, think, happy, happyLand, talk, present, point, pointUp, thumbs. Wajah: neutral/shock/stress/focus/happy/talk. Prop: keys, thumbUp, accent, ink, headFill, shirt, headGear, backGear, frontGear, ringOff.
- `src/engine/Camera.tsx` (kamera virtual {f,x,y,s,r}, shake, Parallax, SpeedStreaks), `ui.tsx` (PAPER palette, PaperBg, Sparkles, Pill, Title, NeoCard, Chip, Sticker), `fx.tsx` (KineticText, RingStat, DrawPath, VsCards, CircleReveal).
- `src/KangCatat.tsx` — gear (Glasses, Toga, Notebook, PencilBand, Headset, Tie, Cap, Backpack, Cape, Mask, Hachimaki, Mug, Peci) + 10 gaya. `Kenalan.tsx`, `Hook.tsx`, `Desk.tsx`, `Room.tsx`, `ModelSheet.tsx`.
- `src/Uaop.tsx` (+ `Uaop.v1.bak` cadangan). `tools/tts.py` (teks → public/voice/N.mp3). `MASTER_PROMPT.md` (prompt sekali-tempel: user hanya isi TUJUAN VIDEO → AI keluarkan JSON + naskah + perintah). `README.md`, `model-sheet.png` (semua pose, wajah, gear, palet).
- Palet: bg kertas #F3F3F0, tinta #111, merah #E5322D, biru #2F6BFF, hijau #12A672, kuning #FFC93C, oranye #E8825F, kaos UT #FFC20E. Kamar malam: bg #24434f→#0f222b, chip hijau #4EE3A0 / oranye #FF9F43 / kuning #FFC93C / merah #FF5A52 / biru #6C9BFF. Pada latar gelap stickman diberi halo putih (drop-shadow) agar outline terlihat.

### 5. Video yang sudah ada
1. **UAOP "Tata cara UAOP UT"** (sumber blog catatanakademik.com/blog/panduan-uaop-ut-hari-ujian-login-kamera-kedua): 8 scene, 32 dtk, `Uaop` (hardcode) dan `Video` (JSON, + hook). Naskah terkunci di uaop.json. Opsional hook 2–2,5 dtk "Jangan sampai ujian UAS kamu gagal gara-gara ini!" (dipilih Dika). Belum digabung/dirender final dengan hook; menunggu suara Dika.
2. **Token abis (portofolio)** `VideoToken`: versi 1 sudah dirender dan Dika bilang "gk menarik, gk jelas CTA, hook lemah". JSON sudah ditulis ulang (belum dirender): hook langsung klimaks "2 AKUN Claude Pro ABIS LAGI!" (meter 100% + kilat merah), jam mundur "2 HARI LALU", terminal, meter habis, beli Pro lagi sampai 2 akun, keduanya habis, tips "Jangan boros" (chat baru tiap topik; perintah jelas sekali jalan; minta jawaban ringkas), web live (dikapriyadi.catatanakademik.com), CTA kartu follow + "Komen TOKEN" + teaser Part 2 cara hemat token. Perlu: render, cek frame, perbaiki, kirim. Cerita dari Dika: bikin web portofolio bareng Claude, token habis 2 hari, beli Claude Pro lagi jadi 2 akun, itupun habis, lanjut dikembangkan. Jangan menambah angka harga/token yang tidak disebut Dika.
3. **Cek nilai UAS** `VideoNilai` (30,5 dtk, sudah dirender `out/cek-nilai.mp4`, dikirim ke Dika): gaya kamar malam, 7 scene: hook, 4 langkah (kalender akademik → login myut.ut.ac.id → menu hasil studi/DNU, unduh → periksa nama/kode/nilai huruf), peringatan nilai akhir = UAS + Tuton dan UAS benar <30% → E, CTA ke Kalkulator Nilai UT. Naskah (sudah dikirim ke Dika): 1 "Nilai UAS lu udah bisa dicek? Gini caranya, cuma tiga puluh detik!" 2 "Satu. Pastikan tanggal pengumuman nilai udah lewat. Cek di kalender akademik UT." 3 "Dua. Buka myut titik ut titik ac titik id, lalu login ke akun MyUT." 4 "Tiga. Cari menu hasil studi atau D N U, lalu unduh. Nama menu bisa beda, cari yang ada kata nilai." 5 "Empat. Periksa tiap mata kuliah: nama, kode, dan nilai hurufnya." 6 "Ingat, nilai akhir itu gabungan UAS dan tutorial. Kalau UAS benar kurang dari tiga puluh persen, nilainya E." 7 "Mau tau IPK lu naik atau turun? Buka catatanakademik titik com, menu Kalkulator Nilai UT, terus hitung IPK lu sekarang!" Angka layar (40 soal, 32 benar, Tuton 80, IPK 3,45, nilai A/B) hanya CONTOH dan diberi label.
4. Aset lain: lembar 10 gaya Kang Catat, intro Kenalan (nama + @catatanakademik), model-sheet.

### 6. Fakta konten (sumber blog Dika, jangan menyimpang)
- Cek nilai: https://catatanakademik.com/blog/cara-melihat-nilai-uas-dnu-ut — MyUT di myut.ut.ac.id; pastikan tanggal pengumuman sudah lewat (kalender akademik UT); masuk MyUT; menu hasil studi / "Daftar Nilai Ujian (DNU)", unduh; periksa nama, kode, nilai huruf. Nama menu bisa berubah. Tanggal rilis pasti tidak disebut. Nilai akhir menggabungkan tutorial (jika diikuti) dengan UAS; bobot beda untuk Tuton, tutorial tatap muka/webinar, TMK; nilai tutorial dihitung bila UAS ±30% benar (bisa beda antarmatkul); nilai E wajib registrasi ulang dan diujikan lagi. Catatan Akademik bukan situs resmi UT; nilai resmi hanya di MyUT.
- Hitung nilai: https://catatanakademik.com/blog/hitung-nilai-akhir-ips-ipk-ut dan https://catatanakademik.com/kalkulator-nilai-ut ("Kalkulator Nilai Akhir UT & Target IPK": input jenis nilai pendukung Tuton/TMK/TTM, nilainya, jumlah soal UAS, jawaban benar; output nilai akhir, huruf mutu, angka mutu, kategori; UAS benar <30% → E; simulasi IPK = jumlah (SKS × angka mutu) / total SKS; target IPK). Menu situs bernama **"Kalkulator Nilai UT"** (bagian Alat UT, "Nilai akhir dan target IPK"); tidak ada menu bernama persis "Hitung Nilai IPK". Menu lain: **Tracker Kelulusan & IPK** (SKS lulus dan sisa semester), **Info Alat UT** (/portal-ut). Dika menyebut "menu hitung nilai IPK"; CTA saat ini diarahkan ke Kalkulator Nilai UT. Tanyakan/konfirmasi bila Dika ingin nama menu diganti.
- UAOP: lihat on-screen text 8 scene di `src/data/uaop.json` (Persiapan: pasang SEB tes sebelum UAS, foto live 3 hari sebelum ujian lewat Berkas AOP, perangkat laptop/webcam/mic/tripod/HP, password KTPUO; Login NIM; kamera kedua HP landscape, meja+monitor terlihat, baterai terisi, scan QR; validasi identitas; jika gagal ulangi/lapor UT-Daerah/UT-LLN; tutup rapi cek soal, skor, tutup SEB; cek KTPU terbaru, info resmi ut.ac.id).

### 7. Analisis video referensi (kenapa terasa "hidup")
- **Hasan Fuad (@fuadihassan)** "dibuat pakai Claude Code + ElevenLabs free", 1:11: maskot pixel yang ikut aksi dan berubah ekspresi; teks bergerak sinkron suara kata per kata dengan kotak penekanan; dunia satu layar Mac (menu bar, dock, jendela terminal/foto, notifikasi); gerak dengan kurva easing disengaja; warna latar berubah sesuai emosi (hijau tenang → merah klimaks); narasi cerita (masalah → usaha → twist, lompatan waktu "2 hari kemudian" dengan jam raksasa); visual bukti konkret.
- **Stickman Ships (@stickmanship)** 30 dtk, skill "anti-slop" oleh @miqdadbadjuber: satu set kamar malam datar, stickman putih polos, monitor jadi layar cerita, teks besar dengan label warna (OPEN A TERMINAL; DURING/WHILE YOU BUILD/AFTER; PASS/FAIL REPORT), alur edukasi masalah → langkah → hasil → penutup. Gaya ini sudah diterjemahkan ke scene `room`. Pertahankan Kang Catat (jangan meniru akun lain).
- Prinsip hidup: hook klimaks di detik pertama, satu dunia visual konsisten, maskot bereaksi di tengah layar, teks pop-in kata per kata, warna per emosi, CTA jelas (tombol, kursor tap, komentar), bukti visual konkret.

### 8. Pelajaran / kesalahan yang jangan diulang
- Naskah tidak cocok dengan video → Dika marah berulang. Selalu cocokkan isi suara dengan teks layar scene, hormati durasi, audit dulu, jangan perpanjang durasi video.
- Jangan kirim file yang tidak diminta; jangan kirim ulang file lama.
- Stray element/overlap di layout (Row kosong, label menimpa karakter, tag brand menimpa pill) — selalu lihat still sebelum render penuh; render still di frame dengan konten paling padat.
- CTA harus tampak jelas dan tidak tertutup maskot (tombol CTA kini digeser ke kanan di scene room).
- Hook harus kuat (rasa takut/rugi/klimaks), bukan pembukaan datar.
- Zip lama `paket-remotion-stickman.zip` kedaluwarsa; gunakan `paket-kang-catat.zip`.
- Transisi CircleReveal bisa terlihat seperti "bercak putih" di tengah frame; itu normal (reveal scene berikutnya).

### 9. TUGAS BERIKUTNYA
1. Audit zip (jalankan `npm install`, buka `npm run dev`, cek semua komposisi tidak error).
2. Render `VideoToken` versi baru, cek frame (hook, jam mundur, CTA), perbaiki kalau perlu, kirim ke Dika.
3. Tunggu/terima suara Dika: UAOP (8 file), cek-nilai (7), token (9) → taruh di `public/voice/`, render ulang dengan durasi dari audio, gabung hook UAOP (~34,5 dtk).
4. Tambah (opsional, bila diminta) scene `room` untuk topik lain, preset easing seragam, teks kata-per-kata sinkron audio, `desktop` lebih kaya.
5. Setelah video pertama dievaluasi, finalisasi skill "project remotion" dan "video-kang-catat" (kartu usulan skill sudah ditampilkan ke Dika).
6. Setiap video baru: pakai MASTER_PROMPT.md (user hanya mengisi TUJUAN VIDEO), isi dari blog/situs Dika, tanpa angka karangan.
