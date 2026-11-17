import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './engine/Camera';
import {POSES, Stickman} from './engine/Stickman';
import {PAPER, PaperBg, Sparkles} from './engine/ui';
import {KineticText, KWord} from './engine/fx';
import {Glasses, Toga} from './KangCatat';

const I = PAPER.ink;
const UT = '#FFC20E';
const P = POSES;

export const HOOK_FRAMES = 75;

const Warn: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 2, fps, config: {damping: 7, stiffness: 220}});
  const blink = frame % 14 < 7 ? 1 : 0.55;
  return (
    <div
      style={{
        position: 'absolute', left: 540, top: 215, transform: `translate(-50%,-50%) scale(${Math.max(0, s)}) rotate(-3deg)`,
        background: PAPER.red, color: '#fff', border: `8px solid ${I}`, borderRadius: 28, boxShadow: `10px 10px 0 ${I}`,
        padding: '10px 44px', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 84, letterSpacing: 2, opacity: blink,
        whiteSpace: 'nowrap',
      }}
    >
      ⚠ {text}
    </div>
  );
};

const DEFAULT_WORDS: KWord[] = [
  {t: 'Jangan'},
  {t: 'sampai'},
  {t: 'ujian'},
  {t: 'UAS', hl: PAPER.blue},
  {t: 'kamu'},
  {t: 'gagal', hl: PAPER.red},
  {t: 'gara-gara'},
  {t: 'ini!', hl: PAPER.red},
];

export const Hook: React.FC<{words?: KWord[]; warn?: string}> = ({words = DEFAULT_WORDS, warn = 'AWAS!'}) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 10], [0.55, 0], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: PAPER.bg}}>
      <Camera
        keys={[{f: 0, s: 1.3, y: -180}, {f: 12, s: 1.0}, {f: 74, s: 1.06}]}
        easing={Easing.out(Easing.exp)}
        shake={{from: 0, to: 22, amp: 14}}
      >
        <PaperBg rays />
        <Sparkles />
        <Warn text={warn} />
        <KineticText
          y={340}
          size={112}
          gap={4}
          at={6}
          words={words}
        />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform="translate(540 1330) scale(1.15)">
            <Stickman
              keys={[{f: 0, pose: P.shock}, {f: 24, pose: P.stress, blend: 8}]}
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
      </Camera>
      <AbsoluteFill style={{background: PAPER.red, opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
