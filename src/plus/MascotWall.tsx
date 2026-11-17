import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {MASCOTS} from '../data/mascots';

// lembar cek: semua emosi satu maskot
export const MascotWall: React.FC<{name: string}> = ({name}) => {
  const m = (MASCOTS as unknown as Record<string, Record<string, string>>)[name] ?? {};
  return (
    <AbsoluteFill style={{background: '#3a4770', flexWrap: 'wrap', flexDirection: 'row', padding: 20, gap: 10, alignContent: 'flex-start'}}>
      {Object.entries(m).map(([k, f]) => (
        <div key={k} style={{width: 360, height: 250, textAlign: 'center', color: '#fff', fontFamily: 'sans-serif', fontSize: 22}}>
          <Img src={staticFile(f)} style={{height: 215, width: 'auto'}} />
          <div>{k}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
