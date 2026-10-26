"use strict";
/* Sampul artikel otomatis (JPEG 1200x630): judul + kategori + merek. Dipakai bila artikel tidak punya foto sampul sendiri.
   Teks digambar lewat sharp/librsvg dengan font Inter yang ikut di repo (public/assets/fonts), jadi hasilnya sama di server mana pun. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FONT_DIR = path.join(__dirname, "public", "assets", "fonts");
let sharp = null, ready = false;

function init(workDir) {
  if (ready) return !!sharp;
  ready = true;
  try {
    fs.mkdirSync(workDir, { recursive: true });
    const conf = path.join(workDir, "fonts.conf");
    fs.writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${FONT_DIR}</dir><cachedir>${path.join(workDir, "fc-cache")}</cachedir></fontconfig>`);
    if (!process.env.FONTCONFIG_FILE) process.env.FONTCONFIG_FILE = conf; // harus ada sebelum teks pertama digambar
    sharp = require("sharp");
  } catch { sharp = null; }
  return !!sharp;
}

const PALETTES = [["#0b1d4a", "#1d4ed8", "#93c5fd"], ["#0b3b3c", "#0d9488", "#99f6e4"], ["#2e1a5e", "#7c3aed", "#ddd6fe"], ["#4a1d0b", "#c2410c", "#fed7aa"]];
const TOPIC_PAL = { study: 0, updateut: 1 };
const xml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* perkiraan lebar teks Inter Bold (satuan em) supaya baris tidak keluar bingkai */
const cw = c => /[A-Z0-9]/.test(c) ? 0.68 : /[mwMW]/.test(c) ? 0.9 : c === " " ? 0.28 : /[il.,:;!'|]/.test(c) ? 0.3 : 0.58;
const width = (t, size) => [...t].reduce((a, c) => a + cw(c), 0) * size;
function wrap(title, size, max) {
  const lines = []; let cur = "";
  for (const w of String(title).split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + " " + w : w;
    if (width(t, size) <= max || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function layout(title) {
  for (const [size, maxLines] of [[78, 3], [66, 3], [58, 4], [50, 4]]) {
    const lines = wrap(title, size, 1040);
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = 50; let lines = wrap(title, size, 1040).slice(0, 4);
  lines[3] = lines[3].replace(/[\s,.;:–-]*\S*$/, "") + "…";
  return { size, lines };
}

function svg({ title, topic, topicLabel, brand, host, seed }) {
  const [c1, c2, soft] = PALETTES[topic in TOPIC_PAL ? TOPIC_PAL[topic] : hash(seed || title) % PALETTES.length];
  const { size, lines } = layout(title);
  const lh = Math.round(size * 1.14), blockH = lines.length * lh;
  const y0 = 330 - blockH / 2 + size * 0.82;
  const tl = String(topicLabel || "").toUpperCase();
  const pillW = Math.round(width(tl, 24) + 52);
  const tspans = lines.map((l, i) => `<text x="80" y="${Math.round(y0 + i * lh)}" font-family="Inter" font-weight="700" font-size="${size}" fill="#ffffff">${xml(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#g)"/>
<circle cx="1090" cy="80" r="260" fill="#ffffff" fill-opacity="0.07"/><circle cx="1180" cy="560" r="190" fill="#ffffff" fill-opacity="0.07"/><circle cx="930" cy="640" r="110" fill="${soft}" fill-opacity="0.16"/>
<rect x="80" y="60" width="${pillW}" height="52" rx="26" fill="#ffffff" fill-opacity="0.18"/>
<text x="${80 + pillW / 2}" y="95" text-anchor="middle" font-family="Inter" font-weight="700" font-size="24" fill="#ffffff" letter-spacing="2">${xml(tl)}</text>
${tspans}
<rect x="80" y="528" width="64" height="6" rx="3" fill="${soft}"/>
<text x="80" y="580" font-family="Inter" font-weight="700" font-size="30" fill="#ffffff">${xml(brand)}</text>
<text x="1120" y="580" text-anchor="end" font-family="Inter" font-weight="700" font-size="24" fill="#ffffff" fill-opacity="0.75">${xml(host)}</text>
</svg>`;
}

async function render(opts) {
  if (!sharp) throw new Error("sharp tidak tersedia");
  return sharp(Buffer.from(svg(opts))).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
const keyOf = o => crypto.createHash("sha1").update([o.title, o.topic, o.brand, o.host].join("|")).digest("hex").slice(0, 10);

module.exports = { init, render, svg, layout, keyOf, available: () => !!sharp };
