import {staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Zona aman TikTok/Reels: hindari UI platform
export const SAFE = {top: 170, bottom: 400, left: 60, right: 150};

export const C = {
  bg: '#FAFAF6',
  grid: '#E6E6DE',
  ink: '#111111',
  lime: '#C8F135',
  blue: '#CFE3FF',
  pink: '#FFD3E6',
  yellow: '#FFE45E',
  purple: '#DCD0FF',
  mint: '#C9F5E1',
  orange: '#FFB066',
  red: '#FF5A52',
  green: '#12A672',
  pill: 'rgba(78,78,84,0.88)',
};

export const FONT = "'PoppinsCA', 'Poppins', 'Inter', sans-serif";

let loaded = false;
export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  loadFont({family: 'PoppinsCA', url: staticFile('fonts/Poppins-Bold.ttf'), weight: '700'});
  loadFont({family: 'PoppinsCA', url: staticFile('fonts/Poppins-Medium.ttf'), weight: '500'});
};

// gaya stiker: tepi tebal + bayangan keras (pseudo-3D, ringan untuk i3/8GB)
export const sticker = (bg: string, shadow = 10) => ({
  background: bg,
  border: `6px solid ${C.ink}`,
  borderRadius: 30,
  boxShadow: `${shadow}px ${shadow}px 0 ${C.ink}`,
});
