/* Editor blog admin: tombol H2/H3/tebal/poin/tautan + daftar periksa struktur judul untuk Google. Tidak mengubah kode admin lain. */
(function () {
  "use strict";
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () {
    var ta = document.getElementById("bBody"), form = document.getElementById("bForm");
    if (!ta || !form || ta.dataset.seo) return; ta.dataset.seo = "1";
    var hint = ta.closest("label") && ta.closest("label").querySelector("small");
    if (hint) hint.textContent = "· Seleksi baris lalu klik H2 atau H3 (tanda ## terpasang otomatis, jangan diketik lagi). Baris kosong = paragraf baru.";
    var css = document.createElement("style");
    css.textContent = ".bseo-bar{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.bseo-bar button{min-height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--border,#ccc);background:var(--surface2,#eee);color:inherit;font:700 13px inherit;cursor:pointer}.bseo-bar button:hover{border-color:var(--acc,#06c)}.bseo-box{border:1px solid var(--border,#ccc);border-radius:12px;padding:10px 14px;margin:8px 0;font-size:13px;line-height:1.6}.bseo-box b{display:block;margin-bottom:4px}.bseo-box div.ok{color:#1b8a4b}.bseo-box div.warn{color:#b36b00}.bseo-box div.bad{color:#c62828}";
    document.head.appendChild(css);
    var bar = document.createElement("div"); bar.className = "bseo-bar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Format tulisan");
    [["H2", "Sub-judul (H2)"], ["H3", "Anak sub-judul (H3)"], ["B", "Tebal"], ["•", "Poin"], ["🔗", "Tautan"]].forEach(function (x) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = x[0]; b.title = x[1]; b.setAttribute("aria-label", x[1]); b.dataset.k = x[0]; bar.appendChild(b);
    });
    ta.parentNode.insertBefore(bar, ta);
    var box = document.createElement("div"); box.className = "bseo-box"; box.setAttribute("aria-live", "polite");
    ta.parentNode.insertBefore(box, ta.nextSibling);
    function lineRange() { var v = ta.value, s = v.lastIndexOf("\n", ta.selectionStart - 1) + 1, e = v.indexOf("\n", ta.selectionEnd); return [s, e < 0 ? v.length : e]; }
    function setHeading(prefix) {
      var r = lineRange(), line = ta.value.slice(r[0], r[1]).replace(/^#{1,6}\s+/, "");
      var cur = ta.value.slice(r[0], r[1]).match(/^(#{1,6})\s+/), same = cur && cur[1] + " " === prefix;
      ta.setRangeText(same ? line : prefix + line, r[0], r[1], "end"); ta.focus(); ta.dispatchEvent(new Event("input"));
    }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var k = b.dataset.k, s = ta.selectionStart, en = ta.selectionEnd, sel = ta.value.slice(s, en);
      if (k === "H2") setHeading("## "); else if (k === "H3") setHeading("### ");
      else if (k === "B") { ta.setRangeText("**" + (sel || "teks tebal") + "**", s, en, "end"); }
      else if (k === "•") { var r = lineRange(), t = ta.value.slice(r[0], r[1]); ta.setRangeText(/^[-*]\s/.test(t) ? t.replace(/^[-*]\s/, "") : "- " + t, r[0], r[1], "end"); }
      else if (k === "🔗") { ta.setRangeText("[" + (sel || "teks tautan") + "](https://)", s, en, "end"); }
      ta.focus(); ta.dispatchEvent(new Event("input"));
    });
    function words(t) { return (t.match(/\S+/g) || []).length; }
    function analyse() {
      var title = (form.title && form.title.value || "").trim(), ex = (form.excerpt && form.excerpt.value || "").trim(), body = ta.value, lines = body.replace(/\r/g, "").split("\n");
      var h1 = 0, h2 = [], h3 = 0, h3First = false, seenH2 = false, firstHead = -1, firstPara = -1, empty = 0;
      lines.forEach(function (l, i) {
        var t = l.trim(); if (!t) return;
        var m = t.match(/^(#{1,6})\s*(.*)$/);
        if (m) { var n = m[1].length, txt = m[2].trim(); if (!txt) empty++; if (n === 1) h1++; else if (n === 2) { h2.push(txt.toLowerCase()); seenH2 = true; } else if (n === 3) { h3++; if (!seenH2) h3First = true; } if (firstHead < 0) firstHead = i; }
        else if (firstPara < 0) firstPara = i;
      });
      var w = words(body), dup = h2.some(function (x, i) { return h2.indexOf(x) !== i; }), out = [], bad = 0;
      function add(c, t) { out.push('<div class="' + c + '">' + (c === "ok" ? "✓ " : c === "warn" ? "! " : "✗ ") + t + "</div>"); if (c === "bad") bad++; }
      add(title.length >= 30 && title.length <= 65 ? "ok" : "warn", "Judul (H1 otomatis): " + title.length + " huruf. Ideal 30 sampai 65 supaya utuh di hasil Google.");
      add(ex.length >= 110 && ex.length <= 160 ? "ok" : "warn", "Ringkasan: " + ex.length + " huruf. Ideal 110 sampai 160 (jadi deskripsi di Google).");
      add(h1 === 0 ? "ok" : "warn", h1 === 0 ? "Isi tidak memakai H1 (benar: H1 diambil dari kolom Judul)." : "Ada " + h1 + " baris berawalan # (H1). Otomatis dijadikan H2 saat tampil. Disarankan pakai ##.");
      add(h2.length >= 2 || w < 300 ? "ok" : (h2.length === 1 ? "warn" : "bad"), "Sub-judul H2: " + h2.length + (w >= 300 ? ". Tulisan " + w + " kata sebaiknya punya 2 atau lebih, dan WAJIB minimal 1 untuk terbit." : ". Tulisan pendek, boleh tanpa H2."));
      add(!h3First ? "ok" : "warn", h3First ? "H3 muncul sebelum H2 pertama. Susun H2 dulu, baru H3." : "Urutan H2 lalu H3 benar.");
      add(!dup ? "ok" : "warn", dup ? "Ada judul H2 yang sama. Buat tiap sub-judul unik." : "Judul sub-judul unik.");
      add(empty === 0 ? "ok" : "bad", empty ? empty + " judul bagian kosong (tulis teksnya setelah tanda #)." : "Tidak ada judul bagian kosong.");
      add(firstPara >= 0 && (firstHead < 0 || firstPara < firstHead) ? "ok" : "warn", "Mulai dengan paragraf pembuka sebelum sub-judul pertama.");
      add(w >= 300 ? "ok" : "warn", "Panjang: " + w + " kata. Disarankan minimal 300 kata untuk artikel informasi.");
      box.innerHTML = "<b>Periksa struktur untuk Google</b>" + out.join("");
      return { block: w >= 300 && h2.length === 0 };
    }
    ["input", "change"].forEach(function (ev) { form.addEventListener(ev, analyse); });
    new MutationObserver(analyse).observe(document.getElementById("bDlg") || form, { attributes: true, attributeFilter: ["open"] });
    analyse();
    form.addEventListener("submit", function (e) {
      var pub = form.status && form.status.value === "published", r = analyse();
      if (pub && r.block) { e.preventDefault(); e.stopImmediatePropagation(); alert("Tulisan sepanjang ini wajib punya sub-judul H2. Pilih baris judul bagian, klik tombol H2, atau simpan sebagai Draf dulu."); }
    }, true);
  });
})();
