// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captureSessionSchema } from '@bugreceipt/capture-model';
import { renderGitHubIssue } from '@bugreceipt/issue-export';
import { renderToStaticMarkup } from 'react-dom/server';
import { Receipt, excerptConsole } from '../src/prototypes/landing/receipt';

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

  it('renders the exported report with the error lines in the console excerpt', () => {
    const html = renderToStaticMarkup(<Receipt />);
    expect(html).toContain('Checkout fails after applying a discount');
    expect(html).toContain('Steps to reproduce');
    expect(html).not.toContain('Network activity');
    expect(html).not.toContain('Description');
    expect(html.match(/Included</g)).toHaveLength(4);
    expect(html).toMatch(/<pre><code>[\s\S]*ERROR[\s\S]*<\/code><\/pre>/);
    expect(html).not.toMatch(/secret-token|demo%40/);
  });

  it('prefers errors and warnings in the console excerpt, keeping original order', () => {
    const lines = [
      'a LOG one',
      'b WARN two',
      'c LOG three',
      'd ERROR four',
      'e LOG five',
      'f ERROR six',
    ];
    expect(excerptConsole(lines.join('\n'), 4)).toEqual([
      'a LOG one',
      'b WARN two',
      'd ERROR four',
      'f ERROR six',
    ]);
  });
});
