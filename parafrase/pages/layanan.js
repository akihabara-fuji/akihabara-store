(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var cfg = {}, cur = (new URLSearchParams(location.search).get("s") || "tugas"), files = [], slotFiles = {}, lastStage = "metopen_paket";
  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
  /* Simulasi presentasi: wajib unggah file penelitian, tanpa harga di formulir. Tanya jawab lengkap dibuka di halaman hasil. */
  function paintSim(s) {
    $("chips").innerHTML = ""; $("stages").innerHTML = ""; $("stages").style.display = "none"; $("slots").style.display = "none"; $("slots").innerHTML = "";
    document.querySelectorAll(".sub a").forEach(function (a) { a.classList.toggle("on", a.textContent.trim() === "Simulasi Presentasi"); });
    $("ttl").textContent = "Simulasi Presentasi";
    $("ld").textContent = "Bingung menjelaskan penelitianmu saat presentasi? Unggah file penelitianmu. Tim menyusun simulasi presentasi: urutan penjelasan, alasan memilih judul dan metode, serta pertanyaan yang biasa diajukan penguji beserta arahan jawabannya. Ini alat belajar supaya kamu paham penelitianmu sendiri, bukan janji nilai.";
    $("pbox").style.display = "none"; $("tguide").style.display = "none"; var nt = $("note"); if (nt) nt.style.display = "none";
    $("blabel").textContent = "Tentang presentasimu";
    $("brief").placeholder = "Tulis judul penelitianmu, jurusan, dan kapan kamu presentasi. Bagian yang paling kamu khawatirkan juga boleh ditulis.";
    $("pick").textContent = "+ Unggah file penelitian (Word atau PDF)";
    $("price").textContent = "Gratis dipesan. Simulasi presentasi tampil penuh. Tanya jawab dosen tampil cuplikan: membuka lengkapnya gratis untuk pertama kali, berikutnya " + (s.simCoins || 4) + " koin.";
    $("go").textContent = "Kirim untuk disimulasikan"; gate(); payPaint();
  }
  function paint() {
    var s = cfg[cur]; if (!s) return;
    if (s.kind === "simulasi") return paintSim(s);
    $("chips").innerHTML = "";
    var base = s.of || (s.kind === "metopen" ? "metopen" : cur), fam = base;
    if (s.kind === "metopen") lastStage = cur;
    var stagesBox = $("stages"); stagesBox.innerHTML = "";
    function mk(parent, k, text, on, pick) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn"; b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = text;
      if (!on) b.style.cssText = "background:transparent;color:inherit;border:1px solid currentColor"; b.onclick = function () { cur = pick || k; slotFiles = {}; history.replaceState(null, "", "?s=" + cur); paint(); }; parent.appendChild(b);
    }
    var newKey = fam === "metopen" ? (cfg[lastStage] && cfg[lastStage].kind === "metopen" ? lastStage : "metopen_paket") : fam, rk = "revisi_" + fam, isRev = s.kind === "revisi";
    if (cfg[newKey]) mk($("chips"), newKey, "Pesanan baru" + (fam === "metopen" ? "" : " · " + rp(cfg[newKey].price)), !isRev);
    if (cfg[rk]) mk($("chips"), rk, "Revisi · " + (fam === "metopen" ? "gratis untuk file kami, " + rp(cfg[rk].price) + " untuk file dari luar" : rp(cfg[rk].price)), isRev);
    if (fam === "metopen" && !isRev) ["metopen_paket", "metopen1", "metopen2", "metopen3"].forEach(function (k) { if (cfg[k]) mk(stagesBox, k, cfg[k].label + " · " + rp(cfg[k].price), k === cur); });
    stagesBox.style.display = fam === "metopen" && !isRev ? "flex" : "none";
    var FAM = { tugas: "Tugas", diskusi: "Diskusi", metopen: "Metopen" };
    document.querySelectorAll(".sub a").forEach(function (a) { var t = a.textContent.trim(); a.classList.toggle("on", t === FAM[fam]); });
    var rev = s.kind === "revisi", dis = fam === "diskusi", td = fam === "tugas" || fam === "diskusi";
    $("chips").style.display = "flex";
    $("ttl").textContent = rev ? "Revisi " + FAM[fam] : fam === "metopen" ? "Metopen" : dis ? "Diskusi" : "Tugas";
    $("ld").textContent = rev ? "Ada masukan dari tutor? Tempel catatannya atau unggah foto atau file catatan tutor. Revisi gratis untuk hasil buatan Catatan Akademik: isi ID pesanan sebelumnya. Kalau setelah revisi hasilnya masih belum sesuai catatan tutor, kamu bisa kembali lagi tanpa biaya (isi ID pesanan revisi terakhir). Untuk file dari luar, revisi berbayar." : "Tulis kebutuhan, lampirkan file soal atau masukan tutor. Bayar QRIS, hasil dikirim admin ke WhatsApp-mu sesuai status pesanan. Perlu masuk dengan akun Catatan Akademik.";
    $("pbox").style.display = (rev || td) ? "flex" : "none";
    $("pbl").textContent = td ? "Revisi dari tutor? Isi ID pesanan sebelumnya (gratis untuk hasil kami)" : "ID pesanan sebelumnya (isi untuk revisi gratis)";
    $("blabel").textContent = rev ? "Masukan dari tutor" : dis ? "Soal diskusi" : "Kebutuhanmu";
    $("brief").placeholder = rev ? "Contoh: Tutor meminta menambah referensi jurnal pada Bab 2 dan memperbaiki cara mengutip. Tempel kalimat tutornya di sini, atau unggah fotonya lewat tombol di bawah." : dis ? "Tempel soal diskusi di sini. Cukup teks. Kalau ada revisi dari tutor, tulis atau tempel kalimat tutornya di sini juga." : td ? "Contoh: Tugas 2 Manajemen Keuangan, soal ada di file. Kalau ada revisi dari tutor, tulis catatannya di sini juga." : "Tulis kebutuhanmu atau tempel masukan tutor di sini.";
    $("pick").textContent = rev ? "+ Unggah foto atau file catatan tutor" : dis ? "+ Lampirkan file (opsional, mis. file revisi)" : "+ Lampirkan file";
    var pv = $("pid").value.trim();
    $("price").textContent = rev ? "Gratis untuk hasil kami (isi ID pesanan), " + rp(s.price) + " untuk file dari luar" : td && pv ? "Revisi gratis (dicek otomatis dari ID pesanan)" : rp(s.price);
    $("price").title = ""; var nt = $("note"); if (nt) nt.style.display = fam === "metopen" && !rev ? "block" : "none";
    var tn = s.tutorNote;
    $("tguide").style.display = tn ? "block" : "none";
    if (tn) { $("blabel").textContent = "Catatan dari tutor (opsional)"; $("brief").placeholder = "Tempel catatan tutor di sini. Tidak ada catatan? Kosongkan, nanti dikerjakan sesuai template yang berlaku."; $("pick").textContent = "+ Lampirkan file catatan tutor (opsional)"; }
    paintSlots();
    $("go").textContent = "Pesan " + s.label; gate(); payPaint();
  }
  /* Bayar pakai koin: 1 koin = Rp1.000. Kotak ini hanya muncul untuk akun yang sudah masuk dan harga yang berlaku (bukan revisi gratis). */
  var bal = null, payMode = "qris";
  function coinsOf() { var s = cfg[cur], free = $("pid").value.trim() && (s && (s.kind === "revisi" || cur === "tugas" || cur === "diskusi")); return !s || free || !s.price || s.price % 1000 ? 0 : s.price / 1000; }
  function payPaint() {
    var box = $("paybox"), c = coinsOf();
    if (bal === null || !c) { box.style.display = "none"; payMode = "qris"; $("go").textContent = $("go").textContent.replace(/ \(.*\)$/, ""); return; }
    box.style.display = "flex";
    var kurang = Math.max(0, c - bal);
    $("paykt").textContent = "Koin: " + c + " koin. Saldomu " + bal + " koin.";
    $("paykn").textContent = kurang ? "Kurang " + kurang + " koin. Pilih koin untuk langsung isi Rp" + String(kurang * 1000).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ", atau bayar lewat QRIS." : "Koin langsung terpotong dan pesanan langsung masuk antrean, tanpa unggah bukti.";
    if (!box.dataset.set) { box.dataset.set = "1"; payMode = kurang ? "qris" : "koin"; }
    $("payk").checked = payMode === "koin"; $("payq").checked = payMode === "qris";
    $("go").textContent = ($("go").textContent.replace(/ \(.*\)$/, "")) + (payMode === "koin" ? (kurang ? " (isi koin dulu)" : " (pakai " + c + " koin)") : "");
  }
  document.addEventListener("change", function (e) { if (e.target && e.target.name === "pay") { payMode = e.target.value; payPaint(); } });
  fetch("/ms/koin/saldo", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { if (typeof j.balance === "number") { bal = j.balance; payPaint(); } }).catch(function () {});
  function need() { return (cfg[cur] && cfg[cur].needs) || []; }
  function gate() {
    var wa = $("wa").value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""), n = need(), slots = n.every(function (l) { return slotFiles[l]; }), total = n.length + files.length, sim = cfg[cur] && cfg[cur].kind === "simulasi";
    $("go").disabled = !(cfg[cur] && /^8\d{8,12}$/.test(wa) && $("agree").checked && slots && (sim ? files.length > 0 : ($("brief").value.trim().length >= 5 || total)));
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
    showErr("");
    var cc = coinsOf();
    if (payMode === "koin" && bal !== null && cc && cc > bal) { location.href = "/ruangakademikut/koin?kurang=" + (cc - bal) + "&next=" + encodeURIComponent(location.pathname + location.search); return; }
    var b = this; b.disabled = true;
    var fd = new FormData(); fd.append("service", ($("pid").value.trim() && cfg["revisi_" + cur]) ? "revisi_" + cur : cur); fd.append("brief", $("brief").value); fd.append("wa", $("wa").value); fd.append("agree", $("agree").checked ? "true" : "false"); if (payMode === "koin" && bal !== null && cc) fd.append("pay", "koin"); fd.append("parentId", $("pid").value);
    need().forEach(function (l) { var f = slotFiles[l]; if (f) fd.append("files", f, l + " - " + f.name); });
    files.forEach(function (f) { fd.append("files", f); });
    fetch("/ms/layanan/order", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok) { location.href = x.j.url; return; } if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname + location.search); return; } showErr(x.j.error || "Pesanan gagal. Coba lagi."); gate(); })
      .catch(function () { showErr("Koneksi terputus. Coba lagi."); gate(); });
  };
  fetch("/ms/layanan/config").then(function (r) { return r.json(); }).then(function (j) { cfg = j; if (!cfg[cur]) cur = "tugas"; paint(); });
})();
