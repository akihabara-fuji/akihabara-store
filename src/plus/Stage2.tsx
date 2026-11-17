import React from 'react';
import {Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {makeStar} from '@remotion/shapes';
import {Stickman, POSES, poseAt, Pose} from '../engine/Stickman';
import {Mascot} from './Mascot';
import {C, FONT} from './theme';
import {pop, range, easeOut, ease} from './timing';

/* =====================================================================
   Stage2: panel ilustrasi yang diatur per KATA.
   Semua `at` = frame lokal scene. Tidak ada kalimat narasi di panel.
   Elemen: node (ikon/maskot) dengan masuk/idle/gerak, stickman jalan/lari/loncat
   + pegang benda, edge melengkung beralur, fx (burst, cincin, confetti...), kamera, SFX CC0.
   ===================================================================== */
export type S2Node = {
  id: string; x: number; y: number; at: number; size?: number;
  icon?: string; mascot?: {name: string; emotion?: string}; color?: string; big?: string; bare?: boolean;
  enter?: 'pop' | 'drop' | 'left' | 'right' | 'up' | 'spin' | 'stamp' | 'grow' | 'none';
  idle?: 'bob' | 'wobble' | 'pulse' | 'shake' | 'spin' | 'none';
  out?: number; rot?: number; flip?: boolean; z?: number; sfx?: string | null;
  to?: {x: number; y: number; at: number; dur: number; arc?: number};
  follow?: {id: 'stick'; dx: number; dy: number; hand?: 'l' | 'r'; from?: number; until?: number};
  hit?: number[]; // frame saat node "ditekankan" (pulse)
  grow?: {at: number; to: number; dur?: number};
  emo?: {at: number; e: string}[];
  swap?: {at: number; icon?: string; color?: string; big?: string}; // ganti isi di tengah scene
  opacity?: number;
};
export type S2Edge = {from: string; to: string; at: number; dashed?: boolean; color?: string; bend?: number; flow?: boolean; width?: number; arrow?: boolean; sfx?: string | null};
export type S2Badge = {x: number; y: number; kind: 'check' | 'cross' | 'q' | 'warn' | 'star'; at: number; size?: number; follow?: string; sfx?: string | null};
export type S2Fx = {k: 'burst' | 'ring' | 'sparks' | 'speed' | 'confetti' | 'dizzy' | 'dust' | 'glow'; x: number; y: number; at: number; size?: number; color?: string; sfx?: string | null; dir?: number};
export type S2Stick = {
  x: number; y?: number; s?: number; flip?: boolean;
  keys: {f: number; pose: string; blend?: number}[];
  moves?: {at: number; dur: number; x: number; y?: number; gait?: 'walk' | 'run' | 'hop' | 'slide'}[];
  face?: {at: number; dir: 1 | -1}[];
  thumbUp?: boolean; out?: number; enterAt?: number;
};
export type S2Term = {x: number; y: number; w: number; h: number; title?: string; rows: {k: string; t: string; at?: number}[]; at?: number};
export type Stage2Spec = {
  bg?: string; nodes?: S2Node[]; edges?: S2Edge[]; badges?: S2Badge[]; fx?: S2Fx[]; stick?: S2Stick; term?: S2Term;
  cam?: {at: number; z?: number; x?: number; y?: number; dur?: number}[];
  shake?: {at: number; amp?: number; dur?: number}[];
  flash?: {at: number; color?: string}[];
  sfxq?: {at: number; k: string; v?: number}[];
};

const INK = '#111';
const UT = '#FFC20E';
const P = (o: Partial<Pose>): Pose => ({...POSES.idle, ...o});
const XPOSES: Record<string, Pose> = {
  ...POSES,
  shrug: P({lu: -78, ll: -40, ru: 78, rl: 40, tilt: -7, y: -4, face: 'neutral'}),
  cheer: P({lu: -155, ll: -172, ru: 155, rl: 172, y: -20, face: 'happy'}),
  lift: P({lu: -150, ll: -170, ru: 150, rl: 170, y: -4, face: 'focus'}),
  hold: P({lu: -52, ll: 26, ru: 52, rl: -26, lean: 2, face: 'focus'}),
  wind: P({ru: 168, rl: 104, lu: -22, ll: -10, lean: -10, tilt: -4, face: 'focus'}),
  throw: P({ru: 74, rl: 40, lu: -30, ll: -10, lean: 13, tilt: 3, face: 'talk'}),
  stop: P({ru: 136, rl: 152, lu: -14, ll: -8, tilt: -3, face: 'shock'}),
  press: P({ru: 100, rl: 94, lu: -14, ll: -8, lean: 9, face: 'focus'}),
  press2: P({ru: 114, rl: 112, lu: -14, ll: -8, lean: 14, y: 4, face: 'focus'}),
  scared: P({lu: -110, ll: -60, ru: 110, rl: 60, lean: -8, tilt: -8, y: -8, face: 'shock'}),
  slump: P({lu: -8, ll: -2, ru: 8, rl: 2, lean: 10, tilt: 12, y: 12, face: 'stress'}),
  lookL: P({ru: 104, rl: 114, lean: -2, tilt: -10, face: 'focus'}),
};
const phaseOf = (t: number, k: string) => t * (k === 'run' ? 0.85 : k === 'hop' ? 0.5 : 0.52);
const gaitPose = (kind: string, t: number): Pose => {
  const ph = phaseOf(t, kind), s = Math.sin(ph), c = Math.cos(ph);
  if (kind === 'run') {
    return P({lu: -70 * s + 20, ll: -20 * s - 40, ru: 70 * s + 20, rl: 20 * s - 40, lt: 62 * s, ls: 62 * s - 40 * Math.max(0, c), rt: -62 * s, rs: -62 * s - 40 * Math.max(0, -c), lean: 30, tilt: 8, y: -6 - 8 * Math.abs(c), face: 'focus'});
  }
  if (kind === 'hop') {
    const j = Math.abs(Math.sin(ph));
    return P({lu: -60 - 40 * j, ll: -70 - 40 * j, ru: 60 + 40 * j, rl: 70 + 40 * j, lt: -10 - 18 * j, ls: 14 * j, rt: 10 + 18 * j, rs: -14 * j, lean: 4, y: -46 * j, face: 'happy'});
  }
  if (kind === 'slide') return P({lean: 14, lt: -14, ls: -4, rt: 20, rs: 10, lu: -30, ll: -10, ru: 40, rl: 20, face: 'focus'});
  return P({lu: -32 * s, ll: -16 * s - 8, ru: 32 * s, rl: 16 * s + 8, lt: 28 * s, ls: 28 * s - 22 * Math.max(0, c), rt: -28 * s, rs: -28 * s - 22 * Math.max(0, -c), lean: 3, y: -3 * Math.abs(c), face: 'neutral'});
};
const seg = (x: number, y: number, a: number, l: number): [number, number] => [x + Math.sin((a * Math.PI) / 180) * l, y + Math.cos((a * Math.PI) / 180) * l];

/* ---------------- ikon ---------------- */
const Icon: React.FC<{name: string; s: number}> = ({name, s}) => {
  const p = {stroke: INK, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
      {name === 'search' && <><circle cx="42" cy="42" r="24" {...p} fill="#fff" /><path d="M60 60L82 82" {...p} strokeWidth={10} /></>}
      {name === 'list' && <><path d="M36 28H82M36 50H82M36 72H82" {...p} /><circle cx="20" cy="28" r="4" fill={INK} /><circle cx="20" cy="50" r="4" fill={INK} /><circle cx="20" cy="72" r="4" fill={INK} /></>}
      {name === 'doc' && <><path d="M24 12H60L76 28V88H24Z" {...p} fill="#fff" /><path d="M60 12V28H76" {...p} /><path d="M36 48H64M36 62H64M36 76H54" {...p} strokeWidth={6} /></>}
      {name === 'code' && <><path d="M36 28L12 50L36 72M64 28L88 50L64 72" {...p} strokeWidth={9} /><path d="M56 22L44 78" {...p} strokeWidth={6} /></>}
      {name === 'film' && <><rect x="14" y="22" width="72" height="56" rx="8" {...p} fill="#fff" /><path d="M42 36L62 50L42 64Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" /></>}
      {name === 'check' && <path d="M18 52L40 74L84 26" {...p} stroke="#1B9E4B" strokeWidth={13} />}
      {name === 'x' && <path d="M22 22L78 78M78 22L22 78" {...p} stroke="#E5322D" strokeWidth={14} />}
      {name === 'folder' && <><path d="M10 28H38L46 38H90V80H10Z" {...p} fill="#fff" /><path d="M10 46H90" {...p} strokeWidth={5} /></>}
      {name === 'file' && <><path d="M26 12H58L76 30V88H26Z" {...p} fill="#fff" /><path d="M58 12V30H76" {...p} /></>}
      {name === 'gear' && <><circle cx="50" cy="50" r="16" {...p} fill="#fff" /><path d="M50 10V24M50 76V90M10 50H24M76 50H90M22 22L32 32M68 68L78 78M78 22L68 32M32 68L22 78" {...p} strokeWidth={9} /></>}
      {name === 'play' && <><circle cx="50" cy="50" r="36" {...p} fill="#fff" /><path d="M42 34L68 50L42 66Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" /></>}
      {name === 'link' && <><path d="M42 58C34 66 22 66 16 58C10 50 12 40 20 34L32 24M58 42C66 34 78 34 84 42C90 50 88 60 80 66L68 76M38 62L62 38" {...p} strokeWidth={8} /></>}
      {name === 'plus' && <><circle cx="50" cy="50" r="34" {...p} fill="#fff" /><path d="M50 32V68M32 50H68" {...p} strokeWidth={10} /></>}
      {name === 'bubble' && <><path d="M14 20H86V64H48L30 82V64H14Z" {...p} fill="#fff" /><path d="M32 42H68" {...p} strokeWidth={6} /></>}
      {name === 'bubbleQ' && <><path d="M14 20H86V64H48L30 82V64H14Z" {...p} fill="#fff" /><text x="50" y="52" textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize="38" fill={INK}>?</text></>}
      {name === 'bulb' && <><path d="M50 14C34 14 24 26 24 40C24 52 32 58 36 66H64C68 58 76 52 76 40C76 26 66 14 50 14Z" {...p} fill="#FFE45E" /><path d="M38 76H62M43 86H57" {...p} /><path d="M50 2V6M14 18L18 22M86 18L82 22M4 42H8M92 42H96" {...p} strokeWidth={5} /></>}
      {name === 'scroll' && <><path d="M26 14H74V72Q74 88 58 88H36Q26 88 26 76Z" {...p} fill="#fff" /><path d="M18 14H82" {...p} strokeWidth={11} /><path d="M36 30H64M36 42H64M36 54H64M36 66H54" {...p} strokeWidth={5} /></>}
      {name === 'ruler' && <><rect x="6" y="34" width="88" height="32" rx="6" {...p} fill="#FFE45E" /><path d="M22 34V48M36 34V44M50 34V48M64 34V44M78 34V48" {...p} strokeWidth={5} /></>}
      {name === 'person' && <><circle cx="50" cy="30" r="17" {...p} fill="#fff" /><path d="M20 88C20 62 34 54 50 54C66 54 80 62 80 88Z" {...p} fill="#fff" /></>}
      {name === 'role' && <><circle cx="50" cy="34" r="17" {...p} fill="#fff" /><path d="M20 90C20 64 34 56 50 56C66 56 80 64 80 90Z" {...p} fill="#FFE45E" /><path d="M42 24H58" {...p} strokeWidth={6} /></>}
      {name === 'book' && <><path d="M50 24C38 16 22 16 10 22V78C22 72 38 72 50 80C62 72 78 72 90 78V22C78 16 62 16 50 24Z" {...p} fill="#fff" /><path d="M50 24V80" {...p} /></>}
      {name === 'stop' && <><path d="M34 10H66L90 34V66L66 90H34L10 66V34Z" {...p} fill="#FF4B4B" /><path d="M28 50H72" stroke="#fff" strokeWidth={13} strokeLinecap="round" /></>}
      {name === 'target' && <><circle cx="50" cy="50" r="38" {...p} fill="#fff" /><circle cx="50" cy="50" r="22" {...p} fill="#FF7B72" /><circle cx="50" cy="50" r="7" fill={INK} /><path d="M50 50L86 14M78 12L88 12L88 22" {...p} strokeWidth={6} /></>}
      {name === 'warn' && <><path d="M50 12L92 84H8Z" {...p} fill="#FFE45E" /><path d="M50 38V60" {...p} strokeWidth={9} /><circle cx="50" cy="73" r="4.5" fill={INK} /></>}
      {name === 'note' && <><path d="M16 14H84V70L68 88H16Z" {...p} fill="#FFE45E" /><path d="M68 88V70H84" {...p} /><path d="M28 34H70M28 50H70" {...p} strokeWidth={5} /></>}
      {name === 'arrowUp' && <path d="M50 88V16M22 42L50 14L78 42" {...p} stroke={INK} strokeWidth={14} />}
      {name === 'arrowDown' && <path d="M50 12V84M22 58L50 86L78 58" {...p} stroke={INK} strokeWidth={14} />}
      {name === 'cloud' && <path d="M26 74C10 74 6 54 22 48C20 30 42 22 52 36C62 24 86 32 80 52C96 54 96 74 78 74Z" {...p} fill="#fff" />}
      {name === 'globe' && <><circle cx="50" cy="50" r="36" {...p} fill="#CFE3FF" /><path d="M14 50H86M50 14C34 30 34 70 50 86C66 70 66 30 50 14Z" {...p} strokeWidth={5} /></>}
      {name === 'shield' && <><path d="M50 8L86 20V50C86 70 68 84 50 92C32 84 14 70 14 50V20Z" {...p} fill="#fff" /><path d="M32 50L45 63L69 35" {...p} stroke="#1B9E4B" strokeWidth={11} /></>}
      {name === 'pen' && <><path d="M72 12L88 28L38 78L16 84L22 62Z" {...p} fill="#FF7B72" /><path d="M64 20L80 36" {...p} strokeWidth={5} /></>}
      {name === 'stamp' && <><path d="M42 54V34C42 22 58 22 58 34V54" {...p} /><rect x="24" y="54" width="52" height="16" rx="5" {...p} fill="#fff" /><rect x="20" y="74" width="60" height="12" rx="4" {...p} fill="#FF7B72" /></>}
      {name === 'button' && <><ellipse cx="50" cy="72" rx="40" ry="14" {...p} fill="#ccc" /><path d="M16 66V52C16 36 32 26 50 26C68 26 84 36 84 52V66C84 78 16 78 16 66Z" {...p} fill="#E5322D" /></>}
      {name === 'tangle' && <><path d="M12 62C24 18 46 92 54 42C60 8 84 72 90 28" {...p} strokeWidth={8} /><path d="M16 30C40 74 62 8 86 64" {...p} strokeWidth={8} /><path d="M10 48C30 40 62 60 90 46" {...p} strokeWidth={6} /></>}
      {name === 'block' && <rect x="10" y="10" width="80" height="80" rx="12" {...p} fill="#fff" />}
      {name === 'mic' && <><rect x="38" y="12" width="24" height="42" rx="12" {...p} fill="#fff" /><path d="M26 44C26 62 74 62 74 44M50 62V84M36 86H64" {...p} /></>}
      {name === 'wave' && <path d="M14 50V50M26 36V64M38 22V78M50 32V68M62 18V82M74 36V64M86 46V54" {...p} strokeWidth={8} />}
      {name === 'terminal' && <><rect x="10" y="18" width="80" height="64" rx="8" {...p} fill="#fff" /><path d="M24 40L38 50L24 60M46 62H66" {...p} /></>}
      {name === 'box' && <><path d="M50 12L86 30V70L50 88L14 70V30Z" {...p} fill="#fff" /><path d="M14 30L50 48L86 30M50 48V88" {...p} strokeWidth={5} /></>}
      {name === 'scale' && <><path d="M50 14V84M24 84H76M14 34H86" {...p} /><path d="M14 34L4 60H34ZM86 34L66 60H96Z" {...p} fill="#fff" /></>}
      {name === 'bug' && <><ellipse cx="50" cy="56" rx="20" ry="26" {...p} fill="#fff" /><path d="M50 30V82M30 46L14 40M70 46L86 40M30 62H12M70 62H88M32 78L18 88M68 78L82 88M40 30C40 18 60 18 60 30" {...p} strokeWidth={6} /></>}
    </svg>
  );
};

const Badge: React.FC<S2Badge & {tx?: number; ty?: number}> = ({x, y, kind, at, size = 64, tx, ty}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (f < at) return null;
  const a = pop(f, fps, at, 8);
  const bg = kind === 'check' ? '#fff' : kind === 'cross' ? '#FF4B4B' : kind === 'q' ? C.yellow : kind === 'star' ? '#FFE45E' : C.orange;
  return (
    <div style={{position: 'absolute', left: (tx ?? x) - size / 2, top: (ty ?? y) - size / 2, width: size, height: size, borderRadius: size / 2, background: bg, border: '5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${a}) rotate(${(1 - a) * -40}deg)`, fontFamily: FONT, fontWeight: 800, fontSize: size * 0.62, color: INK, zIndex: 20}}>
      {kind === 'check' && <Icon name="check" s={size * 0.7} />}
      {kind === 'cross' && <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 46 46"><path d="M8 8L38 38M38 8L8 38" stroke="#fff" strokeWidth={9} strokeLinecap="round" /></svg>}
      {kind === 'q' && '?'}
      {kind === 'warn' && '!'}
      {kind === 'star' && '★'}
    </div>
  );
};

/* ---------------- fx ---------------- */
const STAR = (r: number, pts = 12) => makeStar({points: pts, innerRadius: r * 0.62, outerRadius: r}).path;
const Fx: React.FC<{fx: S2Fx}> = ({fx}) => {
  const f = useCurrentFrame();
  const t = f - fx.at;
  const s = fx.size ?? 140;
  const col = fx.color ?? '#FFE45E';
  if (t < 0 || t > 60) return null;
  if (fx.k === 'burst') {
    const g = range(t, 0, 7, 0.2, 1.1, easeOut), o = range(t, 6, 22, 1, 0);
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15}}><g transform={`translate(${fx.x} ${fx.y}) scale(${g}) rotate(${t * 2})`} opacity={o}><path d={STAR(s)} transform={`translate(${-s} ${-s})`} fill={col} stroke={INK} strokeWidth={6} strokeLinejoin="round" /></g></svg>;
  }
  if (fx.k === 'ring') {
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15}}>{[0, 6].map((d) => { const u = range(t, d, d + 20, 0, 1, easeOut); return <circle key={d} cx={fx.x} cy={fx.y} r={s * 0.3 + u * s * 0.9} fill="none" stroke={fx.color ?? INK} strokeWidth={Math.max(1, 12 * (1 - u))} opacity={1 - u} />; })}</svg>;
  }
  if (fx.k === 'sparks') {
    const u = range(t, 0, 20, 0, 1, easeOut);
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15}}>{Array.from({length: 12}).map((_, i) => { const a = (i / 12) * Math.PI * 2; const r1 = s * 0.35 + u * s * 0.5, r2 = r1 + 26 * (1 - u); return <line key={i} x1={fx.x + Math.cos(a) * r1} y1={fx.y + Math.sin(a) * r1} x2={fx.x + Math.cos(a) * r2} y2={fx.y + Math.sin(a) * r2} stroke={col === '#FFE45E' ? INK : col} strokeWidth={7} strokeLinecap="round" opacity={1 - u} />; })}</svg>;
  }
  if (fx.k === 'confetti') {
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15}}>{Array.from({length: 26}).map((_, i) => { const a = ((i * 137) % 360) * (Math.PI / 180); const v = 90 + ((i * 53) % 140); const u = t / 40; const x = fx.x + Math.cos(a) * v * Math.min(1, u * 2); const y = fx.y + Math.sin(a) * v * Math.min(1, u * 2) * 0.6 - 60 * Math.sin(Math.min(1, u) * Math.PI) + u * u * 260; const cs = ['#FF7B72', '#FFE45E', '#4EE3A0', '#9CC8FF', '#E4A8FF'][i % 5]; return <rect key={i} x={x} y={y} width={14} height={9} fill={cs} stroke={INK} strokeWidth={2} transform={`rotate(${t * 14 + i * 40} ${x} ${y})`} opacity={range(t, 26, 40, 1, 0)} />; })}</svg>;
  }
  if (fx.k === 'dizzy') {
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15}}>{[0, 1, 2].map((i) => { const a = t * 0.22 + (i * Math.PI * 2) / 3; return <path key={i} d={STAR(15, 5)} transform={`translate(${fx.x + Math.cos(a) * 56 - 15} ${fx.y + Math.sin(a) * 16 - 15})`} fill="#FFE45E" stroke={INK} strokeWidth={3} opacity={range(t, 40, 60, 1, 0)} />; })}</svg>;
  }
  if (fx.k === 'dust') {
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4}}>{[0, 1, 2].map((i) => { const u = range(t, i * 3, 24 + i * 3, 0, 1, easeOut); return <circle key={i} cx={fx.x - (fx.dir ?? 1) * (u * 70 + i * 20)} cy={fx.y - u * 18} r={10 + u * 22} fill="#D9CDB5" opacity={0.75 * (1 - u)} />; })}</svg>;
  }
  if (fx.k === 'speed') {
    return <svg width={920} height={610} style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4}}>{[0, 1, 2, 3, 4].map((i) => <line key={i} x1={fx.x - (fx.dir ?? 1) * (60 + ((t * 40 + i * 70) % 160))} y1={fx.y - 100 + i * 46} x2={fx.x - (fx.dir ?? 1) * (200 + ((t * 40 + i * 70) % 160))} y2={fx.y - 100 + i * 46} stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.5} />)}</svg>;
  }
  const u = range(t, 0, 24, 0, 1, easeOut);
  return <div style={{position: 'absolute', left: fx.x - s, top: fx.y - s, width: s * 2, height: s * 2, borderRadius: s, background: `radial-gradient(circle, ${col} 0%, rgba(255,255,255,0) 70%)`, opacity: (1 - u) * 0.8, transform: `scale(${0.4 + u})`, zIndex: 3}} />;
};

