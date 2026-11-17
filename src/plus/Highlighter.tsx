import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';
import {pop, range, easeOut} from './timing';

// Judul dengan stabilo neon yang menyapu dari kiri
export const Highlighter: React.FC<{text: string; size?: number; color?: string; delay?: number; rotate?: number}> = ({
  text, size = 120, color = C.lime, delay = 0, rotate = -2,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(f, fps, delay);
  const sweep = range(f, delay + 6, delay + 20, 0, 1, easeOut);
  return (
    <div style={{display: 'inline-block', position: 'relative', transform: `scale(${0.7 + 0.3 * s}) rotate(${rotate}deg)`, opacity: Math.min(1, s * 1.5)}}>
      <div style={{position: 'absolute', left: -14, right: -14, top: size * 0.22, bottom: size * 0.04, background: color, transform: `scaleX(${sweep}) skewX(-4deg)`, transformOrigin: 'left center', borderRadius: 10}} />
      <span style={{position: 'relative', fontFamily: FONT, fontWeight: 700, fontSize: size, color: C.ink, lineHeight: 1.1, letterSpacing: -2}}>{text}</span>
    </div>
  );
};
