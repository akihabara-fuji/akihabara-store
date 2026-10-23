/* Cek dan Parafrase Mandiri: modul mandiri. Dipasang dari server.js dengan satu baris:
     require("./parafrase")({ app, express, requireAdmin, ROOT });
   Tidak mengubah rute atau data yang sudah ada. */
"use strict";
const path = require("path");
const { open } = require("./db");
const crypto = require("crypto");
const fs = require("fs");
const { create } = require("./settings");
const mountUploads = require("./uploads");
const mountCards = require("./cards");
const mountSiteImg = require("./siteimg");
const mountUlasan = require("./ulasan");
const mountPages = require("./pages");
const createTexts = require("./sitetexts");
const mountAudit = require("./audit");
const mountLayanan = require("./layanan");
const mountOrders = require("./orders");
const createNotifier = require("./notify");

module.exports = function mount(ctx) {
  const { app, express, requireAdmin, ROOT, sameOrigin } = ctx;
  const db = ctx.db || open(process.env.PARAFRASE_DB || path.join(ROOT, "data", "parafrase.db"));
  const settings = create(db);

  /* Publik: hanya harga, minimum, jalur cepat, dan kontak. Cache pendek agar perubahan admin cepat terlihat. */
  app.get("/ms/public-config", (req, res) => {
    res.set("Cache-Control", "public, max-age=10");
    res.json(settings.publicConfig());
  });

  /* Admin: lihat dan ubah pengaturan, riwayat perubahan. requireAdmin sudah memeriksa sesi dan asal permintaan. */
  app.get("/ms/admin/parafrase/settings", requireAdmin, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ values: settings.getAll(), log: settings.log(30), fastLane: settings.publicConfig().fast_lane });
  });
  app.put("/ms/admin/parafrase/settings", requireAdmin, express.json({ limit: "8kb" }), (req, res) => {
    try {
      const values = settings.set(req.body && req.body.values, (req.admin && req.admin.name) || "admin");
      res.json({ ok: true, values });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });

  /* Rahasia untuk meng-hash IP (tidak menyimpan IP mentah). Disimpan di data/private. */
  const secretFile = path.join(ROOT, "data", "private", ".parafrase-secret");
  let secret = ""; try { secret = fs.readFileSync(secretFile, "utf8").trim(); } catch {}
  if (secret.length < 32) { fs.mkdirSync(path.dirname(secretFile), { recursive: true }); secret = crypto.randomBytes(32).toString("hex"); fs.writeFileSync(secretFile, secret, { mode: 0o600 }); }

  const texts = createTexts({ db, dir: path.join(__dirname, "pages") });
  const pages = mountPages({ app, express, texts, settings });
  mountCards({ app, root: ROOT, requireAdmin });
  mountSiteImg({ app, root: ROOT, requireAdmin });
  mountUlasan({ app, root: ROOT, requireAdmin });
  /* Pelacak: GA4 langsung, atau GTM bila diisi (GTM yang memuat GA4, supaya tidak dihitung dua kali). ID diatur dari admin. */
  app.get("/t.js", (req, res) => {
    const c = settings.getAll(), G = c.ga_id || "", T = c.gtm_id || "";
    res.set({ "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300" });
    res.send(`(function(){var G=${JSON.stringify(G)},T=${JSON.stringify(T)};if(!G&&!T)return;window.dataLayer=window.dataLayer||[];
function ld(u){var s=document.createElement("script");s.async=true;s.src=u;document.head.appendChild(s)}
function gtag(){dataLayer.push(arguments)}
if(T){dataLayer.push({"gtm.start":Date.now(),event:"gtm.js"});ld("https://www.googletagmanager.com/gtm.js?id="+T)}
else{gtag("js",new Date());gtag("config",G,{anonymize_ip:true});ld("https://www.googletagmanager.com/gtag/js?id="+G)}
function ev(n,p){p=p||{};p.page_path=location.pathname;if(T)dataLayer.push(Object.assign({event:n},p));else gtag("event",n,p)}
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";
if(/wa\\.me\\//.test(h))ev("click_whatsapp",{link_url:h.split("?")[0]});
else if(/\\/(?:ruangakademikut\\/)?(layanan|cek-parafrase-mandiri|audit)(?:[\\/?#]|$)/.test(h))ev("klik_layanan",{link_url:h})},true);})();`);
  });
  /* Verifikasi Google Search Console lewat berkas HTML: admin cukup menempel nama berkas di Pengaturan. */
  app.get(/^\/(google[a-z0-9]{8,40}\.html)$/, (req, res) => {
    const want = settings.get("google_verify_file");
    if (!want || want !== req.params[0]) return res.status(404).end();
    res.type("text/html").send("google-site-verification: " + want);
  });
  const uploads = mountUploads({ app, db, settings, root: ROOT, sameOrigin: sameOrigin || (() => true), secret });
  const notifier = createNotifier({ db, settings });
  const orders = mountOrders({ app, express, db, settings, notifier, root: ROOT, sameOrigin: sameOrigin || (() => true), requireAdmin, secret });
  mountAudit({ app, express, db, settings, orders, root: ROOT, sameOrigin: sameOrigin || (() => true), secret });
  mountLayanan({ app, express, db, settings, orders, root: ROOT, sameOrigin: sameOrigin || (() => true), secret, requireAdmin });
  const t = setInterval(() => { uploads.purgeExpired().catch(() => {}); orders.expireUnpaid().catch(() => {}); orders.sweepRetention().catch(() => {}); }, 10 * 60 * 1000); t.unref();
  const t2 = setInterval(() => notifier.flush().catch(() => {}), 30 * 1000); t2.unref();

  return { db, settings, uploads, orders, notifier, texts, pages };
};