/* ---------------- sfx ---------------- */
const SFX_DEF: Record<string, [string, number]> = {
  pop: ['pop', 0.32], tick: ['tick', 0.3], ok: ['ok', 0.34], bad: ['bad', 0.3], ask: ['ask', 0.3], hit: ['hit', 0.5], thud: ['thud', 0.5],
  whoosh: ['whoosh', 0.35], step: ['step', 0.22], power: ['power', 0.32], boing: ['boing', 0.34], paper: ['paper', 0.34], click: ['click', 0.3], slide: ['slide', 0.3],
};
const collectSfx = (s: Stage2Spec) => {
  const o: {at: number; k: string; v?: number}[] = [];
  (s.nodes ?? []).forEach((n) => { const k = n.sfx === null ? null : n.sfx ?? (n.enter === 'stamp' ? 'hit' : n.enter === 'drop' ? 'thud' : n.enter === 'left' || n.enter === 'right' || n.enter === 'up' ? 'whoosh' : n.enter === 'none' ? null : 'pop'); if (k) o.push({at: n.at, k}); if (n.to) o.push({at: n.to.at, k: 'whoosh', v: 0.8}); });
  (s.edges ?? []).forEach((e) => { if (e.sfx !== null) o.push({at: e.at, k: e.sfx ?? 'tick'}); });
  (s.badges ?? []).forEach((b) => { if (b.sfx !== null) o.push({at: b.at, k: b.sfx ?? (b.kind === 'check' ? 'ok' : b.kind === 'cross' ? 'bad' : b.kind === 'q' ? 'ask' : b.kind === 'warn' ? 'bad' : 'power')}); });
  (s.fx ?? []).forEach((x) => { if (x.sfx !== null && (x.k === 'burst' || x.sfx)) o.push({at: x.at, k: x.sfx ?? 'hit'}); });
  (s.stick?.moves ?? []).forEach((m) => { const g = m.gait ?? 'walk'; const per = g === 'run' ? 6 : g === 'hop' ? 12 : 13; for (let t = 0; t < m.dur; t += per) o.push({at: m.at + t, k: g === 'slide' ? 'slide' : 'step', v: 0.8}); });
  (s.sfxq ?? []).forEach((q) => o.push(q));
  return o;
};

