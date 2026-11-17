import React, {createContext, useContext} from 'react';
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {Camera} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';
import {PAPER, PaperBg, Pill, Sparkles, Sticker, Title} from './engine/ui';
import {CircleReveal, RingStat, VsCards} from './engine/fx';
import {Cap, Glasses, Headset, Peci, PencilBand, Toga} from './KangCatat';
import {Hook} from './Hook';
import {Kenalan} from './Kenalan';
import {RoomScene, RoomSpec} from './Room';
import {CtaScene, CtaSpec, DeskScene, DeskSpec, JumpScene, JumpSpec} from './Desk';
import {PlusSpec} from './plus/Scenes';
import {PLUS_SCENES, PLUS_TYPES} from './plus/registry';
import {CaptionKit, CAP_BAND, pickStyle, CapStyle} from './plus/CaptionKit';
import {CaptionPill, makeChunks, makeSentences} from './plus/CaptionPill';
import {SfxTrigger} from './plus/SfxTrigger';
import {loadFonts} from './plus/theme';

const I = PAPER.ink;
const UT = '#FFC20E';
const P = POSES;
const F = 'Arial, sans-serif';
const FPS = 30;

/* ---------- Tipe data (isi file JSON) ---------- */
export type RowSpec = {t: string; sub?: string; mark?: string; color?: string};
type PlusRest = Omit<PlusSpec, 'type' | 'sec' | 'voice' | 'caption' | 'sfx'> & Common;
type Common = {voice?: string; sec?: number; caption?: string; sfx?: number[]; capStyle?: string; emph?: string[]};
export type SceneSpec =
  | ({type: 'intro'} & Common)
  | ({type: 'desk'} & DeskSpec & Common)
  | ({type: 'jump'} & JumpSpec & Common)
  | ({type: 'cta'} & CtaSpec & Common)
  | ({type: 'room'} & RoomSpec & Common)
  | ({type: 'hook'; words: {t: string; hl?: string}[]; warn?: string} & Common)
  | ({type: 'list'; pill: string; pillColor?: string; title: string; accent?: string; rows: RowSpec[]} & Common)
  | ({type: 'stats'; pill: string; pillColor?: string; title: string; accent?: string; stats: {value: number; label: string; color?: string}[]} & Common)
  | ({type: 'vs'; pill: string; pillColor?: string; left: {title: string; lines: string[]}; right: {title: string; lines: string[]}} & Common)
  | ({type: 'judul'} & PlusRest)
  | ({type: 'kartu'} & PlusRest)
  | ({type: 'angka'} & PlusRest)
  | ({type: 'paket'} & PlusRest)
  | ({type: 'statchart'} & PlusRest)
  | ({type: 'ranking'} & PlusRest)
  | ({type: 'versus'} & PlusRest)
  | ({type: 'notif'} & PlusRest)
  | ({type: 'chat'} & PlusRest)
  | ({type: 'daycounter'} & PlusRest)
  | ({type: 'minggu'} & PlusRest)
  | ({type: 'layar'} & PlusRest)
  | ({type: 'grup'} & PlusRest)
  | ({type: 'alur'} & PlusRest)
  | ({type: 'ceklis'} & PlusRest)
  | ({type: 'trailer'} & PlusRest)
  | ({type: 'penutup'} & PlusRest)
  | ({type: 'siangmalam'} & PlusRest) | ({type: 'split'} & PlusRest)
  | ({type: 'outro'; pill: string; pillColor?: string; title: string; accent?: string; rows?: RowSpec[]; sticker?: string} & Common);

export type GenericProps = {
  brand: {name: string; handle: string};
  gear: 'togaglasses' | 'toga' | 'glasses' | 'cap' | 'headset' | 'peci' | 'pensil' | 'none';
  scenes: SceneSpec[];
  frames?: number[];
  hasAudio?: boolean[];
  voiceDir?: string;
  hideBrand?: boolean;
  captionStyle?: CapStyle;
  env?: number[][];
};

