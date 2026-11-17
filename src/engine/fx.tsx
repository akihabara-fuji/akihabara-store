import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {PAPER} from './ui';

/** Teks kinetik: kata muncul satu-satu dengan pantulan dan rotasi. Kata ber-tanda {color} diberi kotak warna. */
export type KWord = {t: string; hl?: string};

export const KineticText: React.FC<{
  words: KWord[];
  at?: number;
  y: number;
  size?: number;
  gap?: number;
}> = ({words, at = 4, y, size = 120, gap = 7}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: y,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '8px 26px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -3,
        color: PAPER.ink,
      }}
    >
      {words.map((w, i) => {
        const p = spring({frame: frame - at - i * gap, fps, config: {damping: 9, stiffness: 190}});
        const rot0 = ((i * 37) % 17) - 8;
        const rot = interpolate(p, [0, 1], [rot0 * 2.2, w.hl ? -2 : rot0 * 0.15]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${(1 - p) * 90}px) scale(${Math.max(0, p)}) rotate(${rot}deg)`,
              opacity: Math.min(1, p * 2),
              background: w.hl ?? 'transparent',
              color: w.hl ? '#fff' : PAPER.ink,
              padding: w.hl ? '0 20px' : 0,
              borderRadius: 18,
              border: w.hl ? `6px solid ${PAPER.ink}` : 'none',
              boxShadow: w.hl ? `8px 8px 0 ${PAPER.ink}` : 'none',
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** Cincin persentase yang terisi sambil angka naik. */
export const RingStat: React.FC<{
  x: number;
  y: number;
  value: number;
  label: string;
  color: string;
  at?: number;
}> = ({x, y, value, label, color, at = 6}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const card = spring({frame: frame - at, fps, config: {damping: 11, stiffness: 130}});
  const fill = spring({frame: frame - at - 8, fps, durationInFrames: 45, config: {damping: 22}});
  const r = 88;
  const c = 2 * Math.PI * r;
  const v = Math.round(value * Math.max(0, fill));
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 290,
        height: 400,
        transform: `scale(${Math.max(0, card)})`,
        background: '#fff',
        border: `6px solid ${PAPER.ink}`,
        borderRadius: 30,
        boxShadow: `12px 12px 0 ${PAPER.ink}`,
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <svg width={290} height={290} viewBox="-145 -145 290 290" style={{marginTop: 8}}>
        <circle r={r} fill="none" stroke="#E6E6E1" strokeWidth={26} />
        <circle
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={26}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (value / 100) * Math.max(0, fill))}
          transform="rotate(-90)"
        />
        <text y={20} textAnchor="middle" fontSize={64} fontWeight={900} fill={PAPER.ink} fontFamily="Arial Black, Arial">
          {v}%
        </text>
      </svg>
      <div style={{fontSize: 34, fontWeight: 900, marginTop: -4}}>{label}</div>
    </div>
  );
};

/** Garis yang digambar bertahap dengan titik-titik berlabel. */
export const DrawPath: React.FC<{
  points: [number, number][];
  labels: string[];
  at?: number;
  dur?: number;
  color?: string;
}> = ({points, labels, at = 8, dur = 70, color = PAPER.red}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lens = points.slice(1).map((pt, i) => Math.hypot(pt[0] - points[i][0], pt[1] - points[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  const fr = points.map((_, i) => {
    if (i) acc += lens[i - 1];
    return acc / total;
  });
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <polyline
          points={points.map((q) => q.join(',')).join(' ')}
          fill="none"
          stroke={PAPER.ink}
          strokeWidth={22}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
        <polyline
          points={points.map((q) => q.join(',')).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
      </svg>
      {points.map((q, i) => {
        const s = spring({frame: frame - (at + fr[i] * dur), fps, config: {damping: 8, stiffness: 200}});
        const left = i % 2 === 0;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: q[0] - 34,
                top: q[1] - 34,
                width: 68,
                height: 68,
                borderRadius: 34,
                background: '#fff',
                border: `7px solid ${PAPER.ink}`,
                transform: `scale(${Math.max(0, s)})`,
                boxShadow: `5px 5px 0 ${PAPER.ink}`,
                fontFamily: 'Arial Black, Arial',
                fontSize: 34,
                fontWeight: 900,
                textAlign: 'center',
                lineHeight: '54px',
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                position: 'absolute',
                top: q[1] - 28,
                [left ? 'left' : 'right']: left ? q[0] + 54 : 1080 - q[0] + 54,
                transform: `scale(${Math.max(0, s)})`,
                transformOrigin: left ? 'left center' : 'right center',
                background: PAPER.yellow,
                border: `5px solid ${PAPER.ink}`,
                boxShadow: `6px 6px 0 ${PAPER.ink}`,
                borderRadius: 16,
                padding: '8px 24px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 900,
                fontSize: 40,
              }}
            >
              {labels[i]}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/** Dua kartu bersisian ("sebelum" dan "sesudah") dengan lencana VS. */
export const VsCards: React.FC<{
  left: {title: string; lines: string[]};
  right: {title: string; lines: string[]};
  at?: number;
  y: number;
}> = ({left, right, at = 6, y}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame: frame - at, fps, config: {damping: 12, stiffness: 120}});
  const b = spring({frame: frame - at - 26, fps, config: {damping: 10, stiffness: 120}});
  const vs = spring({frame: frame - at - 20, fps, config: {damping: 6, stiffness: 220}});
  const card = (c: {title: string; lines: string[]}, x: number, bg: string, fg: string, t: number, rot: number) => (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 430,
        height: 560,
        background: bg,
        color: fg,
        border: `6px solid ${PAPER.ink}`,
        borderRadius: 30,
        boxShadow: `12px 12px 0 ${PAPER.ink}`,
        transform: `translateX(${(1 - t) * (x < 500 ? -700 : 700)}px) rotate(${rot}deg)`,
        padding: '34px 30px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{fontSize: 50, fontWeight: 900, marginBottom: 24}}>{c.title}</div>
      {c.lines.map((l, i) => (
        <div key={i} style={{fontSize: 36, fontWeight: 700, margin: '16px 0', display: 'flex', gap: 14}}>
          <span>{fg === '#fff' ? '✓' : '–'}</span>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
  return (
    <>
      {card(left, 60, '#fff', '#555', a, -2)}
      {card(right, 590, PAPER.green, '#fff', b, 2)}
      <div
        style={{
          position: 'absolute',
          left: 540 - 62,
          top: y + 230,
          width: 124,
          height: 124,
          borderRadius: 62,
          background: PAPER.yellow,
          border: `7px solid ${PAPER.ink}`,
          boxShadow: `6px 6px 0 ${PAPER.ink}`,
          transform: `scale(${Math.max(0, vs)}) rotate(${(1 - vs) * 120}deg)`,
          textAlign: 'center',
          lineHeight: '110px',
          fontFamily: 'Arial Black, Arial',
          fontWeight: 900,
          fontSize: 50,
        }}
      >
        VS
      </div>
    </>
  );
};

/** Pembuka adegan: lingkaran membesar (dipasang di adegan yang tumpang-tindih dengan adegan sebelumnya). */
export const CircleReveal: React.FC<{dur?: number; origin?: string; children: React.ReactNode}> = ({
  dur = 16,
  origin = '50% 62%',
  children,
}) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, dur], [0, 150], {extrapolateRight: 'clamp'});
  const done = frame >= dur;
  return (
    <AbsoluteFill style={{clipPath: done ? undefined : `circle(${r}% at ${origin})`}}>{children}</AbsoluteFill>
  );
};
