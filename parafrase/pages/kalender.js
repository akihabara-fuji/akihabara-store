/* Kalender dan pengingat akademik: catat tanggal penting (registrasi, sesi tuton, batas tugas, TMK, UAS/THE), lalu unduh file .ics
   untuk Google Calendar, Apple Calendar, atau Outlook, lengkap dengan alarm pengingat. Tanggal diisi sendiri dari kalender akademik resmi UT. */
(function () {
  "use strict";
  var KEY = "ca-kal-v1";
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var REM = [["", "Tanpa pengingat"], ["-PT1H", "1 jam sebelum"], ["-P1D", "1 hari sebelum"], ["-P3D", "3 hari sebelum"], ["-P7D", "1 minggu sebelum"]];
  var PRESET = ["Registrasi mata kuliah", "Batas pembayaran", "Batas pengumpulan Tugas 1", "Batas pengumpulan Tugas 2", "Batas pengumpulan Tugas 3", "Batas TMK", "Diskusi (batas)", "UAS / Take Home Exam", "Pengumuman nilai"];
  var S = load();
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); if (Array.isArray(j)) return j.filter(function (x) { return x && x.t && /^\d{4}-\d{2}-\d{2}$/.test(x.d || ""); }); } catch (e) { /* abaikan */ } return []; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* abaikan */ } }
  function uid() { return "ca" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "@catatanakademik"; }

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function addDays(ds, n) { var p = ds.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nice(ds, tm) { var p = ds.split("-").map(Number), d = new Date(p[0], p[1] - 1, p[2]); return HARI[d.getDay()] + ", " + d.getDate() + " " + BLN[d.getMonth()] + " " + d.getFullYear() + (tm ? " " + tm : ""); }

  /* ---------- ICS ---------- */
  function icsEsc(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function fold(line) { var out = [], b = line; while (new TextEncoder().encode(b).length > 73) { var cut = 73; while (new TextEncoder().encode(b.slice(0, cut)).length > 73) cut--; out.push(b.slice(0, cut)); b = " " + b.slice(cut); } out.push(b); return out.join("\r\n"); }
  function stamp() { var d = new Date(); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z"; }
  function ics() {
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Catatan Akademik//Kalender Akademik//ID", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Kalender Akademik", "X-WR-TIMEZONE:Asia/Jakarta"], ts = stamp();
    S.forEach(function (e) {
      var d = e.d.replace(/-/g, ""), allDay = !e.tm;
      L.push("BEGIN:VEVENT", "UID:" + (e.id || uid()), "DTSTAMP:" + ts, "SUMMARY:" + icsEsc(e.t));
      if (allDay) L.push("DTSTART;VALUE=DATE:" + d, "DTEND;VALUE=DATE:" + addDays(e.d, 1).replace(/-/g, ""));
      else { var hm = e.tm.replace(":", "") + "00", end = pad((Number(e.tm.split(":")[0]) + 1) % 24) + e.tm.split(":")[1] + "00"; L.push("DTSTART:" + d + "T" + hm, "DTEND:" + (Number(e.tm.split(":")[0]) + 1 >= 24 ? addDays(e.d, 1).replace(/-/g, "") : d) + "T" + end); }
      if (e.n) L.push("DESCRIPTION:" + icsEsc(e.n));
      if (e.r) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(e.t), "TRIGGER:" + e.r, "END:VALARM");
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }
  function gcal(e) {
    var d = e.d.replace(/-/g, ""), dates = e.tm ? d + "T" + e.tm.replace(":", "") + "00/" + d + "T" + pad((Number(e.tm.split(":")[0]) + 1) % 24) + e.tm.split(":")[1] + "00" : d + "/" + addDays(e.d, 1).replace(/-/g, "");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.t) + "&dates=" + dates + (e.n ? "&details=" + encodeURIComponent(e.n) : "") + "&ctz=Asia%2FJakarta";
  }

  /* ---------- tampilan ---------- */
  var st = document.createElement("style");
  st.textContent = ".kl-g{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:22px;align-items:start}.kl-f{display:block;margin:0 0 10px}.kl-f>span{display:block;font-size:13px;font-weight:600;margin:0 0 5px;color:var(--muted)}.kl-f input,.kl-f select,.kl-f textarea{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--dash);background:transparent;color:var(--text);font:inherit;font-size:14.5px}.kl-r2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.kl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.kl-chips button{cursor:pointer;font-size:12.5px;padding:5px 11px;border-radius:99px;border:1px solid var(--dash);background:transparent;color:var(--text)}.kl-ev{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border)}.kl-ev:last-child{border:0}.kl-ev b{display:block}.kl-ev .note{margin:2px 0 0}.kl-ev a{font-size:12.5px;color:var(--link)}.kl-ev button{background:none;border:0;color:#ef4444;cursor:pointer;font-size:18px}.kl-ev .kl-m{flex:1;min-width:0}@media(max-width:900px){.kl-g{grid-template-columns:1fr}.kl-r2{grid-template-columns:1fr}}";
  document.head.appendChild(st);

  function renderList() {
    var list = S.slice().sort(function (a, b) { return (a.d + (a.tm || "")).localeCompare(b.d + (b.tm || "")); });
    $("#klCount").textContent = list.length ? list.length + " acara" : "Belum ada acara.";
    $("#klList").innerHTML = list.length ? list.map(function (e) {
      return '<div class="kl-ev"><div class="kl-m"><b>' + esc(e.t) + '</b><div class="note">' + esc(nice(e.d, e.tm)) + (e.r ? " · pengingat " + esc((REM.filter(function (x) { return x[0] === e.r; })[0] || ["", ""])[1].toLowerCase()) : "") + "</div>" + (e.n ? '<div class="note">' + esc(e.n) + "</div>" : "") + '<a href="' + esc(gcal(e)) + '" target="_blank" rel="noopener">Tambah ke Google Calendar</a></div><button type="button" data-del="' + esc(e.id) + '" aria-label="Hapus ' + esc(e.t) + '">×</button></div>';
    }).join("") : '<p class="note">Tambahkan tanggal dari kalender akademik UT, lalu unduh file kalendernya.</p>';
    $("#klIcs").disabled = !list.length;
  }
  function toast(t) { var n = $("#klToast"); n.textContent = t; setTimeout(function () { n.textContent = ""; }, 3500); }
  function add(e) { e.id = uid(); S.push(e); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-pre],[data-del],#klAdd,#klTuton,#klIcs,#klReset"); if (!b) return;
    if (b.dataset.pre) { $("#klT").value = b.dataset.pre; $("#klD").focus(); }
    else if (b.dataset.del) { S = S.filter(function (x) { return x.id !== b.dataset.del; }); save(); renderList(); }
    else if (b.id === "klAdd") {
      var t = $("#klT").value.trim(), d = $("#klD").value; if (!t || !d) return toast("Isi nama acara dan tanggalnya.");
      add({ t: t, d: d, tm: $("#klTm").value, r: $("#klR").value, n: $("#klN").value.trim() }); save(); renderList(); $("#klT").value = ""; $("#klN").value = ""; toast("Acara ditambahkan.");
    } else if (b.id === "klTuton") {
      var mk = $("#tuMk").value.trim(), d0 = $("#tuD").value, n = Math.max(1, Math.min(16, parseInt($("#tuN").value, 10) || 8)); if (!mk || !d0) return toast("Isi nama mata kuliah dan tanggal sesi 1.");
      for (var i = 0; i < n; i++) add({ t: "Tuton " + mk + " - Sesi " + (i + 1), d: addDays(d0, i * 7), tm: $("#tuTm").value, r: $("#tuR").value, n: "Jadwal mingguan diperkirakan dari tanggal sesi 1. Cocokkan dengan jadwal resmi di tutorial online." });
      save(); renderList(); toast(n + " sesi ditambahkan. Cocokkan dengan jadwal resmi tuton.");
    } else if (b.id === "klIcs") {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics()], { type: "text/calendar;charset=utf-8" })); a.download = "kalender_akademik.ics"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast("File kalender diunduh. Buka file itu, atau impor di Google Calendar.");
    } else if (b.id === "klReset") { if (confirm("Hapus semua acara di perangkat ini?")) { S = []; save(); renderList(); } }
  });

  $("#klPre").innerHTML = PRESET.map(function (p) { return '<button type="button" data-pre="' + esc(p) + '">' + esc(p) + "</button>"; }).join("");
  var opts = REM.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + "</option>"; }).join(""); $("#klR").innerHTML = opts; $("#tuR").innerHTML = opts; $("#klR").value = "-P1D"; $("#tuR").value = "-PT1H";
  renderList();
})();
