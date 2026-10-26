/* Pengaturan yang bisa diubah admin tanpa edit kode. Nilai default, validasi, log perubahan. */
"use strict";

const WA = /^\d{8,15}$/;
const DEFS = {
  price_per_word:               { type: "int",  min: 1, max: 1000, def: 50, pub: true },
  min_order_price:              { type: "int",  min: 0, max: 10000000, def: 40000, pub: true },
  fast_lane_enabled:            { type: "bool", def: true, pub: true },
  fast_lane_price:              { type: "int",  min: 0, max: 1000000, def: 40000, pub: true },
  fast_lane_daily_cap:          { type: "int",  min: 0, max: 50, def: 5, pub: true },
  revision_free_count:          { type: "int",  min: 0, max: 10, def: 1, pub: true },
  revision_price_per_word:      { type: "int",  min: 1, max: 1000, def: 20, pub: true },
  file_max_mb:                  { type: "int",  min: 1, max: 100, def: 25, pub: true },
  retention_hours:              { type: "int",  min: 1, max: 720, def: 24, pub: true },
  reminder_before_delete_hours: { type: "int",  min: 0, max: 72, def: 3 },
  long_sentence_words:          { type: "int",  min: 10, max: 100, def: 35 },
  preview_open_sentences:       { type: "int",  min: 0, max: 8, def: 1 },
  free_words:                   { type: "int",  min: 0, max: 5000, def: 700, pub: true },  // kata pertama dokumen yang dibuka gratis di Audit dan Cek & Parafrase; harga hanya untuk kata setelahnya
  preview_open_paragraphs:      { type: "int",  min: 0, max: 3, def: 1 },
  avg_words_per_hour:           { type: "int",  min: 100, max: 20000, def: 1500 },
  unique_code_enabled:          { type: "bool", def: true, pub: true },
  unique_code_max:              { type: "int",  min: 1, max: 999, def: 99 },
  payment_window_minutes:       { type: "int",  min: 5, max: 1440, def: 60, pub: true },
  admin_wa_number:              { type: "str",  re: WA, allowEmpty: true, def: "6285722227544", pub: true },
  update_group_url:             { type: "url",  allowEmpty: true, def: "https://chat.whatsapp.com/GABKsK7XnfjHpZe8iC7A7A", pub: true },
  ca_instagram_url:             { type: "url",  allowEmpty: true, def: "", pub: true },   // tampil otomatis di blok komunitas bawah artikel blog
  ca_tiktok_url:                { type: "url",  allowEmpty: true, def: "", pub: true },
  ca_facebook_url:              { type: "url",  allowEmpty: true, def: "", pub: true },
  qris_merchant_name:           { type: "str",  re: /^[\p{L}\p{N} .,&'-]{0,60}$/u, allowEmpty: true, def: "CATATAN TERBUKA", pub: true },
  price_tugas:                  { type: "int",  min: 0, max: 100000000, def: 35000, pub: true },
  price_diskusi:                { type: "int",  min: 0, max: 100000000, def: 20000, pub: true },
  price_metopen1:               { type: "int",  min: 0, max: 100000000, def: 300000, pub: true },
  price_metopen2:               { type: "int",  min: 0, max: 100000000, def: 250000, pub: true },
  price_metopen3:               { type: "int",  min: 0, max: 100000000, def: 350000, pub: true },
  price_metopen4:               { type: "int",  min: 0, max: 100000000, def: 300000, pub: true },
  price_metopen_paket:          { type: "int",  min: 0, max: 100000000, def: 799000, pub: true },
  price_revisi_tugas:           { type: "int",  min: 0, max: 100000000, def: 20000, pub: true },
  price_revisi_diskusi:         { type: "int",  min: 0, max: 100000000, def: 10000, pub: true },
  price_revisi_metopen:         { type: "int",  min: 0, max: 100000000, def: 99000, pub: true },
  audit_per_word:               { type: "int",  min: 0, max: 100000000, def: 20, pub: true },
  audit_min:                    { type: "int",  min: 0, max: 100000000, def: 35000, pub: true },
  drillbit_sim_max:             { type: "int",  min: 1, max: 100, def: 25, pub: true },
  drillbit_ai_max:              { type: "int",  min: 1, max: 100, def: 20, pub: true },
  /* Urgensi perbaikan (triage.js): dipakai Audit Dokumen dan Cek & Parafrase sekaligus, jadi keduanya selalu sepakat. */
  urgensi_ai_sedang:            { type: "int",  min: 5, max: 95, def: 30 },   // indikasi gaya seragam (%) mulai "sedang"
  urgensi_ai_tinggi:            { type: "int",  min: 10, max: 100, def: 60 }, // indikasi gaya seragam (%) mulai "tinggi"
  urgensi_paragraf_skor:        { type: "int",  min: 3, max: 30, def: 8 },    // skor paragraf mulai "mendesak"
  urgensi_paragraf_persen:      { type: "int",  min: 1, max: 100, def: 15 },  // % paragraf mendesak yang membuat dokumen "mendesak"
  price_semester_min:           { type: "int",  min: 0, max: 100000000, def: 1300000, pub: true },
  price_semester_max:           { type: "int",  min: 0, max: 100000000, def: 1800000, pub: true },
  price_pengarahan_semester:    { type: "int",  min: 0, max: 100000000, def: 99000, pub: true },
  price_pengarahan_lulus:       { type: "int",  min: 0, max: 100000000, def: 190000, pub: true },
  price_pengarahan_normal:      { type: "int",  min: 0, max: 100000000, def: 700000, pub: true },
  ga_id:                        { type: "str",  re: /^G-[A-Z0-9]{6,14}$/, allowEmpty: true, def: "G-LM2GBRG1YX", pub: true },
  gtm_id:                       { type: "str",  re: /^GTM-[A-Z0-9]{4,10}$/, allowEmpty: true, def: "", pub: true },
  google_verify_file:           { type: "str",  re: /^google[a-z0-9]{8,40}\.html$/, allowEmpty: true, def: "" },
  qris_image_path:              { type: "str",  re: /^[a-z0-9/_.-]{0,200}$/i, allowEmpty: true, def: "" },
  price_simulasi:               { type: "int",  min: 0, max: 100000000, def: 0, pub: true },        // biaya pesan simulasi (0 = gratis dipesan)
  bayar_koin_saja:              { type: "bool", def: true, pub: true },                                            // semua pesanan dibayar koin (satu pintu); QRIS hanya untuk isi koin. false = kembali ke QRIS per pesanan
  koin_bonus_daftar:            { type: "int",  min: 0, max: 100, def: 7, pub: true },               // koin gratis untuk akun baru (0 = tidak ada)
  sim_koin_price:               { type: "int",  min: 0, max: 1000, def: 4, pub: true },             // koin untuk membuka tanya jawab lengkap (pembukaan pertama tiap akun gratis)
  akun_gratis:                  { type: "str",  re: /^[^\s,@]+@[^\s,@]+(,[^\s,@]+@[^\s,@]+)*$/, allowEmpty: true, def: "" }, // email akun pemilik/tim yang memakai koin tanpa potongan (dipisah koma)
  layanan_nonaktif:             { type: "str",  re: /^[a-z0-9_]+(,[a-z0-9_]+)*$/, allowEmpty: true, def: "", pub: true }, // kode layanan yang ditutup, dipisah koma
};
/* Nama tampil tiap layanan (formulir, judul pesanan, daftar admin). Kosong = pakai nama bawaan di layanan.js. Diubah dari panel admin. */
for (const k of ["tugas", "diskusi", "metopen1", "metopen2", "metopen3", "metopen4", "metopen_paket", "revisi_tugas", "revisi_diskusi", "revisi_metopen", "simulasi"])
  DEFS["label_" + k] = { type: "str", re: /^[\p{L}\p{N} &.,()'+\/:-]{0,40}$/u, allowEmpty: true, def: "", pub: true };
/* Kartu di halaman Layanan UT yang disembunyikan (kode kartu dipisah koma, mis. "semester,pengarahan"). */
DEFS.kartu_sembunyi = { type: "str", re: /^[a-z_]+(,[a-z_]+)*$/, allowEmpty: true, def: "" };
const KEYS = Object.keys(DEFS);

function coerce(key, raw) {
  const d = DEFS[key];
  if (!d) throw new Error("Pengaturan tidak dikenal: " + key);
  if (d.type === "int") {
    const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (!Number.isInteger(n) || n < d.min || n > d.max) throw new Error(`${key}: harus bilangan bulat ${d.min} sampai ${d.max}`);
    return n;
  }
  if (d.type === "bool") {
    if (raw === true || raw === "true") return true;
    if (raw === false || raw === "false") return false;
    throw new Error(`${key}: harus true atau false`);
  }
  const s = String(raw ?? "").trim();
  if (s === "" && d.allowEmpty) return "";
  if (d.type === "url") {
    let u; try { u = new URL(s); } catch { throw new Error(`${key}: bukan URL yang valid`); }
    if (u.protocol !== "https:") throw new Error(`${key}: harus diawali https://`);
    return u.toString();
  }
  if (!d.re.test(s) || (key === "qris_image_path" && (s.includes("..") || s.startsWith("/")))) throw new Error(`${key}: format tidak valid`);
  return s;
}

function create(db) {
  const rd = db.prepare("SELECT key, value FROM settings");
  const up = db.prepare(`INSERT INTO settings(key,value,updated_by,updated_at) VALUES(?,?,?,?)
                         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`);
  const lg = db.prepare("INSERT INTO settings_log(key,old_value,new_value,by,at) VALUES(?,?,?,?,?)");

  function getAll() {
    const out = {};
    for (const k of KEYS) out[k] = DEFS[k].def;
    for (const r of rd.all()) if (DEFS[r.key]) { try { out[r.key] = JSON.parse(r.value); } catch {} }
    return out;
  }
  const get = key => getAll()[key];

  /* values: {key: nilai}. Semua divalidasi dulu; satu gagal = tidak ada yang tersimpan. */
  function set(values, by = "admin", now = Date.now()) {
    const clean = {};
    for (const [k, v] of Object.entries(values || {})) clean[k] = coerce(k, v);
    const before = getAll();
    db.transaction(() => {
      for (const [k, v] of Object.entries(clean)) {
        if (JSON.stringify(before[k]) === JSON.stringify(v)) continue;
        up.run(k, JSON.stringify(v), by, now);
        lg.run(k, JSON.stringify(before[k]), JSON.stringify(v), by, now);
      }
    })();
    return getAll();
  }

  function log(limit = 50) {
    return db.prepare("SELECT key, old_value, new_value, by, at FROM settings_log ORDER BY id DESC LIMIT ?").all(Math.min(200, limit | 0 || 50));
  }

  /* Tanggal WIB (UTC+7, tanpa DST) sebagai YYYY-MM-DD, untuk reset harian jalur cepat. */
  function wibDay(ts = Date.now()) { return new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 10); }

  function fastLaneUsed(now = Date.now()) {
    return db.prepare(`SELECT COUNT(*) n FROM fast_reservations
                       WHERE day=? AND (status='confirmed' OR (status='reserved' AND expires_at>?))`).get(wibDay(now), now).n;
  }

  /* Hanya nilai yang aman untuk halaman murid (tanpa rahasia, tanpa jalur berkas). */
  function publicConfig(now = Date.now()) {
    const all = getAll(), out = {};
    for (const k of KEYS) if (DEFS[k].pub) out[k] = all[k];
    const used = fastLaneUsed(now);
    const remaining = Math.max(0, all.fast_lane_daily_cap - used);
    out.fast_lane = {
      enabled: all.fast_lane_enabled && all.fast_lane_daily_cap > 0,
      price: all.fast_lane_price, cap: all.fast_lane_daily_cap, used, remaining,
      full: all.fast_lane_enabled && remaining === 0,
    };
    out.has_qris = !!all.qris_image_path;
    delete out.qris_image_path;
    return out;
  }

  return { getAll, get, set, log, publicConfig, fastLaneUsed, wibDay, DEFS };
}

module.exports = { create, DEFS, KEYS, coerce };
