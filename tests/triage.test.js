"use strict";
/* Triage urgensi: Audit Dokumen (diagnosis) dan Cek & Parafrase (obat) memakai mesin dan ambang yang SAMA. */
const test = require("node:test");
const assert = require("node:assert");
const { analyzeFindings } = require("../parafrase/rules");
const { kindOf, findAiMarkers, helperFor, GUIDE, GUIDE_TEKNIK, GUIDE_CEK_RESMI } = require("../parafrase/hint");
const { buildTriage, buildTriageBase, withDrillbit, parseDrill } = require("../parafrase/triage");
const { runAudit } = require("../parafrase/auditrules");
const { computeAspects } = require("../parafrase/aspek");
const { boot, docx } = require("./pf-helper");

const para = (idx, text) => ({ idx, text, style: "", inTable: false });
const KAMUS = "alfa beta gama delta epsilon zeta eta teta iota kapa lamda mu nu xi omikron pi rho sigma tau upsilon fi khi psi omega".split(" ");
/* kalimat n kata dengan kata-kata unik (tidak memicu kalimat berulang) */
const kal = (n, seed) => Array.from({ length: n }, (_, k) => (k === 0 ? "Bahasan" : "") + KAMUS[(seed * 7 + k * 3) % KAMUS.length] + seed + "x" + k).join(" ") + ".";
const SERAGAM_PARA = Array.from({ length: 6 }, (_, i) => kal(12, i + 1)).join(" ");               // enam kalimat, semuanya 12 kata
const BERAGAM_PARA = [kal(5, 21), kal(24, 22), kal(9, 23), kal(31, 24), kal(13, 25), kal(7, 26)].join(" ");

test("deteksi baru: panjang kalimat seragam di satu paragraf ditandai (A), paragraf yang bervariasi tidak", () => {
  const f = analyzeFindings([para(0, SERAGAM_PARA), para(1, BERAGAM_PARA)], null, {});
  const a = f.filter(x => x.code === "A" && kindOf(x) === "uniform");
  assert.strictEqual(a.length, 1, JSON.stringify(f.map(x => [x.code, x.para_idx, x.reason])));
  assert.strictEqual(a[0].para_idx, 0);
  assert.match(a[0].reason, /^Panjang kalimat di paragraf ini seragam \(12 sampai 12 kata pada 6 kalimat\)/);
  assert.ok(!/alfa|beta|gama/.test(a[0].reason), "alasan tidak boleh memuat potongan teks dokumen");
  assert.match(helperFor("A", "x", a[0].reason), /Selingi panjang kalimat/);
});

test("deteksi baru: 'penting untuk diingat' dan 'dalam era digital' dikenali dari daftar tips", () => {
  assert.deepStrictEqual(findAiMarkers("Penting untuk diingat bahwa secara keseluruhan hasilnya baik."), ["penting untuk diingat", "secara keseluruhan"]);
  const p = "Dalam era digital ini mahasiswa belajar dari mana saja dan kapan saja sesuai kebutuhan masing-masing. Kampus menyediakan banyak layanan untuk membantu proses belajar tersebut setiap hari. Mahasiswa perlu memanfaatkannya dengan sebaik mungkin agar lancar.";
  const f = analyzeFindings([para(0, p)], null, {});
  assert.ok(f.some(x => x.code === "P"), "frasa 'dalam era digital' masuk kategori paragraf umum: " + JSON.stringify(f.map(x => x.code)));
});

test("kindOf: temuan dari database (tanpa kolom kind) tetap dikenali dari teks alasan, hasilnya sama dengan analisis baru", () => {
  const fresh = analyzeFindings([para(0, SERAGAM_PARA), para(1, "Penting untuk dicatat bahwa hal ini menunjukkan bahwa biaya produksi naik cukup tajam pada tahun ini.")], null, {}).filter(x => x.code === "A");
  assert.ok(fresh.length >= 2);
  for (const f of fresh) { const db = { code: f.code, para_idx: f.para_idx, sent_idx: f.sent_idx, reason: f.reason }; assert.strictEqual(kindOf(db), kindOf(f), f.reason); assert.ok(kindOf(db)); }
  assert.strictEqual(kindOf({ code: "M", reason: "x" }), null);
});

/* dokumen sintetis untuk menguji tingkat: findings dibuat langsung supaya ambang mudah dikendalikan */
const DOC = Array.from({ length: 10 }, (_, i) => para(i, kal(9, i + 40) + " " + kal(10, i + 50) + " " + kal(11, i + 60)));
const F = (code, p, reason = "x", kind) => ({ code, para_idx: p, sent_idx: 0, reason, ...(kind ? { kind } : {}) });
const HEAVY = [0, 1, 2, 3].flatMap(p => [F("M", p), F("M", p), F("A", p, "Frasa yang sering muncul pada tulisan seragam", "ai"), F("A", p, "Frasa yang sering muncul pada tulisan seragam", "ai")]);

