"use strict";
const test = require("node:test"), assert = require("node:assert");
const { boot } = require("./pf-helper");

test("berkas pustaka akun otomatis tertaut ke pesanan lewat sidik file", async () => {
  const t = await boot();
  try {
    const up = await t.upload(), r = await (await t.order(up)).json();
    const sha = t.m.db.prepare("SELECT sha256 FROM uploads WHERE id=?").get(up).sha256;
    const now = Date.now();
    t.m.db.prepare("INSERT INTO doc_library(id,name,title,kind,size,path,data,student_key,source,pinned,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,?)")
      .run("abcdef0123456789", "t.docx", "t", "parafrase", 10, "library/x.docx", JSON.stringify({ sha }), "user:7", "bedah", now, now + 864e5);
    t.setAdmin(true);
    const j = await (await fetch(t.base + "/ms/admin/parafrase/dokumen?q=" + r.orderId)).json();
    assert.strictEqual(j.items.length, 1, "pesanan menemukan berkasnya");
    assert.strictEqual(j.items[0].orderId, r.orderId);
  } finally { t.srv.close(); }
});
