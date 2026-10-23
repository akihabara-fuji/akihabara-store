(function () {
  var N = window.NilaiUT, $ = function (i) { return document.getElementById(i); };
  var tb = $("tb");
  N.TABEL.forEach(function (r) {
    var tr = document.createElement("tr");
    [r.min.toFixed(2) + " – " + (r.max === 100 ? "100" : r.max.toFixed(2)), r.h, r.m.toFixed(1), r.k].forEach(function (t, i) { var td = document.createElement("td"); td.textContent = t; if (i === 3) td.className = r.ok ? "ok" : "bad"; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  $("n").addEventListener("input", function () {
    var o = $("out"), v = $("n").value;
    o.textContent = "";
    if (v === "") return;
    var r = N.konversi(v);
    if (!r) { o.textContent = "Nilai harus antara 0 dan 100."; return; }
    var b = document.createElement("b"); b.textContent = r.h + " (" + r.m.toFixed(1) + ")";
    var s = document.createElement("span"); s.className = r.ok ? "ok" : "bad"; s.textContent = r.k;
    o.append("Huruf mutu ", b, " · ", s);
  });
  var rows = $("rows");
  function row() {
    var d = document.createElement("div"); d.style.cssText = "display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end";
    var a = document.createElement("div"), b = document.createElement("div");
    var la = document.createElement("label"); la.textContent = "SKS";
    var ia = document.createElement("input"); ia.type = "number"; ia.min = 1; ia.max = 12; ia.value = 3; ia.inputMode = "numeric";
    var lb = document.createElement("label"); lb.textContent = "Nilai huruf";
    var sb = document.createElement("select");
    N.TABEL.forEach(function (r) { var o = document.createElement("option"); o.value = r.h; o.textContent = r.h + " (" + r.m.toFixed(1) + ")"; sb.appendChild(o); });
    var x = document.createElement("button"); x.type = "button"; x.className = "btn ghost"; x.textContent = "Hapus"; x.setAttribute("aria-label", "Hapus baris");
    x.onclick = function () { d.remove(); calc(); };
    ia.oninput = sb.onchange = calc;
    a.append(la, ia); b.append(lb, sb); d.append(a, b, x); rows.appendChild(d);
  }
  function calc() {
    var data = [].map.call(rows.children, function (d) { return { sks: d.querySelector("input").value, huruf: d.querySelector("select").value }; });
    var r = N.ipk(data), o = $("ipk"); o.textContent = "";
    if (r.ipk === null) { o.textContent = "Tambahkan mata kuliah untuk menghitung IPK."; return; }
    var b = document.createElement("b"); b.textContent = r.ipk.toFixed(2);
    o.append("IPK ", b, " dari " + r.sks + " SKS");
  }
  $("add").onclick = function () { row(); calc(); };
  row(); row(); calc();
})();
