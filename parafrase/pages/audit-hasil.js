(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var SEV = { kritis: ["Kritis", "#ff8aa5"], peringatan: ["Peringatan", "#f3ff4d"], info: ["Info", "#8ec5ff"] };
  var token = (location.pathname.match(/\/hasil\/([a-f0-9]{48})/) || [])[1];
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  function fail(m) { $("rmeta").textContent = ""; $("err").textContent = m; $("err").classList.remove("hidden"); }
  if (!token) return fail("Tautan hasil tidak valid.");
  fetch("/ms/audit/report/" + token, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
    if (!x.ok) return fail(x.j.error || "Hasil tidak bisa dibuka.");
    var d = x.j; $("rmeta").textContent = d.title + " · " + rp(d.words) + " kata";
    window.auditScoreCard(d.score, $("score"));
    ["kritis", "peringatan", "info"].forEach(function (k) {
      var b = el("div", "min-width:130px;padding:14px 18px;border-radius:16px;border:1px solid #2b2b58");
      b.appendChild(el("b", "display:block;font-size:30px;color:" + SEV[k][1], d.counts[k])); b.appendChild(el("span", "font-size:13.5px", SEV[k][0])); $("counts").appendChild(b);
    });
    var r = d.refs; $("refs").textContent = r.total ? r.total + " pustaka terbaca · " + r.doiOk + " DOI terverifikasi" + (r.doiNotFound ? " · " + r.doiNotFound + " DOI tidak ditemukan" : "") + (r.doiUnverified ? " · " + r.doiUnverified + " belum bisa dicek" : "") : "Daftar pustaka tidak terbaca.";
    if (!d.findings.length) $("list").appendChild(el("p", "text-align:center", "Tidak ada temuan dari aturan yang kami periksa."));
    d.findings.forEach(function (f) {
      var row = el("div", "padding:14px 16px;margin-bottom:10px;border-radius:14px;border:1px solid #2b2b58");
      var top = el("div", "display:flex;gap:10px;align-items:center;margin-bottom:6px");
      top.appendChild(el("span", "flex:none;font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid " + SEV[f.sev][1] + ";color:" + SEV[f.sev][1], SEV[f.sev][0]));
      top.appendChild(el("b", "flex:1", f.cat)); top.appendChild(el("span", "flex:none;font-size:13px;opacity:.75", f.where)); row.appendChild(top);
      row.appendChild(el("div", "font-size:14.5px;opacity:.9", f.detail)); $("list").appendChild(row);
    });
    if (d.deleteAt) $("del").textContent = "File dihapus otomatis pada " + new Date(d.deleteAt).toLocaleString("id-ID") + ". Simpan hasil ini sebelum itu.";
  }).catch(function () { fail("Koneksi terputus. Muat ulang halaman."); });
})();
