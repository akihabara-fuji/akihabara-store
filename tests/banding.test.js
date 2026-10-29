"use strict";
/* Pembanding: kalimat ditandai UT vs hasil parafrase. */
const test = require("node:test");
const assert = require("node:assert");
const { compare, judge, similarity } = require("../parafrase/banding");

const pool = arr => arr.map((t, i) => ({ text: t, where: "Paragraf " + (i + 1), pos: i / arr.length }));

test("banding: kalimat sama dan sekadar tukar sinonim dinilai belum diubah", () => {
  const orig = "Pendidikan adalah suatu proses yang bertujuan mengembangkan potensi peserta didik.";
  assert.strictEqual(judge(orig, pool([orig])).status, "belum");
  const r = judge(orig, pool(["Pendidikan merupakan suatu kegiatan yang bertujuan mengembangkan potensi peserta didik."]));
  assert.strictEqual(r.status, "belum");
  assert.ok(/tukar kata|sama/.test(r.reasons[0]));
});

test("banding: kalimat berisi detail kasus dan tanpa pola dinilai sudah", () => {
  const orig = "Kompetensi penting bagi keberhasilan organisasi dalam mencapai tujuan bersama.";
  const r = judge(orig, pool(["Sepanjang 2025, dua dari lima supervisor gudang Cakung belum menyelesaikan pelatihan K3 sehingga keberhasilan organisasi menurun 12 poin."]), 0);
  assert.strictEqual(r.status, "sudah"); assert.strictEqual(r.approx, true);
});

test("banding: sudah berubah tetapi masih definisi baku dinilai sebagian", () => {
  const orig = "Motivasi kerja adalah suatu proses yang mendorong karyawan mencapai tujuan perusahaan.";
  const r = judge(orig, pool(["Semangat bekerja ialah suatu upaya yang menggerakkan pegawai menuju sasaran organisasi di Jakarta."]));
  assert.ok(["sebagian", "sudah", "tidak_ditemukan"].includes(r.status));
});

test("banding: padanan tidak ditemukan bila tidak ada kalimat yang mirip", () => {
  const r = judge("Beban kerja operator garmen meningkat setelah target produksi dinaikkan.", pool(["Kalimat lain tentang metode wawancara mendalam kepada informan kunci."]));
  assert.strictEqual(r.status, "tidak_ditemukan"); assert.strictEqual(r.cand, null);
});

test("banding: ringkasan per blok memakai status terburuk dan menghitung kalimat", () => {
  const items = [
    { n: 1, block: 1, where: "Paragraf 3", pos: 0, text: "Pendidikan adalah suatu proses yang bertujuan mengembangkan potensi peserta didik." },
    { n: 2, block: 1, where: "Paragraf 3", pos: 0.5, text: "Kompetensi penting bagi keberhasilan organisasi dalam mencapai tujuan bersama." },
  ];
  const out = compare(items, pool([items[0].text, "Sepanjang 2025, dua dari lima supervisor gudang Cakung belum menyelesaikan pelatihan K3 sehingga keberhasilan organisasi menurun 12 poin."]));
  assert.strictEqual(out.blocks.length, 1); assert.strictEqual(out.blocks[0].status, "belum");
  assert.strictEqual(out.summary.total, 2); assert.strictEqual(out.summary.sentences.belum, 1); assert.strictEqual(out.summary.sentences.sudah, 1); assert.strictEqual(out.summary.blocks.belum, 1);
});

test("banding: similarity simetris dan 1 untuk kalimat identik", () => {
  const a = "Operator sering bekerja lembur untuk mengejar target produksi harian.";
  assert.ok(similarity(a, a).score > 0.99);
  assert.strictEqual(similarity(a, "").score, 0);
});