const COLORS: Record<string, string> = {
  red: PAPER.red, blue: PAPER.blue, green: PAPER.green, yellow: PAPER.yellow, orange: PAPER.orange, ink: PAPER.ink,
};
const col = (c: string | undefined, d: string) => (c ? COLORS[c] ?? c : d);
const ROT = [PAPER.blue, PAPER.green, PAPER.orange, PAPER.red, PAPER.blue];

const DEFAULT_SEC: Record<string, number> = {room: 4, cta: 5, desk: 4, jump: 3.5, intro: 5, hook: 2.5, list: 5, stats: 5, vs: 5, outro: 4, judul: 3.5, kartu: 5, angka: 4, paket: 4.5, statchart: 5, ranking: 5, versus: 5, notif: 5, chat: 6, daycounter: 4, minggu: 7, layar: 6, grup: 7, alur: 7, ceklis: 6, trailer: 4, penutup: 6, siangmalam: 9};
const PAD = 12;
const MIN = 60;
const OV = 16;

export const calcGeneric: CalculateMetadataFunction<GenericProps> = async ({props}) => {
  const frames: number[] = [];
  const hasAudio: boolean[] = [];
  for (let i = 0; i < props.scenes.length; i++) {
    const sc = props.scenes[i];
    let f = Math.round((sc.sec ?? DEFAULT_SEC[sc.type]) * FPS);
    let a = false;
    try {
      const d = await getAudioDurationInSeconds(staticFile(`${props.voiceDir ?? 'voice'}/${i + 1}.mp3`));
      f = Math.max(Math.round(d * FPS) + PAD, MIN);
      a = true;
    } catch (e) {
      /* tanpa suara: pakai sec */
    }
    frames.push(f);
    hasAudio.push(a);
  }
  let env: number[][] | undefined;
  try { env = await (await fetch(staticFile(`${props.voiceDir ?? 'voice'}/env.json`))).json(); } catch (e) { /* tanpa env: mulut diam */ }
  return {durationInFrames: frames.reduce((x, y) => x + y, 0), props: {...props, frames, hasAudio, env}};
};

/* ---------- Bagian kecil ---------- */
const GapCtx = createContext(12);

const Gear: React.FC<{g: GenericProps['gear']}> = ({g}) => {
  switch (g) {
    case 'togaglasses': return <><Toga /><Glasses /></>;
    case 'toga': return <Toga />;
    case 'glasses': return <Glasses />;
    case 'cap': return <Cap />;
    case 'headset': return <Headset />;
    case 'peci': return <Peci />;
    case 'pensil': return <PencilBand />;
    default: return null;
  }
};

const Row: React.FC<{i: number; y: number; r: RowSpec}> = ({i, y, r}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gap = useContext(GapCtx);
  const s = spring({frame: frame - 14 - i * gap, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute', left: 70, top: y + i * 150, width: 940, height: 124, background: '#fff',
        border: `6px solid ${I}`, borderRadius: 26, boxShadow: `10px 10px 0 ${I}`, display: 'flex',
        alignItems: 'center', gap: 24, padding: '0 28px', fontFamily: F, transform: `translateX(${(1 - s) * -1100}px)`,
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: 36, background: col(r.color, ROT[i % ROT.length]), border: `5px solid ${I}`,
          color: '#fff', fontWeight: 900, fontSize: 40, textAlign: 'center', lineHeight: '62px', flexShrink: 0,
        }}
      >
        {r.mark ?? i + 1}
      </div>
      <div>
        <div style={{fontSize: 44, fontWeight: 900, lineHeight: 1.1}}>{r.t}</div>
        {r.sub && <div style={{fontSize: 30, fontWeight: 700, color: '#555', marginTop: 4}}>{r.sub}</div>}
      </div>
    </div>
  );
};

