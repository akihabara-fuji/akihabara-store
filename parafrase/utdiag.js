/* Diagnosis kalimat yang DITANDAI UT (sorotan biru laporan AI Drillbit).
   Hanya pola yang terbukti pada data uji: kalimat ditandai vs tidak ditandai di dokumen yang sama
   (6 dokumen, 1.685 kalimat isi). Pola yang tidak konsisten atau berlawanan arah tidak dipakai.
   Bukti diperbarui bila set kalibrasi bertambah. Ini bukan prediksi; kalimat yang didiagnosis sudah ditandai UT. */

const BUKTI = {
  proposisi: "Di 6 dokumen uji, 91% kalimat proposisi/hipotesis ditandai UT (rata-rata kalimat lain 52%); naik di semua dokumen yang memuatnya.",
  sintesis: "Di 6 dokumen uji, 63% kalimat ringkasan penelitian orang lain (bersitasi) ditandai UT, dibanding 52% kalimat lain; naik di 5 dari 6 dokumen.",
  definisi: "Di 6 dokumen uji, 76% kalimat definisi baku (\"X adalah suatu/proses/bentuk ...\", \"didefinisikan\") ditandai UT, dibanding 53% kalimat lain; naik di 5 dari 6 dokumen (contoh masih sedikit: 25 kalimat).",
  umum: "Di 6 dokumen uji, kalimat tanpa angka dan tanpa nama spesifik 57% ditandai UT, sedangkan yang memuat angka atau nama 45%; konsisten di 6 dari 6 dokumen.",
};

const POLA = [
  { id: "proposisi", label: "Proposisi/hipotesis berpola baku", re: /\b(proposisi|hipotesis)\b|\b[PH]\d\b/i,
    fix: "Jangan menulis pola \"Proposisi n: X berpengaruh/berkaitan dengan Y\". Tulis dugaanmu dari kasusmu sendiri: kejadian apa yang kamu lihat di tempat penelitian (siapa, kapan, berapa kali) yang membuatmu menduga begitu, baru sebut dugaannya.",
    jangan: "Menambah teori atau sitasi untuk menguatkan proposisi. Itu justru memperpanjang bagian yang berpola sama." },
  { id: "sintesis", label: "Ringkasan penelitian orang lain", re: /\([A-Z][^()]*\d{4}[a-z]?\)|\b(kajian|penelitian|studi)\b[^.]{0,60}\b(menunjukkan|menemukan|membuktikan|mengungkapkan)\b/i,
    fix: "Ambil satu temuan spesifik dari penelitian itu (angka, lokasi, atau objeknya), lalu tulis bedanya dengan kasusmu dalam satu kalimat sendiri. Kalau tidak ada temuan spesifik yang bisa kamu sebut, pangkas kalimat ringkasan ini.",
    jangan: "Menambah sitasi atau merangkai beberapa sitasi dalam satu kalimat. Kalimat bersitasi lebih sering ditandai di data kami." },
  { id: "definisi", label: "Definisi buku teks", re: /\b(didefinisikan|dimaknai|diartikan|yang dimaksud dengan)\b|\b(adalah|merupakan)\s+(suatu|sebuah|proses|kegiatan|bentuk|upaya|kemampuan|bagian|cara|keadaan|tindakan|serangkaian)\b/i,
    fix: "Ganti definisi umum dengan arti istilah itu di tempat penelitianmu (di PT/instansi/kelas yang kamu teliti, istilah ini berarti apa dan terlihat dari apa). Kalau memang harus memakai definisi ahli, kutip langsung dengan tanda kutip dan nomor halaman.",
    jangan: "Memparafrase definisi ahli dengan sinonim. Susunan kalimatnya tetap sama." },
];

const UMUM = { id: "umum", label: "Kalimat umum tanpa detail",
  fix: "Masukkan minimal satu detail yang hanya kamu tahu: nama tempat/unit, angka, waktu, atau kejadian dari pengamatanmu. Kalimat yang memuat angka atau nama spesifik lebih jarang ditandai.",
  jangan: "Menukar kata dengan sinonim atau membalik susunan kalimat tanpa menambah isi baru." };

const umum = t => !/\d/.test(t) && !/\s[A-Z][a-z]{2,}/.test(t);

function diagnose(text) {
  const t = String(text || "");
  const tags = POLA.filter(p => p.re.test(t)).map(p => ({ id: p.id, label: p.label, fix: p.fix, jangan: p.jangan, bukti: BUKTI[p.id] }));
  if (umum(t)) tags.push({ id: UMUM.id, label: UMUM.label, fix: UMUM.fix, jangan: UMUM.jangan, bukti: BUKTI.umum });
  if (!tags.length) tags.push({ id: "blok", label: "Ikut satu blok dengan kalimat sekitarnya",
    fix: "Kalimat ini sudah memuat detail spesifik dan tidak cocok dengan pola terukur. Kemungkinan ia ditandai karena berada di blok yang sama dengan kalimat di sekitarnya. Perbaiki kalimat lain di blok ini dulu; ubah kalimat ini hanya bila menyambung dengan perubahan itu.",
    jangan: "Menulis ulang total kalimat yang sudah spesifik.", bukti: "UT menandai blok utuh: di 6 dokumen uji hampir semua paragraf ditandai seluruhnya atau tidak sama sekali." });
  return tags;
}

/* Ringkasan per blok UT: pola yang paling banyak, untuk prioritas kerja. */
function blockSummary(items) {
  const by = new Map();
  for (const x of items) {
    const b = by.get(x.block) || by.set(x.block, { block: x.block, sentences: 0, count: {} }).get(x.block);
    b.sentences++; for (const g of x.tags) b.count[g.id] = (b.count[g.id] || 0) + 1;
  }
  return [...by.values()].sort((a, b) => a.block - b.block).map(b => {
    const top = Object.entries(b.count).sort((a, c) => c[1] - a[1])[0];
    return { block: b.block, sentences: b.sentences, umum: b.count.umum || 0, top: top ? top[0] : null, count: b.count };
  });
}

const PROTOKOL = [
  "Revisi HANYA kalimat di blok biru. Bagian yang tidak ditandai sudah lolos; mengubahnya bisa memunculkan tanda baru.",
  "Tulis sendiri. Jangan pakai alat parafrase atau AI untuk menulis ulang blok ini.",
  "Kerjakan semua blok sampai selesai, baca ulang, baru unggah sekali. Kesempatan unggah di UT terbatas.",
  "Data penelitianmu sendiri (angka, nama tempat, kejadian) adalah bahan revisi utama. Jangan mengarang data atau referensi.",
  "Setelah UT mengeluarkan laporan baru, unggah lagi di sini untuk melihat blok mana yang hilang dan mana yang masih ditandai.",
];

module.exports = { diagnose, blockSummary, PROTOKOL, BUKTI };
