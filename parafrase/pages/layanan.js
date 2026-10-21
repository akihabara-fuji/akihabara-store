(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var cfg = {}, cur = (new URLSearchParams(location.search).get("s") || "tugas"), files = [];
  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
  function paint() {
    var s = cfg[cur]; if (!s) return;
    $("chips").innerHTML = "";
    Object.keys(cfg).forEach(function (k) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = cfg[k].label + " · " + rp(cfg[k].price);
      if (k !== cur) b.style.cssText = "background:transparent;border:1px solid currentColor"; b.onclick = function () { cur = k; paint(); }; $("chips").appendChild(b);
    });
    var rev = s.kind === "revisi"; $("pbox").style.display = rev ? "flex" : "none";
    $("blabel").textContent = rev ? "Masukan dari tutor" : "Kebutuhanmu";
    $("price").textContent = rev ? "Gratis 1x untuk hasil kami, atau " + rp(s.price) + " untuk revisi dari luar" : rp(s.price);
    $("go").textContent = "Pesan " + s.label; gate();
  }
  function gate() { var wa = $("wa").value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); $("go").disabled = !(cfg[cur] && /^8\d{8,12}$/.test(wa) && $("agree").checked && ($("brief").value.trim().length >= 5 || files.length)); }
  $("wa").oninput = gate; $("agree").onchange = gate; $("brief").oninput = gate;
  $("pick").onclick = function () { $("file").click(); };
  $("file").onchange = function () { files = Array.prototype.slice.call(this.files, 0, 3); $("fl").textContent = files.length ? files.map(function (f) { return f.name; }).join(", ") : "Word, PDF, gambar, atau .txt. Maksimal 3 file, 10 MB per file."; gate(); };
  $("go").onclick = function () {
    showErr(""); var b = this; b.disabled = true;
    var fd = new FormData(); fd.append("service", cur); fd.append("brief", $("brief").value); fd.append("wa", $("wa").value); fd.append("agree", $("agree").checked ? "true" : "false"); fd.append("parentId", $("pid").value);
    files.forEach(function (f) { fd.append("files", f); });
    fetch("/ms/layanan/order", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = x.j.url; return; } if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname + location.search); return; } showErr(x.j.error || "Pesanan gagal. Coba lagi."); gate(); })
      .catch(function () { showErr("Koneksi terputus. Coba lagi."); gate(); });
  };
  fetch("/ms/layanan/config").then(function (r) { return r.json(); }).then(function (j) { cfg = j; if (!cfg[cur]) cur = "tugas"; paint(); });
})();
