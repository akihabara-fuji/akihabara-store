---
name: "remotion-suara-rafiq"
description: "Alur bikin video Remotion lengkap dengan suara Rafiq (ElevenLabs) sekali jalan: kunci naskah, satu generate, potong per scene, sinkron, render."
---

# Remotion + suara Rafiq (sekali jalan)

Tujuan: video jadi dengan suara tanpa generate ulang berkali-kali (hemat kredit ElevenLabs, 1 karakter = 1 kredit) dan tanpa render berulang.

## Urutan wajib
1. **Kunci storyboard dan naskah dulu.** Semua scene di JSON (src/data/<nama>.json), teks suara per scene dengan tag ekspresi v4 ([confident], [curious], [serious], [casual], [sad], [calm], [tired], [chuckles], [warmly], [upbeat], [short pause]). Tanpa tanda hubung di tag. Ejaan bunyi: Klod, Flo, Cet Ji Pi Ti, Jemini, Kanva, Kep Kat, Eleven Labs. Tampilkan still dan minta ACC naskah sebelum lanjut.
2. **Satu kali generate** suara Rafiq (model eleven_v4) dalam satu blok naskah. Coba MCP ElevenLabs dulu; kalau 'Free generations are busy', pakai web app ElevenLabs di built-in browser (Dika sudah login). Jangan klik Regenerate. Take kedua boleh gratis tapi jangan diandalkan.
3. **Terima mp3** dari Dika (unggah ke chat). Cek durasi dengan ffprobe.
4. **Potong per scene**: ffmpeg silencedetect (noise -30dB, d 0.12) lalu petakan kalimat ke scene lewat jumlah kalimat per scene di naskah. Potong di tengah jeda antar-scene, simpan ke public/voice-<nama>/1..N.mp3. Jangan percepat suara.
5. **Pasang**: set `"voiceDir": "voice-<nama>"` di JSON. calcGeneric menghitung durasi scene = durasi audio + PAD, jadi total video ngikutin suara.
6. **Sinkron chat/animasi**: untuk scene grup, set tiap `at` (frame) = (waktu mulai kalimat bot di audio - awal scene) * 30. Buka file (`open`) setelah kalimat Dika.
7. **Render sekali** hanya setelah ACC eksplisit: `npx remotion render src/index.ts <Comp> out/<nama>.mp4 --browser-executable=... --chrome-mode=headless-shell --concurrency=2 --crf=23` (background, poll).
8. **Verifikasi**: ffprobe (ada stream aac), volumedetect, board 6 still. Kirim dengan SendUserFile. Sebut yang belum diverifikasi (pencocokan kalimat ke chat adalah tebakan dari jeda).

## Aturan
- Zero cost. Jangan karang metrik. Jawab pendek, bahasa gaul (gw/lo) di chat; teks di video baku.
- Perubahan kecil ejaan/intonasi digabung dulu, baru generate ulang sekali.
- Caption pil mengikuti field `caption` di JSON; samakan dengan kalimat suara sebelum render.