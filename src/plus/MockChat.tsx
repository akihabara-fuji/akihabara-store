import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sticker} from './theme';
import {pop} from './timing';
import {CursorTyping} from './CursorTyping';

type Line = {who: 'user' | 'ai'; text: string; at: number};

export const MockChat: React.FC<{lines: Line[]; title?: string; w?: number; delay?: number}> = ({lines, title = 'Claude', w = 900, delay = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(f, fps, delay);
  return (
    <div style={{width: w, transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 2), ...sticker('#fff')}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderBottom: `5px solid ${C.ink}`, background: C.blue, borderRadius: '24px 24px 0 0'}}>
        {[C.red, C.yellow, C.green].map((c) => <div key={c} style={{width: 20, height: 20, borderRadius: 10, background: c, border: `3px solid ${C.ink}`}} />)}
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, marginLeft: 10}}>{title}</div>
      </div>
      <div style={{padding: 26, display: 'flex', flexDirection: 'column', gap: 18, minHeight: 260}}>
        {lines.map((l, i) => {
          const ls = pop(f, fps, l.at);
          if (f < l.at) return null;
          return (
            <div key={i} style={{alignSelf: l.who === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', padding: '16px 22px', borderRadius: 24, border: `4px solid ${C.ink}`, background: l.who === 'user' ? C.lime : C.pink, transform: `scale(${0.6 + 0.4 * ls})`, transformOrigin: l.who === 'user' ? 'right bottom' : 'left bottom'}}>
              <CursorTyping text={l.text} delay={l.at} showCursor={false} size={34} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
