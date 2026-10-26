"use strict";
/* Alur layanan end-to-end (data uji di memori, tanpa pembayaran asli): Tugas, Diskusi, Metopen, Revisi, Audit Dokumen, Cek Pesanan. */
const test = require("node:test"), assert = require("node:assert");
const { boot, docx, jpg } = require("./pf-helper");

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
let wa = 0; const nextWa = () => "0813555" + String(10000 + wa++).slice(1).padStart(5, "0");

async function layanan(t, o = {}) {
  const fd = new FormData();
  fd.append("service", o.service ?? "tugas"); fd.append("wa", o.wa ?? nextWa()); fd.append("agree", String(o.agree ?? true));
  fd.append("brief", o.brief ?? "Kerjakan soal tugas 1 mata kuliah Pengantar Bisnis"); if (o.parentId) fd.append("parentId", o.parentId);
  for (const f of o.files || []) fd.append("files", new Blob([f.buf]), f.name);
  const r = await fetch(t.base + "/ms/layanan/order", { method: "POST", headers: t.H, body: fd });
  return { r, j: await r.json() };
}
const confirm = async (t, id, token) => {
  const fd = new FormData(); fd.append("proof", new Blob([await jpg(Math.floor(Math.random() * 200) + 20)]), "b.jpg");
  assert.strictEqual((await fetch(t.base + "/ms/parafrase/order/" + token + "/proof", { method: "POST", headers: t.H, body: fd })).status, 200);
  t.setAdmin(true);
  const r = await fetch(t.base + `/ms/admin/parafrase/orders/${id}/confirm`, { method: "POST", headers: t.J, body: "{}" });
  assert.strictEqual(r.status, 200);
};
const view = async (t, token) => (await fetch(t.base + "/ms/parafrase/order/" + token)).json();

test("harga layanan: frontend (config) sama dengan backend, mengikuti pengaturan admin, klien tidak bisa menentukan harga", async () => {
  const t = await boot({ unique_code_enabled: false });
  try {
    const cfg = await (await fetch(t.base + "/ms/layanan/config")).json();
    const pub = await (await fetch(t.base + "/ms/public-config")).json();
    for (const k of Object.keys(cfg)) assert.strictEqual(cfg[k].price, pub["price_" + k], "harga " + k + " harus sama dengan pengaturan publik");
    for (const k of ["tugas", "diskusi", "metopen1", "metopen2", "metopen3", "metopen4", "metopen_paket"]) {
      const { r, j } = await layanan(t, { service: k });
      assert.strictEqual(r.status, 200, k); assert.strictEqual(j.total, cfg[k].price, "total server untuk " + k);
    }
    t.m.settings.set({ price_tugas: 55000 }, "admin");
    assert.strictEqual((await (await fetch(t.base + "/ms/layanan/config")).json()).tugas.price, 55000);
    const fd = new FormData(); fd.append("service", "tugas"); fd.append("wa", nextWa()); fd.append("agree", "true"); fd.append("brief", "kerjakan tugas ini"); fd.append("total", "1"); fd.append("price", "1");
    const r = await fetch(t.base + "/ms/layanan/order", { method: "POST", headers: t.H, body: fd });
    assert.strictEqual((await r.json()).total, 55000, "harga dari klien diabaikan");
  } finally { t.srv.close(); }
});

test("validasi pesanan layanan: layanan, WA, persetujuan, kebutuhan, jenis file, jumlah file", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await layanan(t, { service: "ngawur" })).r.status, 400);
    assert.strictEqual((await layanan(t, { wa: "12345" })).r.status, 400);
    assert.strictEqual((await layanan(t, { agree: false })).r.status, 400);
    assert.strictEqual((await layanan(t, { brief: "x" })).r.status, 400);
    assert.strictEqual((await layanan(t, { files: [{ name: "a.exe", buf: Buffer.from("MZ....") }] })).r.status, 415);
    assert.strictEqual((await layanan(t, { files: [{ name: "a.pdf", buf: Buffer.from("bukan pdf") }] })).r.status, 415, "ekstensi pdf tapi isi bukan pdf");
    assert.strictEqual((await layanan(t, { files: [1, 2, 3, 4].map(i => ({ name: `f${i}.pdf`, buf: PDF })) })).r.status, 400);
    const ok = await layanan(t, { files: [{ name: "soal.pdf", buf: PDF }, { name: "contoh.docx", buf: await docx() }] });
    assert.strictEqual(ok.r.status, 200); assert.match(ok.j.orderId, /^NA-\d+$/); assert.match(ok.j.url, /^\/ruangakademikut\/pesanan\/[a-f0-9]{48}$/);
    const noOrigin = await fetch(t.base + "/ms/layanan/order", { method: "POST", body: new FormData() });
    assert.strictEqual(noOrigin.status, 403);
  } finally { t.srv.close(); }
});

