(function () {
  var L = document.getElementById("bl"), E = document.getElementById("be");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function load(f) {
    fetch("/ms/blog/latest?limit=30&f=" + encodeURIComponent(f), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var ps = j.posts || []; E.classList.toggle("hidden", ps.length > 0);
      L.innerHTML = ps.map(function (p) {
        return '<a class="pc bp" href="/blog/' + esc(p.slug) + '">' + (p.cover ? '<img loading="lazy" alt="' + esc(p.title) + '" src="' + esc(p.cover) + '">' : '<div class="cvp">' + esc(p.topic) + "</div>") +
          '<div class="pb"><small>' + esc(p.topic) + " · " + new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + "</small><h2>" + esc(p.title) + "</h2><div class=\"muted\">" + esc(p.excerpt || "") + "</div></div></a>";
      }).join("");
    }).catch(function () { L.textContent = "Tulisan gagal dimuat."; });
  }
  [].forEach.call(document.querySelectorAll("#bt button"), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll("#bt button"), function (x) { x.classList.toggle("on", x === b); }); load(b.getAttribute("data-f")); }; });
  load("ut");
})();
