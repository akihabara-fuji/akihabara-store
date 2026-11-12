"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const { boot } = require("./pf-helper");

test("kirim perbaikan ke WhatsApp: tautan unduh, antrean wa_outbox, info status, tautan publik", async () => {
  const t = await boot();
  try {
    const now = Date.now(), id = "abcdef0123456780";
    const root = t.root || process.env.PF_ROOT;
    const priv = path.join(t.m.db.name ? path.dirname(t.m.db.name) : ".", "private");
    t.m.db.prepare("INSERT INTO doc_library(id,name,title,kind,size,path,fix_path,fix_name,student_name,wa,source,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,0,?,?)")
      .run(id, "t.docx", "Proposal Uji", "parafrase", 10, "library/x.docx", "library/" + id + ".fix.docx", "hasil.docx", "Rina", "6281234567890", "bedah", now, now + 864e5);
    t.setAdmin(true);
    let r = await fetch(t.base + "/ms/admin/parafrase/dokumen/" + id + "/kirim-wa", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.strictEqual(r.status, 200); const j = await r.json(); assert.strictEqual(j.ok, true);
    const row = t.m.db.prepare("SELECT * FROM wa_outbox WHERE kind='perbaikan'").get();
    assert.ok(row && row.to_number === "6281234567890");
    assert.match(row.text, /tidak menjamin nilai Drillbit turun/); assert.match(row.text, /\/ms\/perbaikan\/[a-f0-9]{40}/);
    const st = await (await fetch(t.base + "/ms/admin/parafrase/dokumen/" + id + "/wa-status")).json(); assert.ok(st.item);
    const tok = /perbaikan\/([a-f0-9]{40})/.exec(row.text)[1];
    t.setAdmin(false);
    assert.strictEqual((await fetch(t.base + "/ms/perbaikan/" + "0".repeat(40))).status, 404);
    // tanpa nomor WA -> ditolak
    t.m.db.prepare("UPDATE doc_library SET wa=NULL WHERE id=?").run(id); t.setAdmin(true);
    r = await fetch(t.base + "/ms/admin/parafrase/dokumen/" + id + "/kirim-wa", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.strictEqual(r.status, 400);
    assert.ok(tok.length === 40);
  } finally { t.srv.close(); }
});
