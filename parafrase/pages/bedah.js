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
    var m = { "data-bg": c.bedah_gratis_temuan, "data-bh": c.bedah_harga_per_blok, "data-bk": c.bedah_blok_kata };
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
  $("fOrig").onchange = function () { showErr(""); chosen.orig = this.files[0] || null; if (!ok(chosen.orig, false)) { chosen.orig = null; this.value = ""; } $("go").disabled = !chosen.orig; };
  $("go").onclick = function () {
    showErr("");
    var o = $("fOrig").files[0], a = $("fAi").files[0], s = $("fSim").files[0];
    if (!o) { showErr("Pilih file aslimu dulu."); return; }
    if (!ok(o, false) || !ok(a, true) || !ok(s, true)) return;
    window.pfScan.start($("busy"), ["Mengunggah file…", "Membaca laporan Drillbit…", "Memetakan blok UT ke dokumenmu…", "Menjalankan aturan modul…", "Menyusun hasil…"]);
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
    var p = j.problem, g = gradeOf(p.pct);
    box.appendChild(ringBox("1 · Masalah modul", "PASTI · bisa dicek satu per satu", "#7ee0a5", ring(g[2], f1(p.pct) + "%", "Grade " + g[0], p.pct), [
      "Grade Catatan Akademik " + g[0] + " · " + g[1] + " (skala kita sendiri, bukan grade Drillbit).",
      "Dari mana: aturan modul Metopen dan aturan sitasi umum. Rumus: (kalimat bermasalah + pustaka bermasalah) ÷ (semua kalimat isi + semua entri pustaka) = " + p.num + " ÷ " + p.den + "."]));
    if (j.ut) box.appendChild(ringBox("2 · AI Drillbit", "DARI LAPORAN UT YANG KAMU UNGGAH", "#c9d3ff", ring("#26c6da", f1(j.ut.pct) + "%", "dari UT", j.ut.pct), [
      j.ut.matchedWords + " dari " + j.ut.totalWords + " kata ditandai, " + (j.ut.blocks.length) + " blok. Dibaca dari file kamu, belum diverifikasi UT, bukan hitungan kami."]));
    else box.appendChild(ringBox("2 · AI Drillbit", "BELUM DIISI · opsional", "#c9d3ff", ring("#8d97c9", "-", "belum diisi", 0, true), ["Unggah laporan AI Drillbit untuk melihat blok yang ditandai UT. Hasil lain tetap lengkap tanpa ini."]));
    if (j.sim) box.appendChild(ringBox("3 · Similarity Drillbit", "DARI LAPORAN UT YANG KAMU UNGGAH", "#c9d3ff", ring(simGrade(j.sim.grade), f1(j.sim.pct) + "%", "Grade " + j.sim.grade + " (UT)", j.sim.pct), [
      j.sim.matchedSources + " sumber cocok. Dibaca dari file kamu, belum diverifikasi UT. Similarity tidak kami hitung ulang."]));
    else box.appendChild(ringBox("3 · Similarity Drillbit", "BELUM DIISI · opsional", "#c9d3ff", ring("#8d97c9", "-", "belum diisi", 0, true), ["Unggah laporan Similarity untuk menampilkannya di sini. Hasil lain tetap lengkap tanpa ini."]));
  }

  function findingNode(f, locked) {
    var d = el("div", "", null, "bd-f2" + (locked ? " bd-lock" : ""));
    var head = el("div", "display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px");
    head.appendChild(el("span", "", (f.n ? f.n + ". " : "") + f.code + " · " + f.color, "bd-chip s-" + f.code));
    head.appendChild(el("span", "font-size:12.5px;opacity:.8", f.where));
    if (f.ut) head.appendChild(el("span", "font-size:11px;font-weight:800;color:#26c6da;border:2px dashed #26c6da;border-radius:99px;padding:1px 8px", "Blok UT " + f.ut));
    d.appendChild(head);
    if (locked) { d.appendChild(el("div", "", "Kalimat dan contoh perbaikan terbuka setelah paket lengkap dibeli.")); return d; }
    var sent = el("div", "line-height:1.8", null); var sp = el("span", "", f.text, "seg s-" + f.code); if (f.ut) sp.classList.add("bd-ut"); sent.appendChild(sp); d.appendChild(sent);
    d.appendChild(el("div", "margin-top:6px;font-size:13.5px", "Alasan: " + f.reason));
    if (f.example) { var ex = el("div", "margin-top:6px;font-size:13.5px"); ex.appendChild(el("b", "", "Contoh perbaikan: ")); ex.appendChild(el("span", "", f.example, "seg s-H")); d.appendChild(ex); }
    if (f.helper) d.appendChild(el("div", "margin-top:6px;font-size:13.5px", "Cara memperbaiki: " + f.helper));
    if (f.utRec) d.appendChild(el("div", "margin-top:6px;font-size:13.5px;padding:8px 10px;border-radius:10px;border:1px dashed #26c6da", "Rekomendasi untuk blok UT: " + f.utRec));
    else d.appendChild(el("div", "margin-top:6px;font-size:13.5px", f.target));
    return d;
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
    noteBox.textContent = "Blok adalah rentetan kalimat yang disorot biru oleh Drillbit. Kalimat bergaris putus-putus hijau kebiruan di temuan di bawah berada di dalam blok UT. " + ut.mappedSentences + " kalimat (" + ut.mappedWords + " kata) berhasil dipetakan ke dokumenmu" + (ut.confidence === "tinggi" ? "." : " (keyakinan pembacaan: " + ut.confidence + ").");
    guideBox.innerHTML = ""; guideBox.appendChild(el("b", "", "Panduan memperbaiki blok (saran umum, belum terbukti menurunkan skor Drillbit)"));
    var ul = el("ul", "margin:6px 0 0;padding-left:18px;line-height:1.7"); guide.forEach(function (g) { ul.appendChild(el("li", "", g)); }); guideBox.appendChild(ul);
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
    $("rmeta").textContent = j.file.name + " · " + rp(j.words) + " kata isi (tanpa sampul, daftar isi, dan pustaka) · " + j.totalFindings + " temuan";
    renderRings(j, $("rings"));
    var w = $("warn"); w.innerHTML = ""; (j.warn || []).forEach(function (m) { w.appendChild(el("div", "color:#ffb347;font-size:13.5px", m)); });
    var uc = $("utCard"); uc.style.display = j.ut ? "" : "none"; if (j.ut) utTable(j.ut, $("utTable"), $("utNote"), $("utGuide"), j.guide || []);
    var sc = $("simCard"); sc.style.display = j.sim ? "" : "none"; if (j.sim) simBody(j.sim, $("simBody"));
    $("fTitle").textContent = j.open.length + " temuan terberat, lengkap (gratis)";
    var lg = $("legend"); lg.textContent = "Label sama dengan Cek & Parafrase: " + Object.keys(j.labels).map(function (k) { return k + " " + j.labels[k]; }).join(" · ");
    var fl = $("flist"); fl.innerHTML = ""; j.open.forEach(function (f) { fl.appendChild(findingNode(f, false)); });
    var lk = $("locked"); lk.innerHTML = "";
    if (j.locked.length) {
      lk.appendChild(el("div", "font-weight:800;margin:10px 0 4px", j.locked.length + " temuan lagi terkunci"));
      j.locked.slice(0, 6).forEach(function (f) { lk.appendChild(findingNode(f, true)); });
      if (j.locked.length > 6) lk.appendChild(el("div", "margin:6px 0 8px", "… dan " + (j.locked.length - 6) + " temuan lain."));
      var go = el("a", "", "Buka semua temuan dan unduh file Word berwarna", "btn"); go.href = "#cta"; lk.appendChild(go);
    }
    var q = j.quote; $("pWords").textContent = rp(j.words); $("pFree").textContent = q.free + " temuan"; $("pAll").textContent = j.totalFindings + " temuan";
    $("pTier").textContent = q.blocks + " × " + rp(q.blockWords) + " kata (sampai " + rp(q.limit) + " kata)"; $("total").textContent = "Rp " + rp(q.total); $("buyAmt").textContent = " · Rp " + rp(q.total);
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

  /* ---------- hasil lengkap (sesudah bayar) ---------- */
  var tk = (location.search.match(/[?&]t=([0-9a-f]{20,})/) || [])[1];
  if (tk) {
    $("s1").classList.add("hidden"); $("s3").classList.remove("hidden");
    fetch("/ms/bedah/report/" + tk, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
      $("pload").classList.add("hidden");
      if (!x.ok) { $("pbody").appendChild(el("div", "color:#ff8aa5", x.j.error || "Hasil tidak bisa dibuka.")); return; }
      var j = x.j; $("pt").textContent = j.title || "Hasil lengkap"; $("pmeta").textContent = rp(j.words) + " kata isi · " + j.total + " temuan · file dihapus otomatis pada " + new Date(j.deleteAt).toLocaleString("id-ID");
      $("dl").href = "/ms/bedah/download/" + tk;
      var b = $("pbody"); b.innerHTML = "";
      var rg = el("div", "display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px"); renderRings({ problem: j.problem, ut: j.ut && { pct: j.ut.pct, matchedWords: j.ut.matchedWords, totalWords: j.ut.totalWords, blocks: j.ut.blocks || [] }, sim: j.sim }, rg); b.appendChild(rg);
      if (j.ut && j.ut.sentences && j.ut.sentences.length) {
        b.appendChild(el("h3", "margin:14px 0 6px", "Kalimat yang ditandai UT (" + j.ut.sentences.length + ")"));
        j.ut.sentences.forEach(function (s) { var d = el("div", "margin:6px 0"); d.appendChild(el("span", "font-size:11px;font-weight:800;color:#26c6da;margin-right:8px", "Blok UT " + s.block + " · " + s.where)); d.appendChild(el("span", "", s.text, "bd-ut")); b.appendChild(d); });
        var gl = el("div", "margin-top:10px"); gl.appendChild(el("b", "", "Panduan memperbaiki blok (saran umum, belum terbukti menurunkan skor Drillbit)")); var ul = el("ul", "padding-left:18px;line-height:1.7"); (j.guide || []).forEach(function (g) { ul.appendChild(el("li", "", g)); }); gl.appendChild(ul); b.appendChild(gl);
      }
      if (j.sim) { var sb = el("div", "margin-top:14px"); sb.appendChild(el("h3", "margin:0 0 6px", "Laporan Similarity")); var sx = el("div"); simBody(j.sim, sx); sb.appendChild(sx); b.appendChild(sb); }
      b.appendChild(el("h3", "margin:14px 0 6px", "Semua temuan (" + j.total + ")"));
      j.findings.forEach(function (f) { b.appendChild(findingNode(f, false)); });
    }).catch(function () { $("pload").textContent = "Koneksi terputus. Muat ulang halaman."; });
  };
})();
