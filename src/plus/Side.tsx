import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Mascot} from './Mascot';
import {C, FONT, sticker} from './theme';
import {pop, range, easeOut} from './timing';

/* Panel kiri-bawah 500x800: papan kerja tim AI.
   head (judul pendek) / rows (daftar cek per kata) / meter (alat ukur) / big (stempel angka) / cast (maskot beraksi + stinger simbol). */
export type SideRow = {at: number; label: string; icon?: string; ok?: number; bad?: number; hit?: number[]; color?: string; sub?: string};
export type SideCast = {name: string; emotion: string; at: number; x: number; y?: number; size?: number; emo?: {at: number; e: string}[]; say?: {at: number; t: string; color?: string}[]; flip?: boolean; hop?: number[]; out?: number};
export type SideSpec = {
  bg?: string;
  head?: {text: string; at?: number; color?: string; swap?: {at: number; text: string; color?: string}[]};
  rows?: SideRow[];
  rowsTop?: number; rowsH?: number; meterTop?: number;
  meter?: {at: number; label: string; keys: {f: number; v: number}[]; color?: string; fmt?: 'pct' | 'num' | 'x'; max?: number; flipLabel?: {at: number; label: string}[]; shake?: number[]};
  big?: {at: number; text: string; color?: string; out?: number; strike?: number; y?: number; size?: number; rot?: number; bg?: string}[];
  cast?: SideCast[];
  castTop?: number;
  pulse?: number[];
  burst?: {at: number; x: number; y: number; color?: string}[];
};

const INK = '#111';
const MiniIcon: React.FC<{n: string; s: number}> = ({n, s}) => {
  const p = {stroke: INK, strokeWidth: 8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <svg width={s} height={s} viewBox="0 0 100 100">
      {n === 'role' && <><circle cx="50" cy="32" r="18" {...p} fill="#fff" /><path d="M18 90C18 62 34 54 50 54C66 54 82 62 82 90Z" {...p} fill="#FFE45E" /></>}
      {n === 'ctx' && <><path d="M12 24H88V70H44L26 86V70H12Z" {...p} fill="#fff" /><path d="M28 44H72M28 58H56" {...p} strokeWidth={6} /></>}
      {n === 'limit' && <><path d="M34 10H66L90 34V66L66 90H34L10 66V34Z" {...p} fill="#FF7B72" /><path d="M28 50H72" stroke="#fff" strokeWidth={12} strokeLinecap="round" /></>}
      {n === 'check' && <><circle cx="50" cy="50" r="38" {...p} fill="#fff" /><path d="M30 52L45 67L72 34" {...p} stroke="#1B9E4B" strokeWidth={11} /></>}
      {n === 'steps' && <><path d="M10 78H34V56H58V34H82V12" {...p} strokeWidth={9} /><path d="M70 12H82V24" {...p} strokeWidth={8} /></>}
      {n === 'ask' && <><circle cx="50" cy="50" r="38" {...p} fill="#FFE45E" /><text x="50" y="68" textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize="56" fill={INK}>?</text></>}
      {n === 'warn' && <><path d="M50 12L92 84H8Z" {...p} fill="#FFE45E" /><path d="M50 38V60" {...p} strokeWidth={9} /><circle cx="50" cy="73" r="4.5" fill={INK} /></>}
      {n === 'bulb' && <><path d="M50 14C34 14 24 26 24 40C24 52 32 58 36 66H64C68 58 76 52 76 40C76 26 66 14 50 14Z" {...p} fill="#FFE45E" /><path d="M38 78H62M43 88H57" {...p} /></>}
      {n === 'crit' && <><circle cx="42" cy="42" r="26" {...p} fill="#fff" /><path d="M62 62L86 86" {...p} strokeWidth={11} /><path d="M32 42H52" {...p} strokeWidth={7} /></>}
      {n === 'risk' && <><path d="M50 8L92 82H8Z" {...p} fill="#FF7B72" /><path d="M50 36V58" stroke="#fff" strokeWidth={10} strokeLinecap="round" /><circle cx="50" cy="71" r="5" fill="#fff" /></>}
      {n === 'alt' && <><path d="M12 50H44M44 50L70 24M44 50L70 76" {...p} strokeWidth={9} /><circle cx="82" cy="22" r="9" fill="#4EE3A0" stroke={INK} strokeWidth={5} /><circle cx="82" cy="78" r="9" fill="#9CC8FF" stroke={INK} strokeWidth={5} /></>}
      {n === 'src' && <><path d="M24 12H62L78 28V88H24Z" {...p} fill="#fff" /><path d="M36 48H66M36 62H66M36 76H54" {...p} strokeWidth={6} /><path d="M70 66L80 76L98 52" {...p} stroke="#1B9E4B" strokeWidth={9} /></>}
      {n === 'hand' && <><path d="M30 90V52C30 44 42 44 42 52V34C42 26 54 26 54 34V30C54 22 66 22 66 30V34C66 28 78 28 78 36V66C78 80 68 90 54 90Z" {...p} fill="#FFD9B8" /></>}
      {n === 'x' && <path d="M22 22L78 78M78 22L22 78" {...p} stroke="#E5322D" strokeWidth={14} />}
      {n === 'doc' && <><path d="M24 12H60L76 28V88H24Z" {...p} fill="#fff" /><path d="M36 48H64M36 62H64M36 76H54" {...p} strokeWidth={6} /></>}
      {n === 'tangle' && <><path d="M12 62C24 18 46 92 54 42C60 8 84 72 90 28" {...p} strokeWidth={8} /><path d="M16 30C40 74 62 8 86 64" {...p} strokeWidth={8} /></>}
    </svg>
  );
};

