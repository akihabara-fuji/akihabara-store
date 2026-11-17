#!/usr/bin/env python3
"""QA otomatis video hasil render: python3 scripts/qa.py out/video.mp4 src/data/x.json
Cek: durasi, track audio, volume per scene, lalu bikin board still tiap scene (tengah + hampir akhir)."""
import json, subprocess, sys, os
from pathlib import Path
mp4, js = sys.argv[1], sys.argv[2]
d = json.load(open(js)); S = d['scenes']; vd = d.get('voiceDir', 'voice'); FPS = 30; PAD = 12
def dur(f):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode())
frames = []
for i, s in enumerate(S):
    a = Path('public')/vd/f'{i+1}.mp3'
    frames.append(round(dur(a)*FPS)+PAD if a.exists() else round((s.get('sec') or 5)*FPS))
total = sum(frames)/FPS; real = dur(mp4)
print(f'durasi: video {real:.2f}s, harapan {total:.2f}s', 'OK' if abs(real-total) < 0.5 else 'BEDA!')
has_a = 'audio' in subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','csv=p=0',mp4]).decode()
print('audio:', 'ada' if has_a else 'TIDAK ADA!')
out = Path('out/qa'); out.mkdir(parents=True, exist_ok=True)
t = 0; tiles = []
for i, (s, f) in enumerate(zip(S, frames)):
    st, en = t, t + f/FPS
    seg = subprocess.run(['ffmpeg','-hide_banner','-ss',f'{st}','-t',f'{f/FPS}','-i',mp4,'-vn','-af','volumedetect','-f','null','-'],capture_output=True,text=True).stderr
    mv = [l.split(':')[1].strip() for l in seg.splitlines() if 'mean_volume' in l]
    print(f'{i+1:>2} {s["type"]:<9} {st:6.1f}-{en:6.1f}s  suara {mv[0] if mv else "?"}', '(SENYAP?)' if mv and mv[0].startswith('-inf') else '')
    for k, at in enumerate((st + (en-st)*0.5, en - 0.8)):
        p = out/f's{i+1}_{k}.png'
        subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',f'{at:.2f}','-i',mp4,'-frames:v','1','-vf','scale=216:-1',p])
        tiles.append(str(p))
    t = en
rows = [tiles[i:i+10] for i in range(0, len(tiles), 10)]
for r, row in enumerate(rows):
    cmd = ['ffmpeg','-y','-loglevel','error']
    for x in row: cmd += ['-i', x]
    cmd += ['-filter_complex', f'hstack={len(row)}', str(out/f'board{r}.png')]
    subprocess.run(cmd)
print('board:', ', '.join(str(out/f'board{r}.png') for r in range(len(rows))))
