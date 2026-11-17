import React from 'react';
import {Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, SAFE, sticker} from './theme';
import {Mascot} from './Mascot';
import {MockChat} from './MockChat';
import {BigNumber} from './BigNumber';
import {pop, range, easeOut} from './timing';
import {PlusSpec, Shell, Title} from './Scenes';

const COLS = [C.blue, C.pink, C.yellow, C.mint, C.purple];

// 33 Stat Chart: angka besar + garis naik ala terminal
export const StatChartScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const st = spec.stat!;
  const pts = (spec.bars ?? [{label: '', value: 20}, {label: '', value: 28}, {label: '', value: 24}, {label: '', value: 45}, {label: '', value: 70}]).map((b) => b.value);
  const max = Math.max(...pts);
  const W = 860, Hh = 380;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, Hh - (v / max) * (Hh - 30)] as const);
  const prog = range(f, 14, 14 + 50, 0, 1, easeOut);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const len = 3000;
  return (
    <Shell spec={spec} frames={frames} bg="#0F1115" cam={[{f: 0, s: 1.1}, {f: 22, s: 1}, {f: frames, s: 1.05}]}>
      <Title text={spec.title} color={spec.titleColor} size={92} />
      <div style={{position: 'absolute', left: 60, top: 480, fontFamily: FONT, fontWeight: 500, fontSize: 34, color: '#E6E8EB', letterSpacing: 3}}>{(st.label || '').toUpperCase()}</div>
      <div style={{position: 'absolute', left: 90, top: 520, fontFamily: FONT, fontWeight: 700, fontSize: 170, color: '#fff'}}>
        <BigNumber value={st.value} decimals={st.decimals} suffix={st.suffix} delay={8} color="#FF8A3D" size={170} />
      </div>
      <svg width={W} height={Hh} style={{position: 'absolute', left: 110, top: 900}}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={Hh * g} y2={Hh * g} stroke="#2A2F38" strokeWidth={2} />)}
        <path d={d} fill="none" stroke="#FF8A3D" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - prog)} />
        {xy.map(([x, y], i) => (i / (pts.length - 1) <= prog ? <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 16 : 9} fill={i === pts.length - 1 ? '#FF8A3D' : '#0F1115'} stroke="#FF8A3D" strokeWidth={5} /> : null))}
      </svg>
      {st.note && <div style={{position: 'absolute', left: 60, right: 150, top: 1330, fontFamily: FONT, fontWeight: 500, fontSize: 30, color: '#E6E8EB'}}>{st.note}</div>}
      {spec.mascot && <Mascot {...spec.mascot} size={360} x={680} y={420} delay={20} from="right" />}
    </Shell>
  );
};

// 24 Ranking Bars: batang horizontal tumbuh, juara oranye
export const RankingScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const bars = [...(spec.bars ?? [])].sort((a, b) => b.value - a.value).slice(0, 6);
  const max = bars[0]?.value || 1;
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.05}]}>
      <Title text={spec.title} color={spec.titleColor} size={96} />
      {bars.map((b, i) => {
        const w = 560 * (b.value / max) * range(f, 10 + i * 8, 40 + i * 8, 0, 1, easeOut);
        return (
          <div key={i} style={{position: 'absolute', left: 70, top: 430 + i * 160, width: 860, height: 120}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: 90, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 56}}>{i + 1}</div>
            <div style={{position: 'absolute', left: 100, top: 0, width: Math.max(w + 150, 400), height: 120, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', ...sticker(i === 0 ? '#FF8A3D' : b.color ?? COLS[i % 5], 6)}}>
              <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, color: C.ink, whiteSpace: 'nowrap'}}>{b.label}</span>
              <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, color: C.ink, marginLeft: 20}}>{Math.round(b.value * range(f, 10 + i * 8, 40 + i * 8, 0, 1, easeOut))}{spec.unit ?? ''}</span>
            </div>
          </div>
        );
      })}
      {spec.mascot && <Mascot {...spec.mascot} size={300} x={700} y={1150} delay={30} from="right" />}
    </Shell>
  );
};

