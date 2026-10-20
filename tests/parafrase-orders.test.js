"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { boot, docx, jpg } = require("./pf-helper");

test("pesanan: harga dari server, kode unik, WA dinormalkan, validasi", async () => {
  const t = await boot();
  try {
    const id = await t.upload("a");
    let r = await t.order(id, { total: 1, wa: "123" }); assert.strictEqual(r.status, 400);
    r = await t.order(id, { agree: false }); assert.strictEqual(r.status, 400);
    r = await t.order(id, { deadline: Date.now() - 1000 }); assert.strictEqual(r.status, 400);
    r = await t.order(id, { total: 1, price: 1, wa: "081234567890" }); assert.strictEqual(r.status, 200);
    const j = await r.json();
    assert.ok(/^NA-\d+$/.test(j.orderId) && j.token.length === 48);
    assert.strictEqual(j.total, 30000 + j.uniqueCode); // kata sedikit -> minimum; klien tidak bisa menentukan total
    assert.ok(j.uniqueCode >= 1 && j.uniqueCode <= 99);
    const row = t.m.db.prepare("SELECT wa_number,status,lane FROM orders WHERE id=?").get(j.orderId);
    assert.deepStrictEqual([row.wa_number, row.status, row.lane], ["6281234567890", "menunggu_bayar", "biasa"]);
    assert.strictEqual((await t.order(id)).status, 409); // dokumen sama tidak bisa dipakai dua kali
    assert.ok(t.m.db.prepare("SELECT COUNT(*) n FROM findings WHERE order_id=?").get(j.orderId).n > 0);
    const v = await (await fetch(t.base + "/ms/parafrase/order/" + j.token)).json();
    assert.strictEqual(v.total, j.total); assert.ok(!JSON.stringify(v).includes("proofs/"));
    assert.strictEqual((await fetch(t.base + "/ms/parafrase/order/" + "0".repeat(48))).status, 404);
  } finally { t.srv.close(); }
});

test("kode unik tidak bentrok antar pesanan aktif", async () => {
  const t = await boot({ unique_code_max: 5 });
  try {
    const seen = new Set();
    for (let i = 0; i < 5; i++) { const j = await (await t.order(await t.upload("u" + i))).json(); assert.ok(!seen.has(j.total)); seen.add(j.total); }
    assert.strictEqual((await t.order(await t.upload("u9"))).status, 503);
  } finally { t.srv.close(); }
});

test("jalur cepat: slot dibatasi, penuh ditolak, kedaluwarsa melepas slot", async () => {
  const t = await boot({ fast_lane_daily_cap: 1 });
  try {
    let r = await t.order(await t.upload("f1"), { fast: true }); assert.strictEqual(r.status, 200);
    const j = await r.json(); assert.strictEqual(j.total, 60000 + j.uniqueCode);
    r = await t.order(await t.upload("f2"), { fast: true }); assert.strictEqual(r.status, 409);
    assert.strictEqual((await r.json()).code, "fast_full");
    assert.strictEqual((await t.order(await t.upload("f3"), { fast: false })).status, 200);
    assert.strictEqual(await t.m.orders.expireUnpaid(Date.now() + 2 * 3600e3), 2);
    assert.strictEqual(t.m.settings.fastLaneUsed(), 0);
    assert.strictEqual(t.m.db.prepare("SELECT status FROM orders WHERE id=?").get(j.orderId).status, "kedaluwarsa");
  } finally { t.srv.close(); }
});

