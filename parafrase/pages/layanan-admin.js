(function () {
  var L = document.getElementById("list");
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }
  function dt(t) { return t ? new Date(t).toLocaleString("id-ID") : ""; }
  function post(url, body, isForm) { return fetch(url, { method: "POST", body: body, headers: isForm ? {} : {} }).then(function (r) { return r.json(); }); }
  function load() {
    fetch("/ms/admin/layanan", { cache: "no-store" }).then(function (r) { if (r.status === 401 || r.status === 403) throw new Error("Masuk sebagai admin dulu."); return r.json(); }).then(function (j) {
      if (!j.orders.length) { L.textContent = "Belum ada pesanan layanan yang dibayar."; return; }
      L.innerHTML = j.orders.map(function (o) {
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
