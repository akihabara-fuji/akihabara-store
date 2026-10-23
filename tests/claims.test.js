"use strict";
/* Penjaga klaim: halaman publik tidak boleh memuat janji yang tidak bisa dibuktikan atau teks yang bertentangan dengan perilaku kode. */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "parafrase", "pages");
const pages = fs.readdirSync(dir).filter(f => f.endsWith(".html") && !/admin/.test(f));
const text = f => fs.readFileSync(path.join(dir, f), "utf8").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, " ");

test("halaman publik tidak memuat janji hasil atau klaim mutlak", () => {
  const BAD = [/bebas plagiasi/i, /pasti (lolos|aman|turun|lulus)/i, /dijamin (lolos|lulus|aman|turun|nilai)/i, /100 ?% (aman|lolos|bebas|akurat)/i, /tidak terdeteksi/i, /skor (ai|turnitin|drillbit) (pasti )?(0|nol)/i, /terjamin/i, /semua file terjaga/i];
  for (const f of pages) for (const re of BAD) assert.ok(!re.test(text(f)), `${f} memuat klaim terlarang ${re}`);
});

test("teks penyimpanan file di Audit Dokumen sesuai perilaku kode (disimpan sementara, bukan 'tidak disimpan')", () => {
  const t = text("audit.html"), code = fs.readFileSync(path.join(__dirname, "..", "parafrase", "audit.js"), "utf8");
  assert.ok(/UPLOAD_TTL_MS = 2 \* 3600/.test(code) && /writeFile/.test(code), "kode memang menyimpan 2 jam");
  assert.ok(!/File tidak disimpan/i.test(t) && /2 jam/.test(t));
});

test("halaman layanan tetap memuat penafian: bukan situs resmi UT dan tidak menjamin nilai", () => {
  assert.ok(/bukan situs resmi/i.test(text("beranda.html")) && /tidak menjamin nilai/i.test(text("beranda.html")));
  assert.ok(/tidak menjamin skor tertentu atau kelulusan/i.test(text("cek.html")));
});
