import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, H, SAFE} from './theme';
import {pop} from './timing';

export type Chunk = {t: string; from: number; to: number}; // frame lokal scene

// bagi kalimat jadi potongan 2-4 kata, tersebar merata di durasi
export const makeChunks = (text: string, startF: number, endF: number, perChunk = 3): Chunk[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += perChunk) groups.push(words.slice(i, i + perChunk).join(' '));
  const step = (endF - startF) / Math.max(1, groups.length);
  return groups.map((t, i) => ({t, from: Math.round(startF + i * step), to: Math.round(startF + (i + 1) * step)}));
};

// kalimat utuh: satu kalimat per tampilan, waktu sebanding panjang teks
export const makeSentences = (text: string, startF: number, endF: number): Chunk[] => {
  const ss = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((x) => x.trim()).filter(Boolean);
  const tot = ss.reduce((a, x) => a + x.length, 0) || 1;
  let acc = startF;
  return ss.map((t) => {
    const from = Math.round(acc);
    acc += ((endF - startF) * t.length) / tot;
    return {t, from, to: Math.round(acc)};
  });
};

export const CaptionPill: React.FC<{chunks: Chunk[]; bottom?: number}> = ({chunks, bottom = SAFE.bottom + 40}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cur = chunks.find((c) => f >= c.from && f < c.to);
  if (!cur) return null;
  const s = pop(f, fps, cur.from, 14);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: H - bottom, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 44, lineHeight: 1.2, textAlign: 'center', maxWidth: 940, color: '#fff', background: C.pill, borderRadius: 18, padding: '12px 30px', transform: `scale(${0.85 + 0.15 * s})`, opacity: Math.min(1, s * 2)}}>{cur.t}</div>
    </div>
  );
};
