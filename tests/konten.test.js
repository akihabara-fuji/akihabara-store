"use strict";
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const fs = require("fs"), os = require("os"), path = require("path");

process.env.ACAD_URL = "https://akademik.example"; process.env.SITE_URL = "https://toko.example";
const mountPages = require("../parafrase/pages");
const mountKonten = require("../parafrase/konten");
const mountBedahTeks = require("../parafrase/bedahteks");
const navfix = require("../parafrase/navfix");

async function boot(over = {}, ai) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "konten-"));
  const S = Object.assign({ tampil_cek_pesanan: false, tampil_harga_pesan: false, bedahteks_max_mb: 10, bedahteks_max_halaman: 30 }, over);
  const settings = { get: k => S[k] };
  const app = express();
  mountKonten({ app, express, root, requireAdmin: (q, r, n) => n(), getBlogPosts: () => [{ slug: "cara-tugas-tutorial", title: "Cara tugas tutorial", status: "published" }] });
  mountBedahTeks({ app, express, settings, aiClient: ai || null });
  mountPages({ app, express, settings });
  const srv = app.listen(0), base = "http://127.0.0.1:" + srv.address().port;
  const j = (p, body, method = "POST") => fetch(base + p, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { srv, base, root, S, app, get: p => fetch(base + p), j };
}
const FORBID = /Ruang Akademik|ruangakademikut|nextaja|Analisa|Lab Studio/i;

test("nav: Kelas Tuton, Komunitas, Alat UT, Panduan Maba, Blog; Cek Pesanan dan Masuk tidak tampil di mana pun", async () => {
  const t = await boot();
  try {
    for (const p of ["/tutorial-online", "/komunitas", "/tentang", "/bedah-data-ut", "/beranda", "/ruangakademikut/layanan", "/ruangakademikut/cek-parafrase-mandiri", "/ruangakademikut/blog-ut", "/panduan-maba", "/sitasi-apa", "/ruangakademikut/pesanan"]) {
      const r = await t.get(p); assert.strictEqual(r.status, 200, p); const h = await r.text();
      assert.ok(/Kelas Tuton/.test(h) && /Komunitas/.test(h) && />Panduan Maba</.test(h) && />Blog</.test(h), "menu baru di " + p);
      assert.ok(!/nav-ord|aria-label="Cek pesanan"|>\s*Cek Pesanan\s*<\/a>/.test(h), "tautan Cek Pesanan masih tampil di " + p);
      assert.ok(!/File dihapus otomatis <span/.test(h), "banner file dihapus masih tampil di " + p);
      assert.ok(!/<a (?![^>]*hidden)[^>]*>Masuk<\/a>/.test(h), "tombol Masuk tampil di " + p);
      assert.ok(/bukan situs resmi/i.test(h), "footer independen di " + p);
      assert.ok(!FORBID.test(h.replace(/<script[\s\S]*?<\/script>/g, "")), "nama terlarang di " + p + ": " + (h.match(FORBID) || [])[0]);
    }
    assert.strictEqual((await t.get("/ruangakademikut/pesanan/abc")).status, 200); // tautan pesanan lama tetap hidup
  } finally { t.srv.close(); }
});

test("saklar tampil_cek_pesanan: menu Cek Pesanan muncul lagi saat dinyalakan", () => {
  const html = '<header class="nav"><nav class="links" id="links">x</nav><div class="nav-r"><a class="nav-ord" href="/ruangakademikut/pesanan">🛒</a></div></header>';
  assert.ok(!/nav-ord/.test(navfix.fix(html, { cek: false })));
  const on = navfix.fix(html, { cek: true });
  assert.ok(/nav-ord/.test(on) && /Cek Pesanan/.test(on));
});

test("Kelas Tuton: lima jenis, tahap, video klik-untuk-muat, tanpa embed YouTube sebelum diklik", async () => {
  const t = await boot();
  try {
    const h = await (await t.get("/tutorial-online?j=tugas")).text();
    for (const x of ["Diskusi", "Tugas", "Makalah", "Jurnal", "Metopen"]) assert.ok(h.includes('data-j="' + x.toLowerCase() + '"'), x);
    for (const x of ["Memahami soal", "Mencari sumber", "Menyusun kerangka", "Menulis", "Memeriksa"]) assert.ok(h.includes(x), x);
    assert.ok(h.includes("Template prompt Gemini") && h.includes("Checklist sebelum kirim") && h.includes("Video segera hadir"));
    assert.ok(!/youtube/i.test(h.replace(/<script src=[^>]*>/g, "")), "tidak boleh ada pemuatan YouTube sebelum klik");
    const r = await t.j("/ms/admin/ca/konten/tuton/jenis/diskusi", { title: "Diskusi", video: "https://youtu.be/dQw4w9WgXcQ", steps: [{ t: "Satu", d: "x" }], links: [], check: "a", prompt: "p" }, "PUT");
    assert.strictEqual(r.status, 200);
    const h2 = await (await t.get("/tutorial-online")).text();
    assert.ok(/class="yt" data-id="dQw4w9WgXcQ"/.test(h2) && !/<iframe/.test(h2));
    const bad = await t.j("/ms/admin/ca/konten/tuton/jenis/diskusi", { video: "https://evil.example/watch?v=dQw4w9WgXcQ" }, "PUT");
    assert.strictEqual(bad.status, 400);
  } finally { t.srv.close(); }
});

