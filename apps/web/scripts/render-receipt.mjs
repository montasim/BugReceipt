// Renders the landing receipt from the committed capture session using the real exporter.
// Node 24 strips TypeScript types, so the workspace packages load directly from source.
import console from 'node:console';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureSessionSchema } from '@bugreceipt/capture-model';
import { renderGitHubIssue } from '@bugreceipt/issue-export';

const dir = resolve(import.meta.dirname, '../src/prototypes/landing');
const session = captureSessionSchema.parse(
  JSON.parse(await readFile(resolve(dir, 'receipt-session.json'), 'utf8')),
);
const frames = session.page?.selectedFrames?.length ?? 0;
const receipt = {
  markdown: renderGitHubIssue(session),
  files: [
    { name: 'issue.md', label: 'Issue report', included: true },
    {
      name: 'recording.webm',
      label: 'Screen recording',
      included: Boolean(session.page?.recording),
    },
    { name: 'selected-frame.png', label: 'Selected frames', included: frames > 0 },
    { name: 'console.json', label: 'Console evidence', included: session.diagnostics.length > 0 },
    { name: 'network.har', label: 'Network evidence', included: session.network.length > 0 },
  ],
};
await writeFile(resolve(dir, 'receipt.generated.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log('wrote receipt.generated.json');
