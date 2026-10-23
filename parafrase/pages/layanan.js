(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var cfg = {}, cur = (new URLSearchParams(location.search).get("s") || "tugas"), files = [], slotFiles = {};
  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
  function paint() {
    var s = cfg[cur]; if (!s) return;
    $("chips").innerHTML = "";
    var grp = s.kind === "metopen" ? ["metopen_paket", "metopen1", "metopen2", "metopen3", "metopen4"] : s.kind === "revisi" ? ["revisi_tugas", "revisi_diskusi", "revisi_metopen"] : ["tugas", "diskusi"];
    if (s.kind === "tugas" || s.kind === "diskusi") grp = [];
    grp.forEach(function (k) {
      if (!cfg[k]) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.textContent = cfg[k].label + " · " + rp(cfg[k].price);
      if (k !== cur) b.style.cssText = "background:transparent;color:inherit;border:1px solid currentColor"; b.onclick = function () { cur = k; slotFiles = {}; paint(); }; $("chips").appendChild(b);
    });
    document.querySelectorAll(".sub a").forEach(function (a) { var t = a.textContent.trim(), on = (t === "Tugas" && cur === "tugas") || (t === "Diskusi" && cur === "diskusi") || (t === "Metopen" && s.kind === "metopen") || (t === "Revisi" && s.kind === "revisi"); a.classList.toggle("on", on); });
    var rev = s.kind === "revisi", td = s.kind === "tugas" || s.kind === "diskusi", dis = s.kind === "diskusi";
    $("chips").style.display = td ? "none" : "flex";
    $("ttl").textContent = td ? (dis ? "Diskusi" : "Tugas") : "Ceritakan kebutuhanmu.";
    $("pbox").style.display = (rev || td) ? "flex" : "none";
    $("pbl").textContent = td ? "Revisi dari tutor? Isi ID pesanan sebelumnya (gratis 1x)" : "ID pesanan sebelumnya (isi untuk revisi gratis 1x)";
    $("blabel").textContent = rev ? "Masukan dari tutor" : dis ? "Soal diskusi" : "Kebutuhanmu";
    $("brief").placeholder = dis ? "Tempel soal diskusi di sini. Cukup teks. Kalau ada revisi dari tutor, tulis atau tempel kalimat tutornya di sini juga." : td ? "Contoh: Tugas 2 Manajemen Keuangan, soal ada di file. Kalau ada revisi dari tutor, tulis catatannya di sini juga." : "Tulis kebutuhanmu atau tempel masukan tutor di sini.";
    $("pick").textContent = dis ? "+ Lampirkan file (opsional, mis. file revisi)" : "+ Lampirkan file";
    var pv = $("pid").value.trim();
    $("price").textContent = rev ? "Gratis 1x untuk hasil kami, atau " + rp(s.price) + " untuk revisi dari luar" : td && pv ? "Revisi gratis 1x (dicek otomatis dari ID pesanan)" : rp(s.price);
    $("price").title = ""; var nt = $("note"); if (nt) nt.style.display = s.kind === "metopen" ? "block" : "none";
    var tn = s.tutorNote;
    $("tguide").style.display = tn ? "block" : "none";
    if (tn) { $("blabel").textContent = "Catatan dari tutor (opsional)"; $("brief").placeholder = "Tempel catatan tutor di sini. Tidak ada catatan? Kosongkan, nanti dikerjakan sesuai template yang berlaku."; $("pick").textContent = "+ Lampirkan file catatan tutor (opsional)"; }
    paintSlots();
    $("go").textContent = "Pesan " + s.label; gate();
  }
  function need() { return (cfg[cur] && cfg[cur].needs) || []; }
  function gate() {
    var wa = $("wa").value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""), n = need(), slots = n.every(function (l) { return slotFiles[l]; }), total = n.length + files.length;
    $("go").disabled = !(cfg[cur] && /^8\d{8,12}$/.test(wa) && $("agree").checked && slots && ($("brief").value.trim().length >= 5 || total));
  }
  /* Slot berkas per tahap sebelumnya (Metopen Tugas 2 ke atas): satu file per tahap, wajib. */
  function paintSlots() {
    var box = $("slots"), n = need(); box.innerHTML = ""; box.style.display = n.length ? "flex" : "none";
    if (!n.length) return;
    var h = document.createElement("div"); h.style.cssText = "font-weight:600;font-size:14px"; h.textContent = cfg[cur].label + " dibangun dari tugas sebelumnya. Lampirkan hasilnya (wajib):"; box.appendChild(h);
    n.forEach(function (l) {
      var row = document.createElement("div"), b = document.createElement("button"), st = document.createElement("span"), inp = document.createElement("input");
      row.style.cssText = "display:flex;gap:10px;align-items:center;flex-wrap:wrap"; b.type = "button"; b.className = "btn"; b.style.cssText = "background:transparent;color:inherit;border:1px solid currentColor"; b.textContent = "+ File " + l;
      st.className = "muted"; st.textContent = slotFiles[l] ? slotFiles[l].name : "Belum ada file (wajib)"; inp.type = "file"; inp.className = "hidden"; inp.accept = ".docx,.pdf,.png,.jpg,.jpeg,.txt";
      b.onclick = function () { inp.click(); }; inp.onchange = function () { if (inp.files[0]) { slotFiles[l] = inp.files[0]; st.textContent = inp.files[0].name; gate(); } };
      row.appendChild(b); row.appendChild(st); row.appendChild(inp); box.appendChild(row);
    });
  }
  $("pid").oninput = function () { paint(); }; $("wa").oninput = gate; $("agree").onchange = gate; $("brief").oninput = gate;
  $("pick").onclick = function () { $("file").click(); };
  $("file").onchange = function () { files = Array.prototype.slice.call(this.files, 0, 5); $("fl").textContent = files.length ? files.map(function (f) { return f.name; }).join(", ") : "Word, PDF, gambar, atau .txt. Maksimal 5 file, 10 MB per file."; gate(); };
  $("go").onclick = function () {
    showErr(""); var b = this; b.disabled = true;
    var fd = new FormData(); fd.append("service", ($("pid").value.trim() && cfg["revisi_" + cur]) ? "revisi_" + cur : cur); fd.append("brief", $("brief").value); fd.append("wa", $("wa").value); fd.append("agree", $("agree").checked ? "true" : "false"); fd.append("parentId", $("pid").value);
    need().forEach(function (l) { var f = slotFiles[l]; if (f) fd.append("files", f, l + " - " + f.name); });
    files.forEach(function (f) { fd.append("files", f); });
    fetch("/ms/layanan/order", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = x.j.url; return; } if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname + location.search); return; } showErr(x.j.error || "Pesanan gagal. Coba lagi."); gate(); })
      .catch(function () { showErr("Koneksi terputus. Coba lagi."); gate(); });
  };
  fetch("/ms/layanan/config").then(function (r) { return r.json(); }).then(function (j) { cfg = j; if (!cfg[cur]) cur = "tugas"; paint(); });
})();
