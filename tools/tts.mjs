// Suara clone ElevenLabs -> public/voice/N.mp3 dari teks "voice" tiap scene.
// Pakai: node tools/tts.mjs src/data/video.json [--estimate] [--force]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const l of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('Pakai: node tools/tts.mjs <file.json> [--estimate] [--force]'); process.exit(1); }
const estimate = flags.includes('--estimate');
const force = flags.includes('--force');
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const jobs = data.scenes.map((s, i) => ({n: i + 1, text: (s.voice || '').trim()})).filter((j) => j.text);
const chars = jobs.reduce((a, j) => a + j.text.length, 0);
console.log(`${jobs.length} scene bersuara, ${chars} karakter (perkiraan kredit = jumlah karakter)`);
if (estimate) process.exit(0);
if (!KEY || !VOICE) { console.error('Isi ELEVENLABS_API_KEY dan ELEVENLABS_VOICE_ID di file .env'); process.exit(1); }
const outDir = path.join(root, 'public', 'voice');
fs.mkdirSync(outDir, {recursive: true});
for (const j of jobs) {
  const out = path.join(outDir, `${j.n}.mp3`);
  if (fs.existsSync(out) && !force) { console.log(`lewati ${j.n}.mp3 (sudah ada, pakai --force untuk ganti)`); continue; }
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg'},
    body: JSON.stringify({text: j.text, model_id: MODEL}),
  });
  if (!r.ok) { console.error(`Gagal scene ${j.n}: ${r.status} ${(await r.text()).slice(0, 200)}`); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log(`ok ${j.n}.mp3`);
}
