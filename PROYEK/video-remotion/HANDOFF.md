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
