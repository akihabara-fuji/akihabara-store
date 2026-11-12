import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/core/config.js";
import { createWa2 } from "../src/wa2/index.js";
import { build } from "../src/wa2/knowledge.js";
import { createAi } from "../src/core/ai.js";
import { fakeWa, mkdb, msg, log } from "./fake.js";

const PUB = { price_per_word: 30, min_order_price: 40000, free_words: 500, bedah_harga_per_1000: 10000, fast_lane: { enabled: true, price: 40000, remaining: 3 } };
const LAY = { tugas: { label: "Tugas", price: 35000, closed: true }, metopen2: { label: "Metopen Tugas 2", price: 250000, closed: false } };
const setup = (o = {}) => {
  const cfg = loadConfig({ SLOT: "wa2", ADMIN_NUMBERS: "6285722227544", NOTIF_GAP_MS: "0", ...(o.env || {}) }), db = mkdb(), wa = fakeWa();
  let t = Date.UTC(2026, 10, 12, 1, 0), aiText = o.aiText || "Cek & Parafrase Rp30 per kata ya kak.";
  const ai = createAi({ cfg: { ...cfg, gemini: { ...cfg.gemini, key: o.noKey ? "" : "k", model: "m" } }, db, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: aiText }] } }] }) }) });
  const site = { knowledge: async () => build(PUB, LAY), orderStatus: async (id, wa) => id === "NA-1001" && wa === "6281234567890" ? { found: true, text: "Pesanan NA-1001 sedang dikerjakan." } : { found: false } };
  const bot = createWa2({ cfg, db, wa, ai, site, log, now: () => t });
  return { bot, wa, db, adv: ms => { t += ms; }, setAi: x => { aiText = x; } };
};
const dm = (text, o = {}) => msg(text, { isGroup: false, chat: (o.from || "6281234567890") + "@s.whatsapp.net", from: o.from });

test("pengetahuan: hanya layanan terbuka ditawarkan, yang tutup ditandai", () => {
  const k = build(PUB, LAY); assert.match(k, /Metopen Tugas 2 Rp250\.000/); assert.match(k, /DITUTUP[^\n]*Tugas/); assert.match(k, /TIDAK ADA jaminan/);
});
test("notifikasi order terkirim; nomor/isi tak valid ditolak; batas harian", async () => {
  const s = setup({ env: { NOTIF_PER_NUMBER_DAY: "2" } });
  assert.equal((await s.bot.kirim({ to: "6281234567890", text: "halo" })).code, 200); assert.equal(s.wa.sent[0].to, "6281234567890@s.whatsapp.net");
  assert.equal((await s.bot.kirim({ to: "123", text: "x" })).code, 400); assert.equal((await s.bot.kirim({ to: "08123456789", text: "" })).code, 400);
  await s.bot.kirim({ to: "6281234567890", text: "b" }); assert.equal((await s.bot.kirim({ to: "6281234567890", text: "c" })).code, 429);
});
test("sapaan pertama menyebut asisten otomatis + opsi berhenti", async () => {
  const s = setup(); await s.bot.handle(dm("harga cek parafrase berapa?")); assert.match(s.wa.sent[0].text, /BERHENTI/);
});
test("berhenti = tak dibalas lagi; mulai = aktif lagi", async () => {
  const s = setup(); await s.bot.handle(dm("berhenti")); const n = s.wa.sent.length; await s.bot.handle(dm("harga berapa")); assert.equal(s.wa.sent.length, n);
  await s.bot.handle(dm("mulai")); await s.bot.handle(dm("harga berapa")); assert.ok(s.wa.sent.length > n);
});
test("admin membalas manual -> bot diam sesuai jam tenang, lalu aktif lagi", async () => {
  const s = setup(); const me = dm("ok kak", {}); me.fromMe = true; await s.bot.handle(me);
  await s.bot.handle(dm("harga berapa")); assert.equal(s.wa.sent.length, 0);
  s.adv(7 * 3600e3); await s.bot.handle(dm("harga berapa")); assert.equal(s.wa.sent.length, 1);
});
test("pembayaran/komplain diteruskan ke admin dan chat didiamkan", async () => {
  const s = setup(); await s.bot.handle(dm("saya sudah transfer tapi belum masuk"));
  assert.equal(s.wa.sent.length, 2); assert.equal(s.wa.sent[0].to, "6285722227544@s.whatsapp.net"); assert.match(s.wa.sent[0].text, /sudah transfer/);
  await s.bot.handle(dm("halo?")); assert.equal(s.wa.sent.length, 2);
});
test("jawaban [ADMIN] dari AI -> eskalasi", async () => {
  const s = setup({ aiText: "[ADMIN] Itu perlu dicek admin." }); await s.bot.handle(dm("bisa bikinin skripsi sampai lulus?")); assert.equal(s.wa.sent[0].to, "6285722227544@s.whatsapp.net");
});
test("cek status pesanan hanya untuk nomor pemilik", async () => {
  const s = setup(); await s.bot.handle(dm("cek NA-1001")); assert.match(s.wa.sent[0].text, /sedang dikerjakan/);
  const o = setup(); await o.bot.handle(dm("cek NA-1001", { from: "6289990001111" })); assert.match(o.wa.sent[0].text, /belum ketemu/);
});
test("batas balasan harian per chat", async () => {
  const s = setup({ env: { SALES_PER_CHAT_DAY: "2" } }); for (let i = 0; i < 5; i++) await s.bot.handle(dm("harga berapa " + i)); assert.equal(s.wa.sent.length, 2);
});
test("AI mati: sapa sekali lalu diam (admin menjawab)", async () => {
  const s = setup({ noKey: true }); await s.bot.handle(dm("halo")); await s.bot.handle(dm("halo lagi")); assert.equal(s.wa.sent.length, 1);
});
test("grup diabaikan total", async () => {
  const s = setup(); await s.bot.handle(msg("harga berapa?")); assert.equal(s.wa.sent.length, 0);
});
