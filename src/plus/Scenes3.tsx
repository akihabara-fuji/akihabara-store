import React from 'react';
import {Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, sticker} from './theme';
import {Mascot} from './Mascot';
import {MASCOTS} from '../data/mascots';
import {pop, range, easeOut} from './timing';
import {PlusSpec, Shell, Title} from './Scenes';

const M = MASCOTS as unknown as Record<string, Record<string, string>>;
const imgOf = (name: string, emo: string) => M[name]?.[emo] ?? M[name]?.thumbs ?? Object.values(M[name] ?? {})[0];

const Avatar: React.FC<{m?: string; emo?: string; initial?: string; color?: string; size?: number}> = ({m, emo = 'thumbs', initial, color = C.blue, size = 96}) => (
  <div style={{width: size, height: size, flex: 'none', borderRadius: size / 2, border: `5px solid ${C.ink}`, background: m ? '#fff' : color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>
    {m ? <Img src={staticFile(imgOf(m, emo))} style={{width: '118%', height: '118%', objectFit: 'contain'}} /> : <span style={{fontFamily: FONT, fontWeight: 700, fontSize: size * 0.42, color: C.ink}}>{initial}</span>}
  </div>
);

// 45 Grup: grup chat WhatsApp dengan maskot sebagai anggota
export const GrupScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const g = spec.grup!;
  const head = pop(f, fps, 2);
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.02}]}>
      <Title text={spec.title} color={spec.titleColor} size={86} />
      <div style={{position: 'absolute', left: 60, top: 330, width: 960, opacity: head, transform: `scale(${0.94 + 0.06 * head})`, ...sticker('#F2F0E6', 7)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '16px 26px', background: '#2FBF71', borderRadius: '18px 18px 0 0', borderBottom: `5px solid ${C.ink}`}}>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, color: '#fff'}}>{g.title}</div>
          <div style={{marginLeft: 'auto', fontFamily: FONT, fontWeight: 700, fontSize: 24, padding: '4px 14px', background: C.yellow, color: C.ink, border: `4px solid ${C.ink}`, borderRadius: 14}}>Ilustrasi alur kerja</div>
        </div>
        <div style={{padding: '24px 24px 30px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 900}}>
          {g.msgs.map((m0, i) => {
            const OFF = 16, TY = 15;
            const at = m0.at + OFF;
            const prevAt = i > 0 ? g.msgs[i - 1].at + OFF : -99;
            const typing = f >= Math.max(at - TY, prevAt + 4) && f < at;
            const m = {...m0, at, file: m0.file ? {...m0.file, open: m0.file.open !== undefined ? m0.file.open + OFF : undefined} : undefined};
            if (f < Math.max(at - TY, prevAt + 4)) return null;
            if (typing) {
              const a0 = pop(f, fps, at - TY, 8);
              return (
                <div key={i} style={{display: 'flex', alignItems: 'flex-end', gap: 14, flexDirection: m.me ? 'row-reverse' : 'row', opacity: a0}}>
                  <Avatar m={m.mascot} emo={m.emotion} initial={m.initial} color={m.color} />
                  <div style={{padding: '12px 24px 16px', borderRadius: 26, border: `5px solid ${C.ink}`, background: m.me ? C.lime : '#fff'}}>
                    <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 26, color: m.me ? C.ink : '#2A6BD8', marginBottom: 4}}>{m.name} sedang mengetik</div>
                    <div style={{display: 'flex', gap: 10, height: 30, alignItems: 'center'}}>
                      {[0, 1, 2].map((d) => <div key={d} style={{width: 16, height: 16, borderRadius: 8, background: C.ink, transform: `translateY(${-Math.abs(Math.sin((f + d * 4) / 4)) * 10}px)`}} />)}
                    </div>
                  </div>
                </div>
              );
            }
            const a = pop(f, fps, m.at);
            return (
              <div key={i} style={{display: 'flex', alignItems: 'flex-end', gap: 14, flexDirection: m.me ? 'row-reverse' : 'row', opacity: Math.min(1, a * 2), transform: `translateY(${(1 - a) * 24}px) scale(${0.9 + 0.1 * a})`, transformOrigin: m.me ? 'right bottom' : 'left bottom'}}>
                <Avatar m={m.mascot} emo={m.emotion} initial={m.initial} color={m.color} />
                <div style={{maxWidth: 700, padding: '12px 24px 16px', borderRadius: 26, border: `5px solid ${C.ink}`, background: m.me ? C.lime : '#fff'}}>
                  <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 26, color: m.me ? C.ink : '#2A6BD8', marginBottom: 2}}>{m.name}</div>
                  {m.text ? <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 34, color: C.ink, lineHeight: 1.25}}>{m.text}</div> : null}
                  {m.file && (
                    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: m.text ? 10 : 2, padding: '10px 16px', borderRadius: 16, border: `4px solid ${C.ink}`, background: m.file.open !== undefined && f >= m.file.open ? C.yellow : '#EFEFEF'}}>
                      <div style={{width: 64, height: 76, flex: 'none', borderRadius: 10, border: `4px solid ${C.ink}`, background: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, boxSizing: 'border-box', fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.ink}}>{m.file.ext}</div>
                      <div>
                        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.ink}}>{m.file.name}</div>
                        <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 24, color: '#444'}}>{m.file.open !== undefined && f >= m.file.open ? 'Dibuka' : 'Ketuk untuk membuka'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
};

