/* Tracker kelulusan dan IPK: catat mata kuliah, SKS, dan nilai; hitung SKS lulus, sisa SKS, IPK, estimasi semester,
   dan rata-rata mutu yang dibutuhkan untuk mencapai target IPK. Diproses di browser, disimpan di perangkat ini saja.
   Skala nilai memakai NilaiUT (nilai-ut.js). Angka SKS program berbeda tiap prodi: pengguna mengisi sendiri. */
(function () {
  "use strict";
  var KEY = "ca-tracker-v1", N = window.NilaiUT;
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var HURUF = N.TABEL.map(function (t) { return t.h; }); // A, A-, B+, ...
  var LULUS = {}; N.TABEL.forEach(function (t) { LULUS[t.h] = t.ok; });
  function f2(n) { return (Math.round(n * 100) / 100).toFixed(2).replace(".", ","); }
  function floor2(n) { return Math.floor(n * 100 + 1e-9) / 100; }

  var DEF = { total: "144", target: "3.00", perSem: "18", rows: [{ n: "", s: "", h: "" }, { n: "", s: "", h: "" }, { n: "", s: "", h: "" }] };
  var S = load();
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && Array.isArray(j.rows)) return Object.assign({}, DEF, j); } catch (e) { /* abaikan */ } return JSON.parse(JSON.stringify(DEF)); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }

  function calc() {
    var total = Math.max(0, Math.round(Number(S.total) || 0)), target = Number(String(S.target).replace(",", ".")), per = Math.max(1, Math.round(Number(S.perSem) || 0) || 1);
    var sksLulus = 0, sksTempuh = 0, bobot = 0, bobotLulus = 0, belum = 0;
    S.rows.forEach(function (r) {
      var s = Number(r.s);
      if (!(s > 0 && s <= 12)) return;
      if (!r.h) { belum += s; return; }
      var m = N.mutu(r.h); if (m === null) return;
      sksTempuh += s; bobot += s * m;
      if (LULUS[r.h]) { sksLulus += s; bobotLulus += s * m; }
    });
    var ipk = sksTempuh ? floor2(bobot / sksTempuh) : null;
    var sisa = Math.max(0, total - sksLulus);
    var out = { total: total, sksLulus: sksLulus, sksTempuh: sksTempuh, belum: belum, ipk: ipk, sisa: sisa, sem: sisa ? Math.ceil(sisa / per) : 0, target: target, per: per };
    if (isFinite(target) && target > 0 && target <= 4 && sisa > 0 && total > 0) {
      var need = (target * total - bobotLulus) / sisa; /* IPK akhir dihitung dari mata kuliah yang lulus; yang D/E dianggap diulang */
      out.need = need; out.needOk = need <= 4 + 1e-9; out.needSafe = need <= 0;
      var best = null; N.TABEL.slice().reverse().forEach(function (t) { if (best === null && t.m >= need - 1e-9) best = t.h; }); out.needHuruf = best;
    }
    return out;
  }

  var st = document.createElement("style");
  st.textContent = ".tr-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 18px}.tr-k{border:1px solid var(--border);border-radius:14px;padding:14px;background:var(--surface)}.tr-k small{display:block;color:var(--muted);font-size:12.5px;margin:0 0 4px}.tr-k b{font-size:26px;line-height:1.1}.tr-bar{height:12px;border-radius:99px;background:var(--border);overflow:hidden;margin:6px 0 4px}.tr-bar i{display:block;height:100%;background:#22c55e;width:0;transition:width .3s}.tr-set{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:0 0 14px}.tr-set label>span{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:var(--muted)}.tr-set input,.tr-t input,.tr-t select,.tr-paste{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:10px;border:1px solid var(--dash);background:transparent;color:var(--text);font:inherit;font-size:14px}.tr-t{width:100%;border-collapse:collapse}.tr-t td{padding:5px 4px;border:0}.tr-t th{text-align:left;font-size:12.5px;color:var(--muted);padding:4px}.tr-t .x{background:none;border:0;color:#ef4444;cursor:pointer;font-size:18px;padding:4px 8px}.tr-box{border:1px solid var(--border);border-radius:14px;padding:14px;background:var(--surface);margin:0 0 14px}.tr-res{font-size:15px;line-height:1.55}.tr-paste{min-height:90px;font-size:13px}@media print{body>*:not(main){display:none!important}.tool>*:not(.tr-print){display:none!important}.tr-print .no-print{display:none!important}.tool{padding:0!important;max-width:none!important}html,html[data-theme]{background:#fff!important;color-scheme:light!important}.tr-print,.tr-print *{color:#000!important;background:#fff!important}.tr-print input,.tr-print select{border:0!important;appearance:none;padding:0!important}}";
  document.head.appendChild(st);

  function renderRows() {
    $("#trRows").innerHTML = S.rows.map(function (r, i) {
      return '<tr><td><input type="text" data-i="' + i + '" data-k="n" value="' + esc(r.n) + '" placeholder="Nama mata kuliah" aria-label="Mata kuliah ' + (i + 1) + '"></td>' +
        '<td style="width:78px"><input type="number" min="1" max="12" data-i="' + i + '" data-k="s" value="' + esc(r.s) + '" placeholder="SKS" aria-label="SKS ' + (i + 1) + '"></td>' +
        '<td style="width:110px"><select data-i="' + i + '" data-k="h" aria-label="Nilai ' + (i + 1) + '"><option value="">Belum ada</option>' + HURUF.map(function (h) { return "<option" + (r.h === h ? " selected" : "") + ">" + h + "</option>"; }).join("") + "</select></td>" +
        '<td style="width:44px" class="no-print"><button type="button" class="x" data-del="' + i + '" aria-label="Hapus baris ' + (i + 1) + '">×</button></td></tr>';
    }).join("");
  }
  function renderSum() {
    var c = calc(), pct = c.total ? Math.min(100, Math.round(c.sksLulus / c.total * 100)) : 0;
    $("#trSum").innerHTML =
      '<div class="tr-k"><small>SKS lulus</small><b>' + c.sksLulus + "</b> <span class=\"note\">dari " + (c.total || "?") + '</span><div class="tr-bar"><i style="width:' + pct + '%"></i></div><small>' + pct + "% selesai</small></div>" +
      '<div class="tr-k"><small>Sisa SKS</small><b>' + c.sisa + "</b></div>" +
      '<div class="tr-k"><small>IPK saat ini</small><b>' + (c.ipk === null ? "–" : f2(c.ipk)) + '</b><small>dari ' + c.sksTempuh + " SKS bernilai</small></div>" +
      '<div class="tr-k"><small>Estimasi sisa semester</small><b>' + (c.total ? c.sem : "–") + '</b><small>pada ' + c.per + " SKS per semester</small></div>";
    var m = "";
    if (c.need !== undefined) {
      if (c.needSafe) m = "Target IPK " + f2(c.target) + " sudah <b>aman</b>: bahkan dengan nilai terendah yang lulus pada sisa SKS, targetmu tetap tercapai.";
      else if (!c.needOk) m = "Target IPK " + f2(c.target) + " <b>tidak mungkin tercapai</b> dengan sisa " + c.sisa + " SKS, karena perlu rata-rata mutu " + f2(c.need) + " (maksimum 4,00). Coba turunkan target.";
      else m = "Untuk mencapai IPK " + f2(c.target) + " di akhir (" + c.total + " SKS), sisa " + c.sisa + " SKS perlu rata-rata mutu <b>" + f2(Math.ceil(c.need * 100 - 1e-9) / 100) + "</b>, kira-kira nilai <b>" + (c.needHuruf || "A") + "</b> atau lebih.";
    } else m = "Isi total SKS, target IPK, dan nilai mata kuliah untuk melihat hitungan target.";
    if (c.belum) m += ' <span class="note">(' + c.belum + " SKS belum bernilai tidak dihitung ke IPK.)</span>";
    $("#trRes").innerHTML = m;
    $("#trSet-total").value = S.total; // sinkron bila diubah lewat impor
  }
  function draw() { renderSum(); save(); }

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.set) { S[t.dataset.set] = t.value; return draw(); }
    if (t.dataset && t.dataset.i !== undefined && t.dataset.k) { S.rows[+t.dataset.i][t.dataset.k] = t.value; draw(); }
  });
  document.addEventListener("change", function (e) { var t = e.target; if (t.dataset && t.dataset.i !== undefined && t.dataset.k === "h") { S.rows[+t.dataset.i].h = t.value; draw(); } });
  function toast(t) { var n = $("#trToast"); n.textContent = t; setTimeout(function () { n.textContent = ""; }, 3500); }
  function parsePaste(txt) {
    var out = [], bad = 0;
    String(txt || "").split(/\r?\n/).forEach(function (ln) {
      ln = ln.trim(); if (!ln) return;
      var p = ln.split(/\t|;|\s{2,}|,(?=\s*\d)/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (p.length < 2) { bad++; return; }
      var h = p[p.length - 1].toUpperCase().replace("−", "-").replace("–", "-"), s = p[p.length - 2];
      if (HURUF.indexOf(h) < 0) { h = ""; s = p[p.length - 1]; }
      if (!(Number(s) > 0 && Number(s) <= 12)) { bad++; return; }
      out.push({ n: p.slice(0, p.length - (h ? 2 : 1)).join(" "), s: String(Number(s)), h: h });
    });
    return { rows: out, bad: bad };
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-del],#trAdd,#trAdd5,#trCsv,#trPrint,#trReset,#trImport"); if (!b) return;
    if (b.dataset.del !== undefined) { S.rows.splice(+b.dataset.del, 1); if (!S.rows.length) S.rows.push({ n: "", s: "", h: "" }); renderRows(); draw(); }
    else if (b.id === "trAdd") { S.rows.push({ n: "", s: "", h: "" }); renderRows(); draw(); }
    else if (b.id === "trAdd5") { for (var i = 0; i < 5; i++) S.rows.push({ n: "", s: "", h: "" }); renderRows(); draw(); }
    else if (b.id === "trImport") {
      var r = parsePaste($("#trPaste").value); if (!r.rows.length) return toast("Tidak ada baris yang terbaca. Format: Nama MK [tab] SKS [tab] Nilai.");
      S.rows = S.rows.filter(function (x) { return x.n || x.s || x.h; }).concat(r.rows); renderRows(); draw(); $("#trPaste").value = ""; toast(r.rows.length + " baris ditambahkan" + (r.bad ? ", " + r.bad + " baris dilewati." : "."));
    }
    else if (b.id === "trCsv") {
      var lines = ["Mata kuliah;SKS;Nilai"].concat(S.rows.filter(function (x) { return x.n || x.s; }).map(function (x) { return [x.n, x.s, x.h].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";"); }));
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = "rekap_nilai_ut.csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
    else if (b.id === "trPrint") window.print();
    else if (b.id === "trReset") { if (confirm("Hapus semua data tracker di perangkat ini?")) { try { localStorage.removeItem(KEY); } catch (x) { /* abaikan */ } S = JSON.parse(JSON.stringify(DEF)); $("#trSet-total").value = S.total; $("#trSet-target").value = S.target; $("#trSet-per").value = S.perSem; renderRows(); draw(); } }
  });

  $("#trSet-total").value = S.total; $("#trSet-target").value = S.target; $("#trSet-per").value = S.perSem;
  renderRows(); draw();
})();
