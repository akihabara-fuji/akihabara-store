import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export type CamKey = {f: number; x?: number; y?: number; s?: number; r?: number};
type Ctx = {x: number; y: number; speed: number};
const CamCtx = createContext<Ctx>({x: 0, y: 0, speed: 0});

const W = 1080;
const H = 1920;

const channel = (
  keys: CamKey[],
  frame: number,
  k: 'x' | 'y' | 's' | 'r',
  def: number,
  easing: (t: number) => number,
) => {
  const fs = keys.map((c) => c.f);
  const vs = keys.map((c) => c[k] ?? def);
  return interpolate(frame, fs, vs, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

const sample = (keys: CamKey[], frame: number, easing: (t: number) => number) => ({
  x: channel(keys, frame, 'x', 0, easing),
  y: channel(keys, frame, 'y', 0, easing),
  s: channel(keys, frame, 's', 1, easing),
  r: channel(keys, frame, 'r', 0, easing),
});

/**
 * Kamera virtual: x,y = titik fokus (offset dari tengah layar), s = zoom, r = rotasi (derajat).
 * shake = getaran singkat {from, to, amp}.
 */
export const Camera: React.FC<{
  keys: CamKey[];
  easing?: (t: number) => number;
  shake?: {from: number; to: number; amp: number};
  children: React.ReactNode;
}> = ({keys, easing = Easing.inOut(Easing.cubic), shake, children}) => {
  const frame = useCurrentFrame();
  const c = sample(keys, frame, easing);
  const prev = sample(keys, Math.max(0, frame - 1), easing);
  let {x, y, r} = c;
  if (shake) {
    const decay = interpolate(frame, [shake.from, shake.to], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const on = frame >= shake.from ? decay : 0;
    x += Math.sin(frame * 2.3) * shake.amp * on;
    y += Math.cos(frame * 3.1) * shake.amp * on;
    r += Math.sin(frame * 1.7) * shake.amp * 0.04 * on;
  }
  const speed = Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y);
  return (
    <CamCtx.Provider value={{x, y, speed}}>
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <AbsoluteFill
          style={{
            transformOrigin: `${W / 2 + x}px ${H / 2 + y}px`,
            transform: `translate(${-x}px, ${-y}px) rotate(${r}deg) scale(${c.s})`,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    </CamCtx.Provider>
  );
};

/** Lapisan parallax: depth 0 = ikut dunia, 1 = menempel ke layar (sangat jauh). */
export const Parallax: React.FC<{depth: number; children: React.ReactNode}> = ({depth, children}) => {
  const {x, y} = useContext(CamCtx);
  return (
    <AbsoluteFill style={{transform: `translate(${x * depth}px, ${y * depth}px)`}}>
      {children}
    </AbsoluteFill>
  );
};

/** Garis kecepatan saat kamera menyapu cepat (whip pan). */
export const SpeedStreaks: React.FC = () => {
  const {speed} = useContext(CamCtx);
  const o = Math.min(0.55, speed / 160);
  if (o < 0.04) return null;
  return (
    <AbsoluteFill style={{opacity: o, pointerEvents: 'none'}}>
      {[260, 520, 700, 940, 1180, 1420, 1640].map((y, i) => (
        <div
          key={y}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: y,
            height: 6 + (i % 3) * 5,
            background: 'linear-gradient(90deg, transparent, #9fd4ff, transparent)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
