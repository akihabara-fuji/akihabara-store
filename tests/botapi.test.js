"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), express = require("express"), Database = require("better-sqlite3");
const mount = require("../parafrase/botapi");
test("botapi: butuh secret; hanya pemilik nomor; status terbaca", async () => {
  process.env.PARAFRASE_WA_SECRET = "rahasia";
  const db = new Database(":memory:"); db.exec("CREATE TABLE orders(id TEXT, status TEXT, wa_number TEXT)"); db.prepare("INSERT INTO orders VALUES('NA-1001','dikerjakan','6281234567890')").run();
  const app = express(); mount({ app, express, db }); const srv = app.listen(0); const base = "http://127.0.0.1:" + srv.address().port;
  const call = (auth, body) => fetch(base + "/ms/internal/bot/order", { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await call(null, { id: "NA-1001", wa: "6281234567890" })).status, 401);
    assert.equal((await call("Bearer salah", { id: "NA-1001", wa: "6281234567890" })).status, 401);
    assert.equal((await call("Bearer rahasia", { id: "NA-1001", wa: "6289999999999" })).status, 404);
    const r = await call("Bearer rahasia", { id: "na-1001", wa: "081234567890" }); assert.equal(r.status, 200); assert.match((await r.json()).text, /sedang dikerjakan/);
  } finally { srv.close(); }
});
