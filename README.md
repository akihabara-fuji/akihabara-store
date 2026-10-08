# Akihabara Store — panduan pasang

Isi paket ini:

- **Web toko + portofolio** di `https://domain-lo/`
- **Panel admin** di `https://domain-lo/admin`. Masuknya pakai password. Di sini lo bisa pilih tema (8 preset gaya 21st.dev), ganti warna dan font, ubah teks, foto, produk, harga, karya, pembayaran, dan susunan halaman. Pratinjau langsung muncul di sebelah kanan.
- **Tema bersama.** Web lain (Sahabat Nugas, web analisa, dll) bisa ikut tema yang sama.
- **Pilihan tampilan buat pengunjung.** Lewat tombol palet di header toko (bisa diatur tema mana yang boleh dipilih).

Semua pengaturan tersimpan di `data/site.json`, dan foto tersimpan di folder `uploads/`. Tiap kali lo klik Simpan, server otomatis bikin cadangan. Isinya bisa dibalikin dari tab **Riwayat** di admin.

---

## 1. Siapkan VPS (sekali aja)

Buka **Terminal** VPS dari panel Hostinger (menu VPS → Browser terminal), lalu jalankan:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs unzip nginx
npm install -g pm2
```

Kalau Node.js, Nginx, dan PM2 udah ke-install (misalnya buat Sahabat Nugas), langkah ini boleh dilewati.

## 2. Upload paket ke VPS

Dari laptop, buka **PowerShell** di folder tempat file zip ini berada, lalu jalankan (ganti `IP_VPS` sama IP VPS lo):

```powershell
scp akihabara-store.zip root@IP_VPS:/root/
```

Habis itu, balik ke terminal VPS:

```bash
cd /root
unzip akihabara-store.zip -d akihabara-store
cd akihabara-store
npm install --omit=dev
# folder dist/ sudah berisi tampilan yang siap pakai, nggak perlu build lagi
cp .env.example .env
nano .env
```

Di dalam `nano`, ganti dua baris ini:

- `ADMIN_PASSWORD=` → password admin lo (minimal 8 karakter)
- `SESSION_SECRET=` → ketik huruf/angka acak yang panjang (minimal 16 karakter)

Simpan dengan **Ctrl+O**, tekan Enter, lalu keluar dengan **Ctrl+X**.

## 3. Nyalakan web

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

Cek apakah web udah jalan: `curl -I http://localhost:3100` harus menjawab `200 OK`.

> Kalau port 3100 udah dipakai web lain, ganti `PORT=` di `.env` (misalnya 3200). Angka yang sama juga harus diganti di `deploy/nginx.conf`.

## 4. Sambungkan domain

1. Di pengaturan DNS domain lo (Hostinger → Domain → DNS), tambahkan record **A**:
   - Name: `toko` (atau nama lain yang lo mau)
   - Value: IP VPS lo
2. Di terminal VPS (ganti `toko.domainlo.com` di perintah pertama sama domain asli lo):

```bash
sed -i 's/toko.domainlo.com/toko.DOMAIN-LO.com/' deploy/nginx.conf
cp deploy/nginx.conf /etc/nginx/sites-available/akihabara-store
ln -s /etc/nginx/sites-available/akihabara-store /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d toko.DOMAIN-LO.com
```

Perintah `certbot` bikin web lo bisa dibuka lewat **https** (gembok aman).

Setelah itu buka `https://toko.DOMAIN-LO.com/admin`, lalu masuk pakai password tadi.

---

## Menyambungkan web lain ke tema yang sama

Di web lain (misalnya Sahabat Nugas), tambahkan baris ini sebelum `</body>`:

```html
<script src="https://toko.DOMAIN-LO.com/theme.js" data-switcher></script>
```

- `data-switcher` memunculkan tombol **Tampilan** di pojok kanan bawah, buat pengunjung milih tema. Hapus atribut itu kalau nggak mau ada tombolnya.
- Warna web itu baru ikut berubah kalau CSS-nya memakai variabel ini:

| Variabel | Isi |
|---|---|
| `var(--afs-bg)` | warna background |
| `var(--afs-surface)` | warna kartu/kotak |
| `var(--afs-ink)` | warna teks utama |
| `var(--afs-muted)` | warna teks kecil |
| `var(--afs-accent)` | warna tombol |
| `var(--afs-on-accent)` | warna teks di atas tombol |
| `var(--afs-line)` | warna garis |
| `var(--afs-radius)` | lengkungan sudut |
| `var(--afs-font-display)` | font judul |

Buka `https://toko.DOMAIN-LO.com/contoh-tema` buat lihat contohnya. Kalau mau, kirim kode CSS web Sahabat Nugas ke Claude biar warnanya diganti ke variabel di atas.

Web yang nggak pakai JavaScript bisa pakai versi CSS-nya:

```html
<link rel="stylesheet" href="https://toko.DOMAIN-LO.com/theme.css">
```

---

## Perintah yang sering dipakai

| Perlu apa | Perintah |
|---|---|
| Lihat status web | `pm2 status` |
| Lihat error | `pm2 logs akihabara-store` |
| Restart web | `pm2 restart akihabara-store` |
| Ganti password admin | `nano .env`, lalu `pm2 restart akihabara-store` |
| Backup semua data | salin folder `data/` dan `uploads/` |

---

## Kalau mau ubah kode tampilan (opsional)

Kode sumber ada di folder `web/` (React + Tailwind + framer-motion). Komponen efek ala 21st.dev ada di `web/src/components/magic/effects.jsx`.

```bash
cd web
npm install
npm run dev      # pratinjau di http://localhost:5173 (server harus jalan di port 3100)
npm run build    # hasil ke ../dist, lalu: pm2 restart akihabara-store
```

Kalau lo nemu komponen dari 21st.dev yang pengen dipakai, kirim kodenya ke Claude, nanti dipasang ke halaman.

## Tema & font dari admin

Di admin, tab **Tema**:
- 12 preset siap pakai, 7 font judul, 3 font tulisan biasa.
- **Tempel kode tema**: tempel CSS dari 21st.dev / tweakcn / shadcn (`:root { --background: ...; --primary: ...; }`) atau JSON warna. Format hex, hsl, rgb, dan oklch dibaca otomatis. Kalau ada versi `.dark`, bisa pilih versi gelap atau terang.
- **Font Google Fonts sendiri**: ketik nama fontnya (misal Poppins).
