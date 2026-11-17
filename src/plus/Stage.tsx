import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Stickman, POSES} from '../engine/Stickman';
import {Mascot} from './Mascot';
import {C, FONT} from './theme';
import {pop, range, easeOut} from './timing';

// Panel monitor bergambar: stickman + maskot AI + ikon + panah alur. Tanpa kalimat narasi.
export type StageNode = {
  id: string; x: number; y: number; at?: number; size?: number;
  icon?: string; color?: string; mascot?: {name: string; emotion?: string};
};
export type StageEdge = {from: string; to: string; at?: number; dashed?: boolean; color?: string};
export type StageBadge = {x: number; y: number; kind: 'check' | 'cross' | 'q' | 'warn'; at?: number; size?: number};
export type StagePanelRow = {k: 'cmd' | 'ok' | 'bad' | 'add' | 'del' | 'dir' | 'file' | 'plain'; t: string; at?: number};
export type StageSpec = {
  bg?: string;
  stick?: {x: number; y?: number; s?: number; keys: {f: number; pose: string; blend?: number}[]; flip?: boolean; thumbUp?: boolean; move?: {x0: number; x1: number; at: number; dur: number}};
  nodes?: StageNode[];
  edges?: StageEdge[];
  badges?: StageBadge[];
  term?: {x: number; y: number; w: number; h: number; title?: string; rows: StagePanelRow[]; at?: number};
};

const UT = '#FFC20E';
// pose lari ala Sonic: badan condong ke depan, lengan dan kaki ayun bergantian
const RUN: Record<string, any> = {
  runA: {lu: 118, ll: 150, ru: -70, rl: -20, lt: 62, ls: 20, rt: -52, rs: -100, lean: 34, tilt: 10, y: -6, face: 'focus'},
  runB: {lu: -70, ll: -20, ru: 118, rl: 150, lt: -52, ls: -100, rt: 62, rs: 20, lean: 34, tilt: 10, y: 4, face: 'focus'},
};
const INK = '#111';

