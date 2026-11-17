import {DIKA_MOUTH} from '../data/dikaMouth';
import {MASCOTS} from '../data/mascots';
import React from 'react';
import {useCurrentFrame, useVideoConfig, Img, staticFile} from 'remotion';
import {C, FONT, sticker} from './theme';
import {Mascot} from './Mascot';
import {pop, easeOut, range} from './timing';
import {PlusSpec, Shell, Title} from './Scenes';
import {SkyPanel} from './Scenes4';
import {StagePanel} from './Stage';
import {Stage2Panel} from './Stage2';
import {SidePanel} from './Side';

// Jaw puppet Dika dimatikan: hasilnya terlihat tempelan. Aktifkan lagi hanya bila ada foto mulut terbuka/tertutup asli.
const JAW_ON = false;
// Tukar gambar mulut AI dimatikan: pose loncat (laptop <-> tangan naik), terlihat glitch. Butuh varian mulut buka/tutup dengan pose sama.
const TALK_SWAP = false;
// gerak mulut: Dika ikut amplitudo suara asli, maskot AI buka-tutup selama kalimatnya muncul
const dikaNum = (e: string) => Number(((MASCOTS as any)['dika-asli'][e] ?? 'x-01.png').match(/-(\d+)\.png/)?.[1] ?? 1);
const talkAmt = (f: number, at: number, text: string, name: string) => {
  const dur = 14 + text.length * 2.2;
  if (f < at || f > at + dur) return 0;
  const seed = name.length * 3;
  return Math.sin(((f - at) + seed) * 0.95) + 0.35 * Math.sin((f - at) * 2.3) > -0.1 ? 1 : 0;
};

