// Preset tema gaya shadcn/21st.dev. Tiap tema = token warna + warna aurora + gradasi judul.
export const THEMES = {
  lavender: { label: "Lavender Glass", dark: false,
    background: "#c9cdf6", foreground: "#151a46", card: "#ffffff", cardForeground: "#151a46",
    primary: "#3542e0", primaryForeground: "#ffffff", muted: "#e4e6fc", mutedForeground: "#4a5085",
    border: "#ffffff", glow: "#6b75ea", headFrom: "#ffffff", headTo: "#6b75ea",
    aurora: ["#aab2f2", "#e4e6fc", "#8f98f0", "#c6b8ff", "#9fb4ff"], glassAlpha: .5 },
  midnight: { label: "Midnight", dark: true,
    background: "#0a0a0b", foreground: "#f2f2f0", card: "#18181c", cardForeground: "#f2f2f0",
    primary: "#ffffff", primaryForeground: "#0a0a0b", muted: "#1f1f25", mutedForeground: "#8e8e96",
    border: "#2a2a31", glow: "#ff7a3d", headFrom: "#ffffff", headTo: "#77777f",
    aurora: ["#3a2433", "#b24a26", "#141827", "#e07a35", "#2a1712"], glassAlpha: .55 },
  violet: { label: "Violet", dark: true,
    background: "#0b0816", foreground: "#f1edfb", card: "#171226", cardForeground: "#f1edfb",
    primary: "#a78bfa", primaryForeground: "#120c24", muted: "#1e1733", mutedForeground: "#a59cc0",
    border: "#2c2348", glow: "#a78bfa", headFrom: "#ffffff", headTo: "#a78bfa",
    aurora: ["#4c1d95", "#7c3aed", "#2e1065", "#c084fc", "#6d28d9"], glassAlpha: .5 },
  ocean: { label: "Ocean", dark: true,
    background: "#06111e", foreground: "#e8f3fc", card: "#0d1d30", cardForeground: "#e8f3fc",
    primary: "#38bdf8", primaryForeground: "#04121f", muted: "#112539", mutedForeground: "#8ba6bf",
    border: "#1b3550", glow: "#38bdf8", headFrom: "#ffffff", headTo: "#38bdf8",
    aurora: ["#0c4a6e", "#0284c7", "#082f49", "#22d3ee", "#1e40af"], glassAlpha: .5 },
  sunset: { label: "Sunset", dark: true,
    background: "#0e0907", foreground: "#f8eee8", card: "#1b1310", cardForeground: "#f8eee8",
    primary: "#ff6a2b", primaryForeground: "#ffffff", muted: "#241914", mutedForeground: "#a8968c",
    border: "#36251d", glow: "#ff2d6f", headFrom: "#fff3ea", headTo: "#ff6a2b",
    aurora: ["#7c2d12", "#ea580c", "#9f1239", "#f97316", "#be123c"], glassAlpha: .5 },
  emerald: { label: "Emerald", dark: true,
    background: "#05110c", foreground: "#e9f7ef", card: "#0c1d15", cardForeground: "#e9f7ef",
    primary: "#34d399", primaryForeground: "#04130c", muted: "#11271c", mutedForeground: "#8db3a0",
    border: "#1b3a2b", glow: "#34d399", headFrom: "#ffffff", headTo: "#34d399",
    aurora: ["#064e3b", "#059669", "#022c22", "#2dd4bf", "#047857"], glassAlpha: .5 },
  rose: { label: "Rose", dark: false,
    background: "#fff1f3", foreground: "#3b0a1a", card: "#ffffff", cardForeground: "#3b0a1a",
    primary: "#e11d48", primaryForeground: "#ffffff", muted: "#ffe4ea", mutedForeground: "#8a4a5c",
    border: "#ffffff", glow: "#fb7185", headFrom: "#ffffff", headTo: "#e11d48",
    aurora: ["#fecdd3", "#fda4af", "#fbcfe8", "#fecaca", "#f9a8d4"], glassAlpha: .55 },
  mint: { label: "Mint Glass", dark: false,
    background: "#c8efe0", foreground: "#073b2c", card: "#ffffff", cardForeground: "#073b2c",
    primary: "#0f9d74", primaryForeground: "#ffffff", muted: "#e2f7ef", mutedForeground: "#3f7563",
    border: "#ffffff", glow: "#34d3a0", headFrom: "#ffffff", headTo: "#19b88a",
    aurora: ["#9fe3c9", "#e2f7ef", "#7fd8b8", "#b8f0d8", "#a5eed8"], glassAlpha: .5 },
  peach: { label: "Peach", dark: false,
    background: "#ffdcc8", foreground: "#4a1d0c", card: "#ffffff", cardForeground: "#4a1d0c",
    primary: "#e8561f", primaryForeground: "#ffffff", muted: "#ffeee3", mutedForeground: "#8a5a45",
    border: "#ffffff", glow: "#ff8a5c", headFrom: "#ffffff", headTo: "#f26a35",
    aurora: ["#ffc2a3", "#fff0e6", "#ffad87", "#ffd2ba", "#ff9d78"], glassAlpha: .5 },
  gold: { label: "Noir Gold", dark: true,
    background: "#0b0a07", foreground: "#f5eedc", card: "#17140d", cardForeground: "#f5eedc",
    primary: "#e8b64a", primaryForeground: "#0b0a07", muted: "#1f1b11", mutedForeground: "#a89c7c",
    border: "#332c19", glow: "#e8b64a", headFrom: "#fff4d6", headTo: "#e8b64a",
    aurora: ["#4a3a12", "#8a6a1c", "#2a210b", "#c99a30", "#3a2d0e"], glassAlpha: .55 },
  sky: { label: "Sky", dark: false,
    background: "#cfe6ff", foreground: "#0c2547", card: "#ffffff", cardForeground: "#0c2547",
    primary: "#1a6fe0", primaryForeground: "#ffffff", muted: "#e6f1ff", mutedForeground: "#43638c",
    border: "#ffffff", glow: "#5aa4ff", headFrom: "#ffffff", headTo: "#3d8bf0",
    aurora: ["#a9d0ff", "#e6f1ff", "#8bbfff", "#c2dcff", "#9cc8ff"], glassAlpha: .5 },
  zinc: { label: "Zinc", dark: true,
    background: "#09090b", foreground: "#fafafa", card: "#141417", cardForeground: "#fafafa",
    primary: "#fafafa", primaryForeground: "#09090b", muted: "#1c1c20", mutedForeground: "#a1a1aa",
    border: "#27272a", glow: "#a1a1aa", headFrom: "#fafafa", headTo: "#52525b",
    aurora: ["#18181b", "#3f3f46", "#27272a", "#52525b", "#18181b"], glassAlpha: .6 }
};

