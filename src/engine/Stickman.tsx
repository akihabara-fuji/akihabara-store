import React, {createContext, useContext} from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';

export type Face = 'neutral' | 'shock' | 'stress' | 'focus' | 'happy' | 'talk';

/** Semua sudut dalam derajat, diukur dari arah "ke bawah"; positif = ke kanan layar. */
export type Pose = {
  lu: number; ll: number; // lengan kiri atas / bawah
  ru: number; rl: number; // lengan kanan atas / bawah
  lt: number; ls: number; // paha / betis kiri
  rt: number; rs: number; // paha / betis kanan
  lean: number; // condong badan
  tilt: number; // miring kepala
  y: number; // naik turun badan
  face: Face;
};

export const POSES: Record<string, Pose> = {
  idle: {lu: -14, ll: -8, ru: 14, rl: 8, lt: -7, ls: -4, rt: 7, rs: 4, lean: 0, tilt: 0, y: 0, face: 'neutral'},
  shock: {lu: -128, ll: -150, ru: 128, rl: 150, lt: -16, ls: -10, rt: 16, rs: 10, lean: -4, tilt: -6, y: -26, face: 'shock'},
  stress: {lu: -142, ll: 152, ru: 142, rl: -152, lt: -9, ls: -3, rt: 9, rs: 3, lean: 5, tilt: 7, y: 6, face: 'stress'},
  stressDown: {lu: -150, ll: 160, ru: 150, rl: -160, lt: -13, ls: -12, rt: 13, rs: 12, lean: 8, tilt: 10, y: 22, face: 'stress'},
  typeA: {lu: -30, ll: -12, ru: 30, rl: 12, lt: -10, ls: -4, rt: 10, rs: 4, lean: 5, tilt: 4, y: 0, face: 'focus'},
  typeB: {lu: -26, ll: -2, ru: 34, rl: 22, lt: -10, ls: -4, rt: 10, rs: 4, lean: 5, tilt: 3, y: 0, face: 'focus'},
  think: {lu: -16, ll: -6, ru: 62, rl: 170, lt: -8, ls: -4, rt: 8, rs: 4, lean: 0, tilt: -8, y: 0, face: 'focus'},
  happy: {lu: -150, ll: -168, ru: 150, rl: 168, lt: -18, ls: -10, rt: 18, rs: 10, lean: 0, tilt: 4, y: -34, face: 'happy'},
  happyLand: {lu: -120, ll: -150, ru: 120, rl: 150, lt: -10, ls: -22, rt: 10, rs: 22, lean: 0, tilt: 0, y: 14, face: 'happy'},
  talk: {lu: -14, ll: -8, ru: 14, rl: 8, lt: -7, ls: -4, rt: 7, rs: 4, lean: 0, tilt: 2, y: 0, face: 'talk'},
  present: {lu: -72, ll: -98, ru: 12, rl: 8, lt: -7, ls: -4, rt: 7, rs: 4, lean: 0, tilt: 4, y: 0, face: 'talk'},
  point: {lu: -14, ll: -8, ru: 104, rl: 114, lt: -7, ls: -4, rt: 7, rs: 4, lean: -2, tilt: -3, y: 0, face: 'talk'},
  pointUp: {lu: -14, ll: -8, ru: 140, rl: 164, lt: -7, ls: -4, rt: 7, rs: 4, lean: 0, tilt: -4, y: 0, face: 'talk'},
  thumbs: {lu: -34, ll: 28, ru: 70, rl: 176, lt: -7, ls: -4, rt: 7, rs: 4, lean: 0, tilt: 4, y: 0, face: 'happy'},
};

export type PoseKey = {f: number; pose: Pose; blend?: number};

const NUM_KEYS: (keyof Pose)[] = ['lu', 'll', 'ru', 'rl', 'lt', 'ls', 'rt', 'rs', 'lean', 'tilt', 'y'];

