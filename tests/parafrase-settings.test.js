"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const { open } = require("../parafrase/db");
const { create } = require("../parafrase/settings");

const mk = () => { const db = open(":memory:"); return { db, s: create(db) }; };

test("migrasi: user_version naik dan bisa diulang", () => {
  const { db } = mk();
  assert.strictEqual(db.pragma("user_version", { simple: true }), 2);
  require("../parafrase/db").migrate(db);
  assert.strictEqual(db.pragma("user_version", { simple: true }), 2);
  for (const t of ["settings", "settings_log", "orders", "findings", "order_events", "fast_reservations", "uploads"])
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name=?").get(t), t);
});

test("default sesuai keputusan", () => {
  const { s } = mk(), v = s.getAll();
  assert.strictEqual(v.price_per_word, 17);
  assert.strictEqual(v.min_order_price, 30000);
  assert.strictEqual(v.fast_lane_price, 30000);
  assert.strictEqual(v.fast_lane_daily_cap, 5);
  assert.strictEqual(v.revision_price_per_word, 17);
  assert.strictEqual(v.retention_hours, 24);
  assert.strictEqual(v.file_max_mb, 25);
});

test("ubah nilai tercatat di log dengan nilai lama dan baru", () => {
  const { s } = mk();
  s.set({ fast_lane_daily_cap: 7 }, "admin", 1000);
  assert.strictEqual(s.get("fast_lane_daily_cap"), 7);
  const l = s.log();
  assert.strictEqual(l.length, 1);
  assert.deepStrictEqual([l[0].key, l[0].old_value, l[0].new_value, l[0].by], ["fast_lane_daily_cap", "5", "7", "admin"]);
  s.set({ fast_lane_daily_cap: 7 }, "admin"); // tidak berubah, tidak dicatat
  assert.strictEqual(s.log().length, 1);
});

test("validasi: nilai buruk ditolak dan tidak ada yang tersimpan", () => {
  const { s } = mk();
  assert.throws(() => s.set({ price_per_word: 20, fast_lane_daily_cap: 999 }), /fast_lane_daily_cap/);
  assert.strictEqual(s.get("price_per_word"), 17);
  assert.throws(() => s.set({ price_per_word: "abc" }));
  assert.throws(() => s.set({ price_per_word: 1.5 }));
  assert.throws(() => s.set({ tidak_ada: 1 }), /tidak dikenal/);
  assert.throws(() => s.set({ update_group_url: "http://x.com" }), /https/);
  assert.throws(() => s.set({ admin_wa_number: "0857-222" }));
  assert.strictEqual(s.set({ update_group_url: "https://chat.whatsapp.com/abc" }).update_group_url, "https://chat.whatsapp.com/abc");
  assert.strictEqual(s.set({ update_group_url: "" }).update_group_url, "");
});

test("publicConfig tidak membocorkan nilai internal", () => {
  const { s } = mk(); const p = s.publicConfig();
  for (const k of ["avg_words_per_hour", "long_sentence_words", "reminder_before_delete_hours", "unique_code_max", "qris_image_path"])
    assert.ok(!(k in p), k);
  assert.strictEqual(p.price_per_word, 17);
  assert.strictEqual(p.fast_lane.remaining, 5);
  assert.strictEqual(p.has_qris, false);
  assert.strictEqual(p.qris_merchant_name, "CATATAN TERBUKA");
  assert.ok(p.update_group_url.startsWith("https://chat.whatsapp.com/"));
  s.set({ qris_image_path: "private/qris.jpg" });
  assert.strictEqual(s.publicConfig().has_qris, true);
  assert.ok(!JSON.stringify(s.publicConfig()).includes("qris.jpg"));
});

test("slot jalur cepat: hitung harian WIB, reservasi kedaluwarsa dilepas, penuh = nonaktif", () => {
  const { db, s } = mk();
  const now = Date.UTC(2026, 9, 20, 5, 0, 0); // 12.00 WIB
  const ins = db.prepare(`INSERT INTO orders(id,public_token,wa_number,price_per_word,min_price,base_total,total,created_at,updated_at)
                          VALUES(?,?,?,?,?,?,?,?,?)`);
  const res = db.prepare("INSERT INTO fast_reservations(order_id,day,status,expires_at,created_at) VALUES(?,?,?,?,?)");
  s.set({ fast_lane_daily_cap: 2 });
  for (const id of ["NA-1", "NA-2", "NA-3"]) ins.run(id, "t" + id, "62811", 17, 30000, 30000, 30000, now, now);
  res.run("NA-1", s.wibDay(now), "confirmed", now, now);
  res.run("NA-2", s.wibDay(now), "reserved", now + 600000, now);   // masih berlaku
  res.run("NA-3", s.wibDay(now), "reserved", now - 1, now);        // sudah kedaluwarsa
  assert.strictEqual(s.fastLaneUsed(now), 2);
  const p = s.publicConfig(now);
  assert.strictEqual(p.fast_lane.remaining, 0);
  assert.strictEqual(p.fast_lane.full, true);
  assert.strictEqual(s.fastLaneUsed(now + 12 * 3600 * 1000), 0); // hari WIB berikutnya
  assert.strictEqual(s.wibDay(Date.UTC(2026, 9, 20, 17, 30)), "2026-10-21"); // 00.30 WIB
});

test("HTTP: publik terbuka, admin wajib login, perubahan terlihat murid", async () => {
  process.env.PARAFRASE_DB = ":memory:";
  const app = express();
  let authed = false;
  const requireAdmin = (req, res, next) => authed ? next() : res.status(401).json({ error: "x" });
  const tmp = require("fs").mkdtempSync(require("path").join(require("os").tmpdir(), "pf-"));
  require("../parafrase")({ app, express, requireAdmin, ROOT: tmp });
  const srv = app.listen(0); const base = "http://127.0.0.1:" + srv.address().port;
  try {
    let r = await fetch(base + "/ms/public-config"); assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).price_per_word, 17);
    r = await fetch(base + "/ms/admin/parafrase/settings"); assert.strictEqual(r.status, 401);
    r = await fetch(base + "/ms/admin/parafrase/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: { fast_lane_daily_cap: 7 } }) });
    assert.strictEqual(r.status, 401);
    authed = true;
    r = await fetch(base + "/ms/admin/parafrase/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: { fast_lane_daily_cap: 7 } }) });
    assert.strictEqual(r.status, 200);
    r = await fetch(base + "/ms/admin/parafrase/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: { fast_lane_daily_cap: 999 } }) });
    assert.strictEqual(r.status, 400);
    assert.strictEqual((await (await fetch(base + "/ms/public-config")).json()).fast_lane.cap, 7);
  } finally { srv.close(); }
});
