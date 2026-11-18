---
title: Negative Prompt: Fungsi dan Cara Pakainya di Foto AI
slug: negative-prompt-fungsi-dan-cara-pakai
meta_title: Negative Prompt: Fungsi dan Cara Pakai
keyword: negative prompt
category: Prompt Foto
description: Negative prompt menjauhkan hasil foto AI dari hal yang tidak diinginkan. Pahami fungsi, contoh isi, dan alternatif bila alatmu tidak punya kolomnya.
tags: negative prompt, prompt foto, stable diffusion
cta_text: Lihat Prompt Foto
cta_url: /#prompt-foto
---

Negative prompt adalah teks tambahan yang memberi tahu generator gambar apa yang sebaiknya dihindari, bukan apa yang harus digambar. Fitur ini sering dipakai untuk mengurangi hasil buram, tulisan yang tidak diinginkan, atau detail yang terlihat aneh. Namun tidak semua alat punya kolomnya, dan cara kerjanya berbeda antar model. Artikel ini menjelaskan fungsi negative prompt, contoh isi yang masuk akal, kesalahan yang sering terjadi, dan cara menyiasatinya kalau alat yang kamu pakai tidak menyediakannya.

## Apa fungsi negative prompt

Dokumentasi Diffusers dari Hugging Face menjelaskan bahwa banyak pipeline generator gambar mengarahkan proses pembuatan gambar dengan guidance, dan di sana ada opsi negative prompt. Contoh yang diberikan dokumentasi itu memakai kata seperti "blurry, low quality, distorted" untuk menjauhkan hasil dari kesan buram, kualitas rendah, dan bentuk yang terdistorsi. Jadi fungsinya adalah menggeser hasil menjauh dari ciri-ciri tersebut, bukan menghapus elemen tertentu dengan pasti.

Perbedaan penting: prompt biasa menarik hasil ke arah yang kamu inginkan, sedangkan negative prompt mendorongnya menjauh dari arah yang tidak kamu inginkan. Keduanya dipakai bersama. Negative prompt tidak bisa menggantikan prompt yang jelas. Kalau prompt utamamu kabur, daftar larangan sepanjang apa pun tidak akan membuat hasilnya terarah.

## Tidak semua model mendukungnya

Di dokumentasi yang sama, negative prompt pada pipeline keluarga Stable Diffusion dipakai bersama pengaturan guidance_scale. Pada checkpoint yang lebih baru seperti Qwen-Image dan Flux, dokumentasi menyebut negative prompt baru berlaku bila true_cfg_scale lebih besar dari 1 dan negative prompt diisi. Artinya cara pakainya bergantung pada model dan pengaturan yang kamu jalankan.

Halaman dokumentasi teks-ke-gambar FLUX.2 dari Black Forest Labs yang kami buka tidak membahas negative prompt sama sekali. Contoh di halaman itu memakai kalimat deskriptif biasa dan prompt terstruktur dengan kunci seperti subjek, latar, pencahayaan, dan gaya. Jadi kalau kamu memakai alat berbasis FLUX lewat layanan pihak ketiga, jangan berasumsi kolom negative prompt ada atau berpengaruh. Cek dulu antarmuka dan dokumentasi alat yang kamu pakai.

## Contoh isi negative prompt yang masuk akal

Isi dengan hal yang benar-benar ingin kamu hindari dan sering muncul di hasilmu. Beberapa kelompok yang lazim dipakai:

- Kualitas: buram, resolusi rendah, terdistorsi.
- Elemen tambahan: tulisan, watermark, logo yang tidak diinginkan.
- Komposisi: terpotong, latar ramai, banyak objek mengganggu.

Tulis singkat dan spesifik. Daftar yang terlalu panjang justru bisa saling bertabrakan atau menyingkirkan hal yang sebenarnya kamu butuhkan. Mulai dari tiga sampai lima kata, lihat hasilnya, lalu tambah hanya jika ada masalah yang berulang.

## Kalau alatmu tidak punya kolom negative prompt

Panduan prompt dari Runway menyarankan memakai bahasa positif, yaitu menjelaskan apa yang kamu mau, bukan apa yang tidak kamu mau. Prinsip itu berguna sebagai cadangan. Ubah larangan menjadi deskripsi:

- Alih-alih "jangan ada orang di latar", tulis "jalan kosong di latar belakang".
- Alih-alih "tanpa tulisan", tulis "permukaan produk polos tanpa label".
- Alih-alih "jangan buram", tulis "fokus tajam pada subjek, latar sedikit kabur".

Dengan cara ini kamu memberi alat gambaran yang bisa digambar. Larangan hanya menyebut hal yang tidak boleh ada, sementara deskripsi positif mengisi ruang kosong itu dengan sesuatu yang konkret.

## Kesalahan umum saat memakai negative prompt

- Menyalin daftar panjang dari internet tanpa tahu fungsinya, lalu bingung kenapa gaya hasilnya berubah.
- Menaruh kata yang sebenarnya diinginkan, misalnya melarang "bayangan" padahal foto butuh kesan dimensi.
- Mengandalkan negative prompt untuk memperbaiki prompt utama yang kabur.
- Mengubah prompt utama dan negative prompt bersamaan sehingga tidak tahu mana yang berpengaruh.

Negative prompt tidak selalu berhasil menghilangkan elemen yang tidak diinginkan. Anggap ia sebagai pengarah tambahan, lalu periksa hasilnya. Kalau satu elemen terus muncul, ubah deskripsi di prompt utama atau coba sudut dan latar yang berbeda.

## Urutan kerja yang aman

Mulai dengan prompt utama yang rapi, seperti dibahas di [cara menulis prompt foto AI](/blog/cara-menulis-prompt-foto-ai-yang-konsisten). Lihat hasilnya, catat satu masalah yang paling sering muncul, baru tambahkan satu atau dua kata ke negative prompt. Terakhir, simpan kombinasi yang berhasil sebagai template. Kalau kamu ingin contoh prompt yang sudah rapi, lihat koleksi [prompt foto](/#prompt-foto).

## Sumber

- https://huggingface.co/docs/diffusers/main/using-diffusers/weighted_prompts
- https://docs.bfl.ai/flux_2/flux2_text_to_image.md
- https://academy.runway.com/prompt-guide

Panduan ini berisi saran praktis dari heyaipeople, yang tidak berafiliasi dengan penyedia alat atau situs yang dirujuk di bagian Sumber. Fitur dan kebijakan alat bisa berubah, jadi cek dokumen terbarunya sebelum dipakai.
