(function () {
  var L = document.getElementById("bl"), E = document.getElementById("be");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function load(f) {
    fetch("/ms/blog/list-html?f=" + encodeURIComponent(f), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      E.classList.toggle("hidden", j.n > 0); L.innerHTML = j.html || "";
    }).catch(function () { L.textContent = "Tulisan gagal dimuat."; });
  }
  [].forEach.call(document.querySelectorAll("#bt button"), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll("#bt button"), function (x) { x.classList.toggle("on", x === b); }); load(b.getAttribute("data-f")); }; });
  if (!L.querySelector(".blog-month")) load("ut"); /* sudah dirender server (dengan halaman 1,2,...) */
})();
