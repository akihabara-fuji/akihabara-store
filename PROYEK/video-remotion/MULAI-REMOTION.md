# Prompt pembuka proyek Remotion (tempel ke AI mana pun)

Dika cukup menempel salah satu blok di bawah ke chat baru, lalu mengganti `<ID>`.
Daftar ID video ada di `progres.json` dan di dashboard.

## A. Untuk Claude (bisa git / GitHub)

```
Kamu lanjut proyek video Remotion Dika. Papan kerja: repo akihabara-fuji/akihabara-store, branch kantor.
1. Tarik branch kantor. Baca berurutan: README.md (alur sesi), ATURAN.md, PROYEK/video-remotion/SISTEM.md, PROYEK/video-remotion/video/<ID>/STATUS.md.
2. Catat chat ini di CHAT.md (meja: Remotion), commit, push.
3. Lanjutkan dari "Langkah berikutnya" di STATUS.md. Jangan mulai dari awal, jangan ulang yang sudah dicentang.
4. Tiap butir selesai: centang di STATUS.md dan progres.json, commit, push. Kalau dashboard Studio Remotion Dika bisa kamu akses (db artefak 1kvdq7zRzcaoEAGmLJby3v), samakan juga isinya.
5. Sebelum limit habis: jalankan "Serah terima" di SISTEM.md bagian 5.
Chat dengan Dika: Indonesia santai (gw/lo), pendek, inti dulu.
```

## B. Untuk GPT, Gemini, atau AI tanpa git

```
Kamu bantu proyek video Remotion Dika. Jangan minta dia menjelaskan ulang. Baca dulu:
- Sistem: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/PROYEK/video-remotion/SISTEM.md
- Status video: https://raw.githubusercontent.com/akihabara-fuji/akihabara-store/kantor/PROYEK/video-remotion/video/<ID>/STATUS.md
Kerjakan bagianmu saja (GPT: naskah per scene; Gemini: riset/brief). Kalau link tidak bisa dibuka, minta Dika menempelkan isinya, jangan menebak.
Akhiri jawabanmu dengan blok ini persis (Dika akan menempelnya ke dashboard):

UPDATE-REMOTION
id: <ID>
selesai: <nama butir ceklis yang selesai, pisah koma, mis. Naskah GPT>
lanjut: <butir berikutnya>
catatan: <satu kalimat, file/link hasil>
```

## C. Untuk Hermes (agent di laptop)

```
Proyek Remotion Dika. Repo akihabara-fuji/akihabara-store branch kantor (git pull dulu).
Baca PROYEK/video-remotion/SISTEM.md lalu PROYEK/video-remotion/video/<ID>/STATUS.md.
Kerjakan langkah berikutnya saja. File kerja di D:\FOLDER VIDEO KONTEN. Setelah selesai perbarui STATUS.md + progres.json, tambah baris LOG.md, commit, push.
```

## Nama butir ceklis (dipakai di blok UPDATE-REMOTION)

Prompt GPT, Naskah GPT, Naskah suara, Voice, Mock ACC, Render, Audit, Caption+CTA, Thumbnail, Simpan, Siap posting
