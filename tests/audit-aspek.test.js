"use strict";
/* Aspek isi seluruh dokumen (persen), indikasi gaya tulisan seragam, dan kalimat pembantu per warna. Deterministik, tanpa AI. */
const test = require("node:test"), assert = require("node:assert");
const { runAudit } = require("../parafrase/auditrules");
const { analyzeFindings, CODES, PRIORITY, helperFor } = require("../parafrase/rules");
const { computeAspects, MIN_SENTENCES } = require("../parafrase/aspek");
const { findAiMarkers, TARGET, splitSuggest } = require("../parafrase/hint");

const para = (idx, text) => ({ idx, text, style: "", inTable: false });

/* Dokumen seragam: kalimat sama panjang, awalan sama, frasa klise dan frasa gaya otomatis. */
const SERAGAM = Array.from({ length: 8 }, (_, i) =>
  para(i, "Selain itu, penting untuk dicatat bahwa motivasi kerja sangat penting dalam konteks ini bagi organisasi modern. Selain itu, hal ini menunjukkan bahwa kinerja karyawan sangat penting di era digital saat ini juga. Selain itu, secara keseluruhan pendekatan holistik sangat penting dalam kehidupan sehari-hari semua organisasi besar. Selain itu, tidak dapat dipungkiri bahwa komitmen kerja memegang peranan penting dalam semua bidang usaha."));

/* Dokumen beragam: panjang kalimat bervariasi, awalan berbeda, ada sumber dan angka spesifik. */
const BERAGAM = [
  para(0, "Robbins dan Judge (2023) membedakan motivasi intrinsik dari motivasi ekstrinsik. Perbedaan itu penting. Bagi pegawai gudang di Cikarang, bonus bulanan ternyata lebih menentukan daripada pelatihan, sebagaimana tampak pada catatan absensi tiga bulan terakhir yang dikumpulkan manajer shift."),
  para(1, "Hasibuan (2019) menekankan peran pimpinan. Di lapangan, pimpinan shift sering menjadi satu-satunya penghubung antara target perusahaan dan kebiasaan kerja tim. Mengapa demikian? Karena struktur pelaporan di perusahaan tersebut hanya dua tingkat."),
  para(2, "Sebagian karyawan bertahan karena jarak rumah. Sebagian lain pergi setelah jadwal lembur berubah. Dua pola ini tidak bisa diringkas dalam satu kesimpulan, sehingga analisis perlu memisahkan kelompok berdasarkan masa kerja dan status kontrak mereka."),
  para(3, "Menurut Dessler (2020), evaluasi kinerja yang terlalu sering dapat menurunkan kepercayaan. Temuan ini berbeda dengan Robbins dan Judge (2023) yang justru menekankan umpan balik rutin. Perbedaan arah ini menjadi celah yang hendak dijawab penelitian ini."),
  para(4, "Daftar Pustaka"),
  para(5, "Dessler, G. (2020). Human resource management. Pearson."),
  para(6, "Hasibuan, M. S. P. (2019). Manajemen sumber daya manusia. Bumi Aksara."),
  para(7, "Robbins, S. P., & Judge, T. A. (2023). Organizational behavior. Pearson."),
];

test("penanda gaya seragam: terdeteksi bila dua penanda sekalimat, kalimat wajar tidak ditandai", () => {
  assert.deepStrictEqual(findAiMarkers("Penting untuk dicatat bahwa hal ini menunjukkan bahwa biaya naik."), ["penting untuk dicatat", "hal ini menunjukkan bahwa"]);
  assert.strictEqual(findAiMarkers("Biaya produksi naik karena harga bahan baku di pelabuhan melonjak.").length, 0);
  const f = analyzeFindings([para(0, "Penting untuk dicatat bahwa hal ini menunjukkan bahwa biaya produksi naik cukup tajam pada tahun ini.")], null);
  assert.ok(f.some(x => x.code === "A" && x.kind === "ai"), "dua penanda sekalimat ditandai A");
  const wajar = analyzeFindings([para(0, "Secara keseluruhan, biaya produksi naik karena harga bahan baku di pelabuhan melonjak pada kuartal ketiga.")], null);
  assert.ok(!wajar.some(x => x.kind === "ai"), "satu penanda saja tidak ditandai");
});

test("aspek persen: ada 6 aspek dan indikasi gaya; dokumen seragam jauh lebih tinggi dari dokumen beragam", () => {
  const f1 = analyzeFindings(SERAGAM, null), f2 = analyzeFindings(BERAGAM, 4);
  const s = computeAspects(SERAGAM, null, f1), b = computeAspects(BERAGAM, 4, f2);
  assert.deepStrictEqual(s.aspects.map(a => a.key), ["kalimat_berulang", "kutipan_bermasalah", "klaim_tanpa_sumber", "kalimat_panjang", "paragraf_pendek", "paragraf_generik"]);
  assert.deepStrictEqual(s.ai.parts.map(p => p.key), ["frasa_otomatis", "frasa_klise", "panjang_seragam", "transisi", "awalan_sama"]);
  assert.ok(s.ai.value >= 60 && s.ai.level === "tinggi", "seragam: " + s.ai.value);
  assert.ok(b.ai.value < 30 && b.ai.level === "rendah", "beragam: " + b.ai.value);
  assert.match(s.ai.note, /bukan detektor AI/); assert.match(s.ai.note, /bukan skor Drillbit/);
  for (const a of s.aspects) assert.ok(a.value == null || (a.value >= 0 && a.value <= 100), a.key);
});

