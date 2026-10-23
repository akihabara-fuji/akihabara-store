/* Halaman koin: saldo, isi koin lewat QRIS manual (bukti bayar, konfirmasi admin), riwayat. Semua teks dari server dipasang lewat textContent. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var nextUrl = (function () { var n = q.get("next") || ""; return /^\/[^/\\]/.test(n) ? n : ""; })();
  var rate = 1000, cur = null, timer = null, cdTimer = null;
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function rp(n) { return "Rp" + fmt(n); }
  function show(id, on) { $(id).classList.toggle("hidden", !on); }
  function err(id, m) { var e = $(id); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
  function api(u, o) { return fetch(u, Object.assign({ cache: "no-store", credentials: "same-origin" }, o || {})).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); }); }
  function parse() { var n = Number(($("nom").value || "").replace(/\D/g, "")); return n; }
  function valid(n) { return n >= 1000 && n <= 2000000 && n % rate === 0; }
  function paintNom() {
    var n = parse(); $("nomc").textContent = valid(n) ? "= " + fmt(n / rate) + " koin" : "";
    $("mk").disabled = !valid(n); err("perr", n && !valid(n) ? "Isi koin harus kelipatan Rp1.000, antara Rp1.000 dan Rp2.000.000." : "");
    Array.prototype.forEach.call($("amts").children, function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.v) === n)); });
  }
  [10000, 20000, 50000, 100000].forEach(function (v) {
    var b = document.createElement("button"); b.type = "button"; b.dataset.v = v; b.setAttribute("aria-pressed", "false");
    b.appendChild(document.createTextNode(rp(v))); var s = document.createElement("small"); s.textContent = fmt(v / rate) + " koin"; b.appendChild(s);
    b.onclick = function () { $("nom").value = fmt(v); paintNom(); }; $("amts").appendChild(b);
  });
  $("nom").oninput = function () { var d = this.value.replace(/\D/g, ""); this.value = d ? fmt(Number(d)) : ""; paintNom(); };

  var ST = { menunggu_bayar: "Menunggu pembayaran. Bayar sesuai total, lalu unggah bukti bayar.", menunggu_verifikasi: "Bukti bayar terkirim. Menunggu konfirmasi admin. Koin masuk setelah admin mencocokkan pembayaranmu.", dikonfirmasi: "Pembayaran dikonfirmasi. Koin sudah masuk ke saldomu.", kedaluwarsa: "Tagihan kedaluwarsa karena belum dibayar. Buat tagihan baru." };
  function paintBill(t) {
    cur = t; show("pickv", false); show("billv", true);
    $("amt").textContent = rp(t.total);
    $("amtd").textContent = rp(t.base) + " untuk " + fmt(t.coins) + " koin, ditambah kode unik Rp" + t.uniqueCode + ". Koin yang masuk tetap " + fmt(t.coins) + ".";
    var box = $("qrbox"); if (!box.firstChild) { var im = document.createElement("img"); im.className = "qr"; im.alt = "QRIS Catatan Akademik"; im.src = "/ms/parafrase/qris"; box.appendChild(im); }
    var s = ST[t.status] || t.status; if (t.status === "menunggu_bayar" && t.rejectReason) s = "Bukti bayar ditolak: " + t.rejectReason + " Unggah ulang bukti yang benar.";
    $("st").textContent = s; $("st").className = "box " + (t.status === "dikonfirmasi" ? "b-ok" : "b-info");
    var canUp = t.status === "menunggu_bayar" || t.status === "menunggu_verifikasi"; show("upv", canUp);
    $("pb").textContent = t.hasProof ? "Ganti foto bukti" : "Pilih foto";
    show("nextl", t.status === "dikonfirmasi" && !!nextUrl); if (nextUrl) $("nextl").href = nextUrl;
    clearInterval(cdTimer); $("cd").textContent = "";
    if (t.status === "menunggu_bayar") { var tick = function () { var ms = t.expiresAt - Date.now(); $("cd").textContent = ms > 0 ? "Bayar dalam " + Math.floor(ms / 60000) + " menit " + String(Math.floor(ms / 1000) % 60).padStart(2, "0") + " detik" : "Waktu pembayaran habis"; }; tick(); cdTimer = setInterval(tick, 1000); }
    clearInterval(timer); if (t.status === "menunggu_verifikasi") timer = setInterval(poll, 20000);
  }
  function poll() { if (!cur) return; api("/ms/koin/topup/" + cur.token).then(function (x) { if (x.ok) { var was = cur.status; paintBill(x.j.topup); if (x.j.topup.status !== was) load(true); } }); }
  $("mk").onclick = function () {
    var b = this; b.disabled = true; err("perr", "");
    api("/ms/koin/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rupiah: parse() }) }).then(function (x) {
      if (x.ok) { paintBill(x.j.topup); $("mname").textContent = x.j.merchant || ""; load(true); return; }
      if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname + location.search); return; }
      err("perr", x.j.error || "Tagihan gagal dibuat."); paintNom();
    }).catch(function () { err("perr", "Koneksi terputus. Coba lagi."); paintNom(); });
  };
  $("newb").onclick = function () { clearInterval(timer); clearInterval(cdTimer); cur = null; show("billv", false); show("pickv", true); paintNom(); };
  $("pb").onclick = function () { $("pf").click(); };
  $("pf").onchange = function () {
    var f = this.files[0]; this.value = ""; if (!f || !cur) return;
    if (f.size > 5 * 1048576) { err("uerr", "Foto terlalu besar (maksimal 5 MB)."); return; }
    err("uerr", ""); $("pb").disabled = true; var fd = new FormData(); fd.append("proof", f);
    api("/ms/koin/topup/" + cur.token + "/proof", { method: "POST", body: fd }).then(function (x) {
      $("pb").disabled = false;
      if (!x.ok) { err("uerr", x.j.error || "Unggahan gagal."); return; }
      api("/ms/koin/topup/" + cur.token).then(function (y) { if (y.ok) paintBill(y.j.topup); load(true); });
    }).catch(function () { $("pb").disabled = false; err("uerr", "Koneksi terputus. Coba lagi."); });
  };
  var MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  function when(ms) { var d = new Date(ms + 7 * 3600e3); return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function load(quiet) {
    return api("/ms/koin/me").then(function (x) {
      show("load", false);
      if (x.status === 401) { show("need", true); $("login").href = "/ms/masuk?next=" + encodeURIComponent(location.pathname + location.search); return; }
      if (!x.ok) { show("need", false); $("load").textContent = x.j.error || "Gagal memuat."; show("load", true); return; }
      show("app", true); rate = x.j.rate || 1000; $("bal").textContent = fmt(x.j.balance) + " koin";
      $("mname").textContent = x.j.merchant || "";
      var tb = $("rt").tBodies[0]; tb.textContent = "";
      x.j.history.forEach(function (r) {
        var tr = document.createElement("tr"), a = [when(r.at), r.note || r.kind, (r.delta > 0 ? "+" : "") + fmt(r.delta), fmt(r.balance)];
        a.forEach(function (v, i) { var td = document.createElement("td"); td.textContent = v; if (i > 1) td.className = "n" + (i === 2 ? (r.delta > 0 ? " pos" : " neg") : ""); tr.appendChild(td); });
        tb.appendChild(tr);
      });
      $("tl").textContent = x.j.history.length ? "" : "Belum ada riwayat koin.";
      $("rt").style.display = x.j.history.length ? "" : "none";
      if (!quiet) { var open = (x.j.topups || []).filter(function (t) { return t.status === "menunggu_bayar" || t.status === "menunggu_verifikasi"; })[0]; if (open) paintBill(open); }
    });
  }
  var k = Number(q.get("kurang")); if (k > 0 && k <= 2000) { $("nom").value = fmt(k * 1000); }
  paintNom();
  load(false).catch(function () { $("load").textContent = "Koneksi terputus. Muat ulang halaman."; });
})();
