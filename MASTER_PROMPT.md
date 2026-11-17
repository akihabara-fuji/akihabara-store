# MASTER PROMPT — Kang Catat Video (sekali tempel)

Tempel semua di bawah ke Claude / Gemini / ChatGPT / Flow. Ganti hanya baris **TUJUAN VIDEO**. Lampirkan `model-sheet.png` (opsional, biar karakter konsisten).

---
Kamu produser video vertikal 1080x1920 30fps untuk maskot **Kang Catat** (stickman kaos kuning UT #FFC20E, kepala bulat putih, garis hitam tebal #111, gaya paper/neo-brutalist, aksen merah #E5322D, biru #2F6BFF, hijau #12A672, oranye #E8825F, bg #F3F3F0).

**TUJUAN VIDEO:** `<<isi di sini, mis. "Cara daftar ulang UT, 30 detik, untuk mahasiswa baru">>`

Hasilkan HANYA 3 bagian ini:

### 1. File `src/data/video.json` (satu blok JSON valid)
Skema:
```
{"brand":{"name":"Kang Catat","handle":"@catatanakademik"},
 "gear":"togaglasses|toga|glasses|cap|headset|peci|pensil|none",
 "scenes":[ ...urutan scene... ]}
```
Tipe scene (semua boleh punya `"voice"` = teks suara, `"sec"` = durasi cadangan detik):
- `{"type":"hook","warn":"AWAS!","words":[{"t":"Jangan"},{"t":"gagal","hl":"red"}]}` — 2–2.5 dtk, kalimat rasa takut/rugi, sorot kata kunci (`hl`: red|blue|green|orange).
- `{"type":"list","pill":"Langkah 1","pillColor":"blue","title":"Masuk *akun*","accent":"blue","rows":[{"t":"Judul","sub":"keterangan","mark":"1"}]}` — maks 5 baris, `*kata*` = miring berwarna.
- `{"type":"stats","pill":"Fakta","title":"Angka *penting*","stats":[{"value":70,"label":"Lulus %"}]}` — maks 3 angka (0–100).
- `{"type":"vs","pill":"Bandingkan","left":{"title":"Salah","lines":["..."]},"right":{"title":"Benar","lines":["..."]}}`
- `{"type":"outro","pill":"Penutup","title":"Sampai *jumpa*","sticker":"Sukses!","rows":[...]}`
- `{"type":"intro"}` — perkenalan nama (pakai hanya di video pertama / seri).
Aturan: total 25–45 detik, 6–9 scene, scene pertama = hook, terakhir = outro + ajakan follow. Teks layar singkat (judul ≤ 4 kata, baris ≤ 5 kata). Fakta harus dari sumber resmi; kalau ragu, tulis "cek info resmi".

### 2. Naskah suara per scene (tabel: no, scene, teks)
Isi sama persis dengan `"voice"` di JSON. Tiap scene ≤ 500 karakter, tapi target 1–2 kalimat pendek (±2–3 detik bicara per 8–10 kata). Ejaan singkatan dipisah huruf agar TTS benar (SEB → "S E B"). Nada: santai, ramah, tegas di hook.

### 3. Perintah jalankan (Windows)
```
npm install
pip install edge-tts
python tools/tts.py src/data/video.json
npx remotion render src/index.ts Video out/video.mp4 --props=src/data/video.json
```
(Kalau pakai suara sendiri: rekam per scene, simpan sebagai `public/voice/1.mp3`, `2.mp3`, … sesuai urutan scene.)

**Aturan wajib:** biaya nol (tanpa layanan berbayar / model berat), hanya SVG/CSS/React/Remotion, laptop i3 8GB. Efek "3D" = pseudo-3D ringan (bayangan keras berlapis, parallax, perspektif CSS) — bukan WebGL. Jangan kloning suara orang lain. Jangan mengarang data.
---

## Catatan pemakaian
- Durasi tiap scene otomatis mengikuti panjang mp3 (+12 frame). Tanpa mp3 pakai `sec`.
- `Video` = komposisi JSON utama (data bawaan: UAOP). `VideoContoh` = contoh stats/vs/outro. `ModelSheet` = gambar model lengkap.
- Preview: `npm run dev`.
