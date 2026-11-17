import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Camera, CamKey, Parallax, SpeedStreaks} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';

const NAVY = '#07152f';
const MUTED = '#aab7c9';
const NECK = {x: 540, y: 780};
const UT_YELLOW = '#FFC20E';

const Backdrop: React.FC<{tint: string}> = ({tint}) => {
  const dots = Array.from({length: 26}, (_, i) => ({
    x: (i * 397) % 1080,
    y: (i * 611) % 1920,
    r: 3 + (i % 4) * 2,
  }));
  const rings = Array.from({length: 5}, (_, i) => ({x: 120 + i * 210, y: 300 + ((i * 523) % 1300), r: 90 + i * 22}));
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 50% 38%, ${tint} 0%, ${NAVY} 52%, #030812 100%)`}}
      />
      <Parallax depth={0.75}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#68baff" opacity={0.25} />
          ))}
        </svg>
      </Parallax>
      <Parallax depth={0.4}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {rings.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="none" stroke="#68baff" strokeWidth={3} opacity={0.14} />
          ))}
        </svg>
      </Parallax>
    </AbsoluteFill>
  );
};

const Floor: React.FC = () => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <ellipse cx={NECK.x} cy={1212} rx={250} ry={22} fill="#000" opacity={0.35} />
    <line x1={140} y1={1200} x2={940} y2={1200} stroke="#68baff" strokeWidth={4} opacity={0.35} strokeLinecap="round" />
  </svg>
);

const fmt = (v: number) => v.toFixed(2).replace('.', ',');

const Score: React.FC<{from: number; to: number; start?: number; dur?: number; y: number; label: string}> = ({
  from,
  to,
  start = 6,
  dur = 34,
  y,
  label,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - start, fps, durationInFrames: dur, config: {damping: 20}});
  const v = from + (to - from) * Math.max(0, p);
  const color = interpolateColors(v, [16.75, 41.55], ['#69e0ad', '#ff7777']);
  const pop = interpolate(frame, [start + dur - 6, start + dur, start + dur + 8], [1, 1.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        textAlign: 'center',
        fontFamily: 'Arial Black, Arial, sans-serif',
        transform: `scale(${pop})`,
      }}
    >
      <div style={{fontSize: 190, fontWeight: 900, letterSpacing: -8, color, lineHeight: 1}}>
        {fmt(v)}
        <span style={{fontSize: 80}}>%</span>
      </div>
      <div style={{fontSize: 30, color: MUTED, marginTop: 14, fontFamily: 'Arial, sans-serif'}}>{label}</div>
    </div>
  );
};

const Chip: React.FC<{text: string; at: number; x: number; y: number; n: number}> = ({text, at, x, y, n}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${Math.max(0, p)})`,
        transformOrigin: 'left center',
        padding: '18px 30px',
        borderRadius: 22,
        background: 'rgba(3,12,29,0.9)',
        border: '3px solid #68baff',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 900,
        fontSize: 40,
        color: '#fff',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{color: '#68baff', marginRight: 14}}>{n}</span>
      {text}
    </div>
  );
};

const Caption: React.FC<{title: string; sub: string; accent: string}> = ({title, sub, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - 4, fps, config: {damping: 14, stiffness: 120}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 380}}>
      <div
        style={{
          width: 900,
          padding: '24px 32px',
          borderRadius: 24,
          background: 'rgba(3,12,29,0.9)',
          border: `3px solid ${accent}`,
          boxShadow: '0 10px 40px #0009',
          transform: `translateY(${(1 - p) * 160}px)`,
          opacity: Math.min(1, p * 1.5),
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{fontSize: 46, fontWeight: 900, color: '#fff', lineHeight: 1.1}}>{title}</div>
        <div style={{fontSize: 29, color: '#cfe4ff', marginTop: 12, lineHeight: 1.25}}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};

type SceneProps = {
  tint: string;
  accent: string;
  poses: PoseKey[];
  cam: CamKey[];
  easing?: (t: number) => number;
  shake?: {from: number; to: number; amp: number};
  caption: {title: string; sub: string};
  thumbUp?: boolean;
  desk?: boolean;
  streaks?: boolean;
  children?: React.ReactNode;
};

const Scene: React.FC<SceneProps> = ({
  tint,
  accent,
  poses,
  cam,
  easing,
  shake,
  caption,
  thumbUp,
  desk,
  streaks,
  children,
}) => (
  <AbsoluteFill style={{backgroundColor: NAVY}}>
    <Camera keys={cam} easing={easing} shake={shake}>
      <Backdrop tint={tint} />
      <Floor />
      {desk && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={300} y={938} width={480} height={26} rx={13} fill="#173765" stroke="#68baff" strokeWidth={4} />
          <rect x={330} y={964} width={14} height={236} fill="#173765" />
          <rect x={736} y={964} width={14} height={236} fill="#173765" />
        </svg>
      )}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(${NECK.x} ${NECK.y})`}>
          <Stickman keys={poses} thumbUp={thumbUp} accent={accent} shirt={UT_YELLOW} />
        </g>
      </svg>
      {children}
      {streaks && <SpeedStreaks />}
    </Camera>
    <Caption title={caption.title} sub={caption.sub} accent={accent} />
  </AbsoluteFill>
);

