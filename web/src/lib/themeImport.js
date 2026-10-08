// Baca kode tema yang ditempel: CSS variabel shadcn/21st.dev/tweakcn (hex, hsl, oklch, "222 47% 11%"), atau JSON.
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const toHex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(clamp(v) * 255).toString(16).padStart(2, "0")).join("");

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0), f(8), f(4));
}
function oklchToHex(L, C, H) {
  const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  const g = v => { v = clamp(v); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
  return toHex(g(lin[0]), g(lin[1]), g(lin[2]));
}
const num = (t, pctScale = 1) => { t = String(t).trim(); return t.endsWith("%") ? parseFloat(t) / 100 * pctScale : parseFloat(t); };

export function parseColor(raw) {
  if (raw == null) return null;
  let v = String(raw).trim().replace(/!important$/i, "").trim();
  if (!v || /var\(|calc\(|currentcolor|transparent/i.test(v)) return null;
  let m;
  if ((m = v.match(/^#([0-9a-f]{3})$/i))) return "#" + [...m[1]].map(c => c + c).join("").toLowerCase();
  if ((m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i))) return "#" + m[1].toLowerCase();
  if ((m = v.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/i))) { const c = x => x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x) / 255; return toHex(c(m[1]), c(m[2]), c(m[3])); }
  if ((m = v.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i))) return hslToHex(+m[1], +m[2] / 100, +m[3] / 100);
  if ((m = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+|none)(?:deg)?/i))) return oklchToHex(num(m[1]), num(m[2], 0.4), m[3] === "none" ? 0 : +m[3]);
  // gaya shadcn lama: "222.2 84% 4.9%" (opsional "/ alpha")
  if ((m = v.match(/^([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*\/.*)?$/))) return hslToHex(+m[1], +m[2] / 100, +m[3] / 100);
  return null;
}

// nama variabel CSS -> kunci tema kita
const VAR_MAP = {
  background: "background", foreground: "foreground", card: "card", "card-foreground": "cardForeground",
  primary: "primary", "primary-foreground": "primaryForeground", muted: "muted", "muted-foreground": "mutedForeground",
  border: "border", ring: "glow", "chart-1": "glow"
};
export const LABELS = { background: "Background", foreground: "Teks", card: "Kartu", cardForeground: "Teks kartu", primary: "Aksen", primaryForeground: "Teks tombol", muted: "Latar lembut", mutedForeground: "Teks redup", border: "Garis", glow: "Cahaya", headFrom: "Judul atas", headTo: "Judul bawah" };

function blocks(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) out.push({ sel: m[1].trim(), body: m[2] });
  return out;
}
function vars(body) { const o = {}; for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) o[m[1]] = m[2].trim(); return o; }

/**
 * @returns {{ ok:boolean, error?:string, modes:{light?:object,dark?:object}, radius?:number, fontHint?:string }}
 */
export function parseThemeCode(text) {
  const src = String(text || "").trim();
  if (!src) return { ok: false, error: "Kodenya masih kosong." };
  // 1) JSON { "background": "#...", ... }
  if (src.startsWith("{") && !/--[\w-]+\s*:/.test(src)) {
    try {
      const j = JSON.parse(src), colors = {};
      for (const [k, v] of Object.entries(j.colors || j)) { const key = VAR_MAP[k] || k; const hex = parseColor(v); if (hex && key in LABELS) colors[key] = hex; }
      if (!Object.keys(colors).length) return { ok: false, error: "JSON terbaca, tapi nggak ada warna yang dikenali (background, primary, dll)." };
      return { ok: true, modes: { light: finish(colors) }, radius: typeof j.radius === "number" ? j.radius : undefined };
    } catch { return { ok: false, error: "JSON-nya error. Cek tanda kutip dan koma." }; }
  }
  // 2) CSS variabel
  const modes = {}; let radius, fontHint;
  for (const { sel, body } of blocks(src)) {
    const v = vars(body); if (!Object.keys(v).length) continue;
    const isDark = /\.dark|\[data-theme=["']?dark|prefers-color-scheme/i.test(sel);
    const isRoot = /:root|^html|^body|\.light|\[data-theme/i.test(sel) || sel.startsWith("@");
    if (!isDark && !isRoot && !/^[.#\w-]+$/.test(sel)) continue;
    const colors = {};
    for (const [name, key] of Object.entries(VAR_MAP)) { if (colors[key] && name === "chart-1") continue; const hex = parseColor(v[name]); if (hex) colors[key] = hex; }
    if (v.radius) { const r = v.radius.match(/([\d.]+)(rem|px)?/); if (r) radius = Math.round(parseFloat(r[1]) * (r[2] === "px" ? 1 : 16)); }
    const f = v["font-sans"] || v["font-heading"] || v["font-display"] || v["font-serif"];
    if (f && !fontHint) fontHint = f.split(",")[0].replace(/["']/g, "").trim();
    if (!Object.keys(colors).length) continue;
    const slot = isDark ? "dark" : "light";
    modes[slot] = { ...(modes[slot] || {}), ...colors };
  }
  for (const k of Object.keys(modes)) modes[k] = finish(modes[k]);
  if (!Object.keys(modes).length) return { ok: false, error: "Nggak ada variabel warna yang dikenali. Tempel blok :root { --background: ...; --primary: ...; } dari 21st.dev, tweakcn, atau shadcn." };
  return { ok: true, modes, radius: radius != null ? Math.max(0, Math.min(40, radius)) : undefined, fontHint };
}

const lum = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); };
const mixHex = (a, b, t) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = x => Math.round(((pa >> x) & 255) * (1 - t) + ((pb >> x) & 255) * t); return "#" + [16, 8, 0].map(x => r(x).toString(16).padStart(2, "0")).join(""); };
// isi warna judul & cahaya kalau kode tema nggak punya
function finish(c) {
  const o = { ...c };
  if (o.background && !o.foreground) o.foreground = lum(o.background) < .3 ? "#f5f5f5" : "#111111";
  if (o.primary && !o.glow) o.glow = o.primary;
  if (o.primary && o.background) {
    const dark = lum(o.background) < .2;
    const light = lum(o.background) > .5;
    o.headFrom = dark ? (o.foreground || "#ffffff") : light ? mixHex(o.primary, "#ffffff", .45) : "#ffffff";
    o.headTo = o.primary;
  }
  return o;
}
