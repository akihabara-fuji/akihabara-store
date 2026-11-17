import React from 'react';
import {Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {MASCOTS} from '../data/mascots';
import {pop} from './timing';

const M = MASCOTS as unknown as Record<string, Record<string, string>>;
export const mascotEmotions = (name: string) => Object.keys(M[name] ?? {});

export const Mascot: React.FC<{
  name: string; emotion: string; size?: number; x?: number; y?: number; delay?: number;
  flip?: boolean; bob?: boolean; talking?: boolean; from?: 'left' | 'right' | 'bottom' | 'none'; rotate?: number;
  mouth?: {cx: number; cy: number; w: number}; open?: number; // gerak mulut (jaw puppet) buat Dika
  talkSwap?: number; // 0..1 buka-tutup bergantian untuk maskot AI (ganti gambar mulut terbuka/tertutup)
}> = ({name, emotion, size = 380, x = 0, y = 0, delay = 0, flip = false, bob = true, talking = false, from = 'bottom', rotate = 0, mouth, open = 0, talkSwap}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(f, fps, delay, 11);
  let emo = emotion;
  if (talking && M[name]?.ngomong1) emo = Math.floor(f / 6) % 2 === 0 ? 'ngomong1' : 'ngomong2';
  if (talkSwap !== undefined && talkSwap > 0.5) {
    const openE = M[name]?.hore ? 'hore' : M[name]?.thumbs ? 'thumbs' : emo;
    emo = openE;
  } else if (talkSwap !== undefined && ['hore', 'thumbs', 'panik', 'marah', 'nangis'].includes(emotion) && M[name]?.tanya) {
    emo = 'tanya';
  }
  const file = M[name]?.[emo] ?? M[name]?.thumbs ?? Object.values(M[name] ?? {})[0];
  const off = (1 - s) * 500;
  const dx = from === 'left' ? -off : from === 'right' ? off : 0;
  const dy = from === 'bottom' ? off : 0;
  const bobY = bob ? Math.sin((f + delay) / 7) * 8 : 0;
  const talkS = talking && !M[name]?.ngomong1 ? 1 + Math.abs(Math.sin(f / 3)) * 0.04 : 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: size, transform: `translate(${dx}px, ${dy + bobY}px) scale(${(flip ? -1 : 1) * talkS}, ${talkS}) rotate(${rotate}deg)`, transformOrigin: '50% 90%', filter: 'drop-shadow(8px 10px 0 rgba(0,0,0,0.18))'}}>
      <div style={{position: 'relative', width: '100%'}}>
        <Img src={staticFile(file)} style={{width: '100%', height: 'auto', display: 'block'}} />
        {mouth && open > 0.04 ? (() => {
          const gap = 0.013 * Math.min(1, open) * (mouth as any).k; // pecahan tinggi gambar
          const bw = 0.36, bh = 0.2, bx = mouth.cx - bw / 2, by = mouth.cy;
          const mask = 'linear-gradient(to bottom, transparent 0%, #000 9%, #000 38%, transparent 100%)';
          const maskX = 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)';
          return (
            <>
              <div style={{position: 'absolute', left: `${(mouth.cx - mouth.w * 0.42) * 100}%`, top: `${(mouth.cy - 0.004) * 100}%`, width: `${mouth.w * 0.84 * 100}%`, height: `${(gap + 0.008) * 100}%`, background: 'radial-gradient(ellipse at 50% 30%, #2a0f12 0%, #4a1f23 70%, #6b3036 100%)', borderRadius: '30% 30% 50% 50% / 0 0 100% 100%', filter: 'blur(0.6px)'}} />
              <div style={{position: 'absolute', left: `${bx * 100}%`, top: `${by * 100}%`, width: `${bw * 100}%`, height: `${bh * 100}%`, overflow: 'hidden', transform: `translateY(${(gap / bh) * 100}%)`, WebkitMaskImage: `${mask}, ${maskX}`, WebkitMaskComposite: 'source-in', maskImage: `${mask}, ${maskX}`, maskComposite: 'intersect'}}>
                <Img src={staticFile(file)} style={{position: 'absolute', width: `${100 / bw}%`, left: `${-(bx / bw) * 100}%`, top: `${-(by / bh) * 100}%`, height: 'auto'}} />
              </div>
            </>
          );
        })() : null}
      </div>
    </div>
  );
};
