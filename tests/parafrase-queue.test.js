"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { boot, jpg } = require("./pf-helper");

async function paid(t, tag, opts = {}) {
  const j = await (await t.order(await t.upload(tag), opts)).json();
  assert.ok(j.token, JSON.stringify(j));
  assert.strictEqual((await t.proof(j.token, await jpg(Math.floor(Math.random() * 200) + 20))).status, 200);
  t.m.orders.confirmPayment(j.orderId, "admin");
  return j;
}
const view = async (t, j) => (await (await fetch(t.base + "/ms/parafrase/order/" + j.token)).json());
const sleep = ms => new Promise(r => setTimeout(r, ms));

test("antrean: biasa urut waktu bukti, cepat menyalip, dikerjakan tidak tergeser, deadline tidak berpengaruh", async () => {
  const t = await boot();
  try {
    const A = await paid(t, "a", { deadline: Date.now() + 5 * 86400e3 }); await sleep(5);
    const B = await paid(t, "b", { deadline: Date.now() + 3600e3 * 30 }); await sleep(5);   // deadline lebih dekat, tetap di belakang A
    assert.deepStrictEqual([(await view(t, A)).queue.position, (await view(t, B)).queue.position], [1, 2]);
    const F = await paid(t, "f", { fast: true });                                          // cepat menyalip biasa
    assert.deepStrictEqual([(await view(t, F)).queue.position, (await view(t, A)).queue.position, (await view(t, B)).queue.position], [1, 2, 3]);
    t.m.orders.startWork(A.orderId);                                                       // A dikerjakan: tidak boleh tergeser
    const F2 = await paid(t, "f2", { fast: true });
    const pos = async j => (await view(t, j)).queue.position;
    assert.deepStrictEqual([await pos(A), await pos(F), await pos(F2), await pos(B)], [1, 2, 3, 4]);
    assert.strictEqual((await view(t, A)).queue.working, true);
    assert.ok((await view(t, B)).queue.etaHours >= 1);
    t.setAdmin(true);
    const q = await (await fetch(t.base + "/ms/admin/parafrase/queue")).json();
    assert.deepStrictEqual(q.queue.map(x => x.orderId), [A.orderId, F.orderId, F2.orderId, B.orderId]);
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${B.orderId}/start`, { method: "POST", headers: t.J, body: "{}" })).status, 200);
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${B.orderId}/start`, { method: "POST", headers: t.J, body: "{}" })).status, 409);
  } finally { t.srv.close(); }
});

