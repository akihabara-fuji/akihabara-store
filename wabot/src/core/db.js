import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
export function openDb(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
  CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT NOT NULL, title TEXT, text TEXT NOT NULL, by TEXT, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS fin(id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT NOT NULL, day TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, by TEXT, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS reminders(id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT NOT NULL, by TEXT, text TEXT NOT NULL, due_at INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS reminders_due ON reminders(done, due_at);
  CREATE TABLE IF NOT EXISTS group_cfg(chat TEXT PRIMARY KEY, antispam INTEGER NOT NULL DEFAULT 1, strict_links INTEGER NOT NULL DEFAULT 1, flood_limit INTEGER NOT NULL DEFAULT 6, allow_domains TEXT NOT NULL DEFAULT '');
  CREATE TABLE IF NOT EXISTS warnings(chat TEXT NOT NULL, member TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL, PRIMARY KEY(chat, member));
  CREATE TABLE IF NOT EXISTS usage(day TEXT NOT NULL, who TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, who));
  CREATE TABLE IF NOT EXISTS faq(id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT NOT NULL, q TEXT, a TEXT);
  CREATE TABLE IF NOT EXISTS optout(jid TEXT PRIMARY KEY, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS chat_state(jid TEXT PRIMARY KEY, admin_until INTEGER NOT NULL DEFAULT 0, esc_until INTEGER NOT NULL DEFAULT 0, day TEXT, replies_today INTEGER NOT NULL DEFAULT 0, greeted INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS sent_log(day TEXT NOT NULL, to_jid TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, to_jid, kind));
  `);
  return db;
}
export const bump = (db, table, day, who, extra) => {
  if (table === "usage") { db.prepare("INSERT INTO usage(day,who,n) VALUES(?,?,1) ON CONFLICT(day,who) DO UPDATE SET n=n+1").run(day, who); return db.prepare("SELECT n FROM usage WHERE day=? AND who=?").get(day, who).n; }
  db.prepare("INSERT INTO sent_log(day,to_jid,kind,n) VALUES(?,?,?,1) ON CONFLICT(day,to_jid,kind) DO UPDATE SET n=n+1").run(day, who, extra);
  return db.prepare("SELECT n FROM sent_log WHERE day=? AND to_jid=? AND kind=?").get(day, who, extra).n;
};
