/* Draf soal latihan Kisi-kisi (konsep dasar tiap mata kuliah, ditulis sendiri). Dimasukkan sebagai DRAF: MK disembunyikan (tampil=0)
   sampai admin memeriksa soalnya lalu mencentang "tampil" di /admin/kisi. */
"use strict";
const S = (q, o, k, b) => ({ q, o, k, b });
const DRAF = [
  ["EMBS4429", [
    S("Karakteristik jasa yang membuat jasa tidak dapat dilihat, diraba, atau dicicipi sebelum dibeli disebut...", ["Intangibility", "Inseparability", "Variability", "Perishability"], 0, "Intangibility berarti tidak berwujud. Inseparability: produksi dan konsumsi terjadi bersamaan. Variability: mutu bisa berbeda. Perishability: tidak dapat disimpan."),
    S("Kamar hotel yang kosong semalam tidak bisa dijual lagi keesokan harinya. Hal ini menggambarkan karakteristik jasa...", ["Intangibility", "Variability", "Perishability", "Inseparability"], 2, "Perishability berarti jasa tidak dapat disimpan sebagai persediaan."),
    S("Proses membagi pasar menjadi kelompok konsumen dengan kebutuhan atau karakteristik berbeda disebut...", ["Positioning", "Segmentasi", "Targeting", "Promosi"], 1, "Segmentasi membagi pasar. Targeting memilih segmen sasaran. Positioning menentukan posisi di benak konsumen."),
    S("Urutan yang benar dalam proses STP adalah...", ["Targeting, segmentasi, positioning", "Positioning, segmentasi, targeting", "Segmentasi, targeting, positioning", "Segmentasi, positioning, targeting"], 2, "STP berjalan dari segmentasi, lalu targeting, lalu positioning."),
    S("Dalam bauran pemasaran jasa, unsur tambahan di luar 4P tradisional adalah...", ["Product, price, place", "People, process, physical evidence", "Promotion, price, product", "Place, promotion, price"], 1, "Pemasaran jasa memperluas 4P menjadi 7P: ditambah people, process, dan physical evidence."),
  ]],
  ["EMBS4430", [
    S("Analisis SWOT membagi faktor yang dianalisis menjadi faktor internal dan eksternal. Yang termasuk faktor internal adalah...", ["Peluang dan ancaman", "Kekuatan dan kelemahan", "Peluang dan kekuatan", "Ancaman dan kelemahan"], 1, "Kekuatan dan kelemahan berasal dari dalam perusahaan. Peluang dan ancaman berasal dari lingkungan luar."),
    S("Lima kekuatan (Five Forces) Porter dipakai untuk menganalisis...", ["Struktur persaingan dalam suatu industri", "Keuangan internal perusahaan", "Kinerja karyawan", "Budaya organisasi"], 0, "Five Forces menilai daya tarik dan intensitas persaingan industri."),
    S("Strategi yang ditetapkan pada tingkat seluruh perusahaan, termasuk pilihan bisnis yang dimasuki, disebut strategi tingkat...", ["Fungsional", "Bisnis", "Korporasi", "Operasional"], 2, "Strategi korporasi menentukan arah perusahaan secara keseluruhan. Strategi bisnis berlaku untuk satu unit bisnis, strategi fungsional untuk fungsi seperti pemasaran."),
    S("Pernyataan yang menggambarkan tujuan jangka panjang dan gambaran masa depan yang ingin dicapai organisasi disebut...", ["Visi", "Anggaran", "Prosedur", "Insentif"], 0, "Visi menggambarkan arah dan cita-cita jangka panjang. Misi menjelaskan cara mencapainya."),
    S("Tahap manajemen strategik yang menjalankan strategi menjadi tindakan nyata disebut...", ["Perumusan strategi", "Implementasi strategi", "Analisis lingkungan", "Penetapan visi"], 1, "Implementasi strategi mengubah rencana menjadi tindakan melalui struktur, sumber daya, dan program."),
  ]],
  ["EMBS4211", [
    S("Produktivitas dihitung sebagai...", ["Output dibagi input", "Input dibagi output", "Output dikurangi input", "Input ditambah output"], 0, "Produktivitas adalah perbandingan keluaran terhadap masukan yang dipakai."),
    S("Peramalan (forecasting) permintaan paling dibutuhkan untuk...", ["Merencanakan kapasitas dan persediaan", "Menentukan warna produk", "Mengganti nama perusahaan", "Menghitung pajak"], 0, "Ramalan permintaan menjadi dasar keputusan kapasitas, jadwal, dan persediaan."),
    S("Salah satu perbedaan utama operasi jasa dibanding manufaktur adalah jasa...", ["Dapat disimpan sebagai persediaan", "Diproduksi dan dikonsumsi bersamaan", "Selalu berwujud fisik", "Tidak melibatkan pelanggan"], 1, "Pada jasa, produksi dan konsumsi terjadi bersamaan sehingga pelanggan ikut terlibat dan jasa sulit disimpan."),
    S("Dimensi kinerja operasi yang menyangkut kecepatan menyelesaikan pesanan disebut...", ["Biaya", "Waktu atau kecepatan", "Fleksibilitas", "Lokasi"], 1, "Kecepatan atau waktu adalah salah satu prioritas bersaing selain biaya, kualitas, dan fleksibilitas."),
    S("Faktor yang paling umum dipertimbangkan dalam pemilihan lokasi usaha adalah...", ["Ketersediaan tenaga kerja, biaya, dan kedekatan dengan pasar", "Warna gedung", "Nama jalan", "Jumlah karyawan di kantor pusat"], 0, "Keputusan lokasi menimbang biaya, tenaga kerja, akses pasar, dan infrastruktur."),
  ]],
  ["EMBS4316", [
    S("Pelanggan ikut hadir dan terlibat dalam proses penyampaian jasa. Hal ini menunjukkan jasa bersifat...", ["Dapat disimpan", "Tidak terpisahkan dari konsumsi", "Seragam untuk semua pelanggan", "Selalu berwujud"], 1, "Karena produksi dan konsumsi terjadi bersamaan, pelanggan menjadi bagian dari proses jasa."),
    S("Antrean panjang di loket layanan paling terkait dengan keputusan operasi jasa tentang...", ["Kapasitas dan penjadwalan", "Warna logo", "Merek dagang", "Hak cipta"], 0, "Antrean timbul saat permintaan melebihi kapasitas, sehingga penjadwalan dan kapasitas perlu diatur."),
    S("Dimensi kualitas jasa dalam SERVQUAL yang berkaitan dengan kemampuan memberikan layanan sesuai janji secara akurat disebut...", ["Empati", "Keandalan (reliability)", "Berwujud (tangibles)", "Daya tanggap (responsiveness)"], 1, "Keandalan adalah kemampuan memenuhi janji dengan tepat dan konsisten."),
    S("Menerapkan satu standar layanan yang sama di banyak negara dengan sedikit penyesuaian lokal termasuk dalam strategi global yang cenderung...", ["Terpusat dan terstandar", "Sepenuhnya berbeda tiap negara", "Tanpa standar", "Tanpa pelanggan"], 0, "Strategi global terstandar menekankan keseragaman layanan lintas negara, sedangkan multidomestik menyesuaikan per negara."),
    S("Dampak teknologi informasi pada sektor jasa yang paling umum adalah...", ["Layanan mandiri dan layanan daring semakin luas", "Layanan berhenti total", "Pelanggan tidak lagi dibutuhkan", "Biaya selalu naik"], 0, "Teknologi memungkinkan layanan mandiri, otomatisasi, dan akses layanan tanpa tatap muka."),
  ]],
];
module.exports = { DRAF };
