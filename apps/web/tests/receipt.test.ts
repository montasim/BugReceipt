import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captureSessionSchema } from '@bugreceipt/capture-model';
import { renderGitHubIssue } from '@bugreceipt/issue-export';

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../src/prototypes/landing/${file}`, import.meta.url), 'utf8'));

describe('landing receipt', () => {
  it('is the real issue.md rendered from the committed capture session', () => {
    const session = captureSessionSchema.parse(read('receipt-session.json'));
    const receipt = read('receipt.generated.json');

    expect(receipt.markdown).toBe(renderGitHubIssue(session));
    expect(receipt.markdown).toContain('# Checkout fails after applying a discount');
    expect(receipt.markdown).toContain('## Steps to reproduce');
    expect(receipt.markdown).toContain('[REDACTED]');
  });

  it('lists the export manifest in the same order as the review page', () => {
    const receipt = read('receipt.generated.json');
    expect(receipt.files.map((file: { name: string }) => file.name)).toEqual([
      'issue.md',
      'recording.webm',
      'selected-frame.png',
      'console.json',
      'network.har',
    ]);
    expect(receipt.files.filter((file: { included: boolean }) => file.included)).toHaveLength(4);
  });
});
