import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';

// SFX lokal (public/sfx), tanpa internet; frame = frame lokal scene
export const SfxTrigger: React.FC<{at: number; src?: string; volume?: number}> = ({at, src = staticFile('sfx/whoosh.wav'), volume = 0.5}) => (
  <Sequence from={at} durationInFrames={20} layout="none"><Audio src={src} volume={volume} /></Sequence>
);
