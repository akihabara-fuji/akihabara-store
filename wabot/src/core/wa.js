// Penyambung nomor WhatsApp (Baileys): sambung ulang otomatis, QR, normalisasi pesan, kirim dengan jeda acak.
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const digitsOf = j => String(j || "").split("@")[0].split(":")[0].replace(/\D/g, "");
export const idsOf = (...jids) => [...new Set(jids.filter(Boolean).flatMap(j => [String(j), digitsOf(j)]))];

export function textOf(message) {
  const m = message || {};
  const x = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m;
  return x.conversation || x.extendedTextMessage?.text || x.imageMessage?.caption || x.videoMessage?.caption || x.documentMessage?.caption || "";
}

/** Ubah pesan mentah Baileys jadi bentuk sederhana yang mudah diuji. */
export function normalize(raw, selfIds = []) {
  const key = raw.key || {}, msg = raw.message || {};
  const inner = msg.ephemeralMessage?.message || msg.viewOnceMessage?.message || msg;
  const ctx = (inner.extendedTextMessage || inner.imageMessage || inner.videoMessage || inner.documentMessage || {}).contextInfo || {};
  const chat = key.remoteJid || "", isGroup = chat.endsWith("@g.us");
  const senderJid = isGroup ? (key.participant || raw.participant) : chat;
  const senderIds = idsOf(senderJid, key.participantAlt, key.participantPn, key.remoteJidAlt, raw.participant);
  const mentioned = (ctx.mentionedJid || []).flatMap(j => idsOf(j));
  const quotedBy = ctx.participant ? idsOf(ctx.participant) : [];
  return { id: key.id, key, chat, isGroup, fromMe: !!key.fromMe, sender: senderJid, senderIds, pushName: raw.pushName || "", text: textOf(msg).trim(), ts: Number(raw.messageTimestamp) * 1000 || Date.now(),
    mentionsBot: mentioned.some(i => selfIds.includes(i)), repliesToBot: quotedBy.some(i => selfIds.includes(i)), mentionCount: (ctx.mentionedJid || []).length, isMedia: !!(inner.imageMessage || inner.videoMessage || inner.documentMessage || inner.audioMessage || inner.stickerMessage) };
}

export function createWa({ cfg, log, onMessage, onState, importer }) {
  let sock = null, state = "mulai", qr = null, qrAt = 0, lastError = null, openedAt = 0, retry = 0, stopped = false, me = [];
  const sentIds = new Set();
  const gap = { last: 0 };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const set = s => { if (state !== s) { state = s; onState && onState(s); } };

  async function connect() {
    if (stopped) return;
    const baileys = importer ? await importer() : await import("baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;
    fs.mkdirSync(cfg.authDir, { recursive: true, mode: 0o700 });
    const { state: auth, saveCreds } = await useMultiFileAuthState(cfg.authDir);
    let version; try { version = (await fetchLatestBaileysVersion()).version; } catch { /* pakai bawaan */ }
    set("menyambung");
    sock = makeWASocket({ auth, version, logger: log.child({ m: "baileys" }, { level: "silent" }), browser: Browsers ? Browsers.ubuntu("Chrome") : undefined, markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: false });
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async u => {
      if (u.qr) { qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 360 }); qrAt = Date.now(); set("menunggu_qr"); }
      if (u.connection === "open") { qr = null; retry = 0; openedAt = Date.now(); lastError = null; me = idsOf(sock.user?.id, sock.user?.lid); set("tersambung"); log.info({ me: me[1] }, "tersambung"); }
      if (u.connection === "close") {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        lastError = code ? "kode " + code : "terputus";
        if (code === DisconnectReason.loggedOut) { set("keluar"); log.warn("sesi logout: perlu scan QR ulang"); return; }
        set("menyambung_ulang"); retry++;
        const wait = Math.min(60000, 2000 * 2 ** Math.min(retry, 5));
        log.warn({ code, wait }, "terputus, coba lagi");
        setTimeout(() => connect().catch(e => log.error(e, "gagal menyambung")), wait);
      }
    });
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;
      for (const raw of messages) {
        try {
          if (!raw.message) continue;
          const n = normalize(raw, me);
          if (n.fromMe && sentIds.has(n.id)) continue; // pesan kiriman bot sendiri
          Promise.resolve(onMessage(n)).catch(e => log.error({ err: String(e && e.message) }, "handler gagal"));
        } catch (e) { log.error({ err: String(e && e.message) }, "normalisasi gagal"); }
      }
    });
  }

  async function sendText(jid, text, { typing = true, space = true } = {}) {
    if (!sock || state !== "tersambung") throw Object.assign(new Error("belum terhubung"), { code: 503 });
    if (space) { const wait = Math.max(0, gap.last + 1500 + Math.random() * 2500 - Date.now()); if (wait) await sleep(wait); }
    if (typing) { try { await sock.sendPresenceUpdate("composing", jid); await sleep(Math.min(3500, 500 + text.length * 12)); await sock.sendPresenceUpdate("paused", jid); } catch { /* abaikan */ } }
    const r = await sock.sendMessage(jid, { text }); gap.last = Date.now();
    if (r && r.key && r.key.id) { sentIds.add(r.key.id); if (sentIds.size > 500) sentIds.delete(sentIds.values().next().value); }
    return r;
  }
  const api = {
    start: connect, sendText,
    deleteMsg: key => sock.sendMessage(key.remoteJid, { delete: key }),
    kick: (chat, jid) => sock.groupParticipantsUpdate(chat, [jid], "remove"),
    async groupAdmins(chat) { const m = await sock.groupMetadata(chat); return m.participants.filter(p => p.admin).flatMap(p => idsOf(p.id, p.lid, p.phoneNumber)); },
    async botIsAdmin(chat) { const m = await sock.groupMetadata(chat); return m.participants.some(p => p.admin && idsOf(p.id, p.lid, p.phoneNumber).some(i => me.includes(i))); },
    selfIds: () => me,
    status: () => ({ slot: cfg.slot, state, number: me[1] || null, connectedSince: openedAt || null, lastError, qrAvailable: !!qr, qrAt: qrAt || null }),
    qr: () => qr,
    async relink() { // pindahkan sesi lama ke samping (tidak dihapus) lalu minta QR baru
      stopped = true; try { sock && sock.end(undefined); } catch { /* sudah mati */ }
      if (fs.existsSync(cfg.authDir)) fs.renameSync(cfg.authDir, cfg.authDir + ".lama-" + Date.now());
      stopped = false; qr = null; retry = 0; await connect();
    },
    stop() { stopped = true; try { sock && sock.end(undefined); } catch { /* */ } },
  };
  return api;
}