export const FONTS = {
  anton: { label: "Anton (seperti video)", family: "'Anton', Impact, sans-serif", weight: 400, stretch: "normal", tracking: "0.005em", leading: 0.86 },
  bebas: { label: "Bebas Neue", family: "'Bebas Neue', Impact, sans-serif", weight: 400, stretch: "normal", tracking: "0.01em", leading: 0.88 },
  archivo: { label: "Archivo lebar", family: "'Archivo Variable', 'Arial Black', sans-serif", weight: 900, stretch: "125%", tracking: "-0.01em", leading: 0.9 },
  bricolage: { label: "Bricolage modern", family: "'Bricolage Grotesque Variable', sans-serif", weight: 800, stretch: "normal", tracking: "-0.035em", leading: 0.92 },
  syne: { label: "Syne artistik", family: "'Syne Variable', sans-serif", weight: 800, stretch: "normal", tracking: "-0.02em", leading: 0.92 },
  grotesk: { label: "Space Grotesk", family: "'Space Grotesk Variable', sans-serif", weight: 700, stretch: "normal", tracking: "-0.03em", leading: 0.92 },
  playfair: { label: "Playfair klasik", family: "'Playfair Display Variable', Georgia, serif", weight: 800, stretch: "normal", tracking: "-0.02em", leading: 0.95 }
};

export const BODY_FONTS = {
  jakarta: { label: "Plus Jakarta Sans", family: "'Plus Jakarta Sans Variable', system-ui, sans-serif" },
  inter: { label: "Inter", family: "'Inter Variable', system-ui, sans-serif" },
  dm: { label: "DM Sans", family: "'DM Sans Variable', system-ui, sans-serif" }
};

// Nama font Google Fonts buatan sendiri: hanya huruf, angka, spasi (aman untuk CSS).
export const GFONT_RE = /^[A-Za-z0-9][A-Za-z0-9 ]{1,38}$/;

