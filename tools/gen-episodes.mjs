// Registry episode: dibaca di Node saat build, bukan di browser.
// Pakai: node tools/gen-episodes.mjs  ->  src/episodes.generated.ts
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'episodes');
const out = [];
for (const name of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
  const f = path.join(dir, name, 'episode.json');
  if (!fs.existsSync(f)) continue;
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  out.push({id: `Episode${data.episode}`, dir: name, data});
}
const ts = `// DIHASILKAN OTOMATIS oleh tools/gen-episodes.mjs. Jangan diedit manual.\nexport const EPISODES: {id: string; dir: string; data: any}[] = ${JSON.stringify(out, null, 1)};\n`;
fs.writeFileSync(path.join(root, 'src', 'episodes.generated.ts'), ts);
console.log(`${out.length} episode: ${out.map((e) => e.id).join(', ')}`);
