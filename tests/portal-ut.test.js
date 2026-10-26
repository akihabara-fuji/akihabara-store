"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");

/* Domain akademik (ACAD_URL beda dari SITE_URL): nama /ruangakademikut tidak boleh muncul di halaman, JS, maupun alamat. */
process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
const mountPages = require("../parafrase/pages");
const { shortPaths } = require("../parafrase/acadpaths");

const PAGES = ["/beranda", "/ruangakademikut", "/ruangakademikut/cek-parafrase-mandiri", "/ruangakademikut/audit", "/ruangakademikut/layanan", "/ruangakademikut/blog-ut", "/ruangakademikut/pesanan",
  "/ruangakademikut/audit/hasil/x", "/kalkulator-nilai-ut", "/pasfoto-yudisium", "/sitasi-apa", "/portal-ut"];
const ASSETS = ["site.css", "common.js", "cek.js", "audit.js", "audit-hasil.js", "layanan.js", "pesanan.js", "koin.js", "koin-chip.js", "kalkulator.js", "nilai-ut.js", "pasfoto.js", "sitasi.js", "sitasi-apa.js", "blog-ut.js"];

async function boot() {
  const app = express(); mountPages({ app, express });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  return { srv, base, get: (p, o) => fetch(base + p, { redirect: "manual", ...o }) };
}

test("shortPaths: halaman, aset, gambar, dan hub ditulis ulang tanpa /ruangakademikut", () => {
  assert.strictEqual(shortPaths('<a href="/ruangakademikut/koin?kurang=5">'), '<a href="/koin?kurang=5">');
  assert.strictEqual(shortPaths('"/ruangakademikut/assets/common.js?v=1"'), '"/assets/ut/common.js?v=1"');
  assert.strictEqual(shortPaths('"/ruangakademikut/img/x.webp"'), '"/assets/ut/img/x.webp"');
  assert.strictEqual(shortPaths('href="/ruangakademikut"'), 'href="/layanan-ut"');
  assert.strictEqual(shortPaths("https://akademik.example/ruangakademikut/portal-ut"), "https://akademik.example/portal-ut");
  assert.strictEqual(shortPaths("/blog"), "/blog");
});

test("domain akademik: tidak ada /ruangakademikut di halaman publik maupun JS-nya; jalur lama tetap dilayani", async () => {
  const t = await boot();
  try {
    for (const p of PAGES) { const r = await t.get(p); assert.strictEqual(r.status, 200, p); const h = await r.text(); assert.ok(!/ruangakademikut/i.test(h), "masih ada nama lama di " + p + ": " + (h.match(/.{30}ruangakademikut.{30}/i) || [""])[0]); }
    for (const f of ASSETS) { const r = await t.get("/assets/ut/" + f); assert.strictEqual(r.status, 200, f); assert.ok(!/ruangakademikut/i.test(await r.text()), "aset " + f); }
    const man = await t.get("/assets/ut/ca/manifest.webmanifest"); assert.strictEqual(man.status, 200); assert.ok(!/ruangakademikut/i.test(await man.text()));
    for (const f of ["theme.css", "logo-96.png", "favicon.ico"]) assert.strictEqual((await t.get("/assets/ut/ca/" + f)).status, 200, f);
    // jalur lama: aset tetap ada (cache browser lama), halaman alat dan koin dialihkan 301
    assert.strictEqual((await t.get("/ruangakademikut/assets/common.js")).status, 200);
    for (const s of ["portal-ut", "sitasi-apa", "kalkulator-nilai-ut", "pasfoto-yudisium"]) { const r = await t.get("/ruangakademikut/" + s); assert.strictEqual(r.status, 301, s); assert.strictEqual(r.headers.get("location"), "/" + s); }
  } finally { t.srv.close(); }
});

test("Portal UT: lima bagian, tautan resmi hanya ke situs ut.ac.id dan dibuka aman, tautan internal tersedia, penafian ada", async () => {
  const t = await boot();
  try {
    const h = await (await t.get("/portal-ut")).text();
    assert.strictEqual((h.match(/<section class="pt-sec"/g) || []).length, 5);
    for (const title of ["Mulai kuliah", "Belajar dan tuton", "Tugas dan karya ilmiah", "Ujian dan nilai", "Lulus dan administrasi"]) assert.ok(h.includes(title), title);
    const cards = [...h.matchAll(/<a class="pt-card" data-k="(res|kami)" href="([^"]+)"([^>]*)>/g)];
    assert.ok(cards.length >= 14);
    for (const [, kind, href, rest] of cards) {
      if (kind === "res") {
        const u = new URL(href); assert.strictEqual(u.protocol, "https:"); assert.match(u.hostname, /(^|\.)ut\.ac\.id$/, href);
        assert.ok(/target="_blank"/.test(rest) && /noopener/.test(rest), "tautan keluar harus noopener: " + href);
      } else {
        assert.ok(href.startsWith("/"), href);
        // alamat pendek /blog-ut, /audit, dll. diterjemahkan nginx ke jalur aplikasi; di tes ini kita terjemahkan sendiri
        const app = href.split("#")[0].replace(/^\/(cek-parafrase-mandiri|audit|layanan|blog-ut|pesanan)(?=[/?#]|$)/, "/ruangakademikut/$1").replace(/^\/layanan-ut$/, "/ruangakademikut");
        const r = await t.get(app); assert.strictEqual(r.status, 200, href);
      }
    }
    assert.ok(/bukan situs resmi Universitas Terbuka/.test(h) && /24 Oktober 2026/.test(h) && /tidak menjamin nilai atau kelulusan/.test(h));
    assert.ok(!/menjamin nilai|lolos turnitin|garansi|kuota terbatas|sisa slot/i.test(h.replace("tidak menjamin nilai atau kelulusan", "")), "klaim terlarang");
    assert.ok(h.includes('rel="canonical" href="https://akademik.example/portal-ut"'));
  } finally { t.srv.close(); }
});
