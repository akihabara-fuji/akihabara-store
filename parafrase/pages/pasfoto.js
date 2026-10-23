/* Pengecek pasfoto yudisium: crop 3:4 -> 354x472 px, JPG < 1 MB, penanda 300 DPI. Semua di browser, foto tidak diunggah. */
(function () {
  var W = 354, H = 472, MAX = 1024 * 1024;
  var $ = function (i) { return document.getElementById(i); };
  var img = null, cv = $("cv"), ctx = cv.getContext("2d"), blob = null, url = null;
  cv.width = W; cv.height = H;
  function draw() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    if (!img) return;
    var z = Number($("zoom").value) / 100, ox = Number($("ox").value) / 100, oy = Number($("oy").value) / 100;
    var base = Math.max(W / img.width, H / img.height), s = base * z;
    var dw = img.width * s, dh = img.height * s;
    var x = (W - dw) * ox, y = (H - dh) * oy;
    ctx.drawImage(img, x, y, dw, dh);
  }
  function dpi(buf) { // JFIF: units=1 (dpi), 300x300
    var b = new Uint8Array(buf);
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[7] === 0x46) {
      b[13] = 1; b[14] = 1; b[15] = 0x2C; b[16] = 1; b[17] = 0x2C;
    }
    return b;
  }
  function make() {
    if (!img) return;
    draw();
    var q = 0.95;
    (function step() {
      cv.toBlob(function (bl) {
        if (!bl) return;
        if (bl.size > MAX && q > 0.3) { q -= 0.1; return step(); }
        bl.arrayBuffer().then(function (buf) {
          blob = new Blob([dpi(buf)], { type: "image/jpeg" });
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          var a = $("dl"); a.href = url; a.classList.remove("off"); a.removeAttribute("aria-disabled");
          $("info").textContent = W + " × " + H + " px · 3:4 · 300 DPI · " + Math.max(1, Math.round(blob.size / 1024)) + " KB · JPG";
        });
      }, "image/jpeg", q);
    })();
  }
  function load(f) {
    $("err").textContent = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { $("err").textContent = "Pilih foto JPG, PNG, atau WebP."; return; }
    if (f.size > 25 * 1024 * 1024) { $("err").textContent = "Foto terlalu besar (maksimal 25 MB)."; return; }
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(u); img = im;
      $("zoom").value = 100; $("ox").value = 50; $("oy").value = 30;
      $("ed").hidden = false;
      var low = im.width < W || im.height < H;
      $("warn").textContent = low ? "Resolusi foto asli kecil (" + im.width + "×" + im.height + "). Hasil bisa buram, pakai foto yang lebih besar bila ada." : "";
      make();
    };
    im.onerror = function () { URL.revokeObjectURL(u); $("err").textContent = "Foto tidak bisa dibaca. Coba file lain."; };
    im.src = u;
  }
  $("f").addEventListener("change", function (e) { load(e.target.files[0]); });
  var dz = $("dz");
  ["dragover", "dragenter"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add("on"); }); });
  ["dragleave", "drop"].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove("on"); }); });
  dz.addEventListener("drop", function (e) { load(e.dataTransfer.files[0]); });
  ["zoom", "ox", "oy"].forEach(function (i) { $(i).addEventListener("input", make); });
  $("dl").addEventListener("click", function (e) { if (!blob) e.preventDefault(); });
})();
