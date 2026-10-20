(function () {
  var $ = function (id) { return document.getElementById(id); };
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  var st = { up: null, page: 1 };
  var NAMES = { M: "Tulis ulang", O: "Beri kutip", K: "Tambah sumber", B: "Lengkapi sitasi", U: "Singkat", H: "Tambah kalimat", P: "Tambah analisis", A: "Variasikan" };
  var ORDER = ["M", "O", "K", "B", "U", "H", "P", "A"];

  function showErr(m) { var e = $("err"); e.textContent = m || ""; e.classList.toggle("hidden", !m); }
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
  $("again").onclick = function () { st.up = null; $("s2").classList.add("hidden"); $("s1").classList.remove("hidden"); showErr(""); };

  function send(f) {
    showErr("");
    if (!/\.docx$/i.test(f.name)) { showErr(/\.pdf$/i.test(f.name) ? "File PDF belum bisa diproses karena tata letaknya bisa bergeser. Ubah dulu ke Word (.docx), lalu unggah lagi." : "Hanya file Word (.docx) yang diterima."); return; }
    var c = cfg(); if (c && f.size > c.file_max_mb * 1048576) { showErr("File terlalu besar. Maksimal " + c.file_max_mb + " MB."); return; }
    $("busy").classList.remove("hidden"); $("pick").disabled = true;
    var fd = new FormData(); fd.append("file", f);
    fetch("/ms/parafrase/upload", { method: "POST", body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { showErr(x.j.error || "Unggahan gagal. Coba lagi."); return; }
        st.up = x.j; st.page = 1; fill(); $("s1").classList.add("hidden"); $("s2").classList.remove("hidden"); window.scrollTo(0, 0); loadPreview();
      }).catch(function () { showErr("Koneksi terputus. Coba unggah lagi."); })
      .then(function () { $("busy").classList.add("hidden"); $("pick").disabled = false; });
  }

  function fill() {
    var u = st.up, d = u.detected;
    $("fname").textContent = u.file.name;
    $("fmeta").textContent = Math.max(1, Math.round(u.file.size / 1024)) + " KB · " + rp(d.words) + " kata · " + u.notes.total + " catatan ditemukan";
    $("judul").value = d.title || ""; $("bhs").value = d.language === "en" ? "en" : "id"; $("jenis").value = d.docType || "umum";
    $("nobib").checked = true; $("nobib").disabled = !d.hasBibliography;
    var t = new Date(Date.now() + 2 * 86400000), p = function (n) { return String(n).padStart(2, "0"); };
    $("dl").min = new Date().toISOString().slice(0, 10); $("dl").value = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
    $("chips").innerHTML = ORDER.map(function (k) { return '<span class="chip c-' + k + '">' + k + " " + NAMES[k] + " · " + (u.notes.byCode ? u.notes.byCode[k] : u.notes[k] || 0) + "</span>"; }).join("");
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
    // Pembuatan pesanan + halaman QRIS dikerjakan di Tahap 6a. Sampai itu terpasang, tombol hanya memberi tahu.
    showErr("");
    showErr("Pembayaran QRIS belum diaktifkan di versi uji ini.");
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
          return "<p>" + p.segments.map(function (s) {
            var cls = "seg" + (s.primary ? " s-" + s.primary : "") + (s.locked ? " locked" : "");
            var tag = s.primary ? '<sup class="t c-' + s.primary + '" style="background:none">[' + s.codes.join("·") + (s.locked ? "" : " · contoh terbuka") + "]</sup>" : "";
            return '<span class="' + cls + '"' + (s.locked ? ' aria-hidden="true"' : "") + ">" + esc(s.text) + "</span>" + tag + " ";
          }).join("") + "</p>";
        }).join("");
        $("pg").textContent = "Halaman " + pv.page + " dari " + pv.pages;
        $("prev").disabled = pv.page <= 1; $("next").disabled = pv.page >= pv.pages;
      }).catch(function () { $("doc").innerHTML = '<p class="muted">Pratinjau gagal dimuat.</p>'; });
  }
  $("prev").onclick = function () { st.page--; loadPreview(); };
  $("next").onclick = function () { st.page++; loadPreview(); };
})();
