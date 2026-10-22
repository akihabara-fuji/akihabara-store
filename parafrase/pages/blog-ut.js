(function () {
  var L = document.getElementById("bl"), E = document.getElementById("be");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function load(f) {
    fetch("/ms/blog/latest?limit=30&f=" + encodeURIComponent(f), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var ps = j.posts || []; E.classList.toggle("hidden", ps.length > 0);
      L.innerHTML = ps.map(function (p) {
        return '<article class="blog-row"><a href="/blog/' + esc(p.slug) + '"><div class="blog-row-top"><span class="tag">' + esc(p.topic) + '</span><time datetime="' + esc(p.date) + '">' + new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + '</time></div><h2>' + esc(p.title) + '</h2><p>' + esc(p.excerpt || "") + '</p><div class="blog-row-foot"><span>Selengkapnya »</span><b>Catatan Akademik</b></div></a></article>';
      }).join("");
    }).catch(function () { L.textContent = "Tulisan gagal dimuat."; });
  }
  [].forEach.call(document.querySelectorAll("#bt button"), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll("#bt button"), function (x) { x.classList.toggle("on", x === b); }); load(b.getAttribute("data-f")); }; });
  if (!L.querySelector(".blog-row")) load("ut"); /* sudah dirender server (dengan halaman 1,2,...) */
})();
