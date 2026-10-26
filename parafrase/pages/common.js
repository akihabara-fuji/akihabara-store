/* Dipakai semua halaman Ruang Akademik UT: ambil pengaturan publik, isi tombol dan harga. */
(function () {
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  /* Harga layanan ditampilkan dalam koin (1 koin = Rp1.000). Angka yang bukan kelipatan Rp1.000 (mis. harga per kata) tetap rupiah. */
  window.koinFmt = function (n) { n = Number(n); return n > 0 && n % 1000 === 0 ? (n / 1000).toLocaleString("id-ID") + " koin" : "Rp" + n.toLocaleString("id-ID"); };
  window.PF = { rp: rp, cfg: null };
  function fill(c) {
    window.PF.cfg = c;
    var set = function (sel, v) { document.querySelectorAll(sel).forEach(function (e) { e.textContent = v; }); };
    set("[data-ppw]", rp(c.price_per_word)); set("[data-min]", rp(c.min_order_price)); set("[data-fast]", rp(c.fast_lane.price));
    set("[data-retention]", c.retention_hours); set("[data-fw]", rp(c.free_words || 0));
    document.querySelectorAll("[data-p]").forEach(function (e) { var v = c[e.getAttribute("data-p")]; if (v != null) e.textContent = rp(v); });
    document.querySelectorAll("[data-k]").forEach(function (e) { var v = c[e.getAttribute("data-k")]; if (v != null) e.textContent = window.koinFmt(v); });
    /* Diskon dalam persen, dihitung dari harga sekarang dan harga normal (pengaturan admin). Tidak tampil bila datanya tidak masuk akal. */
    function disc(keys) { var k = String(keys).split(","), now = Number(c[k[0]]), was = Number(c[k[1]]); return was > 0 && now > 0 && now < was ? Math.round((1 - now / was) * 100) : 0; }
    document.querySelectorAll("[data-disc]").forEach(function (e) { var d = disc(e.getAttribute("data-disc")); if (d > 0) { e.textContent = "· diskon " + d + "%"; e.hidden = false; } else e.hidden = true; });
    document.querySelectorAll("[data-disc-badge]").forEach(function (e) { var d = disc(e.getAttribute("data-disc-badge")); if (d > 0) e.textContent = "Diskon " + d + "%"; });
    document.querySelectorAll("[data-chat]").forEach(function (a) {
      if (!c.admin_wa_number) { a.classList.add("hidden"); return; }
      var m = a.getAttribute("data-msg") || "Halo admin Catatan Akademik, saya mau tanya Cek dan Parafrase Mandiri.";
      a.href = "https://wa.me/" + c.admin_wa_number + "?text=" + encodeURIComponent(m); a.target = "_blank"; a.rel = "noopener";
    });
    document.querySelectorAll("[data-group]").forEach(function (a) {
      if (!c.update_group_url) { a.classList.add("hidden"); return; }
      a.href = c.update_group_url; a.target = "_blank"; a.rel = "noopener";
    });
    document.dispatchEvent(new CustomEvent("pf-config", { detail: c }));
  }
  fetch("/ms/public-config").then(function (r) { return r.json(); }).then(fill).catch(function () {});
})();

/* Mode Gelap/Terang dan menu seluler: sama dengan nextaja.com (kunci "nx-theme"). */
(function () {
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-m]");
    if (b) { var m = b.getAttribute("data-m"); document.documentElement.dataset.theme = m; try { localStorage.setItem("nx-theme", m); } catch (x) {} return; }
    var bg = e.target.closest && e.target.closest("#burger");
    if (bg) { var l = document.getElementById("links"); var o = l.classList.toggle("open"); bg.setAttribute("aria-expanded", o ? "true" : "false"); }
  });
})();

/* Harga layanan dari pengaturan toko yang sama dengan beranda (/ms/store). Bila gagal, harga bawaan di HTML tetap tampil. */
(function () {
  var els = document.querySelectorAll("[data-pk]"), nl = document.getElementById("nugasLink");
  if (!els.length && !nl) return;
  fetch("/ms/store").then(function (r) { return r.json(); }).then(function (d) {
    var S = (d && d.settings) || {};
    els.forEach(function (e) {
      var v = S[e.dataset.pk];
      if (v && /^[A-Za-z0-9 .,\/-]{1,24}$/.test(v)) { var n = e.firstChild; if (n && n.nodeType === 3) n.nodeValue = v + " "; else e.textContent = v; }
    });
    if (nl) { if (S.nugasUrl) nl.href = S.nugasUrl; }
  }).catch(function () {});
})();

