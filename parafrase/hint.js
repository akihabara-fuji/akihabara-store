/* Arahan perbaikan untuk 8 kode warna Cek & Parafrase.
   TARGET   : "harusnya seperti apa" untuk tiap warna (dipakai di legenda dan komentar Word).
   helperFor: kalimat pembantu per kalimat bertanda, dibuat dari aturan dan pola, tanpa AI dan tanpa data luar.
   AI_MARKERS: kata dan frasa yang sering muncul pada tulisan seragam atau otomatis. Ini petunjuk gaya, bukan bukti, dan
   bukan detektor AI. Frasa umum yang sudah dicakup kode P (mis. "di era digital") sengaja tidak diulang di sini. */
"use strict";

const TARGET = {
  M: "Harusnya: tiap kalimat hanya muncul sekali di dokumen. Tulis ulang dengan struktur berbeda atau hapus pengulangannya.",
  O: "Harusnya: kutipan langsung memakai tanda kutip dan sitasi lengkap (penulis, tahun, halaman).",
  K: "Harusnya: setiap angka atau klaim umum punya sumber dalam format (Penulis, Tahun).",
  B: "Harusnya: sitasi lengkap (nama, tahun, dan halaman untuk kutipan langsung) dan pasangannya ada di daftar pustaka.",
  U: "Harusnya: satu kalimat memuat satu gagasan dan panjangnya di bawah batas.",
  H: "Harusnya: paragraf punya gagasan utama, penjelasan, lalu contoh atau analisis (sekitar 3 kalimat atau lebih).",
  P: "Harusnya: paragraf berisi analisis spesifik (data, contoh, atau sumber), bukan pernyataan umum.",
  A: "Harusnya: awalan dan penghubung kalimat bervariasi, dan frasa yang terkesan seragam diganti dengan kata sendiri.",
};

