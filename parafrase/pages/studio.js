(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var id = (location.search.match(/[?&]id=([A-Za-z0-9-]{3,20})(?:&|$)/) || [])[1];
  var D = null, edits = {}, orig = {}, timer = null, dirty = false;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function toast(m) { var t = el("div", "toast", m); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  function showErr(m, link) { var e = $("err"); e.classList.remove("hidden"); e.textContent = m; if (link) { e.appendChild(document.createTextNode(" ")); var a = el("a", "", link[0]); a.href = link[1]; e.appendChild(a); } }
  function api(path, opt) {
    opt = opt || {}; opt.headers = opt.headers || {};
    if (opt.json) { opt.method = opt.method || "POST"; opt.headers["content-type"] = "application/json"; opt.body = JSON.stringify(opt.json); }
    return fetch(path, opt).then(function (r) {
      if (r.status === 401) { showErr("Sesi admin habis.", ["Masuk lewat halaman admin", "/admin/"]); throw new Error("401"); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || "Gagal (" + r.status + ")"); e.data = j; throw e; } return j; });
    });
  }
  if (!id) { showErr("Alamat tidak lengkap. Buka Studio dari antrean Cek & Parafrase di halaman admin."); return; }
  $("dlw").href = "/ms/admin/studio/" + id + "/word";

  var POLA = { definisi: "Ungu", sintesis: "Oranye", proposisi: "Biru muda", umum: "Kuning", blok: "Abu" };
  function chip(cls, txt) { return el("span", "cp c-" + cls, txt); }
  function words(t) { t = t.trim(); return t ? t.split(/\s+/).length : 0; }
  function measure(n, text) {
    var w = words(text), k = (text.match(/,/g) || []).length, long = w > D.longMax;
    var box = $("ms" + n); box.textContent = "";
    var chg = text.trim() !== orig[n].trim();
    box.appendChild(document.createTextNode((chg ? "Sudah diubah · " : "Belum diubah · ") + w + " kata · " + k + " koma · "));
    box.appendChild(chip(long ? "merah" : "hijau", long ? "Terlalu panjang (batas " + D.longMax + ")" : "Panjang aman"));
  }
  function progress() { var d = 0, tot = D.items.length; D.items.forEach(function (it) { if ((edits[it.n] || "").trim() && edits[it.n].trim() !== orig[it.n].trim()) d++; }); $("pg").textContent = d + " dari " + tot; $("fin").disabled = d === 0; }
  function setEdit(n, text) { if (text.trim() === orig[n].trim()) delete edits[n]; else edits[n] = text; dirty = true; progress(); $("sv").textContent = "Belum disimpan"; clearTimeout(timer); timer = setTimeout(save, 2000); }
  function save() {
    clearTimeout(timer);
    return api("/ms/admin/studio/" + id + "/draft", { method: "PUT", json: { edits: edits } }).then(function (j) { dirty = false; $("sv").textContent = "Draf tersimpan (" + j.done + " kalimat)"; }).catch(function (e) { $("sv").textContent = "Draf gagal disimpan: " + e.message; });
  }

  function recCard(it) {
    var c = el("div", "rc");
    var h = el("div"); h.appendChild(document.createTextNode("Blok UT " + it.block + " · " + it.where + " "));
    it.tags.forEach(function (g) { h.appendChild(chip(g.id, (POLA[g.id] || "") + ": " + g.label)); }); c.appendChild(h);
    it.tags.forEach(function (g) {
      var d = el("div"); d.appendChild(el("b", "", "Perbaiki: ")); d.appendChild(document.createTextNode(g.fix + " "));
      var j = el("span", "no"); j.appendChild(el("b", "", "Jangan: ")); j.appendChild(document.createTextNode(g.jangan)); d.appendChild(j);
      if (g.bukti) d.appendChild(el("div", "mu", "Bukti: " + g.bukti)); c.appendChild(d);
    });
    var ci = el("div"); it.ciri.forEach(function (x) { ci.appendChild(chip(x.level, x.text)); }); c.appendChild(ci);
    return c;
  }

  function build() {
    var A = $("mA"), B = $("mB"); A.textContent = ""; B.textContent = "";
    var firstOf = {}, partOf = {};     // sentence key -> items that start there / items that contain it
    D.items.forEach(function (it) { orig[it.n] = it.text; var k = it.parts[0][0] + ":" + it.parts[0][1]; (firstOf[k] = firstOf[k] || []).push(it); it.parts.forEach(function (p) { partOf[p[0] + ":" + p[1]] = true; }); });
    var byPara = {}; D.items.forEach(function (it) { (byPara[it.para_idx] = byPara[it.para_idx] || []).push(it); });
    D.paras.forEach(function (p) {
      var pa = el("p"), pb = el("p");
      p.s.forEach(function (s, i) {
        var k = p.p + ":" + i, last = i === p.s.length - 1;
        var sa = el("span", partOf[k] ? "ut" : "", s.t); pa.appendChild(sa); pa.appendChild(document.createTextNode(" "));
        if (firstOf[k]) firstOf[k].forEach(function (it) {
          var sp = el("span", "ed"); sp.contentEditable = "true"; sp.dataset.n = it.n; sp.textContent = edits[it.n] != null ? edits[it.n] : it.text;
          sp.addEventListener("input", function () { var t = sp.textContent; sp.classList.toggle("chg", t.trim() !== orig[it.n].trim()); measure(it.n, t); setEdit(it.n, t); });
          sp.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
          sp.addEventListener("paste", function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " "); document.execCommand("insertText", false, t); });
          pb.appendChild(sp); pb.appendChild(document.createTextNode(" "));
        });
        else if (partOf[k]) { /* lanjutan kalimat biru di atas: ikut kotak biru sebelumnya */ }
        else { pb.appendChild(el("span", "lock", s.t)); pb.appendChild(document.createTextNode(" ")); }
      });
      A.appendChild(pa); B.appendChild(pb);
      var its = byPara[p.p] || [];
      its.forEach(function (it) { A.appendChild(recCard(it)); var m = el("div", "ms"); m.id = "ms" + it.n; B.appendChild(m); });
    });
    D.items.forEach(function (it) { if ($("ms" + it.n)) { var t = edits[it.n] != null ? edits[it.n] : it.text; var sp = B.querySelector('[data-n="' + it.n + '"]'); if (sp && t.trim() !== orig[it.n].trim()) sp.classList.add("chg"); measure(it.n, t); } });
    progress();
    /* Sinkron per paragraf, bukan per persen: A memuat kartu rekomendasi sehingga lebih tinggi dari B.
       Paragraf yang sama di A dan B selalu sejajar di bagian atas layar. */
    var PA = Array.prototype.slice.call(A.querySelectorAll(":scope > p")), PB = Array.prototype.slice.call(B.querySelectorAll(":scope > p")), ign = null;
    function topOf(e, box) { return e.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop; }
    function anchor(box, list) {
      var st = box.scrollTop, i = 0;
      for (var k = 0; k < list.length; k++) { if (topOf(list[k], box) <= st + 1) i = k; else break; }
      var t = topOf(list[i], box), h = Math.max(1, list[i].offsetHeight);
      return { i: i, f: Math.min(1, Math.max(0, (st - t) / h)) };
    }
    function sy(x, lx, y, ly) {
      x.addEventListener("scroll", function () {
        if (ign === x) { ign = null; return; }
        if (!lx.length || lx.length !== ly.length) return;
        var to;
        if (x.scrollTop <= 0) to = 0;
        else if (x.scrollTop + x.clientHeight >= x.scrollHeight - 2) to = y.scrollHeight - y.clientHeight;
        else { var a = anchor(x, lx); to = topOf(ly[a.i], y) + a.f * ly[a.i].offsetHeight; }
        to = Math.max(0, Math.round(to));
        if (Math.abs(y.scrollTop - to) > 1) { ign = y; y.scrollTop = to; }
      });
    }
    sy(A, PA, B, PB); sy(B, PB, A, PA);
  }

  api("/ms/admin/studio/" + id).then(function (j) {
    D = j; edits = j.draft || {};
    $("ttl").textContent = "Pesanan " + j.order.id + " · " + (j.order.title || "dokumen");
    $("meta").textContent = j.items.length + " kalimat biru dari UT · " + Number(j.order.words || 0).toLocaleString("id-ID") + " kata · status " + j.order.status + (j.ut && j.ut.pct != null ? " · AI UT " + String(j.ut.pct).replace(".", ",") + "%" : "") + (j.sim && j.sim.pct != null ? " · Similarity UT " + String(j.sim.pct).replace(".", ",") + "%" : "");
    build();
  }).catch(function (e) { if (e.message !== "401") showErr(e.message); });

  $("save").onclick = function () { save().then(function () { toast("Draf tersimpan."); }); };
  $("upw").onclick = function () { $("fw").click(); };
  $("fw").onchange = function () {
    var f = this.files[0]; this.value = ""; if (!f) return;
    var fd = new FormData(); fd.append("file", f);
    api("/ms/admin/studio/" + id + "/import", { method: "POST", body: fd }).then(function (j) {
      var n = 0; Object.keys(j.suggest || {}).forEach(function (k) { var sp = $("mB").querySelector('[data-n="' + k + '"]'); if (!sp) return; sp.textContent = j.suggest[k]; sp.classList.add("chg"); measure(k, j.suggest[k]); setEdit(k, j.suggest[k]); n++; });
      toast(n + " dari " + j.total + " kalimat biru terbaca dari Word. Periksa dulu sebelum dikirim.");
    }).catch(function (e) { toast(e.message); });
  };
  function finish(force) {
    $("fin").disabled = true;
    return api("/ms/admin/studio/" + id + "/finish", { json: { edits: edits, force: !!force } }).then(function (j) { toast("Terkirim ke mahasiswa (" + j.applied + " kalimat diganti)."); $("sv").textContent = "Sudah dikirim"; })
      .catch(function (e) {
        if (e.data && e.data.skipped && e.data.skipped.length && confirm(e.message + "\n\nKirim tetap dengan kalimat yang bisa diganti saja?")) return finish(true);
        toast(e.message);
      }).then(function () { progress(); });
  }
  $("fin").onclick = function () { if (!confirm("Kirim hasil .docx ke mahasiswa sekarang?")) return; save().then(function () { return finish(false); }); };
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
