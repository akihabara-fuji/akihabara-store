import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Camera} from './engine/Camera';
import {POSES, PoseKey, Stickman} from './engine/Stickman';
import {PAPER, PaperBg, Sparkles} from './engine/ui';
import {KineticText} from './engine/fx';

const I = PAPER.ink;
const UT = '#FFC20E';
const P = POSES;
const MONO = 'Menlo, Consolas, monospace';

export type Win =
  | {k: 'terminal'; title?: string; lines: string[]}
  | {k: 'meter'; title?: string; instant?: boolean; rows: {label: string; to: number; color?: string}[]}
  | {k: 'chat'; title?: string; bubbles: {t: string; me?: boolean}[]}
  | {k: 'browser'; url: string; title: string; sub?: string};

export type DeskSpec = {
  tint?: string;
  caption: {t: string; hl?: string}[];
  mood?: 'talk' | 'think' | 'stress' | 'happy' | 'shock';
  wins: Win[];
  notif?: string;
  flash?: boolean;
};

const COLORS: Record<string, string> = {red: PAPER.red, blue: PAPER.blue, green: PAPER.green, yellow: PAPER.yellow, orange: PAPER.orange, ink: PAPER.ink};
const col = (c: string | undefined, d: string) => (c ? COLORS[c] ?? c : d);

const moodKeys = (m: DeskSpec['mood'], d: number): PoseKey[] => {
  const a = Math.round(d * 0.4);
  switch (m) {
    case 'think': return [{f: 0, pose: P.typeA}, {f: 14, pose: P.typeB, blend: 6}, {f: 28, pose: P.typeA, blend: 6}, {f: 42, pose: P.typeB, blend: 6}, {f: 56, pose: P.typeA, blend: 6}, {f: 70, pose: P.typeB, blend: 6}, {f: 84, pose: P.typeA, blend: 6}, {f: 98, pose: P.typeB, blend: 6}, {f: 112, pose: P.typeA, blend: 6}];
    case 'stress': return [{f: 0, pose: P.idle}, {f: a, pose: P.shock, blend: 6}, {f: a + 22, pose: P.stress, blend: 8}, {f: a + 44, pose: P.stressDown, blend: 10}];
    case 'happy': return [{f: 0, pose: P.talk}, {f: 12, pose: P.happy, blend: 8}, {f: 34, pose: P.happyLand, blend: 8}, {f: 56, pose: P.thumbs, blend: 8}];
    case 'shock': return [{f: 0, pose: P.talk}, {f: a, pose: P.shock, blend: 5}, {f: a + 26, pose: P.stress, blend: 8}];
    default: return [{f: 0, pose: P.talk}, {f: 20, pose: P.point, blend: 8}, {f: a, pose: P.present, blend: 8}];
  }
};

