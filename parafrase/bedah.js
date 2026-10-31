/* Bedah Laporan Penelitian UT.
   Mahasiswa mengunggah file asli + laporan Drillbit resmi dari UT (AI dan/atau Similarity). Server membaca angka dan blok yang
   ditandai UT (drillbit.js), memetakannya ke dokumen asli, dan menjalankan aturan modul yang sama dengan Cek & Parafrase
   (label 8 warna, rules.js). Angka dari laporan = "dibaca dari file yang diunggah", bukan hitungan kita dan belum diverifikasi UT.
   Gratis: rekomendasi pada kata isi pertama (bedah_gratis_kata), sisanya diburamkan tanpa teks dari server. Berbayar: semua temuan + Word berwarna,
   lewat tabel pesanan dan QRIS yang sudah ada (doc_type='bedah'). Teks temuan di luar jatah gratis tidak dikirim ke browser. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const JSZip = require("jszip");
const { U } = require("./acadpaths");
const { analyze, DocxError, countWords, splitSentences, isPdf } = require("./docx");
const rules = require("./rules");
const { computeProblem } = require("./masalah");
const { helperFor, rewriteFor } = require("./hint");
const drillbit = require("./drillbit");
const wordtools = require("./wordtools");
const utdiag = require("./utdiag");
const banding = require("./banding");
const studio = require("./studio");

const MAX_MB = 10, RATE = { max: 10, windowMs: 3600 * 1000 }, UPLOAD_TTL_MS = 2 * 3600 * 1000;
const PAID = new Set(["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang", "terkirim"]);
const COLOR_NAME = Object.fromEntries(Object.entries(rules.CODES).map(([k, v]) => [k, v.color]));

/* Nama dan NIM dari teks sampul (baris-baris awal). NIM UT 8-12 digit; nama = isian "Nama: ..." atau baris tepat di atas/bawah baris NIM. */
function idFromLines(lines) {
  const L = lines.map(x => String(x || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 90);
  let nim = "", nama = "", at = -1;
  L.forEach((t, i) => { if (!nim) { const m = /\bNIM\b\s*[.:]?\s*(\d{8,12})/i.exec(t) || /\bNomor Induk Mahasiswa\b[^\d]{0,20}(\d{8,12})/i.exec(t); if (m) { nim = m[1]; at = i; } } });
  if (!nim) { const i = L.findIndex(t => /^\(?0\d{8,11}\)?$/.test(t)); if (i >= 0) { nim = L[i].replace(/\D/g, ""); at = i; } }
  const looksName = t => /^[A-Za-z.' ,-]{3,60}$/.test(t) && t.split(" ").length >= 1 && t.split(" ").length <= 6 && !/universitas|terbuka|kementerian|program|studi|fakultas|tugas|proposal|makalah|mata kuliah|tutor|disusun|penelitian|skripsi|nim|tahun/i.test(t);
  for (const t of L) { const m = /\bNama(?:\s+(?:Mahasiswa|Lengkap))?\s*[:.]\s*([^\n]{3,60})$/i.exec(t); if (m && looksName(m[1].trim())) { nama = m[1].trim(); break; } }
  if (!nama && at >= 0) for (const j of [at - 1, at + 1]) if (L[j] && looksName(L[j])) { nama = L[j]; break; }
  return { nim, nama: nama ? nama.replace(/\s+/g, " ").slice(0, 80) : "" };
}

/* Kata isi: tanpa sampul (baris pendek), daftar isi, tabel, judul, dan daftar pustaka. */
function bodyStart(paras) {
  let start = 0;
  paras.forEach((p, i) => { if (i < paras.length * 0.5 && /\.{4,}\s*\d{1,3}\s*$/.test(String(p.text || ""))) start = i + 1; }); // baris daftar isi
  return start;
}
function bodyWords(paras, bibAt) {
  const start = bodyStart(paras);
  let n = 0;
  for (const p of paras) if (p.idx >= start && rules.isBody(p, bibAt)) n += countWords(p.text);
  return n;
}

/* Jumlah kata isi sebelum tiap paragraf (urutan dokumen), untuk menentukan bagian yang terbuka gratis. */
function wordOffsets(paras, bibAt) {
  const m = new Map(), start = bodyStart(paras); let n = 0;
  for (const p of paras) { m.set(p.idx, n); if (p.idx >= start && rules.isBody(p, bibAt)) n += countWords(p.text); }
  return m;
}

/* Satu temuan per kalimat (kode terberat). Kalimat yang ada di blok yang ditandai UT diutamakan, lalu menurut berat kode dan posisi. */
function rankFindings(findings, utKey) {
  const best = new Map();
  for (const f of findings) {
    const k = f.para_idx + ":" + f.sent_idx, cur = best.get(k);
    if (!cur || rules.PRIORITY.indexOf(f.code) < rules.PRIORITY.indexOf(cur.code)) best.set(k, f);
  }
  const inUt = f => (utKey && utKey.has(f.para_idx + ":" + f.sent_idx) ? 0 : 1);
  return [...best.values()].sort((a, b) => inUt(a) - inUt(b) || rules.PRIORITY.indexOf(a.code) - rules.PRIORITY.indexOf(b.code) || a.para_idx - b.para_idx || a.sent_idx - b.sent_idx);
}

/* Rekomendasi dua kalimat untuk kalimat yang berada di blok yang ditandai UT, per jenis temuan. Saran umum, bukan jaminan skor turun. */
const UT_REC = {
  M: "Kalimat ini sangat mirip sumber dan ikut di blok yang ditandai UT. Tulis ulang dengan susunan dan bahasamu sendiri, lalu beri sitasi bila idenya dari sumber.",
  O: "Kalimat ini terlihat dikutip dan ikut di blok yang ditandai UT. Beri tanda kutip dengan sumber dan halaman, atau parafrase sepenuhnya dengan kata-katamu.",
  K: "Klaim di kalimat ini belum bersumber dan ikut di blok yang ditandai UT. Tambahkan sitasi yang bisa diverifikasi, lalu kaitkan dengan datamu sendiri.",
  B: "Sitasi di kalimat ini belum lengkap dan ikut di blok yang ditandai UT. Lengkapi penulis, tahun, dan daftar pustakanya, lalu tulis ulang kalimatnya dengan bahasamu.",
  U: "Kalimat ini terlalu panjang dan ikut di blok yang ditandai UT. Pecah menjadi dua kalimat dan ganti bagian umum dengan detail penelitianmu.",
  H: "Paragraf ini singkat dan kurang berkembang, dan ikut di blok yang ditandai UT. Tambahkan penjelasan, contoh, atau data penelitianmu sendiri.",
  P: "Kalimat ini belum ada analisisnya dan ikut di blok yang ditandai UT. Tambahkan pendapat atau pembahasanmu tentang artinya bagi penelitianmu.",
  A: "Pola kalimat ini seragam dan ikut di blok yang ditandai UT. Variasikan panjang dan awal kalimat, lalu masukkan detail spesifik dari kasusmu.",
};

function describe(f, utByKey) {
  const ut = utByKey.get(f.para_idx + ":" + f.sent_idx);
  const rw = rewriteFor(f.code, f.text);
  return { code: f.code, color: COLOR_NAME[f.code], action: rules.CODES[f.code].action, target: rules.CODES[f.code].target, where: "Paragraf " + (f.para_idx + 1),
    text: f.text, reason: f.reason, example: rw || null, helper: helperFor(f.code, f.text, f.reason), ut: ut || null, utRec: ut ? UT_REC[f.code] || null : null };
}

const BLOCK_GUIDE = [
  "Ganti kalimat umum dengan detail dari kasus atau datamu sendiri: nama, angka, tempat, atau kejadian.",
  "Tambahkan analisis dan sudut pandangmu, bukan hanya merangkum teori.",
  "Kurangi penyambung yang berulang di awal kalimat (berdasarkan, sehingga, namun, selain itu) dan variasikan panjang kalimat.",
  "Pakai kutipan langsung dengan sumber dan halaman bila memang ada.",
  "Tulis ulang dengan bahasamu sendiri, bukan sekadar menukar kata.",
];

/* Word sederhana (untuk file asli PDF yang tidak bisa diwarnai): ringkasan + daftar temuan. */
async function reportDocx(meta, items) {
  const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const p = (t, o = {}) => `<w:p><w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
  const FILL = wordtools.FILL;
  let body = p("Bedah Laporan Penelitian UT", { b: true }) + p(meta.title) + p(meta.note);
  for (const x of items) {
    body += p(`${x.n}. [${x.code} · ${x.color}] ${x.where}`, { b: true }) + p(x.text, { fill: FILL[x.code] }) + p("Alasan: " + x.reason) + p("Saran: " + (x.example || x.helper || x.target));
  }
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

module.exports = function mountBedah({ library = null, app, express, db, settings, orders, root, sameOrigin, secret, requireAdmin, userFrom = null }) {
  const docsDir = path.join(root, "data", "private", "docs"), kalDir = path.join(root, "data", "private", "kalibrasi");
  fs.mkdirSync(docsDir, { recursive: true }); fs.mkdirSync(kalDir, { recursive: true });
  const hits = new Map();
  const hashIp = ip => crypto.createHmac("sha256", secret).update(String(ip || "")).digest("hex").slice(0, 32);
  const limited = (key, max, now) => { const arr = (hits.get(key) || []).filter(t => now - t < RATE.windowMs); if (arr.length >= max) { hits.set(key, arr); return true; } arr.push(now); hits.set(key, arr); return false; };
  let running = 0; const MAX_RUNNING = 3;
  const insert = db.prepare(`INSERT INTO uploads(id,path,original_name,size,sha256,detected,ip_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`);
  const setCount = () => db.prepare("SELECT COUNT(*) n FROM kalibrasi WHERE revoked_at IS NULL AND has_ai=1 AND has_sim=1").get().n;
  const beta = () => ({ sets: setCount() });

  /* Analisis satu dokumen: temuan modul, persen, kata isi, dan pemetaan blok UT. */
  async function analyseDoc(buf, aiRes, cfg) {
    const a = await analyze(buf);
    const bibAt = a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex;
    const findings = rules.analyzeFindings(a.paragraphs, bibAt, cfg);
    const problem = computeProblem(a.paragraphs, bibAt, findings, cfg);
    const words = bodyWords(a.paragraphs, bibAt);
    let map = { hits: [], words: 0 };
    if (aiRes && aiRes.ok && aiRes.blocks && aiRes.blocks.length) map = drillbit.mapBlocks(aiRes.blocks, a.paragraphs, splitSentences);
    return { a, bibAt, findings, problem, words, map };
  }
  const utIndex = map => new Map(map.hits.map(h => [h.para_idx + ":" + h.sent_idx, h.block]));
  /* Kalimat yang ditandai UT, urut posisi, masing-masing dengan diagnosis berbasis bukti (utdiag).
     Potongan berurutan dalam satu blok digabung lalu dipecah ulang jadi kalimat utuh, karena PDF terbaca per baris. */
  function utItems(paragraphs, hitList) {
    const byIdx = new Map(paragraphs.map(p => [p.idx, p])), cache = new Map();
    const sent = (pi, si) => { if (!cache.has(pi)) { const p = byIdx.get(pi); cache.set(pi, p ? splitSentences(p.text || "") : []); } return cache.get(pi)[si]; };
    const hs = [...hitList].sort((a, b) => a.para_idx - b.para_idx || a.sent_idx - b.sent_idx).map(h => ({ ...h, t: sent(h.para_idx, h.sent_idx) })).filter(h => h.t);
    const groups = [];
    for (const h of hs) { const g = groups[groups.length - 1]; if (g && g.block === h.block && h.para_idx - g.last <= 1) { g.hits.push(h); g.last = h.para_idx; } else groups.push({ block: h.block, last: h.para_idx, hits: [h] }); }
    const items = [];
    for (const g of groups) {
      const text = g.hits.map(h => h.t.trim()).join(" ").replace(/\s+/g, " ");
      // pecah juga pada titik yang diikuti huruf kecil (awal kalimat tidak ikut disorot UT); singkatan umum tidak dipecah
      const ss = text.split(/(?<=(?<!\b(?:al|dkk|hlm|no|vol|[A-Za-z]))[.!?])\s+(?=[A-Za-z“"(])/).map(x => x.trim()).filter(Boolean);
      // tiap kalimat utuh dikaitkan ke potongan asal (untuk tanda di Word)
      let pos = 0; const starts = g.hits.map(h => { const at = text.indexOf(h.t.trim().replace(/\s+/g, " "), pos); pos = at < 0 ? pos : at + 1; return at < 0 ? pos : at; });
      let off = 0;
      for (const t of ss) {
        const at = text.indexOf(t, off), end = (at < 0 ? off : at) + t.length; off = end;
        const own = g.hits.filter((h, j) => starts[j] < end && (j + 1 >= starts.length || starts[j + 1] > (at < 0 ? off - t.length : at)));
        const pa = own.length ? own[0].para_idx : g.hits[0].para_idx, pb = own.length ? own[own.length - 1].para_idx : pa;
        items.push({ n: items.length + 1, block: g.block, para_idx: pa, sent_idx: own.length ? own[0].sent_idx : g.hits[0].sent_idx, parts: own.map(h => [h.para_idx, h.sent_idx]),
          where: "Paragraf " + (pa + 1) + (pb !== pa ? "–" + (pb + 1) : ""), text: t, tags: utdiag.diagnose(t) });
      }
    }
    return items;
  }
  function utView(aiRes, map) {
    if (!aiRes || !aiRes.ok) return null;
    const per = {}; for (const h of map.hits) { const o = per[h.block] || (per[h.block] = { sentences: 0, words: 0, from: h.para_idx, to: h.para_idx }); o.sentences++; o.words += h.words; o.from = Math.min(o.from, h.para_idx); o.to = Math.max(o.to, h.para_idx); }
    const tbl = (aiRes.blockTable && aiRes.blockTable.length ? aiRes.blockTable : (aiRes.blocks || []).map(b => ({ n: b.n, words: b.words, sentences: null, pct: null })));
    return { pct: aiRes.aiPct, matchedWords: aiRes.matchedWords, totalWords: aiRes.totalWords, humanPct: aiRes.humanPct, confidence: aiRes.confidence,
      blocks: (aiRes.blocks || []).map((b, i) => ({ n: b.n, words: b.words, table: tbl[i] || null, mapped: per[b.n] || null })),
      mappedSentences: map.hits.length, mappedWords: map.words };
  }

  /* Satu mesin unggah untuk dua layanan: "bedah" (mahasiswa memperbaiki sendiri) dan "cek" (admin yang mengerjakan lewat Studio). */
  const uploadRoute = mode => (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("u:" + h, RATE.max, now)) return res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi satu jam lagi atau chat admin." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Antrean sedang penuh. Coba lagi beberapa saat." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 3, fields: 8 } })
      .fields([{ name: "file", maxCount: 1 }, { name: "ai", maxCount: 1 }, { name: "sim", maxCount: 1 }]);
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal. Coba lagi." });
      const F = req.files || {}, f = F.file && F.file[0];
      if (!f) return res.status(400).json({ error: "Pilih file asli (Word .docx atau PDF) yang kamu kirim ke UT." });
      const name = String(f.originalname || "").slice(0, 200);
      if (!/\.(docx|pdf)$/i.test(name)) return res.status(415).json({ error: "File asli harus Word (.docx) atau PDF." });
      const isPdfName = /\.pdf$/i.test(name);
      const waRaw = String((req.body || {}).wa || "").replace(/\D/g, "").replace(/^62/, "").replace(/^0/, "");
      if (!/^8\d{8,12}$/.test(waRaw)) return res.status(400).json({ error: "Isi nomor WhatsApp yang benar (contoh 0812xxxxxxxx) supaya kami bisa mengabari hasil perbaikanmu." });
      const waNum = "62" + waRaw;
      running++;
      try {
        const cfg = settings.getAll(), warn = [];
        let ai = null, sim = null, aiBuf = F.ai && F.ai[0] && F.ai[0].buffer, simBuf = F.sim && F.sim[0] && F.sim[0].buffer;
        for (const [buf, label] of [[aiBuf, "AI"], [simBuf, "Similarity"]]) if (buf && buf.slice(0, 4).toString() !== "%PDF") return res.status(415).json({ error: `Laporan ${label} harus berupa PDF asli dari UT.` });
        // jenis ditentukan dari isi laporan, bukan dari kolom yang dipilih (supaya tertukar pun tetap terbaca)
        let aiRaw = null, simRaw = null;
        const files = []; if (aiBuf) files.push(aiBuf); if (simBuf) files.push(simBuf);
        for (const b of files) {
          const k = await drillbit.detectKind(b);
          if (k === "ai") { ai = ai || await drillbit.parseAi(b); aiRaw = aiRaw || b; } else if (k === "sim") { sim = sim || await drillbit.parseSim(b); simRaw = simRaw || b; }
          else warn.push("Satu file laporan tidak dikenali sebagai laporan Drillbit dari UT. File itu dilewati.");
        }
        if (ai && !ai.ok) { warn.push(ai.error); ai = null; }
        if (sim && !sim.ok) { warn.push(sim.error); sim = null; }
        if (!sim) return res.status(400).json({ error: "Unggah laporan Similarity Drillbit (PDF) yang kamu terima dari UT. Semua berkas wajib diisi." });
        if (!ai) return res.status(400).json({ error: "Bedah fokus pada tanda dari UT. Unggah laporan AI Drillbit (PDF) yang kamu terima dari UT." });
        if (ai && ai.confidence === "rendah") warn.push("Sorotan biru pada laporan AI tidak terbaca utuh, jadi blok ditampilkan sebagai angka dan tidak dipetakan ke kalimat.");
        const r = await analyseDoc(f.buffer, ai && ai.confidence !== "rendah" ? ai : null, cfg);
        const bq = orders.bedahQuote(r.words, cfg), utKey = utIndex(r.map), ranked = rankFindings(r.findings, utKey);
        const items = utItems(r.a.paragraphs, r.map.hits), off = wordOffsets(r.a.paragraphs, r.bibAt);
        const isOpen = x => (off.get(x.para_idx) || 0) < bq.freeWords;
        const open = items.filter(isOpen), locked = items.filter(x => !isOpen(x)).map(x => ({ n: x.n, block: x.block, where: x.where, words: countWords(x.text) }));
        const by = {}; for (const x of ranked) by[x.code] = (by[x.code] || 0) + 1; // hanya untuk ringkasan kalibrasi internal
        /* Peta seluruh dokumen: hanya tanda UT. */
        let docMap = null;
        if (r.map.hits.length) docMap = r.a.paragraphs.filter(p => rules.isBody(p, r.bibAt)).map(p => ({ p: p.idx, s: splitSentences(p.text || "").map((t, i) => ({ t, u: utKey.has(p.idx + ":" + i) ? 1 : 0 })) })).filter(x => x.s.length);
        const blocks = utdiag.blockSummary(items);
        const id = crypto.randomBytes(16).toString("hex"), rel = `docs/${id}.${isPdfName ? "pdf" : "docx"}`;
        await fsp.writeFile(path.join(root, "data", "private", rel), f.buffer, { mode: 0o600 });
        const saved = { ai: ai && { pct: ai.aiPct, matchedWords: ai.matchedWords, totalWords: ai.totalWords, humanPct: ai.humanPct, blockTable: ai.blockTable, blocks: ai.blocks.map(b => ({ n: b.n, words: b.words })), confidence: ai.confidence }, sim, hits: ai && ai.confidence !== "rendah" ? r.map.hits : [], mapWords: r.map.words };
        await fsp.writeFile(path.join(docsDir, id + ".bedah.json"), JSON.stringify(saved), { mode: 0o600 });
        insert.run(id, rel, name, f.size, crypto.createHash("sha256").update(f.buffer).digest("hex"), JSON.stringify(mode === "cek" ? { kind: "cek", words: r.words, wordsWithoutBibliography: r.words, hasBibliography: false, title: name.replace(/\.[a-z0-9]{1,5}$/i, "").slice(0, 200), docType: "umum", language: "id", ai: !!ai, sim: !!sim } : { kind: "bedah", words: r.words, ai: !!ai, sim: !!sim }), h, now, now + UPLOAD_TTL_MS);
        // salinan lengkap untuk admin (Dokumen Saya): file asli, dua laporan Drillbit, dan angka hasil bacaan. Gagal menyimpan tidak boleh menggagalkan hasil Bedah.
        let stNama = "", stNim = "";
        try {   // otomatis dari sampul dokumen; bila tidak ada, dari halaman pertama laporan Drillbit
          const head = r.a && r.a.paragraphs ? r.a.paragraphs.slice(0, 120).map(p => String(p.text || "")) : [];
          let id = idFromLines(head.flatMap(t => t.split("\n")));
          for (const rep of [aiRaw, simRaw]) if ((!id.nim || !id.nama) && rep) { const h = idFromLines((await drillbit.headText(rep)).split("\n")); id = { nim: id.nim || h.nim, nama: id.nama || h.nama }; }
          stNama = id.nama; stNim = id.nim;
        } catch { /* tanpa nama/NIM: dikelompokkan lewat nomor WA */ }
        if (library) { try { await library.saveBedah({ service: mode, user: userFrom ? userFrom(req) : null, wa: waNum, nama: stNama, nim: stNim, name, buf: f.buffer, aiBuf: ai ? aiRaw : null, simBuf: sim ? simRaw : null, ai, sim, words: r.words, problemPct: r.problem && r.problem.pct }); } catch (e) { console.error("[bedah] simpan ke Dokumen gagal:", e && e.message); } }
        // data kalibrasi hanya bila mahasiswa memberi izin
        let kode = null;
        if (mode !== "cek" && String((req.body || {}).izin) === "1" && (ai || sim)) {
          kode = crypto.randomBytes(6).toString("hex");
          const d = path.join(kalDir, kode); await fsp.mkdir(d, { recursive: true, mode: 0o700 });
          await fsp.writeFile(path.join(d, "asli." + (isPdfName ? "pdf" : "docx")), f.buffer, { mode: 0o600 });
          const summary = { words: r.words, problemPct: r.problem.pct, labels: by, ai: saved.ai && { ...saved.ai, mapped: r.map.words }, sim: sim && { pct: sim.pct, grade: sim.grade, sourceTypes: sim.sourceTypes, content: sim.content, matchedSources: sim.matchedSources, totalWords: sim.totalWords } };
          // simpan file laporan sesuai jenisnya
          for (const b of files) { const k = await drillbit.detectKind(b); await fsp.writeFile(path.join(d, k === "ai" ? "ai.pdf" : "sim.pdf"), b, { mode: 0o600 }); }
          await fsp.writeFile(path.join(d, "ringkasan.json"), JSON.stringify(summary, null, 1), { mode: 0o600 });
          db.prepare("INSERT INTO kalibrasi(id,created_at,words,has_ai,has_sim,ai_pct,sim_pct,ext,summary) VALUES(?,?,?,?,?,?,?,?,?)")
            .run(kode, now, r.words, ai ? 1 : 0, sim ? 1 : 0, ai ? ai.aiPct : null, sim ? sim.pct : null, isPdfName ? "pdf" : "docx", JSON.stringify(summary));
        }
        if (mode === "cek") {   // mahasiswa hanya melihat angka UT, peta biru, dan hitungan warna. Tanpa teks rekomendasi.
          const byIdx = new Map(r.a.paragraphs.map(p => [p.idx, p]));
          const sentsOf = pi => { const p = byIdx.get(pi); return p ? splitSentences(p.text || "") : []; };
          return res.json({ uploadId: id, file: { name, size: f.size }, words: r.words, totalFindings: items.length, saved: true,
            ut: utView(ai, r.map), sim: sim && { pct: sim.pct, grade: sim.grade, matchedSources: sim.matchedSources, sourceTypes: sim.sourceTypes },
            stats: studio.stats(items, sentsOf), blocks, warn, docMap });
        }
        res.json({ uploadId: id, file: { name, size: f.size }, words: r.words, totalFindings: items.length, quote: bq,
          open, locked, ut: utView(ai, r.map), sim: sim && { pct: sim.pct, grade: sim.grade, matchedSources: sim.matchedSources, sourceTypes: sim.sourceTypes, content: sim.content, excluded: sim.excluded, sources: sim.sources },
          protokol: utdiag.PROTOKOL, blocks, warn, kode, beta: beta(), docMap });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        console.error("[bedah] gagal:", e && e.message);
        res.status(500).json({ error: "Dokumen tidak bisa diproses. Coba simpan ulang sebagai .docx lalu unggah lagi." });
      } finally { running--; }
    });
  };
  app.post("/ms/bedah/upload", uploadRoute("bedah"));
  app.post("/ms/cek/upload", uploadRoute("cek"));

  /* Cabut izin data: menghapus set kalibrasi milik kode itu. */
  app.post("/ms/bedah/cabut", express.json({ limit: "2kb" }), async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const kode = String((req.body || {}).kode || "");
    if (!/^[0-9a-f]{12}$/.test(kode)) return res.status(400).json({ error: "Kode tidak valid." });
    const row = db.prepare("SELECT id FROM kalibrasi WHERE id=? AND revoked_at IS NULL").get(kode);
    if (!row) return res.status(404).json({ error: "Data dengan kode itu tidak ditemukan atau sudah dihapus." });
    await fsp.rm(path.join(kalDir, kode), { recursive: true, force: true });
    db.prepare("UPDATE kalibrasi SET revoked_at=?, summary='{}' WHERE id=?").run(Date.now(), kode);
    res.json({ ok: true });
  });


  app.post("/ms/bedah/order", express.json({ limit: "8kb" }), (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("o:" + h, 10, now)) return res.status(429).json({ error: "Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti." });
    try {
      const { r, token, payExp } = orders.createBedahOrder(req.body || {}, h, now, userFrom ? userFrom(req) : null);
      res.json({ orderId: r.id, token, total: r.total, expiresAt: payExp, url: U("/ruangakademikut/pesanan/") + token });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error("[bedah] pesanan gagal:", e && e.message); res.status(500).json({ error: "Pesanan tidak bisa dibuat. Coba lagi." });
    }
  });

  /* Hasil lengkap + unduhan Word: hanya untuk pesanan yang sudah dikonfirmasi dan filenya belum dihapus. */
  async function paidContext(token, now) {
    const o = orders.byToken(token);
    if (!o || o.doc_type !== "bedah") throw Object.assign(new Error("Hasil tidak ditemukan."), { status: 404 });
    if (!(PAID.has(o.status) && !o.files_deleted_at && (!o.delete_at || o.delete_at > now))) throw Object.assign(new Error("Hasil belum terbuka (belum dibayar) atau file sudah dihapus."), { status: 402 });
    const buf = await fsp.readFile(orders.priv(o.original_file));
    let saved = {}; try { saved = JSON.parse(await fsp.readFile(path.join(docsDir, path.basename(o.original_file).replace(/\.(docx|pdf)$/i, "") + ".bedah.json"), "utf8")); } catch {}
    const cfg = settings.getAll();
    const r = await analyseDoc(buf, null, cfg);
    return { o, buf, saved, cfg, r };
  }
  app.get("/ms/bedah/report/:token", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now();
    if (limited("r:" + hashIp(req.ip), 120, now)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Sedang ramai. Muat ulang beberapa detik lagi." });
    running++;
    try {
      const c = await paidContext(req.params.token, now);
      const items = utItems(c.r.a.paragraphs, c.saved.hits || []);
      res.json({ title: c.o.title, words: c.r.words, total: items.length, findings: items, blocks: utdiag.blockSummary(items), protokol: utdiag.PROTOKOL,
        ut: c.saved.ai || null, sim: c.saved.sim || null, deleteAt: c.o.delete_at });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error("[bedah] laporan gagal:", e && e.message); res.status(500).json({ error: "Hasil tidak bisa dibuat. Hubungi admin dengan ID pesananmu." });
    } finally { running--; }
  });
  /* Pembanding: bandingkan kalimat yang ditandai UT di dokumen asli dengan hasil parafrase (Word/PDF baru). Hanya untuk pesanan Bedah yang sudah dibayar.
     File baru dibaca di memori dan tidak disimpan. */
  app.post("/ms/bedah/banding/:token", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now();
    if (limited("b:" + hashIp(req.ip), 20, now)) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba lagi nanti." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Sedang ramai. Coba lagi beberapa detik lagi." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 2 } }).single("file");
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal. Coba lagi." });
      const f = req.file;
      if (!f) return res.status(400).json({ error: "Pilih hasil parafrase (Word .docx atau PDF)." });
      if (!/\.(docx|pdf)$/i.test(String(f.originalname || ""))) return res.status(415).json({ error: "Hasil parafrase harus Word (.docx) atau PDF." });
      running++;
      try {
        const c = await paidContext(req.params.token, now);
        const items = utItems(c.r.a.paragraphs, c.saved.hits || []);
        if (!items.length) return res.status(422).json({ error: "Tidak ada kalimat yang ditandai UT untuk dibandingkan di pesanan ini." });
        const n = await analyze(f.buffer), nb = n.bibliographyParagraphIndex == null || n.bibliographyParagraphIndex < 0 ? null : n.bibliographyParagraphIndex;
        const pool = []; for (const p of n.paragraphs) if (rules.isBody(p, nb)) for (const t of splitSentences(p.text || "")) if (countWords(t) >= 4) pool.push({ text: t.trim(), where: "Paragraf " + (p.idx + 1), pos: p.idx / Math.max(1, n.paragraphs.length) });
        if (!pool.length) return res.status(422).json({ error: "Isi dokumen baru tidak terbaca. Pastikan ini file hasil parafrase (bukan sampul atau gambar)." });
        const out = banding.compare(items.map(x => ({ n: x.n, block: x.block, where: x.where, text: x.text, pos: x.para_idx / Math.max(1, c.r.a.paragraphs.length) })), pool);
        orders.event(c.o.id, "bedah_banding", `kalimat=${items.length}`);
        res.json({ title: c.o.title, file: String(f.originalname).slice(0, 120), ...out });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        if (e.status) return res.status(e.status).json({ error: e.message });
        console.error("[bedah] banding gagal:", e && e.message); res.status(500).json({ error: "Perbandingan gagal. Coba lagi atau hubungi admin dengan ID pesananmu." });
      } finally { running--; }
    });
  });
  /* Banding laporan UT pertama vs kedua (PDF AI Drillbit baru). Hanya pesanan yang sudah dibayar. File tidak disimpan. */
  app.post("/ms/bedah/banding-laporan/:token", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now();
    if (limited("bl:" + hashIp(req.ip), 10, now)) return res.status(429).json({ error: "Terlalu banyak permintaan. Coba lagi nanti." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Sedang ramai. Coba lagi beberapa detik lagi." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 2 } }).single("file");
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal. Coba lagi." });
      const f = req.file;
      if (!f || !/\.pdf$/i.test(String(f.originalname || ""))) return res.status(415).json({ error: "Unggah laporan AI kedua dari UT dalam bentuk PDF." });
      running++;
      try {
        const c = await paidContext(req.params.token, now);
        const before = utItems(c.r.a.paragraphs, c.saved.hits || []);
        if (!before.length) return res.status(422).json({ error: "Pesanan ini tidak punya kalimat yang ditandai UT untuk dibandingkan." });
        if (await drillbit.detectKind(f.buffer) !== "ai") return res.status(422).json({ error: "File ini bukan laporan AI Drillbit. Unggah PDF laporan AI kedua." });
        const ai = await drillbit.parseAi(f.buffer);
        if (!ai || !ai.ok || !ai.blocks || !ai.blocks.length) return res.status(422).json({ error: "Laporan kedua tidak memuat blok yang ditandai, atau formatnya tidak terbaca." });
        // laporan kedua milik dokumen hasil revisi, jadi teks blok dipakai langsung (bukan dipetakan ke dokumen asli)
        const after = []; for (const b of ai.blocks) for (const t of splitSentences(String(b.text || "").replace(/\s+/g, " ").trim())) if (countWords(t) >= 4) after.push({ block: b.n, where: "Blok " + b.n, text: t.trim() });
        const out = banding.compareReports(before.map(x => ({ block: x.block, where: x.where, text: x.text })), after);
        orders.event(c.o.id, "bedah_banding_laporan", `sebelum=${before.length} sesudah=${after.length}`);
        res.json({ title: c.o.title, ...out });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        if (e.status) return res.status(e.status).json({ error: e.message });
        console.error("[bedah] banding laporan gagal:", e && e.message); res.status(500).json({ error: "Perbandingan laporan gagal. Coba lagi atau hubungi admin dengan ID pesananmu." });
      } finally { running--; }
    });
  });
  app.get("/ms/bedah/download/:token", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now();
    if (limited("d:" + hashIp(req.ip), 30, now)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    try {
      const c = await paidContext(req.params.token, now);
      const items = utItems(c.r.a.paragraphs, c.saved.hits || []);
      const rows = markRows(items);
      const pdf = isPdf(c.buf);
      const out = pdf ? await reportDocx({ title: c.o.title, note: "File aslimu PDF, jadi laporan ini berupa daftar kalimat yang ditandai UT beserta diagnosisnya. Unggah .docx bila ingin tanda langsung di dokumenmu." }, items.map(x => ({ n: x.n, code: "X", color: "Blok UT " + x.block, where: x.where, text: x.text, reason: x.tags.map(g => g.label).join("; "), target: x.tags.map(g => "Perbaiki: " + g.fix + " Jangan: " + g.jangan).join(" | ") })))
        : await wordtools.buildColored(c.buf, rows);
      res.set({ "Content-Disposition": `attachment; filename="${c.o.id} bedah laporan.docx"` }).type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(out);
      orders.event(c.o.id, "bedah_diunduh", null);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error("[bedah] unduh gagal:", e && e.message); res.status(500).json({ error: "File gagal dibuat. Hubungi admin dengan ID pesananmu." });
    }
  });

  const noteOf = x => `Blok UT ${x.block}\n` + x.tags.map(g => `${g.label}\nPerbaiki: ${g.fix}\nJangan: ${g.jangan}\nBukti: ${g.bukti}`).join("\n\n");
  function markRows(items) {
    const rows = [], seen = new Set();
    items.forEach(x => (x.parts.length ? x.parts : [[x.para_idx, x.sent_idx]]).forEach(([pi, si], j) => { const k = pi + ":" + si; if (seen.has(k)) return; seen.add(k); rows.push({ seq: rows.length + 1, code: "X", para_idx: pi, sent_idx: si, text: x.text, reason: "", note: j === 0 ? noteOf(x) : `Blok UT ${x.block} (lanjutan kalimat di atas)` }); }));
    return rows;
  }

  /* ---------- admin: data kalibrasi ---------- */
  if (requireAdmin) {
    app.get("/ms/admin/bedah/kalibrasi", requireAdmin, (req, res) => {
      res.set("Cache-Control", "no-store");
      const rows = db.prepare("SELECT id,created_at,words,has_ai,has_sim,ai_pct,sim_pct,ext,revoked_at,verdict,summary FROM kalibrasi ORDER BY created_at DESC LIMIT 500").all()
        .map(r => { let c = { cek: null, coverage: null }; try { c = cekSet(JSON.parse(r.summary || "{}")); } catch (_) {} const { summary, ...x } = r; return { ...x, cek: c.cek, coverage: c.coverage }; });
      const live = rows.filter(r => !r.revoked_at && r.cek !== null);
      const benar = live.filter(r => r.cek && (r.coverage == null || r.coverage >= 95) && r.verdict !== "tidak").length;
      const gagal = live.length - benar, cek = live.filter(r => r.verdict).length;
      res.json({ beta: beta(), items: rows, ringkas: { n: live.length, benar, gagal, dicek: cek, batas: batasAkurasi(live.length, gagal) } });
    });
    app.post("/ms/admin/bedah/kalibrasi/:id/verdict", requireAdmin, express.json({ limit: "1kb" }), (req, res) => {
      const v = (req.body || {}).verdict;
      if (!["cocok", "tidak", null].includes(v)) return res.status(400).json({ error: "Nilai tidak valid." });
      const r = db.prepare("UPDATE kalibrasi SET verdict=? WHERE id=? AND revoked_at IS NULL").run(v, String(req.params.id));
      if (!r.changes) return res.status(404).json({ error: "Set tidak ditemukan." });
      res.json({ ok: true });
    });
    app.get("/ms/admin/bedah/kalibrasi/:id/:f(asli|ai|sim)", requireAdmin, (req, res) => {
      const d = path.join(kalDir, String(req.params.id).replace(/[^a-f0-9]/g, ""));
      const f = fs.existsSync(d) && fs.readdirSync(d).find(n => n.startsWith(req.params.f === "asli" ? "asli." : req.params.f + "."));
      if (!f) return res.status(404).json({ error: "Berkas tidak ada." });
      res.set("Cache-Control", "no-store").sendFile(path.join(d, f));
    });
    app.get("/ms/admin/bedah/ringkasan.json", requireAdmin, (req, res) => {
      const rows = db.prepare("SELECT id,created_at,summary FROM kalibrasi WHERE revoked_at IS NULL ORDER BY created_at").all();
      res.set({ "Content-Disposition": 'attachment; filename="kalibrasi-ringkasan.json"', "Cache-Control": "no-store" }).type("application/json")
        .send(JSON.stringify(rows.map(r => ({ id: r.id, at: r.created_at, ...JSON.parse(r.summary || "{}") })), null, 1));
    });
    app.get("/ms/admin/bedah/kalibrasi.zip", requireAdmin, async (req, res) => {
      try {
        const rows = db.prepare("SELECT id FROM kalibrasi WHERE revoked_at IS NULL ORDER BY created_at").all();
        const zip = new JSZip();
        rows.forEach((r, i) => {
          const tag = "D" + String(i + 1).padStart(2, "0"), d = path.join(kalDir, r.id);
          if (!fs.existsSync(d)) return;
          for (const f of fs.readdirSync(d)) zip.file(`${tag}/${tag}_${f}`, fs.readFileSync(path.join(d, f)));
        });
        const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
        res.set({ "Content-Disposition": 'attachment; filename="kalibrasi-paket.zip"', "Cache-Control": "no-store" }).type("application/zip").send(out);
      } catch (e) { console.error("[bedah] zip gagal:", e && e.message); res.status(500).json({ error: "Paket gagal dibuat." }); }
    });

    /* ---------- admin: Studio Parafrase (Cek & Parafrase berbasis laporan UT) ----------
       Monitor A = dokumen asli lengkap dengan tanda dan rekomendasi. Monitor B = dokumen polos; hanya kalimat biru dari UT yang bisa diganti. */
    const sErr = (status, message) => Object.assign(new Error(message), { status });
    const sFail = (res, e, tag) => { if (e && e.status) return res.status(e.status).json({ error: e.message, ...(e.skipped ? { skipped: e.skipped } : {}) }); console.error("[studio] " + tag + ":", e && e.message); res.status(500).json({ error: "Studio gagal memproses. Coba lagi." }); };
    /* Studio dibuka dari Dokumen Saya (id 16 hex) atau dari pesanan (NA-...). Dari Dokumen Saya, tanda UT dibaca ulang dari file AI Drillbit yang tersimpan. */
    async function studioDoc(id) {
      const row = db.prepare("SELECT * FROM doc_library WHERE id=?").get(id);
      if (!row || !row.path) throw sErr(404, "Dokumen tidak ditemukan.");
      if (!row.ai_path) throw sErr(409, "Dokumen ini belum punya laporan AI Drillbit, jadi belum ada tanda UT untuk Studio.");
      const pr = rel => path.join(root, "data", "private", rel);
      let buf, aiBuf; try { buf = await fsp.readFile(pr(row.path)); aiBuf = await fsp.readFile(pr(row.ai_path)); } catch { throw sErr(410, "File dokumen sudah dihapus dari server."); }
      let data = {}; try { data = row.data ? JSON.parse(row.data) : {}; } catch { /* data rusak */ }
      const ai = await drillbit.parseAi(aiBuf);
      if (!ai || !ai.ok || ai.confidence === "rendah") throw sErr(409, "Sorotan biru pada laporan AI tidak terbaca utuh, jadi kalimat UT tidak bisa dipetakan.");
      const r = await analyseDoc(buf, ai, settings.getAll()), items = utItems(r.a.paragraphs, r.map.hits);
      let orderId = row.order_id || null;
      if (!orderId && data.sha) { const x = db.prepare("SELECT o.id FROM orders o JOIN uploads u ON u.order_id=o.id WHERE u.sha256=? ORDER BY o.created_at DESC LIMIT 1").get(data.sha); if (x) orderId = x.id; }
      const od = orderId ? db.prepare("SELECT * FROM orders WHERE id=?").get(orderId) : null;
      const o = { id: row.id, title: row.title || row.name, status: od ? od.status : "belum dipesan", wa_number: row.wa || (od && od.wa_number) || "", word_count: row.words || r.words };
      return { o, orderId, base: row.id, saved: { ai: data.ai || null, sim: data.sim || null }, buf, a: r.a, bibAt: r.bibAt, items, pdf: isPdf(buf) };
    }
    async function studioCtx(id) {
      if (/^[a-f0-9]{16}$/.test(String(id || ""))) return studioDoc(String(id));
      const o = db.prepare("SELECT * FROM orders WHERE id=?").get(String(id || ""));
      if (!o || ["layanan", "audit", "bedah"].includes(o.doc_type) || !o.original_file) throw sErr(404, "Pesanan Cek & Parafrase tidak ditemukan.");
      if (o.files_deleted_at) throw sErr(410, "File pesanan sudah dihapus.");
      const base = path.basename(o.original_file).replace(/\.(docx|pdf)$/i, "");
      let saved; try { saved = JSON.parse(await fsp.readFile(path.join(docsDir, base + ".bedah.json"), "utf8")); } catch { throw sErr(409, "Pesanan ini tidak lewat alur laporan UT, jadi tidak ada tanda UT untuk Studio."); }
      const buf = await fsp.readFile(orders.priv(o.original_file));
      const a = await analyze(buf), bibAt = a.bibliographyParagraphIndex == null || a.bibliographyParagraphIndex < 0 ? null : a.bibliographyParagraphIndex;
      const items = utItems(a.paragraphs, saved.hits || []);
      return { o, orderId: o.id, base, saved, buf, a, bibAt, items, pdf: isPdf(buf) };
    }
    const draftFile = base => path.join(docsDir, base + ".studio.json");
    async function readDraft(base) { try { return JSON.parse(await fsp.readFile(draftFile(base), "utf8")); } catch { return { edits: {} }; } }
    const cleanEdits = (items, raw) => { const ok = new Set(items.map(x => x.n)), out = {}; for (const [k, v] of Object.entries(raw && typeof raw === "object" ? raw : {})) if (ok.has(Number(k)) && typeof v === "string") out[k] = v.slice(0, 4000); return out; };

    app.get("/ms/admin/studio/:id", requireAdmin, async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        const c = await studioCtx(req.params.id), byIdx = new Map(c.a.paragraphs.map(p => [p.idx, p]));
        const sentsOf = pi => { const p = byIdx.get(pi); return p ? splitSentences(p.text || "") : []; };
        const nOf = new Map(); for (const x of c.items) (x.parts.length ? x.parts : [[x.para_idx, x.sent_idx]]).forEach(([pi, si]) => nOf.set(pi + ":" + si, x.n));
        const paras = c.a.paragraphs.filter(p => rules.isBody(p, c.bibAt)).map(p => ({ p: p.idx, s: splitSentences(p.text || "").map((t, i) => ({ t, n: nOf.get(p.idx + ":" + i) || 0 })) })).filter(x => x.s.length);
        const draft = await readDraft(c.base);
        res.json({ order: { id: c.o.id, title: c.o.title, status: c.o.status, wa: c.o.wa_number, words: c.o.word_count },
          ut: c.saved.ai || null, sim: c.saved.sim || null, longMax: studio.LONG_MAX,
          items: c.items.map(x => ({ n: x.n, block: x.block, where: x.where, text: x.text, para_idx: x.para_idx, sent_idx: x.sent_idx, parts: x.parts && x.parts.length ? x.parts : [[x.para_idx, x.sent_idx]], tags: x.tags, ciri: studio.ciri(x.text, sentsOf(x.para_idx)) })),
          paras, draft: draft.edits || {} });
      } catch (e) { sFail(res, e, "muat"); }
    });
    app.put("/ms/admin/studio/:id/draft", requireAdmin, express.json({ limit: "400kb" }), async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        const c = await studioCtx(req.params.id), edits = cleanEdits(c.items, (req.body || {}).edits);
        await fsp.writeFile(draftFile(c.base), JSON.stringify({ edits, savedAt: Date.now() }), { mode: 0o600 });
        res.json({ ok: true, done: Object.values(edits).filter(v => v.trim()).length });
      } catch (e) { sFail(res, e, "draf"); }
    });
    app.get("/ms/admin/studio/:id/word", requireAdmin, async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        const c = await studioCtx(req.params.id);
        const out = c.pdf ? await studio.plainDocx(c.a.paragraphs, null, new Set(c.items.flatMap(x => (x.parts && x.parts.length ? x.parts : [[x.para_idx, x.sent_idx]]).map(([pi, si]) => pi + ":" + si)))) : await wordtools.buildColored(c.buf, markRows(c.items));
        res.set({ "Content-Disposition": `attachment; filename="${c.o.id} untuk diedit.docx"` }).type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(out);
      } catch (e) { sFail(res, e, "word"); }
    });
    app.post("/ms/admin/studio/:id/import", requireAdmin, (req, res) => {
      multer({ storage: multer.memoryStorage(), limits: { fileSize: settings.get("file_max_mb") * 1048576, files: 1 } }).single("file")(req, res, async err => {
        res.set("Cache-Control", "no-store");
        try {
          if (err || !req.file || !/\.docx$/i.test(req.file.originalname || "")) throw sErr(400, "Pilih file Word (.docx) hasil edit.");
          const c = await studioCtx(req.params.id), a2 = await analyze(req.file.buffer);
          const sug = studio.matchImported(c.items, a2.paragraphs);
          res.json({ ok: true, suggest: sug, matched: Object.keys(sug).length, total: c.items.length });
        } catch (e) { if (e instanceof DocxError) return res.status(422).json({ error: e.message }); sFail(res, e, "impor"); }
      });
    });
    app.post("/ms/admin/studio/:id/finish", requireAdmin, express.json({ limit: "400kb" }), async (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        const c = await studioCtx(req.params.id), body = req.body || {};
        const edits = cleanEdits(c.items, body.edits || (await readDraft(c.base)).edits);
        const list = studio.editsFromItems(c.items, edits);
        if (!list.length) throw sErr(400, "Belum ada kalimat biru yang diubah.");
        let r;
        if (c.pdf) { const w = studio.rewriteParagraphs(c.a.paragraphs, list); r = { buf: await studio.plainDocx(c.a.paragraphs, w.texts, null), applied: w.applied, skipped: [] }; }
        else r = await studio.applyEdits(c.buf, list);
        if (r.skipped.length && body.force !== true) throw Object.assign(sErr(409, r.skipped.length + " kalimat tidak bisa diganti otomatis (paragraf berformat rumit). Ganti manual lewat Word, atau kirim tetap dengan menandai \"kirim tetap\"."), { skipped: r.skipped });
        if (!c.orderId) throw sErr(409, "Mahasiswa belum membuat pesanan untuk dokumen ini, jadi belum ada tujuan pengiriman. Simpan draf atau unduh Word dulu.");
        const o = await orders.deliverStudio(c.orderId, r.buf);
        await fsp.writeFile(draftFile(c.base), JSON.stringify({ edits, savedAt: Date.now(), sentAt: Date.now() }), { mode: 0o600 });
        res.json({ ok: true, applied: r.applied, skipped: r.skipped, status: o.status });
      } catch (e) { sFail(res, e, "kirim"); }
    });
  }
  return { beta };
};

/* Cek akurasi pembacaan satu set kalibrasi, dihitung dari ringkasannya (tanpa AI, tanpa tebakan). */
function cekSet(summary) {
  const a = summary && summary.ai; if (!a) return { cek: null, coverage: null };
  const sum = (a.blocks || []).reduce((t, b) => t + (Number(b.words) || 0), 0), m = Number(a.matchedWords) || 0, tot = Number(a.totalWords) || 0;
  const tbl = a.blockTable || [];
  const okSum = m > 0 && Math.abs(sum - m) <= Math.max(5, Math.round(m * 0.01));
  const okPct = tot > 0 && a.pct != null && Math.abs(m / tot * 100 - a.pct) <= 1.5;
  const okN = !tbl.length || tbl.length === (a.blocks || []).length;
  const coverage = m > 0 && a.mapped != null ? Math.min(100, Math.round(a.mapped / m * 100)) : null;
  return { cek: okSum && okPct && okN, detail: { sum, matched: m, okSum, okPct, okN }, coverage };
}
/* Batas bawah akurasi (aturan tiga, keyakinan 95%): n set tanpa satu pun gagal => kegagalan < 3/n. */
function batasAkurasi(n, gagal) { return n > 0 && gagal === 0 ? Math.floor((1 - 3 / n) * 1000) / 10 : null; }
module.exports.bodyWords = bodyWords;
module.exports.idFromLines = idFromLines;
module.exports.cekSet = cekSet;
module.exports.batasAkurasi = batasAkurasi;
module.exports.rankFindings = rankFindings;