/** Pose pada frame tertentu: tiap key dicapai di frame f, bergerak dari key sebelumnya dalam `blend` frame (ada overshoot). */
export const poseAt = (keys: PoseKey[], frame: number): Pose => {
  let cur = keys[0].pose;
  let face = keys[0].pose.face;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const blend = k.blend ?? 9;
    const start = k.f - blend;
    if (frame < start) break;
    const t = interpolate(frame, [start, k.f], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(1.9)),
    });
    const next: Pose = {...cur};
    NUM_KEYS.forEach((n) => {
      (next[n] as number) = (cur[n] as number) + ((k.pose[n] as number) - (cur[n] as number)) * t;
    });
    if (t > 0.4) face = k.pose.face;
    next.face = face;
    if (frame >= k.f) {
      cur = {...k.pose};
    } else {
      cur = next;
      break;
    }
  }
  return {...cur, face};
};

const rad = (d: number) => (d * Math.PI) / 180;
const seg = (x: number, y: number, a: number, l: number): [number, number] => [
  x + Math.sin(rad(a)) * l,
  y + Math.cos(rad(a)) * l,
];

const INK = '#f7f9fc';
const SW = 15;
export const InkCtx = createContext({ink: INK, fill: '#0c2347'});

const Limb: React.FC<{a: [number, number]; b: [number, number]; c: [number, number]}> = ({a, b, c}) => {
  const {ink: INK} = useContext(InkCtx);
  return (
  <polyline
    points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`}
    fill="none"
    stroke={INK}
    strokeWidth={SW}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  );
};

const FaceSvg: React.FC<{face: Face; frame: number}> = ({face, frame}) => {
  const {ink: INK, fill: dark} = useContext(InkCtx);
  const blink = frame % 96 > 91;
  const eyeY = -6;
  switch (face) {
    case 'talk':
      return (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none">
          {blink ? (
            <>
              <path d="M-26,-6 h16" />
              <path d="M10,-6 h16" />
            </>
          ) : (
            <>
              <circle cx={-18} cy={eyeY} r={5} fill={INK} />
              <circle cx={18} cy={eyeY} r={5} fill={INK} />
            </>
          )}
          <ellipse cx={0} cy={28} rx={11} ry={3 + Math.abs(Math.sin(frame / 3)) * 9} fill={INK} />
        </g>
      );
    case 'shock':
      return (
        <g>
          <circle cx={-18} cy={eyeY} r={11} fill={INK} />
          <circle cx={18} cy={eyeY} r={11} fill={INK} />
          <circle cx={-18} cy={eyeY} r={4} fill={dark} />
          <circle cx={18} cy={eyeY} r={4} fill={dark} />
          <ellipse cx={0} cy={26} rx={10} ry={14} fill={dark} stroke={INK} strokeWidth={5} />
        </g>
      );
    case 'stress':
      return (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none">
          <path d="M-28,-14 L-10,-6 L-28,2" />
          <path d="M28,-14 L10,-6 L28,2" />
          <path d="M-18,30 Q-9,20 0,30 T18,30" />
          <path d="M44,-30 q8,14 0,22 q-8,-8 0,-22" fill="#68baff" stroke="none" />
        </g>
      );
    case 'focus':
      return (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none">
          {blink ? (
            <>
              <path d="M-26,-6 h16" />
              <path d="M10,-6 h16" />
            </>
          ) : (
            <>
              <circle cx={-18} cy={eyeY} r={5} fill={INK} />
              <circle cx={18} cy={eyeY} r={5} fill={INK} />
            </>
          )}
          <path d="M-12,28 h24" />
          <path d="M-28,-22 l18,4" />
          <path d="M28,-22 l-18,4" />
        </g>
      );
    case 'happy':
      return (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none">
          <path d="M-28,-2 Q-18,-16 -8,-2" />
          <path d="M8,-2 Q18,-16 28,-2" />
          <path d="M-20,20 Q0,46 20,20 Z" fill={INK} />
          <path d="M-40,18 h-10 M40,18 h10" stroke="#ff9db0" strokeWidth={8} />
        </g>
      );
    default:
      return (
        <g stroke={INK} strokeWidth={6} strokeLinecap="round" fill="none">
          {blink ? (
            <>
              <path d="M-26,-6 h16" />
              <path d="M10,-6 h16" />
            </>
          ) : (
            <>
              <circle cx={-18} cy={eyeY} r={5} fill={INK} />
              <circle cx={18} cy={eyeY} r={5} fill={INK} />
            </>
          )}
          <path d="M-14,26 Q0,36 14,26" />
        </g>
      );
  }
};

/** Stickman SVG. Titik (0,0) = leher. Taruh dengan <g transform=translate(...)>. */
export const Stickman: React.FC<{
  keys: PoseKey[];
  thumbUp?: boolean;
  accent?: string;
  ink?: string;
  headFill?: string;
  shirt?: string;
  headGear?: React.ReactNode;
  backGear?: React.ReactNode;
  frontGear?: React.ReactNode;
  ringOff?: boolean;
}> = ({keys, thumbUp, accent = '#68baff', ink = INK, headFill = '#0c2347', shirt, headGear, backGear, frontGear, ringOff}) => {
  const frame = useCurrentFrame();
  const p = poseAt(keys, frame);
  const breathe = Math.sin(frame / 7) * 2.5;

  const LS: [number, number] = [-26, 0];
  const RS: [number, number] = [26, 0];
  const hip: [number, number] = seg(0, 0, p.lean, 170);
  const lE = seg(LS[0], LS[1], p.lu, 92);
  const lH = seg(lE[0], lE[1], p.ll, 92);
  const rE = seg(RS[0], RS[1], p.ru, 92);
  const rH = seg(rE[0], rE[1], p.rl, 92);
  const lK = seg(hip[0], hip[1], p.lt, 118);
  const lF = seg(lK[0], lK[1], p.ls, 118);
  const rK = seg(hip[0], hip[1], p.rt, 118);
  const rF = seg(rK[0], rK[1], p.rs, 118);
  const headC = seg(0, 0, 180 + p.tilt, 64);

  return (
    <InkCtx.Provider value={{ink, fill: headFill}}>
    <g transform={`translate(0 ${p.y + breathe})`}>
      {backGear}
      <line x1={0} y1={0} x2={hip[0]} y2={hip[1]} stroke={ink} strokeWidth={SW + 3} strokeLinecap="round" />
      <line x1={LS[0]} y1={0} x2={RS[0]} y2={0} stroke={ink} strokeWidth={SW} strokeLinecap="round" />
      <Limb a={LS} b={lE} c={lH} />
      <Limb a={RS} b={rE} c={rH} />
      <Limb a={hip} b={lK} c={lF} />
      <Limb a={hip} b={rK} c={rF} />
      {shirt && (
        <g>
          <polygon
            points={`${LS[0] - 8},-6 ${RS[0] + 8},-6 ${hip[0] + 26},${hip[1] - 4} ${hip[0] - 26},${hip[1] - 4}`}
            fill={shirt}
            stroke={ink}
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <line x1={LS[0]} y1={0} x2={lE[0]} y2={lE[1]} stroke={ink} strokeWidth={30} strokeLinecap="round" />
          <line x1={LS[0]} y1={0} x2={lE[0]} y2={lE[1]} stroke={shirt} strokeWidth={18} strokeLinecap="round" />
          <line x1={RS[0]} y1={0} x2={rE[0]} y2={rE[1]} stroke={ink} strokeWidth={30} strokeLinecap="round" />
          <line x1={RS[0]} y1={0} x2={rE[0]} y2={rE[1]} stroke={shirt} strokeWidth={18} strokeLinecap="round" />
        </g>
      )}
      {frontGear}
      {thumbUp && (
        <g>
          <rect x={rH[0] - 18} y={rH[1] - 22} width={36} height={34} rx={14} fill={ink} />
          <rect x={rH[0] - 8} y={rH[1] - 62} width={18} height={46} rx={9} fill={ink} />
        </g>
      )}
      <g transform={`translate(${headC[0]} ${headC[1]}) rotate(${p.tilt})`}>
        <circle r={56} fill={headFill} stroke={ink} strokeWidth={SW} />
        {!ringOff && <circle r={74} fill="none" stroke={accent} strokeWidth={4} opacity={0.5} />}
        <FaceSvg face={p.face} frame={frame} />
        {headGear}
      </g>
    </g>
    </InkCtx.Provider>
  );
};
