// Bot WA2: (1) kirim notifikasi order dari situs, (2) chatbot jualan sopan dengan pagar anti-spam & eskalasi ke admin.
import { persona } from "../core/style.js";
import { dayKey } from "../core/config.js";
import { bump } from "../core/db.js";

const ESC_RE = /\b(sudah\s+(?:bayar|transfer)|bukti\s+(?:bayar|transfer)|transfer|dana|gopay|ovo|qris\s+(?:gagal|error)|komplain|complain|kecewa|refund|uang\s+kembali|penipu|tipu|scam|lapor|salah|error|gagal|rusak|tidak\s+bisa\s+(?:dibuka|download|unduh)|belum\s+(?:masuk|terkirim|dapat)|marah|mau\s+(?:ngomong|bicara)\s+(?:sama\s+)?(?:admin|orang|manusia)|hubungi\s+admin)\b/i;
const STOP_RE = /^\s*(stop|berhenti|unsubscribe|jangan\s+(?:kirim|hubungi)(?:\s+lagi)?|cukup)\s*[.!]*\s*$/i;
const START_RE = /^\s*(mulai|lanjut|aktifkan)\s*[.!]*\s*$/i;
const toJid = n => String(n).replace(/\D/g, "") + "@s.whatsapp.net";
export const wa62 = raw => { const d = String(raw || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, ""); return /^8\d{8,12}$/.test(d) ? "62" + d : null; };

