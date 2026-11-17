import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera, CamKey} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';
import {PAPER, PaperBg, Pill, Sparkles, Sticker, Title} from './engine/ui';
import {CircleReveal, KineticText} from './engine/fx';

const P = POSES;
const UT = '#FFC20E';
const F = 'Arial, sans-serif';

const Scene: React.FC<{
  pill: {text: string; color: string};
  cam?: CamKey[];
  poses: PoseKey[];
  rays?: boolean;
  title?: string;
  accent?: string;
  thumbUp?: boolean;
  children?: React.ReactNode;
}> = ({pill, cam, poses, rays, title, accent, thumbUp, children}) => (
  <AbsoluteFill>
    <Camera
      keys={cam ?? [{f: 0, s: 1.12, y: -120}, {f: 16, s: 1.0}, {f: 150, s: 1.05}]}
      easing={Easing.out(Easing.exp)}
    >
      <PaperBg rays={rays} />
      <Sparkles />
      <Pill text={pill.text} color={pill.color} />
      {title && <Title text={title} accent={accent} y={240} size={92} />}
      {children}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <g transform="translate(540 1450) scale(0.95)">
          <Stickman keys={poses} ink={PAPER.ink} headFill="#fff" accent={PAPER.red} thumbUp={thumbUp} shirt={UT} />
        </g>
      </svg>
    </Camera>
  </AbsoluteFill>
);

/** Baris daftar: kartu masuk dari kiri, ikon angka/centang. */
const Row: React.FC<{i: number; at: number; y: number; text: string; sub?: string; color: string; mark?: string}> = ({
  i, at, y, text, sub, color, mark,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at - i * 12, fps, config: {damping: 11, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute', left: 70, top: y + i * 150, width: 940, height: 124,
        background: '#fff', border: `6px solid ${PAPER.ink}`, borderRadius: 26,
        boxShadow: `10px 10px 0 ${PAPER.ink}`, display: 'flex', alignItems: 'center', gap: 24,
        padding: '0 28px', fontFamily: F,
        transform: `translateX(${(1 - s) * -1100}px)`,
      }}
    >
      <div style={{width: 72, height: 72, borderRadius: 36, background: color, border: `5px solid ${PAPER.ink}`,
        color: '#fff', fontWeight: 900, fontSize: 40, textAlign: 'center', lineHeight: '62px', flexShrink: 0}}>
        {mark ?? i + 1}
      </div>
      <div>
        <div style={{fontSize: 44, fontWeight: 900, lineHeight: 1.1}}>{text}</div>
        {sub && <div style={{fontSize: 30, fontWeight: 700, color: '#555', marginTop: 4}}>{sub}</div>}
      </div>
    </div>
  );
};

const Box: React.FC<{x: number; y: number; w: number; h: number; at: number; bg?: string; children?: React.ReactNode}> = ({
  x, y, w, h, at, bg = '#fff', children,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 130}});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: bg,
      border: `6px solid ${PAPER.ink}`, borderRadius: 28, boxShadow: `12px 12px 0 ${PAPER.ink}`,
      transform: `scale(${Math.max(0, s)})`, fontFamily: F, overflow: 'hidden'}}>{children}</div>
  );
};

/* 1 Judul */
const S1 = () => (
  <Scene rays pill={{text: 'Panduan Hari Ujian', color: PAPER.red}}
    poses={[{f: 0, pose: P.talk}, {f: 20, pose: P.pointUp, blend: 8}, {f: 60, pose: P.present, blend: 8}]}>
    <KineticText y={430} size={118}
      words={[{t: 'Tata'}, {t: 'cara'}, {t: 'UAOP', hl: PAPER.blue}, {t: 'UT', hl: UT}, {t: 'langkah'}, {t: 'demi'}, {t: 'langkah'}]} />
  </Scene>
);

/* 2 Persiapan */
const S2 = () => (
  <Scene pill={{text: 'Persiapan • jauh hari', color: PAPER.blue}} title="Siapkan *dulu*" accent={PAPER.blue}
    poses={[{f: 0, pose: P.talk}, {f: 20, pose: P.point, blend: 8}, {f: 100, pose: P.present, blend: 8}]}>
    <Row i={0} at={8} y={440} color={PAPER.blue} text="Pasang SEB" sub="Tes sebelum UAS, jangan H-0" />
    <Row i={1} at={8} y={440} color={PAPER.green} text="Foto live" sub="3 hari sebelum ujian (Berkas AOP)" />
    <Row i={2} at={8} y={440} color={PAPER.orange} text="Perangkat" sub="Laptop, webcam, mic, tripod, HP" />
    <Row i={3} at={8} y={440} color={PAPER.red} text="Password KTPUO" sub="Sesuai matkul dan sesi" />
  </Scene>
);

