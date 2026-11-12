// Konfigurasi dari environment (.env dimuat oleh systemd EnvironmentFile). Tidak ada nilai rahasia di kode.
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
export function loadConfig(env = process.env) {
  const digits = s => String(s || "").replace(/\D/g, "").replace(/^0/, "62");
  return {
    slot: env.SLOT || "wa1",
    dataDir: env.DATA_DIR || "/opt/wabot2/data",
    authDir: env.AUTH_DIR || "/opt/wabot2/auth/" + (env.SLOT || "wa1"),
    botName: env.BOT_NAME || "Nara",
    admins: String(env.ADMIN_NUMBERS || "6285722227544").split(",").map(digits).filter(Boolean),
    gemini: { key: env.GEMINI_API_KEY || "", model: env.GEMINI_MODEL || "", base: env.GEMINI_BASE || "https://generativelanguage.googleapis.com/v1beta" },
    siteUrl: (env.SITE_INTERNAL_URL || "http://127.0.0.1:3200").replace(/\/+$/, ""),
    secret: env.KIRIM_SECRET || "",
    port: num(env.HUB_PORT, env.SLOT === "wa2" ? 3400 : 3401),
    limits: {
      aiPerUserPerDay: num(env.AI_PER_USER_DAY, 20),
      salesRepliesPerChatPerDay: num(env.SALES_PER_CHAT_DAY, 6),
      salesRepliesPerDay: num(env.SALES_PER_DAY, 150),
      adminQuietHours: num(env.ADMIN_QUIET_HOURS, 6),
      escalationQuietHours: num(env.ESC_QUIET_HOURS, 12),
      notifGapMs: num(env.NOTIF_GAP_MS, 4000),
      notifPerNumberPerDay: num(env.NOTIF_PER_NUMBER_DAY, 8),
    },
  };
}
export const WIB = 7 * 3600e3;
export const dayKey = (ms = Date.now()) => new Date(ms + WIB).toISOString().slice(0, 10);
