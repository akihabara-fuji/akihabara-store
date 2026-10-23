/* Simulasi presentasi: hasil dikirim tim sebagai satu teks dengan penanda baris "=== TANYA JAWAB ===".
   Bagian sebelum penanda (simulasi presentasi) tampil penuh. Bagian sesudahnya (tanya jawab dosen) hanya cuplikan sampai dibuka.
   Pemotongan dilakukan di server: teks yang terkunci tidak pernah dikirim ke browser. Fungsi murni supaya mudah diuji. */
"use strict";

const MARK = /^[ \t]*={3,}[ \t]*TANYA[ \t]+JAWAB[ \t]*={3,}[ \t]*$/im;
const Q_LINE = /^[ \t]*(?:P|Q|Pertanyaan)[ \t]*\d+[.:)]/gim;
const PREVIEW_CHARS = 260;

function split(text) {
  const t = String(text || ""), m = MARK.exec(t);
  if (!m) return { talk: t.trim(), qa: "" };
  return { talk: t.slice(0, m.index).trim(), qa: t.slice(m.index + m[0].length).trim() };
}
const countQuestions = qa => (String(qa || "").match(Q_LINE) || []).length;

/* Cuplikan: hanya pertanyaan pertama (beberapa kalimat), dipotong di batas kata. Tidak pernah memuat pertanyaan kedua dan seterusnya,
   dan kalau hanya ada satu blok, paling banyak 40% teks, supaya tanya jawab yang pendek pun tidak tampil utuh. */
function preview(qa, max = PREVIEW_CHARS) {
  const t = String(qa || "").trim();
  Q_LINE.lastIndex = 0; Q_LINE.exec(t);                       // lewati penanda pertanyaan pertama
  const second = Q_LINE.exec(t); Q_LINE.lastIndex = 0;
  const head = second ? t.slice(0, second.index).trim() : t;
  const limit = second ? max : Math.min(max, Math.floor(t.length * 0.4));
  if (head.length <= limit) return head + (second ? "" : "…");
  const cut = head.slice(0, limit), sp = cut.lastIndexOf(" ");
  return (sp > limit * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:(-]+$/, "") + "…";
}

/* Yang boleh dilihat pembaca. unlocked=true: semuanya. */
function visible(text, unlocked) {
  const { talk, qa } = split(text);
  if (!qa) return { talk, qa: "", locked: false, total: 0 };
  if (unlocked) return { talk, qa, locked: false, total: countQuestions(qa) };
  return { talk, qa: preview(qa), locked: true, total: countQuestions(qa) };
}
/* Bentuk teks tunggal untuk dikirim ke pembaca (kompatibel dengan kolom resultText yang sudah ada). */
function render(text, unlocked) {
  const v = visible(text, unlocked);
  return { ...v, text: v.talk + (v.qa ? "\n\n=== TANYA JAWAB ===\n" + v.qa : "") };
}

module.exports = { split, preview, visible, render, countQuestions, MARK, PREVIEW_CHARS };
