import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, H} from './theme';
import {pop} from './timing';

// Sistem subtitle multi-gaya. Waktu kata disebar sebanding panjang huruf
// (+ jeda di tanda baca) pada rentang suara scene.
export type CapStyle = 'pill' | 'kinetik' | 'sticker' | 'neon' | 'stabilo' | 'mix';
export const MIX: Exclude<CapStyle, 'pill' | 'mix'>[] = ['kinetik', 'sticker', 'neon', 'stabilo'];

type W = {t: string; from: number; to: number; emph: boolean};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const makeWords = (text: string, startF: number, endF: number, emph: string[] = [], wt0?: number[]): W[] => {
  const raw = text.split(/\s+/).filter(Boolean);
  const em = new Set(emph.map(norm));
  if (wt0 && wt0.length === raw.length) {
    return raw.map((t, i) => ({t, from: wt0[i], to: i < raw.length - 1 ? wt0[i + 1] : endF, emph: em.has(norm(t)) || (t.length > 2 && t === t.toUpperCase() && /[A-Z]/.test(t))}));
  }
  const wt = raw.map((w) => w.length + (/[.!?]$/.test(w) ? 5 : /[,:;]$/.test(w) ? 3 : 0) + 2);
  const tot = wt.reduce((a, b) => a + b, 0) || 1;
  let acc = startF;
  return raw.map((t, i) => {
    const from = Math.round(acc);
    acc += ((endF - startF) * wt[i]) / tot;
    return {t, from, to: Math.round(acc), emph: em.has(norm(t)) || (t.length > 2 && t === t.toUpperCase() && /[A-Z]/.test(t))};
  });
};

