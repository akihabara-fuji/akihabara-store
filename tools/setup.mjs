// Isi .env lewat terminal: tinggal paste (input key disembunyikan).
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const envFile = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '.env');
let ask;
if (process.stdin.isTTY) {
  ask = (q, hide) => new Promise((resolve) => {
    process.stdout.write(q);
    let buf = '';
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    const onKey = (str, k) => {
      if (k && (k.name === 'return' || k.name === 'enter')) {
        process.stdin.setRawMode(false); process.stdin.removeListener('keypress', onKey); process.stdin.pause();
        process.stdout.write('\n'); resolve(buf.trim());
      } else if (k && k.ctrl && k.name === 'c') { process.exit(1); }
      else if (k && k.name === 'backspace') { buf = buf.slice(0, -1); }
      else if (str) { buf += str; if (!hide) process.stdout.write(str); }
    };
    process.stdin.on('keypress', onKey);
    process.stdin.resume();
  });
} else {
  const lines = fs.readFileSync(0, 'utf8').split(/\r?\n/);
  ask = async (q) => { process.stdout.write(q + '\n'); return (lines.shift() || '').trim(); };
}
const key = await ask('Paste API key ElevenLabs (tidak tampil): ', true);
const voice = await ask('Paste voice ID clone lo: ', false);
if (!key || !voice) { console.error('Key atau voice ID kosong, tidak disimpan.'); process.exit(1); }
fs.writeFileSync(envFile, `ELEVENLABS_API_KEY=${key}\nELEVENLABS_VOICE_ID=${voice}\nELEVENLABS_MODEL=eleven_multilingual_v2\n`, {mode: 0o600});
console.log(`Tersimpan di ${envFile}. File ini tidak ikut ter-commit.`);
