/* Editor blog admin: layout dua kolom, toolbar (H2/H3/B/I/poin/nomor/kutipan/tautan/undo/redo), pratinjau, panel struktur
   untuk Google (error/peringatan/saran), status simpan, peringatan perubahan belum tersimpan, pemulihan draf lokal.
   Disuntik lewat satu tag <script>; tidak mengubah kode admin lain. */
(function () {
  "use strict";
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }

  ready(function () {
    var ta = document.getElementById("bBody"), form = document.getElementById("bForm"), dlg = document.getElementById("bDlg");
    if (!ta || !form || !dlg || ta.dataset.seo) return; ta.dataset.seo = "1";

    var link = document.createElement("link"); link.rel = "stylesheet"; link.href = "/assets/admin-blog-seo.css?v=3"; document.head.appendChild(link);

    /* ---------- susun ulang: kolom utama + samping ---------- */
    var head = form.querySelector(".dlg-head"), foot = form.querySelector(".dlg-foot");
    var lTitle = form.title.closest("label"), lTopic = form.topic.closest("label"), lEx = form.excerpt.closest("label"), lBody = ta.closest("label"), lStatus = form.status.closest("label");
    var imgBox = document.getElementById("bImg"), cover = imgBox && imgBox.parentNode;
    var main = document.createElement("div"), side = document.createElement("div"); main.className = "bed-main"; side.className = "bed-side";
    form.classList.add("bed");
    var ed = document.createElement("div"); ed.className = "bed-ed";
    var hint = lBody.querySelector("small"); if (hint) hint.textContent = "· Seleksi baris lalu klik H2 atau H3 (tanda ## terpasang otomatis). Baris kosong = paragraf baru.";

    var bar = document.createElement("div"); bar.className = "bseo-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Format tulisan");
    var BTN = [["H2", "Sub-judul H2", "h2"], ["H3", "Anak sub-judul H3", "h3"], ["B", "Tebal (Ctrl+B)", "b"], ["I", "Miring (Ctrl+I)", "i"], ["•", "Daftar poin", "ul"], ["1.", "Daftar bernomor", "ol"], ["❝", "Kutipan", "q"], ["🔗", "Tautan (Ctrl+K)", "a"], ["↶", "Urungkan", "undo"], ["↷", "Ulangi", "redo"]];
    BTN.forEach(function (x) { var b = document.createElement("button"); b.type = "button"; b.textContent = x[0]; b.title = x[1]; b.setAttribute("aria-label", x[1]); b.dataset.k = x[2]; if (/^(h2|h3|b|i|ul|ol|q)$/.test(x[2])) b.setAttribute("aria-pressed", "false"); bar.appendChild(b); });
    var sp = document.createElement("span"); sp.className = "sp"; bar.appendChild(sp);
    var pv = document.createElement("button"); pv.type = "button"; pv.textContent = "👁 Pratinjau"; pv.dataset.k = "preview"; pv.title = "Lihat seperti tampilan pembaca"; bar.appendChild(pv);

    ed.appendChild(bar); ed.appendChild(ta); lBody.appendChild(ed);
    var cT = document.createElement("div"); cT.className = "bed-count"; lTitle.appendChild(cT);
    var cE = document.createElement("div"); cE.className = "bed-count"; lEx.appendChild(cE);
    var cB = document.createElement("div"); cB.className = "bed-count"; lBody.appendChild(cB);
    [lTitle, lEx, lBody].forEach(function (n) { main.appendChild(n); });

    var box = document.createElement("details"); box.className = "bseo-box"; box.open = true;
    var snip = document.createElement("div"); snip.className = "bed-snip";
    var note = document.createElement("div"); note.className = "bed-note"; if (cover) cover.appendChild(note);
    [lTopic, lStatus, snip, box].forEach(function (n) { if (n) side.appendChild(n); });
    if (cover) side.insertBefore(cover, snip);
    form.insertBefore(main, foot); form.insertBefore(side, foot);

    var st = document.createElement("span"); st.className = "bed-st"; st.setAttribute("aria-live", "polite"); var h3 = head && head.querySelector("h3"); if (h3 && h3.parentNode) h3.parentNode.insertBefore(st, h3.nextSibling);
    function status(t, c) { st.textContent = t; st.className = "bed-st" + (c ? " " + c : ""); }

    /* ---------- edit teks (memakai insertText agar undo/redo bawaan jalan) ---------- */
    function put(s, e, text, selS, selE) {
      ta.focus(); ta.setSelectionRange(s, e);
      var ok = false; try { ok = document.execCommand("insertText", false, text); } catch (x) {}
      if (!ok) { ta.setRangeText(text, s, e, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); }
      ta.setSelectionRange(selS == null ? s + text.length : selS, selE == null ? s + text.length : selE);
    }
    function line() { var v = ta.value, s = v.lastIndexOf("\n", ta.selectionStart - 1) + 1, e = v.indexOf("\n", ta.selectionEnd); e = e < 0 ? v.length : e; return [s, e, v.slice(s, e)]; }
    function prefixLines(re, make) {
      var v = ta.value, s = v.lastIndexOf("\n", ta.selectionStart - 1) + 1, e = v.indexOf("\n", ta.selectionEnd); e = e < 0 ? v.length : e;
      var lines = v.slice(s, e).split("\n"), all = lines.every(function (l) { return re.test(l); });
      var out = lines.map(function (l, i) { return all ? l.replace(re, "") : make(l.replace(/^(#{1,6}\s+|[-*•]\s+|\d{1,2}[.)]\s+|>\s?)/, ""), i); }).join("\n");
      put(s, e, out, s, s + out.length);
    }
    function wrap(m) { var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e), t = m + (sel || "teks") + m; put(s, e, t, s + m.length, s + m.length + (sel || "teks").length); }
    function act(k) {
      if (k === "h2") prefixLines(/^##\s+/, function (l) { return "## " + l; });
      else if (k === "h3") prefixLines(/^###\s+/, function (l) { return "### " + l; });
      else if (k === "ul") prefixLines(/^[-*•]\s+/, function (l) { return "- " + l; });
      else if (k === "ol") prefixLines(/^\d{1,2}[.)]\s+/, function (l, i) { return (i + 1) + ". " + l; });
      else if (k === "q") prefixLines(/^>\s?/, function (l) { return "> " + l; });
      else if (k === "b") wrap("**"); else if (k === "i") wrap("*");
      else if (k === "a") { var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || "teks tautan"; put(s, e, "[" + sel + "](https://)", s + sel.length + 3, s + sel.length + 11); }
      else if (k === "undo") { ta.focus(); document.execCommand("undo"); } else if (k === "redo") { ta.focus(); document.execCommand("redo"); }
      else if (k === "preview") openPreview();
      refreshBar(); analyse();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) act(b.dataset.k); });
    ta.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return; var k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); act("b"); } else if (k === "i") { e.preventDefault(); act("i"); } else if (k === "k") { e.preventDefault(); act("a"); }
    });
    function refreshBar() {
      var l = line()[2], on = { h2: /^##\s/.test(l), h3: /^###\s/.test(l), ul: /^[-*•]\s/.test(l), ol: /^\d{1,2}[.)]\s/.test(l), q: /^>\s?/.test(l), b: false, i: false };
      var v = ta.value, p = ta.selectionStart, a = v.lastIndexOf("**", p - 1), z = v.indexOf("**", p); on.b = a >= 0 && z >= 0 && v.slice(a, z).indexOf("\n") < 0 && ((v.slice(0, a).match(/\*\*/g) || []).length % 2 === 0);
      bar.querySelectorAll("[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", on[b.dataset.k] ? "true" : "false"); });
    }
    ["keyup", "click", "focus"].forEach(function (ev) { ta.addEventListener(ev, refreshBar); });

    /* ---------- pratinjau ---------- */
    var prev = document.createElement("dialog"); prev.id = "bPrev"; prev.setAttribute("aria-label", "Pratinjau tulisan");
    prev.innerHTML = '<div class="pv"><button type="button" class="btn pv-x">Tutup</button><h1></h1><div class="pv-b"></div></div>'; document.body.appendChild(prev);
    prev.querySelector(".pv-x").addEventListener("click", function () { prev.close(); });
    function openPreview() {
      var h1 = prev.querySelector("h1"), pb = prev.querySelector(".pv-b"); h1.textContent = form.title.value || "(Judul belum diisi)"; pb.textContent = "Memuat…"; prev.showModal();
      fetch("/ms/admin/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.title.value, body: ta.value }) })
        .then(function (r) { if (!r.ok) throw new Error("Gagal memuat pratinjau"); return r.json(); }).then(function (j) { pb.innerHTML = j.html || "<p><em>Isi masih kosong.</em></p>"; })
        .catch(function (e) { pb.textContent = e.message; });
    }

    /* ---------- analisis struktur ---------- */
    function words(t) { return (t.match(/\S+/g) || []).length; }
    function hasCover() { return !!(imgBox && imgBox.querySelector("img")); }
    function analyse() {
      var title = form.title.value.trim(), ex = form.excerpt.value.trim(), body = ta.value, w = words(body), pub = form.status.value === "published";
      var h1 = 0, h2 = [], h3First = false, seenH2 = false, empty = 0, firstHead = -1, firstPara = -1;
      body.replace(/\r/g, "").split("\n").forEach(function (l, i) {
        var t = l.trim(); if (!t) return; var m = t.match(/^(#{1,6})(?:\s+(.*))?$/);
        if (m && (m[2] !== undefined || /^#+$/.test(t))) { var n = m[1].length, txt = (m[2] || "").trim(); if (!txt) empty++; if (n === 1) h1++; else if (n === 2) { h2.push(txt.toLowerCase()); seenH2 = true; } else if (n === 3 && !seenH2) h3First = true; if (firstHead < 0) firstHead = i; }
        else if (firstPara < 0) firstPara = i;
      });
      var dup = h2.some(function (x, i) { return x && h2.indexOf(x) !== i; }), E = [], W = [], S = [], N = [];
      var noH2 = w >= 300 && h2.length === 0;
      if (noH2) E.push("Tulisan " + w + " kata belum punya sub-judul H2. Wajib ada minimal satu agar bisa terbit.");
      if (pub && !title) E.push("Judul wajib diisi untuk menerbitkan.");
      if (title) { var tl = title.length; if (tl < 30 || tl > 65) W.push("Judul " + tl + " huruf. Ideal 30 sampai 65 agar utuh di hasil Google."); } else N.push("Isi judul. H1 halaman diambil otomatis dari kolom ini.");
      if (ex) { var el = ex.length; if (el < 110 || el > 160) W.push("Ringkasan " + el + " huruf. Ideal 110 sampai 160 (jadi deskripsi di Google)."); } else S.push("Isi ringkasan supaya cuplikan di Google rapi.");
      if (body.trim()) {
        if (h3First) W.push("H3 muncul sebelum H2 pertama. Susun H2 dulu, baru H3.");
        if (dup) W.push("Ada judul H2 yang sama. Buat tiap sub-judul unik.");
        if (empty) W.push(empty + " judul bagian masih kosong.");
        if (!(firstPara >= 0 && (firstHead < 0 || firstPara < firstHead))) W.push("Mulai dengan paragraf pembuka sebelum sub-judul pertama.");
        if (h1) S.push(h1 + " baris berawalan # (H1) akan tampil sebagai H2. H1 sudah otomatis dari Judul, sebaiknya pakai ##.");
        if (w < 300) S.push("Panjang " + w + " kata. Artikel informasi biasanya minimal 300 kata."); else if (h2.length === 1) S.push("Tambah sub-judul H2 kedua agar mudah dipindai.");
      } else N.push("Isi tulisan masih kosong. Draf kosong tetap boleh disimpan.");
      if (!hasCover()) S.push("Tambah foto sampul agar artikel menarik dibagikan.");
      var h = "<summary>Periksa struktur untuk Google " + (E.length ? '<span class="b e">' + E.length + " error</span>" : "") + (W.length ? '<span class="b w">' + W.length + " peringatan</span>" : "") + (S.length ? '<span class="b s">' + S.length + " saran</span>" : "") + (!E.length && !W.length && !S.length && !N.length ? '<span class="b" style="color:#2fa56b">semua baik</span>' : "") + '</summary><div class="bseo-in">';
      function grp(name, cls, arr) { return arr.length ? "<h4>" + name + "</h4>" + arr.map(function (x) { return '<div class="' + cls + '">' + esc(x) + "</div>"; }).join("") : ""; }
      h += grp("Error (menghalangi terbit)", "e", E) + grp("Peringatan", "w", W) + grp("Saran", "s", S) + grp("Info", "n", N) + (E.length || W.length || S.length || N.length ? "" : '<div class="ok">Struktur judul sudah sesuai.</div>') + "</div>";
      var op = box.open; box.innerHTML = h; box.open = op;
      function cnt(el, n, lo, hi, max) { el.textContent = n + (max ? " / " + max : "") + " huruf" + (lo ? " · ideal " + lo + " sampai " + hi : ""); el.className = "bed-count" + (!n ? "" : (n >= lo && n <= hi ? " ok" : " warn")); }
      cnt(cT, title.length, 30, 65, 140); cnt(cE, ex.length, 110, 160, 260); cB.textContent = w + " kata"; cB.className = "bed-count" + (w >= 300 ? " ok" : "");
      var ds = ex || "Ringkasan belum diisi."; snip.innerHTML = "<small>Pratinjau hasil Google</small>"; var u = document.createElement("div"), t = document.createElement("div"), d = document.createElement("div"); u.className = "u"; t.className = "t"; d.className = "d";
      u.textContent = "catatanakademik.com › blog"; t.textContent = (title || "Judul artikel") .slice(0, 60) + " | Catatan Akademik"; d.textContent = ds.length > 155 ? ds.slice(0, 152) + "…" : ds; snip.appendChild(u); snip.appendChild(t); snip.appendChild(d);
      return { block: noH2 || (pub && !title) };
    }
    function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

    /* ---------- foto sampul: konfirmasi hapus, validasi tipe dan ukuran, info file ---------- */
    var del = document.getElementById("bImgDel"), file = document.getElementById("bFile");
    if (del) del.addEventListener("click", function (e) { if (hasCover() && !confirm("Hapus foto sampul dari tulisan ini? File tidak dihapus dari server.")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    if (file) file.addEventListener("change", function (e) {
      var f = file.files[0]; if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { alert("Gunakan foto JPG, PNG, atau WebP."); file.value = ""; e.stopImmediatePropagation(); return; }
      if (f.size > 12 * 1024 * 1024) { alert("Foto maksimal 12 MB."); file.value = ""; e.stopImmediatePropagation(); return; }
      note.textContent = f.name + " · " + f.type.replace("image/", "").toUpperCase() + " · " + Math.round(f.size / 1024) + " KB. Teks alternatif otomatis memakai judul tulisan.";
    }, true);
    if (imgBox) new MutationObserver(analyse).observe(imgBox, { childList: true, subtree: true });

    /* ---------- perubahan belum tersimpan + draf lokal ---------- */
    var snap = "", dkey = "ca-draft:new", timer = null;
    function cur() { return JSON.stringify([form.title.value, form.topic.value, form.excerpt.value, ta.value]); }
    function dirty() { return dlg.open && cur() !== snap; }
    var dbar = document.createElement("div"); dbar.className = "bed-draft"; dbar.hidden = true; form.insertBefore(dbar, main);
    function opened() {
      snap = cur(); dkey = "ca-draft:" + (form.title.value.trim() || "new"); status(form.title.value ? "Tersimpan" : "Tulisan baru", ""); dbar.hidden = true; dbar.textContent = "";
      var raw = store(dkey); if (raw) { try {
        var d = JSON.parse(raw), same = JSON.stringify([d.t, d.c, d.e, d.b]) === snap;
        if (!same && (d.b || d.t)) { dbar.hidden = false; var s = document.createElement("span"); s.textContent = "Ada draf lokal yang belum tersimpan (" + new Date(d.at).toLocaleString("id-ID") + "). "; var a = document.createElement("button"), b = document.createElement("button"); a.type = b.type = "button"; a.textContent = "Pulihkan"; b.textContent = "Buang";
          a.onclick = function () { form.title.value = d.t; form.topic.value = d.c; form.excerpt.value = d.e; ta.value = d.b; dbar.hidden = true; analyse(); status("Draf lokal dipulihkan (belum disimpan)", ""); };
          b.onclick = function () { store(dkey, null); dbar.hidden = true; }; dbar.appendChild(s); dbar.appendChild(a); dbar.appendChild(b); } } catch (x) {} }
      analyse(); refreshBar();
    }
    new MutationObserver(function () { if (dlg.open) opened(); }).observe(dlg, { attributes: true, attributeFilter: ["open"] });
    ["input", "change"].forEach(function (ev) { form.addEventListener(ev, function () {
      analyse(); if (dirty()) status("Belum disimpan", ""); else status("Tersimpan", "");
      clearTimeout(timer); timer = setTimeout(function () { if (dirty()) store(dkey, JSON.stringify({ t: form.title.value, c: form.topic.value, e: form.excerpt.value, b: ta.value, at: Date.now() })); }, 700);
    }); });
    dlg.addEventListener("click", function (e) { if (e.target.closest("[data-close]") && dirty() && !confirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?\n(Salinan draf tetap tersimpan di browser ini.)")) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    dlg.addEventListener("cancel", function (e) { if (dirty() && !confirm("Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?")) e.preventDefault(); });
    window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });

    /* ---------- status simpan (membungkus fetch simpan tulisan) ---------- */
    var of = window.fetch;
    window.fetch = function (u, o) {
      var url = typeof u === "string" ? u : (u && u.url) || "", save = /\/ms\/admin\/posts(\?|$)/.test(url) && o && String(o.method).toUpperCase() === "POST", p = of.apply(this, arguments);
      if (save) { status("Menyimpan…", ""); p.then(function (r) { if (r.ok) { status("Tersimpan", "ok"); snap = cur(); store(dkey, null); } else r.clone().json().then(function (j) { status("Gagal menyimpan: " + (j.error || r.status), "err"); }).catch(function () { status("Gagal menyimpan", "err"); }); }).catch(function () { status("Gagal menyimpan (koneksi)", "err"); }); }
      return p;
    };

    /* ---------- blokir terbit bila ada error ---------- */
    form.addEventListener("submit", function (e) {
      var pub = form.status.value === "published", r = analyse();
      if (pub && r.block) { e.preventDefault(); e.stopImmediatePropagation(); status("Belum bisa terbit: lihat Error di panel", "err"); box.open = true; alert("Belum bisa terbit. Perbaiki bagian Error di panel samping, atau simpan sebagai Draf dulu."); }
    }, true);

    if (dlg.open) opened(); else analyse();
  });
})();
