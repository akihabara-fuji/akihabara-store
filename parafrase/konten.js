/* Konten Kelas Tuton, Komunitas (kegiatan + laporan dana), profil portofolio, CTA artikel.
   Satu berkas data/konten.json; publik hanya membaca yang berstatus terbit. Admin: /ms/admin/ca/konten/*. */
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const D = require("./konten-default");

const E = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
const bad = (status, error) => Object.assign(new Error(error), { status });
const rid = () => crypto.randomBytes(5).toString("hex");
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tgl = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || "")); return m ? `${+m[3]} ${BULAN[+m[2] - 1] || ""} ${m[1]}` : ""; };
const bln = s => { const m = /^(\d{4})-(\d{2})/.exec(String(s || "")); return m ? `${BULAN[+m[2] - 1] || ""} ${m[1]}` : ""; };
const rp = n => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const KAT = ["Sosial", "Kebersamaan", "Akademik"];
const slugify = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "kegiatan";
/* ID YouTube (11 karakter) dari tautan watch, youtu.be, embed, atau shorts. Selain itu ditolak. */
function ytId(v) {
  const s = String(v || "").trim(); if (!s) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s); const h = u.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") { const id = u.pathname.slice(1, 12); return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ""; }
    if (h === "youtube.com" || h === "youtube-nocookie.com") {
      const id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/) || [])[1] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
    }
  } catch {}
  return "";
}
const mediaUrl = v => { const s = String(v || "").trim(); return /^\/uploads\/[a-z0-9][a-z0-9._-]*\.(?:webp|jpe?g|png|avif|gif)$/i.test(s) ? s : ""; };
const lines = (v, n, m) => (Array.isArray(v) ? v : String(v || "").split(/\r?\n/)).map(x => clip(x, n)).filter(Boolean).slice(0, m);

