import React from 'react';
import {AbsoluteFill} from 'remotion';
import {POSES, Stickman} from './engine/Stickman';
import {PAPER} from './engine/ui';
import {Cap, Glasses, Headset, Peci, PencilBand, Toga} from './KangCatat';

export const SHEET_W = 2400;
export const SHEET_H = 1700;
const I = PAPER.ink;
const names = Object.keys(POSES);
const gears: [string, React.ReactNode][] = [
  ['togaglasses', <><Toga /><Glasses /></>], ['glasses', <Glasses />], ['cap', <Cap />],
  ['headset', <Headset />], ['peci', <Peci />], ['pensil', <PencilBand />],
];
const L: React.CSSProperties = {fontFamily: 'Arial', fontWeight: 900, fontSize: 30, color: I};

export const ModelSheet: React.FC = () => (
  <AbsoluteFill style={{background: PAPER.bg}}>
    <div style={{...L, position: 'absolute', left: 50, top: 24, fontSize: 56}}>MODEL SHEET — KANG CATAT (stickman kaos kuning UT)</div>
    <div style={{...L, position: 'absolute', left: 50, top: 100, fontWeight: 700, fontSize: 28}}>
      Garis hitam tebal #111 · kepala bulat putih · badan = kaos kuning #FFC20E · leher/kaki garis · gaya neo-brutalist (outline tebal + bayangan keras)
    </div>
    <svg width={SHEET_W} height={SHEET_H} style={{position: 'absolute', inset: 0}}>
      {names.map((n, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        const x = 190 + c * 340, y = 330 + r * 480;
        return (
          <g key={n}>
            <rect x={x - 150} y={y - 120} width={300} height={450} rx={22} fill="#fff" stroke={I} strokeWidth={5} />
            <g transform={`translate(${x} ${y + 20}) scale(0.5)`}>
              <Stickman keys={[{f: 0, pose: POSES[n]}]} ink={I} headFill="#fff" shirt="#FFC20E" ringOff headGear={<><Toga /><Glasses /></>} />
            </g>
            <text x={x} y={y + 300} textAnchor="middle" fontFamily="Arial" fontWeight={900} fontSize={28} fill={I}>{n} · {POSES[n].face}</text>
          </g>
        );
      })}
      {gears.map(([n, g], i) => {
        const x = 190 + i * 340, y = 1290;
        return (
          <g key={n}>
            <rect x={x - 150} y={y - 110} width={300} height={450} rx={22} fill="#fff" stroke={I} strokeWidth={5} />
            <g transform={`translate(${x} ${y + 20}) scale(0.5)`}>
              <Stickman keys={[{f: 0, pose: POSES.talk}]} ink={I} headFill="#fff" shirt="#FFC20E" ringOff headGear={g} />
            </g>
            <text x={x} y={y + 300} textAnchor="middle" fontFamily="Arial" fontWeight={900} fontSize={28} fill={I}>gear: {n}</text>
          </g>
        );
      })}
      {[['bg', PAPER.bg], ['ink', PAPER.ink], ['red', PAPER.red], ['blue', PAPER.blue], ['green', PAPER.green], ['yellow', PAPER.yellow], ['orange', PAPER.orange], ['UT', '#FFC20E']].map(([n, c], i) => (
        <g key={n}>
          <rect x={2090} y={1180 + i * 62 - 40} width={50} height={50} rx={10} fill={c} stroke={I} strokeWidth={5} />
          <text x={2165} y={1180 + i * 62 + 5} fontFamily="Arial" fontWeight={900} fontSize={26} fill={I}>{n} {c}</text>
        </g>
      ))}
    </svg>
  </AbsoluteFill>
);
