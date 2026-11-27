(function () {
  var A = document.getElementById("app"), MSG = document.getElementById("msg"), S = null;
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function dt(t) { return t ? new Date(t).toLocaleString("id-ID") : "-"; }
  function rp(n) { return "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function say(t, bad) { MSG.className = "m" + (bad ? " err" : ""); MSG.textContent = t || ""; }
  function call(method, url, body, form) {
    var o = { method: method }; if (body && !form) { o.headers = { "Content-Type": "application/json" }; o.body = JSON.stringify(body); } else if (form) o.body = body;
    return fetch(url, o).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Gagal."); return j; }); });
  }
  function act(method, url, body, after) { say("Memproses…"); return call(method, url, body).then(function (j) { say("Tersimpan."); if (after) after(j); return load(); }).catch(function (e) { say(e.message, true); }); }
  var ST = { menunggu_bayar: "Belum bayar", menunggu_konfirmasi: "Menunggu konfirmasi", lunas: "Lunas", terkirim: "Terkirim", dibatalkan: "Dibatalkan", baru: "Perlu dicek", valid: "Valid", ditolak: "Ditolak", kurang: "Diminta lengkapi" };
  var st = function (s, d) { return '<span class="st' + (d ? " d" : "") + '">' + esc(ST[s] || s) + "</span>"; };

  function soalForm(m) {
    var h = ""; for (var i = 0; i < 5; i++) {
      var s = (m && m.soal && m.soal[i]) || { q: "", o: ["", "", "", ""], k: 0, b: "" };
      h += '<div class="sq" data-i="' + i + '"><b>Soal ' + (i + 1) + '</b><br><textarea rows="2" data-f="q" placeholder="Pertanyaan">' + esc(s.q) + "</textarea>"
        + [0, 1, 2, 3].map(function (j) { return '<input data-f="o' + j + '" placeholder="Pilihan ' + "ABCD"[j] + '" value="' + esc(s.o[j]) + '" size="40">'; }).join("<br>")
        + '<br>Kunci: <select data-f="k">' + [0, 1, 2, 3].map(function (j) { return '<option value="' + j + '"' + (s.k === j ? " selected" : "") + ">" + "ABCD"[j] + "</option>"; }).join("") + '</select><br><textarea rows="2" data-f="b" placeholder="Pembahasan singkat">' + esc(s.b) + "</textarea></div>";
    } return h;
  }
  function readSoal(box) {
    var out = []; box.querySelectorAll(".sq").forEach(function (q) {
      var g = function (f) { return q.querySelector('[data-f="' + f + '"]').value.trim(); };
      if (!g("q") && ![0, 1, 2, 3].some(function (j) { return g("o" + j); })) return;
      out.push({ q: g("q"), o: [g("o0"), g("o1"), g("o2"), g("o3")], k: +q.querySelector('[data-f="k"]').value, b: g("b") });
    }); return out;
  }
  function mkBox(m) {
    var n = !m; m = m || { kode: "", nama: "", jenis: "Objektif", periode: "20262", harga: 50000, tampil: false };
    return '<details class="o" data-id="' + (m.id || "") + '"><summary><b>' + (n ? "+ Tambah mata kuliah" : esc(m.kode) + " · " + esc(m.nama)) + "</b> " + (n ? "" : st(m.tampil ? "valid" : "ditolak", m.tampil).replace(">Valid<", ">Tampil<").replace(">Ditolak<", ">Disembunyikan<") + ' <span class="m">/kisi-kisi/' + esc(m.slug) + " · " + (m.soal.length) + " soal · " + (m.file ? "file: " + esc(m.file) : "file belum ada") + "</span>") + "</summary>"
      + '<p>Kode <input data-f="kode" value="' + esc(m.kode) + '" size="12"' + (n ? "" : " readonly") + '> Nama <input data-f="nama" value="' + esc(m.nama) + '" size="36"> Jenis <select data-f="jenis"><option value=""' + (m.jenis ? "" : " selected") + '>Tidak disebut</option><option' + (m.jenis === "Objektif" ? " selected" : "") + ">Objektif</option><option" + (m.jenis === "Uraian" ? " selected" : "") + '>Uraian</option></select> Periode <input data-f="periode" value="' + esc(m.periode) + '" size="6"> Harga <input data-f="harga" type="number" value="' + m.harga + '" style="width:110px"> <label><input type="checkbox" data-f="tampil"' + (m.tampil ? " checked" : "") + '> Tampil di situs</label></p>'
      + soalForm(m) + '<p><button data-a="simpan">Simpan</button>' + (n ? "" : ' <span class="m">Unggah file lengkap (PDF/Word/ZIP):</span> <input type="file" data-f="file"> <button class="g" data-a="unggah">Unggah</button>' + (m.file ? ' <a href="/ms/admin/kisi/mk/' + m.id + '/file">Unduh file</a>' : "")) + "</p></details>";
  }

  /* ribuan MK: dikelompokkan per huruf awal nama (A-Z), bisa dicari, difilter, dan dimuat bertahap */
  var HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var hOf = function (m) { var c = String(m.nama || "").trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "Z"; };
  function mkList() {
    var t = ((document.getElementById("mkq") || {}).value || "").trim().toLowerCase(), h = S.huruf || "", f = S.flt || "semua", lim = S.lim || 30;
    var byH = {}; S.mk.forEach(function (m) { var k = hOf(m); byH[k] = (byH[k] || 0) + 1; });
    var pool = S.mk.slice().sort(function (x, y) { return String(x.nama).localeCompare(String(y.nama), "id"); });
    if (f === "soal") pool = pool.filter(function (m) { return m.soal.length; });
    if (f === "draf") pool = pool.filter(function (m) { return m.soal.length && !m.tampil; });
    if (f === "file") pool = pool.filter(function (m) { return m.file; });
    if (t) pool = pool.filter(function (m) { return (m.kode + " " + m.nama).toLowerCase().indexOf(t) >= 0; });
    else if (h) pool = pool.filter(function (m) { return hOf(m) === h; });
    var cut = pool.slice(0, lim);
    var chip = function (k, label, on) { return '<button type="button" class="hz' + (on ? " on" : "") + '" data-h="' + k + '">' + label + "</button>"; };
    var fch = function (k, label) { return '<button type="button" class="hz' + (f === k ? " on" : "") + '" data-flt="' + k + '">' + label + "</button>"; };
    var bar = '<div class="hzb">' + chip("", "Semua", !h) + HURUF.filter(function (k) { return byH[k]; }).map(function (k) { return chip(k, k + " <small>" + byH[k] + "</small>", h === k); }).join("") + "</div>"
      + '<div class="hzb">' + fch("semua", "Semua MK") + fch("soal", "Ada soal (" + S.mk.filter(function (m) { return m.soal.length; }).length + ")") + fch("draf", "Draf disembunyikan") + fch("file", "Ada file (" + S.mk.filter(function (m) { return m.file; }).length + ")") + "</div>";
    return bar + '<p class="m">' + S.mk.length + " mata kuliah" + (h && !t ? ", huruf " + h : "") + ". Menampilkan " + cut.length + " dari " + pool.length + ". " + S.mk.filter(function (m) { return m.file; }).length + " punya file lengkap.</p>"
      + cut.map(mkBox).join("") + (pool.length > cut.length ? '<p><button type="button" class="g" data-more="1">Tampilkan 30 lagi</button></p>' : "") + (t ? "" : mkBox(null));
  }
  function mkRefresh() { var l = document.getElementById("mkl"); if (l) l.innerHTML = mkList(); }
  function render() {
    var q0 = (document.getElementById("mkq") || {}).value || "";
    var h = '<h2>Mata kuliah</h2><p><input id="mkq" type="search" size="40" placeholder="Cari kode atau nama mata kuliah" value="' + esc(q0) + '"></p><div id="mkl">' + mkList() + "</div>";
    h += '<p><button class="g" data-a="harga">Atur harga semua MK</button></p>';
    h += "<h2>Pesanan</h2>" + (S.pesanan.length ? "<table><tr><th>Pesanan</th><th>MK</th><th>WA</th><th>Total</th><th>Status</th><th>Aksi</th></tr>" + S.pesanan.map(function (o) {
      var b = "";
      if (o.status === "menunggu_bayar" || o.status === "menunggu_konfirmasi") b = '<button data-p="konfirmasi" data-id="' + o.id + '">Konfirmasi bayar</button><button class="g" data-p="batal" data-id="' + o.id + '">Batalkan</button>';
      if (o.status === "lunas") b = '<button class="g" data-p="terkirim" data-id="' + o.id + '">Tandai terkirim</button>' + (o.file_name ? ' <span class="m">pelanggan bisa unduh sendiri</span>' : ' <span class="m">file MK belum ada: pelanggan chat admin, kirim file manual</span>');
      return "<tr><td>" + esc(o.id) + '<br><span class="m">' + dt(o.created_at) + "</span></td><td>" + esc(o.mk_nama) + "</td><td>" + esc(o.wa) + "</td><td>" + rp(o.total) + (o.voucher_code ? '<br><span class="m">voucher ' + esc(o.voucher_code) + "</span>" : "") + "</td><td>" + st(o.status, o.status === "terkirim") + "</td><td>" + b + "</td></tr>";
    }).join("") + "</table>" : '<p class="m">Belum ada pesanan.</p>');
    h += "<h2>Klaim voucher menunggu dicek</h2>" + (S.klaim.length ? "<table><tr><th>MK</th><th>WA</th><th>Bukti</th><th>Status</th><th>Aksi</th></tr>" + S.klaim.map(function (k) {
      var th = ""; for (var i = 0; i < k.shots; i++) th += '<a href="/ms/admin/kisi/klaim/' + k.id + "/shot/" + i + '" target="_blank"><img src="/ms/admin/kisi/klaim/' + k.id + "/shot/" + i + '" alt="Bukti ' + (i + 1) + '" width="64" height="64" loading="lazy"></a>';
      return "<tr><td>" + esc(k.mk_nama) + "</td><td>" + esc(k.wa) + '</td><td class="thumbs">' + th + "<br><span class=\"m\">" + k.shots + " dari 5</span></td><td>" + st(k.status, k.status === "valid") + (k.voucher_code ? '<br><span class="m">' + esc(k.voucher_code) + "</span>" : "") + "</td><td>" + (k.status === "baru" ? '<button data-k="valid" data-id="' + k.id + '">Valid, kirim kode</button><button class="g" data-k="tolak" data-id="' + k.id + '">Tolak</button><button class="g" data-k="kurang" data-id="' + k.id + '">Minta lengkapi</button>' : "") + "</td></tr>";
    }).join("") + "</table>" : '<p class="m">Belum ada klaim.</p>');
    h += '<p class="m">Satu nomor WhatsApp hanya bisa klaim sekali per MK. Tekan Valid: kode 60% sekali pakai (14 hari, terikat nomor dan MK) dibuat otomatis, lalu WhatsApp terbuka dengan pesan siap kirim.</p>';
    h += '<h2>Voucher</h2><p>Buat voucher: kode <input id="vc" size="10" placeholder="otomatis"> potongan % <input id="vp" type="number" value="30" style="width:70px"> kuota <input id="vq" type="number" value="1" style="width:70px"> sampai <input id="vs" type="date"> <button data-a="voucher">Buat</button></p>'
      + (S.voucher.length ? "<table><tr><th>Kode</th><th>Potongan</th><th>Kuota</th><th>Terpakai</th><th>Berlaku sampai</th><th>Terikat</th><th>Status</th></tr>" + S.voucher.map(function (v) {
        var on = v.aktif && v.terpakai < v.kuota && (!v.berlaku_sampai || v.berlaku_sampai > Date.now());
        return "<tr><td>" + esc(v.code) + "</td><td>" + v.pct + "%</td><td>" + v.kuota + "</td><td>" + v.terpakai + "</td><td>" + (v.berlaku_sampai ? dt(v.berlaku_sampai) : "-") + "</td><td>" + (v.wa ? esc(v.wa) : "-") + '</td><td>' + st(on ? "valid" : "ditolak", on).replace(">Valid<", ">Aktif<").replace(">Ditolak<", ">Nonaktif<") + ' <button class="g" data-v="' + esc(v.code) + '" data-on="' + (v.aktif ? 0 : 1) + '">' + (v.aktif ? "Matikan" : "Aktifkan") + "</button></td></tr>";
      }).join("") + "</table>" : '<p class="m">Belum ada voucher.</p>');
    A.innerHTML = h;
  }
  function load() { return fetch("/ms/admin/kisi", { cache: "no-store" }).then(function (r) { if (r.status === 401 || r.status === 403) throw new Error("Masuk sebagai admin dulu."); return r.json(); }).then(function (j) { var open = [].slice.call(A.querySelectorAll("details[open]")).map(function (d) { return d.dataset.id; }); var keep = S ? { huruf: S.huruf, flt: S.flt, lim: S.lim } : {}; S = j; S.huruf = keep.huruf; S.flt = keep.flt; S.lim = keep.lim; render(); A.querySelectorAll("details").forEach(function (d) { if (open.indexOf(d.dataset.id) >= 0) d.open = true; }); }).catch(function (e) { A.textContent = e.message; }); }

  A.addEventListener("input", function (e) { if (e.target.id === "mkq" && S) { S.lim = 30; mkRefresh(); } });
  A.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.h !== undefined) { S.huruf = b.dataset.h; S.lim = 30; var q = document.getElementById("mkq"); if (q) q.value = ""; return mkRefresh(); }
    if (b.dataset.flt) { S.flt = b.dataset.flt; S.lim = 30; return mkRefresh(); }
    if (b.dataset.more) { S.lim = (S.lim || 30) + 30; return mkRefresh(); }
    var d = b.closest("details"), g = function (f) { return d.querySelector('[data-f="' + f + '"]'); };
    if (b.dataset.a === "simpan") {
      var body = { kode: g("kode").value, nama: g("nama").value, jenis: g("jenis").value, periode: g("periode").value, harga: +g("harga").value, tampil: g("tampil").checked, soal: readSoal(d) };
      return act("PUT", "/ms/admin/kisi/mk", body);
    }
    if (b.dataset.a === "unggah") {
      var f = g("file").files[0]; if (!f) return say("Pilih file dulu.", true); var fd = new FormData(); fd.append("file", f);
      say("Mengunggah…"); return call("POST", "/ms/admin/kisi/mk/" + d.dataset.id + "/file", fd, true).then(function () { say("File tersimpan."); load(); }).catch(function (x) { say(x.message, true); });
    }
    if (b.dataset.a === "harga") { var h = parseInt(prompt("Harga baru untuk semua mata kuliah (angka, contoh 50000):", "50000"), 10); if (h) act("POST", "/ms/admin/kisi/harga", { harga: h }); return; }
    if (b.dataset.a === "voucher") { return act("POST", "/ms/admin/kisi/voucher", { code: document.getElementById("vc").value, pct: +document.getElementById("vp").value, kuota: +document.getElementById("vq").value, sampai: document.getElementById("vs").value }); }
    if (b.dataset.v) return act("POST", "/ms/admin/kisi/voucher/" + encodeURIComponent(b.dataset.v) + "/aktif", { aktif: b.dataset.on === "1" });
    if (b.dataset.p) { if (b.dataset.p === "batal" && !confirm("Batalkan pesanan ini?")) return; return act("POST", "/ms/admin/kisi/pesanan/" + b.dataset.id + "/" + b.dataset.p, {}, function (j) { if (j.wa) window.open(j.wa, "_blank", "noopener"); if (j.auto) say("Terkonfirmasi. File MK ini sudah ada, pelanggan bisa langsung mengunduh dari halaman pesanannya."); }); }
    if (b.dataset.k) { var note = b.dataset.k === "valid" ? "" : (prompt("Catatan untuk arsip (boleh kosong):", "") || ""); return act("POST", "/ms/admin/kisi/klaim/" + b.dataset.id + "/" + b.dataset.k, { note: note }, function (j) { if (j.wa) window.open(j.wa, "_blank", "noopener"); }); }
  });
  load();
})();
