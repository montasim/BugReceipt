import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('extension landing page', () => {
  it('offers the packaged extension and explains how to install it', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain(
      "const releaseUrl = 'https://github.com/montasim/BugReceipt/releases/latest'",
    );
    expect(source).toContain('href={releaseUrl}');
    expect(source).toContain('Download BugReceipt');
    expect(source).toContain('Load unpacked');
    expect(source).toContain('What does BugReceipt capture?');
    expect(source).toContain('BugReceipt-v0.1.0-chrome-unpacked.zip');
    expect(source).toContain('manifest.json');
  });

  it('loads the BugReceipt favicon and SupportKori widget from the root document', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).toContain('https://supportkori.com/widget.js');
    expect(source).toContain('data-id="montasim"');
  });
});
