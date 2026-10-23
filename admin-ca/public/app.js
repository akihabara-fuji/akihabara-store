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
    { items: [["dashboard", "Dashboard", "home", ALL]] },
    { h: "Konten", items: [["posts", "Artikel Blog", "doc", ED], ["posts/new", "Tulis Artikel", "pen", ED], ["taxonomy", "Kategori & Tag", "tag", ED], ["media", "Media", "img", ED], ["comments", "Komentar", "chat", ED]] },
    { h: "Pesanan", items: [["orders", "Pesanan Layanan", "box", CS, true], ["payments", "Konfirmasi Pembayaran", "card", CS], ["tools/parafrase", "Antrean Cek & Parafrase", "list", CS], ["tools/layanan", "Kirim Hasil Layanan", "send", CS]] },
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
      <div class="brand"><img src="/ruangakademikut/assets/ca/logo-96.png" alt="" width="38" height="38"><span>Catatan Akademik</span></div>
      <h1>Masuk panel admin</h1><p>Kelola artikel, pesanan, dan pembayaran Catatan Akademik.</p>
      <label class="f">Nama pengguna<input class="in" name="u" autocomplete="username" required autocapitalize="none"></label>
      <label class="f">Sandi<input class="in" name="p" type="password" autocomplete="current-password" required></label>
      <p class="err" id="le" role="alert"></p>
      <button class="btn pri" type="submit">Masuk</button>
      <p class="small faint">Panel ini terpisah dari admin nextaja. Akun dibuat oleh pemilik di menu Admin &amp; Peran.</p></form></main>`;
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
  const allowed = roles => ME && roles.includes(ME.role);
  function shell() {
    const nav = NAV.map(g => {
      const items = g.items.filter(it => allowed(it[3]));
      if (!items.length) return "";
      return (g.h ? `<h3>${g.h}</h3>` : "") + items.map(([r, label, ic, , subs]) => `<a class="nav" href="#/${r}" data-r="${r}">${ICON[ic]}<span>${label}</span>${r === "orders" ? '<span class="cnt" data-c="semua"></span>' : r === "payments" ? '<span class="cnt" data-c="konfirmasi"></span>' : ""}</a>` +
        (subs ? GROUP_NAV.map(([k, l]) => `<a class="nav sub" href="#/orders?group=${k}" data-r="orders?group=${k}">${l}<span class="cnt" data-c="${k}"></span></a>`).join("") : "")).join("");
    }).join("");
    $("#root").innerHTML = `<div class="shell">
      <aside class="side" id="side" aria-label="Menu admin"><a class="brand" href="#/dashboard"><img src="/ruangakademikut/assets/ca/logo-96.png" alt="" width="34" height="34"><span><b>Catatan Akademik</b><small>Admin Panel</small></span></a>
        <nav>${nav}</nav>
        <div class="me"><b>${esc(ME.name)}</b><small>${esc(ME.roleLabel)}${ME.username ? " · " + esc(ME.username) : ""}</small><div class="bar" style="margin-top:10px"><a class="btn sm" href="#/account">Akun</a><button class="btn sm" id="logout">${ICON.out}Keluar</button></div></div>
      </aside>
      <div class="main"><header class="top"><button class="btn icon-btn burger" id="burger" aria-label="Buka menu" aria-expanded="false">${ICON.menu}</button><div><h1 id="ptitle">Dashboard</h1><p class="sub-t" id="psub"></p></div><span class="sp"></span>
        <a class="btn sm" href="/" target="_blank" rel="noopener">${ICON.ext}Lihat situs</a><button class="btn icon-btn" id="theme" aria-label="Ganti mode gelap/terang" title="Mode gelap/terang">${ICON.moon}</button></header>
        <main class="page" id="page"></main></div></div>`;
    $("#logout").onclick = async () => { await api("/ms/admin/ca/logout", { json: {} }).catch(() => {}); ME = null; renderLogin(); };
    $("#theme").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store("ca-admin-theme", t); };
    $("#burger").onclick = () => { const o = document.body.classList.toggle("nav-open"); $("#burger").setAttribute("aria-expanded", o); };
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
    [/^dashboard$/, ALL, pDashboard], [/^posts$/, ED, pPosts], [/^posts\/new$/, ED, () => pEditor(null)], [/^posts\/([a-f0-9]+)$/, ED, m => pEditor(m[1])],
    [/^taxonomy$/, ED, pTaxonomy], [/^media$/, ED, pMedia], [/^comments$/, ED, pComments],
    [/^orders$/, CS, pOrders], [/^orders\/([A-Za-z0-9-]+)$/, CS, m => pOrder(m[1])], [/^payments$/, CS, pPayments],
    [/^tools\/(parafrase|layanan)$/, CS, m => pEmbed(m[1])], [/^customers$/, CS, pCustomers],
    [/^services$/, OWN, pServices], [/^reports$/, OWN, pReports], [/^settings$/, OWN, pSettings], [/^seo$/, OWN, pSeo], [/^admins$/, OWN, pAdmins], [/^log$/, OWN, pLog], [/^account$/, ALL, pAccount],
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
    const lines = keys.map(([k, , c]) => `<polyline fill="none" stroke="var(${c})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${series.map((s, i) => `${x(i)},${y(s[k])}`).join(" ")}"/>`).join("");
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
  const stat = (ic, value, label, small) => `<div class="card stat"><span class="ic">${ICON[ic]}</span><div><b>${value}</b><span>${esc(label)}</span>${small ? `<small>${small}</small>` : ""}</div></div>`;
  async function pDashboard() {
    const q = params(), days = Number(q.get("days")) || 30;
    const to = dayKey(Date.now()), from = dayKey(Date.now() - (days - 1) * 864e5);
    const d = await api(`/ms/admin/ca/dashboard?from=${from}&to=${to}`);
    const range = `<select class="in" id="rg" style="width:auto">${[7, 30, 90].map(n => `<option value="${n}" ${n === days ? "selected" : ""}>${n} hari terakhir</option>`).join("")}</select>`;
    const p = d.posts;
    const warn = ME.ownerPasswordShared ? `<div class="notice">Akun <b>pemilik</b> masih memakai sandi yang sama dengan admin nextaja. Atur <code>CA_ADMIN_PASSWORD</code> di file .env server, atau buat akun pemilik bernama di menu Admin &amp; Peran.</div>` : "";
    if (!d.orders) { // peran editor
      setPage("Dashboard", "Ringkasan konten", `${warn}<div class="grid g4">${stat("doc", num(p.published), "Artikel terbit")}${stat("pen", num(p.draft), "Draf")}${stat("clock", num(p.scheduled), "Terjadwal")}${stat("list", num(p.review), "Menunggu review")}</div>
        <div class="card"><div class="hd"><h2>Artikel terakhir diubah</h2><a class="btn sm pri" href="#/posts/new">Tulis artikel</a></div><div class="tbl-wrap"><table class="t"><tbody>${d.recentPosts.map(x => `<tr class="click" data-href="#/posts/${x.id}"><td>${esc(x.title)}</td><td>${badge({ draft: "Draf", review: "Review", scheduled: "Terjadwal", published: "Terbit" }[x.status] || x.status, x.status === "published" ? "ok" : "mute")}</td><td class="muted">${dt(x.updatedAt)}</td></tr>`).join("") || '<tr><td class="empty">Belum ada artikel.</td></tr>'}</tbody></table></div></div>`);
      bindRows(); return;
    }
    const o = d.orders;
    setPage("Dashboard", "Ringkasan aktivitas website", `${warn}<div class="bar"><span class="grow"></span>${range}</div>
      <div class="grid g4">
        ${stat("doc", num(p.published), "Artikel terbit", `${num(p.draft)} draf · ${num(p.scheduled)} terjadwal · ${num(p.review)} review`)}
        ${stat("box", num(d.newToday), "Pesanan baru hari ini", `${num(o.bayar)} menunggu pembayaran`)}
        ${stat("card", num(o.konfirmasi), "Menunggu konfirmasi bayar", `<a href="#/payments">Buka antrean pembayaran</a>`)}
        ${stat("list", num(o.proses), "Sedang diproses", `${num(o.selesai)} selesai · ${num(o.batal)} batal/kedaluwarsa`)}
      </div>
      <div class="grid g-main">
        <div class="card"><div class="hd"><h2>Aktivitas ${days} hari terakhir</h2><span class="muted small">Pendapatan terkonfirmasi: <b>${rp(d.revenue)}</b> (${num(d.paidCount)} pesanan)</span></div><div class="bd">${lineChart(d.series, [["orders", "Pesanan dibuat", "--s1"], ["paid", "Pesanan dibayar", "--s2"]])}<p class="small faint" style="margin:8px 0 0">${esc(d.definitions.revenue)}</p></div></div>
        <div class="card"><div class="hd"><h2>Aktivitas terbaru</h2><a class="small" href="#/log">Semua log</a></div><div class="bd"><ul class="timeline">${d.activity.map(a => `<li><div><b>${esc(a.who)}</b> <span class="muted">${esc(a.action)}${a.target ? " · " + esc(a.target) : ""}</span><div class="small faint">${dt(a.at)}</div></div></li>`).join("") || '<li class="muted">Belum ada aktivitas.</li>'}</ul></div></div>
      </div>
      <div class="card"><div class="hd"><h2>Pesanan terbaru</h2><a class="small" href="#/orders">Lihat semua pesanan →</a></div><div class="tbl-wrap">${orderTable(d.recent)}</div></div>`);
    $("#rg").onchange = e => go("dashboard", { days: e.target.value });
    bindRows();
  }
  function bindRows(root = $("#page")) { $$("tr[data-href]", root).forEach(tr => tr.addEventListener("click", e => { if (!e.target.closest("a,button,select,input")) location.hash = tr.dataset.href; })); }
  const orderTable = items => items.length ? `<table class="t"><thead><tr><th>ID Pesanan</th><th>Layanan</th><th>Pelanggan (WA)</th><th class="num">Total</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>${items.map(o => `<tr class="click" data-href="#/orders/${esc(o.id)}"><td class="mono"><a href="#/orders/${esc(o.id)}">${esc(o.id)}</a></td><td>${esc(o.service)}</td><td class="mono">${esc(o.wa)}</td><td class="num">${rp(o.total)}</td><td>${badge(o.statusLabel, o.tone)}</td><td class="muted">${dt(o.createdAt)}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Belum ada pesanan.</div>';

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
    const tabs = [["all", "Semua"], ["published", "Terbit"], ["scheduled", "Terjadwal"], ["draft", "Draf"], ["review", "Review"], ["trash", "Sampah"]].map(([k, l]) => `<a href="#/posts?status=${k}" class="${f === k ? "on" : ""}">${l} <span class="n">${cnt(k)}</span></a>`).join("");
    setPage("Artikel Blog", "Kelola semua artikel, draf, dan jadwal publikasi", `
      <div class="bar"><nav class="tabs" aria-label="Status artikel">${tabs}</nav><span class="grow"></span><a class="btn pri" href="#/posts/new">${ICON.pen}Tulis artikel</a></div>
      <div class="card"><div class="hd"><form class="bar" id="pf" style="flex:1"><select class="in" name="topic" style="width:auto"><option value="">Semua kategori</option>${Object.entries(d.topics).map(([k, v]) => `<option value="${k}" ${k === topic ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>
        <input class="in grow" name="q" type="search" placeholder="Cari judul artikel…" value="${esc(q.get("q") || "")}"><button class="btn">Cari</button>${tag ? `<a class="btn sm" href="#/posts">Tag #${esc(tag)} ✕</a>` : ""}</form></div>
      <div class="tbl-wrap">${list.length ? `<table class="t"><thead><tr><th>Judul</th><th>Kategori</th><th>Penulis</th><th>Status</th><th>Tanggal</th><th></th></tr></thead><tbody>${list.map(p => {
        const st = stOf(p), [l, tone] = ST_LABEL[st];
        return `<tr class="click" data-href="#/posts/${p.id}"><td><b>${esc(p.title)}</b>${p.featured ? ' <span class="badge t-info">Pilihan</span>' : ""}<div class="small faint">/blog/${esc(p.slug)}</div></td><td>${esc((d.topics[p.topic] || {}).label || p.topic)}</td><td>${esc(p.author || "Dika Priyadi")}</td><td>${badge(l, tone)}</td>
          <td class="muted small">${st === "scheduled" ? "Terbit " + dt(p.publishAt) : st === "published" ? "Terbit " + dd(p.publishedAt) : "Diubah " + dt(p.updatedAt)}</td>
          <td><div class="act"><button class="btn sm" data-menu="${p.id}" aria-haspopup="true">Aksi ▾</button></div></td></tr>`;
      }).join("")}</tbody></table>` : '<div class="empty">Tidak ada artikel di filter ini.</div>'}</div></div>`);
    $("#pf").onsubmit = e => { e.preventDefault(); go("posts", { status: f, topic: e.target.topic.value, q: e.target.q.value.trim() }); };
    $("#pf").topic.onchange = () => $("#pf").requestSubmit();
    bindRows();
    $$("[data-menu]").forEach(b => b.onclick = e => { e.stopPropagation(); postMenu(b, all.find(p => p.id === b.dataset.menu)); });
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
    const v = p || { title: "", slug: "", topic: Object.keys(d.topics)[0], excerpt: "", body: "", cover: "", tags: [], author: "Dika Priyadi", coverAlt: "", coverCaption: "", metaTitle: "", metaDesc: "" };
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
              <label class="f">Penulis<input class="in" name="author" maxlength="60" value="${esc(v.author || "Dika Priyadi")}"></label>
              <label class="f">Tag <small>· pisahkan dengan koma, maks 8</small><input class="in" name="tags" maxlength="240" value="${esc((v.tags || []).join(", "))}" placeholder="jadwal ujian, registrasi"></label>
              <div class="f" style="font-size:13px;font-weight:600">Gambar sampul</div>
              <div class="cover-box" id="cov" style="${v.cover ? `background-image:url('${esc(v.cover)}')` : ""}">${v.cover ? "" : "Belum ada gambar"}</div>
              <div class="bar"><label class="btn sm">Unggah gambar<input type="file" id="covF" accept="image/*" hidden></label><button type="button" class="btn sm bad" id="covX">Hapus</button></div>
              <input type="hidden" name="cover" value="${esc(v.cover || "")}">
              <label class="f">Teks alt sampul <small>· jelaskan isi gambar untuk pembaca layar dan Google</small><input class="in" name="coverAlt" maxlength="160" value="${esc(v.coverAlt || "")}"></label>
              <label class="f">Keterangan foto (caption) <small>· opsional</small><input class="in" name="coverCaption" maxlength="200" value="${esc(v.coverCaption || "")}"></label>
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
    const val = () => ({ id: id || undefined, title: f.elements.title.value.trim(), slug: f.slug.value.trim(), topic: f.topic.value, body: ta.value, excerpt: f.excerpt.value.trim(), status: f.status.value, publishAt: f.publishAt.value ? new Date(f.publishAt.value + ":00+07:00").toISOString() : "", author: f.author.value.trim(), tags: f.tags.value, cover: f.cover.value, coverAlt: f.coverAlt.value.trim(), coverCaption: f.coverCaption.value.trim(), metaTitle: f.metaTitle.value.trim(), metaDesc: f.metaDesc.value.trim() });
    const LBL = { draft: "Simpan draf", review: "Kirim ke review", scheduled: "Jadwalkan", published: live ? "Perbarui artikel" : "Terbitkan" };
    const sync = () => {
      const s = f.status.value; $("#saveB").textContent = LBL[s]; $("#whenL").hidden = s !== "scheduled";
      const w = words(ta.value.replace(/!\[[^\]]*\]\([^)]*\)/g, "")); $("#wc").textContent = `${num(w)} kata · ±${Math.max(1, Math.round(w / 200))} menit baca`;
      const t = f.metaTitle.value || f.elements.title.value, ds = f.metaDesc.value || f.excerpt.value;
      $("#mtC").innerHTML = `· <span class="${t.length > 60 ? "cnt-warn" : "cnt-ok"}">${t.length}/60</span>`;
      $("#mdC").innerHTML = `· <span class="${ds.length < 70 || ds.length > 160 ? "cnt-warn" : "cnt-ok"}">${ds.length}/160</span>`;
      $("#serp").innerHTML = `<div class="u">catatanakademik.com › blog › ${esc(f.slug.value || "…")}</div><div class="t">${esc((t || "Judul artikel").slice(0, 62))}${t.length > 62 ? "…" : ""} — Catatan Akademik</div><div class="d">${esc((ds || "Tambahkan ringkasan agar Google punya deskripsi yang jelas.").slice(0, 158))}</div>`;
      const has2 = /^\s*##?\s+\S/m.test(ta.value), C = [[!!f.elements.title.value.trim(), "Judul artikel diisi"], [t.length <= 60, "Judul SEO ≤ 60 karakter"], [ds.length >= 70 && ds.length <= 160, "Deskripsi 70–160 karakter"], [!!f.cover.value, "Gambar sampul dipasang"], [!f.cover.value || !!f.coverAlt.value.trim(), "Teks alt sampul diisi"], [w < 300 || has2, "Tulisan panjang punya sub-judul H2"], [!/!\[[^\]\s]*_[^\]\s]*\]\(/.test(ta.value), "Alt foto di isi bukan nama file"], [w >= 300, "Isi minimal ±300 kata (saran, bukan aturan)"]];
      $("#chk").innerHTML = C.map(([ok, l]) => `<li><span class="${ok ? "y" : "n"}">${ok ? "✓" : "!"}</span>${esc(l)}</li>`).join("");
    };
    const mark = debounce(() => { store(key, JSON.stringify({ at: Date.now(), v: val() })); $("#saveSt").textContent = "Belum disimpan · draf lokal tersimpan di browser ini"; }, 600);
    f.addEventListener("input", () => { DIRTY = true; sync(); mark(); });
    f.addEventListener("change", sync);
    $$("[data-tab]", f).forEach(b => b.onclick = () => { $$("[data-tab]", f).forEach(x => x.classList.toggle("on", x === b)); $$("[data-pane]", f).forEach(pn => { pn.hidden = pn.dataset.pane !== b.dataset.tab; pn.style.display = pn.hidden ? "none" : "flex"; }); });
    sync(); $("#saveSt").textContent = p ? "Tersimpan" : "";

    // pemulihan draf lokal (hanya di browser ini) bila lebih baru dari versi server
    try { const loc = JSON.parse(store(key) || "null"); if (loc && (!p || loc.at > Date.parse(p.updatedAt)) && (loc.v.body !== v.body || loc.v.title !== v.title)) {
      if (await dialog({ title: "Pulihkan draf lokal?", body: `<p>Ada perubahan yang belum disimpan dari ${esc(dt(loc.at))} di browser ini.</p>`, ok: "Pulihkan", cancel: "Abaikan" })) {
        ["title", "slug", "excerpt", "author", "tags", "coverAlt", "coverCaption", "metaTitle", "metaDesc"].forEach(k => { if (f[k] && !f[k].disabled && loc.v[k] != null) f[k].value = loc.v[k]; }); ta.value = loc.v.body || ""; DIRTY = true; sync();
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
        const pick = document.createElement("input"); pick.type = "file"; pick.accept = "image/*";
        pick.onchange = async () => {
          const file = pick.files[0]; if (!file) return; const pos = [ta.selectionStart, ta.selectionEnd];
          const alt = await dialog({ title: "Teks alt foto", input: { label: "Jelaskan isi foto (untuk pembaca layar dan Google)", required: true, min: 5, minMsg: "Tulis minimal 5 huruf yang menjelaskan foto.", max: 120 }, ok: "Unggah & sisipkan" });
          if (!alt) return;
          try { const fd = new FormData(); fd.append("file", file); toast("Mengunggah foto…"); const r = await api("/ms/admin/ca/upload", { form: fd }); ta.setSelectionRange(...pos); insert(`\n\n![${alt.replace(/[\[\]()]/g, "")}](${r.url})\n\n`); toast("Foto disisipkan"); } catch (e) { fail(e); }
        };
        pick.click();
      }
    }
    $(".tb").addEventListener("click", e => { const b = e.target.closest("button"); if (b) doKey(b.dataset.k); });
    ta.addEventListener("keydown", e => { if (!(e.ctrlKey || e.metaKey)) return; const k = { b: "b", i: "i", k: "a" }[e.key.toLowerCase()]; if (k) { e.preventDefault(); doKey(k); } });
    document.addEventListener("keydown", function sk(e) { if (!document.body.contains(f)) return document.removeEventListener("keydown", sk); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); } });

    $("#covF").onchange = async e => { const file = e.target.files[0]; if (!file) return; try { const fd = new FormData(); fd.append("file", file); toast("Mengunggah sampul…"); const r = await api("/ms/admin/ca/upload", { form: fd }); f.cover.value = r.url; $("#cov").style.backgroundImage = `url('${r.url}')`; $("#cov").textContent = ""; DIRTY = true; sync(); mark(); } catch (err) { fail(err); } e.target.value = ""; };
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
    const d = await loadBlog(), posts = d.posts, tags = new Map();
    posts.forEach(p => (p.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
    setPage("Kategori & Tag", "Kategori ditetapkan sistem; tag dibuat dari editor artikel", `<div class="grid g2">
      <div class="card"><div class="hd"><h2>Kategori</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Kategori</th><th class="num">Artikel</th><th></th></tr></thead><tbody>${Object.entries(d.topics).map(([k, t]) => `<tr><td><b>${esc(t.label)}</b><div class="small faint">${esc(t.ask)}</div></td><td class="num">${posts.filter(p => p.topic === k).length}</td><td><a class="btn sm" href="#/posts?topic=${k}">Lihat</a> <a class="btn sm" href="/blog?f=${k}" target="_blank" rel="noopener">Halaman publik</a></td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><div class="hd"><h2>Tag</h2><span class="muted small">${tags.size} tag</span></div><div class="bd">${tags.size ? `<div class="tabs">${[...tags.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `<a href="#/posts?tag=${encodeURIComponent(t)}">#${esc(t)} <span class="n">${n}</span></a>`).join("")}</div>` : '<div class="empty">Belum ada tag. Tambahkan tag di editor artikel (panel Pengaturan).</div>'}</div></div></div>`);
  }
  async function pMedia() {
    const d = await api("/ms/admin/ca/media");
    setPage("Media", "Gambar yang diunggah untuk artikel", `<div class="bar"><span class="muted small">${d.items.length} gambar. Gambar baru otomatis dikecilkan dan diubah ke WebP.</span><span class="grow"></span><label class="btn pri">Unggah gambar<input type="file" id="mf" accept="image/*" hidden></label></div>
      <div class="media">${d.items.map(m => `<figure><img src="${esc(m.url)}" alt="" loading="lazy"><figcaption><div class="mono">${esc(m.url.split("/").pop())}</div>${num(Math.round(m.size / 1024))} KB · ${m.usedIn.length ? "dipakai: " + m.usedIn.map(u => esc(u.title)).join(", ") : "belum dipakai"}<div class="bar" style="margin-top:6px"><button class="btn sm" data-copy="${esc(m.url)}">Salin alamat</button></div></figcaption></figure>`).join("") || '<div class="empty">Belum ada gambar.</div>'}</div>`);
    $("#mf").onchange = async e => { const file = e.target.files[0]; if (!file) return; try { const fd = new FormData(); fd.append("file", file); await api("/ms/admin/ca/upload", { form: fd }); toast("Gambar terunggah"); route(); } catch (err) { fail(err); } };
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
        <div class="card"><div class="hd"><h2>Proses</h2></div><div class="bd bar">${can.start ? '<button class="btn pri" id="stB">Mulai kerjakan</button>' : ""}${can.result ? `<a class="btn" href="#/tools/${o.docType === "layanan" ? "layanan" : "parafrase"}">Kirim hasil</a>` : ""}${can.cancel ? '<button class="btn bad" id="cnB">Batalkan pesanan</button>' : ""}${can.refund ? '<button class="btn" id="rfB">Tandai dana sudah dikembalikan</button>' : ""}${!can.start && !can.result && !can.cancel && !can.refund ? '<span class="muted">Tidak ada aksi untuk status ini.</span>' : ""}</div></div>
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
  async function pServices() {
    const d = await api("/ms/admin/ca/services");
    setPage("Layanan & Harga", "Harga dan status layanan yang tampil di situs", `<div class="notice info">${esc(d.note)}</div>
      <div class="card"><div class="hd"><h2>Layanan</h2></div><div class="tbl-wrap"><table class="t"><thead><tr><th>Layanan</th><th>Jenis</th><th>Harga (Rp)</th><th>Status</th><th class="num">Total pesanan</th></tr></thead><tbody>${d.items.map(s => `<tr><td><b>${esc(s.label)}</b><div class="mono faint">${esc(s.key)}</div></td><td>${esc(s.kind)}</td><td><input class="in" type="number" min="0" step="1000" style="max-width:150px" data-price="${esc(s.priceKey)}" data-old="${s.price}" value="${s.price}" aria-label="Harga ${esc(s.label)}"></td><td><label class="bar small"><input type="checkbox" data-svc="${esc(s.key)}" ${s.active ? "checked" : ""}> Dibuka</label></td><td class="num">${num(s.orders)}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><div class="hd"><h2>Harga lain</h2></div><div class="tbl-wrap"><table class="t"><tbody>${d.other.map(s => `<tr><td>${esc(s.label)}<div class="mono faint">${esc(s.key)}</div></td><td><input class="in" type="number" min="0" style="max-width:150px" data-price="${esc(s.key)}" data-old="${s.price}" value="${s.price}" aria-label="${esc(s.label)}"></td></tr>`).join("")}</tbody></table></div></div>
      <div class="bar"><span class="grow"></span><button class="btn pri" id="svS">Simpan perubahan</button></div>`);
    const off0 = d.items.filter(s => !s.active).map(s => s.key).sort().join(",");
    $("#svS").onclick = async e => {
      const values = {}, lines = [];
      $$("[data-price]").forEach(i => { if (String(i.value) !== String(i.dataset.old)) { const n = Number(i.value); values[i.dataset.price] = n; lines.push(`${esc(i.getAttribute("aria-label").replace(/^Harga /, ""))}: ${rp(i.dataset.old)} → <b>${rp(n)}</b>`); } });
      const off = $$("[data-svc]").filter(c => !c.checked).map(c => c.dataset.svc).sort().join(",");
      if (off !== off0) { values.layanan_nonaktif = off; lines.push(`Layanan ditutup: <b>${esc(off || "tidak ada")}</b>`); }
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
    admin_wa_number: "Nomor WhatsApp admin (62…)", update_group_url: "Tautan grup info WhatsApp", qris_merchant_name: "Nama merchant QRIS", payment_window_minutes: "Batas waktu bayar (menit)", unique_code_enabled: "Pakai kode unik pembayaran", unique_code_max: "Kode unik maksimum",
    retention_hours: "Masa simpan file hasil (jam)", reminder_before_delete_hours: "Pengingat sebelum file dihapus (jam)", file_max_mb: "Ukuran file maksimal (MB)", fast_lane_enabled: "Jalur cepat aktif", fast_lane_daily_cap: "Kuota jalur cepat per hari",
    revision_free_count: "Jumlah revisi gratis", revision_price_per_word: "Harga revisi per kata", long_sentence_words: "Batas kalimat panjang (kata)", preview_open_sentences: "Kalimat contoh terbuka di pratinjau", avg_words_per_hour: "Kecepatan kerja (kata/jam)",
    drillbit_sim_max: "Batas acuan similarity Drillbit (%)", drillbit_ai_max: "Batas acuan AI Drillbit (%)", ga_id: "Google Analytics 4 (G-…)", gtm_id: "Google Tag Manager (GTM-…)", google_verify_file: "File verifikasi Google Search Console", qris_image_path: "Lokasi gambar QRIS (diatur lewat unggah)", layanan_nonaktif: "Kode layanan yang ditutup",
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
      <div class="card"><div class="tbl-wrap">${d.items.length ? `<table class="t"><thead><tr><th>Waktu</th><th>Admin</th><th>Peran</th><th>Aksi</th><th>Objek</th><th>Hasil</th></tr></thead><tbody>${d.items.map(l => `<tr><td class="small">${dt(l.at)}</td><td>${esc(l.admin)}</td><td class="small">${esc(l.role)}</td><td class="mono">${esc(l.action)}</td><td class="mono">${esc(l.target || "")}</td><td>${l.status ? badge(l.status < 400 ? "OK " + l.status : "Gagal " + l.status, l.status < 400 ? "ok" : "bad") : ""}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">Tidak ada aktivitas di rentang ini.</div>'}</div>
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
