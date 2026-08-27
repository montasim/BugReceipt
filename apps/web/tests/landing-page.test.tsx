import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('extension landing page', () => {
  it('offers the packaged extension and explains how to install it', () => {
    const source = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');

    expect(source).toContain(
      "const releaseUrl = 'https://github.com/montasim/ReproKit/releases/latest'",
    );
    expect(source).toContain('href={releaseUrl}');
    expect(source).toContain('Download ReproKit');
    expect(source).toContain('Load unpacked');
    expect(source).toContain('What does ReproKit capture?');
    expect(source).toContain('ReproKit-v0.1.0-chrome-unpacked.zip');
    expect(source).toContain('manifest.json');
  });
});