test("Cek Pesanan: cocok ID + WA saja, salah/terlalu sering dibatasi", async () => {
  const t = await boot();
  try {
    const j = await (await t.order(await t.upload("l"))).json();
    const look = (orderId, wa) => fetch(t.base + "/ms/parafrase/lookup", { method: "POST", headers: t.J, body: JSON.stringify({ orderId, wa }) });
    let r = await look(j.orderId.toLowerCase(), "0812-3456-7890"); assert.strictEqual(r.status, 200);
    assert.ok((await r.json()).url.endsWith(j.token));
    assert.strictEqual((await look(j.orderId, "081200000000")).status, 404);
    assert.strictEqual((await look("NA-99999", "081234567890")).status, 404);
    assert.strictEqual((await fetch(t.base + "/ms/parafrase/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 403);
    let last; for (let i = 0; i < 14; i++) last = await look(j.orderId, "081200000001");
    assert.strictEqual(last.status, 429);
  } finally { t.srv.close(); }
});

test("WhatsApp: pesan masuk outbox tanpa duplikat; webhook mengirim; tanpa webhook = manual", async () => {
  const t = await boot();
  try {
    const j = await paid(t, "w");
    let rows = t.m.db.prepare("SELECT kind,status,to_number,text FROM wa_outbox WHERE order_id=?").all(j.orderId);
    assert.deepStrictEqual(rows.map(r => [r.kind, r.status, r.to_number]), [["dikonfirmasi", "manual", "6281234567890"]]);
    assert.ok(rows[0].text.includes(j.token));
    t.m.orders.confirmPayment; // idempoten: kirim ulang jenis sama tidak menggandakan
    const o = t.m.orders.byToken(j.token);
    assert.strictEqual(t.m.notifier.send("dikonfirmasi", o), false);
    // webhook
    const calls = []; const http = require("http");
    const hook = http.createServer((q, s) => { let b = ""; q.on("data", d => b += d); q.on("end", () => { calls.push({ auth: q.headers.authorization, body: JSON.parse(b) }); s.statusCode = 200; s.end("ok"); }); }).listen(0);
    process.env.PARAFRASE_WA_WEBHOOK = "http://127.0.0.1:" + hook.address().port; process.env.PARAFRASE_WA_SECRET = "rahasia";
    try {
      t.m.orders.startWork(j.orderId);
      assert.strictEqual(await t.m.notifier.flush(), 1);
      assert.strictEqual(calls[0].auth, "Bearer rahasia"); assert.strictEqual(calls[0].body.to, "6281234567890");
      assert.strictEqual(t.m.db.prepare("SELECT status FROM wa_outbox WHERE kind='dikerjakan'").get().status, "sent");
    } finally { delete process.env.PARAFRASE_WA_WEBHOOK; delete process.env.PARAFRASE_WA_SECRET; hook.close(); }
  } finally { t.srv.close(); }
});

test("retensi: pengingat 3 jam sebelum, file dihapus tepat waktu, unduhan ditolak sesudahnya", async () => {
  const t = await boot();
  const fs = require("fs"), path = require("path");
  try {
    const j = await paid(t, "r");
    const db = t.m.db, now = Date.now();
    const o = db.prepare("SELECT * FROM orders WHERE id=?").get(j.orderId);
    // simulasi hasil terkirim
    const resRel = `results/${j.orderId}.docx`; fs.mkdirSync(path.join(t.root, "data/private/results"), { recursive: true });
    fs.writeFileSync(path.join(t.root, "data/private", resRel), "isi hasil");
    db.prepare("UPDATE orders SET status='terkirim', result_path=?, result_name='Hasil.docx', sent_at=?, delete_at=? WHERE id=?").run(resRel, now, now + 24 * 3600e3, j.orderId);
    let r = await fetch(t.base + `/ms/parafrase/order/${j.token}/result`); assert.strictEqual(r.status, 200);
    assert.ok(r.headers.get("content-disposition").includes("Hasil.docx"));
    assert.strictEqual(await t.m.orders.sweepRetention(now + 10 * 3600e3), 0);
    assert.strictEqual(db.prepare("SELECT COUNT(*) n FROM wa_outbox WHERE kind='pengingat'").get().n, 0);
    assert.strictEqual(await t.m.orders.sweepRetention(now + 21.5 * 3600e3), 0);
    assert.strictEqual(db.prepare("SELECT COUNT(*) n FROM wa_outbox WHERE kind='pengingat'").get().n, 1);
    await t.m.orders.sweepRetention(now + 21.6 * 3600e3);
    assert.strictEqual(db.prepare("SELECT COUNT(*) n FROM wa_outbox WHERE kind='pengingat'").get().n, 1, "pengingat tidak boleh ganda");
    assert.strictEqual(await t.m.orders.sweepRetention(now + 25 * 3600e3), 1);
    for (const f of [o.original_file, resRel]) assert.ok(!fs.existsSync(path.join(t.root, "data/private", f)), f);
    assert.strictEqual(db.prepare("SELECT COUNT(*) n FROM findings WHERE order_id=? AND text<>''").get(j.orderId).n, 0);
    db.prepare("UPDATE orders SET delete_at=? WHERE id=?").run(now - 1, j.orderId);
    assert.strictEqual((await fetch(t.base + `/ms/parafrase/order/${j.token}/result`)).status, 410);
    assert.strictEqual((await (await fetch(t.base + `/ms/parafrase/order/${j.token}`)).json()).filesDeleted, true);
  } finally { t.srv.close(); }
});

test("alur admin: Word berwarna -> unggah revisi -> cek ulang -> kirim bersih -> unduh murid", async () => {
  const t = await boot();
  const JSZip = require("jszip");
  try {
    const j = await paid(t, "alur");
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${j.orderId}/colored`)).status, 401);
    t.setAdmin(true);
    t.m.orders.startWork(j.orderId);
    let r = await fetch(t.base + `/ms/admin/parafrase/orders/${j.orderId}/colored`); assert.strictEqual(r.status, 200);
    const colored = Buffer.from(await r.arrayBuffer());
    const z = await JSZip.loadAsync(colored); assert.ok(z.file("word/comments.xml"));
    // admin "merevisi": ganti kalimat bertanda
    let doc = await z.file("word/document.xml").async("string");
    doc = doc.replace("Menurut para ahli, koordinasi antardivisi selalu menentukan keberhasilan implementasi strategi perusahaan.", "Menurut Rahman (2020), koordinasi antardivisi berperan besar bagi strategi perusahaan.");
    z.file("word/document.xml", doc);
    const revised = await z.generateAsync({ type: "nodebuffer" });
    const up = async buf => { const fd = new FormData(); fd.append("file", new Blob([buf]), "revisi.docx"); return fetch(t.base + `/ms/admin/parafrase/orders/${j.orderId}/revised`, { method: "POST", body: fd, headers: t.H }); };
    const bad = new FormData(); bad.append("file", new Blob(["x"]), "revisi.pdf");
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${j.orderId}/revised`, { method: "POST", body: bad, headers: t.H })).status, 400);
    r = await up(revised); assert.strictEqual(r.status, 200);
    const rep = (await r.json()).report; assert.ok(rep.unchangedSentences >= 0 && rep.note);
    assert.strictEqual(t.m.orders.byToken(j.token).status, "cek_ulang");
    r = await fetch(t.base + `/ms/admin/parafrase/orders/${j.orderId}/finalize`, { method: "POST", headers: t.J, body: "{}" }); assert.strictEqual(r.status, 200);
    const v = await (await fetch(t.base + "/ms/parafrase/order/" + j.token)).json();
    assert.deepStrictEqual([v.status, v.resultReady], ["terkirim", true]);
    const dl = await fetch(t.base + `/ms/parafrase/order/${j.token}/result`); assert.strictEqual(dl.status, 200);
    const out = await JSZip.loadAsync(Buffer.from(await dl.arrayBuffer()));
    const cd = await out.file("word/document.xml").async("string");
    assert.ok(cd.includes("Rahman (2020)") && !cd.includes("commentRange") && !cd.includes("0A0B0C") && !out.file("word/comments.xml"));
    const msg = t.m.db.prepare("SELECT text FROM wa_outbox WHERE kind='selesai'").get();
    assert.ok(msg && msg.text.includes(j.token));
    assert.ok(t.m.db.prepare("SELECT delete_at-sent_at d FROM orders WHERE id=?").get(j.orderId).d === 24 * 3600e3);
  } finally { t.srv.close(); }
});
