---
name: "catatan-remotion"
description: "Panduan lengkap bikin video Remotion Dika (TikTok/Reels 1080x1920) bergaya hidup: aturan, stack gratis, komponen, kamera, suara, maskot, urutan prompt. Pakai saat bahas Remotion."
---

# Catatan Remotion

Tujuan: video vertikal 1080x1920, 30 fps, terasa hidup seperti video contoh (podcast diselingi motion graphic penjelas), murah dan cepat jadi. Satu-satunya skill Remotion umum: isi project-remotion sudah dilebur ke sini (riset GitHub 13 Nov 2026). Untuk video bersuara Rafiq, lanjut ke skill remotion-suara-rafiq.

## Aturan baku
1. DILARANG render sebelum Dika instruksikan. Bikin prompt satu per satu, tunggu ACC tiap prompt.
2. Zero cost: hanya GitHub open-source dan npm gratis. Lisensi MIT/Apache dicek dulu; tidak jelas = jangan dipakai.
3. Audit dulu, ubah kemudian. Jangan ubah file, commit, push, atau kirim file sebelum disetujui.
4. Hardware target: Intel i3, RAM 8 GB, Windows. Hindari 3D/WebGL/particle berat. Utamakan SVG, CSS, React, spring/interpolate bawaan.
5. Pasang skill/paket satu per satu hanya saat dibutuhkan.
6. Verifikasi sendiri: render 2-3 still penting dan lihat hasilnya sebelum lapor. Satu render penuh per permintaan, preview --scale=0.5 --concurrency=2.
7. Hemat token. Bahasa chat: gaul (gw/lo). Teks di dalam video/portofolio: baku.
8. Tandai tiap sumber: TERVERIFIKASI atau BELUM DIVERIFIKASI (terutama lisensi dan klaim fitur).

## Formula video hidup (dari video contoh Dika, 110 dtk)
- Dua shot bergantian tiap 5-8 dtk: talking head/footage dan layar putih bergrid berisi motion graphic.
- Judul dengan stabilo neon (hijau). Elemen berupa kartu stiker bertepi tebal, muncul bergantian (stagger), isi terisi bertahap, ada panah/kabel penghubung.
- Maskot kecil sebagai pemeran, bereaksi saat topik ganti.
- Mock UI dengan kursor dan teks diketik.
- Caption pil abu-abu per frasa di bawah.
- Angka besar saat klimaks ("100x", "#3").

## Stack dan sumber
| Kebutuhan | Sumber | Catatan |
|---|---|---|
| Fondasi | remotion-dev/skills: pasang HANYA remotion-best-practices | lisensi repo belum tertulis di halamannya, cek |
| Teks/animasi | av/remotion-bits (MIT, 42 bits) | tiru pola, jangan pasang semua |
| Efek/transisi | remotion-open-fx, @remotion/transitions | open-fx: cek ulang lisensi |
| Efek kecil | @remotion/motion-blur, noise, shapes, lottie | resmi, ringan |
| Variasi | reactvideoeditor/remotion-templates (MIT), Onda | Onda: lisensi BELUM DIVERIFIKASI |
| Caption kata per kata | @remotion/captions + template TikTok resmi (Whisper.cpp) | resmi |
| SFX | @remotion/sfx (whoosh dll) | cek atribusi per suara |
| Suara narasi | voipi (MIT, Edge TTS), Piper, Kokoro | Edge TTS endpoint tidak resmi; Kokoro belum mendukung Indonesia (BELUM DIVERIFIKASI). Paling aman: suara Dika sendiri; TTS untuk draf |

## Komponen yang dibangun sendiri (engine/)
theme.ts (warna, font, safe-area TikTok, gaya stiker), timing.ts, Highlighter (judul stabilo), StickerCard, Stagger, ArrowLine/Cable, CursorTyping, MockChat, CaptionPill, BigNumber/CountUp, GridBackground, Mascot (emotion, pose, talking), Camera 2D (zoom, pan, dolly, shake, rack-focus dengan spring/interpolate; bukan 3D), TransitionKit, SfxTrigger.
Struktur: src/engine, src/templates (props JSON -> video), src/data (konten JSON terpisah dari kode).

## Maskot
Punya: Claude (kotak dan cewek), ChatGPT, Gemini, Flow, stiker Dika. Kurang: n8n, WhatsApp, TikTok, Instagram (prioritas tinggi); Sheets/Looker Studio, Telegram, Remotion/CapCut (sedang). Pose baru: nunjuk kiri/kanan, kaca pembesar, grafik, gear, ngomong (2 pose mulut), jalan masuk/keluar. Lembar stiker harus dipotong jadi PNG transparan per stiker sebelum dianimasikan.

## Urutan prompt (tiap prompt ACC dulu)
1. Audit proyek lama (typo Root.tsx, staticFile), theme.ts, gaya stiker.
2. Komponen teks dan kartu.
3. Kamera 2D dan transisi.
4. Suara, caption otomatis, SFX.
5. Maskot: potong PNG, komponen Mascot.
6. Template video pertama (lihat skill catatan-analisa-sosmed).
7. Template video kedua: AI automation (WhatsApp -> AI -> database).

## Performa i3/8GB
concurrency=2, preview scale 0.5, h264 crf 23, tutup aplikasi berat, render per adegan bila > 30 dtk, hindari blur/shadow besar.

## Lisensi Remotion
Gratis untuk individu dan tim sampai 3 orang, termasuk komersial dan otomasi. Tim 4 orang ke atas wajib lisensi perusahaan berbayar. Cek ulang saat Remotion 5.0.

## Bug proyek lama yang diperbaiki lebih dulu
- Root.tsx di `drillbit-remotion-project` berakhir dengan teks nyasar `npm instal` setelah `);` sehingga build gagal. Hapus.
- Kedua proyek memakai `/${file}` alih-alih `staticFile()` bawaan Remotion. Ganti ke `staticFile` dari 'remotion'.
- Gaya, warna, dan durasi masih tertanam di Story.tsx; pindahkan ke theme.ts.

## Lokasi proyek lama
C:\Users\dikha\Downloads\drillbit-remotion-project\drillbit-remotion dan ...\drillbit-remotion-cat-mascot\drillbit-remotion (Remotion 4.0.539, belum ada node_modules).