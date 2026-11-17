import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';

const UT = '#FFC20E';
const P = POSES;
const INK = '#111';
const BG1 = '#24434f';
const BG2 = '#0f222b';
const MONO = 'Menlo, Consolas, monospace';
const CH: Record<string, string> = {green: '#4EE3A0', orange: '#FF9F43', yellow: '#FFC93C', red: '#FF5A52', blue: '#6C9BFF', pink: '#FF8FB8'};

export type RLine = {t: string; c?: string; big?: boolean};
export type Screen =
  | {k: 'cal'; title?: string}
  | {k: 'login'; url: string; user?: string}
  | {k: 'dnu'; rows: {mk: string; n: string; c?: string}[]; btn?: string}
  | {k: 'check'; rows: string[]}
  | {k: 'split'; a: string; b: string; limit: string; stamp?: string}
  | {k: 'calc'; fields: {l: string; v: string}[]; result: string; ipk: number}
  | {k: 'blank'; text?: string};
export type RoomSpec = {lines: RLine[]; screen: Screen; mood?: 'talk' | 'point' | 'shock' | 'happy' | 'think' | 'stress'; flash?: boolean; confetti?: boolean; foot?: string; cta?: string};

const moodKeys = (m: RoomSpec['mood'], d: number): PoseKey[] => {
  const a = Math.round(d * 0.35);
  switch (m) {
    case 'point': return [{f: 0, pose: P.talk}, {f: 14, pose: P.point, blend: 8}, {f: a + 20, pose: P.present, blend: 8}, {f: a + 50, pose: P.point, blend: 8}];
    case 'shock': return [{f: 0, pose: P.idle}, {f: 8, pose: P.shock, blend: 5}, {f: 40, pose: P.stress, blend: 8}];
    case 'happy': return [{f: 0, pose: P.talk}, {f: 14, pose: P.happy, blend: 7}, {f: 36, pose: P.happyLand, blend: 8}, {f: 60, pose: P.thumbs, blend: 8}];
    case 'think': return [{f: 0, pose: P.talk}, {f: 16, pose: P.think, blend: 8}, {f: 60, pose: P.point, blend: 8}];
    case 'stress': return [{f: 0, pose: P.idle}, {f: 10, pose: P.stress, blend: 8}, {f: 50, pose: P.stressDown, blend: 10}];
    default: return [{f: 0, pose: P.talk}, {f: 18, pose: P.present, blend: 8}, {f: a + 20, pose: P.point, blend: 8}];
  }
};

