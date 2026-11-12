import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
test("migrasi: dry-run tidak menulis; apply menyalin; kedua kali ditolak", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mig-")), src = path.join(d, "old.db"), dst = path.join(d, "new.db");
  const o = new Database(src); o.exec("CREATE TABLE catatan(id INTEGER, chat_id TEXT, isi TEXT, waktu INTEGER); CREATE TABLE finance(id INTEGER, chat_id TEXT, tipe TEXT, jumlah INTEGER, keterangan TEXT, waktu INTEGER)");
  o.prepare("INSERT INTO catatan VALUES(1,'g@g.us','tugas A',1760000000)").run(); o.prepare("INSERT INTO finance VALUES(1,'g@g.us','masuk',50000,'kas',1760000000)").run(); o.prepare("INSERT INTO finance VALUES(2,'g@g.us','keluar',20000,'spidol',1760000100)").run(); o.close();
  const run = (...a) => execFileSync("node", ["src/tools/migrate.js", src, dst, ...a], { encoding: "utf8" });
  run(); assert.equal(fs.existsSync(dst), false);
  assert.match(run("--apply"), /"notes":1,"fin":2/);
  const n = new Database(dst); assert.equal(n.prepare("SELECT COUNT(*) c FROM notes").get().c, 1); assert.equal(n.prepare("SELECT SUM(CASE WHEN type='in' THEN amount ELSE -amount END) s FROM fin").get().s, 30000);
  assert.throws(() => run("--apply"));
});
