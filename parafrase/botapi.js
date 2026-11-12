/* API internal untuk bot WhatsApp (WA2): cek status pesanan atas nama pelanggan. Hanya lewat secret bersama (Bearer), tanpa data sensitif. */
"use strict";
const crypto = require("crypto");
const LABEL = {
  menunggu_bayar: "menunggu pembayaran. Bayar lewat QRIS di halaman pesanan, lalu unggah bukti bayar di halaman itu.",
  menunggu_verifikasi: "bukti bayar sudah masuk dan sedang diverifikasi admin.",
  baru_dibayar: "pembayaran sudah diterima dan pesanan masuk antrean.", dianalisis: "sedang dianalisis.", dikerjakan: "sedang dikerjakan.", cek_ulang: "sedang dicek ulang sebelum dikirim.",
  terkirim: "sudah selesai. Hasil bisa diunduh dari halaman pesanan (tersedia sementara).",
  dikembalikan: "dananya dikembalikan.",
  kedaluwarsa: "kedaluwarsa karena belum dibayar. Silakan buat pesanan baru.", dibatalkan: "dibatalkan.",
};
module.exports = function mountBotApi({ app, express, db }) {
  const wa62 = raw => { const d = String(raw || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };
  const ok = req => { const sec = process.env.PARAFRASE_WA_SECRET || ""; if (!sec) return false; const a = Buffer.from(String(req.headers.authorization || "")), b = Buffer.from("Bearer " + sec); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  app.post("/ms/internal/bot/order", express.json({ limit: "2kb" }), (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!ok(req)) return res.status(401).json({ error: "ditolak" });
    const id = String((req.body && req.body.id) || "").toUpperCase(), wa = wa62(req.body && req.body.wa);
    const o = /^NA-\d{3,9}$/.test(id) && wa ? db.prepare("SELECT id, status FROM orders WHERE id=? AND wa_number=?").get(id, wa) : null;
    if (!o) return res.status(404).json({ error: "tidak ketemu" });
    res.json({ status: o.status, text: `Pesanan ${o.id}: ${LABEL[o.status] || "berstatus " + o.status + "."}` });
  });
};