// Warna yang boleh diganti manual dari admin.
export const CUSTOM_KEYS = [
  ["background", "Background"], ["foreground", "Teks"], ["card", "Kartu kaca"],
  ["primary", "Tombol & aksen"], ["primaryForeground", "Teks tombol"], ["muted", "Latar lembut"], ["mutedForeground", "Teks redup"],
  ["border", "Garis kartu"], ["headFrom", "Judul (atas)"], ["headTo", "Judul (bawah)"], ["glow", "Cahaya"]
];

const HEX = /^#[0-9a-f]{6}$/i;
const rgb = h => { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255} ${n >> 8 & 255} ${n & 255}`; };
const lum = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };

const hexToN = h => parseInt(h.slice(1), 16);
const mixHex = (a, b, t) => { const pa = hexToN(a), pb = hexToN(b); const r = x => Math.round(((pa >> x) & 255) * (1 - t) + ((pb >> x) & 255) * t); return "#" + [16, 8, 0].map(x => r(x).toString(16).padStart(2, "0")).join(""); };

export function resolveTheme(themeCfg, visitorPreset) {
  const key = visitorPreset && THEMES[visitorPreset] ? visitorPreset : (THEMES[themeCfg?.preset] ? themeCfg.preset : "lavender");
  const t = { ...THEMES[key] }, custom = {};
  if (!visitorPreset && themeCfg?.custom) for (const [k, v] of Object.entries(themeCfg.custom)) if (HEX.test(v || "") && k in t) { t[k] = v; custom[k] = v; }
  t.dark = lum(t.background) < .2;
  if (!custom.primaryForeground) t.primaryForeground = lum(t.primary) > .45 ? "#0a0a0b" : "#ffffff";
  // warna aurora ikut berubah kalau background/aksen diganti manual
  if (custom.background || custom.primary || custom.glow) {
    const bg = t.background, p = t.primary, g = t.glow, f = t.foreground;
    t.aurora = [mixHex(bg, p, .45), mixHex(bg, p, .2), mixHex(bg, g, .5), mixHex(bg, p, .7), mixHex(bg, f, .12)];
  }
  return { key, ...t };
}

export function applyTheme(themeCfg, visitorPreset, el = document.documentElement) {
  const t = resolveTheme(themeCfg, visitorPreset);
  let f = FONTS[themeCfg?.font] || FONTS.anton;
  const cf = themeCfg?.fontCustom;
  if (cf && GFONT_RE.test(cf.name || "")) {
    f = { family: `'${cf.name}', sans-serif`, weight: [400, 700, 900].includes(+cf.weight) ? +cf.weight : 700, stretch: "normal", tracking: "-0.01em", leading: 0.92 };
    loadGoogleFont(cf.name, f.weight);
  }
  const bf = BODY_FONTS[themeCfg?.bodyFont] || BODY_FONTS.jakarta;
  const v = {
    background: t.background, foreground: t.foreground, card: t.card, "card-foreground": t.cardForeground,
    primary: t.primary, "primary-foreground": t.primaryForeground, muted: t.muted, "muted-foreground": t.mutedForeground,
    border: t.border, ring: t.primary, glow: t.glow, "head-from": t.headFrom, "head-to": t.headTo
  };
  for (const [k, val] of Object.entries(v)) el.style.setProperty(`--${k}`, rgb(val));
  t.aurora.forEach((c, i) => el.style.setProperty(`--aurora-${i + 1}`, c));
  el.style.setProperty("--glass", String(t.glassAlpha));
  el.style.setProperty("--radius", `${Math.max(0, Math.min(40, +themeCfg?.radius || 22))}px`);
  el.style.setProperty("--font-display", f.family);
  el.style.setProperty("--font-body", bf.family);
  el.style.setProperty("--display-weight", f.weight);
  el.style.setProperty("--display-stretch", f.stretch);
  el.style.setProperty("--display-tracking", f.tracking);
  el.style.setProperty("--display-leading", f.leading);
  el.style.colorScheme = t.dark ? "dark" : "light";
  el.dataset.dark = t.dark ? "1" : "0";
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t.background;
  return t;
}

function loadGoogleFont(name, weight) {
  const id = "gf-" + name.replace(/ /g, "-") + "-" + weight;
  if (document.getElementById(id)) return;
  const l = document.createElement("link"); l.id = id; l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@${weight}&display=swap`;
  document.head.appendChild(l);
}
