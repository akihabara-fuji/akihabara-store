/* Pemeriksa SEO artikel: kanibalisasi (dua artikel menyasar kata kunci yang sama), judul yang cepat kedaluwarsa, slug kepanjangan.
   Dipakai impor .md dan panel admin (menu SEO). Murni fungsi, tanpa efek samping. */
"use strict";

const STOP = new Set("yang dan di ke dari untuk agar atau dengan secara sebelum sesudah setelah saat pada adalah ini itu apa bagaimana cara tanpa bisa dapat akan juga lebih sudah belum tidak jangan dalam oleh sebagai para serta tentang".split(" "));
const words = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
/* kata inti judul: tanpa kata umum, angka murni, dan kata "ut" (ada di hampir semua judul, tidak membedakan) */
const core = t => new Set(words(t).filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w) && w !== "ut"));
function similarity(a, b) {
  const A = core(a), B = core(b); if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);   // sebagian besar kata inti judul yang lebih pendek ada di judul lain
}
/* Pasangan judul yang bersaing. batas 0.6 = enam dari sepuluh kata inti sama. */
function cannibal(posts, limit = 0.6) {
  const out = [];
  for (let i = 0; i < posts.length; i++) for (let j = i + 1; j < posts.length; j++) {
    const s = similarity(posts[i].title, posts[j].title);
    if (s >= limit) out.push({ a: posts[i], b: posts[j], score: Math.round(s * 100) });
  }
  return out;
}
const MONTH = "januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember";
/* Judul dengan tanggal, bulan, tahun, atau nomor sesi cepat kedaluwarsa. Panduan abadi (evergreen) lebih tahan lama di Google. */
function timeBound(title) {
  const t = String(title || "");
  if (new RegExp(`\\b\\d{1,2}(?:\\s*[-–]\\s*\\d{1,2})?\\s+(?:${MONTH})\\b`, "i").test(t)) return "tanggal";
  if (/\b20\d{2}(?:\s*\/\s*20\d{2})?\b/.test(t)) return "tahun";
  if (/\bsesi\s+\d+\b/i.test(t)) return "sesi";
  return "";
}
const slugWords = s => String(s || "").split("-").filter(Boolean);
function slugTooLong(slug) { const w = slugWords(slug); return String(slug || "").length > 55 || w.length > 8; }
/* Slug ringkas dari judul: buang kata umum, maksimal 5 kata dan 50 karakter. Hanya dipakai bila slug tidak diisi sendiri. */
function shortSlug(slug) {
  const keep = slugWords(slug).filter(w => !STOP.has(w));
  const base = keep.length >= 3 ? keep : slugWords(slug);
  let out = []; for (const w of base) { if (out.length >= 5 || (out.concat(w).join("-")).length > 50) break; out.push(w); }
  return out.join("-");
}
/* Kemiripan ISI (bukan judul): berapa persen rangkaian lima kata dari tulisan yang lebih pendek juga ada di tulisan lain.
   Di atas sekitar 60% Google menganggapnya konten ganda: hanya satu yang akan diperingkat. */
const shingles = t => { const w = words(String(t || "").replace(/\[unverified\]/gi, "")), s = new Set(); for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" ")); return s; };
function bodySimilarity(a, b) {
  const A = shingles(a), B = shingles(b); if (A.size < 20 || B.size < 20) return 0;
  const [S, L] = A.size <= B.size ? [A, B] : [B, A]; let n = 0; for (const x of S) if (L.has(x)) n++;
  return n / S.size;
}
module.exports = { bodySimilarity, similarity, cannibal, timeBound, slugTooLong, shortSlug };
