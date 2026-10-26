/* Pembuat CV ATS: semua diproses di browser (tidak ada data dikirim ke server). Data disimpan opsional di localStorage perangkat ini. */
(function () {
  "use strict";
  var KEY = "ca-cv-v1";
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function blank() {
    return { name: "", role: "", email: "", phone: "", city: "", link: "", summary: "",
      exp: [{ title: "", company: "", city: "", start: "", end: "", bullets: "" }],
      edu: [{ school: "", major: "", city: "", start: "", end: "", gpa: "" }], skills: "", certs: "", langs: "" };
  }

  /* Contoh FIKTIF (nama, perusahaan, dan angka dikarang) supaya orang melihat bentuk isian yang baik. */
  var EX = {
    lulusan: { name: "Rina Putri Lestari", role: "Staf Administrasi", email: "rina.lestari@contoh.com", phone: "0812 3456 7890", city: "Jakarta Barat", link: "linkedin.com/in/rina-lestari",
      summary: "Lulusan S1 Manajemen Universitas Terbuka dengan pengalaman administrasi toko online dan pengelolaan arsip. Terbiasa membagi waktu antara bekerja dan kuliah, teliti dalam pencatatan, dan mahir Microsoft Excel serta Google Workspace. Mencari posisi staf administrasi yang menekankan ketepatan data dan komunikasi.",
      exp: [{ title: "Admin Toko Online (Paruh Waktu)", company: "Toko Contoh Mandiri", city: "Jakarta", start: "Jan 2023", end: "Sekarang", bullets: "Mengelola 40–60 pesanan per hari melalui marketplace dan memastikan data pesanan tercatat benar\nMenyusun rekap penjualan mingguan di Excel sehingga selisih stok turun dari 8% menjadi 2%\nMembalas pertanyaan pelanggan rata-rata di bawah 30 menit pada jam kerja\nMerapikan arsip digital invoice dan resi, mempercepat pencarian dokumen dari 10 menit menjadi 2 menit" },
        { title: "Asisten Administrasi (Magang)", company: "CV Contoh Sejahtera", city: "Jakarta", start: "Jun 2022", end: "Des 2022", bullets: "Menginput dan memeriksa data 200+ dokumen surat masuk dan keluar tiap bulan\nMenyiapkan jadwal rapat dan notulen untuk tim beranggotakan 8 orang" }],
      edu: [{ school: "Universitas Terbuka", major: "S1 Manajemen", city: "Jakarta", start: "2021", end: "2025", gpa: "3,40" }],
      skills: "Microsoft Excel, Google Sheets, Administrasi Perkantoran, Pengarsipan, Komunikasi Pelanggan, Manajemen Waktu, Pengetahuan Dasar Akuntansi",
      certs: "Pelatihan Microsoft Excel Dasar–Menengah (2023)\nKursus Administrasi Perkantoran (2022)", langs: "Indonesia (Native); Inggris (Pasif, membaca dokumen kerja)" },
    supervisor: { name: "Budi Santoso", role: "Operations Supervisor", email: "budi.santoso@contoh.com", phone: "0813 9876 5432", city: "Jakarta Selatan", link: "",
      summary: "Operations Supervisor dengan 8 tahun pengalaman mengelola tim lapangan dan layanan fasilitas di gedung perkantoran dan kampus. Berpengalaman menjaga standar layanan (SLA), menyusun jadwal dan anggaran operasional, serta melatih tim baru. Terbiasa bekerja di bawah tekanan dan melaporkan kinerja secara terukur.",
      exp: [{ title: "Operations Supervisor", company: "PT Contoh Facility Services", city: "Jakarta", start: "Agu 2022", end: "Sekarang", bullets: "Memimpin 45 petugas lapangan di 3 area gedung dan menjaga pencapaian SLA di atas 95% per bulan\nMenyusun jadwal kerja dan lembur sehingga biaya lembur turun 18% dalam 6 bulan\nMelatih 20 petugas baru dengan modul kerja standar, mengurangi keluhan pengguna gedung sebesar 30%\nMenyusun laporan inspeksi mingguan dan menindaklanjuti temuan dalam maksimal 24 jam" },
        { title: "Supervisor Housekeeping", company: "PT Contoh Jasa Prima", city: "Jakarta", start: "Mar 2018", end: "Jul 2022", bullets: "Mengawasi 25 petugas kebersihan di area kampus, asrama, dan fasilitas olahraga\nMengelola stok bahan dan alat kerja sehingga pemborosan bahan turun 12%\nMelakukan audit kebersihan harian dan menyiapkan laporan untuk manajemen" }],
      edu: [{ school: "Universitas Terbuka", major: "S1 Manajemen (sedang berjalan)", city: "Jakarta", start: "2023", end: "Sekarang", gpa: "" }, { school: "SMK Contoh Negeri 1", major: "Teknik Bangunan", city: "Jakarta", start: "2010", end: "2013", gpa: "" }],
      skills: "Manajemen Tim Lapangan, Penjadwalan, Pengendalian SLA, Inspeksi dan Audit, Pelatihan Karyawan, Pengendalian Biaya Operasional, Microsoft Excel, Pelaporan",
      certs: "Pelatihan Supervisor Facility Management (2021)\nK3 Umum (2020)", langs: "Indonesia (Native); Inggris (Dasar)" },
    konten: { name: "Dewi Anggraini", role: "Social Media Specialist", email: "dewi.anggraini@contoh.com", phone: "0857 1122 3344", city: "Bandung", link: "instagram.com/contoh.dewi",
      summary: "Social Media Specialist dengan pengalaman mengelola akun bisnis kecil dan membuat konten video pendek. Terbiasa membaca data performa konten dan menyusun kalender konten bulanan. Berfokus pada pertumbuhan jangkauan organik dan interaksi yang nyata.",
      exp: [{ title: "Social Media Specialist", company: "Studio Contoh Kreatif", city: "Bandung", start: "Feb 2023", end: "Sekarang", bullets: "Mengelola 4 akun klien UMKM di Instagram dan TikTok dengan total 25 konten per bulan\nMeningkatkan jangkauan organik rata-rata 65% dalam 4 bulan melalui penyesuaian jam unggah dan format video\nMenyusun laporan performa bulanan berisi analisis konten terbaik dan rekomendasi konten berikutnya\nMengedit video pendek menggunakan CapCut dan Canva dengan waktu produksi rata-rata 45 menit per konten" },
        { title: "Content Creator Freelance", company: "Mandiri", city: "Bandung", start: "2021", end: "2023", bullets: "Memproduksi 120+ konten video pendek untuk 6 pelanggan dengan revisi rata-rata kurang dari 2 kali\nMembangun akun pribadi hingga 12.000 pengikut tanpa iklan berbayar" }],
      edu: [{ school: "Universitas Contoh", major: "S1 Ilmu Komunikasi", city: "Bandung", start: "2017", end: "2021", gpa: "3,55" }],
      skills: "Strategi Konten, Instagram, TikTok, Analisis Performa Konten, Copywriting, CapCut, Canva, Penjadwalan Konten, Riset Tren",
      certs: "Social Media Marketing (2022)\nGoogle Analytics untuk Pemula (2022)", langs: "Indonesia (Native); Inggris (Menengah)" }
  };

  var S = load() || blank();
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); return j && j.exp ? j : null; } catch (e) { return null; } }
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* mode pribadi: abaikan */ } }, 400); }

  /* ---------- form ---------- */
  function inp(k, label, ph, list, i, type) {
    var v = list ? S[list][i][k] : S[k];
    var a = ' data-k="' + k + '"' + (list ? ' data-l="' + list + '" data-i="' + i + '"' : "");
    return '<label class="cvf"><span>' + label + '</span><input type="' + (type || "text") + '" value="' + esc(v) + '" placeholder="' + esc(ph || "") + '"' + a + ' autocomplete="off"></label>';
  }
  function area(k, label, ph, rows, list, i) {
    var v = list ? S[list][i][k] : S[k];
    var a = ' data-k="' + k + '"' + (list ? ' data-l="' + list + '" data-i="' + i + '"' : "");
    return '<label class="cvf"><span>' + label + '</span><textarea rows="' + (rows || 3) + '" placeholder="' + esc(ph || "") + '"' + a + '>' + esc(v) + '</textarea></label>';
  }
  function row(a, b) { return '<div class="cvr">' + a + b + "</div>"; }
  function renderForm() {
    var h = '<details open class="cvs"><summary>Data diri</summary>' +
      row(inp("name", "Nama lengkap", "Rina Putri Lestari"), inp("role", "Posisi yang dilamar", "Staf Administrasi")) +
      row(inp("email", "Email", "nama@email.com", 0, 0, "email"), inp("phone", "Nomor HP/WA", "0812 3456 7890")) +
      row(inp("city", "Kota", "Jakarta Barat"), inp("link", "LinkedIn / portofolio (opsional)", "linkedin.com/in/nama")) + "</details>";
    h += '<details open class="cvs"><summary>Ringkasan profil</summary>' + area("summary", "2–4 kalimat: siapa kamu, pengalaman utama, dan posisi yang dicari", "Lulusan S1 … dengan pengalaman …", 4) + "</details>";
    h += '<details open class="cvs"><summary>Pengalaman kerja</summary>';
    S.exp.forEach(function (x, i) {
      h += '<div class="cvi"><div class="cvih"><b>Pengalaman ' + (i + 1) + '</b>' + (S.exp.length > 1 ? '<button type="button" class="cvx" data-del="exp" data-i="' + i + '">Hapus</button>' : "") + "</div>" +
        row(inp("title", "Jabatan", "Admin Toko Online", "exp", i), inp("company", "Perusahaan", "Toko Contoh", "exp", i)) +
        row(inp("city", "Kota", "Jakarta", "exp", i), row2(inp("start", "Mulai", "Jan 2023", "exp", i), inp("end", "Selesai", "Sekarang", "exp", i))) +
        area("bullets", "Pencapaian (satu per baris, awali kata kerja, sertakan angka)", "Mengelola 40 pesanan per hari …", 5, "exp", i) + "</div>";
    });
    h += '<button type="button" class="btn cvadd" data-add="exp">+ Tambah pengalaman</button></details>';
    h += '<details open class="cvs"><summary>Pendidikan</summary>';
    S.edu.forEach(function (x, i) {
      h += '<div class="cvi"><div class="cvih"><b>Pendidikan ' + (i + 1) + '</b>' + (S.edu.length > 1 ? '<button type="button" class="cvx" data-del="edu" data-i="' + i + '">Hapus</button>' : "") + "</div>" +
        row(inp("school", "Institusi", "Universitas Terbuka", "edu", i), inp("major", "Jurusan / program", "S1 Manajemen", "edu", i)) +
        row(inp("city", "Kota", "Jakarta", "edu", i), row2(inp("start", "Mulai", "2021", "edu", i), inp("end", "Selesai", "2025", "edu", i))) +
        inp("gpa", "IPK (opsional)", "3,40", "edu", i) + "</div>";
    });
    h += '<button type="button" class="btn cvadd" data-add="edu">+ Tambah pendidikan</button></details>';
    h += '<details open class="cvs"><summary>Keahlian, sertifikat, bahasa</summary>' +
      area("skills", "Keahlian (pisahkan dengan koma)", "Microsoft Excel, Administrasi, Komunikasi", 3) +
      area("certs", "Sertifikat / pelatihan (satu per baris)", "Pelatihan Excel (2023)", 3) +
      area("langs", "Bahasa", "Indonesia (Native); Inggris (Menengah)", 2) + "</details>";
    $("#cvForm").innerHTML = h;
  }
  function row2(a, b) { return '<div class="cvr2">' + a + b + "</div>"; }

  /* ---------- model CV (dipakai untuk pratinjau, Word, dan pengecek) ---------- */
  function lines(t) { return String(t || "").split(/\n+/).map(function (x) { return x.replace(/^[\s\-–•*]+/, "").trim(); }).filter(Boolean); }
  function range(a, b) { a = (a || "").trim(); b = (b || "").trim(); return a && b ? a + " – " + b : a || b; }
  function model() {
    var contact = [S.email, S.phone, S.city, S.link].map(function (x) { return (x || "").trim(); }).filter(Boolean);
    var sec = [];
    if (S.summary.trim()) sec.push({ t: "RINGKASAN PROFIL", b: [{ text: S.summary.trim() }] });
    var exp = S.exp.filter(function (x) { return x.title.trim() || x.company.trim() || x.bullets.trim(); }).map(function (x) {
      return { head: [x.title.trim(), x.company.trim()].filter(Boolean).join(" | "), sub: [range(x.start, x.end), x.city.trim()].filter(Boolean).join(" | "), bullets: lines(x.bullets) };
    });
    if (exp.length) sec.push({ t: "PENGALAMAN KERJA", b: exp });
    var edu = S.edu.filter(function (x) { return x.school.trim() || x.major.trim(); }).map(function (x) {
      return { head: [x.school.trim(), x.major.trim()].filter(Boolean).join(" | "), sub: [range(x.start, x.end), x.city.trim(), x.gpa.trim() ? "IPK " + x.gpa.trim() : ""].filter(Boolean).join(" | "), bullets: [] };
    });
    if (edu.length) sec.push({ t: "PENDIDIKAN", b: edu });
    var sk = S.skills.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (sk.length) sec.push({ t: "KEAHLIAN", b: [{ text: sk.join(", ") }] });
    var ce = lines(S.certs);
    if (ce.length) sec.push({ t: "SERTIFIKASI DAN PELATIHAN", b: [{ head: "", sub: "", bullets: ce }] });
    if (S.langs.trim()) sec.push({ t: "BAHASA", b: [{ text: S.langs.trim() }] });
    return { name: S.name.trim(), role: S.role.trim(), contact: contact, sec: sec };
  }
  function toText(m) {
    var o = [m.name, m.role, m.contact.join(" | ")];
    m.sec.forEach(function (s) { o.push(s.t); s.b.forEach(function (b) { if (b.text) o.push(b.text); if (b.head) o.push(b.head); if (b.sub) o.push(b.sub); (b.bullets || []).forEach(function (x) { o.push(x); }); }); });
    return o.join("\n");
  }
  function toHtml(m) {
    if (!m.name && !m.sec.length) return '<p class="cvempty">Isi formulir di samping, atau pilih contoh di atas. CV akan muncul di sini.</p>';
    var h = '<h1>' + esc(m.name || "Nama Lengkap") + "</h1>" + (m.role ? '<div class="cvrole">' + esc(m.role) + "</div>" : "") + (m.contact.length ? '<div class="cvct">' + m.contact.map(esc).join(" | ") + "</div>" : "");
    m.sec.forEach(function (s) {
      h += "<h2>" + esc(s.t) + "</h2>";
      s.b.forEach(function (b) {
        if (b.text) h += "<p>" + esc(b.text) + "</p>";
        if (b.head) h += '<div class="cvh">' + esc(b.head) + "</div>";
        if (b.sub) h += '<div class="cvsub">' + esc(b.sub) + "</div>";
        if (b.bullets && b.bullets.length) h += "<ul>" + b.bullets.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      });
    });
    return h;
  }

  /* ---------- pengecek ATS ---------- */
  var VERB = /^(me|mem|men|meng|meny|ber|ter|di|pe|pen|peng|mem)[a-z]{3,}|^(lead|manage|create|build|develop|improve|reduce|increase|handle|prepare|coordinate|analy[sz]e|design|deliver|support|train)/i;
  function checks() {
    var out = [], m = model(), txt = toText(m);
    function add(ok, good, bad, soft) { out.push({ ok: ok, t: ok ? good : bad, soft: !!soft }); }
    add(!!(S.name.trim() && S.email.trim() && S.phone.trim()), "Nama, email, dan nomor HP terisi", "Lengkapi nama, email, dan nomor HP");
    add(!S.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(S.email.trim()), "Format email benar", "Format email belum benar");
    var sw = S.summary.trim() ? S.summary.trim().split(/\s+/).length : 0;
    add(sw >= 25 && sw <= 90, "Ringkasan profil pas (" + sw + " kata)", sw ? "Ringkasan " + sw + " kata: usahakan 25–90 kata" : "Tambahkan ringkasan profil 2–4 kalimat");
    var exps = m.sec.filter(function (s) { return s.t === "PENGALAMAN KERJA"; })[0];
    add(!!exps, "Ada bagian pengalaman kerja", "Isi minimal satu pengalaman (magang, freelance, dan organisasi juga boleh)");
    if (exps) {
      var thin = exps.b.filter(function (b) { return b.bullets.length < 2; }).length;
      add(!thin, "Setiap pengalaman punya 2 poin atau lebih", thin + " pengalaman punya kurang dari 2 poin pencapaian");
      var all = []; exps.b.forEach(function (b) { all = all.concat(b.bullets); });
      var num = all.filter(function (x) { return /\d/.test(x); }).length;
      add(all.length && num / all.length >= 0.5, "Banyak poin memuat angka/hasil terukur", "Tambahkan angka (jumlah, persen, waktu) di lebih banyak poin pencapaian", true);
      var vb = all.filter(function (x) { return VERB.test(x); }).length;
      add(all.length && vb / all.length >= 0.6, "Poin diawali kata kerja", "Awali poin dengan kata kerja (Mengelola, Menyusun, Meningkatkan)", true);
    }
    add(m.sec.some(function (s) { return s.t === "PENDIDIKAN"; }), "Ada bagian pendidikan", "Isi riwayat pendidikan");
    var skn = S.skills.split(/[,;\n]+/).filter(function (x) { return x.trim(); }).length;
    add(skn >= 5, "Keahlian cukup (" + skn + ")", "Tambahkan keahlian: minimal 5, sesuai lowongan");
    var wc = txt.split(/\s+/).length;
    add(wc >= 150 && wc <= 700, "Panjang CV wajar (" + wc + " kata)", wc < 150 ? "CV masih terlalu singkat (" + wc + " kata)" : "CV " + wc + " kata: ringkas jadi maksimal 2 halaman", true);
    return out;
  }
  var STOP = ("dan yang untuk dengan atau dari pada dalam akan oleh juga serta agar bagi sebagai adalah ini itu para dapat lebih sangat memiliki minimal maksimal kami anda kamu posisi lowongan kualifikasi persyaratan tanggung jawab pengalaman tahun mampu bisa the and for with you our are will have has from that this your work team ability years experience").split(" ");
  function keywords(job) {
    var f = {};
    String(job || "").toLowerCase().replace(/[^a-z0-9+#\s-]/g, " ").split(/\s+/).forEach(function (w) { w = w.replace(/^-+|-+$/g, ""); if (w.length < 4 || STOP.indexOf(w) >= 0 || /^\d+$/.test(w)) return; f[w] = (f[w] || 0) + 1; });
    return Object.keys(f).sort(function (a, b) { return f[b] - f[a] || a.length - b.length; }).slice(0, 16);
  }
  function renderChecks() {
    var c = checks(), good = c.filter(function (x) { return x.ok; }).length;
    $("#cvScore").textContent = good + " / " + c.length;
    $("#cvChecks").innerHTML = c.map(function (x) { return '<li class="' + (x.ok ? "ok" : x.soft ? "warn" : "bad") + '">' + (x.ok ? "✓ " : x.soft ? "• " : "✗ ") + esc(x.t) + "</li>"; }).join("");
    var job = $("#cvJob").value, kw = keywords(job), box = $("#cvKw");
    if (!kw.length) { box.innerHTML = '<span class="note">Tempel teks lowongan di atas untuk melihat kata kunci yang sudah dan belum ada di CV.</span>'; return; }
    var hay = " " + toText(model()).toLowerCase().replace(/[^a-z0-9+#\s-]/g, " ") + " ", hit = 0;
    var chips = kw.map(function (w) { var ok = hay.indexOf(" " + w) >= 0; if (ok) hit++; return '<span class="kw ' + (ok ? "ok" : "no") + '">' + (ok ? "✓ " : "+ ") + esc(w) + "</span>"; }).join("");
    box.innerHTML = '<div class="note" style="margin-bottom:6px">Cocok <b>' + hit + " dari " + kw.length + "</b> kata kunci. Tambahkan yang bertanda + hanya bila memang sesuai pengalamanmu.</div>" + chips;
  }
  function update() { $("#cvPage").innerHTML = toHtml(model()); renderChecks(); save(); }

  /* ---------- Word (.docx) tanpa pustaka: zip "store" + XML minimal ---------- */
  var CT = null;
  function crc(b) {
    if (!CT) { CT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; } }
    var x = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) x = CT[(x ^ b[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], cd = [], off = 0;
    files.forEach(function (f) {
      var nb = enc.encode(f.n), c = crc(f.d), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, c, true); h.setUint32(18, f.d.length, true); h.setUint32(22, f.d.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, f.d);
      var e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(14, 0x21, true);
      e.setUint32(16, c, true); e.setUint32(20, f.d.length, true); e.setUint32(24, f.d.length, true); e.setUint16(28, nb.length, true); e.setUint32(42, off, true);
      cd.push(new Uint8Array(e.buffer), nb); off += 30 + nb.length + f.d.length;
    });
    var size = 0; cd.forEach(function (x) { size += x.length; });
    var end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(end.buffer)]), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }
  function xe(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function para(text, o) {
    o = o || {};
    var pr = '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 40 : o.after) + '"/>' + (o.hang ? '<w:ind w:left="340" w:hanging="260"/>' : "") + (o.center ? '<w:jc w:val="center"/>' : "") + (o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="444444"/></w:pBdr>' : "");
    return "<w:p><w:pPr>" + pr + '</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' + (o.b ? "<w:b/>" : "") + (o.i ? "<w:i/>" : "") + '<w:sz w:val="' + (o.sz || 21) + '"/></w:rPr><w:t xml:space="preserve">' + xe(text) + "</w:t></w:r></w:p>";
  }
  function docx(m) {
    var p = [];
    p.push(para(m.name || "Nama Lengkap", { b: 1, sz: 36, center: 1, after: 20 }));
    if (m.role) p.push(para(m.role, { sz: 24, center: 1, after: 20 }));
    if (m.contact.length) p.push(para(m.contact.join(" | "), { sz: 20, center: 1, after: 120 }));
    m.sec.forEach(function (s) {
      p.push(para(s.t, { b: 1, sz: 22, before: 180, after: 80, border: 1 }));
      s.b.forEach(function (b) {
        if (b.text) p.push(para(b.text, { after: 60 }));
        if (b.head) p.push(para(b.head, { b: 1, before: 60, after: 0 }));
        if (b.sub) p.push(para(b.sub, { i: 1, sz: 20, after: 20 }));
        (b.bullets || []).forEach(function (x) { p.push(para("• " + x, { hang: 1, after: 20 })); });
      });
    });
    var body = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + p.join("") + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="900" w:bottom="850" w:left="900" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var enc = new TextEncoder();
    return zip([
      { n: "[Content_Types].xml", d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
      { n: "_rels/.rels", d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
      { n: "word/document.xml", d: enc.encode(body) }
    ]);
  }
  function fileName() { var n = (S.name || "CV").trim().replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "") || "CV"; var r = (S.role || "").trim().replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, ""); return "CV_" + n + (r ? "_" + r : ""); }

  /* ---------- aksi ---------- */
  function setAll(d) { S = JSON.parse(JSON.stringify(d)); renderForm(); update(); }
  document.addEventListener("input", function (e) {
    var t = e.target; if (t.id === "cvJob") return renderChecks();
    if (!t.dataset || !t.dataset.k) return;
    if (t.dataset.l) S[t.dataset.l][+t.dataset.i][t.dataset.k] = t.value; else S[t.dataset.k] = t.value;
    update();
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add],[data-del],[data-ex],#cvPrint,#cvDocx,#cvReset"); if (!b) return;
    if (b.dataset.add) { S[b.dataset.add].push(b.dataset.add === "exp" ? { title: "", company: "", city: "", start: "", end: "", bullets: "" } : { school: "", major: "", city: "", start: "", end: "", gpa: "" }); renderForm(); update(); }
    else if (b.dataset.del) { S[b.dataset.del].splice(+b.dataset.i, 1); renderForm(); update(); }
    else if (b.dataset.ex) { if (!S.name.trim() && !S.summary.trim() || confirm("Ganti isi formulir dengan contoh ini? Isian yang ada akan tertimpa.")) setAll(EX[b.dataset.ex]); }
    else if (b.id === "cvPrint") { if (!model().sec.length) return toast("Isi CV dulu."); window.print(); }
    else if (b.id === "cvDocx") {
      if (!model().sec.length) return toast("Isi CV dulu.");
      var a = document.createElement("a"); a.href = URL.createObjectURL(docx(model())); a.download = fileName() + ".docx"; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } else if (b.id === "cvReset") { if (confirm("Hapus semua isian CV di perangkat ini?")) { try { localStorage.removeItem(KEY); } catch (x) { /* abaikan */ } setAll(blank()); } }
  });
  function toast(t) { var n = $("#cvToast"); n.textContent = t; setTimeout(function () { n.textContent = ""; }, 2500); }

  renderForm(); update();
})();