/* ---------------- panel ---------------- */
const camAt = (keys: NonNullable<Stage2Spec['cam']>, f: number) => {
  let cur = {z: 1, x: 460, y: 305};
  for (const k of keys) {
    const to = {z: k.z ?? 1, x: k.x ?? 460, y: k.y ?? 305};
    const b = k.dur ?? 16;
    if (f < k.at - b) break;
    const u = range(f, k.at - b, k.at, 0, 1, ease);
    const nx = {z: cur.z + (to.z - cur.z) * u, x: cur.x + (to.x - cur.x) * u, y: cur.y + (to.y - cur.y) * u};
    if (f < k.at) { cur = nx; break; }
    cur = to;
  }
  return cur;
};

const stickState = (st: S2Stick, f: number) => {
  let x = st.x, y = st.y ?? 330, dir: 1 | -1 = st.flip ? -1 : 1, kind: string | null = null, mt = 0;
  for (const m of st.moves ?? []) {
    const ty = m.y ?? y;
    if (f < m.at) break;
    const u = range(f, m.at, m.at + m.dur, 0, 1, ease);
    if (m.x !== x) dir = m.x < x ? -1 : 1;
    const nx = x + (m.x - x) * u, ny = y + (ty - y) * u;
    if (f < m.at + m.dur) { x = nx; y = ny; kind = m.gait ?? 'walk'; mt = f - m.at; break; }
    x = m.x; y = ty;
  }
  for (const fc of st.face ?? []) if (f >= fc.at) dir = fc.dir;
  return {x, y, dir, kind, mt};
};

