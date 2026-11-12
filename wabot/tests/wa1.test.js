import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/core/config.js";
import { createWa1 } from "../src/wa1/index.js";
import { createAi } from "../src/core/ai.js";
import { fakeWa, mkdb, msg, log } from "./fake.js";

const setup = (o = {}) => {
  const cfg = loadConfig({ SLOT: "wa1", ADMIN_NUMBERS: "6285722227544", ...(o.env || {}) }), db = mkdb(), wa = fakeWa(o.wa);
  let t = o.t || Date.UTC(2026, 10, 12, 1, 0);
  const fetchImpl = o.fetchImpl || (async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "Hipotesis adalah dugaan sementara." }] } }] }) }));
  const ai = createAi({ cfg: { ...cfg, gemini: { ...cfg.gemini, key: o.noKey ? "" : "k", model: "m" } }, db, fetchImpl });
  const bot = createWa1({ cfg, db, wa, ai, log, now: () => t });
  return { bot, wa, db, cfg, adv: ms => { t += ms; } };
};
const last = s => s.wa.sent[s.wa.sent.length - 1]?.text;

test("diam bila tidak dipanggil", async () => { const s = setup(); await s.bot.handle(msg("halo semua")); assert.equal(s.wa.sent.length, 0); });
test("catatan: simpan, lihat, hapus", async () => {
  const s = setup(); await s.bot.handle(msg("Putri, catat tugas statistik dikumpul Jumat")); assert.match(last(s), /#1/);
  await s.bot.handle(msg("putri catatan")); assert.match(last(s), /tugas statistik/);
  await s.bot.handle(msg("putri hapus catatan 1")); assert.match(last(s), /dihapus/);
  await s.bot.handle(msg("putri catatan")); assert.match(last(s), /Belum ada/);
});
test("pengingat: buat, daftar, jatuh tempo terkirim sekali", async () => {
  const s = setup(); await s.bot.handle(msg("Putri ingatkan 30 menit lagi kumpul laporan")); assert.match(last(s), /kumpul laporan/);
  await s.bot.tick(); const n0 = s.wa.sent.length; s.adv(31 * 60e3); await s.bot.tick(); assert.equal(s.wa.sent.length, n0 + 1); assert.match(last(s), /Pengingat: kumpul laporan/);
  await s.bot.tick(); assert.equal(s.wa.sent.length, n0 + 1);
});
test("kas: masuk, keluar, saldo, laporan", async () => {
  const s = setup(); await s.bot.handle(msg("putri masuk 50rb kas dari budi")); await s.bot.handle(msg("putri keluar 20rb beli spidol"));
  await s.bot.handle(msg("putri saldo")); assert.match(last(s), /Rp30\.000/);
  await s.bot.handle(msg("putri laporan hari ini")); assert.match(last(s), /Masuk Rp50\.000/);
});
test("kas tiap grup terpisah", async () => {
  const s = setup(); await s.bot.handle(msg("putri masuk 10rb", { chat: "a@g.us" })); await s.bot.handle(msg("putri saldo", { chat: "b@g.us" })); assert.match(last(s), /Rp0/);
});
test("anti-spam: link jualan dihapus + peringatan, 3x dikeluarkan", async () => {
  const s = setup(); const bad = () => msg("Open PO murah! order di shopee.co.id/toko", { from: "6289999" });
  await s.bot.handle(bad()); assert.equal(s.wa.deleted.length, 1); assert.match(last(s), /1\/3/);
  await s.bot.handle(bad()); assert.match(last(s), /2\/3/);
  await s.bot.handle(bad()); assert.equal(s.wa.kicked.length, 1);
});
test("anti-spam: admin bot dan link wajar tidak disentuh", async () => {
  const s = setup(); await s.bot.handle(msg("Open PO murah order shopee.co.id/x", { from: "6285722227544" })); assert.equal(s.wa.deleted.length, 0);
  await s.bot.handle(msg("materi ada di https://youtube.com/watch?v=1", { from: "6289999" })); assert.equal(s.wa.deleted.length, 0);
});
test("anti-spam: undangan grup lain dan flood", async () => {
  const s = setup(); await s.bot.handle(msg("join chat.whatsapp.com/ABC", { from: "6287777" })); assert.equal(s.wa.deleted.length, 1);
  for (let i = 0; i < 8; i++) await s.bot.handle(msg("p" + i, { from: "6286666" })); assert.ok(s.wa.deleted.length >= 2);
});
test("admin grup bisa izinkan domain; non-admin ditolak", async () => {
  const s = setup(); await s.bot.handle(msg("putri izinkan toko.id", { from: "6281" })); assert.match(last(s), /khusus admin/);
  await s.bot.handle(msg("putri izinkan toko.id", { from: "6285722227544" })); assert.match(last(s), /diizinkan/);
});
test("belajar lewat AI; batas harian; AI mati", async () => {
  const s = setup({ env: { AI_PER_USER_DAY: "1" } }); await s.bot.handle(msg("putri jelasin apa itu hipotesis")); assert.match(last(s), /dugaan sementara/);
  await s.bot.handle(msg("putri jelasin apa itu variabel")); assert.match(last(s), /habis/);
  const d = setup({ noKey: true }); await d.bot.handle(msg("putri jelasin apa itu hipotesis")); assert.match(last(d), /sibuk/);
});
test("chat pribadi: dijawab tanpa dipanggil (ngobrol, catatan, kas pribadi)", async () => {
  const s = setup(); const dm = (t) => msg(t, { isGroup: false, chat: "6281@s.whatsapp.net" });
  await s.bot.handle(dm("halo, lagi capek nih")); assert.equal(s.wa.sent.length, 1); assert.match(last(s), /dugaan sementara/);
  await s.bot.handle(dm("catat beli buku")); assert.match(last(s), /#1/);
  await s.bot.handle(dm("masuk 100rb gaji")); await s.bot.handle(dm("saldo")); assert.match(last(s), /Rp100\.000/);
  await s.bot.handle(dm("antispam off")); assert.match(last(s), /dalam grup/);
});
