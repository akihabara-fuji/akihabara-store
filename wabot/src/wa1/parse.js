// Pengurai bahasa biasa: waktu (WIB), uang, dan niat perintah. Murni (tanpa efek samping) supaya mudah diuji.
import { WIB } from "../core/config.js";

const DAYS = { minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6 };
const MONTHS = { januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5, juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11 };

export function parseMoney(s) {
  const m = String(s || "").toLowerCase().match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?(?![a-z])/);
  if (!m) return null;
  let raw = m[1], unit = m[2], n;
  if (unit) { n = parseFloat(raw.replace(/\./g, m => (raw.split(".").length > 2 ? "" : ".")).replace(",", ".")); n *= /jt|juta/.test(unit) ? 1e6 : 1e3; }
  else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) n = parseInt(raw.replace(/[.,]/g, ""), 10);
  else n = parseInt(raw.replace(/[.,].*$/, ""), 10);
  n = Math.round(n);
  return Number.isFinite(n) && n > 0 ? { amount: n, matched: m[0] } : null;
}
export const rupiah = n => "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Cari frasa waktu dalam teks. Hasil: { at (ms epoch), rest } atau null. */
export function parseWhen(text, now = Date.now()) {
  let t = " " + String(text || "") + " ";
  let rest = t, found = false;
  const cut = re => { const m = rest.match(re); if (m) { rest = rest.replace(m[0], " "); found = true; } return m; };
  const nowW = new Date(now + WIB);
  let y = nowW.getUTCFullYear(), mo = nowW.getUTCMonth(), d = nowW.getUTCDate();

  const rel = cut(/\b(\d+)\s*(menit|jam|hari)\s*(?:lagi|kemudian)\b/i);
  if (rel) { const n = +rel[1], u = rel[2].toLowerCase(); return { at: now + n * (u === "menit" ? 60e3 : u === "jam" ? 3600e3 : 86400e3), rest: clean(rest) }; }
  if (cut(/\bsetengah\s+jam\s+lagi\b/i)) return { at: now + 1800e3, rest: clean(rest) };

  let dayOffset = null, weekday = null;
  if (cut(/\bhari\s+ini\b/i)) dayOffset = 0;
  else if (cut(/\bbesok\b/i)) dayOffset = 1;
  else if (cut(/\blusa\b/i)) dayOffset = 2;
  else { const w = cut(/\b(senin|selasa|rabu|kamis|jum'?at|sabtu|minggu|ahad)\b/i); if (w) weekday = DAYS[w[1].toLowerCase()]; }
  let dateSet = null;
  const dm = cut(/\b(?:tgl|tanggal)\s*(\d{1,2})(?:\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))?\b/i);
  if (dm) { const dd = +dm[1], mm = dm[2] ? MONTHS[dm[2].toLowerCase()] : null; dateSet = { dd, mm }; }

  let hh = null, mi = 0;
  const tm = cut(/\b(?:jam|pukul|pkl)\s*(\d{1,2})(?:[.:](\d{2}))?\s*(pagi|siang|sore|malam|subuh)?\b/i) || cut(/\b(\d{1,2})[.:](\d{2})\s*(pagi|siang|sore|malam|subuh)?\b/i);
  if (tm) {
    hh = +tm[1]; mi = tm[2] ? +tm[2] : 0; const part = (tm[3] || "").toLowerCase();
    if (hh > 24 || mi > 59) return null;
    if (part === "siang" && hh < 11) hh += 12;
    else if (part === "sore" && hh < 12) hh += 12;
    else if (part === "malam" && hh >= 3 && hh < 12) hh += 12;
    else if (part === "malam" && hh === 12) hh = 0;
  }
  if (!found) return null;
  if (hh === null && dayOffset === null && weekday === null && !dateSet) return null;
  if (hh === null) { hh = 8; mi = 0; }

  const make = off => Date.UTC(y, mo, d + off, hh, mi) - WIB;
  let at;
  if (dayOffset !== null) at = make(dayOffset);
  else if (weekday !== null) { let diff = (weekday - nowW.getUTCDay() + 7) % 7; at = make(diff); if (at <= now) at = make(diff + 7); }
  else if (dateSet) { let mm = dateSet.mm ?? mo, yy = y; at = Date.UTC(yy, mm, dateSet.dd, hh, mi) - WIB; if (at <= now) at = Date.UTC(yy + (dateSet.mm != null ? 1 : 0), dateSet.mm != null ? mm : mm + 1, dateSet.dd, hh, mi) - WIB; }
  else { at = make(0); if (at <= now) at = make(1); }
  if (at <= now) return null;
  return { at, rest: clean(rest) };
}
const clean = s => s.replace(/\s+/g, " ").replace(/^\s*(pada|di|untuk|nanti|ya|dong)\b\s*/i, "").trim();

export const fmtWhen = ms => {
  const w = new Date(ms + WIB), p = n => String(n).padStart(2, "0");
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][w.getUTCDay()];
  return `${hari}, ${w.getUTCDate()}/${w.getUTCMonth() + 1} pukul ${p(w.getUTCHours())}.${p(w.getUTCMinutes())} WIB`;
};

/** Hilangkan nama bot / penanda panggilan dari teks. */
export function stripWake(text, name) {
  const re = new RegExp("\\b(?:hai|halo|hi|hey|woi|kak|bang|mba|mbak)?\\s*" + name.replace(/[^a-z0-9]/gi, "") + "\\b[,:!]?", "ig");
  return String(text || "").replace(/@\d{5,}/g, " ").replace(re, " ").replace(/^[\s!/.,]+/, "").replace(/\s+/g, " ").trim();
}

/** Tebak niat dari kalimat biasa. Kembalikan { intent, ... }. */
export function parseIntent(raw, now = Date.now()) {
  const t = String(raw || "").trim(), l = t.toLowerCase().replace(/[?!.]+$/g, "").trim();
  if (!l) return { intent: "kosong" };
  if (/^(bantuan|help|menu|bisa apa|fitur|cara pakai|apa saja)\b/.test(l) || /\b(bisa ngapain|bisa apa aja)\b/.test(l)) return { intent: "bantuan" };
  if (/^(status|cek bot)$/.test(l)) return { intent: "status" };
  let m;
  if ((m = l.match(/^(antispam|anti spam|anti-spam)\s+(on|off|nyala|mati|aktif|nonaktif)$/))) return { intent: "antispam", on: /on|nyala|aktif$/.test(m[2]) && !/nonaktif/.test(m[2]) };
  if ((m = l.match(/^(izinkan|bolehkan|whitelist)\s+(?:domain\s+|link\s+)?(\S+)/))) return { intent: "izin_domain", domain: m[2] };
  if ((m = l.match(/^(hapus|cabut)\s+izin\s+(?:domain\s+)?(\S+)/))) return { intent: "cabut_domain", domain: m[2] };
  // catatan
  if ((m = l.match(/^(?:hapus|buang)\s+catatan\s+(?:no\s*|nomor\s*|#)?(\d+)/))) return { intent: "catatan_hapus", id: +m[1] };
  if (/^(?:lihat|tampilkan|daftar|list|buka|cek)?\s*(?:semua\s+)?catatan(?:\s+(?:grup|group|kita))?$/.test(l)) return { intent: "catatan_daftar" };
  if ((m = t.match(/^(?:tolong\s+)?(?:catat(?:kan|in)?|simpan(?:kan|in)?(?:\s+catatan)?|tulis(?:kan|in)?\s+catatan)\s*:?\s+([\s\S]+)$/i))) {
    const body = m[1].trim(); const tm = body.match(/^(.{1,40}?)\s*[:|]\s+([\s\S]+)$/);
    // "catat besok ujian" tetap catatan, bukan pengingat, kecuali ada kata ingatkan
    return { intent: "catatan_simpan", title: tm ? tm[1] : "", text: tm ? tm[2] : body };
  }
  // pengingat
  if (/^(?:daftar|lihat|list|cek)\s+(?:pengingat|reminder|jadwal)$/.test(l) || /^(?:pengingat|reminder|jadwal)(?:\s+(?:kita|grup|saya|aku))?$/.test(l)) return { intent: "ingat_daftar" };
  if ((m = l.match(/^(?:batal(?:kan)?|hapus)\s+(?:pengingat|reminder|jadwal)\s+(?:no\s*|nomor\s*|#)?(\d+)/))) return { intent: "ingat_batal", id: +m[1] };
  if ((m = t.match(/^(?:tolong\s+)?(?:ingat(?:kan|in)|ingetin|reminder|pengingat|jadwalkan|jadwalin|set\s+pengingat)\s*:?\s+([\s\S]+)$/i))) {
    const w = parseWhen(m[1], now);
    if (!w) return { intent: "ingat_gagal", text: m[1] };
    const what = w.rest.replace(/^(?:untuk|tentang|bahwa|kalau|kalo|agar)\s+/i, "").trim();
    return { intent: "ingat_buat", at: w.at, text: what || m[1].trim() };
  }
  // keuangan
  if (/^(?:cek\s+)?saldo(?:\s+kas)?$/.test(l) || /^kas$/.test(l)) return { intent: "kas_saldo" };
  if ((m = l.match(/^(?:laporan|rekap|riwayat|mutasi)(?:\s+(?:kas|keuangan))?\s*(hari ini|kemarin|minggu ini|minggu|bulan ini|bulan)?$/))) return { intent: "kas_laporan", periode: (m[1] || "hari ini").replace(" ini", "") };
  if ((m = l.match(/^(?:hapus|batal(?:kan)?)\s+(?:kas|transaksi)\s+(?:no\s*|nomor\s*|#)?(\d+)/))) return { intent: "kas_hapus", id: +m[1] };
  if ((m = t.match(/^(?:tolong\s+)?(?:catat\s+)?(?:kas\s+)?(masuk|pemasukan|terima(?:kan)?|keluar|pengeluaran|bayar)\s+([\s\S]+)$/i))) {
    const money = parseMoney(m[2]);
    if (money) { const note = m[2].replace(money.matched, " ").replace(/\s+/g, " ").replace(/^(untuk|dari|buat|ke|utk)\s+/i, "").trim(); return { intent: "kas_catat", type: /^(masuk|pemasukan|terima)/i.test(m[1]) ? "in" : "out", amount: money.amount, note }; }
  }
  return { intent: "tanya", text: t };
}
