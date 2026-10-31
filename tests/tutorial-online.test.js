const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const P = f => fs.readFileSync(path.join(__dirname, "..", "parafrase", f), "utf8");
test("Makalah dan Jurnal Rp45.000, kind tugas (revisi ikut keluarga tugas)", () => {
  const src = P("layanan.js");
  assert.match(src, /makalah:\s*\{[^}]*price:\s*45000[^}]*kind:\s*"tugas"/);
  assert.match(src, /jurnal:\s*\{[^}]*price:\s*45000[^}]*kind:\s*"tugas"/);
});
test("menu Tutorial Online ada di semua halaman bernavigasi, tanpa menu lama yang hilang", () => {
  const dir = path.join(__dirname, "..", "parafrase", "pages");
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".html"))) {
    const h = fs.readFileSync(path.join(dir, f), "utf8");
    if (!/<nav class="links"/.test(h)) continue;
    assert.ok(/<summary[^>]*>Tutorial Online/.test(h), f + " tanpa menu Tutorial Online");
    for (const m of ["Layanan", "Parafrase File dan Bedah Penelitian", "Mahasiswa Baru", "Portal &amp; Alat UT"]) assert.ok(h.includes(m) || h.includes(m.replace("&amp;", "&")), f + " kehilangan " + m);
  }
});
test("halaman tutorial-online terdaftar: rute, aset, sitemap, jalur pendek", () => {
  assert.match(P("pages.js"), /tutorial-online/);
  assert.match(P("acadpaths.js"), /tutorial-online/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "blog-akun.js"), "utf8"), /ruangakademikut\/tutorial-online/);
});
