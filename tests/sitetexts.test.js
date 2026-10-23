"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { open } = require("../parafrase/db");
const { create } = require("../parafrase/settings");
const createTexts = require("../parafrase/sitetexts");
const { labelFor } = require("../parafrase/layanan");

const DIR = path.join(__dirname, "..", "parafrase", "pages");
const mk = () => { const db = open(":memory:"); return { db, t: createTexts({ db, dir: DIR }), s: create(db) }; };

test("pindai menemukan teks halaman publik dan melewati script/elemen ber-id", () => {
  const { t } = mk(), items = t.scan();
  assert.ok(items.length > 50);
  assert.ok(items.every(i => !/[<>]/.test(i.orig)));
});

test("ganti teks berlaku global, di-escape, dan bisa dikembalikan", () => {
  const { t } = mk(), any = t.scan().find(i => i.orig.length > 4 && i.pages.length);
  assert.deepStrictEqual(t.set(any.orig, 'Nama "baru" & bagus', "tester"), { ok: true });
  const html = t.apply(`<h2>${any.orig}</h2><script>var a="${any.orig}"</script>`);
  assert.ok(html.includes("<h2>Nama &quot;baru&quot; &amp; bagus</h2>"));
  assert.ok(html.includes(`var a="${any.orig}"`), "script tidak boleh diubah");
  assert.strictEqual(t.log(5)[0].by, "tester");
  t.reset(any.orig, "tester");
  assert.strictEqual(t.apply(`<h2>${any.orig}</h2>`), `<h2>${any.orig}</h2>`);
});

test("validasi: kosong, tanda < >, terlalu panjang, dan teks tak dikenal ditolak", () => {
  const { t } = mk(), any = t.scan()[0].orig;
  assert.throws(() => t.set(any, "  "), /tidak boleh kosong/);
  assert.throws(() => t.set(any, "<b>x</b>"), /tanpa tanda/);
  assert.throws(() => t.set(any, "x".repeat(t.MAX + 1)), /terlalu panjang/);
  assert.throws(() => t.set("teks yang tidak pernah ada di situs ini", "x"), /tidak dikenal/);
});

test("elemen ber-id atau data-* tidak diganti", () => {
  const { t } = mk(); t.registerExtra(["Contoh teks tetap"]);
  t.set("Contoh teks tetap", "Diganti");
  const out = t.apply('<span id="p">Contoh teks tetap</span><b data-x="1">Contoh teks tetap</b><i>Contoh teks tetap</i>');
  assert.strictEqual(out, '<span id="p">Contoh teks tetap</span><b data-x="1">Contoh teks tetap</b><i>Diganti</i>');
});

test("kartu hub dapat disembunyikan", () => {
  const { t } = mk(), cards = t.cards();
  assert.ok(cards.length >= 5);
  const fs = require("fs"), hub = fs.readFileSync(path.join(DIR, "hub.html"), "utf8");
  const out = t.hideCards(hub, [cards[0].slug]);
  assert.ok(out.length < hub.length && !out.includes(`data-slug="${cards[0].slug}"`));
  assert.strictEqual(t.hideCards(hub, []), hub);
});

test("nama layanan buatan admin dipakai, kosong = nama bawaan", () => {
  const { s } = mk(), def = labelFor(s, "tugas");
  assert.ok(def && def !== "tugas");
  s.set({ label_tugas: "Tugas Mandiri" });
  assert.strictEqual(labelFor(s, "tugas"), "Tugas Mandiri");
  s.set({ label_tugas: "" });
  assert.strictEqual(labelFor(s, "tugas"), def);
  assert.throws(() => s.set({ label_tugas: "<img>" }), /format tidak valid/);
});
