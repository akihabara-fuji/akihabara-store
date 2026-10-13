/* Studio Konten Fase 0: semua diproses di browser, tidak ada foto yang dikirim ke server. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var FORMATS = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920] };
  var S = { img: null, fmt: "4:5", tpl: "bold", head: "Judul kontenmu di sini", sub: "Subteks singkat yang menjelaskan isinya", handle: "@akunmu", acc: "#c8102e", size: 100, zoom: 1, ox: 0, oy: 0 };
  var cv = $("#cv"), cx = cv.getContext("2d");
  var FONT = '"Space Grotesk","Plus Jakarta Sans",system-ui,sans-serif';
  var raf = 0;

  function font(w, px, italic) { return (italic ? "italic " : "") + w + " " + Math.round(px) + "px " + FONT; }
  function wrap(text, maxW) {
    var out = [];
    String(text || "").split("\n").forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), cur = "";
      if (!words.length) { out.push(""); return; }
      words.forEach(function (w) {
        var t = cur ? cur + " " + w : w;
        if (cx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
      });
      if (cur) out.push(cur);
    });
    return out;
  }
  /* kecilkan huruf otomatis sampai muat (maks 6 baris) */
  function fit(text, w, px, maxW, weight, italic, maxLines) {
    var size = px, lines;
    for (var i = 0; i < 14; i++) {
      cx.font = font(weight, size, italic);
      lines = wrap(text, maxW);
      if (lines.length <= maxLines) break;
      size *= 0.92;
    }
    return { size: size, lines: lines };
  }

  function drawPhoto(W, H) {
    cx.fillStyle = "#14141a"; cx.fillRect(0, 0, W, H);
    if (!S.img) {
      var g = cx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#2a2a33"); g.addColorStop(1, "#0b0b0f"); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.fillStyle = S.acc; cx.globalAlpha = 0.35; cx.beginPath(); cx.arc(W * 0.78, H * 0.3, W * 0.38, 0, 7); cx.fill(); cx.globalAlpha = 1;
      return;
    }
    var iw = S.img.width, ih = S.img.height, sc = Math.max(W / iw, H / ih) * S.zoom, dw = iw * sc, dh = ih * sc;
    var mx = Math.max(0, (dw - W) / 2), my = Math.max(0, (dh - H) / 2);
    S.ox = Math.max(-mx, Math.min(mx, S.ox)); S.oy = Math.max(-my, Math.min(my, S.oy));
    cx.drawImage(S.img, (W - dw) / 2 + S.ox, (H - dh) / 2 + S.oy, dw, dh);
  }

  function draw() {
    var d = FORMATS[S.fmt], W = d[0], H = d[1];
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    drawPhoto(W, H);
    var base = W * 0.085 * (S.size / 100), pad = W * 0.074, maxW = W - pad * 2;
    cx.textBaseline = "alphabetic";
    var head = S.head || "", sub = S.sub || "", hd = S.handle || "";
    var t = S.tpl, lines, f, y;

    if (t === "bold") {
      var g = cx.createLinearGradient(0, H * 0.3, 0, H); g.addColorStop(0, "rgba(11,11,15,0)"); g.addColorStop(1, "rgba(11,11,15,.9)");
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      f = fit(head, W, base, maxW, 700, false, 6); lines = f.lines;
      var lh = f.size * 1.08, subH = sub ? W * 0.034 * 1.5 * 2 : 0;
      y = H - pad * 1.6 - subH - lines.length * lh + f.size * 0.85;
      cx.fillStyle = S.acc; cx.fillRect(pad, y - f.size - 26, W * 0.11, 10);
      cx.fillStyle = "#fff"; cx.font = font(700, f.size); lines.forEach(function (l, i) { cx.fillText(l, pad, y + i * lh); });
      if (sub) { cx.font = font(500, W * 0.034); cx.fillStyle = "rgba(255,255,255,.85)"; wrap(sub, maxW).slice(0, 2).forEach(function (l, i) { cx.fillText(l, pad, y + lines.length * lh + W * 0.01 + i * W * 0.05); }); }
      cx.font = font(700, W * 0.028); cx.fillStyle = "rgba(255,255,255,.7)"; cx.textAlign = "right"; cx.fillText(hd, W - pad, H - pad * 0.7); cx.textAlign = "left";
    } else if (t === "center") {
      cx.fillStyle = "rgba(11,11,15,.55)"; cx.fillRect(0, 0, W, H);
      f = fit(head.toUpperCase(), W, base * 1.05, maxW, 700, false, 6); lines = f.lines;
      var lh2 = f.size * 1.1, total = lines.length * lh2; y = (H - total) / 2 + f.size * 0.85;
      cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.font = font(700, f.size);
      lines.forEach(function (l, i) { cx.fillText(l, W / 2, y + i * lh2); });
      cx.fillStyle = S.acc; cx.fillRect(W / 2 - W * 0.07, y + total - f.size * 0.4, W * 0.14, 10);
      if (sub) { cx.font = font(500, W * 0.034); cx.fillStyle = "rgba(255,255,255,.88)"; wrap(sub, maxW * 0.86).slice(0, 2).forEach(function (l, i) { cx.fillText(l, W / 2, y + total + W * 0.06 + i * W * 0.05); }); }
      cx.font = font(700, W * 0.028); cx.fillStyle = "rgba(255,255,255,.7)"; cx.fillText(hd, W / 2, H - pad * 0.7); cx.textAlign = "left";
    } else if (t === "editorial") {
      var ph = H * 0.4; cx.fillStyle = "#fff"; cx.fillRect(0, H - ph, W, ph);
      cx.fillStyle = S.acc; cx.fillRect(0, H - ph, W, 10);
      f = fit(head, W, base * 0.92, maxW, 700, false, 4); lines = f.lines;
      cx.font = font(700, W * 0.026); cx.fillStyle = S.acc; cx.fillText(hd.toUpperCase(), pad, H - ph + pad * 0.85);
      cx.fillStyle = "#0b0b0f"; cx.font = font(700, f.size); var lh3 = f.size * 1.08; y = H - ph + pad * 0.85 + f.size * 1.15;
      lines.forEach(function (l, i) { cx.fillText(l, pad, y + i * lh3); });
      if (sub) { cx.font = font(500, W * 0.03); cx.fillStyle = "#5a5a66"; wrap(sub, maxW).slice(0, 2).forEach(function (l, i) { cx.fillText(l, pad, y + lines.length * lh3 + W * 0.01 + i * W * 0.045); }); }
    } else if (t === "poster") {
      cx.globalCompositeOperation = "multiply"; cx.globalAlpha = 0.82; cx.fillStyle = S.acc; cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
      var g2 = cx.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, "rgba(11,11,15,.1)"); g2.addColorStop(1, "rgba(11,11,15,.6)"); cx.fillStyle = g2; cx.fillRect(0, 0, W, H);
      f = fit(head.toUpperCase(), W, base * 1.3, maxW, 700, false, 6); lines = f.lines; var lh4 = f.size * 1.02;
      cx.fillStyle = "#fff"; cx.font = font(700, f.size); lines.forEach(function (l, i) { cx.fillText(l, pad, pad + f.size * 0.9 + i * lh4); });
      if (sub) { cx.font = font(500, W * 0.036); wrap(sub, maxW * 0.8).slice(0, 3).forEach(function (l, i) { cx.fillText(l, pad, H - pad * 1.5 - (2 - i) * W * 0.052); }); }
      cx.font = font(700, W * 0.028); cx.textAlign = "right"; cx.fillText(hd, W - pad, H - pad * 0.7); cx.textAlign = "left";
    } else if (t === "quote") {
      var rg = cx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, Math.max(W, H) * 0.75); rg.addColorStop(0, "rgba(11,11,15,.45)"); rg.addColorStop(1, "rgba(11,11,15,.88)");
      cx.fillStyle = rg; cx.fillRect(0, 0, W, H);
      f = fit(head, W, base * 0.95, maxW * 0.9, 500, true, 7); lines = f.lines; var lh5 = f.size * 1.25, tot = lines.length * lh5; y = (H - tot) / 2 + f.size;
      cx.textAlign = "center"; cx.fillStyle = S.acc; cx.font = font(700, W * 0.24); cx.fillText("“", W / 2, y - f.size * 1.2);
      cx.fillStyle = "#fff"; cx.font = font(500, f.size, true); lines.forEach(function (l, i) { cx.fillText(l, W / 2, y + i * lh5); });
      if (sub) { cx.font = font(700, W * 0.03); cx.fillStyle = "rgba(255,255,255,.75)"; cx.fillText("— " + sub, W / 2, y + tot + W * 0.03); }
      cx.font = font(700, W * 0.026); cx.fillStyle = "rgba(255,255,255,.6)"; cx.fillText(hd, W / 2, H - pad * 0.7); cx.textAlign = "left";
    } else { /* minimal */
      cx.fillStyle = "rgba(11,11,15,.28)"; cx.fillRect(0, 0, W, H);
      var m = W * 0.04; cx.strokeStyle = "rgba(255,255,255,.9)"; cx.lineWidth = 3; cx.strokeRect(m, m, W - m * 2, H - m * 2);
      f = fit(head, W, base * 0.72, maxW * 0.8, 700, false, 4); lines = f.lines; var lh6 = f.size * 1.12;
      cx.fillStyle = "#fff"; cx.font = font(700, f.size); lines.forEach(function (l, i) { cx.fillText(l, pad, pad + f.size * 0.9 + i * lh6); });
      if (sub) { cx.font = font(500, W * 0.03); cx.fillStyle = "rgba(255,255,255,.85)"; wrap(sub, maxW * 0.7).slice(0, 2).forEach(function (l, i) { cx.fillText(l, pad, pad + f.size * 0.9 + lines.length * lh6 + W * 0.01 + i * W * 0.045); }); }
      cx.font = font(700, W * 0.026); cx.fillStyle = "#fff"; cx.textAlign = "center"; cx.fillText(hd, W / 2, H - pad * 0.62); cx.textAlign = "left";
    }
  }
  function redraw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

  /* ---------- kontrol ---------- */
  function bind(id, key, num) {
    var el = $(id); if (!el) return;
    el.addEventListener("input", function () { S[key] = num ? +el.value : el.value; redraw(); });
  }
  bind("#head", "head"); bind("#sub", "sub"); bind("#handle", "handle"); bind("#acc", "acc"); bind("#size", "size", true); bind("#zoom", "zoom", true);
  function chips(sel, key, attr) {
    var box = $(sel); if (!box) return;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[" + attr + "]"); if (!b) return;
      S[key] = b.getAttribute(attr);
      box.querySelectorAll("[" + attr + "]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      if (key === "fmt") { S.ox = 0; S.oy = 0; }
      redraw();
    });
  }
  chips("#fmt", "fmt", "data-f"); chips("#tpl", "tpl", "data-t");

  var msg = $("#msg");
  function say(t, bad) { msg.textContent = t || ""; msg.style.color = bad ? "var(--bad)" : "var(--muted)"; }
  $("#file").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { say("File harus berupa gambar (JPG, PNG, atau WebP).", true); return; }
    if (f.size > 15 * 1024 * 1024) { say("Ukuran foto maksimal 15 MB.", true); return; }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () { S.img = im; S.ox = 0; S.oy = 0; S.zoom = 1; $("#zoom").value = 1; URL.revokeObjectURL(url); say("Foto dipakai. Geser foto di pratinjau untuk mengatur posisi."); redraw(); };
    im.onerror = function () { URL.revokeObjectURL(url); say("Foto tidak bisa dibuka. Coba file lain.", true); };
    im.src = url;
  });
  $("#clear").addEventListener("click", function () { S.img = null; $("#file").value = ""; say(""); redraw(); });

  /* geser foto di kanvas */
  var drag = null;
  cv.addEventListener("pointerdown", function (e) { if (!S.img) return; drag = { x: e.clientX, y: e.clientY, ox: S.ox, oy: S.oy }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) {
    if (!drag) return; var k = cv.width / cv.clientWidth;
    S.ox = drag.ox + (e.clientX - drag.x) * k; S.oy = drag.oy + (e.clientY - drag.y) * k; redraw();
  });
  ["pointerup", "pointercancel"].forEach(function (n) { cv.addEventListener(n, function () { drag = null; }); });

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
    ["{a}, ini 3 kesalahan {t} yang bikin hasilnya jalan di tempat.", 0],
    ["Jangan mulai {t} sebelum nonton ini.", 0],
    ["Kalau {t} kamu mentok, cek 1 hal ini dulu.", 0],
    ["Hal soal {t} yang jarang dibahas, padahal gampang.", 0],
    ["{t}: yang orang kira vs kenyataannya.", 0],
    ["Stop scroll. {a} perlu tahu soal {t}.", 0],
    ["3 langkah {t} buat {a}, tanpa ribet.", 0],
    ["Kenapa {t} kamu nggak naik? Mungkin ini sebabnya.", 0],
    ["Mitos {t} yang sebaiknya berhenti dipercaya.", 0],
    ["Aku coba {t} selama 30 hari. Ini hasilnya.", 1],
    ["Dulu aku salah soal {t}. Ini koreksinya.", 1],
    ["Cara aku beresin {t} dalam 7 hari.", 1]
  ];
  function fill(t, topic, aud) { var r = t.replace(/\{t\}/g, topic).replace(/\{a\}/g, aud); return r.charAt(0).toUpperCase() + r.slice(1); }
  function copy(text, done) {
    function fb() { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
  }
  var hookBox = $("#hooks");
  $("#hookGo").addEventListener("click", function () {
    var topic = ($("#topic").value || "").trim(), aud = ($("#aud").value || "").trim() || "kamu";
    if (!topic) { hookBox.innerHTML = '<p class="small">Isi topiknya dulu, misalnya "analisa TikTok".</p>'; return; }
    hookBox.innerHTML = "";
    HOOKS.forEach(function (h) {
      var text = fill(h[0], topic, aud), li = document.createElement("div"); li.className = "hk";
      var p = document.createElement("p"); p.textContent = text; li.appendChild(p);
      if (h[1]) { var w = document.createElement("small"); w.textContent = "Klaim pengalaman pribadi: pakai hanya kalau benar-benar kamu alami."; li.appendChild(w); }
      var row = document.createElement("div"); row.className = "row";
      var b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn btn-ghost btn-sm"; b1.textContent = "Jadikan headline";
      b1.addEventListener("click", function () { S.head = text; $("#head").value = text; redraw(); say("Headline diganti."); });
      var b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn btn-ghost btn-sm"; b2.textContent = "Salin";
      b2.addEventListener("click", function () { copy(text, function () { b2.textContent = "Tersalin"; setTimeout(function () { b2.textContent = "Salin"; }, 1400); }); });
      var b3 = document.createElement("button"); b3.type = "button"; b3.className = "btn btn-ghost btn-sm"; b3.textContent = "Pakai di caption";
      b3.addEventListener("click", function () { $("#cHook").value = text; });
      row.appendChild(b1); row.appendChild(b2); row.appendChild(b3); li.appendChild(row); hookBox.appendChild(li);
    });
  });

  /* ---------- kerangka caption ---------- */
  var CTA = {
    edukasi: "Simpan postingan ini biar tidak lupa, dan kirim ke temanmu yang butuh.",
    jualan: "Mau pesan atau tanya dulu? Chat admin lewat link di bio.",
    cerita: "Kamu pernah mengalami hal serupa? Ceritakan di kolom komentar."
  };
  $("#capGo").addEventListener("click", function () {
    var hook = ($("#cHook").value || "").trim(), pts = ($("#cPts").value || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6);
    var goal = $("#cGoal").value, topic = ($("#topic").value || "").trim();
    var tags = [];
    topic.toLowerCase().split(/\s+/).forEach(function (w) { w = w.replace(/[^a-z0-9]/g, ""); if (w.length >= 3 && tags.indexOf("#" + w) < 0 && tags.length < 3) tags.push("#" + w); });
    tags.push("#kontenkreator"); tags.push("#tipsmedsos");
    var out = (hook ? hook + "\n\n" : "") + pts.map(function (p) { return "• " + p; }).join("\n") + (pts.length ? "\n\n" : "") + (CTA[goal] || CTA.edukasi) + "\n\n" + tags.join(" ");
    $("#cOut").value = out.trim();
  });
  $("#capCopy").addEventListener("click", function () { var v = $("#cOut").value; if (!v) return; var b = this; copy(v, function () { b.textContent = "Tersalin"; setTimeout(function () { b.textContent = "Salin caption"; }, 1400); }); });

  /* mulai: tunggu font lalu gambar */
  var ready = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 40px "Space Grotesk"')]) : Promise.resolve();
  ready.then(draw, draw);
  draw();
})();