const Stinger: React.FC<{t: string; color?: string; k: number}> = ({t, color, k}) => {
  const a = Math.min(1, k / 7), o = range(k, 34, 46, 1, 0);
  const sc = 0.4 + 0.6 * (a < 1 ? a : 1) + 0.12 * Math.exp(-k / 6) * Math.cos(k * 0.8);
  return (
    <div style={{position: 'absolute', left: '50%', top: -22, transform: `translate(-50%, ${(1 - a) * 18 - k * 0.2}px) scale(${sc}) rotate(${-4 + k * 0.1}deg)`, opacity: o, background: color ?? C.yellow, border: '5px solid #111', borderRadius: 22, padding: '2px 16px', fontFamily: FONT, fontWeight: 800, fontSize: 44, color: INK, whiteSpace: 'nowrap', boxShadow: '5px 5px 0 #111', zIndex: 9}}>{t}</div>
  );
};

export const SidePanel: React.FC<{side: SideSpec; note?: string}> = ({side}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rows = side.rows ?? [];
  const cast = side.cast ?? [];
  const bgPulse = (side.pulse ?? []).reduce((m, p) => Math.max(m, f >= p ? Math.exp(-(f - p) / 6) : 0), 0);
  const headTxt = (() => { let h = side.head; let t = h?.text ?? '', col = h?.color; (h?.swap ?? []).forEach((s) => { if (f >= s.at) { t = s.text; col = s.color ?? col; } }); return {t, col}; })();
  const hA = side.head ? pop(f, fps, side.head.at ?? 0, 10) : 0;
  const rowTop = side.rowsTop ?? 74;
  const mt = side.meter;
  let mv = 0;
  if (mt) { const ks = mt.keys; mv = ks[0].v; for (let i = 0; i < ks.length - 1; i++) { if (f >= ks[i].f) mv = ks[i].v + (ks[i + 1].v - ks[i].v) * range(f, ks[i].f, ks[i + 1].f, 0, 1, easeOut); } if (f >= ks[ks.length - 1].f) mv = ks[ks.length - 1].v; }
  const mmax = mt?.max ?? 100;
  const mlabel = mt ? ((mt.flipLabel ?? []).reduce((a, k) => (f >= k.at ? k.label : a), mt.label)) : '';
  const mshake = mt ? (mt.shake ?? []).reduce((m, s) => Math.max(m, f >= s && f < s + 14 ? (1 - (f - s) / 14) * 7 : 0), 0) : 0;
  const mcol = mt?.color ?? (mv / mmax > 0.66 ? '#4EE3A0' : mv / mmax > 0.33 ? '#FFC93C' : '#FF7B72');
  return (
    <div style={{position: 'absolute', inset: 0, background: side.bg ?? '#F2F4F8', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#D5DAE4 2.5px, transparent 2.5px)', backgroundSize: '26px 26px', opacity: 0.8}} />
      {bgPulse > 0.02 && <div style={{position: 'absolute', inset: 0, background: '#FFE45E', opacity: bgPulse * 0.35}} />}
      {side.head && (
        <div style={{position: 'absolute', left: 14, right: 14, top: 14, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.7 + 0.3 * hA})`, opacity: hA, background: headTxt.col ?? '#111', borderRadius: 16, border: '5px solid #111', fontFamily: FONT, fontWeight: 800, fontSize: 32, letterSpacing: 2, color: headTxt.col && headTxt.col !== '#111' ? '#111' : '#fff'}}>{headTxt.t}</div>
      )}
      {rows.map((r, i) => {
        if (f < r.at) return null;
        const a = pop(f, fps, r.at, 11);
        const top = rowTop + i * (side.rowsH ?? 92);
        const okA = r.ok !== undefined && f >= r.ok ? pop(f, fps, r.ok, 8) : 0;
        const badA = r.bad !== undefined && f >= r.bad ? pop(f, fps, r.bad, 8) : 0;
        const hit = (r.hit ?? []).reduce((m, h) => Math.max(m, f >= h ? Math.exp(-(f - h) / 6) * Math.cos((f - h) * 0.9) : 0), 0);
        const bgc = okA ? '#DFF8E6' : badA ? '#FFE0DC' : r.color ?? '#fff';
        return (
          <div key={i} style={{position: 'absolute', left: 14, right: 14, top, height: (side.rowsH ?? 92) - 10, transform: `translateX(${(1 - a) * -90}px) scale(${1 + hit * 0.06}) rotate(${hit * -1.4}deg)`, opacity: a, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', boxSizing: 'border-box', background: bgc, border: '5px solid #111', borderRadius: 20, boxShadow: '5px 5px 0 #111'}}>
            <div style={{width: 56, height: 56, flex: '0 0 56px', transform: `rotate(${(1 - a) * -90}deg)`}}><MiniIcon n={r.icon ?? 'doc'} s={56} /></div>
            <div style={{flex: 1, fontFamily: FONT, fontWeight: 800, fontSize: 36, color: INK, letterSpacing: 1}}>{r.label}</div>
            <div style={{width: 52, height: 52, borderRadius: 26, border: '5px solid #111', background: okA ? '#1B9E4B' : badA ? '#E5322D' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${okA || badA ? 0.6 + 0.4 * (okA || badA) : 1}) rotate(${(1 - (okA || badA || 1)) * 80}deg)`}}>
              {okA > 0 && <svg width="30" height="30" viewBox="0 0 30 30"><path d="M5 16L12 23L26 7" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
              {badA > 0 && <svg width="26" height="26" viewBox="0 0 26 26"><path d="M5 5L21 21M21 5L5 21" stroke="#fff" strokeWidth={6} strokeLinecap="round" /></svg>}
            </div>
          </div>
        );
      })}
      {mt && f >= mt.at && (() => {
        const a = pop(f, fps, mt.at, 12);
        const top = side.meterTop ?? 468;
        const shx = noise2D('ms', f * 0.9, 0) * mshake;
        const txt = mt.fmt === 'x' ? `${(mv / 10).toFixed(1)}x` : mt.fmt === 'num' ? Math.round(mv).toLocaleString('id-ID') : `${Math.round(mv)}%`;
        return (
          <div style={{position: 'absolute', left: 14, right: 14, top, height: 118, transform: `translateX(${shx}px) scale(${0.8 + 0.2 * a})`, opacity: a, background: '#fff', border: '5px solid #111', borderRadius: 20, boxShadow: '5px 5px 0 #111', padding: '8px 16px', boxSizing: 'border-box'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FONT, fontWeight: 800, fontSize: 28, color: INK}}>
              <span>{mlabel}</span><span style={{fontSize: 40}}>{txt}</span>
            </div>
            <div style={{marginTop: 8, height: 34, borderRadius: 17, border: '5px solid #111', background: '#E8EBF2', overflow: 'hidden'}}>
              <div style={{width: `${Math.max(0, Math.min(100, (mv / mmax) * 100))}%`, height: '100%', background: mcol, borderRight: '4px solid #111', boxSizing: 'border-box'}} />
            </div>
          </div>
        );
      })()}
      {(side.big ?? []).map((b, i) => {
        if (f < b.at || (b.out !== undefined && f >= b.out + 8)) return null;
        const t = f - b.at;
        const a = Math.min(1, t / 6);
        const sc = 1 + range(t, 0, 8, 1.7, 0, easeOut) + 0.05 * Math.sin(t / 4);
        const o = b.out !== undefined ? range(f, b.out, b.out + 8, 1, 0) : 1;
        const st = b.strike !== undefined && f >= b.strike ? range(f, b.strike, b.strike + 6, 0, 1, easeOut) : 0;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: b.y ?? 200, display: 'flex', justifyContent: 'center', opacity: a * o, transform: `scale(${sc}) rotate(${b.rot ?? -3}deg)`, zIndex: 6}}>
            <div style={{position: 'relative', fontFamily: FONT, fontWeight: 800, fontSize: b.size ?? 130, color: b.color ?? INK, background: b.bg ?? '#fff', border: '6px solid #111', borderRadius: 24, padding: '0 28px', boxShadow: '8px 8px 0 #111', lineHeight: 1.2}}>
              {b.text}
              {st > 0 && <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{position: 'absolute', inset: 0}}><path d="M-2 90L102 10" stroke="#E5322D" strokeWidth={9} vectorEffect="non-scaling-stroke" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - st} /></svg>}
            </div>
          </div>
        );
      })}
      {cast.map((m, i) => {
        if (f < m.at || (m.out !== undefined && f >= m.out + 8)) return null;
        const sz = m.size ?? 200;
        const a = pop(f, fps, m.at, 12);
        const emo = (m.emo ?? []).reduce((e, k) => (f >= k.at ? k.e : e), m.emotion);
        const hop = (m.hop ?? []).reduce((s, h) => s + (f >= h && f < h + 14 ? Math.sin(((f - h) / 14) * Math.PI) * -34 : 0), 0);
        const o = m.out !== undefined ? range(f, m.out, m.out + 8, 1, 0) : 1;
        const say = (m.say ?? []).filter((s) => f >= s.at && f < s.at + 48).slice(-1)[0];
        return (
          <div key={i} style={{position: 'absolute', left: m.x - sz / 2, top: (side.castTop ?? 600) + (m.y ?? 0) + hop + (1 - a) * 160, width: sz, height: sz, opacity: o * Math.min(1, a * 2), zIndex: 7}}>
            <Mascot name={m.name} emotion={emo} size={sz} x={0} y={0} from="none" bob delay={m.at + i * 5} flip={m.flip} />
            {say && <Stinger t={say.t} color={say.color} k={f - say.at} />}
          </div>
        );
      })}
      {(side.burst ?? []).map((b, i) => {
        const t = f - b.at;
        if (t < 0 || t > 20) return null;
        return <svg key={i} width={500} height={800} style={{position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none'}}>{Array.from({length: 10}).map((_, k) => { const an = (k / 10) * Math.PI * 2; const u = range(t, 0, 18, 0, 1, easeOut); const r1 = 20 + u * 60, r2 = r1 + 22 * (1 - u); return <line key={k} x1={b.x + Math.cos(an) * r1} y1={b.y + Math.sin(an) * r1} x2={b.x + Math.cos(an) * r2} y2={b.y + Math.sin(an) * r2} stroke={b.color ?? INK} strokeWidth={7} strokeLinecap="round" opacity={1 - u} />; })}</svg>;
      })}
    </div>
  );
};
