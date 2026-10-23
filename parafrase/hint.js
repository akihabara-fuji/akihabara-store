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
  A: "Harusnya: panjang kalimat, awalan, dan penghubung bervariasi (selingi kalimat pendek dengan kalimat majemuk), dan frasa yang terkesan seragam diganti dengan kata sendiri.",
};

/* penanda: [frasa, padanan yang bisa dipakai] */
const AI_MARKERS = [
  ["penting untuk diingat", ["perlu diperhatikan", "langsung sebut isinya"]],
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

/* Jenis temuan kode A: kolom kind tidak disimpan di database (findings), jadi bila hilang diturunkan dari teks alasan.
   Dipakai bersama oleh aspek.js (Audit) dan triage.js supaya hitungannya sama di mana pun temuan berasal. */
function kindOf(f) {
  if (!f || f.code !== "A") return null;
  if (f.kind) return f.kind;
  const r = String(f.reason || "");
  if (/^Frasa yang sering muncul/.test(r)) return "ai";
  if (/^Panjang kalimat/.test(r)) return "uniform";
  if (/^Transisi "/.test(r)) return "trans";
  if (/^Tiga kalimat berturut/.test(r)) return "awalan";
  return null;
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

function splitParts(text) {
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
  return [`${cap(a)}.`, `${lead}${lead ? b : cap(b)}.`];
}
function splitSuggest(text) {
  const p = splitParts(text);
  return p ? `“${p[0]}” lalu “${p[1]}”` : null;
}
/* Contoh penulisan ulang yang bisa dibuat murni dari aturan: hanya kalimat panjang yang punya kata penghubung di tengah. Selain itu null. */
function rewriteFor(code, text) {
  if (code !== "U") return null;
  const p = splitParts(text);
  return p ? p.join(" ") : null;
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
      return `Ganti pernyataan umum${q ? ` (${q})` : ""} dengan hal yang spesifik. Pola: "Pada [objek penelitian], [fenomena] terlihat dari [data atau contoh] ([Penulis], [Tahun])." Hubungkan teori langsung dengan objek penelitianmu sendiri, bukan penjelasan yang berlaku untuk semua orang.`;
    case "A": {
      if (/^Panjang kalimat/.test(reason || "")) return "Selingi panjang kalimat: satu kalimat pendek yang tegas (sekitar 6 sampai 10 kata), lalu satu kalimat majemuk yang lebih panjang berisi alasan, contoh, atau data bersitasi. Pola: \"Dampaknya terasa. [Kalimat panjang yang menjelaskan sebab atau buktinya ([Penulis], [Tahun])].\"";
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

/* "Resep" perbaikan: dipasangkan dengan temuan lewat triage.js. Isinya panduan menulis ulang MANUAL dengan pemahaman sendiri.
   Tidak ada penulisan ulang otomatis di sini, dan tidak ada janji skor Drillbit/AI tertentu: batas dan hasil resmi ikut UT, prodi, dan tutor. */
const GUIDE = {
  gaya: {
    title: "Gaya tulisan terkesan seragam atau otomatis", codes: ["A"],
    why: "Pola yang terbaca seragam: panjang kalimat hampir sama, penghubung pembuka berulang, dan frasa yang lazim pada tulisan otomatis.",
    steps: [
      "Variasikan panjang kalimat: selingi kalimat pendek yang tegas dengan kalimat majemuk. Contoh: \"Teknologi ini bermanfaat. Mahasiswa dapat belajar kapan saja.\" menjadi \"Dengan teknologi ini, mahasiswa memperoleh keleluasaan belajar kapan saja, sehingga efisiensi belajarnya ikut meningkat.\"",
      "Kurangi penghubung pembuka yang berulang (Selain itu, Oleh karena itu, Dengan demikian) dan frasa seperti \"Penting untuk diingat bahwa\", \"Secara keseluruhan\", atau \"Dalam era digital ini\". Mulai saja dari isinya.",
      "Variasikan awalan kalimat: mulai dari subjek, keterangan waktu atau tempat, atau objeknya.",
    ],
  },
  analisis: {
    title: "Paragraf umum dan kurang analisis", codes: ["P", "H"],
    why: "Penjelasan yang berlaku untuk siapa saja tidak menunjukkan pemahaman dan analisismu sendiri.",
    steps: [
      "Tambahkan analisis atau sudut pandangmu: apa arti teori atau data itu bagi objek penelitianmu?",
      "Pakai data atau contoh nyata dari penelitianmu (jumlah responden, kasus pada mata kuliah, hasil observasi).",
      "Hubungkan teori langsung dengan konteks UT atau objek yang kamu teliti.",
    ],
  },
  sitasi: {
    title: "Klaim dan kutipan tanpa dasar yang jelas", codes: ["K", "B", "O"],
    why: "Angka, klaim, dan kutipan perlu sumber yang bisa dilacak pembaca.",
    steps: [
      "Tulis sitasi yang lengkap: Menurut Sugiyono (2020), ... atau (Sugiyono, 2020). Kutipan langsung wajib memakai tanda kutip dan nomor halaman.",
      "Pastikan setiap sitasi ada di daftar pustaka dan setiap pustaka dipakai di teks.",
      "Lebih baik menafsirkan kutipan dengan kata sendiri lalu menambahkan komentarmu daripada menempelnya apa adanya.",
    ],
  },
  orisinal: {
    title: "Kalimat berulang di dalam dokumen", codes: ["M"],
    why: "Kalimat yang sama muncul lebih dari sekali.",
    steps: ["Hapus pengulangannya, atau gabungkan dengan kalimat sebelumnya.", "Bila gagasannya memang perlu muncul lagi, ungkapkan dengan struktur dan kata yang berbeda."],
  },
  baca: {
    title: "Kalimat terlalu panjang", codes: ["U"],
    why: "Kalimat yang memuat banyak gagasan sulit dibaca.",
    steps: ["Pecah di kata penghubung (karena, sehingga, namun) menjadi dua kalimat, satu gagasan per kalimat."],
  },
};
const GUIDE_TEKNIK = {
  title: "Teknik tulis ulang manual",
  why: "Menulis ulang berarti memahami lalu menjelaskan dengan kata sendiri, bukan sekadar mengganti kata.",
  steps: [
    "Baca satu paragraf sampai selesai dan pahami intinya.",
    "Tutup teks aslinya.",
    "Tulis ulang ide itu dengan kata-katamu sendiri, seolah menjelaskannya kepada dosen pembimbing.",
    "Bandingkan dengan aslinya: maknanya harus sama, tetapi susunan kalimatnya benar-benar berbeda, dan sumbernya tetap disitasi.",
  ],
  note: "Hindari alat spinner otomatis: hasilnya sering janggal atau mengubah makna. Tidak ada cara yang menjamin angka Drillbit tertentu, dan teks yang dihasilkan alat otomatis tetap perlu kamu pahami dan tulis ulang sendiri.",
};
const GUIDE_CEK_RESMI = "Bila UT menyediakan cek mandiri Drillbit di e-learning, gunakan kesempatan pertama untuk melihat bagian mana yang ditandai, lalu rombak bagian itu dulu sebelum cek berikutnya. Jumlah kesempatan dan batasnya mengikuti ketentuan UT, prodi, dan tutormu (TIDAK TERVERIFIKASI oleh kami).";
const GUIDE_BY_CODE = Object.fromEntries(Object.entries(GUIDE).flatMap(([k, g]) => g.codes.map(c => [c, k])));

module.exports = { TARGET, AI_MARKERS, TRANS_ALT, findAiMarkers, helperFor, splitSuggest, splitParts, rewriteFor, kindOf, GUIDE, GUIDE_BY_CODE, GUIDE_TEKNIK, GUIDE_CEK_RESMI };
