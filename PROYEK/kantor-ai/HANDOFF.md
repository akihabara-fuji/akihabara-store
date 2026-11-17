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
- Kurir setoran JALAN (17 Nov 07.27): bot Telegram @kantoraipeople_kurir_bot, workflow `kurir-setoran` di branch main (tiap 10 menit, bisa Run workflow manual), skrip alat/kurir_setoran.py, secret TELEGRAM_BOT_TOKEN, chat Dika terdaftar di alat/kurir_chat.txt. Rincian di SETORAN/README.md.
- Rencana lama kurir n8n tidak dipakai. Draf lama workflow order klien (4 jalur, ACC Dika) ada di PROYEK/kantor-ai/n8n/ dan DITUNDA: Dika bilang belum masuk ke klien.

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
- Buka halaman artefak di browser dan lihat langsung bahwa aturan 10 muncul di tombol prompt mulai (belum dicek, baru database yang dicek).
- Selaraskan data aset artefak dengan HANDOFF proyek lain begitu folder proyeknya terisi (catatanakademik, heyaipeople, konten-sosmed, video-remotion, bot-wa, akademik-ut, hermes-9router belum punya HANDOFF per 16 Nov 19.37).
- Cek ke server commit live yang sebenarnya untuk heyaipeople dan catatanakademik (ATURAN.md: heyaipeople f91310f; data aset artefak: eb002ef). Untuk portofolio, ikuti PROYEK/portofolio/HANDOFF.md.

## Menunggu dari Dika
- Setujui konektor Windsor dan Supermetrics di halaman artefak.
- Putuskan artefak tetap privat atau dipublikkan lagi (AI tidak bisa mengubah pengaturan berbagi). Selama privat, sesi di akun lain tidak bisa membuka tampilannya, hanya GitHub.
- Produk dan harga heyaipeople.site, izin membuka kunci kode Catatan Akademik (dari ATURAN.md).