/* Kartu layanan: gambar opsional (diunggah admin; bila tidak ada, tampil gradasi + judul seperti beranda), muncul saat digulir, miring mengikuti kursor. */
(function () {
  var cards = document.querySelectorAll(".pc[data-slug]");
  if (!cards.length) return;
  cards.forEach(function (c) {
    var img = c.querySelector(".pt img");
    if (img) { img.onerror = function () { img.remove(); }; img.src = "/ruangakademikut/img/" + c.getAttribute("data-slug") + ".webp"; }
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .12 });
    cards.forEach(function (c) { io.observe(c); });
  } else cards.forEach(function (c) { c.classList.add("in"); });
  if (!window.matchMedia || !matchMedia("(hover:hover) and (pointer:fine)").matches || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  cards.forEach(function (c) {
    var pt = c.querySelector(".pt");
    c.addEventListener("mousemove", function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--ry", ((x - .5) * 6).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - y) * 6).toFixed(2) + "deg");
      if (pt) { var p = pt.getBoundingClientRect(); pt.style.setProperty("--mx", (((e.clientX - p.left) / p.width) * 100).toFixed(1) + "%"); pt.style.setProperty("--my", (((e.clientY - p.top) / p.height) * 100).toFixed(1) + "%"); }
    });
    c.addEventListener("mouseleave", function () { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
  });
})();

/* Aspek isi seluruh dokumen (persen) + indikasi gaya tulisan seragam. Dipakai Audit Dokumen DAN Cek & Parafrase, jadi angkanya sama.
   Tiap baris diberi penanda warna yang sama dengan warna di Cek & Parafrase. */
window.auditAspects = function (sc, box, opts) {
  var compact = !!(opts && opts.compact);
  if (!sc || !box || !sc.aspects || !sc.aspects.length) return;
  function el(t, css, x) { var e = document.createElement(t); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  function chips(codes) {
    var w = el("span", "display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle");
    (codes || []).forEach(function (c) { var k = el("span", "font-size:11px;font-weight:700;padding:1px 6px;border-radius:6px", c); k.className = "chip c-" + c; k.title = (window.PF_TARGET || {})[c] || ""; w.appendChild(k); });
    return w;
  }
  if (sc.aspects && sc.aspects.length) {
    var blk = el("div", "max-width:760px;margin:0 auto 14px;padding:16px 18px;border-radius:18px;border:1px solid var(--border,#2b2b58);text-align:left");
    blk.appendChild(el("b", "display:block;margin-bottom:8px", "Aspek isi seluruh dokumen"));
    function bar(label, value, rendahBagus, codes) {
      var row = el("div", "margin-bottom:8px"), top = el("div", "display:flex;justify-content:space-between;gap:10px;font-size:13.5px");
      var lb = el("span", "", label); if (codes) lb.appendChild(chips(codes)); top.appendChild(lb); top.appendChild(el("b", "flex:none", value == null ? "n/a" : String(value).replace(".", ",") + "%")); row.appendChild(top);
      var tr = el("div", "height:6px;border-radius:99px;background:rgba(128,128,160,.22);overflow:hidden;margin-top:3px");
      var w = value == null ? 0 : Math.min(100, value), bad = rendahBagus ? w : 100 - w;
      tr.appendChild(el("div", "height:100%;width:" + w + "%;background:" + (bad <= 15 ? "#5ee6a8" : bad <= 40 ? "#f3ff4d" : "#ff8aa5"))); row.appendChild(tr); return row;
    }
    var GRID = "display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 28px"; /* 2 kolom di layar lebar agar halaman tidak memanjang */
    var list = el("div", GRID); blk.appendChild(list);
    sc.aspects.forEach(function (m) {
      if (!compact) { var bad = m.value == null ? null : (m.good === "rendah" ? m.value : 100 - m.value); if (bad == null || bad <= 15) return; }   /* halaman Audit: yang sudah baik pindah ke daftar "Yang sudah benar" */
      list.appendChild(bar(m.label, m.value, m.good === "rendah", m.codes));
    });
    if (!compact && !list.firstChild) { blk.removeChild(list); blk.appendChild(el("p", "margin:0;font-size:13.5px;opacity:.8", "Tidak ada aspek isi yang bermasalah.")); }
    if (sc.ai) {
      var ai = sc.ai, AC = { tinggi: "#ff8aa5", sedang: "#f3ff4d", rendah: "#5ee6a8" }[ai.level] || "#8ec5ff";
      var hd = el("div", "display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin:14px 0 6px;padding-top:12px;border-top:1px solid var(--border,#2b2b58)");
      var tt = el("b", "", "Indikasi gaya tulisan seragam atau otomatis"); tt.appendChild(chips(ai.codes)); hd.appendChild(tt);
      hd.appendChild(el("b", "font-size:26px;line-height:1;color:" + AC, ai.value == null ? "n/a" : ai.value + "%"));
      hd.appendChild(el("span", "font-size:13px;opacity:.8", ai.label)); blk.appendChild(hd);
      if (!compact && (ai.parts || []).length) { var pl = el("div", GRID); (ai.parts || []).forEach(function (m) { if (!compact && (m.value == null || m.value <= 15)) return; pl.appendChild(bar(m.label, m.value, true)); }); if (pl.firstChild) blk.appendChild(pl); }
      blk.appendChild(el("p", "margin:8px 0 0;font-size:12.5px;opacity:.7", ai.note));
    }
    if (!compact) {   /* halaman Audit: blok panjang ini terlipat, terbuka bila judulnya ditekan */
      var dt = document.createElement("details"), sm = document.createElement("summary"), ttl = blk.firstChild, inn = document.createElement("div");
      sm.style.cssText = "cursor:pointer;font-weight:700;list-style:none"; sm.textContent = ttl.textContent + "  ▴"; blk.removeChild(ttl);
      inn.style.cssText = "margin-top:10px"; while (blk.firstChild) inn.appendChild(blk.firstChild);
      dt.open = true; dt.appendChild(sm); dt.appendChild(inn); dt.addEventListener("toggle", function () { sm.textContent = ttl.textContent + (dt.open ? "  ▴" : "  ▾"); }); blk.appendChild(dt);
    }
    box.appendChild(blk);
  }
};

/* Kartu Skor Kesiapan untuk Audit Dokumen (dipakai halaman ringkas dan hasil lengkap). */
window.auditScoreCard = function (sc, box, findings) {
  if (!sc || !box) return; box.innerHTML = "";
  var COL = { siap: "#5ee6a8", hampir: "#f3ff4d", perlu: "#ffb454", banyak: "#ff8aa5" }[sc.level] || "#8ec5ff";
  function el(t, css, x) { var e = document.createElement(t); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  var wrap = el("div", "display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:center;padding:18px;border-radius:18px;border:1px solid var(--border,#2b2b58);max-width:760px;margin:0 auto 14px;text-align:left");
  var ring = el("div", "flex:none;width:132px;height:132px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:conic-gradient(" + COL + " " + sc.value * 3.6 + "deg,rgba(128,128,160,.22) 0)");
  var inner = el("div", "width:100px;height:100px;border-radius:50%;background:var(--bg,#0a0a1c);display:flex;flex-direction:column;align-items:center;justify-content:center");
  inner.appendChild(el("b", "font-size:34px;line-height:1;color:" + COL, sc.value)); inner.appendChild(el("span", "font-size:12px;opacity:.7", "dari 100")); ring.appendChild(inner);
  var side = el("div", "flex:1;min-width:240px");
  side.appendChild(el("div", "font-size:12.5px;opacity:.7;text-transform:uppercase;letter-spacing:.06em", "Skor Kesiapan Dokumen"));
  side.appendChild(el("div", "font-size:21px;font-weight:700;margin:2px 0 10px;color:" + COL, sc.label));
  /* Tiap poin bisa ditekan: rincian (arti angka, cara membenahi, dan temuan terkait) baru muncul setelah ditekan,
     supaya halaman tidak memanjang. Memakai <details> bawaan browser (bisa dengan keyboard). */
  var MCAT = { sitasi: /^(Sitasi tidak ada di daftar pustaka|Tahun sitasi berbeda)/i, pustaka: /^Pustaka (tidak dikutip|tanpa tahun)/i, doi: /DOI/i };
  var HELP = {
    sitasi: ["Dari semua sitasi di isi, segini persen yang punya pasangan di Daftar Pustaka. Target: 100%.", "Yang kurang: tambahkan sumbernya ke Daftar Pustaka, atau betulkan nama dan tahun di isi bila salah ketik."],
    pustaka: ["Dari semua sumber di Daftar Pustaka, segini persen yang benar-benar dikutip di isi. Target: 100%.", "Yang kurang: kutip sumbernya di isi, atau hapus dari Daftar Pustaka bila memang tidak dipakai."],
    doi: ["Dari DOI yang bisa dicek, segini persen yang terdaftar di Crossref. Target: 100%.", "Yang kurang: periksa ulang penulisan DOI. Bila layanan pengecekan sedang tidak menjawab, itu belum berarti DOI-nya salah."],
    berulang: ["Persen kalimat yang muncul lebih dari sekali di dokumen. Target: 0%.", "Tulis ulang kalimat yang sama persis agar tiap bagian punya isi sendiri."]
  };
  /* Hanya poin yang SALAH yang tampil di sini, lengkap dengan persen salahnya. Poin yang sudah benar dipindah ke bawah (window.auditOkList). */
  var wrongOf = window.pfWrongPct = function (m, tol) { if (m.value == null) return null; var w = m.good === "rendah" ? m.value : 100 - m.value; return Math.round(w * 10) / 10 <= (tol == null ? 5 : tol) ? 0 : Math.round(w * 10) / 10; };
  var shown = sc.metrics.filter(function (m) { return wrongOf(m) > 0; });
  if (!shown.length) {
    var measurable = sc.metrics.some(function (m) { return m.value != null; });
    side.appendChild(el("div", "font-size:14px;opacity:.85;margin:6px 0", measurable ? "Poin utama (sitasi, pustaka, DOI, kalimat berulang) sudah sesuai target. Rinciannya ada di bagian bawah, di \"Yang sudah benar\"." : "Sitasi, daftar pustaka, dan DOI belum bisa dinilai karena daftar pustaka tidak terbaca di bagian dokumen yang diperiksa."));
  }
  shown.forEach(function (m) {
    var d = document.createElement("details"); d.style.cssText = "margin-bottom:6px;border-radius:12px";
    var sm = document.createElement("summary"); sm.style.cssText = "cursor:pointer;list-style:none;padding:4px 0";
    var row = el("div", "margin-bottom:2px"), top = el("div", "display:flex;justify-content:space-between;gap:10px;font-size:13.5px");
    var lb = el("span", "", m.label); var ar = el("span", "margin-left:6px;opacity:.55;font-size:11px", "▾ rincian"); lb.appendChild(ar);
    top.appendChild(lb);
    var wp = wrongOf(m);
    top.appendChild(el("b", "flex:none;color:" + (wp >= 40 ? "#ff8aa5" : "#f3ff4d"), String(wp).replace(".", ",") + "% bermasalah"));
    row.appendChild(top);
    var bar = el("div", "height:6px;border-radius:99px;background:rgba(128,128,160,.22);overflow:hidden;margin-top:3px");
    bar.appendChild(el("div", "height:100%;width:" + Math.min(100, wp) + "%;background:" + (wp >= 40 ? "#ff8aa5" : "#f3ff4d"))); row.appendChild(bar);
    sm.appendChild(row); d.appendChild(sm);
    var pn = el("div", "padding:8px 2px 10px;font-size:13.5px;line-height:1.6"), h = HELP[m.key] || [];
    h.forEach(function (t) { pn.appendChild(el("p", "margin:0 0 6px", t)); });
    var rel = (findings || []).filter(function (f) { return MCAT[m.key] && MCAT[m.key].test(f.cat || ""); });
    if (MCAT[m.key]) {
      if (rel.length && window.renderFindings) { var fb = el("div", "margin-top:6px"); pn.appendChild(fb); window.renderFindings(fb, rel, { sev: { kritis: ["Kritis", "#ff8aa5"], peringatan: ["Peringatan", "#f3ff4d"], info: ["Info", "#8ec5ff"] }, visible: 4, full: true }); }
      else if (m.value != null) pn.appendChild(el("p", "margin:0;opacity:.75", "Tidak ada temuan untuk poin ini."));
    }
    d.appendChild(pn);
    d.addEventListener("toggle", function () { ar.textContent = d.open ? "▴ tutup" : "▾ rincian"; });
    side.appendChild(d);
  });
  wrap.appendChild(ring); wrap.appendChild(side); box.appendChild(wrap);
  box.appendChild(el("p", "max-width:760px;margin:0 auto 10px;font-size:12.5px;opacity:.7;text-align:center", sc.note));
  window.auditAspects(sc, box);
};

/* Angka Drillbit asli: murid menempel angka dari laporan Drillbit resminya. Tidak diverifikasi dan tidak disimpan di server;
   tidak diingat di mana pun (kosong lagi setiap halaman dibuka). Batas hanyalah acuan (atur admin). */
/* ctx (opsional): { here: "audit"|"cek"|"hasil", fetch(sim, ai) -> Promise<triage>, onTriage(triage) }.
   Bila ada, angka yang ditempel dikirim ke server (tidak disimpan) dan kartu urgensi dihitung ulang dengan mesin yang sama. */
window.auditDrillbit = function (box, score, ctx) {
  if (!box) return; box.innerHTML = "";
  var cfg = (window.PF && window.PF.cfg) || {}, SIM = Number(cfg.drillbit_sim_max) || 25, AI = Number(cfg.drillbit_ai_max) || 20;
  function el(t, css, x) { var e = document.createElement(t); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  var KEY = "ca-drillbit", saved = {};
  try { localStorage.removeItem(KEY); } catch (e) {}   /* angka lama tidak lagi diingat: tiap buka halaman mulai kosong */
  var wrap = el("div", "max-width:760px;margin:0 auto 14px;padding:16px 18px;border-radius:18px;border:1px solid var(--border,#2b2b58);text-align:left");
  wrap.appendChild(el("b", "display:block", "Punya laporan Drillbit resmi dari UT?"));
  wrap.appendChild(el("div", "font-size:13.5px;opacity:.75;margin:2px 0 10px", (ctx && ctx.here === "cek" ? "Tempel dua angkanya, nanti dipakai menentukan urgensi di bawah, sama seperti di Audit Dokumen. Angka ini dari kamu dan tidak kami verifikasi." : "Tempel dua angkanya, nanti digabung dengan skor di atas. Angka ini dari kamu dan tidak kami verifikasi.")));
  var row = el("div", "display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end");
  function field(id, label) {
    var w = el("label", "display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600"); w.appendChild(el("span", "", label));
    var i = el("input", "width:130px;padding:10px 12px;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit"); i.id = id; i.type = "text"; i.inputMode = "decimal"; i.placeholder = "mis. 18,5"; i.autocomplete = "off";
    if (saved[id] != null) i.value = String(saved[id]).replace(".", ",");
    w.appendChild(i); row.appendChild(w); return i;
  }
  var iS = field("dbSim", "Similarity (%)"), iA = field("dbAi", "Tulisan AI (%)");
  var go = el("button", "", "Tampilkan"); go.type = "button"; go.className = "btn"; row.appendChild(go); wrap.appendChild(row);
  var err = el("div", "color:#ff8aa5;font-size:13px;margin-top:8px"), out = el("div", "margin-top:12px");
  wrap.appendChild(err); wrap.appendChild(out); box.appendChild(wrap);
  function num(v) { v = String(v || "").trim().replace(",", ".").replace(/%$/, ""); if (v === "") return null; if (!/^\d{1,3}(\.\d{1,2})?$/.test(v)) return NaN; var n = parseFloat(v); return n > 100 ? NaN : n; }
  function tile(label, v, max) {
    var ok = v <= max, col = ok ? "#5ee6a8" : "#ff8aa5";
    var t = el("div", "flex:1;min-width:210px;padding:12px 14px;border-radius:14px;border:1px solid " + col);
    t.appendChild(el("div", "font-size:12.5px;opacity:.75", label));
    t.appendChild(el("b", "display:block;font-size:30px;line-height:1.2;color:" + col, String(v).replace(".", ",") + "%"));
    t.appendChild(el("div", "font-size:13px", ok ? "Di bawah batas acuan (" + max + "%)." : "Di atas batas acuan (" + max + "%): perlu turun sekitar " + (Math.round((v - max) * 10) / 10).toString().replace(".", ",") + " poin."));
    return t;
  }
  function show() {
    err.textContent = ""; out.innerHTML = "";
    var s = num(iS.value), a = num(iA.value);
    if (Number.isNaN(s) || Number.isNaN(a)) { err.textContent = "Isi angka 0 sampai 100, contoh 18,5."; return; }
    if (s == null && a == null) { err.textContent = "Isi minimal satu angka dari laporan Drillbit."; return; }
    var tiles = el("div", "display:flex;flex-wrap:wrap;gap:10px");
    if (s != null) tiles.appendChild(tile("Similarity (dari laporanmu)", s, SIM));
    if (a != null) tiles.appendChild(tile("Tulisan AI (dari laporanmu)", a, AI));
    out.appendChild(tiles);
    var over = (s != null && s > SIM) || (a != null && a > AI), auditOk = !score || score.level === "siap" || score.level === "hampir";
    var msg = !over && auditOk ? "Angka Drillbit dan skor audit sama-sama aman. Tetap baca ulang sebelum dikumpulkan."
      : !over ? "Angka Drillbit aman, tapi skor audit masih menandai masalah sitasi atau pustaka. Benahi temuan di bawah dulu."
      : ctx && ctx.here === "cek" ? "Ada angka di atas batas acuan. Rombak dulu paragraf yang paling mendesak di bawah, lalu cek ulang di Drillbit resmi."
      : "Ada angka di atas batas acuan. Kurangi kemiripan atau gaya tulisan terlalu seragam lewat Cek & Parafrase Mandiri, lalu cek ulang di Drillbit resmi.";
    out.appendChild(el("p", "margin:10px 0 4px;font-weight:600", msg));
    if (over && !(ctx && ctx.here === "cek")) { var l = el("a", "", "Buka Cek & Parafrase Mandiri"); l.href = "/ruangakademikut/cek-parafrase-mandiri" + (ctx && ctx.uploadId ? "?u=" + ctx.uploadId : ""); l.style.fontSize = "14px"; out.appendChild(l); }
    if (ctx && ctx.fetch && ctx.onTriage) ctx.fetch(s, a).then(ctx.onTriage).catch(function () {});
    out.appendChild(el("p", "margin:6px 0 0;font-size:12.5px;opacity:.7", "Batas acuan diatur admin, bukan aturan resmi UT. Ikuti ketentuan prodi dan tutormu. Angka berasal dari laporan Drillbit yang kamu tempel."));
  }
  go.onclick = show;
};

/* Arahan "harusnya seperti apa" per kode warna (sama dengan TARGET di hint.js). Dipakai sebagai keterangan saat kursor di atas penanda. */
window.PF_TARGET = {
  M: "Harusnya: tiap kalimat hanya muncul sekali. Tulis ulang dengan struktur berbeda atau hapus pengulangannya.",
  O: "Harusnya: kutipan langsung memakai tanda kutip dan sitasi lengkap (penulis, tahun, halaman).",
  K: "Harusnya: setiap angka atau klaim umum punya sumber (Penulis, Tahun).",
  B: "Harusnya: sitasi lengkap (nama, tahun, halaman untuk kutipan langsung) dan ada di daftar pustaka.",
  U: "Harusnya: satu kalimat satu gagasan, di bawah batas panjang.",
  H: "Harusnya: paragraf punya gagasan utama, penjelasan, lalu contoh atau analisis.",
  P: "Harusnya: paragraf berisi analisis spesifik (data, contoh, sumber), bukan pernyataan umum.",
  A: "Harusnya: awalan dan penghubung kalimat bervariasi; frasa yang terkesan seragam diganti kata sendiri."
};

/* Kartu urgensi perbaikan: Audit Dokumen = diagnosis, Cek & Parafrase = obat. Satu renderer dan satu mesin server (triage.js),
   jadi tingkat, urutan paragraf, dan resepnya sama di kedua halaman. Semua teks dari server dimasukkan lewat textContent.
   opts: { here: "audit"|"cek"|"hasil", uploadId } */
window.renderTriage = function (box, t, opts) {
  if (!box) return; box.innerHTML = ""; if (!t) return; opts = opts || {};
  function el(tag, css, x) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  var COL = { mendesak: "#ff8aa5", perhatian: "#f3ff4d", aman: "#5ee6a8", belum: "#8ec5ff" }, LVL = { mendesak: "Mendesak", perhatian: "Perhatian", ringan: "Ringan" };
  var c = COL[t.level] || "#8ec5ff";
  var card = el("section", "max-width:760px;margin:0 auto 14px;padding:16px 18px;border-radius:18px;border:1px solid var(--border,#2b2b58);border-left:6px solid " + c + ";text-align:left");
  card.setAttribute("aria-label", "Urgensi perbaikan dokumen");
  var hd = el("div", "display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px");
  hd.appendChild(el("span", "font-size:12.5px;opacity:.7;text-transform:uppercase;letter-spacing:.06em", "Urgensi perbaikan"));
  hd.appendChild(el("b", "font-size:22px;color:" + c, t.label)); card.appendChild(hd);
  card.appendChild(el("div", "font-size:13px;opacity:.75;margin:2px 0 8px", t.headline));
  if (t.reasons && t.reasons.length) { var ul = el("ul", "margin:0 0 10px;padding-left:20px;font-size:14px;line-height:1.55"); t.reasons.forEach(function (r) { ul.appendChild(el("li", "", r)); }); card.appendChild(ul); }
  if (t.next) card.appendChild(el("div", "font-weight:700;margin:0 0 10px", t.next));

  /* urutan paragraf: yang paling mendesak dirombak lebih dulu */
  var ps = t.paragraphs || [];
  if (ps.length) {
    card.appendChild(el("div", "font-weight:700;margin:12px 0 6px", "Urutan perbaikan: paragraf yang dirombak lebih dulu"));
    var list = el("ol", "margin:0;padding:0;list-style:none;display:grid;gap:6px");
    function addP(list, p) {
      var li = el("li", "display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:9px 12px;border-radius:12px;border:1px solid var(--border,#2b2b58)");
      li.appendChild(el("b", "flex:none;min-width:84px", "Paragraf " + p.no));
      li.appendChild(el("span", "flex:none;font-size:12px;font-weight:700;padding:1px 9px;border-radius:999px;border:1px solid " + (COL[p.level] || c) + ";color:" + (COL[p.level] || c), LVL[p.level] || p.level));
      var d = el("span", "flex:1;min-width:200px;font-size:13.5px", p.reasons.join(", ")); li.appendChild(d);
      li.appendChild(el("span", "flex:none;font-size:13px;font-weight:600", "→ " + (p.fix && p.fix.action || "Perbaiki")));
      if (p.excerpt) li.appendChild(el("div", "flex-basis:100%;font-size:12.5px;opacity:.65", "“" + p.excerpt + "…”"));
      list.appendChild(li);
    }
    var TOPN = 5;
    ps.slice(0, TOPN).forEach(function (p) { addP(list, p); });
    card.appendChild(list);
    if (ps.length > TOPN) {
      var more = el("details", "margin-top:6px"), list2 = el("ol", "margin:6px 0 0;padding:0;list-style:none;display:grid;gap:6px;max-height:340px;overflow-y:auto");
      more.appendChild(el("summary", "cursor:pointer;font-weight:600;font-size:13.5px", "Lihat " + (ps.length - TOPN) + " paragraf lainnya"));
      ps.slice(TOPN).forEach(function (p) { addP(list2, p); });
      more.appendChild(list2); card.appendChild(more);
    }
    if (!opts.here || opts.here === "audit") card.appendChild(el("p", "margin:6px 0 0;font-size:12.5px;opacity:.7", "Nomor paragraf = urutan paragraf yang berisi teks di dokumenmu (paragraf kosong tidak dihitung). Isi kalimatnya dibuka di Cek & Parafrase Mandiri."));
  }

  /* resep: panduan menulis ulang manual untuk jenis masalah yang benar-benar ada */
  var rx = t.treatments || [];
  if (rx.length || t.teknik) {
    card.appendChild(el("div", "font-weight:700;margin:14px 0 6px", "Resep perbaikan"));
    function recipe(r, open) {
      var d = el("details", "margin:0 0 6px;border:1px solid var(--border,#2b2b58);border-radius:12px;padding:8px 12px"); if (open) d.open = true;
      d.appendChild(el("summary", "cursor:pointer;font-weight:600", r.title));
      if (r.why) d.appendChild(el("div", "font-size:13px;opacity:.75;margin:6px 0 4px", r.why));
      var ol = el("ol", "margin:4px 0 4px;padding-left:20px;font-size:14px;line-height:1.55"); (r.steps || []).forEach(function (s) { ol.appendChild(el("li", "", s)); }); d.appendChild(ol);
      if (r.note) d.appendChild(el("div", "font-size:13px;opacity:.8;margin:4px 0 2px", r.note));
      card.appendChild(d);
    }
    rx.forEach(function (r, i) { recipe(r, i === 0 && t.level !== "aman"); });
    if (t.teknik) recipe(t.teknik, false);
    if (t.cekResmi) card.appendChild(el("p", "margin:8px 0 0;font-size:13px;opacity:.8", t.cekResmi));
  }

  /* jembatan Audit -> Parafrase: dokumen yang sama dibawa, tanpa unggah ulang */
  if ((opts.here === "audit" || opts.here === "hasil") && t.level !== "aman" && t.level !== "belum") {
    var go = el("a", "display:inline-block;margin-top:12px;padding:11px 18px;border-radius:12px;font-weight:700;text-decoration:none;background:#ffb300;color:#0b1326", "Obati lewat Cek & Parafrase Mandiri →");
    go.href = "/ruangakademikut/cek-parafrase-mandiri" + (opts.uploadId ? "?u=" + encodeURIComponent(opts.uploadId) : "");
    card.appendChild(go);
    card.appendChild(el("div", "font-size:12.5px;opacity:.7;margin-top:4px", opts.uploadId ? "Dokumen yang sama dibawa ke sana, tidak perlu unggah ulang (tersimpan sementara 2 jam)." : "Unggah dokumenmu di sana untuk dikerjakan."));
  }
  if (opts.here === "cek") { var back = el("a", "display:inline-block;margin-top:10px;font-size:13.5px", "Lihat laporan lengkap di Audit Dokumen →"); back.href = "/ruangakademikut/audit"; card.appendChild(back); }
  card.appendChild(el("p", "margin:10px 0 0;font-size:12.5px;opacity:.7", t.note));
  box.appendChild(card);
};
/* dropdown sub-menu: tutup saat klik di luar atau tekan Esc */
(function(){document.addEventListener("click",function(e){document.querySelectorAll(".sub details[open]").forEach(function(d){if(!d.contains(e.target))d.removeAttribute("open")})});document.addEventListener("keydown",function(e){if(e.key==="Escape")document.querySelectorAll(".sub details[open]").forEach(function(d){d.removeAttribute("open")})});document.querySelectorAll(".sub details").forEach(function(d){d.addEventListener("toggle",function(){if(d.open)document.querySelectorAll(".sub details[open]").forEach(function(o){if(o!==d)o.removeAttribute("open")})})})})();

/* Unggah dua langkah (pilih file, lalu tombol Cek file) dan penanda "sedang memindai" yang jelas selama server bekerja. */
window.pfScan = (function () {
  var timer = null, styled = false;
  function css() {
    if (styled) return; styled = true;
    var s = document.createElement("style");
    s.textContent = ".pf-scan{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(440px,100%);margin-top:10px;padding:16px 18px;border-radius:16px;border:1px solid #7c5cff;background:rgba(124,92,255,.10);text-align:center}.pf-scan.hidden{display:none}.pf-spin{width:26px;height:26px;border-radius:50%;border:3px solid rgba(124,92,255,.3);border-top-color:#7c5cff;animation:pfspin .8s linear infinite}.pf-stx{font-weight:600}.pf-bar{width:100%;height:5px;border-radius:99px;background:rgba(124,92,255,.2);overflow:hidden}.pf-bar i{display:block;height:100%;width:40%;border-radius:99px;background:#7c5cff;animation:pfbar 1.4s ease-in-out infinite}.pf-chosen{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:6px}.pf-chosen.hidden{display:none}.pf-chosen b{word-break:break-all}@keyframes pfspin{to{transform:rotate(360deg)}}@keyframes pfbar{0%{margin-left:-40%}100%{margin-left:100%}}@media(prefers-reduced-motion:reduce){.pf-spin,.pf-bar i{animation:none}}";
    document.head.appendChild(s);
  }
  return {
    start: function (el, steps) {
      css(); clearInterval(timer); el.className = "pf-scan"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
      el.innerHTML = '<span class="pf-spin" aria-hidden="true"></span><span class="pf-stx"></span><div class="pf-bar" aria-hidden="true"><i></i></div>';
      var tx = el.querySelector(".pf-stx"), i = 0; tx.textContent = steps[0];
      timer = setInterval(function () { i = Math.min(i + 1, steps.length - 1); tx.textContent = steps[i]; }, 2800);
      try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
    },
    stop: function (el) { clearInterval(timer); el.className = "hidden"; el.textContent = ""; }
  };
})();

/* Daftar temuan Audit yang ringkas: temuan sejenis digabung jadi satu baris ("Pustaka tanpa tahun · 20 temuan · no. 12-31"),
   hanya beberapa jenis pertama yang tampil, sisanya terlipat. Halaman tidak memanjang walau temuannya ratusan.
   opts: { sev: {kritis:[label,warna],...}, visible: jumlah jenis yang tampil, full: true bila semua temuan sudah dibuka (hasil berbayar) } */
window.renderFindings = function (box, findings, opts) {
  opts = opts || {}; var SEV = opts.sev || {}, VISIBLE = opts.visible || 6, FULL = !!opts.full, BORDER = "var(--border,#2b2b58)";
  function el(tag, css, x) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  var rank = { kritis: 0, peringatan: 1, info: 2 }, groups = [], idx = {};
  (findings || []).forEach(function (f) {
    var k = f.sev + "|" + f.cat;
    if (!idx[k]) { idx[k] = { sev: f.sev, cat: f.cat, items: [] }; groups.push(idx[k]); }
    idx[k].items.push(f);
  });
  groups = groups.map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) { return (rank[a.g.sev] - rank[b.g.sev]) || (a.i - b.i); }).map(function (x) { return x.g; });

  /* "Pustaka no. 47", "Pustaka no. 48", ... -> "Pustaka no. 47-53, 60"; lokasi tak berangka -> "N lokasi" */
  function compactWhere(items) {
    var wh = items.map(function (f) { return String(f.where || ""); });
    if (wh.length === 1) return wh[0];
    var parts = wh.map(function (w) { return /^(.*?)(\d+)$/.exec(w); });
    if (parts.every(Boolean) && parts.every(function (p) { return p[1] === parts[0][1]; })) {
      var nums = parts.map(function (p) { return +p[2]; }).filter(function (n, i, a) { return a.indexOf(n) === i; }).sort(function (a, b) { return a - b; }), out = [], s = nums[0], prev = s;
      for (var i = 1; i <= nums.length; i++) {
        if (nums[i] === prev + 1) { prev = nums[i]; continue; }
        out.push(s === prev ? "" + s : s + "-" + prev); s = nums[i]; prev = nums[i];
      }
      return parts[0][1] + (out.length > 5 ? out.slice(0, 5).join(", ") + ", ... (" + nums.length + " lokasi)" : out.join(", "));
    }
    return wh.length + " lokasi";
  }
  function badge(sev) { var c = (SEV[sev] || ["", "#ccc"])[1]; return el("span", "flex:none;font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:999px;border:1px solid " + c + ";color:" + c, (SEV[sev] || [sev])[0]); }
  function row(g) {
    var n = g.items.length, wrap = el("div", "padding:12px 14px;margin-bottom:8px;border-radius:14px;border:1px solid " + BORDER);
    var top = el("div", "display:flex;gap:10px;align-items:center;flex-wrap:wrap");
    top.appendChild(badge(g.sev));
    top.appendChild(el("b", "flex:1;min-width:160px", g.cat + (n > 1 ? " · " + n + " temuan" : "")));
    top.appendChild(el("span", "flex:none;font-size:13px;opacity:.75;max-width:100%", compactWhere(g.items)));
    wrap.appendChild(top);
    var opened = g.items.filter(function (f) { return FULL || f.open; }), first = opened[0];
    wrap.appendChild(first ? el("div", "font-size:13.5px;opacity:.85;margin-top:4px", first.detail) : el("div", "font-size:13px;opacity:.6;filter:blur(5px);user-select:none;margin-top:4px", "Penjelasan dan saran perbaikan di Audit Lengkap"));
    if (n > 1) {
      var d = el("details", "margin-top:6px"), locked = n - opened.length;
      d.appendChild(el("summary", "cursor:pointer;font-size:13px;font-weight:600", "Lihat rincian " + n + " temuan" + (locked ? " (" + locked + " dibuka di Audit Lengkap)" : "")));
      var ul = el("ul", "margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.55;max-height:260px;overflow-y:auto");
      g.items.forEach(function (f) { ul.appendChild(el("li", "", f.where + (FULL || f.open ? ": " + f.detail : ": dibuka di Audit Lengkap"))); });
      d.appendChild(ul); wrap.appendChild(d);
    }
    return wrap;
  }
  groups.slice(0, VISIBLE).forEach(function (g) { box.appendChild(row(g)); });
  if (groups.length > VISIBLE) {
    var more = el("details", "margin-bottom:8px"), rest = groups.slice(VISIBLE);
    more.appendChild(el("summary", "cursor:pointer;font-weight:600;padding:8px 2px", rest.length + " jenis temuan lain (" + rest.reduce(function (a, g) { return a + g.items.length; }, 0) + " temuan)"));
    rest.forEach(function (g) { more.appendChild(row(g)); });
    box.appendChild(more);
  }
};

/* Bungkus isi kotak dalam <details> tertutup: rincian panjang hanya terbuka bila ditekan. */
window.foldList = function (box, label, open) {
  if (!box || !box.firstChild) return;
  var d = document.createElement("details"); if (open) d.open = true;
  var sm = document.createElement("summary"); sm.textContent = label; sm.style.cssText = "cursor:pointer;font-weight:700;padding:12px 16px;border-radius:14px;border:1px solid var(--border,#2b2b58);text-align:center;list-style:none";
  var inner = document.createElement("div"); inner.style.cssText = "margin-top:12px";
  while (box.firstChild) inner.appendChild(box.firstChild);
  d.appendChild(sm); d.appendChild(inner); box.appendChild(d);
};

/* "Yang sudah benar": poin dan aspek yang sudah sesuai target. Ditaruh di bagian bawah supaya yang salah terlihat lebih dulu. */
window.auditOkList = function (sc, box) {
  if (!sc || !box) return;
  function el(t, css, x) { var e = document.createElement(t); if (css) e.style.cssText = css; if (x != null) e.textContent = x; return e; }
  var rows = [];
  (sc.metrics || []).forEach(function (m) { var w = window.pfWrongPct ? window.pfWrongPct(m) : null; if (w === 0) rows.push([m.label, m.value + "%"]); });
  (sc.aspects || []).forEach(function (m) { if (m.value == null) return; var bad = m.good === "rendah" ? m.value : 100 - m.value; if (bad <= 15) rows.push([m.label, String(m.value).replace(".", ",") + "%"]); });
  ((sc.ai && sc.ai.parts) || []).forEach(function (m) { if (m.value != null && m.value <= 15) rows.push([m.label, String(m.value).replace(".", ",") + "%"]); });
  if (!rows.length) return;
  var d = document.createElement("details"), sm = el("summary", "cursor:pointer;font-weight:700;padding:12px 16px;border-radius:14px;border:1px solid var(--border,#2b2b58);text-align:center;list-style:none", "Yang sudah benar (" + rows.length + " poin)");
  var inn = el("div", "margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4px 28px;font-size:13.5px");
  rows.forEach(function (r) { var row = el("div", "display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid var(--border,#2b2b58)"); row.appendChild(el("span", "", "✓ " + r[0])); row.appendChild(el("b", "flex:none;color:#5ee6a8", r[1])); inn.appendChild(row); });
  d.appendChild(sm); d.appendChild(inn); box.appendChild(d);
};

/* Navigasi bertingkat (gaya menu Navigation): satu pohon untuk semua halaman, dibuka lewat tombol "Navigasi" di header. */
(function () {
  var T = [
    ["Layanan", [["Tugas tutorial", "/layanan?s=tugas"], ["Diskusi", "/layanan?s=diskusi"], ["Metopen UT", "/layanan?s=metopen_paket"], ["Revisi", "/layanan?s=revisi_tugas"], ["Paket Semester", "/layanan-ut"], ["Pengarahan Intensif", "/layanan-ut"]]],
    ["Alat mahasiswa", [["Cek dan parafrase mandiri", "/cek-parafrase-mandiri"], ["Audit dokumen", "/audit"], ["Kalkulator nilai UT", "/kalkulator-nilai-ut"], ["Sitasi APA", "/sitasi-apa"], ["Foto yudisium", "/pasfoto-yudisium"]]],
    ["Info UT", [["Portal UT", "/portal-ut"], ["Blog dan berita UT", "/blog-ut"]]],
    ["Akun", [["Koin", "/koin"], ["Cek pesanan", "/pesanan"], ["Masuk", "/ms/masuk"]]]
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function init() {
    var host = document.querySelector(".nav-r"); if (!host || document.getElementById("pfnavb")) return;
    var cur = location.pathname.replace(/^\/ruang[a-z]+/, "") || "/";
    var st = document.createElement("style");
    st.textContent = "#pfnavb{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:12px;padding:0 12px;height:38px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}" +
      "#pfnav{position:fixed;inset:0 auto 0 0;width:min(320px,88vw);background:var(--bg);color:var(--text);border-right:1px solid var(--border);z-index:90;transform:translateX(-102%);transition:transform .2s;overflow:auto;padding:16px;box-shadow:0 0 40px rgba(0,0,0,.35)}" +
      "#pfnav.open{transform:none}#pfnav h2{margin:0 0 12px;font-size:15px;display:flex;justify-content:space-between;align-items:center}" +
      "#pfnav h2 button{border:0;background:none;color:inherit;font-size:20px;cursor:pointer}" +
      "#pfnav details{border:1px solid var(--border);border-radius:12px;margin:0 0 8px;background:var(--surface);overflow:hidden}" +
      "#pfnav summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;padding:11px 12px;font-weight:800;font-size:14px}" +
      "#pfnav summary::-webkit-details-marker{display:none}" +
      "#pfnav summary:before{content:'';width:6px;height:6px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(-45deg);transition:transform .15s}" +
      "#pfnav details[open]>summary:before{transform:rotate(45deg)}" +
      "#pfnav ul{list-style:none;margin:0;padding:0 8px 8px 22px}#pfnav li a{display:block;padding:8px 10px;border-radius:8px;color:var(--text);text-decoration:none;font-size:13.5px}" +
      "#pfnav li a:hover{background:rgba(127,127,127,.14)}#pfnav li a.on{background:rgba(124,58,237,.18);font-weight:800}" +
      "#pfnavx{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:89;display:none}#pfnavx.open{display:block}" +
      "@media(prefers-reduced-motion:reduce){#pfnav{transition:none}}";
    document.head.appendChild(st);
    var b = document.createElement("button"); b.id = "pfnavb"; b.type = "button"; b.textContent = "Navigasi"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "pfnav");
    host.insertBefore(b, host.firstChild);
    var p = document.createElement("nav"); p.id = "pfnav"; p.setAttribute("aria-label", "Navigasi situs");
    p.innerHTML = '<h2>Navigasi <button type="button" aria-label="Tutup navigasi">×</button></h2>' + T.map(function (g) {
      var hit = g[1].some(function (l) { return l[1].split("?")[0] === cur; });
      return "<details" + (hit ? " open" : "") + "><summary>" + esc(g[0]) + "</summary><ul>" + g[1].map(function (l) { return '<li><a href="' + esc(l[1]) + '"' + (l[1].split("?")[0] === cur && l[1].indexOf("?") < 0 ? ' class="on" aria-current="page"' : "") + ">" + esc(l[0]) + "</a></li>"; }).join("") + "</ul></details>";
    }).join("");
    var x = document.createElement("div"); x.id = "pfnavx";
    document.body.appendChild(x); document.body.appendChild(p);
    function set(o) { p.classList.toggle("open", o); x.classList.toggle("open", o); b.setAttribute("aria-expanded", o); if (o) p.querySelector("a,summary").focus(); else b.focus(); }
    b.onclick = function () { set(!p.classList.contains("open")); };
    x.onclick = p.querySelector("button").onclick = function () { set(false); };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && p.classList.contains("open")) set(false); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