test("pesanan layanan: bayar, konfirmasi admin, kerjakan, kirim hasil, status di halaman pesanan, unduh hasil", async () => {
  const t = await boot();
  try {
    const { j } = await layanan(t, { service: "diskusi" });
    let v = await view(t, j.token);
    assert.deepStrictEqual([v.status, v.paid, v.docType, v.service, v.resultReady], ["menunggu_bayar", false, "layanan", "diskusi", false]);
    assert.strictEqual(v.merchantName, "CATATAN TERBUKA");
    t.setAdmin(false);
    assert.strictEqual((await fetch(t.base + "/ms/admin/layanan")).status, 401, "admin layanan butuh login");
    await confirm(t, j.orderId, j.token);
    v = await view(t, j.token); assert.deepStrictEqual([v.status, v.paid], ["baru_dibayar", true]);
    const mulai = id => fetch(t.base + `/ms/admin/layanan/${id}/mulai`, { method: "POST", headers: t.J, body: "{}" });
    assert.strictEqual((await mulai(j.orderId)).status, 200); assert.strictEqual((await mulai(j.orderId)).status, 409);
    const fd = new FormData(); fd.append("text", "Jawaban diskusi uji."); fd.append("file", new Blob([PDF]), "hasil.pdf");
    assert.strictEqual((await fetch(t.base + `/ms/admin/layanan/${j.orderId}/hasil`, { method: "POST", headers: t.H, body: fd })).status, 200);
    v = await view(t, j.token); assert.deepStrictEqual([v.status, v.resultReady, v.resultText], ["terkirim", true, "Jawaban diskusi uji."]);
    const dl = await fetch(t.base + `/ms/parafrase/order/${j.token}/result`); assert.strictEqual(dl.status, 200);
    assert.ok(Buffer.from(await dl.arrayBuffer()).slice(0, 4).toString() === "%PDF");
  } finally { t.srv.close(); }
});

test("hasil layanan tidak terbuka sebelum dibayar, dan hasil admin ditolak untuk pesanan belum dibayar", async () => {
  const t = await boot();
  try {
    const { j } = await layanan(t, { service: "tugas" });
    assert.strictEqual((await fetch(t.base + `/ms/parafrase/order/${j.token}/result`)).status, 410);
    t.setAdmin(true);
    const fd = new FormData(); fd.append("text", "bocor?");
    assert.strictEqual((await fetch(t.base + `/ms/admin/layanan/${j.orderId}/hasil`, { method: "POST", headers: t.H, body: fd })).status, 409);
    assert.strictEqual((await view(t, j.token)).resultText, null);
  } finally { t.srv.close(); }
});

