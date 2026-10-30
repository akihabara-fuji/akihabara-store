/* Halaman Tutorial Online: tab Testimoni & Alur / Harga. Harga dan status tutup diambil dari /ms/layanan/config (satu sumber dengan form pesanan). */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); }, cfg = {};
  var rp = function (n) { return "Rp" + Number(n).toLocaleString("id-ID"); };
  var SV = [
    ["diskusi", "Diskusi", ["diskusi"], ["Jawaban siap tempel", "Poin utama dan referensi bisa dicek", "Revisi gratis untuk hasil buatan kami"]],
    ["tugas", "Tugas", ["tugas"], ["Dikerjakan sesuai soal dan ketentuan format", "Kamu periksa hasilnya sebelum dikirim ke tutor", "Revisi gratis untuk hasil buatan kami"]],
    ["makalah", "Makalah", ["makalah"], ["Dikerjakan sesuai topik dan ketentuan dosen", "Kamu periksa hasilnya sebelum dikirim", "Revisi gratis untuk hasil buatan kami"]],
    ["jurnal", "Jurnal", ["jurnal"], ["Dikerjakan sesuai arahan tutor", "Referensi bisa diverifikasi", "Revisi gratis untuk hasil buatan kami"]],
    ["metopen", "Metodologi Penelitian", ["metopen1", "metopen2", "metopen3", "metopen_paket"], null]
  ];
  var q = new URLSearchParams(location.search), cur = SV.some(function (x) { return x[0] === q.get("s"); }) ? q.get("s") : "diskusi";
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function setTab(t, push) {
    ["alur", "harga"].forEach(function (k) { $("#tx-" + k).hidden = k !== t; });
    document.querySelectorAll(".tx-seg button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"); });
    if (push !== false) { var u = new URL(location.href); u.searchParams.set("tab", t); if (t === "harga") u.searchParams.set("s", cur); else u.searchParams.delete("s"); history.replaceState(null, "", u); }
    reveal();
  }
  function plan(key, name, feats, opt) {
    var s = cfg[key]; if (!s) return null;
    var p = el("div", "tx-plan tx-rv" + (opt && opt.hot ? " hot" : ""));
    if (opt && opt.hot) p.appendChild(el("span", "tx-tag", "Paling hemat"));
    p.appendChild(el("h3", "", name));
    if (opt && opt.was) p.appendChild(el("div", "tx-was", rp(opt.was)));
    p.appendChild(el("div", "tx-p", s.closed ? "Ditutup sementara" : rp(s.price)));
    if (opt && opt.save > 0) p.appendChild(el("span", "tx-save", "Hemat " + rp(opt.save)));
    var ul = el("ul"); feats.forEach(function (f) { ul.appendChild(el("li", "", f)); }); p.appendChild(ul);
    var a = el("a", "btn " + (opt && opt.hot ? "btn-pri" : "btn-ghost"), s.closed ? "Tanya admin" : "Pesan " + name.toLowerCase());
    if (s.closed) { a.href = "#"; a.setAttribute("data-chat", ""); } else a.href = "/ruangakademikut/layanan?s=" + encodeURIComponent(key);
    p.appendChild(a); return p;
  }
  function paint() {
    var pick = $("#txPick"); pick.innerHTML = "";
    SV.forEach(function (x) { var b = el("button", "", x[1]); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", x[0] === cur ? "true" : "false");
      b.onclick = function () { cur = x[0]; var u = new URL(location.href); u.searchParams.set("s", cur); u.searchParams.set("tab", "harga"); history.replaceState(null, "", u); paint(); }; pick.appendChild(b); });
    var box = $("#txPlans"); box.innerHTML = ""; var list = [], def = SV.filter(function (x) { return x[0] === cur; })[0];
    if (cur === "metopen") {
      var sum = 0, n = 0;
      ["metopen1", "metopen2", "metopen3"].forEach(function (k) { if (cfg[k]) { var pl = plan(k, cfg[k].label, ["Satu tahap", "Revisi gratis untuk hasil buatan kami"]); if (pl) { list.push(pl); if (!cfg[k].closed) { sum += cfg[k].price; n++; } } } });
      if (cfg.metopen_paket) { var save = n === 3 ? sum - cfg.metopen_paket.price : 0, pk = plan("metopen_paket", cfg.metopen_paket.label, ["Tugas 1, 2, dan 3", "Satu pendamping sampai selesai", "Revisi gratis untuk hasil buatan kami"], { hot: true, was: save > 0 ? sum : 0, save: save }); if (pk) list.push(pk); }
    } else { var one = plan(cur, def[1], def[3]); if (one) list.push(one); }
    box.style.gridTemplateColumns = "repeat(" + Math.max(1, Math.min(list.length, 4)) + ",minmax(0,1fr))"; box.style.maxWidth = list.length < 2 ? "420px" : "none"; box.style.margin = "0 auto";
    list.forEach(function (p) { box.appendChild(p); });
    var tb = $("#txTbl"); tb.innerHTML = "";
    var rows = [["Diskusi", "diskusi"], ["Tugas", "tugas"], ["Makalah", "makalah"], ["Jurnal", "jurnal"], ["Metopen per tahap", null], ["Paket Komplit Metopen", "metopen_paket"]];
    rows.forEach(function (r) { var tr = el("tr"), v;
      if (r[1]) { if (!cfg[r[1]]) return; v = cfg[r[1]].closed ? "Ditutup sementara" : rp(cfg[r[1]].price); }
      else { var ps = ["metopen1", "metopen2", "metopen3"].filter(function (k) { return cfg[k] && !cfg[k].closed; }).map(function (k) { return cfg[k].price; }); if (!ps.length) return; v = rp(Math.min.apply(null, ps)) + " sampai " + rp(Math.max.apply(null, ps)); }
      tr.appendChild(el("td", "", r[0])); tr.appendChild(el("td", "", v)); tb.appendChild(tr); });
    var rv = cfg.revisi_tugas ? "Revisi gratis untuk hasil buatan kami. Revisi untuk file dari luar mulai " + rp(cfg.revisi_tugas.price) + "." : "";
    $("#txRev").textContent = rv; reveal();
  }
  function reveal() {
    var els = document.querySelectorAll(".tx-rv:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .1 });
    els.forEach(function (e) { io.observe(e); });
  }
  function ulasan() {
    var sec = $("#ulasan"), box = $("#ulList"); if (!sec || !box) return;
    fetch("/ms/ulasan").then(function (r) { return r.json(); }).then(function (j) {
      var a = (j.items || []).slice(0, 6); if (!a.length) return; box.innerHTML = "";
      a.forEach(function (x) { var c = el("div", "tx-rc tx-rv"), qq = el("q", "", x.teks), w = el("div", "who", x.nama); c.appendChild(qq);
        if (x.ket) w.appendChild(el("small", "", x.ket)); c.appendChild(w);
        if (x.img) { var im = el("img"); im.loading = "lazy"; im.alt = "Tangkapan layar chat dari " + x.nama; im.src = x.img; c.appendChild(im); }
        box.appendChild(c); });
      sec.hidden = false; reveal();
    }).catch(function () {});
  }
  document.addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) { e.preventDefault(); setTab(b.dataset.tab); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  fetch("/ms/layanan/config").then(function (r) { return r.json(); }).then(function (j) { cfg = j || {}; paint(); }).catch(function () { $("#txPlans").textContent = "Harga belum bisa dimuat. Muat ulang halaman atau chat admin."; });
  setTab(q.get("tab") === "harga" || q.get("s") ? "harga" : "alur", false); ulasan(); reveal();
})();
