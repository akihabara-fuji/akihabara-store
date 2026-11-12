// Salin catatan & keuangan dari bot lama (bot.db) ke WA1 baru. Baca-saja pada DB lama. Default: dry-run. Tambahkan --apply untuk menulis.
// Pakai: node src/tools/migrate.js /opt/wabot/app/src/bot.db /opt/wabot2/data/wa1.db [--apply]
import Database from "better-sqlite3";
import { openDb } from "../core/db.js";
const [src, dst, flag] = process.argv.slice(2);
if (!src || !dst) { console.error("Pakai: migrate.js <bot.db lama> <wa1.db baru> [--apply]"); process.exit(2); }
const old = new Database(src, { readonly: true, fileMustExist: true });
const names = old.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const cols = t => old.prepare(`PRAGMA table_info(${JSON.stringify(t)})`).all().map(c => c.name);
const pick = (row, c) => { for (const k of c) if (row[k] != null && row[k] !== "") return row[k]; return null; };
const ms = v => { if (v == null) return Date.now(); if (typeof v === "number") return v < 1e11 ? v * 1000 : v; const d = Date.parse(v); return Number.isFinite(d) ? d : Date.now(); };
const find = re => names.filter(n => re.test(n));
const plan = { notes: find(/^(catatan|notes?)$/i), fin: find(/^(finance|keuangan|kas|fin)$/i), faq: find(/^faq$/i) };
console.log("Tabel lama:", names.join(", "));
for (const [k, v] of Object.entries(plan)) for (const t of v) console.log(`  ${k} <- ${t} (${old.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n} baris) kolom: ${cols(t).join(", ")}`);
if (flag !== "--apply") { console.log("\nDry-run selesai. Jalankan lagi dengan --apply untuk menyalin."); process.exit(0); }
const db = openDb(dst); let n = { notes: 0, fin: 0, faq: 0 };
const marker = db.prepare("SELECT name FROM sqlite_master WHERE name='migrated'").get();
if (marker) { console.error("Sudah pernah dimigrasi. Batal agar tidak dobel."); process.exit(3); }
db.exec("CREATE TABLE migrated(at INTEGER)");
const chatOf = r => String(pick(r, ["chat", "chat_id", "jid", "group_id", "gid", "grup"]) || "umum");
db.transaction(() => {
  for (const t of plan.notes) for (const r of old.prepare(`SELECT * FROM "${t}"`).all()) { const text = pick(r, ["text", "isi", "content", "catatan", "note"]); if (!text) continue; db.prepare("INSERT INTO notes(chat,title,text,by,created_at) VALUES(?,?,?,?,?)").run(chatOf(r), pick(r, ["title", "judul"]), String(text), pick(r, ["by", "user", "sender", "author"]), ms(pick(r, ["created_at", "ts", "waktu", "time", "tanggal"]))); n.notes++; }
  for (const t of plan.fin) for (const r of old.prepare(`SELECT * FROM "${t}"`).all()) { const amount = Math.abs(Math.round(Number(pick(r, ["amount", "jumlah", "nominal"])))); if (!amount) continue; const typ = String(pick(r, ["type", "tipe", "jenis"]) || "").toLowerCase(); const at = ms(pick(r, ["created_at", "ts", "waktu", "time", "tanggal", "date"])); db.prepare("INSERT INTO fin(chat,day,type,amount,note,by,created_at) VALUES(?,?,?,?,?,?,?)").run(chatOf(r), new Date(at + 7 * 3600e3).toISOString().slice(0, 10), /^(in|masuk|income|pemasukan|debit)/.test(typ) ? "in" : "out", amount, pick(r, ["note", "ket", "keterangan", "deskripsi"]), pick(r, ["by", "user", "sender"]), at); n.fin++; }
  for (const t of plan.faq) for (const r of old.prepare(`SELECT * FROM "${t}"`).all()) { const q = pick(r, ["q", "pertanyaan", "question", "keyword", "kata_kunci"]), a = pick(r, ["a", "jawaban", "answer", "reply"]); if (q && a) { db.prepare("INSERT INTO faq(chat,q,a) VALUES(?,?,?)").run(chatOf(r), String(q), String(a)); n.faq++; } }
  db.prepare("INSERT INTO migrated(at) VALUES(?)").run(Date.now());
})();
console.log("Disalin:", JSON.stringify(n));
