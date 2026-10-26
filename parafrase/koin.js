/* Sistem koin: 1 koin = Rp1.000. Inti buku koin (tanpa Express) supaya mudah diuji.
   Aturan:
   - Saldo = SUM(delta) di coin_ledger. Tidak ada kolom saldo yang bisa menyimpang.
   - UNIQUE(kind,ref): satu top-up, satu pemakaian, satu pengembalian per pesanan hanya tercatat sekali.
   - Koin tidak bisa diuangkan oleh mahasiswa. Admin boleh mengambil semua uang masuk untuk operasional; bagian dari saldo titipan dicatat dan dihitung kekurangannya. */
"use strict";
const crypto = require("crypto");

const RP = 1000;
const MIN_TOPUP = 1000, MAX_TOPUP = 2000000;
const KATEGORI = ["Langganan Claude", "VPS dan server", "Domain", "Gaji atau bagi hasil tim", "Lainnya"];
const err = (status, message, extra) => Object.assign(new Error(message), { status }, extra || {});

function createKoin(db, { settings, emailOf, now: clock } = {}) {
  const T = () => (clock ? clock() : Date.now());

  /* Akun gratis (pemilik/tim): email ada di pengaturan akun_gratis. Tidak ada koin palsu di buku koin, pemakaiannya saja yang tidak memotong saldo. */
  const isFree = uid => {
    try {
      const list = String((settings && settings.getAll().akun_gratis) || "").toLowerCase().split(",").map(x => x.trim()).filter(Boolean);
      if (!list.length || !emailOf) return false;
      const e = String(emailOf(uid) || "").toLowerCase();
      return !!e && list.includes(e);
    } catch { return false; }
  };
  const balance = uid => db.prepare("SELECT COALESCE(SUM(delta),0) b FROM coin_ledger WHERE user_id=?").get(String(uid)).b;

  /* Dipanggil di dalam transaksi pemanggil (atau lewat wrapper di bawah). */
  function post(uid, delta, kind, ref, note, at) {
    uid = String(uid); ref = String(ref);
    if (!Number.isInteger(delta) || delta === 0) throw err(400, "Jumlah koin tidak valid.");
    const dup = db.prepare("SELECT * FROM coin_ledger WHERE kind=? AND ref=?").get(kind, ref);
    if (dup) return { ...dup, duplicate: true };
    const bal = balance(uid);
    if (bal + delta < 0) throw err(402, "Saldo koin tidak cukup.", { short: -(bal + delta), balance: bal });
    const r = db.prepare("INSERT INTO coin_ledger(user_id,delta,balance_after,kind,ref,note,created_at) VALUES(?,?,?,?,?,?,?)")
      .run(uid, delta, bal + delta, kind, ref, note || null, at || T());
    return { id: Number(r.lastInsertRowid), user_id: uid, delta, balance_after: bal + delta, kind, ref, duplicate: false };
  }
  const tx = fn => db.transaction(fn)();

  /* Pakai koin untuk pesanan. Panggil di dalam transaksi pembuatan pesanan agar pesanan dan potongan koin satu paket. */
  const debitOrder = (uid, coins, orderId, note, at) => (isFree(uid) ? { free: true, delta: 0, kind: "order", ref: String(orderId), duplicate: false } : post(uid, -coins, "order", orderId, note, at));

  /* Kembalikan koin pesanan yang dibatalkan. Aman dipanggil berulang: hanya sekali. Tidak ada potongan = tidak ada pengembalian. */
  function refundOrder(orderId, note, at) {
    return tx(() => {
      const d = db.prepare("SELECT * FROM coin_ledger WHERE kind='order' AND ref=?").get(String(orderId));
      if (!d) return null;
      const r = post(d.user_id, -d.delta, "refund", orderId, note || "Pesanan dibatalkan, koin kembali", at);
      return r.duplicate ? null : r;
    });
  }

  /* promo = koin gratis dari admin (hadiah/kredit uji): dicatat seperti bonus daftar, jadi tidak dianggap uang masuk dan tidak menjadi kewajiban kas. */
  function adjust(uid, delta, reason, by, at, promo) {
    reason = String(reason || "").trim();
    if (reason.length < 5) throw err(400, "Alasan penyesuaian wajib diisi (minimal 5 huruf).");
    const kind = promo && delta > 0 ? "bonus" : "adjust";
    return tx(() => post(uid, delta, kind, (kind === "bonus" ? "adm:" : "") + crypto.randomBytes(8).toString("hex"), `${reason} (oleh ${by || "admin"})`, at));
  }

  /* ---------- isi koin lewat QRIS manual ---------- */
  function parseRupiah(v) {
    const n = Number(String(v == null ? "" : v).replace(/[.\s]|Rp/gi, ""));
    if (!Number.isInteger(n) || n < MIN_TOPUP || n > MAX_TOPUP || n % RP) throw err(400, `Isi koin harus kelipatan Rp1.000, antara Rp${MIN_TOPUP.toLocaleString("id-ID")} dan Rp${MAX_TOPUP.toLocaleString("id-ID")}.`);
    return n;
  }
  function createTopup(uid, rupiah, at) {
    const base = parseRupiah(rupiah), now = at || T();
    const cfg = settings ? settings.getAll() : { unique_code_enabled: true, unique_code_max: 99, payment_window_minutes: 60 };
    return tx(() => {
      const open = db.prepare("SELECT COUNT(*) n FROM coin_topups WHERE user_id=? AND status='menunggu_bayar' AND pay_expires_at>?").get(String(uid), now).n;
      if (open >= 3) throw err(429, "Kamu masih punya 3 tagihan isi koin yang belum dibayar. Selesaikan atau tunggu kedaluwarsa dulu.");
      let code = 0;
      if (cfg.unique_code_enabled) {
        const taken = new Set([
          ...db.prepare("SELECT total FROM orders WHERE status IN ('menunggu_bayar','menunggu_verifikasi')").all().map(r => r.total),
          ...db.prepare("SELECT total FROM coin_topups WHERE status IN ('menunggu_bayar','menunggu_verifikasi')").all().map(r => r.total),
        ]);
        const free = []; for (let c = 1; c <= cfg.unique_code_max; c++) if (!taken.has(base + c)) free.push(c);
        if (!free.length) throw err(503, "Sistem pembayaran sedang penuh. Coba lagi beberapa menit lagi.");
        code = free[crypto.randomInt(free.length)];
      }
      const token = crypto.randomBytes(24).toString("hex"), exp = now + cfg.payment_window_minutes * 60e3;
      db.prepare("INSERT INTO coin_topups(token,user_id,base,coins,unique_code,total,status,pay_expires_at,created_at) VALUES(?,?,?,?,?,?, 'menunggu_bayar',?,?)")
        .run(token, String(uid), base, base / RP, code, base + code, exp, now);
      return db.prepare("SELECT * FROM coin_topups WHERE token=?").get(token);
    });
  }
  function attachProof(token, uid, path, hash, at) {
    const now = at || T();
    return tx(() => {
      const t = db.prepare("SELECT * FROM coin_topups WHERE token=? AND user_id=?").get(String(token), String(uid));
      if (!t) throw err(404, "Tagihan tidak ditemukan.");
      if (!["menunggu_bayar", "menunggu_verifikasi"].includes(t.status)) throw err(409, "Tagihan ini tidak menerima bukti bayar lagi.");
      if (t.status === "menunggu_bayar" && t.pay_expires_at < now) throw err(409, "Waktu pembayaran habis. Buat tagihan baru.", { code: "expired" });
      const dup = db.prepare("SELECT token FROM coin_topups WHERE proof_hash=? AND token<>?").get(hash, t.token);
      const dupO = db.prepare("SELECT id FROM orders WHERE proof_hash=?").get(hash);
      if (dup || dupO) throw err(409, "Foto ini sudah dipakai untuk pembayaran lain. Unggah bukti bayar tagihan ini.");
      db.prepare("UPDATE coin_topups SET proof_path=?, proof_hash=?, proof_at=?, status='menunggu_verifikasi', reject_reason=NULL WHERE token=?").run(path, hash, now, t.token);
      return { old: t.proof_path || null };
    });
  }
  /* Konfirmasi hanya sekali: status berubah dan koin masuk dalam satu transaksi. */
  function confirmTopup(token, by, at) {
    const now = at || T();
    return tx(() => {
      const t = db.prepare("SELECT * FROM coin_topups WHERE token=?").get(String(token));
      if (!t) throw err(404, "Tagihan tidak ditemukan.");
      if (t.status === "dikonfirmasi") throw err(409, "Tagihan ini sudah dikonfirmasi sebelumnya.");
      if (!["menunggu_verifikasi", "menunggu_bayar"].includes(t.status)) throw err(409, "Status tagihan tidak bisa dikonfirmasi: " + t.status);
      db.prepare("UPDATE coin_topups SET status='dikonfirmasi', confirmed_at=?, confirmed_by=? WHERE token=?").run(now, by || "admin", t.token);
      const l = post(t.user_id, t.coins, "topup", t.token, `Isi koin via QRIS Rp${t.base.toLocaleString("id-ID")}`, now);
      return { topup: db.prepare("SELECT * FROM coin_topups WHERE token=?").get(t.token), balance: l.balance_after };
    });
  }
  function rejectTopup(token, reason, at) {
    const now = at || T(), cfg = settings ? settings.getAll() : { payment_window_minutes: 60 };
    return tx(() => {
      const t = db.prepare("SELECT * FROM coin_topups WHERE token=?").get(String(token));
      if (!t) throw err(404, "Tagihan tidak ditemukan.");
      if (t.status !== "menunggu_verifikasi") throw err(409, "Hanya tagihan menunggu verifikasi yang bisa ditolak.");
      const why = String(reason || "").trim().slice(0, 200) || "Bukti bayar tidak sesuai.";
      db.prepare("UPDATE coin_topups SET status='menunggu_bayar', reject_reason=?, proof_path=NULL, proof_hash=NULL, proof_at=NULL, pay_expires_at=? WHERE token=?").run(why, now + cfg.payment_window_minutes * 60e3, t.token);
      return { old: t.proof_path || null };
    });
  }
  function expireTopups(at) {
    const now = at || T();
    const rows = db.prepare("SELECT token, proof_path FROM coin_topups WHERE status='menunggu_bayar' AND pay_expires_at<?").all(now);
    for (const r of rows) db.prepare("UPDATE coin_topups SET status='kedaluwarsa' WHERE token=? AND status='menunggu_bayar'").run(r.token);
    return rows;
  }

  /* ---------- dana ----------
     Semua uang yang masuk dari koin boleh diambil untuk operasional (VPS, Claude, domain, dst), karena tagihan itu harus dibayar uang sungguhan.
     Bedanya hanya dicatat: bagian yang berasal dari saldo titipan mahasiswa (koin yang belum dipakai) ditandai, dan kekurangan kas dihitung
     supaya admin tahu berapa yang harus tersedia kalau semua mahasiswa memakai koinnya. */
  function summary() {
    const g = sql => db.prepare(sql).get();
    const topupCoins = g("SELECT COALESCE(SUM(delta),0) n FROM coin_ledger WHERE kind='topup'").n;
    /* Koin bonus (gratis) tidak didukung uang: dianggap terpakai lebih dulu. Hanya sisa saldo yang didukung uang yang menjadi kewajiban kas. */
    const holders = db.prepare(`SELECT SUM(delta) bal,
      SUM(CASE WHEN kind='bonus' THEN delta ELSE 0 END) bonus,
      SUM(CASE WHEN kind IN ('order','refund','sim') THEN -delta ELSE 0 END) spent FROM coin_ledger GROUP BY user_id`).all();
    let liability = 0, promoCoins = 0;
    for (const h of holders) { const promoLeft = Math.min(Math.max(0, h.bal), Math.max(0, h.bonus - Math.max(0, h.spent))); promoCoins += promoLeft; liability += Math.max(0, h.bal - promoLeft); }
    const withdrawn = g("SELECT COALESCE(SUM(amount),0) n FROM fund_withdrawals").n;
    const cashIn = topupCoins * RP, liabilityRp = liability * RP, incomeRp = cashIn - liabilityRp;
    const cashOnHand = cashIn - withdrawn;
    return {
      topupRp: cashIn, topupCoins, liabilityRp, liabilityCoins: liability, promoCoins,
      incomeRp, withdrawnRp: withdrawn,
      cashOnHandRp: cashOnHand,
      withdrawableRp: Math.max(0, cashOnHand),
      heldUsedRp: Math.max(0, withdrawn - Math.max(0, incomeRp)),   // bagian pengambilan yang berasal dari saldo titipan
      shortfallRp: Math.max(0, liabilityRp - cashOnHand),            // kas yang kurang untuk menutup semua saldo titipan
      pending: g("SELECT COUNT(*) n FROM coin_topups WHERE status='menunggu_verifikasi'").n,
    };
  }
  function withdraw(amount, category, note, by, at) {
    const n = Number(String(amount == null ? "" : amount).replace(/[.\s]|Rp/gi, ""));
    if (!Number.isInteger(n) || n <= 0) throw err(400, "Jumlah pengambilan tidak valid.");
    if (!KATEGORI.includes(category)) throw err(400, "Pilih keperluan pengambilan.");
    return tx(() => {
      const s = summary();
      if (n > s.withdrawableRp) throw err(409, `Jumlah melebihi uang yang ada (Rp${s.withdrawableRp.toLocaleString("id-ID")}).`);
      const free = Math.max(0, s.incomeRp - s.withdrawnRp);          // pendapatan terpakai yang belum diambil
      const fromHolding = Math.max(0, n - free);
      db.prepare("INSERT INTO fund_withdrawals(amount,category,note,by,from_holding,at) VALUES(?,?,?,?,?,?)").run(n, category, String(note || "").slice(0, 200), by || "admin", fromHolding, at || T());
      return { ...summary(), fromHolding };
    });
  }

  /* Buka tanya jawab lengkap sebuah simulasi. Pembukaan pertama setiap akun gratis; berikutnya potong koin. Satu pesanan hanya dibuka sekali. */
  function unlockSim(uid, orderId, coins, at) {
    const now = at || T();
    return tx(() => {
      const had = db.prepare("SELECT * FROM sim_unlocks WHERE order_id=?").get(String(orderId));
      if (had) return { already: true, how: had.how, balance: balance(uid) };
      const first = !db.prepare("SELECT 1 FROM sim_unlocks WHERE user_id=?").get(String(uid));
      if (first || coins <= 0 || isFree(uid)) { db.prepare("INSERT INTO sim_unlocks(order_id,user_id,how,coins,at) VALUES(?,?,?,?,?)").run(String(orderId), String(uid), "gratis", 0, now); return { already: false, how: "gratis", free: true, balance: balance(uid) }; }
      post(uid, -coins, "sim", orderId, `Buka tanya jawab simulasi ${orderId}`, now);
      db.prepare("INSERT INTO sim_unlocks(order_id,user_id,how,coins,at) VALUES(?,?,?,?,?)").run(String(orderId), String(uid), "koin", coins, now);
      return { already: false, how: "koin", free: false, balance: balance(uid) };
    });
  }
  const simState = (uid, orderId) => ({ unlocked: !!db.prepare("SELECT 1 FROM sim_unlocks WHERE order_id=?").get(String(orderId)), firstFree: !db.prepare("SELECT 1 FROM sim_unlocks WHERE user_id=?").get(String(uid)) });

  /* Bonus daftar: koin gratis sekali per akun (UNIQUE(kind,ref) menjamin tidak bisa ganda). Mengembalikan jumlah koin yang diberikan, 0 bila tidak ada. */
  function welcome(uid, at) {
    const n = settings ? Number(settings.get("koin_bonus_daftar")) : 0;
    if (!Number.isInteger(n) || n <= 0) return 0;
    return tx(() => { const r = post(uid, n, "bonus", "welcome:" + uid, `Bonus daftar: ${n} koin gratis`, at || T()); return r.duplicate ? 0 : n; });
  }

  const history = (uid, limit = 50) => db.prepare("SELECT delta, balance_after, kind, ref, note, created_at FROM coin_ledger WHERE user_id=? ORDER BY id DESC LIMIT ?").all(String(uid), limit);

  return { RP, KATEGORI, isFree, balance, debitOrder, refundOrder, adjust, parseRupiah, welcome, createTopup, attachProof, confirmTopup, rejectTopup, expireTopups, summary, withdraw, history, unlockSim, simState, tx };
}

/* Harga koin sebuah pesanan: harga rupiah / 1000. Harga di luar kelipatan Rp1.000 tidak bisa dibayar koin. */
const coinsFor = rupiah => (Number.isInteger(rupiah) && rupiah > 0 && rupiah % RP === 0 ? rupiah / RP : null);

module.exports = { createKoin, coinsFor, RP, KATEGORI };
