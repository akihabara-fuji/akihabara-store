/* Blur otomatis data sensitif pada tangkapan layar chat (nomor HP, email, tautan, rekening, kalimat sensitif, kepala chat).
   Semua berjalan di browser admin: pemindaian teks (OCR) memakai tesseract.js, gambar asli TIDAK dikirim ke server, hanya hasil yang sudah diburamkan.
   Blur berupa mosaik besar (tidak bisa dipulihkan). Kotak bisa ditambah dengan menyeret dan dihapus dengan mengklik. */
(function () {
  "use strict";
  const TESS = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
  let tp = null;
  const loadTess = () => tp || (tp = new Promise((res, rej) => {
    if (window.Tesseract) return res(window.Tesseract);
    const s = document.createElement("script"); s.src = TESS;
    s.onload = () => res(window.Tesseract); s.onerror = () => { tp = null; rej(new Error("Pemindai teks gagal dimuat (perlu koneksi internet).")); };
    document.head.appendChild(s);
  }));

  const KEY = /(rekening|no\.?\s?rek|norek|password|kata\s?sandi|sandi|\bpin\b|\botp\b|alamat|\bnik\b|\bktp\b|\bnim\b|a\/n|atas\s?nama|\bjl\.|\bjalan\b|gmail|yahoo|token|kode\s?verifikasi)/i;
  const TIME = /^\d{1,2}[.:]\d{2}$/;
  const digits = w => (String(w).match(/\d/g) || []).length;

  /* kotak yang harus diburamkan, dari hasil OCR (koordinat piksel gambar kerja) */
  function detect(lines) {
    const out = [];
    const add = (b, why) => out.push({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0, why });
    const union = ws => ({ x0: Math.min(...ws.map(w => w.bbox.x0)), y0: Math.min(...ws.map(w => w.bbox.y0)), x1: Math.max(...ws.map(w => w.bbox.x1)), y1: Math.max(...ws.map(w => w.bbox.y1)) });
    for (const ln of lines) {
      const ws = (ln.words || []).filter(w => w.text && w.bbox);
      if (!ws.length) continue;
      if (KEY.test(ln.text || "")) { add(union(ws), "kata sensitif"); continue; }
      let run = [], n = 0;
      const flush = () => { if (run.length && n >= 8) add(union(run), "nomor"); run = []; n = 0; };
      for (const w of ws) {
        const t = w.text.trim(), d = digits(t);
        if (/@|https?:|www\.|\.(com|id|co|net)\b/i.test(t)) { flush(); add(w.bbox, "email/tautan"); }
        else if (TIME.test(t)) flush();
        else if (d >= 6) { run.push(w); n += d; flush(); }
        else if (d >= 2 || (run.length && /^[+()-]+$/.test(t))) { run.push(w); n += d; }
        else flush();
      }
      flush();
    }
    return out;
  }

  /* mosaik besar pada kotak: teks tidak terbaca dan tidak bisa dipulihkan */
  function pixelate(dst, src, b) {
    const x = Math.max(0, Math.floor(b.x)), y = Math.max(0, Math.floor(b.y)), w = Math.min(src.width - x, Math.ceil(b.w)), h = Math.min(src.height - y, Math.ceil(b.h));
    if (w < 2 || h < 2) return;
    const blk = Math.max(8, Math.round(Math.min(h, 60) * 0.6)), t = document.createElement("canvas");
    t.width = Math.max(1, Math.ceil(w / blk)); t.height = Math.max(1, Math.ceil(h / blk));
    const tc = t.getContext("2d"); tc.imageSmoothingEnabled = true; tc.drawImage(src, x, y, w, h, 0, 0, t.width, t.height);
    const c = dst.getContext("2d"); c.imageSmoothingEnabled = false; c.drawImage(t, 0, 0, t.width, t.height, x, y, w, h); c.imageSmoothingEnabled = true;
  }

  function loadImage(file) {
    return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error("File bukan gambar yang valid.")); }; im.src = u; });
  }

  /* h = { dialog, esc }. Mengembalikan Blob JPEG hasil blur, atau null bila dibatalkan. */
  async function edit(file, h) {
    const im = await loadImage(file), sc = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
    const W = Math.round(im.naturalWidth * sc), H = Math.round(im.naturalHeight * sc);
    const orig = document.createElement("canvas"); orig.width = W; orig.height = H; orig.getContext("2d").drawImage(im, 0, 0, W, H);
    const out = document.createElement("canvas"); out.width = W; out.height = H;
    const st = { boxes: [], header: H > W * 1.2 };
    const bandBox = () => ({ x: 0, y: 0, w: W, h: Math.round(H * 0.1), why: "kepala chat", band: true });
    const all = () => (st.header ? [bandBox()] : []).concat(st.boxes);
    const paint = (guides, view) => {
      const c = out.getContext("2d"); c.drawImage(orig, 0, 0);
      const bs = all(); bs.forEach(b => pixelate(out, orig, b));
      if (guides) { c.lineWidth = Math.max(2, W / 400); c.strokeStyle = "#e5484d"; bs.forEach(b => c.strokeRect(b.x, b.y, b.w, b.h)); if (view) { c.strokeStyle = "#ffcc00"; c.strokeRect(view.x, view.y, view.w, view.h); } }
    };
    const ref = {};
    const ok = await h.dialog({
      title: "Blur data sensitif", wide: true, ok: "Pakai gambar ini", cancel: "Batal",
      body: `<p class="small muted" style="margin:0">Nomor HP, email, tautan, rekening, kalimat sensitif, dan kepala chat diburamkan otomatis. <b>Seret</b> pada gambar untuk menambah kotak blur (mis. nama), <b>klik kotak merah</b> untuk membatalkannya.</p>
        <div class="bar"><label class="bar small"><input type="checkbox" id="bhd" ${st.header ? "checked" : ""}> Blur kepala chat (nama kontak &amp; foto profil)</label><span class="grow"></span><span class="small faint" id="bst">Memindai teks…</span></div>
        <div style="max-height:62vh;overflow:auto;border:1px solid var(--border);border-radius:10px;background:#111"><canvas id="bcv" style="width:100%;display:block;cursor:crosshair;touch-action:none"></canvas></div>`,
      onOpen: async d => {
        const cv = d.querySelector("#bcv"), stat = d.querySelector("#bst"); cv.width = W; cv.height = H; ref.cv = cv;
        const draw = view => { paint(true, view); cv.getContext("2d").drawImage(out, 0, 0); };
        ref.draw = draw; draw();
        d.querySelector("#bhd").onchange = e => { st.header = e.target.checked; draw(); };
        const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
        let a = null;
        cv.onpointerdown = e => { a = pt(e); cv.setPointerCapture(e.pointerId); };
        cv.onpointermove = e => { if (!a) return; const p = pt(e); draw({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) }); };
        cv.onpointerup = e => {
          if (!a) return; const p = pt(e), w = Math.abs(p.x - a.x), hh = Math.abs(p.y - a.y);
          if (w < 6 && hh < 6) { const i = st.boxes.findIndex(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h); if (i >= 0) st.boxes.splice(i, 1); }
          else st.boxes.push({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w, h: hh, why: "manual" });
          a = null; draw();
        };
        try {
          const T = await loadTess();
          stat.textContent = "Memindai teks… (pertama kali agak lama karena mengunduh data bahasa)";
          const wk = await T.createWorker(["ind", "eng"]);
          const r = await wk.recognize(orig, {}, { blocks: true });
          await wk.terminate();
          const lines = (r.data.lines) || ((r.data.blocks || []).flatMap(b => (b.paragraphs || []).flatMap(p => p.lines || [])));
          const pad = Math.max(3, Math.round(W / 250));
          st.boxes = detect(lines).map(b => ({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad, why: b.why }));
          stat.textContent = st.boxes.length ? `${st.boxes.length} bagian diburamkan otomatis. Periksa hasilnya.` : "Tidak ada data sensitif terdeteksi. Periksa manual.";
        } catch (e) { stat.textContent = (e && e.message || "Pemindaian gagal") + " Tandai manual dengan menyeret."; }
        draw();
      },
    });
    if (!ok) return null;
    paint(false);
    return await new Promise(r => out.toBlob(r, "image/jpeg", 0.9));
  }
  window.CABlur = { edit, detect };
})();
