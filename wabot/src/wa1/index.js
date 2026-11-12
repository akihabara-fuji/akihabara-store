// Bot WA1: khusus grup. Anti-spam, catatan, jadwal/pengingat, kas, bantuan belajar. Merespons hanya jika dipanggil.
import { persona } from "../core/style.js";
import { AI_DOWN, AI_LIMIT } from "../core/ai.js";
import { dayKey } from "../core/config.js";
import { bump } from "../core/db.js";
import { parseIntent, stripWake, rupiah, fmtWhen } from "./parse.js";
import { createAntispam, hostOf } from "./antispam.js";
import { createFeatures } from "./features.js";

const HELP = n => `Halo kak, aku ${n}, asisten grup ini 👋 Panggil namaku atau balas pesanku ya. Contoh:
• *${n}, catat* tugas statistik dikumpul Jumat
• *${n}, catatan* (lihat) / *hapus catatan 3*
• *${n}, ingatkan* besok jam 7 pagi kumpul laporan
• *${n}, pengingat* (lihat) / *batal pengingat 2*
• *${n}, masuk* 50rb kas minggu ini • *keluar* 20rb beli spidol
• *${n}, saldo* • *laporan hari ini / minggu / bulan*
• *${n}, jelasin* apa itu hipotesis (bantuan belajar siswa & guru)
Khusus admin: *antispam on/off*, *izinkan youtube.com*.`;

