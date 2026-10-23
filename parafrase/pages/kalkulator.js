(function () {
  var N = window.NilaiUT, $ = function (i) { return document.getElementById(i); };
  var tb = $("tb");
  N.TABEL.forEach(function (r) {
    var tr = document.createElement("tr");
    [r.min.toFixed(2) + " – " + (r.max === 100 ? "100" : r.max.toFixed(2)), r.h, r.m.toFixed(1), r.k].forEach(function (t, i) { var td = document.createElement("td"); td.textContent = t; if (i === 3) td.className = r.ok ? "ok" : "bad"; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  $("n").addEventListener("input", function () {
    var o = $("out"), v = $("n").value;
    o.textContent = "";
    if (v === "") return;
    var r = N.konversi(v);
    if (!r) { o.textContent = "Nilai harus antara 0 dan 100."; return; }
    var b = document.createElement("b"); b.textContent = r.h + " (" + r.m.toFixed(1) + ")";
    var s = document.createElement("span"); s.className = r.ok ? "ok" : "bad"; s.textContent = r.k;
    o.append("Huruf mutu ", b, " · ", s);
  });
  var rows = $("rows");
  function row() {
    var d = document.createElement("div"); d.style.cssText = "display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end";
    var a = document.createElement("div"), b = document.createElement("div");
    var la = document.createElement("label"); la.textContent = "SKS";
    var ia = document.createElement("input"); ia.type = "number"; ia.min = 1; ia.max = 12; ia.value = 3; ia.inputMode = "numeric";
    var lb = document.createElement("label"); lb.textContent = "Nilai huruf";
    var sb = document.createElement("select");
    N.TABEL.forEach(function (r) { var o = document.createElement("option"); o.value = r.h; o.textContent = r.h + " (" + r.m.toFixed(1) + ")"; sb.appendChild(o); });
    var x = document.createElement("button"); x.type = "button"; x.className = "btn ghost"; x.textContent = "Hapus"; x.setAttribute("aria-label", "Hapus baris");
    x.onclick = function () { d.remove(); calc(); };
    ia.oninput = sb.onchange = calc;
    a.append(la, ia); b.append(lb, sb); d.append(a, b, x); rows.appendChild(d);
  }
  function calc() {
    var data = [].map.call(rows.children, function (d) { return { sks: d.querySelector("input").value, huruf: d.querySelector("select").value }; });
    var r = N.ipk(data), o = $("ipk"); o.textContent = "";
    if (r.ipk === null) { o.textContent = "Tambahkan mata kuliah untuk menghitung IPK."; return; }
    var b = document.createElement("b"); b.textContent = r.ipk.toFixed(2);
    o.append("IPK ", b, " dari " + r.sks + " SKS");
  }
  $("add").onclick = function () { row(); calc(); };
  row(); row(); calc();

  /* nilai akhir */
  function line(t, cls) { var d = document.createElement("div"); if (cls) d.className = cls; d.textContent = t; return d; }
  function f2(x) { return (Math.round(x * 100) / 100).toString().replace(".", ","); }
  /* Kotak saran di bawah hasil. Nilai tinggi (B ke atas): dorongan menjaga. Selain itu: arahkan ke simulasi IPK dan layanan. */
  function banner(m, r) {
    var high = r.mutu >= 3.0, b = document.createElement("div"), s = document.createElement("b");
    b.id = "ban"; b.style.cssText = "margin-top:14px;padding:14px 16px;border-radius:12px;line-height:1.6;border:1px solid " + (high ? "#22a55a" : "rgba(220,70,70,.45)") + ";background:" + (high ? "rgba(34,165,90,.12)" : "rgba(220,70,70,.08)");
    var sim = document.createElement("a"); sim.href = "#ipk-sim"; sim.textContent = "Simulasi & Target IPK"; sim.style.cssText = "color:var(--link);text-decoration:underline";
    if (high) {
      s.textContent = "Nilai akhirmu sudah di rentang " + r.huruf + ".";
      b.append(s, " Pertahankan dengan menjaga skor Tuton dan UAS. Mau tahu dampaknya ke IPK? Coba ", sim, ".");
    } else {
      var lay = document.createElement("a"); lay.href = "/ruangakademikut"; lay.textContent = "Lihat layanan Catatan Akademik"; lay.style.cssText = "color:var(--link);text-decoration:underline";
      s.textContent = r.lolos30 ? "Nilai akhirmu masih di rentang " + r.huruf + "." : "Nilai akhirmu belum lolos syarat UAS.";
      b.append(s, " Kalau ingin naik, lihat dulu berapa soal UAS yang perlu benar di ", sim, ". Perlu teman belajar untuk tugas atau diskusi? ", lay, ". Kami tidak menjamin nilai atau kelulusan. Semangat!");
    }
    m.appendChild(b);
  }
  function akhir() {
    var o = $("na"), m = $("mb"); o.textContent = ""; m.textContent = "";
    var j = $("jn").value, nt = $("nt").value, ns = $("ns").value, nb = $("nb").value;
    if (nt === "" || ns === "" || nb === "") return;
    var r = N.nilaiAkhir(j, nt, ns, nb);
    if (!r) { o.appendChild(line("Periksa isian: nilai 0–100, jumlah soal bilangan bulat, dan jumlah benar tidak boleh melebihi jumlah soal.", "bad")); return; }
    var w = Math.round({ tuton: 30, tmk: 20, ttm: 50 }[j]);
    o.appendChild(line("1. Cek syarat 30%: benar " + nb + " dari " + ns + " soal = " + f2(Number(nb) / Number(ns) * 100) + "% (minimal " + r.min + " soal benar). " + (r.lolos30 ? "Lolos." : "Tidak lolos.")));
    if (!r.lolos30) {
      o.appendChild(line("2. Karena UAS di bawah 30%, nilai Tuton/TMK/TTM tidak dihitung."));
      var e = line("Nilai akhir: E (Gagal / Wajib Mengulang)", "bad"); e.style.cssText = "font-size:19px;font-weight:700;margin-top:8px"; o.appendChild(e); banner(m, r); return;
    }
    o.appendChild(line("2. Nilai UAS murni: (" + nb + " ÷ " + ns + ") × 100 = " + f2(r.uas)));
    o.appendChild(line("3. Nilai akhir: (" + w + "% × " + f2(Number(nt)) + ") + (" + (100 - w) + "% × " + f2(r.uas) + ") = " + f2(r.bobotTugas) + " + " + f2(r.bobotUas) + " = " + f2(r.akhir)));
    var h = line("Nilai akhir " + r.huruf + " (" + r.mutu.toFixed(1) + "), " + r.kategori, r.ok ? "ok" : "bad"); h.style.cssText = "font-size:19px;font-weight:700;margin-top:8px"; o.appendChild(h);
    var mb = N.minBenarPerHuruf(j, nt, ns);
    banner(m, r);
    if (mb) { m.appendChild(line("Minimal soal benar dengan nilai pendukung " + f2(Number(nt)) + " dan " + ns + " soal:", "note")); var p = document.createElement("div"); p.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:6px"; mb.forEach(function (x) { var c = document.createElement("span"); c.style.cssText = "border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:13.5px"; c.textContent = x.huruf + ": " + (x.benar === null ? "tidak tercapai" : x.benar + " benar"); p.appendChild(c); }); m.appendChild(p); }
  }
  /* Hasil muncul setelah tombol Hitung ditekan. Mengubah isian menyembunyikan hasil lama supaya tidak ada angka basi. */
  function tampil() {
    var box = $("hasil"), o = $("na"), m = $("mb");
    if ($("nt").value === "" || $("ns").value === "" || $("nb").value === "") {
      o.textContent = ""; m.textContent = "";
      var e = line("Isi nilai Tuton/TMK/TTM, jumlah soal, dan jumlah benar UAS dulu.", "bad"); o.appendChild(e);
    } else akhir();
    box.hidden = false; box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop");
  }
  function sembunyi() { $("hasil").hidden = true; }
  $("hit").addEventListener("click", tampil);
  ["jn", "nt", "ns", "nb"].forEach(function (i) { $(i).addEventListener("input", sembunyi); $(i).addEventListener("change", sembunyi); $(i).addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); tampil(); } }); });
  /* target IPK */
  function target() {
    var o = $("tr"); o.textContent = "";
    var v = ["ti", "ts", "tn", "tt"].map(function (i) { return $(i).value; });
    if (v.some(function (x) { return x === ""; })) return;
    var r = N.targetIps(v[0], v[1], v[2], v[3]);
    if (!r) { o.textContent = "Periksa isian: IPK dan target 0–4, SKS semester depan 1–60."; o.className = "bad"; return; }
    o.className = "";
    if (r.sudahAman) o.textContent = "Target sudah aman: berapa pun IPS semester depan, IPK tetap di atas " + f2(Number(v[3])) + " (selama IPS tidak 0 dan SKS sesuai isianmu).";
    else if (!r.tercapai) { o.className = "bad"; o.textContent = "Target " + f2(Number(v[3])) + " tidak bisa dicapai di satu semester ini, karena IPS maksimal 4,00. Coba target yang lebih rendah atau tambah SKS."; }
    else { var b = document.createElement("b"); b.textContent = r.perlu.toFixed(2).replace(".", ","); o.append("IPS semester depan minimal ", b, " agar IPK mencapai " + f2(Number(v[3])) + "."); }
  }
  ["ti", "ts", "tn", "tt"].forEach(function (i) { $(i).addEventListener("input", target); });
})();
