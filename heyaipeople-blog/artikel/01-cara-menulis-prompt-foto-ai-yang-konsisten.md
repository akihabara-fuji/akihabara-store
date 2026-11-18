---
title: Cara Menulis Prompt Foto AI yang Konsisten dan Mudah Diulang
slug: cara-menulis-prompt-foto-ai-yang-konsisten
meta_title: Cara Menulis Prompt Foto AI yang Konsisten
keyword: cara menulis prompt foto ai
category: Prompt Foto
description: Cara menulis prompt foto AI dengan urutan tetap: subjek, aksi, latar, cahaya, gaya. Ada contoh sebelum-sesudah dan kebiasaan agar hasilnya bisa diulang.
tags: prompt foto, tutorial prompt, foto ai
cta_text: Lihat Prompt Foto
cta_url: /#prompt-foto
---

Kalau hasil foto AI kamu terasa acak, masalahnya sering bukan di alatnya, melainkan di cara menulis prompt foto AI yang berubah-ubah setiap kali dicoba. Prompt yang baik bukan yang paling panjang. Prompt yang baik punya urutan jelas, sehingga kamu bisa mengulangnya dan tahu bagian mana yang harus diubah saat hasilnya meleset. Artikel ini membahas kerangka sederhana, contoh sebelum dan sesudah, serta kebiasaan kecil yang membuat hasil lebih stabil dari satu percobaan ke percobaan berikutnya.

## Mulai dari tiga unsur dasar

Dokumentasi Diffusers dari Hugging Face menyebut tiga unsur inti prompt yang efektif. Pertama subjek, yaitu apa yang ingin dihasilkan, dan sebaiknya ditaruh di awal prompt. Kedua gaya, yaitu medium atau estetika yang diinginkan. Ketiga konteks, yang mencakup aksi, latar, dan suasana seperti pencahayaan. Dokumentasi itu ditulis untuk pustaka Diffusers, tetapi kerangkanya masuk akal dipakai di alat lain karena hampir semua generator gambar membaca teks dengan cara yang mirip.

Panduan dasar Midjourney juga menjelaskan bahwa prompt bisa sesingkat satu kata atau sepanjang frasa lengkap. Artinya tidak ada panjang wajib. Untuk pemula, titik awal yang aman adalah satu kalimat pendek yang memuat ketiga unsur tadi, lalu ditambah detail sedikit demi sedikit.

## Susun prompt dalam urutan tetap

Supaya mudah diulang, pakai urutan yang sama setiap kali: subjek, aksi atau pose, latar, cahaya, lalu gaya foto. Urutan tetap membantu dua hal. Kamu tidak lupa unsur penting, dan saat hasilnya kurang pas kamu langsung tahu bagian mana yang diganti.

Bandingkan dua prompt berikut.

- Prompt lemah: "cewek cantik di kafe".
- Prompt lebih jelas: "perempuan muda tersenyum sambil memegang cangkir kopi, duduk di dekat jendela kafe kecil, cahaya jendela lembut pagi hari, foto gaya majalah gaya hidup, warna hangat".

Prompt pertama menyerahkan hampir semua keputusan ke alat, sehingga hasilnya berbeda-beda setiap kali. Prompt kedua sudah menentukan subjek, aksi, latar, cahaya, dan gaya, jadi variasinya jauh lebih kecil.

## Tulis yang terlihat, bukan yang dirasakan

Kata seperti "estetik", "keren", atau "mewah" terdengar jelas bagi manusia, tetapi tidak memberi alat informasi yang bisa digambar. Ganti dengan hal yang benar-benar terlihat: warna, bahan, ekspresi, dan benda di sekitar subjek. "Mewah" bisa diganti menjadi "meja marmer putih, lampu gantung kuningan, taplak linen krem". "Sedih" bisa diganti menjadi "mata menunduk, hujan di jendela, cahaya kebiruan yang redup".

Kebiasaan ini juga memudahkan kamu menjelaskan hasil ke orang lain. Kalau prompt berisi hal yang bisa ditunjuk di gambar, memperbaikinya jadi lebih mudah karena kamu tahu persis elemen yang kurang.

## Ubah satu hal setiap percobaan

Saat hasil belum sesuai, godaan terbesar adalah mengganti banyak hal sekaligus. Akibatnya kamu tidak tahu perubahan mana yang membantu. Panduan prompt dari Runway, yang ditulis untuk pembuatan video, menyarankan memulai dengan prompt sederhana, menambah detail secara bertahap, memakai bahasa positif, dan menganggap pengulangan sebagai bagian dari proses kreatif. Prinsip itu sama berlakunya untuk foto.

Caranya praktis: tetapkan satu prompt dasar, ubah hanya satu unsur seperti cahaya atau sudut, lalu bandingkan hasilnya. Setelah tiga atau empat percobaan, kamu akan punya gambaran unsur mana yang paling berpengaruh pada gaya yang kamu cari.

## Simpan prompt yang berhasil sebagai template

Begitu ada prompt yang hasilnya bagus, jangan hanya menyimpan gambarnya. Simpan juga prompt-nya dan pisahkan jadi dua bagian. Bagian tetap berisi gaya dan cahaya yang menjadi ciri akunmu atau mereknya. Bagian berubah berisi subjek dan latar yang diganti sesuai kebutuhan konten.

Contohnya, bagian tetap bisa berbunyi "cahaya jendela lembut, warna hangat, foto gaya majalah gaya hidup", sedangkan bagian berubah diisi "secangkir teh di meja kayu" atau "roti panggang di piring keramik". Dengan cara ini, banyak gambar dari satu akun tetap terasa seperti satu keluarga visual. Untuk pembahasan cahaya lebih rinci, baca [pencahayaan dalam prompt foto AI](/blog/pencahayaan-dalam-prompt-foto-ai), dan untuk menyingkirkan elemen yang tidak diinginkan, baca [negative prompt dan cara memakainya](/blog/negative-prompt-fungsi-dan-cara-pakai).

## Kesalahan yang paling sering terjadi

- Mencampur beberapa gaya yang saling bertabrakan, misalnya "lukisan cat minyak" dan "foto dokumenter" dalam satu prompt.
- Menaruh subjek di akhir, padahal subjek sebaiknya disebut lebih dulu.
- Memakai kata abstrak tanpa deskripsi visual.
- Mengganti banyak unsur sekaligus lalu bingung mana yang berpengaruh.
- Tidak mencatat prompt yang berhasil, sehingga harus mengulang dari nol.

Kalau kamu ingin melihat contoh prompt yang sudah tersusun rapi dengan pola seperti di atas, koleksinya ada di bagian [prompt foto](/#prompt-foto).

## Sumber

- https://huggingface.co/docs/diffusers/main/using-diffusers/weighted_prompts
- https://docs.midjourney.com/docs/prompts
- https://academy.runway.com/prompt-guide

Panduan ini berisi saran praktis dari heyaipeople, yang tidak berafiliasi dengan penyedia alat atau situs yang dirujuk di bagian Sumber. Fitur dan kebijakan alat bisa berubah, jadi cek dokumen terbarunya sebelum dipakai.