// tampilkan kata dalam "halaman" maks 5 kata / 2 baris biar besar & terbaca
const paginate = (ws: W[], max = 5, maxCh = 32): W[][] => {
  const pages: W[][] = [];
  let cur: W[] = [];
  ws.forEach((w) => {
    cur.push(w);
    const len = cur.map((x) => x.t).join(' ').length;
    if (cur.length >= max || len >= maxCh || /[.!?]$/.test(w.t)) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  // gabung halaman 1 kata ke sebelumnya
  const out: W[][] = [];
  pages.forEach((p) => { if (p.length === 1 && out.length && out[out.length - 1].length < max) out[out.length - 1].push(...p); else out.push(p); });
  return out;
};

const STROKE = (px: number) => `-${px}px -${px}px 0 #111, ${px}px -${px}px 0 #111, -${px}px ${px}px 0 #111, ${px}px ${px}px 0 #111, 0 ${px * 2}px 0 #111`;

export const CaptionKit: React.FC<{text: string; startF: number; endF: number; style: Exclude<CapStyle, 'pill' | 'mix'>; emph?: string[]; top: number; height: number; wt?: number[]}> = ({text, startF, endF, style, emph, top, height, wt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ws = makeWords(text, startF, endF, emph, wt);
  const pages = paginate(ws);
  const page = pages.find((p) => f >= p[0].from && f < (p[p.length - 1].to + 1)) ?? (f >= ws[ws.length - 1].to ? pages[pages.length - 1] : pages[0]);
  const pf = page[0].from;
  const enter = pop(f, fps, pf, 10);
  const active = page.find((w) => f >= w.from && f < w.to) ?? (f >= page[page.length - 1].to ? undefined : page[0]);

  const word = (w: W, i: number) => {
    const isA = active === w;
    const done = f >= w.to;
    const ws2 = pop(f, fps, w.from, 8);
    const k = f - w.from;
    const jump = k >= 0 && k < 14 ? Math.sin((k / 14) * Math.PI) * -(w.emph ? 20 : 11) : 0;
    const wob = isA ? (i % 2 ? 1 : -1) * 2.2 * Math.exp(-Math.max(0, k) / 9) * Math.cos(Math.max(0, k) * 0.9) : 0;
    const common: React.CSSProperties = {display: 'inline-block', position: 'relative', margin: '0 11px', transform: `translateY(${jump}px) rotate(${w.emph ? -2 + wob : wob}deg) scale(${isA ? 1 + (w.emph ? 0.07 : 0.05) * ws2 : 1})`};
    const squig = w.emph && f >= w.from ? (
      <svg key="sq" width="100%" height="16" viewBox="0 0 100 16" preserveAspectRatio="none" style={{position: 'absolute', left: 0, bottom: -10, overflow: 'visible', pointerEvents: 'none'}}>
        <path d="M2 9 Q14 1 26 9 T50 9 T74 9 T98 9" fill="none" stroke={style === 'stabilo' || style === 'sticker' ? '#E4167A' : C.lime} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, Math.max(0, k) / 9)} />
      </svg>
    ) : null;
    if (style === 'kinetik') {
      return <span key={i} style={{...common, color: isA ? '#111' : w.emph ? C.lime : '#fff', background: isA ? C.lime : 'transparent', borderRadius: 14, padding: '0 12px', opacity: done || isA ? 1 : 0.55}}>{w.t}{squig}</span>;
    }
    if (style === 'sticker') {
      return <span key={i} style={{...common, color: isA ? '#E4167A' : '#111', opacity: done || isA ? 1 : 0.35, textDecoration: w.emph ? 'underline' : 'none', textDecorationColor: '#E4167A', textDecorationThickness: 8, textUnderlineOffset: 6}}>{w.t}{squig}</span>;
    }
    if (style === 'neon') {
      return <span key={i} style={{...common, color: isA ? C.lime : w.emph ? '#FFE14A' : '#fff', textShadow: STROKE(5) + (isA ? ', 0 0 28px rgba(200,241,53,.9)' : ''), opacity: done || isA ? 1 : 0.5}}>{w.t}{squig}</span>;
    }
    // stabilo
    return <span key={i} style={{...common, color: '#111', background: w.emph ? 'linear-gradient(transparent 12%, #FFE14A 12%, #FFE14A 92%, transparent 92%)' : isA ? 'linear-gradient(transparent 12%, #C9F5E1 12%, #C9F5E1 92%, transparent 92%)' : 'none', padding: '0 8px', opacity: done || isA ? 1 : 0.4}}>{w.t}{squig}</span>;
  };

  const box: Record<string, React.CSSProperties> = {
    kinetik: {background: '#111', color: '#fff', borderRadius: 30, padding: '10px 22px', border: '5px solid #111', boxShadow: '0 8px 0 rgba(0,0,0,.25)', fontSize: 58, fontWeight: 800},
    sticker: {background: '#fff', borderRadius: 28, padding: '10px 24px', border: '6px solid #111', boxShadow: '8px 8px 0 #111', fontSize: 56, fontWeight: 800, transform: `rotate(${-1.5 * enter}deg)`},
    neon: {fontSize: 66, fontWeight: 900, padding: '0 10px', letterSpacing: '0.01em'},
    stabilo: {background: '#fff', borderRadius: 26, padding: '10px 24px', border: '5px solid #111', fontSize: 56, fontWeight: 800},
  };

  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, height, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'}}>
      <div key={pf} style={{fontFamily: FONT, lineHeight: 1.18, textAlign: 'center', maxWidth: 980, opacity: Math.min(1, enter * 2), transform: `translateY(${(1 - enter) * 24}px) scale(${0.92 + 0.08 * enter})`, ...box[style]}}>
        {page.map(word)}
      </div>
    </div>
  );
};

export const pickStyle = (cs: CapStyle | undefined, sceneIdx: number, override?: string): CapStyle => {
  const s = (override as CapStyle) ?? cs ?? 'pill';
  return s === 'mix' ? MIX[sceneIdx % MIX.length] : s;
};

export const CAP_BAND = {top: 893, height: 182};
export const _H = H;