test("bukti bayar: EXIF dibuang, duplikat ditolak, antrean mengikuti waktu bukti, tolak lalu unggah ulang", async () => {
  const t = await boot();
  try {
    const a = await (await t.order(await t.upload("p1"))).json(), b = await (await t.order(await t.upload("p2"))).json();
    const bufA = await jpg(200);
    assert.strictEqual((await t.proof(a.token, Buffer.from("bukan gambar"))).status, 400);
    assert.strictEqual((await t.proof(a.token, bufA)).status, 200);
    const stored = fs.readFileSync(path.join(t.root, "data", "private", t.m.db.prepare("SELECT proof_path p FROM orders WHERE id=?").get(a.orderId).p));
    assert.ok(!stored.includes("RAHASIA-EXIF"), "EXIF bocor");
    assert.strictEqual((await t.proof(b.token, bufA)).status, 409); // foto sama di pesanan lain
    const qa = t.m.db.prepare("SELECT queue_time,status FROM orders WHERE id=?").get(a.orderId);
    assert.strictEqual(qa.status, "menunggu_verifikasi"); assert.ok(qa.queue_time > 0);
    // admin
    assert.strictEqual((await fetch(t.base + "/ms/admin/parafrase/orders")).status, 401);
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${a.orderId}/proof`)).status, 401);
    t.setAdmin(true);
    let r = await fetch(t.base + `/ms/admin/parafrase/orders/${a.orderId}/reject`, { method: "POST", headers: t.J, body: JSON.stringify({ reason: "Nominal kurang" }) });
    assert.strictEqual(r.status, 200);
    let v = await (await fetch(t.base + "/ms/parafrase/order/" + a.token)).json();
    assert.deepStrictEqual([v.status, v.rejectReason, v.proofUploaded], ["menunggu_bayar", "Nominal kurang", false]);
    assert.strictEqual((await t.proof(a.token, await jpg(150))).status, 200);
    r = await fetch(t.base + `/ms/admin/parafrase/orders/${a.orderId}/confirm`, { method: "POST", headers: t.J, body: "{}" });
    assert.strictEqual(r.status, 200); assert.strictEqual((await r.json()).order.status, "baru_dibayar");
    assert.strictEqual((await fetch(t.base + `/ms/admin/parafrase/orders/${a.orderId}/confirm`, { method: "POST", headers: t.J, body: "{}" })).status, 409);
    assert.strictEqual((await t.proof(a.token, await jpg(100))).status, 409); // sudah dikonfirmasi
    const list = await (await fetch(t.base + "/ms/admin/parafrase/orders?status=baru_dibayar")).json();
    assert.strictEqual(list.orders.length, 1);
  } finally { t.srv.close(); }
});

test("pratinjau pesanan: terkunci sebelum konfirmasi, terbuka sesudahnya", async () => {
  const t = await boot();
  try {
    const o = await (await t.order(await t.upload("z"))).json();
    const pv = async () => (await fetch(t.base + `/ms/parafrase/order/${o.token}/preview`)).text();
    let txt = await pv();
    const locked = JSON.parse(txt).paragraphs.flatMap(p => p.segments).filter(x => x.locked).map(x => x.text).join(" ");
    assert.ok(locked.length > 50);
    for (const w of ["digitalisasi", "efisiensi", "implementasi", "perusahaan", "koordinasi"]) assert.ok(!locked.includes(w), "bocor " + w);
    assert.ok(JSON.parse(txt).locked);
    assert.strictEqual((await t.proof(o.token, await jpg(77))).status, 200);
    assert.ok(JSON.parse(await pv()).locked, "menunggu verifikasi masih terkunci");
    t.m.orders.confirmPayment(o.orderId, "admin");
    const open = JSON.parse(await pv());
    assert.strictEqual(open.locked, false);
    assert.ok(JSON.stringify(open).includes("digitalisasi proses bisnis"));
  } finally { t.srv.close(); }
});

test("QRIS: unggah admin, tersaji publik, jalur berkas tidak bocor", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await fetch(t.base + "/ms/parafrase/qris")).status, 404);
    const fd = new FormData(); fd.append("qris", new Blob([await jpg(30)]), "q.jpg");
    assert.strictEqual((await fetch(t.base + "/ms/admin/parafrase/qris", { method: "POST", body: fd, headers: t.H })).status, 401);
    t.setAdmin(true);
    assert.strictEqual((await fetch(t.base + "/ms/admin/parafrase/qris", { method: "POST", body: fd, headers: t.H })).status, 200);
    const r = await fetch(t.base + "/ms/parafrase/qris"); assert.strictEqual(r.status, 200);
    assert.strictEqual(r.headers.get("content-type"), "image/png");
    const cfg = await (await fetch(t.base + "/ms/public-config")).json();
    assert.strictEqual(cfg.has_qris, true); assert.ok(!JSON.stringify(cfg).includes("qris.png"));
  } finally { t.srv.close(); }
});
