/* Cek dan Parafrase Mandiri: database SQLite + migrasi.
   Berkas: data/parafrase.db (tidak masuk git). Migrasi memakai PRAGMA user_version, jalan otomatis, bisa diulang. */
"use strict";
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const MIGRATIONS = [
  /* 1: skema awal */
  `
  CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,           -- JSON
    updated_by TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE settings_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    key       TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    by        TEXT,
    at        INTEGER NOT NULL
  );
  CREATE INDEX settings_log_at ON settings_log(at);

  CREATE TABLE orders (
    id               TEXT PRIMARY KEY,             -- NA-1042, permanen
    public_token     TEXT NOT NULL UNIQUE,         -- acak panjang untuk halaman pesanan
    user_id          TEXT,                         -- opsional (akun pelanggan)
    wa_number        TEXT NOT NULL,
    title            TEXT,
    language         TEXT,
    doc_type         TEXT,                         -- umum | metopen | artikel
    word_count       INTEGER NOT NULL DEFAULT 0,
    original_file    TEXT,                         -- jalur berkas privat
    status           TEXT NOT NULL DEFAULT 'menunggu_bayar',
      -- menunggu_bayar | menunggu_verifikasi | baru_dibayar | dianalisis | dikerjakan | cek_ulang | terkirim | dibatalkan | kedaluwarsa | dikembalikan
    lane             TEXT NOT NULL DEFAULT 'biasa', -- biasa | cepat
    price_per_word   INTEGER NOT NULL,             -- snapshot harga saat pesan
    min_price        INTEGER NOT NULL,
    fast_price       INTEGER NOT NULL DEFAULT 0,
    base_total       INTEGER NOT NULL,
    unique_code      INTEGER NOT NULL DEFAULT 0,
    total            INTEGER NOT NULL,
    deadline_at      INTEGER,                      -- epoch ms
    pay_expires_at   INTEGER,
    proof_path       TEXT,
    proof_hash       TEXT,
    proof_uploaded_at INTEGER,
    confirmed_at     INTEGER,
    confirmed_by     TEXT,
    reject_reason    TEXT,
    queue_time       INTEGER,                      -- dasar urutan antrean (waktu bukti diunggah)
    work_started_at  INTEGER,
    sent_at          INTEGER,
    delete_at        INTEGER,
    parent_order_id  TEXT,
    revision_no      INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );
  CREATE INDEX orders_status ON orders(status);
  CREATE INDEX orders_queue  ON orders(lane, queue_time);
  CREATE INDEX orders_proof_hash ON orders(proof_hash);

  CREATE TABLE findings (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id  TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seq       INTEGER NOT NULL,                    -- urutan dalam dokumen
    code      TEXT NOT NULL,                       -- M O K B U H P A
    para_idx  INTEGER NOT NULL,
    sent_idx  INTEGER NOT NULL,
    text      TEXT NOT NULL,                       -- teks asli (jangan dikirim ke klien sebelum bayar)
    reason    TEXT,
    status    TEXT NOT NULL DEFAULT 'terbuka',     -- terbuka | selesai | diabaikan
    created_at INTEGER NOT NULL
  );
  CREATE INDEX findings_order ON findings(order_id, seq);

  CREATE TABLE order_events (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type     TEXT NOT NULL,
    detail   TEXT,
    at       INTEGER NOT NULL
  );
  CREATE INDEX order_events_order ON order_events(order_id, at);

  CREATE TABLE fast_reservations (
    order_id   TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    day        TEXT NOT NULL,                      -- tanggal WIB YYYY-MM-DD
    status     TEXT NOT NULL,                      -- reserved | confirmed | released
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX fast_res_day ON fast_reservations(day, status);
  `,
  /* 2: unggahan dokumen murid (sebelum jadi pesanan) */
  `
  CREATE TABLE uploads (
    id            TEXT PRIMARY KEY,             -- acak 32 hex
    path          TEXT NOT NULL,                -- relatif ke data/private
    original_name TEXT,
    size          INTEGER NOT NULL,
    sha256        TEXT NOT NULL,
    detected      TEXT NOT NULL,                -- JSON ringkasan deteksi otomatis
    ip_hash       TEXT,
    order_id      TEXT,                         -- terisi saat jadi pesanan
    created_at    INTEGER NOT NULL,
    expires_at    INTEGER NOT NULL
  );
  CREATE INDEX uploads_exp ON uploads(expires_at);
  `,
  /* 3: hasil, retensi, dan kotak keluar WhatsApp */
  `
  ALTER TABLE orders ADD COLUMN result_path TEXT;
  ALTER TABLE orders ADD COLUMN result_name TEXT;
  ALTER TABLE orders ADD COLUMN revised_path TEXT;
  ALTER TABLE orders ADD COLUMN reminder_sent_at INTEGER;
  ALTER TABLE orders ADD COLUMN files_deleted_at INTEGER;
  CREATE TABLE wa_outbox (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT,
    to_number  TEXT NOT NULL,
    kind       TEXT NOT NULL,
    text       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'queued',   -- queued | sent | failed | manual
    attempts   INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    dedupe_key TEXT UNIQUE,
    created_at INTEGER NOT NULL,
    sent_at    INTEGER
  );
  CREATE INDEX wa_outbox_status ON wa_outbox(status, created_at);
  `,
  /* 4: layanan (Tugas, Diskusi, Metopen, Revisi) memakai tabel pesanan yang sama */
  `
  ALTER TABLE orders ADD COLUMN service TEXT;
  ALTER TABLE orders ADD COLUMN brief TEXT;
  ALTER TABLE orders ADD COLUMN attach_json TEXT;
  ALTER TABLE orders ADD COLUMN result_text TEXT;
  `,
  /* 5: panel admin Catatan Akademik (terpisah dari admin nextaja): akun + peran, sesi, log aktivitas, catatan internal pesanan */
  `
  CREATE TABLE ca_admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL,              -- owner | editor | cs
    salt          TEXT NOT NULL,
    hash          TEXT NOT NULL,
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    INTEGER NOT NULL,
    last_login_at INTEGER
  );
  CREATE TABLE ca_sessions (
    token_hash TEXT PRIMARY KEY,              -- sha256 token; token mentah hanya di cookie
    admin_id   INTEGER NOT NULL,              -- 0 = pemilik (sandi dari .env)
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX ca_sessions_exp ON ca_sessions(expires_at);
  CREATE TABLE ca_admin_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    at      INTEGER NOT NULL,
    admin   TEXT NOT NULL,
    role    TEXT NOT NULL,
    action  TEXT NOT NULL,                    -- mis. "POST /ms/admin/posts"
    target  TEXT,
    status  INTEGER,
    ip_hash TEXT
  );
  CREATE INDEX ca_admin_log_at ON ca_admin_log(at);
  CREATE TABLE order_notes (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    admin    TEXT NOT NULL,
    text     TEXT NOT NULL,
    at       INTEGER NOT NULL
  );
  CREATE INDEX order_notes_order ON order_notes(order_id, at);
  `,
];


function open(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db) {
  const cur = db.pragma("user_version", { simple: true });
  for (let v = cur; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

module.exports = { open, migrate, MIGRATIONS };
