import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, MessageCircle as MsgIcon, BarChart3, Scissors, ShoppingBag as BagIcon, GraduationCap, Image as ImageIcon, MoveHorizontal, Video, Bot, Camera, Code2, Globe, Heart, Star, Zap, Music, Mail, Phone, Briefcase, Lightbulb, Rocket, Wand2, FileText, Users, Sparkles as SparkIcon, ExternalLink } from "lucide-react";
import { ArrowRight, ArrowUp, ArrowDown, ShoppingBag, Palette, X, Plus, Minus, Check, MessageCircle, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { AuroraBackground, Grain, Spotlight, ShimmerButton, NumberTicker, Marquee, MagicCard, BlurFade, RevealTitle } from "../components/magic/effects";
import { THEMES, applyTheme } from "../lib/themes";
import { cn, rp, safeUrl, pad2, storageGet, storageSet } from "../lib/utils";

export const ICONS = { BookOpen, MessageCircle: MsgIcon, BarChart3, Scissors, ShoppingBag: BagIcon, GraduationCap, Video, Bot, Camera, Code2, Globe, Heart, Star, Zap, Music, Mail, Phone, Briefcase, Lightbulb, Rocket, Wand2, FileText, Users, Sparkles: SparkIcon };
const Icon = ({ name, ...p }) => { const C = ICONS[name] || SparkIcon; return <C {...p} />; };
const SECTION_LABEL = { cover: "Home", about: "About", services: "Services", process: "Cara kerja", work: "Work", products: "Produk", preset: "Preset", contact: "Contact" };

/* ---------- foto dengan placeholder ---------- */
function Photo({ src, alt = "", className, label }) {
  const u = safeUrl(src);
  if (u) return <img src={u} alt={alt} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  return (
    <div className={cn("grid h-full w-full place-items-center bg-gradient-to-br from-card/60 to-primary/20 text-muted-foreground", className)} role="img" aria-label={label || "Foto belum diisi"}>
      <div className="text-center"><ImageIcon className="mx-auto mb-1 opacity-60" size={26} /><span className="text-[11px] font-semibold uppercase tracking-widest opacity-70">{label || "Foto"}</span></div>
    </div>
  );
}

function SectionHead({ title, sub, id }) {
  return (
    <div className="mb-10 sm:mb-14">
      <RevealTitle as="h2" text={title} className="text-[clamp(2.6rem,9vw,6.5rem)]" />
      {sub && <BlurFade delay={0.15}><p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">{sub}</p></BlurFade>}
    </div>
  );
}

/* ---------- header ---------- */
function Header({ site, visitor, setVisitor, cartCount, openCart, order }) {
  const [pal, setPal] = useState(false);
  const allowed = (site.visitor.presets || []).filter(k => THEMES[k]);
  const links = order.filter(s => s !== "cover");
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 !rounded-full px-4 py-2.5 sm:px-6">
        <a href="#cover" className="flex items-baseline gap-2 font-extrabold tracking-tight">
          <span className="text-base">{site.brand.name}</span><span className="hidden text-xs font-medium text-muted-foreground sm:inline">{site.brand.sub}</span>
        </a>
        <nav aria-label="Menu utama" className="hidden items-center gap-1 lg:flex">
          {links.map(s => <a key={s} href={`#${s}`} className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/75 transition hover:bg-card/60 hover:text-foreground">{SECTION_LABEL[s]}</a>)}
        </nav>
        <div className="relative flex items-center gap-1.5">
          {site.visitor.on && allowed.length > 1 && (
            <>
              <button aria-label="Ganti tampilan" aria-expanded={pal} onClick={() => setPal(v => !v)} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-card/60"><Palette size={19} /></button>
              <AnimatePresence>
                {pal && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .96 }}
                    className="glass absolute right-0 top-12 w-56 !rounded-2xl p-3" role="menu">
                    <p className="eyebrow mb-2 px-1">Tampilan</p>
                    <div className="grid grid-cols-2 gap-2">
                      {allowed.map(k => (
                        <button key={k} role="menuitemradio" aria-checked={visitor === k} onClick={() => { setVisitor(k); setPal(false); }}
                          className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition", visitor === k ? "border-primary bg-primary/10" : "border-transparent bg-card/50 hover:bg-card/80")}>
                          <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${THEMES[k].background} 50%, ${THEMES[k].primary} 50%)` }} />{THEMES[k].label}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setVisitor(null); setPal(false); }} className="mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Kembali ke bawaan</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          <button onClick={openCart} aria-label={`Keranjang, ${cartCount} item`} className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-105">
            <ShoppingBag size={18} />
            {cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------- slide navigation (panah + titik) ---------- */
function SlideNav({ order, active }) {
  const idx = Math.max(0, order.indexOf(active));
  const go = i => document.getElementById(order[Math.min(order.length - 1, Math.max(0, i))])?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav aria-label="Navigasi slide" className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
      <button aria-label="Slide sebelumnya" disabled={idx === 0} onClick={() => go(idx - 1)} className="glass grid h-9 w-9 place-items-center !rounded-full transition hover:scale-110 disabled:opacity-30"><ArrowUp size={16} /></button>
      <ol className="flex flex-col gap-2.5">
        {order.map((s, i) => (
          <li key={s}><button aria-label={`Ke ${SECTION_LABEL[s]}`} aria-current={i === idx} onClick={() => go(i)} title={SECTION_LABEL[s]}
            className={cn("block w-2 rounded-full bg-foreground/35 transition-all", i === idx ? "h-7 bg-primary" : "h-2 hover:bg-foreground/60")} /></li>
        ))}
      </ol>
      <button aria-label="Slide berikutnya" disabled={idx === order.length - 1} onClick={() => go(idx + 1)} className="glass grid h-9 w-9 place-items-center !rounded-full transition hover:scale-110 disabled:opacity-30"><ArrowDown size={16} /></button>
    </nav>
  );
}

/* ---------- sections ---------- */
function Cover({ site }) {
  const t = site.text;
  return (
    <section id="cover" className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-24">
      {site.theme.aurora !== false && <AuroraBackground />}
      <Spotlight />
      <div className="section-pad relative grid min-w-0 items-center gap-8 pb-16 lg:grid-cols-[1.15fr_.85fr] [&>*]:min-w-0">
        <div>
          <BlurFade><p className="eyebrow mb-5 flex items-center gap-2"><Sparkles size={14} />{t.coverEyebrow}</p></BlurFade>
          <RevealTitle as="h1" text={t.coverTitle} className="text-[clamp(3rem,19vw,11.5rem)] lg:text-[clamp(5rem,9vw,9.5rem)]" />
          <BlurFade delay={.3}><p className="mt-6 text-lg font-extrabold uppercase tracking-[.12em] text-foreground/80 sm:text-xl">{t.coverSub}</p></BlurFade>
          <BlurFade delay={.4}><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t.coverLead}</p></BlurFade>
          <BlurFade delay={.5}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ShimmerButton as="a" href="#products">{t.coverCta}<ArrowRight size={16} /></ShimmerButton>
              <a href="#contact" className="btn-ghost">Hubungi gw</a>
            </div>
          </BlurFade>
        </div>
        <BlurFade delay={.25} className="relative mx-auto w-full max-w-sm lg:max-w-md">
          <div className="glass relative aspect-[4/5] overflow-hidden"><Photo src={site.imgs.person} label="Foto kamu (cut-out)" alt={site.brand.name} /></div>
          <div className="glass absolute -bottom-5 -left-4 flex items-center gap-3 !rounded-2xl px-4 py-3 sm:-left-8">
            {site.stats[0] && <><span className="display-title headline-fill text-5xl"><NumberTicker value={site.stats[0].v} />{site.stats[0].suffix}</span><span className="max-w-[7rem] text-xs font-semibold leading-tight text-muted-foreground">{site.stats[0].l}</span></>}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}

function About({ site }) {
  const t = site.text;
  return (
    <section id="about" className="relative py-20 sm:py-28">
      <div className="section-pad">
        <SectionHead title={t.aboutTitle} />
        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <BlurFade><div className="glass aspect-[4/3] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[320px]"><Photo src={site.imgs.about} label="Foto about" /></div></BlurFade>
          <div className="space-y-6">
            <BlurFade delay={.1}><MagicCard className="p-6 sm:p-8"><p className="text-base leading-relaxed sm:text-lg">{t.aboutText}</p></MagicCard></BlurFade>
            <div className="grid gap-3 sm:grid-cols-2">
              {site.experience.map((e, i) => (
                <BlurFade key={i} delay={.12 + i * .06}><MagicCard className="h-full p-5"><p className="eyebrow">{e.when}</p><h3 className="mt-1 font-extrabold leading-tight">{e.title}</h3><p className="text-sm text-muted-foreground">{e.place}</p></MagicCard></BlurFade>
              ))}
            </div>
          </div>
        </div>
        <Marquee className="mt-12" duration="32s">
          {site.chips.map(c => <span key={c} className="glass whitespace-nowrap !rounded-full px-5 py-2 text-sm font-bold">{c}</span>)}
        </Marquee>
      </div>
    </section>
  );
}

function Services({ site }) {
  return (
    <section id="services" className="py-20 sm:py-28">
      <div className="section-pad">
        <SectionHead title={site.text.servicesTitle} sub={site.text.servicesSub} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {site.services.map((s, i) => (
            <BlurFade key={i} delay={i * .06}>
              <MagicCard className="h-full p-6">
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Icon name={s.icon} size={22} /></span>
                <h3 className="text-xl font-extrabold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <span className="mt-5 inline-block text-xs font-bold text-muted-foreground/70">{pad2(i + 1)}</span>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process({ site }) {
  return (
    <section id="process" className="py-20 sm:py-28">
      <div className="section-pad">
        <SectionHead title={site.text.processTitle} sub={site.text.processText} />
        <ol className="grid gap-4 md:grid-cols-4">
          {site.process.map((p, i) => (
            <BlurFade key={i} delay={i * .08}>
              <li className="glass relative h-full overflow-hidden p-6">
                <span className="display-title headline-fill absolute -right-1 -top-3 text-8xl opacity-50">{i + 1}</span>
                <h3 className="relative mt-10 text-xl font-extrabold">{p.title}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground">{p.desc}</p>
              </li>
            </BlurFade>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Work({ site }) {
  const ref = useRef(null);
  const scroll = d => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * .8), behavior: "smooth" });
  return (
    <section id="work" className="py-20 sm:py-28">
      <div className="section-pad">
        <div className="flex items-end justify-between gap-4">
          <SectionHead title={site.text.workTitle} sub={site.text.workSub} />
          <div className="mb-14 hidden gap-2 sm:flex">
            <button aria-label="Geser kiri" onClick={() => scroll(-1)} className="glass grid h-11 w-11 place-items-center !rounded-full hover:scale-105"><ChevronLeft size={20} /></button>
            <button aria-label="Geser kanan" onClick={() => scroll(1)} className="glass grid h-11 w-11 place-items-center !rounded-full hover:scale-105"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-[max(2rem,calc((100vw-72rem)/2+2rem))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" tabIndex={0} aria-label="Daftar karya">
        {site.works.map((w, i) => {
          const href = safeUrl(w.link);
          const Tag = href ? "a" : "div";
          return (
            <Tag key={w.id || i} {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})} className="group w-[78vw] shrink-0 snap-start sm:w-[340px]">
              <MagicCard className="h-full">
                <div className="aspect-[4/3] overflow-hidden"><Photo src={w.img} label={w.nama} className="transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5">
                  <p className="eyebrow">{w.tag}</p><h3 className="mt-1 text-xl font-extrabold">{w.nama}</h3><p className="mt-1 text-sm text-muted-foreground">{w.sub}</p>
                </div>
              </MagicCard>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}

function Products({ site, cart, add }) {
  const tags = useMemo(() => ["Semua", ...new Set(site.products.filter(p => !p.hidden).map(p => p.tag).filter(Boolean))], [site.products]);
  const [tag, setTag] = useState("Semua");
  const [open, setOpen] = useState(null);
  const visible = site.products.filter(p => !p.hidden);
  const list = visible.filter(p => tag === "Semua" || p.tag === tag);
  return (
    <section id="products" className="py-20 sm:py-28">
      <div className="section-pad">
        <SectionHead title={site.text.productsTitle} sub={site.text.productsSub} />
        <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter produk">
          {tags.map(t => <button key={t} role="tab" aria-selected={tag === t} onClick={() => setTag(t)} className={cn("rounded-full px-4 py-2 text-sm font-bold transition", tag === t ? "bg-primary text-primary-foreground" : "glass !rounded-full hover:bg-card/80")}>{t}</button>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => {
            const soon = p.status === "segera", priced = p.harga != null && p.harga !== "";
            const inCart = cart[p.id] || 0;
            return (
              <BlurFade key={p.id} delay={i * .05}>
                <MagicCard className="flex h-full flex-col">
                  <button type="button" onClick={() => setOpen(p.id)} aria-label={`Lihat detail ${p.nama}`} className="relative block aspect-[16/10] w-full overflow-hidden text-left"><Photo src={p.imgs?.[0]} label={p.nama} />{p.badge && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase text-primary-foreground">{p.badge}</span>}{p.imgs?.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">{p.imgs.length} foto</span>}</button>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2"><p className="eyebrow">{p.tag}</p>{soon && <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-bold uppercase text-background">Segera hadir</span>}</div>
                    <h3 className="mt-1 text-xl font-extrabold leading-tight"><button type="button" onClick={() => setOpen(p.id)} className="text-left hover:underline">{p.nama}</button></h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.desk}</p>
                    {p.fitur?.length > 0 && <ul className="mt-3 space-y-1 text-sm">{p.fitur.map(f => <li key={f} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-primary" />{f}</li>)}</ul>}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <div><p className="text-lg font-extrabold">{priced ? rp(p.harga) : "Tanya harga"}</p>{priced && p.satuan && <p className="-mt-0.5 text-xs text-muted-foreground">{p.satuan}</p>}</div>
                      <button disabled={soon} onClick={() => add(p.id)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100">
                        {soon ? "Segera" : inCart ? <>Tambah ({inCart})</> : <>{priced ? "Beli" : "Pesan"}<Plus size={15} /></>}
                      </button>
                    </div>
                  </div>
                </MagicCard>
              </BlurFade>
            );
          })}
        </div>
        {list.length === 0 && <p className="glass p-8 text-center text-muted-foreground">Belum ada produk. Tambah lewat menu admin.</p>}
      </div>
      <ProductModal product={visible.find(p => p.id === open)} onClose={() => setOpen(null)} add={id => { setOpen(null); add(id); }} />
    </section>
  );
}

function ProductModal({ product: p, onClose, add }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setI(0); setCopied(false); }, [p?.id]);
  useEffect(() => { if (!p) return; const k = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [p, onClose]);
  const imgs = p?.imgs?.filter(Boolean) || [];
  const priced = p && p.harga != null && p.harga !== "";
  const link = safeUrl(p?.link);
  return (
    <AnimatePresence>
      {p && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={p.nama} className="glass fixed inset-x-3 bottom-3 top-3 z-50 mx-auto flex max-w-4xl flex-col overflow-hidden !bg-card/95 md:inset-y-8"
            initial={{ opacity: 0, y: 30, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }}>
            <button aria-label="Tutup" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white"><X size={18} /></button>
            <div className="grid flex-1 overflow-y-auto md:grid-cols-2">
              <div className="p-4 md:p-5">
                <div className="aspect-square overflow-hidden rounded-2xl"><Photo src={imgs[i]} label={p.nama} /></div>
                {imgs.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{imgs.map((u, k) => <button key={k} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`} className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2", k === i ? "border-primary" : "border-transparent opacity-70")}><img src={u} alt="" className="h-full w-full object-cover" /></button>)}</div>}
              </div>
              <div className="flex flex-col p-5 md:py-7 md:pl-1 md:pr-7">
                <p className="eyebrow">{p.tag}{p.badge && ` · ${p.badge}`}</p>
                <h3 className="mt-1 text-2xl font-extrabold leading-tight">{p.nama}</h3>
                <p className="mt-2 text-2xl font-extrabold text-primary">{priced ? rp(p.harga) : "Tanya harga"}<span className="ml-1 text-sm font-semibold text-muted-foreground">{priced && p.satuan}</span></p>
                {p.desk && <p className="mt-3 text-sm text-muted-foreground">{p.desk}</p>}
                {p.caption && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{p.caption}</p>}
                {p.fitur?.length > 0 && <ul className="mt-4 space-y-1.5 text-sm">{p.fitur.map(f => <li key={f} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-primary" />{f}</li>)}</ul>}
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {p.status !== "segera" ? <button onClick={() => add(p.id)} className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">{priced ? "Beli sekarang" : "Pesan"}</button> : <span className="flex-1 rounded-full bg-foreground/10 px-5 py-3 text-center text-sm font-bold">Segera hadir</span>}
                  {link && <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink size={15} />Link produk</a>}
                  {p.caption && <button onClick={() => { navigator.clipboard?.writeText(p.caption); setCopied(true); setTimeout(() => setCopied(false), 1800); }} className="btn-ghost">{copied ? "Tersalin" : "Salin caption"}</button>}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PresetSlider({ site }) {
  const [pos, setPos] = useState(50);
  const box = useRef(null);
  const move = useCallback(clientX => { const r = box.current.getBoundingClientRect(); setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))); }, []);
  const hasPair = safeUrl(site.imgs.before) && safeUrl(site.imgs.after);
  return (
    <section id="preset" className="py-20 sm:py-28">
      <div className="section-pad">
        <SectionHead title={site.text.presetTitle} sub={site.text.presetSub} />
        <div className="glass relative mx-auto aspect-[16/10] max-w-3xl touch-none select-none overflow-hidden" ref={box}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
          onPointerMove={e => { if (e.buttons || e.pointerType === "touch") move(e.clientX); }}>
          <div className="absolute inset-0"><Photo src={site.imgs.after} label="Sesudah" /></div>
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Photo src={site.imgs.before} label="Sebelum" className="grayscale-[.6]" /></div>
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase text-white">Sebelum</span>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase text-white">Sesudah</span>
          <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgb(0_0_0/.4)]" style={{ left: `${pos}%` }}>
            <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-lg"><MoveHorizontal size={18} /></span>
          </div>
          <input type="range" min="0" max="100" value={pos} onChange={e => setPos(+e.target.value)} aria-label="Geser perbandingan sebelum dan sesudah" className="absolute inset-x-0 bottom-0 h-full w-full cursor-ew-resize opacity-0" />
        </div>
        {!hasPair && <p className="mt-3 text-center text-sm text-muted-foreground">Foto sebelum & sesudah belum diisi. Isi lewat panel admin.</p>}
      </div>
    </section>
  );
}

function Contact({ site }) {
  const wa = (site.pay.wa || "").replace(/\D/g, "");
  const t = site.text;
  return (
    <section id="contact" className="relative isolate overflow-hidden py-24 sm:py-32">
      {site.theme.aurora !== false && <AuroraBackground className="opacity-70" />}
      <div className="section-pad relative text-center">
        <BlurFade><p className="eyebrow mb-4">{t.contactSub}</p></BlurFade>
        <RevealTitle as="h2" text={t.contactTitle} className="text-[clamp(3.5rem,14vw,10rem)]" />
        <BlurFade delay={.2}><p className="mx-auto mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">{t.contactText}</p></BlurFade>
        <BlurFade delay={.3}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {wa ? <ShimmerButton as="a" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />Chat WhatsApp</ShimmerButton>
              : <span className="glass !rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground">Nomor WhatsApp belum diisi di admin</span>}
          </div>
        </BlurFade>
        <p className="mt-16 text-xs text-muted-foreground">© {new Date().getFullYear()} {site.brand.name} {site.brand.sub}</p>
      </div>
    </section>
  );
}

/* ---------- keranjang & checkout ---------- */
function CartDrawer({ open, onClose, site, cart, setQty, clear }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [method, setMethod] = useState("qris");
  const items = site.products.filter(p => cart[p.id]);
  const total = items.reduce((a, p) => a + (p.harga || 0) * cart[p.id], 0);
  const unpriced = items.some(p => p.harga == null || p.harga === "");
  const pay = site.pay, wa = (pay.wa || "").replace(/\D/g, "");
  const methods = [pay.qrisOn && ["qris", "QRIS"], pay.bankOn && ["bank", "Transfer bank"], pay.ewOn && ["ew", "E-wallet"]].filter(Boolean);
  useEffect(() => { if (open) setStep(0); }, [open]);
  useEffect(() => { if (methods.length && !methods.find(m => m[0] === method)) setMethod(methods[0][0]); }, [methods.length]); // eslint-disable-line
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); if (open) { window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; } return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [open, onClose]);
  const text = `Halo, mau pesan:%0A${items.map(p => `- ${p.nama} x${cart[p.id]}${p.harga ? ` (${rp(p.harga * cart[p.id])})` : ""}`).join("%0A")}%0A${unpriced ? "Harga: mohon dikonfirmasi%0A" : `Total: ${rp(total)}%0A`}Metode: ${methods.find(m => m[0] === method)?.[1] || "-"}%0ANama: ${encodeURIComponent(name || "-")}`;
  const steps = ["Produk", "Pembayaran", "Selesai"];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" aria-label="Keranjang" className="glass fixed inset-y-3 right-3 z-50 flex w-[min(100%-1.5rem,26rem)] flex-col !bg-card/90 p-5"
            initial={{ x: "110%" }} animate={{ x: 0 }} exit={{ x: "110%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold">Keranjang</h2><button aria-label="Tutup" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-foreground/10"><X size={18} /></button></div>
            <ol className="mb-5 flex gap-1.5" aria-label="Langkah">{steps.map((s, i) => <li key={s} aria-current={i === step} className={cn("flex-1 rounded-full py-1.5 text-center text-[11px] font-bold", i <= step ? "bg-primary text-primary-foreground" : "bg-foreground/10 text-muted-foreground")}>{i + 1}. {s}</li>)}</ol>
            <div className="flex-1 overflow-y-auto">
              {step === 0 && (items.length === 0 ? <p className="py-10 text-center text-muted-foreground">Keranjang masih kosong.</p> : (
                <ul className="space-y-3">{items.map(p => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-foreground/5 p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><Photo src={p.imgs?.[0]} label="" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{p.nama}</p><p className="text-xs text-muted-foreground">{p.harga != null && p.harga !== "" ? rp(p.harga) : "Tanya harga"}</p></div>
                    <div className="flex items-center gap-1"><button aria-label="Kurangi" onClick={() => setQty(p.id, cart[p.id] - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10"><Minus size={14} /></button><span className="w-5 text-center text-sm font-bold">{cart[p.id]}</span><button aria-label="Tambah" onClick={() => setQty(p.id, cart[p.id] + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10"><Plus size={14} /></button></div>
                  </li>))}</ul>))}
              {step === 1 && (
                <div className="space-y-4">
                  <label className="block text-sm font-bold">Nama kamu<input className="field mt-1.5 font-normal" value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" autoComplete="name" /></label>
                  {methods.length === 0 ? <p className="text-sm text-muted-foreground">Metode pembayaran belum diaktifkan. Pesanan akan dikonfirmasi lewat WhatsApp.</p> : (
                    <fieldset><legend className="mb-1.5 text-sm font-bold">Metode bayar</legend>
                      <div className="space-y-2">{methods.map(([k, l]) => <label key={k} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold", method === k ? "border-primary bg-primary/10" : "border-foreground/15")}><input type="radio" name="m" checked={method === k} onChange={() => setMethod(k)} className="accent-[rgb(var(--primary))]" />{l}</label>)}</div>
                      {method === "qris" && safeUrl(pay.qris) && <img src={pay.qris} alt="Kode QRIS" className="mx-auto mt-4 w-48 rounded-xl bg-white p-2" />}
                      {method === "qris" && !safeUrl(pay.qris) && <p className="mt-3 text-xs text-muted-foreground">Gambar QRIS dikirim lewat WhatsApp setelah pesan.</p>}
                      {method === "bank" && pay.bank && <p className="mt-3 whitespace-pre-line rounded-xl bg-foreground/5 p-3 text-sm">{pay.bank}</p>}
                      {method === "ew" && pay.ew && <p className="mt-3 whitespace-pre-line rounded-xl bg-foreground/5 p-3 text-sm">{pay.ew}</p>}
                    </fieldset>)}
                </div>)}
              {step === 2 && (
                <div className="py-6 text-center"><span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={26} /></span>
                  <h3 className="text-lg font-extrabold">Tinggal kirim pesanan</h3><p className="mt-2 text-sm text-muted-foreground">Klik tombol di bawah. Pesan sudah terisi otomatis lewat WhatsApp.</p>
                  {!wa && <p className="mt-3 rounded-xl bg-foreground/10 p-3 text-sm">Nomor WhatsApp penjual belum diisi di admin.</p>}</div>)}
            </div>
            <div className="mt-4 border-t border-foreground/10 pt-4">
              <div className="mb-3 flex justify-between font-extrabold"><span>Total</span><span>{unpriced ? (total ? `${rp(total)} + tanya harga` : "Tanya harga") : rp(total)}</span></div>
              <div className="flex gap-2">
                {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-ghost">Kembali</button>}
                {step < 2 && <button disabled={!items.length || (step === 1 && !name.trim())} onClick={() => setStep(s => s + 1)} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Lanjut</button>}
                {step === 2 && <a aria-disabled={!wa} href={wa ? `https://wa.me/${wa}?text=${text}` : undefined} target="_blank" rel="noopener noreferrer" onClick={() => wa && setTimeout(clear, 400)} className={cn("flex-1 rounded-full bg-primary py-3 text-center text-sm font-bold text-primary-foreground", !wa && "pointer-events-none opacity-40")}>Kirim lewat WhatsApp</a>}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------- halaman utama ---------- */
export default function Site({ site, preview = false }) {
  const [visitor, setVisitorState] = useState(() => storageGet("afs-theme", null));
  const [cart, setCart] = useState(() => storageGet("afs-cart", {}));
  const [cartOpen, setCartOpen] = useState(false);
  const [active, setActive] = useState("cover");
  const order = useMemo(() => site.sections.filter(s => s.on).map(s => s.id), [site.sections]);

  const setVisitor = k => { setVisitorState(k); storageSet("afs-theme", k); };
  useEffect(() => { applyTheme(site.theme, site.visitor.on && !preview ? visitor : null); }, [site.theme, site.visitor.on, visitor, preview]);
  useEffect(() => { storageSet("afs-cart", cart); }, [cart]);
  useEffect(() => { document.title = `${site.brand.name} ${site.brand.sub}`; }, [site.brand]);
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    order.forEach(id => { const el = document.getElementById(id); el && io.observe(el); });
    return () => io.disconnect();
  }, [order]);

  const add = id => { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); setCartOpen(true); };
  const setQty = (id, q) => setCart(c => { const n = { ...c }; q <= 0 ? delete n[id] : (n[id] = q); return n; });
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const map = { cover: Cover, about: About, services: Services, process: Process, work: Work, preset: PresetSlider, contact: Contact };

  return (
    <div className="relative">
      {site.theme.grain !== false && <Grain />}
      <Header site={site} visitor={visitor} setVisitor={setVisitor} cartCount={count} openCart={() => setCartOpen(true)} order={order} />
      <SlideNav order={order} active={active} />
      <main>
        {order.map(id => id === "products" ? <Products key={id} site={site} cart={cart} add={add} /> : map[id] ? (() => { const C = map[id]; return <C key={id} site={site} />; })() : null)}
      </main>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} site={site} cart={cart} setQty={setQty} clear={() => setCart({})} />
    </div>
  );
}