test("teks pendek: indikasi tidak dikarang (n/a), bukan angka", () => {
  const f = analyzeFindings([para(0, "Motivasi kerja penting bagi organisasi yang ingin bertahan lama di pasar.")], null);
  const r = computeAspects([para(0, "Motivasi kerja penting bagi organisasi yang ingin bertahan lama di pasar.")], null, f);
  assert.strictEqual(r.ai.value, null); assert.strictEqual(r.ai.level, "belum"); assert.ok(MIN_SENTENCES >= 10);
  assert.ok(r.aspects.every(a => a.value == null || a.key === undefined));
});

test("audit: skor memuat aspek dan ai, metrik lama tidak berubah, temuan indikasi muncul untuk dokumen seragam", async () => {
  const bib = [para(8, "Daftar Pustaka"), para(9, "Robbins, S. P. (2016). Perilaku organisasi. Salemba Empat.")];
  const r = await runAudit({ paragraphs: [...SERAGAM, ...bib], bibliographyParagraphIndex: 8 });
  assert.deepStrictEqual(r.score.metrics.map(m => m.key), ["sitasi", "pustaka", "doi", "berulang"]);
  assert.strictEqual(r.score.aspects.length, 6); assert.strictEqual(r.score.ai.level, "tinggi");
  assert.ok(r.findings.some(f => f.cat === "Indikasi gaya tulisan seragam atau otomatis tinggi" && f.sev === "peringatan"));
  const ok = await runAudit({ paragraphs: BERAGAM, bibliographyParagraphIndex: 4 });
  assert.ok(!ok.findings.some(f => /Indikasi gaya tulisan/.test(f.cat)), "dokumen beragam tidak diberi temuan indikasi");
});

test("kalimat pembantu: setiap warna punya arahan 'harusnya', dan tiap kode punya kalimat pembantu konkret", () => {
  for (const k of PRIORITY) {
    assert.ok(CODES[k].target && CODES[k].target === TARGET[k], "target " + k);
    assert.ok(helperFor(k, "Kalimat contoh yang cukup panjang untuk diuji pada kode ini saja.", "alasan").length > 20, "pembantu " + k);
  }
  assert.match(helperFor("B", "x", "Kutipan langsung perlu nomor halaman (hlm.) pada sitasinya."), /hlm\. \[nomor\]/);
  assert.match(helperFor("B", "x", 'Sitasi "(Robbins)" tidak mencantumkan tahun.'), /\(Robbins\)/);
  assert.match(helperFor("B", "x", 'Sitasi "(Smith, 2020)" tidak ditemukan di daftar pustaka. Periksa nama dan tahun.'), /Smith, 2020/);
  assert.match(helperFor("A", "x", 'Transisi "selain itu" dipakai 4 kali di satu paragraf. Variasikan.'), /di samping itu/);
  assert.match(helperFor("A", "Penting untuk dicatat bahwa hal ini menunjukkan bahwa X.", "Frasa"), /perlu diperhatikan/);
});

test("kalimat panjang: saran pecah menjadi dua kalimat utuh bila ada kata penghubung di tengah", () => {
  const panjang = "Perusahaan menetapkan target produksi yang tinggi pada setiap shift kerja harian, sehingga pegawai lapangan sering mengabaikan prosedur keselamatan yang sudah ditetapkan manajemen.";
  const s = splitSuggest(panjang);
  assert.ok(s && /Akibatnya, /.test(s) && (s.match(/“/g) || []).length === 2, String(s));
  assert.strictEqual(splitSuggest("Kalimat tanpa penghubung yang bisa dipecah secara otomatis oleh aturan sederhana ini."), null);
  assert.match(helperFor("U", panjang, "Kalimat 40 kata"), /Pecah menjadi dua kalimat, contoh:/);
});

test("paragraf pendek (H): butir ketikan manual dan pertanyaan tidak dihitung, paragraf pendek biasa tetap", () => {
  const dok = [
    para(0, "Motivasi kerja yang rendah sering muncul pada perusahaan kecil karena sistem kerja belum tertata dengan baik. Absensi masih dicatat manual oleh supervisor lapangan pada tiap shift. Akibatnya, pelanggaran jam masuk baru diketahui setelah akhir bulan, ketika rekap kehadiran dihitung oleh bagian personalia."),
    para(1, "1. Karyawan wajib hadir tepat waktu setiap hari kerja."),
    para(2, "a) Absensi dicatat manual oleh supervisor lapangan."),
    para(3, "Mengapa disiplin karyawan perlu ditegakkan di perusahaan kecil?"),
    para(4, "Disiplin itu penting bagi perusahaan kecil yang berkembang."),
  ];
  const h = analyzeFindings(dok, null).filter(f => f.code === "H").map(f => f.para_idx);
  assert.deepStrictEqual(h, [4]);
});

test("paragraf pendek (H): judul HURUF KAPITAL, label tanpa tanda baca akhir, dan teks sampul tidak dihitung", () => {
  const dok = [
    para(0, "PENYUSUNAN DAN PENERAPAN ATURAN KEHADIRAN SERTA PENEGAKAN DISIPLIN KARYAWAN PADA PERUSAHAAN YANG BERTUMBUH"),
    para(1, "Penyusunan dan Penerapan Aturan Kehadiran serta Penegakan Disiplin Karyawan pada Perusahaan yang Bertumbuh dari Skala Kecil"),
    para(2, "Disiplin itu penting bagi perusahaan kecil yang berkembang."),
  ];
  assert.deepStrictEqual(analyzeFindings(dok, null).filter(f => f.code === "H").map(f => f.para_idx), [2]);
});
