(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return "Rp " + Number(n).toLocaleString("id-ID"); };
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === "class") e.className = attrs[k]; else if (k === "on") Object.keys(attrs.on).forEach(function (ev) { e.addEventListener(ev, attrs.on[ev]); }); else if (attrs[k] != null) e.setAttribute(k, attrs[k]); });
    [].concat(kids == null ? [] : kids).forEach(function (c) { e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); });
    return e;
  }
  function toast(m) { var t = h("div", { class: "toast" }, m); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  function api(path, opt) {
    opt = opt || {}; opt.headers = Object.assign({}, opt.headers || {});
    if (opt.json) { opt.method = opt.method || "POST"; opt.headers["content-type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    return fetch(path, opt).then(function (r) {
      if (r.status === 401) { showLogin(); throw new Error("Sesi habis"); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Gagal (" + r.status + ")"); return j; });
    });
  }
  function dt(ms) { return ms ? new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"; }
  var STAT = { menunggu_bayar: "Menunggu bayar", menunggu_verifikasi: "Menunggu verifikasi", baru_dibayar: "Baru dibayar", dikerjakan: "Dikerjakan", cek_ulang: "Cek ulang", terkirim: "Terkirim", kedaluwarsa: "Kedaluwarsa" };
  var TABS = [["verif", "Verifikasi bayar"], ["lay", "Tugas, Diskusi, Metopen, Revisi"], ["queue", "Cek & Parafrase"], ["audit", "Audit Dokumen"], ["all", "Semua pesanan"], ["set", "QRIS & Pengaturan"], ["img", "Gambar kartu"], ["site", "Gambar situs"], ["wa", "Pesan WhatsApp"], ["ul", "Ulasan pelanggan"]];
  var cur = "verif";
  var EMBED = /[?&]embed=1/.test(location.search);
  if (EMBED) document.documentElement.classList.add("embed");
  var TYPE = { layanan: "Layanan", audit: "Audit", umum: "Cek & Parafrase", metopen: "Cek & Parafrase", artikel: "Cek & Parafrase" };

  /* Login sekarang lewat panel admin Catatan Akademik (akun & peran sendiri), bukan sandi admin nextaja. */
  function showLogin() { try { (EMBED ? window.top : window).location.href = "/admin/#/login"; } catch (e) { location.href = "/admin/#/login"; } }
  $("lgo").onclick = function () {
    $("lerr").classList.add("hidden");
    fetch("/ms/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("pw").value }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Gagal masuk"); }); })
      .then(start).catch(function (e) { $("lerr").textContent = e.message; $("lerr").classList.remove("hidden"); });
  };
  function start() {
    $("login").classList.add("hidden"); $("app").classList.remove("hidden");
    var tb = $("tabs"); tb.textContent = "";
    TABS.forEach(function (t) { tb.appendChild(h("button", { type: "button", "data-t": t[0], class: t[0] === cur ? "on" : "", on: { click: function () { go(t[0]); } } }, t[1])); });
    go(cur);
  }
  function go(t) {
    cur = t; TABS.forEach(function (x) { $("t-" + x[0]).classList.toggle("hidden", x[0] !== t); });
    [].forEach.call($("tabs").children, function (b) { b.classList.toggle("on", b.getAttribute("data-t") === t); });
    ({ queue: renderQueue, verif: renderVerif, all: renderAll, audit: renderAuditList, lay: renderLay, set: renderSettings, wa: renderWa, img: renderImg, site: renderSite, ul: renderUlasan })[t]();
  }
  function waLink(o, text) { return "https://wa.me/" + o.wa + (text ? "?text=" + encodeURIComponent(text) : ""); }

  function actions(o) {
    var a = h("div", { class: "act" });
    var run = function (label, cls, fn) { a.appendChild(h("button", { type: "button", class: "btn " + (cls || ""), on: { click: function (ev) { ev.target.disabled = true; Promise.resolve(fn()).then(function () { go(cur); }).catch(function (e) { toast(e.message); }).then(function () { ev.target.disabled = false; }); } } }, label)); };
    if (o.status === "baru_dibayar" || o.status === "dianalisis") run("Mulai kerja", "g", function () { return api("/ms/admin/parafrase/orders/" + o.orderId + "/start", { json: {} }).then(function () { toast("Dikerjakan: " + o.orderId); }); });
    if (o.paid && !o.filesDeleted) a.appendChild(h("a", { class: "btn o", style: "display:inline-flex;align-items:center;text-decoration:none", href: "/ms/admin/parafrase/orders/" + o.orderId + "/colored" }, "Word berwarna"));
    if (["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang", "terkirim"].includes(o.status) && !o.filesDeleted) {
      var f = h("input", { type: "file", accept: ".docx", class: "hidden" });
      f.addEventListener("change", function () {
        if (!f.files[0]) return; var fd = new FormData(); fd.append("file", f.files[0]);
        api("/ms/admin/parafrase/orders/" + o.orderId + "/revised", { method: "POST", body: fd }).then(function (j) { showReport(o, j.report); go(cur); }).catch(function (e) { toast(e.message); });
      });
      a.appendChild(f); a.appendChild(h("button", { type: "button", class: "btn o", on: { click: function () { f.click(); } } }, o.hasRevised ? "Ganti revisi" : "Unggah revisi"));
    }
    if (o.hasRevised && ["cek_ulang", "dikerjakan", "terkirim"].includes(o.status) && !o.filesDeleted) {
      a.appendChild(h("button", { type: "button", class: "btn o", on: { click: function () { api("/ms/admin/parafrase/orders/" + o.orderId + "/recheck").then(function (j) { showReport(o, j.report); }).catch(function (e) { toast(e.message); }); } } }, "Cek ulang"));
      run(o.status === "terkirim" ? "Kirim ulang hasil" : "Kirim hasil", "g", function () { if (!confirm("Kirim hasil bersih " + o.orderId + " ke murid?")) return null; return api("/ms/admin/parafrase/orders/" + o.orderId + "/finalize", { json: {} }).then(function () { toast("Hasil terkirim: " + o.orderId); }); });
    }
    a.appendChild(h("a", { class: "btn o", style: "display:inline-flex;align-items:center;text-decoration:none", target: "_blank", rel: "noopener", href: waLink(o, "Halo, soal pesanan " + o.orderId + " di NextAja.") }, "WA murid"));
    return a;
  }
  var reportBox = null;
  function showReport(o, r) {
    var lines = ["Hasil cek ulang " + o.orderId, "Kata: " + r.words, "Catatan sebelum: " + r.before.total + " -> sekarang: " + r.now.total, "Kalimat bertanda yang belum diubah: " + r.unchangedSentences];
    Object.keys(r.now.byCode).forEach(function (k) { if (r.before.byCode[k] || r.now.byCode[k]) lines.push("  " + k + ": " + r.before.byCode[k] + " -> " + r.now.byCode[k]); });
    r.unchanged.forEach(function (u) { lines.push("  [" + u.code + "] par. " + u.para + ": " + u.snippet); });
    lines.push("", r.note);
    if (reportBox) reportBox.remove(); reportBox = h("div", { class: "card", style: "margin:14px 0" }, [h("b", {}, "Laporan cek ulang"), h("pre", { class: "rep" }, lines.join("\n")), h("button", { class: "btn ghost", type: "button", on: { click: function () { reportBox.remove(); } } }, "Tutup")]);
    $("t-" + cur).prepend(reportBox);
  }

  function orderTable(rows, withPos) {
    var t = h("table", { class: "tbl" }, [h("thead", {}, h("tr", {}, [withPos ? h("th", {}, "#") : null, h("th", {}, "Pesanan"), h("th", {}, "Kata"), h("th", {}, "Status"), h("th", {}, "Deadline"), h("th", {}, "Bukti"), h("th", {}, "Aksi")].filter(Boolean)))]);
    var tb = h("tbody"); t.appendChild(tb);
    rows.forEach(function (o) {
      tb.appendChild(h("tr", {}, [
        withPos ? h("td", {}, o.position) : null,
        h("td", {}, [h("b", {}, o.orderId), h("div", { class: "muted" }, (TYPE[o.docType] || "Pesanan") + " · " + (o.title || "-")), h("div", { class: "muted" }, "+" + o.wa + " · " + rp(o.total))].filter(Boolean)),
        h("td", {}, Number(o.words).toLocaleString("id-ID")),
        h("td", {}, [h("span", { class: "st" }, STAT[o.status] || o.status), o.lane === "cepat" ? h("span", { class: "st cepat", style: "margin-left:4px" }, "CEPAT") : null].filter(Boolean)),
        h("td", {}, dt(o.deadlineAt)),
        h("td", {}, dt(o.proofAt)),
        h("td", {}, actions(o)),
      ].filter(Boolean)));
    });
    if (!rows.length) tb.appendChild(h("tr", {}, h("td", { colspan: 7, class: "muted" }, "Belum ada.")));
    return h("div", { style: "overflow-x:auto" }, t);
  }
  function renderQueue() {
    var s = $("t-queue"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/queue").then(function (j) {
      s.textContent = ""; s.appendChild(h("p", { class: "muted" }, "Urutan: Dikerjakan tidak tergeser, lalu jalur cepat, lalu biasa. Dalam jalur yang sama mengikuti waktu bukti bayar diunggah. Deadline tidak memengaruhi urutan. Kecepatan rata-rata untuk perkiraan: " + j.avgWordsPerHour + " kata/jam."));
      s.appendChild(orderTable(j.queue.filter(function (o) { return o.docType !== "layanan" && o.docType !== "audit"; }), true));
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderVerif() {
    var s = $("t-verif"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/orders?status=menunggu_verifikasi").then(function (j) {
      s.textContent = ""; if (!j.orders.length) s.appendChild(h("p", { class: "muted" }, "Tidak ada pembayaran yang menunggu verifikasi."));
      j.orders.forEach(function (o) {
        var reason = h("input", { type: "text", placeholder: "Alasan penolakan (opsional)", maxlength: 200 });
        s.appendChild(h("div", { class: "card", style: "margin-bottom:14px;display:flex;flex-wrap:wrap;gap:18px" }, [
          h("div", {}, o.hasProof ? h("img", { class: "proof", alt: "Bukti bayar " + o.orderId, src: "/ms/admin/parafrase/orders/" + o.orderId + "/proof?t=" + (o.proofAt || 0) }) : h("div", { class: "muted" }, "Tidak ada foto")),
          h("div", { style: "flex:1 1 260px;display:flex;flex-direction:column;gap:8px" }, [
            h("b", {}, o.orderId + " · " + (TYPE[o.docType] || "Pesanan") + " · " + (o.title || "-")), h("div", {}, "Nominal HARUS persis: " + rp(o.total) + " (kode unik " + o.uniqueCode + ")"),
            h("div", { class: "muted" }, "Bukti diunggah " + dt(o.proofAt) + " · " + (o.lane === "cepat" ? "JALUR CEPAT" : "biasa") + " · deadline " + dt(o.deadlineAt)), reason,
            h("div", { class: "act" }, [
              h("button", { type: "button", class: "btn g", on: { click: function () { api("/ms/admin/parafrase/orders/" + o.orderId + "/confirm", { json: {} }).then(function () { toast("Dikonfirmasi " + o.orderId); renderVerif(); }).catch(function (e) { toast(e.message); }); } } }, "Konfirmasi"),
              h("button", { type: "button", class: "btn r", on: { click: function () { api("/ms/admin/parafrase/orders/" + o.orderId + "/reject", { json: { reason: reason.value } }).then(function () { toast("Ditolak " + o.orderId); renderVerif(); }).catch(function (e) { toast(e.message); }); } } }, "Tolak"),
            ])])]));
      });
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderAll() {
    var s = $("t-all"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/orders").then(function (j) { s.textContent = ""; s.appendChild(orderTable(j.orders, false)); }).catch(function (e) { s.textContent = e.message; });
  }

  function renderAuditList() {
    var s = $("t-audit"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/orders").then(function (j) {
      s.textContent = ""; s.appendChild(h("p", { class: "muted" }, "Audit Dokumen berjalan otomatis (tanpa AI). Pembayaran dikonfirmasi di tab Verifikasi bayar; hasil langsung terbuka untuk pelanggan setelah lunas."));
      s.appendChild(orderTable(j.orders.filter(function (o) { return o.docType === "audit"; }), false));
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderLay() {
    var s = $("t-lay"); if (s.firstChild) return;
    s.appendChild(h("iframe", { src: "/admin/layanan?embed=1", title: "Pesanan Tugas, Diskusi, Metopen, Revisi", style: "width:100%;height:80vh;border:0;border-radius:12px;background:transparent" }));
  }
  /* kecilkan foto HP sebelum upload supaya tidak mentok batas ukuran server */
  function shrink(file, max) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024 || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (b) {
      var k = Math.min(1, max / Math.max(b.width, b.height)), c = document.createElement("canvas"); c.width = Math.round(b.width * k); c.height = Math.round(b.height * k);
      c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(function (bl) { ok(bl && bl.size < file.size ? new File([bl], "foto.jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.9); });
    }).catch(function () { return file; });
  }
  function upErr(e) { toast(/Failed to fetch|NetworkError|413/.test(e.message) ? "Foto terlalu besar atau koneksi putus. Coba foto yang lebih kecil." : e.message); }

  var LABEL = { price_semester_min: "Paket Semester, mulai dari (Rp)", price_semester_max: "Paket Semester, sampai (Rp)", ga_id: "ID pengukuran GA4 (G-…)", gtm_id: "ID Google Tag Manager (GTM-…)", google_verify_file: "Nama berkas verifikasi Google", drillbit_sim_max: "Batas acuan similarity Drillbit (%)", drillbit_ai_max: "Batas acuan AI Drillbit (%)", price_tugas: "Tugas (Rp)", price_diskusi: "Diskusi (Rp)", price_metopen1: "Metopen Tugas 1 (Rp)", price_metopen2: "Metopen Tugas 2 (Rp)", price_metopen3: "Metopen Tugas 3 (Rp)", price_metopen4: "Metopen Tugas 4 (Rp)", price_metopen_paket: "Paket Komplit Metopen (Rp)", price_revisi_tugas: "Revisi Tugas dari luar (Rp)", price_revisi_diskusi: "Revisi Diskusi dari luar (Rp)", price_revisi_metopen: "Revisi Metopen dari luar (Rp)", audit_per_word: "Audit Lengkap per kata (Rp)", audit_min: "Audit Lengkap harga minimum (Rp)", price_pengarahan_semester: "Pengarahan 1 semester (Rp)", price_pengarahan_lulus: "Pengarahan sampai lulus (Rp)", price_pengarahan_normal: "Harga normal (dicoret) sampai lulus (Rp)", price_per_word: "Harga per kata (Rp)", min_order_price: "Harga minimum per dokumen (Rp)", fast_lane_enabled: "Jalur cepat aktif", fast_lane_price: "Biaya jalur cepat (Rp)", fast_lane_daily_cap: "Kuota jalur cepat per hari", revision_free_count: "Jumlah revisi gratis (Cek & Parafrase)", revision_price_per_word: "Harga revisi berikutnya per kata (Rp)", file_max_mb: "Ukuran file maks (MB)", retention_hours: "File dihapus setelah (jam)", reminder_before_delete_hours: "Pengingat sebelum dihapus (jam)", long_sentence_words: "Kalimat panjang mulai (kata)", preview_open_paragraphs: "Paragraf contoh terbuka (pratinjau gratis)", avg_words_per_hour: "Kecepatan rata-rata (kata/jam)", unique_code_enabled: "Kode unik aktif", unique_code_max: "Kode unik maksimum", payment_window_minutes: "Batas waktu bayar (menit)", admin_wa_number: "WhatsApp admin (62…)", update_group_url: "Tautan grup Ruang Akademik UT", qris_merchant_name: "Nama penerima QRIS" };
  function renderSettings() {
    var s = $("t-set"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/settings").then(function (j) {
      s.textContent = "";
      var fl = j.fastLane, inputs = {};
      s.appendChild(h("div", { class: "card", style: "margin-bottom:14px" }, [h("b", {}, "Jalur cepat hari ini"), h("div", { class: "muted" }, "Terpakai " + fl.used + " dari " + fl.cap + " · sisa " + fl.remaining + (fl.full ? " (PENUH)" : "") + ". Reset tiap pukul 00.00 WIB. Perubahan langsung terlihat di halaman murid.")]));
      var GROUPS = [
        ["Tugas", "Kartu Tugas di hub dan form Layanan.", ["price_tugas"]],
        ["Diskusi", "Kartu Diskusi di hub dan form Layanan.", ["price_diskusi"]],
        ["Metopen", "Per tahap dan paket komplit.", ["price_metopen1", "price_metopen2", "price_metopen3", "price_metopen4", "price_metopen_paket"]],
        ["Revisi", "Revisi untuk hasil dari luar. Hasil buatan kami gratis sesuai jumlah revisi gratis.", ["price_revisi_tugas", "price_revisi_diskusi", "price_revisi_metopen"]],
        ["Cek & Parafrase Mandiri", "Harga per kata, jalur cepat, revisi, dan batas file.", ["price_per_word", "min_order_price", "fast_lane_enabled", "fast_lane_price", "fast_lane_daily_cap", "revision_free_count", "revision_price_per_word", "long_sentence_words", "preview_open_paragraphs", "avg_words_per_hour"]],
        ["Audit Dokumen", "Audit Ringkas gratis. Audit Lengkap dihitung per kata, ada harga minimum. Batas Drillbit hanyalah acuan di layar murid; ketentuan resmi ikut prodi dan tutor.", ["audit_per_word", "audit_min", "drillbit_sim_max", "drillbit_ai_max"]],
        ["Paket Semester", "Rentang harga di kartu Paket Semester pada hub.", ["price_semester_min", "price_semester_max"]],
        ["Pengarahan Intensif", "Kartu Pengarahan di hub.", ["price_pengarahan_semester", "price_pengarahan_lulus", "price_pengarahan_normal"]],
        ["Pembayaran", "Berlaku untuk semua layanan. Foto QRIS ada di kartu bawah.", ["qris_merchant_name", "payment_window_minutes", "unique_code_enabled", "unique_code_max"]],
        ["Kontak dan file", "WhatsApp admin, grup, ukuran dan masa simpan file.", ["admin_wa_number", "update_group_url", "file_max_mb", "retention_hours", "reminder_before_delete_hours"]],
        ["Analitik Google", "GA4 langsung lewat ID G-… . Bila memakai Tag Manager, isi ID GTM-… dan pasang tag GA4 di dalam GTM (jangan keduanya, nanti terhitung dobel). Kosongkan untuk mematikan. Klik WhatsApp dan klik layanan otomatis tercatat sebagai event.", ["ga_id", "gtm_id"]],
        ["Google Search Console", "Agar blog dan situs terindeks Google: di Search Console pilih verifikasi Berkas HTML, tempel nama berkasnya (contoh google1a2b3c4d5e6f.html), simpan, lalu klik Verifikasi di Google. Sitemap sudah otomatis di nextaja.com/sitemap.xml.", ["google_verify_file"]],
      ];
      s.appendChild(h("p", { class: "muted" }, "Satu tempat untuk semua harga dan aturan. Urutannya sama dengan menu di halaman Ruang Akademik. Setelah disimpan, hub, form, dan landing langsung memakai angka baru."));
      GROUPS.forEach(function (g) {
        var grid = h("div", { class: "grid" });
        g[2].forEach(function (k) {
          var v = j.values[k], inp;
          if (typeof v === "boolean") { inp = h("select", {}, [h("option", { value: "true" }, "Ya"), h("option", { value: "false" }, "Tidak")]); inp.value = String(v); }
          else inp = h("input", { type: "text", value: v == null ? "" : String(v) });
          inputs[k] = inp; grid.appendChild(h("div", { class: "fld" }, [h("label", {}, LABEL[k] || k), inp]));
        });
        s.appendChild(h("div", { class: "card", style: "margin-bottom:14px" }, [h("b", {}, g[0]), h("div", { class: "muted", style: "margin-bottom:10px" }, g[1]), grid]));
      });
      s.appendChild(h("div", { style: "margin-top:14px" }, h("button", { class: "btn", type: "button", on: { click: function () {
        var v = {}; Object.keys(inputs).forEach(function (k) { var x = inputs[k].value; v[k] = typeof j.values[k] === "number" ? (x.trim() === "" ? x : Number(x)) : x; });
        api("/ms/admin/parafrase/settings", { method: "PUT", json: { values: v } }).then(function () { toast("Tersimpan"); renderSettings(); }).catch(function (e) { toast(e.message); });
      } } }, "Simpan pengaturan")));
      var q = h("input", { type: "file", accept: "image/png,image/jpeg", class: "hidden" });
      q.addEventListener("change", function () { var f0 = q.files[0]; if (!f0) return; toast("Mengunggah QRIS…"); shrink(f0, 1600).then(function (f1) { var fd = new FormData(); fd.append("qris", f1); return api("/ms/admin/parafrase/qris", { method: "POST", body: fd }); }).then(function () { toast("QRIS dipasang"); renderSettings(); }).catch(upErr); });
      s.appendChild(h("div", { class: "card", style: "margin-top:18px;display:flex;flex-wrap:wrap;gap:16px;align-items:center" }, [
        j.values.qris_image_path ? h("img", { class: "proof", alt: "QRIS saat ini", src: "/ms/parafrase/qris?t=" + Date.now() }) : h("div", { class: "muted" }, "QRIS belum dipasang."),
        h("div", {}, [h("b", {}, "Foto QRIS"), h("div", { class: "muted" }, "JPG atau PNG. Foto besar dikecilkan otomatis. Dipakai di halaman bayar semua layanan."), q, h("button", { class: "btn o", type: "button", style: "margin-top:8px", on: { click: function () { q.click(); } } }, "Unggah foto QRIS")])]));
      var lg = h("div", { class: "card", style: "margin-top:18px" }, [h("b", {}, "Riwayat perubahan")]);
      j.log.slice(0, 15).forEach(function (l) { lg.appendChild(h("div", { class: "muted" }, dt(l.at) + " · " + (LABEL[l.key] || l.key) + ": " + l.old_value + " → " + l.new_value)); });
      s.appendChild(lg);
    }).catch(function (e) { s.textContent = e.message; });
  }
  var CARDNAME = { tugas: "Tugas", diskusi: "Diskusi", metopen: "Metopen", audit: "Audit Dokumen", revisi: "Revisi", pengarahan: "Pengarahan Intensif", cek: "Cek dan Parafrase Mandiri", semester: "Paket Semester", info: "Info UT (menuju blog)" };
  function renderImg() {
    var s = $("t-img"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/card-images").then(function (j) {
      s.textContent = ""; s.appendChild(h("p", { class: "muted" }, "Gambar tampil di bagian atas kartu layanan di Ruang Akademik UT. JPG, PNG, atau WebP; dikecilkan dan dipotong otomatis ke rasio 4:3. Tanpa gambar, kartu tampil polos."));
      var g = h("div", { class: "grid" }); s.appendChild(g);
      j.slugs.forEach(function (x) {
        var f = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "hidden" });
        f.addEventListener("change", function () { var f0 = f.files[0]; if (!f0) return; toast("Mengunggah…"); shrink(f0, 1600).then(function (f1) { var fd = new FormData(); fd.append("img", f1); return api("/ms/admin/parafrase/card-images/" + x.slug, { method: "POST", body: fd }); }).then(function () { toast("Gambar dipasang"); renderImg(); }).catch(upErr); });
        g.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
          h("b", {}, CARDNAME[x.slug] || x.slug),
          x.has ? h("img", { class: "proof", alt: "", src: "/ruangakademikut/img/" + x.slug + ".webp?t=" + Date.now(), style: "max-width:100%" }) : h("div", { class: "muted" }, "Belum ada gambar."),
          f,
          h("div", { class: "act" }, [h("button", { class: "btn", type: "button", on: { click: function () { f.click(); } } }, x.has ? "Ganti gambar" : "Unggah gambar"),
            x.has ? h("button", { class: "btn o", type: "button", on: { click: function () { api("/ms/admin/parafrase/card-images/" + x.slug, { method: "DELETE" }).then(function () { toast("Gambar dihapus"); renderImg(); }); } } }, "Hapus") : null].filter(Boolean))]));
      });
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderSite() {
    var s = $("t-site"); s.textContent = "Memuat…";
    api("/ms/admin/site-images").then(function (j) {
      s.textContent = ""; s.appendChild(h("p", { class: "muted" }, "Ganti gambar landing nextaja.com serta banner blog dan portal dari sini. Foto besar dikecilkan otomatis. Gambar produk, jasa, ulasan, dan sampul tulisan diganti di tab admin masing-masing. Setelah diganti, refresh halaman web."));
      j.groups.forEach(function (g) {
        s.appendChild(h("h3", { style: "margin:18px 0 8px" }, g.label));
        var grid = h("div", { class: "grid" }); s.appendChild(grid);
        g.items.forEach(function (x) {
          var f = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp", class: "hidden" });
          f.addEventListener("change", function () { var f0 = f.files[0]; if (!f0) return; toast("Mengunggah…"); shrink(f0, 1800).then(function (f1) { var fd = new FormData(); fd.append("img", f1); return api("/ms/admin/site-images/" + g.group + "/" + x.name, { method: "POST", body: fd }); }).then(function () { toast("Gambar dipasang"); renderSite(); }).catch(upErr); });
          grid.appendChild(h("div", { class: "card", style: "display:flex;flex-direction:column;gap:10px" }, [
            h("b", {}, x.label), h("img", { class: "proof", alt: "", src: "/site-img/" + g.group + "/" + x.name + ".webp?t=" + Date.now(), style: "max-width:100%;background:#8884" }),
            h("div", { class: "muted" }, x.has ? "Sudah diganti admin." : "Masih gambar bawaan."), f,
            h("div", { class: "act" }, [h("button", { class: "btn", type: "button", on: { click: function () { f.click(); } } }, "Ganti gambar"),
              x.has ? h("button", { class: "btn o", type: "button", on: { click: function () { api("/ms/admin/site-images/" + g.group + "/" + x.name, { method: "DELETE" }).then(function () { toast("Kembali ke gambar bawaan"); renderSite(); }); } } }, "Kembalikan bawaan") : null].filter(Boolean))]));
        });
      });
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderUlasan() {
    var s = $("t-ul"); s.textContent = "Memuat…";
    api("/ms/admin/ulasan").then(function (j) {
      s.textContent = "";
      s.appendChild(h("p", { class: "muted" }, "Tulis ulasan pelanggan dan lampirkan tangkapan layar chat. Di landing tampil 3D; arahkan kursor ke kartu dan gambarnya keluar. Tampilkan hanya dengan izin pelanggan."));
      var nama = h("input", { placeholder: "Nama (boleh inisial)", maxlength: 60 }), ket = h("input", { placeholder: "Keterangan, misal: Mahasiswa Manajemen UT", maxlength: 80 }),
        teks = h("textarea", { placeholder: "Isi ulasan", rows: 3, maxlength: 500 }), img = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp" }),
        tampil = h("input", { type: "checkbox", checked: "checked" }), eid = null, info = h("div", { class: "muted" }, "Ulasan baru");
      var form = h("div", { class: "card", style: "display:grid;gap:8px;max-width:560px;margin-bottom:16px" }, [info, nama, ket, teks, h("label", {}, ["Gambar chat (opsional) ", img]), h("label", {}, [tampil, " Tampilkan di landing"]),
        h("div", { class: "act" }, [h("button", { type: "button", class: "btn g", on: { click: function () {
          var fd = new FormData(); if (eid) fd.append("id", eid); fd.append("nama", nama.value); fd.append("ket", ket.value); fd.append("teks", teks.value); fd.append("tampil", tampil.checked ? "1" : "0");
          if (img.files[0]) fd.append("img", img.files[0]);
          toast("Menyimpan…"); (img.files[0] ? shrink(img.files[0], 1800) : Promise.resolve(null)).then(function (f1) { if (f1) { fd.delete("img"); fd.append("img", f1); } return api("/ms/admin/ulasan", { method: "POST", body: fd }); })
            .then(function () { toast("Ulasan tersimpan"); renderUlasan(); }).catch(upErr); } } }, "Simpan"),
          h("button", { type: "button", class: "btn o", on: { click: function () { renderUlasan(); } } }, "Kosongkan")])]);
      s.appendChild(form);
      j.items.forEach(function (x) {
        s.appendChild(h("div", { class: "card", style: "display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap" }, [
          x.imgAdmin ? h("img", { src: x.imgAdmin, alt: "", style: "width:64px;height:84px;object-fit:cover;border-radius:8px" }) : null,
          h("div", { style: "flex:1;min-width:200px" }, [h("b", {}, x.nama + (x.ket ? " · " + x.ket : "")), h("div", { class: "muted" }, x.teks), h("div", { class: "muted" }, x.tampil ? "Tampil di landing" : "Disembunyikan")]),
          h("div", { class: "act" }, [
            h("button", { type: "button", class: "btn o", on: { click: function () { eid = x.id; info.textContent = "Ubah ulasan (gambar lama tetap kecuali diganti)"; nama.value = x.nama; ket.value = x.ket || ""; teks.value = x.teks; tampil.checked = x.tampil; form.scrollIntoView({ behavior: "smooth" }); } } }, "Ubah"),
            h("button", { type: "button", class: "btn o", on: { click: function () { api("/ms/admin/ulasan/" + x.id + "/toggle", { method: "POST" }).then(renderUlasan); } } }, x.tampil ? "Sembunyikan" : "Tampilkan"),
            h("button", { type: "button", class: "btn r", on: { click: function () { if (confirm("Hapus ulasan ini permanen? Sembunyikan saja bila ragu.")) api("/ms/admin/ulasan/" + x.id, { method: "DELETE" }).then(renderUlasan); } } }, "Hapus")])].filter(Boolean)));
      });
      if (!j.items.length) s.appendChild(h("p", { class: "muted" }, "Belum ada ulasan."));
    }).catch(function (e) { s.textContent = e.message; });
  }
  function renderWa() {
    var s = $("t-wa"); s.textContent = "Memuat…";
    api("/ms/admin/parafrase/outbox").then(function (j) {
      s.textContent = ""; s.appendChild(h("p", { class: "muted" }, j.webhook ? "Bot WhatsApp tersambung lewat webhook. Pesan terkirim otomatis." : "Bot belum tersambung (PARAFRASE_WA_WEBHOOK belum diatur). Kirim manual lewat tombol di bawah, lalu tandai terkirim."));
      var t = h("table", { class: "tbl" }, h("thead", {}, h("tr", {}, ["Waktu", "Untuk", "Jenis", "Status", "Aksi"].map(function (x) { return h("th", {}, x); })))), tb = h("tbody"); t.appendChild(tb);
      j.rows.forEach(function (r) {
        tb.appendChild(h("tr", {}, [h("td", {}, dt(r.created_at)), h("td", {}, "+" + r.to_number + (r.order_id ? " (" + r.order_id + ")" : "")), h("td", {}, r.kind), h("td", {}, r.status + (r.last_error ? " · " + r.last_error : "")),
          h("td", {}, h("div", { class: "act" }, r.status === "sent" ? [] : [h("a", { class: "btn o", style: "display:inline-flex;align-items:center;text-decoration:none", target: "_blank", rel: "noopener", href: "https://wa.me/" + r.to_number + "?text=" + encodeURIComponent(r.text) }, "Buka WA"), h("button", { class: "btn", type: "button", on: { click: function () { api("/ms/admin/parafrase/outbox/" + r.id + "/sent", { json: {} }).then(renderWa).catch(function (e) { toast(e.message); }); } } }, "Tandai terkirim")]))]));
      });
      if (!j.rows.length) tb.appendChild(h("tr", {}, h("td", { colspan: 5, class: "muted" }, "Belum ada pesan.")));
      s.appendChild(h("div", { style: "overflow-x:auto" }, t));
    }).catch(function (e) { s.textContent = e.message; });
  }
  fetch("/ms/admin/ca/me", { cache: "no-store" }).then(function (r) { r.ok ? start() : showLogin(); }).catch(showLogin);
})();
