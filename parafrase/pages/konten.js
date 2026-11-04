/* Klien Kelas Tuton, Komunitas, Kegiatan (dashboard dana), Portofolio. Tanpa library; hormati prefers-reduced-motion. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rp = function (n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); };

  /* YouTube dimuat saat diklik (tidak ada permintaan ke YouTube sebelum itu) */
  function loadYt(el, id) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    var f = document.createElement("iframe");
    f.className = "yt"; f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
    f.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"; f.allowFullscreen = true; f.title = "Video"; f.referrerPolicy = "strict-origin-when-cross-origin";
    if (el.classList.contains("yt-mini")) { var p = el.parentNode.closest(".kt-panel,.kt-sec"); var big = p && $("button.yt, iframe.yt", p); if (big) { big.replaceWith(f); f.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); return; } }
    el.replaceWith(f);
  }
  document.addEventListener("click", function (e) {
    var y = e.target.closest("button.yt,button.yt-mini"); if (y) { loadYt(y, y.getAttribute("data-id")); return; }
    var c = e.target.closest("[data-copy]");
    if (c) { var pre = $("pre", document.getElementById(c.getAttribute("data-copy"))); if (!pre) return; var t = pre.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand("copy"); } catch (x) {} }).then(function () { var o = c.getAttribute("data-lb") || c.textContent; c.setAttribute("data-lb", o); c.textContent = "Tersalin!"; c.classList.add("ok"); window.caTrack("salin_prompt"); setTimeout(function () { c.textContent = o; c.classList.remove("ok"); }, 1800); });
      return; }
    var pb = e.target.closest("[data-prompt]");
    if (pb) { var b = document.getElementById("pr-" + pb.getAttribute("data-prompt")); var open = b.hidden; b.hidden = !open; pb.setAttribute("aria-expanded", open); }
  });

  /* ---------- Kelas Tuton ---------- */
  var tabs = $$(".kt-tabs[role=tablist] button");
  if (tabs.length) {
    var cur = "diskusi", mat = [], tahap = "", q = "", pg = 1, PER = 10, panels = $$(".kt-panel");
    try { mat = JSON.parse($("#ktData").textContent); } catch (e) {}
    var jn = {}; try { JSON.parse($("#ktJ").textContent).forEach(function (j) { jn[j.id] = j.label; }); } catch (e) {}
    var setJ = function (j, push) {
      cur = j; tabs.forEach(function (b) { var on = b.getAttribute("data-j") === j; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
      panels.forEach(function (p) { p.classList.toggle("on", p.getAttribute("data-j") === j); });
      if (push !== false) { var u = new URL(location.href); u.searchParams.set("j", j); history.replaceState(null, "", u); }
      pg = 1; drawMat();
    };
    var qj = new URL(location.href).searchParams.get("j");
    tabs.forEach(function (b) { b.addEventListener("click", function () { setJ(b.getAttribute("data-j")); }); });
    var li = function (m) { return '<a class="kt-row" href="/ruangakademikut/tutorial-online/materi/' + m.id + '"><span class="kt-th">' + (m.v ? "▶ video" : "teks") + '</span><span><b></b><small></small></span><em>Buka →</em></a>'; };
    var row = function (m) { var d = document.createElement("div"); d.innerHTML = li(m); var a = d.firstChild; $("b", a).textContent = m.ju; $("small", a).textContent = (m.t || "") + (m.mk ? " · " + m.mk : "") + " · Diperbarui " + new Date(m.at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); return a; };
    var drawMat = function () {
      var list = $("#ktList"), rows = mat.filter(function (m) { return m.j === cur && (!tahap || m.t === tahap) && (!q || (m.ju + " " + m.mk).toLowerCase().indexOf(q) >= 0); });
      list.textContent = "";
      var pages = Math.max(1, Math.ceil(rows.length / PER)); if (pg > pages) pg = pages;
      if (!rows.length) { var e = document.createElement("div"); e.className = "kt-empty"; e.textContent = mat.some(function (m) { return m.j === cur; }) ? "Belum ada materi yang cocok. Coba kata kunci lain." : "Materi " + (jn[cur] || "") + " sedang disiapkan. Sementara itu, ikuti lima langkah di atas."; list.appendChild(e); }
      rows.slice((pg - 1) * PER, pg * PER).forEach(function (m) { list.appendChild(row(m)); });
      $("#ktCount").textContent = rows.length ? "Menampilkan " + rows.length + " materi (" + PER + " per halaman)" : "";
      var P = $("#ktPg"); P.textContent = ""; if (pages > 1) for (var i = 1; i <= pages; i++) (function (i) { var b = document.createElement("button"); b.type = "button"; b.textContent = i; if (i === pg) b.className = "on"; b.onclick = function () { pg = i; drawMat(); }; P.appendChild(b); })(i);
      var side = function (id, arr) { var u = $(id); u.textContent = ""; if (!arr.length) { var l = document.createElement("li"); l.className = "muted"; l.textContent = "Belum ada."; u.appendChild(l); return; } arr.slice(0, 3).forEach(function (m) { var l = document.createElement("li"), a = document.createElement("a"); a.href = "/ruangakademikut/tutorial-online/materi/" + m.id; var s = document.createElement("span"); s.textContent = m.ju; a.appendChild(s); l.appendChild(a); u.appendChild(l); }); };
      var of = mat.filter(function (m) { return m.j === cur; });
      side("#ktNew", of.slice().sort(function (a, b) { return b.at - a.at; })); side("#ktPop", of.filter(function (m) { return m.hit > 0; }).sort(function (a, b) { return b.hit - a.hit; }));
    };
    $("#ktQ").addEventListener("input", function (e) { q = e.target.value.trim().toLowerCase(); pg = 1; drawMat(); });
    $$("#ktChips button").forEach(function (b) { b.addEventListener("click", function () { tahap = b.getAttribute("data-t"); $$("#ktChips button").forEach(function (x) { x.classList.toggle("on", x === b); }); pg = 1; drawMat(); }); });
    $$("[data-materi]").forEach(function (a) { a.addEventListener("click", function (e) { if (a.getAttribute("href") === "#materi") { e.preventDefault(); $("#materi").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); } }); });
    setJ(["diskusi", "tugas", "makalah", "jurnal", "metopen"].indexOf(qj) >= 0 ? qj : "diskusi", false);
  }

  /* ---------- Komunitas: saring kategori ---------- */
  var kt = $("#kmTabs");
  if (kt) kt.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("#kmTabs button").forEach(function (x) { x.classList.toggle("on", x === b); }); var k = b.getAttribute("data-k"); $$("#kmGrid .km-card").forEach(function (c) { c.hidden = !!k && c.getAttribute("data-k") !== k; }); });

  /* ---------- Dashboard dana (dihitung dari tabel transaksi di server) ---------- */
  var dj = $("#kdData");
  if (dj) {
    var D = {}; try { D = JSON.parse(dj.textContent); } catch (e) {}
    var COLORS = ["#4a2fd6", "#0f9d8a", "#d97706", "#c2410c", "#7c5cff", "#16a34a"], NS = "http://www.w3.org/2000/svg";
    var mk = function (n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; };
    var animate = function () {
      var pct = D.masuk > 0 ? Math.min(100, D.keluar / D.masuk * 100) : 0, R = 62, C = 2 * Math.PI * R;
      var ring = $("#kdRing"), s = mk("svg", { width: 170, height: 170, viewBox: "0 0 170 170", role: "img", "aria-label": "Dana terpakai " + Math.round(pct) + " persen" });
      s.appendChild(mk("circle", { cx: 85, cy: 85, r: R, fill: "none", stroke: "rgba(127,127,127,.2)", "stroke-width": 16 }));
      var pr = mk("circle", { class: "pr", cx: 85, cy: 85, r: R, fill: "none", stroke: "#4a2fd6", "stroke-width": 16, "stroke-linecap": "round", transform: "rotate(-90 85 85)", "stroke-dasharray": "0 " + C }); s.appendChild(pr);
      var tx = mk("text", { x: 85, y: 92, "text-anchor": "middle", "font-size": 28, "font-weight": 800, fill: "currentColor" }); tx.textContent = "0%"; s.appendChild(tx); ring.appendChild(s);
      var per = D.per || {}, keys = Object.keys(per), tot = keys.reduce(function (n, k) { return n + per[k]; }, 0), r2 = 52, C2 = 2 * Math.PI * r2;
      var dn = $("#kdDon"), s2 = mk("svg", { width: 150, height: 150, viewBox: "0 0 150 150", role: "img", "aria-label": "Rincian pengeluaran per kategori" });
      s2.appendChild(mk("circle", { cx: 75, cy: 75, r: r2, fill: "none", stroke: "rgba(127,127,127,.2)", "stroke-width": 24 }));
      var off = 0, segs = []; keys.forEach(function (k, i) { var len = tot ? per[k] / tot * C2 : 0; var c = mk("circle", { class: "sg", cx: 75, cy: 75, r: r2, fill: "none", stroke: COLORS[i % COLORS.length], "stroke-width": 24, transform: "rotate(-90 75 75)", "stroke-dasharray": "0 " + C2, "stroke-dashoffset": -off }); s2.appendChild(c); segs.push([c, len]); off += len;
        var li = document.createElement("li"), sw = document.createElement("i"), nm = document.createElement("span"), v = document.createElement("b"); sw.style.background = COLORS[i % COLORS.length]; nm.textContent = k; v.textContent = rp(per[k]); li.appendChild(sw); li.appendChild(nm); li.appendChild(v); $("#kdLeg").appendChild(li); });
      dn.appendChild(s2);
      var bars = $("#kdBars"), wk = D.wk || [], mx = Math.max.apply(null, wk.concat([1])); var lab = [];
      wk.forEach(function (v, i) { var c = document.createElement("div"), em = document.createElement("em"), b = document.createElement("i"), l = document.createElement("span"); em.textContent = v >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " jt" : rp(v); b.title = "Minggu " + (i + 1) + ": " + rp(v); l.textContent = "Mgg " + (i + 1); c.appendChild(em); c.appendChild(b); c.appendChild(l); bars.appendChild(c); lab.push([b, v / mx * 100]); });
      bars.setAttribute("aria-label", "Dana masuk per minggu: " + wk.map(function (v, i) { return "minggu " + (i + 1) + " " + rp(v); }).join(", "));
      var run = function (t) { pr.setAttribute("stroke-dasharray", (C * pct / 100 * t) + " " + C); tx.textContent = Math.round(pct * t) + "%"; segs.forEach(function (g) { g[0].setAttribute("stroke-dasharray", (g[1] * t) + " " + C2); }); lab.forEach(function (x) { x[0].style.height = (x[1] * t) + "%"; }); };
      if (reduce) { run(1); return; }
      var t0 = performance.now(); (function f(now) { var p = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - p, 3); run(e); if (p < 1) requestAnimationFrame(f); })(t0);
    };
    if ("IntersectionObserver" in window && !reduce) { var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); animate(); } }, { threshold: .2 }); io.observe($(".kd-wrap")); } else animate();
  }

  /* ---------- Portofolio ---------- */
  $$(".rv").forEach(function (e) { if (!("IntersectionObserver" in window) || reduce) e.classList.add("in"); });
  if ("IntersectionObserver" in window && !reduce) { var io2 = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io2.unobserve(x.target); var n = $$("[data-n]", x.target); n.forEach(count); } }); }, { threshold: .15 }); $$(".rv").forEach(function (e) { io2.observe(e); }); }
  function count(el) { var to = +el.getAttribute("data-n"), t0 = performance.now(); (function f(now) { var p = Math.min(1, (now - t0) / 1600); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); }
  $$(".pf-flip button").forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); }); });
  var pdf = $("#pfPdf"); if (pdf) { if (!pdf.textContent) pdf.hidden = true; else pdf.addEventListener("click", function () { $$(".rv").forEach(function (e) { e.classList.add("in"); }); window.print(); }); }
  /* Pelacakan klik tiruan: hanya mencatat nama tombol di memori halaman, tidak mengirim apa pun dan tidak pernah mencatat teks. */
  window.caTrack = window.caTrack || function (n) { try { (window.__caEv = window.__caEv || []).push({ n: String(n).slice(0, 40), t: Date.now() }); } catch (e) {} };
  var pc = $("#ppChips"); if (pc) pc.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("#ppChips button").forEach(function (x) { x.classList.toggle("on", x === b); }); var j = b.getAttribute("data-j"); $$("#ppGrid .pp-card").forEach(function (c) { c.hidden = !!j && c.getAttribute("data-j") !== j; }); window.caTrack("filter_prompt"); });
})();
