(function () {
  var L = document.getElementById("bl"), E = document.getElementById("be");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  var POS = ["50% 8%", "62% 20%", "40% 12%", "70% 30%"], ZM = [1.05, 1.25, 1.15, 1.4];
  function load(f) {
    fetch("/ms/blog/latest?limit=30&f=" + encodeURIComponent(f), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var ps = j.posts || []; E.classList.toggle("hidden", ps.length > 0);
      L.innerHTML = ps.map(function (p, i) {
        return '<a class="pc bp" href="/blog/' + esc(p.slug) + '">' + "<div class=\"cv\"><span class=\"cvt\" style=\"--pos:" + POS[i % 4] + ";--z:" + ZM[i % 4] + "\"><i>" + esc(p.topic) + "</i><b>Catatan Akademik</b></span></div>" +
          '<div class="pb"><small>' + esc(p.topic) + " · " + new Date(p.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + "</small><h2>" + esc(p.title) + "</h2><div class=\"muted\">" + esc(p.excerpt || "") + "</div></div></a>";
      }).join("");
    }).catch(function () { L.textContent = "Tulisan gagal dimuat."; });
  }
  [].forEach.call(document.querySelectorAll("#bt button"), function (b) { b.onclick = function () { [].forEach.call(document.querySelectorAll("#bt button"), function (x) { x.classList.toggle("on", x === b); }); load(b.getAttribute("data-f")); }; });
  load("ut");
})();
