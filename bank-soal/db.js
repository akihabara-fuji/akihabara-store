'use strict';
// Koneksi node:sqlite + migrasi skema otomatis (Node 22, tanpa dependensi luar)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = process.env.BS_DB || path.join(__dirname, 'database.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  kode_baru TEXT NOT NULL,
  kode_lama_json TEXT NOT NULL DEFAULT '[]',
  nama_mk TEXT NOT NULL,
  fakultas TEXT,
  prodi TEXT,
  semester INTEGER,
  sks INTEGER,
  edisi_bmp TEXT,
  kisi_kisi_json TEXT NOT NULL DEFAULT '[]',
  harga_satuan INTEGER NOT NULL DEFAULT 15000,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  nomor_urut INTEGER NOT NULL CHECK (nomor_urut BETWEEN 1 AND 45),
  modul INTEGER NOT NULL CHECK (modul BETWEEN 1 AND 9),
  tipe TEXT NOT NULL CHECK (tipe IN ('pg_biasa','sebab_akibat','kompleks_123')),
  konten_json TEXT NOT NULL,
  opsi_json TEXT NOT NULL,
  kunci TEXT NOT NULL CHECK (kunci IN ('A','B','C','D')),
  pembahasan TEXT NOT NULL DEFAULT '',
  is_free INTEGER NOT NULL DEFAULT 0,
  UNIQUE (course_id, nomor_urut)
);
CREATE INDEX IF NOT EXISTS idx_questions_course ON questions(course_id, nomor_urut);
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  buyer_email TEXT NOT NULL,
  buyer_whatsapp TEXT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('single_course','semester_bundle')),
  scope_value TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  payment_gateway_ref TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS access_tokens (
  token_code TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

module.exports = { db, DB_PATH };
