// Klien Gemini langsung (REST). Timeout, satu kali ulang, dan batas pemakaian per orang per hari. Tidak ada kunci di kode.
import { dayKey } from "./config.js";
import { bump } from "./db.js";
export function createAi({ cfg, db, fetchImpl = globalThis.fetch }) {
  const ready = () => !!(cfg.gemini.key && cfg.gemini.model);
  async function ask({ system, user, history = [], who = "anon", temperature = 0.6, maxTokens = 700, json = false, free = false }) {
    if (!ready()) return { ok: false, reason: "belum_diatur" };
    if (!free) {
      const used = db.prepare("SELECT n FROM usage WHERE day=? AND who=?").get(dayKey(), who);
      if (used && used.n >= cfg.limits.aiPerUserPerDay) return { ok: false, reason: "batas_harian" };
    }
    const body = { systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [...history, { role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) } };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchImpl(`${cfg.gemini.base}/models/${cfg.gemini.model}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": cfg.gemini.key }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
        if (res.status === 429 || res.status >= 500) { if (attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue; } return { ok: false, reason: "sibuk" }; }
        if (!res.ok) return { ok: false, reason: "ditolak_" + res.status };
        const j = await res.json();
        const text = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts || []).map(p => p.text || "").join("").trim();
        if (!text) return { ok: false, reason: "kosong" };
        if (!free) bump(db, "usage", dayKey(), who);
        return { ok: true, text };
      } catch (e) { if (attempt === 1) return { ok: false, reason: "timeout" }; }
    }
    return { ok: false, reason: "sibuk" };
  }
  return { ask, ready };
}
export const AI_DOWN = "Maaf kak, otakku lagi sibuk nih. Coba lagi sebentar ya 🙏";
export const AI_LIMIT = "Jatah tanya AI kakak hari ini sudah habis ya, besok lanjut lagi 🙏";
