import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Camera, CamKey} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';
import {Chip, NeoCard, PAPER, PaperBg, Pill, Sparkles, Sticker, Title, lerpFrame, typed} from './engine/ui';

const P = POSES;
const ShirtCtx = createContext<string | undefined>(undefined);

type SceneProps = {
  pill?: {text: string; color: string};
  title: string;
  accent?: string;
  cam: CamKey[];
  easing?: (t: number) => number;
  poses: PoseKey[];
  rays?: boolean;
  thumbUp?: boolean;
  children?: React.ReactNode;
};

const Scene: React.FC<SceneProps> = ({pill, title, accent, cam, easing, poses, rays, thumbUp, children}) => {
  const shirt = useContext(ShirtCtx);
  return (
  <AbsoluteFill>
    <Camera keys={cam} easing={easing}>
      <PaperBg rays={rays} />
      <Sparkles />
      {pill && <Pill text={pill.text} color={pill.color} />}
      <Title text={title} accent={accent} y={pill ? 240 : 300} />
      {children}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(540 1450) scale(0.95)">
          <Stickman keys={poses} ink={PAPER.ink} headFill="#fff" accent={PAPER.red} thumbUp={thumbUp} shirt={shirt} />
        </g>
      </svg>
    </Camera>
  </AbsoluteFill>
  );
};

const gentle = (s0 = 1.0, s1 = 1.06, y = 0): CamKey[] => [
  {f: 0, s: s0, y},
  {f: 150, s: s1, y},
];

/* 1. Judul */
const S1 = () => (
  <Scene
    rays
    title="Bikin Video *Motion* Gratis"
    cam={[
      {f: 0, s: 1.25, y: -180},
      {f: 16, s: 1.0, y: 0},
      {f: 90, s: 1.05, y: 0},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 18, pose: P.present, blend: 8},
    ]}
  >
    <Chip text="Claude" color={PAPER.orange} at={14} x={150} y={720} />
    <Chip text="+" color={PAPER.yellow} at={22} x={500} y={720} textColor="#111" />
    <Chip text="Remotion" color={PAPER.blue} at={28} x={600} y={720} />
    <Sticker text="Rp0" at={40} x={380} y={900} rotate={-7} />
  </Scene>
);

/* 2. Langkah 1 */
const S2 = () => (
  <Scene
    pill={{text: 'Langkah 1', color: PAPER.orange}}
    title="Rancang *adegannya*"
    accent={PAPER.orange}
    cam={gentle(1.0, 1.06)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 12, pose: P.point, blend: 8},
      {f: 70, pose: P.present, blend: 10},
    ]}
  >
    <NeoCard x={90} y={520} w={900} h={620}>
      <div style={{position: 'absolute', inset: 0}} />
    </NeoCard>
    <Chip text="Gaya visual" color={PAPER.orange} at={14} x={150} y={600} />
    <Chip text="Warna" color={PAPER.red} at={22} x={560} y={600} />
    <Chip text="Animasi" color={PAPER.green} at={30} x={150} y={730} />
    <Chip text="Transisi" color={PAPER.blue} at={38} x={510} y={730} />
    <Chip text="Durasi" color="#111" at={46} x={150} y={860} />
    <Chip text="Teks" color={PAPER.yellow} textColor="#111" at={54} x={470} y={860} />
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: 1010,
        width: 780,
        padding: '18px 26px',
        border: `5px solid ${PAPER.ink}`,
        borderRadius: 20,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        fontSize: 36,
        background: '#fff',
      }}
    >
      Ceritakan idenya ke Claude
    </div>
  </Scene>
);

const CODE = `<Sequence from={0}>
  <Title text="Halo" />
</Sequence>
const p = spring({frame, fps});`;

/* 3. Langkah 2 */
const CodeCard: React.FC = () => {
  const f = useCurrentFrame();
  const shown = typed(CODE, f, 16, 1.6);
  return (
    <NeoCard x={90} y={520} w={900} h={620} dark>
      <div style={{padding: '30px 34px', fontFamily: 'Courier New, monospace', fontSize: 38, lineHeight: 1.45, color: '#8bd5ff'}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
          {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
            <div key={c} style={{width: 20, height: 20, borderRadius: 10, background: c}} />
          ))}
        </div>
        <pre style={{margin: 0, whiteSpace: 'pre-wrap'}}>
          {shown}
          <span style={{opacity: f % 14 < 7 ? 1 : 0, color: '#fff'}}>▌</span>
        </pre>
      </div>
    </NeoCard>
  );
};
const S3 = () => (
  <Scene
    pill={{text: 'Langkah 2', color: PAPER.green}}
    title="Tulis *kode* React"
    accent={PAPER.green}
    cam={[
      {f: 0, x: 900, s: 1.0},
      {f: 10, x: 0, s: 1.0},
      {f: 150, x: 0, s: 1.07},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 16, pose: P.pointUp, blend: 8},
      {f: 90, pose: P.talk, blend: 10},
    ]}
  >
    <CodeCard />
    <Sticker text="Pakai Claude" at={60} x={560} y={1090} rotate={5} color="#FFD6C9" />
  </Scene>
);

