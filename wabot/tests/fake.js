// Soket tiruan untuk uji: tidak menyentuh WhatsApp sungguhan.
import { openDb } from "../src/core/db.js";
export const log = { info() {}, warn() {}, error() {}, child() { return this; } };
export function fakeWa({ botAdmin = true, groupAdmins = [] } = {}) {
  const sent = [], deleted = [], kicked = [];
  return { sent, deleted, kicked, sendText: async (to, text) => { sent.push({ to, text }); }, deleteMsg: async k => { deleted.push(k); }, kick: async (c, j) => { kicked.push(j); }, groupAdmins: async () => groupAdmins, botIsAdmin: async () => botAdmin, selfIds: () => ["628111", "62811100"] };
}
export const mkdb = () => openDb(":memory:");
let seq = 0;
export const msg = (text, o = {}) => ({ id: "m" + ++seq, key: { id: "m" + seq, remoteJid: o.chat || "120@g.us" }, chat: o.chat || "120@g.us", isGroup: o.isGroup !== false, fromMe: false, sender: (o.from || "6281234567890") + "@s.whatsapp.net", senderIds: [(o.from || "6281234567890") + "@s.whatsapp.net", o.from || "6281234567890"], pushName: "T", text, ts: Date.now(), mentionsBot: !!o.mention, repliesToBot: !!o.reply, mentionCount: o.mentions || 0, isMedia: false });
