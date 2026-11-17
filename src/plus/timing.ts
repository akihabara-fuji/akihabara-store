import {spring, interpolate, Easing} from 'remotion';

export const pop = (frame: number, fps: number, delay = 0, damping = 12) =>
  spring({frame: frame - delay, fps, config: {damping, mass: 0.6, stiffness: 160}});

export const ease = Easing.bezier(0.4, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const range = (frame: number, a: number, b: number, from = 0, to = 1, easing = ease) =>
  interpolate(frame, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const secToFrames = (s: number, fps = 30) => Math.round(s * fps);
