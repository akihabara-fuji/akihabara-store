/* Halaman Generator Sitasi APA 7. Semua di browser; aturan ada di sitasi-apa.js. Daftar saya disimpan di localStorage (opsional, gagal diam-diam). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "ca-sitasi-v1", S = window.SitasiAPA, list = [];
  var BULAN = { id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
  function fillMonths() { var sel = $("mo"), cur = sel.value, b = $("id").checked ? BULAN.id : BULAN.en; sel.innerHTML = '<option value="">-</option>'; b.forEach(function (m, i) { var o = document.createElement("option"); o.value = i + 1; o.textContent = m; sel.appendChild(o); }); sel.value = cur; }
  function opt() { return { id: $("id").checked }; }
  function read() {
    var t = $("tp").value;
    return { type: t, authors: S.parseAuthors($("au").value), year: $("yr").value, title: $("ti").value, journal: $("jn").value, volume: $("vo").value, issue: $("is").value, pages: $("pg").value,
      doi: t === "buku" ? $("bu").value : $("do").value, edition: $("ed").value, publisher: $("pb").value, site: $("st").value, month: $("mo").value, day: $("dy").value, url: t === "web" ? $("ur").value : (t === "skripsi" ? $("su").value : ""),
      thesis: $("th").value, university: $("un").value, published: $("pu").checked, repo: $("rp2").value, cite_page: $("cp").value };
  }
  function show() {
    var t = $("tp").value; ["jurnal", "buku", "web", "skripsi"].forEach(function (k) { $("f-" + k).hidden = k !== t; });
    var f = read(), r = S.reference(f, opt()), c = S.inText(f, opt()), w = S.checks(f, opt());
    $("ref").innerHTML = r.html; $("cit").textContent = c.paren + "   atau   " + c.narrative;
    $("wr").hidden = !w.length; $("wr").textContent = ""; w.forEach(function (x) { var d = document.createElement("div"); d.textContent = "• " + x; $("wr").appendChild(d); });
  }
  function say(m) { $("msg").textContent = m; setTimeout(function () { if ($("msg").textContent === m) $("msg").textContent = ""; }, 3500); }
  function copy(html, text) {
    var done = function () { say("Tersalin."); };
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]).then(done).catch(function () { plain(); });
    } else plain();
    function plain() { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(done).catch(function () { var a = document.createElement("textarea"); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch (e) { say("Salin manual: blok teksnya lalu Ctrl+C."); } a.remove(); }); }
  }
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(j)) list = j.slice(0, 200); } catch (e) { list = []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
  function paintList() {
    var ol = $("lst"); ol.textContent = ""; var items = S.sortList(list.map(function (x) { return x.f; }));
    var idOf = function (f) { for (var i = 0; i < list.length; i++) if (list[i].f === f) return i; return -1; };
    items.forEach(function (f) {
      var o = list[idOf(f)].o, li = document.createElement("li"), sp = document.createElement("span"); sp.innerHTML = S.reference(f, o).html; li.appendChild(sp);
      var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost sm"; b.style.cssText = "margin-left:10px;text-indent:0"; b.textContent = "Hapus";
      b.onclick = function () { list.splice(idOf(f), 1); save(); paintList(); }; li.appendChild(b); ol.appendChild(li);
    });
    $("emp").hidden = !!list.length; $("cpa").disabled = $("clr").disabled = !list.length;
  }
  function allRefs() { var items = S.sortList(list.map(function (x) { return x.f; })), h = "", t = ""; items.forEach(function (f) { var o = list[list.map(function (x) { return x.f; }).indexOf(f)].o, r = S.reference(f, o); h += '<p style="padding-left:2em;text-indent:-2em">' + r.html + "</p>"; t += r.text + "\n\n"; }); return { html: h, text: t.trim() }; }

  ["tp", "yr", "id", "au", "ti", "jn", "vo", "is", "pg", "do", "ed", "pb", "bu", "st", "mo", "dy", "ur", "th", "un", "pu", "rp2", "su", "cp"].forEach(function (id) { $(id).addEventListener("input", show); $(id).addEventListener("change", show); });
  $("id").addEventListener("change", fillMonths);
  $("cpy").onclick = function () { var r = S.reference(read(), opt()); copy('<p style="padding-left:2em;text-indent:-2em">' + r.html + "</p>", r.text); };
  $("add").onclick = function () { var f = read(); if (!f.title.trim()) { say("Isi judul dulu."); return; } list.push({ f: f, o: opt() }); save(); paintList(); say("Ditambahkan ke daftar."); };
  $("cpa").onclick = function () { var a = allRefs(); copy(a.html, a.text); };
  $("clr").onclick = function () { if (list.length && confirm("Kosongkan seluruh daftar pustaka di browser ini?")) { list = []; save(); paintList(); } };
  fillMonths(); load(); paintList(); show();
})();
