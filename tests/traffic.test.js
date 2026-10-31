"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");
function openDb() {
  const orig = Module._load; Module._load = function (r, ...a) { return r === "better-sqlite3" ? function () {} : orig.call(this, r, ...a); };
  const { MIGRATIONS } = require("../parafrase/db"); Module._load = orig;
  const { DatabaseSync } = require("node:sqlite"); const raw = new DatabaseSync(":memory:"); let d = 0;
  const db = { exec: s => raw.exec(s), prepare: s => { const st = raw.prepare(s); return { get: (...p) => st.get(...p), all: (...p) => st.all(...p), run: (...p) => st.run(...p) }; },
    transaction: fn => (...a) => { if (d) return fn(...a); raw.exec("BEGIN IMMEDIATE"); d++; try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } finally { d--; } } };
  for (const m of MIGRATIONS) if (typeof m === "string") raw.exec(m); return db;
}
const T = require("../parafrase/traffic");
const req = (o = {}) => ({ method: "GET", path: "/blog/cara-hitung-nilai-akhir-ut", ip: "1.1.1.1", hostname: "catatanakademik.com", headers: { "user-agent": "Mozilla/5.0 (Linux; Android 13)", ...(o.headers || {}) }, ...o, headers: { "user-agent": "Mozilla/5.0 (Linux; Android 13)", ...((o && o.headers) || {}) } });
const res = (code = 200, ct = "text/html; charset=utf-8") => ({ statusCode: code, getHeader: () => ct });
const mk = () => { let t = Date.UTC(2026, 9, 23, 5); const db = openDb(); const tr = T.create(db, { secret: "s", now: () => t }); return { tr, db, tick: ms => { t += ms; } }; };

test("menghitung tampilan dan pengunjung unik per hari", () => {
  const { tr } = mk();
  assert.equal(tr.record(req(), res()), true); tr.record(req(), res());              // orang sama, dua tampilan
  tr.record(req({ ip: "2.2.2.2" }), res());                                           // orang lain
  tr.record(req({ path: "/ruangakademikut/sitasi-apa" }), res());
  const s = tr.summary(7);
  assert.equal(s.today.views, 4); assert.equal(s.today.visitors, 2);
  const top = s.pages[0]; assert.equal(top.path, "/blog/cara-hitung-nilai-akhir-ut"); assert.equal(top.views, 3); assert.equal(top.visitors, 2);
  assert.equal(s.groups.find(g => g.name === "Alat gratis").views, 1);
});
test("tidak dihitung: bot, admin, DNT, bukan HTML, bukan 200, halaman admin dan API", () => {
  const { tr } = mk();
  assert.equal(tr.record(req({ headers: { "user-agent": "Googlebot/2.1" } }), res()), false);
  assert.equal(tr.record(req({ headers: { cookie: "ca_admin=abc" } }), res()), false);
  assert.equal(tr.record(req({ headers: { dnt: "1" } }), res()), false);
  assert.equal(tr.record(req(), res(200, "application/json")), false);
  assert.equal(tr.record(req(), res(404)), false);
  assert.equal(tr.record(req({ path: "/admin/" }), res()), false);
  assert.equal(tr.record(req({ path: "/ms/layanan/config" }), res()), false);
  assert.equal(tr.record(req({ method: "POST" }), res()), false);
  assert.equal(tr.summary(7).total.views, 0);
});
test("jalur bertoken rahasia disamarkan dan query dibuang", () => {
  assert.equal(T.normPath("/ruangakademikut/pesanan/" + "ab".repeat(24) + "?x=1"), "/ruangakademikut/pesanan/*");
  assert.equal(T.normPath("/Blog/Judul-Artikel/"), "/blog/judul-artikel");
  const { tr, db } = mk(); tr.record(req({ path: "/ruangakademikut/pesanan/" + "cd".repeat(24) }), res());
  assert.equal(db.prepare("SELECT COUNT(*) n FROM pv_day WHERE path LIKE '%cdcd%'").get().n, 0);
});
test("sumber kunjungan dikelompokkan dan perpindahan internal tidak dihitung", () => {
  const { tr } = mk();
  tr.record(req({ headers: { referer: "https://www.google.com/search?q=x" } }), res());
  tr.record(req({ ip: "3.3.3.3", headers: { referer: "https://l.wa.me/" } }), res());
  tr.record(req({ ip: "4.4.4.4" }), res());
  tr.record(req({ ip: "5.5.5.5", headers: { referer: "https://catatanakademik.com/blog" } }), res());
  const r = Object.fromEntries(tr.summary(7).refs.map(x => [x.ref, x.views]));
  assert.deepEqual(r, { Google: 1, WhatsApp: 1, Langsung: 1 });
});
test("hash pengunjung berganti tiap hari (tidak bisa dilacak antarhari)", () => {
  const { tr, db, tick } = mk(); tr.record(req(), res()); tick(86400e3); tr.record(req(), res());
  const rows = db.prepare("SELECT DISTINCT vh FROM pv_uniq").all(); assert.equal(rows.length, 2);
  const s = tr.summary(7); assert.equal(s.total.visitors, 2); assert.equal(s.series.length, 7);
});