/* penanda: [frasa, padanan yang bisa dipakai] */
const AI_MARKERS = [
  ["penting untuk dicatat", ["perlu diperhatikan", "langsung sebut isinya"]],
  ["perlu dicatat bahwa", ["perlu diperhatikan bahwa", "langsung sebut isinya"]],
  ["dalam konteks ini", ["pada kasus ini", "di sini"]],
  ["hal ini menunjukkan bahwa", ["temuan ini memperlihatkan", "artinya"]],
  ["hal ini menunjukkan", ["temuan ini memperlihatkan", "artinya"]],
  ["dapat disimpulkan bahwa", ["jadi", "ringkasnya"]],
  ["secara keseluruhan", ["ringkasnya", "pada akhirnya"]],
  ["lanskap", ["kondisi", "situasi"]],
  ["krusial", ["penting", "menentukan"]],
  ["holistik", ["menyeluruh"]],
  ["komprehensif", ["lengkap", "menyeluruh"]],
  ["sinergi", ["kerja sama", "kolaborasi"]],
  ["menggali lebih dalam", ["menelaah", "mengkaji"]],
  ["menjadi landasan", ["menjadi dasar"]],
  ["tidak hanya", ["selain", "bukan sekadar"]],
  ["seiring dengan itu", ["pada saat yang sama", "bersamaan dengan itu"]],
  ["di tengah", ["ketika", "saat"]],
];
const norm = s => String(s || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
function findAiMarkers(text) {
  const low = " " + norm(text) + " ", out = [];
  for (const [m] of AI_MARKERS) { if (low.includes(" " + m + " ")) { if (!out.some(o => o.includes(m) || m.includes(o))) out.push(m); } }
  return out;
}

const TRANS_ALT = {
  "selain itu": ["di samping itu", "lebih jauh", "bersamaan dengan itu"],
  "oleh karena itu": ["karena itu", "akibatnya", "untuk alasan tersebut"],
  "selanjutnya": ["berikutnya", "setelah itu", "tahap berikutnya"],
  "di samping itu": ["selain itu", "tidak kalah penting", "lebih lanjut"],
  "dengan demikian": ["artinya", "jadi", "berdasarkan hal tersebut"],
  "namun demikian": ["meski begitu", "akan tetapi", "di sisi lain"],
  "lebih lanjut": ["selain itu", "sebagai tambahan"],
  "sehingga": ["akibatnya", "maka"],
  "kemudian": ["lalu", "setelah itu"],
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const words = s => String(s || "").trim().split(/\s+/).filter(Boolean).length;
const quoted = reason => (String(reason || "").match(/"([^"]+)"/) || [])[1] || "";

function splitSuggest(text) {
  const t = String(text || "").trim().replace(/[.!?]+$/, "");
  const re = /,\s*(sehingga|karena|namun|sedangkan|serta|dan)\s+|\s+(sehingga|karena|namun|sedangkan)\s+/gi;
  let best = null;
  for (const m of t.matchAll(re)) {
    const d = Math.abs(m.index - t.length / 2);
    if (!best || d < best.d) best = { d, i: m.index, len: m[0].length, conj: (m[1] || m[2]).toLowerCase() };
  }
  if (!best) return null;
  const a = t.slice(0, best.i).trim(), b = t.slice(best.i + best.len).trim();
  if (words(a) < 6 || words(b) < 4) return null;
  const lead = { sehingga: "Akibatnya, ", karena: "Hal ini terjadi karena ", namun: "Namun, ", sedangkan: "Sementara itu, ", serta: "", dan: "" }[best.conj];
  return `“${cap(a)}.” lalu “${lead}${lead ? b : cap(b)}.”`;
}

/* Kalimat pembantu: satu atau dua kalimat petunjuk konkret untuk kalimat bertanda. */
function helperFor(code, text, reason) {
  const q = quoted(reason);
  switch (code) {
    case "M":
      return "Ungkapkan gagasan yang sama dengan kata dan struktur berbeda (ubah aktif ke pasif atau sebaliknya, ganti kata kunci dengan padanannya), atau gabungkan dengan kalimat sebelumnya lalu hapus yang ini. Pola: \"Sejalan dengan hal tersebut, [gagasan dengan kata sendiri].\"";
    case "O":
      return "Pilih satu. (1) Kutip persis: Menurut [Penulis] ([Tahun], hlm. [nomor]), “[kutipan persis]”. (2) Parafrase tanpa tanda kutip tetapi tetap bersitasi: [Penulis] ([Tahun]) menyatakan bahwa [gagasan dengan kata sendiri].";
    case "B": {
      if (/halaman|hlm/i.test(reason)) return "Tambahkan nomor halaman pada sitasi kutipan langsung. Pola: ([Penulis], [Tahun], hlm. [nomor]) atau [Penulis] ([Tahun], hlm. [nomor]).";
      if (/tidak mencantumkan tahun/i.test(reason)) return `Lengkapi tahun pada sitasi${q ? " " + q : ""}. Pola: [Penulis] ([Tahun]) atau ([Penulis], [Tahun]).`;
      if (/tidak ditemukan di daftar pustaka/i.test(reason)) return `Periksa ejaan nama dan tahun${q ? " pada " + q : ""}, lalu pastikan entrinya ada di Daftar Pustaka dengan format APA 7: Penulis, I. (Tahun). Judul. Penerbit.`;
      if (/tidak disitasi/i.test(reason)) return "Sitasi pustaka ini di paragraf yang relevan, contoh: \"[gagasan] ([Penulis], [Tahun]).\" Bila tidak dipakai, hapus dari Daftar Pustaka.";
      if (/para ahli/i.test(reason)) return "Ganti \"para ahli\" dengan nama dan tahun. Pola: Menurut [Penulis] ([Tahun]), [gagasan].";
      return "Lengkapi sitasi: nama penulis, tahun, dan halaman bila kutipan langsung, lalu cocokkan dengan Daftar Pustaka.";
    }
    case "K":
      return "Tambahkan sumber yang mendukung angka atau klaim ini. Pola: \"[klaim atau angka] ([Penulis], [Tahun]).\" Bila tidak ada sumbernya, ubah menjadi pernyataan yang tidak memuat angka.";
    case "U": {
      const s = splitSuggest(text);
      return s ? `Pecah menjadi dua kalimat, contoh: ${s}` : "Pecah di tanda koma atau kata penghubung (karena, sehingga, namun) menjadi dua kalimat, satu gagasan per kalimat.";
    }
    case "H":
      return "Kembangkan menjadi tiga langkah: (1) gagasan utama, (2) penjelasan atau contoh, (3) implikasi atau kaitan dengan penelitian. Pola: \"Hal ini terlihat pada [contoh]. Artinya, [analisis].\"";
    case "P":
      return `Ganti pernyataan umum${q ? ` (${q})` : ""} dengan hal yang spesifik. Pola: "Pada [objek penelitian], [fenomena] terlihat dari [data atau contoh] ([Penulis], [Tahun])."`;
    case "A": {
      const m = String(reason || "").match(/Transisi "([^"]+)"/);
      if (m && TRANS_ALT[m[1]]) return `Ganti sebagian penghubung "${m[1]}" dengan: ${TRANS_ALT[m[1]].join(", ")}; atau mulai kalimat langsung dari subjeknya.`;
      if (/Tiga kalimat berturut-turut/.test(reason || "")) return "Ubah awalan salah satu kalimat: mulai dari objek, keterangan waktu atau tempat, atau gabungkan dua kalimat.";
      const marks = findAiMarkers(text);
      if (marks.length) {
        const alt = marks.map(x => { const e = AI_MARKERS.find(a => a[0] === x); return `"${x}" jadi ${e[1].join(" atau ")}`; });
        return `Ganti dengan kata sendiri: ${alt.join("; ")}. Atau hapus frasa pembukanya dan langsung sebut isinya.`;
      }
      return "Variasikan awalan dan penghubung kalimat dengan kata sendiri.";
    }
    default: return "";
  }
}

module.exports = { TARGET, AI_MARKERS, TRANS_ALT, findAiMarkers, helperFor, splitSuggest };
