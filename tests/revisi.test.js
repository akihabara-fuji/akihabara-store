"use strict";
const test = require("node:test"), assert = require("node:assert");
const { checkFree, familyOf } = require("../parafrase/revisi.js");
const SV = { tugas: { kind: "tugas" }, diskusi: { kind: "diskusi" }, metopen2: { kind: "metopen" }, metopen_paket: { kind: "metopen" }, revisi_tugas: { kind: "revisi", of: "tugas" }, revisi_metopen: { kind: "revisi", of: "metopen" } };
const order = (service, extra) => Object.assign({ doc_type: "layanan", wa_number: "62811", status: "terkirim", service }, extra);
const run = (svKey, parent, used) => checkFree({ sv: SV[svKey], parent, parentSv: parent && SV[parent.service], wa: "62811", used });
test("revisi pertama untuk hasil buatan kami gratis", () => { assert.strictEqual(run("revisi_tugas", order("tugas"), 0), null); });
test("hasil revisi yang masih belum sesuai bisa direvisi lagi gratis (rantai)", () => {
  assert.strictEqual(run("revisi_tugas", order("revisi_tugas"), 0), null);
  assert.strictEqual(run("revisi_metopen", order("revisi_metopen"), 0), null);
});
test("pesanan awal yang sudah direvisi diarahkan ke ID revisi terakhir", () => {
  const r = run("revisi_tugas", order("tugas"), 1); assert.strictEqual(r.status, 409); assert.match(r.error, /revisi yang terakhir/);
});
test("paket komplit Metopen tanpa batas", () => { assert.strictEqual(run("revisi_metopen", order("metopen_paket"), 5), null); });
test("tahap Metopen biasa boleh direvisi gratis", () => { assert.strictEqual(run("revisi_metopen", order("metopen2"), 0), null); });
test("ditolak: jenis layanan beda, nomor WA beda, belum selesai, ID tidak ada", () => {
  assert.strictEqual(run("revisi_tugas", order("diskusi"), 0).status, 404);
  assert.strictEqual(run("revisi_tugas", order("tugas", { wa_number: "62899" }), 0).status, 404);
  assert.strictEqual(run("revisi_tugas", order("tugas", { status: "dikerjakan" }), 0).status, 409);
  assert.strictEqual(run("revisi_tugas", null, 0).status, 404);
  assert.strictEqual(run("revisi_tugas", order("tugas", { doc_type: "parafrase" }), 0).status, 404);
});
test("familyOf", () => { assert.strictEqual(familyOf(SV.revisi_tugas), "tugas"); assert.strictEqual(familyOf(SV.metopen2), "metopen"); });