// 46 Alur: bahan gambar -> gambar video -> finishing -> CTA
export const AlurScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const st = spec.alur ?? [];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.03}]}>
      <Title text={spec.title} color={spec.titleColor} size={92} />
      {st.slice(0, 4).map((r, i) => {
        const a = pop(f, fps, 8 + i * 22);
        const top = 350 + i * 285;
        const ar = range(f, 18 + i * 22, 30 + i * 22, 0, 1, easeOut);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: 70, top, width: 940, height: 225, opacity: a, transform: `translateY(${(1 - a) * 50}px)`, display: 'flex', alignItems: 'center', gap: 26, padding: '0 30px', boxSizing: 'border-box', ...sticker(r.bg, 8)}}>
              <div style={{width: 64, height: 64, flex: 'none', borderRadius: 32, background: C.ink, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
              <div style={{flex: 1}}>
                <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 48, color: C.ink, lineHeight: 1.1}}>{r.title}</div>
                <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 30, color: C.ink, marginTop: 8}}>{r.sub}</div>
              </div>
              <div style={{display: 'flex', gap: 8}}>
                {(r.imgs ?? []).slice(0, 3).map((im, k) => (
                  <div key={k} style={{width: 120, height: 150, background: '#fff', border: `4px solid ${C.ink}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
                    <Img src={staticFile(imgOf(im.name, im.emotion))} style={{width: '92%', height: '92%', objectFit: 'contain'}} />
                  </div>
                ))}
              </div>
            </div>
            {i < st.length - 1 && <div style={{position: 'absolute', left: 520, top: top + 226, fontFamily: FONT, fontWeight: 700, fontSize: 48, color: C.ink, opacity: ar, transform: `translateY(${(1 - ar) * -20}px)`}}>▼</div>}
          </React.Fragment>
        );
      })}
    </Shell>
  );
};

const ST = {ok: {c: '#2FBF71', bg: '#DDF7E8', ic: '✓'}, mid: {c: '#E8A400', bg: '#FFF3C4', ic: '◐'}, bad: {c: '#E5322D', bg: '#FFD9D6', ic: '✗'}};

// 47 Ceklis: isi file analisa, status hijau/kuning/merah
export const CeklisScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const it = spec.ceklis ?? [];
  const head = pop(f, fps, 2);
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1}, {f: frames, s: 1.03}]}>
      <Title text={spec.title} color={spec.titleColor} size={86} />
      <div style={{position: 'absolute', left: 60, top: 340, width: 960, opacity: head, transform: `scale(${0.94 + 0.06 * head})`, ...sticker('#fff', 7)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px', background: C.blue, borderBottom: `5px solid ${C.ink}`, borderRadius: '18px 18px 0 0'}}>
          <div style={{width: 46, height: 56, border: `4px solid ${C.ink}`, borderRadius: 8, background: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, boxSizing: 'border-box'}}>{(spec.fileName ?? 'Ceklis-Audit.pdf').split('.').pop()!.toUpperCase()}</div>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 36, color: C.ink}}>{spec.fileName ?? "Ceklis-Audit.pdf"}</div>
        </div>
        <div style={{padding: '26px 28px 34px', display: 'flex', flexDirection: 'column', gap: 20}}>
          {it.slice(0, 5).map((r, i) => {
            const a = pop(f, fps, 14 + i * 16);
            const st = ST[r.status];
            const pulse = r.status === 'bad' && f > 14 + i * 16 + 10 ? 1 + 0.025 * Math.sin((f - i * 16) / 4) : 1;
            return (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '16px 22px', borderRadius: 22, border: `5px solid ${r.status === 'bad' ? st.c : C.ink}`, background: st.bg, opacity: a, transform: `translateX(${(1 - a) * -80}px) scale(${pulse})`}}>
                <div style={{width: 76, height: 76, flex: 'none', borderRadius: 38, background: st.c, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{st.ic}</div>
                <div>
                  <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, color: r.status === 'bad' ? '#B3211D' : C.ink, lineHeight: 1.1}}>{r.text}</div>
                  {r.sub && <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 28, color: '#333', marginTop: 4}}>{r.sub}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {spec.mascot && <Mascot {...spec.mascot} size={300} x={730} y={1290} delay={50} from="right" />}
    </Shell>
  );
};

// 48 Trailer: kilas tiga sorotan di detik pertama
export const TrailerScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const it = spec.ceklis ?? [];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1.08}, {f: 20, s: 1}, {f: frames, s: 1.03}]}>
      <Title text={spec.title} color={spec.titleColor} size={spec.team ? 86 : 104} y={190} />
      {it.slice(0, 3).map((r, i) => {
        const a = pop(f, fps, 24 + i * 12);
        const st = ST[r.status];
        return (
          <div key={i} style={{position: 'absolute', left: 90, top: 640 + i * 190, width: 900, display: 'flex', alignItems: 'center', gap: 22, padding: '18px 26px', borderRadius: 24, border: `6px solid ${C.ink}`, background: st.bg, boxShadow: `8px 8px 0 ${C.ink}`, opacity: a, transform: `scale(${0.7 + 0.3 * a})`}}>
            <div style={{width: 80, height: 80, flex: 'none', borderRadius: 40, background: st.c, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 52, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{st.ic}</div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 46, color: C.ink}}>{r.text}</div>
          </div>
        );
      })}
      {spec.team && spec.team.map((t, i) => {
        const left = i < 3;
        const row = i % 3;
        const x = left ? 30 : 800, y = 760 + row * 250;
        const a = pop(f, fps, 14 + i * 7);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: 250, textAlign: 'center', opacity: a, transform: `scale(${0.7 + 0.3 * a})`}}>
            {t.name ? <Mascot name={t.name} emotion={t.emotion ?? 'thumbs'} size={210} x={20} y={0} delay={14 + i * 7} from={left ? 'left' : 'right'} /> : (
              <div style={{width: 190, height: 190, margin: '0 auto', borderRadius: 95, border: `6px solid ${C.ink}`, background: t.color ?? C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 80, color: C.ink}}>{t.initial}</div>
            )}
            <div style={{position: 'absolute', top: 205, left: 25, right: 25, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink, background: '#fff', border: `4px solid ${C.ink}`, borderRadius: 14, padding: '2px 0'}}>{t.label}</div>
          </div>
        );
      })}
      {spec.mascot && (spec.team ? <Mascot {...spec.mascot} size={460} x={310} y={860} delay={4} from="bottom" /> : <Mascot {...spec.mascot} size={320} x={690} y={1270} delay={40} from="right" />)}
    </Shell>
  );
};

// Penutup: judul, rincian proses, ajakan satu kalimat, semua maskot menyapa
export const PenutupScene: React.FC<{spec: PlusSpec; frames: number}> = ({spec, frames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const it = spec.items ?? [];
  const big = pop(f, fps, 50);
  const link = pop(f, fps, 66);
  const team = spec.team ?? [];
  return (
    <Shell spec={spec} frames={frames} cam={[{f: 0, s: 1.05}, {f: 20, s: 1}, {f: frames, s: 1.02}]}>
      <Title text={spec.title} color={spec.titleColor} size={84} y={170} />
      {it.slice(0, 4).map((r, i) => {
        const a = pop(f, fps, 18 + i * 8);
        return (
          <div key={i} style={{position: 'absolute', left: 60 + (i % 2) * 485, top: 470 + Math.floor(i / 2) * 150, width: 465, padding: '14px 22px', borderRadius: 22, border: `6px solid ${C.ink}`, background: r.bg, boxShadow: `7px 7px 0 ${C.ink}`, opacity: a, transform: `scale(${0.75 + 0.25 * a})`}}>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 44, color: C.ink}}>{r.title}</div>
            <div style={{fontFamily: FONT, fontWeight: 500, fontSize: 26, color: '#333'}}>{r.sub}</div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 60, right: 60, top: 790, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 58, whiteSpace: "nowrap", lineHeight: 1.1, color: C.ink, background: C.lime, border: `7px solid ${C.ink}`, borderRadius: 28, boxShadow: `10px 10px 0 ${C.ink}`, padding: '22px 20px', opacity: big, transform: `scale(${0.8 + 0.2 * big}) rotate(-1.5deg)`}}>{spec.sub}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1030, textAlign: 'center', opacity: link}}>
        <span style={{fontFamily: FONT, fontWeight: 700, fontSize: 38, padding: '14px 28px', background: C.ink, color: '#fff', borderRadius: 18, boxShadow: `8px 8px 0 ${C.lime}`}}>{spec.cta}</span>
      </div>
      {team.map((t, i) => <Mascot key={i} name={t.name!} emotion={t.emotion ?? 'hore'} size={160} x={30 + i * 168} y={1090} delay={70 + i * 5} from="bottom" />)}
      {spec.mascot && <Mascot {...spec.mascot} size={240} x={420} y={1250} delay={62} from="bottom" />}
    </Shell>
  );
};