module.exports = function mountKonten({ app, express, root, requireAdmin, getBlogPosts }) {
  const file = path.join(root, "data", "konten.json");
  let db = { jenis: {}, materi: [], kegiatan: [], cta: {}, profil: {} };
  try { const j = JSON.parse(fs.readFileSync(file, "utf8")); if (j && typeof j === "object") db = Object.assign(db, j); } catch {}
  let chain = Promise.resolve();
  const save = () => (chain = chain.then(() => fsp.mkdir(path.dirname(file), { recursive: true }).then(() => fsp.writeFile(file + ".tmp", JSON.stringify(db, null, 1))).then(() => fsp.rename(file + ".tmp", file))));
  const J = express.json({ limit: "400kb" });
  const send = fn => async (req, res) => { res.set("Cache-Control", "no-store"); try { res.json(await fn(req, res)); } catch (e) { if (!e.status) console.error("[konten]", e); res.status(e.status || 500).json({ error: e.status ? e.message : "Gagal memproses." }); } };

  /* ---------- Kelas Tuton ---------- */
  const jenisOf = k => {
    const d = D.J[k], o = db.jenis[k] || {};
    return { id: k, label: d.label, title: o.title || d.title, desc: o.desc || d.desc, video: ytId(o.video), panduan: String(o.panduan || ""),
      steps: (o.steps && o.steps.length ? o.steps : d.steps.map(s => ({ t: s[0], d: s[1], video: "" }))).map(s => ({ t: s.t, d: s.d || "", video: ytId(s.video) })),
      prompt: o.prompt || d.prompt, check: o.check && o.check.length ? o.check : d.check, links: o.links && o.links.length ? o.links : d.links.map(l => ({ t: l[0], u: l[1], k: l[2] })) };
  };
  const materiPub = () => db.materi.filter(m => m.status === "terbit").sort((a, b) => b.at - a.at);
  const matView = m => ({ id: m.id, judul: m.judul, jenis: m.jenis, tahap: m.tahap, mk: m.mk || "", ringkas: m.ringkas || "", video: ytId(m.video), langkah: m.langkah || [], prompt: m.prompt || "", check: m.check || [], sumber: m.sumber || "", at: m.at, hit: m.hit || 0 });

  app.get("/ms/admin/ca/konten/tuton", requireAdmin, send(() => ({ tahap: D.TAHAP, jenis: D.KEYS.map(jenisOf), materi: db.materi.slice().sort((a, b) => b.at - a.at).map(m => Object.assign(matView(m), { status: m.status, videoRaw: m.video || "" })), defaults: D.J })));
  app.put("/ms/admin/ca/konten/tuton/jenis/:id", requireAdmin, J, send(async req => {
    const k = String(req.params.id); if (!D.J[k]) throw bad(404, "Jenis tidak ditemukan.");
    const b = req.body || {}; const v = b.video ? ytId(b.video) : "";
    if (b.video && !v) throw bad(400, "Tautan YouTube tidak dikenali.");
    const steps = (Array.isArray(b.steps) ? b.steps : []).slice(0, 12).map(s => { const sv = s.video ? ytId(s.video) : ""; if (s.video && !sv) throw bad(400, "Tautan YouTube di salah satu langkah tidak dikenali."); return { t: clip(s.t, 120), d: clip(s.d, 400), video: sv }; }).filter(s => s.t);
    const links = (Array.isArray(b.links) ? b.links : []).slice(0, 8).map(l => ({ t: clip(l.t, 100), u: clip(l.u, 300), k: clip(l.k, 30) })).filter(l => l.t && /^(\/|https:\/\/)/.test(l.u));
    db.jenis[k] = { title: clip(b.title, 120), desc: clip(b.desc, 400), video: v, panduan: /^(\/|https:\/\/)/.test(String(b.panduan || "")) ? clip(b.panduan, 300) : "", steps, prompt: clip(b.prompt, 2000), check: lines(b.check, 160, 14), links };
    await save(); return { ok: true };
  }));
  app.post("/ms/admin/ca/konten/tuton/materi", requireAdmin, J, send(async req => {
    const b = req.body || {}; const judul = clip(b.judul, 140);
    if (!judul) throw bad(400, "Judul materi wajib diisi.");
    if (!D.J[b.jenis]) throw bad(400, "Pilih jenis materi."); if (!D.TAHAP.includes(b.tahap)) throw bad(400, "Pilih tahap materi.");
    const v = b.video ? ytId(b.video) : ""; if (b.video && !v) throw bad(400, "Tautan YouTube tidak dikenali.");
    const status = b.status === "terbit" ? "terbit" : "draf"; const sumber = clip(b.sumber, 600);
    if (status === "terbit" && !sumber) throw bad(400, "Sumber wajib diisi sebelum terbit (modul atau jurnal yang dirujuk).");
    let m = b.id ? db.materi.find(x => x.id === String(b.id)) : null; if (b.id && !m) throw bad(404, "Materi tidak ditemukan.");
    if (!m) { m = { id: rid(), hit: 0 }; db.materi.push(m); }
    Object.assign(m, { judul, jenis: b.jenis, tahap: b.tahap, mk: clip(b.mk, 100), ringkas: clip(b.ringkas, 240), video: v, langkah: (Array.isArray(b.langkah) ? b.langkah : []).map(x => clip(x, 200)).filter(Boolean).slice(0, 12), prompt: clip(b.prompt, 2000), check: lines(b.check, 160, 14), sumber, status, at: Date.now() });
    await save(); return { ok: true, id: m.id };
  }));
  app.delete("/ms/admin/ca/konten/tuton/materi/:id", requireAdmin, send(async req => {
    const m = db.materi.find(x => x.id === String(req.params.id)); if (!m) throw bad(404, "Materi tidak ditemukan.");
    db.materi = db.materi.filter(x => x !== m); await save(); return { ok: true };
  }));

  /* ---------- CTA di akhir artikel blog ---------- */
  const KW = [["diskusi", /diskusi/i], ["tugas", /tugas/i], ["makalah", /makalah/i], ["jurnal", /jurnal/i], ["metopen", /metopen|metodologi penelitian/i]];
  const ctaOf = (slug, title) => {
    if (Object.prototype.hasOwnProperty.call(db.cta, slug)) return db.cta[slug] || "";
    const hit = KW.find(([, re]) => re.test(slug) || re.test(title || "")); return hit ? hit[0] : "";
  };
  app.locals.ktaCta = (slug, title) => {
    const k = ctaOf(slug, title); if (!k || !D.J[k]) return "";
    const j = D.J[k];
    return `<style>.ax-cta{margin:26px 0;padding:20px 22px;border:1px solid var(--border,#e3ddf7);border-radius:16px;background:var(--surface,#fff)}.ax-cta h2{margin:0 0 6px;font-size:19px}.ax-cta p{margin:0 0 14px;color:var(--muted,#5a5578);line-height:1.6}.ax-cta-b{display:inline-flex;align-items:center;min-height:46px;padding:0 20px;border-radius:12px;background:#4a2fd6;color:#fff!important;font-weight:700;text-decoration:none}.ax-cta-b:hover{background:#3720ad}</style><aside class="ax-cta" aria-labelledby="axCtaH"><h2 id="axCtaH">Belajar langkah demi langkah: ${E(j.label)}</h2><p>Lima langkah, video, dan template prompt Gemini untuk ${E(j.label.toLowerCase())}. Kamu yang menulis, AI hanya teman belajar.</p><a class="ax-cta-b" href="/ruangakademikut/tutorial-online?j=${k}">Buka Kelas Tuton: ${E(j.label)}</a></aside>`;
  };
  app.get("/ms/admin/ca/konten/artikel", requireAdmin, send(() => ({ jenis: D.KEYS.map(k => ({ id: k, label: D.J[k].label })), items: (getBlogPosts ? getBlogPosts() : []).map(p => ({ slug: p.slug, title: p.title, status: p.status, cta: ctaOf(p.slug, p.title), manual: Object.prototype.hasOwnProperty.call(db.cta, p.slug) })) })));
  app.put("/ms/admin/ca/konten/artikel", requireAdmin, J, send(async req => {
    const slug = clip((req.body || {}).slug, 200), j = String((req.body || {}).cta || "");
    if (!slug || (j && !D.J[j])) throw bad(400, "Data tidak valid.");
    db.cta[slug] = j; await save(); return { ok: true };
  }));

  /* ---------- Komunitas ---------- */
  const totals = k => {
    const tr = k.transaksi || [], masuk = tr.filter(t => t.tipe === "masuk"), keluar = tr.filter(t => t.tipe === "keluar");
    const sum = a => a.reduce((n, t) => n + t.jumlah, 0);
    const per = {}; keluar.forEach(t => { per[t.kategori || "Lainnya"] = (per[t.kategori || "Lainnya"] || 0) + t.jumlah; });
    const days = tr.map(t => Date.parse(t.tgl + "T00:00:00Z")).filter(Number.isFinite);
    const d0 = days.length ? Math.min(...days) : 0; const weeks = [];
    masuk.forEach(t => { const w = Math.floor((Date.parse(t.tgl + "T00:00:00Z") - d0) / (7 * 864e5)); weeks[w] = (weeks[w] || 0) + t.jumlah; });
    const wk = []; for (let i = 0; i < Math.min(weeks.length, 26); i++) wk.push(weeks[i] || 0);
    const upd = tr.map(t => t.tgl).sort().pop() || "";
    return { masuk: sum(masuk), keluar: sum(keluar), sisa: sum(masuk) - sum(keluar), nMasuk: masuk.length, nKeluar: keluar.length, per, wk, upd };
  };
  const kegPub = k => ({ id: k.id, slug: k.slug, judul: k.judul, kat: k.kat, status: k.status, tanggal: k.tanggal, tempat: k.tempat, peserta: k.peserta, peran: k.peran, cerita: k.cerita, cover: k.cover, foto: k.foto || [], video: ytId(k.video), terima: k.terima, dana: !!k.dana, rencanaSisa: k.rencanaSisa || "", transaksi: (k.transaksi || []).slice().sort((a, b) => a.tgl < b.tgl ? -1 : 1), sum: totals(k) });
  const kegList = () => db.kegiatan.filter(k => k.tampil !== false);
  app.get("/ms/admin/ca/konten/komunitas", requireAdmin, send(() => ({ kat: KAT, items: db.kegiatan.slice().sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || "")).map(k => Object.assign(kegPub(k), { tampil: k.tampil !== false })) })));
  app.post("/ms/admin/ca/konten/komunitas", requireAdmin, J, send(async req => {
    const b = req.body || {}, judul = clip(b.judul, 140); if (!judul) throw bad(400, "Judul kegiatan wajib diisi.");
    if (!KAT.includes(b.kat)) throw bad(400, "Pilih kategori."); const status = b.status === "rencana" ? "rencana" : "selesai";
    const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(b.tanggal || "") ? b.tanggal : ""; if (status === "selesai" && !tanggal) throw bad(400, "Isi tanggal kegiatan (YYYY-MM-DD).");
    let k = b.id ? db.kegiatan.find(x => x.id === String(b.id)) : null; if (b.id && !k) throw bad(404, "Kegiatan tidak ditemukan.");
    if (!k) { k = { id: rid(), transaksi: [] }; db.kegiatan.push(k); }
    let slug = k.slug || slugify(judul), n = 2; while (db.kegiatan.some(x => x !== k && x.slug === slug)) slug = slugify(judul) + "-" + n++;
    const foto = (Array.isArray(b.foto) ? b.foto : String(b.foto || "").split(/\r?\n/)).map(mediaUrl).filter(Boolean).slice(0, 24);
    const video = b.video ? ytId(b.video) : ""; if (b.video && !video) throw bad(400, "Tautan YouTube tidak dikenali.");
    Object.assign(k, { slug, judul, kat: b.kat, status, tanggal, tempat: clip(b.tempat, 120), peserta: Math.max(0, Math.min(1e6, parseInt(b.peserta, 10) || 0)), peran: clip(b.peran, 120), cerita: clip(b.cerita, 6000), cover: mediaUrl(b.cover), foto, video, terima: clip(b.terima, 1200), dana: !!b.dana, rencanaSisa: clip(b.rencanaSisa, 240), tampil: b.tampil !== false });
    await save(); return { ok: true, id: k.id };
  }));
  app.delete("/ms/admin/ca/konten/komunitas/:id", requireAdmin, send(async req => {
    const k = db.kegiatan.find(x => x.id === String(req.params.id)); if (!k) throw bad(404, "Kegiatan tidak ditemukan.");
    db.kegiatan = db.kegiatan.filter(x => x !== k); await save(); return { ok: true };
  }));
  app.post("/ms/admin/ca/konten/komunitas/:id/transaksi", requireAdmin, J, send(async req => {
    const k = db.kegiatan.find(x => x.id === String(req.params.id)); if (!k) throw bad(404, "Kegiatan tidak ditemukan.");
    const b = req.body || {}, jumlah = Math.round(Number(b.jumlah));
    if (!(b.tipe === "masuk" || b.tipe === "keluar")) throw bad(400, "Pilih dana masuk atau keluar.");
    if (!Number.isFinite(jumlah) || jumlah <= 0 || jumlah > 1e12) throw bad(400, "Jumlah harus lebih dari nol.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.tgl || "")) throw bad(400, "Isi tanggal transaksi (YYYY-MM-DD).");
    const ket = clip(b.ket, 160); if (!ket) throw bad(400, "Keterangan wajib diisi.");
    let t = b.tid ? (k.transaksi || []).find(x => x.id === String(b.tid)) : null; if (!t) { t = { id: rid() }; (k.transaksi = k.transaksi || []).push(t); }
    Object.assign(t, { tipe: b.tipe, tgl: b.tgl, ket, kategori: b.tipe === "keluar" ? clip(b.kategori, 40) || "Lainnya" : "Masuk", jumlah, bukti: mediaUrl(b.bukti) });
    await save(); return { ok: true };
  }));
  app.delete("/ms/admin/ca/konten/komunitas/:id/transaksi/:tid", requireAdmin, send(async req => {
    const k = db.kegiatan.find(x => x.id === String(req.params.id)); if (!k) throw bad(404, "Kegiatan tidak ditemukan.");
    k.transaksi = (k.transaksi || []).filter(t => t.id !== String(req.params.tid)); await save(); return { ok: true };
  }));

  /* ---------- Profil portofolio ---------- */
  const profil = () => ({ perjalanan: (db.profil.perjalanan || []).slice(0, 12), video: (db.profil.video || []).slice(0, 6), unduh: db.profil.unduh || "" });
  app.get("/ms/admin/ca/konten/profil", requireAdmin, send(() => profil()));
  app.put("/ms/admin/ca/konten/profil", requireAdmin, J, send(async req => {
    const b = req.body || {};
    db.profil = {
      perjalanan: (Array.isArray(b.perjalanan) ? b.perjalanan : []).slice(0, 12).map(x => ({ bulan: clip(x.bulan, 40), judul: clip(x.judul, 120), ket: clip(x.ket, 240), status: ["selesai", "jalan", "rencana"].includes(x.status) ? x.status : "selesai" })).filter(x => x.judul),
      video: (Array.isArray(b.video) ? b.video : []).slice(0, 6).map(x => ({ t: clip(x.t, 100), id: ytId(x.id) })).filter(x => x.t && x.id), unduh: /^(\/|https:\/\/)/.test(String(b.unduh || "")) ? clip(b.unduh, 300) : ""
    };
    await save(); return { ok: true };
  }));

  /* ---------- Pemakaian media (untuk blokir hapus dan Ganti) ---------- */
  function usageOf(url) {
    const out = [], has = s => String(s || "").includes(url);
    db.kegiatan.forEach(k => { if (k.cover === url || (k.foto || []).includes(url) || (k.transaksi || []).some(t => t.bukti === url)) out.push({ title: "Komunitas: " + k.judul, slug: "komunitas/" + k.slug }); });
    return out;
  }
  app.locals.kontenUsage = usageOf;
  /* Gambar yang diganti isinya (alamat sama): jangan di-cache lama oleh browser */
  app.locals.mediaReplaced = f => !!(db.replaced && db.replaced[f]);
  app.locals.mediaMarkReplaced = async f => { db.replaced = db.replaced || {}; db.replaced[f] = Date.now(); await save(); };
  app.locals.konten = { E, tgl, bln, rp, KAT, D, ytId, jenisOf, materiPub, matView, kegPub, kegList, profil, db: () => db, hit: async id => { const m = db.materi.find(x => x.id === id); if (m) { m.hit = (m.hit || 0) + 1; await save(); } } };
};
module.exports.ytId = ytId;