test("materi: terbit wajib sumber; draf tidak tampil publik", async () => {
  const t = await boot();
  try {
    const mk = o => t.j("/ms/admin/ca/konten/tuton/materi", Object.assign({ judul: "Menulis jawaban", jenis: "tugas", tahap: "Menulis", status: "terbit", sumber: "Modul 1" }, o));
    assert.strictEqual((await mk({ sumber: "" })).status, 400);
    const d = await (await mk({ status: "draf", sumber: "" })).json(); assert.ok(d.id);
    assert.strictEqual((await t.get("/tutorial-online/materi/" + d.id)).status, 404);
    const p = await (await mk({ id: d.id })).json();
    const r = await t.get("/tutorial-online/materi/" + p.id); assert.strictEqual(r.status, 200); assert.ok((await r.text()).includes("Menulis jawaban"));
    assert.strictEqual((await t.j("/ms/admin/ca/konten/tuton/materi", { judul: "x", jenis: "tugas", tahap: "Salah" })).status, 400);
  } finally { t.srv.close(); }
});

test("Komunitas: keadaan kosong jujur, kegiatan + laporan dana dihitung otomatis dari tabel", async () => {
  const t = await boot();
  try {
    const k0 = await (await t.get("/komunitas")).text(); assert.ok(/Belum ada kegiatan yang dipublikasikan/.test(k0));
    const k = await (await t.j("/ms/admin/ca/konten/komunitas", { judul: "Tali kasih", kat: "Sosial", status: "selesai", tanggal: "2026-10-01", tempat: "Jakarta", peserta: 20, dana: true })).json();
    for (const x of [["masuk", "2026-10-01", 3000000, "Donasi"], ["masuk", "2026-10-09", 2000000, "Donasi 2"], ["keluar", "2026-10-12", 1500000, "Beli sembako", "Konsumsi"], ["keluar", "2026-10-13", 500000, "Transport", "Transport"]])
      assert.strictEqual((await t.j("/ms/admin/ca/konten/komunitas/" + k.id + "/transaksi", { tipe: x[0], tgl: x[1], jumlah: x[2], ket: x[3], kategori: x[4] })).status, 200);
    assert.strictEqual((await t.j("/ms/admin/ca/konten/komunitas/" + k.id + "/transaksi", { tipe: "masuk", tgl: "2026-10-01", jumlah: -5, ket: "x" })).status, 400);
    const list = await (await t.get("/komunitas")).text(); assert.ok(list.includes("Tali kasih") && list.includes("/kegiatan/tali-kasih"));
    const det = await (await t.get("/kegiatan/tali-kasih")).text();
    assert.ok(det.includes("Rp 5.000.000") && det.includes("Rp 2.000.000") && det.includes("Rp 3.000.000"), "KPI dihitung dari tabel");
    const data = JSON.parse(det.match(/id="kdData">([^<]*)</)[1]); assert.deepStrictEqual([data.masuk, data.keluar, data.per.Konsumsi, data.per.Transport], [5000000, 2000000, 1500000, 500000]);
    assert.ok(/Ringkasan dihitung otomatis/.test(det) && !/ilustrasi/i.test(det));
    assert.strictEqual((await t.get("/kegiatan/tidak-ada")).status, 404);
  } finally { t.srv.close(); }
});

test("CTA artikel mengikuti pilihan admin; tanpa pilihan memakai kata kunci judul", async () => {
  const t = await boot();
  try {
    assert.ok(/tutorial-online\?j=tugas/.test(t.app.locals.ktaCta("cara-tugas-tutorial", "Cara tugas tutorial")));
    assert.strictEqual(t.app.locals.ktaCta("lain", "Info jadwal"), "");
    await t.j("/ms/admin/ca/konten/artikel", { slug: "cara-tugas-tutorial", cta: "makalah" }, "PUT");
    assert.ok(/j=makalah/.test(t.app.locals.ktaCta("cara-tugas-tutorial", "Cara tugas tutorial")));
    await t.j("/ms/admin/ca/konten/artikel", { slug: "cara-tugas-tutorial", cta: "" }, "PUT");
    assert.strictEqual(t.app.locals.ktaCta("cara-tugas-tutorial", "Cara tugas tutorial"), "");
  } finally { t.srv.close(); }
});

