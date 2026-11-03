"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path"), express = require("express");

test("dokumen: setelah 30 hari file dihapus, baris dan angka tetap, kutipan teks hilang", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dok-")); fs.mkdirSync(path.join(root, "data", "private", "library"), { recursive: true });
  const db = require("../parafrase/db").open(":memory:");
  const dok = require("../parafrase/dokumen")({ app: express(), express, db, root, requireAdmin: (q, r, n) => n() });
  const id = await dok.saveUpload({ kind: "audit", name: "a.docx", buf: Buffer.from("isi dokumen rahasia"), user: { id: 7, email: "x@y.z" }, words: 321, summary: { kutipan: "kalimat rahasia mahasiswa" } });
  const f = path.join(root, "data", "private", db.prepare("SELECT path FROM doc_library WHERE id=?").get(id).path); assert.ok(fs.existsSync(f));
  db.prepare("UPDATE doc_library SET expires_at=? WHERE id=?").run(Date.now() - 1000, id);
  await dok.purgeExpired();
  const r = db.prepare("SELECT * FROM doc_library WHERE id=?").get(id);
  assert.ok(r && r.purged_at, "baris tetap, ditandai dihapus"); assert.equal(r.path, ""); assert.ok(!fs.existsSync(f));
  const d = JSON.parse(r.data); assert.equal(d.words, 321); assert.ok(d.sha); assert.ok(!JSON.stringify(d).includes("rahasia"));
});

test("pengaturan: nomor admin tanpa bawaan lama, simpan file 30 hari", () => {
  process.env.PARAFRASE_DB = ":memory:";
  const db = require("../parafrase/db").open(":memory:"), st = require("../parafrase/settings").create(db);
  assert.equal(st.get("admin_wa_number"), ""); assert.equal(st.get("retention_hours"), 720);
});

test("notifikasi: hanya dua jenis pesan WA (selesai, ditolak)", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "parafrase", "notify.js"), "utf8");
  for (const k of ["dikonfirmasi", "kedaluwarsa", "dikerjakan", "pengingat"]) assert.ok(!new RegExp("\\b" + k + "\\s*[:(]").test(src.replace(/\/\*[\s\S]*?\*\//g, "")), k + " tidak boleh ada lagi");
  assert.ok(/selesai/.test(src) && /ditolak/.test(src));
});

test("menu admin: 10 item, tab per kelompok, rute lama tetap terdaftar", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "admin-ca", "public", "app.js"), "utf8");
  assert.ok(src.includes("TABG") && src.includes("tabsHtml"));
  for (const k of ["Dashboard", "Pesanan", "Pelanggan", "Artikel", "Media", "Studio Sosmed", "Tampilan", "Layanan & Harga", "Laporan", "Pengaturan"]) assert.ok(src.includes(k), k);
  assert.ok(!src.includes("GROUP_NAV") && !src.includes("subtog"));
  for (const r of ["orders", "payments", "dokumen", "posts", "media", "images", "settings", "admins", "log"]) assert.ok(src.includes('"' + r + '"') || src.includes("'" + r + "'") || src.includes(r), r);
});

test("studio: halaman baru memakai kiri Word bisa diketik, kanan kalimat biru + revisi, dan kirim final bersih", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", "studio.js"), "utf8"), html = fs.readFileSync(path.join(__dirname, "..", "parafrase", "pages", "studio.html"), "utf8");
  assert.ok(js.includes('contentEditable = "true"') && js.includes("/revisi") && js.includes("/final") && js.includes("/finish"));
  assert.ok(html.includes("Word asli mahasiswa") && html.includes("Kirim ke pelanggan") && html.includes("Unduh final"));
});

test("navigasi atas publik: 7 item, hanya 2 dropdown, sama di semua halaman", () => {
  const dir = path.join(__dirname, "..", "parafrase", "pages");
  let n = 0;
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".html"))) {
    const h = fs.readFileSync(path.join(dir, f), "utf8"), m = /<nav class="links"[^>]*>[\s\S]*?<\/nav>/.exec(h);
    if (!m || !m[0].includes('class="dd"')) continue; n++;
    const items = [...m[0].replace(/<div class="ddp[\s\S]*?<\/div>/g, "").matchAll(/<(?:summary|a)[^>]*>([^<]+)</g)].map(x => x[1].trim());
    assert.deepEqual(items.slice(0, 7), ["Layanan", "Tutorial Online", "Cek &amp; Bedah", "Mahasiswa Baru", "Testimoni", "Alat UT", "Blog"], f);
    assert.equal((m[0].match(/<details class="dd"/g) || []).length, 2, f);
  }
  assert.ok(n >= 15, "halaman publik terperiksa: " + n);
});

test("menu admin: Pesanan punya tab Cek & Parafrase per mahasiswa dan status jadi chip", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "admin-ca", "public", "app.js"), "utf8");
  assert.ok(src.includes('"Cek & Parafrase", OWN') && src.includes('class="chips"') && src.includes("Buka semua file") && src.includes("Urutan kerja") && src.includes("Pilih dari Pustaka"));
  assert.ok(!src.includes("Antrean Cek & Parafrase\", CS"));
});

test("layanan ditutup: Makalah dan Jurnal ikut Tugas, Paket Semester ikut Tugas+Diskusi", () => {
  const r = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  const l = r("parafrase/layanan.js");
  assert.ok(l.includes('(k === "makalah" || k === "jurnal") && o.includes("tugas")') && l.includes("isOff(b.service)"), "pesanan makalah/jurnal ditolak bila Tugas ditutup");
  assert.ok(r("parafrase/pages/common.js").includes("shut.semester = shut.tugas && shut.diskusi"));
  assert.ok(r("parafrase/pages/tutorial.js").includes("Sesi sedang ditutup") && r("parafrase/pages/tutorial.js").includes("!cfg.revisi_tugas.closed"));
});
