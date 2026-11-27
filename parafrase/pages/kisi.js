(function () {
  var $ = function (id) { return document.getElementById(id); };
  function rp(n) { return "Rp" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function api(url, opt) { return fetch(url, opt).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Terjadi kesalahan."); return j; }); }); }
  function post(url, body) { return api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }); }
  function toast(t) { var e = $("kstoast"); if (!e) { e = document.createElement("div"); e.id = "kstoast"; e.className = "ks-toast"; document.body.appendChild(e); } e.textContent = t; e.style.display = "block"; setTimeout(function () { e.style.display = "none"; }, 1600); }
  function modal(html) { var m = document.createElement("div"); m.className = "ks-modal on"; m.innerHTML = '<div class="ks-box" role="dialog" aria-modal="true">' + html + "</div>"; m.addEventListener("click", function (e) { if (e.target === m) m.remove(); }); document.body.appendChild(m); return m; }
  function wire(m, sel, fn) { var e = m.querySelector(sel); if (e) e.addEventListener("click", fn); return e; }

  /* ---------- katalog ---------- */
  var grid = $("ksgrid");
  if (grid) {
    var cards = [].slice.call(grid.querySelectorAll(".ks-card")), max = +grid.dataset.max || 8, all = false, q = $("ksq"), more = $("ksmore");
    var draw = function () {
      var t = (q.value || "").trim().toLowerCase(), n = 0;
      cards.forEach(function (c) { var hit = !t || c.dataset.q.indexOf(t) >= 0; if (hit) n++; c.hidden = !hit || (!all && !t && n > max); });
      $("ksnone").hidden = n > 0 || !t; if (more) more.hidden = all || !!t;
    };
    q.addEventListener("input", draw); if (more) more.querySelector("button").addEventListener("click", function () { all = true; draw(); }); draw();
  }

  /* ---------- halaman satu mata kuliah ---------- */
  var root = $("ksmk");
  if (root) {
    var d = JSON.parse(root.dataset.mk), link = location.origin + location.pathname;
    $("kscopy").addEventListener("click", function () { (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast("Link disalin"); }, function () { window.prompt("Salin link ini:", link); }); });
    $("kscek").addEventListener("click", function () {
      var benar = 0, kosong = 0;
      d.soal.forEach(function (s, i) {
        var fs = $("ksform").querySelectorAll(".ks-q")[i], pick = fs.querySelector("input:checked"), ls = fs.querySelectorAll("label"), pb = fs.querySelector(".ks-pb");
        ls.forEach(function (l) { l.classList.remove("ok", "no"); });
        ls[s.k].classList.add("ok");
        if (!pick) { kosong++; } else if (+pick.value === s.k) { benar++; } else { ls[+pick.value].classList.add("no"); }
        pb.hidden = !s.b; pb.textContent = s.b ? "Pembahasan: " + s.b : "";
      });
      $("kshasil").textContent = benar + " dari " + d.soal.length + " benar" + (kosong ? " (" + kosong + " belum dijawab)" : "") + ". " + (benar === d.soal.length ? "Mantap, tinggal ambil kisi-kisi lengkapnya." : "Bagian yang salah itu yang perlu diulang.");
    });

    /* bayar QRIS */
    $("kspay").addEventListener("click", function () {
      var disc = null;
      var m = modal('<h3>Bayar via QRIS</h3><div style="font-size:14px;color:var(--muted);margin-top:6px">Kisi-kisi lengkap ' + esc(d.nama) + ', harga normal ' + rp(d.harga) + '.' + (d.ada_file ? ' Punya voucher? Masukkan kodenya.' : '') + '</div><div class="ks-sub sm" style="margin-top:6px">' + (d.ada_file ? 'Setelah pembayaran dikonfirmasi admin, file langsung bisa kamu unduh dari halaman pesanan.' : 'Setelah pembayaran dikonfirmasi, kamu chat admin lewat WhatsApp untuk menerima file.') + '</div>'
        + '<input type="tel" id="kswa" placeholder="Nomor WhatsApp, 08xxxxxxxxxx" inputmode="numeric" autocomplete="tel"><div class="ks-row"' + (d.ada_file ? '' : ' hidden') + '><input type="text" id="ksvc" placeholder="Kode voucher" autocapitalize="characters"><button class="ks-btn ghost sm" id="kspk" type="button">Pakai</button></div><div class="ks-msg" id="ksvm"></div>'
        + '<div class="ks-tot"><span>Total bayar</span><b id="kstt">' + rp(d.harga) + '</b></div><div class="ks-msg bad" id="ksem"></div><button class="ks-btn" id="ksgo" type="button" style="margin-top:10px">Lanjut ke QRIS</button> <button class="ks-btn ghost sm" id="kstutup" type="button">Tutup</button>');
      wire(m, "#kstutup", function () { m.remove(); });
      wire(m, "#kspk", function () {
        var kode = $("ksvc").value.trim(), vm = $("ksvm"); vm.className = "ks-msg"; vm.textContent = "";
        if (!kode) { disc = null; $("kstt").textContent = rp(d.harga); return; }
        api("/ms/kisi/voucher?slug=" + encodeURIComponent(d.slug) + "&wa=" + encodeURIComponent($("kswa").value) + "&kode=" + encodeURIComponent(kode)).then(function (j) { disc = kode; vm.className = "ks-msg good"; vm.textContent = "Voucher dipakai: potongan " + j.pct + "%"; $("kstt").textContent = rp(j.total); })
          .catch(function (e) { disc = null; vm.className = "ks-msg bad"; vm.textContent = e.message; $("kstt").textContent = rp(d.harga); });
      });
      var go = wire(m, "#ksgo", function () {
        go.disabled = true; $("ksem").textContent = "";
        post("/ms/kisi/pesan", { slug: d.slug, wa: $("kswa").value, voucher: disc || "" }).then(function (j) { location.href = "/ruangakademikut/kisi-kisi/pesanan/" + j.token; })
          .catch(function (e) { go.disabled = false; $("ksem").textContent = e.message; });
      });
    });

    /* klaim voucher */
    if ($("ksklaim")) $("ksklaim").addEventListener("click", function () {
      var m = modal('<h3>Klaim voucher 60%</h3><ol class="ks-steps"><li>Bagikan link halaman ini ke 5 grup berbeda.</li><li>Screenshot tiap grup: nama grup dan link harus terlihat.</li><li>Unggah 5 screenshot di bawah.</li><li>Admin cek. Kalau valid, kode dikirim ke WhatsApp-mu.</li></ol>'
        + '<div style="font-size:13px;margin-top:10px;color:var(--muted)">Link yang dibagikan: <b style="color:var(--text);word-break:break-all">' + esc(link.replace(/^https?:\/\//, "")) + '</b></div>'
        + '<div class="ks-shots" id="kssh">' + [0, 1, 2, 3, 4].map(function (i) { return '<label><input type="file" accept="image/jpeg,image/png,image/webp"><span>Grup ' + (i + 1) + "</span></label>"; }).join("") + '</div>'
        + '<input type="tel" id="kskw" placeholder="Nomor WhatsApp, 08xxxxxxxxxx" inputmode="numeric"><button class="ks-btn" id="kskb" type="button">Kirim bukti</button><div class="ks-msg" id="kskm"></div><button class="ks-btn ghost sm" id="kstutup" type="button">Tutup</button>');
      wire(m, "#kstutup", function () { m.remove(); });
      var ins = [].slice.call(m.querySelectorAll("#kssh input"));
      ins.forEach(function (inp, i) { inp.addEventListener("change", function () { var l = inp.parentNode; l.className = inp.files[0] ? "ok" : ""; l.lastChild.textContent = inp.files[0] ? "Grup " + (i + 1) + " OK" : "Grup " + (i + 1); }); });
      var b = wire(m, "#kskb", function () {
        var msg = $("kskm"), fs = ins.map(function (x) { return x.files[0]; }).filter(Boolean); msg.className = "ks-msg bad";
        if (fs.length < 5) { msg.textContent = "Baru " + fs.length + " dari 5 screenshot. Lengkapi dulu ya."; return; }
        var fd = new FormData(); fd.append("slug", d.slug); fd.append("wa", $("kskw").value); fs.forEach(function (f) { fd.append("shots", f); });
        b.disabled = true; msg.className = "ks-msg"; msg.textContent = "Mengirim...";
        fetch("/ms/kisi/klaim", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Gagal mengirim."); return j; }); })
          .then(function () { msg.className = "ks-msg good"; msg.textContent = "Terkirim. Admin akan cek, lalu kode dikirim ke WhatsApp-mu."; })
          .catch(function (e) { b.disabled = false; msg.className = "ks-msg bad"; msg.textContent = e.message; });
      });
    });
  }

  /* ---------- status pesanan ---------- */
  var ps = $("ksps");
  if (ps) {
    var token = location.pathname.split("/").pop();
    var LB = { menunggu_bayar: "Menunggu pembayaran", menunggu_konfirmasi: "Menunggu konfirmasi admin", lunas: "Pembayaran dikonfirmasi", terkirim: "Selesai, file sudah diambil", dibatalkan: "Dibatalkan" };
    var load = function () {
      api("/ms/kisi/pesanan/" + encodeURIComponent(token), { cache: "no-store" }).then(function (o) {
        var h = '<p><span class="ks-st' + (o.status === "terkirim" || o.status === "lunas" ? " d" : "") + '">' + esc(LB[o.status] || o.status) + "</span></p><h2 style=\"margin:10px 0 4px\">" + esc(o.mk.nama) + '</h2><p class="ks-sub">' + esc(o.id) + " · WhatsApp " + esc(o.wa) + "</p>";
        h += '<div class="ks-tot" style="max-width:420px"><span>Total bayar</span><b>' + rp(o.total) + "</b></div>";
        if (o.potongan) h += '<p class="ks-sub sm">Harga ' + rp(o.harga) + ", potongan voucher " + rp(o.potongan) + (o.kode_unik ? ", kode unik " + o.kode_unik : "") + ".</p>"; else if (o.kode_unik) h += '<p class="ks-sub sm">Termasuk kode unik ' + o.kode_unik + ".</p>";
        if (o.status === "menunggu_bayar") {
          h += (o.hasQris ? '<img class="ks-qr" alt="QRIS pembayaran Catatan Akademik" src="/ms/parafrase/qris?v=' + Date.now() + '" style="margin-left:0">' : '<p class="ks-msg bad">QRIS belum dipasang. Hubungi admin untuk nomor tujuan pembayaran.</p>') + '<p class="ks-sub">Bayar tepat ' + rp(o.total) + ' lewat QRIS, lalu tekan tombol di bawah.</p><button class="ks-btn" id="ksbayar" type="button">Saya sudah bayar</button><div class="ks-msg bad" id="ksbm"></div>';
        } else if (o.status === "menunggu_konfirmasi") h += '<p class="ks-sub">Admin sedang mengecek pembayaranmu. ' + (o.ada_file ? 'Setelah dikonfirmasi, tombol unduh muncul di halaman ini.' : 'Setelah dikonfirmasi, chat admin lewat WhatsApp untuk menerima file.') + ' Simpan halaman ini untuk memantau statusnya.</p>';
        else if (o.status === "lunas" || o.status === "terkirim") {
          if (o.ada_file) h += '<p class="ks-sub">Pembayaran sudah dikonfirmasi. File kisi-kisi lengkap siap diunduh.</p><a class="ks-btn" href="/ms/kisi/pesanan/' + encodeURIComponent(token) + '/file">Unduh kisi-kisi lengkap</a>';
          else { var txt = "Halo admin, saya sudah bayar Kisi-kisi " + o.mk.nama + " (" + o.id + "). Mohon dikirim file lengkapnya."; h += '<p class="ks-sub">Pembayaran sudah dikonfirmasi. File untuk mata kuliah ini dikirim lewat chat admin.</p>' + (o.admin_wa ? '<a class="ks-btn" target="_blank" rel="noopener" href="https://wa.me/' + o.admin_wa + '?text=' + encodeURIComponent(txt) + '">Chat admin di WhatsApp</a>' : '<p class="ks-msg bad">Nomor admin belum diatur. Hubungi admin lewat kontak di situs.</p>'); }
        }
        else if (o.status === "dibatalkan") h += '<p class="ks-sub">Pesanan ini sudah dibatalkan. Buat pesanan baru dari <a href="/ruangakademikut/kisi-kisi/' + esc(o.mk.slug) + '">halaman mata kuliahnya</a>.</p>';
        ps.innerHTML = h;
        var bb = $("ksbayar"); if (bb) bb.addEventListener("click", function () { bb.disabled = true; post("/ms/kisi/pesanan/" + encodeURIComponent(token) + "/bayar").then(load).catch(function (e) { bb.disabled = false; $("ksbm").textContent = e.message; }); });
      }).catch(function (e) { ps.textContent = e.message; });
    };
    load();
  }
})();
