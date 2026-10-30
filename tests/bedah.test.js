"use strict";
/* Bedah Laporan Penelitian UT: harga dua tingkat, jatah temuan gratis, kunci server, pesanan dan unduhan. */
const test = require("node:test");
const assert = require("node:assert");
const { boot, docx } = require("./pf-helper");
const drillbit = require("../parafrase/drillbit");
const { bodyWords, rankFindings } = require("../parafrase/bedah");

/* Laporan AI tiruan untuk tes: pembaca PDF Drillbit diganti hanya untuk berkas berawalan %PDF-FAKEAI. */
const P2 = "Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan. ";
const P3 = "Sebanyak 45 persen perusahaan melaporkan peningkatan efisiensi operasional setelah digitalisasi proses bisnis dilakukan.";
let fakeExtra = "";
const realKind = drillbit.detectKind, realAi = drillbit.parseAi, isFake = b => Buffer.from(b).slice(0, 11).toString() === "%PDF-FAKEAI";
drillbit.detectKind = async b => (isFake(b) ? "ai" : realKind(b));
drillbit.parseAi = async b => (isFake(b) ? { ok: true, aiPct: 40, humanPct: 60, matchedWords: 30, totalWords: 75, confidence: "tinggi",
  blockTable: [{ n: 1, words: 20 }, { n: 2, words: 10 }], blocks: [{ n: 1, words: 20, text: P2 + fakeExtra }, { n: 2, words: 10, text: P3 }] } : realAi(b));
async function up(b, extra, izin, noAi) {
  fakeExtra = extra || "";
  const fd = new FormData(); fd.append("wa", "081234567890"); fd.append("file", new Blob([await docx(extra)]), "t.docx"); if (izin) fd.append("izin", "1");
  if (!noAi) fd.append("ai", new Blob(["%PDF-FAKEAI"]), "ai.pdf");
  const r = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd, headers: b.H });
  return { status: r.status, j: await r.json() };
}

test("bedah: harga per kata di luar 500 kata gratis, dibulatkan ke atas ke ribuan", async () => {
  const b = await boot(); const q = b.m.orders.bedahQuote;
  const c = b.m.settings.getAll();
  for (const [w, t] of [[1, 0], [500, 0], [501, 1000], [1000, 5000], [1001, 6000], [1500, 10000], [4310, 39000], [2950, 25000]]) assert.strictEqual(q(w, c).total, t, w + " kata");
  assert.strictEqual(q(4310, c).raw, 38100); assert.strictEqual(q(4310, c).paidWords, 3810); assert.strictEqual(q(4310, c).freeWords, 500);
  b.m.settings.set({ bedah_harga_per_1000: 12000, bedah_gratis_kata: 200, bedah_pembulatan: 500 });
  assert.strictEqual(q(1200, b.m.settings.getAll()).total, 12000); assert.strictEqual(q(1201, b.m.settings.getAll()).total, 12500);
  b.srv.close();
});

test("bedah: wajib laporan AI; hanya kalimat yang ditandai UT, gratis dibatasi dan sisanya terkunci tanpa teks", async () => {
  const b = await boot({ bedah_gratis_kata: 12 });
  const no = await up(b, "x", false, true); assert.strictEqual(no.status, 400);
  const { status, j } = await up(b, "Seiring perkembangan zaman, hal ini sangat penting dalam kehidupan sehari-hari.");
  assert.strictEqual(status, 200);
  assert.ok(j.totalFindings >= 2, "ada beberapa kalimat ditandai UT");
  assert.strictEqual(j.open.length, 1);
  assert.strictEqual(j.locked.length, j.totalFindings - 1);
  for (const x of j.locked) { assert.ok(!("text" in x) && !("tags" in x), "terkunci tidak membawa teks"); assert.ok(x.block && x.where); }
  assert.ok(j.open[0].text && j.open[0].tags.length && j.open[0].tags[0].fix && j.open[0].tags[0].jangan && j.open[0].tags[0].bukti);
  assert.ok(!("problem" in j) && !("labels" in j), "tidak ada temuan modul di Bedah");
  assert.strictEqual(j.quote.freeWords, 12); assert.strictEqual(j.quote.total, 1000); assert.strictEqual(j.ut.pct, 40); assert.strictEqual(j.sim, null);
  assert.ok(Array.isArray(j.protokol) && j.protokol.length >= 3);
  assert.ok(j.docMap.some(p => p.s.some(x => x.u === 1)));
  b.srv.close();
});