/* ---------- Teks chip ala video referensi ---------- */
const Chips: React.FC<{lines: RLine[]; gap: number}> = ({lines, gap}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: 185, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, fontFamily: 'Arial Black, Arial', fontWeight: 900}}>
      {lines.map((l, i) => {
        const s = spring({frame: frame - 5 - i * gap, fps, config: {damping: 10, stiffness: 170}});
        const bg = l.c ? CH[l.c] ?? l.c : undefined;
        return (
          <div key={i} style={{fontSize: l.big ? 108 : 78, lineHeight: 1.05, padding: bg ? '4px 22px' : '0 4px', background: bg, color: bg ? BG2 : '#fff', borderRadius: 14, transform: `translateX(${(1 - s) * -520}px) scale(${0.85 + 0.15 * s})`, opacity: Math.min(1, s * 2), transformOrigin: '0 50%', boxShadow: bg ? '0 8px 0 rgba(0,0,0,0.35)' : undefined, textShadow: bg ? undefined : '0 6px 0 rgba(0,0,0,0.35)'}}>
            {l.t}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Isi layar monitor (710 x 470) ---------- */
const ScreenView: React.FC<{s: Screen; d: number}> = ({s, d}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = (k: number, at = 10) => spring({frame: frame - at - k * 9, fps, config: {damping: 12, stiffness: 160}});
  const base: React.CSSProperties = {width: 710, height: 470, background: '#101a22', fontFamily: 'Arial, sans-serif', color: '#fff', position: 'relative', overflow: 'hidden'};
  if (s.k === 'cal') {
    const hit = Math.round(d * 0.45);
    const on = frame >= hit;
    return (
      <div style={base}>
        <div style={{padding: '16px 24px', fontWeight: 900, fontSize: 34, background: '#1d3140'}}>{s.title ?? 'Kalender Akademik UT'}</div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, padding: 22}}>
          {Array.from({length: 28}).map((_, i) => {
            const target = i === 17;
            return (
              <div key={i} style={{height: 54, borderRadius: 10, background: target && on ? CH.green : '#223645', color: target && on ? BG2 : '#9fb4c2', fontWeight: 900, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: target && on ? `scale(${1 + 0.18 * Math.sin((frame - hit) / 3) * Math.exp(-(frame - hit) / 14)})` : undefined, outline: target && on ? `4px solid #fff` : undefined}}>
                {i + 1}
              </div>
            );
          })}
        </div>
        <div style={{textAlign: 'center', fontWeight: 900, fontSize: 30, color: CH.yellow, opacity: on ? 1 : 0}}>Pengumuman nilai</div>
      </div>
    );
  }
  if (s.k === 'login') {
    const n = (t: string, st: number) => t.slice(0, Math.max(0, Math.floor((frame - st) * 1.6)));
    const logged = frame > d * 0.7;
    return (
      <div style={base}>
        <div style={{margin: 22, background: '#223645', borderRadius: 30, padding: '10px 24px', fontFamily: MONO, fontSize: 28, fontWeight: 700}}>🔒 {n(s.url, 8)}<span style={{opacity: frame % 14 < 7 ? 1 : 0}}>▌</span></div>
        <div style={{margin: '0 40px'}}>
          {[{l: 'NIM', v: s.user ?? '052xxxxxx', st: 26}, {l: 'Password', v: '••••••••', st: 40}].map((f, i) => (
            <div key={i} style={{marginTop: 18}}>
              <div style={{fontWeight: 800, fontSize: 24, color: '#9fb4c2'}}>{f.l}</div>
              <div style={{background: '#fff', color: INK, borderRadius: 12, height: 56, padding: '0 18px', display: 'flex', alignItems: 'center', fontFamily: MONO, fontSize: 30, fontWeight: 700}}>{n(f.v, f.st)}</div>
            </div>
          ))}
          <div style={{marginTop: 24, height: 66, borderRadius: 14, background: logged ? CH.green : CH.blue, color: BG2, fontWeight: 900, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{logged ? 'Berhasil ✓' : 'Login'}</div>
        </div>
      </div>
    );
  }
  if (s.k === 'dnu') {
    const press = frame > d * 0.72;
    return (
      <div style={base}>
        <div style={{padding: '14px 24px', fontWeight: 900, fontSize: 32, background: '#1d3140'}}>Daftar Nilai Ujian (DNU)</div>
        {s.rows.map((r, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 26px 0', padding: '8px 18px', background: '#223645', borderRadius: 12, transform: `translateX(${(1 - pop(i, 12)) * 400}px)`, fontWeight: 800, fontSize: 28}}>
            <span>{r.mk}</span>
            <span style={{width: 56, height: 56, borderRadius: 14, background: CH[r.c ?? 'green'] ?? r.c, color: BG2, fontWeight: 900, fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{r.n}</span>
          </div>
        ))}
        <div style={{position: 'absolute', right: 30, bottom: 22, padding: '12px 30px', borderRadius: 14, background: press ? CH.green : CH.orange, color: BG2, fontWeight: 900, fontSize: 30, transform: `scale(${press ? 0.94 : 1})`}}>{press ? 'Terunduh ✓' : s.btn ?? 'Unduh DNU'}</div>
      </div>
    );
  }
  if (s.k === 'check') {
    return (
      <div style={{...base, padding: 30}}>
        {s.rows.map((r, i) => {
          const p = pop(i, 10 + i * 6);
          const tick = frame > 18 + i * 16;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26, transform: `scale(${Math.max(0, p)})`, transformOrigin: '0 50%'}}>
              <div style={{width: 74, height: 74, borderRadius: 18, border: `6px solid ${CH.green}`, background: tick ? CH.green : 'transparent', color: BG2, fontSize: 52, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{tick ? '✓' : ''}</div>
              <div style={{fontWeight: 900, fontSize: 46}}>{r}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (s.k === 'split') {
    const g = Math.min(1, Math.max(0, (frame - 12) / 26));
    const e = Easing.out(Easing.cubic)(g);
    const st = spring({frame: frame - Math.round(d * 0.55), fps, config: {damping: 7, stiffness: 200}});
    return (
      <div style={{...base, padding: 34}}>
        <div style={{fontWeight: 900, fontSize: 38, marginBottom: 22}}>Nilai akhir</div>
        <div style={{display: 'flex', height: 78, borderRadius: 18, overflow: 'hidden', border: '5px solid #fff', width: `${e * 100}%`}}>
          <div style={{flex: 3, background: CH.blue, color: BG2, fontWeight: 900, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{s.a}</div>
          <div style={{flex: 2, background: CH.orange, color: BG2, fontWeight: 900, fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{s.b}</div>
        </div>
        <div style={{marginTop: 34, fontWeight: 900, fontSize: 36, color: CH.yellow}}>{s.limit}</div>
        {s.stamp && <div style={{position: 'absolute', right: 40, bottom: 30, width: 150, height: 150, borderRadius: 75, border: `10px solid ${CH.red}`, color: CH.red, fontWeight: 900, fontSize: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, st)}) rotate(-12deg)`}}>{s.stamp}</div>}
      </div>
    );
  }
  if (s.k === 'calc') {
    const t = Math.min(1, Math.max(0, (frame - 40) / 40));
    const val = (s.ipk * Easing.out(Easing.cubic)(t)).toFixed(2).replace('.', ',');
    return (
      <div style={{...base, padding: '18px 28px'}}>
        <div style={{fontWeight: 900, fontSize: 32, color: CH.yellow}}>Kalkulator Nilai UT</div>
        {s.fields.map((f, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '8px 18px', background: '#223645', borderRadius: 12, fontWeight: 800, fontSize: 28, transform: `translateX(${(1 - pop(i, 8)) * 420}px)`}}>
            <span>{f.l}</span>
            <span style={{color: CH.green, fontFamily: MONO}}>{f.v}</span>
          </div>
        ))}
        <div style={{marginTop: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 16, opacity: t > 0 ? 1 : 0}}>
          <span style={{fontWeight: 800, fontSize: 32, color: '#9fb4c2'}}>{s.result}</span>
          <span style={{fontWeight: 900, fontSize: 98, color: CH.green}}>{val}</span>
        </div>
      </div>
    );
  }
  return <div style={{...base, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 60, color: CH.yellow, textAlign: 'center', padding: 30}}>{s.text ?? ''}</div>;
};

/* ---------- Kamar ---------- */
const Room: React.FC<{d: number; screen: Screen}> = ({d, screen}) => {
  const frame = useCurrentFrame();
  const flick = 0.92 + 0.08 * Math.sin(frame / 4);
  return (
    <>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 62% 48%, ${BG1} 0%, ${BG2} 70%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* lantai & karpet */}
        <rect x={0} y={1630} width={1080} height={290} fill="#3a2a26" />
        <ellipse cx={560} cy={1790} rx={480} ry={96} fill="#9B4B44" />
        <ellipse cx={560} cy={1790} rx={380} ry={70} fill="#B85D55" />
        {/* jendela */}
        <g transform="translate(36 560)">
          <rect width={220} height={300} fill="#8a5a3b" />
          <rect x={10} y={10} width={200} height={280} fill="#14213d" />
          <circle cx={150} cy={64} r={24 + Math.sin(frame / 12) * 1.5} fill="#FFE9A8" />
          {[0, 1, 2].map((i) => <rect key={i} x={22 + i * 62} y={170 + (i % 2) * 40} width={52} height={120 - (i % 2) * 40} fill="#0b1426" />)}
          {[[34, 200], [96, 236], [160, 196], [170, 250]].map(([x, y], i) => <rect key={i} x={x} y={y} width={10} height={14} fill={(frame + i * 23) % 90 < 70 ? '#FFC93C' : '#33415c'} />)}
          <line x1={110} y1={10} x2={110} y2={290} stroke="#8a5a3b" strokeWidth={8} />
          <line x1={10} y1={150} x2={210} y2={150} stroke="#8a5a3b" strokeWidth={8} />
        </g>
        {/* rak */}
        <rect x={300} y={560} width={750} height={14} fill="#B07A3F" />
        {['#E0533D', '#F2B134', '#3FA796', '#E6E6DA', '#8E5BBF', '#E0533D'].map((c, i) => <rect key={i} x={330 + i * 34} y={500 + (i % 3) * 6} width={26} height={60 - (i % 3) * 6} fill={c} />)}
        <g transform={`translate(930 560) rotate(${Math.sin(frame / 20) * 3})`}>
          <path d="M-34 0 L34 0 L26 -50 L-26 -50 Z" fill="#D9663F" />
          <path d="M0 -50 Q-34 -92 -50 -86 M0 -50 Q4 -110 0 -118 M0 -50 Q36 -90 54 -84" stroke="#4EE3A0" strokeWidth={9} fill="none" strokeLinecap="round" />
        </g>
        {/* monitor */}
        <rect x={320} y={620} width={730} height={500} rx={18} fill="#0b141a" stroke="#223645" strokeWidth={8} />
        <rect x={668} y={1120} width={36} height={60} fill="#0b141a" />
        <rect x={580} y={1170} width={210} height={20} rx={8} fill="#0b141a" />
        {/* meja */}
        <rect x={250} y={1190} width={830} height={34} fill="#B07A3F" />
        <rect x={1020} y={1224} width={40} height={410} fill="#8a5a3b" />
        {/* tower PC */}
        <rect x={820} y={1330} width={150} height={240} rx={10} fill="#0e1519" stroke="#223645" strokeWidth={5} />
        <circle cx={895} cy={1370} r={9} fill={frame % 40 < 30 ? '#4EE3A0' : '#1f6a4b'} />
        {[0, 1, 2].map((i) => <line key={i} x1={845} x2={945} y1={1430 + i * 24} y2={1430 + i * 24} stroke="#33506a" strokeWidth={5} />)}
        {/* mug + uap */}
        <rect x={940} y={1130} width={58} height={60} rx={8} fill="#EAE6DA" />
        {[0, 1].map((i) => <path key={i} d={`M${958 + i * 22} 1120 q-10 -14 0 -28 q10 -14 0 -28`} stroke="rgba(255,255,255,0.55)" strokeWidth={4} fill="none" transform={`translate(0 ${-((frame * 1.2 + i * 14) % 30)})`} opacity={0.7} />)}
      </svg>
      <div style={{position: 'absolute', left: 335, top: 635, width: 710, height: 470, borderRadius: 8, overflow: 'hidden', opacity: flick}}>
        <ScreenView s={screen} d={d} />
      </div>
      <div style={{position: 'absolute', left: 300, top: 600, width: 770, height: 540, boxShadow: `0 0 120px 20px rgba(108,155,255,${0.18 * flick})`, pointerEvents: 'none'}} />
    </>
  );
};

const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {Array.from({length: 18}).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const y = (random(`y${i}`) * 1920 - frame * (0.4 + random(`v${i}`) * 0.8) + 1920 * 4) % 1920;
        return <circle key={i} cx={x + Math.sin(frame / 25 + i) * 14} cy={y} r={2 + random(`r${i}`) * 3} fill="#fff" opacity={0.18 + 0.2 * random(`o${i}`)} />;
      })}
    </svg>
  );
};

const Confetti: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame() - from;
  if (frame < 0) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {Array.from({length: 46}).map((_, i) => {
        const x = random(`cx${i}`) * 1080;
        const y = -60 + frame * (8 + random(`cv${i}`) * 9);
        const colors = Object.values(CH);
        return <rect key={i} x={x} y={y} width={16} height={28} fill={colors[i % colors.length]} transform={`rotate(${frame * (6 + (i % 5) * 3)} ${x} ${y})`} />;
      })}
    </svg>
  );
};

const Foot: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 28, textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontFamily: 'Arial', fontWeight: 700, fontSize: 28}}>{text}</div>
);

const CtaBtn: React.FC<{text: string; at: number}> = ({text, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 150}});
  const pulse = 1 + (frame % 24 < 12 ? 0.04 : 0);
  const arrow = Math.sin(frame / 4) * 14;
  return (
    <div style={{position: 'absolute', left: 330, right: 30, top: 1250, textAlign: 'center', transform: `scale(${Math.max(0, s) * pulse})`}}>
      <div style={{display: 'inline-block', background: CH.yellow, color: BG2, border: '8px solid #fff', borderRadius: 30, padding: '16px 26px', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 44, boxShadow: '0 12px 0 rgba(0,0,0,0.4)'}}>
        ⮕ {text}
      </div>
      <div style={{marginTop: 18, color: '#fff', fontFamily: MONO, fontWeight: 800, fontSize: 30, transform: `translateX(${arrow}px)`}}>catatanakademik.com</div>
    </div>
  );
};

export const RoomScene: React.FC<{d: number; spec: RoomSpec}> = ({d, spec}) => {
  const frame = useCurrentFrame();
  const gap = Math.max(5, Math.min(14, Math.floor((d * 0.5) / spec.lines.length)));
  const fl = spec.flash ? (frame < 8 ? 0.5 : frame % 18 < 5 ? 0.18 : 0) : 0;
  return (
    <AbsoluteFill style={{background: BG2}}>
      <Camera keys={[{f: 0, s: 1.14, y: -60}, {f: 18, s: 1.0}, {f: d, s: 1.05, y: 20}]} easing={Easing.out(Easing.exp)} shake={spec.flash ? {from: 0, to: 26, amp: 12} : undefined}>
        <Room d={d} screen={spec.screen} />
        <Dust />
        <Chips lines={spec.lines} gap={gap} />
        {spec.cta && <CtaBtn text={spec.cta} at={Math.round(d * 0.5)} />}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none', filter: 'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff)'}}>
          <g transform="translate(175 1300) scale(0.86)">
            <Stickman keys={moodKeys(spec.mood, d)} ink={INK} headFill="#fff" shirt={UT} ringOff />
          </g>
        </svg>
        {spec.confetti && <Confetti from={Math.round(d * 0.55)} />}
        {spec.foot && <Foot text={spec.foot} />}
      </Camera>
      {fl > 0 && <AbsoluteFill style={{background: CH.red, opacity: fl, pointerEvents: 'none'}} />}
    </AbsoluteFill>
  );
};
