import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from './theme';
import {range, easeOut} from './timing';

export const ArrowLine: React.FC<{from: [number, number]; to: [number, number]; bend?: number; delay?: number; dur?: number; color?: string; width?: number}> = ({
  from, to, bend = 80, delay = 0, dur = 18, color = C.ink, width = 8,
}) => {
  const f = useCurrentFrame();
  const [x1, y1] = from; const [x2, y2] = to;
  const mx = (x1 + x2) / 2 + bend; const my = (y1 + y2) / 2 - bend;
  const p = range(f, delay, delay + dur, 0, 1, easeOut);
  const ang = (Math.atan2(y2 - my, x2 - mx) * 180) / Math.PI;
  return (
    <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
      <g transform={`translate(${x2} ${y2}) rotate(${ang})`} opacity={p > 0.92 ? 1 : 0}>
        <path d="M -26 -18 L 0 0 L -26 18" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};