const Shell: React.FC<{
  d: number;
  gear: GenericProps['gear'];
  pill: string;
  pillColor?: string;
  title?: string;
  accent?: string;
  rays?: boolean;
  poses: PoseKey[];
  thumbUp?: boolean;
  gap?: number;
  children?: React.ReactNode;
}> = ({d, gear, pill, pillColor, title, accent, rays, poses, thumbUp, gap = 12, children}) => (
  <AbsoluteFill>
    <Camera keys={[{f: 0, s: 1.12, y: -120}, {f: 16, s: 1.0}, {f: d, s: 1.05}]} easing={Easing.out(Easing.exp)}>
      <PaperBg rays={rays} />
      <Sparkles />
      <Pill text={pill} color={col(pillColor, PAPER.blue)} />
      {title && <Title text={title} accent={col(accent, PAPER.blue)} y={240} size={92} />}
      <GapCtx.Provider value={gap}>{children}</GapCtx.Provider>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(540 1450) scale(0.95)">
          <Stickman keys={poses} ink={I} headFill="#fff" shirt={UT} ringOff thumbUp={thumbUp} headGear={<Gear g={gear} />} />
        </g>
      </svg>
    </Camera>
  </AbsoluteFill>
);

const rowGap = (d: number, n: number) => Math.max(10, Math.min(45, Math.round((d - 50) / (n + 1))));

const poseSet = (d: number, kind: 'talk' | 'happy' | 'stress'): PoseKey[] => {
  const a = Math.round(d * 0.45);
  const b = Math.round(d * 0.8);
  if (kind === 'stress') return [{f: 0, pose: P.stress}, {f: a, pose: P.think, blend: 8}, {f: b, pose: P.happy, blend: 8}];
  if (kind === 'happy') return [{f: 0, pose: P.happy}, {f: 18, pose: P.thumbs, blend: 8}];
  return [{f: 0, pose: P.talk}, {f: 20, pose: P.point, blend: 8}, {f: a, pose: P.present, blend: 8}, {f: b, pose: P.talk, blend: 8}];
};

type PlusScene = Extract<SceneSpec, {type: keyof typeof PLUS_SCENES}>;
const isPlus = (s: SceneSpec): s is PlusScene => (PLUS_TYPES as string[]).includes(s.type);
const SceneView: React.FC<{s: SceneSpec; d: number; gear: GenericProps['gear']}> = ({s, d, gear}) => {
  if (isPlus(s)) {
    const PS = PLUS_SCENES[s.type];
    return <PS spec={s as unknown as PlusSpec} frames={d} />;
  }
  if (s.type === 'intro') return <Kenalan />;
  if (s.type === 'desk') return <DeskScene d={d} spec={s} gear={<Gear g={gear} />} />;
  if (s.type === 'cta') return <CtaScene d={d} spec={s} gear={<Gear g={gear} />} />;
  if (s.type === 'room') return <RoomScene d={d} spec={s} />;
  if (s.type === 'jump') return <JumpScene d={d} spec={s} gear={<Gear g={gear} />} />;
  if (s.type === 'hook')
    return <Hook warn={s.warn} words={s.words.map((w) => ({t: w.t, hl: w.hl ? col(w.hl, w.hl) : undefined}))} />;
  if (s.type === 'list')
    return (
      <Shell d={d} gear={gear} pill={s.pill} pillColor={s.pillColor} title={s.title} accent={s.accent} poses={poseSet(d, 'talk')} gap={rowGap(d, s.rows.length)}>
        {s.rows.slice(0, 5).map((r, i) => <Row key={i} i={i} y={440} r={r} />)}
      </Shell>
    );
  if (s.type === 'stats')
    return (
      <Shell d={d} gear={gear} pill={s.pill} pillColor={s.pillColor} title={s.title} accent={s.accent} poses={poseSet(d, 'talk')}>
        {s.stats.slice(0, 3).map((st, i) => (
          <RingStat key={i} x={50 + i * 345} y={560} value={st.value} label={st.label} color={col(st.color, ROT[i])} at={10 + i * 8} />
        ))}
      </Shell>
    );
  if (s.type === 'vs')
    return (
      <Shell d={d} gear={gear} pill={s.pill} pillColor={s.pillColor} poses={poseSet(d, 'stress')} thumbUp>
        <VsCards y={320} left={s.left} right={s.right} />
      </Shell>
    );
  const rows = s.rows ?? [];
  return (
    <Shell d={d} gear={gear} rays pill={s.pill} pillColor={s.pillColor ?? 'red'} title={s.title} accent={s.accent ?? 'red'} poses={poseSet(d, 'happy')} thumbUp gap={rowGap(d, rows.length)}>
      {rows.slice(0, 4).map((r, i) => <Row key={i} i={i} y={480} r={r} />)}
      {s.sticker && <Sticker text={s.sticker} at={50} x={560} y={rows.length ? 480 + rows.length * 150 + 20 : 700} rotate={-6} />}
    </Shell>
  );
};

