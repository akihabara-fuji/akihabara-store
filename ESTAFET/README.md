# ESTAFET: alur produksi 4 tahap (Gemini, GPT, Flow, Claude)

Disetujui Dika 17 Nov 2026: estafet dipasang di papan GitHub ini (bukan Google Sheets). Satu proyek = satu folder `ESTAFET/<id>/` berisi `PROYEK.md`. Status di PROYEK.md adalah kuncinya: hanya pemegang status itu yang boleh mengerjakan proyek tersebut.

## Status dan pemegangnya

| Status | Pemegang | Yang dikerjakan | Lanjut ke |
|---|---|---|---|
| `LOCK_GEMINI` | Gemini | Riset data, brief klien/konten (tujuan, audiens, pesan utama, bukti, CTA) | `LOCK_GPT` |
| `LOCK_GPT` | GPT | Naskah lengkap, teks overlay, panduan carousel Canva, tabel SCENE berisi prompt Flow (format di bawah) | `LOCK_FLOW` |
| `LOCK_FLOW` | Dika di Google Flow | Jalankan prompt Flow per scene, simpan klip `scene_01.mp4`, `scene_02.mp4`, dst. di folder Drive proyek | `LOCK_CLAUDE_REMOTION` |
| `LOCK_CLAUDE_REMOTION` | Claude | Rakit video di Remotion (kang-catat-plus) dari klip + naskah + subtitle + branding | `READY_FOR_AUDIT` |
| `READY_FOR_AUDIT` | Claude | Audit teknis: file lengkap, durasi, resolusi 1080x1920, subtitle, audio, keamanan kode bila menyentuh situs | `MENUNGGU_ACC_DIKA` |
| `MENUNGGU_ACC_DIKA` | Dika | Lihat hasil, kirim `/acc <id>` ke bot kurir (atau bilang di chat Claude) | `ACC_DIKA` |
| `ACC_DIKA` | Claude | Deploy ke VPS / kirim ke klien / taruh di folder D: Dika. Posting sosmed tetap menunggu izin Dika per ATURAN.md | `COMPLETED` |

Mundur boleh: kalau cek silang GAGAL atau ada revisi, status dikembalikan ke tahap yang harus memperbaiki (misal `LOCK_GPT`).

## Cara memindahkan status
- GPT/Gemini: di blok SETORAN tambahkan satu baris `Estafet: <id> -> <STATUS_BARU>`. Kurir Telegram mencatat setoran dan memindahkan status.
- Dika lewat bot kurir:
  - `/baru <id> <judul>` membuat proyek baru di `LOCK_GEMINI`. id huruf kecil dan tanda hubung, misal `carousel-utm-01`.
  - `/flow <id>` artinya klip Flow sudah lengkap di Drive, status jadi `LOCK_CLAUDE_REMOTION`.
  - `/acc <id>` artinya Dika setuju hasil final, status jadi `ACC_DIKA`.
  - `/status` daftar menunggu cek silang dan giliran estafet.
- Claude: edit `PROYEK.md` langsung (baris Status + baris Riwayat), commit, push.

Semua pemindahan tercatat di bagian Riwayat PROYEK.md. STATUS.md menampilkan proyek per pemegang ("giliran siapa").

## Format tabel SCENE (wajib di setoran GPT)
Tulis di bagian Hasil setoran GPT, persis dengan judul kolom ini:

```
## SCENE
| no | durasi | teks_overlay | narasi | prompt_flow |
|---|---|---|---|---|
| 1 | 3 | JELAS LEBIH PENTING DARI PANJANG | Prompt 1.000 kata belum tentu lebih pintar. | Text-to-video: ... |
```

`durasi` dalam detik. `prompt_flow` diawali `Text-to-video:` atau `Image-to-video:` supaya Dika tahu mode Flow yang dipakai. Tabel ini yang dibaca `alat/buat_manifest.py` untuk menyusun `project_manifest.json` bagi Remotion.

## Video final
- `alat/buat_manifest.py <id> <folder-klip>` menyusun `project_manifest.json` dari tabel SCENE + daftar klip.
- Komposisi `EstafetVideo` (`alat/remotion-estafet/`) merakit klip, teks overlay, subtitle narasi, transisi, dan watermark heyaipeople.site. Komposisi ini dipasang ke repo Remotion kang-catat-plus; jangan membuat proyek Remotion baru (aturan PROYEK/video-remotion).
- Suara narasi (Rafiq, ElevenLabs) mengikuti alur di PROYEK/video-remotion/HANDOFF.md bila dipakai.
