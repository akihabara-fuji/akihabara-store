import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT} from './theme';
import {pop, range, easeOut} from './timing';

export const BigNumber: React.FC<{value: number; decimals?: number; suffix?: string; prefix?: string; size?: number; delay?: number; color?: string; label?: string}> = ({
  value, decimals = 0, suffix = '', prefix = '', size = 260, delay = 0, color = C.lime, label,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = range(f, delay, delay + 36, 0, value, easeOut);
  const s = pop(f, fps, delay + 30, 8);
  return (
    <div style={{textAlign: 'center', transform: `scale(${1 + 0.08 * s})`}}>
      <div style={{display: 'inline-block', position: 'relative', padding: '0 24px'}}>
        <div style={{position: 'absolute', inset: '24% 0 4% 0', background: color, borderRadius: 18, transform: 'skewX(-4deg)'}} />
        <span style={{position: 'relative', fontFamily: FONT, fontWeight: 700, fontSize: size, color: C.ink, letterSpacing: -6}}>{prefix}{v.toFixed(decimals)}{suffix}</span>
      </div>
      {label && <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 50, color: C.ink, marginTop: 14}}>{label}</div>}
    </div>
  );
};
