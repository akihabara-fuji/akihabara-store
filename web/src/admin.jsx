import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Save, LogOut, Eye, EyeOff, RotateCcw } from "lucide-react";
import "./index.css";
import Site, { ICONS } from "./site/Site";
import { api, mergeSite, DEFAULT_SITE } from "./lib/api";
import { THEMES, FONTS, BODY_FONTS, GFONT_RE, CUSTOM_KEYS, resolveTheme } from "./lib/themes";
import { parseThemeCode, LABELS } from "./lib/themeImport";
import { cn, safeUrl } from "./lib/utils";

const TABS = [["tema", "Tema"], ["teks", "Teks"], ["konten", "Konten"], ["produk", "Produk"], ["foto", "Foto"], ["bayar", "Bayar"], ["riwayat", "Riwayat"]];
const setIn = (o, path, v) => { const c = structuredClone(o); let r = c; path.slice(0, -1).forEach(k => r = r[k]); r[path.at(-1)] = v; return c; };

/* ---------- kolom form ---------- */
const Label = ({ children, hint }) => <span className="mb-1 block text-xs font-bold">{children}{hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}</span>;
function Text({ label, value, onChange, area, ...p }) {
  return <label className="block">{label && <Label>{label}</Label>}{area ? <textarea rows={3} className="field resize-y" value={value ?? ""} onChange={e => onChange(e.target.value)} {...p} /> : <input className="field" value={value ?? ""} onChange={e => onChange(e.target.value)} {...p} />}</label>;
}
function Num({ label, value, onChange, ...p }) {
  return <label className="block"><Label>{label}</Label><input type="number" min="0" className="field" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : +e.target.value)} {...p} /></label>;
}
function Toggle({ label, on, onChange }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-foreground/5 px-3 py-2.5 text-sm font-semibold">{label}<input type="checkbox" role="switch" checked={!!on} onChange={e => onChange(e.target.checked)} className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-foreground/25 transition checked:bg-primary [&:checked]:[background-image:none] relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:before:translate-x-4" /></label>;
}
function Group({ title, children }) { return <section className="space-y-3 rounded-2xl bg-foreground/[.04] p-4"><h3 className="eyebrow">{title}</h3>{children}</section>; }

function PhotoField({ label, value, onChange, onError }) {
  const ref = useRef(null); const [busy, setBusy] = useState(false);
  const pick = async e => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const fd = new FormData(); fd.append("file", f); setBusy(true);
    try { const r = await api("/api/upload", { method: "POST", body: fd }); onChange(r.url); } catch (er) { onError(er.message); } setBusy(false);
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-foreground/10">{safeUrl(value) && <img src={value} alt="" className="h-full w-full object-cover" />}</div>
        <input className="field min-w-0" placeholder="/uploads/... atau https://..." value={value || ""} onChange={e => onChange(e.target.value)} />
        <button type="button" onClick={() => ref.current.click()} disabled={busy} aria-label={`Upload ${label}`} className="btn-ghost !px-3 !py-2.5"><Upload size={15} />{busy ? "..." : ""}</button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick} />
      </div>
    </div>
  );
}

/* editor daftar generik */
function ListEditor({ items, onChange, blank, title, render }) {
  const move = (i, d) => { const a = [...items], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="space-y-2.5 rounded-2xl bg-foreground/[.04] p-3.5">
          <div className="flex items-center justify-between"><strong className="truncate text-sm">{title(it, i)}</strong>
            <div className="flex shrink-0"><button aria-label="Naik" onClick={() => move(i, -1)} className="p-1.5 hover:text-primary"><ArrowUp size={15} /></button><button aria-label="Turun" onClick={() => move(i, 1)} className="p-1.5 hover:text-primary"><ArrowDown size={15} /></button><button aria-label="Hapus" onClick={() => confirm("Hapus item ini?") && onChange(items.filter((_, k) => k !== i))} className="p-1.5 text-red-600"><Trash2 size={15} /></button></div></div>
          {render(it, v => onChange(items.map((x, k) => k === i ? v : x)), i)}
        </div>
      ))}
      <button onClick={() => onChange([...items, structuredClone(blank)])} className="btn-ghost w-full"><Plus size={15} />Tambah item baru</button>
    </div>
  );
}

