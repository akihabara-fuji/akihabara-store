# Kang Catat — Remotion (nol biaya)
1. `npm install`
2. Edit `src/data/video.json` (atau minta AI isi pakai MASTER_PROMPT.md)
3. `pip install edge-tts` → `python tools/tts.py src/data/video.json`
4. `npm run dev` untuk preview, render: `npx remotion render src/index.ts Video out/video.mp4 --props=src/data/video.json`
Gambar model: `model-sheet.png`. Mesin: `src/Generic.tsx`, karakter: `src/engine/Stickman.tsx`.