test("bedah: file bukan PDF di kolom laporan ditolak, jenis salah dilewati dengan peringatan", async () => {
  const b = await boot();
  const fd = new FormData(); fd.append("wa", "081234567890"); fd.append("file", new Blob([await docx("x")]), "t.docx"); fd.append("ai", new Blob(["bukan pdf"]), "a.pdf");
  const r = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd, headers: b.H });
  assert.strictEqual(r.status, 415);
  const fd2 = new FormData(); fd2.append("wa", "081234567890"); fd2.append("file", new Blob([await docx("x")]), "t.pdf.exe");
  assert.strictEqual((await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd2, headers: b.H })).status, 415);
  const r3 = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: new FormData(), headers: b.H });
  assert.strictEqual(r3.status, 400);
  b.srv.close();
});

test("bedah: pesan, bayar, lalu hasil lengkap dan unduhan Word terbuka; sebelum bayar tertutup", async () => {
  const b = await boot({ bedah_gratis_kata: 0 });
  const { j } = await up(b, "Menurut para ahli, hal ini sangat penting dalam kehidupan sehari-hari dan berbagai aspek.");
  const o = await (await fetch(b.base + "/ms/bedah/order", { method: "POST", headers: b.J, body: JSON.stringify({ uploadId: j.uploadId, wa: "081234567899", agree: true }) })).json();
  assert.ok(o.token && o.total >= 1000 && o.total <= 1099, "harga per kata dibulatkan + kode unik");
  assert.strictEqual((await fetch(b.base + "/ms/bedah/report/" + o.token)).status, 402);
  assert.strictEqual((await fetch(b.base + "/ms/bedah/download/" + o.token)).status, 402);
  b.setAdmin(true);
  assert.strictEqual((await fetch(b.base + "/ms/admin/parafrase/orders/" + o.orderId + "/confirm", { method: "POST", headers: b.J, body: "{}" })).status, 200);
  const st = await (await fetch(b.base + "/ms/parafrase/order/" + o.token)).json();
  assert.strictEqual(st.docType, "bedah"); assert.strictEqual(st.bedahReady, true); assert.strictEqual(st.queue, null);
  const rep = await (await fetch(b.base + "/ms/bedah/report/" + o.token)).json();
  assert.strictEqual(rep.findings.length, j.totalFindings);
  assert.ok(rep.findings.every(f => f.text && f.tags.length));
  const dl = await fetch(b.base + "/ms/bedah/download/" + o.token);
  assert.strictEqual(dl.status, 200);
  assert.ok(/wordprocessingml/.test(dl.headers.get("content-type")));
  assert.strictEqual(Buffer.from(await dl.arrayBuffer()).slice(0, 2).toString(), "PK");
  b.srv.close();
});

test("bedah: izin data menyimpan set, kode mencabut dan menghapus", async () => {
  const b = await boot();
  // tanpa laporan UT ditolak dan tidak ada yang disimpan walau izin dicentang
  const a = await up(b, "x", true, true); assert.strictEqual(a.status, 400);
  assert.strictEqual(b.m.db.prepare("SELECT COUNT(*) n FROM kalibrasi").get().n, 0);
  assert.strictEqual((await fetch(b.base + "/ms/bedah/cabut", { method: "POST", headers: b.J, body: JSON.stringify({ kode: "zzz" }) })).status, 400);
  assert.strictEqual((await fetch(b.base + "/ms/bedah/cabut", { method: "POST", headers: b.J, body: JSON.stringify({ kode: "0123456789ab" }) })).status, 404);
  // admin: daftar dan ekspor butuh admin
  assert.strictEqual((await fetch(b.base + "/ms/admin/bedah/kalibrasi")).status, 401);
  assert.strictEqual((await fetch(b.base + "/ms/admin/bedah/kalibrasi.zip")).status, 401);
  b.setAdmin(true);
  const l = await (await fetch(b.base + "/ms/admin/bedah/kalibrasi")).json();
  assert.deepStrictEqual(l.items, []); assert.strictEqual(l.beta.sets, 0);
  b.srv.close();
});

test("drillbit: jenis laporan dikenali dari isi, bukan dari nama", () => {
  assert.strictEqual(drillbit.kindOf("AI Content Detection Report\nSubmission ID: 1\nAI TEXT DETECTED (%)"), "ai");
  assert.strictEqual(drillbit.kindOf("DrillBit Similarity Report\nSimilarity 3%"), "sim");
  assert.strictEqual(drillbit.kindOf("Dokumen biasa tentang manajemen"), null);
});

