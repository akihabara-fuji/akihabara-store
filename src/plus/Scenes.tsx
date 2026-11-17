import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, H, SAFE, W, sticker} from './theme';
import {GridBackground} from './GridBackground';
import {Highlighter} from './Highlighter';
import {StickerCard} from './StickerCard';
import {ArrowLine} from './ArrowLine';
import {BigNumber} from './BigNumber';
import {Mascot} from './Mascot';
import {CameraPlus as Camera} from './CameraPlus';
import {pop, range, easeOut} from './timing';

export type Item = {title: string; sub?: string; bg?: string; fill?: number};
import type {StageSpec} from './Stage';
import type {Stage2Spec} from './Stage2';
import type {SideSpec} from './Side';
export type PlusSpec = {
  stage?: StageSpec;
  stage2?: Stage2Spec;
  side?: SideSpec;
  type: 'judul' | 'kartu' | 'angka' | 'paket' | 'statchart' | 'ranking' | 'versus' | 'notif' | 'chat' | 'daycounter' | 'minggu';
  sec?: number; voice?: string; caption?: string; sfx?: number[];
  mascot?: {name: string; emotion: string; talking?: boolean};
  fileName?: string;
  team?: {name?: string; emotion?: string; initial?: string; color?: string; label: string}[];
  title: string; titleColor?: string; sub?: string; items?: Item[];
  stat?: {value: number; decimals?: number; suffix?: string; label: string; note?: string};
  bg?: string;
  bars?: {label: string; value: number; color?: string}[];
  unit?: string;
  versus?: {left: {title: string; lines: string[]}; right: {title: string; lines: string[]}};
  notifs?: {app: string; text: string; color?: string}[];
  total?: string;
  chat?: {who: 'user' | 'ai'; text: string; at: number}[];
  chatTitle?: string;
  day?: {n: number; of: number; big?: string};
  cta?: string;
  tag?: string;
  tagColor?: string;
  shot?: {fh?: number; px?: number; cover?: boolean; src: string; w: number; h: number; video?: string; from?: number; focus?: {x: number; y: number; w: number; h: number; label?: string}[]};
  week?: {day: string; text: string; color?: string}[];
  grup?: {title: string; msgs: {name: string; mascot?: string; emotion?: string; initial?: string; color?: string; text: string; at: number; me?: boolean; file?: {name: string; ext: string; open?: number}}[]};
  ceklis?: {status: 'ok' | 'mid' | 'bad'; text: string; sub?: string}[];
  placeholder?: string;
  tim?: {name: string; emotion: string; label: string; text: string; at: number}[];
  dikaSeq?: {at: number; emotion: string; size?: number; x?: number; flip?: boolean; rotate?: number}[];
  besar?: string[]; gagal?: string[]; gagalFix?: string;
  panelNote?: string;
  fase?: {at: number; mode: 'siang' | 'malam' | 'pagi'; label: string; dika: string; bots?: {name: string; emotion: string; label: string}[]}[];
  alur?: {title: string; sub: string; bg: string; imgs?: {name: string; emotion: string}[]}[];
};

export const Shell: React.FC<{spec: PlusSpec; frames: number; bg?: string; children: React.ReactNode; cam?: React.ComponentProps<typeof Camera>['keys']; shake?: boolean}> = ({spec, frames, bg, children, cam, shake}) => (
  <AbsoluteFill>
    <GridBackground bg={bg ?? spec.bg} />
    <Camera keys={cam ?? [{f: 0, s: 1}, {f: frames, s: 1.05}]} shake={shake ? {from: 0, to: 14, amp: 16} : undefined}>
      {children}
      {spec.tag && <div style={{position: 'absolute', left: 70, top: 152, fontFamily: FONT, fontWeight: 700, fontSize: 28, letterSpacing: 2, padding: '6px 18px', color: C.ink, ...sticker(spec.tagColor ?? C.lime, 5)}}>{spec.tag}</div>}
    </Camera>
  </AbsoluteFill>
);

export const Title: React.FC<{text: string; color?: string; size?: number; y?: number}> = ({text, color, size = 110, y = SAFE.top + 40}) => (
  <div style={{position: 'absolute', left: SAFE.left, right: SAFE.right, top: y, textAlign: 'center'}}><Highlighter text={text} size={size} color={color} /></div>
);

