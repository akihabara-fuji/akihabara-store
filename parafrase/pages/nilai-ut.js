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
  return { TABEL: T, konversi: konversi, mutu: mutu, ipk: ipk };
});
