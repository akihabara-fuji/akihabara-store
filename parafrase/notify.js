/* Kotak keluar WhatsApp. Pesan selalu dicatat dulu (wa_outbox), lalu dikirim lewat bot bila PARAFRASE_WA_WEBHOOK diatur.
   Kontrak webhook: POST JSON {to:"628...", text:"..."} dengan header Authorization: Bearer <PARAFRASE_WA_SECRET>; balasan 2xx = terkirim.
   Tanpa webhook, pesan berstatus "manual": admin bisa membukanya lewat tautan wa.me dari panel. */
"use strict";

module.exports = function createNotifier({ db, settings, fetchImpl }) {
  const doFetch = fetchImpl || (typeof fetch === "function" ? fetch : null);
  const hook = () => process.env.PARAFRASE_WA_WEBHOOK || "";

  function enqueue({ orderId, to, kind, text, dedupe, now = Date.now() }) {
    const key = dedupe || null;
    try {
      db.prepare("INSERT INTO wa_outbox(order_id,to_number,kind,text,status,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?)")
        .run(orderId || null, to, kind, text, hook() ? "queued" : "manual", key, now);
      return true;
    } catch (e) { if (/UNIQUE/.test(String(e.message))) return false; throw e; }
  }

  async function flush(now = Date.now()) {
    const url = hook(); if (!url || !doFetch) return 0;
    const rows = db.prepare("SELECT * FROM wa_outbox WHERE status='queued' AND attempts<5 ORDER BY id LIMIT 20").all();
    let sent = 0;
    for (const r of rows) {
      try {
        const res = await doFetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + (process.env.PARAFRASE_WA_SECRET || "") }, body: JSON.stringify({ to: r.to_number, text: r.text }), signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error("HTTP " + res.status);
        db.prepare("UPDATE wa_outbox SET status='sent', attempts=attempts+1, sent_at=?, last_error=NULL WHERE id=?").run(now, r.id); sent++;
      } catch (e) {
        db.prepare("UPDATE wa_outbox SET attempts=attempts+1, last_error=?, status=CASE WHEN attempts+1>=5 THEN 'failed' ELSE 'queued' END WHERE id=?").run(String(e.message).slice(0, 200), r.id);
      }
    }
    return sent;
  }

  const site = () => (process.env.ACAD_URL || process.env.SITE_URL || "https://nextaja.com").replace(/\/+$/, "");
  const link = o => `${site()}${process.env.ACAD_URL ? "" : "/ruangakademikut"}/pesanan/${o.public_token}`;
  const T = {
    dikonfirmasi: o => `Halo! Pembayaran pesanan ${o.id} sudah dikonfirmasi. Pesananmu masuk antrean Cek dan Parafrase Mandiri. Pantau di sini: ${link(o)}`,
    ditolak: o => `Halo, bukti bayar pesanan ${o.id} belum bisa diverifikasi (${o.reject_reason || "tidak sesuai"}). Silakan unggah bukti yang benar di: ${link(o)}`,
    dikerjakan: o => `Pesanan ${o.id} mulai dikerjakan. Kami kabari lagi setelah selesai. Pantau: ${link(o)}`,
    selesai: (o, cfg) => `Pesanan ${o.id} selesai! Unduh hasil Word-nya di: ${link(o)} . File dihapus otomatis ${cfg.retention_hours} jam setelah ini, jadi segera unduh. Ada 1x revisi gratis dalam waktu itu, hubungi admin (nomor di bawah).`,
    pengingat: (o, cfg) => `Pengingat: file pesanan ${o.id} akan dihapus sekitar ${cfg.reminder_before_delete_hours} jam lagi. Unduh sekarang di: ${link(o)}`,
    kedaluwarsa: o => `Pesanan ${o.id} kedaluwarsa karena pembayaran belum diterima. Kamu bisa membuat pesanan baru kapan saja di ${site()}${process.env.ACAD_URL ? "/" : "/ruangakademikut"}`,
  };
  const footer = cfg => `\n\nPesan otomatis, mohon tidak dibalas ke nomor ini. Pertanyaan atau revisi? Hubungi admin: https://wa.me/${cfg.admin_wa_number || "6285722227544"}`;
  function send(kind, o, now = Date.now()) {
    const cfg = settings.getAll();
    return enqueue({ orderId: o.id, to: o.wa_number, kind, text: T[kind](o, cfg) + footer(cfg), dedupe: `${o.id}:${kind}:${o.revision_no || 0}`, now });
  }
  return { enqueue, flush, send, hookConfigured: () => !!hook() };
};