test("revisi: gratis sekali untuk hasil kami, harus nomor WA yang sama, jenis cocok, revisi dari luar berbayar", async () => {
  const t = await boot({ unique_code_enabled: false });
  try {
    const WA = nextWa();
    const a = (await layanan(t, { service: "tugas", wa: WA })).j;
    assert.strictEqual((await layanan(t, { service: "revisi_tugas", wa: WA, parentId: a.orderId, brief: "Tolong perbaiki bagian 2" })).r.status, 409, "belum selesai");
    await confirm(t, a.orderId, a.token);
    t.setAdmin(true);
    await fetch(t.base + `/ms/admin/layanan/${a.orderId}/mulai`, { method: "POST", headers: t.J, body: "{}" });
    const fd = new FormData(); fd.append("text", "hasil"); await fetch(t.base + `/ms/admin/layanan/${a.orderId}/hasil`, { method: "POST", headers: t.H, body: fd });
    assert.strictEqual((await layanan(t, { service: "revisi_tugas", wa: nextWa(), parentId: a.orderId, brief: "perbaiki" })).r.status, 404, "WA berbeda");
    assert.strictEqual((await layanan(t, { service: "revisi_diskusi", wa: WA, parentId: a.orderId, brief: "perbaiki" })).r.status, 404, "jenis tidak cocok");
    const gratis = await layanan(t, { service: "revisi_tugas", wa: WA, parentId: a.orderId, brief: "Tolong perbaiki bagian 2" });
    assert.strictEqual(gratis.r.status, 200); assert.strictEqual(gratis.j.free, true); assert.strictEqual(gratis.j.total, 0);
    assert.strictEqual((await view(t, gratis.j.token)).status, "baru_dibayar");
    assert.strictEqual((await layanan(t, { service: "revisi_tugas", wa: WA, parentId: a.orderId, brief: "perbaiki lagi bagian 3" })).r.status, 409, "revisi gratis kedua");
    const luar = await layanan(t, { service: "revisi_tugas", wa: WA, brief: "masukan tutor", files: [{ name: "lama.pdf", buf: PDF }] });
    assert.strictEqual(luar.r.status, 200); assert.strictEqual(luar.j.free, false); assert.strictEqual(luar.j.total, 25000);
    assert.strictEqual((await layanan(t, { service: "revisi_tugas", wa: nextWa(), brief: "tanpa file dan tanpa ID" })).r.status, 400);
  } finally { t.srv.close(); }
});

test("audit dokumen: unggah ringkas, pesanan lengkap, hasil terkunci sampai dibayar lalu terbuka (membawa skor)", async () => {
  const t = await boot();
  try {
    const fd = new FormData(); fd.append("file", new Blob([await docx()]), "skripsi.docx");
    let r = await fetch(t.base + "/ms/audit/upload", { method: "POST", headers: t.H, body: fd }); const up = await r.json();
    assert.strictEqual(r.status, 200, JSON.stringify(up)); assert.ok(up.score && typeof up.score.value === "number"); assert.ok(up.quote.total >= up.quote.min);
    assert.ok(up.findings.every(f => !("detail" in f)), "ringkas tidak membocorkan penjelasan");
    const bad = new FormData(); bad.append("file", new Blob(["x"]), "a.pdf");
    assert.strictEqual((await fetch(t.base + "/ms/audit/upload", { method: "POST", headers: t.H, body: bad })).status, 415);
    assert.strictEqual((await fetch(t.base + "/ms/audit/upload", { method: "POST", body: fd })).status, 403);
    const o = await (await fetch(t.base + "/ms/audit/order", { method: "POST", headers: t.J, body: JSON.stringify({ uploadId: up.uploadId, wa: nextWa(), agree: true }) })).json();
    assert.ok(o.token && o.total >= up.quote.min);
    assert.strictEqual((await fetch(t.base + `/ms/audit/report/${o.token}`)).status, 402, "terkunci sebelum bayar");
    await confirm(t, o.orderId, o.token);
    const rep = await fetch(t.base + `/ms/audit/report/${o.token}`); assert.strictEqual(rep.status, 200);
    const d = await rep.json(); assert.ok(d.score && d.findings.every(f => f.detail), "lengkap membawa penjelasan");
  } finally { t.srv.close(); }
});

test("cek pesanan: ID + WA cocok membuka pesanan, salah ditolak, token ngawur 404, halaman pesanan noindex", async () => {
  const t = await boot();
  try {
    const WA = nextWa(), { j } = await layanan(t, { wa: WA });
    const lk = body => fetch(t.base + "/ms/parafrase/lookup", { method: "POST", headers: t.J, body: JSON.stringify(body) });
    const ok = await lk({ orderId: j.orderId.toLowerCase(), wa: WA.replace(/^0/, "+62") }); assert.strictEqual(ok.status, 200); assert.strictEqual((await ok.json()).url, j.url);
    assert.strictEqual((await lk({ orderId: j.orderId, wa: nextWa() })).status, 404);
    assert.strictEqual((await lk({ orderId: "NA-1", wa: "" })).status, 404);
    assert.strictEqual((await fetch(t.base + "/ms/parafrase/order/" + "0".repeat(48))).status, 404);
    const html = await (await fetch(t.base + "/ruangakademikut/pesanan")).text();
    assert.match(html, /name="robots" content="noindex"/);
  } finally { t.srv.close(); }
});
