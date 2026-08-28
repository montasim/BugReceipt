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
    expect(source).toContain('BugReceipt-v0.1.2-chrome-unpacked.zip');
    expect(source).toContain('manifest.json');
  });

  it('loads the BugReceipt favicon and SupportKori widget from the root document', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(source).toContain('/brand/bugreceipt-mark.svg');
    expect(source).toContain('/brand/bugreceipt-32.png');
    expect(source).toContain('/brand/bugreceipt-180.png');
    expect(source).toContain('https://www.supportkori.com/widget.js');
    expect(source).toContain('data-id="montasim"');
    expect(source).toContain('data-message="Support montasim"');
    expect(source).toContain('data-color="#FFDD00"');
    expect(source).toContain('data-position="right"');
    expect(styles).not.toContain('.sk-widget-btn');
  });

  it('publishes crawler-visible social preview metadata', () => {
    const source = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8');

    expect(source).toContain("const siteUrl = 'https://bugreceipt.netlify.app'");
    expect(source).toContain("property: 'og:image'");
    expect(source).toContain("content: '1200'");
    expect(source).toContain("content: '630'");
    expect(source).toContain("name: 'twitter:card', content: 'summary_large_image'");
    expect(source).toContain("rel: 'canonical'");
  });
});
