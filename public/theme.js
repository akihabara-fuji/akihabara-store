/*
  Tema bersama untuk web lain (Sahabat Nugas, analisa, portofolio, dll).
  Pasang satu baris ini sebelum </body> di web lain:

    <script src="https://DOMAIN-TOKO/theme.js" data-switcher></script>

  - Tanpa data-switcher : warna web ikut tema dari panel admin.
  - Dengan data-switcher: muncul tombol kecil buat pengunjung pilih tampilan.
  Di CSS web itu, pakai var(--afs-bg), var(--afs-ink), var(--afs-accent), dst.
*/
(function () {
  var me = document.currentScript;
  if (!me) return;
  var base = new URL(me.src).origin, KEY = "afsTheme", root = document.documentElement;
  var VARS = ["bg", "surface", "surface2", "line", "ink", "muted", "accent", "on-accent", "warn"];

  function apply(t, choice) {
    var v = (choice && t.visitor.presets[choice]) || t.tokens;
    VARS.forEach(function (k) { root.style.setProperty("--afs-" + k, v[k]); });
    root.style.setProperty("--afs-radius", t.radius + "px");
    root.style.setProperty("--afs-font-display", t.fontFamily);
    root.style.setProperty("--afs-font-body", '"Plus Jakarta Sans",system-ui,sans-serif');
    root.style.colorScheme = v.scheme;
    root.setAttribute("data-afs-theme", choice || "bawaan");
  }
  function read() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function write(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} }

  function widget(t) {
    var names = Object.keys(t.visitor.presets);
    if (!names.length) return;
    var box = document.createElement("div");
    box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;font:600 13px system-ui,sans-serif";
    var btn = document.createElement("button");
    btn.type = "button"; btn.textContent = "Tampilan";
    btn.setAttribute("aria-expanded", "false");
    btn.style.cssText = "border:1px solid var(--afs-line);background:var(--afs-surface);color:var(--afs-ink);padding:9px 14px;border-radius:999px;cursor:pointer";
    var menu = document.createElement("div");
    menu.hidden = true;
    menu.style.cssText = "position:absolute;right:0;bottom:46px;min-width:150px;background:var(--afs-surface);border:1px solid var(--afs-line);border-radius:12px;padding:6px;display:grid;gap:2px";
    ["", ].concat(names).forEach(function (n) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = n || "Bawaan";
      b.style.cssText = "text-align:left;border:0;background:transparent;color:var(--afs-ink);padding:8px 10px;border-radius:8px;cursor:pointer";
      b.onclick = function () { write(n); apply(t, n); menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
      menu.appendChild(b);
    });
    btn.onclick = function () { menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); };
    box.appendChild(menu); box.appendChild(btn); document.body.appendChild(box);
  }

  fetch(base + "/api/theme").then(function (r) { return r.json(); }).then(function (t) {
    var c = read();
    if (c && !t.visitor.presets[c]) c = "";
    apply(t, c);
    if (!document.querySelector('link[data-afs-font]')) {
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = t.fontUrl; l.setAttribute("data-afs-font", ""); document.head.appendChild(l);
      if (t.extraFontUrl) { var l2 = document.createElement("link"); l2.rel = "stylesheet"; l2.href = t.extraFontUrl; document.head.appendChild(l2); }
    }
    if (me.hasAttribute("data-switcher") && t.visitor.on) {
      if (document.body) widget(t); else document.addEventListener("DOMContentLoaded", function () { widget(t); });
    }
  }).catch(function () {});
})();
