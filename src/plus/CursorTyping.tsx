import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT, C} from './theme';

export const CursorTyping: React.FC<{text: string; delay?: number; cps?: number; size?: number; color?: string; showCursor?: boolean}> = ({
  text, delay = 0, cps = 14, size = 40, color = C.ink, showCursor = true,
}) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - delay) / 30) * cps)));
  const caret = Math.floor(f / 8) % 2 === 0;
  return (
    <span style={{fontFamily: FONT, fontWeight: 500, fontSize: size, color}}>
      {text.slice(0, n)}
      {showCursor && <span style={{display: 'inline-block', width: 4, height: size * 0.95, marginLeft: 2, verticalAlign: 'text-bottom', background: caret ? color : 'transparent'}} />}
    </span>
  );
};

export const Cursor: React.FC<{x: number; y: number; delay?: number; size?: number}> = ({x, y, delay = 0, size = 56}) => {
  const f = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (f - delay) / 18));
  const e = 1 - Math.pow(1 - t, 3);
  const cx = x - 160 * (1 - e); const cy = y + 120 * (1 - e);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{position: 'absolute', left: cx, top: cy, filter: 'drop-shadow(3px 3px 0 rgba(0,0,0,.35))'}}>
      <path d="M3 2 L3 20 L8 15 L11.5 22 L14.5 20.5 L11 13.5 L18 13.5 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
};
