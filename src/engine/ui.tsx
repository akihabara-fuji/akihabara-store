import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Parallax} from './Camera';

export const PAPER = {
  bg: '#F3F3F0',
  grid: '#E6E6E1',
  ink: '#111111',
  red: '#E5322D',
  blue: '#2F6BFF',
  green: '#12A672',
  yellow: '#FFC93C',
  orange: '#E8825F',
};

/** Latar kertas dengan grid halus 72 px (setara referensi). */
export const PaperBg: React.FC<{rays?: boolean}> = ({rays}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: PAPER.bg}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${PAPER.grid} 2px, transparent 2px), linear-gradient(90deg, ${PAPER.grid} 2px, transparent 2px)`,
          backgroundSize: '72px 72px',
          backgroundPosition: '-1px -1px',
        }}
      />
      {rays && (
        <svg
          width={1080}
          height={1920}
          style={{position: 'absolute', inset: 0, opacity: 0.55}}
          viewBox="-540 -960 1080 1920"
        >
          <g transform={`translate(0 -200) rotate(${frame * 0.15})`}>
            {Array.from({length: 24}, (_, i) => (
              <path
                key={i}
                d="M0,0 L-70,-1400 L70,-1400 Z"
                fill="#DAD9D2"
                transform={`rotate(${i * 15})`}
                opacity={i % 2 ? 0.6 : 0.25}
              />
            ))}
          </g>
        </svg>
      )}
    </AbsoluteFill>
  );
};

/** Percikan kecil, ikut parallax kamera. */
export const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  const pts = [
    [100, 470], [980, 500], [990, 780], [80, 920], [940, 1200], [120, 1300], [980, 140],
  ];
  return (
    <Parallax depth={0.35}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {pts.map(([x, y], i) => {
          const s = 0.6 + 0.4 * Math.abs(Math.sin((frame + i * 11) / 14));
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path d="M0,-16 L4,-4 L16,0 L4,4 L0,16 L-4,4 L-16,0 L-4,-4 Z" fill={i % 2 ? PAPER.red : PAPER.ink} />
            </g>
          );
        })}
      </svg>
    </Parallax>
  );
};

/** Label kecil berwarna, mis. "LANGKAH 1". */
export const Pill: React.FC<{text: string; color: string; y?: number}> = ({text, color, y = 150}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 12, stiffness: 160}});
  return (
    <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          transform: `scale(${p})`,
          background: color,
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: 2,
          padding: '12px 34px',
          borderRadius: 999,
          textTransform: 'uppercase',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Judul besar. Kata di antara *bintang* jadi aksen (serif miring berwarna). */
export const Title: React.FC<{text: string; accent?: string; y?: number; size?: number}> = ({
  text,
  accent = PAPER.red,
  y = 240,
  size = 104,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const parts = text.split('*');
  const p = spring({frame: frame - 4, fps, config: {damping: 14, stiffness: 120}});
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 70,
        right: 70,
        textAlign: 'center',
        lineHeight: 1.06,
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: 900,
        fontSize: size,
        color: PAPER.ink,
        letterSpacing: -2,
        transform: `translateY(${(1 - p) * 60}px)`,
        opacity: Math.min(1, p * 1.6),
      }}
    >
      {parts.map((s, i) =>
        i % 2 ? (
          <span key={i} style={{color: accent, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700}}>
            {s}
          </span>
        ) : (
          <span key={i}>{s}</span>
        ),
      )}
    </div>
  );
};

/** Kartu neo-brutalist: border tebal + bayangan keras. Muncul dengan spring. */
export const NeoCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at?: number;
  dark?: boolean;
  rotate?: number;
  children?: React.ReactNode;
}> = ({x, y, w, h, at = 6, dark, rotate = 0, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 130}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `scale(${Math.max(0, p)}) rotate(${rotate}deg)`,
        background: dark ? '#111827' : '#fff',
        border: `6px solid ${PAPER.ink}`,
        borderRadius: 30,
        boxShadow: `12px 12px 0 ${PAPER.ink}`,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
};

/** Chip kecil untuk daftar. */
export const Chip: React.FC<{
  text: string;
  color: string;
  at: number;
  x: number;
  y: number;
  textColor?: string;
}> = ({text, color, at, x, y, textColor = '#fff'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 150}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${Math.max(0, p)})`,
        transformOrigin: 'left center',
        background: color,
        color: textColor,
        border: `5px solid ${PAPER.ink}`,
        boxShadow: `7px 7px 0 ${PAPER.ink}`,
        borderRadius: 999,
        padding: '14px 34px',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 900,
        fontSize: 42,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

/** Stiker miring (mis. "ZERO COST"). */
export const Sticker: React.FC<{text: string; at: number; x: number; y: number; rotate?: number; color?: string}> = ({
  text,
  at,
  x,
  y,
  rotate = -8,
  color = PAPER.yellow,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 170}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `rotate(${rotate}deg) scale(${Math.max(0, p)})`,
        background: color,
        color: PAPER.ink,
        border: `5px solid ${PAPER.ink}`,
        boxShadow: `7px 7px 0 ${PAPER.ink}`,
        padding: '10px 26px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: 900,
        fontSize: 44,
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
};

/** Efek mengetik: tampilkan sebagian teks sesuai frame. */
export const typed = (text: string, frame: number, start: number, cps = 1.4) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

export const lerpFrame = (frame: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(frame, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
