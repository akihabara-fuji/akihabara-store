/* Studio Konten v2 — editor foto (Polaroid), teks bebas geser, tipografi, auto estetik, swipe review.
   Semua diproses di browser. Foto tidak dikirim ke server. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cv = $("#cv"), ov = $("#ov");
  if (!cv || !ov) return;
  var cx = cv.getContext("2d"), oc = ov.getContext("2d");
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var RAD = Math.PI / 180;
  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var FORMATS = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920] };
  var PLAT = { ig: "4:5", th: "1:1", tt: "9:16" };
  var FONTS = { "Inter": "sans-serif", "Montserrat": "sans-serif", "Playfair Display": "serif", "Poppins": "sans-serif", "Syne": "sans-serif", "Instrument Serif": "serif", "Raleway": "sans-serif", "Cinzel": "serif", "Cormorant Garamond": "serif", "Space Grotesk": "sans-serif", "Caveat": "cursive" };
  /* Maksimal 2 font per pasangan; tr = tracking per 1/1000 em; ld = leading (%) */
  var PAIRS = {
    hand: { head: { f: "Caveat", w: 700, tr: 0, ld: 100 }, sub: { f: "Inter", w: 500, tr: 0, ld: 135 }, hd: { f: "Inter", w: 600, tr: 40, ld: 120 } },
    editorial: { head: { f: "Playfair Display", w: 700, tr: -5, ld: 108 }, sub: { f: "Inter", w: 400, tr: 0, ld: 140 }, hd: { f: "Inter", w: 600, tr: 80, ld: 120 } },
    minimal: { head: { f: "Montserrat", w: 700, tr: -8, ld: 108 }, sub: { f: "Montserrat", w: 300, tr: 5, ld: 140 }, hd: { f: "Montserrat", w: 500, tr: 80, ld: 120 } },
    trendy: { head: { f: "Syne", w: 800, tr: -10, ld: 100 }, sub: { f: "Poppins", w: 500, tr: 0, ld: 140 }, hd: { f: "Poppins", w: 600, tr: 40, ld: 120 } },
    warm: { head: { f: "Instrument Serif", w: 400, tr: -5, ld: 112 }, sub: { f: "Raleway", w: 500, tr: 10, ld: 140 }, hd: { f: "Raleway", w: 700, tr: 80, ld: 120 } },
    luxury: { head: { f: "Cinzel", w: 700, tr: 30, ld: 120 }, sub: { f: "Cormorant Garamond", w: 400, tr: 15, ld: 135 }, hd: { f: "Cinzel", w: 500, tr: 100, ld: 120 } },
    family: { head: { f: "Montserrat", w: 900, tr: -12, ld: 100 }, sub: { f: "Montserrat", w: 500, tr: 0, ld: 140 }, hd: { f: "Montserrat", w: 300, tr: 80, ld: 120 } }
  };
  var TPLPAIR = { polaroid: "hand", bold: "trendy", center: "minimal", editorial: "editorial", poster: "family", quote: "warm", minimal: "minimal" };
  var ROLES = { head: 1, sub: 1, hd: 1, acc: 1, qm: 1 };

  var uid = 0;
  var S = {
    img: null, src: null, graded: null, bg: null, an: null,
    fmt: "4:5", plat: "ig", tpl: "polaroid", pair: "",
    head: "Judul kontenmu di sini", sub: "Subteks singkat yang menjelaskan isinya", handle: "@akunmu",
    acc: "#7c3aed", size: 100, zoom: 1, ox: 0, oy: 0, rot: 0,
    aeOn: true, aeStr: 60, polRot: true, blocks: [], sel: null
  };
  var logoImg = null;
  var guides = { x: null, y: null };

  function dims() { return FORMATS[S.fmt]; }

  /* ---------- ukur dan gambar teks ---------- */
  var mc = document.createElement("canvas").getContext("2d");
  var LS = "letterSpacing" in mc;
  function fontStr(b, px) { return (b.italic ? "italic " : "") + b.weight + " " + px.toFixed(2) + 'px "' + b.font + '", ' + (FONTS[b.font] || "sans-serif"); }
  function prep(c, b, px) { c.font = fontStr(b, px); if (LS) c.letterSpacing = (b.track / 1000 * px).toFixed(2) + "px"; }
  function tw(c, s, tr) { return c.measureText(s).width + (LS ? 0 : tr * s.length); }
  function txt(b, o) {
    var t = (o && o.head != null && b.role === "head") ? o.head : b.text;
    t = (b.prefix || "") + t; return b.caps ? t.toUpperCase() : t;
  }
  function wrapT(c, t, maxW, tr) {
    var out = [];
    t.split("\n").forEach(function (par) {
      var words = par.split(/\s+/).filter(Boolean), line = "";
      if (!words.length) { out.push(""); return; }
      words.forEach(function (w) {
        var test = line ? line + " " + w : w;
        if (tw(c, test, tr) <= maxW || !line) {
          if (!line && tw(c, w, tr) > maxW) {
            var chunk = "";
            Array.prototype.forEach.call(w, function (ch) { if (chunk && tw(c, chunk + ch, tr) > maxW) { out.push(chunk); chunk = ch; } else chunk += ch; });
            line = chunk;
          } else line = test;
        } else { out.push(line); line = w; }
      });
      out.push(line);
    });
    return out.length ? out : [""];
  }
  function lay(b, W, o) {
    var px = b.size * W, bw = b.w * W; prep(mc, b, px);
    var lines = wrapT(mc, txt(b, o), bw, b.track / 1000 * px), lh = px * b.lead / 100;
    return { lines: lines, px: px, lh: lh, bw: bw, h: Math.max(lines.length, 1) * lh };
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function drawStr(c, s, x, y, tr) {
    if (LS || !tr) { c.fillText(s, x, y); return; }
    Array.prototype.forEach.call(s, function (ch) { c.fillText(ch, x, y); x += c.measureText(ch).width + tr; });
  }
  function drawText(c, b, L) {
    prep(c, b, L.px); c.textBaseline = "middle"; c.textAlign = "left";
    var tr = b.track / 1000 * L.px, re = b.hi ? new RegExp("(" + esc(b.hi) + ")", "ig") : null;
    if (b.shadow) { c.shadowColor = "rgba(0,0,0,.38)"; c.shadowBlur = L.px * 0.28; c.shadowOffsetY = L.px * 0.05; }
    L.lines.forEach(function (ln, i) {
      var segs = re ? ln.split(re).filter(function (s) { return s !== ""; }) : [ln], total = 0;
      segs.forEach(function (s) { total += tw(c, s, tr); });
      var x = b.align === "center" ? -total / 2 : b.align === "right" ? L.bw / 2 - total : -L.bw / 2;
      var y = -L.h / 2 + L.lh * (i + 0.5);
      segs.forEach(function (s) {
        var hi = re && b.hi && s.toLowerCase() === b.hi.toLowerCase();
        c.fillStyle = hi ? b.hiColor : b.color; drawStr(c, s, x, y, tr); x += tw(c, s, tr);
      });
    });
  }
  function geo(b, W, H) {
    if (b.kind === "rule") return { bw: b.w * W, h: Math.max(b.size * W, 18) };
    if (b.kind === "logo") return { bw: b.w * W, h: logoImg ? b.w * W * logoImg.height / logoImg.width : b.w * W * 0.4 };
    var L = lay(b, W); return { bw: L.bw, h: L.h };
  }
  function drawBlock(c, W, H, b, o) {
    c.save(); c.translate(b.x * W, b.y * H); c.rotate(b.rot * RAD);
    if (b.kind === "rule") { c.fillStyle = b.color; c.fillRect(-b.w * W / 2, -b.size * W / 2, b.w * W, b.size * W); }
    else if (b.kind === "logo") { if (logoImg) { var g = geo(b, W, H); c.globalAlpha = 0.92; c.drawImage(logoImg, -g.bw / 2, -g.h / 2, g.bw, g.h); } }
    else {
      if (o && o.head != null && b.role === "head") { /* teks pengganti (thumbnail review): kecilkan font supaya muat di ruang headline asli */
        var maxH = lay(b, W).h * 1.1; b = Object.assign({}, b); var n = 0;
        while (lay(b, W, o).h > maxH && b.size > 0.02 && n++ < 30) b.size *= 0.93;
      }
      drawText(c, b, lay(b, W, o));
    }
    c.restore();
  }

  /* ---------- geometri polaroid ---------- */
  function polGeom(W, H) {
    var cw = W * 0.8, m = W * 0.04, pw = cw - 2 * m, k = H > W * 1.5 ? 1.4 : H > W * 1.1 ? 1.12 : 0.86;
    var ph = pw * k, strip = W * 0.21, ch = m + ph + strip;
    return { cw: cw, ch: ch, m: m, pw: pw, ph: ph, strip: strip, cx: W / 2, cy: H / 2 - H * 0.008, ang: (S.polRot ? -1.8 : 0) * RAD };
  }
  function photoRect(W, H) {
    if (S.tpl === "polaroid") { var g = polGeom(W, H); return { x: -g.cw / 2 + g.m, y: -g.ch / 2 + g.m, w: g.pw, h: g.ph }; }
    return { x: 0, y: 0, w: W, h: H };
  }
  function coverScale(rw, rh, src, a) {
    var ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    return Math.max((rw * ca + rh * sa) / src.width, (rw * sa + rh * ca) / src.height);
  }
  function drawPhoto(c, r) {
    var src = S.graded;
    if (!src) {
      var g = c.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, "#2b2f4a"); g.addColorStop(1, "#6a4c93"); c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h); return;
    }
    var a = S.rot * RAD, sc = coverScale(r.w, r.h, src, a) * S.zoom, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a));
    var mx = Math.max(0, (sc * src.width - (r.w * ca + r.h * sa)) / 2), my = Math.max(0, (sc * src.height - (r.w * sa + r.h * ca)) / 2);
    S.ox = clamp(S.ox, -mx, mx); S.oy = clamp(S.oy, -my, my);
    c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
    c.translate(r.x + r.w / 2 + S.ox, r.y + r.h / 2 + S.oy); c.rotate(a); c.scale(sc, sc);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(src, -src.width / 2, -src.height / 2);
    c.restore();
    if (S.aeOn && S.aeStr > 0) {
      c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
      var vg = c.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.38, r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (0.26 * S.aeStr / 100).toFixed(3) + ")");
      c.fillStyle = vg; c.fillRect(r.x, r.y, r.w, r.h); c.restore();
    }
  }
  function drawBase(c, W, H) {
    var t = S.tpl;
    if (t === "polaroid") {
      var g = polGeom(W, H);
      if (S.bg) {
        var bw = S.bg.width, bh = S.bg.height, k = Math.max(W / bw, H / bh);
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(S.bg, (W - bw * k) / 2, (H - bh * k) / 2, bw * k, bh * k);
        c.fillStyle = "rgba(24,18,14,.38)"; c.fillRect(0, 0, W, H);
      } else {
        var bgg = c.createLinearGradient(0, 0, W, H); bgg.addColorStop(0, "#ece5da"); bgg.addColorStop(1, "#cdbfae"); c.fillStyle = bgg; c.fillRect(0, 0, W, H);
      }
      c.save(); c.translate(g.cx, g.cy); c.rotate(g.ang);
      c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = W * 0.04; c.shadowOffsetY = W * 0.016;
      c.fillStyle = "#fbfaf7"; c.fillRect(-g.cw / 2, -g.ch / 2, g.cw, g.ch);
      c.shadowColor = "transparent"; c.shadowBlur = 0; c.shadowOffsetY = 0;
      drawPhoto(c, photoRect(W, H));
      c.restore(); return;
    }
    drawPhoto(c, { x: 0, y: 0, w: W, h: H });
    var gr;
    if (t === "bold") { gr = c.createLinearGradient(0, H * 0.3, 0, H); gr.addColorStop(0, "rgba(11,11,15,0)"); gr.addColorStop(1, "rgba(11,11,15,.88)"); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
    else if (t === "center") { c.fillStyle = "rgba(11,11,15,.55)"; c.fillRect(0, 0, W, H); }
    else if (t === "editorial") { var ph = H * 0.4; c.fillStyle = "#fff"; c.fillRect(0, H - ph, W, ph); c.fillStyle = S.acc; c.fillRect(0, H - ph, W, 10); }
    else if (t === "poster") {
      c.globalCompositeOperation = "multiply"; c.globalAlpha = 0.82; c.fillStyle = S.acc; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
      gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(11,11,15,.1)"); gr.addColorStop(1, "rgba(11,11,15,.6)"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    } else if (t === "quote") {
      gr = c.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, Math.max(W, H) * 0.75); gr.addColorStop(0, "rgba(11,11,15,.45)"); gr.addColorStop(1, "rgba(11,11,15,.88)"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    } else {
      c.fillStyle = "rgba(11,11,15,.3)"; c.fillRect(0, 0, W, H);
      var m = W * 0.04; c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3; c.strokeRect(m, m, W - m * 2, H - m * 2);
    }
  }
  function render(c, W, H, o) {
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    if (o && o.scale) c.scale(o.scale, o.scale);
    c.clearRect(0, 0, W, H); drawBase(c, W, H);
    S.blocks.forEach(function (b) { drawBlock(c, W, H, b, o); });
    c.restore();
  }
  var raf = 0;
  function redraw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  function draw() { var d = dims(); if (cv.width !== d[0] || cv.height !== d[1]) { cv.width = d[0]; cv.height = d[1]; ov.width = d[0]; ov.height = d[1]; } render(cx, d[0], d[1]); drawOv(); }

  /* ---------- kontras ---------- */
  function hex2rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.replace(/(.)/g, "$1$1"); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r) { return "#" + r.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(""); }
  function lum(r, g, b) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
  function ratio(l1, l2) { var a = Math.max(l1, l2), b = Math.min(l1, l2); return (a + 0.05) / (b + 0.05); }
  function ensureContrast(color, bgHex, min) {
    var c = hex2rgb(color), bl = lum.apply(null, hex2rgb(bgHex)), n = 0;
    while (ratio(lum(c[0], c[1], c[2]), bl) < min && n++ < 30) c = c.map(function (v) { return v * 0.92; });
    return rgb2hex(c);
  }
  function sampleLum(b) { /* luminansi p10 dan p90 di bawah blok, dari kanvas dasar */
    var d = dims(), W = d[0], H = d[1], g = geo(b, W, H), s = document.createElement("canvas"); s.width = 24; s.height = 24;
    var sx = clamp(b.x * W - g.bw / 2, 0, W - 4), sy = clamp(b.y * H - g.h / 2, 0, H - 4), sw = clamp(g.bw, 4, W - sx), sh = clamp(g.h, 4, H - sy);
    var c2 = s.getContext("2d", { willReadFrequently: true }); c2.drawImage(cv, sx, sy, sw, sh, 0, 0, 24, 24);
    var px = c2.getImageData(0, 0, 24, 24).data, arr = [];
    for (var i = 0; i < px.length; i += 4) arr.push(lum(px[i], px[i + 1], px[i + 2]));
    arr.sort(function (a, b2) { return a - b2; });
    return { lo: arr[Math.floor(arr.length * 0.1)], hi: arr[Math.floor(arr.length * 0.9)] };
  }
  function autoColor(b) {
    var d = dims(); cx.clearRect(0, 0, d[0], d[1]); drawBase(cx, d[0], d[1]);
    var s = sampleLum(b), cw = ratio(1, s.hi), cd = ratio(lum(17, 17, 17), s.lo);
    if (cw >= cd) { b.color = "#ffffff"; b.shadow = cw < 4.5; } else { b.color = "#111111"; b.shadow = cd < 4.5; }
    return Math.max(cw, cd);
  }

  /* ---------- analisis foto dan auto estetik ---------- */
  function analyze(src) {
    var iw = src.width, ih = src.height, s = Math.min(1, 140 / Math.max(iw, ih));
    var w = Math.max(16, Math.round(iw * s)), h = Math.max(16, Math.round(ih * s));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(src, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, n = w * h, Y = new Float32Array(n), hist = new Uint32Array(256), sr = 0, sg = 0, sb = 0, ss = 0, i, x, y;
    for (i = 0; i < n; i++) {
      var r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], yy = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      Y[i] = yy; hist[Math.min(255, yy | 0)]++; sr += r; sg += gg; sb += b;
      var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); ss += mx ? (mx - mn) / mx : 0;
    }
    var acc = 0, p2 = 0, p98 = 255, mean = 0;
    for (i = 0; i < 256; i++) { acc += hist[i]; mean += hist[i] * i; if (acc / n < 0.02) p2 = i; if (acc / n <= 0.98) p98 = i; }
    mean /= n * 255;
    var wsum = 0, wx = 0, wy = 0, wxx = 0, wyy = 0, th = null;
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      var k = y * w + x;
      var gx = (Y[k - w + 1] + 2 * Y[k + 1] + Y[k + w + 1]) - (Y[k - w - 1] + 2 * Y[k - 1] + Y[k + w - 1]);
      var gy = (Y[k + w - 1] + 2 * Y[k + w] + Y[k + w + 1]) - (Y[k - w - 1] + 2 * Y[k - w] + Y[k - w + 1]);
      var mag = Math.hypot(gx, gy);
      var cxn = x / w, cyn = y / h, prior = Math.exp(-((cxn - 0.5) * (cxn - 0.5) + (cyn - 0.5) * (cyn - 0.5)) / 0.18);
      var wgt = mag * prior; wsum += wgt; wx += wgt * cxn; wy += wgt * cyn; wxx += wgt * cxn * cxn; wyy += wgt * cyn * cyn;
    }
    var mxn = wsum ? wx / wsum : 0.5, myn = wsum ? wy / wsum : 0.5;
    var spread = wsum ? Math.sqrt(Math.max(0, wxx / wsum - mxn * mxn) + Math.max(0, wyy / wsum - myn * myn)) : 0.3;
    var tl = tiltOf(src);
    return { p2: p2, p98: p98, mean: mean, sat: ss / n, r: sr / n, g: sg / n, b: sb / n, cx: mxn, cy: myn, spread: spread, tilt: tl.tilt, conf: tl.conf };
  }
  /* perkiraan kemiringan: cari sudut (±10°) yang membuat tepi horizontal/vertikal paling "menumpuk" (profil proyeksi) */
  function tiltOf(src) {
    var s = Math.min(1, 360 / Math.max(src.width, src.height)), w = Math.max(32, Math.round(src.width * s)), h = Math.max(32, Math.round(src.height * s));
    var c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true }); c.width = w; c.height = h;
    g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data, Y = new Float32Array(w * h), i, x, y;
    for (i = 0; i < w * h; i++) Y[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    var GY = new Float32Array(w * h), GX = new Float32Array(w * h);
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { var k = y * w + x; GY[k] = Y[k + w] - Y[k - w]; GX[k] = Y[k + 1] - Y[k - 1]; }
    var N = 41, sc = new Float64Array(N), cxm = w / 2, cym = h / 2, span = w + h + 40, bins = new Float64Array(span * 2), a, t, bi, bk;
    for (a = 0; a < N; a++) {
      t = Math.tan((-10 + a * 0.5) * RAD); var tot = 0;
      bins.fill(0);
      for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { bk = Math.round(y - (x - cxm) * t) + 20; if (bk >= 0 && bk < span) bins[bk] += GY[y * w + x]; }
      for (bi = 0; bi < span; bi++) tot += bins[bi] * bins[bi];
      bins.fill(0);
      for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { bk = Math.round(x + (y - cym) * t) + 20; if (bk >= 0 && bk < span) bins[bk] += GX[y * w + x]; }
      for (bi = 0; bi < span; bi++) tot += bins[bi] * bins[bi];
      sc[a] = tot;
    }
    var best = 0, mean = 0; for (a = 0; a < N; a++) { mean += sc[a]; if (sc[a] > sc[best]) best = a; } mean /= N;
    var conf = mean ? sc[best] / mean - 1 : 0;
    return { tilt: -10 + best * 0.5, conf: best === 0 || best === N - 1 ? 0 : conf };
  }
  function buildGrade() {
    if (!S.src) { S.graded = null; S.bg = null; return; }
    var a = S.an, s = S.aeStr / 100, src = S.src;
    if (!S.aeOn || s <= 0 || !a) S.graded = src;
    else {
      var bp = Math.min(a.p2, 60) * 0.85 * s, wp = 255 - Math.min(255 - a.p98, 60) * 0.85 * s;
      var meanN = clamp((a.mean * 255 - bp) / Math.max(40, wp - bp), 0.06, 0.94);
      var gam = clamp(Math.log(0.46) / Math.log(meanN), 0.78, 1.28), e = 1 + (gam - 1) * s * 0.85, kc = 0.34 * s, lut = new Uint8ClampedArray(256), i;
      for (i = 0; i < 256; i++) {
        var v = clamp((i - bp) / Math.max(40, wp - bp), 0, 1); v = Math.pow(v, e);
        v = v * (1 - kc) + (v * v * (3 - 2 * v)) * kc;
        if (v > 0.8) v = 0.8 + (v - 0.8) * (1 - 0.35 * s);
        lut[i] = v * 255;
      }
      var sk = clamp(1 + (0.36 - a.sat) * 1.4, 0.92, 1.28), satK = 1 + (sk - 1) * s + 0.04 * s, mAvg = (a.r + a.g + a.b) / 3;
      var gr = 1 + (clamp(mAvg / Math.max(a.r, 1), 0.94, 1.06) - 1) * 0.5 * s, gg2 = 1 + (clamp(mAvg / Math.max(a.g, 1), 0.94, 1.06) - 1) * 0.5 * s, gb = 1 + (clamp(mAvg / Math.max(a.b, 1), 0.94, 1.06) - 1) * 0.5 * s;
      var mr = gr * (1 + 0.025 * s), mg = gg2, mb = gb * (1 - 0.03 * s);
      var c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
      var g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(src, 0, 0);
      var im = g.getImageData(0, 0, c.width, c.height), d = im.data, n = d.length;
      for (i = 0; i < n; i += 4) {
        var r = lut[d[i]], gc = lut[d[i + 1]], b = lut[d[i + 2]], l = 0.2126 * r + 0.7152 * gc + 0.0722 * b;
        var mx = Math.max(r, gc, b), mn = Math.min(r, gc, b), ps = mx ? (mx - mn) / mx : 0, f = 1 + (satK - 1) * (0.5 + 0.5 * (1 - ps));
        d[i] = (l + (r - l) * f) * mr; d[i + 1] = (l + (gc - l) * f) * mg; d[i + 2] = (l + (b - l) * f) * mb;
      }
      g.putImageData(im, 0, 0); S.graded = c;
    }
    var bgc = document.createElement("canvas"); bgc.width = 28; bgc.height = Math.max(8, Math.round(28 * S.graded.height / S.graded.width));
    bgc.getContext("2d").drawImage(S.graded, 0, 0, bgc.width, bgc.height); S.bg = bgc;
  }
  var gradeT = 0;
  function scheduleGrade() { clearTimeout(gradeT); gradeT = setTimeout(function () { buildGrade(); redraw(); }, 30); }

  /* ---------- crop pintar dan luruskan ---------- */
  function smartCrop() {
    if (!S.src || !S.an) return false;
    var d = dims(), r = photoRect(d[0], d[1]), a = S.an, src = S.src;
    S.zoom = clamp(1 + (0.3 - a.spread) * 1.3, 1, 1.35);
    var sc = coverScale(r.w, r.h, src, S.rot * RAD) * S.zoom;
    var tx = a.cx < 0.4 ? -r.w * 0.1 : a.cx > 0.6 ? r.w * 0.1 : 0, ty = -r.h * 0.05;
    S.ox = tx - (a.cx - 0.5) * src.width * sc; S.oy = ty - (a.cy - 0.5) * src.height * sc;
    return true;
  }
  function autoStraight() {
    if (!S.an) return null;
    if (S.an.conf < 0.2 || Math.abs(S.an.tilt) < 0.5) { S.rot = 0; return 0; }
    S.rot = clamp(-S.an.tilt, -6, 6); return S.rot;
  }

  /* ---------- susun template ---------- */
  function mkBlock(role, o) {
    return Object.assign({ id: ++uid, kind: "text", role: role, text: "", x: 0.5, y: 0.5, w: 0.84, size: 0.05, font: "Inter", weight: 400, color: "#ffffff", auto: false, align: "left", track: 0, lead: 120, rot: 0, caps: false, italic: false, shadow: false, hi: "", hiColor: "#ffd166", accent: false, moved: false, prefix: "" }, o);
  }
  function typo(role) { var p = PAIRS[S.pair || TPLPAIR[S.tpl]][role]; return { font: p.f, weight: p.w, track: p.tr, lead: p.ld }; }
  function fitB(b, maxLines, W, min) { var n = 0; while (lay(b, W).lines.length > maxLines && b.size > (min || 0.028) && n++ < 40) b.size *= 0.94; }
  function buildRoles() {
    var d = dims(), W = d[0], H = d[1], K = S.size / 100, t = S.tpl, pad = 0.08, M = function (b) { return lay(b, W).h; };
    var head = mkBlock("head", Object.assign({ text: S.head, size: 0.07 * K }, typo("head")));
    var sub = mkBlock("sub", Object.assign({ text: S.sub, size: 0.034 }, typo("sub")));
    var hd = mkBlock("hd", Object.assign({ text: S.handle, size: 0.026 }, typo("hd")));
    var rule = mkBlock("acc", { kind: "rule", w: 0.11, size: 0.0093, color: S.acc, accent: true });
    var out = [], cur;
    function stack(list, top) { cur = top; list.forEach(function (it) { var b = it[0], h = M(b); b.y = (cur + h / 2) / H; cur += h + (it[1] || 0); }); return cur - top; }
    function stackBottom(list, bottom) { var total = 0; list.forEach(function (it) { total += M(it[0]) + (it[1] || 0); }); total -= list[list.length - 1][1] || 0; stack(list, bottom - total); }
    if (t === "polaroid") {
      var g = polGeom(W, H), bw = g.pw / W * 0.94;
      [head, sub, hd].forEach(function (b) { b.w = bw; b.align = "center"; });
      head.color = "#2b2b2b"; sub.color = "#6b6b6b"; hd.color = "#8d8d8d"; head.size = 0.064 * K; sub.size = 0.03; hd.size = 0.023;
      var gap = W * 0.008, total, n = 0;
      do { fitB(head, 2, W, 0.03); total = M(head) + gap + M(sub) + gap + M(hd); if (total > g.strip * 0.94) head.size *= 0.93; n++; } while (total > g.strip * 0.94 && n < 12);
      var top = g.ch / 2 - g.strip + (g.strip - total) / 2, ys = [[head, M(head)], [sub, M(sub)], [hd, M(hd)]], ly = top;
      ys.forEach(function (it) {
        var c = ly + it[1] / 2; it[0].x = (g.cx - c * Math.sin(g.ang)) / W; it[0].y = (g.cy + c * Math.cos(g.ang)) / H; it[0].rot = g.ang / RAD; ly += it[1] + gap;
      });
      out = [head, sub, hd];
    } else if (t === "bold") {
      head.align = "left"; head.size = 0.078 * K; head.w = 0.84; fitB(head, 4, W); sub.w = 0.84; sub.color = "#ececf0"; fitB(sub, 2, W);
      hd.align = "right"; hd.w = 0.84; hd.color = "#d0d0d8";
      stackBottom([[head, W * 0.02], [sub, W * 0.025], [hd, 0]], H * 0.93);
      rule.x = pad + 0.055; rule.y = (head.y * H - M(head) / 2 - W * 0.035) / H;
      out = [rule, head, sub, hd];
    } else if (t === "center") {
      head.align = sub.align = hd.align = "center"; head.caps = true; head.size = 0.07 * K; head.w = 0.8; sub.w = 0.74; fitB(head, 5, W); fitB(sub, 3, W); hd.w = 0.8; hd.color = "#d0d0d8";
      rule.x = 0.5; rule.w = 0.14; var hh = M(head), sh = M(sub), tot = hh + W * 0.05 + sh, t0 = H * 0.47 - tot / 2;
      head.y = (t0 + hh / 2) / H; rule.y = (t0 + hh + W * 0.025) / H; sub.y = (t0 + hh + W * 0.05 + sh / 2) / H; hd.y = (H - W * 0.06) / H;
      out = [head, rule, sub, hd];
    } else if (t === "editorial") {
      var pt = H * 0.6 + 10; head.color = "#0b0b0f"; head.size = 0.062 * K; head.w = 0.84; fitB(head, 4, W); sub.color = "#4d4d58"; sub.w = 0.84; fitB(sub, 3, W);
      hd.caps = true; hd.color = ensureContrast(S.acc, "#ffffff", 4.5); hd.accent = true; hd.w = 0.84; hd.size = 0.024;
      stack([[hd, W * 0.025], [head, W * 0.02], [sub, 0]], pt + W * 0.06);
      out = [hd, head, sub];
    } else if (t === "poster") {
      head.caps = true; head.size = 0.1 * K; head.w = 0.84; fitB(head, 6, W); sub.size = 0.036; sub.w = 0.62; fitB(sub, 3, W); hd.align = "right"; hd.w = 0.84;
      head.y = (W * 0.08 + M(head) / 2) / H; sub.y = (H - W * 0.09 - M(sub) / 2) / H; sub.x = 0.5 - 0.84 / 2 + 0.62 / 2; hd.y = (H - W * 0.06) / H;
      out = [head, sub, hd];
    } else if (t === "quote") {
      var qm = mkBlock("qm", { text: "“", font: "Playfair Display", weight: 700, size: 0.22, w: 0.3, align: "center", color: S.acc, accent: true, lead: 100 });
      head.align = sub.align = hd.align = "center"; head.italic = true; head.size = 0.056 * K; head.w = 0.76; fitB(head, 7, W); sub.prefix = "— "; sub.w = 0.76; sub.weight = 700; sub.size = 0.03; hd.w = 0.8; hd.color = "#d0d0d8";
      var qh = M(qm) * 0.55, hhh = M(head), shh = M(sub), tq = qh + W * 0.01 + hhh + W * 0.03 + shh, q0 = H * 0.5 - tq / 2;
      qm.y = (q0 + qh / 2 + W * 0.04) / H; head.y = (q0 + qh + W * 0.01 + hhh / 2) / H; sub.y = (q0 + qh + W * 0.04 + hhh + shh / 2) / H; hd.y = (H - W * 0.06) / H;
      out = [qm, head, sub, hd];
    } else {
      head.size = 0.052 * K; head.w = 0.72; head.x = 0.5 - 0.84 / 2 + 0.72 / 2; sub.w = 0.66; sub.x = head.x - 0.72 / 2 + 0.66 / 2; sub.color = "#ececf0"; fitB(head, 5, W); fitB(sub, 3, W);
      hd.align = "center"; hd.w = 0.6; hd.size = 0.024;
      stack([[head, W * 0.02], [sub, 0]], W * 0.11); hd.y = (H - W * 0.095) / H;
      out = [head, sub, hd];
    }
    out.forEach(function (b) { if (b.role === "head") b.baseSize = 0.07 * K; });
    return out;
  }
  function applyTemplate() {
    var custom = S.blocks.filter(function (b) { return !ROLES[b.role]; });
    S.blocks = buildRoles().concat(custom); if (S.sel && !S.blocks.some(function (b) { return b.id === S.sel; })) S.sel = null;
    tbFill(); redraw();
  }
  function roleMoved() { return S.blocks.some(function (b) { return b.moved && ROLES[b.role]; }); }
  function byRole(r) { for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].role === r) return S.blocks[i]; return null; }

  function autoLayout() { /* tempatkan headline di area paling tenang dan pilih warna terbaca */
    var d = dims(), W = d[0], H = d[1], head = byRole("head"), sub = byRole("sub"), hd = byRole("hd");
    if (!head) return;
    if (S.tpl === "polaroid" || S.tpl === "editorial") { S.blocks.forEach(function (b) { if (ROLES[b.role]) b.moved = false; }); applyTemplate(); return; }
    cx.clearRect(0, 0, W, H); drawBase(cx, W, H);
    var c = document.createElement("canvas"); c.width = 48; c.height = Math.round(48 * H / W);
    var g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(cv, 0, 0, c.width, c.height);
    var px = g.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height, Y = [], i, x, y;
    for (i = 0; i < w * h; i++) Y.push(0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]);
    var hh = lay(head, W).h + (sub ? lay(sub, W).h + W * 0.02 : 0), best = null;
    [0.2, 0.5, 0.8].forEach(function (cy) {
      var y0 = clamp(Math.round((cy * H - hh / 2) / H * h), 0, h - 2), y1 = clamp(Math.round((cy * H + hh / 2) / H * h), y0 + 1, h), s = 0, n = 0;
      for (y = y0; y < y1 - 1; y++) for (x = 1; x < w - 1; x++) { s += Math.abs(Y[y * w + x + 1] - Y[y * w + x - 1]) + Math.abs(Y[(y + 1) * w + x] - Y[y * w + x]); n++; }
      var score = s / Math.max(1, n) + (cy === 0.8 ? -4 : 0);
      if (!best || score < best.score) best = { cy: cy, score: score };
    });
    var top = clamp(best.cy * H - hh / 2, W * 0.07, H - hh - W * 0.07);
    head.x = 0.5; head.y = (top + lay(head, W).h / 2) / H; head.moved = true;
    if (sub) { sub.x = 0.5; sub.y = (top + lay(head, W).h + W * 0.02 + lay(sub, W).h / 2) / H; sub.moved = true; }
    var rl = byRole("acc"); if (rl) { rl.y = (top - W * 0.03) / H; }
    [head, sub].forEach(function (b) { if (b) autoColor(b); });
    if (hd) { hd.y = (H - W * 0.06) / H; autoColor(hd); }
    tbFill(); redraw();
  }

  /* ---------- riwayat urungkan ---------- */
  var hist = [], fut = [];
  var SNAP = ["fmt", "plat", "tpl", "pair", "head", "sub", "handle", "acc", "size", "zoom", "ox", "oy", "rot", "aeOn", "aeStr", "polRot", "sel"];
  function snap() { var o = {}; SNAP.forEach(function (k) { o[k] = S[k]; }); o.blocks = S.blocks; return JSON.stringify(o); }
  function commit() { var s = snap(); if (hist[hist.length - 1] !== s) { hist.push(s); if (hist.length > 80) hist.shift(); fut.length = 0; } undoBtns(); }
  function restore(js) {
    var o = JSON.parse(js); SNAP.forEach(function (k) { S[k] = o[k]; }); S.blocks = o.blocks;
    syncUI(); tbFill(); setCanvasSize(); scheduleGrade(); redraw();
  }
  function undo() { if (hist.length < 2) return; fut.push(hist.pop()); restore(hist[hist.length - 1]); undoBtns(); }
  function redo() { if (!fut.length) return; var s = fut.pop(); hist.push(s); restore(s); undoBtns(); }
  function undoBtns() { $("#undoBtn").disabled = hist.length < 2; $("#redoBtn").disabled = !fut.length; }

  /* ---------- UI ---------- */
  var msg = $("#msg"), toastT = 0;
  function say(t, bad) { msg.textContent = t || ""; msg.style.color = bad ? "#c0262d" : ""; }
  function toast(t) { var el = $("#sxToast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, 2600); }
  function press(box, attr, val) { $$("[" + attr + "]", box).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute(attr) === val ? "true" : "false"); }); }
  function setCanvasSize() {
    var d = dims(); cv.width = d[0]; cv.height = d[1]; ov.width = d[0]; ov.height = d[1];
    $("#media").style.aspectRatio = d[0] + " / " + d[1];
    $("#card").setAttribute("data-p", S.plat);
  }
  function syncUI() {
    $("#head").value = S.head; $("#sub").value = S.sub; $("#handle").value = S.handle; $("#acc").value = S.acc; $("#size").value = S.size;
    $("#zoom").value = S.zoom; $("#rotation").value = S.rot; $("#rotVal").textContent = (+S.rot).toFixed(1).replace(/\.0$/, "") + "°";
    $("#aeOn").checked = S.aeOn; $("#aeStr").value = S.aeStr; $("#aeVal").textContent = S.aeStr; $("#polRot").checked = S.polRot; $("#pairSel").value = S.pair;
    press($("#fmt"), "data-f", S.fmt); press($("#tpl"), "data-t", S.tpl); press($("#plat"), "data-p", S.plat);
    var h = (S.handle || "@akunmu").replace(/^@/, ""); $("#cname").textContent = h; $("#capName").textContent = h; $("#av").textContent = h.slice(0, 2).toLowerCase();
    liveCap();
  }
  function bindVal(id, key, num, after) {
    var el = $(id); el.addEventListener("input", function () { S[key] = num ? +el.value : el.value; if (after) after(); redraw(); });
    el.addEventListener("change", commit);
  }
  function textSync(key, role) {
    return function () {
      var b = byRole(role); if (b) b.text = S[key];
      if (!roleMoved()) applyTemplate();
      if (S.sel) tbFill(true);
    };
  }
  bindVal("#head", "head", false, textSync("head", "head")); bindVal("#sub", "sub", false, textSync("sub", "sub"));
  bindVal("#handle", "handle", false, function () { textSync("handle", "hd")(); syncUI(); });
  bindVal("#acc", "acc", false, function () { S.blocks.forEach(function (b) { if (b.accent) b.color = (b.kind === "text" && b.role === "hd") ? ensureContrast(S.acc, "#ffffff", 4.5) : S.acc; }); });
  bindVal("#size", "size", true, function () { var h = byRole("head"); if (h && !h.moved) applyTemplate(); else if (h) h.size = (h.baseSize || 0.07) * S.size / 100; });
  bindVal("#zoom", "zoom", true);
  $("#rotation").addEventListener("input", function () { S.rot = +this.value; $("#rotVal").textContent = S.rot.toFixed(1).replace(/\.0$/, "") + "°"; redraw(); });
  $("#rotation").addEventListener("change", commit);
  $("#aeOn").addEventListener("change", function () { S.aeOn = this.checked; scheduleGrade(); commit(); });
  $("#aeStr").addEventListener("input", function () { S.aeStr = +this.value; $("#aeVal").textContent = S.aeStr; scheduleGrade(); });
  $("#aeStr").addEventListener("change", commit);
  $("#polRot").addEventListener("change", function () { S.polRot = this.checked; applyTemplate(); commit(); });
  $("#pairSel").addEventListener("change", function () {
    S.pair = this.value; var key = S.pair || TPLPAIR[S.tpl], p = PAIRS[key], d = dims();
    S.blocks.forEach(function (b) { var q = p[b.role]; if (q) { b.font = q.f; b.weight = q.w; b.track = q.tr; b.lead = q.ld; if (b.role === "head") fitB(b, 6, d[0]); } });
    loadFonts(); tbFill(); redraw(); commit();
  });
  $("#fmt").addEventListener("click", function (e) {
    var b = e.target.closest("[data-f]"); if (!b) return; S.fmt = b.getAttribute("data-f");
    S.plat = S.fmt === "1:1" ? "th" : S.fmt === "9:16" ? "tt" : "ig"; S.ox = 0; S.oy = 0; setCanvasSize(); syncUI(); applyTemplate(); if (S.img) smartCrop(); commit(); redraw();
  });
  $("#plat").addEventListener("click", function (e) {
    var b = e.target.closest("[data-p]"); if (!b) return; S.plat = b.getAttribute("data-p"); S.fmt = PLAT[S.plat]; S.ox = 0; S.oy = 0;
    setCanvasSize(); syncUI(); applyTemplate(); if (S.img) smartCrop(); commit(); redraw();
  });
  $("#tpl").addEventListener("click", function (e) {
    var b = e.target.closest("[data-t]"); if (!b) return; S.tpl = b.getAttribute("data-t");
    S.blocks = S.blocks.filter(function (x) { return !ROLES[x.role]; }); S.ox = 0; S.oy = 0; syncUI(); loadFonts(); applyTemplate();
    if (S.img) smartCrop(); commit(); redraw();
  });
  $("#autoLayout").addEventListener("click", function () { autoLayout(); commit(); toast("Teks disusun ulang ke area yang paling tenang."); });
  $("#popAuto").addEventListener("click", function () { popToggle(false); autoLayout(); commit(); });

  /* foto */
  function loadImage(f) {
    if (!/^image\//.test(f.type)) { say("File harus berupa gambar (JPG, PNG, atau WebP).", true); return; }
    if (f.size > 15 * 1024 * 1024) { say("Ukuran foto maksimal 15 MB.", true); return; }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      URL.revokeObjectURL(url);
      var sc = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc));
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      S.img = im; S.src = c; S.an = analyze(c); S.zoom = 1; S.ox = 0; S.oy = 0; S.rot = 0;
      var notes = [], r = autoStraight(); if (r) notes.push("diluruskan " + Math.abs(r).toFixed(1) + "°"); smartCrop(); notes.push("crop ke objek utama");
      if (S.aeOn) notes.push("warna dan cahaya dirapikan");
      buildGrade(); $("#empty").hidden = true; syncUI(); applyTemplate(); if (S.tpl !== "polaroid") autoLayout(); commit(); redraw();
      say("Otomatis: " + notes.join(", ") + ". Semua bisa diubah di panel kanan.");
    };
    im.onerror = function () { URL.revokeObjectURL(url); say("Foto tidak bisa dibuka. Coba file lain.", true); };
    im.src = url;
  }
  $("#file").addEventListener("change", function () { var f = this.files && this.files[0]; if (f) loadImage(f); });
  function clearPhoto() { S.img = S.src = S.graded = S.bg = S.an = null; S.zoom = 1; S.ox = S.oy = S.rot = 0; $("#file").value = ""; $("#empty").hidden = false; syncUI(); redraw(); }
  $("#clear").addEventListener("click", function () { clearPhoto(); say(""); commit(); });
  $("#resetPhoto").addEventListener("click", function () { S.zoom = 1; S.ox = S.oy = S.rot = 0; syncUI(); redraw(); commit(); });
  $("#smartCrop").addEventListener("click", function () { if (!S.img) { say("Pilih foto dulu.", true); return; } smartCrop(); syncUI(); redraw(); commit(); say("Crop disesuaikan ke objek utama."); });
  $("#autoStraight").addEventListener("click", function () {
    if (!S.img) { say("Pilih foto dulu.", true); return; }
    var r = autoStraight(); syncUI(); redraw(); commit();
    say(r ? "Foto diluruskan " + Math.abs(r).toFixed(1) + "° (perkiraan). Geser slider kalau kurang pas." : "Tidak ada kemiringan yang jelas terdeteksi.");
  });
  var dropT = $("#media");
  dropT.addEventListener("dragover", function (e) { e.preventDefault(); });
  dropT.addEventListener("drop", function (e) { e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadImage(f); });

  /* ---------- toolbar teks ---------- */
  function selBlock() { for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].id === S.sel) return S.blocks[i]; return null; }
  var tb = $("#tb"), rows = Array.prototype.slice.call(tb.children);
  function tbFill(light) {
    var b = selBlock(); tb.hidden = !b; drawOv(); if (!b) return;
    var isT = b.kind === "text";
    if (!$("#bFont").options.length) Object.keys(FONTS).forEach(function (n) { var o = document.createElement("option"); o.value = n; o.textContent = n; $("#bFont").appendChild(o); });
    if (!light || document.activeElement !== $("#btext")) $("#btext").value = b.text;
    $("#btext").hidden = !isT; $("#bFont").hidden = !isT; $("#bWeight").hidden = !isT; $("#bAutoColor").hidden = !isT;
    rows[3].hidden = !isT; rows[4].hidden = !isT;
    ["bSize", "bTrack", "bLead"].forEach(function (id) { $("#" + id).parentNode.hidden = !isT; });
    $("#bFont").value = b.font; $("#bWeight").value = b.weight; $("#bColor").value = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#ffffff"; $("#bColor").hidden = b.kind === "logo";
    $("#bSize").value = b.size * 100; $("#bWidth").value = b.w * 100; $("#bTrack").value = b.track / 10; $("#bLead").value = b.lead; $("#bRot").value = b.rot;
    $$("#bAlign button").forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-a") === b.align ? "true" : "false"); });
    $("#bCaps").setAttribute("aria-pressed", b.caps); $("#bItalic").setAttribute("aria-pressed", b.italic); $("#bShadow").setAttribute("aria-pressed", b.shadow);
    $("#bHi").value = b.hi; $("#bHiColor").value = b.hiColor;
  }
  function edit(fn, text) {
    var b = selBlock(); if (!b) return; fn(b); b.moved = true;
    if (text && (b.role === "head" || b.role === "sub" || b.role === "hd")) {
      var k = b.role === "head" ? "head" : b.role === "sub" ? "sub" : "handle"; S[k] = b.text; $("#" + k).value = b.text;
    }
    redraw(); drawOv();
  }
  $("#btext").addEventListener("input", function () { var v = this.value; edit(function (b) { b.text = v; }, true); });
  $("#btext").addEventListener("change", commit);
  $("#bFont").addEventListener("change", function () { var v = this.value; edit(function (b) { b.font = v; }); loadFonts(); commit(); });
  $("#bWeight").addEventListener("change", function () { var v = +this.value; edit(function (b) { b.weight = v; }); loadFonts(); commit(); });
  $("#bColor").addEventListener("input", function () { var v = this.value; edit(function (b) { b.color = v; b.auto = false; b.accent = false; }); });
  $("#bColor").addEventListener("change", commit);
  $("#bAutoColor").addEventListener("click", function () { var b = selBlock(); if (!b) return; var r = autoColor(b); b.auto = true; b.moved = true; tbFill(); redraw(); commit(); toast("Warna dipilih otomatis (kontras " + r.toFixed(1) + ":1)."); });
  [["bSize", function (b, v) { b.size = v / 100; }], ["bWidth", function (b, v) { b.w = v / 100; }], ["bTrack", function (b, v) { b.track = v * 10; }], ["bLead", function (b, v) { b.lead = v; }], ["bRot", function (b, v) { b.rot = v; }]].forEach(function (a) {
    var el = $("#" + a[0]); el.addEventListener("input", function () { var v = +el.value; edit(function (b) { a[1](b, v); }); }); el.addEventListener("change", commit);
  });
  $$("#bAlign button").forEach(function (x) { x.addEventListener("click", function () { var v = x.getAttribute("data-a"); edit(function (b) { b.align = v; }); tbFill(); commit(); }); });
  [["bCaps", "caps"], ["bItalic", "italic"], ["bShadow", "shadow"]].forEach(function (a) {
    $("#" + a[0]).addEventListener("click", function () { edit(function (b) { b[a[1]] = !b[a[1]]; }); tbFill(); loadFonts(); commit(); });
  });
  $("#bHi").addEventListener("input", function () { var v = this.value; edit(function (b) { b.hi = v; }); }); $("#bHi").addEventListener("change", commit);
  $("#bHiColor").addEventListener("input", function () { var v = this.value; edit(function (b) { b.hiColor = v; }); }); $("#bHiColor").addEventListener("change", commit);
  function delSel() { var b = selBlock(); if (!b) return; S.blocks = S.blocks.filter(function (x) { return x !== b; }); S.sel = null; tbFill(); redraw(); commit(); }
  $("#bDel").addEventListener("click", delSel);
  $("#bDone").addEventListener("click", function () { S.sel = null; tbFill(); });
  $("#bDup").addEventListener("click", function () { var b = selBlock(); if (!b) return; var c = Object.assign({}, b, { id: ++uid, role: "custom", x: clamp(b.x + 0.03, 0, 1), y: clamp(b.y + 0.03, 0, 1), accent: false, moved: true }); S.blocks.push(c); S.sel = c.id; tbFill(); redraw(); commit(); });
  function addText() {
    var p = PAIRS[S.pair || TPLPAIR[S.tpl]].sub;
    var b = mkBlock("custom", { text: "Teks baru", x: 0.5, y: 0.5, w: 0.6, size: 0.06, font: p.f, weight: 700, align: "center", auto: true, moved: true, track: p.tr, lead: 115 });
    S.blocks.push(b); autoColor(b); S.sel = b.id; tbFill(); redraw(); commit(); loadFonts();
    setTimeout(function () { $("#btext").focus(); $("#btext").select(); }, 30);
  }
  $("#addText").addEventListener("click", addText); $("#plusBtn").addEventListener("click", addText);
  $("#addRule").addEventListener("click", function () { var b = mkBlock("custom", { kind: "rule", w: 0.2, size: 0.006, x: 0.5, y: 0.5, color: S.acc, accent: true, moved: true }); S.blocks.push(b); S.sel = b.id; tbFill(); redraw(); commit(); });

  /* ---------- interaksi kanvas ---------- */
  var mode = null;
  function pt(e) { var r = (mode && mode.rect) || ov.getBoundingClientRect(), d = dims(); return { x: (e.clientX - r.left) * d[0] / r.width, y: (e.clientY - r.top) * d[1] / r.height, k: d[0] / r.width }; }
  function toLocal(b, p, W, H) { var dx = p.x - b.x * W, dy = p.y - b.y * H, a = -b.rot * RAD; return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) }; }
  function hit(b, p, W, H, pad) { var g = geo(b, W, H), l = toLocal(b, p, W, H); return Math.abs(l.x) <= g.bw / 2 + pad && Math.abs(l.y) <= g.h / 2 + pad; }
  ov.addEventListener("pointerdown", function (e) {
    var d = dims(), W = d[0], H = d[1], p = pt(e), b = selBlock(), r = 26 * p.k, i;
    ov.setPointerCapture(e.pointerId); e.preventDefault(); var rect0 = ov.getBoundingClientRect();
    if (b) {
      var g = geo(b, W, H), l = toLocal(b, p, W, H);
      if (Math.hypot(l.x - g.bw / 2, l.y - g.h / 2) < r) { mode = { rect: rect0, t: "resize", b: b, d0: Math.max(10, Math.hypot(p.x - b.x * W, p.y - b.y * H)), s0: b.size, w0: b.w }; return; }
      if (Math.hypot(l.x, l.y + g.h / 2 + 42 * p.k) < r) { mode = { rect: rect0, t: "rotate", b: b }; return; }
    }
    for (i = S.blocks.length - 1; i >= 0; i--) if (hit(S.blocks[i], p, W, H, 10 * p.k)) {
      var t = S.blocks[i]; S.sel = t.id; mode = { rect: rect0, t: "move", b: t, sx: p.x, sy: p.y, bx: t.x, by: t.y, moved: false }; tbFill(); return;
    }
    S.sel = null; tbFill();
    mode = S.img ? { rect: rect0, t: "pan", sx: p.x, sy: p.y, ox: S.ox, oy: S.oy } : null;
  });
  ov.addEventListener("pointermove", function (e) {
    if (!mode) return; var d = dims(), W = d[0], H = d[1], p = pt(e), b = mode.b;
    if (mode.t === "pan") { S.ox = mode.ox + (p.x - mode.sx); S.oy = mode.oy + (p.y - mode.sy); redraw(); return; }
    if (mode.t === "move") {
      var nx = mode.bx + (p.x - mode.sx) / W, ny = mode.by + (p.y - mode.sy) / H; guides = { x: null, y: null };
      if (!e.altKey) {
        var th = 10 * p.k, gp = geo(b, W, H), xs = [0.5], ys = [0.5];
        S.blocks.forEach(function (o) { if (o !== b) { xs.push(o.x); ys.push(o.y); } });
        xs.push(0.08 + gp.bw / W / 2, 0.92 - gp.bw / W / 2); ys.push(0.08 * W / H + gp.h / H / 2, 1 - 0.08 * W / H - gp.h / H / 2);
        xs.forEach(function (v) { if (Math.abs(nx - v) * W < th) { nx = v; guides.x = v; } }); ys.forEach(function (v) { if (Math.abs(ny - v) * H < th) { ny = v; guides.y = v; } });
      }
      b.x = clamp(nx, 0, 1); b.y = clamp(ny, 0, 1); b.moved = true; mode.moved = true; redraw(); return;
    }
    if (mode.t === "resize") {
      var kk = Math.hypot(p.x - b.x * W, p.y - b.y * H) / mode.d0; b.size = clamp(mode.s0 * kk, 0.012, 0.22); b.w = clamp(mode.w0 * kk, 0.1, 0.98); b.moved = true; mode.moved = true; redraw(); return;
    }
    if (mode.t === "rotate") {
      var a = Math.atan2(p.y - b.y * H, p.x - b.x * W) / RAD + 90; a = ((a + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(a) < 3) a = 0; b.rot = clamp(a, -180, 180); b.moved = true; mode.moved = true; redraw();
    }
  });
  function endDrag() {
    if (!mode) return; var m = mode; mode = null; guides = { x: null, y: null };
    if (m.t === "pan") { syncUI(); commit(); }
    else if (m.moved) { if (m.b.auto) autoColor(m.b); tbFill(true); commit(); }
    redraw();
  }
  ov.addEventListener("pointerup", endDrag); ov.addEventListener("pointercancel", endDrag);
  ov.addEventListener("dblclick", function () { var b = selBlock(); if (b && b.kind === "text") { $("#btext").focus(); $("#btext").select(); } });
  ov.addEventListener("wheel", function (e) { if (!S.img || !e.ctrlKey) return; e.preventDefault(); S.zoom = clamp(S.zoom - e.deltaY * 0.002, 1, 3); $("#zoom").value = S.zoom; redraw(); }, { passive: false });
  function drawOv() {
    var d = dims(), W = d[0], H = d[1]; oc.clearRect(0, 0, W, H);
    if (guides.x != null || guides.y != null) {
      oc.save(); oc.strokeStyle = "#ff4d8d"; oc.lineWidth = 2; oc.setLineDash([10, 8]);
      if (guides.x != null) { oc.beginPath(); oc.moveTo(guides.x * W, 0); oc.lineTo(guides.x * W, H); oc.stroke(); }
      if (guides.y != null) { oc.beginPath(); oc.moveTo(0, guides.y * H); oc.lineTo(W, guides.y * H); oc.stroke(); }
      oc.restore();
    }
    var b = selBlock(); if (!b) return; var g = geo(b, W, H), k = W / (ov.getBoundingClientRect().width || W);
    oc.save(); oc.translate(b.x * W, b.y * H); oc.rotate(b.rot * RAD);
    oc.strokeStyle = "#4f8cff"; oc.lineWidth = 2 * k; oc.setLineDash([8 * k, 6 * k]); oc.strokeRect(-g.bw / 2, -g.h / 2, g.bw, g.h); oc.setLineDash([]);
    oc.fillStyle = "#fff"; oc.lineWidth = 2.5 * k;
    oc.beginPath(); oc.arc(g.bw / 2, g.h / 2, 9 * k, 0, 7); oc.fill(); oc.stroke();
    oc.beginPath(); oc.moveTo(0, -g.h / 2); oc.lineTo(0, -g.h / 2 - 42 * k); oc.stroke(); oc.beginPath(); oc.arc(0, -g.h / 2 - 42 * k, 9 * k, 0, 7); oc.fill(); oc.stroke();
    oc.restore();
  }
  var keyT = 0;
  document.addEventListener("keydown", function (e) {
    var tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.tagName === "SELECT");
    var rvOn = !$("#rvView").hidden;
    if ((e.ctrlKey || e.metaKey) && !typing && !rvOn) {
      if (e.key === "z" || e.key === "Z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (e.key === "y" || e.key === "Y") { e.preventDefault(); redo(); return; }
    }
    if (typing) return;
    if (rvOn) {
      if (e.key === "ArrowRight") { e.preventDefault(); rvDecide(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); rvDecide(-1); }
      else if (e.key === "Backspace" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z")) { e.preventDefault(); rvUndo(); }
      return;
    }
    var b = selBlock(); if (!b) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); delSel(); }
    else if (e.key === "Escape") { S.sel = null; tbFill(); }
    else if (/^Arrow/.test(e.key)) {
      e.preventDefault(); var st = e.shiftKey ? 0.02 : 0.004;
      if (e.key === "ArrowLeft") b.x -= st; else if (e.key === "ArrowRight") b.x += st; else if (e.key === "ArrowUp") b.y -= st; else b.y += st;
      b.moved = true; redraw(); clearTimeout(keyT); keyT = setTimeout(commit, 400);
    }
  });
  $("#undoBtn").addEventListener("click", undo); $("#redoBtn").addEventListener("click", redo);

  /* ---------- menu ---------- */
  var pop = $("#pop"), menuBtn = $("#menuBtn"), delArm = false;
  function popToggle(on) { pop.hidden = !on; menuBtn.setAttribute("aria-expanded", on ? "true" : "false"); if (!on) { $("#popDel").textContent = "Hapus post"; delArm = false; } }
  menuBtn.addEventListener("click", function (e) { e.stopPropagation(); popToggle(pop.hidden); });
  document.addEventListener("click", function (e) { if (!pop.hidden && !pop.contains(e.target)) popToggle(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { popToggle(false); menuBtn.focus(); } });
  $("#popNow").addEventListener("click", function () { popToggle(false); toast("Posting langsung belum tersedia. Unduh PNG lalu unggah manual."); });
  $("#popPlat").addEventListener("click", function () { popToggle(false); $("#plat button").focus(); });
  $("#popLogo").addEventListener("click", function () { popToggle(false); $("#logoFile").click(); });
  $("#popDel").addEventListener("click", function () {
    if (!delArm) { delArm = true; this.textContent = "Yakin? Klik lagi untuk menghapus"; return; }
    popToggle(false); clearPhoto(); S.head = "Judul kontenmu di sini"; S.sub = "Subteks singkat yang menjelaskan isinya"; S.blocks = []; S.sel = null; syncUI(); applyTemplate(); commit(); say("Post dihapus.");
  });
  $("#logoFile").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f || !/^image\//.test(f.type)) return; var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () { logoImg = im; var b = mkBlock("custom", { kind: "logo", w: 0.16, x: 0.86, y: 0.07, moved: true }); S.blocks = S.blocks.filter(function (x) { return x.kind !== "logo"; }); S.blocks.push(b); S.sel = b.id; tbFill(); redraw(); commit(); toast("Logo ditambahkan. Geser atau ubah ukurannya."); };
    im.src = url;
  });
  $("#schedBtn").addEventListener("click", function () { toast("Posting terjadwal segera hadir. Untuk sekarang, unduh PNG dulu."); });
  $("#schedTime").addEventListener("click", function () { toast("Posting terjadwal segera hadir."); });

  /* ---------- unduh (hanya kanvas media, tanpa garis bantu) ---------- */
  $("#dl").addEventListener("click", function () {
    draw();
    cv.toBlob(function (b) {
      if (!b) { say("Gagal membuat gambar. Coba ulangi.", true); return; }
      var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "nextaja-studio-" + S.fmt.replace(":", "x") + "-" + Date.now() + ".png";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      say("Gambar diunduh. Cek lagi teksnya sebelum diposting.");
    }, "image/png");
  });

  /* ---------- ide hook (templat, bukan AI) ---------- */
  var HOOKS = [
    ["{a}, ini 3 kesalahan {t} yang bikin hasilnya jalan di tempat.", 0], ["Jangan mulai {t} sebelum nonton ini.", 0], ["Kalau {t} kamu mentok, cek 1 hal ini dulu.", 0],
    ["Hal soal {t} yang jarang dibahas, padahal gampang.", 0], ["{t}: yang orang kira vs kenyataannya.", 0], ["Stop scroll. {a} perlu tahu soal {t}.", 0],
    ["3 langkah {t} buat {a}, tanpa ribet.", 0], ["Kenapa {t} kamu nggak naik? Mungkin ini sebabnya.", 0], ["Mitos {t} yang sebaiknya berhenti dipercaya.", 0],
    ["Aku coba {t} selama 30 hari. Ini hasilnya.", 1], ["Dulu aku salah soal {t}. Ini koreksinya.", 1], ["Cara aku beresin {t} dalam 7 hari.", 1]
  ];
  function fill(t, topic, aud) { var r = t.replace(/\{t\}/g, topic).replace(/\{a\}/g, aud); return r.charAt(0).toUpperCase() + r.slice(1); }
  function copy(text, done) {
    function fb() { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
  }
  function useHead(text) { S.head = text; $("#head").value = text; var h = byRole("head"); if (h) h.text = text; if (!roleMoved()) applyTemplate(); redraw(); commit(); }
  var hookBox = $("#hooks");
  function btn(label, fn) { var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-ghost btn-sm"; b.textContent = label; b.addEventListener("click", function () { fn(b); }); return b; }
  function genHooks() {
    var topic = ($("#topic").value || "").trim(), aud = ($("#aud").value || "").trim() || "kamu";
    if (!topic) { hookBox.innerHTML = '<p class="sx-note">Isi topiknya dulu, misalnya "analisa TikTok".</p>'; return false; }
    hookBox.innerHTML = "";
    HOOKS.forEach(function (h) {
      var text = fill(h[0], topic, aud), li = document.createElement("div"); li.className = "hk";
      var p = document.createElement("p"); p.textContent = text; li.appendChild(p);
      if (h[1]) { var w = document.createElement("small"); w.textContent = "Klaim pengalaman pribadi: pakai hanya kalau benar-benar kamu alami."; li.appendChild(w); }
      var row = document.createElement("div"); row.className = "sx-row";
      row.appendChild(btn("Jadikan headline", function () { useHead(text); say("Headline diganti."); }));
      row.appendChild(btn("Salin", function (b) { copy(text, function () { b.textContent = "Tersalin"; setTimeout(function () { b.textContent = "Salin"; }, 1400); }); }));
      row.appendChild(btn("Pakai di caption", function () { $("#cHook").value = text; }));
      li.appendChild(row); hookBox.appendChild(li);
    });
    return true;
  }
  $("#hookGo").addEventListener("click", genHooks);

  /* ---------- kerangka caption ---------- */
  var CTA = { edukasi: "Simpan postingan ini biar tidak lupa, dan kirim ke temanmu yang butuh.", jualan: "Mau pesan atau tanya dulu? Chat admin lewat link di bio.", cerita: "Kamu pernah mengalami hal serupa? Ceritakan di kolom komentar." };
  function liveCap() {
    var v = ($("#cOut").value || "").trim(); $("#capText").textContent = v ? v.slice(0, 140) + (v.length > 140 ? "… selengkapnya" : "") : "Caption kamu tampil di sini.";
    var ct = $("#capTop"); ct.hidden = S.plat !== "th" || !v; ct.textContent = v.slice(0, 160);
  }
  $("#capGo").addEventListener("click", function () {
    var hook = ($("#cHook").value || "").trim(), pts = ($("#cPts").value || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
    var goal = $("#cGoal").value, topic = ($("#topic").value || "").trim(), tags = [];
    topic.toLowerCase().split(/\s+/).forEach(function (w) { w = w.replace(/[^a-z0-9]/g, ""); if (w.length >= 3 && tags.indexOf("#" + w) < 0 && tags.length < 3) tags.push("#" + w); });
    tags.push("#kontenkreator"); tags.push("#tipsmedsos");
    $("#cOut").value = ((hook ? hook + "\n\n" : "") + pts.map(function (p) { return "• " + p; }).join("\n") + (pts.length ? "\n\n" : "") + (CTA[goal] || CTA.edukasi) + "\n\n" + tags.join(" ")).trim(); liveCap();
  });
  $("#cOut").addEventListener("input", liveCap);
  $("#capCopy").addEventListener("click", function () { var v = $("#cOut").value; if (!v) return; var b = this; copy(v, function () { b.textContent = "Tersalin"; setTimeout(function () { b.textContent = "Salin caption"; }, 1400); }); });

  /* ---------- kotak prompt bawah ---------- */
  var ptx = $("#promptTx");
  ptx.addEventListener("input", function () { ptx.style.height = "auto"; ptx.style.height = Math.min(120, ptx.scrollHeight) + "px"; });
  function send() {
    var v = ptx.value.trim(); if (!v) { ptx.focus(); return; }
    $("#topic").value = v.slice(0, 60); if (genHooks()) { rvBuild(v.slice(0, 60)); setTab("rv"); toast("AI belum aktif. Ide dibuat dari templat, bukan AI."); }
  }
  $("#sendBtn").addEventListener("click", send);
  ptx.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

  /* ---------- tab ---------- */
  function setTab(t) {
    var rv = t === "rv"; $("#edView").hidden = rv; $("#rvView").hidden = !rv;
    $("#tabEd").setAttribute("aria-selected", rv ? "false" : "true"); $("#tabRv").setAttribute("aria-selected", rv ? "true" : "false");
    if (rv) rvRender(); else redraw();
  }
  $("#tabEd").addEventListener("click", function () { setTab("ed"); }); $("#tabRv").addEventListener("click", function () { setTab("rv"); });

  /* ---------- swipe review ---------- */
  var RV = { topic: "", deck: [], idx: 0, hist: [] }, RVK = "sx_rv_v1", busy = false;
  function rvSave() { try { localStorage.setItem(RVK, JSON.stringify(RV)); } catch (e) {} }
  function rvLoad() { try { var s = JSON.parse(localStorage.getItem(RVK) || "null"); if (s && Array.isArray(s.deck) && s.deck.length) RV = s; } catch (e) {} }
  function rvBuild(topic) {
    var aud = ($("#aud").value || "").trim() || "kamu"; RV = { topic: topic, deck: HOOKS.map(function (h, i) { return { id: i, text: fill(h[0], topic, aud), d: 0 }; }), idx: 0, hist: [] }; rvSave(); rvRender();
  }
  $("#rvGen").addEventListener("click", function () {
    var t = ($("#topic").value || "").trim() || ptx.value.trim();
    if (!t) { toast("Isi topik dulu di kotak bawah atau kolom Topik."); ptx.focus(); return; }
    $("#topic").value = t.slice(0, 60); rvBuild(t.slice(0, 60));
  });
  function thumb(text) {
    var c = document.createElement("canvas"), d = dims(), w = 300; c.width = w; c.height = Math.round(w * d[1] / d[0]); c.className = "sx-th";
    render(c.getContext("2d"), d[0], d[1], { scale: w / d[0], head: text }); return c;
  }
  function rvRender() {
    var st = $("#rvStack"), sum = $("#rvSum"), n = RV.deck.length, likes = RV.deck.filter(function (x) { return x.d === 1; });
    st.innerHTML = ""; sum.hidden = true; $("#rvBtns").hidden = false; st.hidden = false;
    $("#rvCount").textContent = n ? Math.min(RV.idx + 1, n) + " / " + n + " · " + likes.length + " suka" : "";
    $("#rvUndo").disabled = !RV.hist.length;
    if (!n) { st.innerHTML = '<p class="sx-note sx-center">Belum ada ide. Tulis topik di kotak bawah lalu kirim, atau tekan "Buat 12 ide dari topik".</p>'; $("#rvBtns").hidden = true; return; }
    if (RV.idx >= n) {
      st.hidden = true; $("#rvYes").disabled = $("#rvNo").disabled = true; sum.hidden = false; sum.innerHTML = "";
      var h = document.createElement("h3"); h.textContent = likes.length + " ide kamu sukai dari " + n; sum.appendChild(h);
      if (!likes.length) { var p0 = document.createElement("p"); p0.className = "sx-note"; p0.textContent = "Belum ada yang disukai. Ulangi dari awal atau buat ide baru."; sum.appendChild(p0); }
      likes.forEach(function (x) {
        var li = document.createElement("div"); li.className = "hk"; var p = document.createElement("p"); p.textContent = x.text; li.appendChild(p); var row = document.createElement("div"); row.className = "sx-row";
        row.appendChild(btn("Pakai sebagai headline", function () { useHead(x.text); setTab("ed"); say("Headline diganti."); }));
        row.appendChild(btn("Salin", function (b) { copy(x.text, function () { b.textContent = "Tersalin"; setTimeout(function () { b.textContent = "Salin"; }, 1400); }); })); li.appendChild(row); sum.appendChild(li);
      });
      var rr = document.createElement("div"); rr.className = "sx-row";
      rr.appendChild(btn("Ulangi dari awal", function () { RV.deck.forEach(function (x) { x.d = 0; }); RV.idx = 0; RV.hist = []; rvSave(); rvRender(); }));
      rr.appendChild(btn("Buat ide baru", function () { RV = { topic: "", deck: [], idx: 0, hist: [] }; rvSave(); rvRender(); ptx.focus(); })); sum.appendChild(rr); return;
    }
    $("#rvYes").disabled = $("#rvNo").disabled = false;
    for (var i = Math.min(n - 1, RV.idx + 2); i >= RV.idx; i--) {
      var card = document.createElement("div"), depth = i - RV.idx; card.className = "sx-rc"; card.style.zIndex = 10 - depth;
      card.style.transform = depth ? "translateY(" + depth * 12 + "px) scale(" + (1 - depth * 0.05) + ")" : ""; card.setAttribute("data-top", depth === 0 ? "1" : "0");
      if (depth < 2) card.appendChild(thumb(RV.deck[i].text));
      var p = document.createElement("p"); p.textContent = RV.deck[i].text; card.appendChild(p);
      if (depth === 0) {
        var l1 = document.createElement("span"); l1.className = "sx-lbl yes"; l1.textContent = "SUKA"; var l2 = document.createElement("span"); l2.className = "sx-lbl no"; l2.textContent = "BUANG"; card.appendChild(l1); card.appendChild(l2); rvDrag(card, l1, l2);
      }
      st.appendChild(card);
    }
  }
  function rvDrag(card, l1, l2) {
    var sx = 0, dx = 0, on = false;
    card.addEventListener("pointerdown", function (e) { if (busy) return; on = true; sx = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
    card.addEventListener("pointermove", function (e) {
      if (!on) return; dx = e.clientX - sx; card.style.transform = "translateX(" + dx + "px) rotate(" + (reduced ? 0 : dx / 18) + "deg)";
      l1.style.opacity = clamp(dx / 100, 0, 1); l2.style.opacity = clamp(-dx / 100, 0, 1);
    });
    function up() {
      if (!on) return; on = false;
      if (Math.abs(dx) > 90) rvDecide(dx > 0 ? 1 : -1);
      else { card.style.transition = reduced ? "none" : "transform .28s cubic-bezier(.2,1.4,.4,1)"; card.style.transform = ""; l1.style.opacity = l2.style.opacity = 0; }
    }
    card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
  }
  function rvDecide(dir) {
    if (busy || RV.idx >= RV.deck.length || $("#rvView").hidden) return; busy = true;
    var top = $("#rvStack .sx-rc[data-top='1']");
    function done() { RV.deck[RV.idx].d = dir; RV.hist.push(RV.idx); if (RV.hist.length > 10) RV.hist.shift(); RV.idx++; rvSave(); busy = false; rvRender(); }
    if (!top) { done(); return; }
    var lbl = top.querySelector(dir > 0 ? ".yes" : ".no"); if (lbl) lbl.style.opacity = 1;
    if (reduced) { top.style.transition = "opacity .12s"; top.style.opacity = 0; setTimeout(done, 130); return; }
    top.style.transition = "transform .3s ease-in, opacity .3s"; top.style.transform = "translateX(" + dir * 620 + "px) rotate(" + dir * 24 + "deg)"; top.style.opacity = 0; setTimeout(done, 300);
  }
  function rvUndo() { if (busy || !RV.hist.length) return; RV.idx = RV.hist.pop(); RV.deck[RV.idx].d = 0; rvSave(); rvRender(); }
  $("#rvYes").addEventListener("click", function () { rvDecide(1); }); $("#rvNo").addEventListener("click", function () { rvDecide(-1); }); $("#rvUndo").addEventListener("click", rvUndo);

  /* ---------- font ---------- */
  function loadFonts() {
    if (!(document.fonts && document.fonts.load)) return Promise.resolve();
    var want = {}; S.blocks.forEach(function (b) { if (b.kind === "text") want[(b.italic ? "italic " : "") + b.weight + ' 40px "' + b.font + '"'] = 1; });
    var p = Promise.all(Object.keys(want).map(function (q) { return document.fonts.load(q).catch(function () {}); }));
    return Promise.race([p, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () { redraw(); });
  }

  /* ---------- mulai ---------- */
  setCanvasSize(); S.blocks = buildRoles(); syncUI(); commit(); draw(); undoBtns(); rvLoad();
  loadFonts().then(function () { applyTemplate(); });
  window.__sx = { S: S, analyze: analyze, autoStraight: autoStraight, smartCrop: smartCrop, lum: lum, ratio: ratio, lay: lay, dims: dims, geo: geo, autoColor: autoColor };
})();