const Icon: React.FC<{name: string; s: number}> = ({name, s}) => {
  const p = {stroke: INK, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  return (
    <svg width={s} height={s} viewBox="0 0 100 100">
      {name === 'search' && <><circle cx="42" cy="42" r="24" {...p} /><path d="M60 60L82 82" {...p} strokeWidth={10} /></>}
      {name === 'list' && <><path d="M36 28H82M36 50H82M36 72H82" {...p} /><circle cx="20" cy="28" r="4" fill={INK} /><circle cx="20" cy="50" r="4" fill={INK} /><circle cx="20" cy="72" r="4" fill={INK} /></>}
      {name === 'doc' && <><path d="M24 12H60L76 28V88H24Z" {...p} fill="#fff" /><path d="M60 12V28H76" {...p} /><path d="M36 48H64M36 62H64M36 76H54" {...p} strokeWidth={6} /></>}
      {name === 'code' && <><path d="M36 28L12 50L36 72M64 28L88 50L64 72" {...p} strokeWidth={9} /><path d="M56 22L44 78" {...p} strokeWidth={6} /></>}
      {name === 'film' && <><rect x="14" y="22" width="72" height="56" rx="8" {...p} fill="#fff" /><path d="M42 36L62 50L42 64Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" /><path d="M24 22V78M76 22V78" {...p} strokeWidth={4} /></>}
      {name === 'mic' && <><rect x="38" y="12" width="24" height="42" rx="12" {...p} fill="#fff" /><path d="M26 44C26 62 74 62 74 44M50 62V84M36 86H64" {...p} /></>}
      {name === 'wave' && <path d="M14 50V50M26 36V64M38 22V78M50 32V68M62 18V82M74 36V64M86 46V54" {...p} strokeWidth={8} />}
      {name === 'check' && <path d="M18 52L40 74L84 26" {...p} stroke="#1B9E4B" strokeWidth={13} />}
      {name === 'folder' && <><path d="M10 28H38L46 38H90V80H10Z" {...p} fill="#fff" /><path d="M10 46H90" {...p} strokeWidth={5} /></>}
      {name === 'file' && <><path d="M26 12H58L76 30V88H26Z" {...p} fill="#fff" /><path d="M58 12V30H76" {...p} /></>}
      {name === 'gear' && <><circle cx="50" cy="50" r="16" {...p} /><path d="M50 10V24M50 76V90M10 50H24M76 50H90M22 22L32 32M68 68L78 78M78 22L68 32M32 68L22 78" {...p} strokeWidth={9} /></>}
      {name === 'terminal' && <><rect x="10" y="18" width="80" height="64" rx="8" {...p} fill="#fff" /><path d="M24 40L38 50L24 60M46 62H66" {...p} /></>}
      {name === 'box' && <><path d="M50 12L86 30V70L50 88L14 70V30Z" {...p} fill="#fff" /><path d="M14 30L50 48L86 30M50 48V88" {...p} strokeWidth={5} /></>}
      {name === 'play' && <><circle cx="50" cy="50" r="36" {...p} fill="#fff" /><path d="M42 34L68 50L42 66Z" fill={INK} stroke={INK} strokeWidth={4} strokeLinejoin="round" /></>}
      {name === 'link' && <><path d="M42 58C34 66 22 66 16 58C10 50 12 40 20 34L32 24M58 42C66 34 78 34 84 42C90 50 88 60 80 66L68 76M38 62L62 38" {...p} strokeWidth={8} /></>}
      {name === 'plus' && <><circle cx="50" cy="50" r="34" {...p} fill="#fff" /><path d="M50 32V68M32 50H68" {...p} strokeWidth={10} /></>}
      {name === 'bug' && <><ellipse cx="50" cy="56" rx="20" ry="26" {...p} fill="#fff" /><path d="M50 30V82M30 46L14 40M70 46L86 40M30 62H12M70 62H88M32 78L18 88M68 78L82 88M40 30C40 18 60 18 60 30" {...p} strokeWidth={6} /></>}
      {name === 'bubble' && <><path d="M14 20H86V64H48L30 82V64H14Z" {...p} fill="#fff" /><path d="M32 42H68" {...p} strokeWidth={6} /></>}
    </svg>
  );
};

const Badge: React.FC<StageBadge> = ({x, y, kind, at = 0, size = 64}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = pop(f, fps, at, 9);
  if (f < at) return null;
  const bg = kind === 'check' ? '#fff' : kind === 'cross' ? '#FF4B4B' : kind === 'q' ? C.yellow : C.orange;
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2, background: bg, border: '5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${a})`, fontFamily: FONT, fontWeight: 800, fontSize: size * 0.62, color: INK}}>
      {kind === 'check' && <Icon name="check" s={size * 0.7} />}
      {kind === 'cross' && <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 46 46"><path d="M8 8L38 38M38 8L8 38" stroke="#fff" strokeWidth={9} strokeLinecap="round" /></svg>}
      {kind === 'q' && '?'}
      {kind === 'warn' && '!'}
    </div>
  );
};

const KC: Record<string, string> = {cmd: '#9CC8FF', ok: '#4EE3A0', bad: '#FF7B72', add: '#4EE3A0', del: '#FF7B72', dir: '#FFC93C', file: '#E6EDF3', plain: '#C9D1D9'};
const KP: Record<string, string> = {cmd: '$ ', ok: 'v ', bad: 'x ', add: '+ ', del: '- ', dir: '> ', file: '  ', plain: ''};

export const StagePanel: React.FC<{stage: StageSpec}> = ({stage}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nodes = stage.nodes ?? [];
  const byId: Record<string, StageNode> = {};
  nodes.forEach((n) => { byId[n.id] = n; });
  const st = stage.stick;
  return (
    <div style={{position: 'absolute', inset: 0, background: stage.bg ?? '#FFF8EE', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#EADFCB 2px, transparent 2px), linear-gradient(90deg, #EADFCB 2px, transparent 2px)', backgroundSize: '46px 46px', opacity: 0.55}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 38, height: 6, background: INK, opacity: 0.18}} />
      <div style={{position: 'absolute', right: 20, top: 14, fontFamily: FONT, fontWeight: 800, fontSize: 24, background: C.yellow, border: '4px solid #111', borderRadius: 12, padding: '2px 12px', transform: 'rotate(2deg)', zIndex: 5}}>ILUSTRASI</div>
      <svg width={920} height={610} style={{position: 'absolute', inset: 0}}>
        <defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill={INK} /></marker></defs>
        {(stage.edges ?? []).map((e, i) => {
          const a = byId[e.from], b = byId[e.to];
          if (!a || !b) return null;
          const at = e.at ?? 10;
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
          const ra = (a.size ?? 130) / 2 + 8, rb = (b.size ?? 130) / 2 + 14;
          const x1 = a.x + (dx / L) * ra, y1 = a.y + (dy / L) * ra, x2 = b.x - (dx / L) * rb, y2 = b.y - (dy / L) * rb;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const p = range(f, at, at + 14, 0, 1, easeOut);
          return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={e.color ?? INK} strokeWidth={8} strokeLinecap="round" strokeDasharray={e.dashed ? '4 20' : undefined} markerEnd={p > 0.98 && !e.dashed ? 'url(#ah)' : undefined} opacity={len > 0 ? 1 : 0} />;
        })}
        {st && (() => {
          const mv = st.move;
          const pm = mv ? range(f, mv.at, mv.at + mv.dur, 0, 1) : 1;
          const sx = mv ? mv.x0 + (mv.x1 - mv.x0) * pm : st.x;
          const moving = mv && f >= mv.at && f < mv.at + mv.dur;
          const dir = mv && mv.x1 < mv.x0 ? -1 : 1;
          return (
          <g>
            {moving && [0, 1, 2, 3, 4, 5].map((i) => (
              <line key={i} x1={sx - dir * (70 + i * 6)} y1={(st.y ?? 330) + 40 + i * 52} x2={sx - dir * (230 + ((f * 37 + i * 61) % 90))} y2={(st.y ?? 330) + 40 + i * 52} stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
            ))}
            {moving && [0, 1, 2].map((i) => <circle key={i} cx={sx - dir * (90 + i * 50)} cy={(st.y ?? 330) + 215 - i * 10} r={14 + i * 5} fill="#D9CDB5" opacity={0.7 - i * 0.2} />)}
          <g transform={`translate(${sx} ${(st.y ?? 330)}) scale(${(st.flip ? -1 : 1) * (dir < 0 && moving ? -1 : 1) * (st.s ?? 0.5)} ${st.s ?? 0.5})`}>
            <Stickman keys={st.keys.map((k) => ({f: k.f, pose: RUN[k.pose] ?? (POSES as any)[k.pose] ?? POSES.idle, blend: k.blend}))} ink={INK} headFill="#fff" accent="#E5322D" shirt={UT} thumbUp={st.thumbUp} />
          </g>
          </g>
          );
        })()}
      </svg>
      {nodes.map((n) => {
        const a = pop(f, fps, n.at ?? 0, 11);
        const s = n.size ?? 130;
        if (f < (n.at ?? 0)) return null;
        return (
          <div key={n.id} style={{position: 'absolute', left: n.x - s / 2, top: n.y - s / 2, width: s, height: s, transform: `scale(${a})`}}>
            {n.mascot ? (
              <div style={{position: 'absolute', left: -10, top: -14, width: s + 20}}>
                <Mascot name={n.mascot.name} emotion={n.mascot.emotion ?? 'kerja'} size={s + 20} x={0} y={0} from="none" bob />
              </div>
            ) : (
              <div style={{width: s, height: s, borderRadius: 24, background: n.color ?? '#fff', border: '6px solid #111', boxShadow: '8px 8px 0 #111', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Icon name={n.icon ?? 'doc'} s={s * 0.66} />
              </div>
            )}
          </div>
        );
      })}
      {stage.term && (() => {
        const t = stage.term!;
        const a = pop(f, fps, t.at ?? 0, 12);
        return (
          <div style={{position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, background: '#0f1b24', border: '6px solid #111', borderRadius: 20, boxShadow: '8px 8px 0 #111', overflow: 'hidden', transform: `scale(${a})`, transformOrigin: 'left center'}}>
            <div style={{height: 38, background: '#24323d', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
              {['#FF5A52', '#FFC93C', '#4EE3A0'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
              {t.title && <div style={{marginLeft: 10, fontFamily: 'monospace', fontSize: 20, color: '#9aa7b2'}}>{t.title}</div>}
            </div>
            <div style={{padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6}}>
              {t.rows.map((r, i) => {
                const at = r.at ?? 12 + i * 14;
                const ra = range(f, at, at + 8, 0, 1);
                return <div key={i} style={{fontFamily: 'monospace', fontWeight: 700, fontSize: 30, color: KC[r.k], opacity: ra, whiteSpace: 'pre', background: r.k === 'add' ? 'rgba(78,227,160,.14)' : r.k === 'del' ? 'rgba(255,123,114,.16)' : 'transparent', padding: '0 6px'}}>{KP[r.k]}{r.t}</div>;
              })}
            </div>
          </div>
        );
      })()}
      {(stage.badges ?? []).map((b, i) => <Badge key={i} {...b} />)}
    </div>
  );
};
