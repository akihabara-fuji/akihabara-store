/* Panduan maba UT: daftar periksa yang bisa dicentang (disimpan di perangkat ini) dan kamus istilah. Isi bersifat umum;
   tanggal, biaya, dan aturan resmi selalu mengacu ke ut.ac.id dan akun myUT milik mahasiswa. */
(function () {
  "use strict";
  var KEY = "ca-maba-v1";
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var G = [
    { t: "1. Siapkan dari awal", i: [
      ["a1", "Simpan NIM, email, dan kata sandi akun UT di tempat yang aman (jangan dibagikan ke siapa pun)."],
      ["a2", "Pastikan nomor HP dan email di data diri aktif, karena info penting dikirim ke sana."],
      ["a3", "Catat UPBJJ dan pokjar (kelompok belajar) tempat kamu terdaftar."],
      ["a4", "Pasfoto sesuai ketentuan siap dipakai. Alat Pasfoto Yudisium di situs ini bisa membantu memotong ukuran fotonya."]] },
    { t: "2. Saat registrasi mata kuliah", i: [
      ["b1", "Buka kalender akademik resmi di ut.ac.id dan catat tanggal registrasi serta batas pembayaran."],
      ["b2", "Pilih mata kuliah sesuai panduan program studi dan jumlah SKS yang diizinkan untukmu."],
      ["b3", "Simpan bukti registrasi dan bukti pembayaran (tangkapan layar atau PDF)."],
      ["b4", "Masukkan semua tanggal penting ke Kalender Akademik di situs ini agar ada pengingat."]] },
    { t: "3. Di semester berjalan", i: [
      ["c1", "Masuk ke tutorial online (tuton) untuk tiap mata kuliah dan baca petunjuk tutornya di sesi pertama."],
      ["c2", "Ikuti diskusi dan kerjakan tugas tutorial sebelum batas waktu. Catat batasnya per mata kuliah."],
      ["c3", "Gunakan format sampul dan lembar jawaban yang diminta tutor. Alat Sampul & Template Tugas membantu menyusunnya."],
      ["c4", "Tulis jawaban dengan kata-katamu sendiri dan cantumkan sumber. Jangan menyalin dari orang lain atau AI tanpa memahaminya."],
      ["c5", "Simpan semua berkas tugas di satu folder per mata kuliah, dengan nama berkas yang rapi."]] },
    { t: "4. Menjelang ujian", i: [
      ["d1", "Cek jadwal, lokasi atau metode ujian (mis. ujian online atau take home exam) di akun dan pengumuman resmi."],
      ["d2", "Pastikan perangkat, jaringan, dan akunmu siap beberapa hari sebelum ujian."],
      ["d3", "Pelajari Buku Materi Pokok (BMP) dan hitung target nilaimu dengan Kalkulator Nilai UT."],
      ["d4", "Baca ketentuan kejujuran akademik. Pelanggaran bisa berakibat pembatalan nilai."]] },
    { t: "5. Setelah nilai keluar", i: [
      ["e1", "Cek nilai di akun resmi, lalu catat di Tracker Kelulusan agar IPK dan sisa SKS terpantau."],
      ["e2", "Bila ada yang janggal pada nilai, hubungi UPBJJ atau layanan resmi UT sesuai prosedur."],
      ["e3", "Rencanakan semester berikutnya: mata kuliah, SKS, dan target IPK."]] }
  ];
  var K = [["Tuton", "Tutorial online: kelas dan penugasan yang berjalan lewat sistem daring UT."], ["TTM", "Tutorial tatap muka: tutorial yang dilakukan bertemu langsung bila tersedia untuk mata kuliah tertentu."], ["TMK", "Tugas mata kuliah: penugasan yang nilainya ikut menentukan nilai akhir bila mata kuliah tidak memakai tuton."], ["UAS", "Ujian akhir semester."], ["THE", "Take home exam: ujian yang dikerjakan di rumah dengan batas waktu."], ["BMP", "Buku materi pokok: bahan belajar utama tiap mata kuliah."], ["UPBJJ", "Unit program belajar jarak jauh: kantor UT di daerahmu."], ["Pokjar", "Kelompok belajar di daerah, tempat mahasiswa berkumpul dan mengikuti tutorial."], ["SKS", "Satuan kredit semester: bobot beban belajar tiap mata kuliah."], ["IPK", "Indeks prestasi kumulatif: rata-rata mutu nilai dari semua mata kuliah, dibobot SKS."], ["Masa 2026.2", "Penanda masa registrasi: tahun, lalu nomor semester dalam tahun itu. Cek arti pastinya di kalender akademik resmi."]];
  var S = {}; try { S = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { S = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }
  function total() { var n = 0, d = 0; G.forEach(function (g) { g.i.forEach(function (x) { n++; if (S[x[0]]) d++; }); }); return [d, n]; }
  function draw() {
    $("#mbList").innerHTML = G.map(function (g) {
      return '<div class="card" style="margin:0 0 12px"><b>' + esc(g.t) + '</b><div style="margin-top:8px">' + g.i.map(function (x) { return '<label class="mb-i"><input type="checkbox" data-c="' + x[0] + '"' + (S[x[0]] ? " checked" : "") + "><span>" + esc(x[1]) + "</span></label>"; }).join("") + "</div></div>";
    }).join("");
    $("#mbGl").innerHTML = K.map(function (k) { return "<dt>" + esc(k[0]) + "</dt><dd>" + esc(k[1]) + "</dd>"; }).join("");
    var t = total(); $("#mbProg").textContent = t[0] + " dari " + t[1] + " langkah selesai"; $("#mbBar").style.width = Math.round(t[0] / t[1] * 100) + "%";
  }
  var st = document.createElement("style");
  st.textContent = ".mb-i{display:flex;gap:10px;align-items:flex-start;margin:0 0 9px;cursor:pointer;font-size:14.5px;line-height:1.5}.mb-i input{margin-top:4px;flex:none}.mb-bar{height:10px;border-radius:99px;background:var(--border);overflow:hidden;margin:6px 0 4px}.mb-bar i{display:block;height:100%;background:#22c55e;width:0;transition:width .3s}dl.mb-gl{display:grid;grid-template-columns:max-content 1fr;gap:6px 16px;font-size:14.5px}dl.mb-gl dt{font-weight:700}dl.mb-gl dd{margin:0;color:var(--muted)}@media(max-width:640px){dl.mb-gl{grid-template-columns:1fr}}";
  document.head.appendChild(st);
  document.addEventListener("change", function (e) { var t = e.target; if (t.dataset && t.dataset.c) { S[t.dataset.c] = t.checked; save(); var x = total(); $("#mbProg").textContent = x[0] + " dari " + x[1] + " langkah selesai"; $("#mbBar").style.width = Math.round(x[0] / x[1] * 100) + "%"; } });
  document.addEventListener("click", function (e) { if (e.target.id === "mbReset" && confirm("Hapus centang di perangkat ini?")) { S = {}; save(); draw(); } });
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("#mbStart"); if (a) { var d = $("#mbMore"); if (d) d.open = true; try { navigator.sendBeacon("/ms/ev?e=checklist"); } catch (x) { /* abaikan */ } } });
  if (location.hash === "#istilah" && $("#istilah")) $("#istilah").open = true;
  draw();
})();