const Pop: React.FC<{x: number; y: number; w: number; h: number; delay: number; title?: string; dark?: boolean; children: React.ReactNode}> = ({x, y, w, h, delay, title, dark, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 11, stiffness: 150}});
  const sc = interpolate(s, [0, 1], [0.6, 1]);
  return (
    <div style={{position: 'absolute', left: x, top: y + (1 - s) * 80, width: w, height: h, opacity: Math.min(1, s * 1.6), transform: `scale(${sc}) rotate(${(1 - s) * -3}deg)`, transformOrigin: '50% 100%', background: dark ? '#14181d' : '#fff', border: `6px solid ${I}`, borderRadius: 22, boxShadow: `14px 14px 0 ${I}`, overflow: 'hidden', fontFamily: 'Arial, sans-serif'}}>
      <div style={{height: 54, background: '#e9e9e4', borderBottom: `5px solid ${I}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px'}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 20, height: 20, borderRadius: 10, background: c, border: `3px solid ${I}`}} />)}
        <div style={{marginLeft: 12, fontWeight: 800, fontSize: 24, color: '#555'}}>{title}</div>
      </div>
      <div style={{position: 'relative', height: h - 60}}>{children}</div>
    </div>
  );
};

const WinBody: React.FC<{w: Win; delay: number; width: number; height: number}> = ({w, delay, width, height}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (w.k === 'terminal') {
    const per = 16;
    return (
      <div style={{padding: 22, fontFamily: MONO, fontSize: 30, lineHeight: 1.5, color: '#d7ffe0'}}>
        {w.lines.map((l, i) => {
          const n = Math.max(0, Math.floor((frame - delay - 10 - i * per) * 2.2));
          const shown = l.slice(0, n);
          if (!n) return null;
          return <div key={i} style={{color: l.startsWith('✓') ? '#5BE49B' : l.startsWith('>') ? '#FFC93C' : '#d7ffe0', whiteSpace: 'pre'}}>{shown}{shown.length < l.length && '▌'}</div>;
        })}
      </div>
    );
  }
  if (w.k === 'meter') {
    return (
      <div style={{padding: '26px 30px'}}>
        {w.rows.map((r, i) => {
          const p = w.instant ? 1 : Math.min(1, Math.max(0, (frame - delay - 12 - i * 10) / 28));
          const e = Easing.out(Easing.cubic)(p);
          const v = Math.round(r.to * e);
          const full = r.to >= 100 && p >= 1;
          const c = r.to >= 100 ? PAPER.red : col(r.color, PAPER.orange);
          const blink = full && frame % 12 < 6;
          return (
            <div key={i} style={{marginBottom: 26}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 34}}>
                <span>{r.label}</span>
                <span style={{color: c}}>{v}%{full ? ' • LIMIT!' : ''}</span>
              </div>
              <div style={{height: 46, borderRadius: 23, border: `5px solid ${I}`, background: '#eee', overflow: 'hidden', marginTop: 8}}>
                <div style={{width: `${v}%`, height: '100%', background: blink ? '#FF8A84' : c}} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  if (w.k === 'chat') {
    return (
      <div style={{padding: 26, display: 'flex', flexDirection: 'column', gap: 18}}>
        {w.bubbles.map((b, i) => {
          const s = spring({frame: frame - delay - 12 - i * 22, fps, config: {damping: 12, stiffness: 170}});
          return (
            <div key={i} style={{alignSelf: b.me ? 'flex-end' : 'flex-start', maxWidth: '80%', background: b.me ? PAPER.blue : '#ecece8', color: b.me ? '#fff' : I, border: `5px solid ${I}`, borderRadius: 28, padding: '12px 26px', fontWeight: 800, fontSize: 36, transform: `scale(${Math.max(0, s)})`, transformOrigin: b.me ? '100% 50%' : '0 50%'}}>
              {b.t}
            </div>
          );
        })}
      </div>
    );
  }
  const sl = (k: number) => spring({frame: frame - delay - 10 - k * 8, fps, config: {damping: 12, stiffness: 140}});
  return (
    <div style={{padding: 22, height: height}}>
      <div style={{background: '#eee', border: `4px solid ${I}`, borderRadius: 30, padding: '8px 26px', fontFamily: MONO, fontSize: 27, fontWeight: 700, transform: `scaleX(${sl(0)})`, transformOrigin: '0 50%', whiteSpace: 'nowrap', overflow: 'hidden'}}>🔒 {w.url}</div>
      <div style={{marginTop: 22, background: UT, border: `5px solid ${I}`, borderRadius: 20, padding: '30px 30px', boxShadow: `8px 8px 0 ${I}`, transform: `translateY(${(1 - sl(1)) * 60}px)`, opacity: sl(1)}}>
        <div style={{fontWeight: 900, fontSize: 56, lineHeight: 1.05}}>{w.title}</div>
        {w.sub && <div style={{fontWeight: 800, fontSize: 32, marginTop: 8}}>{w.sub}</div>}
      </div>
      <div style={{display: 'flex', gap: 16, marginTop: 22}}>
        {[PAPER.blue, PAPER.green, PAPER.red].map((c, i) => (
          <div key={i} style={{flex: 1, height: 110, background: c, border: `5px solid ${I}`, borderRadius: 16, transform: `translateY(${(1 - sl(2 + i)) * 80}px)`, opacity: sl(2 + i)}} />
        ))}
      </div>
    </div>
  );
};

const Dock: React.FC = () => (
  <div style={{position: 'absolute', left: 90, right: 90, bottom: 26, height: 96, background: 'rgba(255,255,255,0.85)', border: `5px solid ${I}`, borderRadius: 28, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 24px'}}>
    {['#4C8DFF', '#FF6B5E', '#2DD4A0', '#FFC93C', '#B07CFF', '#FF9F43', '#6C7A89'].map((c, i) => (
      <div key={i} style={{width: 58, height: 58, borderRadius: 16, background: c, border: `4px solid ${I}`}} />
    ))}
  </div>
);

const MenuBar: React.FC = () => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 52, background: 'rgba(255,255,255,0.9)', borderBottom: `4px solid ${I}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', fontFamily: 'Arial', fontWeight: 800, fontSize: 24}}>
    <span>● Claude &nbsp; File &nbsp; Edit &nbsp; View</span>
    <span>Senin 01.30</span>
  </div>
);

const Notif: React.FC<{text: string; at: number}> = ({text, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - at, fps, config: {damping: 13, stiffness: 150}});
  return (
    <div style={{position: 'absolute', right: 30, top: 70, width: 560, background: '#fff', border: `5px solid ${I}`, borderRadius: 20, boxShadow: `8px 8px 0 ${I}`, padding: '14px 22px', fontFamily: 'Arial', fontWeight: 800, fontSize: 28, transform: `translateX(${(1 - s) * 700}px)`}}>
      🔔 {text}
    </div>
  );
};

export const DeskScene: React.FC<{d: number; spec: DeskSpec; gear: React.ReactNode}> = ({d, spec, gear}) => {
  const n = spec.wins.length;
  const wins = spec.wins.map((w, i) => {
    const hk = w.k === 'meter' ? 400 : w.k === 'chat' ? 470 : w.k === 'terminal' ? 500 : 540;
    const h = n === 1 ? hk : 330;
    const y = n === 1 ? 740 : 700 + i * 370;
    return {w, i, x: 90, y, ww: 900, h, delay: 8 + i * 14};
  });
  const gap = Math.max(3, Math.min(12, Math.floor((d * 0.62 - 8) / spec.caption.length)));
  return (
    <AbsoluteFill>
      <Camera keys={[{f: 0, s: 1.1, y: -90}, {f: 16, s: 1.0}, {f: d, s: 1.04}]} easing={Easing.out(Easing.exp)} shake={spec.flash ? {from: 0, to: d, amp: 9} : undefined}>
        <PaperBg />
        <AbsoluteFill style={{background: spec.tint ?? '#E3F1EA', mixBlendMode: 'multiply'}} />
        <Sparkles />
        <MenuBar />
        <KineticText y={150} size={n === 1 ? 104 : 96} gap={gap} at={6} words={spec.caption.map((c) => ({t: c.t, hl: c.hl ? col(c.hl, c.hl) : undefined}))} />
        {wins.map(({w, i, x, y, ww, h, delay}) => (
          <Pop key={i} x={x} y={y} w={ww} h={h} delay={delay} dark={w.k === 'terminal'} title={w.k === 'browser' ? 'Safari' : (w as any).title ?? (w.k === 'terminal' ? 'terminal — claude-code' : w.k === 'meter' ? 'Batas pemakaian' : 'Claude')}>
            <WinBody w={w} delay={delay} width={ww} height={h - 60} />
          </Pop>
        ))}
        {spec.notif && <Notif text={spec.notif} at={Math.round(d * 0.5)} />}
        <Dock />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          <g transform="translate(540 1400) scale(0.8)">
            <Stickman keys={moodKeys(spec.mood, d)} ink={I} headFill="#fff" shirt={UT} ringOff headGear={gear} />
          </g>
        </svg>
      </Camera>
      {spec.flash && <Flash />}
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = frame < 8 ? 0.6 : frame % 16 < 6 ? 0.22 : 0;
  return <AbsoluteFill style={{background: PAPER.red, opacity: o, pointerEvents: 'none'}} />;
};

export type JumpSpec = {tint?: string; label: string; big?: string; punch: string; clock?: boolean; reverse?: boolean; mood?: DeskSpec['mood']};

export const JumpScene: React.FC<{d: number; spec: JumpSpec; gear: React.ReactNode}> = ({d, spec, gear}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = spring({frame: frame - Math.round(d * 0.35), fps, config: {damping: 7, stiffness: 200}});
  const shake = frame > d * 0.35 && frame < d * 0.35 + 10 ? Math.sin(frame * 3) * 8 : 0;
  const rot = interpolate(frame, [4, d * 0.5], [0, spec.reverse ? -720 : 720], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill>
      <Camera keys={[{f: 0, s: 1.25}, {f: 14, s: 1.0}, {f: d, s: 1.06}]} easing={Easing.out(Easing.exp)}>
        <PaperBg rays />
        <AbsoluteFill style={{background: spec.tint ?? '#FBE3E1', mixBlendMode: 'multiply'}} />
        <Sparkles />
        {spec.big && <div style={{position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 240, color: 'rgba(17,17,17,0.09)', letterSpacing: -8}}>{spec.big}</div>}
        <div style={{position: 'absolute', left: 90, top: 300, fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 40, letterSpacing: 5, color: PAPER.orange}}>{spec.label}</div>
        {spec.clock && (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <g transform="translate(540 760)">
              <circle r={190} fill="#fff" stroke={I} strokeWidth={10} />
              {Array.from({length: 12}).map((_, i) => <line key={i} x1={0} y1={-160} x2={0} y2={-176} stroke={I} strokeWidth={8} transform={`rotate(${i * 30})`} />)}
              <line x1={0} y1={0} x2={0} y2={-120} stroke={I} strokeWidth={14} strokeLinecap="round" transform={`rotate(${rot / 12})`} />
              <line x1={0} y1={0} x2={0} y2={-165} stroke={PAPER.red} strokeWidth={8} strokeLinecap="round" transform={`rotate(${rot})`} />
              <circle r={14} fill={I} />
            </g>
          </svg>
        )}
        <div style={{position: 'absolute', left: 540, top: spec.clock ? 1140 : 800, transform: `translate(calc(-50% + ${shake}px), -50%) scale(${Math.max(0, sp)}) rotate(-3deg)`, background: I, color: UT, border: `8px solid ${I}`, borderRadius: 24, boxShadow: `12px 12px 0 ${PAPER.red}`, padding: '14px 50px', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 110, whiteSpace: 'nowrap'}}>
          {spec.punch}
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          <g transform="translate(540 1460) scale(0.85)">
            <Stickman keys={moodKeys(spec.mood ?? 'shock', d)} ink={I} headFill="#fff" shirt={UT} ringOff headGear={gear} />
          </g>
        </svg>
      </Camera>
    </AbsoluteFill>
  );
};

export type CtaSpec = {headline: {t: string; hl?: string}[]; handle: string; button?: string; comment: string};

export const CtaScene: React.FC<{d: number; spec: CtaSpec; gear: React.ReactNode}> = ({d, spec, gear}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const card = spring({frame: frame - 18, fps, config: {damping: 11, stiffness: 140}});
  const tapAt = Math.round(d * 0.5);
  const cx = interpolate(frame, [tapAt - 26, tapAt], [900, 700], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const cy = interpolate(frame, [tapAt - 26, tapAt], [1250, 972], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const press = frame >= tapAt && frame < tapAt + 8;
  const done = frame >= tapAt + 4;
  const pulse = 1 + (frame % 20 < 10 ? 0.04 : 0);
  const ripple = interpolate(frame, [tapAt, tapAt + 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cm = spring({frame: frame - Math.round(d * 0.62), fps, config: {damping: 10, stiffness: 160}});
  return (
    <AbsoluteFill>
      <Camera keys={[{f: 0, s: 1.15}, {f: 14, s: 1.0}, {f: d, s: 1.04}]} easing={Easing.out(Easing.exp)}>
        <PaperBg rays />
        <AbsoluteFill style={{background: '#FBE3E1', mixBlendMode: 'multiply'}} />
        <Sparkles />
        <KineticText y={170} size={118} gap={5} at={4} words={spec.headline.map((c) => ({t: c.t, hl: c.hl ? col(c.hl, c.hl) : undefined}))} />
        <div style={{position: 'absolute', left: 90, top: 790, width: 900, height: 330, background: '#fff', border: `7px solid ${I}`, borderRadius: 32, boxShadow: `14px 14px 0 ${I}`, transform: `scale(${Math.max(0, card)})`, display: 'flex', alignItems: 'center', gap: 34, padding: '0 40px', fontFamily: 'Arial, sans-serif'}}>
          <div style={{width: 150, height: 150, borderRadius: 75, background: UT, border: `7px solid ${I}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <svg width={110} height={110} viewBox="-60 -90 120 120"><circle cx={0} cy={-34} r={44} fill="#fff" stroke={I} strokeWidth={8} /><circle cx={-16} cy={-40} r={6} fill={I} /><circle cx={16} cy={-40} r={6} fill={I} /><path d="M-14 -20 Q0 -8 14 -20" stroke={I} strokeWidth={6} fill="none" /></svg>
          </div>
          <div style={{flex: 1}}>
            <div style={{fontWeight: 900, fontSize: 46, whiteSpace: 'nowrap'}}>{spec.handle}</div>
            <div style={{marginTop: 20, width: 420, height: 100, borderRadius: 20, border: `6px solid ${I}`, background: done ? '#fff' : PAPER.red, color: done ? I : '#fff', fontWeight: 900, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${press ? 0.92 : pulse})`, boxShadow: done ? 'none' : `7px 7px 0 ${I}`}}>
              {done ? 'Mengikuti ✓' : spec.button ?? 'FOLLOW'}
            </div>
          </div>
        </div>
        {ripple > 0 && ripple < 1 && <div style={{position: 'absolute', left: 700 - 90 * ripple - 20, top: 972 - 90 * ripple - 20, width: 40 + 180 * ripple, height: 40 + 180 * ripple, borderRadius: '50%', border: `6px solid ${PAPER.red}`, opacity: 1 - ripple}} />}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
          <g transform={`translate(${cx} ${cy}) rotate(-20)`}>
            <path d="M0 0 L0 78 L20 60 L34 92 L48 86 L34 54 L60 54 Z" fill="#fff" stroke={I} strokeWidth={6} strokeLinejoin="round" />
          </g>
          <g transform="translate(540 1560) scale(0.8)">
            <Stickman keys={[{f: 0, pose: P.talk}, {f: 16, pose: P.point, blend: 8}, {f: tapAt + 10, pose: P.happy, blend: 8}, {f: tapAt + 34, pose: P.thumbs, blend: 8}]} ink={I} headFill="#fff" shirt={UT} ringOff headGear={gear} />
          </g>
        </svg>
        <div style={{position: 'absolute', left: 90, top: 1190, width: 900, background: PAPER.blue, color: '#fff', border: `6px solid ${I}`, borderRadius: 30, boxShadow: `10px 10px 0 ${I}`, padding: '18px 34px', fontFamily: 'Arial Black, Arial', fontWeight: 900, fontSize: 50, lineHeight: 1.1, transform: `scale(${Math.max(0, cm)}) rotate(-2deg)`, transformOrigin: '0 50%'}}>
          {spec.comment}
        </div>
      </Camera>
    </AbsoluteFill>
  );
};
