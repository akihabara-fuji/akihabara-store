/* Surat lamaran kerja otomatis: mengambil data dari CV yang sudah diisi di perangkat ini (ca-cv-v1), tambah perusahaan dan posisi,
   lalu menyusun surat resmi (Word / PDF) dan versi email singkat. Berbasis templat kalimat, bukan AI, dan tidak ada data dikirim ke server. */
(function () {
  "use strict";
  var KEY = "ca-surat-v1", CVKEY = "ca-cv-v1", W = window.CAW;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return W.esc(s); }
  var BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function today() { var d = new Date(); return d.getDate() + " " + BULAN[d.getMonth()] + " " + d.getFullYear(); }

  var LAMP = [["cv", "Curriculum Vitae (CV)", "CV"], ["ijazah", "Fotokopi ijazah dan transkrip nilai", "ijazah dan transkrip nilai"], ["ktp", "Fotokopi KTP", "KTP"], ["foto", "Pasfoto terbaru", "pasfoto terbaru"], ["sert", "Fotokopi sertifikat pelatihan/keahlian", "sertifikat pelatihan/keahlian"], ["paklaring", "Surat keterangan pengalaman kerja", "surat keterangan pengalaman kerja"]];
  var DEF = { nama: "", email: "", phone: "", city: "", alamat: "", ttl: "", posisi: "", perusahaan: "", kepada: "Bapak/Ibu HRD", kotaPers: "", sumber: "situs lowongan kerja", tanggal: today(), kota: "",
    pend: "", pengalaman: "", keahlian: "", nilai: "", lamp: { cv: true, ijazah: true, ktp: true, foto: true, sert: false, paklaring: false }, from: false };

  /* Contoh FIKTIF (housekeeping/facility) supaya terlihat bentuk akhirnya. */
  var EX = { nama: "Budi Santoso", email: "budi.santoso@contoh.com", phone: "0813 9876 5432", city: "Jakarta Selatan", alamat: "Jl. Contoh No. 10, Jakarta Selatan", ttl: "", posisi: "Facility Supervisor", perusahaan: "PT Contoh Properti Nusantara", kepada: "Bapak/Ibu HRD", kotaPers: "Jakarta", sumber: "situs lowongan kerja", kota: "Jakarta Selatan",
    pend: "Saat ini saya sedang menempuh pendidikan S1 Manajemen di Universitas Terbuka", pengalaman: "Saya memiliki pengalaman lebih dari 8 tahun di bidang operasional dan housekeeping. Terakhir saya bekerja sebagai Operations Supervisor di PT Contoh Facility Services (2022 sampai sekarang), di mana saya memimpin 45 petugas lapangan di 3 area gedung dan menjaga pencapaian SLA di atas 95% per bulan.",
    keahlian: "Manajemen Tim Lapangan, Penjadwalan, Pengendalian SLA, Inspeksi dan Audit, Pelatihan Karyawan", nilai: "" };

  var S = load();
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && typeof j === "object") return Object.assign({}, DEF, j, { lamp: Object.assign({}, DEF.lamp, j.lamp || {}) }); } catch (e) { /* abaikan */ } return Object.assign({}, DEF, { lamp: Object.assign({}, DEF.lamp) }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }
  function readCV() { try { var j = JSON.parse(localStorage.getItem(CVKEY) || "null"); return j && typeof j === "object" ? j : null; } catch (e) { return null; } }

  function lc(s) { s = String(s || "").trim().replace(/[.;]+$/, ""); return s ? s.charAt(0).toLowerCase() + s.slice(1) : ""; }
  function firstList(s, n) { return String(s || "").split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, n); }
  function join(a) { return a.length < 2 ? (a[0] || "") : a.slice(0, -1).join(", ") + " dan " + a[a.length - 1]; }

  /* Susun isian dari CV: hanya mengisi kolom yang masih kosong, atau semuanya bila force. */
  function fromCV(force) {
    var cv = readCV(); if (!cv) return false;
    function put(k, v) { if (v && (force || !String(S[k] || "").trim())) S[k] = v; }
    put("nama", cv.name); put("email", cv.email); put("phone", cv.phone); put("city", cv.city); put("kota", cv.city); put("posisi", cv.role);
    var e = (cv.edu || [])[0];
    if (e && (e.school || e.major)) {
      var ongoing = /sekarang|sedang|berjalan/i.test((e.end || "") + " " + (e.major || ""));
      var maj = String(e.major || "").replace(/\s*\((sedang berjalan|sedang menempuh)\)/i, "").trim();
      put("pend", (ongoing ? "Saat ini saya sedang menempuh pendidikan " : "Saya lulusan ") + [maj, e.school].filter(Boolean).join(" ") + (!ongoing && e.gpa ? " dengan IPK " + e.gpa : ""));
    }
    var x = (cv.exp || [])[0];
    if (x && (x.title || x.company)) {
      var bl = String(x.bullets || "").split("\n").map(function (z) { return z.trim(); }).filter(Boolean).slice(0, 2);
      var cur = /sekarang|saat ini|present/i.test(x.end || "");
      var t = (cur ? "Saat ini saya bekerja sebagai " : "Pengalaman terakhir saya adalah sebagai ") + [x.title, x.company ? "di " + x.company : ""].filter(Boolean).join(" ") + (x.start ? " (" + x.start + (x.end ? " sampai " + (/^sekarang$/i.test(x.end.trim()) ? "sekarang" : x.end) : "") + ")" : "") + ".";
      if (bl.length) t += " Dalam peran tersebut, saya " + bl.map(lc).join(", serta ") + ".";
      put("pengalaman", t);
    }
    put("keahlian", firstList(cv.skills, 5).join(", "));
    S.from = true; return true;
  }

  function lampText(short) { return LAMP.filter(function (l) { return S.lamp[l[0]]; }).map(function (l) { return short ? l[2] : l[1]; }); }
  function P(t, o) { var b = { k: "p", t: t }; for (var k in (o || {})) b[k] = o[k]; return b; }
  function F(v, ph) { v = String(v || "").trim(); return v || ph; }

  function surat() {
    var pos = F(S.posisi, "[Posisi yang Dilamar]"), per = F(S.perusahaan, "[Nama Perusahaan]"), nama = F(S.nama, "[Nama Lengkap]");
    var b = [];
    b.push(P(F(S.kota, "[Kota]") + ", " + F(S.tanggal, today()), { al: "r", af: 14 }));
    var lamp = lampText();
    b.push(P("Hal: Lamaran Pekerjaan sebagai " + pos + (lamp.length ? "\nLampiran: " + lamp.length + " (" + (["nol", "satu", "dua", "tiga", "empat", "lima", "enam"][lamp.length]) + ") berkas" : ""), { af: 12 }));
    b.push(P("Yth. " + F(S.kepada, "Bapak/Ibu HRD") + "\n" + per + (S.kotaPers.trim() ? "\n" + S.kotaPers.trim() : ""), { af: 12 }));
    b.push(P("Dengan hormat,", { af: 8 }));
    b.push(P("Berdasarkan informasi lowongan yang saya peroleh dari " + F(S.sumber, "situs lowongan kerja") + ", saya bermaksud mengajukan lamaran untuk posisi " + pos + " di " + per + ". Adapun data diri saya sebagai berikut:", { al: "j", af: 6 }));
    var d = [["Nama", nama]]; if (S.ttl.trim()) d.push(["Tempat/Tanggal Lahir", S.ttl.trim()]);
    if (S.alamat.trim()) d.push(["Alamat", S.alamat.trim()]); d.push(["No. HP/WA", F(S.phone, "[Nomor HP]")], ["Email", F(S.email, "[Email]")]);
    b.push({ k: "tbl", style: "lines", w: [4.6, 11.4], rows: d.map(function (r) { return [r[0], ": " + r[1]]; }) });
    b.push(P("", { af: 2 }));
    var body = [];
    if (S.pengalaman.trim()) body.push(S.pengalaman.trim());
    if (S.pend.trim() && !/^\s*$/.test(S.pend)) body.push(S.pend.trim().replace(/[.]+$/, "") + ".");
    if (S.keahlian.trim()) body.push("Keahlian utama yang dapat saya kontribusikan meliputi " + join(firstList(S.keahlian, 5)) + ".");
    if (S.nilai.trim()) body.push(S.nilai.trim());
    body.push("Saya siap belajar dan bekerja sama dalam tim, dan berharap dapat memberi kontribusi yang baik bagi " + per + ".");
    body.forEach(function (t) { b.push(P(t, { al: "j", af: 6 })); });
    if (lamp.length) {
      b.push(P("Sebagai bahan pertimbangan, bersama surat ini saya lampirkan:", { af: 3 }));
      lamp.forEach(function (t, i) { b.push(P((i + 1) + ". " + t, { hang: 0.6, ind: 0.4, af: 1 })); });
      b.push(P("", { af: 3 }));
    }
    b.push(P("Demikian surat lamaran ini saya buat. Besar harapan saya untuk dapat diberi kesempatan mengikuti proses seleksi selanjutnya. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.", { al: "j", af: 12 }));
    b.push(P("Hormat saya,\n\n\n\n" + nama, { af: 0 }));
    return [b];
  }

  function emailText() {
    var pos = F(S.posisi, "[Posisi]"), per = F(S.perusahaan, "[Perusahaan]"), nama = F(S.nama, "[Nama Lengkap]"), lamp = lampText();
    var subj = "Lamaran " + pos + " - " + nama;
    var body = "Yth. " + F(S.kepada, "Bapak/Ibu HRD") + " " + per + ",\n\nSaya " + nama + ", bermaksud melamar posisi " + pos + " di " + per + ", sesuai informasi lowongan dari " + F(S.sumber, "situs lowongan kerja") + ".\n\n" +
      [S.pengalaman.trim(), S.keahlian.trim() ? "Keahlian utama saya: " + join(firstList(S.keahlian, 5)) + "." : ""].filter(Boolean).join(" ") +
      "\n\nBersama email ini saya lampirkan " + join(lampText(true).length ? lampText(true) : ["CV"]) + ". Saya siap mengikuti proses seleksi selanjutnya. Terima kasih atas waktu dan perhatian Bapak/Ibu.\n\nHormat saya,\n" + nama + "\n" + F(S.phone, "[Nomor HP]") + " | " + F(S.email, "[Email]");
    return "Subjek: " + subj + "\n\n" + body;
  }

  /* ---------- tampilan ---------- */
  var st = document.createElement("style");
  st.textContent = W.css + ".sp-f{display:block;margin:0 0 10px}.sp-f>span{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:var(--muted)}.sp-f input,.sp-f select,.sp-f textarea{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--dash);background:transparent;color:var(--text);font:inherit;font-size:14.5px}.sp-f textarea{resize:vertical;line-height:1.5}.sp-g{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:22px;align-items:start}.sp-r2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.sp-chk{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:14px;cursor:pointer}.sp-em{width:100%;box-sizing:border-box;min-height:200px;padding:12px;border-radius:10px;border:1px solid var(--dash);background:transparent;color:var(--text);font:inherit;font-size:13.5px;line-height:1.5}@media(max-width:900px){.sp-g{grid-template-columns:minmax(0,1fr)}.sp-side{min-width:0;overflow-x:auto}.sp-r2{grid-template-columns:1fr}}";
  document.head.appendChild(st);

  function inp(k, label, ph, cls) { return '<label class="sp-f"><span>' + esc(label) + '</span><input type="text" data-k="' + k + '" value="' + esc(S[k]) + '" placeholder="' + esc(ph || "") + '" autocomplete="off"></label>'; }
  function area(k, label, ph, rows) { return '<label class="sp-f"><span>' + esc(label) + '</span><textarea rows="' + (rows || 3) + '" data-k="' + k + '" placeholder="' + esc(ph || "") + '">' + esc(S[k]) + "</textarea></label>"; }
  function renderForm() {
    var cv = readCV(), hasCV = cv && (cv.name || (cv.exp && cv.exp[0] && cv.exp[0].title));
    var h = '<div class="card" style="margin:0 0 12px"><b>' + (hasCV ? "Data CV kamu terbaca di perangkat ini" : "Belum ada data CV di perangkat ini") + "</b>" +
      '<p class="note" style="margin:4px 0 8px">' + (hasCV ? "Nama, kontak, pendidikan, pengalaman terakhir, dan keahlian diambil otomatis dari CV. Kamu tinggal mengisi perusahaan dan posisi yang dilamar." : 'Isi dulu <a href="/ruangakademikut/buat-cv-ats" style="color:var(--link)">Buat CV ATS</a> agar surat terisi otomatis, atau isi manual di bawah.') + "</p>" +
      '<div class="cvbar">' + (hasCV ? '<button type="button" class="btn" id="slCV">Ambil ulang dari CV</button>' : "") + '<button type="button" class="btn" id="slEx">Lihat contoh (housekeeping/facility)</button></div></div>';
    h += '<details open class="cvs"><summary>Wajib diisi: lamaran</summary><div class="sp-r2">' + inp("perusahaan", "Nama perusahaan", "PT Contoh Maju Jaya") + inp("posisi", "Posisi yang dilamar", "Facility Supervisor") + "</div>" +
      '<div class="sp-r2">' + inp("kepada", "Ditujukan kepada", "Bapak/Ibu HRD") + inp("kotaPers", "Kota perusahaan (opsional)", "Jakarta") + "</div>" +
      '<label class="sp-f"><span>Tahu lowongan dari</span><select data-k="sumber">' + ["situs lowongan kerja", "JobStreet", "LinkedIn", "Instagram perusahaan", "website resmi perusahaan", "informasi rekan"].map(function (o) { return "<option" + (S.sumber === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></label></details>";
    h += '<details open class="cvs"><summary>Data diri (otomatis dari CV)</summary><div class="sp-r2">' + inp("nama", "Nama lengkap", "") + inp("phone", "Nomor HP/WA", "") + inp("email", "Email", "") + inp("kota", "Kota penulisan surat", "Jakarta") + "</div>" + inp("tanggal", "Tanggal surat", "27 Oktober 2026") + inp("ttl", "Tempat/tanggal lahir (opsional)", "Jakarta, 1 Januari 1998") + inp("alamat", "Alamat (opsional)", "") + "</details>";
    h += '<details open class="cvs"><summary>Isi surat (otomatis dari CV, boleh diedit)</summary>' + area("pend", "Pendidikan", "Saya lulusan S1 Manajemen Universitas Terbuka", 2) + area("pengalaman", "Pengalaman utama", "Saat ini saya bekerja sebagai …", 4) + area("keahlian", "Keahlian utama (pisahkan dengan koma)", "Excel, penjadwalan, komunikasi", 2) + area("nilai", "Nilai tambah atau alasan tertarik (opsional)", "Mengapa kamu cocok untuk perusahaan ini, 1-2 kalimat yang jujur", 3) + "</details>";
    h += '<details class="cvs"><summary>Lampiran</summary>' + LAMP.map(function (l) { return '<label class="sp-chk"><input type="checkbox" data-l="' + l[0] + '"' + (S.lamp[l[0]] ? " checked" : "") + "> " + esc(l[1]) + "</label>"; }).join("") + '<p class="note">Centang sesuai berkas yang benar-benar kamu bawa atau kirim.</p></details>';
    $("#slForm").innerHTML = h;
  }
  function draw() {
    var box = $("#slPages"); box.innerHTML = W.html(surat()); W.fit(box);
    var e = $("#slEmail"); if (e && document.activeElement !== e) e.value = emailText();
    save();
  }

  document.addEventListener("input", function (e) { var t = e.target; if (!t.dataset || !t.closest("#slForm")) return; if (t.dataset.k) { S[t.dataset.k] = t.value; draw(); } });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t.closest || !t.closest("#slForm")) return;
    if (t.dataset.l) { S.lamp[t.dataset.l] = t.checked; draw(); } else if (t.dataset.k) { S[t.dataset.k] = t.value; draw(); }
  });
  function toast(t) { var n = $("#slToast"); n.textContent = t; setTimeout(function () { n.textContent = ""; }, 3500); }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("#slDocx,#slPrint,#slCV,#slEx,#slReset,#slCopy"); if (!b) return;
    if (b.id === "slPrint") { if (!S.perusahaan.trim() && !confirm("Perusahaan belum diisi. Tetap cetak?")) return; window.print(); }
    else if (b.id === "slDocx") {
      b.disabled = true;
      Promise.resolve().then(function () {
        var blob = W.docx(surat(), null);
        W.save(blob, "Surat_Lamaran_" + W.fileSafe(S.nama, "Nama") + "_" + W.fileSafe(S.perusahaan, "Perusahaan") + ".docx"); toast("Word diunduh.");
      }).then(function () { b.disabled = false; }, function () { b.disabled = false; });
    }
    else if (b.id === "slCV") { fromCV(true); renderForm(); draw(); toast("Diisi ulang dari CV."); }
    else if (b.id === "slEx") { if (!S.nama.trim() || confirm("Ganti isian dengan contoh fiktif?")) { Object.assign(S, EX); renderForm(); draw(); } }
    else if (b.id === "slReset") { if (confirm("Hapus isian surat di perangkat ini? (Data CV tidak ikut terhapus.)")) { try { localStorage.removeItem(KEY); } catch (x) { /* abaikan */ } S = Object.assign({}, DEF, { lamp: Object.assign({}, DEF.lamp) }); fromCV(false); renderForm(); draw(); } }
    else if (b.id === "slCopy") {
      var v = $("#slEmail").value, done = function () { toast("Teks email disalin."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { $("#slEmail").select(); toast("Salin manual: tekan Ctrl+C."); });
      else { $("#slEmail").select(); toast("Salin manual: tekan Ctrl+C."); }
    }
  });
  window.addEventListener("resize", function () { W.fit($("#slPages")); });

  if (!S.from) fromCV(false);
  renderForm(); draw();
})();