test("drillbit: blok UT dipetakan ke kalimat dokumen; kalimat mirip di tempat jauh tidak ikut", () => {
  const { splitSentences } = require("../parafrase/docx");
  const blk = "Beban kerja yang tinggi menyebabkan stres kerja pada operator garmen setiap hari. Operator sering bekerja lembur untuk mengejar target produksi harian perusahaan.";
  const paras = [
    { idx: 0, text: "Beban kerja yang tinggi menyebabkan stres kerja pada operator garmen setiap hari. Operator sering bekerja lembur untuk mengejar target produksi harian perusahaan." },
    { idx: 1, text: "Kalimat lain tentang metode penelitian kualitatif dengan wawancara mendalam kepada informan." },
    { idx: 40, text: "Beban kerja yang tinggi menyebabkan stres kerja pada operator garmen setiap hari." },
  ];
  const m = drillbit.mapBlocks([{ n: 1, text: blk }], paras, splitSentences);
  assert.deepStrictEqual(m.hits.map(h => h.para_idx), [0, 0]);
});

test("bedah: kata isi tanpa sampul dan daftar isi; temuan diurutkan terberat dulu", () => {
  const long = w => Array(w).fill("kata").join(" ") + ".";
  const paras = [
    { idx: 0, text: "UNIVERSITAS TERBUKA", style: "", inTable: false },
    { idx: 1, text: "Bab I Pendahuluan ........... 3", style: "", inTable: false },
    { idx: 2, text: long(30), style: "", inTable: false },
    { idx: 3, text: long(20), style: "", inTable: false },
    { idx: 4, text: "Daftar Pustaka", style: "", inTable: false },
    { idx: 5, text: long(50), style: "", inTable: false },
  ];
  assert.strictEqual(bodyWords(paras, 4), 50);
  const r = rankFindings([{ code: "A", para_idx: 5, sent_idx: 0 }, { code: "K", para_idx: 9, sent_idx: 0 }, { code: "K", para_idx: 2, sent_idx: 0 }, { code: "M", para_idx: 7, sent_idx: 1 }, { code: "A", para_idx: 2, sent_idx: 0 }]);
  assert.deepStrictEqual(r.map(f => f.code + f.para_idx), ["M7", "K2", "K9", "A5"]);
});

test("rankFindings: temuan di blok yang ditandai UT diutamakan", () => {
  const f = [{ code: "M", para_idx: 7, sent_idx: 0 }, { code: "A", para_idx: 5, sent_idx: 0 }, { code: "K", para_idx: 9, sent_idx: 0 }];
  const r = rankFindings(f, new Map([["5:0", 1], ["9:0", 2]]));
  assert.deepStrictEqual(r.map(x => x.code + x.para_idx), ["K9", "A5", "M7"]);
});

test("rankFindings: temuan di blok yang ditandai UT diutamakan", () => {
  const f = [{ code: "M", para_idx: 7, sent_idx: 0 }, { code: "A", para_idx: 5, sent_idx: 0 }, { code: "K", para_idx: 9, sent_idx: 0 }];
  const r = rankFindings(f, new Map([["5:0", 1], ["9:0", 2]]));
  assert.deepStrictEqual(r.map(x => x.code + x.para_idx), ["K9", "A5", "M7"]);
});

test("bedah: peta dokumen dan CTA parafrase ada di kode", () => {
  const fs = require("fs"), path = require("path"), r = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  assert.match(r("parafrase/pages/bedah.html"), /id="mapCard"/);
  assert.match(r("parafrase/pages/bedah.html"), /href="\/ruangakademikut\/cek-parafrase-mandiri">Buka Cek/);
});
test("utdiag: diagnosis hanya pola terbukti, dengan bukti dan larangan", () => {
  const { diagnose } = require("../parafrase/utdiag");
  const a = diagnose("Proposisi pertama: komunikasi berpengaruh terhadap kinerja tim.");
  assert.deepStrictEqual(a.map(x => x.id), ["proposisi", "umum"]);
  const c = diagnose("Penelitian Handfield et al. menunjukkan pemasok berpengaruh (Handfield et al., 2026).");
  assert.ok(c.some(x => x.id === "sintesis"));
  const d = diagnose("Pada Maret 2026 di Gudang Cikarang terjadi 12 kali keterlambatan.");
  assert.deepStrictEqual(d.map(x => x.id), ["blok"]);
  for (const x of [...a, ...c, ...d]) assert.ok(x.fix && x.jangan && x.bukti);
});
test("layanan revisi ikut ditutup secara bawaan", () => {
  const s = require("fs").readFileSync(require("path").join(__dirname, "..", "parafrase", "settings.js"), "utf8");
  assert.match(s, /revisi_tugas,revisi_diskusi,revisi_metopen/);
});

test("bedah: tanpa nomor WhatsApp ditolak", async () => {
  const b = await boot();
  const fd = new FormData(); fd.append("file", new Blob([await docx("x")]), "t.docx"); fd.append("ai", new Blob(["%PDF-FAKEAI"]), "ai.pdf");
  assert.strictEqual((await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd, headers: b.H })).status, 400);
});
