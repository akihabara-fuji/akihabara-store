/* Aturan pembentukan sitasi APA edisi 7 (jurnal, buku, web, skripsi/tesis). Dipakai browser (halaman sitasi) dan Node (tes).
   Murni fungsi tanpa DOM. Keluaran: { text, html } (html memakai <i> untuk huruf miring). */
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.SitasiAPA = f(); })(this, function () {
  "use strict";
  var BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var BULAN_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var clean = function (s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); };
  var endDot = function (s) { s = clean(s); return /[.?!]$/.test(s) ? s : s + "."; };

  /* Satu baris = satu penulis. "Belakang, Depan" atau "Depan Belakang". Awali ! untuk lembaga atau nama tunggal (dipakai apa adanya). */
  function parseAuthor(line) {
    line = clean(line); if (!line) return null;
    if (line[0] === "!") return { org: clean(line.slice(1)) };
    var last, first = "";
    if (line.indexOf(",") > -1) { var p = line.split(","); last = clean(p[0]); first = clean(p.slice(1).join(" ")); }
    else { var w = line.split(" "); if (w.length === 1) return { org: line }; last = w[w.length - 1]; first = w.slice(0, -1).join(" "); }
    return last ? { last: last, first: first } : null;
  }
  function parseAuthors(text) { return String(text || "").split(/\n+/).map(parseAuthor).filter(Boolean); }
  function initials(first) {
    return clean(first).split(" ").filter(Boolean).map(function (n) {
      return n.split("-").map(function (x) { return x ? x[0].toUpperCase() + "." : ""; }).join("-");
    }).join(" ");
  }
  var refName = function (a) { return a.org ? a.org : a.last + (a.first ? ", " + initials(a.first) : ""); };
  var citeName = function (a) { return a.org ? a.org : a.last; };

  /* Daftar pustaka: 1 penulis "A."; 2 "A, & B."; 3 sampai 20 "A, B, & C."; 21 atau lebih: 19 pertama, tiga titik, penulis terakhir. */
  function authorsRef(list) {
    var n = list.length; if (!n) return "";
    var names = list.map(refName), s;
    if (n === 1) s = names[0];
    else if (n <= 20) s = names.slice(0, -1).join(", ") + ", & " + names[n - 1];
    else s = names.slice(0, 19).join(", ") + ", . . . " + names[n - 1];
    return endDot(s);
  }

  function opts(o) { o = o || {}; return { id: !!o.id, nd: o.id ? "t.t." : "n.d.", and: o.id ? "dan" : "and", etal: o.id ? "dkk." : "et al.", mon: o.id ? BULAN_ID : BULAN_EN, ed: o.id }; }
  var year = function (f, O) { return clean(f.year) || O.nd; };

  /* Kutipan dalam teks. Tanpa penulis, judul singkat dipakai (kata-kata awal). */
  function inText(f, o) {
    var O = opts(o), a = f.authors || [], y = year(f, O), who, whoN;
    if (!a.length) { var t = clean(f.title).split(" ").slice(0, 4).join(" ").replace(/[.,:;]+$/, ""); who = whoN = f.type === "buku" ? t : "“" + t + "”"; }
    else if (a.length === 1) who = whoN = citeName(a[0]);
    else if (a.length === 2) { who = citeName(a[0]) + " & " + citeName(a[1]); whoN = citeName(a[0]) + " " + O.and + " " + citeName(a[1]); }
    else who = whoN = citeName(a[0]) + " " + O.etal;
    var pg = clean(f.cite_page), many = /[-–,]/.test(pg);
    var pgS = pg ? ", " + (O.id ? "hlm. " : many ? "pp. " : "p. ") + pg : "";
    return { paren: "(" + who + ", " + y + pgS + ")", narrative: whoN + " (" + y + pgS + ")" };
  }

  function doiUrl(d) { d = clean(d); if (!d) return ""; if (/^https?:\/\//i.test(d)) return d.replace(/^http:\/\//i, "https://"); return "https://doi.org/" + d.replace(/^doi:\s*/i, ""); }
  function ord(n) { if (!/^\d+$/.test(n)) return n; var k = n % 100, j = n % 10; return n + (k >= 11 && k <= 13 ? "th" : j === 1 ? "st" : j === 2 ? "nd" : j === 3 ? "rd" : "th"); }
  var pages = function (p) { return clean(p).replace(/\s*[-–—]+\s*/g, "–"); };

  /* Penyusun: potongan dengan penanda miring {i:"teks"}, lalu dirangkai jadi text dan html. */
  function build(parts) {
    var text = "", html = "";
    parts.forEach(function (p) { if (typeof p === "string") { text += p; html += esc(p); } else { text += p.i; html += "<i>" + esc(p.i) + "</i>"; } });
    return { text: text, html: html };
  }
  function dateStr(f, O) {
    var y = clean(f.year); if (!y) return O.nd;
    var m = parseInt(f.month, 10), d = parseInt(f.day, 10);
    if (m >= 1 && m <= 12) return y + ", " + (O.id && d ? d + " " + O.mon[m - 1] : O.mon[m - 1] + (d ? " " + d : ""));
    return y;
  }

  function reference(f, o) {
    var O = opts(o), a = f.authors || [], t = clean(f.title), parts = [], type = f.type;
    var au = authorsRef(a);
    var when = type === "web" ? dateStr(f, O) : year(f, O);
    var head = au ? [au + " (" + when + "). "] : null;
    var titleEnd = function (s) { return endDot(s); };
    var link = function () { var u = doiUrl(f.doi) || clean(f.url); return u ? " " + u : ""; };

    if (type === "jurnal") {
      parts = (head || [titleEnd(t) + " (" + when + "). "]);
      if (head) parts.push(titleEnd(t) + " ");
      parts.push({ i: clean(f.journal) });
      var vol = clean(f.volume), iss = clean(f.issue), pg = pages(f.pages);
      if (vol) { parts.push(", "); parts.push({ i: vol }); if (iss) parts.push("(" + iss + ")"); }
      if (pg) parts.push(", " + pg);
      parts.push("." + link());
    } else if (type === "buku") {
      var ed = clean(f.edition), edS = ed ? " (" + (O.ed ? "Edisi ke-" + ed : ord(ed) + " ed.") + ")" : "";
      parts = head ? head.slice() : [];
      if (!head) { parts.push({ i: titleEnd(t) }); parts.push(edS + " (" + when + "). "); }
      else { parts.push({ i: t }); parts.push(edS + ". "); }
      parts.push(endDot(f.publisher) + link());
    } else if (type === "web") {
      parts = head ? head.slice() : [];
      if (!head) { parts.push(titleEnd(t) + " (" + when + "). "); }
      else parts.push({ i: titleEnd(t) }, " ");
      var site = clean(f.site); if (site && (!a.length || clean(site) !== clean(a[0].org || ""))) parts.push(endDot(site) + " ");
      parts.push(clean(f.url));
    } else if (type === "skripsi") {
      var jenis = clean(f.thesis) || (O.id ? "Skripsi" : "Bachelor's thesis"), pub = f.published ? "" : (O.id ? " tidak dipublikasikan" : " unpublished"), uni = clean(f.university);
      var br = "[" + jenis + (O.id ? "" : "") + (f.published ? "" : pub) + (uni ? ", " + uni : "") + "]";
      parts = head ? head.slice() : [];
      if (!head) parts.push({ i: titleEnd(t) }, " (" + when + "). " + br + ".");
      else parts.push({ i: t }, " " + br + ".");
      if (f.published) { var repo = clean(f.repo); if (repo) parts.push(" " + endDot(repo)); }
      parts.push(link());
    }
    var r = build(parts);
    r.text = r.text.replace(/\s+([.,])/g, "$1").replace(/\.\.+/g, ".").replace(/\s{2,}/g, " ").trim();
    r.html = r.html.replace(/\s+([.,])/g, "$1").replace(/\.\.+/g, ".").replace(/\s{2,}/g, " ").trim();
    return r;
  }

  /* Urutan abjad daftar pustaka: nama belakang penulis pertama (atau judul bila tanpa penulis), lalu tahun. */
  function sortKey(f) {
    var a = (f.authors || [])[0], k = a ? (a.org || a.last) : clean(f.title).replace(/^(a|an|the|sebuah|suatu)\s+/i, "");
    return (k + "|" + clean(f.year)).toLowerCase();
  }
  function sortList(items) { return items.slice().sort(function (x, y) { var a = sortKey(x), b = sortKey(y); return a < b ? -1 : a > b ? 1 : 0; }); }

  /* Peringatan yang membantu, bukan memblokir. */
  function checks(f, o) {
    var O = opts(o), w = [], MSG = { title: "Judul belum diisi.", journal: "Nama jurnal belum diisi.", year: "Tahun belum diisi (akan tertulis " + O.nd + ").", publisher: "Penerbit belum diisi.", url: "Tautan belum diisi.", university: "Nama universitas belum diisi." };
    var req = { jurnal: ["title", "journal", "year"], buku: ["title", "publisher", "year"], web: ["title", "url"], skripsi: ["title", "university", "year"] }[f.type] || [];
    req.forEach(function (k) { if (!clean(f[k])) w.push(MSG[k]); });
    if (!(f.authors || []).length) w.push("Tanpa penulis: judul dipindah ke posisi penulis. Pastikan memang tidak ada nama penulis atau lembaga.");
    var words = clean(f.title).split(" ").filter(function (x) { return x.length > 3; });
    if (words.length >= 4 && words.filter(function (x) { return /^[A-Z]/.test(x); }).length / words.length > 0.7 && f.type !== "web") w.push("Judul tampak memakai huruf kapital di setiap kata. Di APA 7, judul artikel dan buku ditulis dengan huruf kapital hanya di awal dan nama diri.");
    if (f.type === "jurnal" && !clean(f.doi) && !clean(f.url)) w.push("Belum ada DOI atau tautan. Tambahkan DOI bila jurnalnya punya.");
    return w;
  }

  return { parseAuthor: parseAuthor, parseAuthors: parseAuthors, initials: initials, authorsRef: authorsRef, reference: reference, inText: inText, sortList: sortList, checks: checks, doiUrl: doiUrl };
});
