/* Isi HTML halaman Kelas Tuton, Komunitas, Kegiatan, Portofolio, Bedah teks. Dibangun di server dari data/konten.json
   (dibaca lewat app.locals.konten) lalu dibungkus shell.html oleh pages.js. Tautan memakai /ruangakademikut/..., diperpendek oleh shorten(). */
"use strict";
const fs = require("fs");
const path = require("path");
const GRAD = { Sosial: "linear-gradient(135deg,#d9d2ff,#b9a9ff)", Kebersamaan: "linear-gradient(135deg,#c9efe8,#8fd6c8)", Akademik: "linear-gradient(135deg,#ffe3c2,#ffc27a)" };
const DISC = "Catatan Akademik adalah situs informasi independen dan bukan situs resmi Universitas Terbuka.";
const jsonIn = o => JSON.stringify(o).replace(/</g, "\\u003c");

module.exports = function build(app) {
  const K = () => app.locals.konten;
  const ytBox = (id, label) => id
    ? `<button type="button" class="yt" data-id="${id}" aria-label="Putar video: ${K().E(label)}"><span class="yt-p"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="yt-t">${K().E(label)}</span><span class="yt-s">Klik untuk memuat video dari YouTube</span></button>`
    : `<div class="yt yt-ph" role="img" aria-label="Video belum tersedia"><span class="yt-p"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span><span class="yt-t">${K().E(label)}</span><span class="yt-s">Video segera hadir</span></div>`;

  function testimoni(dasar) {
    const E = K().E; let items = []; try { items = typeof app.locals.ulasanPublic === "function" ? app.locals.ulasanPublic().filter(x => x.teks && x.tgl).slice(0, 3) : []; } catch { items = []; }
    const body = items.length
      ? `<div class="kt-tm">${items.map(x => `<figure><blockquote>${E(x.teks)}</blockquote><figcaption>${E(x.nama)}${x.ket ? " · " + E(x.ket) : ""} · ${E(K().bln(x.tgl))}</figcaption></figure>`).join("")}</div>`
      : `<p class="kt-empty">Menunggu cerita proses belajarmu.</p>`;
    return `<section class="kt-sec"><h2>Kata teman belajar</h2>${body}</section>`;
  }

  const BAN = `<aside class="kt-ban" role="note"><span>Pembaruan: layanan jasa sudah ditutup. Catatan Akademik kini platform edukasi mandiri untuk belajar memakai AI dengan etis.</span><a href="/grup?dari=pembaruan">Ikuti kabar di grup WhatsApp</a></aside>`;
  function pustaka(k) {
    const E = k.E, items = [];
    k.D.KEYS.forEach(id => { const j = k.jenisOf(id); if (j.prompt) items.push({ j: id, label: j.label, t: "Uji kerangka " + j.label.toLowerCase(), p: j.prompt }); });
    k.materiPub().forEach(m => { if (m.prompt) items.push({ j: m.jenis, label: k.D.J[m.jenis].label, t: m.judul, p: m.prompt }); });
    const bold = t => E(t).replace(/\[[^\]]+\]/g, x => "<b>" + x + "</b>");
    const idx = k.D.KEYS;
    const chips = `<button type="button" data-j="" class="on">Semua</button>` + idx.map(id => `<button type="button" data-j="${id}">${E(k.D.J[id].label)}</button>`).join("");
    const cards = items.map((x, i) => `<article class="pp-card pp-c${idx.indexOf(x.j) % 5}" data-j="${x.j}"><span class="pp-tag">${E(x.label)}</span><h3>${E(x.t)}</h3><div class="pp-pr" id="pp-${i}"><pre>${E(x.p)}</pre><div class="pp-show">${bold(x.p)}</div></div><button type="button" class="kt-b pp-cp" data-copy="pp-${i}">Salin Prompt</button></article>`).join("");
    return `<section class="kt-sec" id="pustaka"><h2>Pustaka Prompt</h2><p class="muted">Template untuk Gemini. Isi bagian yang <b>[ditandai]</b>. AI menguji idemu, kamu yang menulis.</p><div class="kt-chips pp-chips" id="ppChips" role="group" aria-label="Kategori prompt">${chips}</div><div class="pp-grid" id="ppGrid">${cards || '<p class="kt-empty">Template prompt akan tampil di sini.</p>'}</div></section>`;
  }

  /* ---------- Kelas Tuton ---------- */
  function tuton(req) {
    const k = K(), E = k.E, cur = k.D.KEYS.includes(String(req.query.j)) ? String(req.query.j) : "diskusi";
    const tabs = k.D.KEYS.map(id => `<button type="button" role="tab" data-j="${id}" aria-selected="${id === cur}" class="${id === cur ? "on" : ""}">${E(k.D.J[id].label)}</button>`).join("");
    const panels = k.D.KEYS.map(id => {
      const j = k.jenisOf(id);
      const steps = j.steps.map((s, i) => `<li><span class="n">${i + 1}</span><span><b>${E(s.t)}</b>${s.d ? `<small>${E(s.d)}</small>` : ""}${s.video ? `<button type="button" class="yt-mini" data-id="${s.video}">▶ Tonton video langkah ${i + 1}</button>` : ""}</span></li>`).join("");
      return `<section class="kt-panel card ${id === cur ? "on" : ""}" id="p-${id}" data-j="${id}" role="tabpanel" aria-label="${E(j.label)}">
<div class="kt-ph"><h2>${E(j.title)}</h2><p>${E(j.desc)}</p></div>
<div class="kt-grid">${ytBox(j.video, "Video: alur " + j.label.toLowerCase())}<ol class="kt-steps">${steps}</ol></div>
<div class="kt-act"><a class="kt-b" href="${E(j.panduan || "#materi")}" data-materi="${id}">Buka panduan lengkap →</a><button type="button" class="kt-b2" data-prompt="${id}" aria-expanded="false">Template prompt Gemini</button></div>
<div class="kt-prompt" id="pr-${id}" hidden><div class="kt-pt">Template prompt: uji kerangka</div><pre>${E(j.prompt)}</pre><button type="button" class="kt-copy" data-copy="pr-${id}">Salin prompt</button><p class="muted">AI membantumu memahami dan menguji ide. Isi jawaban, pengecekan sumber, dan kalimat akhir tetap di tanganmu. Ketentuan UT dan tutor selalu jadi acuan.</p></div>
<details class="kt-more"><summary>Checklist sebelum kirim dan lanjut belajar</summary><div class="kt-two"><div><h3>Checklist sebelum kirim</h3><ul class="kt-ck">${j.check.map(c => `<li><label><input type="checkbox"> ${E(c)}</label></li>`).join("")}</ul></div><div><h3>Lanjut belajar</h3><ul class="kt-ln">${j.links.map(l => `<li><a href="${E(l.u)}"><span>${E(l.t)}</span><small>${E(l.k || "")}</small></a></li>`).join("")}</ul></div></div></details>
</section>`;
    }).join("");
    const mat = k.materiPub().map(k.matView).map(m => ({ id: m.id, j: m.jenis, t: m.tahap, ju: m.judul, mk: m.mk, v: !!m.video, at: m.at, hit: m.hit }));
    const body = `<main class="wrap kt">
${BAN}<section class="kt-hd"><h1>Kelas Tuton</h1><p>Belajar tuton UT dengan langkah yang jelas. Pilih jenisnya, semua ada di bawah.</p></section>
<div class="kt-tabs" role="tablist" aria-label="Pilih jenis tuton">${tabs}</div>
${panels}
<section class="kt-sec" id="materi"><h2>Cari materi</h2>
<div class="kt-find"><input type="search" id="ktQ" placeholder="Cari judul atau kata kunci" aria-label="Cari materi"><div class="kt-chips" id="ktChips" role="group" aria-label="Tahap belajar">${["Semua tahap"].concat(k.D.TAHAP).map((c, i) => `<button type="button" data-t="${i ? E(c) : ""}" class="${i ? "" : "on"}">${E(c)}</button>`).join("")}</div></div>
<div class="kt-list" id="ktList" aria-live="polite"></div><div class="kt-pg"><span id="ktCount"></span><span id="ktPg"></span></div>
<div class="kt-two kt-tp"><div><h3>Terbaru</h3><ul id="ktNew" class="kt-ln"></ul></div><div><h3>Populer</h3><ul id="ktPop" class="kt-ln"></ul></div></div>
<script type="application/json" id="ktData">${jsonIn(mat)}</script>
<script type="application/json" id="ktJ">${jsonIn(k.D.KEYS.map(id => ({ id, label: k.D.J[id].label })))}</script></section>
${pustaka(k)}
${testimoni()}
<p class="kt-dis">${E(DISC)} Konten bersifat edukasi dan tidak menggantikan ketentuan resmi UT.</p></main><script src="/ruangakademikut/assets/konten.js?v=2" defer></script>`;
    return { title: "Kelas Tuton: belajar diskusi, tugas, makalah, jurnal, metopen UT", desc: "Kelas Tuton: lima langkah, video, dan template prompt Gemini untuk diskusi, tugas, makalah, jurnal, dan metopen UT. Situs independen, bukan situs resmi UT.", canon: "/ruangakademikut/tutorial-online", body };
  }

  function materi(id) {
    const k = K(), E = k.E, m = k.materiPub().find(x => x.id === id); if (!m) return null;
    const v = k.matView(m), j = k.D.J[v.jenis];
    const body = `<main class="wrap kt"><nav class="kt-bc" aria-label="Breadcrumb"><a href="/ruangakademikut/tutorial-online?j=${v.jenis}">Kelas Tuton</a> › <a href="/ruangakademikut/tutorial-online?j=${v.jenis}">${E(j.label)}</a></nav>
<section class="kt-hd"><h1>${E(v.judul)}</h1><p>${E(v.ringkas)}</p><div class="kt-badges"><span>${E(j.label)}</span><span>${E(v.tahap)}</span>${v.mk ? `<span>${E(v.mk)}</span>` : ""}</div></section>
<section class="kt-panel card on">${ytBox(v.video, "Video: " + v.judul)}
${v.langkah.length ? `<ol class="kt-steps" style="margin-top:20px">${v.langkah.map((s, i) => `<li><span class="n">${i + 1}</span><span><b>${E(s)}</b></span></li>`).join("")}</ol>` : ""}
${v.prompt ? `<div class="kt-prompt" id="pr-m"><div class="kt-pt">Template prompt Gemini</div><pre>${E(v.prompt)}</pre><button type="button" class="kt-copy" data-copy="pr-m">Salin prompt</button></div>` : ""}
${v.check.length ? `<h3>Checklist sebelum kirim</h3><ul class="kt-ck">${v.check.map(c => `<li><label><input type="checkbox"> ${E(c)}</label></li>`).join("")}</ul>` : ""}
<p class="muted"><b>Sumber:</b> ${E(v.sumber)}</p></section>
<p class="kt-dis">${E(DISC)}</p></main><script src="/ruangakademikut/assets/konten.js?v=2" defer></script>`;
    return { title: v.judul + " | Kelas Tuton", desc: v.ringkas || (v.judul + ": panduan Kelas Tuton."), canon: "/ruangakademikut/tutorial-online/materi/" + v.id, body };
  }

  /* ---------- Komunitas ---------- */
  function komunitas() {
    const k = K(), E = k.E, all = k.kegList().map(k.kegPub);
    const done = all.filter(x => x.status === "selesai").sort((a, b) => b.tanggal.localeCompare(a.tanggal)), plan = all.filter(x => x.status === "rencana");
    const card = x => `<a class="km-card" data-k="${E(x.kat)}" href="/ruangakademikut/kegiatan/${E(x.slug)}"><div class="km-cv" style="${x.cover ? `background-image:url('${E(x.cover)}')` : "background:" + GRAD[x.kat]}"><span>${E(x.kat)}</span></div><div class="km-b"><div class="km-m">${E(k.tgl(x.tanggal))}${x.tempat ? " · " + E(x.tempat) : ""}</div><div class="km-t">${E(x.judul)}</div>${x.peserta || x.foto.length ? `<div class="km-m">${x.peserta ? x.peserta + " peserta" : ""}${x.peserta && x.foto.length ? " · " : ""}${x.foto.length ? x.foto.length + " foto" : ""}</div>` : ""}</div></a>`;
    const tabs = ["Semua"].concat(k.KAT).map((l, i) => `<button type="button" data-k="${i ? l : ""}" class="${i ? "" : "on"}">${l}</button>`).join("");
    const body = `<main class="wrap kt">${BAN}<section class="kt-hd"><h1>Komunitas</h1><p>Jurnal kegiatan kami: sosial, kebersamaan, dan acara kuliah. Semua dengan dokumentasi.</p></section>
<div class="kt-tabs" id="kmTabs" role="group" aria-label="Saring kegiatan">${tabs}</div>
<section class="km-grid" id="kmGrid">${done.length ? done.map(card).join("") : '<p class="kt-empty">Belum ada kegiatan yang dipublikasikan. Kegiatan yang sudah dilaksanakan akan tampil di sini beserta dokumentasinya.</p>'}</section>
<section class="kt-sec"><h2>Akan datang</h2>${plan.length ? plan.map(x => `<div class="km-plan"><div><span class="km-tag">Rencana</span><div class="km-t">${E(x.judul)}</div><div class="km-m">${x.tanggal ? E(k.tgl(x.tanggal)) : "Tanggal belum ditentukan"}${x.tempat ? " · " + E(x.tempat) : ""}</div></div><a class="kt-b2" href="/grup?dari=komunitas">Ikuti kabar</a></div>`).join("") : `<div class="km-plan"><div><span class="km-tag">Rencana</span><div class="km-t">Belum ada rencana kegiatan yang diumumkan.</div></div><a class="kt-b2" href="/grup?dari=komunitas">Ikuti kabar</a></div>`}</section>
<p class="kt-dis">${E(DISC)} Kegiatan komunitas diselenggarakan secara mandiri.</p></main><script src="/ruangakademikut/assets/konten.js?v=2" defer></script>`;
    return { title: "Komunitas: jurnal kegiatan sosial, kebersamaan, dan akademik", desc: "Jurnal kegiatan komunitas Catatan Akademik: sosial, kebersamaan, dan acara kuliah, lengkap dengan dokumentasi dan laporan dana. Situs independen, bukan situs resmi UT.", canon: "/ruangakademikut/komunitas", body };
  }

  function kegiatan(slug) {
    const k = K(), E = k.E, x0 = k.kegList().find(x => x.slug === slug); if (!x0) return null;
    const x = k.kegPub(x0), s = x.sum;
    const gal = x.foto.slice(0, 8).map((u, i) => `<a href="${E(u)}" target="_blank" rel="noopener"><img src="${E(u)}" alt="Dokumentasi ${E(x.judul)}, foto ${i + 1}" loading="lazy"></a>`).join("");
    const dana = x.dana ? (x.transaksi.length ? `<section class="kt-sec kd-wrap"><h2>Laporan dana</h2>
<div class="kd-kpi"><div><small>Dana masuk</small><b>${E(k.rp(s.masuk))}</b><span>dari ${s.nMasuk} pemasukan</span></div><div><small>Dana keluar</small><b>${E(k.rp(s.keluar))}</b><span>${s.nKeluar} transaksi, ${x.transaksi.filter(t => t.tipe === "keluar" && t.bukti).length} dengan bukti</span></div><div><small>Sisa dana</small><b>${E(k.rp(s.sisa))}</b>${x.rencanaSisa ? `<span>${E(x.rencanaSisa)}</span>` : ""}</div></div>
<div class="kd-row"><div class="kd-card"><h3>Dana terpakai</h3><div class="kd-ring" id="kdRing"></div></div><div class="kd-card"><h3>Dipakai untuk apa</h3><div class="kd-don"><div id="kdDon"></div><ul id="kdLeg"></ul></div></div></div>
<div class="kd-card"><h3>Dana masuk per minggu</h3><div class="kd-bars" id="kdBars" role="img" aria-label="Dana masuk per minggu"></div></div>
<div class="kd-card"><h3>Rincian transaksi</h3><div class="kd-tw"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th><th>Bukti</th></tr></thead><tbody>${x.transaksi.map(t => `<tr><td>${E(k.tgl(t.tgl))}</td><td>${E(t.ket)}</td><td>${E(t.kategori)}</td><td class="${t.tipe}">${t.tipe === "masuk" ? "+" : "−"} ${E(k.rp(t.jumlah))}</td><td>${t.bukti ? `<a href="${E(t.bukti)}" target="_blank" rel="noopener">Lihat</a>` : "–"}</td></tr>`).join("")}</tbody></table></div><p class="muted">Laporan diperbarui ${E(k.tgl(s.upd))}. Ringkasan dihitung otomatis dari rincian di atas.</p></div>
<script type="application/json" id="kdData">${jsonIn({ masuk: s.masuk, keluar: s.keluar, per: s.per, wk: s.wk })}</script></section>` : `<section class="kt-sec"><h2>Laporan dana</h2><p class="kt-empty">Laporan dana kegiatan ini sedang disiapkan.</p></section>`) : "";
    const body = `<main class="wrap kt"><nav class="kt-bc"><a href="/ruangakademikut/komunitas">Komunitas</a> › ${E(x.kat)}</nav>
<section class="kt-hd"><h1>${E(x.judul)}</h1><div class="kt-badges"><span class="${x.status === "selesai" ? "ok" : ""}">${x.status === "selesai" ? "Sudah dilaksanakan" : "Rencana"}</span><span>${E(x.kat)}</span></div></section>
${x.cover ? `<div class="kg-cover"><img src="${E(x.cover)}" alt="Foto sampul ${E(x.judul)}"></div>` : ""}
<section class="kg-meta"><div><small>Tanggal</small><b>${x.tanggal ? E(k.tgl(x.tanggal)) : "Belum ditentukan"}</b></div><div><small>Tempat</small><b>${E(x.tempat || "–")}</b></div><div><small>Peserta</small><b>${x.peserta || "–"}</b></div><div><small>Peran</small><b>${E(x.peran || "–")}</b></div></section>
${x.cerita ? `<section class="kt-sec"><h2>Ceritanya</h2>${x.cerita.split(/\n{2,}/).map(p => `<p>${E(p)}</p>`).join("")}</section>` : ""}
${dana}
${gal || x.video ? `<section class="kt-sec"><h2>Dokumentasi</h2>${gal ? `<div class="kg-gal">${gal}</div>` : ""}${x.video ? ytBox(x.video, "Video kegiatan") : ""}</section>` : ""}
${x.terima ? `<section class="kt-sec"><h2>Terima kasih</h2><p>${E(x.terima)}</p></section>` : ""}
<p class="kt-dis">${E(DISC)}</p></main><script src="/ruangakademikut/assets/konten.js?v=2" defer></script>`;
    return { title: x.judul + " | Komunitas", desc: (x.cerita || x.judul).slice(0, 150), canon: "/ruangakademikut/kegiatan/" + x.slug, body };
  }

  /* ---------- Portofolio (tentang) ---------- */
  function tentang() {
    const k = K(), E = k.E, db = k.db(), all = k.kegList().map(k.kegPub), done = all.filter(x => x.status === "selesai");
    const real = { materi: k.materiPub().length, video: k.materiPub().filter(m => m.video).length + k.D.KEYS.filter(id => k.jenisOf(id).video).length, keg: done.length, peserta: done.reduce((n, x) => n + x.peserta, 0) };
    const hasReal = real.materi + real.video + real.keg + real.peserta > 0;
    const stats = hasReal ? [["Materi terbit", real.materi], ["Video edukasi", real.video], ["Kegiatan komunitas", real.keg], ["Peserta kegiatan", real.peserta]] : [["Materi terbit", 24], ["Video edukasi", 12], ["Kegiatan komunitas", 6], ["Peserta kegiatan", 180]];
    const pf = k.profil();
    const per = pf.perjalanan.length ? pf.perjalanan : [{ bulan: "[bulan, tahun]", judul: "[Pencapaian nyata 1]", ket: "[Satu kalimat apa yang dilakukan dan buktinya]", status: "selesai", ph: 1 }, { bulan: "Sekarang", judul: "[Proyek yang sedang berjalan]", ket: "[Kelas Tuton, materi yang sedang disusun]", status: "jalan", ph: 1 }, { bulan: "[perkiraan waktu]", judul: "[Rencana kegiatan]", ket: "[Belum dilaksanakan, ditandai sebagai rencana]", status: "rencana", ph: 1 }];
    const ST = { selesai: "Sudah dilakukan", jalan: "Sedang berjalan", rencana: "Rencana" };
    const myth = [["AI selalu benar, jadi tinggal salin saja.", "AI bisa keliru atau mengarang. Selalu cek ke modul atau jurnal, dan pastikan kamu paham isinya."], ["Pakai AI berarti tidak perlu belajar lagi.", "AI membantu memahami dan menguji ide. Yang belajar dan memutuskan isi jawaban tetap kamu."], ["Hasil AI boleh langsung dikirim sebagai tugas.", "Tulis dengan bahasamu, cantumkan sumber, dan ikuti aturan akademik UT dan tutor."]];
    const recent = done.slice(0, 3);
    const vids = pf.video;
    let old = ""; try { old = fs.readFileSync(path.join(__dirname, "pages", "tentang-kebijakan.html"), "utf8"); } catch {}
    const body = `<div class="pf">
<section class="pf-hero"><i class="pf-b1"></i><i class="pf-b2"></i><div class="wrap"><span class="pf-tag rise"><i class="pf-dot"></i>Inisiatif independen mahasiswa UT</span><h1 class="rise">Belajar lebih cerdas.<br>Berkembang bersama AI.</h1><p class="rise">Saya Dika Priyadi, mahasiswa Manajemen Universitas Terbuka. Saya membangun ruang belajar yang membantu mahasiswa memahami tuton dan memakai AI secara kritis, etis, dan bertanggung jawab.</p><div class="rise pf-cta"><a class="kt-b" href="#dampak">Lihat dampaknya</a><a class="kt-b2" href="/ruangakademikut/tutorial-online">Coba Kelas Tuton →</a></div></div></section>
<div class="pf-marq" aria-hidden="true"><div>${Array(2).fill(["Literasi AI", "Kelas Tuton", "Google Gemini", "Komunitas", "Integritas akademik", "Belajar mandiri"].map(t => `<span>${t}</span><span>•</span>`).join("")).join("")}</div></div>
<main class="wrap kt">
<section class="kt-sec rv" id="dampak"><div class="pf-h"><h2>Dampak, apa adanya</h2><span class="pf-note">${hasReal ? "Dihitung otomatis dari data situs" : "Angka ilustrasi: nanti terisi otomatis dari data asli"}</span></div><div class="pf-stats">${stats.map(([l, v]) => `<div class="pf-st"><b data-n="${v}">${v}</b><span>${l}</span></div>`).join("")}</div></section>
<section class="kt-sec rv"><h2>Tiga hal yang saya kerjakan</h2><div class="pf-3"><a href="/ruangakademikut/tutorial-online"><i></i><b>Kelas Tuton</b><span>Cara mengerjakan diskusi, tugas, makalah, jurnal, dan metopen dengan langkah yang jelas.</span><em>Buka kelas →</em></a><a href="/ruangakademikut/bedah-data-ut"><i></i><b>AI untuk belajar</b><span>Memakai Gemini sebagai teman belajar: kritis, transparan, dan tetap jujur secara akademik.</span><em>Pelajari →</em></a><a href="/ruangakademikut/komunitas"><i></i><b>Komunitas</b><span>Kegiatan sosial, kebersamaan, dan acara kuliah yang terdokumentasi dan transparan.</span><em>Lihat kegiatan →</em></a></div></section>
<section class="kt-sec rv"><h2>Mitos atau fakta? Ketuk kartunya</h2><div class="pf-flip">${myth.map(([m, f]) => `<button type="button" aria-pressed="false"><span class="fl"><span class="fr"><em>Mitos</em><b>${E(m)}</b><small>Ketuk untuk lihat faktanya</small></span><span class="bk"><em>Fakta</em><b>${E(f)}</b></span></span></button>`).join("")}</div></section>
<section class="kt-sec rv"><h2>Perjalanan</h2><div class="pf-lg"><span class="s1">Sudah dilakukan</span><span class="s2">Sedang berjalan</span><span class="s3">Rencana</span></div><div class="pf-tl">${per.map(x => `<div class="${x.status}"><i></i><small>${E(x.bulan)}${x.status === "rencana" && !x.ph ? " · Rencana" : ""}</small><b>${E(x.judul)}</b><span>${E(x.ket)}</span>${x.ph ? '<em class="pf-ph">ilustrasi, isi dari admin</em>' : ""}</div>`).join("")}</div></section>
<section class="kt-sec rv"><div class="pf-h"><h2>Kegiatan dan karya</h2><a href="/ruangakademikut/komunitas">Semua kegiatan →</a></div>${recent.length ? `<div class="pf-kg">${recent.map(x => `<a href="/ruangakademikut/kegiatan/${E(x.slug)}"><i style="${x.cover ? `background-image:url('${E(x.cover)}')` : "background:" + GRAD[x.kat]}"></i><span><small>${E(x.kat)} · ${E(k.tgl(x.tanggal))}</small><b>${E(x.judul)}</b></span></a>`).join("")}</div>` : '<p class="kt-empty">Kegiatan yang sudah dilaksanakan akan tampil di sini.</p>'}${vids.length ? `<div class="pf-vd">${vids.map(v => `<button type="button" class="yt-mini" data-id="${v.id}">▶ ${E(v.t)}</button>`).join("")}</div>` : ""}</section>
${testimoni()}
<section class="kt-sec rv pf-honest"><h2>Status, dengan jujur</h2><p>Ini inisiatif independen. Belum ada penunjukan atau afiliasi resmi dengan Universitas Terbuka maupun Google. Semua kegiatan dan angka di halaman ini bersumber dari dokumentasi yang bisa ditunjukkan.</p></section>
<section class="kt-sec rv pf-end"><h2>Mau belajar bareng atau berkolaborasi?</h2><p>Mulai dari Kelas Tuton, ikut kegiatan komunitas, atau simpan portofolio lengkap.</p><div class="pf-cta"><a class="kt-b" href="/ruangakademikut/tutorial-online">Buka Kelas Tuton</a><button type="button" class="kt-b2" id="pfPdf">${pf.unduh ? "" : "Simpan halaman ini sebagai PDF"}</button>${pf.unduh ? `<a class="kt-b2" href="${E(pf.unduh)}">Unduh portofolio (PDF)</a>` : ""}</div></section>
${old ? `<details class="kt-more pf-pol"><summary>Kebijakan editorial dan batasan layanan</summary>${old}<p class="muted"><a href="/ms/privasi">Kebijakan Privasi</a> · <a href="/ms/ketentuan">Ketentuan Layanan</a></p></details>` : ""}
<p class="kt-dis">${E(DISC)}</p></main></div><script src="/ruangakademikut/assets/konten.js?v=2" defer></script>`;
    return { title: "Tentang dan Portofolio | Catatan Akademik", desc: "Portofolio Catatan Akademik: inisiatif belajar independen mahasiswa UT tentang tuton, literasi AI, dan komunitas. Bukan situs resmi UT.", canon: "/ruangakademikut/tentang", body };
  }

  /* ---------- Bedah teks (alat baru) ---------- */
  function bedahTeks(cfg) {
    const E = K().E;
    const body = `<main class="wrap kt bt" data-mb="${cfg.mb}" data-hal="${cfg.hal}">
${BAN}<nav class="kt-bc">Alat UT › Bedah Data UT</nav><section class="kt-hd"><h1>Bedah Data UT</h1><p>Periksa tulisanmu sendiri kalimat demi kalimat. Alat ini menandai, kamu yang memperbaiki.</p></section>
<ol class="bt-steps" aria-label="Langkah"><li class="on" data-s="1"><span>1</span>Masukkan tulisan</li><li data-s="2"><span>2</span>Diproses</li><li data-s="3"><span>3</span>Hasil</li></ol>
<section class="card bt-in" id="btIn"><h2>1. Masukkan tulisanmu</h2><p class="muted">Untuk jawaban tugas, makalah, atau jurnal. Salin teksnya, atau pilih file.</p>
<label for="btTx" class="bt-l">SALIN TEKS</label><textarea id="btTx" placeholder="Tempel tulisanmu di sini" rows="8"></textarea>
<div class="bt-or"><span></span>atau<span></span></div>
<div class="bt-l">PILIH FILE</div><div class="bt-drop" id="btDrop"><p>Seret file ke sini, atau pilih file</p><small>Format: .docx atau .pdf · maksimal ${cfg.mb} MB · ${cfg.hal} halaman</small><input type="file" id="btFile" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden><button type="button" class="kt-b2" id="btPick">Pilih file</button><div id="btFn" class="muted"></div></div>
<div class="bt-ex"><button type="button" class="kt-b2" id="btEx">Coba dengan Teks Contoh</button></div>
<label class="bt-ck"><input type="checkbox" id="btCk"> <span>Saya setuju untuk menjadikan hasil ini sebagai bahan evaluasi dan tidak menyalin-tempel ke e-Learning UT.</span></label>
<div class="bt-go"><button type="button" class="kt-b" id="btGo" disabled>Bedah dengan Gemini</button><span class="muted">Teks dan file kamu hanya diproses sementara dan tidak disimpan di server kami. Teks dikirim ke layanan AI Gemini untuk dianalisis.</span></div>
<p class="bt-err" id="btErr" role="alert" hidden></p></section>
<section class="card" id="btWait" hidden><h2>Gemini sedang membaca kalimat satu per satu</h2><div class="bt-sweep"><i></i></div><p class="muted">Memeriksa panjang kalimat, tanda koma, transisi, dan kekuatan argumen</p></section>
<section id="btOut" hidden>
<div class="bt-lg" aria-label="Arti tanda"><span class="lA"><b>A</b> terlalu pendek/seragam</span><span class="lB"><b>B</b> koma berlebihan</span><span class="lC"><b>C</b> transisi generik</span><span class="lD"><b>D</b> argumen kurang kuat</span></div>
<div class="bt-badge" id="btBadge" hidden>Penulis Gigih: kamu sudah memperbaiki kalimatmu sendiri.</div>
<div class="card bt-sum"><div><b>Berwarna = masih perlu diperbaiki. Hitam = sudah beres.</b><div><b id="btDone">0</b> dari <b id="btTot">0</b> kalimat sudah beres</div></div><div class="bt-bar"><i id="btBar"></i></div><div class="bt-filter" id="btFil"></div></div>
<div class="bt-cols"><div class="card"><div class="bt-ch"><span>TULISAN KAMU</span><small>Ketuk kalimat berwarna</small></div><div id="btText" class="bt-text"></div></div>
<aside class="card bt-side"><div class="bt-ch"><span>REKOMENDASI GEMINI</span></div><div id="btFb" aria-live="polite"></div><div id="btSel"><p class="muted" id="btNoSel">Ketuk kalimat berwarna di sebelah kiri. Di sini muncul kalimatmu, alasannya, dan saran perbaikannya.</p>
<div id="btDet" hidden><span class="bt-lbl" id="btLbl"></span><div class="bt-q"><small>KALIMAT KAMU</small><p id="btQ"></p></div><p><b>Kenapa ditandai:</b> <span id="btWhy"></span></p><p><b>Yang bisa kamu lakukan:</b> <span id="btTip"></span></p><label for="btRw" class="bt-l">TULIS VERSIMU SENDIRI</label><textarea id="btRw" rows="3" placeholder="Tulis ulang kalimat ini dengan kata-katamu"></textarea><button type="button" class="kt-b" id="btRe">Cek kalimat ini lagi</button><p class="muted">Alat ini tidak menulis ulang untukmu. Kalau versimu sudah baik, tandanya hilang dan kalimat jadi hitam.</p></div></div><p class="muted" id="btAll" hidden>Semua tanda sudah beres. Sekarang baca ulang sekali lagi dengan suaramu sendiri.</p>
<p class="muted bt-disc">Penandaan ini alat bantu belajar, bukan jaminan skor detektor apa pun.</p></aside></div>
<button type="button" class="kt-b2" id="btReset">Mulai dari awal</button></section>
<p class="kt-dis">${E(DISC)}</p></main><script src="/ruangakademikut/assets/bedah-teks.js?v=2" defer></script>`;
    return { title: "Bedah Data UT: periksa tulisanmu kalimat demi kalimat | Catatan Akademik", desc: "Alat bantu belajar: Gemini menandai kalimat yang terlalu pendek, koma berlebihan, transisi generik, dan argumen kurang kuat. Kamu yang memperbaiki. Bukan jaminan skor detektor.", canon: "/ruangakademikut/bedah-data-ut", body };
  }
  return { tuton, materi, komunitas, kegiatan, tentang, bedahTeks };
};
