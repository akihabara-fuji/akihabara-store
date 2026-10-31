/* Panel admin Catatan Akademik: satu halaman, rute lewat hash (#/dashboard, #/posts, #/orders/NA-1001, ...).
   Semua data dari API /ms/admin/* yang dijaga login dan peran CA. Teks dari server selalu di-escape (esc) sebelum masuk HTML. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = n => "Rp" + Number(n || 0).toLocaleString("id-ID");
  const num = n => Number(n || 0).toLocaleString("id-ID");
  const tz = { timeZone: "Asia/Jakarta" };
  const dt = v => v ? new Date(v).toLocaleString("id-ID", { ...tz, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
  const dd = v => v ? new Date(v).toLocaleDateString("id-ID", { ...tz, day: "numeric", month: "short", year: "numeric" }) : "–";
  const dayKey = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
  const words = t => (String(t || "").match(/\S+/g) || []).length;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* penyimpanan lokal opsional */ } return null; };

  const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    home: I('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'), doc: I('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>'),
    pen: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'), tag: I('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
    img: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'), chat: I('<path d="M4 5h16v11H8l-4 4z"/>'),
    box: I('<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>'), card: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'),
    list: I('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'), send: I('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>'),
    users: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6"/>'), price: I('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    chart: I('<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>'), cog: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'), shield: I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'), clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    out: I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'), moon: I('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'), menu: I('<path d="M3 6h18M3 12h18M3 18h18"/>'),
    ext: I('<path d="M14 3h7v7M10 14L21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'), wallet: I('<path d="M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.2"/>'),
  };

  let ME = null, ORDER_COUNTS = {}, DIRTY = false;
  const ALL = ["owner", "editor", "cs"], ED = ["owner", "editor"], CS = ["owner", "cs"], OWN = ["owner"];
  const GROUP_NAV = [["bayar", "Menunggu pembayaran"], ["konfirmasi", "Menunggu konfirmasi"], ["proses", "Sedang diproses"], ["revisi", "Perlu revisi"], ["selesai", "Selesai"], ["batal", "Dibatalkan"]];
  const NAV = [
    { items: [["dashboard", "Dashboard", "home", ALL], ["traffic", "Pengunjung & Konten", "chart", ED]] },
    { h: "Konten", items: [["posts", "Artikel Blog", "doc", ED], ["posts/new", "Tulis Artikel", "pen", ED], ["taxonomy", "Kategori & Tag", "tag", ED], ["media", "Media", "img", ED], ["comments", "Komentar", "chat", ED], ["studio", "Studio Posting Sosmed", "send", ED]] },
    { h: "Tampilan Situs", items: [["editor", "Editor Halaman", "pen", OWN], ["images", "Gambar Situs", "img", ED], ["testimonials", "Testimoni", "chat", ED], ["texts", "Teks & Nama", "pen", OWN], ["tema", "Tema & Font", "img", OWN]] },
    { h: "Pesanan", items: [["orders", "Pesanan Layanan", "box", CS, true], ["payments", "Konfirmasi Pembayaran", "card", CS], ["tools/parafrase", "Antrean Cek & Parafrase", "list", CS], ["tools/layanan", "Kirim Hasil Layanan", "send", CS], ["dokumen", "Dokumen Saya", "doc", OWN]] },
    { h: "Pengguna", items: [["customers", "Pelanggan", "users", CS]] },
    { h: "Lainnya", items: [["services", "Layanan & Harga", "price", OWN], ["reports", "Laporan & Statistik", "chart", OWN], ["settings", "Pengaturan Website", "cog", OWN], ["seo", "SEO & Sitemap", "search", OWN], ["admins", "Admin & Peran", "shield", OWN], ["log", "Log Aktivitas", "clock", OWN]] },
  ];

  /* ---------------- API ---------------- */
  async function api(path, { method, json, form, raw } = {}) {
    const opt = { method: method || (json || form ? "POST" : "GET"), headers: {}, cache: "no-store", credentials: "same-origin" };
    if (json) { opt.headers["content-type"] = "application/json"; opt.body = JSON.stringify(json); }
    if (form) opt.body = form;
    const r = await fetch(path, opt);
    if (r.status === 401) { ME = null; renderLogin(); throw new Error("Sesi habis, silakan login lagi."); }
    if (raw) { if (!r.ok) throw new Error("Gagal (" + r.status + ")"); return r.text(); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Gagal (" + r.status + ")");
    return j;
  }
  function toast(m, bad) { const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = m; $("#toasts").appendChild(t); setTimeout(() => t.remove(), 4200); }
  const fail = e => toast(e.message || String(e), true);

  /* dialog serbaguna: isi HTML + tombol; resolve dengan nilai input (bila ada), true, atau false */
  function dialog({ title, body = "", ok = "Simpan", okClass = "pri", cancel = "Batal", input, wide, onOpen }) {
    return new Promise(resolve => {
      const d = document.createElement("dialog"); d.className = "dlg" + (wide ? " wide" : "");
      const inp = input ? `<label class="f">${esc(input.label)}${input.textarea ? `<textarea class="in" id="dlgIn" maxlength="${input.max || 300}" ${input.required ? "required" : ""}>${esc(input.value || "")}</textarea>` : `<input class="in" id="dlgIn" type="${input.type || "text"}" maxlength="${input.max || 300}" value="${esc(input.value || "")}" ${input.required ? "required" : ""}>`}${input.hint ? `<small>${esc(input.hint)}</small>` : ""}</label><p class="err" id="dlgErr"></p>` : "";
      d.innerHTML = `<form method="dialog"><div class="hd"><h2>${esc(title)}</h2><button class="btn icon-btn" value="x" aria-label="Tutup">✕</button></div><div class="bd">${body}${inp}</div>${ok || cancel ? `<div class="ft">${cancel ? `<button class="btn" value="x">${esc(cancel)}</button>` : ""}${ok ? `<button class="btn ${okClass}" value="ok" id="dlgOk">${esc(ok)}</button>` : ""}</div>` : ""}</form>`;
      document.body.appendChild(d);
      // ditangani lewat submit/cancel (bukan event "close", yang tidak selalu terpanggil di semua browser)
      let done = false;
      d.finish = ok => { if (done) return; done = true; const v = ok ? (input ? $("#dlgIn", d).value.trim() : true) : false; if (d.open) d.close(); d.remove(); resolve(v); };
      $("form", d).addEventListener("submit", e => { e.preventDefault(); d.finish(e.submitter && e.submitter.value === "ok"); });
      d.addEventListener("cancel", e => { e.preventDefault(); d.finish(false); });
      if (input && input.required) $("#dlgOk", d).addEventListener("click", e => { const v = $("#dlgIn", d).value.trim(); if (v.length < (input.min || 1)) { e.preventDefault(); $("#dlgErr", d).textContent = input.minMsg || "Wajib diisi."; } });
      d.showModal(); if (onOpen) onOpen(d);
    });
  }
  const confirmAct = (title, body, ok = "Ya, lanjutkan", okClass = "pri") => dialog({ title, body: `<p>${body}</p>`, ok, okClass });

  /* tombol yang dikunci selama permintaan berjalan: mencegah aksi ganda (mis. konfirmasi bayar dua kali) */
  async function busy(btn, fn) { if (btn.disabled) return; const t = btn.textContent; btn.disabled = true; btn.textContent = "Memproses…"; try { return await fn(); } finally { btn.disabled = false; btn.textContent = t; } }

  /* ---------------- login ---------------- */
  function renderLogin() {
    document.title = "Masuk · Admin Catatan Akademik";
    $("#root").innerHTML = `<main class="login"><form class="login-card" id="lf" novalidate>
      <div class="brand"><img src="/assets/ut/ca/logo-96.png" alt="" width="38" height="38"><span>Catatan Akademik</span></div>
      <h1>Masuk panel admin</h1><p>Kelola artikel, pesanan, dan pembayaran Catatan Akademik.</p>
      <label class="f">Nama pengguna<input class="in" name="u" autocomplete="username" required autocapitalize="none"></label>
      <label class="f">Sandi<input class="in" name="p" type="password" autocomplete="current-password" required></label>
      <p class="err" id="le" role="alert"></p>
      <button class="btn pri" type="submit">Masuk</button>
      <p class="small faint">Panel ini khusus Catatan Akademik. Akun dibuat oleh pemilik di menu Admin &amp; Peran.</p></form></main>`;
    $("#lf").addEventListener("submit", async e => {
      e.preventDefault(); const f = e.target, b = $("button[type=submit]", f); $("#le").textContent = "";
      await busy(b, async () => {
        try { await api("/ms/admin/ca/login", { json: { username: f.u.value, password: f.p.value } }); await boot(); }
        catch (err) { $("#le").textContent = err.message; }
      });
    });
    $("#lf").u.focus();
  }

  /* ---------------- kerangka ---------------- */
  const SUBS_OPEN = () => { let v = null; try { v = localStorage.getItem("ca-subs"); } catch {} return v === null ? /^#\/orders/.test(location.hash) : v === "1"; };
  const allowed = roles => ME && roles.includes(ME.role);
  function shell() {
    const nav = NAV.map(g => {
      const items = g.items.filter(it => allowed(it[3]));
      if (!items.length) return "";
      return (g.h ? `<h3>${g.h}</h3>` : "") + items.map(([r, label, ic, , subs]) => `<a class="nav" href="#/${r}" data-r="${r}">${ICON[ic]}<span>${label}</span>${r === "orders" ? '<span class="cnt" data-c="semua"></span>' : r === "payments" ? '<span class="cnt" data-c="konfirmasi"></span>' : ""}</a>` +
        (subs ? `<button type="button" class="nav sub subtog" id="subtog" aria-expanded="${SUBS_OPEN()}"><span>Status pesanan</span><i aria-hidden="true">▾</i></button><div class="subs" id="subs" ${SUBS_OPEN() ? "" : "hidden"}>` + GROUP_NAV.map(([k, l]) => `<a class="nav sub" href="#/orders?group=${k}" data-r="orders?group=${k}">${l}<span class="cnt" data-c="${k}"></span></a>`).join("") + "</div>" : "")).join("");
    }).join("");
    $("#root").innerHTML = `<div class="shell">
      <aside class="side" id="side" aria-label="Menu admin"><a class="brand" href="#/dashboard"><img src="/assets/ut/ca/logo-96.png" alt="" width="34" height="34"><span><b>Catatan Akademik</b><small>Admin Panel</small></span></a>
        <nav>${nav}</nav>
        <div class="me"><b>${esc(ME.name)}</b><small>${esc(ME.roleLabel)}${ME.username ? " · " + esc(ME.username) : ""}</small><div class="bar" style="margin-top:10px"><a class="btn sm" href="#/account">Akun</a><button class="btn sm" id="logout">${ICON.out}Keluar</button></div></div>
      </aside>
      <div class="main"><header class="top"><button class="btn icon-btn burger" id="burger" aria-label="Buka menu" aria-expanded="false">${ICON.menu}</button><div><h1 id="ptitle">Dashboard</h1><p class="sub-t" id="psub"></p></div><span class="sp"></span>
        <a class="btn pri" href="/blog" target="_blank" rel="noopener" title="Buka blog di tab baru">${ICON.ext}Lihat situs</a><button class="btn icon-btn" id="theme" aria-label="Ganti mode gelap/terang" title="Mode gelap/terang">${ICON.moon}</button></header>
        <main class="page" id="page"></main></div></div>`;
    $("#logout").onclick = async () => { await api("/ms/admin/ca/logout", { json: {} }).catch(() => {}); ME = null; renderLogin(); };
    $("#theme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store("ca-admin-theme", t); };
    $("#burger").onclick = () => { const o = document.body.classList.toggle("nav-open"); $("#burger").setAttribute("aria-expanded", o); };
    const tg = $("#subtog"); if (tg) tg.onclick = () => { const o = $("#subs").hidden; $("#subs").hidden = !o; tg.setAttribute("aria-expanded", o); try { localStorage.setItem("ca-subs", o ? "1" : "0"); } catch {} };
    $("#side").addEventListener("click", e => { if (e.target.closest("a")) document.body.classList.remove("nav-open"); });
    refreshCounts();
  }
  async function refreshCounts() {
    if (!allowed(CS)) return;
    try { const j = await api("/ms/admin/ca/orders?size=10"); ORDER_COUNTS = j.counts; $$(".cnt[data-c]").forEach(c => { const n = ORDER_COUNTS[c.dataset.c]; c.textContent = n ? num(n) : ""; }); } catch (e) { /* hitungan menu opsional */ }
  }
  function setPage(title, sub, html) {
    document.title = `${title} · Admin Catatan Akademik`;
    $("#ptitle").textContent = title; $("#psub").textContent = sub || "";
    $("#page").innerHTML = html;
    const h = location.hash.replace(/^#\//, "");
    $$(".side a.nav").forEach(a => a.classList.toggle("on", a.dataset.r === h || (a.dataset.r === h.split("?")[0] && !$(`.side a.nav[data-r="${CSS.escape(h)}"]`))));
  }
  const loading = () => { const p = $("#page"); if (p) p.innerHTML = '<div class="empty">Memuat…</div>'; };
  const errBox = e => `<div class="card"><div class="empty">${esc(e.message || e)}</div></div>`;
  const badge = (label, tone) => `<span class="badge t-${tone || "mute"}">${esc(label)}</span>`;
  const forbidden = () => setPage("Akses ditolak", "", `<div class="card"><div class="empty">Peran ${esc(ME.roleLabel)} tidak punya akses ke halaman ini.</div></div>`);

  /* ---------------- router ---------------- */
  const ROUTES = [
    [/^dashboard$/, ALL, pDashboard], [/^traffic$/, ED, pTraffic], [/^posts$/, ED, pPosts], [/^posts\/new$/, ED, () => pEditor(null)], [/^posts\/([a-f0-9]+)$/, ED, m => pEditor(m[1])],
    [/^studio$/, ED, pStudio], [/^images$/, ED, pImages], [/^tema$/, OWN, pTema], [/^taxonomy$/, ED, pTaxonomy], [/^media$/, ED, pMedia], [/^comments$/, ED, pComments],
    [/^orders$/, CS, pOrders], [/^orders\/([A-Za-z0-9-]+)$/, CS, m => pOrder(m[1])], [/^payments$/, CS, pPayments],
    [/^tools\/(parafrase|layanan)$/, CS, m => pEmbed(m[1])], [/^customers$/, CS, pCustomers],
    [/^testimonials$/, ED, pTestimonials], [/^dokumen$/, OWN, pDokumen], [/^dokumen\/([a-f0-9]{16})$/, OWN, m => pDokumenDetail(m[1])], [/^editor$/, OWN, pPageEditor], [/^texts$/, OWN, pTexts], [/^services$/, OWN, pServices], [/^reports$/, OWN, pReports], [/^settings$/, OWN, pSettings], [/^seo$/, OWN, pSeo], [/^admins$/, OWN, pAdmins], [/^log$/, OWN, pLog], [/^account$/, ALL, pAccount],
  ];
  const params = () => new URLSearchParams((location.hash.split("?")[1]) || "");
  const go = (path, q) => { const s = q ? "?" + new URLSearchParams(Object.entries(q).filter(([, v]) => v !== "" && v != null)).toString() : ""; location.hash = "#/" + path + (s === "?" ? "" : s); };
  async function route() {
    if (!ME) return;
    const h = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "dashboard";
    if (h === "login") return go("dashboard");
    for (const [re, roles, fn] of ROUTES) {
      const m = h.match(re);
      if (m) { if (!allowed(roles)) return forbidden(); loading(); try { await fn(m); } catch (e) { $("#page").innerHTML = errBox(e); } return; }
    }
    setPage("Tidak ditemukan", "", '<div class="card"><div class="empty">Halaman admin ini tidak ada. <a href="#/dashboard">Ke dashboard</a></div></div>');
  }
  let IGNORE_HASH = false;
  window.addEventListener("hashchange", () => {
    if (IGNORE_HASH) { IGNORE_HASH = false; return; }
    if (DIRTY && !confirm("Perubahan artikel belum disimpan. Tinggalkan halaman ini?")) { IGNORE_HASH = true; history.back(); return; }
    DIRTY = false; route();
  });
  window.addEventListener("beforeunload", e => { if (DIRTY) { e.preventDefault(); e.returnValue = ""; } });

  /* ================= DASHBOARD ================= */
  function lineChart(series, keys) {
    // dua seri jumlah (satu sumbu), garis 2px, crosshair + tooltip, legenda + tabel data
    const W = 720, H = 220, P = { l: 34, r: 12, t: 10, b: 24 }, n = series.length;
    const max = Math.max(1, ...series.flatMap(s => keys.map(k => s[k[0]])));
    const step = Math.max(1, Math.ceil(max / 4)), top = step * 4;
    const x = i => P.l + (n < 2 ? 0 : i * (W - P.l - P.r) / (n - 1)), y = v => P.t + (H - P.t - P.b) * (1 - v / top);
    const grid = [0, 1, 2, 3, 4].map(i => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(i * step)}" y2="${y(i * step)}" stroke="var(--grid)"/><text x="${P.l - 6}" y="${y(i * step) + 4}" text-anchor="end" font-size="11" fill="var(--faint)">${i * step}</text>`).join("");
    const lbl = series.map((s, i) => (i % Math.ceil(n / 6) === 0 || i === n - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--faint)">${esc(new Date(s.day + "T00:00:00+07:00").toLocaleDateString("id-ID", { ...tz, day: "numeric", month: "short" }))}</text>` : "").join("");
    // garis 2px + titik nilai di hari yang ada datanya (angka terbaca langsung; detail lengkap di tooltip)
    const lines = keys.map(([k, , c]) => `<polyline fill="none" stroke="var(${c})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${series.map((s, i) => `${x(i)},${y(s[k])}`).join(" ")}"/>`
      + series.map((s, i) => s[k] > 0 ? `<circle cx="${x(i)}" cy="${y(s[k])}" r="3.5" fill="var(${c})" stroke="var(--surface)" stroke-width="1.5"/>` : "").join("")).join("");
    const id = "c" + Math.random().toString(36).slice(2, 7);
    const html = `<div class="chart" id="${id}"><div class="lg">${keys.map(([, l, c]) => `<span><i style="background:var(${c})"></i>${esc(l)}</span>`).join("")}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${keys.map(k => k[1]).join(" dan ")} per hari">${grid}${lbl}${lines}<line class="xh" y1="${P.t}" y2="${H - P.b}" stroke="var(--faint)" stroke-dasharray="3 3" visibility="hidden"/>${keys.map(([, , c], i) => `<circle class="dot${i}" r="4.5" fill="var(${c})" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`).join("")}<rect x="${P.l}" y="${P.t}" width="${W - P.l - P.r}" height="${H - P.t - P.b}" fill="transparent"/></svg>
      <div class="tip" hidden></div>
      <details class="small" style="margin-top:8px"><summary>Lihat sebagai tabel</summary><div class="tbl-wrap"><table class="t"><thead><tr><th>Tanggal</th>${keys.map(k => `<th class="num">${esc(k[1])}</th>`).join("")}</tr></thead><tbody>${series.slice().reverse().map(s => `<tr><td>${esc(dd(s.day + "T00:00:00+07:00"))}</td>${keys.map(k => `<td class="num">${num(s[k[0]])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details></div>`;
    setTimeout(() => {
      const root = document.getElementById(id); if (!root) return;
      const svg = $("svg", root), tip = $(".tip", root);
      const move = ev => {
        const r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * W / r.width;
        const i = Math.max(0, Math.min(n - 1, Math.round((px - P.l) / ((W - P.l - P.r) / Math.max(1, n - 1)))));
        const s = series[i]; $(".xh", svg).setAttribute("x1", x(i)); $(".xh", svg).setAttribute("x2", x(i)); $(".xh", svg).setAttribute("visibility", "visible");
        keys.forEach(([k], j) => { const c = $(".dot" + j, svg); c.setAttribute("cx", x(i)); c.setAttribute("cy", y(s[k])); c.setAttribute("visibility", "visible"); });
        tip.hidden = false; tip.style.left = (x(i) / W * r.width) + "px"; tip.style.top = (y(Math.max(...keys.map(([k]) => s[k]))) / H * r.height + 22) + "px";
        tip.innerHTML = `<b>${esc(dd(s.day + "T00:00:00+07:00"))}</b>${keys.map(([k, l]) => `${esc(l)}: ${num(s[k])}`).join("<br>")}`;
      };
      svg.addEventListener("pointermove", move); svg.addEventListener("pointerleave", () => { tip.hidden = true; $$("[visibility]", svg).forEach(e => e.setAttribute("visibility", "hidden")); });
    });
    return html;
  }
  /* href: seluruh kartu menjadi pintasan ke daftar yang sudah tersaring (label = tautan yang direntangkan lewat CSS) */
  const stat = (ic, value, label, small, href) => `<div class="card stat${href ? " is-link" : ""}"><span class="ic">${ICON[ic]}</span><div><b>${value}</b>${href ? `<a class="stat-a" href="${esc(href)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}${small ? `<small>${small}</small>` : ""}</div></div>`;
  async function pDashboard() {
    const q = params(), days = Number(q.get("days")) || 30;
    const to = dayKey(Date.now()), from = dayKey(Date.now() - (days - 1) * 864e5);
    const d = await api(`/ms/admin/ca/dashboard?from=${from}&to=${to}`);
    const range = `<select class="in" id="rg" style="width:auto">${[7, 30, 90].map(n => `<option value="${n}" ${n === days ? "selected" : ""}>${n} hari terakhir</option>`).join("")}</select>`;
    const p = d.posts;
    const warn = ME.ownerPasswordShared ? `<div class="notice">Akun <b>pemilik</b> masih memakai sandi yang sama dengan admin server. Atur <code>CA_ADMIN_PASSWORD</code> di file .env server, atau buat akun pemilik bernama di menu Admin &amp; Peran.</div>` : "";
    if (!d.orders) { // peran editor
      setPage("Dashboard", "Ringkasan konten", `${warn}<div class="grid g4">${stat("doc", num(p.published), "Artikel terbit", "", "#/posts?status=published")}${stat("pen", num(p.draft), "Draf", "", "#/posts?status=draft")}${stat("clock", num(p.scheduled), "Terjadwal", "", "#/posts?status=scheduled")}${stat("list", num(p.review), "Menunggu review")}</div>
        <div class="card"><div class="hd"><h2>Artikel terakhir diubah</h2><a class="btn sm pri" href="#/posts/new">Tulis artikel</a></div><div class="tbl-wrap"><table class="t"><tbody>${d.recentPosts.map(x => `<tr class="click" data-href="#/posts/${x.id}"><td>${esc(x.title)}</td><td>${badge({ draft: "Draf", review: "Review", scheduled: "Terjadwal", published: "Terbit" }[x.status] || x.status, x.status === "published" ? "ok" : "mute")}</td><td class="muted">${dt(x.updatedAt)}</td></tr>`).join("") || '<tr><td class="empty">Belum ada artikel.</td></tr>'}</tbody></table></div></div>`);
      bindRows(); return;
    }
    const o = d.orders;
    let hc = ""; try { const h = await api("/ms/admin/ca/health"); if (h.items && h.items.length) hc = `<div class="card" style="margin-bottom:14px"><div class="hd"><h2>Pemeriksaan sistem</h2></div><ul style="margin:0;padding-left:18px;line-height:1.8">${h.items.map(i => `<li class="${i.tone === "bad" ? "bad" : ""}"><b>${{ ok: "Aman", warn: "Perhatian", bad: "Perlu diperbaiki" }[i.tone] || ""}:</b> ${esc(i.text)}${i.href ? ` <a href="${esc(i.href)}">Buka</a>` : ""}</li>`).join("")}</ul></div>`; } catch (e) { hc = ""; }
    setPage("Dashboard", "Ringkasan aktivitas website", `${warn}${hc}<div class="bar"><span class="grow"></span>${range}</div>
      <div class="grid g4">
        ${stat("doc", num(p.published), "Artikel terbit", `${num(p.draft)} draf · ${num(p.scheduled)} terjadwal · ${num(p.review)} review`, "#/posts?status=published")}
        ${stat("box", num(d.newToday), "Pesanan baru hari ini", `${num(o.bayar)} menunggu pembayaran`, `#/orders?from=${to}&to=${to}`)}
        ${stat("card", num(o.konfirmasi), "Menunggu konfirmasi bayar", "Klik untuk membuka antrean", "#/payments")}
        ${stat("list", num(o.proses), "Sedang diproses", `${num(o.selesai)} selesai · ${num(o.batal)} batal/kedaluwarsa`, "#/orders?group=proses")}
      </div>
      ${d.traffic ? `<div class="grid g4">
        ${stat("chart", num(d.traffic.views), "Tayangan", "dari statistik web", "#/traffic")}
        ${stat("users", num(d.traffic.visitors), "Pengunjung", "dihitung per hari", "#/traffic")}
        ${stat("search", num(d.traffic.auditViews), "Tayangan halaman Audit", "orang yang membuka Audit", "#/traffic")}
        ${stat("card", num(d.traffic.paidAudit), "Pesanan audit berbayar", d.traffic.conv != null ? `konversi ${String(d.traffic.conv).replace(".", ",")}% dari pengunjung Audit` : "konversi tampil bila pengunjung Audit cukup", "#/orders?kind=audit")}
      </div>
      <div class="card"><div class="hd"><h2>Tayangan per halaman</h2><a class="small" href="#/traffic">Detail →</a></div><div class="bd" style="display:flex;flex-direction:column;gap:8px">${d.traffic.groups.map(x => `<div style="display:flex;justify-content:space-between;padding:10px;border-radius:10px;background:var(--surface2,rgba(127,127,127,.1))"><span>${esc(x.name)}</span><b>${num(x.views)}</b></div>`).join("") || '<div class="muted">Belum ada data.</div>'}</div></div>` : ""}
      <div class="grid g-main">
        <div class="card"><div class="hd"><h2>Aktivitas ${days} hari terakhir</h2><span class="muted small">Pendapatan terkonfirmasi: <b>${rp(d.revenue)}</b> (${num(d.paidCount)} pesanan)</span></div><div class="bd">${lineChart(d.series, [["orders", "Pesanan dibuat", "--s1"], ["paid", "Pesanan dibayar", "--s2"]])}<p class="small faint" style="margin:8px 0 0">${esc(d.definitions.revenue)}</p></div></div>
        <div class="card"><div class="hd"><h2>Aktivitas terbaru</h2><a class="small" href="#/log">Semua log</a></div><div class="bd"><ul class="timeline">${d.activity.map(a => `<li><div>${actLine(a)}<div class="small faint">${dt(a.at)}</div></div></li>`).join("") || '<li class="muted">Belum ada aktivitas.</li>'}</ul></div></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h2>Rekomendasi dari data</h2></div><div class="bd" style="display:flex;flex-direction:column;gap:10px">${(d.recommendations || []).map(x => `<div class="notice info" style="margin:0"><b>${esc(x.title)}</b><div class="small">${esc(x.why)}</div><div class="small">${esc(x.tip)}</div><a class="small" href="${esc(x.href)}">Buka →</a></div>`).join("") || '<div class="muted">Belum ada saran. Rekomendasi muncul bila datanya cukup.</div>'}</div></div>
        <div class="card"><div class="hd"><h2>Audit kesehatan web</h2></div><div class="bd"><ul class="timeline">${(d.health || []).map(x => `<li><div><a href="${esc(x.href)}">${x.level === "ok" ? "✓" : "!"} ${esc(x.text)}</a></div></li>`).join("")}</ul></div></div>
      </div>
      <div class="card"><div class="hd"><h2>Pesanan terbaru</h2><a class="small" href="#/orders">Lihat semua pesanan →</a></div><div class="tbl-wrap">${orderTable(d.recent)}</div></div>`);
    $("#rg").onchange = e => go("dashboard", { days: e.target.value });
    bindRows();
  }
  /* Kalimat aktivitas yang jelas: subjek (pesanan/artikel/admin) di depan, bukan "sistem kedaluwarsa". */
  const EV = { dibuat: "dibuat", dikonfirmasi: "pembayarannya dikonfirmasi", ditolak: "bukti bayarnya ditolak", kedaluwarsa: "kedaluwarsa (belum dibayar)", dibatalkan: "dibatalkan", dana_dikembalikan: "dananya ditandai sudah dikembalikan", dikerjakan: "mulai dikerjakan", hasil_dikirim: "hasilnya dikirim ke pelanggan", bukti_diunggah: "bukti bayar diunggah pelanggan", terkirim: "selesai dan terkirim" };
  const ACT = [[/orders\/[^/]+\/confirm$/, "Mengonfirmasi pembayaran"], [/orders\/[^/]+\/reject$/, "Menolak bukti bayar"], [/orders\/[^/]+\/cancel$/, "Membatalkan pesanan"], [/orders\/[^/]+\/refunded$/, "Menandai dana dikembalikan"], [/orders\/[^/]+\/notes$/, "Menambah catatan pesanan"],
    [/\/(start|mulai)$/, "Memulai pengerjaan pesanan"], [/\/(hasil|finalize|revised)$/, "Mengirim hasil pesanan"], [/posts\/[^/]+\/trash$/, "Memindah artikel ke sampah"], [/posts\/[^/]+\/restore$/, "Memulihkan artikel"], [/posts\/[^/]+\/featured$/, "Mengubah Artikel Pilihan"],
    [/posts\/[^/]+\/tags$/, "Memasang tag artikel"], [/posts\/[^/]+\/topic$/, "Memindah kategori artikel"], [/\/posts$/, "Menyimpan artikel"], [/settings$/, "Mengubah pengaturan"], [/admins/, "Mengelola akun admin"], [/comments/, "Memoderasi komentar"], [/upload|media/, "Mengunggah gambar"], [/qris/, "Mengganti foto QRIS"]];
  function actLine(a) {
    if (a.src === "pesanan") { const w = EV[a.action] || String(a.action || "").replace(/_/g, " "); return `Pesanan <a href="#/orders/${esc(a.target)}"><b>${esc(a.target)}</b></a> ${esc(w)}`; }
    const m = ACT.find(x => x[0].test(a.action || "")), what = m ? m[1] : String(a.action || "").replace(/^(POST|PUT|DELETE)\s+/, "");
    const who = String(a.who || "").replace(/^(.*) \((.*)\)$/, (m, n, u) => (n.toLowerCase() === u.toLowerCase() ? n : m));
    const obj = a.label ? ` · “${esc(a.label.length > 60 ? a.label.slice(0, 58) + "…" : a.label)}”` : a.target && a.target !== "null" ? ` · <span class="mono">${esc(a.target)}</span>` : "";
    return `<b>${esc(who)}</b>: ${esc(what)}${obj}`;
  }
  function bindRows(root = $("#page")) { $$("tr[data-href]", root).forEach(tr => tr.addEventListener("click", e => { if (!e.target.closest("a,button,select,input")) location.hash = tr.dataset.href; })); }
  const orderTable = items => items.length ? `<table class="t"><thead><tr><th>ID Pesanan</th><th>Layanan</th><th>Pelanggan (WA)</th><th class="num">Total</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>${items.map(o => `<tr class="click" data-href="#/orders/${esc(o.id)}"><td class="mono"><a href="#/orders/${esc(o.id)}">${esc(o.id)}</a></td><td>${esc(o.service)}</td><td class="mono">${esc(o.wa)}</td><td class="num">${rp(o.total)}</td><td>${badge(o.statusLabel, o.tone)}</td><td class="muted">${dt(o.createdAt)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada pesanan.</div>';


  /* ================= STUDIO POSTING SOSMED =================
     Menyiapkan caption dan gambar dari artikel. Kamu posting sendiri ke Instagram, Facebook, dan TikTok: tidak ada kirim otomatis. */
  async function pStudio() {
    const d = await loadBlog(), posts = d.posts.filter(x => !x.trashedAt && x.status !== "review").sort((x, y) => new Date(y.updatedAt) - new Date(x.updatedAt));
    const q = params(), sel = q.get("p") || (posts[0] && posts[0].id);
    const p = posts.find(x => x.id === sel);
    if (!p) return setPage("Studio Posting Sosmed", "Caption dan gambar dari artikel", `<div class="card"><div class="empty">Belum ada artikel. <a href="#/posts/new">Tulis artikel</a></div></div>`);
    let topPages = []; try { const t = await api("/ms/admin/ca/traffic?days=30"); topPages = (t.pages || []).filter(x => /^\/blog\//.test(x.path)).slice(0, 12); } catch { /* data pengunjung opsional */ }
    const hot = topPages.map(x => posts.find(y => x.path === "/blog/" + y.slug)).filter(Boolean).slice(0, 5);
    const hotTags = [...new Set(hot.flatMap(x => x.tags || []))].filter(t => !(p.tags || []).includes(t)).slice(0, 2);
    const heads = [...String(p.body || "").matchAll(/^##\s+(.+)$/gm)].map(m => m[1].replace(/[*_`]/g, "").trim()).slice(0, 3);
    const PL = [["ig", "Instagram", "instagram", 1080, 1350], ["fb", "Facebook", "facebook", 1200, 630], ["tt", "TikTok", "tiktok", 1080, 1920], ["li", "LinkedIn", "linkedin", 1200, 627]];
    const link = k => `${location.origin}/go/${k}/${p.slug}`;
    const cut = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, Math.max(c.lastIndexOf(" "), n - 30)).replace(/[,.;:\s]+$/, "") + "…"; };
    const tagOf = t => "#" + String(t).replace(/[^a-z0-9]/gi, "").toLowerCase();
    const mk = (topic, k) => {
      if (k === "li") {
        const first = cut(p.excerpt, 170), pts = heads.length ? heads.map(h => "• " + h).join("\n") : "";
        return [topic ? `Soal ${topic}: ini yang sering terlewat.` : (p.hookText || p.title), first, pts, "[Tulis 1-2 kalimat pengalaman pribadimu di sini sebelum diposting.]", "Di alur kerja atau layanan Anda, bagian mana yang sering dikira selesai padahal belum?", [...new Set([...(p.tags || []), ...hotTags].map(tagOf))].slice(0, 3).join(" ")].filter(Boolean).join("\n\n");
      }
      const hook = topic ? `Lagi cari ${topic}? Ini yang perlu kamu tahu.` : (p.hookText || p.title);
      const body = cut(p.excerpt, k === "tt" ? 110 : 190), pts = heads.length && k !== "tt" ? heads.map(h => "• " + h).join("\n") : "";
      const base = ["catatanakademik", "universitasterbuka", "mahasiswaut"], extra = [...(p.tags || []), ...hotTags].map(tagOf);
      const nTag = { ig: 8, fb: 3, tt: 5 }[k], tags = [...new Set([...base.map(t => "#" + t), ...extra])].slice(0, nTag).join(" ");
      const cta = k === "ig" ? "Baca panduan lengkapnya (tautan di bawah):" : "Baca panduan lengkapnya:";
      return [hook, body, pts, cta + "\n" + link(k), tags].filter(Boolean).join("\n\n");
    };
    const hermes = k => `Tulis caption ${PL.find(x => x[0] === k)[1]} berbahasa Indonesia untuk artikel di bawah.\nAturan: bahasa manusia sehari-hari, tanpa tanda pisah panjang, tanpa pola "bukan X, tapi Y", tanpa kalimat penutup klise, satu ajakan saja, jangan menambah fakta atau angka di luar artikel.${k === "li" ? "\nLinkedIn: sudut cerita atau pelajaran dari pengalaman kerja, tanpa tautan di isi postingan (tautan masuk komentar pertama), tutup dengan satu pertanyaan terbuka." : ""}\n\nJudul: ${p.title}\nRingkasan: ${p.excerpt || ""}\nPoin: ${heads.join("; ")}\nTautan: ${link(k)}\n\nIsi artikel:\n${String(p.body || "").slice(0, 3500)}`;
    const st = x => x.status === "published" ? ["Terbit", "#16a34a"] : x.status === "scheduled" ? ["Terjadwal", "#2563eb"] : ["Rekomendasi (draf)", "#b45309"];
    setPage("Studio Posting Sosmed", "Caption dan gambar dari artikel", `
      <div class="notice info">Studio hanya menyiapkan caption dan gambar. Kamu posting sendiri di tiap aplikasi, tidak ada kirim otomatis.</div>
      <div class="card"><div class="bd" style="display:grid;grid-template-columns:2fr 1fr;gap:12px"><label class="f">Sumber artikel<select class="in" id="stP">${posts.map(x => `<option value="${x.id}" ${x.id === p.id ? "selected" : ""}>${esc(x.title)}${x.status === "published" ? "" : " (draf)"}</option>`).join("")}</select></label>
        <label class="f">Topik yang lagi dicari (opsional)<input class="in" id="stK" maxlength="60" placeholder="mis. jadwal PKBJJ"></label></div></div>
      <div class="card"><div class="hd"><h2>Kalender posting</h2><span class="muted small">Jadwal terbit dan tanggal rekomendasi, 14 hari ke depan.</span></div><div class="bd"><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;font-size:12px">${(() => {
        const day = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10), ev = {};
        d.posts.filter(x => !x.trashedAt).forEach(x => { const k = x.status === "scheduled" && x.publishAt ? day(Date.parse(x.publishAt)) : x.status !== "published" ? x.recommendedAt : ""; if (k) (ev[k] = ev[k] || []).push(x); });
        const t0 = Date.now(), cells = []; const dow = new Date(t0 + 7 * 3600e3).getUTCDay(), pad = (dow + 6) % 7;
        const names = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map(n => `<div class="muted" style="text-align:center">${n}</div>`).join("");
        for (let i = 0; i < pad; i++) cells.push('<div></div>');
        for (let i = 0; i < 14; i++) { const k = day(t0 + i * 864e5), list = ev[k] || []; cells.push(`<div style="min-height:70px;border-radius:8px;padding:6px;background:${list.length ? "var(--tint1,rgba(124,58,237,.14))" : "var(--surface2,rgba(127,127,127,.08))"}"><div class="muted">${k.slice(8)}/${k.slice(5, 7)}</div>${list.map(x => { const [l, c] = st(x); return `<a href="#/studio?p=${x.id}" style="display:block;margin-top:3px;line-height:1.25;overflow-wrap:anywhere" title="${esc(x.title)} · ${l}">${esc(x.title)}<span style="display:block;font-size:10.5px;font-weight:700;color:${c}">${l}</span></a>`; }).join("")}</div>`); }
        return names + cells.join("");
      })()}</div></div></div>
      <div class="tabs" id="stTabs" role="tablist">${PL.map(([k, l], i) => `<button type="button" role="tab" data-k="${k}" class="${i ? "" : "on"}">${l}</button>`).join("")}</div>
      <div class="grid g2" style="margin-top:12px">
        <div class="card"><div class="hd"><h2 id="stH">Caption</h2></div><div class="bd" style="display:flex;flex-direction:column;gap:12px">
          <textarea class="in" id="stCap" rows="14"></textarea>
          <div class="bar"><button type="button" class="btn sm pri" id="stCopy">Salin caption</button><button type="button" class="btn sm" id="stHer" title="Salin perintah siap tempel untuk Hermes">Salin prompt buat Hermes</button></div>
          <div id="stC2w" hidden><label class="f">Komentar pertama (taruh tautan di sini)<textarea class="in" id="stCap2" rows="2"></textarea></label><div class="bar"><button type="button" class="btn sm" id="stCopy2">Salin komentar</button></div></div>
          <div class="small muted">Tautan di caption dihitung per platform di Pengunjung &amp; Konten (Klik dari sosmed).${p.status === "published" ? "" : " Artikel masih draf: tautan baru bisa dibuka setelah terbit."}</div></div></div>
        <div class="card"><div class="hd"><h2>Gambar</h2><span class="muted small" id="stSz"></span></div><div class="bd" style="display:flex;flex-direction:column;gap:12px">
          <canvas id="stC" width="1080" height="1350" style="width:100%;max-width:360px;max-height:520px;object-fit:contain;border-radius:12px;border:1px solid var(--border)"></canvas>
          <label class="f">Teks di gambar<input class="in" id="stT" maxlength="90" value="${esc(p.hookText || p.title)}"></label>
          <div class="bar"><a class="btn sm pri" id="stDl" download="${esc(p.slug)}-sosmed.png">Unduh gambar</a></div>
          ${p.cover ? "" : '<div class="small muted">Artikel belum punya sampul, jadi latar polos.</div>'}</div></div>
      </div>`);
    $("#stP").onchange = e => go("studio", { p: e.target.value });
    let cur = "ig"; const cv = $("#stC"), cx = cv.getContext("2d"); let im = null;
    const draw = () => {
      const [, name, , W, H] = PL.find(x => x[0] === cur); cv.width = W; cv.height = H; $("#stSz").textContent = `${name} · ${W}×${H}`;
      cx.fillStyle = "#13122a"; cx.fillRect(0, 0, W, H);
      if (im) { const r = Math.max(W / im.width, H / im.height), w = im.width * r, h = im.height * r; cx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); }
      const g = cx.createLinearGradient(0, H * .37, 0, H); g.addColorStop(0, "rgba(11,11,26,0)"); g.addColorStop(1, "rgba(11,11,26,.92)"); cx.fillStyle = g; cx.fillRect(0, H * .37, W, H);
      const pad = W * .065, fs = H > W ? W * .065 : H * .1, lh = fs * 1.2; cx.fillStyle = "#fff"; cx.font = `800 ${fs}px system-ui,sans-serif`; cx.textBaseline = "alphabetic";
      const words = ($("#stT").value || "").split(/\s+/), lines = []; let c = "";
      for (const w of words) { const t = c ? c + " " + w : w; if (cx.measureText(t).width > W - pad * 2 && c) { lines.push(c); c = w; } else c = t; }
      if (c) lines.push(c);
      const L = lines.slice(0, 5), yb = H - pad - fs * 1.1; L.forEach((l, i) => cx.fillText(l, pad, yb - (L.length - 1 - i) * lh));
      cx.fillStyle = "#c4b5fd"; cx.font = `700 ${fs * .5}px system-ui,sans-serif`; cx.fillText("Catatan Akademik", pad, H - pad * .8);
      try { $("#stDl").href = cv.toDataURL("image/png"); $("#stDl").download = `${p.slug}-${cur}.png`; } catch { $("#stDl").removeAttribute("href"); }
    };
    const cap = () => { $("#stCap").value = mk(($("#stK").value || "").trim(), cur); $("#stC2w").hidden = cur !== "li"; if (cur === "li") $("#stCap2").value = `Panduan lengkapnya: ${link("li")}`; };
    const show = k => { cur = k; $$("#stTabs button").forEach(b => b.classList.toggle("on", b.dataset.k === k)); $("#stH").textContent = "Caption " + PL.find(x => x[0] === k)[1]; cap(); draw(); };
    $$("#stTabs button").forEach(b => b.onclick = () => show(b.dataset.k));
    $("#stK").oninput = cap; $("#stT").oninput = draw;
    $("#stCopy").onclick = async () => { const t = $("#stCap"); try { await navigator.clipboard.writeText(t.value); toast("Caption disalin"); } catch { t.select(); toast("Tekan Ctrl+C untuk menyalin"); } };
    const cp = async (el, ok) => { try { await navigator.clipboard.writeText(typeof el === "string" ? el : el.value); toast(ok); } catch { toast("Salin manual dengan Ctrl+C"); } };
    $("#stCopy2").onclick = () => cp($("#stCap2"), "Komentar disalin");
    $("#stHer").onclick = () => cp(hermes(cur), "Prompt untuk Hermes disalin");
    show("ig");
    if (p.cover) { const i = new Image(); i.onload = () => { im = i; draw(); }; i.src = p.cover; }
  }


  /* ================= GAMBAR SITUS: ganti foto landing dan kartu layanan tanpa buka VPS ================= */
  /* jendela atur potongan (crop) 4:3 untuk foto kartu: geser kotak, tarik sudut kanan bawah, atau pakai slider zoom */
  async function cropFile(file) {
    const url = URL.createObjectURL(file), img = new Image();
    const ok = await new Promise(r => { img.onload = () => r(true); img.onerror = () => r(false); img.src = url; });
    if (!ok || !img.naturalWidth) { URL.revokeObjectURL(url); return file; }
    const W = img.naturalWidth, H = img.naturalHeight, sc = Math.min(560 / W, 340 / H, 1), dw = Math.round(W * sc), dh = Math.round(H * sc), R = 4 / 3;
    const maxW = Math.min(dw, dh * R), minW = Math.min(60, maxW);
    const st = { w: maxW, x: (dw - maxW) / 2, y: (dh - maxW / R) / 2 };
    const clamp = () => { st.w = Math.max(minW, Math.min(maxW, st.w)); st.x = Math.max(0, Math.min(dw - st.w, st.x)); st.y = Math.max(0, Math.min(dh - st.w / R, st.y)); };
    const body = `<p class="small muted" style="margin:0 0 8px">Geser kotak untuk memilih bagian foto. Tarik sudut kanan bawah untuk memperbesar atau memperkecil. Rasio terkunci 4:3.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start"><div id="crStage" style="position:relative;width:${dw}px;height:${dh}px;max-width:100%;touch-action:none;user-select:none;background:#000;overflow:hidden"><img src="${url}" alt="" draggable="false" style="width:100%;height:100%;display:block"><div id="crBox" style="position:absolute;border:2px solid #fff;box-shadow:0 0 0 999px rgba(5,8,25,.62);cursor:move;box-sizing:border-box"><div id="crH" style="position:absolute;right:-9px;bottom:-9px;width:18px;height:18px;background:#fff;border-radius:4px;cursor:nwse-resize"></div></div></div>
      <div style="width:200px"><div class="small muted" style="margin-bottom:6px">Pratinjau di kartu</div><canvas id="crPv" width="200" height="150" style="width:200px;height:150px;border-radius:10px;background:#000"></canvas></div></div>
      <label class="f" style="margin-top:10px">Zoom<input id="crZ" type="range" min="10" max="100" value="100"></label>`;
    const pv = d => { const c = $("#crPv", d).getContext("2d"); c.clearRect(0, 0, 200, 150); c.drawImage(img, st.x / sc, st.y / sc, st.w / sc, st.w / R / sc, 0, 0, 200, 150); };
    const draw = d => { clamp(); const b = $("#crBox", d); b.style.left = st.x + "px"; b.style.top = st.y + "px"; b.style.width = st.w + "px"; b.style.height = st.w / R + "px"; $("#crZ", d).value = Math.round(st.w / maxW * 100); pv(d); };
    const res = await dialog({ title: "Atur potongan foto", body, ok: "Potong dan simpan", wide: false, onOpen: d => {
      let mode = null, sx = 0, sy = 0, o = null;
      const box = $("#crBox", d), h = $("#crH", d);
      box.addEventListener("pointerdown", e => { mode = e.target === h ? "rs" : "mv"; sx = e.clientX; sy = e.clientY; o = { ...st }; box.setPointerCapture(e.pointerId); e.preventDefault(); });
      box.addEventListener("pointermove", e => { if (!mode) return; const dx = e.clientX - sx, dy = e.clientY - sy;
        if (mode === "mv") { st.x = o.x + dx; st.y = o.y + dy; } else { const nw = o.w + Math.max(dx, dy * R); st.w = Math.min(nw, dw - o.x, (dh - o.y) * R); }
        draw(d); });
      const end = () => { mode = null; }; box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
      $("#crZ", d).addEventListener("input", e => { const cx = st.x + st.w / 2, cy = st.y + st.w / R / 2; st.w = maxW * (Number(e.target.value) / 100); st.x = cx - st.w / 2; st.y = cy - st.w / R / 2; draw(d); });
      draw(d);
    } });
    let out = null;
    if (res) {
      const w = Math.min(1600, Math.round(st.w / sc)), c = document.createElement("canvas"); c.width = w; c.height = Math.round(w / R);
      c.getContext("2d").drawImage(img, st.x / sc, st.y / sc, st.w / sc, st.w / R / sc, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92));
      if (blob) out = new File([blob], "kartu.jpg", { type: "image/jpeg" });
    }
    URL.revokeObjectURL(url);
    return out;
  }
  async function pImages() {
    const CARD = { cek: "Cek & Parafrase Mandiri", semester: "Paket Semester", tugas: "Tugas tutorial", diskusi: "Diskusi", metopen: "Metopen UT", audit: "Audit dokumen", revisi: "Revisi", pengarahan: "Pengarahan Intensif", cv: "Buat CV ATS", info: "Info UT" };
    const [s, c] = await Promise.all([api("/ms/admin/site-images"), api("/ms/admin/parafrase/card-images")]);
    const tile = (id, label, src, has, kind) => `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px"><div style="aspect-ratio:4/3;border-radius:10px;background:var(--surface2,#eee) center/cover no-repeat url('${esc(src)}?t=${Date.now()}')"></div><b style="font-size:14px">${esc(label)}</b><div class="small muted">${has ? "Foto kamu dipakai" : "Memakai gambar bawaan"}</div><div class="bar"><label class="btn sm" style="cursor:pointer">Ganti foto<input type="file" accept="image/*" hidden data-up="${esc(id)}" data-kind="${kind}"></label>${has ? `<button type="button" class="btn sm bad" data-rm="${esc(id)}" data-kind="${kind}">Kembalikan bawaan</button>` : ""}</div></div>`;
    const sec = (title, note, tiles) => `<div class="card"><div class="hd"><h2>${esc(title)}</h2></div><div class="bd"><p class="small muted" style="margin:0 0 12px">${esc(note)}</p><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px">${tiles}</div></div></div>`;
    setPage("Gambar Situs", "Ganti foto di landing dan kartu layanan, langsung tayang", `
      ${sec("Kartu layanan", "Foto di kartu Layanan (beranda dan halaman Layanan UT). Rasio 4:3, otomatis dipotong dan dikecilkan.", c.slugs.map(x => tile("card/" + x.slug, CARD[x.slug] || x.label || x.slug, `/ruangakademikut/img/${x.slug}.webp`, x.has, "card")).join(""))}
      ${s.groups.map(g => sec(g.label, "Maks 12 MB. Format JPG, PNG, atau WebP.", g.items.map(i => tile(g.group + "/" + i.name, i.label, `/site-img/${g.group}/${i.name}.webp`, i.has, "site")).join(""))).join("")}`);
    const url = (id, kind) => kind === "card" ? "/ms/admin/parafrase/card-images/" + id.split("/")[1] : "/ms/admin/site-images/" + id;
    $$("[data-up]").forEach(i => i.onchange = async () => { let f = i.files[0]; if (!f) return; if (i.dataset.kind === "card") { f = await cropFile(f); i.value = ""; if (!f) return; } const fd = new FormData(); fd.append("img", f); toast("Mengunggah…"); try { await api(url(i.dataset.up, i.dataset.kind), { form: fd }); toast("Foto tersimpan, langsung tayang"); route(); } catch (e) { toast(e.message, true); } });
    $$("[data-rm]").forEach(b => b.onclick = async () => { if (!await confirmAct("Kembalikan gambar bawaan?", "Foto yang kamu unggah dihapus dan gambar bawaan dipakai lagi.", "Kembalikan")) return; try { await api(url(b.dataset.rm, b.dataset.kind), { method: "DELETE" }); toast("Dikembalikan"); route(); } catch (e) { toast(e.message, true); } });
  }

  /* ================= TEMA & FONT ================= */
  async function pTema() {
    const d = await api("/ms/admin/ca/tema"), P = d.presets;
    let sel = d.current;
    const fams = [...new Set(P.flatMap(p => [p.hf, p.bf]))].map(n => "family=" + n.replace(/ /g, "+") + ":wght@400;700").join("&");
    if (!document.getElementById("temaFonts")) { const l = document.createElement("link"); l.id = "temaFonts"; l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?" + fams + "&display=swap"; document.head.appendChild(l); }
    const mini = (p, dark) => { const bg = dark ? p.bd : p.bl, tx = dark ? p.td : p.tl, ac = dark ? p.pd : p.pl, on = dark ? p.bd : "#fff";
      return `<div style="flex:1 1 150px;border-radius:12px;background:${bg};color:${tx};padding:12px;border:1px solid rgba(128,128,128,.3)"><div style="font-size:10px;opacity:.7;margin-bottom:6px">${dark ? "Gelap" : "Terang"}</div><div style="font-family:'${esc(p.hf)}',serif;font-weight:700;font-size:15px;line-height:1.15;margin-bottom:6px">Tugas UT kamu aman dari <span style="color:${ac}">revisi.</span></div><div style="font-family:'${esc(p.bf)}',sans-serif;font-size:11px;opacity:.85;margin-bottom:8px">Cek dokumenmu gratis 500 kata pertama.</div><span style="display:inline-block;padding:5px 10px;border-radius:8px;background:${ac};color:${on};font-family:'${esc(p.bf)}',sans-serif;font-size:10px;font-weight:700">Cek gratis</span></div>`; };
    const dot = (c, b) => `<i style="width:16px;height:16px;border-radius:50%;background:${c};display:inline-block;${b ? "border:1px solid #999" : ""}"></i>`;
    const draw = () => {
      $("#tmL").innerHTML = P.map(p => `<label class="card" style="display:flex;gap:10px;align-items:center;padding:10px 12px;margin-bottom:8px;cursor:pointer;${p.id === sel ? "outline:2px solid var(--pri,#7c3aed)" : ""}"><input type="radio" name="tm" value="${p.id}" ${p.id === sel ? "checked" : ""}><span style="display:flex;gap:4px">${dot(p.pl)}${dot(p.pd)}${dot(p.bl, 1)}${dot(p.bd, 1)}</span><span><b>${esc(p.nama)}</b><br><span class="small muted">${esc(p.hf)} + ${esc(p.bf)}</span></span></label>`).join("");
      $$("[name=tm]").forEach(r => r.onchange = () => { sel = r.value; draw(); });
      $("#tmR").innerHTML = P.map(p => `<div class="card" style="padding:14px;${p.id === sel ? "outline:2px solid var(--pri,#7c3aed)" : ""}"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px"><b>${esc(p.nama)}</b>${p.id === d.current ? '<span class="small muted">sedang tayang</span>' : ""}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${mini(p, 0)}${mini(p, 1)}</div></div>`).join("");
    };
    setPage("Tema & Font", "Pilih paket warna dan font untuk seluruh halaman publik, langsung tayang", `<div class="notice info">Pengunjung tetap bisa memilih mode <b>Terang</b> atau <b>Gelap</b> sendiri. Tiap paket punya aksen terpisah untuk kedua mode supaya teks tetap terbaca. Font hanya dimuat untuk paket yang dipilih.</div>
      <div style="display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:16px;align-items:start"><div class="card"><div class="hd"><h2>Paket tema</h2></div><div class="bd"><div id="tmL"></div><div class="bar" style="margin-top:12px"><button class="btn pri" id="tmS" type="button">Simpan dan tayang</button><button class="btn" id="tmB" type="button">Kembali ke bawaan</button></div></div></div><div id="tmR" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px"></div></div>`);
    draw();
    const save = async id => { try { await api("/ms/admin/ca/tema", { json: { id } }); d.current = id; sel = id; draw(); toast("Tema tayang. Muat ulang halaman publik untuk melihatnya."); } catch (e) { fail(e); } };
    $("#tmS").onclick = () => save(sel);
    $("#tmB").onclick = async () => { if (await confirmAct("Kembali ke bawaan?", "Warna dan font situs kembali ke tampilan awal.", "Kembalikan")) save("bawaan"); };
  }

  /* ================= ARTIKEL ================= */
  let BLOG = null;
  const loadBlog = async () => (BLOG = await api("/ms/admin/posts"));
  const stOf = p => p.trashedAt ? "trash" : p.status === "scheduled" ? (Date.parse(p.publishAt) <= Date.now() ? "published" : "scheduled") : p.status;
  const ST_LABEL = { published: ["Terbit", "ok"], scheduled: ["Terjadwal", "info"], draft: ["Draf", "mute"], review: ["Menunggu review", "warn"], trash: ["Sampah", "bad"] };
  async function pPosts() {
    const q = params(), f = q.get("status") || "all", topic = q.get("topic") || "", s = (q.get("q") || "").toLowerCase(), tag = q.get("tag") || "";
    const d = await loadBlog(), all = d.posts.concat(d.trash);
    const cnt = k => all.filter(p => (k === "all" ? stOf(p) !== "trash" : stOf(p) === k)).length;
    const list = all.filter(p => (f === "all" ? stOf(p) !== "trash" : stOf(p) === f) && (!topic || p.topic === topic) && (!tag || (p.tags || []).includes(tag)) && (!s || (p.title + " " + (p.excerpt || "")).toLowerCase().includes(s)));
    const REC = f === "draft", recDay = k => { const [y, m, dd2] = k.split("-"); return dd2 + "/" + m + "/" + y; };
    const recCells = p => `<td data-rec="${p.id}">${p.recommendedAt ? `<button type="button" class="btn sm" data-recd="${p.id}" style="font-weight:700">${recDay(p.recommendedAt)}</button>` : `<button type="button" class="btn sm" data-recd="${p.id}" style="border-style:dashed;background:#fff8e1;color:#8a6d00">+ Isi tanggal</button>`}</td><td style="min-width:220px"><button type="button" class="btn sm" data-recw="${p.id}" style="white-space:normal;text-align:left;${p.recommendedWhy ? "background:#fff8e1;color:#5b4a00" : "color:#999"}">${p.recommendedWhy ? "📝 " + esc(p.recommendedWhy) : "Tulis alasan…"}</button></td>`;
    const tabs = [["all", "Semua"], ["published", "Terbit"], ["scheduled", "Terjadwal"], ["draft", "Draf"], ["review", "Review"], ["trash", "Sampah"]].map(([k, l]) => `<a href="#/posts?status=${k}" class="${f === k ? "on" : ""}">${l} <span class="n">${cnt(k)}</span></a>`).join("");
    setPage("Artikel Blog", "Kelola semua artikel, draf, dan jadwal publikasi", `
      <div class="bar"><nav class="tabs" aria-label="Status artikel">${tabs}</nav><span class="grow"></span><button class="btn" id="impMd" type="button">Impor file .md</button><a class="btn pri" href="#/posts/new">${ICON.pen}Tulis artikel</a></div>
      <div class="card"><div class="hd"><form class="bar" id="pf" style="flex:1"><select class="in" name="topic" style="width:auto"><option value="">Semua kategori</option>${Object.entries(d.topics).map(([k, v]) => `<option value="${k}" ${k === topic ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>
        <input class="in grow" name="q" type="search" placeholder="Cari judul artikel…" value="${esc(q.get("q") || "")}"><button class="btn">Cari</button>${tag ? `<a class="btn sm" href="#/posts">Tag #${esc(tag)} ✕</a>` : ""}</form></div>
      <div class="bulk" id="bulk" hidden><b id="bulkN"></b><span class="grow"></span>${f === "trash" ? '<button class="btn sm" data-bulk="restore">Pulihkan</button><button class="btn sm bad" data-bulk="delete">Hapus permanen</button>' : '<button class="btn sm bad" data-bulk="trash">Pindah ke sampah</button>'}<button class="btn sm" id="bulkX">Batal pilih</button></div>
      <div class="tbl-wrap">${list.length ? `<table class="t"><thead><tr><th class="chk"><input type="checkbox" id="selAll" aria-label="Pilih semua artikel di daftar ini" title="Pilih semua"></th><th>Judul</th><th>Kategori</th><th>Penulis</th><th>Status</th>${REC ? "<th>Rekomendasi tayang</th><th>Catatan (alasan)</th>" : ""}<th title="Pembaca unik per hari">Dilihat</th><th>Tanggal</th><th></th></tr></thead><tbody>${list.map(p => {
        const st = stOf(p), [l, tone] = ST_LABEL[st];
        return `<tr class="click" data-href="#/posts/${p.id}"><td class="chk"><input type="checkbox" class="selOne" value="${p.id}" aria-label="Pilih ${esc(p.title)}"></td><td><b>${esc(p.title)}</b>${p.featured ? ' <span class="badge t-info">Pilihan</span>' : ""}<div class="small faint">/blog/${esc(p.slug)}</div></td><td>${esc((d.topics[p.topic] || {}).label || p.topic)}</td><td>${esc(p.author || "dk")}</td><td>${badge(l, tone)}</td>${REC ? recCells(p) : ""}
          <td class="small"><b>${(p.views ? p.views.total : 0).toLocaleString("id-ID")}</b><div class="faint">${(p.views ? p.views.week : 0).toLocaleString("id-ID")} / 7 hari</div></td>
          <td class="muted small">${st === "scheduled" ? "Terbit " + dt(p.publishAt) : st === "published" ? "Terbit " + dd(p.publishedAt) : "Diubah " + dt(p.updatedAt)}</td>
          <td><div class="act"><button class="btn sm" data-menu="${p.id}" aria-haspopup="true">Aksi ▾</button></div></td></tr>`;
      }).join("")}</tbody></table>` : '<div class="empty">Tidak ada artikel di filter ini.</div>'}</div></div>`);
    $("#impMd").onclick = importMarkdown;
    const recSave = async (id, body) => { try { await api("/ms/admin/posts/" + id + "/recommend", { json: body }); toast("Tersimpan"); route(); } catch (err) { fail(err); } };
    $$("[data-recd]").forEach(b => b.onclick = e => { e.stopPropagation(); const p = all.find(x => x.id === b.dataset.recd), i = document.createElement("input"); i.type = "date"; i.className = "in"; i.value = p.recommendedAt || ""; b.replaceWith(i); i.focus(); try { i.showPicker && i.showPicker(); } catch {} i.onclick = ev => ev.stopPropagation(); let sv = false; i.onchange = () => { sv = true; recSave(p.id, { recommendedAt: i.value }); }; i.onblur = () => setTimeout(() => { if (i.isConnected && !sv) route(); }, 200); });
    $$("[data-recw]").forEach(b => b.onclick = e => { e.stopPropagation(); const p = all.find(x => x.id === b.dataset.recw), i = document.createElement("input"); i.className = "in"; i.maxLength = 160; i.placeholder = "mis. sebelum tuton dibuka"; i.value = p.recommendedWhy || ""; b.replaceWith(i); i.focus(); i.onclick = ev => ev.stopPropagation(); let done = false; const go2 = () => { if (done) return; done = true; recSave(p.id, { recommendedWhy: i.value.trim() }); }; i.onkeydown = ev => { if (ev.key === "Enter") go2(); if (ev.key === "Escape") { done = true; route(); } }; i.onblur = go2; });
    const ones = () => $$(".selOne"), chosen = () => ones().filter(c => c.checked).map(c => c.value);
    const syncBulk = () => { const n = chosen().length, allc = $("#selAll"); $("#bulk").hidden = !n; $("#bulkN").textContent = n + " artikel dipilih"; if (allc) { allc.checked = n > 0 && n === ones().length; allc.indeterminate = n > 0 && n < ones().length; } };
    ones().forEach(c => { c.onclick = e => e.stopPropagation(); c.onchange = syncBulk; });
    if ($("#selAll")) { $("#selAll").onclick = e => e.stopPropagation(); $("#selAll").onchange = e => { ones().forEach(c => { c.checked = e.target.checked; }); syncBulk(); }; }
    $("#bulkX").onclick = () => { ones().forEach(c => { c.checked = false; }); syncBulk(); };
    $$("[data-bulk]").forEach(b => b.onclick = async () => {
      const ids = chosen(), a = b.dataset.bulk; if (!ids.length) return;
      const live = all.filter(p => ids.includes(p.id) && stOf(p) === "published").length;
      const T = { trash: ["Pindah ke sampah?", `${ids.length} artikel disembunyikan dari situs${live ? ` (${live} di antaranya sedang TERBIT dan akan hilang dari situs)` : ""}. Bisa dipulihkan dalam 30 hari.`, "Pindah ke sampah"], restore: ["Pulihkan artikel?", `${ids.length} artikel dikembalikan ke status sebelumnya.`, "Pulihkan"], delete: ["Hapus permanen?", `${ids.length} artikel dan isinya dihapus selamanya. Tindakan ini tidak bisa dibatalkan.`, "Hapus permanen"] }[a];
      if (!await confirmAct(T[0], T[1], T[2], a === "restore" ? "pri" : "bad")) return;
      try { const r = await api("/ms/admin/posts/bulk", { json: { ids, action: a } }); toast(`${r.count} artikel ${{ trash: "dipindah ke sampah", restore: "dipulihkan", delete: "dihapus permanen" }[a]}`); route(); } catch (err) { fail(err); }
    });
    $("#pf").onsubmit = e => { e.preventDefault(); go("posts", { status: f, topic: e.target.topic.value, q: e.target.q.value.trim() }); };
    $("#pf").topic.onchange = () => $("#pf").requestSubmit();
    bindRows();
    $$("[data-menu]").forEach(b => b.onclick = e => { e.stopPropagation(); postMenu(b, all.find(p => p.id === b.dataset.menu)); });
  }
  /* Impor file Markdown (.md) menjadi draf. Berkas dibaca di browser; server menyimpan SEMUA sebagai draf, tidak ada yang langsung terbit. */
  async function importMarkdown() {
    let picked = [];
    const ok = await dialog({
      title: "Impor artikel dari file .md", wide: true, ok: "Impor jadi draf",
      body: `<p class="small muted" style="margin-top:0">Pilih satu atau banyak file .md. Setiap file menjadi satu <b>draf</b> (tidak ada yang langsung terbit). Judul, slug, meta title, meta description, tag, dan kategori diambil dari bagian awal file:</p>
        <pre class="small" style="white-space:pre-wrap;background:rgba(127,127,127,.12);padding:10px 12px;border-radius:10px">---\ntitle: Judul artikel\nslug: judul-artikel\nmeta_title: Maks. 60 karakter\nmeta_description: Maks. 155 karakter\ntags: [tuton, uas ut]\ntopic: study\nkeyword: kata kunci utama\n---\n\nIsi artikel (## sub-judul, tabel, tautan)</pre>
        <input type="file" id="mdFiles" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple><div class="small muted" id="mdSel" style="margin-top:6px">Belum ada file dipilih.</div>`,
      onOpen: d => { const inp = $("#mdFiles", d); inp.onchange = () => { picked = [...inp.files]; $("#mdSel", d).textContent = picked.length ? picked.length + " file dipilih: " + picked.map(f => f.name).join(", ") : "Belum ada file dipilih."; }; }
    });
    if (!ok) return;
    if (!picked.length) return toast("Pilih minimal satu file .md.", true);
    try {
      const files = await Promise.all(picked.map(async f => ({ name: f.name, text: await f.text() })));
      const r = await api("/ms/admin/posts/import", { json: { files } });
      const rows = r.results.map(x => x.ok
        ? `<li><b>✓ <a href="#/posts/${x.id}" data-close>${esc(x.title)}</a></b> <span class="small faint">/blog/${esc(x.slug)} · ${x.words} kata</span>${x.warnings.length ? `<ul class="small" style="margin:4px 0 0">${x.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : '<div class="small muted">Tidak ada catatan.</div>'}</li>`
        : `<li><b>${x.skipped ? "↷" : "✗"} ${esc(x.title || x.name)}</b> <span class="small faint">${esc(x.error)}</span></li>`).join("");
      route();
      await dialog({ title: `${r.created} draf dibuat dari ${r.results.length} file`, wide: true, ok: "", cancel: "Tutup", body: `<p class="small muted" style="margin-top:0">Semua berstatus <b>Draf</b>. Klik judul untuk membuka dan memeriksa. Catatan di bawah tiap judul adalah hal yang perlu kamu cek sebelum menerbitkan.</p><ul style="padding-left:18px;display:flex;flex-direction:column;gap:12px">${rows}</ul>`, onOpen: d => $$("[data-close]", d).forEach(a => a.addEventListener("click", () => d.finish(false))) });
    } catch (e) { fail(e); }
  }
  function postMenu(btn, p) {
    $$(".menu").forEach(m => m.remove());
    const st = stOf(p), m = document.createElement("div"); m.className = "menu"; m.setAttribute("role", "menu");
    m.innerHTML = st === "trash"
      ? `<button data-a="restore">Pulihkan</button><button data-a="del" class="danger">Hapus permanen</button>`
      : `<a href="#/posts/${p.id}">Edit</a><button data-a="preview">Pratinjau</button>${st === "published" ? `<a href="/blog/${esc(p.slug)}" target="_blank" rel="noopener">Lihat di situs</a><button data-a="feat">${p.featured ? "Lepas dari Artikel Pilihan" : "Jadikan Artikel Pilihan"}</button>` : ""}<button data-a="trash" class="danger">Pindah ke sampah</button>`;
    btn.parentElement.appendChild(m);
    const close = () => { m.remove(); document.removeEventListener("click", close); };
    setTimeout(() => document.addEventListener("click", close));
    m.addEventListener("click", async e => {
      const a = e.target.dataset.a; if (!a) return; close();
      try {
        if (a === "preview") return previewSaved(p.id);
        if (a === "feat") { await api(`/ms/admin/posts/${p.id}/featured`, { json: {} }); toast("Artikel pilihan diperbarui"); }
        if (a === "trash") { if (!await confirmAct("Pindah ke sampah?", `“${esc(p.title)}” disembunyikan dari situs. Bisa dipulihkan dalam 30 hari.`, "Pindah ke sampah", "bad")) return; await api(`/ms/admin/posts/${p.id}/trash`, { json: {} }); toast("Dipindah ke sampah"); }
        if (a === "restore") { await api(`/ms/admin/posts/${p.id}/restore`, { json: {} }); toast("Dipulihkan sebagai " + (ST_LABEL[p.status] || ["artikel"])[0]); }
        if (a === "del") { if (!await confirmAct("Hapus permanen?", `“${esc(p.title)}” dan isinya dihapus selamanya. Tindakan ini tidak bisa dibatalkan.`, "Hapus permanen", "bad")) return; await api(`/ms/admin/posts/${p.id}`, { method: "DELETE" }); toast("Dihapus permanen"); }
        route();
      } catch (err) { fail(err); }
    });
  }
  async function showHtml(title, html) {
    // <base> supaya CSS/gambar beralamat "/..." tetap termuat dari situs ini saat dibuka sebagai blob:
    const blob = new Blob([html.replace(/<head>/i, `<head><base href="${location.origin}/">`)], { type: "text/html" }), url = URL.createObjectURL(blob);
    // iframe tanpa izin skrip: pratinjau hanya menampilkan, tidak menjalankan apa pun
    await dialog({ title, wide: true, ok: "", cancel: "Tutup", body: `<iframe sandbox="allow-same-origin" title="${esc(title)}" src="${url}"></iframe>` });
    URL.revokeObjectURL(url);
  }
  async function previewSaved(id) { try { showHtml("Pratinjau artikel", await api(`/ms/admin/posts/${id}/preview`, { raw: true })); } catch (e) { fail(e); } }

  /* ---------------- editor ---------------- */
  async function pEditor(id) {
    const d = BLOG && !id ? BLOG : await loadBlog();
    const p = id ? d.posts.concat(d.trash).find(x => x.id === id) : null;
    if (id && !p) throw new Error("Artikel tidak ditemukan.");
    const live = p && (p.status === "published" || (p.status === "scheduled" && Date.parse(p.publishAt) <= Date.now()));
    const st = p ? (stOf(p) === "published" ? "published" : p.status) : "draft";
    const localAt = v => { if (!v) return ""; const x = new Date(Date.parse(v) + 7 * 3600e3); return x.toISOString().slice(0, 16); };
    const v = p || { title: "", slug: "", topic: Object.keys(d.topics)[0], excerpt: "", body: "", cover: "", tags: [], author: "dk", coverAlt: "", coverCaption: "", metaTitle: "", metaDesc: "", hookService: "", hookText: "", recommendedAt: "", recommendedWhy: "" };
    const TB = [["P", "Paragraf biasa", "p"], ["H2", "Sub-judul H2", "h2"], ["H3", "Sub-judul H3", "h3"], ["H4", "Sub-judul H4", "h4"], "|", ["B", "Tebal (Ctrl+B)", "b"], ["I", "Miring (Ctrl+I)", "i"], "|", ["•", "Daftar poin", "ul"], ["1.", "Daftar bernomor", "ol"], ["❝", "Kutipan", "q"], ["🔗", "Tautan (Ctrl+K)", "a"], ["🖼", "Sisipkan foto", "img"], ["▦", "Tabel", "tbl"], "|", ["↶", "Urungkan (Ctrl+Z)", "undo"], ["↷", "Ulangi (Ctrl+Y)", "redo"]];
    setPage(p ? "Edit Artikel" : "Tulis Artikel", p ? `Terakhir diubah ${dt(p.updatedAt)}${p.updatedBy ? " oleh " + esc(p.updatedBy) : ""}` : "Artikel baru", `
      <form class="ed" id="ef" novalidate>
        <div class="card"><div class="bd" style="display:flex;flex-direction:column;gap:12px">
          <label class="f">Judul artikel <small>· menjadi judul utama (H1) halaman</small><input class="in" name="title" maxlength="140" required value="${esc(v.title)}" style="font-size:18px;font-weight:700"></label>
          <div class="row"><label class="f">Slug (alamat) <small>${live ? "· terkunci karena sudah tayang (URL tidak diganti)" : "· kosongkan untuk dibuat dari judul"}</small><input class="in mono" name="slug" maxlength="80" value="${esc(v.slug)}" ${live ? "disabled" : ""} placeholder="otomatis-dari-judul"></label>
            <label class="f">Kategori<select class="in" name="topic">${Object.entries(d.topics).map(([k, t]) => `<option value="${k}" ${k === v.topic ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label></div>
          <div><div class="f" style="font-size:13px;font-weight:600;margin-bottom:5px">Konten artikel <small class="muted" style="font-weight:400">· pakai H2 untuk bagian utama, H3 untuk sub-bagian. Jangan memaksakan jumlah judul atau kata kunci.</small></div>
            <div class="tb" role="toolbar" aria-label="Format">${TB.map(b => b === "|" ? '<span class="sep"></span>' : `<button type="button" data-k="${b[2]}" title="${esc(b[1])}" aria-label="${esc(b[1])}">${b[0]}</button>`).join("")}</div>
            <textarea class="in body" name="body" id="body" spellcheck="true">${esc(v.body)}</textarea>
            <div class="ed-foot"><span id="wc"></span><span id="saveSt" aria-live="polite"></span></div></div>
          <label class="f">Ringkasan (excerpt) <small>· tampil di kartu blog dan di bawah judul</small><textarea class="in" name="excerpt" maxlength="260" rows="3">${esc(v.excerpt)}</textarea></label>
        </div></div>
        <div class="ed-side">
          <div class="card"><div class="hd"><nav class="tabs" role="tablist"><button type="button" class="on" data-tab="set" role="tab">Pengaturan</button><button type="button" data-tab="seo" role="tab">SEO</button></nav></div>
            <div class="bd" data-pane="set" style="display:flex;flex-direction:column;gap:12px">
              <fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font-size:13px;font-weight:600;margin-bottom:6px">Status</legend><div class="radio">
                ${[["draft", "Draf"], ["review", "Menunggu review"], ["scheduled", "Jadwalkan"], ["published", "Terbitkan"]].map(([k, l]) => `<label><input type="radio" name="status" value="${k}" ${st === k ? "checked" : ""}> ${l}</label>`).join("")}</div></fieldset>
              <label class="f" id="whenL">Tanggal & jam terbit (WIB)<input class="in" type="datetime-local" name="publishAt" value="${esc(localAt(v.publishAt))}"></label>
              <label class="f">Penulis<input class="in" name="author" maxlength="60" value="${esc(v.author || "dk")}"></label>
              <label class="f">Tag <small>· pisahkan dengan koma, maks 8</small><input class="in" name="tags" maxlength="240" value="${esc((v.tags || []).join(", "))}" placeholder="uas, jadwal-ut, registrasi"></label><div class="bar small" id="tagSug"></div>
              <div class="f" style="font-size:13px;font-weight:600">Gambar sampul</div>
              <div class="cover-box" id="cov" style="${v.cover ? `background-image:url('${esc(v.cover)}')` : ""}">${v.cover ? "" : "Belum ada gambar"}</div>
              <div class="bar"><label class="btn sm">Unggah gambar<input type="file" id="covF" accept="image/*" hidden></label><button type="button" class="btn sm" id="covP">Pilih dari Media</button><button type="button" class="btn sm" id="covC">Atur crop</button><button type="button" class="btn sm bad" id="covX">Hapus</button></div>
              <input type="hidden" name="cover" value="${esc(v.cover || "")}">
              <label class="f">Teks alt sampul <small>· jelaskan isi gambar untuk pembaca layar dan Google</small><input class="in" name="coverAlt" maxlength="160" value="${esc(v.coverAlt || "")}"></label>
              <label class="f">Keterangan foto (caption) <small>· opsional</small><input class="in" name="coverCaption" maxlength="200" value="${esc(v.coverCaption || "")}"></label>
              <div class="f" style="font-size:13px;font-weight:600">Hook layanan di artikel</div>
              <label class="f">Layanan yang diajak <small>· otomatis dari isi artikel</small><select class="in" name="hookService">${[["", "Otomatis"], ["audit", "Audit Dokumen"], ["tugas", "Tugas tutorial"], ["diskusi", "Diskusi"], ["metopen", "Metopen UT"], ["off", "Matikan hook"]].map(([k, l]) => `<option value="${k}" ${(v.hookService || "") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
              <label class="f">Kalimat ajakan <small>· opsional, kosong = bawaan</small><input class="in" name="hookText" maxlength="120" value="${esc(v.hookText || "")}"></label>
              <div class="f" style="font-size:13px;font-weight:600">Jadwal terbit yang disarankan</div>
              <label class="f">Tanggal rekomendasi <small>· isi dari tanggal penting UT yang sudah terverifikasi</small><input class="in" type="date" name="recommendedAt" value="${esc(v.recommendedAt || "")}"></label>
              <label class="f">Alasan <small>· mis. sebelum tuton dibuka</small><input class="in" name="recommendedWhy" maxlength="160" value="${esc(v.recommendedWhy || "")}"></label>
              ${p ? `<button type="button" class="btn sm" id="revB">Riwayat revisi</button>` : ""}
            </div>
            <div class="bd" data-pane="seo" hidden style="flex-direction:column;gap:12px">
              <label class="f">Judul SEO <small id="mtC"></small><input class="in" name="metaTitle" maxlength="70" value="${esc(v.metaTitle || "")}" placeholder="kosong = pakai judul artikel"></label>
              <label class="f">Meta description <small id="mdC"></small><textarea class="in" name="metaDesc" maxlength="170" rows="3" placeholder="kosong = pakai ringkasan">${esc(v.metaDesc || "")}</textarea></label>
              <div><div class="small muted" style="margin-bottom:6px">Perkiraan tampilan di Google</div><div class="serp" id="serp"></div></div>
              <div><div class="small muted" style="margin-bottom:6px">Checklist</div><ul class="checks" id="chk"></ul></div>
            </div>
          </div>
          <div class="card"><div class="bd" style="display:flex;flex-direction:column;gap:8px">
            <p class="err" id="eErr" role="alert"></p>
            <button type="submit" class="btn pri" id="saveB">Simpan</button>
            <div class="bar"><button type="button" class="btn grow" id="draftB">Simpan draf</button><button type="button" class="btn grow" id="prevB">Pratinjau</button></div>
            ${p && live ? `<a class="btn" href="/blog/${esc(p.slug)}" target="_blank" rel="noopener">${ICON.ext}Lihat di situs</a>` : ""}
          </div></div>
        </div>
      </form>`);
    const f = $("#ef"), ta = $("#body"), key = "ca-draft-" + (id || "new");
    const val = () => ({ id: id || undefined, title: f.elements.title.value.trim(), slug: f.slug.value.trim(), topic: f.topic.value, body: ta.value, excerpt: f.excerpt.value.trim(), status: f.status.value, publishAt: f.publishAt.value ? new Date(f.publishAt.value + ":00+07:00").toISOString() : "", author: f.author.value.trim(), tags: f.tags.value, cover: f.cover.value, coverAlt: f.coverAlt.value.trim(), coverCaption: f.coverCaption.value.trim(), metaTitle: f.metaTitle.value.trim(), metaDesc: f.metaDesc.value.trim(), hookService: f.hookService.value, hookText: f.hookText.value.trim(), recommendedAt: f.recommendedAt.value, recommendedWhy: f.recommendedWhy.value.trim() });
    const LBL = { draft: "Simpan draf", review: "Kirim ke review", scheduled: "Jadwalkan", published: live ? "Perbarui artikel" : "Terbitkan" };
    const sync = () => {
      const s = f.status.value; $("#saveB").textContent = LBL[s]; $("#whenL").hidden = s !== "scheduled";
      const w = words(ta.value.replace(/!\[[^\]]*\]\([^)]*\)/g, "")); $("#wc").textContent = `${num(w)} kata · ±${Math.max(1, Math.round(w / 200))} menit baca`;
      const t = f.metaTitle.value || f.elements.title.value, ds = f.metaDesc.value || f.excerpt.value;
      $("#mtC").innerHTML = `· <span class="${t.length > 60 ? "cnt-warn" : "cnt-ok"}">${t.length}/60</span>`;
      $("#mdC").innerHTML = `· <span class="${ds.length < 70 || ds.length > 160 ? "cnt-warn" : "cnt-ok"}">${ds.length}/160</span>`;
      $("#serp").innerHTML = `<div class="u">catatanakademik.com › blog › ${esc(f.slug.value || "…")}</div><div class="t">${esc((t || "Judul artikel").slice(0, 62))}${t.length > 62 ? "…" : ""} — Catatan Akademik</div><div class="d">${esc((ds || "Tambahkan ringkasan agar Google punya deskripsi yang jelas.").slice(0, 158))}</div>`;
      const has2 = /^\s*##?\s+\S/m.test(ta.value), C = [[!!f.elements.title.value.trim(), "Judul artikel diisi"], [t.length <= 60, "Judul SEO ≤ 60 karakter"], [ds.length >= 70 && ds.length <= 160, "Deskripsi 70–160 karakter"], [/\b(ut|universitas terbuka)\b/i.test(t + " " + ds), "Menyebut “UT” atau “Universitas Terbuka” di judul/deskripsi (secara wajar)"], [!!f.cover.value, "Gambar sampul dipasang"], [!f.cover.value || !!f.coverAlt.value.trim(), "Teks alt sampul diisi"], [w < 300 || has2, "Tulisan panjang punya sub-judul H2"], [!/!\[[^\]\s]*_[^\]\s]*\]\(/.test(ta.value), "Alt foto di isi bukan nama file"], [w >= 300, "Isi minimal ±300 kata (saran, bukan aturan)"]];
      $("#chk").innerHTML = C.map(([ok, l]) => `<li><span class="${ok ? "y" : "n"}">${ok ? "✓" : "!"}</span>${esc(l)}</li>`).join("");
    };
    const mark = debounce(() => { store(key, JSON.stringify({ at: Date.now(), v: val() })); $("#saveSt").textContent = "Belum disimpan · draf lokal tersimpan di browser ini"; }, 600);
    f.addEventListener("input", () => { DIRTY = true; sync(); mark(); });
    f.addEventListener("change", sync);
    $$("[data-tab]", f).forEach(b => b.onclick = () => { $$("[data-tab]", f).forEach(x => x.classList.toggle("on", x === b)); $$("[data-pane]", f).forEach(pn => { pn.hidden = pn.dataset.pane !== b.dataset.tab; pn.style.display = pn.hidden ? "none" : "flex"; }); });
    sync(); $("#saveSt").textContent = p ? "Tersimpan" : "";
    // saran tag dari kata kunci artikel (hanya artikel yang sudah tersimpan); klik = tambahkan ke kolom Tag
    if (id) api("/ms/admin/tag-suggestions").then(sg => {
      const it = sg.items.find(x => x.id === id), box = $("#tagSug"); if (!it || !it.suggested.length || !box) return;
      box.innerHTML = `<span class="muted">Saran:</span>${it.suggested.map(t => `<button type="button" class="btn sm" data-sug="${esc(t)}">+ ${esc(sg.labels[t] || t)}</button>`).join("")}`;
      $$("[data-sug]", box).forEach(b => b.onclick = () => { const cur = f.tags.value.split(",").map(s => s.trim()).filter(Boolean); if (!cur.includes(b.dataset.sug)) f.tags.value = cur.concat(b.dataset.sug).join(", "); b.remove(); DIRTY = true; mark(); });
    }).catch(() => {});

    // pemulihan draf lokal (hanya di browser ini) bila lebih baru dari versi server
    try { const loc = JSON.parse(store(key) || "null"); if (loc && (!p || loc.at > Date.parse(p.updatedAt)) && (loc.v.body !== v.body || loc.v.title !== v.title)) {
      if (await dialog({ title: "Pulihkan draf lokal?", body: `<p>Ada perubahan yang belum disimpan dari ${esc(dt(loc.at))} di browser ini.</p>`, ok: "Pulihkan", cancel: "Abaikan" })) {
        ["title", "slug", "excerpt", "author", "tags", "coverAlt", "coverCaption", "metaTitle", "metaDesc", "hookText", "recommendedAt", "recommendedWhy"].forEach(k => { if (f[k] && !f[k].disabled && loc.v[k] != null) f[k].value = loc.v[k]; }); ta.value = loc.v.body || ""; DIRTY = true; sync();
      } else store(key, null);
    } } catch (e) { store(key, null); }

    /* toolbar: insertText menjaga riwayat undo bawaan browser */
    const insert = text => { ta.focus(); if (!document.execCommand("insertText", false, text)) ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input", { bubbles: true })); };
    const lineRange = () => { const s = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1; let e = ta.value.indexOf("\n", ta.selectionEnd); if (e < 0) e = ta.value.length; return [s, e]; };
    const setLines = fn => { const [s, e] = lineRange(); ta.setSelectionRange(s, e); insert(ta.value.slice(s, e).split("\n").map(fn).join("\n")); };
    const strip = l => l.replace(/^(#{1,6}\s+|>\s?|[-*•]\s+|\d{1,2}[.)]\s+)/, "");
    const wrap = (a, b, ph) => { const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph; insert(a + sel + b); };
    async function doKey(k) {
      if (k === "undo" || k === "redo") { ta.focus(); document.execCommand(k); return; }
      if (k === "p") return setLines(strip);
      if (/^h[234]$/.test(k)) return setLines(l => "#".repeat(+k[1]) + " " + strip(l));
      if (k === "ul") return setLines(l => "- " + strip(l));
      if (k === "ol") { let i = 0; return setLines(l => `${++i}. ${strip(l)}`); }
      if (k === "q") return setLines(l => "> " + strip(l));
      if (k === "b") return wrap("**", "**", "teks tebal");
      if (k === "i") return wrap("*", "*", "teks miring");
      if (k === "tbl") return insert("\n\n| Kolom 1 | Kolom 2 |\n|---|---|\n| Isi | Isi |\n\n");
      if (k === "a") {
        const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd), s = ta.selectionStart, e = ta.selectionEnd;
        const url = await dialog({ title: "Sisipkan tautan", input: { label: "Alamat tautan", value: "https://", required: true, min: 2, hint: "Tautan ke halaman sendiri boleh diawali / (mis. /blog/...)" }, ok: "Sisipkan" });
        if (!url || !/^(https?:\/\/|\/)/.test(url)) return url && toast("Tautan harus diawali https:// atau /", true);
        ta.setSelectionRange(s, e); return insert(`[${sel || "teks tautan"}](${url})`);
      }
      if (k === "img") {
        const pos = [ta.selectionStart, ta.selectionEnd], urls = await pickImages();
        for (const u of urls) {
          const alt = await dialog({ title: "Teks alt foto", body: `<img src="${esc(u)}" alt="" style="max-width:100%;max-height:160px;border-radius:8px;align-self:flex-start">`, input: { label: "Jelaskan isi foto (untuk pembaca layar dan Google)", required: true, min: 5, minMsg: "Tulis minimal 5 huruf yang menjelaskan foto.", max: 120 }, ok: "Sisipkan" });
          if (!alt) continue;
          ta.setSelectionRange(...pos); insert(`\n\n![${alt.replace(/[\[\]()]/g, "")}](${u})\n\n`); pos[0] = pos[1] = ta.selectionEnd; toast("Foto disisipkan");
        }
      }
    }
    /* tempel (Ctrl+V) atau seret foto langsung ke kotak tulisan: boleh banyak sekaligus; teks alt diambil dari nama berkas, periksa lagi */
    const imgFiles = dt => [...((dt && dt.files) || [])].filter(x => /^image\//.test(x.type));
    async function addFiles(files) {
      for (const file of files) {
        try {
          toast("Mengunggah " + file.name + "…"); const fd = new FormData(); fd.append("file", file); const r = await api("/ms/admin/ca/upload", { form: fd });
          const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/[\[\]()]/g, "").trim(), alt = base.length >= 5 && /[a-z]{3}/i.test(base) ? base : "Foto artikel";
          insert(`\n\n![${alt}](${r.url})\n\n`); toast("Foto disisipkan. Periksa teks alt-nya.");
        } catch (e) { fail(e); }
      }
    }
    ta.addEventListener("paste", e => { const fs = imgFiles(e.clipboardData); if (!fs.length) return; e.preventDefault(); addFiles(fs); });
    ta.addEventListener("dragover", e => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
    ta.addEventListener("drop", e => { const fs = imgFiles(e.dataTransfer); if (!fs.length) return; e.preventDefault(); addFiles(fs); });
    $(".tb").addEventListener("click", e => { const b = e.target.closest("button"); if (b) doKey(b.dataset.k); });
    ta.addEventListener("keydown", e => { if (!(e.ctrlKey || e.metaKey)) return; const k = { b: "b", i: "i", k: "a" }[e.key.toLowerCase()]; if (k) { e.preventDefault(); doKey(k); } });
    document.addEventListener("keydown", function sk(e) { if (!document.body.contains(f)) return document.removeEventListener("keydown", sk); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });

    const setCover = url => { f.cover.value = url; $("#cov").style.backgroundImage = `url('${url}')`; $("#cov").textContent = ""; DIRTY = true; sync(); mark(); };
    $("#covF").onchange = async e => { const file = e.target.files[0]; if (!file) return; try { const fd = new FormData(); fd.append("file", file); toast("Mengunggah sampul…"); const r = await api("/ms/admin/ca/upload", { form: fd }); const c = await cropCover(r.url); if (c) setCover(c); } catch (err) { fail(err); } e.target.value = ""; };
    $("#covP").onclick = async () => { const u = (await pickImages())[0]; if (!u) return; const c = await cropCover(u); if (c) setCover(c); };
    $("#covC").onclick = async () => { if (!f.cover.value) return toast("Pilih gambar sampul dulu.", true); const c = await cropCover(f.cover.value); if (c) setCover(c); };
    $("#covX").onclick = () => { f.cover.value = ""; $("#cov").style.backgroundImage = ""; $("#cov").textContent = "Belum ada gambar"; DIRTY = true; sync(); };
    $("#prevB").onclick = async () => { try { showHtml("Pratinjau artikel", await api("/ms/admin/preview-page", { json: val(), raw: true })); } catch (e) { fail(e); } };
    $("#draftB").onclick = () => { f.status.value = "draft"; $$("input[name=status]", f).forEach(r => { r.checked = r.value === "draft"; }); sync(); save(); };
    if ($("#revB")) $("#revB").onclick = () => revisions(id, f, ta, sync);
    f.addEventListener("submit", e => { e.preventDefault(); save(); });
    async function save() {
      const body = val(); $("#eErr").textContent = "";
      if (!body.title) { $("#eErr").textContent = "Judul wajib diisi."; f.elements.title.focus(); return; }
      if (body.status === "scheduled" && !body.publishAt) { $("#eErr").textContent = "Isi tanggal & jam terbit."; f.publishAt.focus(); return; }
      if (body.status === "published" && !live && !await confirmAct("Terbitkan artikel?", "Artikel langsung tampil di situs dan masuk sitemap.", "Terbitkan")) return;
      await busy($("#saveB"), async () => {
        try {
          const r = await api("/ms/admin/posts", { json: body });
          DIRTY = false; store(key, null); BLOG = null;
          toast({ draft: "Draf tersimpan", review: "Dikirim ke review", scheduled: "Dijadwalkan " + dt(r.post.publishAt), published: "Artikel terbit" }[r.post.status] || "Tersimpan");
          if (!id) go("posts/" + r.post.id); else route();
        } catch (err) { $("#eErr").textContent = err.message; $("#saveSt").textContent = "Gagal menyimpan"; }
      });
    }
  }
  async function revisions(id, f, ta, sync) {
    try {
      const r = await api(`/ms/admin/posts/${id}/revisions`);
      const body = r.items.length ? `<p class="small muted">Versi lama tersimpan otomatis setiap judul, ringkasan, atau isi berubah (maks 30). Pulihkan = isi dimuat ke editor; belum tersimpan sampai kamu klik Simpan.</p><div class="tbl-wrap"><table class="t"><thead><tr><th>Waktu</th><th>Oleh</th><th>Judul</th><th class="num">Kata</th><th></th></tr></thead><tbody>${r.items.map(x => `<tr><td>${dt(x.at)}</td><td>${esc(x.by)}</td><td>${esc(x.title)}</td><td class="num">${num(x.words)}</td><td><button class="btn sm" type="button" data-rev="${x.n}">Pulihkan</button></td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">Belum ada versi lama.</div>';
      await dialog({ title: "Riwayat revisi", wide: true, ok: "", cancel: "Tutup", body, onOpen: d => $$("[data-rev]", d).forEach(b => b.onclick = async () => {
        const x = await api(`/ms/admin/posts/${id}/revisions/${b.dataset.rev}`); f.elements.title.value = x.title; f.excerpt.value = x.excerpt || ""; ta.value = x.body; DIRTY = true; sync(); d.finish(false); toast("Versi lama dimuat ke editor. Klik Simpan untuk memakainya.");
      }) });
    } catch (e) { fail(e); }
  }

  /* ---------------- kategori, tag, media, komentar ---------------- */
  async function pTaxonomy() {
    const d = await loadBlog(), posts = d.posts, tags = new Map(), sg = await api("/ms/admin/tag-suggestions");
    posts.forEach(p => (p.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
    const lab = t => sg.labels[t] || t, pending = sg.items.filter(x => x.suggested.length), moves = sg.items.filter(x => x.suggestedTopic);
    const topicCard = moves.length ? `<div class="card"><div class="hd"><h2>Saran kategori</h2><span class="muted small">${moves.length} artikel</span></div>
      <div class="bd"><p class="small muted" style="margin:0">"Info UT" untuk pengumuman dan jadwal; "Tips Kuliah UT" untuk panduan dan cara belajar. Dengan begitu label di filter dan di kartu artikel konsisten. Isi, tanggal, dan alamat artikel tidak berubah.</p></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Artikel</th><th>Sekarang</th><th>Saran</th><th></th></tr></thead><tbody>${moves.map(x => `<tr><td><b>${esc(x.title)}</b></td><td>${esc(sg.topics[x.topic] || x.topic)}</td><td><span class="badge t-info">${esc(sg.topics[x.suggestedTopic])}</span></td><td><button class="btn sm" data-topicid="${x.id}" data-to="${x.suggestedTopic}">Pindahkan</button></td></tr>`).join("")}</tbody></table></div></div>` : "";
    const sugCard = `<div class="card"><div class="hd"><h2>Saran tag untuk artikel</h2>${pending.length ? `<button class="btn pri sm" id="tagAll">Pasang semua saran (${pending.length} artikel)</button>` : ""}</div>
      <div class="bd"><p class="small muted" style="margin:0 0 10px">Saran dibuat dari kata kunci di judul, ringkasan, dan isi (UAS, THE, registrasi, tugas tutorial, Metopen, dll). Tag membantu pembaca dan tautan internal (muncul sebagai "Topik populer" di blog); tidak menjamin naik peringkat Google. Periksa sebelum memasang.</p></div>
      <div class="tbl-wrap">${pending.length ? `<table class="t"><thead><tr><th>Artikel</th><th>Tag sekarang</th><th>Saran</th><th></th></tr></thead><tbody>${pending.map(x => `<tr><td><b>${esc(x.title)}</b></td><td class="small">${x.tags.map(t => esc(lab(t))).join(", ") || '<span class="faint">–</span>'}</td><td class="small">${x.suggested.map(t => `<span class="badge t-info" style="margin:2px">${esc(lab(t))}</span>`).join("")}</td><td><button class="btn sm" data-tagid="${x.id}">Pasang</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty">Semua saran sudah terpasang.</div>'}</div></div>`;
    setPage("Kategori & Tag", "Kategori ditetapkan sistem; tag dibuat dari editor artikel", `<div class="grid g2">
      <div class="card"><div class="hd"><h2>Kategori</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Kategori</th><th class="num">Artikel</th><th></th></tr></thead><tbody>${Object.entries(d.topics).map(([k, t]) => `<tr><td><b>${esc(t.label)}</b><div class="small faint">${esc(t.ask)}</div></td><td class="num">${posts.filter(p => p.topic === k).length}</td><td><a class="btn sm" href="#/posts?topic=${k}">Lihat</a> <a class="btn sm" href="/blog?f=${k}" target="_blank" rel="noopener">Halaman publik</a></td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><div class="hd"><h2>Tag</h2><span class="muted small">${tags.size} tag</span></div><div class="bd">${tags.size ? `<div class="tabs">${[...tags.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `<a href="#/posts?tag=${encodeURIComponent(t)}">${esc(lab(t))} <span class="n">${n}</span></a>`).join("")}</div>` : '<div class="empty">Belum ada tag. Pasang saran di bawah atau tambahkan di editor artikel (panel Pengaturan).</div>'}</div></div></div>${topicCard}${sugCard}`);
    $$("[data-topicid]").forEach(b => b.onclick = () => busy(b, async () => { try { await api(`/ms/admin/posts/${b.dataset.topicid}/topic`, { json: { topic: b.dataset.to } }); toast("Kategori dipindahkan"); route(); } catch (e) { fail(e); } }));
    const apply = (x) => api(`/ms/admin/posts/${x.id}/tags`, { json: { tags: [...new Set(x.tags.concat(x.suggested))] } });
    $$("[data-tagid]").forEach(b => b.onclick = () => busy(b, async () => { try { await apply(sg.items.find(x => x.id === b.dataset.tagid)); toast("Tag dipasang"); route(); } catch (e) { fail(e); } }));
    if ($("#tagAll")) $("#tagAll").onclick = async e => {
      if (!await confirmAct("Pasang semua saran tag?", `${pending.length} artikel akan mendapat tag sesuai saran. Isi dan tanggal artikel tidak berubah; tag bisa diubah lagi di editor.`, "Pasang semua")) return;
      busy(e.target, async () => { try { for (const x of pending) await apply(x); toast(`Tag dipasang di ${pending.length} artikel`); route(); } catch (err) { fail(err); } });
    };
  }
  /* Atur gambar sampul: geser kotak, zoom, atau Otomatis. Hasilnya file baru di Media; mengembalikan alamat gambar (asli bila "tanpa crop"), atau "" bila dibatalkan. */
  async function cropCover(url) {
    const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
    if (!img || !img.naturalWidth) { toast("Gambar tidak bisa dibuka.", true); return ""; }
    const W = img.naturalWidth, H = img.naturalHeight, RATIOS = { "3:2": 1.5, "16:9": 16 / 9, "1.91:1": 1.91, "1:1": 1 };
    const st = { ratio: "3:2", zoom: 1, cx: .5, cy: .5, original: false };
    const box = () => { const r = RATIOS[st.ratio], fw = Math.min(W, H * r) / st.zoom, w = fw / W, h = fw / r / H; return { w, h, x: Math.min(Math.max(0, st.cx - w / 2), 1 - w), y: Math.min(Math.max(0, st.cy - h / 2), 1 - h) }; };
    const rect = () => { const b = box(); st.cx = b.x + b.w / 2; st.cy = b.y + b.h / 2; return b; };
    let dlgEl = null;
    const prev = (el, outerR) => { el.style.setProperty("--ar", outerR); const b = rect(), r = RATIOS[st.ratio], wide = Math.max(100, 100 * r / outerR); el.firstElementChild.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${wide}%;aspect-ratio:${r};background:url('${url}') no-repeat;background-size:${100 / b.w}% ${100 / b.h}%;background-position:${b.w < 1 ? b.x / (1 - b.w) * 100 : 0}% ${b.h < 1 ? b.y / (1 - b.h) * 100 : 0}%`; };
    const paint = () => {
      const b = rect(), fr = $("#cpF", dlgEl); fr.style.cssText = `left:${b.x * 100}%;top:${b.y * 100}%;width:${b.w * 100}%;height:${b.h * 100}%`;
      $$("[data-r]", dlgEl).forEach(c => c.classList.toggle("on", c.dataset.r === st.ratio)); $("#cpZ", dlgEl).value = Math.round(st.zoom * 100);
      prev($("#cpP1", dlgEl), RATIOS[st.ratio]); prev($("#cpP2", dlgEl), 1.5); prev($("#cpP3", dlgEl), 1.91);
    };
    const ok = await dialog({ title: "Atur gambar sampul", wide: true, ok: "Pakai gambar ini", cancel: "Batal", body: `<div class="small faint">Geser kotak kuning untuk memilih bagian yang tampil. Gambar asli di Media tidak berubah.</div>
      <div class="cp-stage" id="cpS" style="width:min(100%,calc(38vh * ${W / H}));aspect-ratio:${W}/${H}"><img src="${esc(url)}" alt="" draggable="false"><div class="cp-fr" id="cpF"><span class="cp-hint">Tarik untuk geser</span></div></div>
      <div class="bar">${Object.keys(RATIOS).map(k => `<button type="button" class="btn sm cp-chip" data-r="${k}">${k}${{ "3:2": " Artikel", "1.91:1": " Bagikan" }[k] || ""}</button>`).join("")}<button type="button" class="btn sm" id="cpA" style="margin-left:auto">✨ Otomatis</button></div>
      <label class="f cp-z">Zoom <input type="range" id="cpZ" min="100" max="400" step="5" value="100"></label>
      <div class="cp-pv"><div><b>Di artikel</b><span class="cp-pvb" id="cpP1"><i></i></span></div><div><b>Kartu blog</b><span class="cp-pvb a32" id="cpP2"><i></i></span></div><div><b>Dibagikan (WA/Google)</b><span class="cp-pvb a191" id="cpP3"><i></i></span></div></div>
      <div class="bar"><button type="button" class="btn sm" id="cpR">Atur ulang</button><button type="button" class="btn sm" id="cpO">Pakai tanpa crop</button></div>`,
      onOpen: d => {
        dlgEl = d; const S = $("#cpS", d), F = $("#cpF", d);
        $$("[data-r]", d).forEach(c => c.onclick = () => { st.ratio = c.dataset.r; paint(); });
        $("#cpZ", d).oninput = e => { st.zoom = Number(e.target.value) / 100; paint(); };
        S.addEventListener("wheel", e => { e.preventDefault(); st.zoom = Math.min(4, Math.max(1, st.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); paint(); }, { passive: false });
        const at = e => { const r = S.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
        let drag = null;
        S.addEventListener("pointerdown", e => { const [px, py] = at(e); const b = box(); if (!(px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h)) { st.cx = px; st.cy = py; paint(); } drag = { px: at(e)[0], py: at(e)[1], cx: st.cx, cy: st.cy }; S.setPointerCapture(e.pointerId); F.classList.add("drag"); });
        S.addEventListener("pointermove", e => { if (!drag) return; const [px, py] = at(e); st.cx = drag.cx + (px - drag.px); st.cy = drag.cy + (py - drag.py); paint(); });
        const end = () => { drag = null; F.classList.remove("drag"); }; S.addEventListener("pointerup", end); S.addEventListener("pointercancel", end);
        $("#cpR", d).onclick = () => { st.zoom = 1; st.cx = st.cy = .5; paint(); };
        $("#cpO", d).onclick = () => { st.original = true; d.finish(true); };
        $("#cpA", d).onclick = e => busy(e.currentTarget, async () => { try { const r = (await api("/ms/admin/ca/crop-auto", { json: { src: url, ratio: st.ratio } })).rect; const fw = r.w * W; st.zoom = Math.max(1, Math.min(4, Math.min(W, H * RATIOS[st.ratio]) / fw)); st.cx = r.x + r.w / 2; st.cy = r.y + r.h / 2; paint(); } catch (err) { fail(err); } });
        paint();
      } });
    if (!ok) return "";
    if (st.original) return url;
    try { toast("Memotong gambar…"); return (await api("/ms/admin/ca/crop", { json: { src: url, ratio: st.ratio, rect: box() } })).url; } catch (err) { fail(err); return ""; }
  }
  /* pustaka foto: pilih gambar yang sudah pernah diunggah, atau unggah satu/beberapa sekaligus. Mengembalikan daftar alamat gambar. */
  async function pickImages() {
    let out = [];
    await dialog({ title: "Pilih foto", wide: true, ok: "", cancel: "Tutup", body: `<div class="bar"><label class="btn pri">Unggah foto baru (boleh banyak)<input type="file" id="pkF" accept="image/*" multiple hidden></label><span class="small faint" id="pkS">Atau klik foto yang sudah pernah diunggah.</span></div><div id="pkG" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;max-height:56vh;overflow:auto"></div>`,
      onOpen: async d => {
        const g = $("#pkG", d), s = $("#pkS", d);
        try { const m = await api("/ms/admin/ca/media"); g.innerHTML = m.items.map(i => `<button type="button" class="btn" data-u="${esc(i.url)}" title="${esc(i.usedIn.length ? "Dipakai: " + i.usedIn.map(u => u.title).join(", ") : "Belum dipakai")}" style="padding:0;height:auto;display:block;overflow:hidden"><img src="${esc(i.url)}" alt="" loading="lazy" style="width:100%;height:96px;object-fit:cover;display:block"><small style="display:block;padding:4px 6px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.url.split("/").pop())}</small></button>`).join("") || '<div class="empty">Belum ada foto.</div>'; } catch (e) { s.textContent = e.message; }
        g.onclick = e => { const b = e.target.closest("[data-u]"); if (!b) return; out = [b.dataset.u]; d.finish(true); };
        $("#pkF", d).onchange = async e => { const files = [...e.target.files]; for (let i = 0; i < files.length; i++) { s.textContent = `Mengunggah ${i + 1} dari ${files.length}…`; try { const fd = new FormData(); fd.append("file", files[i]); out.push((await api("/ms/admin/ca/upload", { form: fd })).url); } catch (err) { s.textContent = files[i].name + ": " + err.message; return; } } d.finish(true); };
      } });
    return out;
  }
  async function pMedia() {
    const d = await api("/ms/admin/ca/media");
    setPage("Media", "Gambar yang diunggah untuk artikel", `<div class="bar"><label class="btn pri" style="cursor:pointer">+ Unggah gambar (bisa banyak sekaligus)<input type="file" id="mf" accept="image/*" multiple hidden></label><span class="muted small">${d.items.length} gambar. Gambar baru otomatis dikecilkan dan diubah ke WebP. Bisa juga tarik dan lepas file ke halaman ini.</span></div>
      <div class="media">${d.items.map(m => `<figure><img src="${esc(m.url)}" alt="" loading="lazy"><figcaption><div class="mono">${esc(m.url.split("/").pop())}</div>${num(Math.round(m.size / 1024))} KB · ${m.usedIn.length ? "dipakai: " + m.usedIn.map(u => esc(u.title)).join(", ") : "belum dipakai"}<div class="bar" style="margin-top:6px"><button class="btn sm" data-copy="${esc(m.url)}">Salin alamat</button>${m.usedIn.length ? "" : `<button class="btn sm bad" data-rm="${esc(m.url.split("/").pop())}">Hapus</button>`}</div></figcaption></figure>`).join("") || '<div class="empty">Belum ada gambar.</div>'}</div>`);
    const upMany = async files => { files = [...files].filter(f => /^image\//.test(f.type)); if (!files.length) return; let ok = 0; for (let i = 0; i < files.length; i++) { try { toast(`Mengunggah ${i + 1} dari ${files.length}: ${files[i].name}`); const fd = new FormData(); fd.append("file", files[i]); await api("/ms/admin/ca/upload", { form: fd }); ok++; } catch (err) { fail(err); } } toast(`${ok} dari ${files.length} gambar terunggah`); route(); };
    $("#mf").onchange = e => upMany(e.target.files);
    const pg = document.querySelector(".media") || document.body; ["dragover", "drop"].forEach(t => window.addEventListener(t, e => { if (!/#\/media/.test(location.hash)) return; e.preventDefault(); if (t === "drop" && e.dataTransfer) upMany(e.dataTransfer.files); }));
    $$("[data-rm]").forEach(b => b.onclick = async () => { if (!await confirmAct("Hapus gambar ini?", `<b>${esc(b.dataset.rm)}</b> dihapus permanen dari server. Gambar ini tidak dipakai artikel mana pun.`, "Hapus", "bad")) return; try { await api("/ms/admin/ca/media/" + encodeURIComponent(b.dataset.rm), { method: "DELETE" }); toast("Gambar dihapus"); route(); } catch (e) { fail(e); } });
    $$("[data-copy]").forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Alamat disalin"), () => toast(b.dataset.copy)));
  }
  async function pComments() {
    const d = await api("/ms/admin/comments");
    setPage("Komentar", "Moderasi komentar pembaca", `<div class="card"><div class="tbl-wrap">${d.items.length ? `<table class="t"><thead><tr><th>Pembaca</th><th>Komentar</th><th>Artikel</th><th>Waktu</th><th>Status</th><th></th></tr></thead><tbody>${d.items.map(c => `<tr><td><b>${esc(c.name)}</b></td><td style="max-width:420px">${esc(c.text)}${c.reply ? `<div class="note-item" style="margin-top:6px"><small>Balasan admin</small>${esc(c.reply.text)}</div>` : ""}</td><td><a href="/blog/${esc(c.slug)}#komentar" target="_blank" rel="noopener">${esc(c.slug)}</a></td><td class="muted small">${dt(c.at)}</td><td>${c.hidden ? badge("Disembunyikan", "mute") : badge("Tampil", "ok")}</td>
      <td class="bar"><button class="btn sm" data-reply="${c.id}">Balas</button><button class="btn sm" data-hide="${c.id}">${c.hidden ? "Tampilkan" : "Sembunyikan"}</button><button class="btn sm bad" data-del="${c.id}">Hapus</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada komentar.</div>'}</div></div>`);
    $$("[data-reply]").forEach(b => b.onclick = async () => { const c = d.items.find(x => x.id === b.dataset.reply); const t = await dialog({ title: "Balas komentar", body: `<p class="muted">“${esc(c.text)}”</p>`, input: { label: "Balasan (kosongkan untuk menghapus balasan)", textarea: true, max: 1000, value: c.reply ? c.reply.text : "" }, ok: "Simpan balasan" }); if (t === false) return; try { await api(`/ms/admin/comments/${c.id}/reply`, { json: { text: t } }); toast("Balasan disimpan"); route(); } catch (e) { fail(e); } });
    $$("[data-hide]").forEach(b => b.onclick = () => busy(b, async () => { try { await api(`/ms/admin/comments/${b.dataset.hide}/hide`, { json: {} }); route(); } catch (e) { fail(e); } }));
    $$("[data-del]").forEach(b => b.onclick = async () => { if (!await confirmAct("Hapus komentar?", "Komentar dihapus permanen.", "Hapus", "bad")) return; try { await api(`/ms/admin/comments/${b.dataset.del}`, { method: "DELETE" }); toast("Komentar dihapus"); route(); } catch (e) { fail(e); } });
  }

  /* ================= PESANAN ================= */
  async function pOrders() {
    const q = params(), group = q.get("group") || "semua", page = Number(q.get("page")) || 1;
    const qs = new URLSearchParams({ group, q: q.get("q") || "", kind: q.get("kind") || "", from: q.get("from") || "", to: q.get("to") || "", page, size: 25 });
    const d = await api("/ms/admin/ca/orders?" + qs);
    ORDER_COUNTS = d.counts;
    const pages = Math.max(1, Math.ceil(d.total / d.size)), cur = Object.fromEntries(q);
    setPage("Pesanan Layanan", "Kelola dan verifikasi pesanan dari pelanggan", `
      <nav class="tabs" aria-label="Status pesanan">${Object.entries(d.groups).map(([k, l]) => `<a href="#/orders?group=${k}" class="${group === k ? "on" : ""}">${esc(l)} <span class="n">${num(d.counts[k])}</span></a>`).join("")}</nav>
      <div class="card"><div class="hd"><form class="bar" id="of" style="flex:1">
        <input class="in grow" type="search" name="q" placeholder="Cari ID pesanan, nomor WA, judul, atau layanan…" value="${esc(q.get("q") || "")}">
        <select class="in" name="kind" style="width:auto"><option value="">Semua jenis</option><option value="layanan" ${q.get("kind") === "layanan" ? "selected" : ""}>Tugas/Diskusi/Metopen/Revisi</option><option value="parafrase" ${q.get("kind") === "parafrase" ? "selected" : ""}>Cek & Parafrase</option><option value="audit" ${q.get("kind") === "audit" ? "selected" : ""}>Audit Dokumen</option></select>
        <label class="sr" for="ofFrom">Dari tanggal</label><input class="in" id="ofFrom" type="date" name="from" value="${esc(q.get("from") || "")}" style="width:auto"><label class="sr" for="ofTo">Sampai tanggal</label><input class="in" id="ofTo" type="date" name="to" value="${esc(q.get("to") || "")}" style="width:auto">
        <button class="btn">Terapkan</button></form></div>
        <div class="tbl-wrap">${orderTable(d.items)}</div>
        <div class="pager"><span class="muted small">${num(d.total)} pesanan · halaman ${page} dari ${pages}</span><button class="btn sm" id="pv" ${page <= 1 ? "disabled" : ""}>← Sebelumnya</button><button class="btn sm" id="nx" ${page >= pages ? "disabled" : ""}>Berikutnya →</button></div></div>`);
    $("#of").onsubmit = e => { e.preventDefault(); const f = e.target; go("orders", { group, q: f.q.value.trim(), kind: f.kind.value, from: f.from.value, to: f.to.value }); };
    $("#pv").onclick = () => go("orders", { ...cur, page: page - 1 }); $("#nx").onclick = () => go("orders", { ...cur, page: page + 1 });
    bindRows(); refreshCounts();
  }
  const waLink = (wa, id) => `https://wa.me/${encodeURIComponent(wa)}?text=${encodeURIComponent(`Halo, kami dari Catatan Akademik terkait pesanan ${id}.`)}`;
  async function pOrder(id) {
    const d = await api("/ms/admin/ca/orders/" + encodeURIComponent(id)), o = d.order;
    const can = { confirm: ["menunggu_verifikasi", "menunggu_bayar"].includes(o.status), reject: o.status === "menunggu_verifikasi", start: o.status === "baru_dibayar" || (o.status === "dianalisis" && o.docType !== "layanan"),
      cancel: !["terkirim", "dibatalkan", "kedaluwarsa", "dikembalikan"].includes(o.status), refund: o.status === "dibatalkan" && o.paid, result: ["baru_dibayar", "dikerjakan", "dianalisis", "cek_ulang"].includes(o.status) };
    setPage("Detail Pesanan " + o.id, o.service, `
      <div class="bar">${badge(o.statusLabel, o.tone)}<span class="grow"></span><a class="btn" href="${waLink(o.wa, o.id)}" target="_blank" rel="noopener">Hubungi via WhatsApp</a><a class="btn" href="${esc(o.customerUrl)}" target="_blank" rel="noopener">${ICON.ext}Halaman pelanggan</a><a class="btn" href="#/orders">← Daftar pesanan</a></div>
      <div class="grid g-main"><div class="grid">
        <div class="card"><div class="hd"><h2>Detail layanan</h2></div><div class="bd"><dl class="kv"><dt>Layanan</dt><dd>${esc(o.service)}</dd><dt>Judul</dt><dd>${esc(o.title || "–")}</dd>${o.brief ? `<dt>Kebutuhan</dt><dd style="white-space:pre-wrap">${esc(o.brief)}</dd>` : ""}${o.words ? `<dt>Jumlah kata</dt><dd>${num(o.words)}</dd>` : ""}<dt>Jalur</dt><dd>${o.lane === "cepat" ? "Jalur cepat" : "Biasa"}</dd><dt>Tenggat</dt><dd>${dt(o.deadlineAt)}</dd><dt>Dibuat</dt><dd>${dt(o.createdAt)}</dd>${o.parent ? `<dt>Revisi dari</dt><dd><a href="#/orders/${esc(o.parent)}">${esc(o.parent)}</a></dd>` : ""}
          <dt>Lampiran</dt><dd>${d.attachments.length ? d.attachments.map(a => `<a href="/ms/admin/layanan/${encodeURIComponent(o.id)}/file/${a.n}">${esc(a.name)}</a> <span class="faint small">${num(Math.round(a.size / 1024))} KB</span>`).join("<br>") : o.filesDeleted ? "Sudah dihapus sesuai masa simpan" : "–"}</dd></dl>
          ${d.children.length ? `<p class="small" style="margin-top:12px">Pesanan revisi terkait: ${d.children.map(c => `<a href="#/orders/${esc(c.id)}">${esc(c.id)}</a> (${esc(c.statusLabel)})`).join(", ")}</p>` : ""}</div></div>
        <div class="card"><div class="hd"><h2>Pembayaran</h2>${o.paid ? badge("Terkonfirmasi", "ok") : ""}</div><div class="bd"><dl class="kv"><dt>Total</dt><dd><b>${rp(o.total)}</b> <span class="faint small">(${rp(o.baseTotal)} + kode unik ${num(o.uniqueCode)}${o.fastPrice ? ", jalur cepat " + rp(o.fastPrice) : ""})</span></dd><dt>Metode</dt><dd>QRIS (transfer manual, dicek admin)</dd><dt>Batas bayar</dt><dd>${dt(o.payExpiresAt)}</dd><dt>Bukti bayar</dt><dd>${o.hasProof ? `<button class="btn sm" id="proofB">Lihat bukti</button> <span class="faint small">diunggah ${dt(o.proofAt)}</span>` : "Belum ada"}</dd>${o.confirmedAt ? `<dt>Dikonfirmasi</dt><dd>${dt(o.confirmedAt)} oleh ${esc(o.confirmedBy)}</dd>` : ""}${o.rejectReason ? `<dt>Catatan</dt><dd>${esc(o.rejectReason)}</dd>` : ""}</dl>
          <p class="small faint" style="margin:10px 0 0">Bukti unggahan pelanggan bukan bukti dana masuk. Konfirmasi hanya setelah nominal ${rp(o.total)} terlihat di mutasi QRIS/rekening.</p>
          <div class="bar" style="margin-top:12px">${can.confirm ? `<button class="btn ok" id="cfB">${o.status === "menunggu_bayar" ? "Konfirmasi manual" : "Konfirmasi pembayaran"}</button>` : ""}${can.reject ? '<button class="btn bad" id="rjB">Tolak bukti</button>' : ""}</div></div></div>
        <div class="card"><div class="hd"><h2>Proses</h2></div><div class="bd bar">${can.start ? '<button class="btn pri" id="stB">Mulai kerjakan</button>' : ""}${can.result ? `<a class="btn" href="#/tools/${o.docType === "layanan" ? "layanan" : "parafrase"}">Kirim hasil</a>` : ""}${o.paid && !o.filesDeleted && !["layanan", "audit", "bedah"].includes(o.docType) ? `<a class="btn pri" href="/ms/admin/studio-page?id=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">Buka Studio Parafrase</a><a class="btn" href="/ms/admin/studio/${id}/word">Word tanda UT + rekomendasi</a>` : ""}${can.cancel ? '<button class="btn bad" id="cnB">Batalkan pesanan</button>' : ""}${can.refund ? '<button class="btn" id="rfB">Tandai dana sudah dikembalikan</button>' : ""}${!can.start && !can.result && !can.cancel && !can.refund ? '<span class="muted">Tidak ada aksi untuk status ini.</span>' : ""}</div></div>
      </div><div class="grid">
        <div class="card"><div class="hd"><h2>Pelanggan</h2></div><div class="bd"><dl class="kv"><dt>WhatsApp</dt><dd class="mono">${esc(o.wa)}</dd></dl></div></div>
        <div class="card"><div class="hd"><h2>Catatan internal</h2></div><div class="bd" style="display:flex;flex-direction:column;gap:10px"><form id="nf" class="bar"><label class="sr" for="nt">Catatan baru</label><input class="in grow" id="nt" maxlength="1000" placeholder="Tulis catatan untuk tim (tidak terlihat pelanggan)"><button class="btn">Tambah</button></form>${d.notes.map(n => `<div class="note-item"><small>${esc(n.admin)} · ${dt(n.at)}</small>${esc(n.text)}</div>`).join("") || '<span class="muted small">Belum ada catatan.</span>'}</div></div>
        <div class="card"><div class="hd"><h2>Riwayat status</h2></div><div class="bd"><ul class="timeline">${d.events.map(e => `<li><div><b>${esc(e.type.replace(/_/g, " "))}</b>${e.detail ? ` <span class="muted">· ${esc(e.detail)}</span>` : ""}<div class="small faint">${dt(e.at)}</div></div></li>`).join("") || '<li class="muted">Belum ada riwayat.</li>'}</ul></div></div>
      </div></div>`);
    const re = () => route();
    if ($("#proofB")) $("#proofB").onclick = () => dialog({ title: "Bukti bayar " + o.id, ok: "", cancel: "Tutup", body: `<img src="/ms/admin/parafrase/orders/${encodeURIComponent(o.id)}/proof" alt="Bukti bayar ${esc(o.id)}" style="max-width:100%;border-radius:10px"><p class="small muted">Cocokkan nominal <b>${rp(o.total)}</b> dengan mutasi QRIS sebelum konfirmasi.</p>` });
    if ($("#cfB")) $("#cfB").onclick = async e => { if (!await confirmAct("Konfirmasi pembayaran?", `Pastikan dana <b>${rp(o.total)}</b> untuk ${esc(o.id)} sudah masuk. Pesanan akan masuk antrean dan pelanggan diberi tahu.`, "Ya, dana sudah masuk", "ok")) return; busy(e.target, async () => { try { await api(`/ms/admin/parafrase/orders/${encodeURIComponent(o.id)}/confirm`, { json: {} }); toast("Pembayaran dikonfirmasi"); re(); } catch (err) { fail(err); re(); } }); };
    if ($("#rjB")) $("#rjB").onclick = async () => { const why = await dialog({ title: "Tolak bukti bayar", input: { label: "Alasan (dikirim ke pelanggan)", textarea: true, required: true, min: 5, minMsg: "Tulis alasan minimal 5 huruf.", max: 200 }, ok: "Tolak", okClass: "bad" }); if (!why) return; try { await api(`/ms/admin/parafrase/orders/${encodeURIComponent(o.id)}/reject`, { json: { reason: why } }); toast("Bukti ditolak, pelanggan bisa unggah ulang"); re(); } catch (e) { fail(e); } };
    if ($("#stB")) $("#stB").onclick = e => busy(e.target, async () => { try { await api(o.docType === "layanan" ? `/ms/admin/layanan/${encodeURIComponent(o.id)}/mulai` : `/ms/admin/parafrase/orders/${encodeURIComponent(o.id)}/start`, { json: {} }); toast("Status: sedang diproses"); re(); } catch (err) { fail(err); } });
    if ($("#cnB")) $("#cnB").onclick = async () => { const why = await dialog({ title: "Batalkan pesanan " + o.id, body: o.paid ? `<div class="notice">Pesanan ini <b>sudah dibayar ${rp(o.total)}</b>. Setelah dibatalkan, kembalikan dana secara manual lalu klik “Tandai dana sudah dikembalikan”.</div>` : "<p>File pesanan yang belum dibayar akan dihapus.</p>", input: { label: "Alasan pembatalan (tercatat di riwayat)", textarea: true, required: true, min: 3, minMsg: "Tulis alasan pembatalan.", max: 300 }, ok: "Batalkan pesanan", okClass: "bad" }); if (!why) return; try { const r = await api(`/ms/admin/ca/orders/${encodeURIComponent(o.id)}/cancel`, { json: { reason: why } }); toast(r.refundNeeded ? "Dibatalkan. Jangan lupa kembalikan dana." : "Pesanan dibatalkan"); re(); } catch (e) { fail(e); } };
    if ($("#rfB")) $("#rfB").onclick = async () => { const note = await dialog({ title: "Dana sudah dikembalikan?", input: { label: "Catatan (mis. tanggal & rekening tujuan)", max: 300 }, ok: "Tandai dikembalikan" }); if (note === false) return; try { await api(`/ms/admin/ca/orders/${encodeURIComponent(o.id)}/refunded`, { json: { note } }); toast("Ditandai dana dikembalikan"); re(); } catch (e) { fail(e); } };
    $("#nf").onsubmit = async e => { e.preventDefault(); const t = $("#nt").value.trim(); if (!t) return; try { await api(`/ms/admin/ca/orders/${encodeURIComponent(o.id)}/notes`, { json: { text: t } }); re(); } catch (err) { fail(err); } };
  }
  async function pPayments() {
    const d = await api("/ms/admin/ca/payments");
    setPage("Konfirmasi Pembayaran", "Antrean bukti bayar yang menunggu dicek", `
      <div class="notice info">Konfirmasi hanya setelah nominal (termasuk kode unik) terlihat di mutasi QRIS atau rekening. Bukti unggahan pelanggan saja belum berarti dana masuk.</div>
      <div class="card"><div class="hd"><h2>Menunggu konfirmasi</h2><span class="muted small">${d.items.length} pesanan</span></div><div class="tbl-wrap">${d.items.length ? `<table class="t"><thead><tr><th>ID Pesanan</th><th>Layanan</th><th class="num">Nominal</th><th>Waktu bukti</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${d.items.map(o => `<tr><td class="mono"><a href="#/orders/${esc(o.id)}">${esc(o.id)}</a></td><td>${esc(o.service)}</td><td class="num"><b>${rp(o.total)}</b><div class="faint small">kode unik ${num(o.uniqueCode)}</div></td><td class="small">${dt(o.proofAt)}</td><td class="small">${esc(o.method)}</td><td>${badge(o.statusLabel, o.tone)}</td>
        <td><div class="bar"><button class="btn sm" data-proof="${esc(o.id)}" data-total="${o.total}">Lihat bukti</button><button class="btn sm ok" data-ok="${esc(o.id)}" data-total="${o.total}">Konfirmasi</button><button class="btn sm bad" data-no="${esc(o.id)}">Tolak</button></div></td></tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada pembayaran yang menunggu. 🎉</div>'}</div></div>
      <div class="card"><div class="hd"><h2>Baru dikonfirmasi</h2></div><div class="tbl-wrap">${d.recent.length ? `<table class="t"><thead><tr><th>ID</th><th>Layanan</th><th class="num">Total</th><th>Dikonfirmasi</th><th>Oleh</th></tr></thead><tbody>${d.recent.map(o => `<tr class="click" data-href="#/orders/${esc(o.id)}"><td class="mono">${esc(o.id)}</td><td>${esc(o.service)}</td><td class="num">${rp(o.total)}</td><td class="small">${dt(o.confirmedAt)}</td><td class="small">${esc(o.confirmedBy)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada.</div>'}</div></div>`);
    bindRows();
    $$("[data-proof]").forEach(b => b.onclick = () => dialog({ title: "Bukti bayar " + b.dataset.proof, ok: "", cancel: "Tutup", body: `<img src="/ms/admin/parafrase/orders/${encodeURIComponent(b.dataset.proof)}/proof" alt="Bukti bayar" style="max-width:100%;border-radius:10px"><p class="small muted">Nominal yang harus masuk: <b>${rp(b.dataset.total)}</b></p>` }));
    $$("[data-ok]").forEach(b => b.onclick = async () => { if (!await confirmAct("Konfirmasi pembayaran?", `Dana <b>${rp(b.dataset.total)}</b> untuk ${esc(b.dataset.ok)} sudah terlihat di mutasi?`, "Ya, dana sudah masuk", "ok")) return; busy(b, async () => { try { await api(`/ms/admin/parafrase/orders/${encodeURIComponent(b.dataset.ok)}/confirm`, { json: {} }); toast("Dikonfirmasi: " + b.dataset.ok); } catch (e) { fail(e); } route(); refreshCounts(); }); });
    $$("[data-no]").forEach(b => b.onclick = async () => { const why = await dialog({ title: "Tolak bukti " + b.dataset.no, input: { label: "Alasan (dikirim ke pelanggan)", textarea: true, required: true, min: 5, minMsg: "Tulis alasan minimal 5 huruf.", max: 200 }, ok: "Tolak", okClass: "bad" }); if (!why) return; try { await api(`/ms/admin/parafrase/orders/${encodeURIComponent(b.dataset.no)}/reject`, { json: { reason: why } }); toast("Bukti ditolak"); route(); refreshCounts(); } catch (e) { fail(e); } });
  }
  /* Pengunjung dan konten yang paling dicari. Data milik sendiri (tanpa cookie, tanpa IP), jadi hanya sejak statistik ini dipasang. */
  async function pTraffic() {
    const q = params(), days = Number(q.get("days")) || 30, d = await api("/ms/admin/ca/traffic?days=" + days);
    const range = `<select class="in" id="rg" style="width:auto">${[7, 30, 90].map(n => `<option value="${n}" ${n === days ? "selected" : ""}>${n} hari terakhir</option>`).join("")}</select>`;
    const top = d.pages.length ? Math.max(...d.pages.map(x => x.views)) : 1;
    const bar = v => `<div style="height:6px;border-radius:3px;background:var(--s1,#3b6cf6);width:${Math.max(3, Math.round(v * 100 / top))}%;margin-top:4px"></div>`;
    const grp = d.groups.length ? Math.max(...d.groups.map(x => x.views)) : 1, refMax = d.refs.length ? Math.max(...d.refs.map(x => x.views)) : 1;
    setPage("Pengunjung & Konten", "Halaman dan materi yang paling sering dibuka, dari mana pengunjung datang", `
      <div class="notice info">${esc(d.note)} Angka ini baru terkumpul sejak statistik dipasang.</div>
      <div class="bar"><span class="grow"></span>${range}</div>
      <div class="grid g4">
        <div class="card stat"><div><b>${num(d.today.visitors)}</b><span>Pengunjung hari ini</span><small>${num(d.today.views)} halaman dibuka</small></div></div>
        <div class="card stat"><div><b>${num(d.last7.visitors)}</b><span>Pengunjung 7 hari</span><small>${num(d.last7.views)} halaman dibuka</small></div></div>
        <div class="card stat"><div><b>${num(d.total.visitors)}</b><span>Pengunjung ${days} hari</span><small>${num(d.total.views)} halaman dibuka</small></div></div>
        <div class="card stat"><div><b>${d.total.visitors ? (d.total.views / d.total.visitors).toFixed(1).replace(".", ",") : "0"}</b><span>Halaman per pengunjung</span><small>Rata-rata per hari kunjungan</small></div></div></div>
      <div class="card"><div class="hd"><h2>Kunjungan per hari</h2></div><div class="bd">${lineChart(d.series, [["visitors", "Pengunjung", "--s1"], ["views", "Halaman dibuka", "--s2"]])}</div></div>
      <div class="card"><div class="hd"><h2>Halaman paling banyak dibuka</h2><span class="muted small">${days} hari terakhir. Ini petunjuk materi yang dicari mahasiswa.</span></div><div class="tbl-wrap">${d.pages.length ? `<table class="t"><thead><tr><th>Halaman</th><th>Kelompok</th><th class="num">Dibuka</th><th class="num">Pengunjung</th></tr></thead><tbody>${d.pages.map(x => `<tr><td><b>${esc(x.label || x.path)}</b><div class="faint small mono">${esc(x.path)}</div>${bar(x.views)}</td><td class="small">${esc(x.group)}</td><td class="num"><b>${num(x.views)}</b></td><td class="num">${num(x.visitors)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada data kunjungan. Angka muncul setelah ada pengunjung.</div>'}</div></div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h2>Jenis konten</h2></div><div class="bd">${d.groups.map(x => `<div style="margin:0 0 12px"><div style="display:flex;justify-content:space-between"><span>${esc(x.name)}</span><b>${num(x.views)}</b></div><div style="height:8px;border-radius:4px;background:var(--s2,#f5b942);width:${Math.max(3, Math.round(x.views * 100 / grp))}%"></div></div>`).join("") || '<div class="empty">Belum ada data.</div>'}</div></div>
        <div class="card"><div class="hd"><h2>Dari mana pengunjung datang</h2></div><div class="bd">${d.refs.map(x => `<div style="margin:0 0 12px"><div style="display:flex;justify-content:space-between"><span>${esc(x.ref)}</span><b>${num(x.views)}</b></div><div style="height:8px;border-radius:4px;background:var(--s1,#3b6cf6);width:${Math.max(3, Math.round(x.views * 100 / refMax))}%"></div></div>`).join("") || '<div class="empty">Belum ada data.</div>'}<p class="small muted">“Langsung” mencakup tautan yang dibuka dari aplikasi seperti WhatsApp dan TikTok yang tidak mengirim asal kunjungan.</p></div></div></div>`);
    $("#rg").onchange = e => go("traffic", { days: e.target.value });
  }
  function pEmbed(which) {
    const t = which === "parafrase" ? ["Antrean Cek & Parafrase", "Verifikasi, antrean, Word berwarna, cek ulang, kirim hasil, QRIS, gambar situs, dan pesan WhatsApp", "/admin/parafrase?embed=1"] : ["Kirim Hasil Layanan", "Tugas, Diskusi, Metopen, dan Revisi yang sudah dibayar", "/admin/layanan?embed=1"];
    setPage(t[0], t[1], `<iframe class="embed" title="${esc(t[0])}" src="${t[2]}"></iframe>`);
  }
  async function pCustomers() {
    const d = await api("/ms/admin/users"), q = (params().get("q") || "").toLowerCase();
    const list = d.users.filter(u => !q || (u.name + " " + u.email).toLowerCase().includes(q));
    setPage("Pelanggan", "Akun yang mendaftar di situs", `<div class="card"><div class="hd"><form class="bar" id="cf" style="flex:1"><input class="in grow" type="search" name="q" placeholder="Cari nama atau email…" value="${esc(params().get("q") || "")}"><button class="btn">Cari</button></form><span class="muted small">${num(list.length)} akun</span></div>
      <div class="tbl-wrap">${list.length ? `<table class="t"><thead><tr><th>Nama</th><th>Email</th><th>Terdaftar</th><th class="num">Catatan pesanan</th>${ME.role === "owner" ? "<th></th>" : ""}</tr></thead><tbody>${list.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td class="small muted">${dd(u.createdAt)}</td><td class="num">${num(u.orders.length)}</td>${ME.role === "owner" ? `<td><button class="btn sm" data-reset="${esc(u.id)}" data-name="${esc(u.name)}">Sandi sementara</button></td>` : ""}</tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada akun.</div>'}</div></div>
      <p class="small faint">Pesanan layanan (Tugas, Metopen, Cek & Parafrase, Audit) dicatat per nomor WhatsApp, lihat menu Pesanan Layanan.</p>`);
    $("#cf").onsubmit = e => { e.preventDefault(); go("customers", { q: e.target.q.value.trim() }); };
    $$("[data-reset]").forEach(b => b.onclick = async () => { if (!await confirmAct("Buat sandi sementara?", `Sandi lama ${esc(b.dataset.name)} tidak berlaku lagi. Sampaikan sandi sementara hanya ke pemilik akun.`, "Buat sandi")) return; try { const r = await api(`/ms/admin/users/${encodeURIComponent(b.dataset.reset)}/reset`, { json: {} }); dialog({ title: "Sandi sementara", ok: "", cancel: "Tutup", body: `<p>Sandi sementara untuk ${esc(b.dataset.name)}:</p><p class="mono" style="font-size:18px"><b>${esc(r.tempPassword)}</b></p><p class="small muted">Sandi ini hanya tampil sekali. Minta pelanggan menggantinya setelah masuk.</p>` }); } catch (e) { fail(e); } });
  }

  /* ================= LAINNYA (pemilik) ================= */
  const saveSettings = values => api("/ms/admin/parafrase/settings", { method: "PUT", json: { values } });

  /* ================= TAMPILAN SITUS: teks & nama, testimoni ================= */
  /* ================= EDITOR HALAMAN (klik bagian web lalu ganti) ================= */
  async function pPageEditor() {
    const d = await api("/ms/admin/ca/texts"), files = Object.entries(d.files || {}).filter(([f]) => !/^(audit-hasil|pesanan)\.html$/.test(f));
    if (window.__edMsg) window.removeEventListener("message", window.__edMsg);
    setPage("Editor Halaman", "Klik teks atau foto langsung di halaman, lalu ubah di panel kanan. Tersimpan dan tayang saat kamu menekan Simpan", `
      <div class="bar"><select class="in" id="edP" style="max-width:300px" aria-label="Halaman">${files.map(([f, l]) => `<option value="${esc(f)}">${esc(l)}</option>`).join("")}</select><span class="grow"></span><button class="btn sm" id="edM" type="button">HP</button><button class="btn sm pri" id="edD" type="button">Desktop</button></div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start" id="edG">
        <div class="card" style="padding:0;overflow:hidden;background:#e9e9f2"><div id="edW" style="margin:0 auto;width:100%;transition:width .2s"><iframe id="edF" title="Pratinjau halaman" style="width:100%;height:78vh;border:0;background:#fff" sandbox="allow-same-origin allow-scripts"></iframe></div></div>
        <div class="card" style="position:sticky;top:12px"><div class="hd"><h2>Yang dipilih</h2></div><div class="bd" id="edB"><p class="muted small" style="margin:0">Belum ada. Klik teks atau foto di halaman.</p></div></div>
      </div>
      <p class="small muted">Teks yang sama di banyak tempat (mis. nama menu) berubah bersamaan. Harga dan teks yang diisi otomatis oleh sistem tidak bisa diklik. Isi artikel diubah di menu Artikel.</p>`);
    const F = $("#edF"), B = $("#edB");
    const load = async keep => {
      const y = keep && F.contentWindow ? F.contentWindow.scrollY : 0;
      try { const r = await api("/ms/admin/ca/editor/page", { method: "POST", json: { page: $("#edP").value } }); F.onload = () => { if (y) try { F.contentWindow.scrollTo(0, y) } catch {} }; F.srcdoc = r.html; } catch (e) { toast(e.message || "Halaman gagal dimuat", true); }
    };
    $("#edP").onchange = () => { B.innerHTML = '<p class="muted small" style="margin:0">Belum ada. Klik teks atau foto di halaman.</p>'; load(false); };
    $("#edM").onclick = () => { $("#edW").style.width = "390px"; $("#edM").classList.add("pri"); $("#edD").classList.remove("pri"); };
    $("#edD").onclick = () => { $("#edW").style.width = "100%"; $("#edD").classList.add("pri"); $("#edM").classList.remove("pri"); };
    const showText = m => {
      const it = d.items.find(i => i.orig === m.orig) || {};
      B.innerHTML = `<label class="small muted" for="edT">Teks (maks ${d.max} huruf, tanpa tanda &lt; &gt;)</label><textarea class="in" id="edT" rows="5" maxlength="${d.max}" style="margin:6px 0 10px"></textarea>
        <p class="small muted" style="margin:0 0 10px">Berlaku di ${m.count} tempat di halaman ini dan halaman lain yang memakai teks yang sama.${it.value != null ? " Teks asli: <b>" + esc(m.orig) + "</b>" : ""}</p>
        <div class="bar"><button class="btn pri" id="edS" type="button">Simpan</button><button class="btn" id="edR" type="button">Kembalikan</button></div>`;
      $("#edT").value = m.value;
      $("#edS").onclick = async () => { try { await api("/ms/admin/ca/texts", { method: "POST", json: { orig: m.orig, value: $("#edT").value } }); toast("Tersimpan dan tayang"); const n = await api("/ms/admin/ca/texts"); d.items = n.items; load(true); } catch (e) { toast(e.message || "Gagal menyimpan", true); } };
      $("#edR").onclick = async () => { try { await api("/ms/admin/ca/texts/reset", { method: "POST", json: { orig: m.orig } }); toast("Dikembalikan ke teks bawaan"); const n = await api("/ms/admin/ca/texts"); d.items = n.items; load(true); } catch (e) { toast(e.message || "Gagal", true); } };
    };
    const showImg = m => {
      const url = m.kind === "card" ? "/ms/admin/parafrase/card-images/" + m.id : "/ms/admin/site-images/" + m.id;
      B.innerHTML = `<p style="margin:0 0 10px"><b>${esc(m.label)}</b></p><p class="small muted" style="margin:0 0 10px">Pilih foto baru (JPG, PNG, atau WebP, maks 12 MB). Otomatis dikecilkan dan langsung tayang.</p>
        <input class="in" type="file" id="edU" accept="image/jpeg,image/png,image/webp" aria-label="Pilih foto"><div class="bar" style="margin-top:10px"><button class="btn" id="edX" type="button">Kembalikan foto bawaan</button></div>`;
      $("#edU").onchange = async () => { const f = $("#edU").files[0]; if (!f) return; const fd = new FormData(); fd.append("img", f); toast("Mengunggah…"); try { await api(url, { method: "POST", form: fd }); toast("Foto diganti"); load(true); } catch (e) { toast(e.message || "Gagal mengunggah", true); } };
      $("#edX").onclick = async () => { if (!await confirmAct("Kembalikan foto bawaan?", "Foto yang kamu unggah dihapus dan foto bawaan dipakai lagi.", "Kembalikan")) return; try { await api(url, { method: "DELETE" }); toast("Foto bawaan dipakai lagi"); load(true); } catch (e) { toast(e.message || "Gagal", true); } };
    };
    window.__edMsg = ev => { const m = ev.data; if (!m || !m.ed || ev.source !== F.contentWindow) return; if (m.ed === "text") showText(m); else if (m.ed === "img") showImg(m); };
    window.addEventListener("message", window.__edMsg);
    load(false);
  }

  async function pTexts() {
    const d = await api("/ms/admin/ca/texts"), files = d.files || {}, fileOf = label => Object.keys(files).find(k => files[k] === label);
    const state = { q: "", page: "", only: false };
    setPage("Teks & Nama", "Ganti nama menu, judul, deskripsi layanan, dan teks halaman publik tanpa membuka VPS", `<div class="notice info">Klik <b>Ubah</b> pada teks yang ingin diganti. Perubahan berlaku <b>langsung di semua tempat</b> yang memakai teks yang sama (mis. nama menu). Harga dan teks yang diisi otomatis oleh sistem tidak ada di daftar ini. Nama layanan di formulir pesanan diubah di <a href="#/services">Layanan &amp; Harga</a>.</div>
      <div class="card"><div class="bd"><div class="bar"><input class="in grow" id="txQ" type="search" placeholder="Cari teks…" aria-label="Cari teks"><select class="in" id="txP" style="max-width:260px" aria-label="Halaman"><option value="">Semua halaman</option>${d.pages.map(p => "<option>" + esc(p) + "</option>").join("")}</select><label class="bar small"><input type="checkbox" id="txO"> Hanya yang sudah saya ubah</label></div></div>
      <div class="tbl-wrap"><table class="t"><thead><tr><th>Teks di situs</th><th>Halaman</th><th></th></tr></thead><tbody id="txB"></tbody></table></div></div>
      <div class="card"><div class="hd"><h2>Riwayat perubahan teks</h2></div><div class="tbl-wrap">${d.log.length ? '<table class="t"><thead><tr><th>Waktu</th><th>Oleh</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>' + d.log.map(l => "<tr><td>" + esc(dt(l.at)) + "</td><td>" + esc(l.by) + "</td><td>" + esc(l.old_value || l.orig) + "</td><td>" + esc(l.new_value || "(dikembalikan ke bawaan)") + "</td></tr>").join("") + "</tbody></table>" : '<div class="empty">Belum ada perubahan.</div>'}</div></div>`);
    const draw = () => {
      const q = state.q.toLowerCase(), rows = d.items.filter(i => (!state.page || i.pages.includes(state.page)) && (!state.only || i.value != null) && (!q || (i.orig + " " + (i.value || "")).toLowerCase().includes(q))).slice(0, 300);
      $("#txB").innerHTML = rows.length ? rows.map((i, n) => "<tr><td>" + (i.value != null ? "<b>" + esc(i.value) + '</b><div class="small faint">Bawaan: ' + esc(i.orig) + "</div>" : esc(i.orig)) + (i.orphan ? '<div class="small faint">Teks ini sudah tidak ada di halaman. Kembalikan untuk membersihkan.</div>' : "") + '</td><td class="small">' + esc(i.pages.join(", ") || "-") + (i.count > 1 ? " · " + i.count + "×" : "") + '</td><td style="white-space:nowrap"><button class="btn sm" data-ed="' + n + '">Ubah</button>' + (i.value != null ? ' <button class="btn sm" data-rs="' + n + '">Kembalikan</button>' : "") + "</td></tr>").join("") : '<tr><td colspan="3"><div class="empty">Tidak ada teks yang cocok.</div></td></tr>';
      $$("[data-ed]").forEach(b => b.onclick = () => edit(rows[+b.dataset.ed]));
      $$("[data-rs]").forEach(b => b.onclick = async () => { const i = rows[+b.dataset.rs]; if (!await confirmAct("Kembalikan ke teks bawaan?", "Teks <b>" + esc(i.value) + "</b> diganti lagi menjadi <b>" + esc(i.orig) + "</b>.", "Kembalikan")) return; try { await api("/ms/admin/ca/texts/reset", { json: { orig: i.orig } }); toast("Dikembalikan"); route(); } catch (e) { fail(e); } });
    };
    async function edit(i) {
      const pg = i.pages.map(fileOf).find(Boolean);
      const v = await dialog({ title: "Ubah teks", wide: !!pg, body: '<p class="small muted">Bawaan: <b>' + esc(i.orig) + "</b><br>Tampil di: " + esc(i.pages.join(", ") || "-") + "</p>" + (pg ? '<div class="bar"><button type="button" class="btn sm" id="txPv">Lihat pratinjau halaman</button><span class="small faint">Teks yang diubah disorot kuning. Belum disimpan.</span></div><iframe id="txFr" sandbox title="Pratinjau" style="width:100%;height:340px;border:1px solid var(--border);border-radius:10px;background:#fff;display:none"></iframe>' : ""),
        input: { label: "Teks pengganti", value: i.value != null ? i.value : i.orig, max: d.max, required: true, hint: "Tulis teks biasa, maksimal " + d.max + " karakter, tanpa tanda < atau >." },
        onOpen: dg => { const pb = $("#txPv", dg); if (pb) pb.onclick = () => busy(pb, async () => { try { const r = await api("/ms/admin/ca/texts/preview", { json: { page: pg, orig: i.orig, value: $("#dlgIn", dg).value } }); const fr = $("#txFr", dg); fr.style.display = "block"; fr.srcdoc = r.html.replace("<head>", '<head><base href="' + location.origin + '/">'); } catch (e) { $("#dlgErr", dg).textContent = e.message; } }); } });
      if (!v) return;
      try { await api("/ms/admin/ca/texts", { json: { orig: i.orig, value: v } }); toast("Tersimpan, langsung tayang"); route(); } catch (e) { fail(e); }
    }
    $("#txQ").oninput = debounce(e => { state.q = e.target.value; draw(); }, 150);
    $("#txP").onchange = e => { state.page = e.target.value; draw(); };
    $("#txO").onchange = e => { state.only = e.target.checked; draw(); };
    draw();
  }

  async function pDokumen() {
    const P = "/ms/admin/parafrase/dokumen", q = params();
    const d = await api(P + "?" + new URLSearchParams({ q: q.get("q") || "", kind: q.get("kind") || "" }).toString());
    const KL = { bedah: "Bedah UT", audit: "Audit Dokumen", parafrase: "Cek & Parafrase", metopen: "Metopen", lain: "Lain" };
    const sz = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
    const pc = (id, f, v, ph) => `<input class="in dk-n" type="number" min="0" max="100" step="0.1" data-id="${id}" data-f="${f}" value="${v == null ? "" : v}" placeholder="${ph}" style="width:72px">`;
    const stat = x => {
      const parts = [];
      if (x.aiOk !== null) parts.push(badge("AI " + (x.aiOk ? "tercapai" : "belum"), x.aiOk ? "ok" : "bad"));
      if (x.simOk !== null) parts.push(badge("Sim " + (x.simOk ? "tercapai" : "belum"), x.simOk ? "ok" : "bad"));
      return parts.join(" ") || '<span class="faint small">Isi persen dan target</span>';
    };
    const ST = { baru: ["Baru", "info"], diproses: ["Diproses", "warn"], perbaikan_dikirim: ["Perbaikan sudah dikirim", "ok"], revisi: ["Revisi masuk", "bad"] };
    const row = x => `<tr>
      <td><div><a href="#/dokumen/${x.id}"><b>${esc(x.title || x.name)}</b></a>${x.revisionNo ? " " + badge("Revisi ke-" + x.revisionNo, "bad") : ""}</div><div class="small muted">${esc(x.name)} · ${sz(x.size)}${x.orderId ? " · " + esc(x.orderId) : ""}</div>${x.note ? `<div class="small faint">${esc(x.note)}</div>` : ""}</td>
      <td>${badge(KL[x.kind] || x.kind, "mute")}</td>
      <td class="nowrap">${pc(x.id, "aiPct", x.aiPct, "AI %")} <span class="faint">→</span> ${pc(x.id, "targetAi", x.targetAi, "target")}</td>
      <td class="nowrap">${pc(x.id, "simPct", x.simPct, "Sim %")} <span class="faint">→</span> ${pc(x.id, "targetSim", x.targetSim, "target")}</td>
      <td>${badge(ST[x.status] ? ST[x.status][0] : x.status, ST[x.status] ? ST[x.status][1] : "mute")}<div style="margin-top:4px">${stat(x)}</div></td>
      <td class="small muted">${dd(x.createdAt)}<br>${x.pinned ? "Disematkan" : "Hapus " + dd(x.expiresAt)}</td>
      <td class="nowrap"><a class="btn sm" href="#/dokumen/${x.id}">Detail</a> ${x.hasAi ? `<a class="btn sm pri" href="/ms/admin/studio-page?id=${x.id}" target="_blank" rel="noopener">Buka Studio</a> <a class="btn sm" href="/ms/admin/studio/${x.id}/word">Word tanda UT</a> ` : ""}<a class="btn sm" href="${P}/${x.id}/unduh">Unduh</a> <button class="btn sm" data-pin="${x.id}" data-v="${x.pinned ? 0 : 1}">${x.pinned ? "Lepas sematan" : "Sematkan"}</button> <button class="btn sm bad" data-del="${x.id}">Hapus</button></td></tr>`;
    const stF = q.get("status") || "", items = d.items.filter(x => !stF || x.status === stF);
    const groups = new Map(); items.forEach(x => { const k = x.studentKey || "-"; (groups.get(k) || groups.set(k, []).get(k)).push(x); });
    const waLink = (g, t) => g.wa ? `https://wa.me/${g.wa}${t ? "?text=" + encodeURIComponent(t) : ""}` : "";
    const rows = [...groups.entries()].map(([k, arr]) => { const g = arr.find(x => x.studentName || x.wa) || arr[0]; const head = k === "-" ? "Tanpa data mahasiswa" : `<b>${esc(g.studentName || "Nama belum terbaca")}</b> · NIM ${esc(g.nim || "–")} · ${g.wa ? "+" + esc(g.wa) : "tanpa WA"} · ${arr.length} dokumen`;
      return `<tr><td colspan="7" style="background:rgba(128,128,128,.12)"><div class="bar">${head}<span class="grow"></span>${g.wa ? `<a class="btn sm pri" target="_blank" rel="noopener" href="${waLink(g)}">Chat WhatsApp</a>` : ""}</div></td></tr>` + arr.map(row).join(""); }).join("");
    setPage("Dokumen Saya", "Simpan file Bedah, Cek & Parafrase, dan metopen dalam satu daftar", `<div class="notice info">File disimpan privat dan dihapus otomatis setelah ${d.ttlDays} hari. Klik <b>Sematkan</b> untuk menyimpan tanpa batas. Isi persen AI dan similarity dari Drillbit beserta targetnya supaya kelihatan mana yang sudah aman. Unggah laporan PDF Drillbit dan angkanya terbaca otomatis.</div>
      <div class="card"><div class="hd"><h2>Simpan dokumen</h2></div><div class="bd"><form id="dkF" class="grid g2">
        <label class="f">File dokumen (Word, PDF, dan lainnya, boleh banyak)<input class="in" type="file" name="file" multiple required></label>
        <label class="f">Judul<input class="in" name="title" maxlength="200" placeholder="Judul tugas atau penelitian"></label>
        <label class="f">Jenis<select class="in" name="kind">${d.kinds.map(k => `<option value="${k}">${KL[k]}</option>`).join("")}</select></label>
        <label class="f">Catatan (opsional)<input class="in" name="note" maxlength="300"></label>
        <label class="f">Laporan AI Drillbit (PDF, opsional)<input class="in" type="file" name="ai" accept="application/pdf"></label>
        <label class="f">Laporan Similarity Drillbit (PDF, opsional)<input class="in" type="file" name="sim" accept="application/pdf"></label>
        <label class="f">Persen AI (bila tanpa laporan)<input class="in" name="aiPct" inputmode="decimal" placeholder="mis. 35"></label>
        <label class="f">Persen similarity (bila tanpa laporan)<input class="in" name="simPct" inputmode="decimal" placeholder="mis. 18"></label>
        <label class="f">Target AI maksimal (%)<input class="in" name="targetAi" inputmode="decimal" placeholder="mis. 20"></label>
        <label class="f">Target similarity maksimal (%)<input class="in" name="targetSim" inputmode="decimal" placeholder="mis. 25"></label>
        <div class="bar" style="grid-column:1/-1"><button class="btn pri" type="submit">Simpan</button><span class="small faint">Bila memilih beberapa file, judul, persen, dan target yang sama dipakai untuk semuanya.</span></div></form>
        <div class="bar small" style="margin-top:10px"><input class="in" id="dkO" placeholder="ID pesanan, mis. NA-1001" style="max-width:220px"><button class="btn" id="dkOB">Arsipkan file dari pesanan</button></div></div></div>
      <div class="card"><div class="hd"><h2>Daftar dokumen (${items.length} · ${groups.size} mahasiswa)</h2><form class="bar" id="dkQ"><input class="in" name="q" value="${esc(q.get("q") || "")}" placeholder="Cari nama, NIM, WA, judul, catatan" style="max-width:240px"><select class="in" name="kind" style="max-width:160px"><option value="">Semua jenis</option>${d.kinds.map(k => `<option value="${k}"${q.get("kind") === k ? " selected" : ""}>${KL[k]}</option>`).join("")}</select><select class="in" name="status" style="max-width:190px"><option value="">Semua status</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}"${stF === k ? " selected" : ""}>${v[0]}</option>`).join("")}</select><button class="btn" type="submit">Cari</button></form></div>
        <div class="tbl-wrap"><table class="t"><thead><tr><th>Judul / file</th><th>Jenis</th><th>AI (sekarang → target)</th><th>Similarity (sekarang → target)</th><th>Status</th><th>Disimpan</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">Belum ada dokumen.</td></tr>'}</tbody></table></div></div>`);
    $("#dkQ").onsubmit = e => { e.preventDefault(); const f = e.target; go("dokumen", { q: f.q.value.trim(), kind: f.kind.value, status: f.status.value }); };
    $("#dkF").onsubmit = async e => {
      e.preventDefault(); const f = e.target, fd = new FormData(f);
      for (const k of ["ai", "sim"]) if (!f[k].files.length) fd.delete(k);
      await busy($("button[type=submit]", f), async () => { try { const r = await api(P, { form: fd }); toast("Tersimpan" + (r.aiPct != null ? " · AI " + r.aiPct + "%" : "") + (r.simPct != null ? " · Sim " + r.simPct + "%" : "") + (r.warn && r.warn.length ? " · " + r.warn[0] : ""), !!(r.warn && r.warn.length)); route(); } catch (err) { fail(err); } });
    };
    $("#dkOB").onclick = async () => { const id = $("#dkO").value.trim().toUpperCase(); if (!id) return; try { const r = await api(P + "/pesanan/" + encodeURIComponent(id), { json: {} }); toast("Diarsipkan: " + r.saved.join(", ")); route(); } catch (err) { fail(err); } };
    $$(".dk-n").forEach(i => i.onchange = async () => { try { await api(P + "/" + i.dataset.id, { method: "PATCH", json: { [i.dataset.f]: i.value } }); toast("Tersimpan"); route(); } catch (err) { fail(err); } });
    $$("[data-pin]").forEach(b => b.onclick = async () => { try { await api(P + "/" + b.dataset.pin, { method: "PATCH", json: { pinned: b.dataset.v === "1" } }); route(); } catch (err) { fail(err); } });
    $$("[data-del]").forEach(b => b.onclick = async () => { if (!await confirmAct("Hapus dokumen ini?", "File dihapus permanen dari server.", "Hapus", "bad")) return; try { await api(P + "/" + b.dataset.del, { method: "DELETE" }); toast("Dihapus"); route(); } catch (err) { fail(err); } });
  }
  async function pDokumenDetail(id) {
    const P = "/ms/admin/parafrase/dokumen", r = await api(P + "/" + id), x = r.item, d = r.data || {}, ai = d.ai, sim = d.sim;
    const f1 = v => v == null ? "–" : Number(v).toLocaleString("id-ID", { maximumFractionDigits: 1 });
    const col = (v, t, lo, hi) => v == null ? "var(--faint)" : (t != null ? (v <= t ? "var(--ok,#2e9d62)" : "var(--bad,#d9534f)") : v <= lo ? "var(--ok,#2e9d62)" : v <= hi ? "var(--warn,#e0a526)" : "var(--bad,#d9534f)");
    const donut = (v, c, label, sub) => { const R = 52, C = 2 * Math.PI * R, p = Math.max(0, Math.min(100, v || 0)); return `<svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="${esc(label)} ${f1(v)} persen"><circle cx="70" cy="70" r="${R}" fill="none" stroke="rgba(128,128,128,.25)" stroke-width="16"/><circle cx="70" cy="70" r="${R}" fill="none" stroke="${c}" stroke-width="16" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 70 70)" stroke-linecap="butt"/><text x="70" y="68" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor">${f1(v)}%</text><text x="70" y="88" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">${esc(sub || "")}</text></svg><div class="small" style="text-align:center"><b>${esc(label)}</b></div>`; };
    const bars = (rows, max) => rows.map(([l, v, c, extra]) => `<div style="display:grid;grid-template-columns:minmax(90px,150px) 1fr 64px;gap:8px;align-items:center;margin:5px 0"><span class="small">${esc(l)}</span><span style="background:rgba(128,128,128,.2);border-radius:6px;height:14px;display:block"><span style="display:block;height:14px;border-radius:6px;width:${Math.max(1, Math.min(100, (v || 0) / (max || 100) * 100))}%;background:${c}"></span></span><b class="small">${esc(extra || f1(v) + "%")}</b></div>`).join("");
    const aiTop = ai ? `<div class="card"><div class="hd"><h2>Deteksi AI Drillbit</h2></div><div class="bd" style="display:flex;flex-wrap:wrap;gap:24px;align-items:center"><div>${donut(ai.pct, col(ai.pct, x.targetAi, 20, 40), "AI terdeteksi", x.targetAi != null ? "target ≤ " + f1(x.targetAi) + "%" : "")}</div>
      <div class="grid g2" style="flex:1;min-width:240px">${[["Persen AI", f1(ai.pct) + "%"], ["Persen tulisan manusia", f1(ai.humanPct) + (ai.humanPct == null ? "" : "%")], ["Kata terdeteksi AI", num(ai.matchedWords)], ["Total kata", num(ai.totalWords || d.words)], ["Halaman", num(ai.pages)], ["Kalimat", num(ai.sentences)], ["Blok ditandai", num((ai.blockTable || []).length)], ["Keyakinan pemetaan", ai.confidence || "–"]].map(([l, v]) => `<div class="card"><div class="bd"><div class="small muted">${l}</div><b>${v}</b></div></div>`).join("")}</div></div></div>
      ${(ai.blockTable || []).length ? `<div class="card"><div class="hd"><h2>Persen AI per blok</h2></div><div class="bd">${bars(ai.blockTable.map(b => ["Blok " + b.n + (b.included ? "" : " (dikecualikan)"), b.pct, b.included ? col(b.pct, null, 20, 50) : "rgba(128,128,128,.5)", f1(b.pct) + "% · " + num(b.words) + " kata"]), 100)}</div></div>` : ""}` : `<div class="notice">Laporan AI tidak ada.</div>`;
    const typeRows = sim ? Object.entries({ Internet: sim.sourceTypes && sim.sourceTypes.internet, "Jurnal / publikasi": sim.sourceTypes && sim.sourceTypes.jurnal, "Tugas mahasiswa": sim.sourceTypes && sim.sourceTypes.mahasiswa }).filter(([, v]) => v != null) : [];
    const simTop = sim ? `<div class="card"><div class="hd"><h2>Similarity Drillbit</h2></div><div class="bd" style="display:flex;flex-wrap:wrap;gap:24px;align-items:center"><div>${donut(sim.pct, col(sim.pct, x.targetSim, 10, 40), "Similarity", "Grade " + (sim.grade || "–"))}</div>
      <div style="flex:1;min-width:240px">${typeRows.length ? "<div class='small muted'>Asal kemiripan</div>" + bars(typeRows.map(([l, v]) => [l, v, "var(--pri,#4c8bf5)"]), Math.max(100, ...typeRows.map(t => t[1]))) : ""}
      ${sim.content && (sim.content.kutipan != null || sim.content.kurangDari14Kata != null) ? `<div class="small muted" style="margin-top:8px">Komponen dikecualikan/terhitung: kutipan ${f1(sim.content.kutipan)}% · kata kurang dari 14: ${f1(sim.content.kurangDari14Kata)}%</div>` : ""}</div></div></div>
      ${(sim.sources || []).length ? `<div class="card"><div class="hd"><h2>Sumber kemiripan teratas</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>#</th><th>Sumber</th><th>Jenis</th><th class="num">%</th></tr></thead><tbody>${sim.sources.map(s => `<tr><td>${s.n}</td><td>${esc(s.domain)}</td><td>${esc(s.type)}</td><td class="num">${f1(s.pct)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}` : `<div class="notice">Laporan similarity tidak ada.</div>`;
    const tgt = (f, v, ph) => `<input class="in dk-n" type="number" min="0" max="100" step="0.1" data-f="${f}" value="${v == null ? "" : v}" placeholder="${ph}" style="width:90px">`;
    setPage(x.title || x.name, "Dokumen Saya · " + dd(x.createdAt), `<div class="bar"><a class="btn" href="#/dokumen">← Daftar dokumen</a><span class="grow"></span>${x.hasAi ? `<a class="btn pri" href="/ms/admin/studio-page?id=${id}" target="_blank" rel="noopener">Buka Studio Parafrase</a>` : ""}<a class="btn" href="${P}/${id}/unduh">Unduh file asli</a>${x.hasAi ? `<a class="btn" href="${P}/${id}/unduh?f=ai">Laporan AI (PDF)</a>` : ""}${x.hasSim ? `<a class="btn" href="${P}/${id}/unduh?f=sim">Laporan similarity (PDF)</a>` : ""}</div>
      <div class="card"><div class="bd"><div class="grid g2"><div><div class="small muted">Nama file</div><b>${esc(x.name)}</b></div><div><div class="small muted">Jumlah kata</div><b>${num(x.words || d.words)}</b></div></div>
        <div class="bar" style="margin-top:12px"><span class="small">Target AI maksimal (%)</span>${tgt("targetAi", x.targetAi, "mis. 20")}<span class="small">Target similarity maksimal (%)</span>${tgt("targetSim", x.targetSim, "mis. 25")}<span class="small faint">Berubah otomatis menjadi hijau bila angka ≤ target.</span></div></div></div>
      <div class="card"><div class="hd"><h2>Mahasiswa dan pengiriman perbaikan</h2></div><div class="bd">
        <div class="grid g2"><label class="f">Nama<input class="in" id="dkNm" value="${esc(x.studentName || "")}" maxlength="80"></label><label class="f">NIM<input class="in" value="${esc(x.nim || "")}" disabled></label>
        <label class="f">WhatsApp (62…)<input class="in" id="dkWa" value="${esc(x.wa || "")}" inputmode="tel"></label><label class="f">Status<select class="in" id="dkSt">${[["baru", "Baru"], ["diproses", "Diproses"], ["perbaikan_dikirim", "Perbaikan sudah dikirim"], ["revisi", "Revisi masuk"]].map(([k, l]) => `<option value="${k}"${x.status === k ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
        ${d.nameMismatch ? '<div class="notice" style="margin-top:8px">Nama pada unggahan ini berbeda dari yang tercatat untuk NIM yang sama. Periksa dulu apakah ini orang yang sama.</div>' : ""}
        ${x.revisionNo ? `<div class="notice info" style="margin-top:8px">Ini revisi ke-${x.revisionNo}. Dokumen sebelumnya milik mahasiswa yang sama ada di daftar di bawah namanya.</div>` : ""}
        <div class="bar" style="margin-top:10px"><button class="btn" id="dkSv">Simpan data</button>${x.wa ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(x.wa)}?text=${encodeURIComponent("Halo " + (x.studentName || "") + ", file perbaikan Bedah kamu sudah kami kirim. Silakan dicek ya. Bila masih ada tanda dari UT, kirim laporan Drillbit barumu di halaman Bedah.")}">Chat WhatsApp</a>` : ""}</div>
        <hr style="margin:14px 0;border:0;border-top:1px solid rgba(128,128,128,.25)">
        <div class="small muted">File perbaikan yang kamu kirim ${x.hasFix ? `: <a href="${P}/${id}/unduh?f=fix">${esc(x.fixName || "unduh")}</a> · dikirim ${dt(x.fixSentAt)}` : "belum ada"}</div>
        <div class="bar" style="margin-top:8px"><input class="in" type="file" id="dkFx" style="max-width:320px"><button class="btn pri" id="dkSent">Tandai perbaikan sudah dikirim</button><span class="small faint">File boleh dikosongkan bila sudah kamu kirim lewat WhatsApp.</span></div></div></div>
      ${x.kind === "bedah" ? aiTop + simTop : `<div class="card"><div class="hd"><h2>Ringkasan unggahan</h2></div><div class="bd"><div class="small muted">Diunggah mahasiswa sebelum ada pesanan atau pembayaran.${d.email ? " Akun: " + esc(d.email) + "." : ""}</div>${d.summary && d.summary.score != null ? `<p>Skor audit: <b>${esc(String(d.summary.score))}</b></p>` : ""}</div></div>`}`);
    $("#dkSv").onclick = async () => { try { await api(P + "/" + id, { method: "PATCH", json: { studentName: $("#dkNm").value, wa: $("#dkWa").value, status: $("#dkSt").value } }); toast("Tersimpan"); route(); } catch (err) { fail(err); } };
    $("#dkSent").onclick = async e => { const fd = new FormData(); const f = $("#dkFx").files[0]; if (f) fd.append("file", f); await busy(e.target, async () => { try { await api(P + "/" + id + "/perbaikan", { form: fd }); toast("Status: perbaikan sudah dikirim"); route(); } catch (err) { fail(err); } }); };
    $$(".dk-n").forEach(i => i.onchange = async () => { try { await api(P + "/" + id, { method: "PATCH", json: { [i.dataset.f]: i.value } }); toast("Tersimpan"); route(); } catch (err) { fail(err); } });
  }
  async function pTestimonials() {
    const d = await api("/ms/admin/ulasan");
    setPage("Testimoni", "Ulasan asli pelanggan yang tampil di beranda Catatan Akademik", `<div class="notice info">Unggah tangkapan layar chat atau tulis kata pelanggan di sini. Di beranda tampil <b>6 testimoni terbaru yang berstatus Tampil</b>. Hanya unggah testimoni <b>asli</b> dan yang sudah diizinkan pelanggan; tutup nama atau nomor yang tidak perlu terlihat di tangkapan layar.</div>
      <div class="card"><div class="hd"><h2 id="tmT">Tambah testimoni</h2></div><div class="bd"><form id="tmF" class="grid g2">
        <label class="f">Nama pelanggan<input class="in" name="nama" maxlength="60" required placeholder="mis. Rina, S1 Manajemen"></label>
        <label class="f">Keterangan (opsional)<input class="in" name="ket" maxlength="80" placeholder="mis. Pesan Metopen 1"></label>
        <label class="f" style="grid-column:1/-1">Isi testimoni<textarea class="in" name="teks" rows="3" maxlength="500" required></textarea></label>
        <label class="f">Tangkapan layar chat (opsional, data sensitif diburamkan otomatis)<input class="in" type="file" name="img" accept="image/jpeg,image/png,image/webp"></label>
        <div class="f"><label class="bar small"><input type="checkbox" name="tampil" checked> Tampilkan di beranda</label><label class="bar small"><input type="checkbox" name="izin" required> Pelanggan sudah mengizinkan ulasan ini ditayangkan</label></div>
        <div class="bar" style="grid-column:1/-1"><button class="btn pri" type="submit">Simpan testimoni</button><button class="btn" type="button" id="tmR">Kosongkan form</button><span class="small faint" id="tmI"></span></div></form></div></div>
      <div class="card"><div class="hd"><h2>Daftar testimoni (${d.items.length})</h2></div><div class="bd">${d.items.length ? '<div class="grid g2">' + d.items.map(x => '<div class="card"><div class="bd">' + (x.imgAdmin ? '<img src="' + esc(x.imgAdmin) + '" alt="" loading="lazy" style="max-width:100%;max-height:220px;object-fit:contain;border-radius:10px;border:1px solid var(--border)">' : "") + "<div><b>" + esc(x.nama) + "</b> " + (x.ket ? '<span class="small faint">' + esc(x.ket) + "</span>" : "") + '</div><p style="margin:0">' + esc(x.teks) + '</p><div class="bar">' + badge(x.tampil ? "Tampil" : "Disembunyikan", x.tampil ? "ok" : "mute") + (x.izin ? "" : badge("Izin belum dicatat", "warn")) + '<span class="grow"></span><button class="btn sm" data-e="' + esc(x.id) + '">Ubah</button><button class="btn sm" data-t="' + esc(x.id) + '">' + (x.tampil ? "Sembunyikan" : "Tampilkan") + '</button><button class="btn sm" data-d="' + esc(x.id) + '">Hapus</button></div></div></div>').join("") + "</div>" : '<div class="empty">Belum ada testimoni. Isi form di atas untuk menambah yang pertama.</div>'}</div></div>`);
    const f = $("#tmF"); let eid = "", blurred = null;
    /* blur otomatis data sensitif di tangkapan layar (blur.js, berjalan di browser; gambar asli tidak dikirim ke server) */
    const loadBlur = () => window.CABlur ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement("script"); s.src = "blur.js?v=1"; s.onload = ok; s.onerror = () => no(new Error("Modul blur gagal dimuat.")); document.head.appendChild(s); });
    f.img.onchange = async () => {
      blurred = null; const file = f.img.files[0]; if (!file) return;
      try { await loadBlur(); const blob = await window.CABlur.edit(file, { dialog }); if (blob) { blurred = new File([blob], "testimoni.jpg", { type: "image/jpeg" }); $("#tmI").textContent = "Gambar sudah diburamkan dan siap disimpan."; } else { f.img.value = ""; $("#tmI").textContent = ""; } }
      catch (err) { f.img.value = ""; fail(err); }
    };
    const reset = () => { f.reset(); eid = ""; blurred = null; $("#tmT").textContent = "Tambah testimoni"; $("#tmI").textContent = ""; f.izin.required = true; };
    $("#tmR").onclick = reset;
    f.onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(f); fd.set("tampil", f.tampil.checked ? "1" : "0"); fd.set("izin", f.izin.checked ? "1" : "0"); if (eid) fd.set("id", eid); if (blurred) fd.set("img", blurred); else fd.delete("img");
      await busy($("button[type=submit]", f), async () => { try { await api("/ms/admin/ulasan", { form: fd }); toast("Testimoni tersimpan"); route(); } catch (err) { fail(err); } });
    };
    $$("[data-e]").forEach(b => b.onclick = () => { const x = d.items.find(i => i.id === b.dataset.e); eid = x.id; f.nama.value = x.nama; f.ket.value = x.ket || ""; f.teks.value = x.teks; f.tampil.checked = !!x.tampil; f.izin.checked = true; f.izin.required = false; $("#tmT").textContent = "Ubah testimoni"; $("#tmI").textContent = "Gambar lama tetap dipakai kecuali Anda memilih gambar baru."; f.scrollIntoView({ behavior: "smooth", block: "center" }); f.nama.focus(); });
    $$("[data-t]").forEach(b => b.onclick = async () => { try { await api("/ms/admin/ulasan/" + b.dataset.t + "/toggle", { method: "POST" }); route(); } catch (err) { fail(err); } });
    $$("[data-d]").forEach(b => b.onclick = async () => { if (!await confirmAct("Hapus testimoni ini?", "Dihapus permanen beserta gambarnya. Bila ragu, pakai Sembunyikan.", "Hapus", "bad")) return; try { await api("/ms/admin/ulasan/" + b.dataset.d, { method: "DELETE" }); toast("Dihapus"); route(); } catch (err) { fail(err); } });
  }
  async function pServices() {
    const d = await api("/ms/admin/ca/services");
    setPage("Layanan & Harga", "Harga dan status layanan yang tampil di situs", `<div class="notice info">${esc(d.note)}</div>
      <div class="card"><div class="hd"><h2>Layanan</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Layanan</th><th>Nama tampil</th><th>Jenis</th><th>Harga (Rp)</th><th>Status</th><th class="num">Total pesanan</th></tr></thead><tbody>${d.items.map(s => `<tr><td><b>${esc(s.label)}</b><div class="mono faint">${esc(s.key)}</div></td><td><input class="in" style="max-width:210px" maxlength="40" data-label="${esc(s.labelKey)}" data-old="${esc(s.label === s.labelDefault ? "" : s.label)}" value="${esc(s.label)}" placeholder="${esc(s.labelDefault)}" aria-label="Nama tampil ${esc(s.labelDefault)}"></td><td>${esc(s.kind)}</td><td><input class="in" type="number" min="0" step="1000" style="max-width:150px" data-price="${esc(s.priceKey)}" data-old="${s.price}" value="${s.price}" aria-label="Harga ${esc(s.label)}"></td><td><label class="bar small"><input type="checkbox" data-svc="${esc(s.key)}" ${s.active ? "checked" : ""}> Dibuka</label></td><td class="num">${num(s.orders)}</td></tr>`).join("")}</tbody></table></div></div>
      ${d.cards.length ? `<div class="card"><div class="hd"><h2>Kartu di halaman Layanan UT</h2></div><div class="bd"><p class="small muted" style="margin:0">Hilangkan centang untuk menyembunyikan kartu dari halaman Layanan UT (layanan tetap ada, hanya kartunya yang tidak tampil). Judul dan deskripsi kartu diubah di <a href="#/texts">Teks &amp; Nama</a>.</p><div class="bar">${d.cards.map(c => `<label class="bar small"><input type="checkbox" data-card="${esc(c.slug)}" ${c.shown ? "checked" : ""}> ${esc(c.title)}</label>`).join("")}</div></div></div>` : ""}
      <div class="card"><div class="hd"><h2>Harga lain</h2></div><div class="tbl-wrap"><table class="t"><tbody>${d.other.map(s => `<tr><td>${esc(s.label)}<div class="mono faint">${esc(s.key)}</div></td><td><input class="in" type="number" min="0" style="max-width:150px" data-price="${esc(s.key)}" data-old="${s.price}" value="${s.price}" aria-label="${esc(s.label)}"></td></tr>`).join("")}</tbody></table></div></div>
      <div class="bar"><span class="grow"></span><button class="btn pri" id="svS">Simpan perubahan</button></div>`);
    const off0 = d.items.filter(s => !s.active).map(s => s.key).sort().join(","), hid0 = d.cards.filter(c => !c.shown).map(c => c.slug).sort().join(",");
    $("#svS").onclick = async e => {
      const values = {}, lines = [];
      $$("[data-price]").forEach(i => { if (String(i.value) !== String(i.dataset.old)) { const n = Number(i.value); values[i.dataset.price] = n; lines.push(`${esc(i.getAttribute("aria-label").replace(/^Harga /, ""))}: ${rp(i.dataset.old)} → <b>${rp(n)}</b>`); } });
      const off = $$("[data-svc]").filter(c => !c.checked).map(c => c.dataset.svc).sort().join(",");
      if (off !== off0) { values.layanan_nonaktif = off; lines.push(`Layanan ditutup: <b>${esc(off || "tidak ada")}</b>`); }
      $$("[data-label]").forEach(i => { const sv = i.value.trim() === i.placeholder ? "" : i.value.trim(); if (sv !== i.dataset.old) { values[i.dataset.label] = sv; lines.push(`Nama: ${esc(i.placeholder)} → <b>${esc(sv || "(bawaan)")}</b>`); } });
      const hid = $$("[data-card]").filter(c => !c.checked).map(c => c.dataset.card).sort().join(",");
      if (hid !== hid0) { values.kartu_sembunyi = hid; lines.push(`Kartu disembunyikan: <b>${esc(hid || "tidak ada")}</b>`); }
      if (!lines.length) return toast("Tidak ada perubahan.");
      if (!await confirmAct("Simpan perubahan harga/layanan?", `${lines.join("<br>")}<br><br>Berlaku untuk pesanan baru di situs live. Pesanan lama tidak berubah.`, "Simpan")) return;
      busy(e.target, async () => { try { await saveSettings(values); toast("Tersimpan"); route(); } catch (err) { fail(err); } });
    };
  }
  async function pReports() {
    const q = params(), to = q.get("to") || dayKey(Date.now()), from = q.get("from") || dayKey(Date.now() - 29 * 864e5);
    const d = await api(`/ms/admin/ca/report?from=${from}&to=${to}`), t = d.totals;
    setPage("Laporan & Statistik", `${dd(from + "T00:00:00+07:00")} – ${dd(to + "T00:00:00+07:00")} (WIB)`, `
      <form class="bar" id="rf"><label class="f">Dari<input class="in" type="date" name="from" value="${from}"></label><label class="f">Sampai<input class="in" type="date" name="to" value="${to}"></label><button class="btn" style="align-self:flex-end">Tampilkan</button>${[7, 30, 90].map(n => `<button type="button" class="btn sm" style="align-self:flex-end" data-days="${n}">${n} hari</button>`).join("")}</form>
      <div class="grid g4">${stat("box", num(t.created), "Pesanan dibuat")}${stat("wallet", rp(t.revenue), "Pendapatan terkonfirmasi", `${num(t.paid)} pesanan dibayar · konversi ${d.conversion}%`)}${stat("list", num(t.done), "Selesai (dari pesanan dibuat)", `${num(t.cancelled)} batal · ${num(t.expired)} kedaluwarsa`)}${stat("doc", num(t.postsPublished), "Artikel terbit")}</div>
      <div class="grid g2"><div class="card"><div class="hd"><h2>Per layanan (dibayar)</h2></div><div class="tbl-wrap">${d.byService.length ? `<table class="t"><thead><tr><th>Layanan</th><th class="num">Pesanan</th><th class="num">Pendapatan</th></tr></thead><tbody>${d.byService.map(s => `<tr><td>${esc(s.name)}</td><td class="num">${num(s.count)}</td><td class="num">${rp(s.revenue)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada pembayaran di rentang ini.</div>'}</div></div>
        <div class="card"><div class="hd"><h2>Status pesanan dibuat</h2></div><div class="tbl-wrap">${d.byStatus.length ? `<table class="t"><thead><tr><th>Status</th><th class="num">Jumlah</th></tr></thead><tbody>${d.byStatus.map(s => `<tr><td>${esc(s.name)}</td><td class="num">${num(s.count)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada pesanan.</div>'}</div></div></div>
      <div class="card"><div class="hd"><h2>Definisi metrik</h2></div><div class="bd"><dl class="kv">${Object.entries({ "Pesanan dibuat": d.definitions.created, "Dibayar": d.definitions.paid, "Pendapatan": d.definitions.revenue, "Konversi": d.definitions.conversion, "Pengunjung": d.definitions.traffic }).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div></div>`);
    $("#rf").onsubmit = e => { e.preventDefault(); go("reports", { from: e.target.from.value, to: e.target.to.value }); };
    $$("[data-days]").forEach(b => b.onclick = () => go("reports", { from: dayKey(Date.now() - (Number(b.dataset.days) - 1) * 864e5), to: dayKey(Date.now()) }));
  }
  const SET_LABEL = {
    admin_wa_number: "Nomor WhatsApp admin (62…)", update_group_url: "Tautan grup info WhatsApp", ca_instagram_url: "Tautan Instagram komunitas (tampil di bawah artikel blog)", ca_tiktok_url: "Tautan TikTok komunitas (tampil di bawah artikel blog)", ca_facebook_url: "Tautan Facebook komunitas (tampil di bawah artikel blog)", qris_merchant_name: "Nama merchant QRIS", payment_window_minutes: "Batas waktu bayar (menit)", unique_code_enabled: "Pakai kode unik pembayaran", unique_code_max: "Kode unik maksimum",
    retention_hours: "Masa simpan file hasil (jam)", reminder_before_delete_hours: "Pengingat sebelum file dihapus (jam)", file_max_mb: "Ukuran file maksimal (MB)", fast_lane_enabled: "Jalur cepat aktif", fast_lane_daily_cap: "Kuota jalur cepat per hari",
    revision_free_count: "Jumlah revisi gratis", revision_price_per_word: "Harga revisi per kata", long_sentence_words: "Batas kalimat panjang (kata)", preview_open_sentences: "Kalimat contoh terbuka di pratinjau (lama)", preview_open_paragraphs: "Paragraf contoh terbuka di pratinjau gratis", avg_words_per_hour: "Kecepatan kerja (kata/jam)",
    masalah_batas_persen: "Batas tingkat bermasalah (%): di atas ini belum aman", standar_kutipan_max_persen: "Standar modul: batas kutipan langsung (% kalimat, 0 = mati)", standar_hipotesis_max: "Standar modul: batas jumlah hipotesis (0 = mati)",
    drillbit_sim_max: "Batas acuan similarity Drillbit (%)", drillbit_ai_max: "Batas acuan AI Drillbit (%)", urgensi_ai_sedang: "Urgensi: indikasi gaya seragam mulai SEDANG (%)", urgensi_ai_tinggi: "Urgensi: indikasi gaya seragam mulai TINGGI (%)", urgensi_paragraf_skor: "Urgensi: skor paragraf MENDESAK", urgensi_paragraf_persen: "Urgensi: % paragraf mendesak = dokumen MENDESAK", ga_id: "Google Analytics 4 (G-…)", gtm_id: "Google Tag Manager (GTM-…)", google_verify_file: "File verifikasi Google Search Console", qris_image_path: "Lokasi gambar QRIS (diatur lewat unggah)", layanan_nonaktif: "Kode layanan yang ditutup",
  };
  async function pSettings() {
    const d = await api("/ms/admin/parafrase/settings"), skip = k => /^price_|^audit_|^min_order_price$|^price_per_word$|^fast_lane_price$/.test(k);
    const keys = Object.keys(d.values).filter(k => !skip(k));
    setPage("Pengaturan Website", "Kontak, pembayaran, masa simpan file, dan pelacakan", `<div class="notice info">Harga diatur di <a href="#/services">Layanan &amp; Harga</a>. Foto QRIS, gambar kartu, gambar situs, ulasan, dan teks pesan WhatsApp diatur di <a href="#/tools/parafrase">Antrean Cek &amp; Parafrase</a> (tab terkait).</div>
      <form class="card" id="sf"><div class="bd grid g2">${keys.map(k => { const v = d.values[k]; const lab = `${esc(SET_LABEL[k] || k)}<small class="mono">${esc(k)}</small>`;
        return typeof v === "boolean" ? `<label class="f">${lab}<select class="in" name="${k}" data-old="${v}"><option value="true" ${v ? "selected" : ""}>Ya</option><option value="false" ${!v ? "selected" : ""}>Tidak</option></select></label>`
          : `<label class="f">${lab}<input class="in" name="${k}" data-old="${esc(v)}" type="${typeof v === "number" ? "number" : "text"}" value="${esc(v)}" ${k === "qris_image_path" ? "readonly" : ""}></label>`; }).join("")}</div>
        <div class="pager"><p class="err" id="sErr"></p><button class="btn pri">Simpan perubahan</button></div></form>
      <div class="card"><div class="hd"><h2>Riwayat perubahan pengaturan</h2></div><div class="tbl-wrap">${d.log.length ? `<table class="t"><thead><tr><th>Waktu</th><th>Pengaturan</th><th>Lama → baru</th><th>Oleh</th></tr></thead><tbody>${d.log.map(l => `<tr><td class="small">${dt(l.at)}</td><td class="mono">${esc(l.key)}</td><td class="small">${esc(l.old_value)} → <b>${esc(l.new_value)}</b></td><td>${esc(l.by)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada perubahan.</div>'}</div></div>`);
    $("#sf").onsubmit = async e => {
      e.preventDefault(); const values = {};
      $$("[data-old]", e.target).forEach(i => { if (String(i.value) !== String(i.dataset.old)) values[i.name] = i.type === "number" ? Number(i.value) : i.value; });
      if (!Object.keys(values).length) return toast("Tidak ada perubahan.");
      if (!await confirmAct("Simpan pengaturan?", `${Object.keys(values).map(k => esc(SET_LABEL[k] || k)).join(", ")} akan berubah di situs live.`, "Simpan")) return;
      try { await saveSettings(values); toast("Pengaturan tersimpan"); route(); } catch (err) { $("#sErr").textContent = err.message; }
    };
  }
  async function pSeo() {
    const d = await api("/ms/admin/ca/seo"), bad = d.checks.filter(c => c.issues.length);
    setPage("SEO & Sitemap", "Pemeriksaan teknis yang bisa diverifikasi", `<div class="grid g3">
        <div class="card"><div class="bd"><b>Sitemap XML</b><p class="small muted">${num(d.live)} artikel tayang + halaman layanan. Draf tidak masuk.</p><a class="btn sm" href="${esc(d.sitemap)}" target="_blank" rel="noopener">${ICON.ext}Buka sitemap</a></div></div>
        <div class="card"><div class="bd"><b>Robots.txt</b><p class="small muted">/admin dan /ms/ diblokir dari mesin pencari.</p><a class="btn sm" href="${esc(d.robots)}" target="_blank" rel="noopener">${ICON.ext}Buka robots.txt</a></div></div>
        <div class="card"><div class="bd"><b>Pelacakan & verifikasi</b><p class="small muted">GA4: ${esc(d.gaId || "belum diatur")} · GTM: ${esc(d.gtmId || "–")}<br>Search Console: ${esc(d.googleVerifyFile || "belum diatur")}</p><a class="btn sm" href="#/settings">Atur di Pengaturan</a></div></div></div>
      <div class="card"><div class="hd"><h2>Pemeriksaan artikel</h2><span class="muted small">${bad.length} dari ${d.checks.length} artikel perlu perhatian</span></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Artikel</th><th class="num">Kata</th><th>Temuan</th><th></th></tr></thead><tbody>${d.checks.sort((a, b) => b.issues.length - a.issues.length).map(c => `<tr><td><b>${esc(c.title)}</b><div class="small faint">/blog/${esc(c.slug)}</div></td><td class="num">${num(c.words)}</td><td class="small">${c.issues.length ? c.issues.map(esc).join("<br>") : '<span class="cnt-ok">✓ Tidak ada temuan</span>'}</td><td><a class="btn sm" href="#/posts/${c.id}">Perbaiki</a></td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><div class="bd"><ul class="small muted" style="margin:0;padding-left:18px">${d.notes.map(n => `<li>${esc(n)}</li>`).join("")}<li>Indexing dan peringkat Google tidak bisa dijamin; pantau di Google Search Console.</li></ul></div></div>`);
  }
  async function pAdmins() {
    const d = await api("/ms/admin/ca/admins");
    const roleSel = (cur, attr) => `<select class="in" ${attr} style="width:auto">${Object.entries(d.roles).map(([k, l]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    setPage("Admin & Peran", "Akun panel Catatan Akademik (terpisah dari admin nextaja)", `
      <div class="card"><div class="bd"><dl class="kv"><dt>Pemilik</dt><dd>Semua menu, termasuk harga, pengaturan, admin, dan log.</dd><dt>Editor</dt><dd>Artikel, media, kategori/tag, komentar. Tidak melihat pesanan atau data pelanggan.</dd><dt>Admin pesanan</dt><dd>Pesanan, konfirmasi pembayaran, kirim hasil, daftar pelanggan (lihat). Tidak bisa mengubah harga/pengaturan.</dd></dl>
        <p class="small faint" style="margin:10px 0 0">Akun bawaan <b>pemilik</b> memakai sandi dari .env server (CA_ADMIN_PASSWORD) dan tidak tercantum di bawah.</p></div></div>
      <div class="card"><div class="hd"><h2>Akun admin</h2><button class="btn pri" id="addA">Tambah admin</button></div><div class="tbl-wrap">${d.items.length ? `<table class="t"><thead><tr><th>Nama</th><th>Pengguna</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead><tbody>${d.items.map(a => `<tr><td><b>${esc(a.name)}</b></td><td class="mono">${esc(a.username)}</td><td>${roleSel(a.role, `data-role="${a.id}"`)}</td><td>${a.active ? badge("Aktif", "ok") : badge("Nonaktif", "mute")}</td><td class="small muted">${dt(a.lastLoginAt)}</td><td class="bar"><button class="btn sm" data-pw="${a.id}">Reset sandi</button><button class="btn sm ${a.active ? "bad" : ""}" data-act="${a.id}" data-on="${a.active ? 0 : 1}">${a.active ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada akun selain pemilik. Tambahkan editor atau admin pesanan.</div>'}</div></div>`);
    const upd = async (id, body, msg) => { try { await api("/ms/admin/ca/admins/" + id, { json: body }); toast(msg); route(); } catch (e) { fail(e); } };
    $$("[data-role]").forEach(s => s.onchange = async () => { if (await confirmAct("Ubah peran?", "Sesi akun ini akan diakhiri supaya peran baru berlaku.", "Ubah peran")) upd(s.dataset.role, { role: s.value }, "Peran diubah"); else route(); });
    $$("[data-act]").forEach(b => b.onclick = async () => { if (b.dataset.on === "0" && !await confirmAct("Nonaktifkan akun?", "Akun langsung keluar dan tidak bisa login sampai diaktifkan lagi.", "Nonaktifkan", "bad")) return; upd(b.dataset.act, { active: b.dataset.on === "1" }, b.dataset.on === "1" ? "Akun diaktifkan" : "Akun dinonaktifkan"); });
    $$("[data-pw]").forEach(b => b.onclick = async () => { const pw = await dialog({ title: "Reset sandi", input: { label: "Sandi baru (min 10 karakter)", type: "password", required: true, min: 10, minMsg: "Minimal 10 karakter.", max: 200 }, ok: "Simpan sandi" }); if (pw) upd(b.dataset.pw, { password: pw }, "Sandi diganti"); });
    $("#addA").onclick = () => dialog({ title: "Tambah admin", ok: "Buat akun", body: `<label class="f">Nama lengkap<input class="in" id="aN" maxlength="60"></label><label class="f">Nama pengguna <small>· huruf kecil/angka, untuk login</small><input class="in mono" id="aU" maxlength="30" autocapitalize="none"></label><label class="f">Peran${roleSel("editor", 'id="aR"')}</label><label class="f">Sandi awal <small>· min 10 karakter, sampaikan langsung ke orangnya</small><input class="in" id="aP" type="password" maxlength="200" autocomplete="new-password"></label><p class="err" id="aE"></p>`,
      onOpen: dlg => $("#dlgOk", dlg) && $("#dlgOk", dlg).addEventListener("click", async e => { e.preventDefault(); try { await api("/ms/admin/ca/admins", { json: { name: $("#aN", dlg).value, username: $("#aU", dlg).value, role: $("#aR", dlg).value, password: $("#aP", dlg).value } }); dlg.finish(false); toast("Akun dibuat"); route(); } catch (err) { $("#aE", dlg).textContent = err.message; } }) });
  }
  async function pLog() {
    const q = params(), to = q.get("to") || dayKey(Date.now()), from = q.get("from") || dayKey(Date.now() - 29 * 864e5), page = Number(q.get("page")) || 1;
    const d = await api(`/ms/admin/ca/log?from=${from}&to=${to}&q=${encodeURIComponent(q.get("q") || "")}&page=${page}`);
    setPage("Log Aktivitas", "Semua tindakan admin yang mengubah data, plus login", `<form class="bar" id="lgf"><input class="in grow" type="search" name="q" placeholder="Cari admin, aksi, atau ID…" value="${esc(q.get("q") || "")}"><input class="in" type="date" name="from" value="${from}" style="width:auto" aria-label="Dari"><input class="in" type="date" name="to" value="${to}" style="width:auto" aria-label="Sampai"><button class="btn">Tampilkan</button></form>
      <div class="card"><div class="tbl-wrap">${d.items.length ? `<table class="t"><thead><tr><th>Waktu</th><th>Admin</th><th>Peran</th><th>Aksi</th><th>Objek</th><th>Hasil</th></tr></thead><tbody>${d.items.map(l => `<tr><td class="small">${dt(l.at)}</td><td>${esc(l.admin)}</td><td class="small">${esc(l.role)}</td><td>${esc((ACT.find(x => x[0].test(l.action || "")) || [0, l.action === "login" ? "Masuk ke panel" : l.action === "login gagal" ? "Gagal masuk (sandi salah)" : l.action])[1])}<div class="mono faint small">${esc(l.action)}</div></td><td class="mono">${esc(l.target && l.target !== "null" ? l.target : "")}</td><td>${l.status ? badge(l.status < 400 ? "OK " + l.status : "Gagal " + l.status, l.status < 400 ? "ok" : "bad") : ""}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada aktivitas di rentang ini.</div>'}</div>
        <div class="pager"><span class="muted small">${num(d.total)} catatan</span><button class="btn sm" id="lpv" ${page <= 1 ? "disabled" : ""}>←</button><button class="btn sm" id="lnx" ${page * 100 >= d.total ? "disabled" : ""}>→</button></div></div>
      <div class="card"><div class="hd"><h2>Perubahan pengaturan</h2></div><div class="tbl-wrap">${d.settingsLog.length ? `<table class="t"><tbody>${d.settingsLog.map(l => `<tr><td class="small">${dt(l.at)}</td><td class="mono">${esc(l.key)}</td><td class="small">${esc(l.old_value)} → <b>${esc(l.new_value)}</b></td><td>${esc(l.by)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada.</div>'}</div></div>`);
    $("#lgf").onsubmit = e => { e.preventDefault(); const f = e.target; go("log", { q: f.q.value.trim(), from: f.from.value, to: f.to.value }); };
    const cur = Object.fromEntries(q); $("#lpv").onclick = () => go("log", { ...cur, page: page - 1 }); $("#lnx").onclick = () => go("log", { ...cur, page: page + 1 });
  }
  function pAccount() {
    setPage("Akun saya", `${ME.name} · ${ME.roleLabel}`, ME.builtin ? `<div class="card"><div class="bd"><p>Akun <b>pemilik</b> bawaan memakai sandi dari file .env server (<code>CA_ADMIN_PASSWORD</code>). Ganti sandinya di server, lalu restart aplikasi.</p>${ME.ownerPasswordShared ? '<div class="notice">Saat ini sandinya masih sama dengan admin nextaja.</div>' : ""}</div></div>`
      : `<form class="card" id="pwf" style="max-width:460px"><div class="bd" style="display:flex;flex-direction:column;gap:12px"><label class="f">Sandi lama<input class="in" type="password" name="old" autocomplete="current-password"></label><label class="f">Sandi baru <small>· min 10 karakter</small><input class="in" type="password" name="nw" autocomplete="new-password"></label><p class="err" id="pwE"></p><button class="btn pri">Ganti sandi</button></div></form>`);
    if ($("#pwf")) $("#pwf").onsubmit = async e => { e.preventDefault(); try { await api("/ms/admin/ca/password", { json: { old: e.target.old.value, new: e.target.nw.value } }); toast("Sandi diganti"); e.target.reset(); } catch (err) { $("#pwE").textContent = err.message; } };
  }

  /* ---------------- mulai ---------------- */
  async function boot() {
    try { ME = await fetch("/ms/admin/ca/me", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)); } catch (e) { ME = null; }
    if (!ME) return renderLogin();
    shell();
    if (!location.hash || location.hash === "#/login") location.hash = "#/dashboard"; else route();
  }
  boot();
})();
