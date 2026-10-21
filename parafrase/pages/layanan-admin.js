(function () {
  var L = document.getElementById("list");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function dt(t) { return t ? new Date(t).toLocaleString("id-ID") : ""; }
  function post(url, body, isForm) { return fetch(url, { method: "POST", body: body, headers: isForm ? {} : {} }).then(function (r) { return r.json(); }); }
  var F = "";
  var CH = document.getElementById("chips");
  ["Semua", "Tugas", "Diskusi", "Metopen", "Revisi"].forEach(function (n) { var b = document.createElement("button"); b.type = "button"; b.textContent = n; b.className = n === "Semua" ? "on" : ""; b.onclick = function () { F = n === "Semua" ? "" : n; [].forEach.call(CH.children, function (x) { x.className = x === b ? "on" : ""; }); load(); }; CH.appendChild(b); });
  function load() {
    fetch("/ms/admin/layanan", { cache: "no-store" }).then(function (r) { if (r.status === 401 || r.status === 403) throw new Error("Masuk sebagai admin dulu."); return r.json(); }).then(function (j) {
      var rows = j.orders.filter(function (o) { return !F || String(o.label).indexOf(F) === 0; });
      if (!rows.length) { L.textContent = "Belum ada pesanan " + (F || "layanan") + " yang dibayar."; return; }
      L.innerHTML = rows.map(function (o) {
        var files = o.attachments.map(function (a) { return '<a href="/ms/admin/layanan/' + o.id + "/file/" + a.n + '">' + esc(a.name) + "</a>"; }).join(" · ") || "tanpa lampiran";
        var done = o.status === "terkirim";
        return '<div class="o" data-id="' + o.id + '"><b>' + o.id + " · " + esc(o.label) + '</b> <span class="m">' + esc(o.status) + (o.parent ? " · revisi dari " + esc(o.parent) : "") + '</span><div class="m">WA ' + esc(o.wa) + " · " + dt(o.createdAt) + (done ? " · terhapus otomatis " + dt(o.deleteAt) : "") + '</div><pre>' + esc(o.brief) + '</pre><div class="m">Lampiran: ' + files + "</div>" +
          (o.status === "baru_dibayar" ? '<p><button data-a="mulai">Tandai sedang dikerjakan</button></p>' : "") +
          '<textarea placeholder="Teks hasil (untuk Diskusi, pelanggan dapat tombol Copy)"></textarea><div><input type="file" accept=".docx,.pdf"> <button data-a="hasil">' + (done ? "Kirim ulang hasil" : "Kirim hasil") + '</button></div></div>';
      }).join("");
    }).catch(function (e) { L.textContent = e.message || "Gagal memuat."; });
  }
  L.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return; var box = b.closest(".o"), id = box.dataset.id;
    if (b.dataset.a === "mulai") post("/ms/admin/layanan/" + id + "/mulai").then(load);
    if (b.dataset.a === "hasil") { var fd = new FormData(), f = box.querySelector("input[type=file]").files[0]; fd.append("text", box.querySelector("textarea").value); if (f) fd.append("file", f); post("/ms/admin/layanan/" + id + "/hasil", fd, true).then(function (j) { if (j.error) alert(j.error); else load(); }); }
  });
  load();
})();