export const Stage2Panel: React.FC<{stage: Stage2Spec}> = ({stage}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nodes = stage.nodes ?? [];
  const st = stage.stick;
  const ss = st ? stickState(st, f) : null;
  const scale = st?.s ?? 0.5;
  // pose
  let pose: Pose | null = null;
  if (st && ss) {
    if (ss.kind) pose = gaitPose(ss.kind, ss.mt);
    else pose = poseAt(st.keys.map((k) => ({f: k.f, pose: XPOSES[k.pose] ?? POSES.idle, blend: k.blend})), f);
  }
  const hand = (side: 'l' | 'r'): [number, number] => {
    if (!pose || !ss) return [0, 0];
    const S: [number, number] = side === 'l' ? [-26, 0] : [26, 0];
    const e = seg(S[0], S[1], side === 'l' ? pose.lu : pose.ru, 92);
    const h = seg(e[0], e[1], side === 'l' ? pose.ll : pose.rl, 92);
    return [ss.x + ss.dir * scale * h[0], ss.y + scale * (h[1] + pose.y)];
  };
  // posisi node
  const pos = (n: S2Node) => {
    let x = n.x, y = n.y;
    if (n.to && f >= n.to.at) {
      const u = range(f, n.to.at, n.to.at + n.to.dur, 0, 1, ease);
      x = n.x + (n.to.x - n.x) * u; y = n.y + (n.to.y - n.y) * u - (n.to.arc ?? 0) * Math.sin(Math.PI * u);
    }
    if (n.follow && st && (n.follow.from === undefined || f >= n.follow.from) && (n.follow.until === undefined || f < n.follow.until)) {
      const h = hand(n.follow.hand ?? 'r');
      x = h[0] + n.follow.dx * ss!.dir; y = h[1] + n.follow.dy;
    }
    return [x, y] as const;
  };
  const camK = stage.cam ? camAt(stage.cam, f) : {z: 1, x: 460, y: 305};
  let shx = 0, shy = 0;
  (stage.shake ?? []).forEach((k) => { const t = f - k.at; const d = k.dur ?? 14; if (t >= 0 && t < d) { const a = (k.amp ?? 10) * (1 - t / d); shx += noise2D('sx', t * 0.9, 1) * a; shy += noise2D('sy', t * 0.9, 2) * a; } });
  const flash = (stage.flash ?? []).reduce((m, k) => Math.max(m, range(f, k.at, k.at + 3, 0, 1) * range(f, k.at + 3, k.at + 12, 1, 0) * 0.55), 0);
  const flashCol = (stage.flash ?? []).find((k) => f >= k.at && f < k.at + 12)?.color ?? '#fff';
  const sfx = collectSfx(stage);
  const back = nodes.filter((n) => (n.z ?? 0) < 0);
  const front = nodes.filter((n) => (n.z ?? 0) >= 0);
  const byId: Record<string, S2Node> = {};
  nodes.forEach((n) => { byId[n.id] = n; });

  const renderNode = (n: S2Node) => {
    if (f < n.at) return null;
    const s0 = n.size ?? 130;
    const t = f - n.at;
    const p = pop(f, fps, n.at, n.enter === 'drop' ? 7 : 11);
    let sc = 1, dx = 0, dy = 0, rot = n.rot ?? 0;
    const en = n.enter ?? 'pop';
    if (en === 'pop') sc = p;
    else if (en === 'drop') { dy = (1 - p) * -320; sc = 1; }
    else if (en === 'left') dx = (1 - p) * -420;
    else if (en === 'right') dx = (1 - p) * 420;
    else if (en === 'up') dy = (1 - p) * 340;
    else if (en === 'spin') { sc = p; rot += (1 - p) * -540; }
    else if (en === 'stamp') { sc = 1 + range(t, 0, 7, 1.4, 0, easeOut); }
    else if (en === 'grow') sc = 0.25 + 0.75 * range(t, 0, 16, 0, 1, easeOut);
    const idle = n.idle ?? 'none';
    const hs = n.id.length * 2;
    if (idle === 'bob') dy += Math.sin((f + hs) / 7) * 7;
    if (idle === 'wobble') rot += Math.sin((f + hs) / 4.5) * 6;
    if (idle === 'pulse') sc *= 1 + 0.06 * Math.sin((f + hs) / 4);
    if (idle === 'shake') { dx += noise2D('n' + n.id, f * 0.9, 0) * 7; dy += noise2D('m' + n.id, f * 0.9, 1) * 5; }
    if (idle === 'spin') rot += t * 7;
    (n.hit ?? []).forEach((h) => { if (f >= h) sc *= 1 + 0.32 * Math.exp(-(f - h) / 5) * Math.cos((f - h) * 0.9); });
    if (n.grow) sc *= 1 + (n.grow.to - 1) * range(f, n.grow.at, n.grow.at + (n.grow.dur ?? 14), 0, 1, easeOut);
    let op = n.opacity ?? 1;
    if (n.out !== undefined && f >= n.out) { const u = range(f, n.out, n.out + 7, 0, 1); sc *= 1 - u; op *= 1 - u; if (u >= 1) return null; }
    const [px, py] = pos(n);
    const emo = (n.emo ?? []).reduce((a, e) => (f >= e.at ? e.e : a), n.mascot?.emotion ?? 'kerja');
    const sw = n.swap && f >= n.swap.at ? n.swap : null;
    const icon = sw?.icon ?? n.icon, color = sw?.color ?? n.color, big = sw?.big ?? n.big;
    return (
      <div key={n.id} style={{position: 'absolute', left: px - s0 / 2, top: py - s0 / 2, width: s0, height: s0, transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${sc})`, opacity: op, zIndex: 8}}>
        {n.mascot ? (
          <div style={{position: 'absolute', left: -10, top: -14, width: s0 + 20}}>
            <Mascot name={n.mascot.name} emotion={emo} size={s0 + 20} x={0} y={0} from="none" bob delay={-200} flip={n.flip} />
          </div>
        ) : n.bare ? (
          <Icon name={icon ?? 'doc'} s={s0} />
        ) : (
          <div style={{width: s0, height: s0, borderRadius: 24, background: color ?? '#fff', border: '6px solid #111', boxShadow: '8px 8px 0 #111', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {big ? <span style={{fontFamily: FONT, fontWeight: 800, fontSize: s0 * (big.length > 3 ? 0.36 : 0.56), color: INK, letterSpacing: -1}}>{big}</span> : <Icon name={icon ?? 'doc'} s={s0 * 0.66} />}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{position: 'absolute', inset: 0, background: stage.bg ?? '#FFF8EE', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${camK.x}px ${camK.y}px`, transform: `translate(${shx}px, ${shy}px) scale(${camK.z})`}}>
        <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#EADFCB 2px, transparent 2px), linear-gradient(90deg, #EADFCB 2px, transparent 2px)', backgroundSize: '46px 46px', opacity: 0.55}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 38, height: 6, background: INK, opacity: 0.18}} />
        {back.map(renderNode)}
        <svg width={920} height={610} style={{position: 'absolute', inset: 0, zIndex: 3}}>
          {(stage.edges ?? []).map((e, i) => {
            const a = byId[e.from], b = byId[e.to];
            if (!a || !b || f < e.at) return null;
            const [ax, ay] = pos(a), [bx, by] = pos(b);
            const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
            const ra = (a.size ?? 130) / 2 + 8, rb = (b.size ?? 130) / 2 + 14;
            const x1 = ax + (dx / L) * ra, y1 = ay + (dy / L) * ra, x2 = bx - (dx / L) * rb, y2 = by - (dy / L) * rb;
            const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1;
            const cx = (x1 + x2) / 2 + (nx / nl) * (e.bend ?? 0), cy = (y1 + y2) / 2 + (ny / nl) * (e.bend ?? 0);
            const pr = range(f, e.at, e.at + 14, 0, 1, easeOut);
            const d = `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`;
            const col = e.color ?? INK;
            const tx = 2 * (1 - 1) * 0 + (x2 - cx), ty = y2 - cy, ta = Math.atan2(ty, tx) * (180 / Math.PI);
            const q = (u: number): [number, number] => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2];
            return (
              <g key={i}>
                <path d={d} pathLength={1} fill="none" stroke={col} strokeWidth={e.width ?? 8} strokeLinecap="round" strokeDasharray={e.dashed ? '0.012 0.04' : '1'} strokeDashoffset={e.dashed ? 0 : 1 - pr} opacity={e.dashed ? pr : 1} />
                {pr > 0.97 && e.arrow !== false && !e.dashed && <polygon points="0,-12 24,0 0,12" fill={col} transform={`translate(${x2 - 8} ${y2}) rotate(${ta}) translate(-8 0)`} />}
                {e.flow && pr >= 1 && [0, 1, 2].map((k) => { const u = ((f * 0.025 + k / 3) % 1); const [px, py] = q(u); return <circle key={k} cx={px} cy={py} r={8} fill={col === INK ? '#E5322D' : col} stroke="#fff" strokeWidth={3} />; })}
              </g>
            );
          })}
        </svg>
        {st && ss && pose && (() => {
          const run = ss.kind === 'run';
          const ghosts = run ? [3, 6, 9] : [];
          return (
            <svg width={920} height={610} style={{position: 'absolute', inset: 0, zIndex: 6}}>
              {st.out !== undefined && f >= st.out ? null : (
                <>
                  {run && [0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={ss.x - ss.dir * (70 + i * 6)} y1={ss.y + 40 + i * 52} x2={ss.x - ss.dir * (230 + ((f * 37 + i * 61) % 90))} y2={ss.y + 40 + i * 52} stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.5} />)}
                  {ghosts.map((g) => { const gs = stickState(st, f - g); const gp = gs.kind ? gaitPose(gs.kind, gs.mt) : pose!; return <g key={g} opacity={0.22 - g * 0.012} transform={`translate(${gs.x} ${gs.y}) scale(${gs.dir * scale} ${scale})`}><Stickman keys={[{f: 0, pose: gp}]} ink={INK} headFill="#fff" accent="#E5322D" shirt={UT} ringOff /></g>; })}
                  <g transform={`translate(${ss.x} ${ss.y}) scale(${ss.dir * scale} ${scale})`}>
                    <Stickman keys={[{f: 0, pose}]} ink={INK} headFill="#fff" accent="#E5322D" shirt={UT} thumbUp={st.thumbUp && !ss.kind && pose.face === 'happy'} />
                  </g>
                </>
              )}
            </svg>
          );
        })()}
        {front.map(renderNode)}
        {stage.term && (() => {
          const t = stage.term!;
          const a = pop(f, fps, t.at ?? 0, 12);
          const KC: Record<string, string> = {cmd: '#9CC8FF', ok: '#4EE3A0', bad: '#FF7B72', add: '#4EE3A0', del: '#FF7B72', dir: '#FFC93C', file: '#E6EDF3', plain: '#C9D1D9'};
          const KP: Record<string, string> = {cmd: '$ ', ok: 'v ', bad: 'x ', add: '+ ', del: '- ', dir: '> ', file: '  ', plain: ''};
          return (
            <div style={{position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, background: '#0f1b24', border: '6px solid #111', borderRadius: 20, boxShadow: '8px 8px 0 #111', overflow: 'hidden', transform: `scale(${a})`, transformOrigin: 'left center', zIndex: 7}}>
              <div style={{height: 38, background: '#24323d', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
                {['#FF5A52', '#FFC93C', '#4EE3A0'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
                {t.title && <div style={{marginLeft: 10, fontFamily: 'monospace', fontSize: 20, color: '#9aa7b2'}}>{t.title}</div>}
              </div>
              <div style={{padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6}}>
                {t.rows.map((r, i) => { const at = r.at ?? 12 + i * 14; const ra = range(f, at, at + 8, 0, 1); return <div key={i} style={{fontFamily: 'monospace', fontWeight: 700, fontSize: 30, color: KC[r.k], opacity: ra, whiteSpace: 'pre', background: r.k === 'add' ? 'rgba(78,227,160,.14)' : r.k === 'del' ? 'rgba(255,123,114,.16)' : 'transparent', padding: '0 6px'}}>{KP[r.k]}{r.t}</div>; })}
              </div>
            </div>
          );
        })()}
        {(stage.fx ?? []).map((x, i) => <Fx key={i} fx={x} />)}
        {(stage.badges ?? []).map((b, i) => { const fn = b.follow ? byId[b.follow] : null; const fp = fn ? pos(fn) : null; return <Badge key={i} {...b} tx={fp ? fp[0] + (b.x ?? 0) : undefined} ty={fp ? fp[1] + (b.y ?? 0) : undefined} />; })}
      </div>
      {flash > 0 && <div style={{position: 'absolute', inset: 0, background: flashCol, opacity: flash, zIndex: 30}} />}
      <div style={{position: 'absolute', right: 20, top: 14, fontFamily: FONT, fontWeight: 800, fontSize: 24, background: C.yellow, border: '4px solid #111', borderRadius: 12, padding: '2px 12px', transform: 'rotate(2deg)', zIndex: 40}}>ILUSTRASI</div>
      {sfx.map((q, i) => { const d = SFX_DEF[q.k]; if (!d) return null; return <Sequence key={i} from={Math.max(0, q.at)} durationInFrames={40} layout="none"><Audio src={staticFile(`sfx2/${d[0]}.mp3`)} volume={d[1] * (q.v ?? 1)} /></Sequence>; })}
    </div>
  );
};
