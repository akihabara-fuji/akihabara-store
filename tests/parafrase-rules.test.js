"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { analyzeFindings, countByCode, saveFindings } = require("../parafrase/rules");
const { open } = require("../parafrase/db");

const mk = (list, bibAt = null) => list.map((t, i) => (typeof t === "string" ? { idx: i, text: t, style: "", inTable: false } : { idx: i, style: "", inTable: false, ...t }));
const run = (list, bibAt = null, cfg = { long_sentence_words: 35 }) => analyzeFindings(mk(list), bibAt, cfg);
const codes = f => f.map(x => x.code);
const W = n => Array.from({ length: n }, (_, i) => "kata" + "abcdefghij"[i % 10]).join(" ");
const OK = "Komunikasi lintas fungsi membantu bagian penjualan menyelaraskan target bersama bagian produksi setiap bulan."; // kalimat netral (>=8 kata)

test("U: kalimat panjang ditandai sesuai ambang, ambang bisa diubah", () => {
  const long = `Perusahaan ${W(45)}.`;
  assert.ok(codes(run([long + " " + OK + " " + OK.replace("bulan", "minggu") + " " + OK.replace("target", "sasaran")])).includes("U"));
  assert.ok(!codes(run([OK + " " + OK.replace("bulan", "minggu") + " " + OK.replace("target", "sasaran")])).includes("U"));
  assert.ok(codes(run([`Perusahaan ${W(25)}. ` + OK + " " + OK.replace("bulan", "minggu")], null, { long_sentence_words: 20 })).includes("U"));
});

test("O dan B: kutipan langsung tanpa sitasi, tanpa halaman, lengkap", () => {
  const q = "Pengertian komunikasi adalah “proses penyampaian pesan dari satu pihak kepada pihak lain dengan jelas”";
  const base = [OK, OK.replace("bulan", "minggu")];
  assert.ok(codes(run([[q + ".", ...base].join(" ")])).includes("O"));
  const f2 = run([[q + " (Robbins, 2016).", ...base].join(" ")]);
  assert.ok(codes(f2).includes("B") && !codes(f2).includes("O"));
  assert.ok(f2.find(x => x.code === "B").reason.includes("halaman"));
  const f3 = run([[q + " (Robbins, 2016, hlm. 45).", ...base].join(" ")]);
  assert.ok(!codes(f3).includes("O") && !codes(f3).includes("B"));
});

test("B: sitasi tanpa tahun, tidak ada di daftar pustaka, pustaka tak disitasi", () => {
  const list = [
    "Teks pembuka. " + OK + " " + OK.replace("bulan", "minggu") + " " + OK.replace("target", "sasaran"),
    "Menurut Kotler (2012) strategi harus jelas bagi semua pihak dalam organisasi besar. Robbins dan Judge (2016) menegaskan pentingnya koordinasi lintas fungsi di perusahaan. Lalu (Mintzberg dkk.) menyebut hal lain yang berkaitan dengan struktur.",
    "Daftar Pustaka",
    "Robbins, S. P., & Judge, T. A. (2016). Perilaku organisasi. Jakarta: Salemba.",
    "Porter, M. (2008). Competitive strategy. New York: Free Press.",
  ];
  const f = run(list, 2);
  const reasons = f.filter(x => x.code === "B").map(x => x.reason).join(" | ");
  assert.ok(reasons.includes("Kotler") && reasons.includes("tidak ditemukan"), reasons);
  assert.ok(!reasons.includes("Robbins, 2016") && !/"Robbins dan Judge \(2016\)" tidak/.test(reasons), reasons);
  assert.ok(reasons.includes("tidak mencantumkan tahun"), reasons);
  assert.ok(reasons.includes("tidak disitasi"), reasons); // Porter
  assert.ok(f.some(x => x.code === "B" && x.para_idx === 4));
});

test("K: angka/klaim tanpa sumber ditandai, dengan sumber tidak", () => {
  const a = run(["Kinerja karyawan meningkat sebesar 25 persen setelah pelatihan diberikan kepada seluruh tim. " + OK + " " + OK.replace("bulan", "minggu")]);
  assert.ok(codes(a).includes("K"));
  const b = run(["Kinerja karyawan meningkat sebesar 25 persen setelah pelatihan (Robbins, 2016). " + OK + " " + OK.replace("bulan", "minggu")]);
  assert.ok(!codes(b).includes("K"));
});

test("M: kalimat yang sama muncul dua kali ditandai pada kemunculan kedua", () => {
  const f = run([OK + " Kalimat penutup yang berbeda untuk paragraf pertama ini saja.", "Paragraf lain. " + OK + " Penutup paragraf kedua yang juga berbeda sendiri."]);
  const m = f.filter(x => x.code === "M");
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].para_idx, 1);
});

