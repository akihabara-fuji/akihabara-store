(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var SEV = { kritis: ["Kritis", "#ff8aa5"], peringatan: ["Peringatan", "#f3ff4d"], info: ["Info", "#8ec5ff"] };
  var token = (location.pathname.match(/\/hasil\/([a-f0-9]{48})/) || [])[1];
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  function fail(m) { $("rmeta").textContent = ""; $("err").textContent = m; $("err").classList.remove("hidden"); }
  if ($("print")) $("print").onclick = function () { window.print(); };
  if (!token) return fail("Tautan hasil tidak valid.");
  fetch("/ms/audit/report/" + token, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
    if (!x.ok) return fail(x.j.error || "Hasil tidak bisa dibuka.");
    var d = x.j; $("rmeta").textContent = d.title + " · " + rp(d.words) + " kata";
    window.auditScoreCard(d.score, $("score"), d.findings);
    var tOpts = { here: "hasil" };
    window.renderTriage($("triage"), d.triage, tOpts);
    ["kritis", "peringatan", "info"].forEach(function (k) {
      var b = el("div", "min-width:130px;padding:14px 18px;border-radius:16px;border:1px solid #2b2b58");
      b.appendChild(el("b", "display:block;font-size:30px;color:" + SEV[k][1], d.counts[k])); b.appendChild(el("span", "font-size:13.5px", SEV[k][0])); $("counts").appendChild(b);
    });
    var r = d.refs; $("refs").textContent = r.total ? r.total + " pustaka terbaca · " + r.doiOk + " DOI terverifikasi" + (r.doiNotFound ? " · " + r.doiNotFound + " DOI tidak ditemukan" : "") + (r.doiUnverified ? " · " + r.doiUnverified + " belum bisa dicek" : "") : "Daftar pustaka tidak terbaca.";
    if (!d.findings.length) $("list").appendChild(el("p", "text-align:center", "Tidak ada temuan dari aturan yang kami periksa."));
    window.renderFindings($("list"), d.findings, { sev: SEV, visible: 8, full: true });
    if (d.findings.length) window.foldList($("list"), "Lihat semua temuan (" + d.findings.length + ")");
    window.auditOkList(d.score, $("list"));
    if (d.deleteAt) $("del").textContent = "File dihapus otomatis pada " + new Date(d.deleteAt).toLocaleString("id-ID") + ". Simpan hasil ini sebelum itu.";
  }).catch(function () { fail("Koneksi terputus. Muat ulang halaman."); });
})();
