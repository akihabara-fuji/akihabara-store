/* Antrean: urutan ditentukan di sini, satu-satunya tempat. Aturan:
   1) pesanan "dikerjakan" tidak pernah tergeser (urut waktu mulai),
   2) lalu jalur cepat sebelum biasa,
   3) dalam jalur yang sama, urut waktu bukti bayar diunggah (queue_time), lalu ID.
   Deadline TIDAK memengaruhi urutan. */
"use strict";
const WAITING = ["baru_dibayar", "dianalisis", "dikerjakan"];

function rows(db) {
  const r = db.prepare(`SELECT id, status, lane, word_count, queue_time, work_started_at, deadline_at, created_at FROM orders WHERE status IN ('baru_dibayar','dianalisis','dikerjakan')`).all();
  const rank = o => (o.status === "dikerjakan" ? 0 : o.lane === "cepat" ? 1 : 2);
  r.sort((a, b) => rank(a) - rank(b)
    || (rank(a) === 0 ? (a.work_started_at || 0) - (b.work_started_at || 0) : (a.queue_time || a.created_at) - (b.queue_time || b.created_at))
    || (a.id < b.id ? -1 : 1));
  return r.map((o, i) => ({ ...o, position: i + 1 }));
}

/* Posisi pesanan + perkiraan. Perkiraan bukan jaminan: kata antrean di depan / kecepatan rata-rata admin. */
function info(db, orderId, cfg) {
  const list = rows(db), me = list.find(o => o.id === orderId);
  if (!me) return null;
  const ahead = list.slice(0, me.position - 1);
  const aheadWords = ahead.reduce((n, o) => n + o.word_count, 0);
  const hours = (aheadWords + me.word_count) / Math.max(1, cfg.avg_words_per_hour);
  return { position: me.position, total: list.length, ahead: ahead.length, working: me.status === "dikerjakan", etaHours: Math.max(1, Math.ceil(hours)) };
}

module.exports = { rows, info, WAITING };
