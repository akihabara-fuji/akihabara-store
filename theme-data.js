// Tema bersama: sama dengan preset di web/src/lib/themes.js (disalin supaya server tanpa build step).
const T = {
  lavender: { label: "Lavender Glass", bg: "#c9cdf6", surface: "#e4e6fc", ink: "#151a46", muted: "#4a5085", accent: "#3542e0" },
  midnight: { label: "Midnight", bg: "#0a0a0b", surface: "#18181c", ink: "#f2f2f0", muted: "#8e8e96", accent: "#ffffff" },
  violet: { label: "Violet", bg: "#0b0816", surface: "#171226", ink: "#f1edfb", muted: "#a59cc0", accent: "#a78bfa" },
  ocean: { label: "Ocean", bg: "#06111e", surface: "#0d1d30", ink: "#e8f3fc", muted: "#8ba6bf", accent: "#38bdf8" },
  sunset: { label: "Sunset", bg: "#0e0907", surface: "#1b1310", ink: "#f8eee8", muted: "#a8968c", accent: "#ff6a2b" },
  emerald: { label: "Emerald", bg: "#05110c", surface: "#0c1d15", ink: "#e9f7ef", muted: "#8db3a0", accent: "#34d399" },
  rose: { label: "Rose", bg: "#fff1f3", surface: "#ffffff", ink: "#3b0a1a", muted: "#8a4a5c", accent: "#e11d48" },
  mint: { label: "Mint Glass", bg: "#c8efe0", surface: "#e2f7ef", ink: "#073b2c", muted: "#3f7563", accent: "#0f9d74" },
  peach: { label: "Peach", bg: "#ffdcc8", surface: "#ffeee3", ink: "#4a1d0c", muted: "#8a5a45", accent: "#e8561f" },
  gold: { label: "Noir Gold", bg: "#0b0a07", surface: "#17140d", ink: "#f5eedc", muted: "#a89c7c", accent: "#e8b64a" },
  sky: { label: "Sky", bg: "#cfe6ff", surface: "#e6f1ff", ink: "#0c2547", muted: "#43638c", accent: "#1a6fe0" },
  zinc: { label: "Zinc", bg: "#09090b", surface: "#141417", ink: "#fafafa", muted: "#a1a1aa", accent: "#fafafa" }
};
const PRESETS = T;
const FONTS = {
  anton: { label: "Anton", fam: '"Anton","Impact",sans-serif' },
  bebas: { label: "Bebas Neue", fam: '"Bebas Neue","Impact",sans-serif' },
  archivo: { label: "Archivo lebar", fam: '"Archivo","Arial Black",sans-serif' },
  syne: { label: "Syne", fam: '"Syne",sans-serif' },
  grotesk: { label: "Space Grotesk", fam: '"Space Grotesk",sans-serif' },
  playfair: { label: "Playfair", fam: '"Playfair Display",Georgia,serif' },
  bricolage: { label: "Bricolage", fam: '"Bricolage Grotesque","Plus Jakarta Sans",sans-serif' }
};
const FONT_URL = "https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Syne:wght@800&family=Space+Grotesk:wght@700&family=Playfair+Display:wght@800&family=Archivo:wdth,wght@62..125,400..900&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
const HEX = /^#[0-9a-fA-F]{6}$/;

function lum(h) {
  const n = parseInt(h.slice(1), 16);
  const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = x => Math.round(((pa >> x) & 255) * (1 - t) + ((pb >> x) & 255) * t);
  return "#" + [16, 8, 0].map(x => r(x).toString(16).padStart(2, "0")).join("");
}
// themeCfg = site.theme {preset, custom{background,foreground,card,primary,...}}
function colorsFor(themeCfg) {
  const base = T[themeCfg && themeCfg.preset] || T.lavender, c = { ...base }, u = (themeCfg && themeCfg.custom) || {};
  if (HEX.test(u.background)) c.bg = u.background;
  if (HEX.test(u.card)) c.surface = u.card;
  if (HEX.test(u.foreground)) c.ink = u.foreground;
  if (HEX.test(u.primary)) c.accent = u.primary;
  if (HEX.test(u.mutedForeground)) c.muted = u.mutedForeground;
  if (HEX.test(u.muted)) c.surface = HEX.test(u.card) ? u.card : u.muted;
  return c;
}
function tokens(c) {
  const dark = lum(c.bg) < .2;
  return {
    bg: c.bg, surface: c.surface, surface2: mix(c.surface, c.ink, .06),
    line: dark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)",
    ink: c.ink, muted: c.muted, accent: c.accent,
    "on-accent": lum(c.accent) > .45 ? "#0a0a0b" : "#ffffff",
    warn: dark ? "#f2b45c" : "#a8560c", scheme: dark ? "dark" : "light"
  };
}
const GFONT = /^[A-Za-z0-9][A-Za-z0-9 ]{1,38}$/;
module.exports = { GFONT, PRESETS, FONTS, FONT_URL, tokens, colorsFor };
