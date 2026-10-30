"use strict";
const test = require("node:test"), assert = require("node:assert");
const tema = require("../parafrase/tema");
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
test("setiap paket lulus kontras 4,5 di mode Terang dan Gelap", () => {
  for (const [k, p] of Object.entries(tema.PRESETS)) {
    assert.ok(ratio(p.tl, p.bl) >= 4.5, k + " teks terang");
    assert.ok(ratio(p.td, p.bd) >= 4.5, k + " teks gelap");
    assert.ok(ratio(p.pl, p.bl) >= 4.5, k + " aksen terang");
    assert.ok(ratio(p.pd, p.bd) >= 4.5, k + " aksen gelap");
    assert.ok(ratio("#ffffff", p.pl) >= 4.5, k + " teks tombol terang");
    assert.ok(ratio(p.bd, p.pd) >= 4.5, k + " teks tombol gelap");
  }
});
test("bawaan (tema lama) tidak mengubah apa pun; ID asing dibaca bawaan; paket lain memuat font dan variabel", () => {
  assert.strictEqual(tema.head("bawaan"), "");
  assert.strictEqual(tema.head("<script>"), tema.head("baru"));
  assert.strictEqual(tema.id("x"), "baru");
  assert.match(tema.head("baru"), /baru\.css/); assert.strictEqual(tema.DEFAULT, "baru");
  const h = tema.head("premium");
  assert.match(h, /family=Merriweather/); assert.match(h, /Source\+Sans\+3/); assert.match(h, /--acc:#78350F/); assert.match(h, /--acc:#E0A458/);
  assert.strictEqual(tema.inject("<head></head>", "klasik").includes("tema-klasik"), true);
  assert.strictEqual(tema.inject("<head></head>", ""), "<head></head>");
});
