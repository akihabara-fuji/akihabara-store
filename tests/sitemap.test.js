const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const { create, xmlEscape, day } = require("../sitemap");

const mk = [
  { slug: "adbi4130-pengantar", nama: "Pengantar & Dasar <Niaga>", dibuat: Date.UTC(2026, 10, 3) },
  { slug: "embs4429-pemasaran-jasa", nama: "Pemasaran Jasa", dibuat: Date.UTC(2026, 10, 20) },
];
const mkMap = (pub, kisiList = () => mk) => create({
  SITE: "https://x.com", ACAD: "https://x.com", pub,
  extra: { pageUrls: () => [{ loc: "https://x.com/", lastmod: "2026-11-10", pri: "1.0" }, { loc: "https://x.com/kalkulator-nilai-ut", lastmod: "2026-11-05", pri: "0.7" }, { loc: "https://x.com/kisi-kisi", pri: "0.7" }], blogUrls: () => [{ loc: "https://x.com/blog/a&b", lastmod: "2026-11-12", pri: "0.6" }] },
  kisiList,
});

test("xmlEscape dan day", () => {
  assert.equal(xmlEscape(`a&b<c>"d"'e'`), "a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;");
  assert.equal(day(Date.UTC(2026, 10, 3)), "2026-11-03");
  assert.equal(day("2026-11-12T10:00:00Z"), "2026-11-12");
  assert.equal(day(""), "");
});

test("sitemap memuat semua jenis URL dengan lastmod nyata dan XML valid", () => {
  const pub = fs.mkdtempSync(path.join(os.tmpdir(), "sm-"));
  const s = mkMap(pub);
  assert.equal(s.generateSitemap(), 8);
  const xml = fs.readFileSync(path.join(pub, "sitemap.xml"), "utf8");
  assert.match(xml, /<loc>https:\/\/x\.com\/<\/loc><lastmod>2026-11-10<\/lastmod><changefreq>daily<\/changefreq><priority>1\.0<\/priority>/);
  assert.match(xml, /<loc>https:\/\/x\.com\/kisi-kisi<\/loc><lastmod>2026-11-20<\/lastmod><changefreq>daily<\/changefreq><priority>0\.9<\/priority>/);
  assert.match(xml, /kalkulator-nilai-ut<\/loc><lastmod>2026-11-05<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.8/);
  assert.match(xml, /kisi-kisi\/indeks\/p<\/loc><lastmod>2026-11-20<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.8/);
  assert.match(xml, /kisi-kisi\/adbi4130-pengantar<\/loc><lastmod>2026-11-03<\/lastmod><changefreq>monthly<\/changefreq><priority>0\.7/);
  assert.match(xml, /blog\/a&amp;b<\/loc><lastmod>2026-11-12/);
  assert.equal((xml.match(/<loc>/g) || []).length, (xml.match(/<\/loc>/g) || []).length);
  assert.equal((xml.match(/<url>/g) || []).length, 8);
  assert.equal(xml.match(/kisi-kisi<\/loc>/g).length, 1, "kisi-kisi tidak dobel");
  assert.ok(!/<lastmod><\/lastmod>/.test(xml));
});

test("MK tanpa tanggal memakai fallback tetap, kisi gagal tidak merusak sitemap", () => {
  const pub = fs.mkdtempSync(path.join(os.tmpdir(), "sm-"));
  const s = mkMap(pub, () => [{ slug: "x1", nama: "Xyz" }]);
  s.generateSitemap();
  assert.match(fs.readFileSync(path.join(pub, "sitemap.xml"), "utf8"), /kisi-kisi\/x1<\/loc><lastmod>2026-11-01<\/lastmod>/);
  const bad = mkMap(pub, () => { throw new Error("db mati"); });
  assert.ok(bad.generateSitemap() >= 2);
});
