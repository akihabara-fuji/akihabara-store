// Komposisi EstafetVideo untuk Kantor Ai People.
// Dipasang di repo Remotion kang-catat-plus (Remotion 4.0.539): salin file ini ke src/estafet/EstafetVideo.tsx,
// lalu daftarkan <EstafetComposition /> di src/Root.tsx (lihat RootSnippet di bawah). Jangan bikin proyek Remotion baru.
// Data: public/estafet/<id>/project_manifest.json + klip scene_XX.mp4 di folder yang sama
// (manifest disusun alat/buat_manifest.py dari tabel SCENE setoran GPT).
import React from 'react';
import {
  AbsoluteFill, Audio, Composition, Easing, interpolate, OffthreadVideo, spring,
  staticFile, useCurrentFrame, useVideoConfig, CalculateMetadataFunction,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';

export type Scene = {
  no: number;
  durasi: number; // detik
  teks_overlay: string;
  narasi: string;
  clip: string; // path relatif ke public/, misal estafet/carousel-utm-01/scene_01.mp4
};

export type Manifest = {
  id: string;
  judul: string;
  fps: number;
  width: number;
  height: number;
  watermark: string;
  audio?: string; // opsional: narasi utuh (mis. suara Rafiq) relatif ke public/
  scenes: Scene[];
};

export type EstafetProps = {id: string; manifest?: Manifest};

const TRANS = 12; // frame transisi antar-scene
const ungu = '#7c5cff';

const sceneFrames = (s: Scene, fps: number) => Math.max(1, Math.round(s.durasi * fps));

export const totalFrames = (m: Manifest) => {
  const sum = m.scenes.reduce((a, s) => a + sceneFrames(s, m.fps), 0);
  return Math.max(1, sum - TRANS * Math.max(0, m.scenes.length - 1));
};

const Overlay: React.FC<{teks: string}> = ({teks}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const masuk = spring({frame, fps, config: {damping: 200}});
  if (!teks) return null;
  return (
    <div style={{
      position: 'absolute', top: 210, left: 70, right: 70, textAlign: 'center',
      transform: `translateY(${interpolate(masuk, [0, 1], [-40, 0])}px)`, opacity: masuk,
    }}>
      <span style={{
        display: 'inline-block', background: 'rgba(10,8,30,0.82)', color: '#fff', fontFamily: 'Inter, Arial, sans-serif',
        fontWeight: 900, fontSize: 64, lineHeight: 1.15, padding: '22px 34px', borderRadius: 26,
        borderBottom: `8px solid ${ungu}`, letterSpacing: 0.5,
      }}>{teks}</span>
    </div>
  );
};

const Subtitle: React.FC<{narasi: string; frames: number}> = ({narasi, frames}) => {
  const frame = useCurrentFrame();
  const kata = narasi.split(/\s+/).filter(Boolean);
  if (!kata.length) return null;
  const tampil = Math.ceil(interpolate(frame, [0, Math.max(1, frames * 0.85)], [0, kata.length], {
    extrapolateRight: 'clamp', easing: Easing.linear,
  }));
  return (
    <div style={{position: 'absolute', bottom: 260, left: 60, right: 60, textAlign: 'center'}}>
      <span style={{
        background: 'rgba(0,0,0,0.72)', color: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontWeight: 800,
        fontSize: 52, lineHeight: 1.3, padding: '14px 24px', borderRadius: 18, boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}>
        {kata.map((k, i) => (
          <span key={i} style={{color: i === tampil - 1 ? '#ffe14d' : '#fff', opacity: i < tampil ? 1 : 0.25}}>{k} </span>
        ))}
      </span>
    </div>
  );
};

const Watermark: React.FC<{teks: string}> = ({teks}) => (
  <div style={{
    position: 'absolute', bottom: 70, right: 60, color: 'rgba(255,255,255,0.88)', fontFamily: 'Inter, Arial, sans-serif',
    fontWeight: 800, fontSize: 34, background: 'rgba(124,92,255,0.55)', padding: '8px 18px', borderRadius: 999,
  }}>{teks}</div>
);

const SceneView: React.FC<{s: Scene; frames: number}> = ({s, frames}) => (
  <AbsoluteFill style={{backgroundColor: '#0b0920'}}>
    <OffthreadVideo src={staticFile(s.clip)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    <Overlay teks={s.teks_overlay} />
    <Subtitle narasi={s.narasi} frames={frames} />
  </AbsoluteFill>
);

export const EstafetVideo: React.FC<EstafetProps> = ({manifest}) => {
  if (!manifest) return <AbsoluteFill style={{backgroundColor: '#000'}} />;
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {manifest.scenes.map((s, i) => {
          const f = sceneFrames(s, manifest.fps);
          return (
            <React.Fragment key={s.no}>
              {i > 0 && <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: TRANS})} />}
              <TransitionSeries.Sequence durationInFrames={f}>
                <SceneView s={s} frames={f} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>
      {manifest.audio ? <Audio src={staticFile(manifest.audio)} /> : null}
      <Watermark teks={manifest.watermark} />
    </AbsoluteFill>
  );
};

export const hitungMetadata: CalculateMetadataFunction<EstafetProps> = async ({props}) => {
  const res = await fetch(staticFile(`estafet/${props.id}/project_manifest.json`));
  if (!res.ok) throw new Error(`Manifest estafet/${props.id}/project_manifest.json tidak ditemukan`);
  const manifest = (await res.json()) as Manifest;
  return {
    durationInFrames: totalFrames(manifest), fps: manifest.fps, width: manifest.width, height: manifest.height,
    props: {...props, manifest},
  };
};

// RootSnippet: tambahkan di dalam <> ... </> pada src/Root.tsx kang-catat-plus.
// Render: npx remotion render EstafetVideo out/estafet/<id>.mp4 --props='{"id":"<id>"}'
export const EstafetComposition: React.FC = () => (
  <Composition
    id="EstafetVideo"
    component={EstafetVideo}
    defaultProps={{id: 'contoh'} as EstafetProps}
    calculateMetadata={hitungMetadata}
    durationInFrames={30}
    fps={30}
    width={1080}
    height={1920}
  />
);