test("tingkat urgensi: dokumen bersih = aman; banyak paragraf mendesak = mendesak; urutan paragraf paling mendesak dulu", () => {
  const clean = buildTriage({ paras: DOC, findings: [], cfg: {} });
  assert.strictEqual(clean.level, "aman"); assert.strictEqual(clean.basis, "pola");
  const t = buildTriage({ paras: DOC, findings: HEAVY, cfg: {} });
  assert.strictEqual(t.level, "mendesak");
  assert.strictEqual(t.internal.counts.mendesak, 4);
  assert.deepStrictEqual(t.paragraphs.map(p => p.no).slice(0, 4), [1, 2, 3, 4]);
  assert.ok(t.paragraphs.every(p => p.level === "mendesak" && p.score >= 16));
  assert.match(t.next, /Rombak dulu paragraf ke-1, 2, 3, 4/);
  assert.deepStrictEqual(t.treatments.map(x => x.key), ["orisinal", "gaya"], "resep hanya untuk jenis temuan yang ada, menurut bobot");
  assert.ok(t.treatments[1].steps.length >= 3);
});

test("ambang urgensi bisa diatur admin: hasil berubah tanpa mengubah kode", () => {
  const strict = buildTriage({ paras: DOC, findings: HEAVY, cfg: { urgensi_paragraf_persen: 15 } });
  const lenient = buildTriage({ paras: DOC, findings: HEAVY, cfg: { urgensi_paragraf_persen: 90, urgensi_ai_sedang: 98, urgensi_ai_tinggi: 99 } });
  assert.strictEqual(strict.level, "mendesak");
  assert.strictEqual(lenient.level, "perhatian", "ambang longgar: masih ada paragraf mendesak, tetapi tidak cukup banyak untuk membuat dokumen mendesak");
  const sedikit = buildTriage({ paras: DOC, findings: HEAVY, cfg: { urgensi_paragraf_skor: 30, urgensi_paragraf_persen: 90, urgensi_ai_sedang: 98, urgensi_ai_tinggi: 99 } });
  assert.strictEqual(sedikit.internal.counts.mendesak, 0, "skor mendesak dinaikkan: tidak ada paragraf mendesak");
});

test("angka Drillbit murid menentukan: di atas batas = mendesak (dengan selisih), di bawah batas = tidak lebih parah dari 'perhatian'", () => {
  const cfg = { drillbit_sim_max: 25, drillbit_ai_max: 20 };
  const base = buildTriageBase({ paras: DOC, findings: HEAVY, cfg });
  const over = withDrillbit(base, parseDrill({ sim: "31,5", ai: "12" }));
  assert.strictEqual(over.level, "mendesak"); assert.strictEqual(over.basis, "drillbit");
  assert.deepStrictEqual(over.gap, { sim: 6.5, ai: 0 });
  assert.deepStrictEqual(over.drillbit, { sim: 31.5, ai: 12, simOver: true, aiOver: false });
  assert.match(over.reasons[0], /similarity 31,5% \(batas acuan 25%\), perlu turun sekitar 6,5 poin; tulisan AI 12% \(batas acuan 20%\)/);
  const under = withDrillbit(base, parseDrill({ sim: "10", ai: "5" }));
  assert.strictEqual(under.level, "perhatian", "angka resmi aman, tetapi pola tulisan masih ditandai");
  assert.ok(under.reasons.some(r => /di bawah batas, tetapi pola tulisan masih ditandai/.test(r)));
  const cleanBase = buildTriageBase({ paras: DOC, findings: [], cfg });
  assert.strictEqual(withDrillbit(cleanBase, parseDrill({ ai: "21" })).level, "mendesak", "satu angka saja sudah cukup");
  assert.strictEqual(withDrillbit(cleanBase, parseDrill({ sim: "3", ai: "2" })).level, "aman");
  assert.strictEqual(withDrillbit(cleanBase, null).basis, "pola");
  const adm = buildTriageBase({ paras: DOC, findings: [], cfg: { drillbit_ai_max: 40 } });
  assert.strictEqual(withDrillbit(adm, parseDrill({ ai: "21" })).level, "aman", "batas acuan dari pengaturan admin");
});

test("parseDrill: hanya angka 0 sampai 100 dengan maksimal dua desimal", () => {
  assert.deepStrictEqual(parseDrill({ sim: "18,5", ai: "7%" }), { sim: 18.5, ai: 7 });
  assert.deepStrictEqual(parseDrill({ sim: 0 }), { sim: 0, ai: null });
  for (const bad of ["abc", "101", "-3", "12.345", "", "1e2", null, undefined]) assert.strictEqual(parseDrill({ sim: bad, ai: bad }), null, String(bad));
});

