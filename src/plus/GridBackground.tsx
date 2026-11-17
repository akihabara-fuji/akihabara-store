import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from './theme';

export const GridBackground: React.FC<{bg?: string; drift?: boolean; size?: number}> = ({bg = C.bg, drift = true, size = 64}) => {
  const f = useCurrentFrame();
  const o = drift ? (f * 0.4) % size : 0;
  return (
    <AbsoluteFill
      style={{
        background: bg,
        backgroundImage: `linear-gradient(${C.grid} 2px, transparent 2px), linear-gradient(90deg, ${C.grid} 2px, transparent 2px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${o}px ${o}px`,
      }}
    />
  );
};
