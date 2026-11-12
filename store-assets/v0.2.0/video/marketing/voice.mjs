// Narrates each scene with a Microsoft neural voice; writes src/voice/*.mp3 and src/voice/index.ts.
import { mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICE = 'en-US-AndrewNeural';
// One line per scene. `node voice.mjs` narrates Marketing.tsx, `node voice.mjs launch` narrates Launch.tsx.
const SETS = {
  voice: [
  'Checkout is broken. That is the whole bug report. No steps. No logs. No proof.',
  'Meet BugReceipt. Bug reports developers can actually reproduce.',
  'Pick the tab where the bug happens, and start recording. As you reproduce the problem, add each step right in the side panel.',
  'Meanwhile, BugReceipt captures console errors, stack traces, and the failing network request, with secrets redacted before anything is stored.',
  'Then review it all. Mark the problem right on the frame, remove anything private, and download one GitHub-ready ZIP.',
  'Spotted a typo or awkward wording? Select it, right-click, and suggest a correction.',
  'BugReceipt. It stays on your machine, and it is free. Add it to Chrome today.',
  ],
  'voice-launch': [
    'Checkout is broken. That is the bug report. No steps. No logs. No proof.',
    'BugReceipt turns every bug into a receipt a developer can actually reproduce.',
    'Pick the tab, press record, and jot down each step as you go, right in the side panel.',
    'Behind the scenes, it catches console errors, stack traces, and the exact request that failed.',
    'Passwords, tokens and secrets are redacted on your machine, before anything is saved.',
    'Circle the problem on a frame, then download one tidy ZIP, ready for GitHub.',
    'BugReceipt. Free, private, and on Chrome today.',
  ],
};
const name = process.argv[2] === 'launch' ? 'voice-launch' : 'voice';
const LINES = SETS[name];

const dir = new URL(`./src/${name}/`, import.meta.url);
mkdirSync(dir, { recursive: true });
const seconds = [];
for (const [i, text] of LINES.entries()) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioFilePath } = await tts.toFile(dir.pathname.replace(/^\/(\w:)/, '$1'), text, { rate: '+4%' });
  tts.close();
  const out = new URL(`scene${i}.mp3`, dir);
  renameSync(audioFilePath, out);
  // shortcut: duration from CBR bitrate (96 kbps), accurate to a few ms for this fixed format.
  seconds.push(+((statSync(out).size * 8) / 96000).toFixed(2));
  console.log(`scene${i}: ${seconds[i]}s`);
}
writeFileSync(
  new URL('index.ts', dir),
  LINES.map((_, i) => `import s${i} from './scene${i}.mp3';`).join('\n') +
    `\n\nexport const VOICE = [${LINES.map((_, i) => `s${i}`).join(', ')}];\nexport const VOICE_SECONDS = ${JSON.stringify(seconds)};\n`,
);
