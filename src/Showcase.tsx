import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Camera, CamKey} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';
import {Chip, PAPER, PaperBg, Pill, Sparkles, Sticker, Title} from './engine/ui';
import {CircleReveal, DrawPath, KineticText, RingStat, VsCards} from './engine/fx';

const P = POSES;

const Scene: React.FC<{
  pill: {text: string; color: string};
  cam: CamKey[];
  easing?: (t: number) => number;
  poses: PoseKey[];
  rays?: boolean;
  title?: string;
  accent?: string;
  thumbUp?: boolean;
  children?: React.ReactNode;
}> = ({pill, cam, easing, poses, rays, title, accent, thumbUp, children}) => (
  <AbsoluteFill>
    <Camera keys={cam} easing={easing}>
      <PaperBg rays={rays} />
      <Sparkles />
      <Pill text={pill.text} color={pill.color} />
      {title && <Title text={title} accent={accent} y={240} size={96} />}
      {children}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(540 1450) scale(0.95)">
          <Stickman keys={poses} ink={PAPER.ink} headFill="#fff" accent={PAPER.red} thumbUp={thumbUp} />
        </g>
      </svg>
    </Camera>
  </AbsoluteFill>
);

const push = (a = 1.0, b = 1.07): CamKey[] => [
  {f: 0, s: a},
  {f: 120, s: b},
];

/* 1. Teks kinetik */
const A = () => (
  <Scene
    rays
    pill={{text: 'Efek 1 • Teks kinetik', color: PAPER.red}}
    cam={[
      {f: 0, s: 1.3, y: -200},
      {f: 18, s: 1.0},
      {f: 116, s: 1.06},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 20, pose: P.pointUp, blend: 8},
      {f: 80, pose: P.present, blend: 10},
    ]}
  >
    <KineticText
      y={430}
      size={128}
      words={[
        {t: 'Satu'},
        {t: 'kata'},
        {t: 'satu', hl: PAPER.blue},
        {t: 'ledakan', hl: PAPER.red},
        {t: 'gerak'},
      ]}
    />
  </Scene>
);

/* 2. Angka hidup */
const B = () => (
  <Scene
    pill={{text: 'Efek 2 • Angka hidup', color: PAPER.blue}}
    title="Data jadi *terasa*"
    accent={PAPER.blue}
    cam={push(1.0, 1.06)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 14, pose: P.point, blend: 8},
      {f: 70, pose: P.happy, blend: 8},
      {f: 90, pose: P.present, blend: 8},
    ]}
  >
    <RingStat x={50} y={560} value={72} label="Contoh A" color={PAPER.blue} at={10} />
    <RingStat x={395} y={560} value={45} label="Contoh B" color={PAPER.orange} at={18} />
    <RingStat x={740} y={560} value={90} label="Contoh C" color={PAPER.green} at={26} />
  </Scene>
);

/* 3. Garis digambar */
const C = () => (
  <Scene
    pill={{text: 'Efek 3 • Garis digambar', color: PAPER.green}}
    cam={[
      {f: 0, x: -900, s: 1.0},
      {f: 12, x: 0, s: 1.0},
      {f: 120, s: 1.05, x: 0},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 16, pose: P.point, blend: 8},
      {f: 90, pose: P.present, blend: 10},
    ]}
    title="Alur *rapi*"
    accent={PAPER.green}
  >
    <DrawPath
      at={14}
      dur={70}
      points={[
        [210, 560],
        [820, 700],
        [260, 860],
        [820, 1020],
      ]}
      labels={['Ide', 'Naskah', 'Animasi', 'Render']}
    />
  </Scene>
);

/* 4. VS */
const D = () => (
  <Scene
    pill={{text: 'Efek 4 • Sebelum vs sesudah', color: PAPER.orange}}
    cam={[
      {f: 0, s: 1.0},
      {f: 36, s: 1.0},
      {f: 44, s: 1.14, y: -120},
      {f: 120, s: 1.05, y: -40},
    ]}
    poses={[
      {f: 0, pose: P.stress},
      {f: 36, pose: P.happy, blend: 8},
      {f: 70, pose: P.thumbs, blend: 8},
    ]}
    thumbUp
  >
    <VsCards
      y={320}
      left={{title: 'Biasa', lines: ['Teks diam', 'Tanpa arah', 'Cepat bosan']}}
      right={{title: 'Engine', lines: ['Teks bergerak', 'Kamera hidup', 'Ditonton sampai habis']}}
    />
  </Scene>
);

/* 5. Penutup */
const E = () => (
  <Scene
    rays
    pill={{text: 'Siap dipakai ulang', color: PAPER.red}}
    title="Ganti isi, *jadi* video baru"
    accent={PAPER.red}
    cam={[
      {f: 0, s: 1.2, y: -120},
      {f: 14, s: 1.0},
      {f: 100, s: 1.05},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.happy},
      {f: 18, pose: P.thumbs, blend: 8},
    ]}
    thumbUp
  >
    <Chip text="Template" color={PAPER.blue} at={14} x={150} y={680} />
    <Chip text="JSON" color={PAPER.green} at={24} x={520} y={680} />
    <Chip text="Render" color={PAPER.orange} at={34} x={300} y={820} />
    <Sticker text="Rp0" at={50} x={620} y={950} rotate={-8} />
  </Scene>
);

export const SHOWCASE_FRAMES = 580;

export const Showcase: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const lens = [120, 120, 120, 120, 100];
  const OV = 16;
  const starts = [0, 120, 240, 360, 480];
  const scenes = [A, B, C, D, E];
  return (
    <AbsoluteFill style={{backgroundColor: PAPER.bg, opacity: o}}>
      {scenes.map((S, i) => (
        <Sequence key={i} from={starts[i] - (i ? OV : 0)} durationInFrames={lens[i] + (i ? OV : 0) + (i < 4 ? OV : 0)}>
          {i ? (
            <CircleReveal dur={OV}>
              <S />
            </CircleReveal>
          ) : (
            <S />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