/* ---------- login ---------- */
function Login({ onDone }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async e => { e.preventDefault(); setBusy(true); setErr(""); try { await api("/api/login", { method: "POST", body: JSON.stringify({ password: pw }) }); onDone(); } catch (x) { setErr(x.message); } setBusy(false); };
  return (
    <div className="grid min-h-screen place-items-center p-5">
      <form onSubmit={go} className="glass w-full max-w-sm space-y-4 p-7">
        <h1 className="display-title headline-fill text-5xl">Admin</h1>
        <p className="text-sm text-muted-foreground">Masuk untuk mengatur tampilan, produk, dan foto.</p>
        <label className="block"><Label>Password</Label><input type="password" autoFocus autoComplete="current-password" className="field" value={pw} onChange={e => setPw(e.target.value)} /></label>
        {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
        <button disabled={busy || !pw} className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Masuk..." : "Masuk"}</button>
      </form>
    </div>
  );
}

/* ---------- tab ---------- */
function CustomFont({ t, set }) {
  const cf = t.fontCustom || { name: "", weight: 700 };
  const bad = cf.name && !GFONT_RE.test(cf.name);
  return (
    <div className="space-y-2 border-t border-foreground/10 pt-3">
      <Text label="Font judul dari Google Fonts (opsional)" value={cf.name} onChange={v => set(["theme", "fontCustom"], v ? { ...cf, name: v } : null)} placeholder="contoh: Poppins, Oswald, Rubik" />
      {t.fontCustom && <label className="block"><Label>Ketebalan</Label><select className="field" value={cf.weight} onChange={e => set(["theme", "fontCustom"], { ...cf, weight: +e.target.value })}><option value={400}>Normal</option><option value={700}>Tebal</option><option value={900}>Sangat tebal</option></select></label>}
      {bad && <p role="alert" className="text-xs font-semibold text-red-600">Nama font hanya boleh huruf, angka, dan spasi.</p>}
      <p className="text-xs text-muted-foreground">Ketik nama persis seperti di fonts.google.com. Kalau diisi, menimpa pilihan font judul di atas. Kosongkan untuk kembali.</p>
    </div>
  );
}

function ThemeCode({ d, set }) {
  const [code, setCode] = useState(""), [res, setRes] = useState(null), [mode, setMode] = useState("light");
  const parsed = res?.ok ? res : null;
  const modeKeys = parsed ? Object.keys(parsed.modes) : [];
  const apply = r => {
    const m = r.modes[mode] || r.modes[Object.keys(r.modes)[0]];
    set(["theme"], { ...d.theme, custom: m, ...(r.radius != null ? { radius: r.radius } : {}) });
    return Object.keys(m).filter(k => LABELS[k]).length;
  };
  const go = () => { const r = parseThemeCode(code); setRes(r); if (r.ok) { const m = r.modes.light ? "light" : "dark"; setMode(m); const x = r.modes[m]; set(["theme"], { ...d.theme, custom: x, ...(r.radius != null ? { radius: r.radius } : {}) }); } };
  return (
    <Group title="Tempel kode tema">
      <p className="text-xs leading-relaxed text-muted-foreground">Punya tema dari 21st.dev, tweakcn, atau shadcn? Tempel kode CSS-nya (<code>:root {"{ --background: ...; --primary: ...; }"}</code>) atau JSON warna. Format hex, hsl, rgb, dan oklch dibaca otomatis.</p>
      <textarea rows={6} spellCheck={false} className="field resize-y font-mono text-xs" value={code} onChange={e => setCode(e.target.value)} placeholder={":root {\n  --background: 0 0% 100%;\n  --primary: 262 83% 58%;\n  --radius: 0.75rem;\n}\n.dark { ... }"} />
      <div className="flex gap-2"><button type="button" onClick={go} disabled={!code.trim()} className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">Terapkan kode</button>{code && <button type="button" onClick={() => { setCode(""); setRes(null); }} className="btn-ghost !py-2.5">Hapus</button>}</div>
      {res && !res.ok && <p role="alert" className="text-xs font-semibold text-red-600">{res.error}</p>}
      {parsed && (
        <div className="space-y-2 rounded-xl bg-primary/10 p-3 text-xs">
          <p className="font-bold">Terpasang. Lihat hasilnya di pratinjau, lalu klik Simpan.</p>
          {modeKeys.length > 1 && <div className="flex gap-1.5">{modeKeys.map(k => <button key={k} type="button" onClick={() => { setMode(k); set(["theme"], { ...d.theme, custom: parsed.modes[k] }); }} aria-pressed={mode === k} className={cn("rounded-full px-3 py-1 font-bold", mode === k ? "bg-primary text-primary-foreground" : "bg-foreground/10")}>{k === "dark" ? "Versi gelap" : "Versi terang"}</button>)}</div>}
          <div className="flex flex-wrap gap-1.5">{Object.entries(parsed.modes[mode] || {}).filter(([k]) => LABELS[k]).map(([k, v]) => <span key={k} className="inline-flex items-center gap-1 rounded-full bg-card/70 px-2 py-0.5"><i className="h-3 w-3 rounded-full ring-1 ring-black/20" style={{ background: v }} />{LABELS[k]}</span>)}</div>
          {parsed.radius != null && <p>Lengkung sudut ikut diatur: {parsed.radius}px.</p>}
          {parsed.fontHint && <p>Kode ini menyebut font <b>{parsed.fontHint}</b>. Kalau itu font Google, ketik di kolom "Font lain" di bawah.</p>}
        </div>
      )}
    </Group>
  );
}

function TabTema({ d, set }) {
  const t = d.theme, cur = resolveTheme(t);
  return (
    <div className="space-y-4">
      <Group title="Preset tema (gaya 21st.dev / shadcn)">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(THEMES).map(([k, v]) => (
            <button key={k} onClick={() => set(["theme"], { ...t, preset: k, custom: {} })} aria-pressed={t.preset === k}
              className={cn("flex items-center gap-2 rounded-xl border-2 p-2 text-left text-xs font-bold transition", t.preset === k ? "border-primary" : "border-transparent bg-card/60 hover:bg-card")}>
              <span className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${v.aurora[0]}, ${v.background} 55%, ${v.primary})` }} />{v.label}
            </button>
          ))}
        </div>
      </Group>
      <ThemeCode d={d} set={set} />
      <Group title="Warna manual (menimpa preset)">
        <div className="grid grid-cols-2 gap-2.5">
          {CUSTOM_KEYS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-xs font-semibold"><input type="color" value={t.custom?.[k] || cur[k]} onChange={e => set(["theme", "custom"], { ...t.custom, [k]: e.target.value })} className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />{l}</label>
          ))}
        </div>
        <button onClick={() => set(["theme", "custom"], {})} className="btn-ghost w-full !py-2 text-xs"><RotateCcw size={13} />Reset ke warna preset</button>
      </Group>
      <Group title="Font judul">
        <div className="space-y-2">{Object.entries(FONTS).map(([k, f]) => <label key={k} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 text-sm font-bold", t.font === k ? "border-primary" : "border-transparent bg-card/60")}><input type="radio" name="font" className="accent-[rgb(var(--primary))]" checked={t.font === k} onChange={() => set(["theme", "font"], k)} /><span style={{ fontFamily: f.family, fontWeight: f.weight, fontStretch: f.stretch, textTransform: "uppercase" }}>{f.label}</span></label>)}</div>
      </Group>
      <Group title="Font lain">
        <label className="block"><Label>Font tulisan biasa</Label><select className="field" value={t.bodyFont || "jakarta"} onChange={e => set(["theme", "bodyFont"], e.target.value)}>{Object.entries(BODY_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></label>
        <CustomFont t={t} set={set} />
      </Group>
      <Group title="Bentuk & efek">
        <label className="block"><Label>Lengkung sudut: {t.radius}px</Label><input type="range" min="0" max="40" value={t.radius} onChange={e => set(["theme", "radius"], +e.target.value)} className="w-full accent-[rgb(var(--primary))]" /></label>
        <Toggle label="Latar aurora bergerak" on={t.aurora !== false} onChange={v => set(["theme", "aurora"], v)} />
        <Toggle label="Efek grain film" on={t.grain !== false} onChange={v => set(["theme", "grain"], v)} />
      </Group>
      <Group title="Tema pilihan pengunjung">
        <Toggle label="Pengunjung boleh ganti tema" on={d.visitor.on} onChange={v => set(["visitor", "on"], v)} />
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(THEMES).map(([k, v]) => { const on = d.visitor.presets.includes(k); return <label key={k} className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={on} onChange={() => set(["visitor", "presets"], on ? d.visitor.presets.filter(x => x !== k) : [...d.visitor.presets, k])} />{v.label}</label>; })}
        </div>
        <p className="text-xs text-muted-foreground">Tema dasar dan warna di atas juga dipakai web lain lewat theme.js.</p>
      </Group>
    </div>
  );
}

function TabTeks({ d, set }) {
  const T = d.text, f = (k, label, area) => <Text key={k} label={label} area={area} value={T[k]} onChange={v => set(["text", k], v)} />;
  return (
    <div className="space-y-4">
      <Group title="Merek"><Text label="Nama" value={d.brand.name} onChange={v => set(["brand", "name"], v)} /><Text label="Sub nama" value={d.brand.sub} onChange={v => set(["brand", "sub"], v)} /><Text label="Deskripsi Google (SEO)" area value={d.seo.description} onChange={v => set(["seo", "description"], v)} /></Group>
      <Group title="Sampul">{f("coverEyebrow", "Teks kecil")}{f("coverTitle", "Judul besar")}{f("coverSub", "Subjudul")}{f("coverLead", "Paragraf", 1)}{f("coverCta", "Tombol")}
        <Text label="Angka statistik" value={d.stats[0]?.v} onChange={v => set(["stats"], [{ ...(d.stats[0] || { suffix: "+", l: "" }), v: +v || 0 }])} />
        <Text label="Keterangan statistik" value={d.stats[0]?.l} onChange={v => set(["stats"], [{ ...(d.stats[0] || { v: 0, suffix: "+" }), l: v }])} /></Group>
      <Group title="Bagian">{[["aboutTitle", "Judul About"], ["aboutText", "Isi About", 1], ["servicesTitle", "Judul layanan"], ["servicesSub", "Sub layanan"], ["processTitle", "Judul cara kerja"], ["processText", "Isi cara kerja", 1], ["workTitle", "Judul karya"], ["workSub", "Sub karya"], ["productsTitle", "Judul produk"], ["productsSub", "Sub produk"], ["presetTitle", "Judul preset"], ["presetSub", "Sub preset"], ["contactTitle", "Judul kontak"], ["contactSub", "Sub kontak"], ["contactText", "Isi kontak", 1]].map(([k, l, a]) => f(k, l, a))}</Group>
      <Group title="Susunan halaman">
        <ListEditor items={d.sections} onChange={v => set(["sections"], v)} blank={{ id: "about", on: true }} title={s => s.id} render={(s, ch) => <Toggle label="Tampilkan" on={s.on} onChange={v => ch({ ...s, on: v })} />} />
      </Group>
    </div>
  );
}

function TabKonten({ d, set }) {
  return (
    <div className="space-y-5">
      <Group title="Pengalaman"><ListEditor items={d.experience} onChange={v => set(["experience"], v)} blank={{ when: "", title: "", place: "" }} title={e => e.title || "Baru"} render={(e, ch) => <><Text label="Kapan" value={e.when} onChange={v => ch({ ...e, when: v })} /><Text label="Peran" value={e.title} onChange={v => ch({ ...e, title: v })} /><Text label="Tempat" value={e.place} onChange={v => ch({ ...e, place: v })} /></>} /></Group>
      <Group title="Layanan (What I Do)"><ListEditor items={d.services} onChange={v => set(["services"], v)} blank={{ icon: "Sparkles", title: "", desc: "" }} title={e => e.title || "Baru"} render={(e, ch) => <><label className="block"><Label>Ikon</Label><select className="field" value={e.icon} onChange={x => ch({ ...e, icon: x.target.value })}>{Object.keys(ICONS).map(k => <option key={k}>{k}</option>)}</select></label><Text label="Judul" value={e.title} onChange={v => ch({ ...e, title: v })} /><Text label="Deskripsi" area value={e.desc} onChange={v => ch({ ...e, desc: v })} /></>} /></Group>
      <Group title="Cara kerja"><ListEditor items={d.process} onChange={v => set(["process"], v)} blank={{ title: "", desc: "" }} title={e => e.title || "Baru"} render={(e, ch) => <><Text label="Judul" value={e.title} onChange={v => ch({ ...e, title: v })} /><Text label="Deskripsi" value={e.desc} onChange={v => ch({ ...e, desc: v })} /></>} /></Group>
      <Group title="Karya (Selected Work)"><ListEditor items={d.works} onChange={v => set(["works"], v)} blank={{ id: "", nama: "", tag: "", sub: "", img: "", link: "" }} title={e => e.nama || "Baru"} render={(e, ch, i) => <><Text label="Nama" value={e.nama} onChange={v => ch({ ...e, nama: v, id: e.id || "w" + Date.now() })} /><Text label="Kategori" value={e.tag} onChange={v => ch({ ...e, tag: v })} /><Text label="Keterangan" value={e.sub} onChange={v => ch({ ...e, sub: v })} /><Text label="Link (opsional)" value={e.link} onChange={v => ch({ ...e, link: v })} placeholder="https://..." /><PhotoField label="Foto" value={e.img} onChange={v => ch({ ...e, img: v })} onError={window.__err} /></>} /></Group>
      <Group title="Chip teknologi"><Text area value={d.chips.join(", ")} onChange={v => set(["chips"], v.split(",").map(s => s.trim()).filter(Boolean))} /><p className="text-xs text-muted-foreground">Pisahkan dengan koma.</p></Group>
    </div>
  );
}

function Gallery({ imgs = [], onChange }) {
  const ref = useRef(null); const [busy, setBusy] = useState(false);
  const pick = async e => {
    const files = [...(e.target.files || [])]; e.target.value = ""; if (!files.length) return;
    setBusy(true); const out = [...imgs];
    for (const f of files.slice(0, 8 - out.length)) {
      const fd = new FormData(); fd.append("file", f);
      try { const r = await api("/api/upload", { method: "POST", body: fd }); out.push(r.url); onChange([...out]); } catch (er) { window.__err(er.message); break; }
    }
    setBusy(false);
  };
  const move = (i, d) => { const a = [...imgs], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      <Label hint="(foto pertama jadi cover, maks 8)">Foto produk</Label>
      <div className="grid grid-cols-4 gap-2">
        {imgs.map((u, i) => (
          <div key={u + i} className="group relative aspect-square overflow-hidden rounded-xl bg-foreground/10">
            <img src={u} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">COVER</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button type="button" aria-label="Geser kiri" onClick={() => move(i, -1)} className="p-1 text-xs">◀</button>
              <button type="button" aria-label="Hapus foto" onClick={() => onChange(imgs.filter((_, k) => k !== i))} className="p-1"><Trash2 size={12} /></button>
              <button type="button" aria-label="Geser kanan" onClick={() => move(i, 1)} className="p-1 text-xs">▶</button>
            </div>
          </div>
        ))}
        {imgs.length < 8 && <button type="button" onClick={() => ref.current.click()} disabled={busy} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-foreground/25 text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary"><span className="text-center"><Upload size={18} className="mx-auto mb-1" />{busy ? "Upload..." : "Tambah foto"}</span></button>}
      </div>
      <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick} />
    </div>
  );
}

function draftCaption(p) {
  const price = p.harga != null && p.harga !== "" ? `Rp${Number(p.harga).toLocaleString("id-ID")}${p.satuan || ""}` : "";
  return [`${p.nama || "Nama produk"}${p.tag ? ` (${p.tag})` : ""}`, p.desk, (p.fitur || []).length ? (p.fitur || []).map(f => `- ${f}`).join("\n") : "", price && `Harga: ${price}`, "Pesan lewat WhatsApp, link di bio."].filter(Boolean).join("\n\n");
}

function TabProduk({ d, set }) {
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-primary/10 p-3 text-xs leading-relaxed">Isi semuanya manual. Produk yang disimpan langsung muncul di web. Centang <b>Sembunyikan</b> kalau mau disimpan dulu tanpa tampil.</p>
      <ListEditor items={d.products} onChange={v => set(["products"], v)} blank={{ id: "", nama: "", tag: "", desk: "", caption: "", badge: "", link: "", hidden: false, harga: null, satuan: "", status: "aktif", imgs: [], fitur: [] }} title={p => (p.hidden ? "[tersembunyi] " : "") + (p.nama || "Produk baru")}
        render={(p, ch) => <>
          <Text label="Nama produk" value={p.nama} onChange={v => ch({ ...p, nama: v, id: p.id || "p" + Date.now() })} />
          <Gallery imgs={p.imgs} onChange={v => ch({ ...p, imgs: v, id: p.id || "p" + Date.now() })} />
          <div className="grid grid-cols-2 gap-2"><Text label="Kategori" value={p.tag} onChange={v => ch({ ...p, tag: v })} placeholder="Preset, Bot, ..." /><Text label="Label (opsional)" value={p.badge} onChange={v => ch({ ...p, badge: v })} placeholder="Terlaris, Baru" /></div>
          <div className="grid grid-cols-2 gap-2"><Num label="Harga (Rp)" value={p.harga} onChange={v => ch({ ...p, harga: v })} /><Text label="Satuan" value={p.satuan} onChange={v => ch({ ...p, satuan: v })} placeholder="/analisa" /></div>
          <p className="-mt-1 text-xs text-muted-foreground">Kosongkan harga untuk menampilkan "Tanya harga".</p>
          <Text label="Deskripsi singkat (di kartu)" value={p.desk} onChange={v => ch({ ...p, desk: v })} />
          <div>
            <div className="mb-1 flex items-center justify-between"><Label>Caption lengkap</Label>
              <div className="flex gap-1"><button type="button" onClick={() => (!p.caption || confirm("Timpa caption yang ada dengan draf baru?")) && ch({ ...p, caption: draftCaption(p) })} className="rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-bold hover:bg-foreground/20">Buat draf</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(p.caption || ""); window.__err("Caption tersalin."); }} className="rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-bold hover:bg-foreground/20">Salin</button></div></div>
            <textarea rows={6} className="field resize-y" value={p.caption || ""} onChange={e => ch({ ...p, caption: e.target.value })} placeholder="Tulis caption penjualan di sini. Tampil di halaman detail produk, dan bisa disalin buat Instagram/TikTok." />
            <p className="mt-1 text-xs text-muted-foreground">"Buat draf" menyusun caption awal dari data di atas. Setelah itu edit sesukamu.</p>
          </div>
          <Text label="Fitur (satu per baris)" area value={(p.fitur || []).join("\n")} onChange={v => ch({ ...p, fitur: v.split("\n").map(s => s.trim()).filter(Boolean) })} />
          <Text label="Link produk (opsional)" value={p.link} onChange={v => ch({ ...p, link: v })} placeholder="https://lynk.id/..." />
          <label className="block"><Label>Status</Label><select className="field" value={p.status} onChange={e => ch({ ...p, status: e.target.value })}><option value="aktif">Aktif</option><option value="segera">Segera hadir</option></select></label>
          <Toggle label="Sembunyikan dari web" on={p.hidden} onChange={v => ch({ ...p, hidden: v })} />
        </>} />
    </div>
  );
}

function TabFoto({ d, set }) {
  return <div className="space-y-4"><Group title="Foto utama">{[["person", "Foto sampul (cut-out PNG paling bagus)"], ["about", "Foto About"], ["before", "Preset: sebelum"], ["after", "Preset: sesudah"]].map(([k, l]) => <PhotoField key={k} label={l} value={d.imgs[k]} onChange={v => set(["imgs", k], v)} onError={window.__err} />)}</Group><p className="px-1 text-xs text-muted-foreground">Foto produk dan karya diisi di tab Produk dan Konten. Maksimal 6 MB per foto.</p></div>;
}

function TabBayar({ d, set }) {
  const p = d.pay;
  return (
    <div className="space-y-4">
      <Group title="WhatsApp penjual"><Text label="Nomor (format 628xxxx)" value={p.wa} onChange={v => set(["pay", "wa"], v.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="6281234567890" /></Group>
      <Group title="QRIS"><Toggle label="Aktifkan QRIS" on={p.qrisOn} onChange={v => set(["pay", "qrisOn"], v)} /><PhotoField label="Gambar QRIS" value={p.qris} onChange={v => set(["pay", "qris"], v)} onError={window.__err} /></Group>
      <Group title="Transfer bank"><Toggle label="Aktifkan" on={p.bankOn} onChange={v => set(["pay", "bankOn"], v)} /><Text area label="Rekening" value={p.bank} onChange={v => set(["pay", "bank"], v)} placeholder={"BCA 1234567890\na.n. Nama"} /></Group>
      <Group title="E-wallet"><Toggle label="Aktifkan" on={p.ewOn} onChange={v => set(["pay", "ewOn"], v)} /><Text area label="Nomor e-wallet" value={p.ew} onChange={v => set(["pay", "ew"], v)} placeholder="DANA 0812..." /></Group>
    </div>
  );
}

function TabRiwayat({ onRestored, toast }) {
  const [list, setList] = useState(null);
  useEffect(() => { api("/api/backups").then(setList).catch(e => toast(e.message)); }, []); // eslint-disable-line
  const restore = async name => { if (!confirm("Pulihkan versi ini? Versi sekarang tetap disimpan di riwayat.")) return; try { await api("/api/restore", { method: "POST", body: JSON.stringify({ name }) }); toast("Dipulihkan."); onRestored(); } catch (e) { toast(e.message); } };
  const fmt = n => { const m = n.match(/site-(\d{4})-(\d\d)-(\d\d)T(\d\d)-(\d\d)-(\d\d)/); return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : n; };
  return <div className="space-y-2">{list === null ? <p className="text-sm">Memuat...</p> : list.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada riwayat. Muncul setelah simpan pertama.</p> : list.map(n => <div key={n} className="flex items-center justify-between rounded-xl bg-foreground/5 px-3 py-2.5 text-sm"><span className="font-semibold">{fmt(n)}</span><button onClick={() => restore(n)} className="btn-ghost !px-3 !py-1.5 text-xs">Pulihkan</button></div>)}</div>;
}

/* ---------- aplikasi admin ---------- */
function Admin() {
  const [auth, setAuth] = useState(null), [saved, setSaved] = useState(null), [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("tema"), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [preview, setPreview] = useState(true);
  const toast = useCallback(m => { setMsg(m); clearTimeout(toast.t); toast.t = setTimeout(() => setMsg(""), 3500); }, []);
  useEffect(() => { window.__err = toast; }, [toast]);

  const load = useCallback(async () => { try { const r = await api("/api/site"); const s = mergeSite(r.site); setSaved(s); setDraft(s); } catch { setSaved(mergeSite(null)); setDraft(mergeSite(null)); } }, []);
  useEffect(() => { api("/api/me").then(r => { setAuth(!!r.admin); if (r.admin) load(); }).catch(() => setAuth(false)); }, [load]);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  useEffect(() => { const f = e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, [dirty]);

  const set = (path, v) => setDraft(d => setIn(d, path, v));
  const save = async () => {
    setBusy(true);
    try { await api("/api/site", { method: "PUT", body: JSON.stringify(draft) }); setSaved(draft); toast("Tersimpan. Web langsung berubah."); }
    catch (e) { if (e.status === 401) { setAuth(false); toast("Sesi habis. Masuk lagi, perubahan lo belum hilang."); } else toast(e.message); }
    setBusy(false);
  };
  const logout = async () => { await api("/api/logout", { method: "POST" }).catch(() => { }); setAuth(false); };

  if (auth === null) return <div className="grid min-h-screen place-items-center">Memuat...</div>;
  if (!auth) return <Login onDone={() => { setAuth(true); draft ? null : load(); }} />;
  if (!draft) return <div className="grid min-h-screen place-items-center">Memuat...</div>;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-[60] flex w-full flex-col border-r border-foreground/10 bg-background/95 backdrop-blur-xl sm:w-[400px]" aria-label="Panel pengaturan">
        <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-4 py-3">
          <h1 className="display-title headline-fill text-3xl">Admin</h1>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPreview(v => !v)} aria-label="Tampilkan atau sembunyikan pratinjau" className="btn-ghost !p-2.5 sm:hidden">{preview ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            <button onClick={logout} aria-label="Keluar" className="btn-ghost !p-2.5"><LogOut size={15} /></button>
            <button onClick={save} disabled={busy || !dirty} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition disabled:opacity-40"><Save size={15} />{busy ? "..." : dirty ? "Simpan" : "Tersimpan"}</button>
          </div>
        </div>
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-foreground/10 px-3 py-2 [scrollbar-width:none]">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition", tab === k ? "bg-primary text-primary-foreground" : "hover:bg-foreground/10")}>{l}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24" role="tabpanel">
          {tab === "tema" && <TabTema d={draft} set={set} />}
          {tab === "teks" && <TabTeks d={draft} set={set} />}
          {tab === "konten" && <TabKonten d={draft} set={set} />}
          {tab === "produk" && <TabProduk d={draft} set={set} />}
          {tab === "foto" && <TabFoto d={draft} set={set} />}
          {tab === "bayar" && <TabBayar d={draft} set={set} />}
          {tab === "riwayat" && <TabRiwayat onRestored={load} toast={toast} />}
        </div>
      </aside>
      <div className={cn("sm:ml-[400px]", !preview && "hidden sm:block")} style={{ transform: "translateZ(0)" }}>
        <Site site={draft} preview />
      </div>
      {msg && <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-xl">{msg}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Admin />);