/* 4. Langkah 3 */
const Player: React.FC = () => {
  const f = useCurrentFrame();
  const prog = lerpFrame(f, 10, 140, 0.04, 0.82);
  return (
    <NeoCard x={90} y={520} w={900} h={420} dark>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: 130, height: 130, borderRadius: 65, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{borderLeft: '44px solid #111', borderTop: '28px solid transparent', borderBottom: '28px solid transparent', marginLeft: 12}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 40, right: 40, bottom: 40, height: 16, borderRadius: 8, background: '#374151'}}>
        <div style={{width: `${prog * 100}%`, height: '100%', borderRadius: 8, background: PAPER.green}} />
      </div>
    </NeoCard>
  );
};
const S4 = () => (
  <Scene
    pill={{text: 'Langkah 3', color: PAPER.yellow}}
    title="Preview & *revisi*"
    accent={PAPER.blue}
    cam={gentle(1.0, 1.06)}
    poses={[
      {f: 0, pose: P.talk},
      {f: 14, pose: P.point, blend: 8},
      {f: 90, pose: P.present, blend: 10},
    ]}
  >
    <Player />
    <Chip text="Animasinya kurang smooth" color={PAPER.blue} at={50} x={120} y={990} />
    <Chip text="Teksnya terlalu kecil" color={PAPER.blue} at={72} x={300} y={1100} />
    <Chip text="Warna kurang kontras" color={PAPER.blue} at={94} x={160} y={1210} />
  </Scene>
);

/* 5. Langkah 4 */
const RenderCard: React.FC = () => {
  const f = useCurrentFrame();
  const prog = lerpFrame(f, 20, 90, 0, 1);
  return (
    <>
      <NeoCard x={90} y={520} w={900} h={520} dark>
        <div style={{padding: '40px 40px', fontFamily: 'Courier New, monospace', fontSize: 38, color: '#8bd5ff'}}>
          <div>$ npx remotion render</div>
          <div style={{marginTop: 50, color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 40, display: 'flex', justifyContent: 'space-between'}}>
            <span>Rendering...</span>
            <span>{Math.round(prog * 100)}%</span>
          </div>
          <div style={{marginTop: 18, height: 34, borderRadius: 17, background: '#374151', overflow: 'hidden'}}>
            <div style={{width: `${prog * 100}%`, height: '100%', background: PAPER.green}} />
          </div>
        </div>
      </NeoCard>
      <Chip text="✓  video.mp4" color="#fff" textColor="#111" at={96} x={260} y={1110} />
    </>
  );
};
const S5 = () => (
  <Scene
    pill={{text: 'Terakhir', color: PAPER.green}}
    title="Render jadi *MP4*"
    accent={PAPER.green}
    cam={[
      {f: 0, s: 1.0},
      {f: 96, s: 1.04},
      {f: 104, s: 1.18, y: -60},
      {f: 120, s: 1.1, y: -30},
    ]}
    poses={[
      {f: 0, pose: P.talk},
      {f: 14, pose: P.point, blend: 8},
      {f: 96, pose: P.happy, blend: 6},
    ]}
  >
    <RenderCard />
  </Scene>
);

/* 6. Penutup */
const Row: React.FC<{y: number; at: number; name: string; note: string; color: string}> = ({y, at, name, note, color}) => (
  <>
    <NeoCard x={110} y={y} w={860} h={150} at={at} rotate={y % 2 ? 0.6 : -0.6}>
      <div style={{display: 'flex', alignItems: 'center', height: '100%', padding: '0 34px', gap: 26, fontFamily: 'Arial, sans-serif'}}>
        <div style={{width: 78, height: 78, borderRadius: 39, background: color, color: '#fff', fontSize: 52, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          ✓
        </div>
        <div>
          <div style={{fontSize: 46, fontWeight: 900}}>{name}</div>
          <div style={{fontSize: 30, color: '#555'}}>{note}</div>
        </div>
      </div>
    </NeoCard>
  </>
);
const S6 = () => (
  <Scene
    rays
    pill={{text: 'Zero cost', color: PAPER.red}}
    title="Semua *Rp0*"
    cam={[
      {f: 0, s: 1.2, y: -120},
      {f: 14, s: 1.0, y: 0},
      {f: 120, s: 1.05, y: 0},
    ]}
    easing={Easing.out(Easing.exp)}
    poses={[
      {f: 0, pose: P.happy},
      {f: 18, pose: P.thumbs, blend: 8},
    ]}
    thumbUp
  >
    <Row y={520} at={10} name="Remotion" note="gratis untuk individu" color={PAPER.blue} />
    <Row y={700} at={22} name="Claude" note="yang sudah kamu punya" color={PAPER.orange} />
    <Row y={880} at={34} name="npm & GitHub" note="open source" color={PAPER.green} />
    <Sticker text="ZERO COST" at={52} x={500} y={1090} rotate={-6} />
  </Scene>
);

export const ExplainerStory: React.FC<{shirt?: string}> = ({shirt}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const lens = [90, 120, 150, 150, 120, 120];
  const starts = lens.reduce<number[]>((a, l, i) => [...a, i ? a[i - 1] + lens[i - 1] : 0], []);
  const scenes = [S1, S2, S3, S4, S5, S6];
  return (
    <ShirtCtx.Provider value={shirt}>
    <AbsoluteFill style={{backgroundColor: PAPER.bg, opacity: o}}>
      {scenes.map((S, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={lens[i]}>
          <S />
        </Sequence>
      ))}
    </AbsoluteFill>
    </ShirtCtx.Provider>
  );
};

export const EXPLAINER_FRAMES = 750;