export function createWa2({ cfg, db, wa, ai, site, log, now = () => Date.now() }) {
  const hrs = h => h * 3600e3;
  const state = jid => db.prepare("SELECT * FROM chat_state WHERE jid=?").get(jid) || { jid, admin_until: 0, esc_until: 0, day: null, replies_today: 0, greeted: 0 };
  const save = s => db.prepare("INSERT INTO chat_state(jid,admin_until,esc_until,day,replies_today,greeted) VALUES(?,?,?,?,?,?) ON CONFLICT(jid) DO UPDATE SET admin_until=excluded.admin_until,esc_until=excluded.esc_until,day=excluded.day,replies_today=excluded.replies_today,greeted=excluded.greeted").run(s.jid, s.admin_until, s.esc_until, s.day, s.replies_today, s.greeted);
  const optedOut = jid => !!db.prepare("SELECT 1 FROM optout WHERE jid=?").get(jid);
  const adminJid = () => toJid(cfg.admins[0]);
  let chain = Promise.resolve(); // antrean kirim satu per satu agar jeda terjaga
  const queued = fn => (chain = chain.then(fn, fn));

  // ---------- 1. notifikasi order dari situs (kontrak: POST {to,text}, Bearer secret; 2xx = terkirim)
  async function kirim({ to, text }) {
    const num = wa62(to);
    if (!num || typeof text !== "string" || !text.trim() || text.length > 4000) return { code: 400, body: { ok: false, error: "data tidak valid" } };
    const day = dayKey(now());
    if (bump(db, "sent_log", day, num, "notif") > cfg.limits.notifPerNumberPerDay) return { code: 429, body: { ok: false, error: "batas harian nomor ini" } };
    try { await queued(async () => { await new Promise(r => setTimeout(r, cfg.limits.notifGapMs)); await wa.sendText(toJid(num), text.trim(), { space: true }); }); return { code: 200, body: { ok: true } }; }
    catch (e) { return { code: e.code === 503 ? 503 : 502, body: { ok: false, error: "gagal kirim" } }; }
  }

  // ---------- 2. pesan masuk
  async function handle(n) {
    if (n.isGroup || !n.chat.endsWith("@s.whatsapp.net")) return;
    const s = state(n.chat), t = now();
    if (n.fromMe) { s.admin_until = t + hrs(cfg.limits.adminQuietHours); save(s); return; } // admin membalas manual -> bot diam
    if (!n.text) return;
    const num = n.senderIds[1];
    if (STOP_RE.test(n.text)) { db.prepare("INSERT OR REPLACE INTO optout(jid,at) VALUES(?,?)").run(n.chat, t); return reply(n.chat, s, "Baik kak, aku tidak akan menghubungi lagi. Kalau berubah pikiran, kirim *MULAI* ya. Terima kasih 🙏", true); }
    if (START_RE.test(n.text) && optedOut(n.chat)) { db.prepare("DELETE FROM optout WHERE jid=?").run(n.chat); return reply(n.chat, s, "Siap kak, aku aktif lagi. Ada yang bisa dibantu?", true); }
    if (optedOut(n.chat)) return;
    if (t < s.admin_until || t < s.esc_until) return; // admin sedang menangani

    const idm = n.text.match(/\bNA-\d{3,9}\b/i);
    if (idm) { const r = await site.orderStatus(idm[0].toUpperCase(), num); if (r && r.found) return reply(n.chat, s, r.text || `Pesanan ${idm[0].toUpperCase()} berstatus: ${r.status}.`); if (r && !r.found) return reply(n.chat, s, "Pesanan itu belum ketemu dengan nomor ini kak. Pastikan ID dan nomor WhatsApp yang dipakai saat memesan sama ya. Kalau masih bingung, kuteruskan ke admin.", false, true); }

    if (ESC_RE.test(n.text)) return escalate(n, s, "pesan penting (pembayaran/komplain)");
    return jawab(n, s);
  }

  async function reply(chat, s, text, force = false, countOnly = false) {
    const day = dayKey(now());
    if (s.day !== day) { s.day = day; s.replies_today = 0; }
    if (!force) {
      if (s.replies_today >= cfg.limits.salesRepliesPerChatPerDay) return;
      if (bump(db, "sent_log", day, "_all", "sales") > cfg.limits.salesRepliesPerDay) return;
    }
    s.replies_today++; save(s);
    await queued(() => wa.sendText(chat, text));
  }

  async function escalate(n, s, why) {
    const t = now(); s.esc_until = t + hrs(cfg.limits.escalationQuietHours); save(s);
    await queued(() => wa.sendText(adminJid(), `📨 Perlu dibalas (${why})\nDari: wa.me/${n.senderIds[1]}${n.pushName ? " (" + n.pushName + ")" : ""}\n\n"${n.text.slice(0, 600)}"`));
    await reply(n.chat, state(n.chat), "Terima kasih kak, pesannya sudah kuteruskan ke admin. Admin akan membalas langsung ya, mohon ditunggu 🙏", true);
  }

  async function jawab(n, s) {
    const know = await site.knowledge();
    const first = !s.greeted;
    if (!ai.ready() || !know) {
      if (!first) return;
      s.greeted = 1; return reply(n.chat, s, `Halo kak 👋 Aku asisten otomatis Catatan Akademik / NextAja. Admin akan membalas pesan kakak secepatnya ya. Lihat layanan di nextaja.com. (Balas *BERHENTI* kalau tidak ingin dihubungi.)`);
    }
    const sys = persona(cfg.botName === "Nara" ? "Nara" : cfg.botName, "asisten otomatis penjualan Catatan Akademik dan NextAja (bukan manusia; akui itu bila ditanya)") +
      `\n\nPengetahuan resmi (satu-satunya sumber harga & layanan):\n${know}\n\nAturan: jangan menjanjikan hasil/nilai; jangan menerima atau meminta password/kode OTP/data bank; pembayaran hanya lewat halaman pesanan di situs; jangan menekan atau membujuk berlebihan; jika kakak sudah jelas tidak berminat, hormati. Jika pertanyaan di luar pengetahuan di atas, atau pelanggan ingin bicara dengan manusia, awali jawaban dengan [ADMIN] lalu satu kalimat singkat.${first ? "\nIni pesan pertama: perkenalkan diri sebagai asisten otomatis dalam satu kalimat." : ""}`;
    const r = await ai.ask({ system: sys, user: n.text.slice(0, 800), who: "sales:" + n.chat, free: true });
    if (!r.ok) { if (first) { s.greeted = 1; await reply(n.chat, s, "Halo kak 👋 Aku asisten otomatis NextAja. Saat ini aku belum bisa jawab detail, admin akan membalas ya 🙏"); } return; }
    if (/^\s*\[ADMIN\]/i.test(r.text)) return escalate(n, s, "di luar bahan chatbot");
    s.greeted = 1;
    await reply(n.chat, s, first ? r.text + "\n\n(Balas *BERHENTI* kalau tidak ingin dihubungi.)" : r.text);
  }
  return { handle, kirim };
}
