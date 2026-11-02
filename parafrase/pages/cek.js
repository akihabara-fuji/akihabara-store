(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var f1 = function (v) { return String(Math.round(Number(v) * 10) / 10).replace(".", ","); };
  var st = { up: null, wa: "" };

  function el(tag, css, txt, cls) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function showErr(m) { ["err", "err2"].forEach(function (id) { var e = $(id); e.textContent = m || ""; e.classList.toggle("hidden", !m); }); }
  function cfg() { return (window.PF && window.PF.cfg) || null; }
  document.addEventListener("pf-config", function () { if (st.up) price(); });

  /* ---------- langkah 1: tiga file + nomor WhatsApp ---------- */
  var fO = $("fOrig"), fA = $("fAi"), fS = $("fSim"), fW = $("fWa");
  function waOk() { return /^8\d{8,12}$/.test(fW.value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, "")); }
  function ready() { $("go").disabled = !(fO.files[0] && fA.files[0] && fS.files[0] && waOk()); }
  function checkFile(input, kind) {
    showErr(""); var f = input.files[0]; if (!f) { ready(); return; }
    var c = cfg(), max = (c && c.file_max_mb) || 10;
    if (kind === "orig" ? !/\.(docx|pdf)$/i.test(f.name) : !/\.pdf$/i.test(f.name)) { showErr(kind === "orig" ? "File asli harus Word (.docx) atau PDF." : "Laporan Drillbit harus PDF."); input.value = ""; }
    else if (f.size > max * 1048576) { showErr("File terlalu besar. Maksimal " + max + " MB."); input.value = ""; }
    ready();
  }
  fO.onchange = function () { checkFile(fO, "orig"); }; fA.onchange = function () { checkFile(fA, "pdf"); }; fS.onchange = function () { checkFile(fS, "pdf"); };
  fW.oninput = ready;

  $("go").onclick = function () {
    showErr(""); if (!(fO.files[0] && fA.files[0] && fS.files[0] && waOk())) return;
    var fd = new FormData(); fd.append("file", fO.files[0]); fd.append("ai", fA.files[0]); fd.append("sim", fS.files[0]); fd.append("wa", fW.value);
    $("go").disabled = true; st.wa = fW.value;
    window.pfScan.start($("busy"), ["Mengunggah file…", "Membaca laporan Drillbit…", "Memetakan blok UT ke dokumenmu…", "Menyusun hasil…"]);
    fetch("/ms/cek/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        window.pfScan.stop($("busy")); $("go").disabled = false;
        if (!x.ok) { if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; } showErr(x.j.error || "Unggahan gagal. Coba lagi."); return; }
        st.up = x.j; render(x.j); $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0);
      }).catch(function () { window.pfScan.stop($("busy")); $("go").disabled = false; showErr("Koneksi terputus. Coba lagi."); });
  };
  $("again").onclick = function () { st.up = null; $("s2").classList.add("hidden"); $("s1").classList.remove("hidden"); showErr(""); [fO, fA, fS].forEach(function (i) { i.value = ""; }); ready(); window.scrollTo(0, 0); };

  /* ---------- langkah 2: hasil bacaan ---------- */
  function ring(col, big, sub, pct) {
    var r = el("div", "background:conic-gradient(" + col + " " + Math.min(100, pct) * 3.6 + "deg,rgba(128,128,160,.25) 0)", null, "bd-ring");
    var i = el("div"); i.appendChild(el("b", "font-size:21px;line-height:1;color:" + col, big)); i.appendChild(el("span", "font-size:10.5px;opacity:.7", sub)); r.appendChild(i); return r;
  }
  function ringBox(title, line, r) {
    var b = el("div", "flex:1;min-width:250px;display:flex;gap:12px;align-items:flex-start"); b.appendChild(r);
    var s = el("div", "flex:1"); s.appendChild(el("div", "font-weight:800;font-size:15px", title));
    s.appendChild(el("div", "margin:4px 0")).appendChild(el("span", "display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;background:#c9d3ff;color:#0a0f26", "DARI LAPORAN UT YANG KAMU UNGGAH"));
    s.appendChild(el("div", "font-size:12.5px;line-height:1.55;margin-top:4px;opacity:.9", line)); b.appendChild(s); return b;
  }
  var GRADE = { A: "#5ee6a8", B: "#8ec5ff", C: "#ffb347", D: "#ff8aa5" };
  var POLA = [["definisi", "Ungu", "#d9b8ff", "Definisi buku teks"], ["sintesis", "Oranye", "#ffc78a", "Ringkasan penelitian orang lain"], ["proposisi", "Biru muda", "#8fe3ee", "Proposisi atau hipotesis baku"],
    ["umum", "Kuning", "#ffe27a", "Kalimat umum tanpa detail"], ["blok", "Abu", "#cfd3e6", "Ikut satu blok dengan kalimat sekitarnya"]];
  var MERAH = [["panjang", "Kalimat terlalu panjang (di atas 35 kata)"], ["dempet", "Paragraf dempet (2 kalimat atau kurang)"], ["penyambung", "Penyambung awal kalimat berulang"]];
  function row(chipTxt, chipBg, label, n) {
    var r = el("div", "display:flex;justify-content:space-between;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border,#2b2b58)");
    var l = el("span"); l.appendChild(el("span", "display:inline-block;font-size:11.5px;font-weight:700;padding:1px 9px;border-radius:999px;color:#12202f;margin-right:7px;background:" + chipBg, chipTxt)); l.appendChild(document.createTextNode(label));
    r.appendChild(l); r.appendChild(el("b", "", String(n))); return r;
  }
  function render(j) {
    $("rmeta").textContent = j.file.name + " · " + rp(j.words) + " kata isi (tanpa sampul, daftar isi, dan pustaka) · " + j.totalFindings + " kalimat ditandai UT";
    var rg = $("rings"); rg.innerHTML = "";
    if (j.ut) rg.appendChild(ringBox("AI Drillbit", j.ut.matchedWords + " dari " + j.ut.totalWords + " kata ditandai, " + j.ut.blocks.length + " blok. Dibaca dari file kamu, belum diverifikasi UT, bukan hitungan kami.", ring("#26c6da", f1(j.ut.pct) + "%", "dari UT", j.ut.pct)));
    if (j.sim) rg.appendChild(ringBox("Similarity Drillbit", j.sim.matchedSources + " sumber cocok. Dibaca dari file kamu, belum diverifikasi UT. Similarity tidak kami hitung ulang.", ring(GRADE[j.sim.grade] || "#8ec5ff", f1(j.sim.pct) + "%", "Grade " + j.sim.grade + " (UT)", j.sim.pct)));
    var w = $("warn"); w.innerHTML = ""; (j.warn || []).forEach(function (m) { w.appendChild(el("div", "color:#ffb347;font-size:13.5px", m)); });
    var s = j.stats || { total: j.totalFindings, pola: {}, ciriMerah: {} };
    $("utNote").textContent = s.total + " kalimat biru" + (j.ut ? " di " + j.ut.blocks.length + " blok UT; " + rp(j.ut.mappedWords) + " kata berhasil dipetakan ke dokumenmu" : "") + ". Hanya kalimat ini yang dikerjakan admin.";
    var box = $("anaRows"); box.innerHTML = "";
    var tot = el("div", "display:flex;justify-content:space-between;padding:7px 0;border-bottom:2px solid var(--border,#2b2b58);font-weight:800"); tot.appendChild(el("span", "", "Total kalimat biru")); tot.appendChild(el("span", "", s.total + " kalimat")); box.appendChild(tot);
    POLA.forEach(function (p) { var n = (s.pola || {})[p[0]] || 0; if (n) box.appendChild(row(p[1], p[2], p[3], n)); });
    MERAH.forEach(function (m) { var n = (s.ciriMerah || {})[m[0]] || 0; if (n) box.appendChild(row("Merah", "#ff8aa5", m[1], n)); });
    var mc = $("mapCard"); mc.style.display = j.docMap ? "" : "none";
    if (j.docMap) {
      $("mapNote").textContent = j.totalFindings + " kalimat isi ditandai UT. Hanya kalimat berwarna biru yang dikerjakan admin; sisanya sudah lolos dan tidak diubah.";
      var md = $("mapDoc"); md.innerHTML = "";
      j.docMap.forEach(function (pp) { var d = el("div", "margin:0 0 6px"); pp.s.forEach(function (x) { var sp = el("span", "padding:1px 3px;border-radius:5px", x.t + " "); if (x.u) sp.className = "bd-ut"; d.appendChild(sp); }); md.appendChild(d); });
    }
    var t = new Date(Date.now() + 2 * 86400000), p = function (n) { return String(n).padStart(2, "0"); };
    $("dl").min = new Date().toISOString().slice(0, 10); $("dl").value = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
    price();
  }

  /* ---------- harga: seluruh kata isi dokumen, tanpa jatah gratis ---------- */
  function payLabel() { return "Bayar dengan QRIS"; }
  function price() {
    var c = cfg(), u = st.up; if (!c || !u) return;
    var fastOn = $("fast").checked && c.fast_lane.enabled && !c.fast_lane.full;
    var base = Math.max(u.words * c.price_per_word, c.min_order_price);
    $("pwords").textContent = rp(u.words); $("pmark").textContent = u.ut ? rp(u.ut.mappedWords) : "-";
    $("total").textContent = "Rp " + rp(base + (fastOn ? c.fast_lane.price : 0));
    $("pay").textContent = payLabel();
    var f = c.fast_lane, box = $("fastbox");
    if (!f.enabled) { box.classList.add("hidden"); }
    else { box.classList.remove("hidden"); var dis = f.full; $("fast").disabled = dis; box.classList.toggle("off", dis); if (dis) $("fast").checked = false;
      $("slot").textContent = dis ? "Jalur cepat penuh hari ini." : "Slot hari ini: " + f.remaining + " dari " + f.cap + " tersisa."; }
    gate();
  }
  function dlDate() { var v = $("dl").value; return v ? new Date(v + "T" + ($("dljam").value || "17:00") + ":00") : null; }
  function gate() {
    var dl = dlDate(), dlok = dl && dl.getTime() > Date.now();
    $("dlwarn").textContent = dlok && dl.getTime() - Date.now() < 86400000 ? "Deadline kurang dari 24 jam, kami sarankan jalur cepat." : "";
    var all = dlok && $("agree").checked && st.up;
    $("pay").disabled = !all;
    $("payhint").textContent = all ? "Pembayaran QRIS dibuka di langkah berikutnya." : !dlok ? "Isi deadline yang belum lewat" : "Centang persetujuan untuk melanjutkan";
  }
  ["dl", "dljam", "agree"].forEach(function (id) { $(id).addEventListener("input", gate); $(id).addEventListener("change", gate); });
  $("fast").addEventListener("change", price);

  $("pay").onclick = function () {
    showErr(""); var dl = dlDate(); if (!st.up || !dl) return;
    $("pay").disabled = true; $("pay").textContent = "Membuat pesanan…";
    fetch("/ms/parafrase/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      uploadId: st.up.uploadId, wa: st.wa, title: st.up.file.name.replace(/\.[a-z0-9]{1,5}$/i, ""), language: "id", docType: "umum",
      excludeBib: false, fast: $("fast").checked, deadline: dl.getTime(), agree: $("agree").checked }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok && x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; }
        if (x.ok) { try { localStorage.setItem("pf_last", x.j.token); } catch (e) {} location.href = x.j.url; return; }
        showErr(x.j.error || "Pesanan gagal dibuat.");
        if (x.j.code === "fast_full") { fetch("/ms/public-config").then(function (r) { return r.json(); }).then(function (c) { window.PF.cfg = c; price(); }); }
      }).catch(function () { showErr("Koneksi terputus. Coba lagi."); })
      .then(function () { $("pay").textContent = payLabel(); gate(); });
  };
})();
