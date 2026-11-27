/* Latar "Kinetic Grid": kisi garis yang melengkung ke arah kursor dan beriak tiap klik/ketuk.
   Kanvas tetap di belakang seluruh isi halaman; tidak menangkap klik; berhenti saat tab tersembunyi; statis bila pengguna meminta gerak dikurangi. */
(function () {
  if (window.__kgrid || /\/admin|\/tools\/|[?&]embed=1/.test(location.href)) return; window.__kgrid = 1;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var cv = document.createElement("canvas"), cx = cv.getContext("2d"); if (!cx) return;
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  var st = document.createElement("style");
  st.textContent = "html{background:var(--bg)}body{background:transparent!important}@media print{canvas[aria-hidden]{display:none!important}}";
  document.head.appendChild(st); document.body.insertBefore(cv, document.body.firstChild);
  var W, H, D, GAP = 44, cols, rows, px = -999, py = -999, tx = -999, ty = -999, act = 0, rip = [], raf = 0, col = [255, 204, 0], alpha = .075, last = 0;
  function colors() {
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    col = dark ? [255, 204, 0] : [180, 83, 9]; alpha = dark ? .095 : .11;
  }
  function size() {
    D = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * D; cv.height = H * D; cx.setTransform(D, 0, 0, D, 0, 0);
    GAP = W < 640 ? 36 : 44; cols = Math.ceil(W / GAP) + 2; rows = Math.ceil(H / GAP) + 2; draw(performance.now());
  }
  function pt(i, j, t) {
    var x = i * GAP - GAP / 2, y = j * GAP - GAP / 2, dx = px - x, dy = py - y, d = Math.sqrt(dx * dx + dy * dy) + .001, R = 190;
    if (act > .01 && d < R * 2) { var f = Math.exp(-(d * d) / (R * R)) * 26 * act; x += dx / d * f; y += dy / d * f; }
    for (var k = 0; k < rip.length; k++) {
      var r = rip[k], age = (t - r.t) / 1000, rd = age * 380, ox = x - r.x, oy = y - r.y, od = Math.sqrt(ox * ox + oy * oy) + .001, w = (od - rd) / 46;
      var a = Math.exp(-w * w) * 15 * Math.exp(-age * 1.6); x += ox / od * a; y += oy / od * a;
    }
    return [x, y];
  }
  function draw(t) {
    cx.clearRect(0, 0, W, H);
    for (var k = rip.length - 1; k >= 0; k--) if ((t - rip[k].t) > 2600) rip.splice(k, 1);
    var g = [], i, j, row;
    for (j = 0; j < rows; j++) { row = []; for (i = 0; i < cols; i++) row.push(pt(i, j, t)); g.push(row); }
    cx.lineWidth = 1; cx.strokeStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha + ")"; cx.beginPath();
    for (j = 0; j < rows; j++) { cx.moveTo(g[j][0][0], g[j][0][1]); for (i = 1; i < cols; i++) cx.lineTo(g[j][i][0], g[j][i][1]); }
    for (i = 0; i < cols; i++) { cx.moveTo(g[0][i][0], g[0][i][1]); for (j = 1; j < rows; j++) cx.lineTo(g[j][i][0], g[j][i][1]); }
    cx.stroke();
    if (act > .01 && fine) { var gl = cx.createRadialGradient(px, py, 0, px, py, 150); gl.addColorStop(0, "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + .09 * act + ")"); gl.addColorStop(1, "rgba(" + col[0] + "," + col[1] + "," + col[2] + ",0)"); cx.fillStyle = gl; cx.fillRect(px - 150, py - 150, 300, 300); }
  }
  function loop(t) {
    raf = 0; if (document.hidden) return;
    px += (tx - px) * .16; py += (ty - py) * .16;
    act += ((tx > -900 ? 1 : 0) - act) * .08;
    draw(t);
    if (rip.length || act > .01 && Math.abs(tx - px) + Math.abs(ty - py) > .3 || act > .02 && act < .98) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  addEventListener("pointermove", function (e) { if (e.pointerType === "touch") return; if (px < -900) { px = e.clientX; py = e.clientY; } tx = e.clientX; ty = e.clientY; kick(); }, { passive: true });
  addEventListener("pointerdown", function (e) { if (reduce) return; rip.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (rip.length > 6) rip.shift(); if (e.pointerType !== "touch") { tx = e.clientX; ty = e.clientY; } kick(); }, { passive: true });
  document.addEventListener("mouseleave", function () { tx = -999; ty = -999; kick(); });
  addEventListener("resize", function () { size(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
  new MutationObserver(function () { colors(); draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  colors(); size();
})();
