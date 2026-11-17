import React from 'react';
import {AbsoluteFill} from 'remotion';
import {POSES, Stickman} from './engine/Stickman';
import {PAPER, PaperBg} from './engine/ui';

const I = PAPER.ink;
const UT = '#FFC20E';
const P = POSES;

export const Glasses = () => (
  <g fill="rgba(255,255,255,0.35)" stroke={I} strokeWidth={5}>
    <circle cx={-18} cy={-6} r={19} />
    <circle cx={18} cy={-6} r={19} />
    <line x1={-1} y1={-6} x2={1} y2={-6} />
    <line x1={-37} y1={-8} x2={-54} y2={-14} />
    <line x1={37} y1={-8} x2={54} y2={-14} />
  </g>
);

export const Toga = () => (
  <g stroke={I} strokeWidth={5} strokeLinejoin="round">
    <path d="M-42 -38 L-42 -18 Q0 4 42 -18 L42 -38 Z" fill="#2b2b2b" />
    <polygon points="-88,-52 0,-86 88,-52 0,-20" fill="#1a1a1a" />
    <line x1={0} y1={-52} x2={66} y2={-46} />
    <line x1={66} y1={-46} x2={68} y2={-8} />
    <rect x={60} y={-12} width={16} height={26} rx={4} fill={UT} />
  </g>
);

export const Notebook = () => (
  <g stroke={I} strokeWidth={5} strokeLinejoin="round">
    <rect x={-46} y={34} width={92} height={110} rx={10} fill={PAPER.blue} />
    <rect x={-34} y={50} width={68} height={30} rx={6} fill="#fff" />
    <line x1={-26} y1={62} x2={26} y2={62} strokeWidth={4} />
    <line x1={-26} y1={72} x2={10} y2={72} strokeWidth={4} />
    {[-30, -10, 10, 30].map((x) => (
      <circle key={x} cx={x} cy={34} r={5} fill="#fff" />
    ))}
    <text x={0} y={122} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff" stroke="none" fontFamily="Arial Black, Arial">
      CATAT
    </text>
  </g>
);

export const PencilBand = () => (
  <g stroke={I} strokeWidth={4} strokeLinejoin="round">
    <rect x={-50} y={-40} width={100} height={18} rx={4} fill={PAPER.red} />
    <text x={0} y={-26} textAnchor="middle" fontSize={15} fontWeight={900} fill="#fff" stroke="none" fontFamily="Arial Black, Arial">
      UT
    </text>
    <g transform="translate(-62 -2) rotate(-28)">
      <rect x={-6} y={-44} width={12} height={58} fill={UT} />
      <polygon points="-6,14 6,14 0,30" fill="#f2d2a0" />
      <polygon points="-2.5,24 2.5,24 0,30" fill={I} stroke="none" />
      <rect x={-6} y={-44} width={12} height={10} fill="#ff9aa2" />
    </g>
  </g>
);

export const Headset = () => (
  <g stroke={I} strokeWidth={5} strokeLinecap="round" fill="none">
    <path d="M-58 -6 Q-58 -70 0 -70 Q58 -70 58 -6" strokeWidth={9} />
    <rect x={-70} y={-24} width={20} height={42} rx={8} fill={PAPER.red} />
    <rect x={50} y={-24} width={20} height={42} rx={8} fill={PAPER.red} />
    <path d="M60 18 Q60 52 18 46" strokeWidth={6} />
    <circle cx={14} cy={46} r={9} fill={I} />
  </g>
);

export const Tie = () => (
  <g stroke={I} strokeWidth={4} strokeLinejoin="round" fill={PAPER.red}>
    <polygon points="-11,8 11,8 7,28 -7,28" />
    <polygon points="-7,28 7,28 16,100 0,124 -16,100" />
  </g>
);

export const Cap = () => (
  <g stroke={I} strokeWidth={5} strokeLinejoin="round" fill={PAPER.blue}>
    <path d="M-56 -16 Q-56 -76 0 -76 Q56 -76 56 -16 Z" />
    <path d="M18 -22 L96 -10 Q104 2 92 6 L16 -8 Z" />
    <circle cx={0} cy={-76} r={6} fill={UT} />
  </g>
);

export const Backpack = () => (
  <g stroke={I} strokeWidth={6} strokeLinejoin="round">
    <rect x={-70} y={-6} width={140} height={150} rx={30} fill={PAPER.orange} />
    <rect x={-40} y={80} width={80} height={46} rx={12} fill="#c9674a" />
  </g>
);

export const Cape = () => (
  <path d="M-30 -4 L30 -4 L96 230 Q64 214 40 232 Q10 214 -16 232 Q-52 214 -96 230 Z" fill={PAPER.red} stroke={I} strokeWidth={6} strokeLinejoin="round" />
);

