# SISTEM Remotion 3 Jalur (mulai 25 Nov 2026)

Satu sistem untuk semua video Remotion Dika. Dipakai oleh AI mana pun (Claude akun mana pun, GPT, Gemini, Hermes). Tujuannya: tiap video bisa dilanjut AI lain tanpa Dika menjelaskan ulang.

Urutan baca untuk sesi baru: `MULAI-REMOTION.md` → file ini → `video/<ID>/STATUS.md` video yang dikerjakan → `HANDOFF.md` (khusus seri BUILD WITH AI dan repo kang-catat-plus).

## 1. Tiga jalur

| | Pribadi | HeyAIPeople | CatatanAkademik |
|---|---|---|---|
| Tujuan | Siapa Dika (OB → trainer → supervisor → builder AI) dan cara dia bikin sistem | Etalase hasil jualan konten Remotion | Edukasi perkuliahan UT + layanan Catatan Akademik |
| Akun | IG @nextajalagi + TikTok pribadi | IG/TikTok HeyAIPeople + heyaipeople.site | IG @catatanakademikut + catatanakademik.com |
| Pilar | Perjalanan (Day N), behind the scenes sistem, BUILD WITH AI, portofolio | Cerita mistis berseri (Pasar Setan), AI Night Shift, Fakta vs Mitos, showcase jasa | Info UT (UAOP/UTM/UOLP, 1 video per skema), tips tugas, kalender akademik, promo layanan |
| Suara | Rekaman Dika sendiri | ElevenLabs (Rafiq; Finn, Baron, Zulfa) | ElevenLabs atau rekam sendiri |
| Gaya | Jujur, simpel, rekaman layar asli + teks besar | Mistis sesuai waktu cerita; feed white-black clean sampai 100 post | Faceless estetik, maskot slime biru |
| CTA | Follow perjalanan / tanya cara bikin sistem | Lanjut part berikut + "mau video kayak gini? DM / heyaipeople.site" | "ada pertanyaan? tanya di sini" → grup WA + catatanakademik.com |
| Drive | KONTEN KOROSAL/IG Pribadi | KONTEN KOROSAL/HeyAIPeople | KONTEN KOROSAL/CatatanAkademik |
| Kode ID | P-xx | H-xx | C-xx |

## 2. Ceklis kerja per video (11 butir, sama di dashboard dan STATUS.md)

| # | Butir | Pemegang | Gerbang |
|---|---|---|---|
| 1 | Prompt GPT | Claude | - |
| 2 | Naskah GPT | GPT (lewat Dika) | Dika kirim balik naskahnya |
| 3 | Naskah suara | Claude | - |
| 4 | Voice | Dika / Claude | Izin Dika sebelum klik Generate ElevenLabs |
| 5 | Mock ACC | Claude | **ACC Dika** |
| 6 | Render | Claude | - |
| 7 | Audit | Claude | - |
| 8 | Caption+CTA | Claude | - |
| 9 | Thumbnail | Claude / GPT desain | **ACC Dika** (cover dulu, baru isi) |
| 10 | Simpan | Claude | D:\FOLDER VIDEO KONTEN + Drive KONTEN KOROSAL |
| 11 | Siap posting | Dika | Dika posting sendiri. Tidak ada AI yang memposting. |

Detail tiap tahap:
- **Brief** (sebelum butir 1): jalur, topik, hook 3 detik, durasi, CTA. Tulis di STATUS.md.
- **Naskah**: tugas GPT. Claude hanya menulis prompt-nya. Naskah datang dari Dika sebelum mock dibuat.
- **Cek fakta**: wajib untuk CatatanAkademik (sumber resmi UT). Yang tak terverifikasi dibuang atau ditandai.
- **Naskah suara**: tugas Claude. Format `S01 | kalimat`. Satu klip suara per kalimat. Kalimat suara = caption layar kata per kata.
- **Audit sebelum kirim**: audio benar-benar ada, sinkron, tidak ada hening lebih dari 1,5 detik, resolusi 1080x1920, caption = suara, background sesuai waktu cerita, visual sesuai isi cerita, hook kuat, CTA benar.

## 3. Aturan tetap Remotion (dari Dika)

1. Naskah = GPT. Naskah suara = Claude. Video baru: tulis prompt GPT dulu, jangan langsung mock.
2. Mock dulu, tunggu ACC, baru render final. Yang sudah di-ACC terkunci.
3. ElevenLabs: jangan klik Generate tanpa izin. Pakai ulang audio yang sudah ada.
4. Cerita mistis: diceritakan seperti dongeng (referensi Kelir Malam), bukan narasi film horor. Animasi hidup, tegang, bikin penasaran. Part target ±2 menit.
5. Background mengikuti waktu cerita: malam = malam, siang = siang berkabut. Jangan satu backdrop untuk semua scene.
6. Jumpscare memenuhi layar, hantu terlihat penuh, ada suara teriakan. Hantu di kejauhan = siluet detail yang menyatu dengan latar.
7. Visual dan siluet harus sesuai isi cerita (contoh: Pasar Setan tidak memakai pocong).
8. Thumbnail satu series = satu template seragam (judul serif kecil + "part N", scene sepia berlapis), beda hanya scene/waktu.
9. Tidak ada yang memposting langsung. Semua dilaporkan ke Dika.
10. Material dari Dika diaudit dulu: ambil yang penting, buang duplikat dan isi kosong.

## 4. Aset yang sudah ada (laptop Dika, D:\FOLDER VIDEO KONTEN)

- Footage mistis 14 (`02_Footage_Mentah\Mistis`), musik 9 + SFX 21 (`03_Audio\...\Mistis`), background 20 + overlay 8 + font 4 + Karakter_Mistis.zip (`04_Aset_Grafis`).
- Mesin: repo Remotion kang-catat-plus (branch `remotion-kang-catat`, folder public/ ada di zip `BUILD-WITH-AI\SERAH-TERIMA\kang-catat-plus-source.zip`), `ai-video-editor` (Python, maskot slime), `audit360-remotion`.
- Katalog 24 gaya background/Remotion: lihat dashboard (bagian Katalog visual).
- Struktur folder kerja yang disarankan: `01_Ide_dan_Naskah\<jalur>`, `05_Proyek_Editing\<jalur>`, `06_Hasil_Render\Draft` lalu `Final`.

## 5. Serah terima saat limit habis (WAJIB)

Sebelum chat berhenti atau token hampir habis:
1. Perbarui `video/<ID>/STATUS.md`: centang butir yang selesai, isi "Terakhir dikerjakan", "Langkah berikutnya", "File", "Keputusan terkunci".
2. Perbarui baris video itu di `progres.json` (array `c` = 11 nilai true/false sesuai urutan ceklis).
3. Tambah satu baris di `LOG.md`.
4. Commit + push ke branch `kantor`.
5. AI yang tidak bisa git (GPT, Gemini): tulis blok UPDATE-REMOTION (format di MULAI-REMOTION.md). Dika menempelkannya ke dashboard atau ke Claude, lalu Claude yang commit.

## 6. Dashboard Dika

Studio Remotion Dika (artefak claude.ai): https://claude.ai/artifact/1kvdq7zRzcaoEAGmLJby3v
Isinya membaca dan menyimpan status yang sama dengan `progres.json`. Dika bisa mencentang, menulis catatan, menempelkan blok UPDATE-REMOTION dari AI lain, dan menyalin prompt serah terima per video.
Sheet "Peta Kerja 3 Jalur" (https://claude.ai/artifact/2tEfjrJrYymVEz3kxJvkP4) hanya bacaan awal, bukan sumber. Sumber = branch ini.
