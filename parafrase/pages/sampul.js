/* Sampul dan template tugas UT: isi formulir -> pratinjau halaman A4 -> unduh Word atau cetak PDF.
   Format mengikuti template Word UT (tugas tutorial, TMK/BJT, UAS/THE/BJU, analisis jurnal, proposal penelitian) dan sampul makalah.
   Semua diproses di browser. Isian disimpan di perangkat ini saja. */
(function () {
  "use strict";
  var KEY = "ca-sampul-v1", W = window.CAW;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return W.esc(s); }

  var now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  /* Masa UT: Jul-Des = tahun.2 (tahun/tahun+1); Jan-Jun = tahun.1 (tahun-1/tahun). Bisa diubah di "Pengaturan lain". */
  var DEF = { nama: "", nim: "", prodi: "", fakultas: "", upbjj: "", mkKode: "", mkNama: "", kelas: "", dosen: "", judul: "", ke: "1", nSoal: "3",
    tglLahir: "", hariUjian: "", kota: "", idTutor: "",
    tahun: m >= 7 ? y + "/" + (y + 1) : (y - 1) + "/" + y, masa: m >= 7 ? y + ".2" : y + ".1", tahunCover: String(y),
    kementerian: "KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI",
    optLogo: true, optLembar: true, optFak: true, optUpbjj: true, optKelas: true, optKesimpulan: false };

  /* Contoh FIKTIF supaya orang melihat bentuk isian. */
  var CONTOH = { nama: "Rina Putri Lestari", nim: "051234567", prodi: "Manajemen", fakultas: "Ekonomi dan Bisnis", upbjj: "Jakarta", mkKode: "EKMA4115", mkNama: "Pengantar Akuntansi", kelas: "Pokjar Jakarta Barat", dosen: "Nama Tutor, M.M.", judul: "Analisis Penerapan Akuntansi Akrual pada UMKM", ke: "1", nSoal: "3", tglLahir: "01/01/2000", hariUjian: "Sabtu, 12 Desember 2026", kota: "Jakarta", idTutor: "" };

  var FIELDS = {
    nama: { l: "Nama lengkap", ph: "Sesuai data UT" }, nim: { l: "NIM", ph: "051234567" },
    prodi: { l: "Program studi", ph: "Manajemen" }, fakultas: { l: "Fakultas", ph: "Ekonomi dan Bisnis" },
    upbjj: { l: "UPBJJ-UT", ph: "Jakarta" }, mkKode: { l: "Kode mata kuliah", ph: "EKMA4115" }, mkNama: { l: "Nama mata kuliah", ph: "Pengantar Akuntansi" },
    kelas: { l: "Kode kelas / pokjar", ph: "Kode kelas atau nama pokjar" }, dosen: { l: "Tutor / dosen pengampu", ph: "Nama beserta gelar" },
    judul: { l: "Judul", ph: "Judul tugas / makalah / penelitian" }, ke: { l: "Tugas ke-", sel: ["1", "2", "3"] },
    nSoal: { l: "Jumlah soal pada lembar jawaban", sel: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
    tglLahir: { l: "Tanggal lahir", ph: "DD/MM/YYYY" }, hariUjian: { l: "Hari / tanggal UAS THE", ph: "Sabtu, 12 Desember 2026" },
    kota: { l: "Kota (untuk surat pernyataan)", ph: "Jakarta" }, idTutor: { l: "ID Tutor", ph: "Boleh dikosongkan" }
  };
  var TYPES = {
    tutorial: { n: "Tugas Tutorial", d: "Sampul dan lembar jawaban tugas tutorial (Tugas 1, 2, 3).", f: ["nama", "nim", "prodi", "fakultas", "upbjj", "mkKode", "mkNama", "kelas", "ke", "nSoal"], o: ["optFak", "optUpbjj", "optKelas", "optKesimpulan"], file: "Tugas" },
    tmk: { n: "TMK (Buku Jawaban Tugas)", d: "Sampul BJT untuk Tugas Mata Kuliah (TMK) dan lembar jawabannya.", f: ["nama", "nim", "mkKode", "mkNama", "upbjj", "ke", "nSoal"], o: [], file: "TMK" },
    uas: { n: "UAS / THE (BJU)", d: "Sampul Buku Jawaban Ujian, surat pernyataan kejujuran akademik, dan lembar jawaban.", f: ["nama", "nim", "tglLahir", "mkKode", "mkNama", "prodi", "fakultas", "upbjj", "hariUjian", "kota", "nSoal"], o: [], file: "BJU" },
    jurnal: { n: "Analisis Jurnal", d: "Sampul tugas analisis jurnal dan lembar jawaban (identitas, ringkasan, analisis, daftar pustaka).", f: ["judul", "nama", "nim", "dosen", "mkKode", "mkNama", "prodi", "fakultas", "upbjj", "kelas", "ke"], o: [], file: "Jurnal" },
    proposal: { n: "Proposal Penelitian", d: "Sampul, daftar isi, ringkasan, dan kerangka Bab I sampai III untuk Metode Penelitian.", f: ["judul", "nama", "nim", "dosen", "idTutor", "prodi"], o: [], file: "Proposal" },
    makalah: { n: "Makalah / Tugas Mandiri", d: "Sampul makalah atau tugas mandiri (judul, mata kuliah, dosen, penyusun).", f: ["judul", "mkKode", "mkNama", "dosen", "nama", "nim", "prodi", "upbjj", "kelas"], o: [], file: "Makalah" }
  };
  var OPTS = { optFak: "Tampilkan fakultas", optUpbjj: "Tampilkan UPBJJ-UT", optKelas: "Tampilkan kode kelas / pokjar", optKesimpulan: "Tambah bagian Kesimpulan di lembar jawaban" };

  var S = load(), TYPE = (S._type && TYPES[S._type]) ? S._type : "tutorial";
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && typeof j === "object") return Object.assign({}, DEF, j); } catch (e) { /* abaikan */ } return Object.assign({}, DEF); }
  function save() { try { S._type = TYPE; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

  /* ---------- isi dokumen ---------- */
  function F(v, ph) { v = String(v == null ? "" : v).trim(); return v || ph; }
  function U(v, ph) { return F(v, ph).toUpperCase(); }
  function P(t, o) { var b = { k: "p", t: t }; for (var k in (o || {})) b[k] = o[k]; return b; }
  var BR = function (n) { return { k: "br", n: n || 1 }; };
  function logo(w) { return S.optLogo ? { k: "logo", w: w || 4.2 } : { k: "br", n: 1 }; }
  function masaFull() { return F(S.tahun, "2026/2027") + " (" + F(S.masa, "2026.2") + ")"; }
  function mk() { var k = F(S.mkKode, "[KODE MK]"), n = F(S.mkNama, "[NAMA MATA KULIAH]"); return k + " / " + n; }
  function nS() { return Math.max(1, Math.min(10, parseInt(S.nSoal, 10) || 3)); }

  function pages() {
    var T = TYPE, a = [], c = [];
    if (T === "tutorial") {
      c = [P("TUGAS TUTORIAL", { b: 1, sz: 14, al: "c", af: 4 }), P("TUGAS " + S.ke, { b: 1, al: "c", af: 4 }), P("PROGRAM STUDI: " + U(S.prodi, "[ISI NAMA PROGRAM STUDI]"), { b: 1, al: "c" }), BR(3), logo(5), BR(3),
        P("NAMA MAHASISWA : " + F(S.nama, "[ISI NAMA LENGKAP ANDA]"), { b: 1, al: "c" }), P("NIM : " + F(S.nim, "[ISI NIM ANDA]"), { b: 1, al: "c" }),
        P("KODE/NAMA MATA KULIAH : " + mk(), { b: 1, al: "c" })];
      if (S.optKelas) c.push(P("KODE KELAS / POKJAR : " + F(S.kelas, "[ISI KODE KELAS ATAU NAMA POKJAR]"), { b: 1, al: "c" }));
      if (S.optUpbjj) c.push(P("UPBJJ-UT : " + F(S.upbjj, "[ISI NAMA DAERAH UPBJJ ANDA]"), { b: 1, al: "c" }));
      c.push(BR(5));
      if (S.optFak) c.push(P("FAKULTAS " + U(S.fakultas, "[ISI NAMA FAKULTAS ANDA]"), { b: 1, sz: 14, al: "c", af: 4 }));
      c.push(P("UNIVERSITAS TERBUKA", { b: 1, sz: 14, al: "c", af: 4 }), P("TAHUN AKADEMIK " + F(S.tahun, "2026/2027"), { b: 1, al: "c" }));
      a.push(c);
      if (S.optLembar) {
        var l = [P("LEMBAR JAWABAN TUGAS", { b: 1, sz: 14, al: "c", af: 12 }), P("Pertanyaan / Jawaban:", { b: 1, af: 8 })];
        for (var i = 1; i <= nS(); i++) l.push(P("Soal Nomor " + i + ":", { b: 1, af: 2 }), P("[Tuliskan teks pertanyaan di sini...]", { af: 8 }), P("Jawaban:", { b: 1, af: 2 }), P("[Ketik atau susun jawaban Anda secara sistematis di sini...]", { al: "j", af: 12 }));
        if (S.optKesimpulan) l.push(P("Kesimpulan:", { b: 1, af: 2 }), P("[Tuliskan kesimpulan di sini...]", { al: "j", af: 12 }));
        l.push(P("SUMBER REFERENSI / DAFTAR PUSTAKA", { b: 1, af: 2 }), P("[Wajib mencantumkan sumber referensi, contoh: Penulis. (Tahun). Judul Buku. Kota: Penerbit UT.]", { al: "j" }));
        a.push(l);
      }
    } else if (T === "tmk") {
      c = [P("BUKU JAWABAN TUGAS MAHASISWA\nTUGAS MATA KULIAH (TMK)\nSEMESTER: " + masaFull(), { b: 1, sz: 14, al: "c", af: 10 }), BR(2), logo(5), BR(2),
        { k: "tbl", style: "lines", w: [6.2, 9.8], rows: [["Nama Mahasiswa", ": " + F(S.nama, "[Tulis Nama Lengkap Anda]")], ["Nomor Induk Mahasiswa (NIM)", ": " + F(S.nim, "[Tulis NIM Anda]")], ["Kode/Nama Mata Kuliah", ": " + mk()], ["Kode/Nama UPBJJ", ": " + F(S.upbjj, "[Tulis Kota UPBJJ, misal: Jakarta]")], ["Masa Ujian", ": " + masaFull()], ["Tugas TMK ke-", ": " + S.ke]] },
        BR(7), P(F(S.kementerian, DEF.kementerian) + "\nUNIVERSITAS TERBUKA", { b: 1, al: "c" })];
      a.push(c);
      if (S.optLembar) {
        var t = [P("LEMBAR JAWABAN TUGAS MATA KULIAH (TMK)", { b: 1, al: "c", af: 14 })];
        for (var j = 1; j <= nS(); j++) t.push(P("SOAL " + j + ":", { b: 1, af: 2 }), P("[Tuliskan teks soal di sini]", { al: "j", af: 8 }), P("JAWABAN " + j + ":", { b: 1, af: 2 }), P("[Tuliskan jawaban di sini]", { al: "j", af: 12 }));
        t.push(P("SUMBER REFERENSI / DAFTAR PUSTAKA:", { b: 1, af: 2 }), P("[Penulis. (Tahun). Judul. Kota: Penerbit.]", { al: "j" }));
        a.push(t);
      }
    } else if (T === "uas") {
      var nm = F(S.nama, "[Tulis Nama Anda]");
      c = [P("BUKU JAWABAN UJIAN (BJU)\nTAKE HOME EXAM (THE)\nSEMESTER UJIAN: " + masaFull(), { b: 1, sz: 14, al: "c", af: 8, color: "1F4E79" }), BR(1), logo(4.6), BR(1),
        { k: "tbl", style: "grid", w: [5.6, 10.4], rows: [["Nama Mahasiswa", ": " + nm], ["Nomor Induk Mahasiswa (NIM)", ": " + F(S.nim, "[Tulis NIM Anda]")], ["Tanggal Lahir", ": " + F(S.tglLahir, "[Tulis DD/MM/YYYY]")], ["Kode/Nama Mata Kuliah", ": " + F(S.mkKode, "[KODE]") + " / " + F(S.mkNama, "[Nama Mata Kuliah]")], ["Program Studi", ": " + F(S.prodi, "[Tulis Program Studi Anda]")], ["UPBJJ-UT", ": " + F(S.upbjj, "[Tulis Kota UPBJJ Anda]")], ["Hari/Tanggal UAS THE", ": " + F(S.hariUjian, "[Tulis Hari, Tanggal Pengerjaan]")]] },
        BR(2), P("Tanda Tangan Peserta Ujian\n\n\n\n( " + (S.nama.trim() || "_______________________") + " )", { al: "r", sz: 11 }), BR(3), P(F(S.kementerian, DEF.kementerian) + "\nUNIVERSITAS TERBUKA", { b: 1, al: "c" })];
      a.push(c);
      a.push([P("Surat Pernyataan Mahasiswa\nKejujuran Akademik", { b: 1, sz: 14, al: "c", af: 12 }), P("Yang bertanda tangan di bawah ini:", { af: 6 }),
        { k: "tbl", style: "lines", w: [5.6, 10.4], rows: [["Nama Mahasiswa", ": " + nm], ["NIM", ": " + F(S.nim, "[Tulis NIM Anda]")], ["Kode/Nama Mata Kuliah", ": " + F(S.mkKode, "[KODE]") + " / " + F(S.mkNama, "[Nama Mata Kuliah]")], ["Fakultas / Program Studi", ": " + F(S.fakultas, "[Fakultas]") + " / " + F(S.prodi, "[Program Studi]")]] },
        BR(1),
        P("1. Saya tidak menerima bantuan sandingan atau bantuan dari siapapun dalam pengerjaan soal ujian ini.", { al: "j", hang: 0.6, af: 4 }),
        P("2. Saya tidak memberikan bantuan sandingan atau bantuan kepada siapapun dalam pengerjaan soal ujian ini.", { al: "j", hang: 0.6, af: 4 }),
        P("3. Saya tidak melakukan plagiarisme atau menyalin karya orang lain tanpa mencantumkan sumber referensi yang sah.", { al: "j", hang: 0.6, af: 4 }),
        P("4. Saya memahami sepenuhnya bahwa jika saya terbukti melakukan kecurangan akademik, maka saya bersedia menerima sanksi akademis berupa pembatalan nilai mata kuliah atau sanksi berat lainnya sesuai regulasi Universitas Terbuka.", { al: "j", hang: 0.6, af: 10 }),
        P("Demikian surat pernyataan ini saya buat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.", { al: "j", af: 14 }),
        P(F(S.kota, "[Kota Anda]") + ", " + F(S.hariUjian, "[Tanggal Ujian]") + "\nYang Menyatakan,\n\n\n\n\n( " + (S.nama.trim() || "_______________________") + " )", { al: "r" })]);
      if (S.optLembar) {
        var u = [P("LEMBAR JAWABAN UJIAN", { b: 1, sz: 14, al: "c", af: 8 }), P("PETUNJUK PENGERJAAN: Ketik nomor soal secara berurutan. Gunakan analisis mandiri yang diperkuat dengan landasan teori dari Buku Materi Pokok (BMP) UT serta cantumkan daftar pustaka di bagian akhir untuk menghindari deteksi plagiarisme.", { sz: 10, al: "j", af: 12 })];
        for (var q = 1; q <= nS(); q++) u.push(P("SOAL " + q, { b: 1, af: 2 }), P("[Tuliskan teks soal di sini]", { al: "j", af: 6 }), P("Jawaban:", { b: 1, af: 2 }), P("[Tuliskan jawaban di sini]", { al: "j", af: 12 }));
        u.push(P("DAFTAR PUSTAKA / REFERENSI", { b: 1, af: 2 }), P("[Penulis. (Tahun). Judul. Kota: Penerbit.]", { al: "j" }));
        a.push(u);
      }
    } else if (T === "jurnal") {
      c = [P("TUGAS ANALISIS JURNAL", { b: 1, sz: 14, al: "c", af: 6 }), P(U(S.judul, "[TULIS JUDUL TUGAS JURNAL ATAU JUDUL ARTIKEL DI SINI]"), { b: 1, sz: 14, al: "c", af: 14 }),
        P("Disusun untuk Memenuhi Tugas Mata Kuliah " + F(S.mkNama, "[Nama Mata Kuliah]") + (S.mkKode.trim() ? "\n(" + S.mkKode.trim() + ")" : ""), { al: "c", af: 10 }), BR(1), logo(4.6), BR(2),
        P("Disusun Oleh:", { b: 1, al: "c", af: 2 }), P(F(S.nama, "[NAMA ANDA]") + "\nNIM. " + F(S.nim, "[NOMOR INDUK MAHASISWA ANDA]") + (S.kelas.trim() ? "\nKode Kelas: " + S.kelas.trim() : ""), { b: 1, al: "c", af: 18 }),
        P("Dosen / Tutor Pengampu:", { b: 1, al: "c", af: 2 }), P(F(S.dosen, "[Nama Dosen/Tutor Beserta Gelar]"), { b: 1, al: "c", af: 36 }),
        P("PROGRAM STUDI " + U(S.prodi, "[NAMA PRODI ANDA]") + "\nFAKULTAS " + U(S.fakultas, "[NAMA FAKULTAS ANDA]") + "\nUPBJJ-UT " + U(S.upbjj, "[NAMA KOTA UPBJJ ANDA]"), { b: 1, al: "c", af: 6 }),
        P("UNIVERSITAS TERBUKA", { b: 1, sz: 14, al: "c", af: 4 }), P("TAHUN " + F(S.tahunCover, String(y)), { b: 1, al: "c" })];
      a.push(c);
      if (S.optLembar) a.push([P("LEMBAR JAWABAN TUGAS ANALISIS JURNAL", { b: 1, sz: 14, al: "c", af: 10 }),
        { k: "tbl", style: "lines", w: [4.4, 11.6], rows: [["Nama Mahasiswa", ": " + F(S.nama, "[Nama Anda]")], ["NIM", ": " + F(S.nim, "[NIM Anda]")], ["Mata Kuliah", ": " + F(S.mkNama, "[Nama Mata Kuliah]") + (S.mkKode.trim() ? " (" + S.mkKode.trim() + ")" : "")], ["Tugas Ke-", ": " + S.ke]] }, BR(1),
        P("A. IDENTITAS JURNAL", { b: 1, af: 4 }), P("1. Judul Artikel: [isi]\n2. Nama Jurnal: [isi]\n3. Penulis: [isi]\n4. Volume, Nomor & Halaman: [isi]\n5. Tahun Terbit: [isi]\n6. DOI / Tautan: [isi]", { af: 10 }),
        P("B. RINGKASAN ISI JURNAL", { b: 1, af: 4 }), P("[Ringkas masalah penelitian, metode, hasil, dan kesimpulan artikel dengan kalimatmu sendiri.]", { al: "j", af: 10 }),
        P("C. ANALISIS DAN KRITIK (PEMBAHASAN)", { b: 1, af: 4 }), P("[Tuliskan kelebihan, kekurangan, dan kaitannya dengan materi mata kuliah.]", { al: "j", af: 10 }),
        P("D. DAFTAR PUSTAKA / SUMBER REFERENSI", { b: 1, af: 4 }), P("[Cantumkan artikel yang dianalisis dan sumber lain dengan gaya APA.]", { al: "j" })]);
    } else if (T === "proposal") {
      c = [P("PROPOSAL PENELITIAN", { b: 1, sz: 14, al: "c", af: 14 }), P(U(S.judul, "JUDUL PENELITIAN"), { b: 1, sz: 14, al: "c", af: 14 }),
        P("Disusun sebagai salah satu syarat untuk menempuh mata kuliah Metode Penelitian", { al: "c", af: 8 }), BR(1), logo(4.8), BR(2),
        P(F(S.nama, "Nama mahasiswa") + "\nNIM " + F(S.nim, "XXXXXXXXXX"), { b: 1, al: "c", af: 14 }), P((S.dosen.trim() ? "Tutor: " + S.dosen.trim() : "Tutor") + "\n" + (S.idTutor.trim() ? "ID Tutor: " + S.idTutor.trim() : "ID Tutor"), { al: "c", af: 48 }),
        P("PROGRAM STUDI " + U(S.prodi, "MANAJEMEN") + "\nUNIVERSITAS TERBUKA\n" + F(S.kementerian, DEF.kementerian) + "\n" + F(S.tahunCover, String(y)), { b: 1, al: "c" })];
      a.push(c);
      if (S.optLembar) {
        var G = function (t) { return P(t, { i: 1, al: "j", af: 8, color: "555555" }); };
        a.push([P("DAFTAR ISI", { b: 1, sz: 14, al: "c", af: 12 }), P("Daftar isi\nRingkasan\nBab I Pendahuluan\n      A. Latar Belakang\n      B. Perumusan Masalah\n      C. Tujuan Penelitian\n      D. Kegunaan Penelitian\nBab II Tinjauan Pustaka\n      A. Konsep Teori / Variabel\n      B. Kerangka Konsep / Teoritis; atau Hipotesis\n      C. Hasil-hasil Penelitian Terdahulu\nBab III Metodologi Penelitian\n      A. Metode Penelitian\n      B. Teknik Pengumpulan Data\n      C. Metode Analisis Data\n      D. Objek Analisis\n      E. Validitas dan Reliabilitas\nDaftar Pustaka\nLampiran-lampiran", { af: 10 }), P("Nomor halaman diisi setelah proposalmu selesai (di Word: Referensi > Daftar Isi).", { sz: 10, i: 1, color: "555555" })]);
        a.push([P("RINGKASAN PROPOSAL", { b: 1, sz: 14, al: "c", af: 12 }), G("[Rangkum proposal: 1-3 kalimat tentang masalah yang diteliti, 1 kalimat teori yang digunakan, dan 1-2 kalimat tentang metode penelitian.]"), P("Kata kunci: xxxxx, xxxxx, xxxxx", { af: 6 })]);
        a.push([P("BAB I\nPENDAHULUAN", { b: 1, sz: 14, al: "c", af: 12 }), P("A. Latar Belakang", { b: 1, af: 3 }), G("[Jelaskan latar belakang topik / masalah penelitian.]"), P("B. Perumusan Masalah", { b: 1, af: 3 }), G("[Berdasarkan uraian latar belakang di atas, rumuskan masalah penelitian sebagai pertanyaan (1., 2., ...).]"), P("C. Tujuan Penelitian", { b: 1, af: 3 }), G("[Tujuan penelitian selaras dengan rumusan masalah (1., 2., ...).]"), P("D. Kegunaan Penelitian", { b: 1, af: 3 }), G("[Manfaat teoritis dan manfaat praktis penelitian.]")]);
        a.push([P("BAB II\nTINJAUAN PUSTAKA", { b: 1, sz: 14, al: "c", af: 12 }), G("[Jelaskan teori yang digunakan dalam proposal ini dan penelitian terdahulu yang relevan.]"), P("A. Konsep Teori / Variabel", { b: 1, af: 3 }), G("[Uraikan konsep dan teori utama.]"), P("B. Kerangka Konsep / Teoritis; atau Hipotesis", { b: 1, af: 3 }), G("[Gambarkan kerangka konsep atau rumuskan hipotesis.]"), P("C. Hasil-hasil Penelitian Terdahulu", { b: 1, af: 3 }), G("[Dari studi literatur, sebutkan beberapa penelitian terdahulu yang relevan beserta temuannya.]")]);
        a.push([P("BAB III\nMETODOLOGI PENELITIAN", { b: 1, sz: 14, al: "c", af: 12 }), P("A. Metode Penelitian", { b: 1, af: 3 }), G("[Jenis penelitian dan paradigma yang digunakan, serta alasannya.]"), P("B. Teknik Pengumpulan Data", { b: 1, af: 3 }), G("[Data primer dan sekunder yang dipakai, serta alasannya.]"), P("C. Metode Analisis Data", { b: 1, af: 3 }), G("[Cara mengolah dan menganalisis data, serta alasannya.]"), P("D. Objek Analisis", { b: 1, af: 3 }), G("[Objek analisis; populasi dan sampel (kuantitatif) atau teknik pemilihan sampel (kualitatif).]"), P("E. Validitas dan Reliabilitas", { b: 1, af: 3 }), G("[Cara menjaga validitas dan reliabilitas data.]")]);
        a.push([P("DAFTAR PUSTAKA", { b: 1, sz: 14, al: "c", af: 12 }), G("[Tulis dengan gaya APA. Contoh: Penulis, A. A. (Tahun). Judul artikel. Nama Jurnal, Volume(Nomor), halaman.]"), P("Lampiran 1 (bila perlu)", { b: 1, bf: 14 })]);
      }
    } else {
      c = [P("TUGAS MANDIRI\nDisusun untuk Memenuhi Tugas Mata Kuliah\n" + F(S.mkNama, "[Nama Mata Kuliah]") + (S.mkKode.trim() ? "\n" + S.mkKode.trim() : "") + "\nDosen Pengampu : " + F(S.dosen, "[Nama Dosen / Tutor]"), { al: "c", af: 24 }),
        P(U(S.judul, "[JUDUL MAKALAH]"), { b: 1, sz: 14, al: "c", af: 12 }), BR(1), logo(5), BR(2),
        P("Disusun oleh :", { al: "c", af: 2 }), P(F(S.nama, "[NAMA MAHASISWA]") + "\n(" + F(S.nim, "[NIM]") + ")", { b: 1, al: "c", af: 60 }),
        P("PROGRAM STUDI " + U(S.prodi, "[PROGRAM STUDI]") + "\nUNIVERSITAS TERBUKA\nUPBJJ-UT " + U(S.upbjj, "[UPBJJ]") + (S.kelas.trim() ? "\n" + U(S.kelas, "") : "") + "\nTAHUN " + F(S.tahunCover, String(y)), { b: 1, sz: 14, al: "c" })];
      a.push(c);
    }
    return a;
  }

  /* ---------- tampilan ---------- */
  var st = document.createElement("style"); st.textContent = W.css + ".sp-f{display:block;margin:0 0 10px}.sp-f>span{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:var(--muted)}.sp-f input,.sp-f select{width:100%;box-sizing:border-box;padding:10px 12px;min-height:44px;border-radius:10px;border:1px solid var(--dash);background:transparent;color:var(--text);font:inherit;font-size:14.5px}.sp-g{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:22px;align-items:start}.sp-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}.sp-tabs button{cursor:pointer}.sp-tabs button:not(.on){opacity:.6}.sp-tabs button.on{outline:2px solid #fff;outline-offset:2px}.sp-r2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.sp-chk{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:14px;cursor:pointer}.sp-pv{position:static}@media(max-width:900px){.sp-g{grid-template-columns:1fr}.sp-r2{grid-template-columns:1fr}}";
  document.head.appendChild(st);

  function renderTabs() {
    $("#spTabs").innerHTML = Object.keys(TYPES).map(function (k) { return '<button type="button" class="btn' + (k === TYPE ? " on pri" : "") + '" data-t="' + k + '">' + esc(TYPES[k].n) + "</button>"; }).join("");
    $("#spDesc").textContent = TYPES[TYPE].d;
  }
  function field(k) {
    var d = FIELDS[k];
    if (d.sel) return '<label class="sp-f"><span>' + esc(d.l) + '</span><select data-k="' + k + '">' + d.sel.map(function (o) { return "<option" + (String(S[k]) === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></label>";
    return '<label class="sp-f"><span>' + esc(d.l) + '</span><input type="text" data-k="' + k + '" value="' + esc(S[k]) + '" placeholder="' + esc(d.ph || "") + '" autocomplete="off"></label>';
  }
  function renderForm() {
    var T = TYPES[TYPE], h = '<div class="sp-r2">' + T.f.map(field).join("") + "</div>";
    h += '<details class="cvs" style="margin-top:6px"><summary>Pengaturan lain</summary>' +
      '<label class="sp-chk"><input type="checkbox" data-o="optLogo"' + (S.optLogo ? " checked" : "") + '> Pasang logo Universitas Terbuka</label>' +
      (TYPE === "makalah" ? "" : '<label class="sp-chk"><input type="checkbox" data-o="optLembar"' + (S.optLembar ? " checked" : "") + '> Sertakan lembar jawaban / kerangka isi setelah sampul</label>') +
      T.o.map(function (o) { return '<label class="sp-chk"><input type="checkbox" data-o="' + o + '"' + (S[o] ? " checked" : "") + "> " + OPTS[o] + "</label>"; }).join("") +
      '<div class="sp-r2"><label class="sp-f"><span>Tahun akademik</span><input type="text" data-k="tahun" value="' + esc(S.tahun) + '"></label><label class="sp-f"><span>Masa (mis. 2026.2)</span><input type="text" data-k="masa" value="' + esc(S.masa) + '"></label></div>' +
      '<div class="sp-r2"><label class="sp-f"><span>Tahun pada sampul</span><input type="text" data-k="tahunCover" value="' + esc(S.tahunCover) + '"></label><label class="sp-f"><span>Nama kementerian</span><input type="text" data-k="kementerian" value="' + esc(S.kementerian) + '"></label></div>' +
      '<p class="note">Sesuaikan masa dan tahun dengan yang tertulis di soal atau panduan tutormu.</p></details>';
    $("#spForm").innerHTML = h;
  }
  function draw() {
    var box = $("#spPages"); box.innerHTML = W.html(pages()); W.fit(box); save();
    $("#spCount").textContent = pages().length + " halaman";
  }

  document.addEventListener("input", function (e) {
    var t = e.target; if (!t.dataset || !t.dataset.k || !(t.closest("#spForm"))) return;
    S[t.dataset.k] = t.value; draw();
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t.closest || !t.closest("#spForm")) return;
    if (t.dataset.o) { S[t.dataset.o] = t.checked; draw(); } else if (t.dataset.k) { S[t.dataset.k] = t.value; draw(); }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-t],#spPrint,#spDocx,#spEx,#spReset"); if (!b) return;
    if (b.dataset.t) { TYPE = b.dataset.t; renderTabs(); renderForm(); draw(); }
    else if (b.id === "spPrint") window.print();
    else if (b.id === "spDocx") {
      b.disabled = true;
      W.loadLogo().then(function (bytes) {
        var blob = W.docx(pages(), S.optLogo ? bytes : null);
        W.save(blob, TYPES[TYPE].file + "_" + W.fileSafe(S.mkNama || S.judul, "UT") + "_" + W.fileSafe(S.nama, "Nama") + ".docx");
        toast(S.optLogo && !bytes ? "Word diunduh, tetapi logo tidak termuat. Tempel logo UT secara manual." : "Word diunduh.");
      }).then(function () { b.disabled = false; }, function () { b.disabled = false; });
    }
    else if (b.id === "spEx") { if (!S.nama.trim() || confirm("Ganti isian dengan contoh fiktif?")) { Object.assign(S, CONTOH); renderForm(); draw(); } }
    else if (b.id === "spReset") { if (confirm("Hapus semua isian di perangkat ini?")) { try { localStorage.removeItem(KEY); } catch (x) { /* abaikan */ } S = Object.assign({}, DEF); renderForm(); draw(); } }
  });
  function toast(t) { var n = $("#spToast"); n.textContent = t; setTimeout(function () { n.textContent = ""; }, 3500); }
  window.addEventListener("resize", function () { W.fit($("#spPages")); });

  renderTabs(); renderForm(); draw();
})();
