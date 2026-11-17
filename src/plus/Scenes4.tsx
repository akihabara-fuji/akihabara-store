import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {C, FONT, sticker} from './theme';
import {Mascot} from './Mascot';
import {pop, easeOut} from './timing';
import {PlusSpec, Shell, Title} from './Scenes';

type Mode = 'siang' | 'malam' | 'pagi';
const SKY: Record<Mode, [string, string]> = {siang: ['#7FD3FF', '#FFF4CF'], malam: ['#0B1445', '#4B2F86'], pagi: ['#FF9E7A', '#FFE6A6']};
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
const WIN = Array.from({length: 54}, (_, i) => ((i * 37 + 11) % 100) / 100);

// 46 Siang/Malam: langit berganti siang, malam, pagi; maskot ikut berekspresi
export const SiangMalamScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spec.fase ?? [];
  let i = 0;
  ph.forEach((p, k) => { if (f >= p.at) i = k; });
  const cur = ph[i], prev = ph[Math.max(0, i - 1)];
  const T = 24;
  const t = easeOut(Math.min(1, Math.max(0, (f - cur.at) / T)));
  const top = mix(SKY[prev.mode][0], SKY[cur.mode][0], t);
  const bot = mix(SKY[prev.mode][1], SKY[cur.mode][1], t);
  const night = (m: Mode) => (m === 'malam' ? 1 : 0);
  const n = night(prev.mode) + (night(cur.mode) - night(prev.mode)) * t;
  const sunPos = (m: Mode) => (m === 'siang' ? [690, 120] : m === 'pagi' ? [520, 330] : [520, 520]);
  const sx = sunPos(prev.mode)[0] + (sunPos(cur.mode)[0] - sunPos(prev.mode)[0]) * t;
  const sy = sunPos(prev.mode)[1] + (sunPos(cur.mode)[1] - sunPos(prev.mode)[1]) * t;
  const mx = 280, my = 560 - 430 * n;
  const head = pop(f, fps, 2);
  const PW = 960, PH = 660;
  return (
    <Shell spec={spec} frames={frames} bg={mix('#F7F3E8', '#101735', n * 0.9)} cam={[{f: 0, s: 1}, {f: frames, s: 1.02}]}>
      <Title text={spec.title} color={spec.titleColor} size={86} />
      <div style={{position: 'absolute', left: 60, top: 340, width: PW, height: PH, overflow: 'hidden', opacity: head, ...sticker('#fff', 7)}}>
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${top}, ${bot})`}} />
        {WIN.slice(0, 40).map((w, k) => (
          <div key={k} style={{position: 'absolute', left: (k * 97) % 940, top: (k * 53) % 330, width: 6, height: 6, borderRadius: 3, background: '#fff', opacity: n * (0.4 + 0.6 * Math.abs(Math.sin((f + k * 9) / 14)))}} />
        ))}
        <div style={{position: 'absolute', left: sx - 70, top: sy - 70, width: 140, height: 140, borderRadius: 70, background: '#FFD23F', border: `6px solid ${C.ink}`, opacity: 1 - n, boxShadow: '0 0 60px #FFD23F'}} />
        <div style={{position: 'absolute', left: mx - 60, top: my - 60, width: 120, height: 120, borderRadius: 60, background: '#F4F1D6', border: `6px solid ${C.ink}`, opacity: n}}>
          <div style={{position: 'absolute', left: 26, top: 22, width: 24, height: 24, borderRadius: 12, background: '#D8D4B0'}} />
          <div style={{position: 'absolute', left: 66, top: 62, width: 18, height: 18, borderRadius: 9, background: '#D8D4B0'}} />
        </div>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{position: 'absolute', left: ((k * 380 + f * 0.6) % 1200) - 200, top: 90 + k * 70, width: 190, height: 56, borderRadius: 30, background: '#fff', opacity: 0.85 - n * 0.6, border: `5px solid ${C.ink}`}} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const bw = 104, bh = 170 + ((k * 61) % 150), bx = k * 118 + 12;
          return (
            <div key={k} style={{position: 'absolute', left: bx, bottom: 0, width: bw, height: bh, background: mix('#8C93A8', '#1A2142', n), border: `5px solid ${C.ink}`, borderBottom: 'none'}}>
              {Array.from({length: 12}, (_, w) => {
                const lit = WIN[(k * 6 + w) % 54] > 0.45;
                return <div key={w} style={{position: 'absolute', left: 14 + (w % 3) * 28, top: 16 + Math.floor(w / 3) * 34, width: 18, height: 22, background: lit && n > 0.4 ? '#FFD23F' : mix('#DDE6F2', '#2A335C', n), opacity: lit ? 1 : 0.7}} />;
              })}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 60, top: 1020, display: 'flex', gap: 14, alignItems: 'center'}}>
        {ph.map((p, k) => {
          const on = k === i;
          return <div key={k} style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, padding: '6px 22px', color: C.ink, opacity: on ? 1 : 0.35, ...sticker(p.mode === 'malam' ? '#B9A8FF' : p.mode === 'pagi' ? '#FFB88A' : C.yellow, 5)}}>{p.mode.toUpperCase()}</div>;
        })}
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1095, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 58, color: n > 0.5 ? '#fff' : C.ink}}>{cur.label}</div>
      <Mascot key={`d${i}`} name="dika-asli" emotion={cur.dika} size={400} x={20} y={1230} delay={cur.at + 2} from="bottom" />
      {(cur.bots ?? []).map((b, k) => (
        <div key={`${i}-${k}`} style={{position: 'absolute', left: 470 + (k % 2) * 300, top: 1215 + Math.floor(k / 2) * 250, width: 280, textAlign: 'center'}}>
          <Mascot name={b.name} emotion={b.emotion} size={200} x={40} y={0} delay={cur.at + 6 + k * 5} from="bottom" />
          <div style={{position: 'absolute', left: 0, top: 205, width: 280, fontFamily: FONT, fontWeight: 700, fontSize: 26, padding: '4px 8px', color: C.ink, ...sticker('#fff', 5)}}>{b.label}</div>
        </div>
      ))}
      {cur.mode === 'malam' && cur.dika === 'tidur' && (
        <div style={{position: 'absolute', left: 330, top: 1330 - ((f * 1.2) % 90), fontFamily: FONT, fontWeight: 700, fontSize: 70, color: '#fff', opacity: 0.9 - ((f * 1.2) % 90) / 100}}>Zz</div>
      )}
    </Shell>
  );
};

// Panel langit (dipakai layout split)
export const SkyPanel: React.FC<{spec: PlusSpec}> = ({spec}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ph = spec.fase ?? [];
  let i = 0;
  ph.forEach((p, k) => { if (f >= p.at) i = k; });
  const cur = ph[i], prev = ph[Math.max(0, i - 1)];
  const T = 24;
  const t = easeOut(Math.min(1, Math.max(0, (f - cur.at) / T)));
  const top = mix(SKY[prev.mode][0], SKY[cur.mode][0], t);
  const bot = mix(SKY[prev.mode][1], SKY[cur.mode][1], t);
  const night = (m: Mode) => (m === 'malam' ? 1 : 0);
  const n = night(prev.mode) + (night(cur.mode) - night(prev.mode)) * t;
  const sunPos = (m: Mode) => (m === 'siang' ? [690, 120] : m === 'pagi' ? [520, 330] : [520, 520]);
  const sx = sunPos(prev.mode)[0] + (sunPos(cur.mode)[0] - sunPos(prev.mode)[0]) * t;
  const sy = sunPos(prev.mode)[1] + (sunPos(cur.mode)[1] - sunPos(prev.mode)[1]) * t;
  const mx = 280, my = 560 - 430 * n;
  const head = pop(f, fps, 2);
  const PW = 960, PH = 660;
  return (
      <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, overflow: 'hidden', opacity: head, ...sticker('#fff', 7)}}>
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${top}, ${bot})`}} />
        {WIN.slice(0, 40).map((w, k) => (
          <div key={k} style={{position: 'absolute', left: (k * 97) % 940, top: (k * 53) % 330, width: 6, height: 6, borderRadius: 3, background: '#fff', opacity: n * (0.4 + 0.6 * Math.abs(Math.sin((f + k * 9) / 14)))}} />
        ))}
        <div style={{position: 'absolute', left: sx - 70, top: sy - 70, width: 140, height: 140, borderRadius: 70, background: '#FFD23F', border: `6px solid ${C.ink}`, opacity: 1 - n, boxShadow: '0 0 60px #FFD23F'}} />
        <div style={{position: 'absolute', left: mx - 60, top: my - 60, width: 120, height: 120, borderRadius: 60, background: '#F4F1D6', border: `6px solid ${C.ink}`, opacity: n}}>
          <div style={{position: 'absolute', left: 26, top: 22, width: 24, height: 24, borderRadius: 12, background: '#D8D4B0'}} />
          <div style={{position: 'absolute', left: 66, top: 62, width: 18, height: 18, borderRadius: 9, background: '#D8D4B0'}} />
        </div>
        {[0, 1, 2].map((k) => (
          <div key={k} style={{position: 'absolute', left: ((k * 380 + f * 0.6) % 1200) - 200, top: 90 + k * 70, width: 190, height: 56, borderRadius: 30, background: '#fff', opacity: 0.85 - n * 0.6, border: `5px solid ${C.ink}`}} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const bw = 104, bh = 170 + ((k * 61) % 150), bx = k * 118 + 12;
          return (
            <div key={k} style={{position: 'absolute', left: bx, bottom: 0, width: bw, height: bh, background: mix('#8C93A8', '#1A2142', n), border: `5px solid ${C.ink}`, borderBottom: 'none'}}>
              {Array.from({length: 12}, (_, w) => {
                const lit = WIN[(k * 6 + w) % 54] > 0.45;
                return <div key={w} style={{position: 'absolute', left: 14 + (w % 3) * 28, top: 16 + Math.floor(w / 3) * 34, width: 18, height: 22, background: lit && n > 0.4 ? '#FFD23F' : mix('#DDE6F2', '#2A335C', n), opacity: lit ? 1 : 0.7}} />;
              })}
            </div>
          );
        })}
      </div>
  );
};
