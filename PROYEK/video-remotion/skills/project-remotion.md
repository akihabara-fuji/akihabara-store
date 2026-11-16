---
name: "project-remotion"
description: "Panduan kerja Remotion Motion Engine (TikTok/Reels/Shorts) berbiaya nol: audit dulu, stack ringan untuk i3/8GB, tahapan build, dan larangan. Pakai saat bahas proyek Remotion."
---

# Project Remotion — Motion Engine Zero Cost

Tujuan: engine motion graphics reusable untuk video vertikal 1080x1920, 30 fps, agar konten cepat jadi dan cepat menghasilkan pemasukan. Bukan membangun teknologi demi teknologi.

## Aturan baku (jangan dilanggar)
1. ZERO ADDITIONAL COST: dilarang menyarankan layanan/API/subscription/template berbayar. Jangan beli atau aktifkan apa pun.
2. Hanya GitHub open-source dan npm gratis. Cek lisensi (MIT/Apache) sebelum dipakai; lisensi tidak jelas = jangan dipakai.
3. Audit dulu, ubah kemudian. Jangan rebuild yang sudah jalan. Jangan ubah file sebelum hasil audit dan rencana disetujui Dika.
4. Target hardware: Intel i3, RAM 8 GB, Windows. Hindari dependency berat (three.js, mapbox, cesium, particle/WebGL) kecuali benar-perlu.
5. Utamakan SVG, CSS, React, spring/interpolate native Remotion.
6. Jangan pasang semua skill sekaligus. Pasang satu per satu, hanya saat dibutuhkan.
7. Jangan commit/push/deploy atau kirim file yang tidak diminta. Info dulu, tunggu persetujuan.
8. Verifikasi sendiri: render 2-3 frame penting (still) dan lihat hasilnya sebelum lapor. Satu render penuh per permintaan.
9. Hemat token: jawab ringkas, jangan jelaskan berlebihan.

## Lisensi Remotion
Gratis untuk individu dan tim sampai 3 orang, termasuk komersial dan otomasi. Kalau tim/kolaborasi sudah 4+ orang, wajib lisensi perusahaan berbayar. Cek ulang saat Remotion 5.0 (lisensi akan berubah sedikit).

## Lokasi proyek yang ada (Windows)
- `C:\Users\dikha\Downloads\drillbit-remotion-project\drillbit-remotion` — versi data-story (Story.tsx 114 baris).
- `C:\Users\dikha\Downloads\drillbit-remotion-cat-mascot\drillbit-remotion` — versi motion-comic 6 panel (Story.tsx 32 baris).
- Keduanya: Remotion 4.0.539 (lock), React 18, belum ada node_modules, tanpa audio, tanpa font lokal.

## Temuan audit yang harus diperbaiki lebih dulu
- Root.tsx proyek `drillbit-remotion-project` berakhir dengan teks nyasar `npm instal` setelah `);` — ini membuat build gagal. Hapus.
- Kedua proyek memakai `/${file}` (atau staticFile buatan sendiri) alih-alih `staticFile()` bawaan Remotion. Bisa jalan di Studio tapi berisiko gagal saat render. Ganti ke `staticFile` dari 'remotion'.
- Semua gaya/warna/durasi tertanam di Story.tsx, belum ada theme, belum ada komponen reusable.
- Gambar scene dipakai `objectFit: cover` + zoom scale; cek ukuran gambar sesuai 1080x1920.

## Stack yang dipilih (ringan, gratis)
Inti: `remotion`, `@remotion/cli`, React 18 (sudah ada). Tambahan resmi kecil saat dibutuhkan:
- `@remotion/transitions` (TransitionSeries, fade/slide/wipe)
- `@remotion/google-fonts` (font; atau font lokal di public/)
- `@remotion/captions` (hanya bila butuh subtitle per kata)
Komponen sendiri (SVG/CSS) untuk: AnimatedText (fade/slide/word-by-word, typewriter), CountUp, ProgressBar, Callout/Card, Ken-Burns panel, LowerThird, Background gradient, SafeArea.
Referensi (tiru polanya, bukan pasang semuanya): `remotion-bits` (MIT), `Curvable/motion` (MIT), `remotion-open-fx` (MIT). `remocn` dan `clippkit`: lisensi belum terverifikasi, jangan dipakai sebelum dicek.
Skill resmi `remotion-dev/skills`: pasang HANYA `remotion-best-practices` (satu skill, bukan semua) bila perlu.

## Struktur engine (target)
```
src/
  engine/theme.ts        warna, font, ukuran, safe-area TikTok
  engine/timing.ts       helper spring/interpolate/durasi
  engine/components/     AnimatedText, CountUp, Card, ProgressBar, KenBurns, LowerThird, Background
  engine/scenes/         HookScene, ListScene, StatScene, QuoteScene, CtaScene
  templates/             1 file per format video (props JSON -> video)
  data/                  konten per video (JSON), terpisah dari kode
```
Ide: video baru = isi JSON + pilih template, tanpa menulis ulang kode.

## Tahapan
0. Audit ulang (struktur, versi, hardware, skill terpasang) — selesai sebagian; hardware Dika perlu dikonfirmasi.
1. Perbaiki bug minimal di proyek lama (typo Root.tsx, staticFile), `npm install`, render still untuk tes.
2. Buat `engine/` (theme + 5-6 komponen) tanpa mengubah tampilan proyek lama.
3. Port satu video lama ke template engine sebagai bukti; bandingkan hasil.
4. Template konten yang menghasilkan uang cepat: hook + 3 poin + CTA (promosi layanan Catatan Akademik, edukasi UT, seri 'Day N').
5. Render batch kecil, voice-over Dika sendiri, finishing di CapCut (gratis).

## Performa i3/8GB
- Render dengan `--concurrency=2`, `--scale=0.5` untuk preview, codec h264, crf 23.
- Tutup browser/aplikasi berat saat render. Jangan jalankan Studio dan render bersamaan.
- Hindari blur/shadow besar dan banyak layer; gambar maksimal ~1080x1920.
- Render per adegan bila durasi > 30 detik.

## Format laporan
Singkat: temuan, keputusan, langkah berikut. Tunggu ACC Dika sebelum mengubah file.