test("keluaran triage tidak memuat teks dokumen saat terkunci; potongan awal paragraf hanya untuk hasil berbayar", () => {
  const SECRET = "KATARAHASIAPENELITI";
  const paras = DOC.map((p, i) => (i < 3 ? para(p.idx, `${SECRET}${i} ` + p.text) : p));
  const locked = JSON.stringify(buildTriage({ paras, findings: HEAVY.map(f => ({ ...f, text: SECRET })), cfg: {} }));
  assert.ok(!locked.includes(SECRET), "teks dokumen bocor ke triage terkunci");
  const paid = buildTriage({ paras, findings: HEAVY, cfg: {} }, null);
  assert.ok(paid.paragraphs.every(p => p.excerpt === undefined));
  const withText = withDrillbit(buildTriageBase({ paras, findings: HEAVY, cfg: {}, withText: true }), null);
  assert.ok(withText.paragraphs.some(p => p.excerpt && p.excerpt.startsWith(SECRET)), "hasil berbayar boleh memuat potongan awal paragraf");
  assert.ok(withText.paragraphs.every(p => !p.excerpt || p.excerpt.length <= 70));
});

test("nomor paragraf = urutan paragraf berisi teks (paragraf kosong tidak dihitung), sama dengan nomor di pratinjau", () => {
  const paras = [para(0, ""), para(1, kal(30, 70)), para(2, "   "), para(3, ""), para(4, kal(30, 71))];
  const t = buildTriage({ paras, findings: [F("M", 4), F("M", 4), F("O", 4)], cfg: {} });
  assert.deepStrictEqual(t.paragraphs.map(p => p.no), [2], "paragraf kedua yang berisi teks, bukan indeks 4");
});

test("Audit Dokumen dan Cek & Parafrase sepakat: jumlah dan tingkat identik dengan pengaturan admin yang sama", async () => {
  const cfg = { long_sentence_words: 20, urgensi_ai_sedang: 10, urgensi_ai_tinggi: 40 };
  const paras = [para(0, SERAGAM_PARA), para(1, SERAGAM_PARA.replace(/x/g, "y")), para(2, kal(28, 90) + " " + kal(8, 91) + " " + kal(9, 92) + " " + kal(10, 93)), para(3, "Daftar Pustaka"), para(4, "Robbins, S. P. (2016). Perilaku organisasi. Jakarta: Salemba Empat.")];
  const r = await runAudit({ paragraphs: paras, bibliographyParagraphIndex: 3 }, { cfg });
  const own = analyzeFindings(paras, 3, cfg);
  assert.deepStrictEqual(r.docFindings.map(f => [f.code, f.para_idx, f.sent_idx]), own.map(f => [f.code, f.para_idx, f.sent_idx]), "temuan identik");
  assert.ok(r.docFindings.some(f => f.code === "U"), "ambang kalimat panjang dari pengaturan admin ikut dipakai audit");
  const aspAudit = computeAspects(paras, 3, r.docFindings, cfg), aspPf = computeAspects(paras, 3, own, cfg);
  assert.deepStrictEqual(aspAudit, aspPf);
  assert.strictEqual(r.score.ai.level, aspPf.ai.level);
  const tA = buildTriage({ paras, bibAt: r.bodyAt, findings: r.docFindings, cfg }), tP = buildTriage({ paras, bibAt: 3, findings: own, cfg });
  assert.deepStrictEqual(tA, tP, "triage dari jalur audit = triage dari jalur parafrase");
  // temuan yang dibaca ulang dari database (tanpa kind) tidak mengubah tingkat
  const fromDb = own.map(f => ({ code: f.code, para_idx: f.para_idx, sent_idx: f.sent_idx, reason: f.reason }));
  assert.deepStrictEqual(buildTriage({ paras, bibAt: 3, findings: fromDb, cfg }).level, tP.level);
  assert.deepStrictEqual(computeAspects(paras, 3, fromDb, cfg).ai, aspPf.ai);
  // tingkat indikasi mengikuti ambang admin
  assert.strictEqual(computeAspects(paras, 3, own, { urgensi_ai_sedang: 99, urgensi_ai_tinggi: 100 }).ai.level, "rendah");
});

test("resep perbaikan: manual dan jujur (tanpa janji skor, tanpa penulisan ulang otomatis)", () => {
  const all = JSON.stringify({ GUIDE, GUIDE_TEKNIK, GUIDE_CEK_RESMI });
  assert.match(GUIDE_TEKNIK.steps.join(" "), /Tutup teks aslinya/);
  assert.match(GUIDE_TEKNIK.note, /Tidak ada cara yang menjamin angka Drillbit/);
  assert.match(GUIDE_CEK_RESMI, /TIDAK TERVERIFIKASI/);
  assert.ok(!/bebas plagiasi|dijamin lolos|pasti lolos|100% aman|turun ke \d+%/i.test(all), "tidak boleh ada janji hasil");
  assert.match(GUIDE.gaya.steps.join(" "), /Penting untuk diingat bahwa/);
  assert.match(GUIDE.analisis.steps.join(" "), /objek penelitianmu/);
});