// Layout split: atas = konten, bawah = tim bot berkoordinasi, kanan bawah = Dika presentasi
export const SplitScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sh = spec.shot;
  const TW = 920, TH = 610;
  const tim = spec.tim ?? [];
  const seq = spec.dikaSeq ?? [{at: 0, emotion: 'halo'}];
  let di = 0;
  seq.forEach((p, k) => { if (f >= p.at) di = k; });
  const shown = tim.filter((m) => f >= m.at).slice(-4);
  const fo = sh?.focus ?? [];
  const base = sh ? Math.max(TW / sh.w, 0) : 1;
  const imgH = sh ? sh.h * base : 0;
  const t = range(f, 20, Math.max(40, frames - 15), 0, 1, easeOut);
  const f0 = fo[0];
  const cx = f0 && sh ? (f0.x + f0.w / 2) * base : TW / 2;
  const cy = f0 && sh ? (f0.y + f0.h / 2) * base : TH / 2;
  const zoom = 1 + t * 0.12;
  const oy = sh ? Math.min(0, Math.max(TH - imgH, TH / 2 - cy)) : 0;
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.015}]}>
      <Title text={spec.title} color={spec.titleColor} size={(spec as any).titleSize ?? 60} y={225} />
      <div style={{position: 'absolute', left: 80, top: 290, width: TW, height: TH, overflow: 'hidden', ...sticker('#fff', 7), opacity: pop(f, fps, 2)}}>
        {spec.stage2 ? (
          <Stage2Panel stage={spec.stage2} />
        ) : spec.stage ? (
          <StagePanel stage={spec.stage} />
        ) : spec.besar ? (
          <div style={{position: 'absolute', inset: 0, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8}}>
            {spec.besar.map((l, k) => { const a = pop(f, fps, 2 + k * 7, 12); return <div key={k} style={{fontFamily: FONT, fontWeight: 800, fontSize: l.length > 14 ? 84 : l.length > 11 ? 92 : 118, whiteSpace: 'nowrap', lineHeight: 1.05, color: C.ink, textAlign: 'center', padding: '2px 22px', background: k === 1 ? C.lime : k === 2 ? C.yellow : 'transparent', transform: `scale(${0.8 + 0.2 * a}) rotate(${k === 1 ? -1.5 : k === 2 ? 1 : 0}deg)`, opacity: a}}>{l}</div>; })}
          </div>
        ) : spec.fase ? (
          <div style={{transform: 'scale(0.958)', transformOrigin: 'top left', width: 960, height: 660}}><SkyPanel spec={spec} /></div>
        ) : sh ? (
          <div style={{position: 'absolute', left: 0, top: 0, width: TW, height: TH, transformOrigin: `${cx}px ${cy + oy}px`, transform: `scale(${zoom})`}}>
            <Img src={staticFile(sh.src)} style={{position: 'absolute', left: 0, top: oy, width: TW, height: imgH}} />
            {fo.map((r, i) => (
              <div key={i} style={{position: 'absolute', left: r.x * base - 6, top: oy + r.y * base - 6, width: r.w * base + 12, height: r.h * base + 12, border: `6px solid ${C.lime}`, borderRadius: 16, opacity: range(f, 30 + i * 16, 44 + i * 16, 0, 1, easeOut), boxShadow: '0 0 0 4px rgba(0,0,0,.45)'}} />
            ))}
          </div>
        ) : spec.gagal ? (
          <div style={{position: 'absolute', inset: 0, background: '#FFF8EE', padding: '70px 40px 22px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-start'}}>
            <div style={{position: 'absolute', right: 24, top: 16, fontFamily: FONT, fontWeight: 800, fontSize: 28, background: C.yellow, border: '4px solid #111', borderRadius: 12, padding: '2px 14px', transform: 'rotate(2deg)'}}>ILUSTRASI</div>
            {spec.gagal.map((g, k) => { const a = pop(f, fps, 6 + k * 16, 12); const x = pop(f, fps, 18 + k * 16, 10); return (
              <div key={k} style={{display: 'flex', alignItems: 'center', gap: 22, background: '#fff', border: '5px solid #111', borderRadius: 22, padding: '10px 20px', opacity: a, transform: `translateX(${(1 - a) * -60}px)`}}>
                <div style={{width: 72, height: 72, borderRadius: 36, background: (spec as any).gagalOk ? '#fff' : '#FF4B4B', border: '5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.4 + 0.6 * x})`, flexShrink: 0}}>
                  {(spec as any).gagalOk ? <svg width="50" height="46" viewBox="0 0 50 46"><path d="M6 24L20 38L44 8" stroke="#1B9E4B" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg> : <svg width="46" height="46" viewBox="0 0 46 46"><path d="M8 8L38 38M38 8L8 38" stroke="#fff" strokeWidth="9" strokeLinecap="round" /></svg>}
                </div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 42, color: C.ink, lineHeight: 1.1}}>{g}</div>
              </div>); })}
            {spec.gagalFix ? (() => { const a = pop(f, fps, 6 + spec.gagal.length * 16 + 8, 12); return (
              <div style={{display: 'flex', alignItems: 'center', gap: 22, background: C.lime, border: '5px solid #111', borderRadius: 22, padding: '10px 20px', opacity: a, transform: `scale(${0.9 + 0.1 * a})`}}>
                <div style={{width: 72, height: 72, borderRadius: 36, background: '#fff', border: '5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                  <svg width="50" height="46" viewBox="0 0 50 46"><path d="M6 24L20 38L44 8" stroke="#1B9E4B" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                </div>
                <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 42, color: C.ink, lineHeight: 1.1}}>{spec.gagalFix}</div>
              </div>); })() : null}
          </div>
        ) : (
          <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,#EEE,#EEE 24px,#E2E2E2 24px,#E2E2E2 48px)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, fontFamily: FONT, fontWeight: 700, fontSize: 44, color: '#666'}}>{spec.placeholder ?? 'PLACEHOLDER'}</div>
        )}
      </div>
      <div style={{position: 'absolute', left: 80, top: 1070, width: 500, height: 800, padding: spec.side ? 0 : 14, boxSizing: "border-box", overflow: "hidden", ...sticker("#F2F4F8", 7)}}>
        {spec.side ? <SidePanel side={spec.side} /> : <>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink, opacity: 0.6, marginBottom: 8}}>{spec.panelNote ?? 'Tim AI berkoordinasi'}</div>
        {shown.map((m, k) => {
          const a = pop(f, fps, m.at, 10);
          return (
            <div key={m.at + m.label} style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, opacity: a, transform: `translateY(${(1 - a) * 30}px)`}}>
              <div style={{width: 104, height: 104, flex: '0 0 104px', position: 'relative'}}>
                <Mascot name={m.name} emotion={m.emotion} size={104} x={0} y={0} delay={m.at} from="none" bob={false} talkSwap={TALK_SWAP ? talkAmt(f, m.at, m.text, m.name) : undefined} />
              </div>
              <div style={{flex: 1, fontFamily: FONT, fontWeight: 700, fontSize: 30, lineHeight: 1.15, color: C.ink, padding: '10px 16px', ...sticker('#fff', 5)}}>
                <div style={{fontSize: 22, opacity: 0.55}}>{m.label}</div>{m.text}
              </div>
            </div>
          );
        })}
        </>}
      </div>
      <Mascot key={`d${di}`} mouth={DIKA_MOUTH[dikaNum(seq[di].emotion)]} open={JAW_ON ? ((spec as any)._env?.[f] ?? 0) : 0} name="dika-asli" emotion={seq[di].emotion} size={seq[di].size ?? 540} x={seq[di].x ?? 540} y={1920 - 0.82 * (seq[di].size ?? 540)} flip={seq[di].flip ?? false} rotate={seq[di].rotate ?? 0} delay={seq[di].at + 1} from="bottom" />
    </Shell>
  );
};