const P = POSES;
const outExpo = Easing.out(Easing.exp);

const typing = (): PoseKey[] => {
  const ks: PoseKey[] = [{f: 0, pose: P.idle}];
  for (let i = 0; i < 14; i++) ks.push({f: 8 + i * 6, pose: i % 2 ? P.typeB : P.typeA, blend: 5});
  ks.push({f: 100, pose: P.think, blend: 10});
  return ks;
};

const jumping = (): PoseKey[] => {
  const ks: PoseKey[] = [{f: 0, pose: P.stressDown}];
  for (let i = 0; i < 8; i++) ks.push({f: 12 + i * 12, pose: i % 2 ? P.happyLand : P.happy, blend: 6});
  ks.push({f: 108, pose: P.thumbs, blend: 8});
  return ks;
};

const S1 = () => (
  <Scene
    tint="#173765"
    accent="#68baff"
    poses={[
      {f: 0, pose: P.idle},
      {f: 16, pose: P.shock, blend: 6},
      {f: 84, pose: P.stress, blend: 10},
    ]}
    cam={[
      {f: 0, s: 1.0},
      {f: 18, s: 1.55, y: -285},
      {f: 120, s: 1.7, y: -295},
    ]}
    easing={outExpo}
    shake={{from: 16, to: 30, amp: 16}}
    caption={{title: 'HASIL DRILLBIT MASIH TINGGI?!', sub: 'Tenang, kita bahas hasilnya!'}}
  />
);

const S2 = () => (
  <Scene
    tint="#4a1a2a"
    accent="#ff7777"
    poses={[
      {f: 0, pose: P.stress},
      {f: 40, pose: P.stressDown, blend: 12},
      {f: 70, pose: P.stress, blend: 12},
      {f: 100, pose: P.stressDown, blend: 12},
    ]}
    cam={[
      {f: 0, s: 1.7, y: -650, r: -3},
      {f: 52, s: 1.25, y: -390, r: -3},
      {f: 120, s: 1.4, y: -310, r: -4},
    ]}
    shake={{from: 36, to: 52, amp: 14}}
    caption={{title: 'HASIL AWAL: 41,55%', sub: 'Submission 7341085 • 1.679 kata terdeteksi'}}
  >
    <Score from={0} to={41.55} y={250} label="DrillBit • submission 7341085" />
  </Scene>
);

const S3 = () => (
  <Scene
    tint="#12325c"
    accent="#68baff"
    desk
    streaks
    poses={typing()}
    cam={[
      {f: 0, x: 1400, y: -250, s: 1.1},
      {f: 11, x: 0, y: -250, s: 1.1},
      {f: 120, x: 0, y: -260, s: 1.2},
    ]}
    easing={outExpo}
    caption={{title: 'EVALUASI • REVISI • PERIKSA ULANG', sub: 'Perbaiki isi berdasarkan pemahaman dan sumber yang benar.'}}
  >
    <Chip n={1} text="EVALUASI" at={22} x={90} y={340} />
    <Chip n={2} text="REVISI" at={46} x={90} y={480} />
    <Chip n={3} text="PERIKSA ULANG" at={70} x={90} y={620} />
  </Scene>
);

const S4 = () => (
  <Scene
    tint="#0f4a3a"
    accent="#69e0ad"
    poses={jumping().slice(0, 9)}
    cam={[
      {f: 0, s: 1.9, y: -620, r: 0},
      {f: 40, s: 1.12, y: -340},
      {f: 120, s: 1.0, y: -110},
    ]}
    easing={Easing.inOut(Easing.cubic)}
    caption={{title: 'HASIL BERIKUTNYA: 16,75%', sub: 'Submission 7374830 • 876 kata terdeteksi'}}
  >
    <Score from={41.55} to={16.75} start={4} dur={40} y={250} label="DrillBit • submission 7374830" />
  </Scene>
);

const S5 = () => (
  <Scene
    tint="#173765"
    accent="#68baff"
    thumbUp
    poses={[
      {f: 0, pose: P.happy},
      {f: 14, pose: P.thumbs, blend: 8},
    ]}
    cam={[
      {f: 0, s: 1.1, y: -150},
      {f: 120, s: 1.22, y: -200},
    ]}
    easing={Easing.linear}
    caption={{
      title: 'SKOR DETEKTOR BUKAN PENENTU MUTLAK',
      sub: 'Utamakan kualitas tulisan, gagasan sendiri, dan sumber akademik.',
    }}
  />
);

export const StickmanStory: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: NAVY, opacity: fadeIn}}>
      <Sequence from={0} durationInFrames={120}>
        <S1 />
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        <S2 />
      </Sequence>
      <Sequence from={240} durationInFrames={120}>
        <S3 />
      </Sequence>
      <Sequence from={360} durationInFrames={120}>
        <S4 />
      </Sequence>
      <Sequence from={480} durationInFrames={120}>
        <S5 />
      </Sequence>
    </AbsoluteFill>
  );
};
