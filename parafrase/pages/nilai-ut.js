/* Konversi nilai UT. Dipakai browser (kalkulator) dan Node (test). Acuan: buku saku / OSMB UT. */
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.NilaiUT = f(); })(this, function () {
  var T = [
    { min: 80, max: 100, h: "A", m: 4.0, k: "Sangat Baik (Lulus)", ok: true },
    { min: 75, max: 79.99, h: "A-", m: 3.7, k: "Hampir Sangat Baik (Lulus)", ok: true },
    { min: 70, max: 74.99, h: "B+", m: 3.3, k: "Lebih Baik (Lulus)", ok: true },
    { min: 65, max: 69.99, h: "B", m: 3.0, k: "Baik (Lulus)", ok: true },
    { min: 60, max: 64.99, h: "B-", m: 2.7, k: "Hampir Baik (Lulus)", ok: true },
    { min: 55, max: 59.99, h: "C+", m: 2.3, k: "Cukup Baik (Lulus)", ok: true },
    { min: 40, max: 54.99, h: "C", m: 2.0, k: "Cukup (Batas Minimal Lulus)", ok: true },
    { min: 25, max: 39.99, h: "D", m: 1.0, k: "Kurang (Tidak Lulus TAP)", ok: false },
    { min: 0, max: 24.99, h: "E", m: 0.0, k: "Gagal (Wajib Mengulang)", ok: false }
  ];
  function konversi(n) {
    n = Number(n);
    if (!isFinite(n) || n < 0 || n > 100) return null;
    n = Math.floor(n * 100) / 100; // 79.999 tetap A-, bukan A
    for (var i = 0; i < T.length; i++) if (n >= T[i].min) return T[i];
    return null;
  }
  function mutu(huruf) { for (var i = 0; i < T.length; i++) if (T[i].h === huruf) return T[i].m; return null; }
  /* rows: [{sks, huruf}] -> {ipk, sks, bobot}; baris tidak valid dilewati */
  function ipk(rows) {
    var s = 0, b = 0;
    (rows || []).forEach(function (r) { var k = Number(r.sks), m = mutu(r.huruf); if (k > 0 && k <= 12 && m !== null) { s += k; b += k * m; } });
    return { sks: s, bobot: b, ipk: s ? Math.floor((b / s) * 100 + 1e-9) / 100 : null };
  }

  /* Nilai akhir: jenis = tuton (30/70) | tmk (20/80) | ttm (50/50). Syarat: UAS minimal 30% benar, jika kurang nilai akhir E (kebijakan UT). */
  var W = { tuton: 0.3, tmk: 0.2, ttm: 0.5 };
  function minBenar30(soal) { return Math.ceil(soal * 0.3 - 1e-9); }
  function valid(jenis, tugas, soal, benar) {
    tugas = Number(tugas); soal = Number(soal); benar = Number(benar);
    return W[jenis] !== undefined && isFinite(tugas) && tugas >= 0 && tugas <= 100 && Number.isInteger(soal) && soal >= 1 && soal <= 200 && Number.isInteger(benar) && benar >= 0 && benar <= soal;
  }
  function nilaiAkhir(jenis, tugas, soal, benar) {
    if (!valid(jenis, tugas, soal, benar)) return null;
    tugas = Number(tugas); soal = Number(soal); benar = Number(benar);
    var w = W[jenis], uas = benar / soal * 100, min = minBenar30(soal);
    if (benar < min) return { lolos30: false, min: min, uas: uas, huruf: "E", mutu: 0, ok: false, kategori: "Gagal / Wajib Mengulang" };
    var akhir = w * tugas + (1 - w) * uas, k = konversi(akhir);
    return { lolos30: true, min: min, uas: uas, bobotTugas: w * tugas, bobotUas: (1 - w) * uas, akhir: Math.floor(akhir * 100 + 1e-9) / 100, huruf: k.h, mutu: k.m, ok: k.ok, kategori: k.k };
  }
  /* Minimal soal benar untuk tiap huruf mutu, diberi nilai tuton/TMK/TTM dan jumlah soal */
  function minBenarPerHuruf(jenis, tugas, soal) {
    if (!valid(jenis, tugas, soal, 0)) return null;
    var out = {};
    for (var b = minBenar30(Number(soal)); b <= soal; b++) { var r = nilaiAkhir(jenis, tugas, soal, b); if (r && out[r.huruf] === undefined) out[r.huruf] = b; }
    return T.map(function (t) { return { huruf: t.h, benar: out[t.h] === undefined ? null : out[t.h] }; }).filter(function (x) { return x.huruf !== "E" && x.huruf !== "D"; });
  }
  /* IPS yang dibutuhkan semester depan agar IPK mencapai target */
  function targetIps(ipkNow, sksNow, sksNext, target) {
    ipkNow = Number(ipkNow); sksNow = Number(sksNow); sksNext = Number(sksNext); target = Number(target);
    if (![ipkNow, sksNow, sksNext, target].every(isFinite) || ipkNow < 0 || ipkNow > 4 || target < 0 || target > 4 || sksNow < 0 || sksNext <= 0 || sksNext > 60) return null;
    var need = (target * (sksNow + sksNext) - ipkNow * sksNow) / sksNext;
    return { perlu: Math.max(0, Math.ceil(need * 100 - 1e-9) / 100), tercapai: need <= 4 + 1e-9, sudahAman: need <= 0 };
  }
  return { TABEL: T, konversi: konversi, mutu: mutu, ipk: ipk, nilaiAkhir: nilaiAkhir, minBenarPerHuruf: minBenarPerHuruf, minBenar30: minBenar30, targetIps: targetIps };
});