test("Media: pemakaian dilaporkan agar hapus diblokir", async () => {
  const t = await boot();
  try {
    await t.j("/ms/admin/ca/konten/komunitas", { judul: "Acara", kat: "Akademik", status: "rencana", cover: "/uploads/abc.webp" });
    assert.strictEqual(t.app.locals.kontenUsage("/uploads/abc.webp").length, 1);
    assert.strictEqual(t.app.locals.kontenUsage("/uploads/lain.webp").length, 0);
  } finally { t.srv.close(); }
});

test("Portofolio: ada kotak Status dengan jujur, placeholder berlabel ilustrasi, tanpa klaim afiliasi", async () => {
  const t = await boot();
  try {
    const h = await (await t.get("/tentang")).text();
    assert.ok(h.includes("Status, dengan jujur") && /Belum ada penunjukan atau afiliasi resmi/.test(h));
    assert.ok(/Angka ilustrasi/.test(h) && /ilustrasi, isi dari admin/.test(h));
    assert.ok(!/(duta|mitra resmi|official partner)/i.test(h));
    assert.ok(/prefers-reduced-motion/.test(fs.readFileSync(path.join(__dirname, "../parafrase/pages/konten.css"), "utf8")));
  } finally { t.srv.close(); }
});

test("Bedah teks: tanpa kunci API pesannya jelas; dengan AI palsu menandai A-D dan cek ulang; teks tidak disimpan", async () => {
  const noKey = await boot();
  try {
    const fd = new FormData(); fd.append("text", "Kalimat pertama yang cukup panjang untuk diuji. Dua. Tiga kalimat lagi tanpa sumber.");
    const r = await fetch(noKey.base + "/ms/bedah-teks/analisis", { method: "POST", body: fd }); assert.strictEqual(r.status, 503);
    assert.ok(/kunci API Gemini belum diatur/.test((await r.json()).error));
    const p = await (await noKey.get("/bedah-data-ut")).text();
    for (const x of ["SALIN TEKS", "PILIH FILE", "maksimal 10 MB", "30 halaman", "bukan jaminan skor detektor", "Bedah dengan Gemini"]) assert.ok(p.includes(x), x);
  } finally { noKey.srv.close(); }
  const seen = [];
  const ai = { completeJson: async ({ prompt }) => { seen.push(prompt); return /menulis ulang satu kalimat/.test(prompt) ? { beres: true, judul: "Oke, ini sudah bagus!", pesan: "Pertahankan." } : { items: [{ n: 2, jenis: "A", alasan: "pendek", saran: "gabung" }, { n: 3, jenis: "X", alasan: "", saran: "" }, { n: 99, jenis: "B", alasan: "", saran: "" }] }; } };
  const t = await boot({}, ai);
  try {
    const fd = new FormData(); fd.append("text", "Kalimat pertama yang cukup panjang untuk diuji. Dua. Tiga kalimat lagi tanpa sumber.");
    const j = await (await fetch(t.base + "/ms/bedah-teks/analisis", { method: "POST", body: fd })).json();
    assert.strictEqual(j.sents.length, 3); assert.deepStrictEqual(j.flags.map(f => [f.n, f.jenis]), [[1, "A"]]);
    const c = await (await t.j("/ms/bedah-teks/cek", { lama: "Dua.", baru: "Versi baruku yang lebih panjang dan jelas.", jenis: "A" })).json(); assert.strictEqual(c.beres, true);
    assert.strictEqual((await t.j("/ms/bedah-teks/cek", { lama: "Kalimat pendek ini.", baru: "Kalimat pendek ini.", jenis: "A" }).then(r => r.json())).beres, false);
    const left = fs.readdirSync(t.root, { recursive: true }).join("|"); assert.ok(!/Kalimat pertama/.test(left) && !fs.existsSync(path.join(t.root, "data", "konten.json")) || !/Kalimat pertama/.test(fs.readFileSync(path.join(t.root, "data", "konten.json"), "utf8")));
    const big = new FormData(); big.append("file", new Blob([Buffer.alloc(11 * 1048576)]), "a.docx");
    assert.strictEqual((await fetch(t.base + "/ms/bedah-teks/analisis", { method: "POST", body: big })).status, 400);
  } finally { t.srv.close(); }
});