/* 3 Login */
const S3 = () => {
  const frame = useCurrentFrame();
  const nim = '052xxxxxx'.slice(0, Math.max(0, Math.floor((frame - 24) / 2)));
  const pw = '••••••••••'.slice(0, Math.max(0, Math.floor((frame - 56) / 2)));
  const field = (label: string, v: string, y: number) => (
    <div style={{position: 'absolute', left: 40, top: y, right: 40}}>
      <div style={{fontSize: 30, fontWeight: 800, marginBottom: 8}}>{label}</div>
      <div style={{height: 84, border: `5px solid ${PAPER.ink}`, borderRadius: 18, fontSize: 44, fontWeight: 800,
        padding: '0 22px', lineHeight: '74px', background: '#F7F7F4'}}>{v}</div>
    </div>
  );
  const btn = interpolate(frame, [86, 96], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene pill={{text: 'Langkah 1 • Login', color: PAPER.green}} title="Masuk *akun*" accent={PAPER.green}
      poses={[{f: 0, pose: P.talk}, {f: 20, pose: P.point, blend: 8}, {f: 90, pose: P.happy, blend: 8}]}>
      <Box x={90} y={450} w={900} h={520} at={6}>
        {field('Username (NIM)', nim, 40)}
        {field('Password (dari KTPUO)', pw, 190)}
        <div style={{position: 'absolute', left: 40, right: 40, top: 360, height: 96, background: btn > 0.5 ? PAPER.green : PAPER.blue,
          border: `5px solid ${PAPER.ink}`, borderRadius: 18, color: '#fff', fontSize: 46, fontWeight: 900,
          textAlign: 'center', lineHeight: '86px', transform: `scale(${1 - 0.06 * Math.sin(btn * Math.PI)})`}}>
          {btn > 0.5 ? 'Berhasil ✓' : 'Login'}
        </div>
      </Box>
    </Scene>
  );
};

