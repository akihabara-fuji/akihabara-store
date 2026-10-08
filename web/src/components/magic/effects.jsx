/*
  Komponen efek ala 21st.dev (pola dari Aceternity UI & Magic UI, ditulis ulang untuk proyek ini).
  AuroraBackground, Spotlight, ShimmerButton, NumberTicker, Marquee, BorderBeam, MagicCard, BlurFade, Grain.
*/
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useMotionTemplate, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

/* Aceternity: Aurora Background */
export function AuroraBackground({ className }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute -inset-[10px] opacity-60 blur-[10px] will-change-transform motion-safe:animate-aurora"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, rgb(var(--background)) 0%, rgb(var(--background)) 7%, transparent 10%, transparent 12%, rgb(var(--background)) 16%), repeating-linear-gradient(100deg, var(--aurora-1) 10%, var(--aurora-2) 15%, var(--aurora-3) 20%, var(--aurora-4) 25%, var(--aurora-5) 30%)",
          backgroundSize: "300%, 200%",
          backgroundPosition: "50% 50%, 50% 50%",
          maskImage: "radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)"
        }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 15% 85%, color-mix(in srgb, var(--aurora-3) 55%, transparent), transparent 70%)" }} />
    </div>
  );
}

/* Film grain halus */
export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] opacity-[.06] mix-blend-overlay"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
  );
}

/* Aceternity: Spotlight yang ikut kursor */
export function Spotlight({ className, size = 520 }) {
  const ref = useRef(null);
  const x = useMotionValue(-1000), y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 120, damping: 20 }), sy = useSpring(y, { stiffness: 120, damping: 20 });
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${sx}px ${sy}px, rgb(var(--glow) / .22), transparent 70%)`;
  useEffect(() => {
    const el = ref.current?.parentElement; if (!el) return;
    const move = e => { const r = el.getBoundingClientRect(); x.set(e.clientX - r.left); y.set(e.clientY - r.top); };
    el.addEventListener("pointermove", move); return () => el.removeEventListener("pointermove", move);
  }, [x, y]);
  return <motion.div ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0", className)} style={{ background: bg }} />;
}

/* Magic UI: Shimmer Button */
export function ShimmerButton({ children, className, as: Tag = "button", ...props }) {
  return (
    <Tag
      style={{ "--spread": "90deg", "--shimmer-color": "rgb(var(--primary-foreground))", "--radius": "999px", "--speed": "3s", "--cut": "0.08em", "--bg": "rgb(var(--primary))" }}
      className={cn("group relative z-0 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full border border-white/10 px-6 py-3.5 text-sm font-bold text-primary-foreground [background:var(--bg)] transition-transform duration-300 active:translate-y-px disabled:pointer-events-none disabled:opacity-50", className)}
      {...props}
    >
      <div className="-z-30 blur-[2px] absolute inset-0 overflow-visible [container-type:size]">
        <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
          <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] opacity-40" />
        </div>
      </div>
      {children}
      <div className="absolute inset-0 rounded-full shadow-[inset_0_-8px_10px_#ffffff1f] transition-all duration-300 group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]" />
      <div className="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]" />
    </Tag>
  );
}

/* Magic UI: Number Ticker */
export function NumberTicker({ value, className }) {
  const ref = useRef(null), inView = useInView(ref, { once: true, margin: "0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0), spring = useSpring(mv, { damping: 60, stiffness: 100 });
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => { if (inView) mv.set(value); }, [inView, value, mv]);
  useEffect(() => spring.on("change", v => setShown(Math.round(v))), [spring]);
  useEffect(() => { if (reduce) setShown(value); }, [reduce, value]);
  return <span ref={ref} className={cn("tabular-nums", className)}>{Number(shown).toLocaleString("id-ID")}</span>;
}

/* Magic UI: Marquee */
export function Marquee({ children, className, reverse, duration = "40s", repeat = 4 }) {
  return (
    <div style={{ "--duration": duration, "--gap": "1rem" }} className={cn("group flex overflow-hidden [gap:var(--gap)]", className)}>
      {Array.from({ length: repeat }).map((_, i) => (
        <div key={i} aria-hidden={i > 0} className={cn("flex shrink-0 justify-around [gap:var(--gap)] motion-safe:animate-marquee group-hover:[animation-play-state:paused]", reverse && "[animation-direction:reverse]")}>{children}</div>
      ))}
    </div>
  );
}

/* Magic UI: Border Beam */
export function BorderBeam({ size = 160, duration = 9, delay = 0 }) {
  return (
    <div aria-hidden style={{ "--size": size, "--duration": duration, "--delay": `-${delay}s` }}
      className="pointer-events-none absolute inset-0 rounded-[inherit] [border:1.5px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]
        after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:motion-safe:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,rgb(var(--glow)),rgb(var(--primary)),transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]" />
  );
}

/* Magic UI: Magic Card — kartu kaca dengan cahaya ikut kursor */
export function MagicCard({ children, className, as: Tag = "div", ...props }) {
  const x = useMotionValue(-300), y = useMotionValue(-300);
  const bg = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, rgb(var(--glow) / .28), transparent 75%)`;
  const MTag = motion[Tag] || motion.div;
  return (
    <MTag
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); x.set(e.clientX - r.left); y.set(e.clientY - r.top); }}
      onPointerLeave={() => { x.set(-300); y.set(-300); }}
      className={cn("glass group relative overflow-hidden rounded-xl", className)} {...props}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: bg }} />
      <div className="relative">{children}</div>
    </MTag>
  );
}

/* Magic UI: Blur Fade — muncul pelan dari blur */
export function BlurFade({ children, className, delay = 0, y = 14, as = "div" }) {
  const reduce = useReducedMotion();
  const M = motion[as] || motion.div;
  if (reduce) { const Tag = as; return <Tag className={className}>{children}</Tag>; }
  return (
    <M className={className} initial={{ opacity: 0, y, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }} transition={{ delay, duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}>
      {children}
    </M>
  );
}

/* Judul raksasa per huruf (text reveal) */
export function RevealTitle({ text, className, as: Tag = "h2" }) {
  const reduce = useReducedMotion();
  const words = String(text || "").split(" ");
  return (
    <Tag className={cn("display-title", className)} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap">
          {[...w].map((ch, i) => reduce ? <span key={i} className="headline-fill">{ch}</span> : (
            <motion.span key={i} className="headline-fill inline-block" initial={{ opacity: 0, y: "0.35em", rotateX: -60 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }} transition={{ delay: (wi * 4 + i) * 0.035, duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] }}>{ch}</motion.span>
          ))}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}
