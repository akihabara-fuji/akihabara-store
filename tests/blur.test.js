"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

global.window = {}; global.document = {};
eval(fs.readFileSync(path.join(__dirname, "..", "admin-ca", "public", "blur.js"), "utf8"));
const { detect } = global.window.CABlur;

const W = (text, i, y = 0) => ({ text, bbox: { x0: i * 50, y0: y, x1: i * 50 + 45, y1: y + 20 } });
const line = (text, y = 0) => ({ text: text.join(" "), words: text.map((t, i) => W(t, i, y)) });

test("blur: nomor HP terpisah-pisah, email, dan tautan terdeteksi; jam dan angka kecil tidak", () => {
  const found = detect([
    line(["Halo", "kak", "0812", "3456", "7890"], 0),
    line(["email", "saya", "budi@gmail.com"], 30),
    line(["Terima", "kasih", "10.45"], 60),
    line(["Dapat", "nilai", "A", "semester", "2"], 90),
    line(["lihat", "https://contoh.com/x"], 120),
  ]);
  const ys = found.map(b => b.y).sort((a, b) => a - b);
  assert.deepStrictEqual(ys.filter(y => y === 0).length, 1, "nomor HP dalam satu kotak");
  assert.ok(found.some(b => b.y === 30 && b.why !== "nomor"), "email");
  assert.ok(found.some(b => b.y === 120), "tautan");
  assert.ok(!found.some(b => b.y === 60 || b.y === 90), "jam dan angka kecil dibiarkan");
});

test("blur: kalimat dengan kata sensitif diburamkan satu baris penuh", () => {
  const found = detect([line(["No", "rekening", "saya", "BCA", "123"], 10), line(["Mantap", "banget"], 40)]);
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].why, "kata sensitif");
  assert.strictEqual(found[0].w, 4 * 50 + 45);
});