export const Mask = () => (
  <g>
    <path d="M-46 -20 Q0 -38 46 -20 L42 8 Q0 -6 -42 8 Z" fill={PAPER.red} stroke={I} strokeWidth={4} />
    <ellipse cx={-18} cy={-6} rx={12} ry={9} fill="#fff" />
    <ellipse cx={18} cy={-6} rx={12} ry={9} fill="#fff" />
    <circle cx={-18} cy={-6} r={5} fill={I} />
    <circle cx={18} cy={-6} r={5} fill={I} />
  </g>
);

export const Hachimaki = () => (
  <g stroke={I} strokeWidth={4} strokeLinejoin="round">
    <rect x={-54} y={-42} width={108} height={24} rx={4} fill="#fff" />
    <text x={0} y={-24} textAnchor="middle" fontSize={20} fontWeight={900} fill={PAPER.red} stroke="none" fontFamily="Arial Black, Arial">
      UAS!
    </text>
    <path d="M62 -34 Q74 -10 62 -4 Q50 -10 62 -34 Z" fill="#8ecbff" strokeWidth={3} />
    <path d="M70 12 Q80 30 70 36 Q60 30 70 12 Z" fill="#8ecbff" strokeWidth={3} />
  </g>
);

export const Mug = () => (
  <g stroke={I} strokeWidth={5} strokeLinejoin="round" fill="#fff">
    <rect x={30} y={56} width={52} height={58} rx={10} />
    <path d="M82 70 Q108 72 100 94 Q94 104 82 100" fill="none" />
    <rect x={30} y={56} width={52} height={14} fill="#6b3f1d" />
    <path d="M44 44 Q36 32 46 22 M62 44 Q54 32 64 22" fill="none" strokeWidth={4} opacity={0.5} />
  </g>
);

export const Peci = () => (
  <g stroke={I} strokeWidth={5} strokeLinejoin="round">
    <polygon points="-50,-34 -40,-74 40,-74 50,-34" fill="#1d1d1d" />
    <rect x={-50} y={-40} width={100} height={8} fill={UT} />
  </g>
);

type V = {name: string; sub: string; pose: keyof typeof POSES; head?: React.ReactNode; back?: React.ReactNode; front?: React.ReactNode; thumb?: boolean};

const gl = (x: React.ReactNode, y: React.ReactNode) => (
  <>
    {x}
    {y}
  </>
);

const VARS: V[] = [
  {name: '1. Wisudawan', sub: 'topi toga', pose: 'present', head: <Toga />},
  {name: '2. Si Rajin', sub: 'kacamata + buku CATAT', pose: 'talk', head: <Glasses />, front: <Notebook />},
  {name: '3. Anak Tutor', sub: 'ikat kepala UT + pensil', pose: 'think', head: <PencilBand />},
  {name: '4. Kreator', sub: 'headset + mic', pose: 'happy', head: <Headset />},
  {name: '5. Kantoran', sub: 'dasi + kacamata', pose: 'point', head: <Glasses />, front: <Tie />},
  {name: '6. Mahasiswa', sub: 'topi + ransel', pose: 'thumbs', head: <Cap />, back: <Backpack />, thumb: true},
  {name: '7. Pahlawan Nilai A', sub: 'jubah + topeng', pose: 'pointUp', head: <Mask />, back: <Cape />},
  {name: '8. Mode UAS', sub: 'hachimaki + keringat', pose: 'stress', head: <Hachimaki />},
  {name: '9. Santai Ngopi', sub: 'kopi + senyum', pose: 'happy', front: <Mug />},
  {name: '10. Kang Asli', sub: 'peci hitam', pose: 'present', head: <Peci />},
];

export const KANGCATAT_W = 2000;
export const KANGCATAT_H = 1300;

export const KangCatat: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: PAPER.bg}}>
    <PaperBg />
    <div style={{position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 52, color: I}}>
      Kang Catat — 10 gaya maskot
    </div>
    {VARS.map((v, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = 20 + col * 392;
      const y = 110 + row * 590;
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y, width: 370, height: 570, background: '#fff', border: `6px solid ${I}`, borderRadius: 26, boxShadow: `10px 10px 0 ${I}`}}>
          <svg width={358} height={560} viewBox="0 0 358 560" style={{position: 'absolute', left: 0, top: 0}}>
            <g transform="translate(179 150) scale(0.66)">
              <Stickman
                keys={[{f: 0, pose: P[v.pose]}]}
                ink={I}
                headFill="#fff"
                shirt={UT}
                ringOff
                thumbUp={v.thumb}
                headGear={v.head}
                backGear={v.back}
                frontGear={v.front}
              />
            </g>
          </svg>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 20, textAlign: 'center', fontFamily: 'Arial, sans-serif'}}>
            <div style={{fontSize: 30, fontWeight: 900}}>{v.name}</div>
            <div style={{fontSize: 22, fontWeight: 700, color: '#555', marginTop: 2}}>{v.sub}</div>
          </div>
        </div>
      );
    })}
  </AbsoluteFill>
);
