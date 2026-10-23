(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var st = { up: null, page: 1 };
  var NAMES = { M: "Tulis ulang", O: "Beri kutip", K: "Tambah sumber", B: "Lengkapi sitasi", U: "Singkat", H: "Tambah kalimat", P: "Tambah analisis", A: "Variasikan" };
  var ORDER = ["M", "O", "K", "B", "U", "H", "P", "A"];

  function showErr(m) { ["err", "err2"].forEach(function (id) { var e = $(id); e.textContent = m || ""; e.classList.toggle("hidden", !m); }); }
  function cfg() { return (window.PF && window.PF.cfg) || null; }
  document.addEventListener("pf-config", function (ev) {
    var c = ev.detail; $("maxmb").textContent = c.file_max_mb;
    document.querySelectorAll("[data-revfree]").forEach(function (e) { e.textContent = c.revision_free_count; });
    document.querySelectorAll("[data-revppw]").forEach(function (e) { e.textContent = rp(c.revision_price_per_word); });
    if (st.up) price();
  });

  var drop = $("drop");
  $("pick").onclick = function () { $("file").click(); };
  $("file").onchange = function () { if (this.files[0]) send(this.files[0]); this.value = ""; };
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { var f = e.dataTransfer.files[0]; if (f) send(f); });
  ["goform", "goform2"].forEach(function (id) { $(id).onclick = function () { var d = $("detail"); d.scrollIntoView({ behavior: "smooth", block: "start" }); var w = $("judul"); setTimeout(function () { try { w.focus({ preventScroll: true }); } catch (e) {} }, 500); }; });
  $("again").onclick = function () { st.up = null; $("s2").classList.add("hidden"); $("s1").classList.remove("hidden"); showErr(""); };

  function send(f) {
    showErr("");
    if (!/\.docx$/i.test(f.name)) { showErr(/\.pdf$/i.test(f.name) ? "File PDF belum bisa diproses karena tata letaknya bisa bergeser. Ubah dulu ke Word (.docx), lalu unggah lagi." : "Hanya file Word (.docx) yang diterima."); return; }
    var c = cfg(); if (c && f.size > c.file_max_mb * 1048576) { showErr("File terlalu besar. Maksimal " + c.file_max_mb + " MB."); return; }
    $("busy").classList.remove("hidden"); $("pick").disabled = true;
    var fd = new FormData(); fd.append("file", f);
    fetch("/ms/parafrase/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { if (x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; } showErr(x.j.error || "Unggahan gagal. Coba lagi."); return; }
        applyUpload(x.j);
      }).catch(function () { showErr("Koneksi terputus. Coba unggah lagi."); })
      .then(function () { $("busy").classList.add("hidden"); $("pick").disabled = false; });
  }

  /* Satu pintu untuk unggahan baru DAN unggahan yang dilanjutkan dari Audit Dokumen (?u=...). Urgensi, urutan paragraf, dan resep
     datang dari mesin server yang sama dengan Audit; angka Drillbit yang pernah ditempel di Audit (tersimpan di browser ini) ikut dipakai. */
  function triageUrl(s, a) {
    var q = []; if (s != null) q.push("sim=" + encodeURIComponent(String(s))); if (a != null) q.push("ai=" + encodeURIComponent(String(a)));
    return "/ms/parafrase/upload/" + st.up.uploadId + (q.length ? "?" + q.join("&") : "");
  }
  function applyUpload(j) {
    st.up = j; st.page = 1; fill(); $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0); loadPreview();
    var tOpts = { here: "cek" };
    window.renderTriage($("triage"), j.triage, tOpts);
    window.auditDrillbit($("dbit"), null, {
      here: "cek",
      fetch: function (s, a) { return fetch(triageUrl(s, a), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (x) { return x.triage; }); },
      onTriage: function (t) { window.renderTriage($("triage"), t, tOpts); }
    });
  }
  function resume(id) {
    $("busy").classList.remove("hidden"); $("pick").disabled = true;
    fetch("/ms/parafrase/upload/" + id, { cache: "no-store" }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (!x.ok) { showErr(x.j.error || "Dokumen dari Audit tidak bisa dibuka. Unggah ulang dokumenmu."); return; } applyUpload(x.j); })
      .catch(function () { showErr("Koneksi terputus. Muat ulang halaman atau unggah dokumenmu lagi."); })
      .then(function () { $("busy").classList.add("hidden"); $("pick").disabled = false; });
  }
  var qu = (location.search.match(/[?&]u=([a-f0-9]{32})(?:&|$)/) || [])[1];
  if (qu) resume(qu);

  function fill() {
    var u = st.up, d = u.detected;
    $("fname").textContent = u.file.name;
    $("fmeta").textContent = Math.max(1, Math.round(u.file.size / 1024)) + " KB · " + rp(d.words) + " kata · " + u.notes.total + " catatan ditemukan";
    $("judul").value = d.title || ""; $("bhs").value = d.language === "en" ? "en" : "id"; $("jenis").value = d.docType || "umum";
    $("nobib").checked = true; $("nobib").disabled = !d.hasBibliography;
    var t = new Date(Date.now() + 2 * 86400000), p = function (n) { return String(n).padStart(2, "0"); };
    $("dl").min = new Date().toISOString().slice(0, 10); $("dl").value = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
    $("chips").innerHTML = ORDER.map(function (k) { return '<span class="chip c-' + k + '" title="' + ((window.PF_TARGET || {})[k] || "") + '">' + k + " " + NAMES[k] + " · " + (u.notes.byCode ? u.notes.byCode[k] : u.notes[k] || 0) + "</span>"; }).join("");
    price();
  }

  function price() {
    var c = cfg(), u = st.up; if (!c || !u) return;
    var d = u.detected, words = $("nobib").checked ? d.wordsWithoutBibliography : d.words;
    var fastOn = $("fast").checked && c.fast_lane.enabled && !c.fast_lane.full;
    var base = Math.max(words * c.price_per_word, c.min_order_price);
    $("pwords").textContent = rp(words);
    $("total").textContent = "Rp " + rp(base + (fastOn ? c.fast_lane.price : 0));
    var f = c.fast_lane, box = $("fastbox");
    if (!f.enabled) { box.classList.add("hidden"); }
    else { box.classList.remove("hidden"); var dis = f.full; $("fast").disabled = dis; box.classList.toggle("off", dis); if (dis) $("fast").checked = false;
      $("slot").textContent = dis ? "Jalur cepat penuh hari ini." : "Slot hari ini: " + f.remaining + " dari " + f.cap + " tersisa."; }
    gate();
  }
  function dlDate() { var v = $("dl").value; return v ? new Date(v + "T" + ($("dljam").value || "17:00") + ":00") : null; }
  function gate() {
    var wa = $("wa").value.replace(/\D/g, ""), ok = /^8\d{8,12}$/.test(wa.replace(/^0/, "").replace(/^62/, ""));
    var dl = dlDate(), dlok = dl && dl.getTime() > Date.now();
    $("dlwarn").textContent = dlok && dl.getTime() - Date.now() < 86400000 ? "Deadline kurang dari 24 jam, kami sarankan jalur cepat." : "";
    var all = ok && dlok && $("agree").checked && st.up;
    $("pay").disabled = !all;
    $("payhint").textContent = all ? "Pembayaran QRIS dibuka di langkah berikutnya." : !ok ? "Isi nomor WhatsApp yang benar (mulai 8…)" : !dlok ? "Isi deadline yang belum lewat" : "Centang persetujuan untuk melanjutkan";
  }
  ["wa", "dl", "dljam", "agree"].forEach(function (id) { $(id).addEventListener("input", gate); $(id).addEventListener("change", gate); });
  ["nobib", "fast"].forEach(function (id) { $(id).addEventListener("change", price); });

  $("pay").onclick = function () {
    showErr(""); var dl = dlDate(); if (!st.up || !dl) return;
    $("pay").disabled = true; $("pay").textContent = "Membuat pesanan…";
    fetch("/ms/parafrase/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      uploadId: st.up.uploadId, wa: $("wa").value, title: $("judul").value, language: $("bhs").value, docType: $("jenis").value,
      excludeBib: $("nobib").checked, fast: $("fast").checked, deadline: dl.getTime(), agree: $("agree").checked }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok && x.j.login) { location.href = "/ms/masuk?next=" + encodeURIComponent(location.pathname); return; }
        if (x.ok) { try { localStorage.setItem("pf_last", x.j.token); } catch (e) {} location.href = x.j.url; return; }
        showErr(x.j.error || "Pesanan gagal dibuat.");
        if (x.j.code === "fast_full") { fetch("/ms/public-config").then(function (r) { return r.json(); }).then(function (c) { window.PF.cfg = c; price(); }); }
      }).catch(function () { showErr("Koneksi terputus. Coba lagi."); })
      .then(function () { $("pay").textContent = "Bayar dengan QRIS"; gate(); });
  };

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function loadPreview() {
    if (!st.up) return;
    $("doc").innerHTML = '<p class="muted">Memuat pratinjau…</p>';
    fetch("/ms/parafrase/preview/" + st.up.uploadId + "?page=" + st.page).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { $("doc").innerHTML = '<p class="muted">' + esc(x.j.error || "Pratinjau tidak tersedia.") + "</p>"; return; }
        var pv = x.j; st.pages = pv.pages; st.page = pv.page;
        $("doc").innerHTML = pv.paragraphs.map(function (p) {
          return '<p><span class="pn" title="Paragraf ke-' + p.no + ' (sama dengan nomor di Urutan perbaikan)" style="display:inline-block;min-width:22px;margin-right:6px;font-size:11px;font-weight:700;opacity:.55">' + p.no + "</span>" + p.segments.map(function (s) {
            var cls = "seg" + (s.primary ? " s-" + s.primary : "") + (s.locked ? " locked" : "");
            var tag = s.primary ? '<sup class="t c-' + s.primary + '" style="background:none">[' + (s.n ? "contoh " + s.n + " · " : "") + s.codes.join("·") + "]</sup>" : "";
            return '<span class="' + cls + '"' + (s.locked ? ' aria-hidden="true"' : "") + ">" + esc(s.text) + "</span>" + tag + " ";
          }).join("") + "</p>";
        }).join("");
        renderOverview(pv); renderExample(pv);
        $("pg").textContent = "Halaman " + pv.page + " dari " + pv.pages;
        $("prev").disabled = pv.page <= 1; $("next").disabled = pv.page >= pv.pages;
      }).catch(function () { $("doc").innerHTML = '<p class="muted">Pratinjau gagal dimuat.</p>'; });
  }
  function mk(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  /* Angka aspek yang sama dengan Audit Dokumen (renderer yang sama di common.js). */
  function renderOverview(pv) {
    var box = $("overview"); box.innerHTML = ""; if (!pv.overview) return;
    window.auditAspects(pv.overview, box, { compact: true });
    box.appendChild(mk("a", "font-size:13.5px", "Skor kesiapan serta penjelasan lengkap sitasi dan daftar pustaka ada di Audit Dokumen →")).href = "/ruangakademikut/audit";
  }
  /* Satu paragraf contoh: rekomendasi di atas, kalimat yang salah dicoret dan diberi warna kodenya, lalu contoh penulisan ulang. */
  function renderExample(pv) {
    var box = $("examples"); box.innerHTML = ""; var ex = pv.example; if (!ex) return;
    var card = mk("div", "padding:16px 18px;border-radius:18px;border:1px solid var(--border,#2b2b58);margin:12px 0");
    var hd = mk("div", "display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px");
    hd.appendChild(mk("b", "font-size:18px", "Contoh perbaikan: 1 paragraf dari dokumenmu"));
    if (ex.remaining > 0) hd.appendChild(mk("span", "font-size:12.5px;padding:3px 11px;border-radius:999px;border:1px solid var(--border,#2b2b58);opacity:.85", ex.remaining + " catatan lain terbuka setelah pembayaran"));
    card.appendChild(hd);
    var total = (ex.remaining || 0) + 1 + (ex.also || []).length;
    card.appendChild(mk("div", "font-size:14px;line-height:1.6;opacity:.9;margin:0 0 10px", "Dokumenmu punya " + total + " catatan perbaikan. Satu paragraf dibuka gratis sebagai contoh supaya kamu lihat bentuknya" + (ex.remaining > 0 ? "; " + ex.remaining + " catatan lainnya dibuka setelah pembayaran." : ".")));
    var rec = mk("div", "border:1px solid var(--border,#2b2b58);border-left:5px solid #7c5cff;background:rgba(124,92,255,.10);border-radius:12px;padding:12px 16px;margin:8px 0 12px");
    var lab = mk("b", "display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.8;margin-bottom:3px", "Rekomendasi · " + ex.code + " " + (NAMES[ex.code] || ex.action) + " (" + ex.color + ")");
    rec.appendChild(lab);
    rec.appendChild(mk("div", "", ex.reason + " " + (ex.rewrite ? String(ex.target || "").replace(/^Harusnya:\s*/, "Harusnya ") + " Contoh di bawah." : ex.helper)));
    (ex.also || []).forEach(function (a) { rec.appendChild(mk("div", "margin-top:6px;font-size:14px;opacity:.9", "Juga (" + a.code + "): " + a.reason + " " + a.helper)); });
    card.appendChild(rec);
    var para = mk("div", "background:#fff;color:#12202f;border-radius:12px;padding:16px 18px;font-size:15.5px;line-height:1.85");
    var rewrite = null;
    ex.sentences.forEach(function (s, i) {
      var sp = mk("span", "", (i ? " " : "") + s.text);
      if (s.flagged) { sp.className = "seg s-" + s.code; sp.style.textDecoration = "line-through"; sp.style.textDecorationColor = "#c62828"; sp.style.textDecorationThickness = "2px"; if (!rewrite && s.rewrite) rewrite = s.rewrite; }
      para.appendChild(sp);
    });
    if (rewrite) {
      var w = mk("div", "margin-top:10px");
      w.appendChild(mk("div", "color:#5a6b85;font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em", "Contoh penulisan ulang ›"));
      var f = mk("span", "background:#E3F5EA;border-bottom:2px solid #2e7d32", rewrite); w.appendChild(f); para.appendChild(w);
    }
    card.appendChild(para);
    card.appendChild(mk("p", "margin:8px 0 0;font-size:12.5px;opacity:.7", "Warna dan coretan menunjukkan bagian yang kami kerjakan." + (rewrite ? " Kalimat hijau hanya contoh cara menulis ulang, bukan hasil akhir." : "")));
    box.appendChild(card);
  }
  $("prev").onclick = function () { st.page--; loadPreview(); };
  $("next").onclick = function () { st.page++; loadPreview(); };
})();
