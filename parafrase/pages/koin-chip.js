/* Chip koin di menu atas, tepat di samping "Akun saya". Hanya muncul bila sudah masuk. Gagal diam-diam bila jaringan bermasalah. */
(function () {
  "use strict";
  var KOIN_URL = "/ruangakademikut/koin";
  function j(u) { return fetch(u, { cache: "no-store", credentials: "same-origin" }).then(function (r) { return r.json(); }); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  Promise.all([j("/ms/auth/me"), j("/ms/koin/saldo")]).then(function (a) {
    var user = a[0] && a[0].user, bal = a[1] && a[1].balance;
    if (!user) return;
    var login = document.getElementById("navAcc") || document.querySelector('.nav-r a[href="/ms/masuk"]');
    var m = document.querySelector('.only-m[href="/ms/masuk"]');
    [login, m].forEach(function (x) { if (x) { x.textContent = "Akun saya"; x.setAttribute("href", "/ms/akun"); } });
    if (typeof bal !== "number" || !login || document.getElementById("koinChip")) return;
    var st = document.createElement("style");
    st.textContent = ".koin-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #b7791f;background:rgba(245,185,66,.16);color:inherit;font:600 14px/1 Onest,system-ui,sans-serif;text-decoration:none;white-space:nowrap}.koin-chip:hover,.koin-chip:focus-visible{background:rgba(245,185,66,.3)}.koin-chip svg{flex:none}@media(max-width:560px){.koin-chip{padding:0 10px;font-size:13px}}";
    document.head.appendChild(st);
    var c = document.createElement("a");
    c.id = "koinChip"; c.className = "koin-chip"; c.href = KOIN_URL;
    c.setAttribute("aria-label", "Saldo koin " + fmt(bal) + ". Buka halaman koin");
    c.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f5b942"/><circle cx="12" cy="12" r="7" fill="none" stroke="#8a5b00" stroke-width="1.5"/></svg><span>' + fmt(bal) + " koin</span>";
    login.parentNode.insertBefore(c, login);
  }).catch(function () {});
})();
