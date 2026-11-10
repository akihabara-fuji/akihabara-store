(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var f1 = function (v) { return String(Math.round(Number(v) * 10) / 10).replace(".", ","); };
  var st = { up: null, wa: "" }, TOTAL_MAX_MB = 28;

  function el(tag, css, txt, cls) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }
  function adminHref(note) { var c = cfg(); return c && c.admin_wa_number ? "https://wa.me/" + c.admin_wa_number + "?text=" + encodeURIComponent("Halo admin Catatan Akademik, " + (note || "saya mengalami kendala di Cek dan Parafrase Mandiri.")) : ""; }
  /* Pesan galat: apa yang terjadi, apa yang harus dilakukan, dan jalan pintas ke admin bila perlu. */
  function showErr(m, help) {
    ["err", "err2"].forEach(function (id) {
      var e = $(id); e.textContent = m || ""; e.classList.toggle("hidden", !m); e.style.cssText = m ? "background:#FFD3D3;color:#6e0808;border:2px solid #d32f2f;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.5;font-weight:700;opacity:1" : "";
      if (m && help) { var h = adminHref(typeof help === "string" ? help : ""); if (h) { var a = document.createElement("a"); a.href = h; a.target = "_blank"; a.rel = "noopener"; a.textContent = "Chat admin lewat WhatsApp"; a.style.cssText = "display:inline-block;margin-top:8px;font-weight:700;text-decoration:underline;color:inherit"; e.appendChild(document.createElement("br")); e.appendChild(a); } }
    });
    if (m) { var t = $(st.up ? "err2" : "err"); if (t && t.scrollIntoView) t.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  /* Kirim permintaan dan kembalikan hasil apa adanya: jaringan putus, jawaban bukan JSON (mis. halaman galat nginx), atau JSON biasa. */
  function send(url, init, ms) {
    var ctl = window.AbortController ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, ms || 180000) : 0;
    if (ctl) init.signal = ctl.signal;
    return fetch(url, init).then(function (r) {
      return r.text().then(function (tx) { var j = null; try { j = JSON.parse(tx); } catch (e) { j = null; } return { status: r.status, ok: r.ok && j !== null, j: j, bad: j === null }; });
    }, function (e) { return { status: 0, ok: false, j: null, net: true, aborted: !!(e && e.name === "AbortError") }; })
      .then(function (x) { if (tm) clearTimeout(tm); return x; });
  }
  function explain(x, aksi) {
    var kode = x.status ? " (kode " + x.status + ")" : "";
    if (x.net && x.aborted) return "Server terlalu lama membalas, jadi unggahan dihentikan. Yang perlu kamu lakukan: tunggu 1 sampai 2 menit, lalu tekan tombol " + aksi + " lagi. Kalau file besar, kecilkan dulu ukurannya.";
    if (x.net) return "Internet kamu terputus sebelum " + (aksi === "Unggah" ? "unggahan" : "permintaan") + " selesai. Yang perlu kamu lakukan: pastikan sinyal stabil (pindah ke Wi-Fi kalau memakai data seluler), lalu tekan tombol " + aksi + " lagi. File yang sudah kamu pilih tidak perlu dipilih ulang.";
    if (x.status === 413) return "Ukuran file terlalu besar untuk dikirim sekaligus" + kode + ". Yang perlu kamu lakukan: kecilkan salah satu file (simpan ulang PDF dengan ukuran lebih kecil) sampai total ketiga file di bawah " + TOTAL_MAX_MB + " MB, lalu unggah lagi.";
    if (x.status === 502 || x.status === 503 || x.status === 504) return "Server sedang sibuk atau sedang diperbarui" + kode + ". Yang perlu kamu lakukan: tunggu sekitar 1 menit, lalu tekan tombol " + aksi + " lagi. File tidak perlu dipilih ulang.";
    if (x.bad) return "Server membalas dengan jawaban yang tidak bisa dibaca" + kode + ". Yang perlu kamu lakukan: muat ulang halaman, lalu coba lagi. Kalau sama, chat admin.";
    return ((x.j && x.j.error) || "Permintaan gagal. Coba lagi.") + kode;
  }
  function cfg() { return (window.PF && window.PF.cfg) || null; }
  document.addEventListener("pf-config", function () { if (st.up) price(); });

  /* ---------- langkah 1: tiga file + nomor WhatsApp ---------- */
  var fO = $("fOrig"), fA = $("fAi"), fS = $("fSim"), fW = $("fWa");
  function waOk() { return /^8\d{8,12}$/.test(fW.value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, "")); }
  function missing1() {
    var m = []; if (!fO.files[0]) m.push("file asli (langkah 1)"); if (!fA.files[0]) m.push("laporan AI Drillbit (langkah 2)"); if (!fS.files[0]) m.push("laporan Similarity Drillbit (langkah 3)"); if (!waOk()) m.push("nomor WhatsApp yang benar (langkah 4, contoh 0812xxxxxxxx)");
    return m;
  }
  /* Kotak pemberitahuan solid (tidak transparan): kuning = belum lengkap, hijau = siap. */
  function note(e, m, ok) {
    e.textContent = m; e.style.cssText = "margin:0;padding:12px 14px;border-radius:12px;font-size:14px;line-height:1.5;font-weight:700;opacity:1;" + (ok ? "background:#BFF0D4;color:#08351f;border:2px solid #2e9e63" : "background:#FFE08A;color:#3d2a00;border:2px solid #d99a00");
  }
  function ready() {
    var m = missing1();
    var h = $("goHint"); if (!h) { h = el("p"); h.id = "goHint"; h.setAttribute("role", "status"); $("go").parentNode.insertBefore(h, $("go").nextSibling); }
    note(h, m.length ? "Belum lengkap. Isi dulu: " + m.join(", ") + "." : "Semua sudah terisi. Tekan tombol Unggah.", !m.length);
    h.style.display = window.PF && window.PF.needLogin ? "none" : "";
  }
  document.addEventListener("pf-login-needed", function () { ready(); });
  function checkFile(input, kind) {
    showErr(""); var f = input.files[0]; if (!f) { ready(); return; }
    var c = cfg(), max = (c && c.file_max_mb) || 10;
    if (kind === "orig" ? !/\.(docx|pdf)$/i.test(f.name) : !/\.pdf$/i.test(f.name)) { showErr(kind === "orig" ? "File asli harus Word (.docx) atau PDF." : "Laporan Drillbit harus PDF."); input.value = ""; }
    else if (f.size > max * 1048576) { showErr("File terlalu besar. Maksimal " + max + " MB."); input.value = ""; }
    ready();
  }
  fO.onchange = function () { checkFile(fO, "orig"); }; fA.onchange = function () { checkFile(fA, "pdf"); }; fS.onchange = function () { checkFile(fS, "pdf"); };
  fW.oninput = ready; ready();

  $("go").onclick = function () {
    showErr(""); var m = missing1(); if (m.length) { ready(); var hh = $("goHint"); if (hh.scrollIntoView) hh.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    var tot = fO.files[0].size + fA.files[0].size + fS.files[0].size;
    if (tot > TOTAL_MAX_MB * 1048576) { showErr("Total ukuran ketiga file " + (Math.round(tot / 104857.6) / 10).toString().replace(".", ",") + " MB, melebihi batas " + TOTAL_MAX_MB + " MB sekali kirim. Yang perlu kamu lakukan: kecilkan salah satu file (simpan ulang PDF dengan ukuran lebih kecil), lalu unggah lagi."); return; }
    var fd = new FormData(); fd.append("file", fO.files[0]); fd.append("ai", fA.files[0]); fd.append("sim", fS.files[0]); fd.append("wa", fW.value);
    $("go").disabled = true; st.wa = fW.value;
    window.pfScan.start($("busy"), ["Mengunggah file…", "Membaca laporan Drillbit…", "Memetakan blok UT ke dokumenmu…", "Menyusun hasil…"]);
    send("/ms/cek/upload", { method: "POST", body: fd }, 180000).then(function (x) {
      window.pfScan.stop($("busy")); $("go").disabled = false;
      if (x.j && x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; }
      if (!x.ok) { showErr(explain(x, "Unggah"), "unggahan file saya di Cek dan Parafrase Mandiri gagal" + (x.status ? " (kode " + x.status + ")" : "") + "."); return; }
      st.up = x.j; $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0);
      try { render(x.j); } catch (e) {
        if (window.console) console.error("[cek] render", e);
        $("rmeta").textContent = (x.j.file && x.j.file.name || "Dokumenmu") + " sudah terunggah.";
        var w = $("warn"); w.innerHTML = ""; w.appendChild(el("div", "color:#ffb347;font-size:13.5px", "Sebagian rincian bacaan tidak bisa ditampilkan, tetapi file sudah tersimpan dan harga serta pemesanan tetap bisa dipakai di bawah."));
        $("dl").min = new Date().toISOString().slice(0, 10); if (!$("dl").value) { var t = new Date(Date.now() + 2 * 86400000), p = function (n) { return String(n).padStart(2, "0"); }; $("dl").value = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate()); }
        try { price(); } catch (e2) { gate(); }
      }
    });
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
  function loadCfg(cb) { fetch("/ms/public-config", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (c) { window.PF.cfg = c; cb(true); }).catch(function () { cb(false); }); }
  function cfgWait() {
    $("total").textContent = "Memuat harga…";
    var h = $("payhint"); h.textContent = "Daftar harga sedang dimuat…";
    var tries = 0; (function go() { loadCfg(function (ok) {
      if (ok) { price(); return; }
      if (++tries < 3) { setTimeout(go, 1500); return; }
      $("total").textContent = "Harga belum termuat"; h.textContent = "Daftar harga belum bisa dimuat. Pastikan internet stabil, lalu tekan tombol ini: ";
      var b = el("button", "margin-left:6px;font-weight:700;text-decoration:underline;background:none;border:0;color:inherit;cursor:pointer", "Muat ulang harga"); b.type = "button"; b.onclick = cfgWait; h.appendChild(b);
    }); })();
  }
  function price() {
    var c = cfg(), u = st.up; if (!u) return; if (!c) { cfgWait(); return; }
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
  /* Syarat bayar: harga termuat, deadline belum lewat, kotak persetujuan dicentang. Yang belum terpenuhi disebut satu per satu. */
  function missing2() {
    var m = [], dl = dlDate(); if (!cfg()) m.push("daftar harga belum termuat"); if (!(dl && dl.getTime() > Date.now())) m.push("isi tanggal dan jam deadline yang belum lewat"); if (!$("agree").checked) m.push("centang kotak persetujuan di atas tombol bayar");
    return m;
  }
  function gate() {
    var dl = dlDate(), dlok = dl && dl.getTime() > Date.now(), m = missing2(), ag = $("agree").closest("label");
    $("dlwarn").textContent = dlok && dl.getTime() - Date.now() < 86400000 ? "Deadline kurang dari 24 jam, kami sarankan jalur cepat." : "";
    note($("payhint"), m.length ? "Belum lengkap. Yang perlu kamu lakukan: " + m.join("; ") + "." : "Semua syarat terpenuhi. Pembayaran QRIS dibuka di langkah berikutnya.", !m.length);
    if (ag) ag.style.outline = $("agree").checked ? "" : "2px dashed #ffb347"; if (ag) ag.style.outlineOffset = "4px";
  }
  ["dl", "dljam", "agree"].forEach(function (id) { $(id).addEventListener("input", gate); $(id).addEventListener("change", gate); });
  $("fast").addEventListener("change", price);

  $("pay").onclick = function () {
    showErr(""); var dl = dlDate(); if (!st.up) return;
    var m = missing2(); if (m.length) { gate(); var ph = $("payhint"); if (ph.scrollIntoView) ph.scrollIntoView({ block: "center", behavior: "smooth" }); var f = !cfg() ? null : !(dl && dl.getTime() > Date.now()) ? $("dl") : $("agree"); if (f && f.focus) f.focus(); return; }
    $("pay").disabled = true; $("pay").textContent = "Membuat pesanan…";
    send("/ms/parafrase/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      uploadId: st.up.uploadId, wa: st.wa, title: st.up.file.name.replace(/\.[a-z0-9]{1,5}$/i, ""), language: "id", docType: "umum",
      excludeBib: false, fast: $("fast").checked, deadline: dl.getTime(), agree: $("agree").checked }) }, 60000)
      .then(function (x) {
        if (x.j && x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; }
        if (x.ok) { try { localStorage.setItem("pf_last", x.j.token); } catch (e) {} location.href = x.j.url; return; }
        if (x.net || x.bad) { showErr(explain(x, "Bayar") + " Sebelum membuat ulang, buka menu Cek Pesanan (/pesanan) untuk memastikan pesananmu belum terbuat.", "pesanan saya di Cek dan Parafrase Mandiri gagal dibuat" + (x.status ? " (kode " + x.status + ")" : "") + "."); return; }
        showErr(x.j.error || "Pesanan gagal dibuat.");
        if (x.j.code === "fast_full") loadCfg(function (ok) { if (ok) price(); });
      })
      .then(function () { $("pay").disabled = false; $("pay").textContent = payLabel(); gate(); });
  };
})();
