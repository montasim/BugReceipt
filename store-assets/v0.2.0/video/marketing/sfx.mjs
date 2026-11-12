// Synthesizes non-musical interface sounds (whoosh, click, tick) into src/sfx/.
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(name, seconds, sample) {
  const n = Math.floor(SR * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / SR))) * 32767), 44 + i * 2);
  writeFileSync(new URL(`./src/sfx/${name}.wav`, import.meta.url), buf);
}

mkdirSync(new URL('./src/sfx/', import.meta.url), { recursive: true });

// Whoosh: low-passed noise whose cutoff and level swell then fall.
let lp = 0;
wav('whoosh', 0.9, (t) => {
  const env = Math.sin(Math.PI * Math.min(1, t / 0.9)) ** 2;
  lp += (0.03 + 0.3 * env) * (noise() - lp);
  return lp * env * 1.6;
});

// Click: a very short filtered noise burst, like a trackpad tap.
let hp = 0,
  prev = 0;
wav('click', 0.06, (t) => {
  const x = noise();
  hp = 0.6 * (hp + x - prev);
  prev = x;
  return hp * Math.exp(-t * 140) * 0.8;
});

// Tick: soft, dull tap for highlights appearing.
let lp2 = 0;
wav('tick', 0.08, (t) => {
  lp2 += 0.25 * (noise() - lp2);
  return lp2 * Math.exp(-t * 70) * 1.4;
});
console.log('wrote src/sfx/{whoosh,click,tick}.wav');