const Brand: React.FC<{brand: GenericProps['brand']}> = ({brand}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{opacity: o, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 40, top: 36, background: UT, border: `5px solid ${I}`, borderRadius: 14, boxShadow: `5px 5px 0 ${I}`, padding: '4px 22px', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 38}}>
        {brand.name}
      </div>
      {brand.handle && <div style={{position: 'absolute', left: 60, top: 1700, background: '#fff', border: `5px solid ${I}`, borderRadius: 14, boxShadow: `6px 6px 0 ${I}`, padding: '8px 22px', fontFamily: F, fontWeight: 900, fontSize: 34}}>
        {brand.handle}
      </div>}
    </AbsoluteFill>
  );
};

export const Generic: React.FC<GenericProps> = ({brand, gear, scenes, frames, hasAudio, voiceDir, hideBrand, captionStyle, env}) => {
  loadFonts();
  const fr = frames ?? scenes.map((s) => Math.round((s.sec ?? DEFAULT_SEC[s.type]) * FPS));
  const starts = fr.reduce<number[]>((a, l, i) => [...a, i ? a[i - 1] + fr[i - 1] : 0], []);
  return (
    <AbsoluteFill style={{backgroundColor: PAPER.bg}}>
      {scenes.map((s0, i) => { const s = (env?.[i] ? {...s0, _env: [...(i ? new Array(OV).fill(0) : []), ...env[i]]} : s0) as typeof s0; return (
        <Sequence key={i} from={Math.max(0, starts[i] - (i ? OV : 0))} durationInFrames={fr[i] + (i ? OV : 0) + (i < scenes.length - 1 ? OV : 0)}>
          {i ? <CircleReveal dur={OV}><SceneView s={s} d={fr[i]} gear={gear} /></CircleReveal> : <SceneView s={s} d={fr[i]} gear={gear} />}
        </Sequence>
      ); })}
      {scenes.map((s, i) => (s.caption ? (
        <Sequence key={`c${i}`} from={starts[i]} durationInFrames={fr[i]}>{(() => { const st = pickStyle(captionStyle, i, (s as any).capStyle); return st === 'pill' || s.type !== 'split' ? <CaptionPill chunks={s.type === 'split' ? makeSentences(s.caption, 6, fr[i] - 4) : makeChunks(s.caption, 6, fr[i] - 4)} bottom={s.type === 'split' ? 1010 : undefined} /> : <CaptionKit text={s.caption} startF={4} endF={Math.max(20, fr[i] - 12)} style={st as any} emph={(s as any).emph} wt={(s as any).wt} top={CAP_BAND.top} height={CAP_BAND.height} />; })()}</Sequence>
      ) : null))}
      {scenes.map((s, i) => (s.sfx ?? []).map((at) => (
        <Sequence key={`x${i}-${at}`} from={starts[i]} layout="none"><SfxTrigger at={at} /></Sequence>
      )))}
      {scenes.length > 1 && !hideBrand && (
        <Sequence from={starts[1]}>
          <Brand brand={brand} />
        </Sequence>
      )}
      {scenes.map((s, i) =>
        hasAudio?.[i] ? (
          <Sequence key={`a${i}`} from={starts[i]} durationInFrames={fr[i]}>
            <Audio src={staticFile(`${voiceDir ?? 'voice'}/${i + 1}.mp3`)} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
