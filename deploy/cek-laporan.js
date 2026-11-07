// Diagnosa baca-saja: 3 dokumen terakhir di Dokumen Saya dan hasil baca laporan AI-nya. Tidak mengubah apa pun.
// Jalankan di VPS: cd /var/www/mahyra-serv && curl -fsSL <url-berkas-ini> | node -
const D = require("better-sqlite3")("data/parafrase.db", { readonly: true });
const fs = require("fs"), dr = require("./parafrase/drillbit");
(async () => {
  const rows = D.prepare("SELECT id,name,source,order_id,ai_pct,sim_pct,ai_path,sim_path,datetime(created_at/1000,'unixepoch','localtime') t FROM doc_library ORDER BY created_at DESC LIMIT 3").all();
  if (!rows.length) console.log("Dokumen Saya masih kosong.");
  for (const r of rows) {
    console.log("\n==", r.id, r.name, r.t, "| order", r.order_id, "| AI", r.ai_pct, "| Sim", r.sim_pct);
    if (!r.ai_path) { console.log("tanpa laporan AI"); continue; }
    const p = "data/private/" + r.ai_path;
    if (!fs.existsSync(p)) { console.log("FILE AI HILANG:", p); continue; }
    try {
      const a = await dr.parseAi(fs.readFileSync(p));
      console.log({ ok: a.ok, error: a.error, confidence: a.confidence, aiPct: a.aiPct, matched: a.matchedWords, flagged: a.flaggedWords, blok: (a.blocks || []).length });
    } catch (e) { console.log("parseAi error:", e.message); }
  }
})();
