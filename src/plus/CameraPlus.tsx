import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ease} from './timing';

export type CamKey = {f: number; x?: number; y?: number; s?: number; r?: number};

// Kamera virtual 2D (bukan 3D): zoom, pan, miring, dan getar
export const CameraPlus: React.FC<{keys: CamKey[]; shake?: {from: number; to: number; amp?: number}; children: React.ReactNode}> = ({keys, shake, children}) => {
  const f = useCurrentFrame();
  const fr = keys.map((k) => k.f);
  const val = (key: 'x' | 'y' | 's' | 'r', d: number) =>
    interpolate(f, fr, keys.map((k) => k[key] ?? d), {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const x = val('x', 0); const y = val('y', 0); const s = val('s', 1); const r = val('r', 0);
  let sx = 0; let sy = 0;
  if (shake && f >= shake.from && f <= shake.to) {
    const amp = (shake.amp ?? 14) * (1 - (f - shake.from) / Math.max(1, shake.to - shake.from));
    sx = Math.sin(f * 9.1) * amp; sy = Math.cos(f * 7.3) * amp;
  }
  return (
    <AbsoluteFill style={{transform: `translate(${-x + sx}px, ${-y + sy}px) scale(${s}) rotate(${r}deg)`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>
  );
};
