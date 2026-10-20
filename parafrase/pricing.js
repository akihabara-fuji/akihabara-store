/* Harga dihitung di server dari pengaturan, bukan dari angka kiriman klien.
   total = max(kata × harga per kata, minimum) + (jalur cepat ? biaya jalur cepat : 0) */
"use strict";

function quote(words, wantFast, cfg) {
  if (!Number.isInteger(words) || words < 1) throw new Error("Jumlah kata tidak valid");
  const perWord = words * cfg.price_per_word;
  const base = Math.max(perWord, cfg.min_order_price);
  const fast = wantFast ? cfg.fast_lane_price : 0;
  return {
    words, price_per_word: cfg.price_per_word, min_price: cfg.min_order_price,
    per_word_total: perWord, min_applied: perWord < cfg.min_order_price,
    base_total: base, fast_price: fast, total: base + fast,
  };
}
module.exports = { quote };
