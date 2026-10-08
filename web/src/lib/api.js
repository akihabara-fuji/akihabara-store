import defaultSite from "./defaultSite.json";

export const DEFAULT_SITE = defaultSite;

// Gabungkan data dari server ke bawaan supaya kunci baru tidak pernah kosong.
export function mergeSite(data) {
  const d = data && typeof data === "object" ? data : {};
  const base = structuredClone(defaultSite);
  const out = { ...base, ...d };
  for (const k of ["brand", "theme", "visitor", "seo", "imgs", "text", "pay"]) out[k] = { ...base[k], ...(d[k] || {}) };
  for (const k of ["sections", "chips", "experience", "services", "process", "stats", "works", "products"]) out[k] = Array.isArray(d[k]) ? d[k] : base[k];
  // pastikan semua section ada
  for (const s of base.sections) if (!out.sections.find(x => x.id === s.id)) out.sections.push(s);
  return out;
}

export async function loadSite() {
  try {
    const r = await fetch("/api/site", { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return mergeSite(j.site || j);
  } catch { return mergeSite(null); }
}

export async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: "same-origin", ...opts, headers: { ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) } });
  let j = null; try { j = await r.json(); } catch { /* ignore */ }
  if (!r.ok) { const e = new Error((j && j.error) || `Error ${r.status}`); e.status = r.status; throw e; }
  return j;
}