/* 4 Kamera kedua */
const S4 = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dash = interpolate(frame, [30, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ph = spring({frame: frame - 40, fps, config: {damping: 9, stiffness: 150}});
  return (
    <Scene pill={{text: 'Langkah 2 • Kamera kedua', color: PAPER.orange}} title="HP jadi *saksi*" accent={PAPER.orange}
      poses={[{f: 0, pose: P.talk}, {f: 24, pose: P.point, blend: 8}, {f: 100, pose: P.present, blend: 8}]}>
      <Box x={90} y={420} w={900} h={430} at={6} bg="#fff">
        <svg width={900} height={430} viewBox="0 0 900 430">
          <rect x={20} y={300} width={500} height={26} fill={PAPER.ink} />
          <rect x={60} y={326} width={14} height={90} fill={PAPER.ink} />
          <rect x={466} y={326} width={14} height={90} fill={PAPER.ink} />
          <rect x={140} y={110} width={260} height={160} rx={12} fill="#fff" stroke={PAPER.ink} strokeWidth={10} />
          <rect x={260} y={270} width={20} height={30} fill={PAPER.ink} />
          <text x={270} y={205} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily={F}>Monitor</text>
          <text x={270} y={286} textAnchor="middle" fontSize={0}>.</text>
          <g transform={`translate(740 ${240 + (1 - Math.max(0, ph)) * -120}) scale(${Math.max(0, ph)})`}>
            <rect x={-90} y={-50} width={180} height={100} rx={14} fill={PAPER.yellow} stroke={PAPER.ink} strokeWidth={8} />
            <circle cx={70} cy={0} r={8} fill={PAPER.ink} />
            <text x={-8} y={10} textAnchor="middle" fontSize={30} fontWeight={900} fontFamily={F}>HP</text>
          </g>
          <line x1={540} y1={380} x2={540 + 200 * dash} y2={380} stroke={PAPER.red} strokeWidth={10} strokeDasharray="22 14" />
          <text x={640} y={350} textAnchor="middle" fontSize={44} fontWeight={900} fontFamily={F} fill={PAPER.red}
            opacity={dash}>±2 m</text>
        </svg>
      </Box>
      <Row i={0} at={60} y={900} color={PAPER.orange} mark="↔" text="Landscape, kanan/kiri" sub="Meja + monitor harus terlihat" />
      <Row i={1} at={60} y={900} color={PAPER.green} mark="⚡" text="Baterai terisi" sub="Scan QR, izinkan kamera + mic" />
    </Scene>
  );
};

/* 5 Validasi */
const S5 = () => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [20, 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const c = 2 * Math.PI * 120;
  return (
    <Scene pill={{text: 'Langkah 3 • Validasi', color: PAPER.blue}} title="Cek *identitas*" accent={PAPER.blue}
      poses={[{f: 0, pose: P.talk}, {f: 20, pose: P.point, blend: 8}, {f: 100, pose: P.thumbs, blend: 8}]} thumbUp>
      <Box x={90} y={430} w={420} h={440} at={6}>
        <svg width={420} height={440} viewBox="-210 -220 420 440">
          <circle r={120} fill="#F7F7F4" stroke="#E6E6E1" strokeWidth={18} />
          <circle r={120} fill="none" stroke={PAPER.green} strokeWidth={18} strokeLinecap="round" strokeDasharray={c}
            strokeDashoffset={c * (1 - ring)} transform="rotate(-90)" />
          <circle cy={-20} r={42} fill="#fff" stroke={PAPER.ink} strokeWidth={9} />
          <path d="M-70 78 Q0 10 70 78" fill="none" stroke={PAPER.ink} strokeWidth={9} strokeLinecap="round" />
          <text y={180} textAnchor="middle" fontSize={34} fontWeight={900} fontFamily={F}>Wajah jelas</text>
        </svg>
      </Box>
      <div style={{position: 'absolute', left: 540, top: 430, width: 450}}>
        {['NIM & nama', 'Kode matkul', 'Sesi ujian', 'Baca tata tertib'].map((t, i) => {
          const s = interpolate(frame, [26 + i * 14, 38 + i * 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={t} style={{height: 96, marginBottom: 20, background: '#fff', border: `6px solid ${PAPER.ink}`,
              borderRadius: 22, boxShadow: `8px 8px 0 ${PAPER.ink}`, fontFamily: F, fontWeight: 900, fontSize: 36,
              display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', opacity: s,
              transform: `translateX(${(1 - s) * 80}px)`}}>
              <span style={{color: PAPER.green, fontSize: 46}}>✓</span>{t}
            </div>
          );
        })}
      </div>
    </Scene>
  );
};

/* 6 Gagal wajah */
const S6 = () => (
  <Scene pill={{text: 'Kalau validasi gagal', color: PAPER.red}} title="Jangan *panik*" accent={PAPER.red}
    poses={[{f: 0, pose: P.stress}, {f: 28, pose: P.think, blend: 8}, {f: 80, pose: P.happy, blend: 8}]}>
    <Row i={0} at={10} y={440} color={PAPER.blue} text="Berkas AOP → Ulangi" />
    <Row i={1} at={10} y={440} color={PAPER.green} text="Tunggu lingkaran hijau" sub="Lalu tekan Ambil Foto" />
    <Row i={2} at={10} y={440} color={PAPER.orange} text="Lapor UT-Daerah / UT-LLN" sub="Minta validasi ulang" />
    <Row i={3} at={10} y={440} color={PAPER.red} text="Refresh, login lagi" />
  </Scene>
);

/* 7 Selesai */
const S7 = () => (
  <Scene pill={{text: 'Langkah 4 • Selesai', color: PAPER.green}} title="Tutup *rapi*" accent={PAPER.green}
    poses={[{f: 0, pose: P.talk}, {f: 22, pose: P.point, blend: 8}, {f: 90, pose: P.thumbs, blend: 8}]} thumbUp>
    <Row i={0} at={10} y={460} color={PAPER.blue} mark="☑" text="Cek semua soal terisi" sub="Jumlah harus sesuai" />
    <Row i={1} at={10} y={460} color={PAPER.green} mark="★" text="Lihat skor di layar" sub="Benar / jumlah soal" />
    <Row i={2} at={10} y={460} color={PAPER.red} mark="✕" text="Tutup SEB" sub="Lewat tombol close" />
  </Scene>
);

/* 8 Penutup */
const S8 = () => (
  <Scene rays pill={{text: 'Penting', color: PAPER.red}} title="Cek *KTPU* terbaru" accent={PAPER.red}
    poses={[{f: 0, pose: P.happy}, {f: 18, pose: P.thumbs, blend: 8}]} thumbUp>
    <Row i={0} at={10} y={480} color={PAPER.blue} mark="i" text="Jam & durasi ujian" sub="Lihat KTPU dan pengumuman UT" />
    <Row i={1} at={10} y={480} color={PAPER.green} mark="✓" text="Info resmi: ut.ac.id" sub="Atau tanya UT-Daerah" />
    <Sticker text="Sukses UAS!" at={50} x={560} y={900} rotate={-6} />
  </Scene>
);

const lens = [90, 150, 120, 150, 120, 120, 120, 90];
const starts = lens.reduce<number[]>((a, l, i) => [...a, i ? a[i - 1] + lens[i - 1] : 0], []);
export const UAOP_FRAMES = lens.reduce((a, b) => a + b, 0);

export const Uaop: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const OV = 16;
  const scenes = [S1, S2, S3, S4, S5, S6, S7, S8];
  return (
    <AbsoluteFill style={{backgroundColor: PAPER.bg, opacity: o}}>
      {scenes.map((S, i) => (
        <Sequence key={i} from={starts[i] - (i ? OV : 0)}
          durationInFrames={lens[i] + (i ? OV : 0) + (i < scenes.length - 1 ? OV : 0)}>
          {i ? <CircleReveal dur={OV}><S /></CircleReveal> : <S />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
