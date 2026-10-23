"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { boot, jpg } = require("./pf-helper");

test("SEMUA rute admin parafrase menolak permintaan tanpa login (diaudit otomatis dari daftar rute)", async () => {
  const t = await boot();
  try {
    const routes = [];
    const app = t.srv._events.request;
    for (const l of app._router.stack) if (l.route && /\/ms\/admin\/parafrase/.test(l.route.path)) for (const m of Object.keys(l.route.methods)) routes.push([m.toUpperCase(), l.route.path]);
    assert.ok(routes.length >= 14, "rute admin terlalu sedikit terdeteksi: " + routes.length);
    for (const [m, p] of routes) {
      const url = t.base + p.replace(":id", "NA-1001");
      const r = await fetch(url, { method: m, headers: m === "GET" ? {} : t.J, body: m === "GET" ? undefined : "{}" });
      assert.strictEqual(r.status, 401, `${m} ${p} harus 401, dapat ${r.status}`);
    }
  } finally { t.srv.close(); }
});

test("rute publik tidak membocorkan jalur berkas, hash IP, atau isi dokumen", async () => {
  // 1 kalimat contoh terbuka: kalimat lain (berisi "digitalisasi") wajib tetap tersamar. Production memakai 5 (bawaan) dan diuji terpisah.
  const t = await boot({ preview_open_sentences: 1 });
  try {
    const j = await (await t.order(await t.upload("sec"))).json();
    await t.proof(j.token, await jpg(60));
    const txts = [];
    for (const u of ["/ms/public-config", `/ms/parafrase/order/${j.token}`, `/ms/parafrase/order/${j.token}/preview`]) txts.push(await (await fetch(t.base + u)).text());
    const all = txts.join("\n");
    for (const bad of ["proofs/", "docs/", "data/private", "proof_hash", "ip_hash", "digitalisasi", "\"wa_number\"", "public_token"]) assert.ok(!all.includes(bad), "bocor: " + bad);
    assert.ok(!all.includes("6281234567890"), "nomor WA murid tidak boleh tampil di respons publik");
  } finally { t.srv.close(); }
});

const W = "081211112222";
test("pembatasan: maks 3 pesanan belum dibayar per nomor, maks 1 jalur cepat belum dibayar per nomor", async () => {
  const t = await boot();
  try {
    assert.strictEqual((await t.order(await t.upload("a1"), { fast: true, wa: W })).status, 200);
    assert.strictEqual((await t.order(await t.upload("a2"), { fast: true, wa: W })).status, 409);
    assert.strictEqual((await t.order(await t.upload("a3"), { wa: W })).status, 200);
    assert.strictEqual((await t.order(await t.upload("a4"), { wa: W })).status, 200);
    assert.strictEqual((await t.order(await t.upload("a5"), { wa: W })).status, 429);
    assert.strictEqual((await t.order(await t.upload("a6"), { wa: "081299990000" })).status, 200); // nomor lain tidak terpengaruh
  } finally { t.srv.close(); }
});

test("pengaturan: jalur QRIS tidak boleh keluar dari folder privat", () => {
  const { coerce } = require("../parafrase/settings");
  for (const bad of ["../x.png", "qris/../../etc/passwd", "/etc/passwd"]) assert.throws(() => coerce("qris_image_path", bad), /tidak valid/, bad);
  assert.strictEqual(coerce("qris_image_path", "qris/qris.png"), "qris/qris.png");
});

test("tanpa Origin, semua POST publik ditolak (CSRF)", async () => {
  const t = await boot();
  try {
    const j = await (await t.order(await t.upload("csrf"))).json();
    for (const [u, body] of [["/ms/parafrase/order", "{}"], ["/ms/parafrase/lookup", "{}"]]) {
      const r = await fetch(t.base + u, { method: "POST", headers: { "content-type": "application/json" }, body }); assert.strictEqual(r.status, 403, u);
    }
    const fd = new FormData(); fd.append("proof", new Blob([await jpg(5)]), "b.jpg");
    assert.strictEqual((await fetch(t.base + `/ms/parafrase/order/${j.token}/proof`, { method: "POST", body: fd })).status, 403);
  } finally { t.srv.close(); }
});
