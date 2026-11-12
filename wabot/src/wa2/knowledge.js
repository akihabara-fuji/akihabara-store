// Bahan jualan diambil langsung dari situs (harga & status layanan yang sama dengan yang dilihat pelanggan), jadi tidak pernah basi.
const rp = n => "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export function createSite({ cfg, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  let cache = null;
  const get = async path => { const r = await fetchImpl(cfg.siteUrl + path, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } }); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); };
  async function knowledge() {
    if (cache && now() - cache.t < 5 * 60e3) return cache.text;
    try {
      const [pub, lay] = await Promise.all([get("/ms/public-config"), get("/ms/layanan/config")]);
      const text = build(pub, lay); cache = { t: now(), text }; return text;
    } catch (e) { return cache ? cache.text : null; }
  }
  async function orderStatus(id, wa) {
    try {
      const r = await fetchImpl(cfg.siteUrl + "/ms/internal/bot/order", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + cfg.secret }, body: JSON.stringify({ id, wa }), signal: AbortSignal.timeout(8000) });
      if (r.status === 404) return { found: false };
      if (!r.ok) return null;
      return { found: true, ...(await r.json()) };
    } catch { return null; }
  }
  return { knowledge, orderStatus };
}
export function build(pub, lay) {
  const L = [];
  L.push("LAYANAN YANG SEDANG DIBUKA (data langsung dari situs):");
  const open = Object.entries(lay || {}).filter(([, v]) => !v.closed), closed = Object.entries(lay || {}).filter(([, v]) => v.closed);
  L.push(`1) Cek & Parafrase dan Audit Dokumen (nextaja.com): cek kemiripan/indikasi lalu penyesuaian kalimat. Harga ${rp(pub.price_per_word || 30)} per kata, minimal ${rp(pub.min_order_price || 40000)}${pub.free_words ? `, ${pub.free_words} kata pertama gratis` : ""}.${pub.fast_lane && pub.fast_lane.enabled ? ` Jalur cepat ${rp(pub.fast_lane.price)} (kuota harian ${pub.fast_lane.remaining ?? "?"} tersisa).` : ""}`);
  if (pub.bedah_harga_per_1000 != null) L.push(`2) Bedah Laporan (dikerjakan sendiri oleh pelanggan, ada panduan warna): ${rp(pub.bedah_harga_per_1000)} per 1.000 kata isi di luar jatah gratis.`);
  if (open.length) L.push("3) Layanan Catatan Akademik yang dibuka: " + open.map(([, v]) => `${v.label} ${rp(v.price)}`).join("; ") + ".");
  if (closed.length) L.push("Sedang DITUTUP (jangan ditawarkan; kalau ditanya katakan sedang tidak menerima pesanan): " + closed.map(([, v]) => v.label).join(", ") + ".");
  L.push("Pesan dilakukan lewat situs (nextaja.com untuk Cek & Parafrase, catatanakademik.com untuk layanan lain). Bayar lewat QRIS di halaman pesanan; bukti bayar diunggah di halaman itu, bukan dikirim ke chat.");
  L.push("TIDAK ADA jaminan nilai atau skor Drillbit turun; hasil hanya penunjuk arah dan pelanggan tetap harus mengerjakan dengan teliti.");
  return L.join("\n");
}
