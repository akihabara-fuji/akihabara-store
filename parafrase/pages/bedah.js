/* Bedah Laporan Penelitian UT (halaman publik). Semua teks dari server dipasang lewat textContent, tidak lewat innerHTML. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var f1 = function (n) { return String(Math.round(n * 100) / 100).replace(".", ","); };
  var upId = null, lastRes = null;
  function el(t, css, x, cls) { var e = document.createElement(t); if (css) e.style.cssText = css; if (cls) e.className = cls; if (x != null) e.textContent = x; return e; }
  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }

  /* harga di hook dari pengaturan admin */
  fetch("/ms/public-config").then(function (r) { return r.ok ? r.json() : {}; }).then(function (c) {
    var m = { "data-bg": c.bedah_gratis_kata, "data-bh": c.bedah_harga_per_1000 };
    Object.keys(m).forEach(function (a) { if (m[a] == null) return; document.querySelectorAll("[" + a + "]").forEach(function (n) { n.textContent = rp(m[a]); }); });
  }).catch(function () {});

  /* ---------- unggah ---------- */
  var chosen = { orig: null };
  function ok(f, pdfOnly) {
    if (!f) return true;
    if (f.size > 10 * 1048576) { showErr("File terlalu besar. Maksimal 10 MB."); return false; }
    if (pdfOnly ? !/\.pdf$/i.test(f.name) : !/\.(docx|pdf)$/i.test(f.name)) { showErr(pdfOnly ? "Laporan Drillbit harus PDF." : "File asli harus Word (.docx) atau PDF."); return false; }
    return true;
  }
  $("fOrig").onchange = function () { showErr(""); chosen.orig = this.files[0] || null; if (!ok(chosen.orig, false)) { chosen.orig = null; this.value = ""; } $("go").disabled = !(chosen.orig && $("fAi").files[0]); };
  $("fAi").onchange = function () { showErr(""); if (!ok(this.files[0], true)) this.value = ""; $("go").disabled = !(chosen.orig && this.files[0]); };
  $("go").onclick = function () {
    showErr("");
    var o = $("fOrig").files[0], a = $("fAi").files[0], s = $("fSim").files[0];
    if (!o) { showErr("Pilih file aslimu dulu."); return; }
    if (!a) { showErr("Unggah laporan AI Drillbit dari UT. Bedah hanya membaca tanda dari UT."); return; }
    if (!ok(o, false) || !ok(a, true) || !ok(s, true)) return;
    window.pfScan.start($("busy"), ["Mengunggah file…", "Membaca laporan Drillbit…", "Memetakan blok UT ke dokumenmu…", "Mendiagnosis kalimat yang ditandai…", "Menyusun hasil…"]);
    $("go").disabled = true;
    var fd = new FormData(); fd.append("izin", $("izin").checked ? "1" : "0"); fd.append("file", o); if (a) fd.append("ai", a); if (s) fd.append("sim", s);
    fetch("/ms/bedah/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        $("busy").classList.add("hidden"); $("go").disabled = false;
        if (!x.ok) { showErr(x.j.error || "Gagal. Coba lagi."); return; }
        upId = x.j.uploadId; lastRes = x.j; render(x.j); $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0);
      }).catch(function () { $("busy").classList.add("hidden"); $("go").disabled = false; showErr("Koneksi terputus. Coba lagi."); });
  };
  $("again").onclick = function () { $("s2").classList.add("hidden"); $("s1").classList.remove("hidden"); showErr(""); };

  /* ---------- komponen ---------- */
  function ring(col, big, sub, pct, dashed) {
    var r = el("div", "", null, "bd-ring"); r.style.background = dashed ? "transparent" : "conic-gradient(" + col + " " + Math.min(100, pct) * 3.6 + "deg,rgba(128,128,160,.25) 0)";
    if (dashed) r.style.border = "2px dashed rgba(128,128,160,.6)";
    var i = el("div"); i.appendChild(el("b", "font-size:21px;line-height:1;color:" + col, big)); i.appendChild(el("span", "font-size:10.5px;opacity:.7", sub)); r.appendChild(i); return r;
  }
  function tag(text, bg) { return el("span", "display:inline-block;font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px;background:" + bg + ";color:#0a0f26", text); }
  function ringBox(title, tg, tgBg, r, lines) {
    var b = el("div", "flex:1;min-width:250px;display:flex;gap:12px;align-items:flex-start"); b.appendChild(r);
    var s = el("div", "flex:1"); s.appendChild(el("div", "font-weight:800;font-size:15px", title)); s.appendChild(el("div", "margin:4px 0", null)).appendChild(tag(tg, tgBg));
    lines.forEach(function (l) { s.appendChild(el("div", "font-size:12.5px;line-height:1.55;margin-top:4px;opacity:.9", l)); }); b.appendChild(s); return b;
  }
  function gradeOf(p) { return p <= 10 ? ["A", "Aman", "#5ee6a8"] : p <= 25 ? ["B", "Perlu diperbaiki", "#8ec5ff"] : p <= 40 ? ["C", "Banyak catatan", "#ffb347"] : ["D", "Mendesak", "#ff8aa5"]; }
  function simGrade(g) { return { A: "#5ee6a8", B: "#8ec5ff", C: "#ffb347", D: "#ff8aa5" }[g] || "#8ec5ff"; }

  function renderRings(j, box) {
    box.innerHTML = "";
    if (j.ut) box.appendChild(ringBox("AI Drillbit", "DARI LAPORAN UT YANG KAMU UNGGAH", "#c9d3ff", ring("#26c6da", f1(j.ut.pct) + "%", "dari UT", j.ut.pct), [
      j.ut.matchedWords + " dari " + j.ut.totalWords + " kata ditandai, " + (j.ut.blocks.length) + " blok. Dibaca dari file kamu, belum diverifikasi UT, bukan hitungan kami."]));
        if (j.sim) box.appendChild(ringBox("Similarity Drillbit", "DARI LAPORAN UT YANG KAMU UNGGAH", "#c9d3ff", ring(simGrade(j.sim.grade), f1(j.sim.pct) + "%", "Grade " + j.sim.grade + " (UT)", j.sim.pct), [
      j.sim.matchedSources + " sumber cocok. Dibaca dari file kamu, belum diverifikasi UT. Similarity tidak kami hitung ulang."]));
    
  }

  /* Satu kalimat yang ditandai UT + diagnosis berbasis bukti. */
  function findingNode(f, locked) {
    var d = el("div", "", null, "bd-f2" + (locked ? " bd-lock" : ""));
    var head = el("div", "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px");
    head.appendChild(el("span", "font-weight:800", (f.n ? f.n + "." : "")));
    head.appendChild(el("span", "font-size:11px;font-weight:800;color:#26c6da;border:2px dashed #26c6da;border-radius:99px;padding:1px 8px", "Blok UT " + f.block));
    head.appendChild(el("span", "font-size:12.5px;opacity:.8", f.where));
    d.appendChild(head);
    if (locked) {
      var n = Math.max(8, Math.min(40, f.words || 20)), fill = [], base = ["Kalimat", "ini", "ditandai", "UT", "dan", "rekomendasinya", "terbuka", "setelah", "pembayaran"];
      for (var i = 0; i < n; i++) fill.push(base[i % base.length]);
      var ph = el("div", "line-height:1.8", fill.join(" "), "bd-blur"); ph.setAttribute("aria-hidden", "true"); d.appendChild(ph);
      var rc = el("div", "margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--line,#2b2b58);font-size:13.5px", "Perbaiki, jangan, dan bukti untuk kalimat ini terbuka setelah pembayaran.", "bd-blur"); rc.setAttribute("aria-hidden", "true"); d.appendChild(rc);
      d.appendChild(el("div", "margin-top:6px;font-size:12.5px;font-weight:700", "Terkunci: di luar jatah gratis. Buka lewat pembayaran di samping."));
      return d;
    }
    var sent = el("div", "line-height:1.8"); sent.appendChild(el("span", "", f.text, "bd-ut")); d.appendChild(sent);
    (f.tags || []).forEach(function (g) {
      var b = el("div", "margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--line,#2b2b58);font-size:13.5px;line-height:1.55");
      b.appendChild(el("b", "display:block;margin-bottom:2px", g.label));
      var p1 = el("div", ""); p1.appendChild(el("b", "", "Perbaiki: ")); p1.appendChild(document.createTextNode(g.fix)); b.appendChild(p1);
      var p2 = el("div", "margin-top:4px;color:#ff8aa5"); p2.appendChild(el("b", "", "Jangan: ")); p2.appendChild(document.createTextNode(g.jangan)); b.appendChild(p2);
      b.appendChild(el("div", "margin-top:4px;font-size:12px;opacity:.75", "Bukti: " + g.bukti));
      d.appendChild(b);
    });
    return d;
  }
  var LBL = { proposisi: "proposisi/hipotesis", sintesis: "ringkasan penelitian orang lain", definisi: "definisi buku teks", umum: "kalimat umum tanpa detail", blok: "ikut satu blok" };
  function protokolBox(list, box) {
    box.innerHTML = ""; box.appendChild(el("b", "display:block;margin-bottom:6px", "Aturan revisi (kesempatan unggah di UT terbatas)"));
    var ol = el("ol", "margin:0;padding-left:20px;line-height:1.7;font-size:14px"); (list || []).forEach(function (x) { ol.appendChild(el("li", "", x)); }); box.appendChild(ol);
  }
  function blockList(bl, box) {
    box.innerHTML = ""; if (!bl || !bl.length) return;
    box.appendChild(el("b", "display:block;margin:10px 0 6px", "Pola utama tiap blok"));
    bl.forEach(function (b) { box.appendChild(el("div", "font-size:13.5px;margin:3px 0", "Blok " + b.block + " · " + b.sentences + " kalimat · terbanyak: " + (LBL[b.top] || "-") + " · " + b.umum + " kalimat tanpa angka/nama spesifik")); });
  }
  function utTable(ut, box, noteBox, guideBox, guide) {
    box.innerHTML = "";
    var t = el("table", "", null, "bd-t"), h = el("tr"); ["Blok", "Kata (UT)", "Kalimat (UT)", "% (UT)", "Terpetakan di dokumenmu"].forEach(function (x) { h.appendChild(el("th", "", x)); }); t.appendChild(h);
    ut.blocks.forEach(function (b) {
      var r = el("tr"), tb = b.table || {};
      r.appendChild(el("td", "", String(b.n))); r.appendChild(el("td", "", String(tb.words != null ? tb.words : b.words)));
      r.appendChild(el("td", "", tb.sentences != null ? String(tb.sentences) : "-")); r.appendChild(el("td", "", tb.pct != null ? f1(tb.pct) + "%" : "-"));
      r.appendChild(el("td", "", b.mapped ? b.mapped.sentences + " kalimat · paragraf " + (b.mapped.from + 1) + (b.mapped.to !== b.mapped.from ? "–" + (b.mapped.to + 1) : "") : "tidak terpetakan"));
      t.appendChild(r);
    });
    box.appendChild(t);
    noteBox.textContent = "Blok adalah rentetan kalimat yang disorot biru oleh Drillbit. " + ut.mappedSentences + " kalimat (" + ut.mappedWords + " kata) berhasil dipetakan ke dokumenmu" + (ut.confidence === "tinggi" ? "." : " (keyakinan pembacaan: " + ut.confidence + ").");
    blockList(guide, guideBox);
  }
  function simBody(s, box) {
    box.innerHTML = "";
    var rows = [["Similarity", f1(s.pct) + "% · Grade " + s.grade + " (dibaca dari laporan UT)"], ["Sumber cocok", String(s.matchedSources)]];
    if (s.sourceTypes && s.sourceTypes.jurnal != null) rows.push(["Jurnal/Publikasi", f1(s.sourceTypes.jurnal) + "%"]);
    if (s.sourceTypes && s.sourceTypes.internet != null) rows.push(["Internet", f1(s.sourceTypes.internet) + "%"]);
    if (s.content && s.content.kutipan != null) rows.push(["Kutipan (dikecualikan)", f1(s.content.kutipan) + "%"]);
    if (s.content && s.content.kurangDari14Kata != null) rows.push(["Kurang dari 14 kata (dikecualikan)", f1(s.content.kurangDari14Kata) + "%"]);
    var t = el("table", "", null, "bd-t"); rows.forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", "", r[0])); tr.appendChild(el("td", "font-weight:700", r[1])); t.appendChild(tr); }); box.appendChild(t);
    if (s.sources && s.sources.length) { box.appendChild(el("div", "margin-top:10px;font-weight:700", "Sumber yang cocok")); s.sources.forEach(function (x) { box.appendChild(el("div", "font-size:13.5px", x.n + ". " + x.domain + " · " + x.type + (x.pct != null ? " · " + x.pct + "%" : ""))); }); }
    box.appendChild(el("div", "margin-top:8px;font-size:12.5px;opacity:.8", "Similarity bergantung pada database Drillbit yang tertutup, jadi kami hanya menampilkannya, tidak menghitung ulang."));
  }

  /* ---------- hasil gratis ---------- */
  function render(j) {
    $("rt").textContent = "Hasil Bedah";
    $("rmeta").textContent = j.file.name + " · " + rp(j.words) + " kata isi (tanpa sampul, daftar isi, dan pustaka) · " + j.totalFindings + " kalimat ditandai UT";
    renderRings(j, $("rings"));
    var w = $("warn"); w.innerHTML = ""; (j.warn || []).forEach(function (m) { w.appendChild(el("div", "color:#ffb347;font-size:13.5px", m)); });
    var uc = $("utCard"); uc.style.display = j.ut ? "" : "none"; if (j.ut) utTable(j.ut, $("utTable"), $("utNote"), $("utGuide"), j.blocks || []);
    var mc = $("mapCard"); mc.style.display = j.docMap ? "" : "none";
    if (j.docMap) {
      $("mapNote").textContent = j.totalFindings + " kalimat isi ditandai UT. Hanya kalimat berwarna biru yang direvisi; sisanya sudah lolos dan jangan diubah.";
      var md = $("mapDoc"); md.innerHTML = "";
      var tw = 0; j.docMap.forEach(function (pp) { pp.s.forEach(function (x) { tw += x.t.split(/\s+/).length; }); });
      var inl = tw / j.docMap.length < 14, flow = el("div", ""); /* PDF terbaca per baris: gabungkan agar kalimat tidak terpotong tampilan */
      if (inl) md.appendChild(flow);
      j.docMap.forEach(function (pp) {
        var d = inl ? flow : el("div", "margin:0 0 6px");
        pp.s.forEach(function (x) {
          var sp = el("span", "padding:1px 3px;border-radius:5px", x.t + " ");
          if (x.u) sp.className = "bd-ut";
          d.appendChild(sp);
        });
        if (!inl) md.appendChild(d);
      });
    }
    $("ctaPar").style.display = "";
    var sc = $("simCard"); sc.style.display = j.sim ? "" : "none"; if (j.sim) simBody(j.sim, $("simBody"));
    $("fTitle").textContent = "Kalimat yang ditandai UT · " + j.open.length + " dari " + j.totalFindings + " terbuka (" + rp(j.quote.freeWords) + " kata pertama gratis)";
    protokolBox(j.protokol, $("pfLegend")); $("legend").textContent = "Setiap kalimat diberi diagnosis dari pola yang terbukti di data uji: apa yang diperbaiki, apa yang jangan dilakukan, dan buktinya.";
    var fl = $("flist"); fl.innerHTML = ""; j.open.forEach(function (f) { fl.appendChild(findingNode(f, false)); });
    var lk = $("locked"); lk.innerHTML = "";
    if (j.locked.length) {
      lk.appendChild(el("div", "font-weight:800;margin:10px 0 4px", j.locked.length + " kalimat lagi terkunci (diburamkan)"));
      j.locked.slice(0, 6).forEach(function (f) { lk.appendChild(findingNode(f, true)); });
      if (j.locked.length > 6) lk.appendChild(el("div", "margin:6px 0 8px", "… dan " + (j.locked.length - 6) + " kalimat lain."));
      var go = el("a", "", "Buka semua rekomendasi dan unduh file Word bertanda", "btn"); go.href = "#cta"; lk.appendChild(go);
    }
    var q = j.quote; $("pWords").textContent = rp(j.words); $("pFree").textContent = rp(q.freeWords) + " kata"; $("pAll").textContent = j.totalFindings + " kalimat";
    $("pTier").textContent = rp(q.paidWords) + " kata × Rp" + rp(q.perK) + "/1.000"; $("total").textContent = "Rp " + rp(q.total); $("buyAmt").textContent = " · Rp " + rp(q.total);
    $("kodeCard").style.display = j.kode ? "" : "none"; if (j.kode) $("kodeVal").textContent = j.kode;
    gate();
  }
  function gate() { var wa = $("wa").value.replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); $("buy").disabled = !(upId && /^8\d{8,12}$/.test(wa) && $("agree").checked); }
  $("wa").oninput = gate; $("agree").onchange = gate;
  $("buy").onclick = function () {
    var b = this; b.disabled = true; $("oerr").classList.add("hidden");
    fetch("/ms/bedah/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: upId, wa: $("wa").value, agree: $("agree").checked }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (!x.ok) { $("oerr").textContent = x.j.error || "Pesanan gagal."; $("oerr").classList.remove("hidden"); gate(); return; } location.href = x.j.url; })
      .catch(function () { $("oerr").textContent = "Koneksi terputus. Coba lagi."; $("oerr").classList.remove("hidden"); gate(); });
  };
  $("cabut").onclick = function () {
    var k = lastRes && lastRes.kode; if (!k) return;
    fetch("/ms/bedah/cabut", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: k }) }).then(function (r) { return r.json(); })
      .then(function (j) { $("cabutMsg").textContent = j.ok ? "Data kamu sudah dihapus." : (j.error || "Gagal menghapus."); if (j.ok) $("cabut").disabled = true; }).catch(function () { $("cabutMsg").textContent = "Koneksi terputus."; });
  };

  /* ---------- Pembanding (sesudah bayar) ---------- */
  var STX = { sudah: ["Sudah diubah", "bd-good"], sebagian: ["Diubah, masih berpola", "bd-warn"], belum: ["Belum diubah", "bd-bad"], tidak_ditemukan: ["Padanan tidak ditemukan", "bd-none"] };
  function setupBand(tk) {
    $("bandCard").style.display = "";
    var f = $("bandFile"), go = $("bandGo"), err = $("bandErr");
    f.onchange = function () { err.classList.add("hidden"); var x = f.files[0]; if (x && (!/\.(docx|pdf)$/i.test(x.name) || x.size > 10 * 1048576)) { err.textContent = "Pilih Word (.docx) atau PDF, maksimal 10 MB."; err.classList.remove("hidden"); f.value = ""; } go.disabled = !f.files[0]; };
    go.onclick = function () {
      err.classList.add("hidden"); go.disabled = true; $("bandOut").textContent = "Membandingkan…";
      var fd = new FormData(); fd.append("file", f.files[0]);
      fetch("/ms/bedah/banding/" + tk, { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) { go.disabled = false; if (!x.ok) { $("bandOut").textContent = ""; err.textContent = x.j.error || "Gagal membandingkan."; err.classList.remove("hidden"); return; } renderBand(x.j); })
        .catch(function () { go.disabled = false; $("bandOut").textContent = ""; err.textContent = "Koneksi terputus. Coba lagi."; err.classList.remove("hidden"); });
    };
  }
  function renderBand(j) {
    var box = $("bandOut"); box.innerHTML = "";
    var s = j.summary, sn = s.sentences, row = el("div", "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px");
    [["sudah", sn.sudah], ["sebagian", sn.sebagian], ["belum", sn.belum], ["tidak_ditemukan", sn.tidak_ditemukan]].forEach(function (a) { row.appendChild(el("span", "", STX[a[0]][0] + ": " + a[1] + " kalimat", "bd-st " + STX[a[0]][1])); });
    box.appendChild(row);
    box.appendChild(el("div", "font-size:13px;opacity:.8;margin-bottom:10px", "Dari " + s.total + " kalimat yang ditandai UT. Per blok: " + s.blocks.sudah + " sudah, " + s.blocks.sebagian + " masih berpola, " + s.blocks.belum + " belum diubah, " + s.blocks.tidak_ditemukan + " tidak ditemukan. File: " + j.file));
    j.blocks.forEach(function (b) {
      var c = el("div", "border:1px solid var(--line,#2b2b58);border-radius:12px;padding:12px;margin-bottom:10px");
      var h = el("div", "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"); h.appendChild(el("b", "", "Blok UT " + b.block)); h.appendChild(el("span", "", STX[b.status][0], "bd-st " + STX[b.status][1])); c.appendChild(h);
      b.items.forEach(function (it) {
        var w = el("div", "border-top:1px solid var(--line,#2b2b58);padding-top:10px;margin-top:10px");
        w.appendChild(el("div", "font-size:12.5px;opacity:.75;margin-bottom:6px", it.where));
        var two = el("div", "", null, "bd-two");
        var l = el("div"); l.appendChild(el("div", "font-size:12px;opacity:.7", "Teks asli (ditandai UT)")); l.appendChild(el("p", "margin:4px 0")).appendChild(el("span", "", it.orig, "bd-ut"));
        var r = el("div"); r.appendChild(el("div", "font-size:12px;opacity:.7", "Hasil parafrase" + (it.where ? " · " + it.where : "")));
        if (it.cand) r.appendChild(el("p", "margin:4px 0")).appendChild(el("span", "", it.cand, "bd-sent " + STX[it.status][1])); else r.appendChild(el("p", "margin:4px 0")).appendChild(el("span", "", "Padanan tidak ditemukan", "bd-sent bd-none"));
        two.appendChild(l); two.appendChild(r); w.appendChild(two);
        var n = el("div", "font-size:13.5px;line-height:1.55"); n.appendChild(el("span", "", STX[it.status][0], "bd-st " + STX[it.status][1])); n.appendChild(document.createTextNode(" " + (it.reasons || []).join(" "))); w.appendChild(n);
        (it.tags || []).forEach(function (g) {
          var t = el("div", "margin-top:6px;font-size:13px;line-height:1.55"); t.appendChild(el("b", "", g.label + ". ")); t.appendChild(el("span", "", "Perbaiki: " + g.fix + " "));
          t.appendChild(el("span", "color:#ff8aa5", "Jangan: " + g.jangan)); w.appendChild(t);
        });
        c.appendChild(w);
      });
      box.appendChild(c);
    });
    box.appendChild(el("div", "font-size:12.5px;opacity:.8;border:1px dashed currentColor;border-radius:10px;padding:8px 10px", "Pembanding menilai pola kalimat memakai pedoman Bedah. Ini bukan skor Drillbit UT dan bukan jaminan lolos. Penilaian akhir tetap dari laporan UT yang baru."));
  }

  /* ---------- hasil lengkap (sesudah bayar) ---------- */
  var tk = (location.search.match(/[?&]t=([0-9a-f]{20,})/) || [])[1];
  if (tk) {
    $("s1").classList.add("hidden"); $("s3").classList.remove("hidden");
    fetch("/ms/bedah/report/" + tk, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
      $("pload").classList.add("hidden");
      if (!x.ok) { $("pbody").appendChild(el("div", "color:#ff8aa5", x.j.error || "Hasil tidak bisa dibuka.")); return; }
      var j = x.j; $("pt").textContent = j.title || "Hasil lengkap"; $("pmeta").textContent = rp(j.words) + " kata isi · " + j.total + " kalimat ditandai UT · file dihapus otomatis pada " + new Date(j.deleteAt).toLocaleString("id-ID");
      $("dl").href = "/ms/bedah/download/" + tk; setupBand(tk);
      var b = $("pbody"); b.innerHTML = "";
      var rg = el("div", "display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px"); renderRings({ ut: j.ut && { pct: j.ut.pct, matchedWords: j.ut.matchedWords, totalWords: j.ut.totalWords, blocks: j.ut.blocks || [] }, sim: j.sim }, rg); b.appendChild(rg);
      var pk = el("div", "margin:10px 0"); protokolBox(j.protokol, pk); b.appendChild(pk);
      var bl = el("div"); blockList(j.blocks, bl); b.appendChild(bl);
      b.appendChild(el("h3", "margin:14px 0 6px", "Semua kalimat yang ditandai UT (" + j.total + ")"));
      j.findings.forEach(function (f) { b.appendChild(findingNode(f, false)); });
      if (j.sim) { var sb = el("div", "margin-top:14px"); sb.appendChild(el("h3", "margin:0 0 6px", "Laporan Similarity")); var sx = el("div"); simBody(j.sim, sx); sb.appendChild(sx); b.appendChild(sb); }
    }).catch(function () { $("pload").textContent = "Koneksi terputus. Muat ulang halaman."; });
  };
})();
