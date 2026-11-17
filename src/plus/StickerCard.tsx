import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sticker} from './theme';
import {pop} from './timing';

export const StickerCard: React.FC<{
  title: string; sub?: string; bg?: string; delay?: number; rotate?: number; w?: number; h?: number; badge?: string; fill?: number;
}> = ({title, sub, bg = C.yellow, delay = 0, rotate = 0, w = 440, h = 230, badge, fill}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(f, fps, delay);
  return (
    <div style={{width: w, minHeight: h, padding: '26px 30px', boxSizing: 'border-box', transform: `scale(${0.5 + 0.5 * s}) rotate(${rotate * s}deg)`, opacity: Math.min(1, s * 2), position: 'relative', ...sticker(bg)}}>
      {badge && (
        <div style={{position: 'absolute', top: -26, left: -22, width: 54, height: 54, borderRadius: 27, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{badge}</div>
      )}
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 46, color: C.ink, lineHeight: 1.1}}>{title}</div>
      {sub && <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 30, color: '#333', marginTop: 10, lineHeight: 1.25}}>{sub}</div>}
      {fill !== undefined && (
        <div style={{marginTop: 18, height: 22, borderRadius: 11, border: `4px solid ${C.ink}`, background: '#fff', overflow: 'hidden'}}>
          <div style={{width: `${fill * Math.min(1, Math.max(0, (f - delay - 8) / 24)) * 100}%`, height: '100%', background: C.ink}} />
        </div>
      )}
    </div>
  );
};