test("HTTP: lanjutkan unggahan Audit ke Cek & Parafrase tanpa unggah ulang, urgensi ikut angka Drillbit, dan bisa dipesan", async () => {
  const t = await boot();
  try {
    const send = async (path, buf) => { const fd = new FormData(); fd.append("file", new Blob([buf]), "tugas.docx"); const r = await fetch(t.base + path, { method: "POST", body: fd, headers: t.H }); return r.json(); };
    const audit = await send("/ms/audit/upload", await docx("Penting untuk diingat bahwa hal ini menunjukkan bahwa kinerja naik."));
    assert.ok(audit.uploadId && audit.triage && audit.triage.level, JSON.stringify(Object.keys(audit)));
    assert.ok(!JSON.stringify(audit).includes("koordinasi antardivisi"), "audit gratis tidak membocorkan teks dokumen");
    const id = audit.uploadId;
    const r1 = await fetch(t.base + "/ms/parafrase/upload/" + id);
    assert.strictEqual(r1.status, 200); assert.strictEqual(r1.headers.get("cache-control"), "no-store");
    const j = await r1.json();
    assert.strictEqual(j.uploadId, id); assert.strictEqual(j.file.name, "tugas.docx"); assert.ok(j.detected.words > 0 && j.notes.total >= 0 && j.quote.total > 0);
    assert.strictEqual(j.triage.basis, "pola");
    assert.deepStrictEqual(j.triage.internal, audit.triage.internal, "Audit dan Parafrase menampilkan angka internal yang sama");
    const over = await (await fetch(t.base + "/ms/parafrase/upload/" + id + "?sim=40&ai=35")).json();
    assert.strictEqual(over.triage.level, "mendesak"); assert.strictEqual(over.triage.basis, "drillbit");
    assert.deepStrictEqual(over.triage.gap, { sim: 15, ai: 15 });
    assert.ok(!JSON.stringify(over).includes("koordinasi antardivisi"), "resume tidak membocorkan teks");
    t.m.settings.set({ drillbit_ai_max: 50, drillbit_sim_max: 60 });
    assert.notStrictEqual((await (await fetch(t.base + "/ms/parafrase/upload/" + id + "?sim=40&ai=35")).json()).triage.level, "mendesak", "batas acuan admin langsung berlaku");
    const pv = await (await fetch(t.base + "/ms/parafrase/preview/" + id)).json();
    assert.ok(pv.triage && pv.paragraphs.every(p => Number.isInteger(p.no)), "pratinjau membawa triage dan nomor paragraf");
    const ord = await t.order(id);
    assert.strictEqual(ord.status, 200, "unggahan dari Audit bisa langsung dipesan sebagai Cek & Parafrase");
    assert.strictEqual((await fetch(t.base + "/ms/parafrase/upload/" + id)).status, 404, "setelah jadi pesanan tidak bisa dibuka lagi lewat jalur ini");
    for (const bad of ["abc", "0".repeat(32), "../../etc/passwd"]) assert.strictEqual((await fetch(t.base + "/ms/parafrase/upload/" + bad)).status, 404, bad);
  } finally { t.srv.close(); }
});

test("pengaturan urgensi: divalidasi, punya bawaan, dan tidak ikut konfigurasi publik", () => {
  const { open } = require("../parafrase/db"), { create } = require("../parafrase/settings");
  const s = create(open(":memory:"));
  assert.deepStrictEqual([s.get("urgensi_ai_sedang"), s.get("urgensi_ai_tinggi"), s.get("urgensi_paragraf_skor"), s.get("urgensi_paragraf_persen")], [30, 60, 8, 15]);
  assert.throws(() => s.set({ urgensi_ai_sedang: 3 }), /urgensi_ai_sedang/);
  assert.throws(() => s.set({ urgensi_paragraf_persen: 0 }), /urgensi_paragraf_persen/);
  assert.throws(() => s.set({ urgensi_paragraf_skor: "abc" }), /urgensi_paragraf_skor/);
  s.set({ urgensi_ai_sedang: 40, urgensi_ai_tinggi: 75 }, "admin");
  assert.strictEqual(s.get("urgensi_ai_tinggi"), 75);
  const pub = JSON.stringify(s.publicConfig());
  assert.ok(!/urgensi_/.test(pub), "angka urgensi internal tidak dikirim ke publik");
  assert.ok(/drillbit_sim_max/.test(pub), "batas acuan Drillbit memang publik");
});
