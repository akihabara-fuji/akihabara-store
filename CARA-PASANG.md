# Cara pasang Mahyra Serv + Panel Admin di VPS Hostinger

Cukup **sekali** dipasang. Setelah itu semua perubahan (harga, produk, foto, jasa, FAQ, tema, mascot, nomor WA) dilakukan dari **https://domainlo/admin**. Nggak perlu buka VPS lagi.

---

## Isi folder

| File / folder | Fungsi |
|---|---|
| `server.js` | Server web + panel admin |
| `public/index.html` | Halaman web (tampilan) |
| `public/assets/` | Mascot (14 emote WebP) + CSS animasi |
| `public/uploads/` | Foto produk hasil upload dari admin (otomatis) |
| `admin/index.html` | Panel admin |
| `data/store.json` | **Semua data toko.** Diubah otomatis dari admin |
| `data/backups/` | Cadangan otomatis tiap simpan (40 terakhir) |
| `.env.example` | Contoh file password admin |
| `deploy/nginx-mahyra.conf` | Potongan config Nginx |

---

## Langkah pasang (copy-paste di terminal VPS)

> Login VPS: buka hPanel Hostinger → VPS → **Browser terminal**, atau `ssh root@IP-VPS`.

### 1. Pastikan Node.js 18+ dan PM2 ada
```bash
node -v        # harus v18 ke atas. Kalau belum ada:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
npm i -g pm2
```

### 2. Upload folder ini ke VPS
Upload `mahyra-serv.zip` ke `/var/www/` (lewat File Manager hPanel atau `scp`), lalu:
```bash
cd /var/www && unzip mahyra-serv.zip -d mahyra-serv && cd mahyra-serv
npm install --omit=dev
```

### 3. Bikin password admin
```bash
cp .env.example .env
nano .env
```
Ganti `ADMIN_PASSWORD=` dengan password panjang (minimal 10 karakter). Simpan: `Ctrl+O`, Enter, `Ctrl+X`.

### 4. Jalankan (otomatis hidup lagi kalau VPS restart)
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # jalankan perintah yang dia tampilkan
```
Cek: `curl -I http://127.0.0.1:3200` → harus `200 OK`.

### 5. Sambungkan ke domain (Nginx)
Buka config domain lo:
```bash
nano /etc/nginx/sites-available/sahabatanalisis.tech     # sesuaikan nama file
```
Di dalam blok `server { ... }` yang `listen 443`, ganti blok `location / { ... }` yang lama dengan isi `deploy/nginx-mahyra.conf`.

⚠️ **Sahabat Nugas di `/app` jangan dihapus.** Biarkan blok `location /app` yang lama tetap ada.

```bash
nginx -t && systemctl reload nginx
```

### 6. Selesai
- Web: `https://domainlo/`
- Admin: `https://domainlo/admin` → masukkan password dari langkah 3.

---

## Pemakaian sehari-hari (dari HP juga bisa)

- **Produk** → tambah, edit harga, upload foto (otomatis dikompres ke WebP), sembunyikan, urutkan, hapus.
- **Jasa** → tambah/edit layanan kebersihan, pilih ikon & warna.
- **FAQ** → ketik langsung, tersimpan otomatis.
- **Tampilan** → ganti tema (Violet, Sakura, Ocean, Matcha, Sunset, Monokrom), warna aksen custom, mascot on/off, teks hero dan teks berjalan.
- **Pengaturan** → nomor WA, link analisa, kategori produk, **Riwayat** (salah edit → klik *Pulihkan*).

Indikator di pojok kanan atas: 🟢 *Tersimpan*, 🟡 *Menyimpan…*, 🔴 *Gagal simpan*.

---

## Kalau ada masalah

| Gejala | Solusi |
|---|---|
| Admin bilang "ADMIN_PASSWORD belum diatur" | Isi `.env`, lalu `pm2 restart mahyra-serv` |
| Upload foto gagal "413" | `client_max_body_size 10m;` belum ada di Nginx |
| Login terus mental | Web harus https. Untuk tes di laptop pakai `SECURE_COOKIE=false` |
| Salah password 5x | Terkunci 15 menit (keamanan). Tunggu, atau `pm2 restart mahyra-serv` |
| Lihat log error | `pm2 logs mahyra-serv` |

## Update kode di kemudian hari
Timpa `server.js`, `public/index.html`, `admin/index.html` saja, lalu `pm2 restart mahyra-serv`.
**Jangan timpa folder `data/` dan `public/uploads/`**, karena di situ data dan foto lo.

## Backup manual (opsional, disarankan seminggu sekali)
```bash
cd /var/www/mahyra-serv && tar czf ~/backup-mahyra-$(date +%F).tgz data public/uploads
```
