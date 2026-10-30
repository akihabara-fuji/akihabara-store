"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "parafrase", "pages"), rd = f => fs.readFileSync(path.join(dir, f), "utf8");
const pages = fs.readdirSync(dir).filter(f => f.endsWith(".html") && rd(f).includes('<header class="nav">') && rd(f).includes("Portal &amp; Alat UT"));

test("semua halaman dengan menu kedua punya dropdown Mahasiswa Baru dan Portal & Alat UT", () => {
  assert.ok(pages.length >= 18);
  for (const f of pages) assert.ok(!rd(f).includes('class="sub"'), f + " masih punya bar menu kedua");
  for (const f of pages) {
    const h = rd(f);
    assert.match(h, /<summary[^>]*>Mahasiswa Baru<\/summary>/, f);
    assert.match(h, /<summary[^>]*>Portal &amp; Alat UT<\/summary>/, f);
    assert.match(h, /href="\/grup\?dari=menu"/, f);
    assert.ok(!/<a (class="on" )?href="\/ruangakademikut\/portal-ut">Portal &amp; Alat UT<\/a>/.test(h), f + " masih tautan lama");
  }
});
test("panduan maba: teks di HTML, FAQ terstruktur, tombol grup lewat /grup, tanpa nama lama", () => {
  const h = rd("panduan-maba.html");
  assert.match(h, /<h1>Baru masuk UT\? Mulai dari sini\.<\/h1>/);
  assert.match(h, /"@type": ?"FAQPage"/); assert.match(h, /Panduan Mahasiswa Baru UT 2026/);
  assert.strictEqual((h.match(/href="\/grup\?dari=(banner|panduan)"/g) || []).length, 2);
  assert.ok(!/Ruang Akademik/i.test(h));
  assert.match(h, /bukan kanal resmi/i);
});
test("tombol grup memakai /grup (klik terhitung), tidak langsung ke WhatsApp", () => {
  const c = rd("common.js"), b = rd("beranda.html");
  assert.ok(!/a\.href = c\.update_group_url/.test(c)); assert.ok(!/a\.href=c\.update_group_url/.test(b));
  assert.match(c, /\/grup\?dari=banner/);
});
test("nama lama tidak muncul di label admin pengaturan", () => {
  assert.ok(!/Ruang Akademik/i.test(rd("admin.js")));
});
test("paket tema UT dan Wireframe tersedia untuk menu Tema di admin", () => {
  const t = require("../parafrase/tema");
  assert.ok(t.PRESETS.ut && t.PRESETS.wireframe);
  assert.match(t.head("ut"), /--acc:#1859BC/i); assert.match(t.head("wireframe"), /--bg:#E8E9EC/i);
});
test("pemakaian kalkulator dan checklist dihitung lewat /ms/ev tanpa menyimpan isian", () => {
  assert.match(rd("kalkulator.js"), /sendBeacon\("\/ms\/ev\?e=kalkulator"\)/);
  assert.match(rd("maba.js"), /sendBeacon\("\/ms\/ev\?e=checklist"\)/);
  const idx = fs.readFileSync(path.join(dir, "..", "index.js"), "utf8");
  assert.match(idx, /EV = new Set\(\["kalkulator", "checklist"\]\)/); assert.match(idx, /app\.post\("\/ms\/ev"/);
});
test("Audit dan Bedah satu alur: pilihan alur ada di halaman Audit, Bedah, dan hasil Audit", () => {
  for (const f of ["audit.html", "bedah.html", "audit-hasil.html"]) {
    const h = rd(f);
    assert.match(h, /class="alur"/, f); assert.match(h, /href="\/ruangakademikut\/audit"/, f); assert.match(h, /href="\/ruangakademikut\/bedah-laporan"/, f);
  }
  assert.match(rd("audit.html"), /alur-i on" href="\/ruangakademikut\/audit"/); assert.match(rd("bedah.html"), /alur-i on" href="\/ruangakademikut\/bedah-laporan"/);
});
test("versi aset dinaikkan supaya pengunjung tidak memakai CSS lama dengan HTML baru", () => {
  assert.match(rd("panduan-maba.html"), /site\.css\?v=20261302/); assert.match(rd("panduan-maba.html"), /common\.js\?v=20261503/);
});
