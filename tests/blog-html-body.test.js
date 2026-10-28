"use strict";
const test = require("node:test"), assert = require("node:assert");
const { htmlToMd } = require("../blog-import");
test("isi berformat HTML diubah ke teks situs, tanpa tag mentah", () => {
  const out = htmlToMd('<p>Halo <strong>23 November 2026</strong>, cek <a href="https://myut.ut.ac.id/">MyUT</a>.</p><h2>Apa yang perlu?</h2><p>Mulai.</p><p>• Buka akun</p><ul><li>Satu</li><li>Dua</li></ul>');
  assert.ok(!/<\/?[a-z]/i.test(out), out);
  assert.ok(out.includes("**23 November 2026**") && out.includes("[MyUT](https://myut.ut.ac.id/)") && out.includes("## Apa yang perlu?") && out.includes("- Satu"));
});
test("isi tanpa HTML tidak diubah", () => {
  const t = "## Judul\n\nIsi **tebal** dan a < b > c.";
  assert.strictEqual(htmlToMd(t), t);
});
