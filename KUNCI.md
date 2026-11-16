# Aset dan kunci

Format: aset | sumber | deploy | STATUS (bebas / DIPEGANG <nama sesi> · <tugas> · sejak <waktu>) | terakhir
Ambil kunci = commit + push sebelum kerja. Lepas kunci = isi 'terakhir', status jadi bebas.

- catatanakademik.com | sumber: akihabara-store · feat/koin (belum dicocokkan dengan server) | deploy: deploy/update-koin.sh, ada cek otomatis dan rollback | bebas | terakhir: 12 Nov, commit fcba462 | memegang pembayaran dan koin, menu atas tidak diubah
- Blog catatanakademik.com | unggah .md lewat menu blog, masuk draf | bebas | terbit 09.00 WIB tiap 2 hari setelah dicek satu per satu
- heyaipeople.site | branch heyaipeople | deploy/update-heyaipeople.sh | bebas | terakhir: 15 Nov 15.47, commit eb002ef (homepage jadi marketplace prompt foto AI + storyboard video) | cek commit terbaru dulu sebelum mengubah
- Blog heyaipeople.site | masih kosong, cara terbit belum dicatat | bebas
- Portofolio dikapriyadi.catatanakademik.com | branch portofolio-dika | deploy/update-portofolio.sh <commit>, naikkan versi tiap deploy | tercatat DIPEGANG "Claude (sesi 15 Nov sore)" untuk tautan sosmed di kontak; kemungkinan kunci lama, tanyakan Dika sebelum mengambil alih
- Akun sosmed | posting hanya setelah persetujuan Dika | tersambung: IG priyadi_dika dan catatanakademikut, TikTok Akihabara Fuji, FB Catatan Akademik, YouTube Catatan Akademik | belum tersambung: IG heyaipeople, 2 akun TikTok, 1 halaman Facebook | belum ada: kanal YouTube HeyAIPeople
- Kantor Ai People (artefak) | perubahan halaman langsung terbit | data prompt, bagan, jadwal, aset ada di database artefak
