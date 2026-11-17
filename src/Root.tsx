import React from 'react';
import {Composition} from 'remotion';
import analyst from './data/analyst-demo.json';
import gaya from './data/gaya-demo.json';
import analisis from './data/analisis-sosmed.json';
import auditIg from './data/audit-ig.json';
import auditTt from './data/audit-tiktok.json';
import brand from './data/personal-brand.json';
import riset from './data/riset-sosmed.json';
import satuTim from './data/satu-tim-ai.json';
import {MascotWall} from './plus/MascotWall';
import {StickmanStory} from './Story';
import {ExplainerStory, EXPLAINER_FRAMES} from './Explainer';
import {Showcase, SHOWCASE_FRAMES} from './Showcase';
import {Uaop, UAOP_FRAMES} from './Uaop';
import {Hook, HOOK_FRAMES} from './Hook';
import {ModelSheet, SHEET_W, SHEET_H} from './ModelSheet';
import {Generic, calcGeneric, GenericProps} from './Generic';
import uaop from './data/uaop.json';
import token from './data/portofolio-token.json';
import nilai from './data/cek-nilai.json';
import contoh from './data/contoh-vs-stats.json';
import {Kenalan, KENALAN_FRAMES} from './Kenalan';
import {EPISODES} from './episodes.generated';
import {Thumb} from './Thumb';
import {KangCatat, KANGCATAT_W, KANGCATAT_H} from './KangCatat';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="StickmanStory"
      component={StickmanStory}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="ExplainerStory"
      component={ExplainerStory}
      durationInFrames={EXPLAINER_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Showcase"
      component={Showcase}
      durationInFrames={SHOWCASE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition id="Uaop" component={Uaop} durationInFrames={UAOP_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KangCatat" component={KangCatat} durationInFrames={1} fps={30} width={KANGCATAT_W} height={KANGCATAT_H} />
    <Composition id="Kenalan" component={Kenalan} durationInFrames={KENALAN_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Hook" component={Hook} durationInFrames={HOOK_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Video" component={Generic} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={uaop as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="ModelSheet" component={ModelSheet} durationInFrames={1} fps={30} width={SHEET_W} height={SHEET_H} />
    <Composition id="VideoToken" component={Generic} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={token as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoNilai" component={Generic} durationInFrames={900} fps={30} width={1080} height={1920} defaultProps={nilai as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoAnalyst" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={analyst as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoAnalisis" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={analisis as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoAuditIG" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={auditIg as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoAuditTT" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={auditTt as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoHrd" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={satuTim as unknown as GenericProps} calculateMetadata={calcGeneric} />
      <Composition id="VideoRiset" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={riset as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoBrand" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={brand as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="VideoGaya" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={gaya as unknown as GenericProps} calculateMetadata={calcGeneric} />
    <Composition id="MascotWall" component={MascotWall} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{name: 'dika-anime'}} />
    {EPISODES.map((e) => (
      <Composition key={e.id} id={e.id} component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={e.data as GenericProps} calculateMetadata={calcGeneric} />
    ))}
    <Composition id="Thumb002A" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '02', kicker: 'BUILD WITH AI', line1: 'INPUT BERANTAKAN', line2: '=', line3: 'OUTPUT BERANTAKAN', tag: 'AI BUKAN TOMBOL AJAIB', dika: 'serius', variant: 'A' as const, mascots: [{name: 'claude-kotak', emotion: 'kerja', x: 40, y: 1420, size: 270, rot: -8}, {name: 'chatgpt', emotion: 'kerja', x: 290, y: 1480, size: 270, rot: 6}]}} />
    <Composition id="Thumb002B" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '02', kicker: 'BUILD WITH AI', line1: 'INPUT BERANTAKAN', line2: '=', line3: 'OUTPUT BERANTAKAN', tag: 'AI BUKAN TOMBOL AJAIB', dika: 'serius', variant: 'B' as const, mascots: [{name: 'claude-kotak', emotion: 'kerja', x: 40, y: 1420, size: 270, rot: -8}, {name: 'chatgpt', emotion: 'kerja', x: 290, y: 1480, size: 270, rot: 6}]}} />
    <Composition id="Thumb003A" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '03', kicker: 'BUILD WITH AI', line1: 'BAGI TUGAS', line2: '≠', line3: 'BAGI PROMPT', tag: 'SATU TIM AI', dika: 'jelas', variant: 'A' as const, mascots: [{name: 'claude-kotak', emotion: 'kerja', x: 40, y: 1420, size: 250, rot: -8}, {name: 'chatgpt', emotion: 'kerja', x: 260, y: 1480, size: 250, rot: 6}, {name: 'flow', emotion: 'kerja', x: 470, y: 1520, size: 230, rot: -4}]}} />
    <Composition id="Thumb003B" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '03', kicker: 'BUILD WITH AI', line1: 'BAGI TUGAS', line2: '≠', line3: 'BAGI PROMPT', tag: 'SATU TIM AI', dika: 'jelas', variant: 'B' as const, mascots: [{name: 'claude-kotak', emotion: 'kerja', x: 40, y: 1420, size: 250, rot: -8}, {name: 'chatgpt', emotion: 'kerja', x: 260, y: 1480, size: 250, rot: 6}, {name: 'flow', emotion: 'kerja', x: 470, y: 1520, size: 230, rot: -4}]}} />
    <Composition id="Thumb004A" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '04', kicker: 'BUILD WITH AI', line1: 'AI CODING', line2: '≠', line3: 'TANYA KODE', tag: 'KONTEKS REPO PENTING', dika: 'jelas', variant: 'A' as const, mascots: [{name: 'gemini', emotion: 'kerja', x: 40, y: 1420, size: 270, rot: -8}, {name: 'claude-kotak', emotion: 'kerja', x: 290, y: 1480, size: 270, rot: 6}]}} />
    <Composition id="Thumb004B" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '04', kicker: 'BUILD WITH AI', line1: 'AI CODING', line2: '≠', line3: 'TANYA KODE', tag: 'KONTEKS REPO PENTING', dika: 'jelas', variant: 'B' as const, mascots: [{name: 'gemini', emotion: 'kerja', x: 40, y: 1420, size: 270, rot: -8}, {name: 'claude-kotak', emotion: 'kerja', x: 290, y: 1480, size: 270, rot: 6}]}} />
    <Composition id="Thumb005A" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '05', kicker: 'BUILD WITH AI', line1: 'PROMPT JELAS', line2: '≠', line3: 'PROMPT PANJANG', tag: 'JELAS > PANJANG', dika: 'jelas', variant: 'A' as const, mascots: [{name: 'claude-kotak', emotion: 'ide', x: 40, y: 1420, size: 260, rot: -8}, {name: 'chatgpt', emotion: 'checklist', x: 290, y: 1480, size: 260, rot: 6}]}} />
    <Composition id="Thumb006A" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '06', kicker: 'BUILD WITH AI', line1: 'JANGAN', line2: 'CUMA', line3: 'TANYA AI', tag: 'AI PARTNER BERPIKIR', dika: 'tunjuk', variant: 'A' as const, mascots: [{name: 'chatgpt', emotion: 'tanya', x: 40, y: 1420, size: 260, rot: -8}, {name: 'claude-kotak', emotion: 'cool', x: 290, y: 1480, size: 260, rot: 6}]}} />
    <Composition id="Thumb005B" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '05', kicker: 'BUILD WITH AI', line1: 'PROMPT JELAS', line2: '≠', line3: 'PROMPT PANJANG', tag: 'JELAS > PANJANG', dika: 'jelas', variant: 'B' as const, mascots: [{name: 'claude-kotak', emotion: 'ide', x: 40, y: 1420, size: 260, rot: -8}, {name: 'chatgpt', emotion: 'checklist', x: 290, y: 1480, size: 260, rot: 6}]}} />
    <Composition id="Thumb006B" component={Thumb} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ep: '06', kicker: 'BUILD WITH AI', line1: 'JANGAN', line2: 'CUMA', line3: 'TANYA AI', tag: 'AI PARTNER BERPIKIR', dika: 'tunjuk', variant: 'B' as const, mascots: [{name: 'chatgpt', emotion: 'tanya', x: 40, y: 1420, size: 260, rot: -8}, {name: 'claude-kotak', emotion: 'cool', x: 290, y: 1480, size: 260, rot: 6}]}} />
    <Composition id="VideoContoh" component={Generic} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={contoh as unknown as GenericProps} calculateMetadata={calcGeneric} />
  </>
);
