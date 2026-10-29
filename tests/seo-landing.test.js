"use strict";
const test = require("node:test"), assert = require("node:assert"), express = require("express");
process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
const mountPages = require("../parafrase/pages");
async function boot(ul) {
  const app = express(); if (ul) app.locals.ulasanPublic = () => ul; mountPages({ app, express });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  return { srv, get: p => fetch(base + p).then(async r => ({ status: r.status, html: await r.text() })) };
}
const tags = (h, t) => (h.match(new RegExp("<" + t + "[\\s>]", "g")) || []).length;
test("landing: satu H1 berkata kunci, sub-judul bukan H1, kartu Audit/Cek di bawah H2, tautan Tentang", async () => {
  const { srv, get } = await boot();
  try {
    const { status, html } = await get("/beranda");
    assert.strictEqual(status, 200);
    assert.strictEqual(tags(html, "h1"), 1);
    assert.match(html, /<h1[^>]*>Layanan Tugas, Diskusi, Metopen &amp; Audit Dokumen untuk Mahasiswa UT<\/h1>/);
    assert.match(html, /<p class="sl" id="heroTitle">Tugas UT kamu <em>lebih siap dikumpulkan/);
    assert.ok(html.indexOf("Audit dan cek parafrase dokumen</h2>") > 0 && html.indexOf("Audit dan cek parafrase dokumen</h2>") < html.indexOf("<h3>Audit Dokumen</h3>"), "H2 mendahului H3 kartu");
    assert.match(html, /href="\/tentang"/);
    assert.ok(!/aman dari|di bawah 25%/.test(html.replace(/<[^>]+>/g, " ")), "beranda tidak menjanjikan hasil similarity");
    assert.match(html, /rel="preload" as="image" href="\/site-img\/hero\/model-ut\.webp"/);
    assert.ok(!/id="ulasan">/.test(html), "tanpa testimoni asli bagiannya tetap tersembunyi");
  } finally { srv.close(); }
});
test("testimoni asli ditulis di HTML awal dan teksnya di-escape", async () => {
  const { srv, get } = await boot([{ id: "a", nama: "Rina <b>", ket: "Maba", teks: "Sangat \"membantu\" & cepat", img: "" }]);
  try {
    const { html } = await get("/beranda");
    assert.match(html, /<section class="s" id="ulasan">/);
    assert.match(html, /<q>Sangat &quot;membantu&quot; &amp; cepat<\/q>/);
    assert.match(html, /Rina &lt;b&gt;/);
    assert.ok(!html.includes("Rina <b>"));
  } finally { srv.close(); }
});
test("halaman Tentang: ada, satu H1, tanpa klaim karangan, disclaimer ada", async () => {
  const { srv, get } = await boot();
  try {
    const r = await get("/tentang");
    assert.strictEqual(r.status, 200);
    assert.strictEqual(tags(r.html, "h1"), 1);
    assert.match(r.html, /Bukan situs resmi dan tidak terafiliasi dengan Universitas Terbuka/);
    assert.match(r.html, /Kami tidak menjamin nilai atau kelulusan/);
    const nilai = await get("/kalkulator-nilai-ut");
    assert.match(nilai.html, /aria-label="Lanjut dari sini"/);
    assert.match(nilai.html, /href="\/sitasi-apa"/);
  } finally { srv.close(); }
});

test("artikel topik non-akademik: noindex dan keluar dari sitemap di domain akademik", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "blog-akun.js"), "utf8");
  assert.match(src, /OFF_TOPIC = ACAD_ONLY \? \["social", "ai", "viral"\]/);
  assert.match(src, /noindex: preview \|\| OFF_TOPIC\.includes\(p\.topic\)/);
  assert.match(src, /blogUrls: \(\) => published\(\)\.filter\(p => !OFF_TOPIC\.includes\(p\.topic\)\)/);
});