// 27 Versus: A lawan B, batang tumbuh dari tengah
export const VersusScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = spec.versus!;
  const vs = pop(f, fps, 6);
  const side = (s: {title: string; lines: string[]}, left: boolean, col: string) => (
    <div style={{position: 'absolute', top: 560, left: left ? 60 : 520, width: 430, transform: `translateX(${(1 - range(f, 4, 24, 0, 1, easeOut)) * (left ? -300 : 300)}px)`}}>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 52, textAlign: 'center', padding: '16px 10px', color: C.ink, ...sticker(col, 8)}}>{s.title}</div>
      {s.lines.slice(0, 4).map((l, i) => {
        const a = pop(f, fps, 22 + i * 12);
        return <div key={i} style={{marginTop: 26, fontFamily: FONT, fontWeight: 500, fontSize: 36, padding: '18px 20px', color: C.ink, opacity: a, transform: `scale(${0.85 + 0.15 * a})`, ...sticker('#fff', 6)}}>{l}</div>;
      })}
    </div>
  );
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1.08}, {f: 20, s: 1}, {f: frames, s: 1.04}]}>
      <Title text={spec.title} color={spec.titleColor} size={76} />
      {side(v.left, true, C.blue)}
      {side(v.right, false, C.pink)}
      <div style={{position: 'absolute', left: 490, top: 470, width: 100, height: 100, borderRadius: 50, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vs})`}}>VS</div>
      {spec.mascot && <Mascot {...spec.mascot} size={300} x={380} y={1250} delay={40} from="bottom" />}
    </Shell>
  );
};

// 22 Notification Stack: notifikasi menumpuk di layar HP
export const NotifScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = spec.notifs ?? [];
  const total = pop(f, fps, 14 + n.length * 12);
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.05}]}>
      <Title text={spec.title} color={spec.titleColor} size={92} />
      <div style={{position: 'absolute', left: 190, top: 400, width: 660, height: 1010, boxSizing: 'border-box', padding: 28, ...sticker('#16181D', 10), borderRadius: 70}}>
        <div style={{textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 90, color: '#fff', marginTop: 30}}>09:41</div>
        <div style={{marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18}}>
          {n.slice(0, 5).map((x, i) => {
            const a = pop(f, fps, 14 + i * 12);
            return (
              <div key={i} style={{opacity: a, transform: `translateY(${(1 - a) * -60}px) scale(${0.9 + 0.1 * a})`, padding: '16px 20px', borderRadius: 26, background: '#fff', border: `4px solid ${C.ink}`}}>
                <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 26, color: x.color ?? '#25D366'}}>{x.app}</div>
                <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 32, color: C.ink}}>{x.text}</div>
              </div>
            );
          })}
        </div>
        {spec.total && <div style={{position: 'absolute', left: 60, right: 60, bottom: 40, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 52, padding: '14px 0', background: C.lime, color: C.ink, border: `5px solid ${C.ink}`, borderRadius: 24, transform: `scale(${total})`}}>{spec.total}</div>}
      </div>
      {spec.mascot && <Mascot {...spec.mascot} size={300} x={730} y={1320} delay={40} from="right" />}
    </Shell>
  );
};

// 15 Text Thread: percakapan chat (WhatsApp/AI)
export const ChatScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => (
  <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.05}]}>
    <Title text={spec.title} color={spec.titleColor} size={92} />
    <div style={{position: 'absolute', left: 80, top: 430}}>
      <MockChat lines={spec.chat ?? []} title={spec.chatTitle ?? 'Chat'} w={850} delay={6} />
    </div>
    {spec.mascot && <Mascot {...spec.mascot} size={340} x={600} y={1300} delay={30} from="right" />}
  </Shell>
);

// 26 Day Counter: DAY N + kalender dicentang
export const DayCounterScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dd = spec.day ?? {n: 1, of: 30};
  const cols = 7;
  const cells = Array.from({length: dd.of});
  const s = pop(f, fps, 4);
  const rows = Math.ceil(dd.of / cols);
  const compact = rows <= 2;
  const gridTop = compact ? 560 : 640;
  const titleTop = compact ? gridTop + rows * 104 + 110 : 1230;
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1.1}, {f: 20, s: 1}, {f: frames, s: 1.04}]}>
      <div style={{position: 'absolute', left: 60, right: 150, top: SAFE.top + 40, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 200, color: C.red, transform: `scale(${0.7 + 0.3 * s})`}}>
        {dd.big ? <span style={{color: C.ink}}>{dd.big}</span> : <>DAY <span style={{color: C.ink}}>{dd.n}</span></>}
      </div>
      <div style={{position: 'absolute', left: 100, top: gridTop, width: 800, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, padding: 26, ...sticker('#fff', 8)}}>
        {cells.map((_, i) => {
          const done = i < dd.n;
          const a = done ? pop(f, fps, 14 + i * 2) : 1;
          return <div key={i} style={{height: 90, border: `4px solid ${C.ink}`, borderRadius: 14, background: done ? C.lime : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 52, color: C.ink, transform: `scale(${done ? 0.5 + 0.5 * a : 1})`}}>{done ? '✓' : ''}</div>;
        })}
      </div>
      <div style={{position: 'absolute', left: 60, right: 150, top: titleTop, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 56, color: C.ink}}>{spec.title}</div>
      {spec.mascot && <Mascot {...spec.mascot} size={compact ? 420 : 320} x={compact ? 300 : 560} y={compact ? titleTop + 130 : 1290} delay={30} from="right" />}
    </Shell>
  );
};

// Kalender mingguan: 7 baris hari + isi
export const MingguScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const wk = spec.week ?? [];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.04}]}>
      <Title text={spec.title} color={spec.titleColor} size={92} />
      {wk.slice(0, 7).map((r, i) => {
        const a = pop(f, fps, 8 + i * 9);
        return (
          <div key={i} style={{position: 'absolute', left: 70, top: 400 + i * 138, width: 800, height: 112, display: 'flex', alignItems: 'center', gap: 20, opacity: a, transform: `translateX(${(1 - a) * -120}px)`}}>
            <div style={{width: 130, height: 112, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 40, color: C.ink, ...sticker(C.ink === '#111' ? '#fff' : '#fff', 6)}}>{r.day}</div>
            <div style={{flex: 1, height: 112, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 24px', fontFamily: FONT, fontWeight: 700, fontSize: 38, color: C.ink, ...sticker(r.color ?? COLS[i % 5], 6)}}>{r.text}</div>
          </div>
        );
      })}
      {spec.mascot && <Mascot {...spec.mascot} size={250} x={760} y={1450} delay={30} from="right" />}
    </Shell>
  );
};


// 44 Layar: screenshot asli dalam bingkai HP, zoom ke area penting + penanda
export const LayarScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sh = spec.shot!;
  const FW = 720, FH = sh.fh ?? 880;
  const base = sh.cover ? Math.max(FW / sh.w, FH / sh.h) : Math.min(FW / sh.w, FH / sh.h);
  const offX = (FW - sh.w * base) * (sh.px ?? 0.5);
  const offY = sh.cover ? (FH - sh.h * base) / 2 : 0;
  const fo = sh.focus ?? [];
  const t = range(f, 20, Math.max(40, frames - 15), 0, 1, easeOut);
  const f0 = fo[0];
  const zoom = f0 ? 1 + t * 0.07 : 1 + t * 0.05;
  const cx = f0 ? offX + (f0.x + f0.w / 2) * base : FW / 2;
  const cy = f0 ? offY + (f0.y + f0.h / 2) * base : FH / 2;
  const pin = pop(f, fps, 6);
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.02}]}>
      <Title text={spec.title} color={spec.titleColor} size={86} />
      <div style={{position: 'absolute', left: 160, top: 340 + (880 - FH) * 0.35, width: FW + 40, height: FH + 40, borderRadius: 54, background: C.ink, padding: 20, boxSizing: 'border-box', boxShadow: `14px 14px 0 ${C.lime}`, opacity: pin, transform: `scale(${0.92 + 0.08 * pin})`}}>
        <div style={{position: 'relative', width: FW, height: FH, borderRadius: 36, overflow: 'hidden', background: '#000'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: FW, height: FH, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${zoom})`}}>
            {sh.video ? (
              <OffthreadVideo src={staticFile(sh.video)} startFrom={sh.from ?? 0} muted style={{position: 'absolute', left: offX, top: offY, width: sh.w * base, height: sh.h * base}} />
            ) : (
              <Img src={staticFile(sh.src)} style={{position: 'absolute', left: offX, top: offY, width: sh.w * base, height: sh.h * base, display: 'block'}} />
            )}
            {fo.map((r, i) => {
              const a = range(f, 30 + i * 14, 44 + i * 14, 0, 1, easeOut);
              return (
                <div key={i} style={{position: 'absolute', left: offX + r.x * base - 8, top: offY + r.y * base - 8, width: r.w * base + 16, height: r.h * base + 16, border: `6px solid ${C.lime}`, borderRadius: 18, opacity: a, boxShadow: '0 0 0 4px rgba(0,0,0,.5)'}} />
              );
            })}
          </div>
        </div>
      </div>
      {fo.filter((r) => r.label).map((r, i) => {
        const a = pop(f, fps, 44 + i * 14);
        return (
          <div key={i} style={{position: 'absolute', left: 120, top: 1295 - (880 - FH) * 0.65 + i * 78, opacity: a, transform: `translateY(${(1 - a) * 30}px)`, fontFamily: FONT, fontWeight: 700, fontSize: 32, color: C.ink, padding: '8px 22px', ...sticker(i % 2 ? C.yellow : C.lime, 6)}}>{r.label}</div>
        );
      })}
      {spec.mascot && <Mascot {...spec.mascot} size={260} x={780} y={1290 - (880 - FH) * 0.65} delay={22} from="right" />}
    </Shell>
  );
};
