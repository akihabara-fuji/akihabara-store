// Titik masuk: SLOT=wa1 (bot grup) atau SLOT=wa2 (jualan + notifikasi order).
import path from "node:path";
import pino from "pino";
import { loadConfig } from "./core/config.js";
import { openDb } from "./core/db.js";
import { createAi } from "./core/ai.js";
import { createWa } from "./core/wa.js";
import { createHttp } from "./core/http.js";
import { createWa1 } from "./wa1/index.js";
import { createWa2 } from "./wa2/index.js";
import { createSite } from "./wa2/knowledge.js";

const cfg = loadConfig();
if (!["wa1", "wa2"].includes(cfg.slot)) { console.error("SLOT harus wa1 atau wa2"); process.exit(2); }
const log = pino({ level: process.env.LOG_LEVEL || "info", redact: ["cfg.gemini.key", "cfg.secret"] });
const db = openDb(path.join(cfg.dataDir, cfg.slot + ".db"));
const ai = createAi({ cfg, db });
let bot = null;
const wa = createWa({ cfg, log, onMessage: n => bot && bot.handle(n), onState: s => log.info({ state: s }, "status") });
bot = cfg.slot === "wa1" ? createWa1({ cfg, db, wa, ai, log }) : createWa2({ cfg, db, wa, ai, site: createSite({ cfg }), log });
const http = createHttp({ cfg, wa, kirim: cfg.slot === "wa2" ? bot.kirim : null, log });

await http.listen();
await wa.start();
if (bot.tick) setInterval(() => bot.tick().catch(e => log.error({ err: String(e && e.message) }, "tick gagal")), 30000).unref();
// Penjaga: terputus lama tanpa QR menunggu -> keluar supaya systemd menghidupkan ulang dari bersih.
let badSince = 0;
setInterval(() => { const st = wa.status().state; if (["tersambung", "menunggu_qr", "keluar"].includes(st)) badSince = 0; else if (!badSince) badSince = Date.now(); else if (Date.now() - badSince > 10 * 60e3) { log.error("terputus > 10 menit, restart"); process.exit(1); } }, 30000).unref();
process.on("unhandledRejection", e => log.error({ err: String(e && e.message) }, "unhandledRejection"));
process.on("SIGTERM", () => { wa.stop(); http.close(); process.exit(0); });
log.info({ slot: cfg.slot, port: cfg.port }, "bot hidup");
