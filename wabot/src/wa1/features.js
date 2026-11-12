// Fitur data: catatan, pengingat, keuangan kas grup.
import { dayKey, WIB } from "../core/config.js";
import { rupiah, fmtWhen } from "./parse.js";

export function createFeatures({ db, now = () => Date.now() }) {
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  // ---- catatan
  const noteAdd = (chat, by, title, text) => db.prepare("INSERT INTO notes(chat,title,text,by,created_at) VALUES(?,?,?,?,?)").run(chat, title || null, text.slice(0, 2000), by, now()).lastInsertRowid;
  const noteList = (chat, limit = 15) => db.prepare("SELECT * FROM notes WHERE chat=? ORDER BY id DESC LIMIT ?").all(chat, limit);
  const noteDel = (chat, id) => db.prepare("DELETE FROM notes WHERE chat=? AND id=?").run(chat, id).changes;
  const noteFmt = rows => rows.length ? rows.map(r => `#${r.id} ${r.title ? "*" + r.title + "* – " : ""}${clip(r.text, 160)}`).join("\n") : null;
  // ---- pengingat
  const remAdd = (chat, by, text, at) => db.prepare("INSERT INTO reminders(chat,by,text,due_at,created_at) VALUES(?,?,?,?,?)").run(chat, by, text.slice(0, 500), at, now()).lastInsertRowid;
  const remList = chat => db.prepare("SELECT * FROM reminders WHERE chat=? AND done=0 ORDER BY due_at LIMIT 20").all(chat);
  const remCancel = (chat, id) => db.prepare("UPDATE reminders SET done=1 WHERE chat=? AND id=? AND done=0").run(chat, id).changes;
  const remDue = () => db.prepare("SELECT * FROM reminders WHERE done=0 AND due_at<=? ORDER BY due_at LIMIT 20").all(now());
  const remDone = id => db.prepare("UPDATE reminders SET done=1 WHERE id=?").run(id);
  const remFmt = rows => rows.length ? rows.map(r => `#${r.id} ${fmtWhen(r.due_at)} – ${clip(r.text, 100)}`).join("\n") : null;
  // ---- kas
  const finAdd = (chat, by, type, amount, note) => db.prepare("INSERT INTO fin(chat,day,type,amount,note,by,created_at) VALUES(?,?,?,?,?,?,?)").run(chat, dayKey(now()), type, amount, (note || "").slice(0, 200), by, now()).lastInsertRowid;
  const finDel = (chat, id) => db.prepare("DELETE FROM fin WHERE chat=? AND id=?").run(chat, id).changes;
  const balance = chat => { const r = db.prepare("SELECT COALESCE(SUM(CASE WHEN type='in' THEN amount ELSE -amount END),0) s FROM fin WHERE chat=?").get(chat); return r.s; };
  function range(periode) {
    const t = now(), w = new Date(t + WIB), today = dayKey(t);
    const shift = n => dayKey(t - n * 86400e3);
    if (periode === "kemarin") return { from: shift(1), to: shift(1), label: "kemarin" };
    if (periode === "minggu") { const dow = (w.getUTCDay() + 6) % 7; return { from: shift(dow), to: today, label: "minggu ini" }; }
    if (periode === "bulan") return { from: today.slice(0, 8) + "01", to: today, label: "bulan ini" };
    return { from: today, to: today, label: "hari ini" };
  }
  function report(chat, periode) {
    const r = range(periode);
    const rows = db.prepare("SELECT * FROM fin WHERE chat=? AND day BETWEEN ? AND ? ORDER BY id").all(chat, r.from, r.to);
    const inn = rows.filter(x => x.type === "in").reduce((a, b) => a + b.amount, 0), out = rows.filter(x => x.type === "out").reduce((a, b) => a + b.amount, 0);
    return { label: r.label, rows, inn, out, saldo: balance(chat) };
  }
  function reportText(chat, periode) {
    const r = report(chat, periode);
    if (!r.rows.length) return `Belum ada transaksi ${r.label} kak. Saldo kas sekarang ${rupiah(r.saldo)}.`;
    const lines = r.rows.slice(-12).map(x => `#${x.id} ${x.type === "in" ? "➕" : "➖"} ${rupiah(x.amount)}${x.note ? " – " + clip(x.note, 60) : ""}`);
    return `Laporan kas ${r.label}:\n${lines.join("\n")}${r.rows.length > 12 ? `\n(${r.rows.length - 12} transaksi lebih lama tidak ditampilkan)` : ""}\n\nMasuk ${rupiah(r.inn)} • Keluar ${rupiah(r.out)}\nSaldo kas sekarang: ${rupiah(r.saldo)}`;
  }
  return { noteAdd, noteList, noteDel, noteFmt, remAdd, remList, remCancel, remDue, remDone, remFmt, finAdd, finDel, balance, reportText, report };
}
