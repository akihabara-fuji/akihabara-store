/* Tema situs akademik: paket warna + font yang sudah dipasangkan. Yang disimpan hanya ID paket (pengaturan ca_tema);
   CSS-nya dibuat di server dan disisipkan sesudah semua stylesheet halaman, jadi menimpa token warna dan font. */
"use strict";
const PRESETS = {
  bawaan:  { nama: "Bawaan saat ini (Ungu)", hf: "Bricolage Grotesque", bf: "Onest", pl: "#7c3aed", pd: "#a855f7", bl: "#f6f3ff", bd: "#0a0a1c", tl: "#0a0a1c", td: "#f3f0ff" },
  klasik:  { nama: "Biru Klasik", hf: "Inter", bf: "Roboto", pl: "#1E40AF", pd: "#60A5FA", bl: "#F8FAFC", bd: "#0F172A", tl: "#0F172A", td: "#F1F5F9" },
  hijau:   { nama: "Akademik Hijau", hf: "Plus Jakarta Sans", bf: "Open Sans", pl: "#065F46", pd: "#34D399", bl: "#F4FBF7", bd: "#052E24", tl: "#064E3B", td: "#ECFDF5" },
  premium: { nama: "Premium Muted", hf: "Merriweather", bf: "Source Sans 3", pl: "#78350F", pd: "#E0A458", bl: "#FAF7F2", bd: "#1C1917", tl: "#1C1917", td: "#FAF5EE", serif: true },
  merah:   { nama: "Edu Merah Berani", hf: "Montserrat", bf: "Lato", pl: "#991B1B", pd: "#F87171", bl: "#FFFBFB", bd: "#1A0505", tl: "#1A0505", td: "#FEF2F2" },
  ut:      { nama: "Biru UT E-Learning (resmi, bersih)", hf: "Inter", bf: "Open Sans", pl: "#1859BC", pd: "#8DB6FF", bl: "#F4F6F9", bd: "#0A1630", tl: "#212529", td: "#EEF2FB" },
  wireframe: { nama: "Wireframe Monokrom (hitam putih)", hf: "Inter", bf: "Inter", pl: "#1B1C1F", pd: "#F2F2F3", bl: "#E8E9EC", bd: "#0C0C0E", tl: "#1B1C1F", td: "#F2F2F3" },
  kreatif: { nama: "Modern Kreatif", hf: "Poppins", bf: "DM Sans", pl: "#6D28D9", pd: "#A78BFA", bl: "#FAFAFE", bd: "#1E1B4B", tl: "#1E1B4B", td: "#F5F3FF" },
};
const DEFAULT = "bawaan";
const WEIGHTS = { Lato: "400;700", Roboto: "400;500;700", Merriweather: "400;700", Poppins: "500;600;700", "Open Sans": "400;500;600;700" };
const fam = (n, w) => `family=${n.replace(/ /g, "+")}:wght@${WEIGHTS[n] || w}`;
const id = v => (Object.prototype.hasOwnProperty.call(PRESETS, v) ? v : DEFAULT);

/* Satu blok <link>+<style> untuk di dalam <head>. Paket bawaan = kosong (tampilan tidak berubah sedikit pun). */
function head(v) {
  const k = id(v); if (k === DEFAULT) return "";
  const p = PRESETS[k], g = p.serif ? "Georgia,serif" : "system-ui,sans-serif";
  const url = `https://fonts.googleapis.com/css2?${fam(p.hf, "600;700")}&${fam(p.bf, "400;500;600;700")}&display=swap`;
  const light = `--bg:${p.bl};--surface:#ffffff;--surface2:color-mix(in srgb,${p.bl} 90%,${p.tl});--border:color-mix(in srgb,${p.bl} 84%,${p.tl});--dash:color-mix(in srgb,${p.bl} 70%,${p.tl});--text:${p.tl};--muted:color-mix(in srgb,${p.tl} 72%,${p.bl});--acc:${p.pl};--acc2:color-mix(in srgb,${p.pl} 70%,#fff);--on-accent:#ffffff;--btn:${p.pl};--btn-h:color-mix(in srgb,${p.pl} 85%,#000);--link:${p.pl};--tint1:color-mix(in srgb,${p.pl} 9%,transparent);--halo:color-mix(in srgb,${p.pl} 24%,transparent);color-scheme:light`;
  const dark = `--bg:${p.bd};--surface:color-mix(in srgb,${p.bd} 90%,#fff);--surface2:color-mix(in srgb,${p.bd} 82%,#fff);--border:color-mix(in srgb,${p.bd} 72%,#fff);--dash:color-mix(in srgb,${p.bd} 60%,#fff);--text:${p.td};--muted:color-mix(in srgb,${p.td} 72%,${p.bd});--acc:${p.pd};--acc2:color-mix(in srgb,${p.pd} 70%,#fff);--on-accent:${p.bd};--btn:${p.pd};--btn-h:color-mix(in srgb,${p.pd} 85%,#fff);--link:${p.pd};--tint1:color-mix(in srgb,${p.pd} 14%,transparent);--halo:color-mix(in srgb,${p.pd} 26%,transparent);color-scheme:dark`;
  const over = `.hero.hx,[data-theme=dark] .hero.hx{--nx-blue:var(--btn);--nx-blue2:var(--acc);--nx-gold:var(--acc);--nx-glow:var(--halo)}.btn-pri,[data-theme=dark] .btn-pri,.band .btn-pri{background:var(--btn);color:var(--on-accent)}.btn-pri:hover{background:var(--btn-h)}.nx-strip{background:${p.bd}!important;color:${p.td}!important}.nx-strip svg{color:${p.pd}!important}.nx-strip small{color:color-mix(in srgb,${p.td} 72%,${p.bd})!important}.nx-strip .nx-rt{color:${p.td}!important}.wa-bubble,[data-theme=dark] .wa-bubble{background:var(--btn)!important}.btn[disabled]{background:color-mix(in srgb,var(--text) 20%,var(--bg))!important;color:color-mix(in srgb,var(--text) 55%,var(--bg))!important}body:not(.hub) .badge{background:color-mix(in srgb,var(--acc) 16%,transparent)!important;color:var(--link)!important}.bx,.ax,.nf,[data-theme=dark] .bx,[data-theme=dark] .ax,[data-theme=dark] .nf{--bx-hl:var(--acc);--bx-cta:var(--btn);--bx-cta-h:var(--btn-h);--bx-cta-text:var(--on-accent)}.bx,.bx *,.ax,.ax *,.nf,.nf *{font-family:'${p.bf}',${g}!important}.bx h1,.bx h2,.bx h3,.ax h1,.ax h2,.ax h3,.nf h1,.bx-card h3,.bx-feat h2{font-family:'${p.hf}','${p.bf}',${g}!important}.ax pre,.ax pre *,.ax code{font-family:ui-monospace,Menlo,Consolas,monospace!important}`;
  const css = `:root,[data-theme=light]{${light}}[data-theme=dark]{${dark}}body,input,button,textarea,select{font-family:'${p.bf}',${g}}h1,h2,h3,h4,.disp,.logo,.brand,.pt{font-family:'${p.hf}','${p.bf}',${g}!important}${over}`;
  return `<link rel="stylesheet" href="${url}"><style id="tema-${k}">${css}</style>`;
}
const inject = (html, v) => { const h = head(v); return h ? html.replace("</head>", h + "</head>") : html; };
module.exports = { PRESETS, DEFAULT, id, head, inject };
