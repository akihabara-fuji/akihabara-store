"use strict";
/* Bedah Laporan Penelitian UT: harga dua tingkat, jatah temuan gratis, kunci server, pesanan dan unduhan. */
const test = require("node:test");
const assert = require("node:assert");
const { boot, docx } = require("./pf-helper");
const drillbit = require("../parafrase/drillbit");
const { bodyWords, rankFindings } = require("../parafrase/bedah");

async function up(b, extra, izin) {
  const fd = new FormData(); fd.append("file", new Blob([await docx(extra)]), "t.docx"); if (izin) fd.append("izin", "1");
  const r = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd, headers: b.H });
  return { status: r.status, j: await r.json() };
}

test("bedah: harga per blok 500 kata dari pengaturan admin", async () => {
  const b = await boot(); const q = b.m.orders.bedahQuote;
  const c = b.m.settings.getAll();
  for (const [w, t] of [[1, 5000], [500, 5000], [501, 10000], [1000, 10000], [1500, 15000], [2000, 20000], [2337, 25000]]) assert.strictEqual(q(w, c).total, t, w + " kata");
  b.m.settings.set({ bedah_harga_per_blok: 7000, bedah_blok_kata: 300 });
  assert.strictEqual(q(300, b.m.settings.getAll()).total, 7000); assert.strictEqual(q(301, b.m.settings.getAll()).total, 14000);
  b.srv.close();
});

test("bedah: unggah file asli saja, temuan gratis dibatasi dan sisanya terkunci tanpa teks", async () => {
  const b = await boot({ bedah_gratis_temuan: 1 });
  const { status, j } = await up(b, "Seiring perkembangan zaman, hal ini sangat penting dan memegang peranan penting dalam kehidupan sehari-hari.");
  assert.strictEqual(status, 200);
  assert.ok(j.totalFindings >= 2, "ada beberapa temuan");
  assert.strictEqual(j.open.length, 1);
  assert.strictEqual(j.locked.length, j.totalFindings - 1);
  for (const x of j.locked) { assert.ok(!("text" in x) && !("reason" in x) && !("helper" in x), "terkunci tidak membawa teks"); assert.ok(x.code && x.where); }
  assert.ok(j.open[0].text && j.open[0].reason && (j.open[0].helper || j.open[0].target));
  assert.strictEqual(j.quote.total, 5000); assert.strictEqual(j.ut, null); assert.strictEqual(j.sim, null);
  assert.ok(typeof j.problem.pct === "number");
  b.srv.close();
});

test("bedah: file bukan PDF di kolom laporan ditolak, jenis salah dilewati dengan peringatan", async () => {
  const b = await boot();
  const fd = new FormData(); fd.append("file", new Blob([await docx("x")]), "t.docx"); fd.append("ai", new Blob(["bukan pdf"]), "a.pdf");
  const r = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd, headers: b.H });
  assert.strictEqual(r.status, 415);
  const fd2 = new FormData(); fd2.append("file", new Blob([await docx("x")]), "t.pdf.exe");
  assert.strictEqual((await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: fd2, headers: b.H })).status, 415);
  const r3 = await fetch(b.base + "/ms/bedah/upload", { method: "POST", body: new FormData(), headers: b.H });
  assert.strictEqual(r3.status, 400);
  b.srv.close();
});

test("bedah: pesan, bayar, lalu hasil lengkap dan unduhan Word terbuka; sebelum bayar tertutup", async () => {
  const b = await boot();
  const { j } = await up(b, "Menurut para ahli, hal ini sangat penting dalam kehidupan sehari-hari dan berbagai aspek.");
  const o = await (await fetch(b.base + "/ms/bedah/order", { method: "POST", headers: b.J, body: JSON.stringify({ uploadId: j.uploadId, wa: "081234567899", agree: true }) })).json();
  assert.ok(o.token && o.total >= 5000 && o.total <= 5099, "harga paket + kode unik");
  assert.strictEqual((await fetch(b.base + "/ms/bedah/report/" + o.token)).status, 402);
  assert.strictEqual((await fetch(b.base + "/ms/bedah/download/" + o.token)).status, 402);
  b.setAdmin(true);
  assert.strictEqual((await fetch(b.base + "/ms/admin/parafrase/orders/" + o.orderId + "/confirm", { method: "POST", headers: b.J, body: "{}" })).status, 200);
  const st = await (await fetch(b.base + "/ms/parafrase/order/" + o.token)).json();
  assert.strictEqual(st.docType, "bedah"); assert.strictEqual(st.bedahReady, true); assert.strictEqual(st.queue, null);
  const rep = await (await fetch(b.base + "/ms/bedah/report/" + o.token)).json();
  assert.strictEqual(rep.findings.length, j.totalFindings);
  assert.ok(rep.findings.every(f => f.text && f.reason));
  const dl = await fetch(b.base + "/ms/bedah/download/" + o.token);
  assert.strictEqual(dl.status, 200);
  assert.ok(/wordprocessingml/.test(dl.headers.get("content-type")));
  assert.strictEqual(Buffer.from(await dl.arrayBuffer()).slice(0, 2).toString(), "PK");
  b.srv.close();
});

test("bedah: izin data menyimpan set, kode mencabut dan menghapus", async () => {
  const b = await boot();
  // tanpa laporan UT tidak ada yang disimpan walau izin dicentang
  const a = await up(b, "x", true); assert.strictEqual(a.j.kode, null);
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

test("bedah: peta dokumen, perbandingan UT vs modul, dan CTA parafrase ada di kode", () => {
  const fs = require("fs"), path = require("path"), r = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  assert.match(r("parafrase/bedah.js"), /docMap, compare \}\);/);
  assert.match(r("parafrase/pages/bedah.html"), /id="mapCard"/);
  assert.match(r("parafrase/pages/bedah.html"), /href="\/ruangakademikut\/cek-parafrase-mandiri">Buka Cek/);
  assert.match(r("parafrase/pages/bedah.js"), /hanya ditandai UT/);
});
test("layanan revisi ikut ditutup secara bawaan", () => {
  const s = require("fs").readFileSync(require("path").join(__dirname, "..", "parafrase", "settings.js"), "utf8");
  assert.match(s, /revisi_tugas,revisi_diskusi,revisi_metopen/);
});
