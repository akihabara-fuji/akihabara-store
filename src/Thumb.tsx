import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, FONT, loadFonts} from './plus/theme';
import {MASCOTS} from './data/mascots';

export type ThumbProps = {
  ep: string; // "02"
  kicker: string;
  line1: string; line2: string; line3: string; // hook, baris 2 = tanda "="
  tag: string;
  dika: string; // emosi dika-asli
  mascots: {name: string; emotion: string; x: number; y: number; size: number; rot: number}[];
  variant?: 'A' | 'B';
};

const m = (n: string, e: string) => (MASCOTS as any)[n]?.[e] as string;

export const Thumb: React.FC<ThumbProps> = ({ep, kicker, line1, line2, line3, tag, dika, mascots, variant = 'A'}) => {
  loadFonts();
  const bg = variant === 'A' ? '#FAFAF6' : '#111';
  const fg = variant === 'A' ? '#111' : '#fff';
  const card = variant === 'A' ? '#fff' : '#1c1c1c';
  return (
    <AbsoluteFill style={{background: bg, fontFamily: FONT}}>
      <AbsoluteFill style={{backgroundImage: `linear-gradient(${variant === 'A' ? '#E6E6DE' : '#2a2a2a'} 2px, transparent 2px), linear-gradient(90deg, ${variant === 'A' ? '#E6E6DE' : '#2a2a2a'} 2px, transparent 2px)`, backgroundSize: '72px 72px'}} />
      {/* kicker + episode */}
      <div style={{position: 'absolute', left: 70, top: 300, display: 'flex', gap: 16, alignItems: 'center'}}>
        <div style={{background: C.lime, border: '6px solid #111', borderRadius: 22, padding: '6px 26px', fontWeight: 800, fontSize: 48, color: '#111', transform: 'rotate(-3deg)', boxShadow: '7px 7px 0 #111'}}>PART {ep}</div>
        <div style={{fontWeight: 800, fontSize: 44, color: fg, letterSpacing: 2}}>{kicker}</div>
      </div>
      {/* hook */}
      <div style={{position: 'absolute', left: 50, right: 50, top: 420, background: card, border: '8px solid #111', borderRadius: 44, boxShadow: '16px 16px 0 #111', padding: '34px 20px 40px', textAlign: 'center', transform: 'rotate(-1.5deg)'}}>
        <div style={{fontWeight: 900, fontSize: 138, lineHeight: 1.02, color: fg}}>{line1}</div>
        <div style={{display: 'inline-block', background: C.lime, border: '6px solid #111', borderRadius: 24, padding: '0 64px', margin: '10px 0', fontWeight: 900, fontSize: 130, lineHeight: 1.1, color: '#111', transform: 'rotate(2deg)'}}>{line2}</div>
        <div style={{display: 'inline-block', background: C.yellow, padding: '0 30px', fontWeight: 900, fontSize: 126, lineHeight: 1.08, color: '#111', transform: 'skewX(-4deg)'}}>{line3.split(' ').map((w, i) => <div key={i}>{w}</div>)}</div>
      </div>
      {/* maskot */}
      {mascots.map((s, i) => (
        <Img key={i} src={staticFile(m(s.name, s.emotion))} style={{position: 'absolute', left: s.x, top: s.y, width: s.size, transform: `rotate(${s.rot}deg)`, filter: 'drop-shadow(0 8px 0 rgba(0,0,0,.18))'}} />
      ))}
      <Img src={staticFile((MASCOTS as any)['dika-asli'][dika])} style={{position: 'absolute', right: -30, bottom: 0, width: 720, filter: 'drop-shadow(0 10px 0 rgba(0,0,0,.2))'}} />
      {/* tag bawah */}
      <div style={{position: 'absolute', left: 50, top: 1255, background: '#FF4B4B', border: '6px solid #111', borderRadius: 26, padding: '12px 34px', fontWeight: 900, fontSize: 58, color: '#fff', transform: 'rotate(-2deg)', boxShadow: '8px 8px 0 #111'}}>{tag}</div>
    </AbsoluteFill>
  );
};
