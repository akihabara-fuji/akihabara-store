(function () {
  var $ = function (id) { return document.getElementById(id); };
  /* Simulasi presentasi: bagian presentasi tampil penuh. Tanya jawab dosen tampil sebagai cuplikan sampai dibuka; teks yang terkunci tidak pernah dikirim server. */
  var simBound = null;
  function renderSim(o) {
    var box = $("simv");
    if (!box) { box = document.createElement("div"); box.id = "simv"; box.className = "hidden"; box.style.cssText = "display:flex;flex-direction:column;gap:16px;margin:16px 0"; var st = $("stat"); st.parentNode.insertBefore(box, st.nextSibling); }
    var sim = o.sim; box.classList.toggle("hidden", !sim); if (!sim) return;
    var key = sim.locked + "|" + sim.qa.length + "|" + sim.talk.length; if (simBound === key) return; simBound = key;
    box.textContent = "";
    function sec(title, text, note) {
      var c = document.createElement("div"); c.className = "card"; c.style.cssText = "display:flex;flex-direction:column;gap:10px";
      var h = document.createElement("div"); h.style.cssText = "font-size:18px;font-weight:700"; h.textContent = title; c.appendChild(h);
      if (note) { var n = document.createElement("div"); n.className = "muted"; n.textContent = note; c.appendChild(n); }
      var pre = document.createElement("pre"); pre.style.cssText = "white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.7"; pre.textContent = text; c.appendChild(pre);
      box.appendChild(c); return c;
    }
    sec("Simulasi presentasi", sim.talk || "Belum ada isi.", "Susunan yang bisa kamu pakai untuk berlatih. Sesuaikan dengan gayamu dan cocokkan dengan penelitianmu sendiri.");
    var qc = sec("Tanya jawab dosen", sim.qa, sim.locked ? "Cuplikan. Ada " + sim.total + " pertanyaan lengkap dengan arahan jawabannya." : sim.total + " pertanyaan dan arahan jawabannya.");
    if (!sim.locked) return;
    var fade = document.createElement("div"); fade.className = "muted"; fade.textContent = "Selebihnya terkunci."; qc.appendChild(fade);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.textContent = "Buka semua tanya jawab"; qc.appendChild(btn);
    var msg = document.createElement("div"); msg.className = "err hidden"; msg.style.margin = "0"; qc.appendChild(msg);
    var me = null;
    function err(t, href, label) { msg.textContent = t || ""; msg.classList.toggle("hidden", !t); if (href) { var a = document.createElement("a"); a.href = href; a.textContent = " " + label; msg.appendChild(a); } }
    fetch("/ms/koin/simulasi/" + token, { cache: "no-store", credentials: "same-origin" }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); }).then(function (x) {
      if (x.s === 401) { btn.textContent = "Masuk untuk membuka tanya jawab"; me = "login"; return; }
      if (x.s !== 200) { btn.disabled = true; err(x.j.error || "Tanya jawab tidak bisa dibuka dari akun ini."); return; }
      me = x.j; btn.textContent = x.j.free ? "Buka semua tanya jawab (gratis, pertama kali)" : "Buka semua tanya jawab (" + x.j.coins + " koin)";
      if (!x.j.free) { var b = document.createElement("div"); b.className = "muted"; b.textContent = "Saldo koinmu " + x.j.balance + " koin."; qc.insertBefore(b, btn); }
    }).catch(function () {});
    btn.onclick = function () {
      if (me === "login") { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; }
      btn.disabled = true; err("");
      fetch("/ms/koin/simulasi/" + token + "/buka", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "same-origin" }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); }).then(function (x) {
        if (x.s === 200) { location.reload(); return; }
        btn.disabled = false;
        if (x.s === 402) err(x.j.error, "/ruangakademikut/koin?kurang=" + x.j.short + "&next=" + encodeURIComponent(location.pathname), "Isi koin");
        else err(x.j.error || "Gagal membuka. Coba lagi.");
      }).catch(function () { btn.disabled = false; err("Koneksi terputus. Coba lagi."); });
    };
  }
  var rp = function (n) { return "Rp " + Number(n).toLocaleString("id-ID"); };
  var m = location.pathname.match(/\/pesanan\/([a-f0-9]{48})\/?$/);
  if (!m) { // tanpa token: coba pesanan terakhir di perangkat ini
    var last = ""; try { last = localStorage.getItem("pf_last") || ""; } catch (e) {}
    if (/^[a-f0-9]{48}$/.test(last)) { location.replace("/ruangakademikut/pesanan/" + last); return; }
    $("load").classList.add("hidden"); $("lk").classList.remove("hidden"); bindLookup(); return;
  }
  function bindLookup() {
    $("lkgo").onclick = function () {
      var e = $("lkerr"); e.classList.add("hidden"); $("lkgo").disabled = true;
      fetch("/ms/parafrase/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: $("lkid").value, wa: $("lkwa").value }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { if (x.ok) location.href = x.j.url; else { e.textContent = x.j.error || "Tidak ditemukan."; e.classList.remove("hidden"); } })
        .catch(function () { e.textContent = "Koneksi terputus."; e.classList.remove("hidden"); })
        .then(function () { $("lkgo").disabled = false; });
    };
  }
  var token = m[1], o = null, page = 1, timer = null, previewFor = "";
  var NAMES = { M: "Tulis ulang", O: "Beri kutip", K: "Tambah sumber", B: "Lengkapi sitasi", U: "Singkat", H: "Tambah kalimat", P: "Tambah analisis", A: "Variasikan" };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function dt(ms) { return new Date(ms).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function box(cls, html) { var s = $("stat"); s.className = "box " + cls; s.innerHTML = html; }

  function load() {
    fetch("/ms/parafrase/order/" + token, { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { o = j; render(); })
      .catch(function () { $("load").classList.add("hidden"); $("nf").classList.remove("hidden"); $("ord").classList.add("hidden"); });
  }
  function render() {
    try { localStorage.setItem("pf_last", token); } catch (e) {}
    $("load").classList.add("hidden"); $("ord").classList.remove("hidden");
    $("oid").textContent = "ID pesanan " + o.orderId; $("ttl").textContent = o.title || "Dokumenmu";
    var pay = o.status === "menunggu_bayar" && !o.expired;
    $("payv").classList.toggle("hidden", !(pay || o.status === "menunggu_verifikasi"));
    $("payv").style.display = (pay || o.status === "menunggu_verifikasi") ? "flex" : "none";
    if (o.status === "menunggu_bayar" && o.expired) box("b-bad", "<strong>Waktu pembayaran habis.</strong><br>Pesanan ini kedaluwarsa. Buat pesanan baru, atau hubungi admin dengan menyebut ID pesananmu jika kamu sudah membayar.");
    else if (o.status === "kedaluwarsa") box("b-bad", "<strong>Pesanan kedaluwarsa.</strong><br>Waktu pembayaran habis dan dokumen sudah dihapus. Silakan unggah ulang dan buat pesanan baru.");
    else if (pay && o.rejectReason) box("b-bad", "<strong>Bukti bayar belum bisa diverifikasi:</strong> " + esc(o.rejectReason) + "<br>Unggah bukti yang benar sebelum waktu habis.");
    else if (pay) box("b-info", "<strong>Status: menunggu bukti bayar.</strong><br>Setelah bukti diunggah, admin memverifikasi. Catatan berwarna terbuka dan pesananmu masuk antrean setelah diverifikasi. Antrean mengikuti waktu bukti bayar diunggah.");
    else if (o.status === "menunggu_verifikasi") box("b-warn", "<strong>Bukti bayar diterima, menunggu verifikasi admin.</strong><br>Halaman ini diperbarui otomatis. Kamu juga bisa menutupnya dan kembali lewat tautan ini.");
    else if (o.status === "terkirim") {
      if (o.docType === "audit") { if (o.auditReady) box("b-ok", "<strong>Pembayaran terkonfirmasi. Hasil Audit Lengkap sudah terbuka.</strong><br><a class=\"btn\" style=\"margin-top:10px\" href=\"/ruangakademikut/audit/hasil/" + token + "\">Buka hasil audit</a><br>File dihapus otomatis pada " + dt(o.deleteAt) + "."); else box("b-bad", "<strong>File sudah dihapus.</strong><br>Sesuai ketentuan, file dihapus setelah masa simpan berakhir. Hubungi admin jika perlu bantuan."); }
      else if (o.service) box("b-ok", "<strong>Pesanan selesai.</strong><br>" + (o.resultReady ? "Unduh hasilmu di bawah. " : "") + (o.resultText ? "Teks hasil ada di bawah, tinggal salin. " : "") + "Semua file dihapus otomatis pada " + dt(o.deleteAt) + ". Simpan sebelum itu. Free revisi lewat menu Layanan.");
      else if (o.resultReady) box("b-ok", "<strong>Pesanan selesai.</strong><br>Unduh hasil Word-mu di bawah. File dihapus otomatis pada " + dt(o.deleteAt) + ". Unduh sebelum itu.");
      else box("b-bad", "<strong>File sudah dihapus.</strong><br>Sesuai ketentuan, file dihapus " + "setelah masa unduh berakhir. Hubungi admin jika perlu bantuan.");
    }
    else if (o.paid && o.service) box("b-ok", "<strong>" + (o.status === "dikerjakan" ? "Pesananmu sedang dikerjakan admin." : o.service === "simulasi" ? "Permintaan simulasimu masuk antrean admin." : "Pembayaran terkonfirmasi, pesananmu masuk antrean admin.") + "</strong><br>Hasil muncul di halaman ini dan dikabari lewat WhatsApp.");
    else if (o.paid) { var q = o.queue; box("b-ok", "<strong>" + (o.status === "dikerjakan" ? "Pesananmu sedang dikerjakan." : "Pembayaran terkonfirmasi, pesananmu dalam antrean.") + "</strong>" + (q ? "<br>Posisi antrean: <strong>" + q.position + "</strong> dari " + q.total + (q.ahead ? " (" + q.ahead + " pesanan di depan)" : "") + ". Perkiraan sekitar " + q.etaHours + " jam, ini perkiraan, bukan jaminan." + (o.lane === "cepat" ? " Jalur cepat aktif." : "") : "") + "<br>Hasil dikirim ke WhatsApp setelah selesai."); }
    else box("b-info", "<strong>Status: " + esc(o.status) + "</strong>");
    if (pay || o.status === "menunggu_verifikasi") fillPay();
    $("dlv").classList.toggle("hidden", !o.resultReady);
    if (o.resultReady) { $("dla").href = "/ms/parafrase/order/" + token + "/result"; $("dlname").textContent = o.resultName || "Hasil.docx"; }
    var rt = $("rtext");
    if (!rt) { rt = document.createElement("div"); rt.id = "rtext"; rt.className = "hidden"; rt.style.cssText = "margin:16px 0"; rt.innerHTML = '<pre id="rtpre" style="white-space:pre-wrap;padding:14px;border:1px solid currentColor;border-radius:12px;margin:0 0 8px"></pre><button class="btn" id="rtcopy" type="button">Salin</button>'; $("ord").appendChild(rt);
      $("rtcopy").onclick = function () { var b = this, t = $("rtpre").textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () { var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) {} a.remove(); }).then(function () { b.textContent = "Tersalin"; setTimeout(function () { b.textContent = "Salin"; }, 1500); }); }; }
    $("rtpre").textContent = o.resultText || ""; rt.classList.toggle("hidden", !o.resultText);
    renderSim(o);
    var showDoc = o.paid && !o.filesDeleted && o.docType !== "audit" && !o.service;
    $("docv").classList.toggle("hidden", !showDoc); $("docv").style.display = showDoc ? "flex" : "none";
    if (showDoc && previewFor !== o.status) { previewFor = o.status; loadDoc(); }
    clearInterval(timer); timer = setInterval(function () { if (pay) tick(); }, 1000);
    schedulePoll();
  }
  function fillPay() {
    $("qrbox").innerHTML = o.hasQris ? '<img class="qr" alt="QRIS pembayaran Catatan Akademik" src="/ms/parafrase/qris?v=' + Date.now() + '">' : '<div class="box b-warn" style="width:240px;text-align:center">QRIS belum dipasang. Hubungi admin untuk nomor tujuan pembayaran.</div>';
    $("amt").textContent = rp(o.total);
    $("amtd").textContent = rp(o.baseTotal + o.fastPrice) + " + kode unik " + rp(o.uniqueCode) + ". Kode unik membantu kami mencocokkan pembayaranmu, jadi bayar PERSIS nominal ini.";
    $("mname").textContent = o.merchantName || "Catatan Akademik";
    $("s1").textContent = (o.service ? "Layanan akademik" : (o.docType === "audit" ? "Audit Lengkap " : "Revisi ") + Number(o.words).toLocaleString("id-ID") + " kata × " + rp(o.pricePerWord)); $("s1v").textContent = rp(o.baseTotal);
    $("s2").textContent = o.lane === "cepat" ? "+" + rp(o.fastPrice) : "tidak dipilih"; $("s3").textContent = rp(o.uniqueCode); $("s4").textContent = dt(o.deadlineAt);
    var up = o.status === "menunggu_verifikasi"; $("pb").textContent = up ? "Ganti foto bukti" : "Pilih foto";
    $("cd").classList.toggle("hidden", up); tick();
  }
  function tick() {
    if (!o || o.status !== "menunggu_bayar") return;
    var s = Math.floor((o.payExpiresAt - Date.now()) / 1000);
    if (s <= 0) { o.expired = true; render(); return; }
    $("cd").textContent = "Selesaikan dalam " + String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  var poll = null;
  function schedulePoll() { clearTimeout(poll); if (o && ["menunggu_verifikasi", "menunggu_bayar", "baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang"].includes(o.status)) poll = setTimeout(function () { fetch("/ms/parafrase/order/" + token, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { var ch = j.status !== o.status || j.rejectReason !== o.rejectReason || JSON.stringify(j.queue) !== JSON.stringify(o.queue); o = j; if (ch) render(); else schedulePoll(); }).catch(schedulePoll); }, 10000); }

  $("pb").onclick = function () { $("pf").click(); };
  $("pf").onchange = function () {
    var f = this.files[0]; this.value = ""; if (!f) return;
    var e = $("perr"); e.classList.add("hidden");
    if (f.size > 5 * 1048576) { e.textContent = "Foto terlalu besar. Maksimal 5 MB."; e.classList.remove("hidden"); return; }
    $("pb").disabled = true; var fd = new FormData(); fd.append("proof", f);
    fetch("/ms/parafrase/order/" + token + "/proof", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (!x.ok) { e.textContent = x.j.error || "Unggahan gagal."; e.classList.remove("hidden"); } else load(); })
      .catch(function () { e.textContent = "Koneksi terputus. Coba lagi."; e.classList.remove("hidden"); })
      .then(function () { $("pb").disabled = false; });
  };

  function loadDoc() {
    $("docnote").textContent = "Catatan berwarna di bawah adalah bagian yang akan dikerjakan tim Catatan Akademik.";
    fetch("/ms/parafrase/order/" + token + "/preview?page=" + page, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (pv) {
      if (!pv.paragraphs) { $("doc").innerHTML = '<p class="muted">' + esc(pv.error || "Dokumen tidak tersedia.") + "</p>"; return; }
      page = pv.page;
      $("doc").innerHTML = pv.paragraphs.map(function (p) { return "<p>" + p.segments.map(function (s) {
        var tag = s.primary ? '<sup class="t" title="' + esc((s.reasons || []).map(function (r) { return r.reason; }).join(" | ")) + '">[' + s.codes.map(function (c) { return c + " " + NAMES[c]; }).join(" · ") + "]</sup>" : "";
        return '<span class="seg' + (s.primary ? " s-" + s.primary : "") + (s.locked ? " locked" : "") + '">' + esc(s.text) + "</span>" + tag + " ";
      }).join("") + "</p>"; }).join("");
      $("pg").textContent = "Halaman " + pv.page + " dari " + pv.pages; $("prev").disabled = pv.page <= 1; $("next").disabled = pv.page >= pv.pages;
    }).catch(function () {});
  }
  $("prev").onclick = function () { page--; loadDoc(); }; $("next").onclick = function () { page++; loadDoc(); };
  load();
})();