export function createWa1({ cfg, db, wa, ai, log, now = () => Date.now() }) {
  const feat = createFeatures({ db, now }), spam = createAntispam({ db, cfg, now });
  const adminCache = new Map(); // chat -> {t, ids}
  const isBotAdmin = n => n.senderIds.some(i => cfg.admins.includes(i.replace(/\D/g, "")) );
  async function isGroupAdmin(n) {
    if (isBotAdmin(n)) return true;
    let e = adminCache.get(n.chat);
    if (!e || now() - e.t > 5 * 60e3) { try { e = { t: now(), ids: await wa.groupAdmins(n.chat) }; adminCache.set(n.chat, e); } catch { e = e || { t: now(), ids: [] }; } }
    return n.senderIds.some(i => e.ids.includes(i));
  }
  const say = (chat, text) => wa.sendText(chat, text);
  const who = n => n.senderIds[1] || n.sender;

  async function handleSpam(n) {
    if (await isGroupAdmin(n)) return false;
    const v = spam.inspect(n); if (!v) return false;
    let canAct = false; try { canAct = await wa.botIsAdmin(n.chat); } catch { /* */ }
    const count = spam.strike(n.chat, n.sender);
    log.info({ chat: n.chat, reason: v.reason, count }, "spam terdeteksi");
    if (canAct) { try { await wa.deleteMsg(n.key); } catch { /* */ } }
    const tag = "@" + (n.senderIds[1] || "");
    if (count >= 3 && canAct) { try { await wa.kick(n.chat, n.sender); spam.clear(n.chat, n.sender); await say(n.chat, `${tag} dikeluarkan dari grup karena berulang kali melanggar aturan (${v.detail}). Terima kasih pengertiannya semua 🙏`); } catch { /* */ } return true; }
    await say(n.chat, `${tag} mohon maaf kak, pesan tadi ${canAct ? "dihapus" : "melanggar aturan grup"}: ${v.detail}. Peringatan ${Math.min(count, 3)}/3 ya, jangan diulang 🙏`);
    return true;
  }

  const addressed = n => n.mentionsBot || n.repliesToBot || new RegExp("\\b" + cfg.botName.toLowerCase() + "\\b", "i").test(n.text) || /^[!/]/.test(n.text);

  async function handle(n) {
    if (n.fromMe || !n.text) return;
    if (!n.isGroup) { // khusus grup: balas satu kali per hari
      const c = bump(db, "sent_log", dayKey(now()), n.chat, "dm_info");
      if (c === 1) await say(n.chat, `Halo kak 👋 Aku ${cfg.botName}, asisten khusus grup, jadi tidak melayani chat pribadi. Untuk pesan layanan Catatan Akademik, hubungi admin ya 🙏`);
      return;
    }
    if (await handleSpam(n)) return;
    if (!addressed(n)) return;
    const text = stripWake(n.text, cfg.botName), it = parseIntent(text, now());
    const by = who(n), chat = n.chat;
    switch (it.intent) {
      case "kosong": case "bantuan": return say(chat, HELP(cfg.botName));
      case "status": return say(chat, `Aku aktif kak ✅ Anti-spam: ${spam.getCfg(chat).antispam ? "nyala" : "mati"}. AI: ${ai.ready() ? "siap" : "belum diatur"}.`);
      case "antispam": case "izin_domain": case "cabut_domain": {
        if (!(await isGroupAdmin(n))) return say(chat, "Perintah ini khusus admin grup ya kak 🙏");
        if (it.intent === "antispam") { spam.setCfg(chat, { antispam: it.on ? 1 : 0 }); return say(chat, `Anti-spam ${it.on ? "dinyalakan" : "dimatikan"} untuk grup ini.`); }
        const d = hostOf(it.domain); if (!d) return say(chat, "Domainnya belum jelas kak, contoh: izinkan youtube.com");
        const c = spam.getCfg(chat), list = new Set(String(c.allow_domains || "").split(",").filter(Boolean));
        it.intent === "izin_domain" ? list.add(d) : list.delete(d);
        spam.setCfg(chat, { allow_domains: [...list].join(",") });
        return say(chat, it.intent === "izin_domain" ? `Link dari ${d} sekarang diizinkan di grup ini.` : `Izin untuk ${d} dicabut.`);
      }
      case "catatan_simpan": { const id = feat.noteAdd(chat, by, it.title, it.text); return say(chat, `Siap kak, dicatat sebagai #${id} ✅`); }
      case "catatan_daftar": return say(chat, feat.noteFmt(feat.noteList(chat)) || "Belum ada catatan di grup ini kak. Coba: " + cfg.botName + ", catat ...");
      case "catatan_hapus": return say(chat, feat.noteDel(chat, it.id) ? `Catatan #${it.id} dihapus.` : `Catatan #${it.id} tidak ketemu kak.`);
      case "ingat_buat": { const id = feat.remAdd(chat, by, it.text, it.at); return say(chat, `Oke kak, aku ingatkan ${fmtWhen(it.at)}: "${it.text}" (#${id}) ⏰`); }
      case "ingat_gagal": return say(chat, "Aku belum nangkep waktunya kak. Coba tulis begini: \"ingatkan besok jam 7 pagi kumpul laporan\" atau \"2 jam lagi\".");
      case "ingat_daftar": return say(chat, feat.remFmt(feat.remList(chat)) || "Belum ada pengingat aktif kak.");
      case "ingat_batal": return say(chat, feat.remCancel(chat, it.id) ? `Pengingat #${it.id} dibatalkan.` : `Pengingat #${it.id} tidak ketemu kak.`);
      case "kas_catat": { const id = feat.finAdd(chat, by, it.type, it.amount, it.note); return say(chat, `Tercatat #${id}: ${it.type === "in" ? "masuk" : "keluar"} ${rupiah(it.amount)}${it.note ? " (" + it.note + ")" : ""}. Saldo kas: ${rupiah(feat.balance(chat))}`); }
      case "kas_saldo": return say(chat, `Saldo kas grup saat ini ${rupiah(feat.balance(chat))}.`);
      case "kas_laporan": return say(chat, feat.reportText(chat, it.periode));
      case "kas_hapus": return say(chat, feat.finDel(chat, it.id) ? `Transaksi #${it.id} dihapus. Saldo kas: ${rupiah(feat.balance(chat))}` : `Transaksi #${it.id} tidak ketemu kak.`);
      default: return tanya(n, it.text);
    }
  }

  async function tanya(n, q) {
    if (q.length < 4) return say(n.chat, HELP(cfg.botName));
    const sys = persona(cfg.botName, "asisten belajar untuk siswa, mahasiswa, dan guru di grup WhatsApp") + " Bantu menjelaskan materi, membuat soal latihan, ringkasan, atau perangkat ajar. Jangan menulis tugas penuh untuk dikumpulkan; arahkan cara mengerjakannya. Tolak dengan sopan permintaan di luar belajar/mengajar.";
    const r = await ai.ask({ system: sys, user: q, who: who(n) });
    if (r.ok) return say(n.chat, r.text);
    return say(n.chat, r.reason === "batas_harian" ? AI_LIMIT : AI_DOWN);
  }

  async function tick() { // dipanggil tiap 30 detik: kirim pengingat yang jatuh tempo
    for (const r of feat.remDue()) {
      if (now() - r.due_at > 24 * 3600e3) { feat.remDone(r.id); continue; }
      try { await say(r.chat, `⏰ Pengingat: ${r.text}`); feat.remDone(r.id); } catch (e) { log.warn({ id: r.id }, "pengingat belum terkirim"); break; }
    }
  }
  return { handle, tick, feat, spam };
}
