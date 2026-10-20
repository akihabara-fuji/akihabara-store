/* Dipakai semua halaman Ruang Akademik UT: ambil pengaturan publik, isi tombol dan harga. */
(function () {
  var rp = function (n) { return Number(n).toLocaleString("id-ID"); };
  window.PF = { rp: rp, cfg: null };
  function fill(c) {
    window.PF.cfg = c;
    var set = function (sel, v) { document.querySelectorAll(sel).forEach(function (e) { e.textContent = v; }); };
    set("[data-ppw]", rp(c.price_per_word)); set("[data-min]", rp(c.min_order_price)); set("[data-fast]", rp(c.fast_lane.price));
    set("[data-retention]", c.retention_hours);
    document.querySelectorAll("[data-chat]").forEach(function (a) {
      if (!c.admin_wa_number) { a.classList.add("hidden"); return; }
      var m = a.getAttribute("data-msg") || "Halo admin nextaja, saya mau tanya Cek dan Parafrase Mandiri.";
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