export const HookScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(f, fps, 14);
  return (
    <Shell spec={spec} frames={frames} shake cam={[{f: 0, s: 1.15}, {f: 20, s: 1}, {f: frames, s: 1.06}]}>
      <Title text={spec.title} color={spec.titleColor} size={108} y={SAFE.top + 130} />
      {spec.sub && (
        <div style={{position: 'absolute', left: 90, right: 160, top: SAFE.top + 520, textAlign: 'center', transform: `scale(${0.8 + 0.2 * s})`, opacity: s}}>
          <div style={{display: 'inline-block', fontFamily: FONT, fontWeight: 700, fontSize: 56, padding: '16px 34px', color: C.ink, ...sticker(C.yellow, 8)}}>{spec.sub}</div>
        </div>
      )}
      {spec.mascot && <Mascot {...spec.mascot} size={600} x={240} y={880} delay={6} from="bottom" />}
    </Shell>
  );
};

export const StepsScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const items = spec.items ?? [];
  const pos: [number, number][] = [[70, 450], [420, 770], [70, 1090]];
  const dly = [10, 26, 42];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1, y: 0}, {f: frames, s: 1.05, y: 30}]}>
      <Title text={spec.title} color={spec.titleColor} size={104} />
      {items.slice(0, 3).map((it, i) => (
        <div key={i} style={{position: 'absolute', left: pos[i][0], top: pos[i][1]}}>
          <StickerCard title={it.title} sub={it.sub} bg={it.bg} delay={dly[i]} rotate={i % 2 ? 2 : -2} w={540} badge={String(i + 1)} fill={it.fill} />
        </div>
      ))}
      <ArrowLine from={[330, 692]} to={[430, 768]} bend={-30} delay={22} />
      <ArrowLine from={[700, 1012]} to={[600, 1086]} bend={30} delay={38} />
      {spec.mascot && <Mascot {...spec.mascot} size={340} x={680} y={1110} delay={30} from="right" />}
    </Shell>
  );
};

export const StatScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const st = spec.stat!;
  const bars = [0.55, 0.7, 0.4, 0.85, 0.3];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1.1}, {f: 24, s: 1}, {f: frames, s: 1.04}]}>
      <Title text={spec.title} color={spec.titleColor} size={92} />
      <div style={{position: 'absolute', left: 0, right: 100, top: 520, display: 'flex', justifyContent: 'center'}}>
        <BigNumber value={st.value} decimals={st.decimals} suffix={st.suffix} label={st.label} delay={8} color={spec.titleColor ?? C.pink} />
      </div>
      <div style={{position: 'absolute', left: 520, top: 1030, width: 440, height: 260, display: 'flex', alignItems: 'flex-end', gap: 16, ...sticker('#fff', 8), padding: 22, boxSizing: 'border-box'}}>
        {bars.map((b, i) => (
          <div key={i} style={{flex: 1, height: `${b * 100 * range(f, 20 + i * 5, 40 + i * 5, 0, 1, easeOut)}%`, background: i === 3 ? C.red : C.ink, borderRadius: 8}} />
        ))}
      </div>
      {st.note && <div style={{position: 'absolute', left: 500, top: 1310, width: 480, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 30, color: '#555'}}>{st.note}</div>}
      {spec.mascot && <Mascot {...spec.mascot} size={420} x={50} y={990} delay={18} from="left" />}
    </Shell>
  );
};

export const CtaScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const items = spec.items ?? [];
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const btn = pop(f, fps, 60);
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.05}]}>
      <Title text={spec.title} color={spec.titleColor} size={104} />
      {items.slice(0, 3).map((it, i) => (
        <div key={i} style={{position: 'absolute', left: 90, top: 400 + i * 250}}>
          <StickerCard title={it.title} sub={it.sub} bg={it.bg} delay={8 + i * 14} w={820} h={190} badge={String(i + 1)} rotate={i % 2 ? 1 : -1} />
        </div>
      ))}
      {(spec.cta ?? 'Komen: AUDIT') !== '' && (
        <div style={{position: 'absolute', left: 90, top: 1190, transform: `scale(${0.7 + 0.3 * btn})`, opacity: btn}}>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, padding: '18px 30px', color: '#fff', ...sticker(C.ink, 8), background: C.ink, boxShadow: `8px 8px 0 ${C.lime}`}}>{spec.cta ?? 'Komen: AUDIT'}</div>
        </div>
      )}
      {spec.mascot && <Mascot {...spec.mascot} size={300} x={640} y={1300} delay={20} from="bottom" />}
    </Shell>
  );
};

export const BASE_SCENES = {judul: HookScene, kartu: StepsScene, angka: StatScene, paket: CtaScene};
