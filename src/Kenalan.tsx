import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './engine/Camera';
import {POSES, Stickman} from './engine/Stickman';
import {PAPER, PaperBg, Pill, Sparkles} from './engine/ui';
import {Glasses, Notebook, Toga} from './KangCatat';

const I = PAPER.ink;
const UT = '#FFC20E';
const P = POSES;

export const KENALAN_FRAMES = 150;

/** Label nama: besar di awal, lalu menciut jadi tanda pojok kiri atas. */
const NameTag: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - 14, fps, config: {damping: 8, stiffness: 160}});
  const shrink = interpolate(frame, [96, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = interpolate(shrink, [0, 1], [1, 0.34]);
  const x = interpolate(shrink, [0, 1], [540, 175]);
  const y = interpolate(shrink, [0, 1], [470, 135]);
  const sub = interpolate(frame, [40, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - shrink);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${Math.max(0, pop) * scale}) rotate(${-3 * (1 - shrink)}deg)`,
        transformOrigin: 'center',
        textAlign: 'center',
        fontFamily: 'Arial Black, Arial, sans-serif',
      }}
    >
      <div
        style={{
          background: UT,
          border: `8px solid ${I}`,
          borderRadius: 28,
          boxShadow: `14px 14px 0 ${I}`,
          padding: '14px 46px',
          fontSize: 120,
          fontWeight: 900,
          letterSpacing: -3,
          color: I,
          whiteSpace: 'nowrap',
        }}
      >
        Kang Catat
      </div>
      <div
        style={{
          marginTop: 26,
          opacity: sub,
          fontSize: 42,
          fontWeight: 800,
          fontFamily: 'Arial, sans-serif',
          color: I,
        }}
      >
        <span style={{background: '#fff', border: `5px solid ${I}`, borderRadius: 16, padding: '6px 22px', boxShadow: `6px 6px 0 ${I}`}}>
          temen nyatet lu soal UT
        </span>
      </div>
    </div>
  );
};

/** Penanda tetap di bawah (lower-third) setelah perkenalan. */
const Handle: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [118, 130], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        top: 1700,
        opacity: o,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 900,
        fontSize: 34,
        color: I,
        background: '#fff',
        border: `5px solid ${I}`,
        borderRadius: 14,
        boxShadow: `6px 6px 0 ${I}`,
        padding: '8px 22px',
      }}
    >
      @catatanakademik
    </div>
  );
};

export const Kenalan: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: PAPER.bg}}>
    <Camera keys={[{f: 0, s: 1.1, y: -80}, {f: 20, s: 1.0}, {f: 150, s: 1.04}]} easing={Easing.out(Easing.exp)}>
      <PaperBg rays />
      <Sparkles />
      <Pill text="Kenalan dulu" color={PAPER.red} />
      <NameTag />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(540 1180) scale(1.1)">
          <Stickman
            keys={[
              {f: 0, pose: P.talk},
              {f: 24, pose: P.present, blend: 8},
              {f: 60, pose: P.talk, blend: 8},
              {f: 100, pose: P.thumbs, blend: 8},
            ]}
            ink={I}
            headFill="#fff"
            shirt={UT}
            ringOff
            headGear={
              <>
                <Toga />
                <Glasses />
              </>
            }
          />
        </g>
      </svg>
      <Handle />
    </Camera>
  </AbsoluteFill>
);