test("H dan P: paragraf pendek, paragraf generik", () => {
  assert.ok(codes(run(["Komunikasi sangat dibutuhkan oleh organisasi modern saat ini. Tim harus terhubung."])).includes("H"));
  const gen = "Pada era globalisasi ini, komunikasi sangat penting bagi perusahaan. Hal ini tidak dapat dipungkiri oleh siapa pun yang bekerja. Komunikasi memegang peranan penting dalam berbagai aspek pekerjaan.";
  assert.ok(codes(run([gen])).includes("P"));
  assert.ok(!codes(run([OK + " " + OK.replace("bulan", "minggu") + " " + OK.replace("target", "sasaran")])).includes("P"));
});

test("A: transisi berulang ditandai, pemakaian wajar 'Selain itu'/'Oleh karena itu' TIDAK ditandai", () => {
  const rep = [OK, "Selain itu " + OK.toLowerCase(), "Selain itu pembagian tugas diatur setiap minggu oleh pemimpin tim.", "Selain itu hasil kerja dilaporkan kepada atasan secara berkala."].join(" ");
  assert.ok(codes(run([rep])).includes("A"));
  const once = [OK, "Selain itu " + OK.toLowerCase().replace("bulan", "minggu"), "Oleh karena itu pembagian tugas diatur setiap minggu oleh pemimpin tim.", "Hasil kerja dilaporkan kepada atasan secara berkala dan terukur."].join(" ");
  assert.ok(!codes(run([once])).includes("A"), "pemakaian wajar tidak boleh ditandai");
  const same = ["Tim penjualan bekerja keras setiap hari.", "Tim penjualan menghubungi pelanggan baru tiap pekan.", "Tim penjualan melaporkan hasilnya kepada manajer.", "Manajer menilai hasil laporan itu secara berkala."].join(" ");
  assert.ok(codes(run([same])).includes("A"));
});

test("dilewati: judul, tabel, daftar pustaka; tidak ada catatan palsu", () => {
  const f = run([
    { text: "Kinerja meningkat sebesar 25 persen menurut hasil penelitian terbaru yang sangat panjang sekali", style: "Heading1" },
    { text: "Kinerja meningkat sebesar 25 persen menurut hasil penelitian terbaru yang sangat panjang sekali", inTable: true },
    "Daftar Pustaka",
    "Kinerja meningkat sebesar 25 persen menurut hasil penelitian terbaru yang sangat panjang sekali.",
  ], 2);
  assert.deepStrictEqual(f, []);
});

test("kode utama per kalimat mengikuti prioritas (K sebelum U) dan hitungan per kode", () => {
  const s = `Kinerja meningkat sebesar 25 persen ${W(45)}.`;
  const f = run([s + " " + OK + " " + OK.replace("bulan", "minggu")]);
  const onFirst = f.filter(x => x.sent_idx === 0);
  assert.deepStrictEqual(onFirst.map(x => x.code).sort(), ["K", "U"]);
  assert.strictEqual(onFirst.find(x => x.primary).code, "K");
  const c = countByCode(f);
  assert.strictEqual(c.total, f.length); assert.strictEqual(c.byCode.K, 1); assert.strictEqual(c.byCode.U, 1);
  assert.deepStrictEqual(f.map(x => x.seq), f.map((_, i) => i + 1));
});

test("saveFindings menyimpan ke database dan menggantikan hasil lama", () => {
  const db = open(":memory:"), now = Date.now();
  db.prepare("INSERT INTO orders(id,public_token,wa_number,price_per_word,min_price,base_total,total,created_at,updated_at) VALUES('NA-1','t','62811',17,30000,30000,30000,?,?)").run(now, now);
  const f = run(["Kinerja meningkat sebesar 25 persen setelah pelatihan diberikan kepada seluruh tim. " + OK + " " + OK.replace("bulan", "minggu")]);
  saveFindings(db, "NA-1", f); saveFindings(db, "NA-1", f);
  assert.strictEqual(db.prepare("SELECT COUNT(*) n FROM findings WHERE order_id='NA-1'").get().n, f.length);
});

test("dokumen besar 100.000 kata dianalisis cepat", () => {
  const p = (OK + " Selain itu, kinerja meningkat sebesar 10 persen (Robbins, 2016). ").repeat(8);
  const list = Array.from({ length: 1000 }, (_, i) => p + i);
  const t0 = Date.now(); const f = run(list); const ms = Date.now() - t0;
  assert.ok(ms < 15000, ms + "ms"); assert.ok(f.length > 0);
});
