/* Klien alat Bedah Laporan (teks). Kalimat ditandai warna + huruf + garis bawah. Tidak menulis ulang untuk pengguna. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); }, root = $(".bt"); if (!root) return;
  var MB = +root.getAttribute("data-mb") || 10, HAL = +root.getAttribute("data-hal") || 30;
  var J = { A: ["Terlalu pendek / seragam", "#c2410c", "#fde8e1"], B: ["Koma berlebihan", "#d97706", "#fff1d6"], C: ["Transisi generik", "#0f9d8a", "#dff5ef"], D: ["Argumen kurang kuat", "#4a2fd6", "#ede8ff"] };
  var S = { sents: [], flags: {}, done: {}, only: "", sel: -1, file: null };
  var step = function (n) { document.querySelectorAll(".bt-steps li").forEach(function (l) { l.classList.toggle("on", +l.getAttribute("data-s") === n); }); $("#btIn").hidden = n !== 1; $("#btWait").hidden = n !== 2; $("#btOut").hidden = n !== 3; };
  var err = function (m) { var e = $("#btErr"); e.textContent = m || ""; e.hidden = !m; };
  var drop = $("#btDrop"), fi = $("#btFile");
  $("#btPick").onclick = function () { fi.click(); };
  var setFile = function (f) {
    if (!f) return; var ok = /\.(docx|pdf)$/i.test(f.name);
    if (!ok) { err("Format file harus .docx atau .pdf."); return; }
    if (f.size > MB * 1048576) { err("File terlalu besar. Maksimal " + MB + " MB."); return; }
    S.file = f; $("#btFn").textContent = f.name; err("");
  };
  fi.onchange = function () { setFile(fi.files[0]); };
  ["dragover", "dragenter"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); if (t === "drop") setFile(e.dataTransfer.files[0]); }); });

  $("#btGo").onclick = function () {
    err(""); var tx = $("#btTx").value.trim();
    if (!S.file && tx.length < 40) { err("Tempel dulu tulisanmu (minimal beberapa kalimat), atau pilih file."); return; }
    var fd = new FormData(); if (S.file) fd.append("file", S.file); else fd.append("text", tx);
    step(2);
    fetch("/ms/bedah-teks/analisis", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
      if (!x.ok) { step(1); err(x.j.error || "Gagal memproses."); return; }
      S.sents = x.j.sents; S.flags = {}; S.done = {}; S.only = ""; S.sel = -1;
      x.j.flags.forEach(function (f) { S.flags[f.n] = f; });
      $("#btTx").value = ""; S.file = null; $("#btFn").textContent = ""; fi.value = "";
      step(3); draw(); sideReset();
    }).catch(function () { step(1); err("Koneksi bermasalah. Coba lagi."); });
  };

  var left = function (j) { return Object.keys(S.flags).filter(function (n) { return !S.done[n] && (!j || S.flags[n].jenis === j); }).length; };
  function draw() {
    var T = $("#btText"); T.textContent = ""; var lastP = -1, p;
    S.sents.forEach(function (s, i) {
      if (s.p !== lastP) { p = document.createElement("p"); p.style.margin = "0 0 10px"; T.appendChild(p); lastP = s.p; }
      var f = S.flags[i], b = document.createElement("button"); b.type = "button"; b.className = "bt-s"; b.textContent = s.t + " ";
      if (f && !S.done[i]) { b.classList.add("flag"); b.setAttribute("data-t", f.jenis); b.setAttribute("aria-label", "Ditandai " + f.jenis + ": " + J[f.jenis][0]); var sup = document.createElement("sup"); sup.textContent = f.jenis; b.appendChild(sup); if (S.only && S.only !== f.jenis) b.classList.add("dim"); if (i === S.sel) b.classList.add("sel"); b.onclick = (function (i) { return function () { S.sel = i; draw(); showSel(); }; })(i); }
      p.appendChild(b); p.appendChild(document.createTextNode(" "));
    });
    var tot = Object.keys(S.flags).length, dn = tot - left();
    $("#btTot").textContent = tot; $("#btDone").textContent = dn; $("#btBar").style.width = (tot ? dn / tot * 100 : 100) + "%";
    var F = $("#btFil"); F.textContent = "";
    Object.keys(J).forEach(function (k) { var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", S.only === k); var i = document.createElement("i"); i.style.background = J[k][1]; b.appendChild(i); b.appendChild(document.createTextNode(k + " · " + J[k][0] + " · " + left(k))); b.onclick = function () { S.only = S.only === k ? "" : k; draw(); }; F.appendChild(b); });
    var all = document.createElement("button"); all.type = "button"; all.textContent = "Tampilkan semua"; all.onclick = function () { S.only = ""; draw(); }; F.appendChild(all);
    $("#btAll").hidden = !(tot > 0 && left() === 0);
  }
  function sideReset() { $("#btDet").hidden = true; $("#btNoSel").hidden = false; $("#btFb").textContent = ""; }
  function showSel() {
    var f = S.flags[S.sel]; if (!f) return sideReset();
    $("#btNoSel").hidden = true; $("#btDet").hidden = false; $("#btFb").textContent = "";
    var l = $("#btLbl"); l.textContent = f.jenis + " · " + J[f.jenis][0]; l.style.background = J[f.jenis][2]; l.style.color = J[f.jenis][1];
    $("#btQ").textContent = S.sents[S.sel].t; $("#btWhy").textContent = f.alasan || ""; $("#btTip").textContent = f.saran || ""; $("#btRw").value = "";
  }
  $("#btRe").onclick = function () {
    var f = S.flags[S.sel]; if (!f) return; var baru = $("#btRw").value.trim(), btn = $("#btRe"); btn.disabled = true; btn.textContent = "Memeriksa…";
    fetch("/ms/bedah-teks/cek", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lama: S.sents[S.sel].t, baru: baru, jenis: f.jenis }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
        var fb = $("#btFb"); fb.textContent = "";
        var box = document.createElement("div"); var h = document.createElement("small"), t = document.createElement("h4"), p = document.createElement("p");
        if (!x.ok) { box.className = "bt-fb lagi"; h.textContent = "BELUM BISA DIPERIKSA"; t.textContent = x.j.error || "Gagal memeriksa."; }
        else { box.className = "bt-fb " + (x.j.beres ? "ok" : "lagi"); h.textContent = "HASIL AUDIT ULANG · KALIMAT " + (S.sel + 1); t.textContent = x.j.judul || (x.j.beres ? "Oke, ini sudah bagus!" : "Masih perlu diperbaiki."); p.textContent = x.j.pesan || ""; if (x.j.beres) { S.done[S.sel] = true; S.sents[S.sel].t = baru; S.sel = -1; draw(); } }
        box.appendChild(h); box.appendChild(t); box.appendChild(p); fb.appendChild(box);
        if (x.ok && x.j.beres) { $("#btDet").hidden = true; $("#btNoSel").hidden = false; }
      }).catch(function () { var fb = $("#btFb"); fb.textContent = "Koneksi bermasalah. Coba lagi."; }).then(function () { btn.disabled = false; btn.textContent = "Cek kalimat ini lagi"; });
  };
  $("#btReset").onclick = function () { S = { sents: [], flags: {}, done: {}, only: "", sel: -1, file: null }; $("#btText").textContent = ""; sideReset(); step(1); };
})();
