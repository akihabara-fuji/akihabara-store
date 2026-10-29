/* Bedah Laporan Penelitian UT.
   Mahasiswa mengunggah file asli + laporan Drillbit resmi dari UT (AI dan/atau Similarity). Server membaca angka dan blok yang
   ditandai UT (drillbit.js), memetakannya ke dokumen asli, dan menjalankan aturan modul yang sama dengan Cek & Parafrase
   (label 8 warna, rules.js). Angka dari laporan = "dibaca dari file yang diunggah", bukan hitungan kita dan belum diverifikasi UT.
   Gratis: sejumlah temuan terberat (bedah_gratis_temuan) lengkap dengan contoh perbaikan. Berbayar: semua temuan + Word berwarna,
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

const MAX_MB = 10, RATE = { max: 10, windowMs: 3600 * 1000 }, UPLOAD_TTL_MS = 2 * 3600 * 1000;
const PAID = new Set(["baru_dibayar", "dianalisis", "dikerjakan", "cek_ulang", "terkirim"]);
const COLOR_NAME = Object.fromEntries(Object.entries(rules.CODES).map(([k, v]) => [k, v.color]));

/* Kata isi: tanpa sampul (baris pendek), daftar isi, tabel, judul, dan daftar pustaka. */
function bodyWords(paras, bibAt) {
  let start = 0;
  paras.forEach((p, i) => { if (i < paras.length * 0.5 && /\.{4,}\s*\d{1,3}\s*$/.test(String(p.text || ""))) start = i + 1; }); // baris daftar isi
  let n = 0;
  for (const p of paras) if (p.idx >= start && rules.isBody(p, bibAt)) n += countWords(p.text);
  return n;
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

module.exports = function mountBedah({ app, express, db, settings, orders, root, sameOrigin, secret, requireAdmin, userFrom = null }) {
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
  function utView(aiRes, map) {
    if (!aiRes || !aiRes.ok) return null;
    const per = {}; for (const h of map.hits) { const o = per[h.block] || (per[h.block] = { sentences: 0, words: 0, from: h.para_idx, to: h.para_idx }); o.sentences++; o.words += h.words; o.from = Math.min(o.from, h.para_idx); o.to = Math.max(o.to, h.para_idx); }
    const tbl = (aiRes.blockTable && aiRes.blockTable.length ? aiRes.blockTable : (aiRes.blocks || []).map(b => ({ n: b.n, words: b.words, sentences: null, pct: null })));
    return { pct: aiRes.aiPct, matchedWords: aiRes.matchedWords, totalWords: aiRes.totalWords, humanPct: aiRes.humanPct, confidence: aiRes.confidence,
      blocks: (aiRes.blocks || []).map((b, i) => ({ n: b.n, words: b.words, table: tbl[i] || null, mapped: per[b.n] || null })),
      mappedSentences: map.hits.length, mappedWords: map.words };
  }

  app.post("/ms/bedah/upload", (req, res) => {
    res.set("Cache-Control", "no-store");
    if (!sameOrigin(req)) return res.status(403).json({ error: "Permintaan ditolak." });
    const now = Date.now(), h = hashIp(req.ip);
    if (limited("u:" + h, RATE.max, now)) return res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi satu jam lagi atau chat admin." });
    if (running >= MAX_RUNNING) return res.status(503).json({ error: "Antrean sedang penuh. Coba lagi beberapa saat." });
    const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_MB * 1024 * 1024, files: 3, fields: 4 } })
      .fields([{ name: "file", maxCount: 1 }, { name: "ai", maxCount: 1 }, { name: "sim", maxCount: 1 }]);
    up(req, res, async err => {
      if (err) return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? `File terlalu besar (maksimal ${MAX_MB} MB).` : "Unggahan gagal. Coba lagi." });
      const F = req.files || {}, f = F.file && F.file[0];
      if (!f) return res.status(400).json({ error: "Pilih file asli (Word .docx atau PDF) yang kamu kirim ke UT." });
      const name = String(f.originalname || "").slice(0, 200);
      if (!/\.(docx|pdf)$/i.test(name)) return res.status(415).json({ error: "File asli harus Word (.docx) atau PDF." });
      const isPdfName = /\.pdf$/i.test(name);
      running++;
      try {
        const cfg = settings.getAll(), warn = [];
        let ai = null, sim = null, aiBuf = F.ai && F.ai[0] && F.ai[0].buffer, simBuf = F.sim && F.sim[0] && F.sim[0].buffer;
        for (const [buf, label] of [[aiBuf, "AI"], [simBuf, "Similarity"]]) if (buf && buf.slice(0, 4).toString() !== "%PDF") return res.status(415).json({ error: `Laporan ${label} harus berupa PDF asli dari UT.` });
        // jenis ditentukan dari isi laporan, bukan dari kolom yang dipilih (supaya tertukar pun tetap terbaca)
        const files = []; if (aiBuf) files.push(aiBuf); if (simBuf) files.push(simBuf);
        for (const b of files) {
          const k = await drillbit.detectKind(b);
          if (k === "ai") ai = ai || await drillbit.parseAi(b); else if (k === "sim") sim = sim || await drillbit.parseSim(b);
          else warn.push("Satu file laporan tidak dikenali sebagai laporan Drillbit dari UT. File itu dilewati.");
        }
        if (ai && !ai.ok) { warn.push(ai.error); ai = null; }
        if (sim && !sim.ok) { warn.push(sim.error); sim = null; }
        if (ai && ai.confidence === "rendah") warn.push("Sorotan biru pada laporan AI tidak terbaca utuh, jadi blok ditampilkan sebagai angka dan tidak dipetakan ke kalimat.");
        const r = await analyseDoc(f.buffer, ai && ai.confidence !== "rendah" ? ai : null, cfg);
        const bq = orders.bedahQuote(r.words, cfg), utKey = utIndex(r.map), ranked = rankFindings(r.findings, utKey);
        const openN = Math.max(0, bq.free);
        const open = ranked.slice(0, openN).map((x, i) => ({ n: i + 1, ...describe(x, utKey) }));
        const locked = ranked.slice(openN).map(x => ({ code: x.code, color: COLOR_NAME[x.code], where: "Paragraf " + (x.para_idx + 1), ut: utKey.get(x.para_idx + ":" + x.sent_idx) || null }));
        const by = {}; for (const x of ranked) by[x.code] = (by[x.code] || 0) + 1;
        const id = crypto.randomBytes(16).toString("hex"), rel = `docs/${id}.${isPdfName ? "pdf" : "docx"}`;
        await fsp.writeFile(path.join(root, "data", "private", rel), f.buffer, { mode: 0o600 });
        const saved = { ai: ai && { pct: ai.aiPct, matchedWords: ai.matchedWords, totalWords: ai.totalWords, humanPct: ai.humanPct, blockTable: ai.blockTable, blocks: ai.blocks.map(b => ({ n: b.n, words: b.words })), confidence: ai.confidence }, sim, hits: ai && ai.confidence !== "rendah" ? r.map.hits : [], mapWords: r.map.words };
        await fsp.writeFile(path.join(docsDir, id + ".bedah.json"), JSON.stringify(saved), { mode: 0o600 });
        insert.run(id, rel, name, f.size, crypto.createHash("sha256").update(f.buffer).digest("hex"), JSON.stringify({ kind: "bedah", words: r.words, ai: !!ai, sim: !!sim }), h, now, now + UPLOAD_TTL_MS);
        // data kalibrasi hanya bila mahasiswa memberi izin
        let kode = null;
        if (String((req.body || {}).izin) === "1" && (ai || sim)) {
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
        res.json({ uploadId: id, file: { name, size: f.size }, words: r.words, problem: r.problem, labels: by, totalFindings: ranked.length, quote: bq,
          open, locked, ut: utView(ai, r.map), sim: sim && { pct: sim.pct, grade: sim.grade, matchedSources: sim.matchedSources, sourceTypes: sim.sourceTypes, content: sim.content, excluded: sim.excluded, sources: sim.sources },
          guide: BLOCK_GUIDE, warn, kode, beta: beta() });
      } catch (e) {
        if (e instanceof DocxError) return res.status(422).json({ error: e.message, code: e.code });
        console.error("[bedah] gagal:", e && e.message);
        res.status(500).json({ error: "Dokumen tidak bisa diproses. Coba simpan ulang sebagai .docx lalu unggah lagi." });
      } finally { running--; }
    });
  });

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
      const hitsMap = new Map((c.saved.hits || []).map(h => [h.para_idx + ":" + h.sent_idx, h.block])), ranked = rankFindings(c.r.findings, hitsMap);
      const utSentences = (c.saved.hits || []).map(h => { const p = c.r.a.paragraphs.find(q => q.idx === h.para_idx); const s = p ? splitSentences(p.text)[h.sent_idx] : null; return s ? { block: h.block, where: "Paragraf " + (h.para_idx + 1), text: s } : null; }).filter(Boolean);
      res.json({ title: c.o.title, words: c.r.words, problem: c.r.problem, total: ranked.length, findings: ranked.map((x, i) => ({ n: i + 1, ...describe(x, hitsMap) })),
        ut: c.saved.ai ? { ...c.saved.ai, sentences: utSentences } : null, sim: c.saved.sim || null, guide: BLOCK_GUIDE, deleteAt: c.o.delete_at });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error("[bedah] laporan gagal:", e && e.message); res.status(500).json({ error: "Hasil tidak bisa dibuat. Hubungi admin dengan ID pesananmu." });
    } finally { running--; }
  });
  app.get("/ms/bedah/download/:token", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const now = Date.now();
    if (limited("d:" + hashIp(req.ip), 30, now)) return res.status(429).json({ error: "Terlalu banyak permintaan." });
    try {
      const c = await paidContext(req.params.token, now);
      const ranked = rankFindings(c.r.findings, new Map((c.saved.hits || []).map(h => [h.para_idx + ":" + h.sent_idx, h.block])));
      const rows = ranked.map((x, i) => ({ seq: i + 1, code: x.code, para_idx: x.para_idx, sent_idx: x.sent_idx, text: x.text, reason: x.reason }));
      const pdf = isPdf(c.buf);
      const out = pdf ? await reportDocx({ title: c.o.title, note: "File aslimu PDF, jadi laporan ini berupa daftar temuan. Unggah .docx bila ingin warna langsung di dokumenmu." }, ranked.map((x, i) => ({ n: i + 1, ...describe(x, new Map()) })))
        : await wordtools.buildColored(c.buf, rows);
      res.set({ "Content-Disposition": `attachment; filename="${c.o.id} bedah laporan.docx"` }).type("application/vnd.openxmlformats-officedocument.wordprocessingml.document").send(out);
      orders.event(c.o.id, "bedah_diunduh", null);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      console.error("[bedah] unduh gagal:", e && e.message); res.status(500).json({ error: "File gagal dibuat. Hubungi admin dengan ID pesananmu." });
    }
  });

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
module.exports.cekSet = cekSet;
module.exports.batasAkurasi = batasAkurasi;
module.exports.rankFindings = rankFindings;
