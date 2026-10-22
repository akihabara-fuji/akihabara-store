"use strict";
const test = require("node:test"), assert = require("node:assert");
const express = require("express"), path = require("path"), fs = require("fs"), os = require("os");

async function boot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "be-")); fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(path.join(root, "data", "blog.json"), JSON.stringify({ posts: [] }));
  const app = express();
  require("../blog-akun.js")({ app, express, requireAdmin: (q, r, n) => n(), sameOrigin: () => true, getCookie: () => "", SECURE_COOKIE: false, ROOT: root, SITE: "https://example.test", getSettings: () => ({}) });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const html = async body => (await (await fetch(base + "/ms/admin/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "t", body }) })).json()).html;
  return { html, close: () => srv.close(), base };
}

test("renderer: format lama tidak berubah, format baru benar, XSS tetap aman", async () => {
  const t = await boot();
  try {
    assert.strictEqual(await t.html("Halo **dunia**\n\n## Judul\n\n- satu\n- dua\n\n### Anak"), "<p>Halo <strong>dunia</strong></p><h2>Judul</h2><ul><li>satu</li><li>dua</li></ul><h3>Anak</h3>");
    assert.strictEqual(await t.html("5 * 3 * 2 sama dengan 30"), "<p>5 * 3 * 2 sama dengan 30</p>");
    assert.ok((await t.html("Ini *miring* ya")).includes("<em>miring</em>"));
    assert.strictEqual(await t.html("1. satu\n2. dua"), "<ol><li>satu</li><li>dua</li></ol>");
    assert.strictEqual(await t.html("> kutipan\n> lanjut"), "<blockquote><p>kutipan lanjut</p></blockquote>");
    assert.ok((await t.html("# Judul dalam isi")).startsWith("<h2>"));
    const x = await t.html("<script>alert(1)</script> [klik](javascript:alert(1)) [ok](https://a.test/x)");
    assert.ok(!x.includes("<script>") && !x.includes('href="javascript'));
    assert.ok(x.includes('href="https://a.test/x"'));
  } finally { t.close(); }
});

test("terbit: tulisan 300 kata tanpa H2 ditolak, draf tidak diblokir", async () => {
  const t = await boot();
  try {
    const long = "kata ".repeat(320), post = status => fetch(t.base + "/ms/admin/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Judul uji", topic: "study", body: long, status }) });
    assert.strictEqual((await post("published")).status, 400);
    assert.strictEqual((await post("draft")).status, 200);
  } finally { t.close(); }
});
