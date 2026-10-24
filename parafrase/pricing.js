/* Harga dihitung di server dari pengaturan, bukan dari angka kiriman klien.
   total = max((kata - kata gratis) × harga per kata, minimum) + (jalur cepat ? biaya jalur cepat : 0) */
"use strict";

function quote(words, wantFast, cfg) {
  if (!Number.isInteger(words) || words < 1) throw new Error("Jumlah kata tidak valid");
  /* Kata pertama sebanyak free_words dibuka gratis; harga hanya untuk kata setelahnya. */
  const free = Math.min(words, Math.max(0, Number(cfg.free_words) || 0)), pay = words - free;
  if (pay < 1) return { words, free_words: free, charged_words: 0, price_per_word: cfg.price_per_word, min_price: cfg.min_order_price, per_word_total: 0, min_applied: false, base_total: 0, fast_price: 0, total: 0, all_free: true };
  const perWord = pay * cfg.price_per_word;
  const base = Math.max(perWord, cfg.min_order_price);
  const fast = wantFast ? cfg.fast_lane_price : 0;
  return {
    words, free_words: free, charged_words: pay, all_free: false, price_per_word: cfg.price_per_word, min_price: cfg.min_order_price,
    per_word_total: perWord, min_applied: perWord < cfg.min_order_price,
    base_total: base, fast_price: fast, total: base + fast,
  };
}
module.exports = { quote };
