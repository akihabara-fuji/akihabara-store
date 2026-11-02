(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var id = (location.search.match(/[?&]id=([A-Za-z0-9-]{3,20})(?:&|$)/) || [])[1];
  var D = null, rev = {}, origP = {}, initP = {}, spanOf = {}, cardOf = {}, taOf = {}, timer = null, dirty = false, sent = false;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function toast(m) { var t = el("div", "toast", m); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200); }
  function showErr(m, link) { var e = $("err"); e.classList.remove("hidden"); e.textContent = m; if (link) { e.appendChild(document.createTextNode(" ")); var a = el("a", "", link[0]); a.href = link[1]; e.appendChild(a); } }
  function api(path, opt) {
    opt = opt || {}; opt.headers = opt.headers || {};
    if (opt.json) { opt.method = opt.method || "POST"; opt.headers["content-type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    return fetch(path, opt).then(function (r) {
      if (r.status === 401) { showErr("Sesi admin habis.", ["Masuk lewat halaman admin", "/admin/"]); throw new Error("401"); }
      if (opt.blob && r.ok) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || "Gagal (" + r.status + ")"); e.data = j; throw e; } return j; });
    });
  }
  if (!id) { showErr("Alamat tidak lengkap. Buka Studio dari menu Pesanan di halaman admin."); return; }
  $("dlw").href = "/ms/admin/studio/" + id + "/word";
  var POLA = { definisi: "Ungu", sintesis: "Oranye", proposisi: "Biru muda", umum: "Kuning", blok: "Abu" };
  function chip(cls, txt) { return el("span", "cp c-" + cls, txt); }
  function words(t) { t = (t || "").trim(); return t ? t.split(/\s+/).length : 0; }
  var norm = function (s) { return String(s || "").replace(/\s+/g, " ").trim(); };
  function paraText(p) { return norm(p.textContent); }
  function key(it) { return it.parts[0][0] + ":" + it.parts[0][1]; }

  function measure(it) {
    var m = cardOf[it.n].querySelector(".mz"), t = taOf[it.n].value, w = words(t), k = (t.match(/,/g) || []).length;
    m.textContent = ""; m.appendChild(document.createTextNode(w + " kata · " + k + " koma · ")); m.appendChild(chip(w > D.longMax ? "merah" : "hijau", w > D.longMax ? "Terlalu panjang (batas " + D.longMax + ")" : "Panjang aman"));
  }
  function progress() {
    var d = 0; D.items.forEach(function (it) { var sp = spanOf[key(it)], c = cardOf[it.n]; var ok = sp && norm(sp.textContent) !== norm(it.text); if (ok) d++; sp && sp.classList.toggle("chg", !!ok); c.classList.toggle("done", !!ok); });
    $("cnt").textContent = "· " + d + " dari " + D.items.length + " sudah diganti di dokumen";
    var ch = changed(); $("fin").disabled = !D.hasOrder || (!ch && !sent) || false; if (!D.hasOrder) $("fin").title = "Mahasiswa belum membuat pesanan, jadi belum ada tujuan kirim.";
  }
  function paraEdits() { var o = {}; var ps = $("mA").querySelectorAll("p"); for (var i = 0; i < ps.length; i++) { var t = paraText(ps[i]), k = ps[i].dataset.p; if (t !== initP[k]) o[k] = t; } return o; }
  /* Teks tiap kalimat per paragraf, hanya bila susunan kalimat di kiri masih utuh; dipakai memulihkan sorotan biru saat dibuka lagi. */
  function spanSnap() { var o = {}, ps = $("mA").querySelectorAll("p"); for (var i = 0; i < ps.length; i++) { var k = ps[i].dataset.p; if (paraText(ps[i]) === initP[k]) continue; var ss = ps[i].querySelectorAll("span[data-k]"); if (ss.length === ps[i].childElementCount && ss.length === (D.sCount[k] || -1)) o[k] = Array.prototype.map.call(ss, function (x) { return x.textContent; }); } return o; }
  function changed() { return Object.keys(paraEdits()).length > 0; }
  function mark() { dirty = true; $("sv").textContent = "Belum disimpan"; progress(); clearTimeout(timer); timer = setTimeout(save, 2500); }
  function save() {
    clearTimeout(timer);
    var r = {}; D.items.forEach(function (it) { var v = taOf[it.n].value; if (v.trim()) r[it.n] = v; });
    return api("/ms/admin/studio/" + id + "/draft", { method: "PUT", json: { edits: r, paras: paraEdits(), spans: spanSnap() } }).then(function (j) { dirty = false; $("sv").textContent = "Draf tersimpan"; }).catch(function (e) { $("sv").textContent = "Draf gagal disimpan: " + e.message; });
  }
  function pasteText(e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " "); document.execCommand("insertText", false, t); }
  function focusItem(it, fromLeft) {
    D.items.forEach(function (x) { cardOf[x.n].classList.remove("on"); var s = spanOf[key(x)]; if (s) s.classList.remove("on"); });
    cardOf[it.n].classList.add("on"); var s = spanOf[key(it)]; if (s) s.classList.add("on");
    if (fromLeft) cardOf[it.n].scrollIntoView({ block: "nearest", behavior: "smooth" }); else if (s) s.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function useIt(it) {
    var t = norm(taOf[it.n].value); if (!t) { toast("Kotak revisi masih kosong."); return; }
    var sp = spanOf[key(it)]; if (!sp) { toast("Kalimat ini tidak ditemukan di dokumen kiri."); return; }
    sp.textContent = t; for (var i = 1; i < it.parts.length; i++) { var o = spanOf[it.parts[i][0] + ":" + it.parts[i][1]]; if (o) o.textContent = ""; }
    mark();
  }
  function undoIt(it) {
    var sp = spanOf[key(it)]; if (sp) sp.textContent = it.text;
    for (var i = 1; i < it.parts.length; i++) { var o = spanOf[it.parts[i][0] + ":" + it.parts[i][1]]; if (o) o.textContent = origP["s" + it.parts[i][0] + ":" + it.parts[i][1]] || ""; }
    mark();
  }
  function genIt(it, quiet) {
    var b = cardOf[it.n].querySelector(".gen"); b.disabled = true; var old = b.textContent; b.textContent = "Menulis…";
    return api("/ms/admin/studio/" + id + "/revisi", { json: { n: it.n } }).then(function (j) {
      taOf[it.n].value = j.revisi; measure(it); mark();
      if (j.baru && j.baru.length) toast("Awas, revisi memuat angka/nama yang tidak ada di sumber: " + j.baru.join(", ") + ". Periksa dulu.");
    }).catch(function (e) { if (!quiet) toast(e.message); throw e; }).then(function (x) { b.disabled = false; b.textContent = old; return x; }, function (e) { b.disabled = false; b.textContent = old; throw e; });
  }

  function card(it) {
    var c = el("div", "rc"); cardOf[it.n] = c;
    var h = el("div"); h.appendChild(el("b", "", "Blok UT " + it.block + " · " + it.where + " ")); it.tags.forEach(function (g) { h.appendChild(chip(g.id, (POLA[g.id] || "") + ": " + g.label)); }); c.appendChild(h);
    var src = el("div", "src", it.text); src.title = "Klik untuk menandai di dokumen"; src.addEventListener("click", function () { focusItem(it, false); }); c.appendChild(src);
    var cr = el("div"); it.ciri.forEach(function (x) { cr.appendChild(chip(x.level, x.text)); }); c.appendChild(cr);
    var dt = el("details", "more"); dt.appendChild(el("summary", "", "Cara memperbaiki"));
    it.tags.forEach(function (g) { var d = el("div"); d.appendChild(el("b", "", "Perbaiki: ")); d.appendChild(document.createTextNode(g.fix + " ")); var j = el("span", "no"); j.appendChild(el("b", "", "Jangan: ")); j.appendChild(document.createTextNode(g.jangan)); d.appendChild(j); if (g.bukti) d.appendChild(el("div", "mu", "Bukti: " + g.bukti)); dt.appendChild(d); });
    c.appendChild(dt);
    var ta = el("textarea"); ta.placeholder = "Kalimat revisi (ketik, atau klik Buat revisi)"; ta.value = rev[it.n] || ""; taOf[it.n] = ta;
    ta.addEventListener("input", function () { measure(it); mark(); }); ta.addEventListener("focus", function () { focusItem(it, false); });
    c.appendChild(ta); c.appendChild(el("div", "mz mu"));
    var r = el("div", "row"); r.style.marginTop = "6px";
    var g = el("button", "btn g s gen", "Buat revisi"); g.type = "button"; g.onclick = function () { genIt(it); };
    var u = el("button", "btn s", "Pakai di dokumen"); u.type = "button"; u.onclick = function () { useIt(it); };
    var z = el("button", "btn g s", "Kembalikan"); z.type = "button"; z.onclick = function () { undoIt(it); };
    r.appendChild(g); r.appendChild(u); r.appendChild(z); c.appendChild(r);
    return c;
  }

  function build() {
    var A = $("mA"), B = $("mB"); A.textContent = ""; B.textContent = ""; spanOf = {}; cardOf = {}; taOf = {}; initP = {}; origP = {};
    var partOf = {}; D.items.forEach(function (it) { it.parts.forEach(function (p) { partOf[p[0] + ":" + p[1]] = it; }); });
    var dp = D.draftParas || {}, ds = D.draftSpans || {}; D.sCount = {}; D.paras.forEach(function (p) { D.sCount[p.p] = p.s.length; });
    D.paras.forEach(function (p) {
      var pe = el("p"); pe.contentEditable = "true"; pe.dataset.p = p.p;
      pe.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); }); pe.addEventListener("paste", pasteText); pe.addEventListener("input", mark);
      p.s.forEach(function (s, i) {
        var k = p.p + ":" + i, sp = el("span", partOf[k] ? "ut" : "", Array.isArray(ds[p.p]) && ds[p.p].length === p.s.length ? ds[p.p][i] : s.t); sp.dataset.k = k; origP["s" + k] = s.t;
        if (partOf[k]) { var it = partOf[k]; sp.addEventListener("click", function () { focusItem(it, true); }); }
        spanOf[k] = sp; pe.appendChild(sp); pe.appendChild(document.createTextNode(" "));
      });
      var fresh = p.s.map(function (x) { return x.t; }).join(" "); initP[p.p] = norm(fresh);
      if (typeof dp[p.p] === "string" && !(Array.isArray(ds[p.p]) && ds[p.p].length === p.s.length)) { pe.textContent = dp[p.p]; p.s.forEach(function (x, i) { delete spanOf[p.p + ":" + i]; }); }
      A.appendChild(pe);
    });
    /* draf lama: bila paragraf dimuat dari draf, span per kalimat hilang; kalimat biru dicari ulang secara kasar */
    D.items.forEach(function (it) { rev[it.n] = (D.draft || {})[it.n] || ""; B.appendChild(card(it)); measure(it); });
    D.items.forEach(function (it) { if (!document.body.contains(spanOf[key(it)])) delete spanOf[key(it)]; });
    progress();
  }

  api("/ms/admin/studio/" + id).then(function (j) {
    D = j; sent = !!j.sentAt;
    $("ttl").textContent = (j.order.title || "Dokumen") + " · " + j.order.id;
    var kv = $("kv"); function add(l, v) { var s = el("span"); s.appendChild(document.createTextNode(l + " ")); s.appendChild(el("b", "", v)); kv.appendChild(s); }
    add("Status", j.order.status || "-"); if (j.ut && j.ut.pct != null) add("AI UT", String(j.ut.pct).replace(".", ",") + "%"); if (j.sim && j.sim.pct != null) add("Similarity", String(j.sim.pct).replace(".", ",") + "%");
    add("Kalimat biru", String(j.items.length)); add("Kata", Number(j.order.words || 0).toLocaleString("id-ID")); if (j.pdf) add("Sumber", "PDF (final dibuat dari teks)");
    if (j.wa) { var a = el("a", "", "Chat " + j.wa); a.href = "https://wa.me/" + String(j.wa).replace(/\D/g, ""); a.target = "_blank"; a.rel = "noopener"; var s2 = el("span"); s2.appendChild(a); kv.appendChild(s2); }
    if (j.sentAt) add("Terkirim", new Date(j.sentAt).toLocaleString("id-ID"));
    if (!j.aiReady) $("aiAll").title = "Mesin penulis belum dikonfigurasi di server; revisi diketik manual.";
    build();
  }).catch(function (e) { if (e.message !== "401") showErr(e.message); });

  $("save").onclick = function () { save().then(function () { toast("Draf tersimpan."); }); };
  $("upw").onclick = function () { $("fw").click(); };
  $("fw").onchange = function () {
    var f = this.files[0]; this.value = ""; if (!f) return;
    var fd = new FormData(); fd.append("file", f);
    api("/ms/admin/studio/" + id + "/import", { method: "POST", body: fd }).then(function (j) {
      var n = 0; D.items.forEach(function (it) { var t = (j.suggest || {})[it.n]; if (t) { taOf[it.n].value = t; measure(it); n++; } });
      mark(); toast(n + " dari " + j.total + " kalimat biru terbaca dari Word dan masuk ke kotak revisi. Periksa lalu klik Pakai di dokumen.");
    }).catch(function (e) { toast(e.message); });
  };
  $("aiAll").onclick = function () {
    if (!D.aiReady) { toast("Mesin penulis belum dikonfigurasi di server. Ketik revisi manual."); return; }
    var todo = D.items.filter(function (it) { return !taOf[it.n].value.trim(); }), i = 0, b = $("aiAll"); b.disabled = true;
    (function next() { if (i >= todo.length) { b.disabled = false; b.textContent = "Buat semua revisi"; toast("Selesai. Periksa tiap revisi sebelum dipakai."); return; } b.textContent = "Menulis " + (i + 1) + "/" + todo.length; genIt(todo[i++], true).then(next, function (e) { b.disabled = false; b.textContent = "Buat semua revisi"; toast(e.message); }); })();
  };
  $("rst").onclick = function () { if (!confirm("Kembalikan dokumen kiri ke versi asli mahasiswa? Kotak revisi di kanan tetap.")) return; D.draftParas = {}; var keep = {}; D.items.forEach(function (it) { keep[it.n] = taOf[it.n].value; }); D.draft = keep; build(); mark(); };
  $("prev").onclick = function () {
    api("/ms/admin/studio/" + id + "/final", { json: { paras: paraEdits() }, blob: true }).then(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "final-" + id + ".docx"; document.body.appendChild(a); a.click(); a.remove(); }).catch(function (e) { toast(e.message); });
  };
  $("fin").onclick = function () {
    if (!confirm("Kirim hasil final (.docx bersih) ke pelanggan sekarang?")) return;
    $("fin").disabled = true;
    save().then(function () { return api("/ms/admin/studio/" + id + "/finish", { json: { paras: paraEdits() } }); })
      .then(function (j) { sent = true; toast("Terkirim ke pelanggan (" + j.applied + " kalimat diganti)."); $("sv").textContent = "Sudah dikirim"; })
      .catch(function (e) { toast(e.message); }).then(progress);
  };
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
