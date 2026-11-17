#!/usr/bin/env python3
# Amplop suara per frame (30 fps) untuk gerak mulut. Pakai: python3 tools/make-env.py voice-ep002
import sys, json, subprocess, glob, os, numpy as np
d = os.path.join('public', sys.argv[1])
n = len(glob.glob(os.path.join(d, '[0-9]*.mp3')))
out = []
for i in range(1, n + 1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{d}/{i}.mp3', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(float) / 32768
    hop = 16000 // 30
    k = len(a) // hop
    rms = np.sqrt((a[:k * hop].reshape(k, hop) ** 2).mean(1)) if k else np.zeros(1)
    p = np.percentile(rms, 95) or 1
    v = np.clip(rms / p, 0, 1)
    v = np.where(v < 0.12, 0, v)  # noise gate
    v = np.convolve(v, [0.25, 0.5, 0.25], 'same')
    out.append([round(float(x), 3) for x in v])
json.dump(out, open(os.path.join(d, 'env.json'), 'w'))
print(n, 'scene', [len(x) for x in out])
