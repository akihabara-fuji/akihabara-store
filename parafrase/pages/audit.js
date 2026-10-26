(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var SEV = { kritis: ["Kritis", "#ff8aa5"], peringatan: ["Peringatan", "#f3ff4d"], info: ["Info", "#8ec5ff"] };
  var upId = null;
  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
  var drop = $("drop");
  $("pick").onclick = function () { $("file").click(); };
  var picked = null;
  function choose(f) {
    showErr("");
    if (!/\.(docx|pdf)$/i.test(f.name)) { showErr("Hanya file Word (.docx) atau PDF yang diterima."); return; }
    if (f.size > 10 * 1048576) { showErr("File terlalu besar. Maksimal 10 MB."); return; }
    picked = f; $("chName").textContent = f.name; $("chMeta").textContent = "(" + Math.max(1, Math.round(f.size / 1024)) + " KB)";
    $("chosen").classList.remove("hidden"); $("pick").classList.add("hidden"); $("chGo").focus();
  }
  function unpick() { picked = null; $("chosen").classList.add("hidden"); $("pick").classList.remove("hidden"); }
  $("chGo").onclick = function () { if (picked) send(picked); };
  $("chChange").onclick = function () { $("file").click(); };
  $("file").onchange = function () { if (this.files[0]) choose(this.files[0]); this.value = ""; };
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { var f = e.dataTransfer.files[0]; if (f) choose(f); });
  $("again").onclick = function () { $("s2").classList.add("hidden"); $("s1").classList.remove("hidden"); showErr(""); unpick(); };

  function send(f) {
    showErr("");
    if (!/\.(docx|pdf)$/i.test(f.name)) { showErr("Hanya file Word (.docx) atau PDF yang diterima."); return; }
    if (f.size > 10 * 1048576) { showErr("File terlalu besar. Maksimal 10 MB."); return; }
    var steps = ["Mengunggah file…", "Sedang memindai dokumen…", "Memeriksa sitasi dan daftar pustaka…", "Memverifikasi DOI (bisa sampai setengah menit)…", "Menyusun hasil…"];
    window.pfScan.start($("busy"), steps); $("chGo").disabled = true; $("chChange").disabled = true;
    var fd = new FormData(); fd.append("file", f);
    fetch("/ms/audit/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; } showErr(x.j.error || "Audit gagal. Coba lagi."); return; }
        upId = x.j.uploadId; render(x.j); $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0);
      }).catch(function () { showErr("Koneksi terputus. Coba lagi."); })
      .then(function () { window.pfScan.stop($("busy")); $("chGo").disabled = false; $("chChange").disabled = false; });
  }

  function gate() { var wa = $("wa").value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); $("buy").disabled = !(upId && /^8\d{8,12}$/.test(wa) && $("agree").checked); }
  $("wa").oninput = gate; $("agree").onchange = gate;
  $("buy").onclick = function () {
    var b = this; b.disabled = true; var e = $("oerr"); e.classList.add("hidden");
    fetch("/ms/audit/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: upId, wa: $("wa").value, agree: $("agree").checked }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = x.j.url; return; } if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; } e.textContent = x.j.error || "Pesanan gagal. Coba lagi."; e.classList.remove("hidden"); gate(); })
      .catch(function () { e.textContent = "Koneksi terputus. Coba lagi."; e.classList.remove("hidden"); gate(); });
  };
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  function render(d) {
    $("rmeta").textContent = d.file.name + " · " + rp(d.words) + " kata";
    window.auditScoreCard(d.score, $("score"), d.findings);
    /* Urgensi perbaikan dari mesin yang sama dengan Cek & Parafrase; angka Drillbit milik murid menghitungnya ulang di server. */
    var tOpts = { here: "audit", uploadId: upId };
    window.renderTriage($("triage"), d.triage, tOpts);
    var c = $("counts"); c.innerHTML = "";
    ["kritis", "peringatan", "info"].forEach(function (k) {
      var b = el("div", "min-width:130px;padding:14px 18px;border-radius:16px;border:1px solid #2b2b58");
      b.appendChild(el("b", "display:block;font-size:30px;color:" + SEV[k][1], d.counts[k])); b.appendChild(el("span", "font-size:13.5px", SEV[k][0])); c.appendChild(b);
    });
    var r = d.refs;
    $("refs").textContent = r.total ? r.total + " pustaka terbaca · " + r.doiOk + " DOI terverifikasi" + (r.doiNotFound ? " · " + r.doiNotFound + " DOI tidak ditemukan" : "") + (r.doiUnverified ? " · " + r.doiUnverified + " belum bisa dicek" : "") : "Daftar pustaka tidak terbaca.";
    var l = $("list"); l.innerHTML = "";
    if (!d.findings.length) l.appendChild(el("p", "text-align:center", "Tidak ada temuan dari aturan yang kami periksa. Tetap baca ulang sebelum dikumpulkan."));
    window.renderFindings(l, d.findings, { sev: SEV, visible: 5 });
    if (d.findings.length) window.foldList(l, "Lihat semua temuan (" + d.findings.length + ")");
    window.auditOkList(d.score, l);
    $("perword").textContent = d.quote.perWord; $("minp").textContent = window.koinFmt(d.quote.min); $("total").textContent = d.quote.allFree ? "0 (seluruh dokumen sudah terbuka gratis)" : "Rp " + rp(d.quote.total);
    $("fwn").textContent = rp(d.quote.freeWords || 0);
    $("cekGo").href = "/ruangakademikut/cek-parafrase-mandiri?u=" + encodeURIComponent(upId);
    var nOpen = d.findings.filter(function (f) { return f.open; }).length;
    $("rmeta").textContent += d.quote.allFree ? " · seluruhnya gratis" : " · " + nOpen + " dari " + d.findings.length + " temuan dibuka gratis";
    $("cta").classList.toggle("hidden", !d.findings.some(function (f) { return !f.open; }));
  }
})();
